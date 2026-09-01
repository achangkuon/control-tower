// Package main implements `plan`, the deterministic planning tool.
//
// The plan is data. Everything derivable — a Sesión's state, the queue inside a
// Zona, the percentage, available seats, a Sesión's Área — is computed here and
// never written by hand. See skills/_shared/plan-naming-convention.md §17 for the
// split between what this tool owns and what a human must still judge.
package main

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// Plan is the single written artifact for one product.
type Plan struct {
	Schema        string    `yaml:"schema"`
	SchemaVersion int       `yaml:"schema_version"`
	Producto      string    `yaml:"producto"`
	Raiz          string    `yaml:"raiz"`
	Zonas         []Zona    `yaml:"zonas"`
	Cimientos     Cimientos `yaml:"cimientos"`
	Sesiones      []Sesion  `yaml:"sesiones"`
}

// Zona is a set of files with a single owner. Defined by paths, never by theme.
type Zona struct {
	ID        string   `yaml:"id"`
	Nombre    string   `yaml:"nombre"`
	Rutas     []string `yaml:"rutas"`
	DependeDe []string `yaml:"depende_de"`
}

// Cimientos are the shared paths every Zona depends on and none of them owns.
// They are not a Zona: they are reserved per file.
type Cimientos struct {
	Rutas []string `yaml:"rutas"`
}

// Sesion is one independently reviewable result, inside exactly one Zona.
//
// There is deliberately no Estado field. State is derived (see state.go); a
// written state is a value the next computation overwrites.
type Sesion struct {
	ID         string     `yaml:"id"`
	Zona       string     `yaml:"zona"`
	Resultado  string     `yaml:"resultado"`
	DependeDe  []string   `yaml:"depende_de"`
	Cimientos  []string   `yaml:"cimientos"`
	Recurso    []string   `yaml:"recurso"`
	Criterios  []string   `yaml:"criterios"`
	Decisiones []Decision `yaml:"decisiones"`
	Ruta       string     `yaml:"ruta"`
	Est        string     `yaml:"est"`

	// Entrega is evidence of closure, not a state: the merge that shipped it.
	// The state COMPLETO is derived from this, never asserted directly.
	Entrega *Entrega `yaml:"entrega"`

	// Diferida records an explicit human choice to postpone. It is the one
	// state input a human owns, because "chose not to" cannot be computed.
	Diferida bool `yaml:"diferida"`

	// Archivada closes a Sesión for traceability without claiming delivery.
	Archivada bool `yaml:"archivada"`
}

// Entrega is the merge evidence that makes a Sesión COMPLETO.
type Entrega struct {
	Commit string `yaml:"commit"`
	PR     int    `yaml:"pr"`
}

// Decision is a decision point the Sesión is expected to hit.
type Decision struct {
	// Tipo is "derivable" or "escala".
	Tipo string `yaml:"tipo"`

	Pregunta string `yaml:"pregunta"`

	// Criterio and Autoridad are required when Tipo is "derivable": an approved
	// authority plus a falsifiable criterion. Convention §14.
	Criterio  string `yaml:"criterio"`
	Autoridad string `yaml:"autoridad"`

	// Clase is required when Tipo is "escala" and the decision falls in one of
	// the eight always-escalate classes.
	Clase string `yaml:"clase"`

	// Alcanza says where the decision first lands: "criterios", "primer-modulo",
	// or a later Módulo id. It decides whether the Sesión is BLOQUEADO.
	Alcanza string `yaml:"alcanza"`

	// Contamina lists Sesión IDs whose acceptance criteria assume an answer,
	// when that contamination is invisible in the graph, Zona and Recurso.
	Contamina []string `yaml:"contamina"`
}

// ClasesQueEscalan is the closed set from convention §14. A decision touching
// any of these is never derivable, even with authority and criterion.
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

// RutasValidas is the closed set of execution routes from convention §15.
var RutasValidas = []string{"direct", "design-tasks", "full-sdd", "blocked"}

// Load reads and parses a plan file. It does not validate it; see Check.
func Load(path string) (*Plan, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("no se pudo leer %s: %w", path, err)
	}

	var p Plan
	// KnownFields catches a misspelled key instead of silently ignoring it —
	// a typo in a plan is a wrong plan, not a plan with a missing field.
	dec := yaml.NewDecoder(strings.NewReader(string(raw)))
	dec.KnownFields(true)
	if err := dec.Decode(&p); err != nil {
		return nil, fmt.Errorf("%s no es un plan válido: %w", path, err)
	}

	if p.Schema != "plan" {
		return nil, fmt.Errorf("%s: se esperaba `schema: plan`, se encontró %q", path, p.Schema)
	}
	if p.SchemaVersion != 1 {
		return nil, fmt.Errorf("%s: schema_version %d no soportada (esta herramienta lee 1)", path, p.SchemaVersion)
	}

	return &p, nil
}

// ZonaPorID indexes zones by id.
func (p *Plan) ZonaPorID() map[string]*Zona {
	out := make(map[string]*Zona, len(p.Zonas))
	for i := range p.Zonas {
		out[p.Zonas[i].ID] = &p.Zonas[i]
	}
	return out
}

// SesionPorID indexes Sesiones by id.
func (p *Plan) SesionPorID() map[string]*Sesion {
	out := make(map[string]*Sesion, len(p.Sesiones))
	for i := range p.Sesiones {
		out[p.Sesiones[i].ID] = &p.Sesiones[i]
	}
	return out
}

// Area returns a Sesión's Área: the paths of its Zona. Convention §12 —
// Área is derived, never hand-written.
func (p *Plan) Area(s *Sesion) []string {
	if z, ok := p.ZonaPorID()[s.Zona]; ok {
		return z.Rutas
	}
	return nil
}
