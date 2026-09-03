package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func loadYAML(t *testing.T, raw string) (*Plan, error) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "plan.yaml")
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}
	return Load(path)
}

func TestSchemaV2RechazaEstimacionesYRouteBlocked(t *testing.T) {
	cases := []struct {
		name string
		raw  string
	}{
		{"estimación de Sesión", "    est: 4h\n"},
		{"estimación de Módulo", "    modulos:\n      - id: M1.1\n        est: 1h\n"},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			raw := "schema: plan\nschema_version: 2\nproducto: x\nsesiones:\n  - id: S1\n" + tt.raw
			if p, err := loadYAML(t, raw); err == nil {
				t.Fatalf("el campo est debería ser desconocido; se cargó %#v", p)
			}
		})
	}

	s := &Sesion{ID: "S1", Ruta: RutaSesion{Propuesta: "blocked", Autoridad: "RFC"}}
	if got := hallazgosDe(checkRuta(s, "", ""), "ruta propuesta"); len(got) != 1 {
		t.Fatalf("blocked dejó de ser una ruta válida; hallazgos: %#v", got)
	}
}

func TestSesionExigeAutoridadDeAlcance(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{{ID: "S1", Zona: "z", Resultado: "r", Criterios: []string{"c"}, Ruta: RutaSesion{Propuesta: "direct", Autoridad: "RFC"}}}}
	if got := hallazgosDe(p.checkSesionesAt("", ""), "autoridad de Sesión"); len(got) != 1 {
		t.Fatalf("la autoridad de alcance debe ser propia de la Sesión; fue %#v", got)
	}

	raw := "schema: plan\nschema_version: 2\nproducto: x\nsesiones:\n  - id: S1\n    autoridad: PRD x §2\n"
	p, err := loadYAML(t, raw)
	if err != nil {
		t.Fatalf("autoridad es parte del esquema v2: %v", err)
	}
	if p.Sesiones[0].ID != "S1" {
		t.Fatal("la Sesión no se cargó")
	}
}

func TestDecisionExigeEvidenciaCheckpointYOpcionesEstructuradas(t *testing.T) {
	cases := []struct {
		name string
		raw  string
	}{
		{"sin evidencia", "        checkpoint: antes-del-primer-modulo\n        opciones: [{opcion: conservar, consecuencia: mantiene compatibilidad}]\n"},
		{"sin checkpoint", "        evidencia: RFC x\n        opciones: [{opcion: conservar, consecuencia: mantiene compatibilidad}]\n"},
		{"sin opciones", "        evidencia: RFC x\n        checkpoint: antes-del-primer-modulo\n"},
		{"opción vacía", "        evidencia: RFC x\n        checkpoint: antes-del-primer-modulo\n        opciones: [{opcion: '', consecuencia: mantiene compatibilidad}]\n"},
		{"consecuencia vacía", "        evidencia: RFC x\n        checkpoint: antes-del-primer-modulo\n        opciones: [{opcion: conservar, consecuencia: ''}]\n"},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			raw := "schema: plan\nschema_version: 2\nproducto: x\nsesiones:\n  - id: S1\n    decisiones:\n      - tipo: escala\n        pregunta: ¿qué hacemos?\n        clase: api-publica\n        alcanza: criterios\n" + tt.raw
			p, err := loadYAML(t, raw)
			if err != nil {
				t.Fatalf("los campos nuevos deben parsearse antes de validarse: %v", err)
			}
			if got := hallazgosDe(checkDecisiones(&p.Sesiones[0]), "contrato de decisión"); len(got) == 0 {
				t.Fatal("la decisión incompleta debería fallar")
			}
		})
	}
}

func TestProfundidadDependeDeRutaEfectiva(t *testing.T) {
	cases := []struct {
		name        string
		proposed    string
		revalidated string
		modules     []Modulo
		wantError   bool
	}{
		{"direct exige Módulo", "direct", "", nil, true},
		{"design-tasks exige Módulo", "design-tasks", "", nil, true},
		{"full-sdd prohíbe Módulos", "full-sdd", "", []Modulo{{ID: "M1.1"}}, true},
		{"revalidación a full-sdd gana", "direct", "full-sdd", []Modulo{{ID: "M1.1"}}, true},
		{"revalidación a direct gana", "full-sdd", "direct", nil, true},
		{"full-sdd sin Módulos", "full-sdd", "", nil, false},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			s := &Sesion{ID: "S1", Modulos: tt.modules, Ruta: RutaSesion{Propuesta: tt.proposed}}
			if tt.revalidated != "" {
				s.Ruta.Revalidacion = &Revalidacion{Resultado: tt.revalidated}
			}
			got := hallazgosDe((&Plan{Sesiones: []Sesion{*s}}).checkSesionesAt("", ""), "profundidad por ruta")
			if (len(got) > 0) != tt.wantError {
				t.Fatalf("ruta efectiva %s, módulos %d: %#v", s.RutaEfectiva(), len(s.Modulos), got)
			}
			if len(got) > 0 && !strings.Contains(got[0].Detalle, s.RutaEfectiva()) {
				t.Fatalf("el hallazgo debe nombrar la ruta efectiva: %#v", got)
			}
		})
	}
}
