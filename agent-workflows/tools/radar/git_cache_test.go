package main

import (
	"fmt"
	"os/exec"
	"strings"
	"testing"
)

// contarGit counts every git process Radar spawns while the test runs.
func contarGit(t *testing.T) *int {
	t.Helper()
	n := 0
	original := gitCommand
	gitCommand = func(args ...string) *exec.Cmd {
		n++
		return original(args...)
	}
	t.Cleanup(func() { gitCommand = original })
	return &n
}

// A projection asks the same ancestry question once per hypothetical scenario.
// The answer over two full OIDs is immutable, so only the first ask may reach git.
func TestEntregaIntegradaReusesTheImmutableAnswer(t *testing.T) {
	root, base := repoGit(t)
	head := commitNuevo(t, root, "later.txt")
	llamadas := contarGit(t)

	for _, caso := range []struct {
		commit, head string
		want         bool
	}{
		{base, head, true},
		{head, base, false},
	} {
		primera, detalle := entregaIntegrada(root, caso.commit, caso.head)
		if primera != caso.want {
			t.Fatalf("entregaIntegrada(%s, %s) = %v (%s), want %v", caso.commit, caso.head, primera, detalle, caso.want)
		}
		antes := *llamadas
		segunda, segundoDetalle := entregaIntegrada(root, caso.commit, caso.head)
		if segunda != primera || segundoDetalle != detalle {
			t.Fatalf("second answer diverged: %v %q vs %v %q", segunda, segundoDetalle, primera, detalle)
		}
		if *llamadas != antes {
			t.Fatalf("second identical ask spawned %d git process(es), want 0", *llamadas-antes)
		}
	}
}

// A failed lookup is not an answer: it must be asked again, never remembered.
func TestEntregaIntegradaNeverRemembersALookupError(t *testing.T) {
	root, head := repoGit(t)
	ausente := strings.Repeat("0", len(head))
	llamadas := contarGit(t)

	if ok, _ := entregaIntegrada(root, ausente, head); ok {
		t.Fatal("a missing commit must not count as integrated")
	}
	antes := *llamadas
	if ok, _ := entregaIntegrada(root, ausente, head); ok {
		t.Fatal("a missing commit must not count as integrated")
	}
	if *llamadas == antes {
		t.Fatal("a lookup error was cached; it must reach git again")
	}
}

// One radar etapa spawned 1404 git processes for 375 distinct questions (audit
// 2026-10-30). Every answer below is fixed for the life of the process: a full
// OID, a blob, the tree of a full OID, the common directory and the toplevel of
// a directory. The second identical ask must not reach git.
func TestImmutableGitAnswersAreAskedOnce(t *testing.T) {
	root, head := repoGit(t)
	blob := fixtureGit(t, root, "rev-parse", "HEAD:tracked.txt")
	llamadas := contarGit(t)

	preguntas := []struct {
		nombre string
		ask    func() (string, error)
	}{
		{"gitOID", func() (string, error) { return gitOID(root, head) }},
		{"commonDir", func() (string, error) { return commonDir(root) }},
		{"resolverRaiz", func() (string, error) { return resolverRaiz(root, "", "") }},
		{"gitBlob", func() (string, error) { b, err := gitBlob(root, blob); return string(b), err }},
		{"trackedFilesAt", func() (string, error) {
			f, err := trackedFilesAt(root, head)
			return strings.Join(f, ","), err
		}},
	}
	for _, p := range preguntas {
		primera, err := p.ask()
		if err != nil {
			t.Fatalf("%s: %v", p.nombre, err)
		}
		antes := *llamadas
		segunda, err := p.ask()
		if err != nil || segunda != primera {
			t.Fatalf("%s: second answer %q (%v), want %q", p.nombre, segunda, err, primera)
		}
		if *llamadas != antes {
			t.Fatalf("%s: second identical ask spawned %d git process(es), want 0", p.nombre, *llamadas-antes)
		}
	}
	if got, _ := gitBlob(root, blob); string(got) != "base\n" {
		t.Fatalf("gitBlob returned %q, want the blob bytes", got)
	}
}

// HEAD moves; it is the one question that must always reach git.
func TestMutableHEADIsNeverRemembered(t *testing.T) {
	root, head := repoGit(t)
	llamadas := contarGit(t)
	if got, err := gitHEAD(root); err != nil || got != head {
		t.Fatalf("gitHEAD = %q, %v; want %q", got, err, head)
	}
	nuevo := commitNuevo(t, root, "later.txt")
	antes := *llamadas
	if got, err := gitHEAD(root); err != nil || got != nuevo {
		t.Fatalf("gitHEAD after a commit = %q, %v; want %q", got, err, nuevo)
	}
	if *llamadas == antes {
		t.Fatal("gitHEAD answered from memory; HEAD is mutable and must reach git")
	}
}

// A failed blob read is not an answer and must be asked again.
func TestGitBlobNeverRemembersAnError(t *testing.T) {
	root, head := repoGit(t)
	ausente := strings.Repeat("0", len(head))
	llamadas := contarGit(t)
	if _, err := gitBlob(root, ausente); err == nil {
		t.Fatal("a missing blob must fail")
	}
	antes := *llamadas
	if _, err := gitBlob(root, ausente); err == nil {
		t.Fatal("a missing blob must fail")
	}
	if *llamadas == antes {
		t.Fatal("a failed blob read was cached; it must reach git again")
	}
}

// Every delivered Session asks whether its commit is integrated into the same
// HEAD. One ancestry walk of that HEAD answers all of them; asking git once per
// commit cost one process per Session (227 merge-base spawns per radar etapa).
func TestIntegrationOfManyCommitsWalksHEADOnce(t *testing.T) {
	root, base := repoGit(t)
	commits := []string{base}
	for i := 0; i < 6; i++ {
		commits = append(commits, commitNuevo(t, root, fmt.Sprintf("f%d.txt", i)))
	}
	head := commits[len(commits)-1]
	llamadas := contarGit(t)
	for _, c := range commits {
		if ok, detalle := entregaIntegrada(root, c, head); !ok {
			t.Fatalf("%s should be integrated into %s: %s", c, head, detalle)
		}
	}
	if *llamadas > 3 {
		t.Fatalf("%d ancestry questions over one HEAD spawned %d git processes, want at most 3", len(commits), *llamadas)
	}
	if ok, _ := entregaIntegrada(root, head, base); ok {
		t.Fatal("a later commit must not count as integrated into an earlier one")
	}
}
