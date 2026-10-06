package main

import (
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
)

func TestRamaIntegrada(t *testing.T) {
	t.Run("sólo master", func(t *testing.T) {
		root, _ := repoGit(t)
		rama, err := ramaIntegrada(root)
		if err != nil || rama != "refs/heads/master" {
			t.Fatalf("ramaIntegrada = %q (%v)", rama, err)
		}
	})
	t.Run("sólo main", func(t *testing.T) {
		root, _ := repoGit(t)
		gitFixture(t, root, "branch", "-m", "main")
		rama, err := ramaIntegrada(root)
		if err != nil || rama != "refs/heads/main" {
			t.Fatalf("ramaIntegrada = %q (%v)", rama, err)
		}
	})
	t.Run("ambas es ambiguo", func(t *testing.T) {
		root, _ := repoGit(t)
		gitFixture(t, root, "branch", "main")
		if rama, err := ramaIntegrada(root); err == nil {
			t.Fatalf("dos ramas integradas deben ser ambiguas, salió %q", rama)
		}
	})
}

func TestCrearCopiaModos(t *testing.T) {
	root, _ := repoGit(t)
	ruta, err := rutaCopia(root, "2026-10-02", "S1")
	if err != nil {
		t.Fatal(err)
	}
	rama := ramaDeVuelo("2026-10-02", "S1")
	// El checkout de la copia tiene que salir 755/644 sin depender del umask del proceso:
	// es el caso que rompió la suite Python (S220, sección 3).
	previo := syscall.Umask(0o002)
	err = crearCopia(root, "refs/heads/master", rama, ruta)
	syscall.Umask(previo)
	if err != nil {
		t.Fatalf("crearCopia: %v", err)
	}
	ejecutable := filepath.Join(ruta, "bin", "ejecutable.sh")
	info, err := os.Lstat(ejecutable)
	if err != nil {
		t.Fatalf("la copia no tiene el ejecutable rastreado: %v", err)
	}
	if info.Mode().Perm() != 0o755 {
		t.Fatalf("ejecutable de la copia en modo %v, quiere 0755 (umask 022 al crear)", info.Mode().Perm())
	}
	regular, err := os.Lstat(filepath.Join(ruta, "tracked.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if regular.Mode().Perm() != 0o644 {
		t.Fatalf("archivo regular de la copia en modo %v, quiere 0644", regular.Mode().Perm())
	}
	if _, err := gitOutput(root, "show-ref", "--verify", rama); err != nil {
		t.Fatalf("la rama del vuelo no existe: %v", err)
	}
	branch, err := gitOutput(ruta, "symbolic-ref", "--quiet", "HEAD")
	if err != nil || branch != rama {
		t.Fatalf("la copia está en %q, quiere %q (%v)", branch, rama, err)
	}
}

func TestCrearCopiaRechazaExistente(t *testing.T) {
	t.Run("ruta ocupada", func(t *testing.T) {
		root, _ := repoGit(t)
		ruta, _ := rutaCopia(root, "2026-10-02", "S1")
		if err := os.MkdirAll(ruta, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := crearCopia(root, "refs/heads/master", ramaDeVuelo("2026-10-02", "S1"), ruta); err == nil {
			t.Fatal("crearCopia debe rechazar una ruta ocupada")
		}
		if _, err := gitOutput(root, "show-ref", "--verify", ramaDeVuelo("2026-10-02", "S1")); err == nil {
			t.Fatal("un rechazo no debe dejar la rama creada")
		}
	})
	t.Run("rama ocupada", func(t *testing.T) {
		root, _ := repoGit(t)
		gitFixture(t, root, "branch", "piloto/2026-10-02/vuelo-S1")
		ruta, _ := rutaCopia(root, "2026-10-02", "S1")
		if err := crearCopia(root, "refs/heads/master", ramaDeVuelo("2026-10-02", "S1"), ruta); err == nil {
			t.Fatal("crearCopia debe rechazar una rama ya existente")
		}
		if _, err := os.Lstat(ruta); !os.IsNotExist(err) {
			t.Fatalf("un rechazo no debe dejar la copia creada: %v", err)
		}
	})
}

func TestTrabajoPendiente(t *testing.T) {
	root, _ := repoGit(t)
	ruta, _ := rutaCopia(root, "2026-10-02", "S1")
	if err := crearCopia(root, "refs/heads/master", ramaDeVuelo("2026-10-02", "S1"), ruta); err != nil {
		t.Fatal(err)
	}
	pending, err := trabajoPendiente(ruta)
	if err != nil || pending {
		t.Fatalf("una copia recién creada no tiene trabajo pendiente: %v (%v)", pending, err)
	}
	writeTestFile(t, filepath.Join(ruta, "borrador.txt"), "sin confirmar\n", 0o644)
	pending, err = trabajoPendiente(ruta)
	if err != nil || !pending {
		t.Fatalf("un archivo sin confirmar es trabajo pendiente: %v (%v)", pending, err)
	}
}

func TestRetirarCopia(t *testing.T) {
	t.Run("copia limpia", func(t *testing.T) {
		root, _ := repoGit(t)
		ruta, _ := rutaCopia(root, "2026-10-02", "S1")
		rama := ramaDeVuelo("2026-10-02", "S1")
		if err := crearCopia(root, "refs/heads/master", rama, ruta); err != nil {
			t.Fatal(err)
		}
		if err := retirarCopia(root, rama, ruta); err != nil {
			t.Fatalf("retirarCopia: %v", err)
		}
		if _, err := os.Lstat(ruta); !os.IsNotExist(err) {
			t.Fatalf("la copia debe desaparecer: %v", err)
		}
		if _, err := gitOutput(root, "show-ref", "--verify", rama); err == nil {
			t.Fatal("la rama del vuelo debe desaparecer")
		}
	})
	t.Run("copia con trabajo sin confirmar", func(t *testing.T) {
		root, _ := repoGit(t)
		ruta, _ := rutaCopia(root, "2026-10-02", "S1")
		rama := ramaDeVuelo("2026-10-02", "S1")
		if err := crearCopia(root, "refs/heads/master", rama, ruta); err != nil {
			t.Fatal(err)
		}
		writeTestFile(t, filepath.Join(ruta, "borrador.txt"), "sin confirmar\n", 0o644)
		if err := retirarCopia(root, rama, ruta); err == nil {
			t.Fatal("retirarCopia debe negarse con trabajo sin confirmar")
		}
		if _, err := os.Lstat(ruta); err != nil {
			t.Fatalf("un rechazo conserva la copia: %v", err)
		}
	})
	t.Run("copia ausente retira la rama", func(t *testing.T) {
		root, _ := repoGit(t)
		rama := ramaDeVuelo("2026-10-02", "S1")
		gitFixture(t, root, "branch", "piloto/2026-10-02/vuelo-S1")
		ruta, _ := rutaCopia(root, "2026-10-02", "S1")
		if err := retirarCopia(root, rama, ruta); err != nil {
			t.Fatalf("retirarCopia con copia ausente: %v", err)
		}
		if _, err := gitOutput(root, "show-ref", "--verify", rama); err == nil {
			t.Fatal("la rama debe quedar retirada")
		}
	})
}

func TestCommits(t *testing.T) {
	root, head := repoGit(t)
	if got, err := commitValido(root, head); err != nil || got != strings.ToLower(head) {
		t.Fatalf("commitValido = %q (%v)", got, err)
	}
	for _, malo := range []string{"", "abc", strings.Repeat("a", 40), strings.Repeat("z", 40), "HEAD"} {
		if _, err := commitValido(root, malo); err == nil {
			t.Fatalf("commitValido(%q) debe fallar cerrado", malo)
		}
	}
	rama := ramaDeVuelo("2026-10-02", "S1")
	gitFixture(t, root, "branch", rama, head)
	if ok, err := commitEnRama(root, head, rama); err != nil || !ok {
		t.Fatalf("el commit base está en la rama del vuelo: %v (%v)", ok, err)
	}
	gitFixture(t, root, "commit", "--allow-empty", "-qm", "otro")
	otro := gitFixture(t, root, "rev-parse", "HEAD^{commit}")
	if ok, err := commitEnRama(root, otro, rama); err != nil || ok {
		t.Fatalf("un commit fuera de la rama no cuenta: %v (%v)", ok, err)
	}
	if _, err := commitEnRama(root, head, "refs/heads/no-existe"); err == nil {
		t.Fatal("una rama inexistente debe fallar")
	}
}
