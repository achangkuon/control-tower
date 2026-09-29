package main

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// referencedFixturePlan builds one Plan carrying both reference kinds (in a
// deliberately non-alphabetical declaration order) plus a Zona that exactly
// owns the fixture's one tracked file, so both listing and leak assertions —
// and cmdStatus's own partition check — share one deterministic setup.
func referencedFixturePlan(loc FragmentLocator) *Plan {
	fut1 := FutureSuccessor{ID: "S103", Reason: "declared second", Result: "r", Zone: "entrega", AssignmentSource: loc}
	fut2 := FutureSuccessor{ID: "S102", Reason: "outside-approved-horizon | escala", Result: "r", Zone: "entrega", AssignmentSource: loc}
	hist := SatisfiedHistory{ID: "S1.9", Reason: "omitted-completed-import-dependency", TerminalSource: loc}
	retired := RetiredSession{ID: "S4.4", Disposition: "retired", Result: "partial work preserved", Reason: "partial evidence is not whole-Session delivery", Authority: Autoridad{Citas: []Cita{{Tipo: "engram", ID: 12062}}}}
	absorbed := RetiredSession{ID: "S121", Disposition: "absorbed", Result: "worker tabs", Reason: "scope consolidated", Authority: Autoridad{Citas: []Cita{{Tipo: "engram", ID: 12062}}}, AbsorbedBy: "S107"}
	target := sesion("S107", false, nil, nil)
	target.Entrega = &Entrega{Commit: loc.Commit}
	return &Plan{
		Schema: "plan", SchemaVersion: 3, Producto: "prueba",
		Zonas:      []Zona{{ID: "z", Nombre: "Z", Rutas: []string{"ASIGNACION.md"}}},
		Sesiones:   []Sesion{target},
		References: &References{FutureSuccessors: []FutureSuccessor{fut1, fut2}, SatisfiedHistory: []SatisfiedHistory{hist}, RetiredSessions: []RetiredSession{retired, absorbed}},
	}
}

func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	old := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w
	fn()
	w.Close()
	os.Stdout = old
	out, _ := io.ReadAll(r)
	return string(out)
}

// TestNonExecutableReferencesListedInRenderAndStatus proves the missing-listing
// direction: both `radar render` and `radar status` must expose one separately
// labeled listing, grouped by kind then declaration order, showing ID, literal
// kind, immutable locator provenance, and the escaped reason.
func TestNonExecutableReferencesListedInRenderAndStatus(t *testing.T) {
	root, commit, blob, raw := referenceFixture(t)
	loc := validLocator(commit, blob, raw, 1, 1)
	p := referencedFixturePlan(loc)

	rendered := string(RenderAt(p, root, commit))
	future, second, history := strings.Index(rendered, "S103"), strings.Index(rendered, "S102"), strings.Index(rendered, "S1.9")
	if !strings.Contains(rendered, "Non-executable references") || future == -1 || second == -1 || history == -1 || !(future < second && second < history) {
		t.Fatalf("render must expose the listing grouped by kind then declaration order:\n%s", rendered)
	}
	if !strings.Contains(rendered, "future_successor") || !strings.Contains(rendered, "satisfied_history") || !strings.Contains(rendered, "retired_session") {
		t.Fatal("listing must show each reference's literal kind")
	}
	for _, want := range []string{"S4.4", "retired", "partial evidence is not whole-Session delivery", "S121", "absorbed → S107", "scope consolidated"} {
		if !strings.Contains(rendered, want) {
			t.Fatalf("retired reference listing must show %q:\n%s", want, rendered)
		}
	}
	if !strings.Contains(rendered, "&#124;") {
		t.Fatal("listing must escape the reason like every other rendered field")
	}
	if !strings.Contains(rendered, commit) {
		t.Fatal("listing must expose immutable locator provenance")
	}

	out := captureStdout(t, func() {
		if err := cmdStatus(p, root); err != nil {
			t.Fatalf("status must not fail on a plan carrying references: %v", err)
		}
	})
	if !strings.Contains(out, "Non-executable references") {
		t.Fatal("radar status must also expose the non-executable references listing")
	}
}

// TestReferencesNeverLeakIntoOperationalProjections proves the operational-leak
// direction: EstadosAt, ColaPorZonaAt, AvanceAt, AsientosAt, and zonas coverage
// must never assign a reference any status, queue position, progress
// denominator, seat, or partition territory.
func TestReferencesNeverLeakIntoOperationalProjections(t *testing.T) {
	root, commit, blob, raw := referenceFixture(t)
	loc := validLocator(commit, blob, raw, 1, 1)
	p := referencedFixturePlan(loc)
	p.Sesiones = []Sesion{sesion("S1", false, nil, nil)}

	estados := p.EstadosAt(root, commit)
	if _, ok := estados["S102"]; ok {
		t.Fatal("EstadosAt must never assign a state to a reference")
	}
	if _, ok := estados["S1.9"]; ok {
		t.Fatal("EstadosAt must never assign a state to a reference")
	}
	if _, ok := estados["S4.4"]; ok {
		t.Fatal("EstadosAt must never assign a state to a retired reference")
	}

	colas := p.ColaPorZonaAt(root, commit)
	for zona, ids := range colas {
		for _, id := range ids {
			if id == "S102" || id == "S1.9" || id == "S103" || id == "S4.4" || id == "S121" {
				t.Fatalf("ColaPorZonaAt zone %s must never queue a reference, got %v", zona, ids)
			}
		}
	}

	_, total := p.AvanceAt(root, commit)
	if total.Total != len(p.Sesiones) {
		t.Fatalf("AvanceAt denominator must count only Sesiones, got %d want %d", total.Total, len(p.Sesiones))
	}

	for _, zona := range p.AsientosAt(root, commit) {
		if zona == "S102" || zona == "S1.9" {
			t.Fatalf("AsientosAt must never return a reference id as a zone: %v", zona)
		}
	}

	cobertura, _, err := p.CoberturaAt(root, commit)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := cobertura["S102"]; ok {
		t.Fatal("zonas coverage must never key on a reference id")
	}
	if _, ok := cobertura["S4.4"]; ok {
		t.Fatal("zonas coverage must never key on a retired reference id")
	}
}

// TestOrdinaryPlanWithoutReferencesUnaffected is the required regression case:
// an ordinary v3 plan with no `references` key must render and report exactly
// as it did before this group.
func TestOrdinaryPlanWithoutReferencesUnaffected(t *testing.T) {
	p, err := Load(filepath.Join("testdata", "plan.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	want, err := os.ReadFile(filepath.Join("testdata", "ROADMAP.golden.md"))
	if err != nil {
		t.Fatal(err)
	}
	got := Render(p, "")
	if string(got) != string(want) {
		t.Fatal("a plan without a references key must render byte-identically to the pre-existing golden")
	}
	if strings.Contains(string(got), "Non-executable references") {
		t.Fatal("a plan without a references key must not gain the listing section")
	}
}
