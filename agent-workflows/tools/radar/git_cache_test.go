package main

import (
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
