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
// Producers must persist the Intercom receipt projection before advertising
// review readiness. Radar never writes, repairs or removes a marker.
type despacho struct {
	Schema      string         `json:"schema"`
	Sesion      string         `json:"sesion"`
	Worktree    string         `json:"worktree"`
	Branch      string         `json:"branch"`
	Worker      string         `json:"worker"`
	ReviewReady *reviewWitness `json:"review_ready,omitempty"`
}

// reviewWitness is a coordinator-persisted projection of one received Intercom
// "listo para revisión" message, bound to this exact dispatch identity.
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
	if m.Schema != "radar.despacho/v1" || m.Sesion != id || m.Worker == "" || strings.ContainsAny(m.Worker, " /\\\t\n\r") || !filepath.IsAbs(m.Worktree) || filepath.Clean(m.Worktree) != m.Worktree ||
		!strings.HasPrefix(m.Branch, "refs/heads/") || strings.ContainsAny(m.Branch, " \t\n\r~^:?*[\\") || strings.Contains(m.Branch, "..") || strings.HasSuffix(m.Branch, "/") {
		return nil, fmt.Errorf("contrato de despacho inválido")
	}
	if w := m.ReviewReady; w != nil {
		if w.Transport != "intercom" || w.Type != "listo para revisión" || w.MessageID == "" || strings.ContainsAny(w.MessageID, " \t\n\r") || w.Sesion != m.Sesion || w.Worker != m.Worker || w.Worktree != m.Worktree || w.Branch != m.Branch {
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
	paths := []rutaDespacho{
		{path: common, dir: true},
		{path: filepath.Join(common, "chanks"), dir: true},
		{path: filepath.Join(common, "chanks", "despachos"), dir: true},
		{path: filepath.Join(common, "chanks", "despachos", id+".json")},
	}
	var file *os.File
	for i := range paths {
		r := &paths[i]
		info, err := os.Lstat(r.path)
		if err != nil {
			return nil, err
		}
		if (r.dir && !info.IsDir()) || (!r.dir && !info.Mode().IsRegular()) {
			return nil, fmt.Errorf("ruta de despacho no regular: %s", r.path)
		}
		opened, err := openDispatchPath(r.path)
		if err != nil {
			return nil, err
		}
		openedInfo, err := opened.Stat()
		if err != nil || !os.SameFile(info, openedInfo) {
			opened.Close()
			return nil, fmt.Errorf("identidad de despacho cambiada: %s: %v", r.path, err)
		}
		if r.dir {
			opened.Close()
		} else {
			file = opened
			defer file.Close()
			if openedInfo.Size() > 4096 {
				return nil, fmt.Errorf("marcador de despacho demasiado grande")
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
		return nil, fmt.Errorf("marcador de despacho demasiado grande")
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
