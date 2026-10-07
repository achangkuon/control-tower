package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func pasoIDs(plan *PlanTraslado) []string {
	var ids []string
	for _, p := range plan.Pasos {
		ids = append(ids, p.Sesion)
	}
	return ids
}

// vueloConCadena builds a real flight branch and its work copy with one commit
// per Sesión, and returns the flight plus each commit. It is the shared fixture
// for the landing tests.
func vueloConCadena(t *testing.T, root string, sesiones []string, cambios map[string]func(copia string)) (Vuelo, map[string]string) {
	t.Helper()
	fecha := "2026-10-02"
	id := sesiones[0]
	rama := ramaDeVuelo(fecha, id)
	copia, err := rutaCopia(root, fecha, id)
	if err != nil {
		t.Fatal(err)
	}
	if err := crearCopia(root, "refs/heads/master", rama, copia); err != nil {
		t.Fatal(err)
	}
	v := Vuelo{ID: id, Ancla: id, Rama: rama, Copia: copia}
	var anterior string
	commits := map[string]string{}
	for _, s := range sesiones {
		m := Miembro{Sesion: s}
		if anterior != "" {
			m.DependeDe = []string{anterior}
		}
		v.Sesiones = append(v.Sesiones, m)
		cambios[s](copia)
		gitFixture(t, copia, "add", "-A")
		gitFixture(t, copia, "commit", "-qm", "entrega "+s)
		commits[s] = gitFixture(t, copia, "rev-parse", "HEAD^{commit}")
		anterior = s
	}
	return v, commits
}

func TestTraslado(t *testing.T) {
	root, base := repoGit(t)
	v, commits := vueloConCadena(t, root, []string{"S1", "S3", "S5"}, map[string]func(string){
		"S1": func(copia string) { writeTestFile(t, filepath.Join(copia, "tracked.txt"), "s1\n", 0o644) },
		"S3": func(copia string) { writeTestFile(t, filepath.Join(copia, "s3.txt"), "s3\n", 0o644) },
		"S5": func(copia string) { writeTestFile(t, filepath.Join(copia, "s5.txt"), "s5\n", 0o644) },
	})
	corridaConVuelos(t, root, v)
	for _, s := range []string{"S1", "S3", "S5"} {
		if err := escribirMarca(root, Marca{Sesion: s, Vuelo: "S1", Rama: v.Rama, Estado: estadoCierre, Commit: commits[s], Ronda: 1}); err != nil {
			t.Fatal(err)
		}
	}

	// La base se corrige: la rama vuelve al tronco y S1 se rehace distinto,
	// dejando arriba S3 y S5 sin base.
	gitFixture(t, v.Copia, "reset", "--hard", base)
	writeTestFile(t, filepath.Join(v.Copia, "tracked.txt"), "s1-corregido\n", 0o644)
	gitFixture(t, v.Copia, "add", "tracked.txt")
	gitFixture(t, v.Copia, "commit", "-qm", "corrección S1")
	c1p := gitFixture(t, v.Copia, "rev-parse", "HEAD^{commit}")

	plan, err := trasladar(root, "S1", c1p)
	if err != nil {
		t.Fatalf("trasladar: %v", err)
	}
	if strings.Join(pasoIDs(plan), ",") != "S3,S5" || plan.Vuelo != "S1" || plan.CommitsBase != c1p {
		t.Fatalf("plan = %+v", plan)
	}
	for _, f := range []string{"s3.txt", "s5.txt"} {
		if _, err := os.Lstat(filepath.Join(v.Copia, f)); err != nil {
			t.Fatalf("el traslado debe devolver %s: %v", f, err)
		}
	}
	contenido, _ := os.ReadFile(filepath.Join(v.Copia, "tracked.txt"))
	if strings.TrimSpace(string(contenido)) != "s1-corregido" {
		t.Fatalf("la corrección de la base se perdió: %q", contenido)
	}
}

func TestTrasladoFallaCerrado(t *testing.T) {
	t.Run("un paso que no aplica limpio", func(t *testing.T) {
		root, base := repoGit(t)
		v, commits := vueloConCadena(t, root, []string{"S1", "S3"}, map[string]func(string){
			"S1": func(copia string) { writeTestFile(t, filepath.Join(copia, "tracked.txt"), "s1\n", 0o644) },
			"S3": func(copia string) { writeTestFile(t, filepath.Join(copia, "tracked.txt"), "s3\n", 0o644) },
		})
		corridaConVuelos(t, root, v)
		for _, s := range []string{"S1", "S3"} {
			if err := escribirMarca(root, Marca{Sesion: s, Vuelo: "S1", Rama: v.Rama, Estado: estadoCierre, Commit: commits[s], Ronda: 1}); err != nil {
				t.Fatal(err)
			}
		}
		gitFixture(t, v.Copia, "reset", "--hard", base)
		writeTestFile(t, filepath.Join(v.Copia, "tracked.txt"), "s1-corregido\n", 0o644)
		gitFixture(t, v.Copia, "add", "tracked.txt")
		gitFixture(t, v.Copia, "commit", "-qm", "corrección S1")
		c1p := gitFixture(t, v.Copia, "rev-parse", "HEAD^{commit}")

		if _, err := trasladar(root, "S1", c1p); err == nil {
			t.Fatal("un traslado que no aplica limpio se niega")
		}
		if cabeza := gitFixture(t, v.Copia, "rev-parse", "HEAD^{commit}"); cabeza != c1p {
			t.Fatalf("un rechazo no toca la base corregida: %s", cabeza)
		}
		if pending, err := trabajoPendiente(v.Copia); err != nil || pending {
			t.Fatalf("un rechazo no deja la copia a medias: %v (%v)", pending, err)
		}
	})
	t.Run("un paso intermedio que no aplica limpio no deja los anteriores", func(t *testing.T) {
		root, base := repoGit(t)
		v, commits := vueloConCadena(t, root, []string{"S1", "S3", "S5"}, map[string]func(string){
			"S1": func(copia string) { writeTestFile(t, filepath.Join(copia, "tracked.txt"), "s1\n", 0o644) },
			"S3": func(copia string) { writeTestFile(t, filepath.Join(copia, "s3.txt"), "s3\n", 0o644) },
			"S5": func(copia string) { writeTestFile(t, filepath.Join(copia, "tracked.txt"), "s5\n", 0o644) },
		})
		corridaConVuelos(t, root, v)
		for _, s := range []string{"S1", "S3", "S5"} {
			if err := escribirMarca(root, Marca{Sesion: s, Vuelo: "S1", Rama: v.Rama, Estado: estadoCierre, Commit: commits[s], Ronda: 1}); err != nil {
				t.Fatal(err)
			}
		}
		gitFixture(t, v.Copia, "reset", "--hard", base)
		writeTestFile(t, filepath.Join(v.Copia, "tracked.txt"), "s1-corregido\n", 0o644)
		gitFixture(t, v.Copia, "add", "tracked.txt")
		gitFixture(t, v.Copia, "commit", "-qm", "corrección S1")
		c1p := gitFixture(t, v.Copia, "rev-parse", "HEAD^{commit}")

		if _, err := trasladar(root, "S1", c1p); err == nil {
			t.Fatal("un paso intermedio que choca se niega")
		}
		if cabeza := gitFixture(t, v.Copia, "rev-parse", "HEAD^{commit}"); cabeza != c1p {
			t.Fatalf("un rechazo deja la base corregida: %s", cabeza)
		}
		if _, err := os.Lstat(filepath.Join(v.Copia, "s3.txt")); !os.IsNotExist(err) {
			t.Fatalf("un rechazo no deja pasos anteriores a medias: %v", err)
		}
	})
	t.Run("sin Sesiones de arriba con entrega", func(t *testing.T) {
		root, _ := repoGit(t)
		v, _ := vueloConCadena(t, root, []string{"S1", "S3"}, map[string]func(string){
			"S1": func(copia string) { writeTestFile(t, filepath.Join(copia, "tracked.txt"), "s1\n", 0o644) },
			"S3": func(copia string) { writeTestFile(t, filepath.Join(copia, "s3.txt"), "s3\n", 0o644) },
		})
		corridaConVuelos(t, root, v)
		if _, err := trasladar(root, "S1", ""); err == nil {
			t.Fatal("sin entregas arriba no hay nada que trasladar")
		}
	})
	t.Run("la copia con trabajo sin confirmar", func(t *testing.T) {
		root, _ := repoGit(t)
		v, commits := vueloConCadena(t, root, []string{"S1", "S3"}, map[string]func(string){
			"S1": func(copia string) { writeTestFile(t, filepath.Join(copia, "tracked.txt"), "s1\n", 0o644) },
			"S3": func(copia string) { writeTestFile(t, filepath.Join(copia, "s3.txt"), "s3\n", 0o644) },
		})
		corridaConVuelos(t, root, v)
		for _, s := range []string{"S1", "S3"} {
			if err := escribirMarca(root, Marca{Sesion: s, Vuelo: "S1", Rama: v.Rama, Estado: estadoCierre, Commit: commits[s], Ronda: 1}); err != nil {
				t.Fatal(err)
			}
		}
		writeTestFile(t, filepath.Join(v.Copia, "borrador.txt"), "sin confirmar\n", 0o644)
		if _, err := trasladar(root, "S1", ""); err == nil {
			t.Fatal("una copia sucia no se traslada")
		}
	})
}

func cambiosBasicos(t *testing.T) map[string]func(string) {
	return map[string]func(string){
		"S1": func(copia string) { writeTestFile(t, filepath.Join(copia, "s1.txt"), "s1\n", 0o644) },
		"S3": func(copia string) { writeTestFile(t, filepath.Join(copia, "s3.txt"), "s3\n", 0o644) },
		"S5": func(copia string) { writeTestFile(t, filepath.Join(copia, "s5.txt"), "s5\n", 0o644) },
	}
}

func prepararVueloConCierres(t *testing.T, root string) (Vuelo, map[string]string) {
	t.Helper()
	v, commits := vueloConCadena(t, root, []string{"S1", "S3", "S5"}, cambiosBasicos(t))
	corridaConVuelos(t, root, v)
	for _, s := range []string{"S1", "S3", "S5"} {
		if err := escribirMarca(root, Marca{Sesion: s, Vuelo: v.ID, Rama: v.Rama, Estado: estadoCierre, Commit: commits[s], Ronda: 1}); err != nil {
			t.Fatal(err)
		}
	}
	return v, commits
}

func TestAprobarSesion(t *testing.T) {
	t.Run("registra la aprobación atada al SHA del cierre", func(t *testing.T) {
		root, _ := repoGit(t)
		_, commits := prepararVueloConCierres(t, root)
		a, err := aprobarSesion(root, "S1", "revisado commit por commit, ok")
		if err != nil {
			t.Fatalf("aprobarSesion: %v", err)
		}
		if a.Commit != commits["S1"] || a.Sesion != "S1" || a.Vuelo != "S1" || a.Ronda != 1 {
			t.Fatalf("aprobación = %+v", a)
		}
		guardada, err := leerAprobacion(root, "S1")
		if err != nil || guardada == nil || guardada.Commit != commits["S1"] {
			t.Fatalf("la aprobación no quedó registrada: %+v (%v)", guardada, err)
		}
	})
	t.Run("exige la marca de cierre", func(t *testing.T) {
		root, _ := repoGit(t)
		prepararVueloConCierres(t, root)
		if _, err := aprobarSesion(root, "S9", "ok"); err == nil {
			t.Fatal("aprobar una Sesión sin cierre debe fallar")
		}
	})
	t.Run("exige texto de decisión", func(t *testing.T) {
		root, _ := repoGit(t)
		prepararVueloConCierres(t, root)
		if _, err := aprobarSesion(root, "S1", "   "); err == nil {
			t.Fatal("aprobar sin decisión debe fallar")
		}
	})
}

func TestAterrizajeExigeAprobacion(t *testing.T) {
	t.Run("se niega sin la aprobación humana registrada", func(t *testing.T) {
		root, _ := repoGit(t)
		prepararVueloConCierres(t, root)
		_, err := aterrizarVuelo(root, "S1", []string{"S1", "S3", "S5"}, true)
		if err == nil {
			t.Fatal("aterrizar con marcas y sin aprobación debe fallar cerrado")
		}
		if !strings.Contains(err.Error(), "aprobación") {
			t.Fatalf("el rechazo nombra la aprobación humana: %q", err.Error())
		}
	})
	t.Run("con la aprobación de cada commit aterriza", func(t *testing.T) {
		root, _ := repoGit(t)
		prepararVueloConCierres(t, root)
		for _, s := range []string{"S1", "S3", "S5"} {
			if _, err := aprobarSesion(root, s, "ok "+s); err != nil {
				t.Fatalf("aprobar %s: %v", s, err)
			}
		}
		if _, err := aterrizarVuelo(root, "S1", []string{"S1", "S3", "S5"}, true); err != nil {
			t.Fatalf("con las aprobaciones registradas el aterrizaje procede: %v", err)
		}
	})
	t.Run("un SHA que no coincide se niega", func(t *testing.T) {
		root, _ := repoGit(t)
		v, _ := prepararVueloConCierres(t, root)
		for _, s := range []string{"S1", "S3", "S5"} {
			if _, err := aprobarSesion(root, s, "ok "+s); err != nil {
				t.Fatal(err)
			}
		}
		// La marca de S3 se re-apunta a otro commit después de la aprobación:
		// el aterrizaje debe negarse porque el SHA aprobado ya no coincide.
		gitFixture(t, v.Copia, "commit", "--allow-empty", "-qm", "otro commit")
		nuevo := gitFixture(t, v.Copia, "rev-parse", "HEAD^{commit}")
		if err := escribirMarca(root, Marca{Sesion: "S3", Vuelo: v.ID, Rama: v.Rama, Estado: estadoCierre, Commit: nuevo, Ronda: 1}); err != nil {
			t.Fatal(err)
		}
		_, err := aterrizarVuelo(root, "S1", []string{"S1", "S3", "S5"}, true)
		if err == nil {
			t.Fatal("un SHA aprobado que ya no coincide con la marca debe negar el aterrizaje")
		}
		if !strings.Contains(err.Error(), "commit por commit") {
			t.Fatalf("el rechazo pide revisar commit por commit: %q", err.Error())
		}
	})
}

// aprobarCierres registers the human approval of each Sesión's delivered
// commit, the step the landing now requires (S233).
func aprobarCierres(t *testing.T, root string, sesiones ...string) {
	t.Helper()
	for _, s := range sesiones {
		if _, err := aprobarSesion(root, s, "revisado commit por commit"); err != nil {
			t.Fatalf("aprobar %s: %v", s, err)
		}
	}
}

func TestAterrizajeVuelo(t *testing.T) {
	t.Run("integra la porción aprobada consecutiva", func(t *testing.T) {
		root, _ := repoGit(t)
		v, commits := prepararVueloConCierres(t, root)
		aprobarCierres(t, root, "S1", "S3", "S5")
		a, err := aterrizarVuelo(root, v.ID, []string{"S1", "S3", "S5"}, true)
		if err != nil {
			t.Fatalf("aterrizarVuelo: %v", err)
		}
		if strings.Join(a.Aprobadas, ",") != "S1,S3,S5" || a.Ultima != commits["S5"] {
			t.Fatalf("aterrizaje = %+v", a)
		}
		if head := gitFixture(t, root, "rev-parse", "HEAD^{commit}"); head != commits["S5"] {
			t.Fatalf("la rama integrada quedó en %s, quiere %s", head, commits["S5"])
		}
	})
	t.Run("sólo hasta la última aprobada", func(t *testing.T) {
		root, _ := repoGit(t)
		v, commits := prepararVueloConCierres(t, root)
		aprobarCierres(t, root, "S1", "S3")
		a, err := aterrizarVuelo(root, v.ID, []string{"S1", "S3"}, true)
		if err != nil {
			t.Fatalf("aterrizarVuelo: %v", err)
		}
		if strings.Join(a.Aprobadas, ",") != "S1,S3" || a.Ultima != commits["S3"] {
			t.Fatalf("aterrizaje = %+v", a)
		}
		if _, err := os.Lstat(filepath.Join(root, "s5.txt")); !os.IsNotExist(err) {
			t.Fatalf("lo no aprobado no se integra: %v", err)
		}
		var salida bytes.Buffer
		formatearAterrizaje(&salida, a)
		if !strings.Contains(salida.String(), "no sube") {
			t.Fatalf("el aterrizaje debe recordar que piloto no sube: %q", salida.String())
		}
	})
}

func TestAterrizajeVueloFallaCerrado(t *testing.T) {
	t.Run("sin aprobación explícita", func(t *testing.T) {
		root, _ := repoGit(t)
		v, _ := prepararVueloConCierres(t, root)
		if _, err := aterrizarVuelo(root, v.ID, []string{"S1"}, false); err == nil {
			t.Fatal("sin aprobación explícita no se aterriza")
		}
		if head := gitFixture(t, root, "rev-parse", "HEAD^{commit}"); head == "" {
			t.Fatal(head)
		}
	})
	t.Run("sin ninguna aprobada", func(t *testing.T) {
		root, _ := repoGit(t)
		v, _ := prepararVueloConCierres(t, root)
		if _, err := aterrizarVuelo(root, v.ID, nil, true); err == nil {
			t.Fatal("sin Sesiones aprobadas no hay porción")
		}
	})
	t.Run("porción no consecutiva", func(t *testing.T) {
		root, _ := repoGit(t)
		v, _ := prepararVueloConCierres(t, root)
		if _, err := aterrizarVuelo(root, v.ID, []string{"S1", "S5"}, true); err == nil {
			t.Fatal("saltear S3 no es una porción consecutiva")
		}
	})
	t.Run("Sesión ajena al vuelo", func(t *testing.T) {
		root, _ := repoGit(t)
		v, _ := prepararVueloConCierres(t, root)
		if _, err := aterrizarVuelo(root, v.ID, []string{"S9"}, true); err == nil {
			t.Fatal("una Sesión que no es del vuelo no se aprueba")
		}
	})
	t.Run("Sesión sin cierre en el registro", func(t *testing.T) {
		root, _ := repoGit(t)
		v, _ := vueloConCadena(t, root, []string{"S1", "S3"}, map[string]func(string){
			"S1": func(copia string) { writeTestFile(t, filepath.Join(copia, "s1.txt"), "s1\n", 0o644) },
			"S3": func(copia string) { writeTestFile(t, filepath.Join(copia, "s3.txt"), "s3\n", 0o644) },
		})
		corridaConVuelos(t, root, v)
		if _, err := aterrizarVuelo(root, v.ID, []string{"S1", "S3"}, true); err == nil {
			t.Fatal("una Sesión sin POR REVISAR no se aprueba")
		}
	})
	t.Run("la rama integrada no admite avance rápido", func(t *testing.T) {
		root, _ := repoGit(t)
		v, _ := prepararVueloConCierres(t, root)
		// El tronco se movió por su cuenta: ya no es avance rápido.
		writeTestFile(t, filepath.Join(root, "otro.txt"), "otro\n", 0o644)
		gitFixture(t, root, "add", "otro.txt")
		gitFixture(t, root, "commit", "-qm", "otro avance")
		if _, err := aterrizarVuelo(root, v.ID, []string{"S1", "S3", "S5"}, true); err == nil {
			t.Fatal("sin avance rápido el aterrizaje se niega")
		}
	})
}

func TestAterrizajeVueloUnionEspera(t *testing.T) {
	root, base := repoGit(t)
	vA, commitsA := vueloConCadena(t, root, []string{"A1", "S7"}, map[string]func(string){
		"A1": func(copia string) { writeTestFile(t, filepath.Join(copia, "a1.txt"), "a1\n", 0o644) },
		"S7": func(copia string) { writeTestFile(t, filepath.Join(copia, "s7.txt"), "s7\n", 0o644) },
	})
	vA.Sesiones[1].Union = true
	vA.Sesiones[1].DependeDe = []string{"A1", "B1"}
	ramaB := ramaDeVuelo("2026-10-02", "B1")
	copiaB, _ := rutaCopia(root, "2026-10-02", "B1")
	if err := crearCopia(root, "refs/heads/master", ramaB, copiaB); err != nil {
		t.Fatal(err)
	}
	vB := Vuelo{ID: "B1", Ancla: "B1", Rama: ramaB, Copia: copiaB, Sesiones: []Miembro{{Sesion: "B1"}}}
	corridaConVuelos(t, root, vA, vB)
	for _, s := range []string{"A1", "S7"} {
		if err := escribirMarca(root, Marca{Sesion: s, Vuelo: "A1", Rama: vA.Rama, Estado: estadoCierre, Commit: commitsA[s], Ronda: 1}); err != nil {
			t.Fatal(err)
		}
	}
	aprobarCierres(t, root, "A1", "S7")
	if _, err := aterrizarVuelo(root, "A1", []string{"A1", "S7"}, true); err == nil {
		t.Fatal("una Sesión que une dos vuelos espera la revisión del otro")
	}
	// Revisado el otro vuelo, el aterrizaje procede.
	if err := escribirMarca(root, Marca{Sesion: "B1", Vuelo: "B1", Rama: ramaB, Estado: estadoCierre, Commit: base, Ronda: 1}); err != nil {
		t.Fatal(err)
	}
	aprobarCierres(t, root, "B1")
	if _, err := aterrizarVuelo(root, "A1", []string{"A1", "S7"}, true); err != nil {
		t.Fatalf("con ambos vuelos revisados el aterrizaje procede: %v", err)
	}
}
