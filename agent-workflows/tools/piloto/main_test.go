package main

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// gitFixture runs repository-local Git setup without relying on the host's default branch.
func gitFixture(t *testing.T, root string, args ...string) string {
	t.Helper()
	out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
	return strings.TrimSpace(string(out))
}

// repoGit builds a throwaway repository with a 644 tracked file and a 755 tracked
// executable, so work-copy mode checks have real Git evidence to compare.
func repoGit(t *testing.T) (string, string) {
	t.Helper()
	root := t.TempDir()
	gitFixture(t, root, "init", "-q")
	gitFixture(t, root, "symbolic-ref", "HEAD", "refs/heads/master")
	gitFixture(t, root, "config", "user.email", "piloto@example.test")
	gitFixture(t, root, "config", "user.name", "Piloto Test")
	writeTestFile(t, filepath.Join(root, "tracked.txt"), "base\n", 0o644)
	writeTestFile(t, filepath.Join(root, "bin", "ejecutable.sh"), "#!/bin/sh\necho ok\n", 0o755)
	gitFixture(t, root, "add", "tracked.txt", "bin/ejecutable.sh")
	gitFixture(t, root, "commit", "-qm", "base")
	return root, gitFixture(t, root, "rev-parse", "--verify", "HEAD^{commit}")
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

func realDe(t *testing.T, path string) string {
	t.Helper()
	resuelto, err := filepath.EvalSymlinks(path)
	if err != nil {
		t.Fatal(err)
	}
	return resuelto
}

func TestResolverRadar(t *testing.T) {
	t.Run("PATH fuera del checkout", func(t *testing.T) {
		root, _ := repoGit(t)
		bin := t.TempDir()
		radar := filepath.Join(bin, "radar")
		writeTestFile(t, radar, "#!/bin/sh\nexit 0\n", 0o755)
		t.Setenv("PATH", bin)
		t.Setenv("RADAR_BIN", "")
		t.Setenv("HOME", t.TempDir())
		got, err := resolverRadar(root)
		if err != nil || got != realDe(t, radar) {
			t.Fatalf("resolverRadar = %q (%v), quiere %q", got, err, radar)
		}
	})
	t.Run("RADAR_BIN dentro del checkout se descarta", func(t *testing.T) {
		root, _ := repoGit(t)
		plantado := filepath.Join(root, "radar")
		writeTestFile(t, plantado, "#!/bin/sh\nexit 0\n", 0o755)
		t.Setenv("PATH", t.TempDir())
		t.Setenv("RADAR_BIN", plantado)
		t.Setenv("HOME", t.TempDir())
		if got, err := resolverRadar(root); err == nil {
			t.Fatalf("un radar dentro del checkout no es confiable: %q", got)
		}
	})
	t.Run("ubicación instalada", func(t *testing.T) {
		root, _ := repoGit(t)
		home := t.TempDir()
		radar := filepath.Join(home, ".local", "bin", "radar")
		writeTestFile(t, radar, "#!/bin/sh\nexit 0\n", 0o755)
		t.Setenv("PATH", t.TempDir())
		t.Setenv("RADAR_BIN", "")
		t.Setenv("HOME", home)
		got, err := resolverRadar(root)
		if err != nil || got != realDe(t, radar) {
			t.Fatalf("resolverRadar = %q (%v)", got, err)
		}
	})
	t.Run("sin candidatos", func(t *testing.T) {
		root, _ := repoGit(t)
		t.Setenv("PATH", t.TempDir())
		t.Setenv("RADAR_BIN", "")
		t.Setenv("HOME", t.TempDir())
		if got, err := resolverRadar(root); err == nil {
			t.Fatalf("sin radar hay que fallar cerrado, salió %q", got)
		}
	})
}

func TestExtraerRaiz(t *testing.T) {
	for _, tc := range []struct {
		nombre string
		args   []string
		resto  string
		raiz   string
		falla  bool
	}{
		{"al final", []string{"ronda", "S1", "-C", "/tmp/x"}, "ronda,S1", "/tmp/x", false},
		{"al principio", []string{"-C", "/tmp/x", "informe"}, "informe", "/tmp/x", false},
		{"ausente", []string{"informe"}, "informe", "", false},
		{"sin valor", []string{"informe", "-C"}, "", "", true},
	} {
		t.Run(tc.nombre, func(t *testing.T) {
			resto, raiz, err := extraerRaiz(tc.args)
			if tc.falla {
				if err == nil {
					t.Fatalf("-C sin valor debe fallar")
				}
				return
			}
			if err != nil || strings.Join(resto, ",") != tc.resto || raiz != tc.raiz {
				t.Fatalf("extraerRaiz = %v %q (%v)", resto, raiz, err)
			}
		})
	}
}

func TestEjecutarComandoDesconocido(t *testing.T) {
	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"volando"}, &salida, &errores, strings.NewReader("")); codigo != 2 {
		t.Fatalf("código = %d", codigo)
	}
	if !strings.Contains(errores.String(), "comando desconocido") {
		t.Fatalf("stderr = %q", errores.String())
	}
	if codigo := ejecutar(nil, &salida, &errores, strings.NewReader("")); codigo != 2 {
		t.Fatalf("sin argumentos el código es 2, salió %d", codigo)
	}
	if codigo := ejecutar([]string{"help"}, &salida, &errores, strings.NewReader("")); codigo != 0 {
		t.Fatalf("help devuelve 0, salió %d", codigo)
	}
	if !strings.Contains(salida.String(), "piloto") {
		t.Fatalf("el uso debe nombrar la herramienta: %q", salida.String())
	}
}

func snapshotPrueba() string {
	return `{
	  "schema":"radar.snapshot/v1",
	  "head":"` + strings.Repeat("a", 40) + `",
	  "asientos":["z1","z2"],
	  "compatibilidad":[{"a":"S1","b":"S2","clase":"compatible","motivo":"sin cruces"}],
	  "sesiones":[
	    {"id":"S1","zona":"z1","estado":"LISTO"},
	    {"id":"S2","zona":"z2","estado":"LISTO"},
	    {"id":"S3","zona":"z1","estado":"PLANIFICADO","depende_de":["S1"]}
	  ]
	}`
}

// prepararNoop avoids touching the network or CodeGraph inside tests.
func prepararNoop(ruta string) error { return nil }

func conRelojFijo(t *testing.T, root string) {
	t.Helper()
	previo := ahora
	ahora = func() time.Time { return time.Date(2026, 10, 2, 22, 0, 0, 0, time.UTC) }
	t.Cleanup(func() { ahora = previo })
	previoPrep := prepararCopia
	prepararCopia = prepararNoop
	t.Cleanup(func() { prepararCopia = previoPrep })
	if err := registrarSonda(root); err != nil {
		t.Fatalf("registrarSonda: %v", err)
	}
	previoRadar := radarStatus
	radarStatus = func(bin, root string) ([]byte, error) { return []byte(snapshotPrueba()), nil }
	t.Cleanup(func() { radarStatus = previoRadar })
}

func TestDespegar(t *testing.T) {
	t.Run("aprueba cada vuelo por stdin", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		var salida bytes.Buffer
		if err := cmdDespegar(&salida, strings.NewReader("s\nn\n"), root, nil, 3, 10, false); err != nil {
			t.Fatalf("cmdDespegar: %v\n%s", err, salida.String())
		}
		c, err := leerCorrida(root)
		if err != nil || c == nil || c.Fecha != "2026-10-02" || len(c.Vuelos) != 1 {
			t.Fatalf("corrida = %+v (%v)", c, err)
		}
		i, err := leerInterruptor(root)
		if err != nil || i == nil || !i.Prendido || i.Rondas != 3 || i.Tope != 10 {
			t.Fatalf("interruptor = %+v (%v)", i, err)
		}
		for _, v := range c.Vuelos {
			if _, err := gitOutput(root, "show-ref", "--verify", v.Rama); err != nil {
				t.Fatalf("rama %s ausente: %v", v.Rama, err)
			}
			if info, err := os.Lstat(v.Copia); err != nil || !info.IsDir() {
				t.Fatalf("copia %s ausente: %v", v.Copia, err)
			}
		}
		texto := salida.String()
		for _, esperado := range []string{"vuelos", "rondas", "tope", "consentimiento"} {
			if !strings.Contains(strings.ToLower(texto), esperado) {
				t.Fatalf("el resumen de despegue debe incluir %q:\n%s", esperado, texto)
			}
		}
	})
	t.Run("sin aprobación no despega", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		var salida bytes.Buffer
		if err := cmdDespegar(&salida, strings.NewReader(""), root, nil, 3, 10, false); err == nil {
			t.Fatal("sin aprobación el despegue se niega")
		}
		if c, err := leerCorrida(root); err != nil || c != nil {
			t.Fatalf("un rechazo no escribe corrida: %+v (%v)", c, err)
		}
		if i, err := leerInterruptor(root); err != nil || i != nil {
			t.Fatalf("un rechazo no prende el interruptor: %+v (%v)", i, err)
		}
	})
	t.Run("aprobación explícita de un subconjunto", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		var salida bytes.Buffer
		if err := cmdDespegar(&salida, strings.NewReader(""), root, []string{"S2"}, 1, 5, true); err != nil {
			t.Fatalf("cmdDespegar: %v", err)
		}
		c, _ := leerCorrida(root)
		if c == nil || len(c.Vuelos) != 1 || c.Vuelos[0].ID != "S2" {
			t.Fatalf("corrida = %+v", c)
		}
		if _, err := gitOutput(root, "show-ref", "--verify", ramaDeVuelo("2026-10-02", "S1")); err == nil {
			t.Fatal("un vuelo no aprobado no crea rama")
		}
	})
	t.Run("vuelo aprobado desconocido", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		var salida bytes.Buffer
		if err := cmdDespegar(&salida, strings.NewReader(""), root, []string{"S9"}, 3, 10, true); err == nil {
			t.Fatal("aprobar un vuelo que no existe debe fallar")
		}
	})
	t.Run("no despega con una corrida prendida", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		if err := escribirInterruptor(root, Interruptor{Prendido: true, Rondas: 3, Tope: 10}); err != nil {
			t.Fatal(err)
		}
		var salida bytes.Buffer
		if err := cmdDespegar(&salida, strings.NewReader("s\n"), root, []string{"S1"}, 3, 10, true); err == nil {
			t.Fatal("con el piloto prendido no se despega otra corrida")
		}
	})
	t.Run("sin la sonda de consentimiento RDD no despega", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		quitarSonda(t, root)
		var salida bytes.Buffer
		err := cmdDespegar(&salida, strings.NewReader(""), root, []string{"S1"}, 3, 10, true)
		if err == nil {
			t.Fatal("sin la sonda el despegue debe negarse")
		}
		if !strings.Contains(err.Error(), "consentimiento") || !strings.Contains(err.Error(), "sonda --confirmar") {
			t.Fatalf("el rechazo nombra la pregunta y el comando: %q", err.Error())
		}
		if _, err := gitOutput(root, "show-ref", "--verify", ramaDeVuelo("2026-10-02", "S1")); err == nil {
			t.Fatal("un rechazo no debe crear la rama del vuelo")
		}
		if c, _ := leerCorrida(root); c != nil {
			t.Fatal("un rechazo no escribe corrida")
		}
		if i, _ := leerInterruptor(root); i != nil {
			t.Fatal("un rechazo no prende el interruptor")
		}
	})
	t.Run("despega un solo vuelo por corrida en V2", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		var salida bytes.Buffer
		err := cmdDespegar(&salida, strings.NewReader(""), root, []string{"S1", "S2"}, 3, 10, true)
		if err == nil {
			t.Fatal("aprobar dos vuelos debe negarse en V2")
		}
		if !strings.Contains(err.Error(), "V2") || !strings.Contains(err.Error(), "V3") {
			t.Fatalf("el rechazo nombra el contrato V2 y el paralelo V3: %q", err.Error())
		}
		if _, err := gitOutput(root, "show-ref", "--verify", ramaDeVuelo("2026-10-02", "S1")); err == nil {
			t.Fatal("un rechazo no debe crear la rama del primer vuelo")
		}
		if _, err := gitOutput(root, "show-ref", "--verify", ramaDeVuelo("2026-10-02", "S2")); err == nil {
			t.Fatal("un rechazo no debe crear la rama del segundo vuelo")
		}
		if c, err := leerCorrida(root); err != nil || c != nil {
			t.Fatalf("un rechazo no escribe corrida: %+v (%v)", c, err)
		}
		if i, err := leerInterruptor(root); err != nil || i != nil {
			t.Fatalf("un rechazo no prende el interruptor: %+v (%v)", i, err)
		}
	})
	t.Run("un despegue que falla no deja copias ni ramas", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		// V2 vuela uno por corrida: el único vuelo choca con una copia preexistente.
		ocupada, err := rutaCopia(root, "2026-10-02", "S1")
		if err != nil {
			t.Fatal(err)
		}
		if err := os.MkdirAll(ocupada, 0o755); err != nil {
			t.Fatal(err)
		}
		var salida bytes.Buffer
		if err := cmdDespegar(&salida, strings.NewReader(""), root, []string{"S1"}, 3, 10, true); err == nil {
			t.Fatal("el despegue debe fallar si el vuelo no puede crear su copia")
		}
		if _, err := gitOutput(root, "show-ref", "--verify", ramaDeVuelo("2026-10-02", "S1")); err == nil {
			t.Fatal("un despegue fallido no debe dejar la rama del vuelo")
		}
		if c, err := leerCorrida(root); err != nil || c != nil {
			t.Fatalf("un despegue fallido no escribe corrida: %+v (%v)", c, err)
		}
		if i, err := leerInterruptor(root); err != nil || i != nil {
			t.Fatalf("un despegue fallido no prende el interruptor: %+v (%v)", i, err)
		}
	})
	t.Run("un fallo al escribir la corrida no deja copias ni ramas", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		common, err := commonDir(root)
		if err != nil {
			t.Fatal(err)
		}
		// Las marcas se leen pero no se pueden escribir: el despegue completa
		// las copias y falla recién al escribir la corrida.
		dir, err := dirPiloto(common, true)
		if err != nil {
			t.Fatal(err)
		}
		if err := os.Chmod(dir, 0o500); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = os.Chmod(dir, 0o700) })
		var salida bytes.Buffer
		if err := cmdDespegar(&salida, strings.NewReader("s\n"), root, []string{"S1"}, 3, 10, true); err == nil {
			t.Fatal("el despegue debe fallar si la corrida no se puede escribir")
		}
		if _, err := gitOutput(root, "show-ref", "--verify", ramaDeVuelo("2026-10-02", "S1")); err == nil {
			t.Fatal("un despegue que falla después de crear las copias no debe dejar la rama")
		}
		copia, _ := rutaCopia(root, "2026-10-02", "S1")
		if _, err := os.Lstat(copia); !os.IsNotExist(err) {
			t.Fatalf("un despegue que falla después de crear las copias no debe dejar la copia: %v", err)
		}
		if i, err := leerInterruptor(root); err != nil || i != nil {
			t.Fatalf("un despegue que falla no debe dejar el interruptor prendido: %+v (%v)", i, err)
		}
	})
}

func TestInterruptorCLI(t *testing.T) {
	root, _ := repoGit(t)
	var salida bytes.Buffer
	if err := cmdInterruptor(&salida, root, "estado", 0, 0); err != nil {
		t.Fatalf("estado: %v", err)
	}
	if !strings.Contains(salida.String(), "apagado") {
		t.Fatalf("estado inicial = %q", salida.String())
	}
	if err := cmdInterruptor(&salida, root, "on", 2, 5); err != nil {
		t.Fatalf("on: %v", err)
	}
	i, err := leerInterruptor(root)
	if err != nil || !i.Prendido || i.Rondas != 2 || i.Tope != 5 {
		t.Fatalf("interruptor = %+v (%v)", i, err)
	}
	if err := cmdInterruptor(&salida, root, "off", 0, 0); err != nil {
		t.Fatalf("off: %v", err)
	}
	i, _ = leerInterruptor(root)
	if i.Prendido || i.Rondas != 2 || i.Tope != 5 {
		t.Fatalf("apagar conserva los límites: %+v", i)
	}
	if err := cmdInterruptor(&salida, root, "on", 9, 5); err == nil {
		t.Fatal("rondas fuera de rango deben rechazarse")
	}
	if err := cmdInterruptor(&salida, root, "volar", 0, 0); err == nil {
		t.Fatal("una acción desconocida debe rechazarse")
	}
}

func TestMarcarCLI(t *testing.T) {
	root, _ := repoGit(t)
	conRelojFijo(t, root)
	corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}, Miembro{Sesion: "S3", DependeDe: []string{"S1"}}))
	if err := escribirInterruptor(root, Interruptor{Prendido: true, Rondas: 3, Tope: 10}); err != nil {
		t.Fatal(err)
	}
	var salida bytes.Buffer
	if err := cmdMarcar(&salida, root, "S1", estadoEnCurso, "", "", 0); err != nil {
		t.Fatalf("marcar en-curso: %v", err)
	}
	if err := cmdMarcar(&salida, root, "S3", estadoEnCurso, "", "", 0); err == nil {
		t.Fatal("S3 no arranca con S1 sin cerrar")
	}
	gitFixture(t, root, "commit", "--allow-empty", "-qm", "entrega")
	entrega := gitFixture(t, root, "rev-parse", "HEAD^{commit}")
	gitFixture(t, root, "branch", ramaDeVuelo("2026-10-02", "S1"), entrega)
	if err := cmdMarcar(&salida, root, "S1", estadoCierre, entrega, "", 1); err != nil {
		t.Fatalf("marcar cierre: %v", err)
	}
	if err := cmdMarcar(&salida, root, "S1", "inventado", "", "", 0); err == nil {
		t.Fatal("un estado inventado debe rechazarse")
	}
}

func TestInformeYFrenoCLI(t *testing.T) {
	root, _ := repoGit(t)
	conSonda(t, root)
	corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}))
	if err := escribirInterruptor(root, Interruptor{Prendido: true, Rondas: 3, Tope: 10}); err != nil {
		t.Fatal(err)
	}
	if _, err := marcarEnCurso(root, &Interruptor{Prendido: true, Rondas: 3, Tope: 10}, "S1"); err != nil {
		t.Fatal(err)
	}
	var salida bytes.Buffer
	if err := cmdFreno(&salida, root); err != nil {
		t.Fatalf("freno: %v", err)
	}
	if !strings.Contains(salida.String(), "interrumpida") {
		t.Fatalf("el freno informa lo interrumpido: %q", salida.String())
	}
	if err := cmdInforme(&salida, root); err != nil {
		t.Fatalf("informe: %v", err)
	}
	texto := salida.String()
	if !strings.Contains(texto, "NOVEDAD") || !strings.Contains(texto, "Aterrizaje") {
		t.Fatalf("informe = %q", texto)
	}
}

// TestEmojiContratoSalidas pins the S234 emoji contract: 🚀 takeoff confirmed,
// 🛫 per flight, 🛬 flight landed, ✅ last approved Session, 🧹 flight withdrawn,
// 🧭 corrida report. Rejections keep ✗ and the landing keeps "no sube".
func TestEmojiContratoSalidas(t *testing.T) {
	t.Run("despegue confirmado con 🚀", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		var salida bytes.Buffer
		if err := cmdDespegar(&salida, strings.NewReader(""), root, []string{"S1"}, 3, 10, true); err != nil {
			t.Fatalf("cmdDespegar: %v\n%s", err, salida.String())
		}
		if !strings.Contains(salida.String(), "🚀 Despegue confirmado") {
			t.Fatalf("el despegue confirmado usa 🚀: %q", salida.String())
		}
		if strings.Contains(salida.String(), "🛫 Despegue") {
			t.Fatalf("el despegue confirmado ya no usa 🛫: %q", salida.String())
		}
	})
	t.Run("informe de la corrida con 🧭 y vuelos con 🛫", func(t *testing.T) {
		root, _ := repoGit(t)
		conSonda(t, root)
		corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}))
		if err := escribirInterruptor(root, Interruptor{Prendido: true, Rondas: 3, Tope: 10}); err != nil {
			t.Fatal(err)
		}
		if _, err := marcarEnCurso(root, &Interruptor{Prendido: true, Rondas: 3, Tope: 10}, "S1"); err != nil {
			t.Fatal(err)
		}
		var salida bytes.Buffer
		if err := cmdInforme(&salida, root); err != nil {
			t.Fatalf("cmdInforme: %v", err)
		}
		texto := salida.String()
		if !strings.Contains(texto, "🧭 Informe de la corrida") {
			t.Fatalf("el informe abre con 🧭 Informe de la corrida: %q", texto)
		}
		if !strings.Contains(texto, "🛫 Vuelo S1") {
			t.Fatalf("cada vuelo del informe se marca con 🛫: %q", texto)
		}
	})
	t.Run("aterrizaje con 🛬 aterrizó y ✅ última aprobada", func(t *testing.T) {
		var salida bytes.Buffer
		a := &Aterrizaje{Vuelo: "S1", Aprobadas: []string{"S1"}, Ultima: strings.Repeat("a", 40)}
		formatearAterrizaje(&salida, a)
		texto := salida.String()
		if !strings.Contains(texto, "🛬 Vuelo S1 aterrizó") {
			t.Fatalf("el aterrizaje informa 🛬 ... aterrizó: %q", texto)
		}
		if !strings.Contains(texto, "✅ Última Sesión aprobada") {
			t.Fatalf("la última Sesión aprobada se marca con ✅: %q", texto)
		}
		if !strings.Contains(texto, "no sube") {
			t.Fatalf("el aterrizaje debe recordar que piloto no sube: %q", texto)
		}
	})
	t.Run("retiro con 🧹", func(t *testing.T) {
		root, _ := repoGit(t)
		rama := ramaDeVuelo("2026-10-02", "S1")
		ruta, err := rutaCopia(root, "2026-10-02", "S1")
		if err != nil {
			t.Fatal(err)
		}
		if err := crearCopia(root, "refs/heads/master", rama, ruta); err != nil {
			t.Fatal(err)
		}
		writeTestFile(t, filepath.Join(ruta, "entrega.txt"), "entrega S1\n", 0o644)
		gitFixture(t, ruta, "add", "entrega.txt")
		gitFixture(t, ruta, "commit", "-qm", "entrega S1")
		entrega := gitFixture(t, ruta, "rev-parse", "HEAD^{commit}")
		corridaConVuelos(t, root, Vuelo{ID: "S1", Ancla: "S1", Rama: rama, Copia: ruta, Sesiones: []Miembro{{Sesion: "S1"}}})
		if err := escribirMarca(root, Marca{Sesion: "S1", Vuelo: "S1", Rama: rama, Estado: estadoCierre, Commit: entrega, Ronda: 1}); err != nil {
			t.Fatal(err)
		}
		gitFixture(t, root, "merge", "--ff-only", rama)
		var salida bytes.Buffer
		if err := cmdRetirar(&salida, root, "S1"); err != nil {
			t.Fatalf("cmdRetirar: %v", err)
		}
		if !strings.Contains(salida.String(), "🧹 vuelo S1 retirado") {
			t.Fatalf("el retiro usa 🧹: %q", salida.String())
		}
	})
}

func TestAprobarCLI(t *testing.T) {
	root, _ := repoGit(t)
	v, _ := prepararVueloConCierres(t, root)
	var salida bytes.Buffer
	if err := cmdAprobar(&salida, root, "S1", "revisado commit por commit"); err != nil {
		t.Fatalf("cmdAprobar: %v", err)
	}
	if !strings.Contains(salida.String(), "S1 aprobada") || !strings.Contains(salida.String(), v.ID) {
		t.Fatalf("salida = %q", salida.String())
	}
	if err := cmdAprobar(&salida, root, "S9", "ok"); err == nil {
		t.Fatal("aprobar una Sesión sin entrega cerrada debe fallar")
	}
}

func TestRondaCLI(t *testing.T) {
	root, _ := repoGit(t)
	corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}, Miembro{Sesion: "S3", DependeDe: []string{"S1"}}))
	if err := escribirInterruptor(root, Interruptor{Prendido: true, Rondas: 3, Tope: 10}); err != nil {
		t.Fatal(err)
	}
	var salida bytes.Buffer
	if err := cmdRonda(&salida, root, "S1"); err != nil {
		t.Fatalf("ronda: %v", err)
	}
	if !strings.Contains(salida.String(), "S1") || !strings.Contains(salida.String(), "piso 1") {
		t.Fatalf("ronda = %q", salida.String())
	}
	if err := cmdRonda(&salida, root, "S9"); err == nil {
		t.Fatal("un vuelo desconocido debe fallar")
	}
}
