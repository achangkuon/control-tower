package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// fixtureSesionConTests builds a repo whose HEAD carries one declared skill file
// and one contract test that pins its prose, mirroring the #161 coupling: the
// test file is never part of the Sesión's declared archivos, yet any contract
// rewrite of the skill breaks the suite at delivery time.
func fixtureSesionConTests(t *testing.T, incluirTest bool) (string, *Plan) {
	root, _ := repoGit(t)
	skill := "skills/chanks-1-feature/SKILL.md"
	if err := os.MkdirAll(filepath.Join(root, "skills/chanks-1-feature"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, skill), []byte("# Feature\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if incluirTest {
		testDir := filepath.Join(root, "agent-workflows/tests")
		if err := os.MkdirAll(testDir, 0o755); err != nil {
			t.Fatal(err)
		}
		test := `import unittest
class TestFeature(unittest.TestCase):
    def test_pins_prose(self):
        self.assertIn("Feature", open("skills/chanks-1-feature/SKILL.md").read())
`
		if err := os.WriteFile(filepath.Join(testDir, "test_feature.py"), []byte(test), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	fixtureGit(t, root, "add", ".")
	fixtureGit(t, root, "commit", "-qm", "fixture")

	encargo := encargoValido()
	s := sesionEncargo("S9", "hosts")
	s.Archivos = []string{"tracked.txt", skill}
	s.Encargo = &encargo
	p := &Plan{
		Producto: "control-tower",
		Zonas: []Zona{{ID: "hosts", Nombre: "Hosts", Rutas: []string{"tracked.txt", skill}},
			{ID: "metodo", Nombre: "Método", Rutas: []string{"agent-workflows/tests/"}}},
		Sesiones: []Sesion{s},
	}
	return root, p
}

// TestSesionListaTestsDeContratoAcoplados pins the #161 fix: the contract output
// names the test files that pin the declared archivos' prose, so preparation
// includes them in the authorized surfaces instead of expanding scope mid-delivery.
func TestSesionListaTestsDeContratoAcoplados(t *testing.T) {
	root, p := fixtureSesionConTests(t, true)

	var out strings.Builder
	if err := cmdSesion(&out, p, root, "S9"); err != nil {
		t.Fatalf("sesion falló sobre un plan válido: %v", err)
	}
	got := out.String()
	if !strings.Contains(got, "Tests de contrato acoplados") {
		t.Fatalf("la salida debe nombrar la sección de tests de contrato:\n%s", got)
	}
	if !strings.Contains(got, "agent-workflows/tests/test_feature.py") {
		t.Fatalf("la salida debe listar el test acoplado:\n%s", got)
	}
}

// TestSesionSinTestsAcopladosNoAgregaSeccion keeps the contract byte-identical
// when nothing pins the declared files.
func TestSesionSinTestsAcopladosNoAgregaSeccion(t *testing.T) {
	root, p := fixtureSesionConTests(t, false)

	var out strings.Builder
	if err := cmdSesion(&out, p, root, "S9"); err != nil {
		t.Fatalf("sesion falló sobre un plan válido: %v", err)
	}
	if strings.Contains(out.String(), "Tests de contrato acoplados") {
		t.Fatalf("sin acoplamientos la sección no debe aparecer:\n%s", out.String())
	}
}
