package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// TestGitCommandStripsHookRoutingEnv pins the #152 fix: Git exports routing
// variables (GIT_DIR among them) to hooks, and under an inherited GIT_DIR
// `rev-parse --show-toplevel` stops walking up, so resolverRaiz roots at a
// subdirectory. Radar always addresses the repository with -C root, so its git
// spawns must never inherit that context.
func TestGitCommandStripsHookRoutingEnv(t *testing.T) {
	t.Setenv("GIT_DIR", "/tmp/some-hook-gitdir")
	t.Setenv("GIT_WORK_TREE", "/tmp/some-hook-worktree")
	t.Setenv("PATH", os.Getenv("PATH"))

	cmd := gitCommand("rev-parse", "--show-toplevel")
	if cmd == nil {
		t.Fatal("gitCommand devolvió nil")
	}
	for _, kv := range cmd.Env {
		for _, name := range gitHookEnv {
			if strings.HasPrefix(kv, name+"=") {
				t.Fatalf("gitCommand heredó %s de un contexto de hook: %q", name, kv)
			}
		}
	}
	foundPath := false
	for _, kv := range cmd.Env {
		foundPath = foundPath || strings.HasPrefix(kv, "PATH=")
	}
	if !foundPath {
		t.Fatal("gitCommand perdió el PATH del entorno")
	}
}

// TestResolverRaizIgnoraGitDirDelHook reproduces the doubled-openspec root from
// issue #152: run from inside a hook-like environment, root derivation must
// still walk up from the subdirectory instead of trusting GIT_DIR.
func TestResolverRaizIgnoraGitDirDelHook(t *testing.T) {
	root, _ := repoGit(t)
	sub := filepath.Join(root, "openspec")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatal(err)
	}

	t.Setenv("GIT_DIR", filepath.Join(root, ".git", "worktrees", "fake"))
	t.Setenv("GIT_WORK_TREE", sub)

	got, err := resolverRaiz("", "", sub)
	if err != nil {
		t.Fatal(err)
	}
	if got != root {
		t.Fatalf("resolverRaiz enraizó en %q en vez de %q bajo GIT_DIR de hook", got, root)
	}
}

// TestTrackedFilesAtRutasNoASCII pins the #146 fix: with core.quotepath on (the
// default), git quotes non-ASCII paths in octal, and the quoted spelling never
// matches any Zona. ls-tree -z hands back raw paths, so a tracked
// "Campañas/README.md" must come back unquoted and byte-faithful.
func TestTrackedFilesAtRutasNoASCII(t *testing.T) {
	root := t.TempDir()
	fixtureGit(t, root, "init", "-q")
	fixtureGit(t, root, "config", "user.email", "radar@example.test")
	fixtureGit(t, root, "config", "user.name", "Radar Test")

	dir := filepath.Join(root, "Campañas")
	if err := os.Mkdir(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("hola\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	fixtureGit(t, root, "add", "Campañas/README.md")
	fixtureGit(t, root, "commit", "-qm", "base")

	// The machine default is quotepath=true; force the quoting behavior on so the
	// test exercises the failure mode regardless of host config.
	cmd := exec.Command("git", "-C", root, "config", "core.quotepath", "true")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git config core.quotepath: %v: %s", err, out)
	}

	head, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	files, err := trackedFilesAt(root, head)
	if err != nil {
		t.Fatal(err)
	}
	const want = "Campañas/README.md"
	for _, f := range files {
		if f == want {
			return
		}
		if strings.Contains(f, "303") || strings.HasPrefix(f, "\"") {
			t.Fatalf("la ruta no ASCII volvió citada por git: %q (se esperaba %q)", f, want)
		}
	}
	t.Fatalf("la ruta trackeada %q no apareció en la lista de archivos: %#v", want, files)
}
