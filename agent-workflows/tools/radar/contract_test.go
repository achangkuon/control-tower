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

func TestSchemaV3RechazaEstimacionesYRouteBlocked(t *testing.T) {
	cases := []struct {
		name string
		raw  string
	}{
		{"estimación de Sesión", "    est: 4h\n"},
		{"estimación de Módulo", "    modulos:\n      - id: M1.1\n        est: 1h\n"},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			raw := "schema: plan\nschema_version: 3\nproducto: x\nsesiones:\n  - id: S1\n" + tt.raw
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

	raw := "schema: plan\nschema_version: 3\nproducto: x\nsesiones:\n  - id: S1\n    autoridad: PRD x §2\n"
	p, err := loadYAML(t, raw)
	if err != nil {
		t.Fatalf("autoridad es parte del esquema v3: %v", err)
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
			raw := "schema: plan\nschema_version: 3\nproducto: x\nsesiones:\n  - id: S1\n    decisiones:\n      - tipo: escala\n        pregunta: ¿qué hacemos?\n        clase: api-publica\n        alcanza: criterios\n" + tt.raw
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

func TestLoadAceptaRutasEscalaresYAnotadasSinCambiarElConsumidor(t *testing.T) {
	raw := "schema: plan\nschema_version: 3\nproducto: x\nzonas:\n  - id: z\n    rutas:\n      - legacy/path\n      - ruta: future/path\n        ausencia_intencional: reserva-futura\ncimientos:\n  rutas:\n    - ruta: retired/path\n      ausencia_intencional: legado-retirado\n"
	p, err := loadYAML(t, raw)
	if err != nil {
		t.Fatalf("las rutas escalares y anotadas deberían cargar: %v", err)
	}
	if got := strings.Join(p.Zonas[0].Rutas, ","); got != "legacy/path,future/path" {
		t.Fatalf("las rutas deben conservar semántica []string; fue %q", got)
	}
	if got := strings.Join(p.Area(&Sesion{Zona: "z"}), ","); got != "legacy/path,future/path" {
		t.Fatalf("Área debe seguir exponiendo rutas escalares; fue %q", got)
	}
	if got := strings.Join(p.Cimientos.Rutas, ","); got != "retired/path" {
		t.Fatalf("cimientos debe conservar la ruta anotada; fue %q", got)
	}
}

func TestLoadRechazaRutasAnotadasInvalidas(t *testing.T) {
	cases := []struct {
		name  string
		rutas string
	}{
		{"forma de secuencia", "      - [future/path]\n"},
		{"clave desconocida", "      - ruta: future/path\n        ausencia_intencional: reserva-futura\n        nota: no\n"},
		{"sin ruta", "      - ausencia_intencional: reserva-futura\n"},
		{"sin ausencia", "      - ruta: future/path\n"},
		{"ruta vacía", "      - ruta: ''\n        ausencia_intencional: reserva-futura\n"},
		{"enum desconocido", "      - ruta: future/path\n        ausencia_intencional: temporal\n"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			raw := "schema: plan\nschema_version: 3\nproducto: x\nzonas:\n  - id: z\n    rutas:\n" + tc.rutas
			if p, err := loadYAML(t, raw); err == nil {
				t.Fatalf("la ruta anotada inválida debería fallar cerrada; cargó %#v", p)
			}
		})
	}
}

func TestSchemaV2ExigeMigracionExplicita(t *testing.T) {
	_, err := loadYAML(t, "schema: plan\nschema_version: 2\nproducto: x\n")
	if err == nil || !strings.Contains(err.Error(), "migr") || !strings.Contains(err.Error(), "v3") {
		t.Fatalf("v2 debe rechazarse con migración explícita a v3: %v", err)
	}
}

func TestDecisionResueltaCargaChequeaYRenderizaCerrada(t *testing.T) {
	root, _ := repoGit(t)
	raw := "schema: plan\nschema_version: 3\nproducto: x\nzonas: [{id: z, rutas: [tracked.txt]}]\nsesiones:\n  - id: S1\n    zona: z\n    resultado: listo\n    autoridad: PRD\n    criterios: [ok]\n    ruta: {propuesta: direct, autoridad: RFC}\n    decisiones: [{tipo: resuelta, resolucion: usar A, autoridad: maintainer 2026-09-03, descartadas: [{opcion: B, razon: rompe contrato}], falsificador: A no funciona, clase: contrato-visible, contaminaba: [S1]}]\n    modulos: [{id: M1.1, resultado: listo, rutas: [tracked.txt], tareas: [{id: T1.1.1, accion: probar, resultado: probado, criterios: [ok]}]}]\n"
	p, err := loadYAML(t, raw)
	if err != nil {
		t.Fatalf("el delta de resolución prescrito debe cargar: %v", err)
	}
	if err := cmdRender(p, root, "openspec/ROADMAP.md"); err != nil {
		t.Fatalf("la resolución cerrada debe pasar check/render: %v", err)
	}
	view, _ := os.ReadFile(filepath.Join(root, "openspec/ROADMAP.md"))
	if !strings.Contains(string(view), "Decisión pendiente: ninguna") {
		t.Fatalf("la vista reabrió una decisión resuelta:\n%s", view)
	}
}

func TestProfundidadDependeDeRutaPropuesta(t *testing.T) {
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
		{"revalidación a full-sdd conserva descomposición", "direct", "full-sdd", []Modulo{{ID: "M1.1"}}, false},
		{"revalidación a direct conserva ausencia", "full-sdd", "direct", nil, false},
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
			if len(got) > 0 && !strings.Contains(got[0].Detalle, s.Ruta.Propuesta) {
				t.Fatalf("el hallazgo debe nombrar la ruta propuesta: %#v", got)
			}
		})
	}
}
