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
