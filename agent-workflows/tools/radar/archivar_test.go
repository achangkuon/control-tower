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
