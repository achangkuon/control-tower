package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// The pilot's on-disk contract is fixed by Radar (S214): `piloto` writes exactly
// these schemas and Radar only reads them (P2). Changing a field here without
// changing Radar's reader would silently drop a state.
const (
	esquemaMarca       = "radar.piloto/v1"
	esquemaInterruptor = "radar.piloto.interruptor/v1"
	esquemaCorrida     = "radar.piloto.corrida/v1"

	estadoEnCurso = "en-curso"
	estadoNovedad = "novedad"
	estadoCierre  = "cierre"

	motivoDecisionDelicada = "decisión delicada"
	motivoNoSePudoInferir  = "no se pudo inferir"
	motivoInterrumpida     = "interrumpida"

	rondasPorDefecto = 3
	topePorDefecto   = 10
)

// ahora is the single clock seam, replaceable only by deterministic tests.
var ahora = func() time.Time { return time.Now() }

var (
	patronID    = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._-]*$`)
	patronFecha = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
)

// Interruptor is the radar.piloto.interruptor/v1 switch. `prendido` is the mode;
// the brake flips it off while preserving the run's limits (P9). An absent file
// reads as off with the design defaults; a malformed one fails closed.
type Interruptor struct {
	Schema   string `json:"schema"`
	Prendido bool   `json:"prendido"`
	Rondas   int    `json:"rondas"`
	Tope     int    `json:"tope"`
}

// Marca is the radar.piloto/v1 mark for one Sesión: EN CURSO, NOVEDAD with its
// motivo, or cierre (POR REVISAR) with the delivery commit. Radar derives
// POR REVISAR from Git, never from the mark alone.
type Marca struct {
	Schema     string `json:"schema"`
	Sesion     string `json:"sesion"`
	Vuelo      string `json:"vuelo"`
	Rama       string `json:"rama"`
	Estado     string `json:"estado"`
	Motivo     string `json:"motivo,omitempty"`
	Decisiones int    `json:"decisiones,omitempty"`
	Commit     string `json:"commit,omitempty"`
	Ronda      int    `json:"ronda"`
}

// Miembro is one Sesión of a flight. Union marks a Sesión that depends on two
// flights: it never starts while the mode is on (P10).
type Miembro struct {
	Sesion    string   `json:"sesion"`
	DependeDe []string `json:"depende_de,omitempty"`
	Union     bool     `json:"union,omitempty"`
}

// Vuelo is one approved flight: its chain of Sesiones, its branch and its work
// copy. It is the run's own state, not Radar's (P12).
type Vuelo struct {
	ID       string    `json:"id"`
	Ancla    string    `json:"ancla"`
	Rama     string    `json:"rama"`
	Copia    string    `json:"copia"`
	Sesiones []Miembro `json:"sesiones"`
}

// Corrida is the run: the approved flights, in approval order, and the date
// every branch and copy is named after. It lives in the Git common directory
// next to the switch and the marks.
type Corrida struct {
	Schema string  `json:"schema"`
	Fecha  string  `json:"fecha"`
	Inicio string  `json:"inicio"`
	Vuelos []Vuelo `json:"vuelos"`
}

func idValido(id string) bool {
	return id != "." && id != ".." && patronID.MatchString(id)
}

func motivoValido(motivo string) bool {
	switch motivo {
	case motivoDecisionDelicada, motivoNoSePudoInferir, motivoInterrumpida:
		return true
	}
	return false
}

// ramaDeVuelo builds exactly the branch name the design fixes and Radar accepts:
// refs/heads/piloto/<fecha>/vuelo-<vuelo>.
func ramaDeVuelo(fecha, vuelo string) string {
	return "refs/heads/piloto/" + fecha + "/vuelo-" + vuelo
}

func validarInterruptor(i Interruptor) error {
	if i.Schema != esquemaInterruptor || i.Rondas < 0 || i.Rondas > 3 || i.Tope < 0 {
		return fmt.Errorf("contrato de interruptor inválido")
	}
	return nil
}

func validarMarca(m Marca) error {
	if m.Schema != esquemaMarca || !idValido(m.Sesion) || !idValido(m.Vuelo) || m.Ronda < 1 || m.Decisiones < 0 {
		return fmt.Errorf("contrato de piloto inválido")
	}
	resto, ok := strings.CutPrefix(m.Rama, "refs/heads/piloto/")
	if !ok {
		return fmt.Errorf("contrato de piloto inválido: la rama no es de un vuelo")
	}
	partes := strings.Split(resto, "/")
	if len(partes) != 2 || !patronFecha.MatchString(partes[0]) || partes[1] != "vuelo-"+m.Vuelo {
		return fmt.Errorf("contrato de piloto inválido: la rama no nombra el vuelo")
	}
	switch m.Estado {
	case estadoEnCurso:
		if m.Motivo != "" || m.Commit != "" {
			return fmt.Errorf("contrato de piloto inválido: EN CURSO no lleva motivo ni commit")
		}
	case estadoNovedad:
		if !motivoValido(m.Motivo) || m.Commit != "" {
			return fmt.Errorf("contrato de piloto inválido: NOVEDAD exige un motivo del conjunto cerrado")
		}
	case estadoCierre:
		if m.Motivo != "" || m.Commit == "" {
			return fmt.Errorf("contrato de piloto inválido: el cierre exige commit y no lleva motivo")
		}
	default:
		return fmt.Errorf("contrato de piloto inválido: estado %q", m.Estado)
	}
	return nil
}

// commonDir is the Git common directory: the one place shared by every linked
// worktree, so the switch, the marks and the run survive the copy they were
// written from.
func commonDir(root string) (string, error) {
	return gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
}

// repoPadre is the directory that holds the main checkout, so copies land in the
// existing Worktrees/ next to it and not inside a linked worktree (S220 D2).
func repoPadre(root string) (string, error) {
	common, err := commonDir(root)
	if err != nil {
		return "", err
	}
	principal := common
	if filepath.Base(common) == ".git" {
		principal = filepath.Dir(common)
	}
	return filepath.Dir(principal), nil
}

// directorioComponentes walks (and optionally creates) <base>/<partes...>,
// Lstat-checking every component: a symlink or a non-directory is refused,
// never followed, exactly like Radar's evidence reader.
func directorioComponentes(base string, partes []string, crear bool) (string, error) {
	actual := base
	for _, parte := range partes {
		actual = filepath.Join(actual, parte)
		info, err := os.Lstat(actual)
		if errors.Is(err, os.ErrNotExist) && crear {
			if err = os.Mkdir(actual, 0o700); err == nil {
				info, err = os.Lstat(actual)
			}
		}
		if err != nil {
			return "", err
		}
		if !info.IsDir() {
			return "", fmt.Errorf("ruta de piloto es un enlace simbólico o no es directorio: %s", actual)
		}
	}
	return actual, nil
}

func dirPiloto(common string, crear bool) (string, error) {
	return directorioComponentes(common, []string{"chanks", "piloto"}, crear)
}

func dirMarcas(common string, crear bool) (string, error) {
	base, err := dirPiloto(common, crear)
	if err != nil {
		return "", err
	}
	return directorioComponentes(base, []string{"marcas"}, crear)
}

// leerArchivoRegular reads one small evidence file, refusing symlinks and
// non-regular nodes on every component.
func leerArchivoRegular(common string, partes []string) ([]byte, error) {
	actual := common
	for i, parte := range partes {
		actual = filepath.Join(actual, parte)
		info, err := os.Lstat(actual)
		if err != nil {
			return nil, err
		}
		if i < len(partes)-1 {
			if !info.IsDir() {
				return nil, fmt.Errorf("ruta de piloto no es directorio: %s", actual)
			}
		} else if !info.Mode().IsRegular() {
			return nil, fmt.Errorf("evidencia de piloto no es un archivo regular: %s", actual)
		}
	}
	data, err := os.ReadFile(actual)
	if err != nil {
		return nil, err
	}
	if len(data) > 4096 {
		return nil, fmt.Errorf("evidencia de piloto demasiado grande")
	}
	return data, nil
}

// camposUnicos rejects duplicate keys at every depth: encoding/json otherwise
// silently keeps the last occurrence.
func camposUnicos(dec *json.Decoder) error {
	seen := map[string]bool{}
	for dec.More() {
		token, err := dec.Token()
		if err != nil {
			return err
		}
		key, ok := token.(string)
		if !ok || seen[key] {
			return fmt.Errorf("campo duplicado o inválido en la evidencia")
		}
		seen[key] = true
		if err := valorUnico(dec); err != nil {
			return err
		}
	}
	_, err := dec.Token() // closing brace
	return err
}

func valorUnico(dec *json.Decoder) error {
	token, err := dec.Token()
	if err != nil {
		return err
	}
	switch token {
	case json.Delim('{'):
		return camposUnicos(dec)
	case json.Delim('['):
		for dec.More() {
			if err := valorUnico(dec); err != nil {
				return err
			}
		}
		_, err := dec.Token()
		return err
	}
	return nil
}

// decodificarEstricto is the reader every writer-owned file goes through: an
// object, unique keys, no unknown fields and no trailing data.
func decodificarEstricto(data []byte, out any) error {
	probe := json.NewDecoder(bytes.NewReader(data))
	token, err := probe.Token()
	if err != nil || token != json.Delim('{') {
		return fmt.Errorf("la evidencia no es un objeto")
	}
	if err := camposUnicos(probe); err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(out); err != nil {
		return err
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return fmt.Errorf("la evidencia contiene datos adicionales")
	}
	return nil
}

// escribirJSONAtomico publishes through a same-directory temp file and a rename,
// so no reader ever sees a half-written switch or mark.
func escribirJSONAtomico(dir, nombre string, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	data = append(data, '\n')
	tmp, err := os.CreateTemp(dir, "."+nombre+".tmp-")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err := tmp.Chmod(0o600); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, filepath.Join(dir, nombre))
}

func leerInterruptor(root string) (*Interruptor, error) {
	if root == "" {
		return nil, nil
	}
	common, err := commonDir(root)
	if err != nil {
		return nil, err
	}
	data, err := leerArchivoRegular(common, []string{"chanks", "piloto", "interruptor.json"})
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var i Interruptor
	if err := decodificarEstricto(data, &i); err != nil {
		return nil, fmt.Errorf("interruptor del piloto ilegible: %w", err)
	}
	if err := validarInterruptor(i); err != nil {
		return nil, err
	}
	return &i, nil
}

func escribirInterruptor(root string, i Interruptor) error {
	i.Schema = esquemaInterruptor
	if err := validarInterruptor(i); err != nil {
		return err
	}
	common, err := commonDir(root)
	if err != nil {
		return err
	}
	dir, err := dirPiloto(common, true)
	if err != nil {
		return err
	}
	return escribirJSONAtomico(dir, "interruptor.json", i)
}

func leerMarca(root, id string) (*Marca, error) {
	if !idValido(id) {
		return nil, fmt.Errorf("ID de piloto inválido: %q", id)
	}
	if root == "" {
		return nil, nil
	}
	common, err := commonDir(root)
	if err != nil {
		return nil, err
	}
	data, err := leerArchivoRegular(common, []string{"chanks", "piloto", "marcas", id + ".json"})
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var m Marca
	if err := decodificarEstricto(data, &m); err != nil {
		return nil, fmt.Errorf("marca de %s ilegible: %w", id, err)
	}
	if m.Sesion != id {
		return nil, fmt.Errorf("la marca de %s declara la Sesión %q", id, m.Sesion)
	}
	if err := validarMarca(m); err != nil {
		return nil, err
	}
	return &m, nil
}

func escribirMarca(root string, m Marca) error {
	m.Schema = esquemaMarca
	if err := validarMarca(m); err != nil {
		return err
	}
	common, err := commonDir(root)
	if err != nil {
		return err
	}
	dir, err := dirMarcas(common, true)
	if err != nil {
		return err
	}
	return escribirJSONAtomico(dir, m.Sesion+".json", m)
}

func leerCorrida(root string) (*Corrida, error) {
	if root == "" {
		return nil, nil
	}
	common, err := commonDir(root)
	if err != nil {
		return nil, err
	}
	data, err := leerArchivoRegular(common, []string{"chanks", "piloto", "corrida.json"})
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var c Corrida
	if err := decodificarEstricto(data, &c); err != nil {
		return nil, fmt.Errorf("corrida ilegible: %w", err)
	}
	if c.Schema != esquemaCorrida {
		return nil, fmt.Errorf("contrato de corrida inválido")
	}
	return &c, nil
}

func escribirCorrida(root string, c Corrida) error {
	c.Schema = esquemaCorrida
	common, err := commonDir(root)
	if err != nil {
		return err
	}
	dir, err := dirPiloto(common, true)
	if err != nil {
		return err
	}
	return escribirJSONAtomico(dir, "corrida.json", c)
}
