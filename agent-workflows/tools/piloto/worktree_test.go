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
	t.Run("código auxiliar: la copia recién creada está limpia", func(t *testing.T) {
		pending, err := trabajoPendiente(ruta)
		if err != nil || pending {
			t.Fatalf("una copia recién creada no tiene trabajo pendiente: %v (%v)", pending, err)
		}
	})
	t.Run(".codegraph/ es artefacto de herramienta, no trabajo pendiente", func(t *testing.T) {
		if err := os.MkdirAll(filepath.Join(ruta, ".codegraph"), 0o755); err != nil {
			t.Fatal(err)
		}
		writeTestFile(t, filepath.Join(ruta, ".codegraph", "indice.db"), "x", 0o644)
		pending, err := trabajoPendiente(ruta)
		if err != nil || pending {
			t.Fatalf(".codegraph/ sin seguimiento no es trabajo pendiente: %v (%v)", pending, err)
		}
	})
	t.Run("cualquier otro archivo sin seguimiento sigue frenando", func(t *testing.T) {
		writeTestFile(t, filepath.Join(ruta, "borrador.txt"), "sin confirmar\n", 0o644)
		pending, err := trabajoPendiente(ruta)
		if err != nil || !pending {
			t.Fatalf("un archivo sin confirmar es trabajo pendiente: %v (%v)", pending, err)
		}
	})
	t.Run("retirar tolera una copia con sólo .codegraph/", func(t *testing.T) {
		root, _ := repoGit(t)
		ruta2, _ := rutaCopia(root, "2026-10-02", "S1")
		rama := ramaDeVuelo("2026-10-02", "S1")
		if err := crearCopia(root, "refs/heads/master", rama, ruta2); err != nil {
			t.Fatal(err)
		}
		if err := os.MkdirAll(filepath.Join(ruta2, ".codegraph"), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := retirarCopia(root, rama, ruta2); err != nil {
			t.Fatalf("retirarCopia con sólo .codegraph/: %v", err)
		}
	})
}

// TestPrepararCopiaSinCodegraph pins S234: the takeoff preparation never runs
// `codegraph init` (it leaves an empty index the agent recreates anyway), while
// bun install keeps running when a package.json is present.
func TestPrepararCopiaSinCodegraph(t *testing.T) {
	t.Run("bun corre, codegraph no", func(t *testing.T) {
		ruta := t.TempDir()
		bin := t.TempDir()
		marcadorCodegraph := filepath.Join(bin, "codegraph-corrio")
		writeTestFile(t, filepath.Join(bin, "codegraph"), "#!/bin/sh\n: > "+marcadorCodegraph+"\nexit 0\n", 0o755)
		marcadorBun := filepath.Join(bin, "bun-corrio")
		writeTestFile(t, filepath.Join(bin, "bun"), "#!/bin/sh\n: > "+marcadorBun+"\nexit 0\n", 0o755)
		t.Setenv("PATH", bin)
		writeTestFile(t, filepath.Join(ruta, "package.json"), "{\n}\n", 0o644)
		if err := prepararCopiaReal(ruta); err != nil {
			t.Fatalf("prepararCopiaReal: %v", err)
		}
		if _, err := os.Lstat(marcadorCodegraph); !os.IsNotExist(err) {
			t.Fatalf("el despegue ya no corre codegraph init: %v", err)
		}
		if _, err := os.Lstat(marcadorBun); err != nil {
			t.Fatalf("bun install sigue corriendo: %v", err)
		}
	})
	t.Run("sin package.json no necesita bun", func(t *testing.T) {
		ruta := t.TempDir()
		bin := t.TempDir()
		writeTestFile(t, filepath.Join(bin, "codegraph"), "#!/bin/sh\nexit 0\n", 0o755)
		t.Setenv("PATH", bin)
		if err := prepararCopiaReal(ruta); err != nil {
			t.Fatalf("prepararCopiaReal sin package.json: %v", err)
		}
	})
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
