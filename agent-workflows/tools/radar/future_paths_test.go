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
