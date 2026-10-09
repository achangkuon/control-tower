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
	"slices"
	"sort"
	"strings"
	"time"
)

// despacho is an internal observation, not an assignment or planning record.
// Producers must persist a review-ready witness (an Intercom receipt
// projection, or the explicit "local" witness) before advertising review
// readiness. `radar marcar` and `radar desmarcar` are the only commands that
// write or remove a marker, and only the exact <ID>.json file; Radar never
// repairs one and no other command writes under the Git common directory.
type despacho struct {
	Schema      string         `json:"schema"`
	Sesion      string         `json:"sesion"`
	Worktree    string         `json:"worktree"`
	Branch      string         `json:"branch"`
	Worker      string         `json:"worker"`
	ReviewReady *reviewWitness `json:"review_ready,omitempty"`
}

// reviewWitness is a persisted projection of one "listo para revisión" signal
// bound to this exact dispatch identity: a received Intercom message
// (transport "intercom", written by the V2 coordinator) or the local
// attestation written by `radar marcar <ID> --listo` (transport "local").
type reviewWitness struct {
	Transport  string `json:"transport"`
	Type       string `json:"type"`
	MessageID  string `json:"message_id"`
	Sesion     string `json:"sesion"`
	ReceivedAt string `json:"received_at"`
	Worker     string `json:"worker"`
	Worktree   string `json:"worktree"`
	Branch     string `json:"branch"`
}

var dispatchID = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._-]*$`)

// Replaced only by deterministic read-once tests.
var readDispatchMarker = leerDespacho

// Each command captures marker bytes and liveness once. All projections use
// this immutable value rather than rereading changing on-disk evidence.
type dispatchObservation struct {
	markers map[string]*despacho
	live    map[string]bool
	orphan  []string
	invalid []string

	piloto pilotObservation
}

func (p *Plan) observarDespachos(root string) dispatchObservation {
	obs := dispatchObservation{markers: map[string]*despacho{}, live: map[string]bool{}}
	if root == "" {
		return obs
	}
	for _, s := range p.Sesiones {
		m, err := readDispatchMarker(root, s.ID)
		switch {
		case err != nil:
			obs.invalid = append(obs.invalid, s.ID)
		case m == nil:
			continue
		default:
			obs.markers[s.ID] = m
			if despachoVivo(root, *m) {
				obs.live[s.ID] = true
			} else {
				obs.orphan = append(obs.orphan, s.ID)
			}
		}
	}
	sort.Strings(obs.orphan)
	sort.Strings(obs.invalid)
	obs.piloto = p.observarPiloto(root)
	return obs
}

func leerDespacho(root, id string) (*despacho, error) {
	if !dispatchID.MatchString(id) || id == "." || id == ".." {
		return nil, fmt.Errorf("ID de despacho inválido")
	}
	if root == "" {
		return nil, nil
	}
	common, err := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		return nil, err
	}
	data, err := leerArchivoDespacho(common, id)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// encoding/json accepts duplicate keys by default; an internal receipt must not.
	probe := json.NewDecoder(bytes.NewReader(data))
	token, err := probe.Token()
	if err != nil || token != json.Delim('{') {
		return nil, fmt.Errorf("marcador de despacho no es un objeto")
	}
	if err := camposUnicos(probe); err != nil {
		return nil, err
	}
	var m despacho
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&m); err != nil {
		return nil, err
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return nil, fmt.Errorf("marcador de despacho contiene datos adicionales")
	}
	if m.Schema != "radar.despacho/v1" || m.Sesion != id || !workerValido(m.Worker) || !filepath.IsAbs(m.Worktree) || filepath.Clean(m.Worktree) != m.Worktree ||
		!strings.HasPrefix(m.Branch, "refs/heads/") || strings.ContainsAny(m.Branch, " \t\n\r~^:?*[\\") || strings.Contains(m.Branch, "..") || strings.HasSuffix(m.Branch, "/") {
		return nil, fmt.Errorf("contrato de despacho inválido")
	}
	if w := m.ReviewReady; w != nil {
		if (w.Transport != "intercom" && w.Transport != "local") || w.Type != "listo para revisión" || w.MessageID == "" || strings.ContainsAny(w.MessageID, " \t\n\r") || w.Sesion != m.Sesion || w.Worker != m.Worker || w.Worktree != m.Worktree || w.Branch != m.Branch {
			return nil, fmt.Errorf("testigo de revisión no corresponde al despacho")
		}
		if _, err := time.Parse(time.RFC3339, w.ReceivedAt); err != nil {
			return nil, fmt.Errorf("fecha del testigo inválida: %w", err)
		}
	}
	return &m, nil
}

// camposUnicos rejects duplicate keys at every depth, including inside the
// witness; encoding/json otherwise silently accepts the last occurrence.
func camposUnicos(dec *json.Decoder) error {
	seen := map[string]bool{}
	for dec.More() {
		token, err := dec.Token()
		if err != nil {
			return err
		}
		key, ok := token.(string)
		if !ok || seen[key] {
			return fmt.Errorf("campo duplicado o inválido en despacho")
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

// The open seam permits deterministic path/descriptor mismatch tests.
var openDispatchPath = os.Open

type rutaDespacho struct {
	path string
	info os.FileInfo
	dir  bool
}

func identidadDespacho(r rutaDespacho) error {
	info, err := os.Lstat(r.path)
	if err != nil {
		return err
	}
	if (r.dir && !info.IsDir()) || (!r.dir && !info.Mode().IsRegular()) || !os.SameFile(info, r.info) {
		return fmt.Errorf("ruta de despacho no regular o identidad cambiada: %s", r.path)
	}
	return nil
}

// Reject symlinks and non-regular nodes before opening, compare each opened
// descriptor to its Lstat identity, and recheck the whole chain before and
// after reading. No evidence is changed when a path becomes uncertain.
func leerArchivoDespacho(common, id string) ([]byte, error) {
	return leerArchivoEvidencia(common, []string{"chanks", "despachos", id + ".json"})
}

// leerArchivoEvidencia reads one small evidence file under the Git common
// directory with the same fail-closed path discipline for every reader: reject
// symlinks and non-regular nodes before opening, compare each opened descriptor
// to its Lstat identity, and recheck the whole chain before and after reading.
func leerArchivoEvidencia(common string, partes []string) ([]byte, error) {
	paths := []rutaDespacho{{path: common, dir: true}}
	actual := common
	for i, parte := range partes {
		actual = filepath.Join(actual, parte)
		paths = append(paths, rutaDespacho{path: actual, dir: i < len(partes)-1})
	}
	var file *os.File
	for i := range paths {
		r := &paths[i]
		info, err := os.Lstat(r.path)
		if err != nil {
			return nil, err
		}
		if (r.dir && !info.IsDir()) || (!r.dir && !info.Mode().IsRegular()) {
			return nil, fmt.Errorf("ruta de evidencia no regular: %s", r.path)
		}
		opened, err := openDispatchPath(r.path)
		if err != nil {
			return nil, err
		}
		openedInfo, err := opened.Stat()
		if err != nil || !os.SameFile(info, openedInfo) {
			opened.Close()
			return nil, fmt.Errorf("identidad de evidencia cambiada: %s: %v", r.path, err)
		}
		if r.dir {
			opened.Close()
		} else {
			file = opened
			defer file.Close()
			if openedInfo.Size() > 4096 {
				return nil, fmt.Errorf("evidencia demasiado grande")
			}
		}
		r.info = info
	}
	for _, r := range paths {
		if err := identidadDespacho(r); err != nil {
			return nil, err
		}
	}
	data, err := io.ReadAll(io.LimitReader(file, 4097))
	if err != nil {
		return nil, err
	}
	if len(data) > 4096 {
		return nil, fmt.Errorf("evidencia demasiado grande")
	}
	for _, r := range paths {
		if err := identidadDespacho(r); err != nil {
			return nil, err
		}
	}
	return data, nil
}

func despachoVivo(root string, m despacho) bool {
	info, err := os.Lstat(m.Worktree)
	if err != nil || !info.IsDir() {
		return false
	}
	resolved, err := gitOutput(m.Worktree, "rev-parse", "--show-toplevel")
	if err != nil || resolved != m.Worktree {
		return false
	}
	from, err := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		return false
	}
	to, err := gitOutput(m.Worktree, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil || from != to {
		return false
	}
	branch, err := gitOutput(m.Worktree, "symbolic-ref", "--quiet", "HEAD")
	if err != nil || branch != m.Branch {
		return false
	}
	_, err = gitOutput(root, "show-ref", "--verify", m.Branch)
	return err == nil
}

// marcaPiloto is the radar.piloto/v1 mark `piloto` writes in the Git common
// directory, next to Radar's dispatch markers. Radar only ever reads it: it
// computes states from this evidence and never creates, edits or removes one
// (decision P2). The schema is fixed so the writer tool (S215) implements the
// same contract:
//
//   - schema: always "radar.piloto/v1".
//   - sesion: the Sesión ID this mark belongs to; it must match the file name.
//   - vuelo: the flight that owns the Sesión, a safe identifier.
//   - rama: the flight branch, exactly
//     "refs/heads/piloto/<fecha>/vuelo-<vuelo>".
//   - estado: one of "en-curso" (a live dispatch), "novedad" (stopped for a
//     decision) or "cierre" (finished, awaiting review).
//   - motivo: required for "novedad", one of "decisión delicada",
//     "no se pudo inferir" or "interrumpida"; empty otherwise.
//   - decisiones: count of minor decisions the agent annotated; "cierre" only.
//   - commit: the Sesión's delivery commit; "cierre" only. Radar checks with
//     Git that it is reachable from rama and that rama was not pushed, which
//     is what turns the mark into POR REVISAR.
//   - ronda: the Sesión's floor inside its flight, at least 1.
//
// A malformed mark never grants a state: Radar fails closed and reports it as
// invalid, exactly like a malformed dispatch marker.
type marcaPiloto struct {
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

// interruptorPiloto is the radar.piloto.interruptor/v1 switch `piloto` writes in
// the Git common directory. Radar reads it to choose the LISTO rule and never
// writes it (P2, P6). Schema:
//
//   - schema: always "radar.piloto.interruptor/v1".
//   - prendido: whether the pilot mode is on.
//   - rondas: the run's round ceiling; 0 means no limit, otherwise 1..3.
//   - tope: the run's Sesión cap; 0 means no cap.
//
// An absent switch reads as off, and a malformed one reads as off too, so a
// corrupt file can only make the rule more conservative, never less.
type interruptorPiloto struct {
	Schema   string `json:"schema"`
	Prendido bool   `json:"prendido"`
	Rondas   int    `json:"rondas"`
	Tope     int    `json:"tope"`
}

const (
	marcaPilotoSchema       = "radar.piloto/v1"
	interruptorPilotoSchema = "radar.piloto.interruptor/v1"

	pilotoEnCurso = "en-curso"
	pilotoNovedad = "novedad"
	pilotoCierre  = "cierre"
)

var vueloID = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*$`)

// ramaDeVuelo accepts exactly the branch naming the design fixes:
// refs/heads/piloto/<fecha>/vuelo-<vuelo>.
func ramaDeVuelo(rama, vuelo string) bool {
	if !strings.HasPrefix(rama, "refs/heads/piloto/") || !strings.HasSuffix(rama, "/vuelo-"+vuelo) {
		return false
	}
	if strings.ContainsAny(rama, " \t\n\r~^:?*[\\") || strings.Contains(rama, "..") || strings.Contains(rama, "//") || strings.HasSuffix(rama, "/") {
		return false
	}
	return strings.TrimPrefix(strings.TrimSuffix(rama, "/vuelo-"+vuelo), "refs/heads/piloto/") != ""
}

func motivoDePilotoValido(motivo string) bool {
	return motivo == MotivoDecisionDelicada || motivo == MotivoNoSePudoInferir || motivo == MotivoInterrumpida
}

func validarMarcaPiloto(m marcaPiloto, id string) error {
	if m.Schema != marcaPilotoSchema || m.Sesion != id {
		return fmt.Errorf("contrato de piloto inválido")
	}
	if !vueloID.MatchString(m.Vuelo) || !ramaDeVuelo(m.Rama, m.Vuelo) || m.Ronda < 1 || m.Decisiones < 0 {
		return fmt.Errorf("contrato de piloto inválido")
	}
	switch m.Estado {
	case pilotoEnCurso:
		if m.Motivo != "" || m.Commit != "" {
			return fmt.Errorf("contrato de piloto inválido")
		}
	case pilotoNovedad:
		if !motivoDePilotoValido(m.Motivo) || m.Commit != "" {
			return fmt.Errorf("contrato de piloto inválido")
		}
	case pilotoCierre:
		if m.Motivo != "" || m.Commit == "" {
			return fmt.Errorf("contrato de piloto inválido")
		}
	default:
		return fmt.Errorf("contrato de piloto inválido")
	}
	return nil
}

func decodificarEvidencia(data []byte, out any) error {
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

func leerMarcaPiloto(root, id string) (*marcaPiloto, error) {
	if !dispatchID.MatchString(id) || id == "." || id == ".." {
		return nil, fmt.Errorf("ID de piloto inválido")
	}
	if root == "" {
		return nil, nil
	}
	common, err := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		return nil, err
	}
	data, err := leerArchivoEvidencia(common, []string{"chanks", "piloto", "marcas", id + ".json"})
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var m marcaPiloto
	if err := decodificarEvidencia(data, &m); err != nil {
		return nil, err
	}
	if err := validarMarcaPiloto(m, id); err != nil {
		return nil, err
	}
	return &m, nil
}

func leerInterruptorPiloto(root string) (*interruptorPiloto, error) {
	if root == "" {
		return nil, nil
	}
	common, err := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		return nil, err
	}
	data, err := leerArchivoEvidencia(common, []string{"chanks", "piloto", "interruptor.json"})
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var i interruptorPiloto
	if err := decodificarEvidencia(data, &i); err != nil {
		return nil, err
	}
	if i.Schema != interruptorPilotoSchema || i.Rondas < 0 || i.Rondas > 3 || i.Tope < 0 {
		return nil, fmt.Errorf("contrato de interruptor inválido")
	}
	return &i, nil
}

// pilotObservation is the immutable sample of pilot evidence every projection of
// one command reads: the switch and each Sesión's mark. A command captures it
// once, exactly like the dispatch markers, so nothing rereads changing on-disk
// state mid-render. Radar never writes any of it (P2).
type pilotObservation struct {
	interruptor         *interruptorPiloto
	interruptorInvalido bool
	marcas              map[string]*marcaPiloto
	enCurso             map[string]bool
	novedad             map[string]string
	porRevisar          map[string]string
	vuelo               map[string]string
	invalid             []string
}

func (o pilotObservation) activo() bool { return o.interruptor != nil && o.interruptor.Prendido }

func (p *Plan) observarPiloto(root string) pilotObservation {
	po := pilotObservation{
		marcas:     map[string]*marcaPiloto{},
		enCurso:    map[string]bool{},
		novedad:    map[string]string{},
		porRevisar: map[string]string{},
		vuelo:      map[string]string{},
	}
	if root == "" {
		return po
	}
	if i, err := leerInterruptorPiloto(root); err != nil {
		po.interruptorInvalido = true
	} else {
		po.interruptor = i
	}
	for _, s := range p.Sesiones {
		m, err := leerMarcaPiloto(root, s.ID)
		switch {
		case err != nil:
			po.invalid = append(po.invalid, s.ID)
		case m == nil:
			continue
		default:
			po.marcas[s.ID] = m
			po.vuelo[s.ID] = m.Vuelo
			switch m.Estado {
			case pilotoEnCurso:
				po.enCurso[s.ID] = true
			case pilotoNovedad:
				po.novedad[s.ID] = m.Motivo
			case pilotoCierre:
				if nota, ok := p.revisionPendiente(root, *m); ok {
					po.porRevisar[s.ID] = nota
				}
			}
		}
	}
	sort.Strings(po.invalid)
	return po
}

// revisionPendiente is POR REVISAR deduced from Git, never declared by the mark:
// the Sesión's delivery commit has to be reachable from the flight branch and
// that branch must not have been pushed or integrated yet.
func (p *Plan) revisionPendiente(root string, m marcaPiloto) (string, bool) {
	if !commitEnRamaDeVuelo(root, m.Commit, m.Rama) {
		return "", false
	}
	if ramaVueloSubida(root, m.Rama) {
		return "", false
	}
	return notaRevision(m.Decisiones), true
}

// motivoEtapa is serialized as a single machine-readable reason on refusal.
type motivoEtapa struct {
	Reason string `json:"reason"`
}

func rechazarEtapa(reason string) error {
	data, _ := json.Marshal(motivoEtapa{Reason: reason})
	return errors.New(string(data))
}

type etapaOferta struct {
	Schema string `json:"schema"`
	Sesion string `json:"sesion,omitempty"`
	Etapa  int    `json:"etapa"`
	Nombre string `json:"nombre"`
}

func tareasCerradas(worktree, id string) bool {
	for _, dir := range []string{filepath.Join(worktree, "odd"), filepath.Join(worktree, "odd", "tasks")} {
		info, err := os.Lstat(dir)
		if err != nil || !info.IsDir() {
			return false
		}
	}
	entries, err := os.ReadDir(filepath.Join(worktree, "odd", "tasks"))
	if err != nil {
		return false
	}
	prefix := strings.ToLower(id)
	matches := 0
	done := false
	for _, entry := range entries {
		name := strings.ToLower(entry.Name())
		if name != prefix+".md" && !(strings.HasPrefix(name, prefix+"-") && strings.HasSuffix(name, ".md")) {
			continue
		}
		matches++
		if !entry.Type().IsRegular() {
			continue
		}
		data, err := os.ReadFile(filepath.Join(worktree, "odd", "tasks", entry.Name()))
		if err != nil {
			continue
		}
		checked, unchecked := 0, 0
		for _, line := range strings.Split(string(data), "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "- [x] ") || strings.HasPrefix(trimmed, "- [X] ") {
				checked++
			}
			if trimmed == "- [ ]" || strings.HasPrefix(trimmed, "- [ ] ") {
				unchecked++
			}
		}
		done = checked > 0 && unchecked == 0
	}
	return matches == 1 && done
}

func cmdEtapa(w io.Writer, p *Plan, root, id string) error {
	offer := etapaOferta{Schema: "radar.etapa/v1"}
	if id == "" {
		offer.Etapa, offer.Nombre = 1, "Definir"
	} else {
		s, ok := p.SesionPorID()[id]
		if !ok {
			return rechazarEtapa("sesion_desconocida")
		}
		head, err := gitHEAD(root)
		if err != nil {
			return rechazarEtapa("git_no_disponible")
		}
		if err := validarAt(p, root, head, "etapa"); err != nil {
			return rechazarEtapa("plan_invalido")
		}
		obs := p.observarDespachos(root)
		state := p.estadosConObservacion(root, head, nil, obs)[id]
		marker := obs.markers[id]
		if slices.Contains(obs.invalid, id) {
			return rechazarEtapa("marcador_invalido")
		}
		offer.Sesion = id
		switch {
		case state == Bloqueado && s.encargoIncompleto() && s.Entrega == nil && !p.ledgerDecisionRequired[id] && !bloqueaAqui(s) && !p.contaminadaPorEscala(id):
			offer.Etapa, offer.Nombre = 2, "Preparar"
		case marker != nil && !obs.live[id]:
			return rechazarEtapa("despacho_huerfano")
		case state == Listo:
			offer.Etapa, offer.Nombre = 3, "Despachar"
		case state == EnCurso:
			offer.Etapa, offer.Nombre = 4, "Implementar y revisar"
			if marker != nil && marker.ReviewReady != nil && tareasCerradas(marker.Worktree, id) {
				offer.Etapa, offer.Nombre = 5, "Entregar y cerrar"
			}
		default:
			return rechazarEtapa("etapa_no_aplicable")
		}
	}
	return json.NewEncoder(w).Encode(offer)
}

func workerValido(w string) bool { return w != "" && !strings.ContainsAny(w, " /\\\t\n\r") }

func idDespachoValido(id string) error {
	if !dispatchID.MatchString(id) || id == "." || id == ".." {
		return fmt.Errorf("ID de despacho inválido: %q", id)
	}
	return nil
}

// directorioDespachos returns <common>/chanks/despachos after Lstat-checking
// every component: a symlink or non-directory is refused, never followed. With
// crear, a missing component is created (0700) only after its parent passed;
// otherwise a missing component yields os.ErrNotExist so callers mutate nothing.
func directorioDespachos(common string, crear bool) (string, error) {
	current := common
	for _, part := range []string{"", "chanks", "despachos"} {
		current = filepath.Join(current, part)
		info, err := os.Lstat(current)
		if errors.Is(err, os.ErrNotExist) && crear {
			if err = os.Mkdir(current, 0o700); err == nil {
				info, err = os.Lstat(current)
			}
		}
		if err != nil {
			return "", err
		}
		if !info.IsDir() {
			return "", fmt.Errorf("ruta de despacho es un enlace simbólico o no es directorio: %s", current)
		}
	}
	return current, nil
}

// marcadorNodo Lstat-s <despachos>/<ID>.json. A nil info means nothing is there;
// the path is returned either way so a refusal can name it.
func marcadorNodo(common, id string) (string, os.FileInfo, error) {
	dir, err := directorioDespachos(common, false)
	if errors.Is(err, os.ErrNotExist) {
		return "", nil, nil
	}
	if err != nil {
		return "", nil, err
	}
	path := filepath.Join(dir, id+".json")
	info, err := os.Lstat(path)
	if errors.Is(err, os.ErrNotExist) {
		return path, nil, nil
	}
	return path, info, err
}

// rechazoPorColision refuses a Session that would share a lot with another Session
// that is already EN CURSO (live marker), reusing clasificarPar on the two Sesión
// records: only `compatible` passes. Orphan and invalid markers are not live.
func (p *Plan) rechazoPorColision(obs dispatchObservation, s *Sesion) error {
	for _, other := range p.Sesiones {
		if other.ID == s.ID || !obs.live[other.ID] {
			continue
		}
		if par := clasificarPar(alternativaDe(&other), alternativaDe(s)); par.Clase != Compatible {
			return fmt.Errorf("la Sesión %s no se marca: choca con %s, que ya está EN CURSO (%s: %s; %s)",
				s.ID, other.ID, par.Clase, par.Motivo, strings.Join(par.Detalle, ", "))
		}
	}
	return nil
}

// rechazoPorWorktreeUsado refuses a worktree path or branch that any other
// marker, live or orphan, already names. The primary checkout is covered too.
func rechazoPorWorktreeUsado(obs dispatchObservation, p *Plan, m despacho) error {
	for _, other := range p.Sesiones {
		o := obs.markers[other.ID]
		if o == nil || other.ID == m.Sesion {
			continue
		}
		if o.Worktree == m.Worktree {
			return fmt.Errorf("el worktree %s ya lo usa %s; cada Sesión necesita el suyo", m.Worktree, other.ID)
		}
		if o.Branch == m.Branch {
			return fmt.Errorf("la rama %s ya la usa %s; cada Sesión necesita la suya", m.Branch, other.ID)
		}
	}
	return nil
}

// escribirMarcador writes the marker through a same-directory temp file. A new
// marker is published with link(2), which fails if the name exists, so a
// concurrent writer is never overwritten; an update replaces by rename.
func escribirMarcador(common string, m despacho, reemplazar bool) error {
	dir, err := directorioDespachos(common, true)
	if err != nil {
		return err
	}
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	tmp := filepath.Join(dir, fmt.Sprintf(".%s.json.tmp-%d", m.Sesion, os.Getpid()))
	file, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return err
	}
	defer os.Remove(tmp)
	_, err = file.Write(append(data, '\n'))
	if err == nil {
		err = file.Sync()
	}
	if closeErr := file.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	final := filepath.Join(dir, m.Sesion+".json")
	if reemplazar {
		return os.Rename(tmp, final)
	}
	if err := os.Link(tmp, final); err != nil {
		if errors.Is(err, os.ErrExist) {
			return fmt.Errorf("ya existe un marcador de despacho para %s", m.Sesion)
		}
		return err
	}
	return nil
}

func saneaWorker(base string) string {
	w := strings.Map(func(r rune) rune {
		if strings.ContainsRune(" /\\\t\n\r", r) {
			return '-'
		}
		return r
	}, base)
	if w == "" || w == "." || w == ".." {
		return "worker"
	}
	return w
}

func commonDir(dir string) (string, error) {
	return gitOutput(dir, "rev-parse", "--path-format=absolute", "--git-common-dir")
}

// admisionMarcar runs the admission every marcar route shares before it reads
// or writes any dispatch evidence: ID shape, known Sesión, pinned HEAD, plan
// validation and the Git common directory. Keeping one body means the fresh
// route cannot drift from the one users already trust.
func admisionMarcar(p *Plan, root, id, comando string) (string, string, error) {
	if err := idDespachoValido(id); err != nil {
		return "", "", err
	}
	if _, ok := p.SesionPorID()[id]; !ok {
		return "", "", fmt.Errorf("la Sesión %s no existe", id)
	}
	head, err := gitHEAD(root)
	if err != nil {
		return "", "", fmt.Errorf("no se pudo fijar HEAD: %w", err)
	}
	if err := validarAt(p, root, head, comando); err != nil {
		return "", "", err
	}
	common, err := commonDir(root)
	if err != nil {
		return "", "", err
	}
	return head, common, nil
}

// cmdMarcar marks a LISTO Session EN CURSO by writing the dispatch marker the
// readers already accept. Every check runs before the first mutation.
func cmdMarcar(w io.Writer, p *Plan, root, id, worktree, worker string) error {
	head, common, err := admisionMarcar(p, root, id, "marcar")
	if err != nil {
		return err
	}
	if path, info, err := marcadorNodo(common, id); err != nil {
		return err
	} else if info != nil && !info.Mode().IsRegular() {
		return fmt.Errorf("%s no es un archivo regular y radar desmarcar no lo quita; quítalo a mano", path)
	} else if info != nil {
		return fmt.Errorf("ya existe un marcador de despacho para %s; usa radar desmarcar %s", id, id)
	}
	if state := p.EstadosAt(root, head)[id]; state != Listo {
		return fmt.Errorf("la Sesión %s está %s; sólo se marca una Sesión LISTO", id, state)
	}
	if !filepath.IsAbs(worktree) || filepath.Clean(worktree) != worktree {
		return fmt.Errorf("el worktree debe ser una ruta absoluta normalizada: %q", worktree)
	}
	if info, err := os.Lstat(worktree); err != nil || !info.IsDir() {
		return fmt.Errorf("el worktree %s no existe o no es un directorio", worktree)
	}
	if top, err := gitOutput(worktree, "rev-parse", "--show-toplevel"); err != nil || top != worktree {
		return fmt.Errorf("el worktree %s no es la raíz canónica de un worktree Git", worktree)
	}
	if other, err := commonDir(worktree); err != nil || other != common {
		return fmt.Errorf("el worktree %s no comparte el repositorio de %s", worktree, root)
	}
	branch, err := gitOutput(worktree, "symbolic-ref", "--quiet", "HEAD")
	if err != nil {
		return fmt.Errorf("el worktree %s tiene HEAD detached; se requiere una rama", worktree)
	}
	if _, err := gitOutput(root, "show-ref", "--verify", branch); err != nil {
		return fmt.Errorf("la rama %s del worktree no existe todavía (sin commits)", branch)
	}
	if worker == "" {
		worker = saneaWorker(filepath.Base(worktree))
	}
	if !workerValido(worker) {
		return fmt.Errorf("worker inválido %q: no admite espacios ni barras", worker)
	}
	m := despacho{Schema: "radar.despacho/v1", Sesion: id, Worktree: worktree, Branch: branch, Worker: worker}
	if !despachoVivo(root, m) {
		return fmt.Errorf("el worktree %s no cumple el contrato de despacho vivo", worktree)
	}
	obs := p.observarDespachos(root)
	if err := rechazoPorWorktreeUsado(obs, p, m); err != nil {
		return err
	}
	if err := p.rechazoPorColision(obs, p.SesionPorID()[id]); err != nil {
		return err
	}
	if err := escribirMarcador(common, m, false); err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "✓ %s marcada EN CURSO (worker %s, rama %s)\n", id, worker, branch)
	return err
}

// cmdReactivar re-admits a Session that is already EN CURSO when its worker
// died, using the dispatch marker that already exists. It never writes, touches
// or recreates a marker: the exact original bytes survive, so the reactivation
// leaves the evidence a later review reads untouched. Every check runs before
// the first mutation, and this route never mutates.
func cmdReactivar(w io.Writer, p *Plan, root, id string) error {
	head, common, err := admisionMarcar(p, root, id, "reactivar")
	if err != nil {
		return err
	}
	// A LISTO Session has not been dispatched yet: plain marcar creates its
	// fresh marker, never this route that preserves an existing identity.
	if state := p.EstadosAt(root, head)[id]; state != EnCurso {
		return fmt.Errorf("la Sesión %s está %s; --reactivar sólo reactiva una Sesión EN CURSO (una Sesión LISTO se despacha con radar marcar sin --reactivar)", id, state)
	}
	path, info, err := marcadorNodo(common, id)
	if err != nil {
		return err
	}
	if info == nil {
		return fmt.Errorf("no hay marcador de despacho para %s; radar marcar sin --reactivar crea un despacho nuevo", id)
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("%s no es un archivo regular y radar desmarcar no lo quita; quítalo a mano", path)
	}
	m, err := leerDespacho(root, id)
	if err != nil {
		return fmt.Errorf("el marcador de despacho de %s es contradictorio: %w", id, err)
	}
	if m == nil {
		return fmt.Errorf("no hay marcador de despacho para %s; radar marcar sin --reactivar crea un despacho nuevo", id)
	}
	if err := reconciliarDespacho(root, *m); err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "✓ %s reactivada (worker %s, rama %s)\n", id, m.Worker, m.Branch)
	return err
}

// reconciliarDespacho re-derives the worktree and branch identity an existing
// marker declares from fresh Git evidence, naming the first broken check. It
// mirrors despachoVivo's semantics while keeping the failures specific, so a
// reactive refusal says which fact changed instead of one generic message.
func reconciliarDespacho(root string, m despacho) error {
	if info, err := os.Lstat(m.Worktree); err != nil || !info.IsDir() {
		return fmt.Errorf("el worktree %s del marcador ya no existe o no es un directorio", m.Worktree)
	}
	if top, err := gitOutput(m.Worktree, "rev-parse", "--show-toplevel"); err != nil || top != m.Worktree {
		return fmt.Errorf("el worktree %s del marcador no es la raíz canónica de un worktree Git", m.Worktree)
	}
	from, err := commonDir(root)
	if err != nil {
		return err
	}
	to, err := commonDir(m.Worktree)
	if err != nil || from != to {
		return fmt.Errorf("el worktree %s del marcador no comparte el repositorio de %s", m.Worktree, root)
	}
	branch, err := gitOutput(m.Worktree, "symbolic-ref", "--quiet", "HEAD")
	if err != nil {
		return fmt.Errorf("el worktree %s del marcador tiene HEAD detached; se requiere una rama", m.Worktree)
	}
	if branch != m.Branch {
		return fmt.Errorf("la rama del worktree cambió: el marcador declara %s y el worktree está en %s", m.Branch, branch)
	}
	if _, err := gitOutput(root, "show-ref", "--verify", m.Branch); err != nil {
		return fmt.Errorf("la rama %s del marcador no existe todavía (sin commits)", m.Branch)
	}
	if !workerValido(m.Worker) {
		return fmt.Errorf("worker inválido %q: no admite espacios ni barras", m.Worker)
	}
	return nil
}

// cmdMarcarListo records the local review-ready witness on a live marker so
// stage 5 is reachable without Intercom.
func cmdMarcarListo(w io.Writer, p *Plan, root, id string) error {
	if err := idDespachoValido(id); err != nil {
		return err
	}
	m, err := leerDespacho(root, id)
	if err != nil {
		return fmt.Errorf("marcador de %s inválido: %w", id, err)
	}
	if m == nil {
		return fmt.Errorf("no existe un marcador para %s; usa radar marcar primero", id)
	}
	if !despachoVivo(root, *m) {
		return fmt.Errorf("el marcador de %s es huérfano: su worktree o rama ya no existen", id)
	}
	if m.ReviewReady != nil {
		return fmt.Errorf("%s ya está marcada lista para revisión", id)
	}
	now := time.Now().UTC()
	m.ReviewReady = &reviewWitness{Transport: "local", Type: "listo para revisión", MessageID: fmt.Sprintf("local-%d", now.UnixNano()), Sesion: id,
		ReceivedAt: now.Format(time.RFC3339), Worker: m.Worker, Worktree: m.Worktree, Branch: m.Branch}
	common, err := commonDir(root)
	if err != nil {
		return err
	}
	if err := escribirMarcador(common, *m, true); err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "✓ %s lista para revisión (testigo local)\n", id)
	return err
}

// cmdDesmarcar removes exactly <despachos>/<ID>.json. It also removes an
// orphan or invalid marker (that is its purpose) but never a symlink or other
// non-regular node, and never touches worktrees, branches or the plan.
func cmdDesmarcar(w io.Writer, root, id string) error {
	if err := idDespachoValido(id); err != nil {
		return err
	}
	common, err := commonDir(root)
	if err != nil {
		return err
	}
	dir, err := directorioDespachos(common, false)
	if errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("no existe un marcador para %s", id)
	}
	if err != nil {
		return err
	}
	path := filepath.Join(dir, id+".json")
	info, err := os.Lstat(path)
	if errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("no existe un marcador para %s", id)
	}
	if err != nil {
		return err
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("el marcador de %s no es un archivo regular; no se quita", id)
	}
	if err := os.Remove(path); err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "✓ %s desmarcada\n", id)
	return err
}
