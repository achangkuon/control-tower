package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// gitFixture runs repository-local Git setup without relying on the host's
// default branch.
func gitFixture(t *testing.T, root string, args ...string) string {
	t.Helper()
	out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
	return strings.TrimSpace(string(out))
}

// repoGit builds a throwaway repository with one commit so every command can
// resolve HEAD and the Git common directory.
func repoGit(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	gitFixture(t, root, "init", "-q")
	gitFixture(t, root, "symbolic-ref", "HEAD", "refs/heads/master")
	gitFixture(t, root, "config", "user.email", "copiloto@example.test")
	gitFixture(t, root, "config", "user.name", "Copiloto Test")
	writeTestFile(t, filepath.Join(root, "tracked.txt"), "base\n", 0o644)
	gitFixture(t, root, "add", "tracked.txt")
	gitFixture(t, root, "commit", "-qm", "base")
	return root
}

func writeTestFile(t *testing.T, path, contenido string, modo os.FileMode) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(contenido), modo); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(path, modo); err != nil {
		t.Fatal(err)
	}
}

func commonDe(t *testing.T, root string) string {
	t.Helper()
	common, err := commonDir(root)
	if err != nil {
		t.Fatal(err)
	}
	return common
}

// fakeRadar replaces the single Radar read seam with fixed answers. A key is
// the joined argument list; a missing key is an error.
func fakeRadar(t *testing.T, respuestas map[string]string) {
	t.Helper()
	anterior := radarSalida
	t.Cleanup(func() { radarSalida = anterior })
	radarSalida = func(root string, args ...string) ([]byte, error) {
		clave := strings.Join(args, " ")
		respuesta, ok := respuestas[clave]
		if !ok {
			return nil, os.ErrNotExist
		}
		return []byte(respuesta), nil
	}
}
