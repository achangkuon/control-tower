// Package main implements `radar`, the deterministic planning tool.
//
// openspec/plan.yaml is the only mutable planning source. Everything derivable —
// state, queues, progress, available seats, Área and openspec/ROADMAP.md — is
// computed here and never written by hand.
package main

import (
	"fmt"
	"io"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// Plan is the single written artifact for one product.
type Plan struct {
	Schema        string      `yaml:"schema"`
	SchemaVersion int         `yaml:"schema_version"`
	Producto      string      `yaml:"producto"`
	Raiz          string      `yaml:"raiz"`
	Zonas         []Zona      `yaml:"zonas"`
	Cimientos     Cimientos   `yaml:"cimientos"`
	Sesiones      []Sesion    `yaml:"sesiones"`
	References    *References `yaml:"references"`

	ledgerDecisionRequired map[string]bool
}

// Zona is a set of files with a single owner. Defined by paths, never by theme.
type Zona struct {
	ID        string   `yaml:"id"`
	Nombre    string   `yaml:"nombre"`
	Rutas     []string `yaml:"rutas"`
	DependeDe []string `yaml:"depende_de"`
}

// Cimientos classifies shared terrain that no Zona owns. Its rules may be
// directories or patterns; each Sesion reservation must still name exact files.
type Cimientos struct {
	Rutas []string `yaml:"rutas"`
}

// Sesion is one independently reviewable result, inside exactly one Zona.
// There is deliberately no Estado or Área field: both are derived.
type Sesion struct {
	ID                string             `yaml:"id"`
	Zona              string             `yaml:"zona"`
	Resultado         string             `yaml:"resultado"`
	Autoridad         Autoridad          `yaml:"autoridad"`
	Cambio            string             `yaml:"cambio"`
	DependeDe         []string           `yaml:"depende_de"`
	Cimientos         []string           `yaml:"cimientos"`
	Recurso           []string           `yaml:"recurso"`
	Criterios         []string           `yaml:"criterios"`
	Decisiones        []Decision         `yaml:"decisiones"`
	Reemplaza         []string           `yaml:"reemplaza"`
	Modulos           []Modulo           `yaml:"modulos"`
	RutasHistoricas   []string           `yaml:"rutas_historicas"`
	Ruta              RutaSesion         `yaml:"ruta"`
	Entrega           *Entrega           `yaml:"entrega"`
	Diferida          bool               `yaml:"diferida"`
	Archivada         bool               `yaml:"archivada"`
	ImportacionLegacy *ImportacionLegacy `yaml:"importacion_legacy"`
}

// ImportacionLegacy proves that a Session was imported from one immutable legacy row.
type ImportacionLegacy struct {
	OrigenCommit           string `yaml:"origen_commit"`
	OrigenRuta             string `yaml:"origen_ruta"`
	OrigenBlob             string `yaml:"origen_blob"`
	OrigenEncabezado       string `yaml:"origen_encabezado"`
	TerritorioPendiente    bool   `yaml:"territorio_pendiente"`
	DescomposicionDiferida bool   `yaml:"descomposicion_diferida"`
}

// References is closed, non-executable context outside sesiones: neither kind grants status, ownership, queue, seat, capacity, or completion.
type References struct {
	FutureSuccessors []FutureSuccessor  `yaml:"future_successors"`
	SatisfiedHistory []SatisfiedHistory `yaml:"satisfied_history"`
}

// FutureSuccessor registers one approved successor's lineage before it is planned and approved as a full Sesion.
type FutureSuccessor struct {
	ID               string          `yaml:"id"`
	Reason           string          `yaml:"reason"`
	Result           string          `yaml:"result"`
	Zone             string          `yaml:"zone"`
	Dependencies     []string        `yaml:"dependencies"`
	Foundations      []string        `yaml:"foundations"`
	Replaces         []string        `yaml:"replaces"`
	AssignmentSource FragmentLocator `yaml:"assignment_source"`
}

// SatisfiedHistory registers one dependency edge already proven by legacy evidence; it never replaces a Sesion or becomes a dependency target.
type SatisfiedHistory struct {
	ID             string          `yaml:"id"`
	Reason         string          `yaml:"reason"`
	TerminalSource FragmentLocator `yaml:"terminal_source"`
}

// FragmentLocator fixes one immutable byte-exact fragment: commit, safe path, regular blob, line/byte bounds, and SHA-256.
type FragmentLocator struct {
	Commit         string `yaml:"commit"`
	Path           string `yaml:"path"`
	Blob           string `yaml:"blob"`
	LineStart      int    `yaml:"line_start"`
	LineEnd        int    `yaml:"line_end"`
	ByteStart      int    `yaml:"byte_start"`
	ByteEnd        int    `yaml:"byte_end"`
	FragmentSHA256 string `yaml:"fragment_sha256"`
}

// TiposDeAutoridad is the closed set. `repo` and `decision` resolve to exact
// bytes in Git. `engram` is declared and never verified: it lives outside this
// repository, and proving an id exists today would not prove its content is
// still what the Sesión cited, because Engram is mutable. Radar depends on git
// and gentle-ai only, so the Método stays portable to a repository that has
// neither Engram nor the Tower.
var TiposDeAutoridad = []string{"repo", "decision", "engram"}

// Autoridad is where a Sesión says it came from. It accepts two shapes: the
// legacy free-text string, and the typed form. Both are accepted until S115
// requires the type — S114 migrates one Zona per Módulo, so demanding it now
// would fail every Sesión at once.
type Autoridad struct {
	Texto string // legacy free text; empty once the typed form is used

	Tipo string          // one of TiposDeAutoridad
	Ref  int             // decision number, `decision` only
	ID   int             // observation id, `engram` only
	Loc  FragmentLocator // `repo` and `decision` only
}

type autoridadTipada struct {
	Tipo            string `yaml:"tipo"`
	Ref             int    `yaml:"ref"`
	ID              int    `yaml:"id"`
	FragmentLocator `yaml:",inline"`
}

// UnmarshalYAML accepts a scalar or a mapping. A mapping that is not the typed
// shape fails here rather than resolving to an empty authority, which would
// read downstream as "not declared" and hide the real mistake.
func (a *Autoridad) UnmarshalYAML(value *yaml.Node) error {
	if value.Kind == yaml.ScalarNode {
		a.Texto = value.Value
		return nil
	}
	var forma autoridadTipada
	if err := value.Decode(&forma); err != nil {
		return err
	}
	a.Tipo, a.Ref, a.ID, a.Loc = forma.Tipo, forma.Ref, forma.ID, forma.FragmentLocator
	return nil
}

// Declarada reports whether the Sesión said anything at all.
func (a Autoridad) Declarada() bool { return strings.TrimSpace(a.Texto) != "" || a.Tipo != "" }

// Tipada reports whether it uses the typed form rather than free text.
func (a Autoridad) Tipada() bool { return a.Tipo != "" }

// Modulo groups concrete files that change together inside a Sesion.
type Modulo struct {
	ID        string   `yaml:"id"`
	Resultado string   `yaml:"resultado"`
	ReadOnly  bool     `yaml:"read_only"`
	Rutas     []string `yaml:"rutas"`
	Tareas    []Tarea  `yaml:"tareas"`
}

// Tarea is one atomic action with observable, binary criteria.
type Tarea struct {
	ID        string   `yaml:"id"`
	Accion    string   `yaml:"accion"`
	Resultado string   `yaml:"resultado"`
	Criterios []string `yaml:"criterios"`
}

// RutaSesion distinguishes the planning proposal from the implementation-time
// revalidation. The latter may be absent until chanks-3-session-kickoff runs.
type RutaSesion struct {
	Propuesta    string        `yaml:"propuesta"`
	Autoridad    string        `yaml:"autoridad"`
	Revalidacion *Revalidacion `yaml:"revalidacion"`
}

// Revalidacion is the one implementation-time route decision. Base is the exact
// currently checked out HEAD; Evidencia identifies the authority/readiness proof.
type Revalidacion struct {
	Resultado string `yaml:"resultado"`
	Base      string `yaml:"base"`
	Evidencia string `yaml:"evidencia"`
	Razon     string `yaml:"razon"`
}

// Entrega is evidence, never asserted state. PR is optional because direct-push
// repositories still have integrated commits.
type Entrega struct {
	Commit string `yaml:"commit"`
	PR     *int   `yaml:"pr"`
}

// Decision is an open decision point or its immutable closed record.
type Decision struct {
	Tipo         string       `yaml:"tipo"`
	Pregunta     string       `yaml:"pregunta"`
	Criterio     string       `yaml:"criterio"`
	Autoridad    string       `yaml:"autoridad"`
	Evidencia    string       `yaml:"evidencia"`
	Checkpoint   string       `yaml:"checkpoint"`
	Opciones     []Opcion     `yaml:"opciones"`
	Clase        string       `yaml:"clase"`
	Alcanza      string       `yaml:"alcanza"`
	Contamina    []string     `yaml:"contamina"`
	Resolucion   string       `yaml:"resolucion"`
	Descartadas  []Descartada `yaml:"descartadas"`
	Falsificador string       `yaml:"falsificador"`
	Contaminaba  []string     `yaml:"contaminaba"`
}

// Opcion makes each open decision alternative and its product consequence explicit.
type Opcion struct {
	Opcion       string `yaml:"opcion"`
	Consecuencia string `yaml:"consecuencia"`
}

// Descartada preserves an alternative rejected by a closed decision.
type Descartada struct {
	Opcion string `yaml:"opcion"`
	Razon  string `yaml:"razon"`
}

var ClasesQueEscalan = []string{
	"contrato-visible",
	"operacion-irreversible",
	"migracion-o-perdida-de-datos",
	"api-publica",
	"seguridad-y-permisos",
	"dinero-precios-cuotas",
	"expansion-de-alcance",
	"dependencias-o-evidencia-contradictorias",
}

var RutasValidas = []string{"direct", "design-tasks", "full-sdd"}

// Load strictly reads one schema v3 plan document.
func Load(path string) (*Plan, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("no se pudo leer %s: %w", path, err)
	}

	var p Plan
	dec := yaml.NewDecoder(strings.NewReader(string(raw)))
	dec.KnownFields(true)
	if err := dec.Decode(&p); err != nil {
		return nil, fmt.Errorf("%s no es un plan válido: %w", path, err)
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		if err == nil {
			return nil, fmt.Errorf("%s no es un plan válido: contiene otro documento YAML", path)
		}
		return nil, fmt.Errorf("%s no es un plan válido después del primer documento: %w", path, err)
	}
	if p.Schema != "plan" {
		return nil, fmt.Errorf("%s: se esperaba `schema: plan`, se encontró %q", path, p.Schema)
	}
	if p.SchemaVersion != 3 {
		return nil, fmt.Errorf("%s: schema_version %d no soportada; migrá explícitamente el plan a v3", path, p.SchemaVersion)
	}
	return &p, nil
}

func (p *Plan) ZonaPorID() map[string]*Zona {
	out := make(map[string]*Zona, len(p.Zonas))
	for i := range p.Zonas {
		out[p.Zonas[i].ID] = &p.Zonas[i]
	}
	return out
}

func (p *Plan) SesionPorID() map[string]*Sesion {
	out := make(map[string]*Sesion, len(p.Sesiones))
	for i := range p.Sesiones {
		out[p.Sesiones[i].ID] = &p.Sesiones[i]
	}
	return out
}

// Area derives a Sesión's writable Zona paths.
func (p *Plan) Area(s *Sesion) []string {
	if z, ok := p.ZonaPorID()[s.Zona]; ok {
		return z.Rutas
	}
	return nil
}

// RutaEfectiva returns the implementation revalidation when present; otherwise
// it returns the planning proposal.
func (s *Sesion) RutaEfectiva() string {
	if s.Ruta.Revalidacion != nil {
		return s.Ruta.Revalidacion.Resultado
	}
	return s.Ruta.Propuesta
}
