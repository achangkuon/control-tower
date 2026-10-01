package main

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

// repoColisiones builds a real repository whose plan has Sessions that pair up
// in every compatibility class, and returns the root with the loaded plan.
//
//	S1 src/a.txt | S2 src/b.txt              -> compatible
//	S3 src/c.txt | S4 src/c.txt + src/d.txt  -> solapa-archivos
//	S5, S6 share the resource "raíz Pi"      -> recurso-excluyente
//	S7, S8 share the Cimiento shared.txt     -> cimiento-compartido
//	S9 read-only, no declared files          -> indeterminado with any other
func repoColisiones(t *testing.T) (string, *Plan) {
	t.Helper()
	root := t.TempDir()
	for _, args := range [][]string{{"init", "-q"}, {"config", "user.email", "radar@example.test"}, {"config", "user.name", "Radar Test"}} {
		fixtureGit(t, root, args...)
	}
	for _, f := range []string{"src/a.txt", "src/b.txt", "src/c.txt", "src/d.txt", "src/e.txt", "src/f.txt", "shared.txt"} {
		if err := os.MkdirAll(filepath.Dir(filepath.Join(root, f)), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(root, f), []byte("x\n"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	sesion := func(id, extra string) string {
		return fmt.Sprintf(`  - id: %s
    zona: z
    resultado: resultado %s
    autoridad: openspec/plan.yaml
%s    encargo:
      pedido_contexto: a
      resultado_comportamiento: b
      restricciones_decisiones: c
      referencias: d
`, id, id, extra)
	}
	plan := "schema: plan\nschema_version: 3\nproducto: colisiones\nzonas:\n  - id: z\n    rutas: [src/]\ncimientos:\n  rutas: [shared.txt, openspec/]\nsesiones:\n" +
		sesion("S1", "    archivos: [src/a.txt]\n") +
		sesion("S2", "    archivos: [src/b.txt]\n") +
		sesion("S3", "    archivos: [src/c.txt]\n") +
		sesion("S4", "    archivos: [src/c.txt, src/d.txt]\n") +
		sesion("S5", "    archivos: [src/e.txt]\n    recurso: [raíz Pi]\n") +
		sesion("S6", "    archivos: [src/f.txt]\n    recurso: [raíz Pi]\n") +
		sesion("S7", "    archivos: [shared.txt]\n    cimientos: [shared.txt]\n") +
		sesion("S8", "    archivos: [shared.txt]\n    cimientos: [shared.txt]\n") +
		sesion("S9", "    solo_lectura: true\n")
	if err := os.MkdirAll(filepath.Join(root, "openspec"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "openspec", "plan.yaml"), []byte(plan), 0o600); err != nil {
		t.Fatal(err)
	}
	fixtureGit(t, root, "add", ".")
	fixtureGit(t, root, "commit", "-qm", "fixture")
	p, err := Load(filepath.Join(root, "openspec", "plan.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	canonical, err := gitOutput(root, "rev-parse", "--show-toplevel")
	if err != nil {
		t.Fatal(err)
	}
	return canonical, p
}

func estadoChanks(t *testing.T, root string) string {
	t.Helper()
	return snapshotTree(t, filepath.Join(mustCommon(t, root), "chanks"))
}

func mustCommon(t *testing.T, root string) string {
	t.Helper()
	common, err := commonDir(root)
	if err != nil {
		t.Fatal(err)
	}
	return common
}

func TestMarcarRechazaColisionConSesionEnCurso(t *testing.T) {
	for _, tc := range []struct {
		name, live, candidate, class, detail string
	}{
		{"archivos", "S3", "S4", "solapa-archivos", "src/c.txt"},
		{"recurso", "S5", "S6", "recurso-excluyente", "raíz Pi"},
		{"indeterminado", "S1", "S9", "indeterminado", "S9"},
		{"cimiento", "S7", "S8", "cimiento-compartido", "shared.txt"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root, p := repoColisiones(t)
			if err := cmdMarcar(&bytes.Buffer{}, p, root, tc.live, newWorktree(t, root, "vivo"), ""); err != nil {
				t.Fatal(err)
			}
			before := estadoChanks(t, root)
			var out bytes.Buffer
			err := cmdMarcar(&out, p, root, tc.candidate, newWorktree(t, root, "candidato"), "")
			if err == nil || out.Len() != 0 {
				t.Fatalf("se esperaba rechazo: out=%q err=%v", out.String(), err)
			}
			for _, want := range []string{tc.live, tc.class, tc.detail} {
				if !strings.Contains(err.Error(), want) {
					t.Fatalf("el rechazo debe nombrar %q: %v", want, err)
				}
			}
			if after := estadoChanks(t, root); after != before {
				t.Fatalf("un rechazo mutó el sistema de archivos:\n%s\n---\n%s", before, after)
			}
			if got := p.EstadosAt(root, mustHead(t, root))[tc.candidate]; got != Listo {
				t.Fatalf("la Sesión rechazada debe seguir LISTO, está %s", got)
			}
		})
	}
}

func mustHead(t *testing.T, root string) string {
	t.Helper()
	head, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	return head
}

func TestMarcarAceptaSesionesCompatiblesYDesmarcarLiberaLaColision(t *testing.T) {
	root, p := repoColisiones(t)
	for id, name := range map[string]string{"S1": "uno", "S2": "dos", "S3": "tres"} {
		if err := cmdMarcar(&bytes.Buffer{}, p, root, id, newWorktree(t, root, name), ""); err != nil {
			t.Fatalf("%s compatible debe poder marcarse: %v", id, err)
		}
	}
	wt4 := newWorktree(t, root, "cuatro")
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S4", wt4, ""); err == nil || !strings.Contains(err.Error(), "S3") {
		t.Fatalf("S4 choca con S3: %v", err)
	}
	if err := cmdDesmarcar(&bytes.Buffer{}, root, "S3"); err != nil {
		t.Fatal(err)
	}
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S4", wt4, ""); err != nil {
		t.Fatalf("sin S3 EN CURSO, S4 debe marcarse: %v", err)
	}
}

func TestMarcarIgnoraMarcadorHuerfanoParaLaCompatibilidad(t *testing.T) {
	root, p := repoColisiones(t)
	wt := newWorktree(t, root, "huerfano")
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", wt, ""); err != nil {
		t.Fatal(err)
	}
	fixtureGit(t, root, "worktree", "remove", "--force", wt)
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S4", newWorktree(t, root, "nuevo"), ""); err != nil {
		t.Fatalf("un marcador huérfano no es una Sesión viva: %v", err)
	}
}

func TestMarcarRechazaWorktreeOPrimaryYaUsado(t *testing.T) {
	root, p := repoColisiones(t)
	wt := newWorktree(t, root, "compartido")
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S1", wt, ""); err != nil {
		t.Fatal(err)
	}
	before := estadoChanks(t, root)
	err := cmdMarcar(&bytes.Buffer{}, p, root, "S2", wt, "")
	if err == nil || !strings.Contains(err.Error(), "S1") || !strings.Contains(err.Error(), "worktree") {
		t.Fatalf("mismo worktree debe rechazarse nombrando S1: %v", err)
	}
	// Same branch, different path: the first worktree is gone (orphan marker)
	// and a new checkout of the very same branch is offered to another Session.
	fixtureGit(t, root, "worktree", "remove", "--force", wt)
	again := filepath.Join(t.TempDir(), "misma-rama")
	fixtureGit(t, root, "worktree", "add", "-q", again, "feat/compartido")
	err = cmdMarcar(&bytes.Buffer{}, p, root, "S2", again, "")
	if err == nil || !strings.Contains(err.Error(), "S1") || !strings.Contains(err.Error(), "rama") {
		t.Fatalf("misma rama debe rechazarse nombrando S1: %v", err)
	}
	if estadoChanks(t, root) != before {
		t.Fatal("un rechazo mutó el sistema de archivos")
	}
}

func TestMarcarAceptaElCheckoutPrimarioUnaSolaVez(t *testing.T) {
	root, p := repoColisiones(t)
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S1", root, ""); err != nil {
		t.Fatalf("una Sesión sola en el checkout primario debe poder marcarse: %v", err)
	}
	if got := p.EstadosAt(root, mustHead(t, root))["S1"]; got != EnCurso {
		t.Fatalf("estado = %s, esperado EN CURSO", got)
	}
	before := estadoChanks(t, root)
	err := cmdMarcar(&bytes.Buffer{}, p, root, "S2", root, "")
	if err == nil || !strings.Contains(err.Error(), "S1") {
		t.Fatalf("el checkout primario sólo admite una Sesión: %v", err)
	}
	if estadoChanks(t, root) != before {
		t.Fatal("un rechazo mutó el sistema de archivos")
	}
}

func TestSaneaWorkerCasosBorde(t *testing.T) {
	for in, want := range map[string]string{
		"":         "worker",
		".":        "worker",
		"..":       "worker",
		"a b":      "a-b",
		" a ":      "-a-",
		"a/b":      "a-b",
		`a\b`:      "a-b",
		"a\tb\nc":  "a-b-c",
		"/":        "-",
		"normal-1": "normal-1",
	} {
		got := saneaWorker(in)
		if got != want || !workerValido(got) {
			t.Fatalf("saneaWorker(%q) = %q, esperado %q", in, got, want)
		}
	}
}

func TestMarcarListoConservaCadaCampoDelMarcador(t *testing.T) {
	root, p := repoColisiones(t)
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S1", newWorktree(t, root, "campos"), "impl-9"); err != nil {
		t.Fatal(err)
	}
	before, err := leerDespacho(root, "S1")
	if err != nil || before == nil {
		t.Fatalf("%v %v", before, err)
	}
	if err := cmdMarcarListo(&bytes.Buffer{}, p, root, "S1"); err != nil {
		t.Fatal(err)
	}
	after, err := leerDespacho(root, "S1")
	if err != nil || after == nil || after.ReviewReady == nil {
		t.Fatalf("%v %v", after, err)
	}
	witness := *after.ReviewReady
	after.ReviewReady = nil
	if !reflect.DeepEqual(*before, *after) {
		t.Fatalf("--listo alteró campos existentes:\n%+v\n%+v", *before, *after)
	}
	if witness.Sesion != before.Sesion || witness.Worker != before.Worker || witness.Worktree != before.Worktree || witness.Branch != before.Branch {
		t.Fatalf("el testigo no refleja la identidad del marcador: %+v", witness)
	}
}

func TestMarcadorNoRegularEnLugarDelArchivo(t *testing.T) {
	for _, kind := range []string{"directorio", "enlace colgante"} {
		t.Run(kind, func(t *testing.T) {
			root, p := repoColisiones(t)
			dir, err := directorioDespachos(mustCommon(t, root), true)
			if err != nil {
				t.Fatal(err)
			}
			node := filepath.Join(dir, "S1.json")
			if kind == "directorio" {
				err = os.Mkdir(node, 0o700)
			} else {
				err = os.Symlink(filepath.Join(t.TempDir(), "no-existe"), node)
			}
			if err != nil {
				t.Fatal(err)
			}
			before := estadoChanks(t, root)
			err = cmdMarcar(&bytes.Buffer{}, p, root, "S1", newWorktree(t, root, "nodo"), "")
			if err == nil || !strings.Contains(err.Error(), node) || strings.Contains(err.Error(), "usa radar desmarcar") {
				t.Fatalf("debe pedir quitar el nodo a mano y nombrar su ruta: %v", err)
			}
			if err := cmdDesmarcar(&bytes.Buffer{}, root, "S1"); err == nil || !strings.Contains(err.Error(), "regular") {
				t.Fatalf("desmarcar no debe quitar un nodo no regular: %v", err)
			}
			if estadoChanks(t, root) != before {
				t.Fatal("un rechazo mutó el sistema de archivos")
			}
		})
	}
}

// TestProcesoRadarCodigosDeSalida pins main.go's dispatch: usage errors exit 2,
// refusals exit 1 and success exits 0, through the real binary.
func TestProcesoRadarCodigosDeSalida(t *testing.T) {
	if testing.Short() {
		t.Skip("compila el binario")
	}
	root, _ := repoColisiones(t)
	bin := filepath.Join(t.TempDir(), "radar")
	if out, err := exec.Command("go", "build", "-o", bin, ".").CombinedOutput(); err != nil {
		t.Fatalf("no se pudo compilar: %v: %s", err, out)
	}
	run := func(args ...string) (int, string) {
		cmd := exec.Command(bin, append(args, "-C", root)...)
		out, err := cmd.CombinedOutput()
		var exit *exec.ExitError
		if errors.As(err, &exit) {
			return exit.ExitCode(), string(out)
		}
		if err != nil {
			t.Fatal(err)
		}
		return 0, string(out)
	}
	wt := func(name string) string { return newWorktree(t, root, name) }
	w1, w2 := wt("p1"), wt("p2")
	for _, tc := range []struct {
		name string
		args []string
		code int
	}{
		{"marcar sin ID", []string{"marcar", "--worktree", w1}, 2},
		{"marcar sin worktree", []string{"marcar", "S1"}, 2},
		{"marcar listo con worktree", []string{"marcar", "S1", "--listo", "--worktree", w1}, 2},
		{"desmarcar sin ID", []string{"desmarcar"}, 2},
		{"flag desconocido", []string{"marcar", "S1", "--nada"}, 2},
		{"comando desconocido", []string{"nada"}, 2},
		{"marcar ok", []string{"marcar", "S3", "--worktree", w1}, 0},
		{"marcar compatible ok", []string{"marcar", "S1", "--worktree", w2}, 0},
		{"marcar colisión", []string{"marcar", "S4", "--worktree", wt("p3")}, 1},
		{"marcar otra vez", []string{"marcar", "S3", "--worktree", wt("p4")}, 1},
		{"desmarcar ok", []string{"desmarcar", "S3"}, 0},
		{"desmarcar sin marcador", []string{"desmarcar", "S3"}, 1},
		{"marcar tras liberar", []string{"marcar", "S4", "--worktree", wt("p5")}, 0},
	} {
		if code, out := run(tc.args...); code != tc.code {
			t.Fatalf("%s: salida %d, esperada %d: %s", tc.name, code, tc.code, out)
		}
	}
	if code, out := run("marcar", "S4", "--worktree", wt("p6")); code != 1 || strings.Contains(out, "panic") {
		t.Fatalf("un rechazo sale con 1 sin pánico: %d %s", code, out)
	}
}
