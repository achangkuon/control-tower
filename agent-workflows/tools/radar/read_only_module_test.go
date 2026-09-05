package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestModuloReadOnlyContract(t *testing.T) {
	root, head := repoGit(t)
	cases := []struct {
		name      string
		readOnly  bool
		paths     []string
		wantError bool
	}{
		{name: "ordinary pathless open Module is rejected", wantError: true},
		{name: "explicit read-only pathless Module is accepted", readOnly: true},
		{name: "read-only Module with modifying paths is rejected", readOnly: true, paths: []string{"tracked.txt"}, wantError: true},
		{name: "ordinary Module with paths is unchanged", paths: []string{"tracked.txt"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			s := sesionEjecutable("S1", "z")
			s.Modulos[0].ReadOnly = tc.readOnly
			s.Modulos[0].Rutas = tc.paths
			p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
			gotError := len(hallazgosDe(p.checkSesionesAt(root, head), "jerarquía")) != 0
			if gotError != tc.wantError {
				t.Fatalf("error de jerarquía = %v, esperado %v", gotError, tc.wantError)
			}
		})
	}
}

func TestModuloReadOnlyCargaDesdeYAML(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "plan.yaml")
	raw := "schema: plan\nschema_version: 3\nproducto: x\nzonas: [{id: z, rutas: [tracked.txt]}]\nsesiones:\n  - id: S1\n    zona: z\n    resultado: verify\n    autoridad: maintainer\n    criterios: [verified]\n    ruta: {propuesta: direct, autoridad: maintainer}\n    modulos:\n      - id: M1.1\n        resultado: inspect only\n        read_only: true\n        rutas: []\n        tareas: [{id: T1.1.1, accion: inspect, resultado: verified, criterios: [verified]}]\n"
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}
	p, err := Load(path)
	if err != nil {
		t.Fatalf("read_only debe ser parte del schema estricto: %v", err)
	}
	if !p.Sesiones[0].Modulos[0].ReadOnly {
		t.Fatal("read_only: true no fue preservado")
	}
}
