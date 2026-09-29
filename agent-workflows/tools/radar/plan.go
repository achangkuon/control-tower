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

// CaminosDeArchivo is the closed set of ways a Sesión leaves the live plan.
// The path is declared, never inferred: reading "historica" from the absence
// of the other two would turn every forgotten delivery into legitimate
// history, which is the mistake the check exists to catch.
var CaminosDeArchivo = []string{"entregada", "reemplazada", "historica"}

// Politica holds planning policy the tool reads rather than assumes. The
// delivery-policy block in AGENTS.md cannot hold this: its field set is
// declared exactly closed and another contract governs it.
type Politica struct {
	// TopeDeLote is the review-lot ceiling in authored lines. Absent means no
	// ceiling was declared, and radar measures nothing — inventing a policy
	// nobody declared is worse than not checking one.
	TopeDeLote     int      `yaml:"tope_de_lote"`
	ExcluirDelLote []string `yaml:"excluir_del_lote"`
}

// Plan is the single written artifact for one product.
type Plan struct {
	Schema        string      `yaml:"schema"`
	SchemaVersion int         `yaml:"schema_version"`
	Producto      string      `yaml:"producto"`
	Raiz          string      `yaml:"raiz"`
	Politica      Politica    `yaml:"politica"`
	Zonas         []Zona      `yaml:"zonas"`
	Prioridades   []Prioridad `yaml:"prioridades"`
	Cimientos     Cimientos   `yaml:"cimientos"`
	Sesiones      []Sesion    `yaml:"sesiones"`
	References    *References `yaml:"references"`

	ledgerDecisionRequired map[string]bool
}

// Prioridad is one entry of the optional, project-defined work order. It is an
// ordering attribute, never a level: it can only postpone ready work.
type Prioridad struct {
	ID     string `yaml:"id"`
	Nombre string `yaml:"nombre"`
}

// PrioridadPorID maps each declared priority id to its position in the list.
// The first occurrence wins and blank ids are skipped; checkPrioridades reports both.
func (p *Plan) PrioridadPorID() map[string]int {
	out := make(map[string]int, len(p.Prioridades))
	for i, pr := range p.Prioridades {
		if _, ya := out[pr.ID]; ya || strings.TrimSpace(pr.ID) == "" {
			continue
		}
		out[pr.ID] = i
	}
	return out
}

// rutasDeclaradas accepts the legacy scalar form and the annotated form while
// retaining []string for production consumers. Annotation positions, rather than
// route values, keep metadata with its owner without duplicating route identity.
type rutasDeclaradas struct {
	values    []string
	ausencias map[int]string
}

var ausenciasIntencionales = map[string]bool{
	"legado-retirado": true,
	"reserva-futura":  true,
}

func (r *rutasDeclaradas) UnmarshalYAML(value *yaml.Node) error {
	if value.Tag == "!!null" {
		return nil
	}
	if value.Kind != yaml.SequenceNode {
		return fmt.Errorf("rutas debe ser una secuencia de escalares o anotaciones")
	}
	for _, entry := range value.Content {
		if entry.Kind == yaml.ScalarNode {
			if strings.TrimSpace(entry.Value) == "" {
				return fmt.Errorf("ruta escalar vacía")
			}
			r.values = append(r.values, entry.Value)
			continue
		}
		if entry.Kind != yaml.MappingNode || len(entry.Content) != 4 {
			return fmt.Errorf("cada ruta anotada debe tener exactamente ruta y ausencia_intencional")
		}
		values := map[string]string{}
		for i := 0; i < len(entry.Content); i += 2 {
			key, field := entry.Content[i], entry.Content[i+1]
			if key.Kind != yaml.ScalarNode || field.Kind != yaml.ScalarNode || (key.Value != "ruta" && key.Value != "ausencia_intencional") {
				return fmt.Errorf("cada ruta anotada debe tener exactamente ruta y ausencia_intencional")
			}
			if _, duplicated := values[key.Value]; duplicated {
				return fmt.Errorf("cada ruta anotada debe tener exactamente ruta y ausencia_intencional")
			}
			values[key.Value] = field.Value
		}
		ruta, ausencia := values["ruta"], values["ausencia_intencional"]
		if strings.TrimSpace(ruta) == "" || strings.TrimSpace(ausencia) == "" || !ausenciasIntencionales[ausencia] {
			return fmt.Errorf("ruta anotada inválida")
		}
		r.values = append(r.values, ruta)
		if r.ausencias == nil {
			r.ausencias = map[int]string{}
		}
		r.ausencias[len(r.values)-1] = ausencia
	}
	return nil
}

func camposConocidos(value *yaml.Node, permitidos map[string]bool) error {
	if value.Kind != yaml.MappingNode {
		return fmt.Errorf("se esperaba una declaración YAML")
	}
	for i := 0; i < len(value.Content); i += 2 {
		if value.Content[i].Kind != yaml.ScalarNode || !permitidos[value.Content[i].Value] {
			return fmt.Errorf("campo desconocido %q", value.Content[i].Value)
		}
	}
	return nil
}

// Zona is a set of files with a single owner. Defined by paths, never by theme.
type Zona struct {
	ID        string   `yaml:"id"`
	Nombre    string   `yaml:"nombre"`
	Rutas     []string `yaml:"rutas"`
	DependeDe []string `yaml:"depende_de"`

	ausenciasIntencionales map[int]string
}

func (z *Zona) UnmarshalYAML(value *yaml.Node) error {
	if err := camposConocidos(value, map[string]bool{"id": true, "nombre": true, "rutas": true, "depende_de": true}); err != nil {
		return err
	}
	var raw struct {
		ID        string          `yaml:"id"`
		Nombre    string          `yaml:"nombre"`
		Rutas     rutasDeclaradas `yaml:"rutas"`
		DependeDe []string        `yaml:"depende_de"`
	}
	if err := value.Decode(&raw); err != nil {
		return err
	}
	z.ID, z.Nombre, z.Rutas, z.DependeDe = raw.ID, raw.Nombre, raw.Rutas.values, raw.DependeDe
	z.ausenciasIntencionales = raw.Rutas.ausencias
	return nil
}

func (z Zona) ausenciaIntencional(ruta int) string {
	return z.ausenciasIntencionales[ruta]
}

// Cimientos classifies shared terrain that no Zona owns. Its rules may be
// directories or patterns; each Sesion reservation must still name exact files.
type Cimientos struct {
	Rutas []string `yaml:"rutas"`

	ausenciasIntencionales map[int]string
}

func (c *Cimientos) UnmarshalYAML(value *yaml.Node) error {
	if err := camposConocidos(value, map[string]bool{"rutas": true}); err != nil {
		return err
	}
	var raw struct {
		Rutas rutasDeclaradas `yaml:"rutas"`
	}
	if err := value.Decode(&raw); err != nil {
		return err
	}
	c.Rutas = raw.Rutas.values
	c.ausenciasIntencionales = raw.Rutas.ausencias
	return nil
}

func (c Cimientos) ausenciaIntencional(ruta int) string {
	return c.ausenciasIntencionales[ruta]
}

// Sesion is one independently reviewable result, inside exactly one Zona.
// There is deliberately no Estado or Área field: both are derived.
type Sesion struct {
	ID                string             `yaml:"id"`
	Zona              string             `yaml:"zona"`
	Resultado         string             `yaml:"resultado"`
	Autoridad         Autoridad          `yaml:"autoridad"`
	Prioridad         string             `yaml:"prioridad"`
	Cambio            string             `yaml:"cambio"`
	DependeDe         []string           `yaml:"depende_de"`
	Cimientos         []string           `yaml:"cimientos"`
	Recurso           []string           `yaml:"recurso"`
	Criterios         []string           `yaml:"criterios"`
	Decisiones        []Decision         `yaml:"decisiones"`
	Archivos          []string           `yaml:"archivos"`
	SoloLectura       bool               `yaml:"solo_lectura"`
	Encargo           *Encargo           `yaml:"encargo"`
	SolicitudSDD      *SolicitudSDD      `yaml:"solicitud_sdd"`
	Reemplaza         []string           `yaml:"reemplaza"`
	Modulos           []Modulo           `yaml:"modulos"`
	RutasHistoricas   []string           `yaml:"rutas_historicas"`
	Ruta              RutaSesion         `yaml:"ruta"`
	Entrega           *Entrega           `yaml:"entrega"`
	Diferida          bool               `yaml:"diferida"`
	Archivada         bool               `yaml:"archivada"`
	Archivo           string             `yaml:"archivo"`
	Historico         string             `yaml:"historico"`
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

// References is closed, non-executable context outside sesiones: no kind grants status, ownership, queue, seat, capacity, or completion.
type References struct {
	FutureSuccessors []FutureSuccessor  `yaml:"future_successors"`
	SatisfiedHistory []SatisfiedHistory `yaml:"satisfied_history"`
	RetiredSessions  []RetiredSession   `yaml:"retired_sessions"`
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

// RetiredSession reserves a removed Session identity and records its approved
// disposition without retaining any executable or progress-bearing fields.
type RetiredSession struct {
	ID          string    `yaml:"id"`
	Disposition string    `yaml:"disposition"`
	Result      string    `yaml:"result"`
	Reason      string    `yaml:"reason"`
	Authority   Autoridad `yaml:"authority"`
	AbsorbedBy  string    `yaml:"absorbed_by"`
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

// Cita is one typed source a Sesión rests on.
type Cita struct {
	Tipo string          // one of TiposDeAutoridad
	Ref  int             // decision number, `decision` only
	ID   int             // observation id, `engram` only
	Loc  FragmentLocator // `repo` and `decision` only
}

// Autoridad is where a Sesión says it came from. It accepts three shapes: the
// legacy free-text string, one typed Cita, and a list of them. The list is the
// model and not a concession to old prose — 29 of the 82 authorities in the
// plan name more than one class of source, so a single citation cannot hold
// the real data. Free text is still accepted until S115 requires the type:
// S114 migrates one Zona per Módulo, so demanding it now would fail every
// Sesión at once.
type Autoridad struct {
	Texto string // legacy free text; empty once the typed form is used
	Citas []Cita // one entry for the simple form, several for the composed one
}

type citaTipada struct {
	Tipo            string `yaml:"tipo"`
	Ref             int    `yaml:"ref"`
	ID              int    `yaml:"id"`
	FragmentLocator `yaml:",inline"`
}

// UnmarshalYAML accepts a scalar, a mapping, or a sequence of mappings. A
// mapping that is not the typed shape fails here rather than resolving to an
// empty authority, which would read downstream as "not declared" and hide the
// real mistake.
func (a *Autoridad) UnmarshalYAML(value *yaml.Node) error {
	if value.Kind == yaml.ScalarNode {
		a.Texto = value.Value
		return nil
	}
	nodos := []*yaml.Node{value}
	if value.Kind == yaml.SequenceNode {
		nodos = value.Content
	}
	for _, n := range nodos {
		var forma citaTipada
		if err := n.Decode(&forma); err != nil {
			return err
		}
		a.Citas = append(a.Citas, Cita{Tipo: forma.Tipo, Ref: forma.Ref, ID: forma.ID, Loc: forma.FragmentLocator})
	}
	return nil
}

// Declarada reports whether the Sesión said anything at all.
func (a Autoridad) Declarada() bool { return strings.TrimSpace(a.Texto) != "" || len(a.Citas) > 0 }

// Tipada reports whether it uses the typed form rather than free text.
func (a Autoridad) Tipada() bool { return len(a.Citas) > 0 }

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
	if err := validateArchivedReferenceShape(raw); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	for i := range p.Sesiones {
		if p.Sesiones[i].Historico == "" {
			continue
		}
		root, err := resolverRaiz("", p.Raiz, path)
		if err != nil {
			return nil, err
		}
		s, err := archivedSession(root, p.Sesiones[i])
		if err != nil {
			return nil, fmt.Errorf("%s: %w", path, err)
		}
		p.Sesiones[i] = s
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
	if esTerritorioPendiente(s) {
		return nil
	}
	if z, ok := p.ZonaPorID()[s.Zona]; ok {
		return z.Rutas
	}
	return nil
}

// RutaEfectiva returns the implementation revalidation when present; otherwise
// it returns the planning proposal.
func (s *Sesion) RutaEfectiva() string {
	if s.esEncargo() {
		if s.solicitudSDDValida() {
			return RutaSDDNativa
		}
		return "odd"
	}
	if s.Ruta.Revalidacion != nil {
		return s.Ruta.Revalidacion.Resultado
	}
	return s.Ruta.Propuesta
}
