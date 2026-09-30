package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func archiveFixture(t *testing.T) (string, string, string, string) {
	t.Helper()
	root, head := repoGit(t)
	plan := filepath.Join(root, "openspec", "plan.yaml")
	if err := os.MkdirAll(filepath.Dir(plan), 0o700); err != nil {
		t.Fatal(err)
	}
	original := "schema: plan\nschema_version: 3\nproducto: example\nsesiones:\n" +
		"  - id: S1\n    zona: method\n    resultado: Finished\n    entrega:\n      commit: " + head + "\n" +
		"  - id: S2\n    zona: method\n    resultado: Pending\n    depende_de: [S1]\n    criterios: [done]\n"
	if err := os.WriteFile(plan, []byte(original), 0o600); err != nil {
		t.Fatal(err)
	}
	return root, plan, head, original
}

func TestArchivarUsesOnlyLocalMainAndPreservesCompletion(t *testing.T) {
	root, plan, head, _ := archiveFixture(t)
	if fixtureGit(t, root, "symbolic-ref", "--short", "HEAD") != "main" {
		fixtureGit(t, root, "branch", "-m", "main")
	}
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatalf("local main should be archivable: %v", err)
	}
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	if p.EstadosAt(root, head)["S1"] != Archivado {
		t.Fatalf("main archive lost completion: %v; findings: %+v", p.EstadosAt(root, head), p.CheckAt(root, head))
	}
}

func TestArchivarRefusesAmbiguousBranchesBeforePublishing(t *testing.T) {
	root, plan, _, _ := archiveFixture(t)
	if fixtureGit(t, root, "symbolic-ref", "--short", "HEAD") != "master" {
		fixtureGit(t, root, "branch", "-m", "master")
	}
	fixtureGit(t, root, "branch", "main")
	before, err := os.ReadFile(plan)
	if err != nil {
		t.Fatal(err)
	}
	if err := archiveSession(plan, root, "S1"); err == nil || !strings.Contains(err.Error(), "origin/HEAD") {
		t.Fatalf("ambiguous branches must require an authoritative origin/HEAD: %v", err)
	}
	after, err := os.ReadFile(plan)
	if err != nil || string(after) != string(before) {
		t.Fatalf("ambiguous archive changed plan: %v", err)
	}
	if _, err := os.Lstat(filepath.Join(root, "openspec", "archive", "sesiones", "S1.md")); !os.IsNotExist(err) {
		t.Fatalf("ambiguous archive published historical file: %v", err)
	}
}

func TestArchivarOriginHEADSelectsMainAndRevalidatesSelection(t *testing.T) {
	root, plan, _, _ := archiveFixture(t)
	if fixtureGit(t, root, "symbolic-ref", "--short", "HEAD") != "master" {
		fixtureGit(t, root, "branch", "-m", "master")
	}
	fixtureGit(t, root, "branch", "main") // same OID: selection identity still matters
	fixtureGit(t, root, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
	original := gitCommand
	defer func() { gitCommand = original }()
	reads := 0
	gitCommand = func(args ...string) *exec.Cmd {
		if len(args) >= 5 && args[2] == "symbolic-ref" && args[len(args)-1] == "refs/remotes/origin/HEAD" {
			reads++
			if reads == 2 {
				fixtureGit(t, root, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/master")
			}
		}
		return original(args...)
	}
	before, _ := os.ReadFile(plan)
	if err := archiveSession(plan, root, "S1"); err == nil {
		t.Fatal("selection changed before publication but archive succeeded")
	}
	if reads != 2 {
		t.Fatalf("expected initial and publication-time selection checks, got %d", reads)
	}
	after, _ := os.ReadFile(plan)
	if string(after) != string(before) {
		t.Fatal("failed selection revalidation changed plan")
	}
	if _, err := os.Lstat(filepath.Join(root, "openspec", "archive", "sesiones", "S1.md")); !os.IsNotExist(err) {
		t.Fatalf("failed selection revalidation published historical file: %v", err)
	}
}

func TestArchivarPreservesOtherPlanBytesAndCompletion(t *testing.T) {
	root, plan, head, original := archiveFixture(t)
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	archive := filepath.Join(root, "openspec", "archive", "sesiones", "S1.md")
	body, err := os.ReadFile(archive)
	if err != nil {
		t.Fatal(err)
	}
	block := "  - id: S1\n    zona: method\n    resultado: Finished\n    entrega:\n      commit: " + head + "\n"
	if !strings.Contains(string(body), block) {
		t.Fatalf("historical block differs: %q", body)
	}
	updated, err := os.ReadFile(plan)
	if err != nil {
		t.Fatal(err)
	}
	want := strings.Replace(original, block, "  - {id: S1, entrega: {commit: "+head+"}, historico: openspec/archive/sesiones/S1.md}\n", 1)
	if string(updated) != want {
		t.Fatalf("unrelated plan bytes changed:\n%s", updated)
	}
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	if p.EstadosAt(root, head)["S2"] != Listo || p.EstadosAt(root, head)["S1"] != Archivado {
		t.Fatalf("archived own delivery must grant readiness: %v", p.EstadosAt(root, head))
	}
	_, total := p.AvanceAt(root, head)
	if total.Total != 2 || total.Cerradas != 1 {
		t.Fatalf("lost progress: %+v", total)
	}
}

func TestArchivarLeavesNeighborCommentsAndSectionBytesUntouched(t *testing.T) {
	root, plan, head, original := archiveFixture(t)
	original = strings.Replace(original, "  - id: S2\n", "\n  # S2 remains live\n  - id: S2\n", 1) + "\nreferences:\n  satisfied_history: []\n"
	if err := os.WriteFile(plan, []byte(original), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(plan)
	if err != nil {
		t.Fatal(err)
	}
	block := "  - id: S1\n    zona: method\n    resultado: Finished\n    entrega:\n      commit: " + head + "\n"
	want := strings.Replace(original, block, "  - {id: S1, entrega: {commit: "+head+"}, historico: openspec/archive/sesiones/S1.md}\n", 1)
	if string(got) != want {
		t.Fatalf("neighbor comments changed:\n%s", got)
	}
}

func TestArchivarRejectsWithoutMutation(t *testing.T) {
	for _, scenario := range []struct {
		name string
		edit func(*testing.T, string, string)
		id   string
	}{
		{"open", nil, "S2"},
		{"unknown", nil, "S9"},
		{"missing delivery", func(t *testing.T, plan, head string) {
			replacePlan(t, plan, "    entrega:\n      commit: "+head+"\n", "")
		}, "S1"},
		{"duplicate id", func(t *testing.T, plan, head string) {
			replacePlan(t, plan, "  - id: S2\n", "  - id: S1\n")
		}, "S1"},
		{"invalid delivery", func(t *testing.T, plan, head string) { replacePlan(t, plan, head, strings.Repeat("f", 40)) }, "S1"},
		{"existing archive", func(t *testing.T, plan, head string) {
			path := filepath.Join(filepath.Dir(plan), "archive", "sesiones", "S1.md")
			if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(path, []byte("keep"), 0o600); err != nil {
				t.Fatal(err)
			}
		}, "S1"},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			root, plan, head, _ := archiveFixture(t)
			if scenario.edit != nil {
				scenario.edit(t, plan, head)
			}
			before, _ := os.ReadFile(plan)
			if err := archiveSession(plan, root, scenario.id); err == nil {
				t.Fatal("expected refusal")
			}
			after, _ := os.ReadFile(plan)
			if string(before) != string(after) {
				t.Fatal("failed archive mutated plan")
			}
		})
	}
}

func replacePlan(t *testing.T, plan, from, to string) {
	t.Helper()
	before, err := os.ReadFile(plan)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(before), from) {
		t.Fatalf("fixture does not contain %q", from)
	}
	if err := os.WriteFile(plan, []byte(strings.Replace(string(before), from, to, 1)), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestArchivarRefusesSymlinkAndMalformedReference(t *testing.T) {
	root, plan, _, _ := archiveFixture(t)
	parent := filepath.Join(root, "openspec", "archive")
	if err := os.Symlink(t.TempDir(), parent); err != nil {
		t.Fatal(err)
	}
	before, _ := os.ReadFile(plan)
	if err := archiveSession(plan, root, "S1"); err == nil {
		t.Fatal("symlink ancestor accepted")
	}
	after, _ := os.ReadFile(plan)
	if string(before) != string(after) {
		t.Fatal("plan mutated after unsafe path")
	}
	// An archived reference must name only its own canonical historical path.
	replacePlan(t, plan, "  - id: S1\n", "  - {id: S1, entrega: {commit: "+strings.Repeat("a", 40)+"}, historico: ../outside.md}\n")
	if _, err := Load(plan); err == nil {
		t.Fatal("path escape accepted")
	}
}

func TestLoadRejectsReferenceWithExtraFields(t *testing.T) {
	root, plan, _, _ := archiveFixture(t)
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	replacePlan(t, plan, "historico: openspec/archive/sesiones/S1.md}", "zona: wrong, historico: openspec/archive/sesiones/S1.md}")
	if _, err := Load(plan); err == nil {
		t.Fatal("reference with duplicate source of truth accepted")
	}
}

// hallazgosErrores keeps only error-severity findings; avisos never gate
// archiving or "check is clean" in these tests, matching cmdCheck's own
// exit-code rule (only errores fail the command).
func hallazgosErrores(h []Hallazgo) []Hallazgo {
	var out []Hallazgo
	for _, f := range h {
		if f.Severidad == "error" {
			out = append(out, f)
		}
	}
	return out
}

func TestArchivarAcceptsLegacyDottedID(t *testing.T) {
	root, head := repoGit(t)
	plan := filepath.Join(root, "openspec", "plan.yaml")
	if err := os.MkdirAll(filepath.Dir(plan), 0o700); err != nil {
		t.Fatal(err)
	}
	original := "schema: plan\nschema_version: 3\nproducto: example\nsesiones:\n" +
		"  - id: S1.11\n    zona: method\n    resultado: Legacy finished\n    entrega:\n      commit: " + head + "\n" +
		"  - id: S2\n    zona: method\n    resultado: Pending\n    depende_de: [S1.11]\n    criterios: [done]\n"
	if err := os.WriteFile(plan, []byte(original), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := archiveSession(plan, root, "S1.11"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(root, "openspec", "archive", "sesiones", "S1.11.md")); err != nil {
		t.Fatalf("expected historical file for the legacy ID: %v", err)
	}
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	if p.EstadosAt(root, head)["S2"] != Listo || p.EstadosAt(root, head)["S1.11"] != Archivado {
		t.Fatalf("archiving a legacy dotted ID must grant readiness: %v", p.EstadosAt(root, head))
	}
	_, total := p.AvanceAt(root, head)
	if total.Total != 2 || total.Cerradas != 1 {
		t.Fatalf("lost progress: %+v", total)
	}
}

// TestArchivarLegacySessionWithModulosKeepsCheckClean builds a legacy Session
// carrying the full importacion_legacy proof (a real, ancestor commit with the
// exact blob and heading) plus Modulos/Tareas, and requires `radar check` to
// stay free of errors both before and after archiving it.
func TestArchivarLegacySessionWithModulosKeepsCheckClean(t *testing.T) {
	root, _ := repoGit(t)
	heading := "## Sesión S1.11 — Legacy import"
	legacyFile := filepath.Join(root, "legacy", "STATUS.md")
	if err := os.MkdirAll(filepath.Dir(legacyFile), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(legacyFile, []byte(heading+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{{"add", "legacy/STATUS.md"}, {"commit", "-qm", "legacy"}} {
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
	}
	legacyCommit, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	entry, err := gitOutput(root, "ls-tree", legacyCommit, "--", "legacy/STATUS.md")
	if err != nil {
		t.Fatal(err)
	}
	fields := strings.Fields(entry)
	if len(fields) != 4 {
		t.Fatalf("unexpected ls-tree output: %q", entry)
	}
	blob := fields[2]
	if err := os.Remove(legacyFile); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{{"add", "-A"}, {"commit", "-qm", "remove legacy"}} {
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
	}
	head, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}

	plan := filepath.Join(root, "openspec", "plan.yaml")
	if err := os.MkdirAll(filepath.Dir(plan), 0o700); err != nil {
		t.Fatal(err)
	}
	original := "schema: plan\nschema_version: 3\nproducto: example\n" +
		"zonas:\n  - id: hosts\n    rutas: [tracked.txt]\n" +
		"sesiones:\n" +
		"  - id: S1.11\n" +
		"    zona: hosts\n" +
		"    resultado: Legacy import finished\n" +
		"    autoridad: legacy/STATUS.md\n" +
		"    entrega:\n      commit: " + head + "\n" +
		"    importacion_legacy:\n" +
		"      origen_commit: " + legacyCommit + "\n" +
		"      origen_ruta: legacy/STATUS.md\n" +
		"      origen_blob: " + blob + "\n" +
		"      origen_encabezado: \"" + heading + "\"\n" +
		"      territorio_pendiente: false\n" +
		"    modulos:\n" +
		"      - id: M1.11.1\n" +
		"        resultado: Legacy module done\n" +
		"        rutas: [tracked.txt]\n" +
		"        tareas:\n" +
		"          - id: T1.11.1.1\n" +
		"            accion: Do the legacy thing\n" +
		"            resultado: Legacy thing done\n" +
		"            criterios: [Legacy thing done]\n"
	if err := os.WriteFile(plan, []byte(original), 0o600); err != nil {
		t.Fatal(err)
	}

	p, err := Load(plan)
	if err != nil {
		t.Fatalf("fixture must load: %v", err)
	}
	if got := hallazgosErrores(p.CheckAt(root, head)); len(got) != 0 {
		t.Fatalf("fixture must be clean before archiving: %+v", got)
	}

	if err := archiveSession(plan, root, "S1.11"); err != nil {
		t.Fatal(err)
	}

	p2, err := Load(plan)
	if err != nil {
		t.Fatalf("plan must still load after archiving a legacy Session: %v", err)
	}
	if got := hallazgosErrores(p2.CheckAt(root, head)); len(got) != 0 {
		t.Fatalf("archived legacy Session must keep check clean: %+v", got)
	}
	if p2.EstadosAt(root, head)["S1.11"] != Archivado {
		t.Fatalf("expected S1.11 archived, got %v", p2.EstadosAt(root, head))
	}
}

func TestArchivarAcceptsRelativePlanPathAndRoot(t *testing.T) {
	root, plan, head, _ := archiveFixture(t)
	t.Chdir(root)
	if err := archiveSession("openspec/plan.yaml", ".", "S1"); err != nil {
		t.Fatal(err)
	}
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	if p.EstadosAt(root, head)["S1"] != Archivado {
		t.Fatalf("relative plan path and root must still archive: %v", p.EstadosAt(root, head))
	}
}

func TestArchivarRefusesSessionThatDeclaresReemplazaBeforeMutation(t *testing.T) {
	root, plan, _, _ := archiveFixture(t)
	replacePlan(t, plan, "  - id: S1\n", "  - id: S1\n    reemplaza: [S9]\n")
	replacePlan(t, plan, "  - id: S2\n", "  - id: S9\n    zona: method\n    resultado: Otra\n    criterios: [ok]\n\n  - id: S2\n")
	before, _ := os.ReadFile(plan)
	if err := archiveSession(plan, root, "S1"); err == nil {
		t.Fatal("expected refusal: S1 declares reemplaza and cannot archive itself")
	}
	after, _ := os.ReadFile(plan)
	if string(before) != string(after) {
		t.Fatal("failed archive mutated plan")
	}
	if _, err := os.Lstat(filepath.Join(root, "openspec", "archive", "sesiones", "S1.md")); !os.IsNotExist(err) {
		t.Fatal("archive file must not exist after a refused archive")
	}
}

// TestArchivarRefusesWhenActiveDependentWouldBreakOnReplacedOriginal covers the
// lineage interaction beyond the target's own `reemplaza`: S2 depends directly
// on S1, and S3 already declares `reemplaza: [S1]`. Archiving S1 would make
// checkGrafo's "dependencias reemplazadas" rule fail for S2 the moment S1
// becomes archived, so archivar must refuse it up front, before any mutation.
func TestArchivarRefusesWhenActiveDependentWouldBreakOnReplacedOriginal(t *testing.T) {
	root, head := repoGit(t)
	plan := filepath.Join(root, "openspec", "plan.yaml")
	if err := os.MkdirAll(filepath.Dir(plan), 0o700); err != nil {
		t.Fatal(err)
	}
	original := "schema: plan\nschema_version: 3\nproducto: example\nsesiones:\n" +
		"  - id: S1\n    zona: method\n    resultado: Finished\n    entrega:\n      commit: " + head + "\n" +
		"  - id: S2\n    zona: method\n    resultado: Pending\n    depende_de: [S1]\n    criterios: [done]\n" +
		"  - id: S3\n    reemplaza: [S1]\n"
	if err := os.WriteFile(plan, []byte(original), 0o600); err != nil {
		t.Fatal(err)
	}
	before, _ := os.ReadFile(plan)
	if err := archiveSession(plan, root, "S1"); err == nil {
		t.Fatal("expected refusal: S2 would silently break once S1 is archived and replaced by S3")
	}
	after, _ := os.ReadFile(plan)
	if string(before) != string(after) {
		t.Fatal("failed archive mutated plan")
	}
	if _, err := os.Lstat(filepath.Join(root, "openspec", "archive", "sesiones", "S1.md")); !os.IsNotExist(err) {
		t.Fatal("archive file must not exist after a refused archive")
	}
}

func TestArchivarRejectsNonIntegratedCommit(t *testing.T) {
	root, plan, base, _ := archiveFixture(t)
	cmd := exec.Command("git", "-C", root, "switch", "-qc", "other", base)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("branch: %s: %v", out, err)
	}
	other := commitLote(t, root, "other.txt", "other", "other")
	cmd = exec.Command("git", "-C", root, "switch", "-q", "-")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("switch: %s: %v", out, err)
	}
	replacePlan(t, plan, base, other)
	before, _ := os.ReadFile(plan)
	if err := archiveSession(plan, root, "S1"); err == nil {
		t.Fatal("non-integrated commit accepted")
	}
	after, _ := os.ReadFile(plan)
	if string(before) != string(after) {
		t.Fatal("plan mutated on failure")
	}
}
