package main

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// referenceFixture commits one multi-line file for byte-exact FragmentLocator values.
func referenceFixture(t *testing.T) (root, commit, blob string, raw []byte) {
	t.Helper()
	root = t.TempDir()
	git := func(args ...string) string {
		t.Helper()
		out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
		if err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
		return strings.TrimSpace(string(out))
	}
	git("init", "-q")
	git("config", "user.email", "radar@example.test")
	git("config", "user.name", "Radar Test")
	raw = []byte("line one\nline two\nline three\n")
	if err := os.WriteFile(filepath.Join(root, "ASIGNACION.md"), raw, 0o600); err != nil {
		t.Fatal(err)
	}
	git("add", ".")
	git("commit", "-qm", "assign")
	return root, git("rev-parse", "HEAD"), git("rev-parse", "HEAD:ASIGNACION.md"), raw
}

func validLocator(commit, blob string, raw []byte, lineStart, lineEnd int) FragmentLocator {
	lines := strings.SplitAfter(string(raw), "\n")
	start := 0
	for i := 0; i < lineStart-1; i++ {
		start += len(lines[i])
	}
	end := start
	for i := lineStart - 1; i < lineEnd; i++ {
		end += len(lines[i])
	}
	sum := sha256.Sum256(raw[start:end])
	return FragmentLocator{Commit: commit, Path: "ASIGNACION.md", Blob: blob, LineStart: lineStart, LineEnd: lineEnd, ByteStart: start, ByteEnd: end, FragmentSHA256: hex.EncodeToString(sum[:])}
}

func futurePlan(loc FragmentLocator) *Plan {
	f := FutureSuccessor{ID: "S102", Reason: "outside-approved-horizon", Result: "closed lineage", Zone: "entrega", AssignmentSource: loc}
	return &Plan{References: &References{FutureSuccessors: []FutureSuccessor{f}}}
}

func sesion(id string, archivada bool, dependeDe, reemplaza []string) Sesion {
	return Sesion{ID: id, Zona: "z", Resultado: "r", Autoridad: Autoridad{Texto: "a"}, Criterios: []string{"c"}, Archivada: archivada, DependeDe: dependeDe, Reemplaza: reemplaza}
}

func writePlanFile(t *testing.T, body string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "plan.yaml")
	raw := "schema: plan\nschema_version: 3\nproducto: prueba\n" + body
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func hasErr(h []Hallazgo) bool {
	for _, f := range h {
		if f.Severidad == "error" {
			return true
		}
	}
	return false
}
func TestClosedReferenceShapeRejectsUnknownAndMixedFields(t *testing.T) {
	loc := "assignment_source: {commit: '0', path: a, blob: '0', line_start: 1, line_end: 1, byte_start: 0, byte_end: 1, fragment_sha256: x}\n"
	base := "references:\n  future_successors:\n    - id: S102\n      reason: r\n      result: r\n      zone: z\n      "
	retired := "references:\n  retired_sessions:\n    - id: S4.4\n      disposition: retired\n      result: r\n      reason: r\n      authority: {tipo: engram, id: 12062}\n"
	cases := map[string]struct {
		body string
		fail bool
	}{
		"valid minimal shape":                {base + loc, false},
		"valid retired-session shape":        {retired, false},
		"unknown field on future successor":  {base + "status: done\n      " + loc, true},
		"mixed payload on future successor":  {base + "terminal_source: {commit: '0'}\n      " + loc, true},
		"unknown field on satisfied history": {"references:\n  satisfied_history:\n    - id: S1.9\n      reason: r\n      extra: x\n      terminal_source: {commit: '0', path: a, blob: '0', line_start: 1, line_end: 1, byte_start: 0, byte_end: 1, fragment_sha256: x}\n", true},
		"execution field on retired session": {strings.Replace(retired, "      authority:", "      status: done\n      authority:", 1), true},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := Load(writePlanFile(t, c.body))
			if c.fail && err == nil {
				t.Fatal("expected closed-shape rejection, got none")
			}
			if !c.fail && err != nil {
				t.Fatalf("expected valid minimal shape to parse, got %v", err)
			}
		})
	}
}

func TestRetiredSessionReferenceContract(t *testing.T) {
	authority := Autoridad{Citas: []Cita{{Tipo: "engram", ID: 12062}}}
	retired := func(id, disposition, absorbedBy string) RetiredSession {
		return RetiredSession{ID: id, Disposition: disposition, Result: "preserved result", Reason: "honest disposition", Authority: authority, AbsorbedBy: absorbedBy}
	}
	target := sesion("S107", false, nil, nil)
	cases := []struct {
		name string
		plan *Plan
		fail bool
	}{
		{"retired valid", &Plan{References: &References{RetiredSessions: []RetiredSession{retired("S4.4", "retired", "")}}}, false},
		{"absorbed valid", &Plan{Sesiones: []Sesion{target}, References: &References{RetiredSessions: []RetiredSession{retired("S121", "absorbed", "S107")}}}, false},
		{"unknown disposition", &Plan{References: &References{RetiredSessions: []RetiredSession{retired("S4.4", "paused", "")}}}, true},
		{"absorbed requires destination", &Plan{References: &References{RetiredSessions: []RetiredSession{retired("S121", "absorbed", "")}}}, true},
		{"retired forbids destination", &Plan{Sesiones: []Sesion{target}, References: &References{RetiredSessions: []RetiredSession{retired("S4.4", "retired", "S107")}}}, true},
		{"absorbed destination must exist", &Plan{References: &References{RetiredSessions: []RetiredSession{retired("S121", "absorbed", "S107")}}}, true},
		{"required text cannot be blank", &Plan{References: &References{RetiredSessions: []RetiredSession{{ID: "S4.4", Disposition: "retired", Result: " ", Reason: "r", Authority: authority}}}}, true},
		{"authority must be typed", &Plan{References: &References{RetiredSessions: []RetiredSession{{ID: "S4.4", Disposition: "retired", Result: "r", Reason: "r", Authority: Autoridad{Texto: "Engram 12062"}}}}}, true},
		{"id reserved against live sessions", &Plan{Sesiones: []Sesion{sesion("S4.4", false, nil, nil)}, References: &References{RetiredSessions: []RetiredSession{retired("S4.4", "retired", "")}}}, true},
		{"id unique within retired references", &Plan{References: &References{RetiredSessions: []RetiredSession{retired("S4.4", "retired", ""), retired("S4.4", "retired", "")}}}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := hasErr(c.plan.checkReferencias("")); got != c.fail {
				t.Fatalf("expected fail=%v, got findings %#v", c.fail, c.plan.checkReferencias(""))
			}
		})
	}
}

func TestLiveSessionDependingOnRetiredIDIsExplicitError(t *testing.T) {
	p := &Plan{
		References: &References{RetiredSessions: []RetiredSession{{ID: "S4.4"}}},
		Sesiones:   []Sesion{sesion("S200", false, []string{"S4.4"}, nil)},
	}
	got := hallazgosDe(p.checkGrafo(), "dependencias hacia sesiones retiradas")
	if len(got) != 1 || !strings.Contains(got[0].Detalle, "S200") || !strings.Contains(got[0].Detalle, "S4.4") {
		t.Fatalf("expected explicit retired dependency error naming both ids, got %#v", got)
	}
}

func TestFragmentLocatorRejectsBoundAndHashMismatches(t *testing.T) {
	root, commit, blob, raw := referenceFixture(t)
	good := validLocator(commit, blob, raw, 2, 2)
	if hasErr(futurePlan(good).checkReferencias(root)) {
		t.Fatal("valid locator rejected")
	}
	broken := map[string]func(*FragmentLocator){
		"byte range does not match line range": func(l *FragmentLocator) { l.ByteEnd++ },
		"empty byte range":                     func(l *FragmentLocator) { l.ByteEnd = l.ByteStart },
		"byte end beyond blob":                 func(l *FragmentLocator) { l.ByteEnd = 999 },
		"wrong hash":                           func(l *FragmentLocator) { l.FragmentSHA256 = strings.Repeat("0", 64) },
	}
	for name, mutate := range broken {
		t.Run(name, func(t *testing.T) {
			loc := good
			mutate(&loc)
			if !hasErr(futurePlan(loc).checkReferencias(root)) {
				t.Fatalf("%s: expected locator rejection", name)
			}
		})
	}
}

func TestReferenceGraphSafety(t *testing.T) {
	root, commit, blob, raw := referenceFixture(t)
	loc := validLocator(commit, blob, raw, 1, 1)
	hist := SatisfiedHistory{ID: "S1.9", Reason: "r", TerminalSource: loc}
	fut := func(id string, deps []string) FutureSuccessor {
		return FutureSuccessor{ID: id, Reason: "r", Result: "r", Zone: "z", AssignmentSource: loc, Dependencies: deps}
	}
	replacing := func(target string) FutureSuccessor { f := fut("S102", nil); f.Replaces = []string{target}; return f }
	dupSession := &Plan{References: &References{FutureSuccessors: []FutureSuccessor{fut("S102", nil)}}, Sesiones: []Sesion{sesion("S102", false, nil, nil)}}
	dupHist := &Plan{References: &References{FutureSuccessors: []FutureSuccessor{fut("S102", nil)}, SatisfiedHistory: []SatisfiedHistory{{ID: "S102", Reason: "r", TerminalSource: loc}}}}
	badEdges := &Plan{References: &References{FutureSuccessors: []FutureSuccessor{{ID: "S102", Reason: "r", Result: "r", Zone: "z", AssignmentSource: loc, Dependencies: []string{"S999"}, Replaces: []string{"S999"}}}}}
	notArchived := &Plan{References: &References{FutureSuccessors: []FutureSuccessor{replacing("S5")}}, Sesiones: []Sesion{sesion("S5", false, nil, nil)}}
	archived := &Plan{References: &References{FutureSuccessors: []FutureSuccessor{replacing("S5")}}, Sesiones: []Sesion{sesion("S5", true, nil, nil)}}
	// Corrected historical-leaf rule (bounded R1 correction): a Sesión's
	// depende_de closes structurally on a satisfied-history reference — that is
	// the reference's whole purpose (design.md:577) — so it must not fail here.
	// Replacing one, and a future successor depending on one, remain rejected:
	// only depende_de closure changed.
	dependsOnHist := &Plan{References: &References{SatisfiedHistory: []SatisfiedHistory{hist}}, Sesiones: []Sesion{sesion("S3", false, []string{"S1.9"}, nil)}}
	replacesHist := &Plan{References: &References{SatisfiedHistory: []SatisfiedHistory{hist}}, Sesiones: []Sesion{sesion("S3", false, nil, []string{"S1.9"})}}
	futureIntoHist := &Plan{References: &References{FutureSuccessors: []FutureSuccessor{fut("S102", []string{"S1.9"})}, SatisfiedHistory: []SatisfiedHistory{hist}}}
	cyclePlan := &Plan{References: &References{FutureSuccessors: []FutureSuccessor{fut("S102", []string{"S103"}), fut("S103", []string{"S102"})}}}
	unaffected := &Plan{Sesiones: []Sesion{sesion("S1", true, nil, nil)}}
	cases := []struct {
		name string
		plan *Plan
		fail bool
	}{
		{"duplicate id with a Sesión", dupSession, true},
		{"duplicate id across reference kinds", dupHist, true},
		{"dependency/replaces on a nonexistent identity", badEdges, true},
		{"replaces a non-archived Sesión", notArchived, true},
		{"replaces an archived Sesión", archived, false},
		{"Sesión depends on satisfied history: structural edge closes", dependsOnHist, false},
		{"Sesión replaces satisfied history: still rejected", replacesHist, true},
		{"future successor depends on satisfied history: still rejected", futureIntoHist, true},
		{"dependency cycle across future successors", cyclePlan, true},
		{"plan without references is unaffected", unaffected, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := hasErr(c.plan.checkReferencias(root)); got != c.fail {
				t.Fatalf("expected fail=%v, got %v", c.fail, got)
			}
		})
	}
}

// TestDependeDeReferenceClosesStructuralEdge is the RED regression for the R1
// correction: checkGrafo resolved dependency targets only against Sesiones and
// was blind to References, so depending on a structurally present future or
// satisfied-history reference produced a false "que no existe" alongside
// checkReferencias' now-removed historical-leaf rejection — two contradictory
// errors from one edge. Neither check.go:607 nor check.go:836-838 may fire for
// these targets anymore.
func TestDependeDeReferenceClosesStructuralEdge(t *testing.T) {
	root, commit, blob, raw := referenceFixture(t)
	loc := validLocator(commit, blob, raw, 1, 1)
	future := FutureSuccessor{ID: "S102", Reason: "r", Result: "r", Zone: "z", AssignmentSource: loc}
	hist := SatisfiedHistory{ID: "S1.9", Reason: "r", TerminalSource: loc}
	cases := map[string]string{
		"future successor target":  "S102",
		"satisfied history target": "S1.9",
	}
	for name, dep := range cases {
		t.Run(name, func(t *testing.T) {
			plan := &Plan{
				References: &References{FutureSuccessors: []FutureSuccessor{future}, SatisfiedHistory: []SatisfiedHistory{hist}},
				Sesiones:   []Sesion{sesion("S3", false, []string{dep}, nil)},
			}
			for _, f := range plan.checkGrafo() {
				if f.Regla == "dependencias" {
					t.Fatalf("checkGrafo must not report %q for a structurally present reference target %q: %s", f.Regla, dep, f.Detalle)
				}
			}
			for _, f := range plan.checkReferencias(root) {
				if f.Regla == "hoja histórica" {
					t.Fatalf("checkReferencias must not report a historical-leaf rejection for a Sesión depending on %q: %s", dep, f.Detalle)
				}
			}
		})
	}
}

// TestSessionDependingOnSatisfiedHistoryNeverBecomesReady is the RED
// regression for the "no readiness, ever" half of the corrected rule
// (design.md:587): closing the structural edge to a reference must never make
// a Sesión LISTO. EstadosAt resolves depende_de only against p.SesionPorID(),
// so a reference target — never a Sesión — must keep the dependency unmet.
func TestSessionDependingOnSatisfiedHistoryNeverBecomesReady(t *testing.T) {
	plan := &Plan{
		References: &References{SatisfiedHistory: []SatisfiedHistory{{ID: "S1.9", Reason: "r", TerminalSource: FragmentLocator{}}}},
		Sesiones:   []Sesion{sesion("S3", false, []string{"S1.9"}, nil)},
	}
	estados := plan.EstadosAt("", "")
	if got := estados["S3"]; got != Planificado {
		t.Fatalf("closing a reference edge must grant no readiness; expected %s, got %s", Planificado, got)
	}
}
