package main

import (
	"strings"
	"testing"
)

func TestParticionAceptaSoloRutaFuturaExactaDeSesionAbiertaEnSuZona(t *testing.T) {
	root, head := repoGit(t)
	future := "scripts/host-compatibility/opencode.mjs"
	s := sesionEjecutable("S1", "hosts")
	s.Modulos[0].Rutas = []string{future}
	p := &Plan{
		Zonas: []Zona{
			{ID: "base", Rutas: []string{"tracked.txt"}},
			{ID: "hosts", Rutas: []string{future}},
		},
		Sesiones: []Sesion{s},
	}

	h, err := p.VerificarParticionAt(root, head)
	if err != nil {
		t.Fatal(err)
	}
	if got := hallazgosDe(h, "rutas reales"); len(got) != 0 {
		t.Fatalf("ruta futura exacta y reservada por Sesión abierta fue declarada no usada: %#v", got)
	}
}

func TestParticionRutaAnotadaSuprimeSoloSuAviso(t *testing.T) {
	root, head := repoGit(t)
	raw := "schema: plan\nschema_version: 3\nproducto: x\nzonas:\n  - id: base\n    rutas: [tracked.txt]\n  - id: future\n    rutas:\n      - ruta: scripts/host-compatibility/opencode.mjs\n        ausencia_intencional: reserva-futura\n      - scripts/host-compatibility/other.mjs\n"
	p, err := loadYAML(t, raw)
	if err != nil {
		t.Fatalf("la ruta futura anotada debería cargar: %v", err)
	}
	h, err := p.VerificarParticionAt(root, head)
	if err != nil {
		t.Fatal(err)
	}
	for _, finding := range hallazgosDe(h, "rutas reales") {
		if strings.Contains(finding.Detalle, "opencode.mjs") {
			t.Fatalf("la anotación debe suprimir solamente su aviso: %#v", h)
		}
	}
	foundUnannotated := false
	for _, finding := range hallazgosDe(h, "rutas reales") {
		foundUnannotated = foundUnannotated || strings.Contains(finding.Detalle, "other.mjs")
	}
	if !foundUnannotated {
		t.Fatalf("una ruta ausente sin anotación debe conservar su aviso: %#v", h)
	}
}

func TestParticionRutaAnotadaReservadaNoEsErrorObsoleto(t *testing.T) {
	root, head := repoGit(t)
	const future = "scripts/host-compatibility/opencode.mjs"
	raw := "schema: plan\nschema_version: 3\nproducto: x\nzonas:\n  - id: base\n    rutas: [tracked.txt]\n  - id: future\n    rutas:\n      - ruta: " + future + "\n        ausencia_intencional: reserva-futura\n"
	p, err := loadYAML(t, raw)
	if err != nil {
		t.Fatalf("la ruta futura anotada debería cargar: %v", err)
	}
	s := sesionEjecutable("S1", "future")
	s.Modulos[0].Rutas = []string{future}
	p.Sesiones = []Sesion{s}
	h, err := p.VerificarParticionAt(root, head)
	if err != nil {
		t.Fatal(err)
	}
	for _, finding := range h {
		if strings.Contains(finding.Detalle, future) && (finding.Regla == "rutas reales" || finding.Regla == "ausencia intencional") {
			t.Fatalf("una reserva de Sesión no debe alterar la supresión ni volver obsoleta la anotación: %#v", h)
		}
	}
}

func TestParticionRutaAnotadaConArchivoTrackedEsErrorObsoleto(t *testing.T) {
	root, head := repoGit(t)
	raw := "schema: plan\nschema_version: 3\nproducto: x\nzonas:\n  - id: base\n    rutas: [tracked.txt]\n  - id: retired\n    rutas:\n      - ruta: tracked.txt\n        ausencia_intencional: legado-retirado\n"
	p, err := loadYAML(t, raw)
	if err != nil {
		t.Fatalf("la ruta retirada anotada debería cargar: %v", err)
	}
	h, err := p.VerificarParticionAt(root, head)
	if err != nil {
		t.Fatal(err)
	}
	for _, finding := range h {
		if finding.Severidad == "error" && finding.Regla == "ausencia intencional" && strings.Contains(finding.Detalle, "tracked.txt") {
			return
		}
	}
	t.Fatalf("una anotación que coincide con HEAD debe ser error obsoleto: %#v", h)
}

func TestParticionNoRelajaRutasNoUsadas(t *testing.T) {
	root, head := repoGit(t)
	future := "scripts/host-compatibility/opencode.mjs"
	cases := []struct {
		name        string
		rule        string
		zone        string
		foundations []string
		wantUnused  string
		mutate      func(*Sesion)
	}{
		{name: "sin reserva", rule: future, zone: "hosts", mutate: func(s *Sesion) { s.Modulos[0].Rutas = []string{"other.mjs"} }},
		{name: "glob", rule: "scripts/host-compatibility/*.mjs", zone: "hosts", mutate: func(s *Sesion) { s.Modulos[0].Rutas = []string{future} }},
		{name: "directorio", rule: "scripts/host-compatibility/", zone: "hosts", mutate: func(s *Sesion) { s.Modulos[0].Rutas = []string{future} }},
		{name: "zona distinta", rule: future, zone: "other", mutate: func(s *Sesion) { s.Modulos[0].Rutas = []string{future} }},
		{name: "cimiento no reservado", rule: "hosts/", zone: "hosts", foundations: []string{future}, wantUnused: future, mutate: func(s *Sesion) { s.Modulos[0].Rutas = []string{future} }},
		{name: "terminal", rule: future, zone: "hosts", mutate: func(s *Sesion) { s.Modulos[0].Rutas = []string{future}; s.Archivada = true }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			s := sesionEjecutable("S1", tc.zone)
			tc.mutate(&s)
			p := &Plan{Zonas: []Zona{{ID: "base", Rutas: []string{"tracked.txt"}}, {ID: "hosts", Rutas: []string{tc.rule}}, {ID: "other", Rutas: []string{"other/"}}}, Cimientos: Cimientos{Rutas: tc.foundations}, Sesiones: []Sesion{s}}
			h, err := p.VerificarParticionAt(root, head)
			if err != nil {
				t.Fatal(err)
			}
			want := tc.wantUnused
			if want == "" {
				want = tc.rule
			}
			got := hallazgosDe(h, "rutas reales")
			found := false
			for _, finding := range got {
				found = found || strings.Contains(finding.Detalle, want)
			}
			if !found {
				t.Fatalf("regla futura insegura debería seguir no usada: %#v", h)
			}
		})
	}
}
