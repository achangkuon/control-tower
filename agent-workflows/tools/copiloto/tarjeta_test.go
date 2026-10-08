package main

import (
	"bytes"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
)

// snapshotFixture builds the machine projection Radar would emit, so the card
// tests never depend on a running radar.
func snapshotFixture(prendido bool, sesiones ...string) string {
	type sesion struct {
		ID       string   `json:"id"`
		Estado   string   `json:"estado"`
		Archivos []string `json:"archivos,omitempty"`
	}
	salida := struct {
		Schema string `json:"schema"`
		Piloto *struct {
			Prendido bool `json:"prendido"`
		} `json:"piloto,omitempty"`
		Sesiones []sesion `json:"sesiones"`
	}{Schema: "radar.snapshot/v1"}
	if prendido {
		salida.Piloto = &struct {
			Prendido bool `json:"prendido"`
		}{Prendido: true}
	}
	for _, s := range sesiones {
		id, estado, _ := strings.Cut(s, "=")
		archivos := []string{}
		if lista, resto, hay := strings.Cut(estado, "|"); hay {
			estado = lista
			archivos = strings.Split(resto, ",")
		}
		salida.Sesiones = append(salida.Sesiones, sesion{ID: id, Estado: estado, Archivos: archivos})
	}
	data, _ := json.Marshal(salida)
	return string(data)
}

func TestPanoramaDe(t *testing.T) {
	casos := []struct {
		nombre   string
		sesiones []string
		quiere   string
	}{
		{"cuenta listas y en curso", []string{"S237=LISTO", "S238=LISTO", "S231=EN CURSO", "S99=PLANIFICADO"}, "🧭 2 LISTAS · 1 EN CURSO: S231"},
		{"singular de lista", []string{"S237=LISTO"}, "🧭 1 LISTA · 0 EN CURSO"},
		{"sin listas", []string{"S99=PLANIFICADO"}, "🧭 0 LISTAS · 0 EN CURSO"},
		{"varias en curso", []string{"S231=EN CURSO", "S230=EN CURSO"}, "🧭 0 LISTAS · 2 EN CURSO: S230, S231"},
	}
	for _, caso := range casos {
		t.Run(caso.nombre, func(t *testing.T) {
			var snap snapshot
			if err := json.Unmarshal([]byte(snapshotFixture(false, caso.sesiones...)), &snap); err != nil {
				t.Fatal(err)
			}
			if got := panoramaDe(snap); got != caso.quiere {
				t.Fatalf("panoramaDe = %q, quiere %q", got, caso.quiere)
			}
		})
	}
}

func TestEtapa0MuestraPanoramaUnaVez(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	t.Setenv("COPILOTO_CONVERSACION", "c0")
	fakeRadar(t, map[string]string{"status --json": snapshotFixture(false, "S237=LISTO", "S238=LISTO")})

	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"tarjeta", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("primera tarjeta salió %d: %s", codigo, errores.String())
	}
	if !strings.Contains(salida.String(), "🧭 2 LISTAS · 0 EN CURSO") {
		t.Fatalf("primera tarjeta = %q, quiere el panorama", salida.String())
	}
	if f, _ := leerFoco(common, "c0"); !f.PanoramaVisto {
		t.Fatalf("el panorama no quedó marcado como visto")
	}

	salida.Reset()
	errores.Reset()
	if codigo := ejecutar([]string{"tarjeta", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("segunda tarjeta salió %d: %s", codigo, errores.String())
	}
	if salida.String() != "" {
		t.Fatalf("segunda tarjeta = %q, quiere silencio", salida.String())
	}
}

func TestEtapa0SegundaLlamadaNoLeeRadar(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	if err := escribirFoco(common, focoGuardado{Schema: esquemaFoco, Conversacion: "c0", Foco: focoNinguno, PanoramaVisto: true}); err != nil {
		t.Fatal(err)
	}
	t.Setenv("COPILOTO_CONVERSACION", "c0")
	anterior := radarSalida
	t.Cleanup(func() { radarSalida = anterior })
	radarSalida = func(root string, args ...string) ([]byte, error) {
		t.Fatalf("no se debe leer Radar cuando el panorama ya se mostró: %v", args)
		return nil, nil
	}
	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"tarjeta", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("tarjeta salió %d: %s", codigo, errores.String())
	}
	if salida.String() != "" {
		t.Fatalf("tarjeta = %q, quiere silencio", salida.String())
	}
}

func TestPanoramaComando(t *testing.T) {
	root := repoGit(t)
	fakeRadar(t, map[string]string{"status --json": snapshotFixture(false, "S231=EN CURSO")})
	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"panorama", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("panorama salió %d: %s", codigo, errores.String())
	}
	if got := strings.TrimSpace(salida.String()); got != "🧭 0 LISTAS · 1 EN CURSO: S231" {
		t.Fatalf("panorama = %q", got)
	}
}

func lineasDe(out string) []string {
	var lineas []string
	for _, l := range strings.Split(out, "\n") {
		if strings.TrimSpace(l) != "" {
			lineas = append(lineas, l)
		}
	}
	return lineas
}

// tarjetaValida enforces the shape contract: 1 to 3 lines, every one signed 🧭.
func tarjetaValida(t *testing.T, out string) []string {
	t.Helper()
	lineas := lineasDe(out)
	if len(lineas) < 1 || len(lineas) > 3 {
		t.Fatalf("la tarjeta tiene %d líneas, quiere 1 a 3: %q", len(lineas), out)
	}
	for _, l := range lineas {
		if !strings.HasPrefix(l, "🧭") {
			t.Fatalf("línea sin firma 🧭: %q", l)
		}
	}
	return lineas
}

func tarjetaDeSesion(t *testing.T, root, common, sesion, etapa string, prendido bool, estados ...string) string {
	t.Helper()
	if err := escribirFoco(common, focoGuardado{Schema: esquemaFoco, Conversacion: "cf", Foco: sesion, PanoramaVisto: true}); err != nil {
		t.Fatal(err)
	}
	t.Setenv("COPILOTO_CONVERSACION", "cf")
	fakeRadar(t, map[string]string{
		"etapa " + sesion: etapa,
		"status --json":   snapshotFixture(prendido, estados...),
	})
	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"tarjeta", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("tarjeta salió %d: %s", codigo, errores.String())
	}
	return salida.String()
}

func TestTarjetaIdeaCierraAmbiguedades(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	if err := escribirFoco(common, focoGuardado{Schema: esquemaFoco, Conversacion: "ci", Foco: focoIdea, PanoramaVisto: true}); err != nil {
		t.Fatal(err)
	}
	t.Setenv("COPILOTO_CONVERSACION", "ci")
	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"tarjeta", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("tarjeta idea salió %d: %s", codigo, errores.String())
	}
	out := salida.String()
	tarjetaValida(t, out)
	for _, quiere := range []string{"Etapa 1", "Definir", "chanks-1-cierre-de-decisiones"} {
		if !strings.Contains(out, quiere) {
			t.Fatalf("la tarjeta de idea no nombra %q: %q", quiere, out)
		}
	}
}

func TestTarjetaEtapa2Preparar(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	out := tarjetaDeSesion(t, root, common, "S1",
		`{"schema":"radar.etapa/v1","sesion":"S1","etapa":2,"nombre":"Preparar"}`, false,
		"S1=BLOQUEADO|a.go,b.go")
	tarjetaValida(t, out)
	for _, quiere := range []string{"Etapa 2", "Preparar", "chanks-2-planificador-granular", "LISTO"} {
		if !strings.Contains(out, quiere) {
			t.Fatalf("tarjeta etapa 2 sin %q: %q", quiere, out)
		}
	}
}

func TestTarjetaEtapa3SinPiloto(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	out := tarjetaDeSesion(t, root, common, "S1",
		`{"schema":"radar.etapa/v1","sesion":"S1","etapa":3,"nombre":"Despachar"}`, false,
		"S1=LISTO")
	tarjetaValida(t, out)
	for _, quiere := range []string{"Etapa 3", "chanks-3-paralelo"} {
		if !strings.Contains(out, quiere) {
			t.Fatalf("tarjeta etapa 3 sin %q: %q", quiere, out)
		}
	}
	if strings.Contains(out, "¿con piloto automático") {
		t.Fatalf("sin interruptor no debe preguntar por el piloto: %q", out)
	}
}

func TestTarjetaEtapa3ConPilotoPregunta(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	out := tarjetaDeSesion(t, root, common, "S1",
		`{"schema":"radar.etapa/v1","sesion":"S1","etapa":3,"nombre":"Despachar"}`, true,
		"S1=LISTO")
	tarjetaValida(t, out)
	if !strings.Contains(out, "¿con piloto automático o en esta conversación?") {
		t.Fatalf("con interruptor debe preguntar: %q", out)
	}
}

func TestTarjetaEtapa4NoRepiteAGentleAI(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	out := tarjetaDeSesion(t, root, common, "S1",
		`{"schema":"radar.etapa/v1","sesion":"S1","etapa":4,"nombre":"Implementar y revisar"}`, false,
		"S1=EN CURSO|a.go,b.go")
	tarjetaValida(t, out)
	for _, quiere := range []string{"Etapa 4", "chanks-4-puente", "Gentle AI", "a.go", "b.go"} {
		if !strings.Contains(out, quiere) {
			t.Fatalf("tarjeta etapa 4 sin %q: %q", quiere, out)
		}
	}
	for _, prohibido := range []string{"RED", "GREEN", "TDD"} {
		if strings.Contains(out, prohibido) {
			t.Fatalf("la tarjeta de etapa 4 no puede prescribirle pasos a Gentle AI (%q): %q", prohibido, out)
		}
	}
}

func TestTarjetaEtapa5Cierra(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	out := tarjetaDeSesion(t, root, common, "S1",
		`{"schema":"radar.etapa/v1","sesion":"S1","etapa":5,"nombre":"Entregar y cerrar"}`, false,
		"S1=EN CURSO")
	tarjetaValida(t, out)
	for _, quiere := range []string{"Etapa 5", "chanks-5-session-doc", "radar archivar S1"} {
		if !strings.Contains(out, quiere) {
			t.Fatalf("tarjeta etapa 5 sin %q: %q", quiere, out)
		}
	}
}

func TestTarjetaSesionSinEtapaNombraElMotivo(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	if err := escribirFoco(common, focoGuardado{Schema: esquemaFoco, Conversacion: "cx", Foco: "S999", PanoramaVisto: true}); err != nil {
		t.Fatal(err)
	}
	t.Setenv("COPILOTO_CONVERSACION", "cx")
	anterior := radarSalida
	t.Cleanup(func() { radarSalida = anterior })
	radarSalida = func(root string, args ...string) ([]byte, error) {
		if strings.Join(args, " ") == "etapa S999" {
			return nil, errDePrueba(`{"reason":"sesion_desconocida"}`)
		}
		return []byte(snapshotFixture(false)), nil
	}
	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"tarjeta", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("tarjeta salió %d: %s", codigo, errores.String())
	}
	tarjetaValida(t, salida.String())
	if !strings.Contains(salida.String(), "S999") {
		t.Fatalf("la tarjeta debe nombrar la Sesión: %q", salida.String())
	}
}

type errDePrueba string

func (e errDePrueba) Error() string { return string(e) }

func TestTarjetaConConversacionFijaLaActiva(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	t.Setenv("COPILOTO_CONVERSACION", "")
	fakeRadar(t, map[string]string{"status --json": snapshotFixture(false, "S237=LISTO")})

	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"tarjeta", "--conversacion", "conv-hook", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("tarjeta salió %d: %s", codigo, errores.String())
	}
	if got := leerActiva(common); got != "conv-hook" {
		t.Fatalf("activa = %q, quiere conv-hook", got)
	}

	fakeRadar(t, map[string]string{})
	salida.Reset()
	errores.Reset()
	if codigo := ejecutar([]string{"foco", "idea", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("foco sin token debería caer en la conversación activa: %s", errores.String())
	}
	if f, _ := leerFoco(common, "conv-hook"); f.Foco != focoIdea {
		t.Fatalf("el foco no aterrizó en la conversación activa: %+v", f)
	}
}

func TestTarjetaUsaElHechoDeLaCopiaDeTrabajo(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	// The stored focus of this conversation says idea, but this checkout is the
	// work copy of S1: the dispatch marker is a fact and wins without asking.
	if err := escribirFoco(common, focoGuardado{Schema: esquemaFoco, Conversacion: "fact", Foco: focoIdea, PanoramaVisto: true}); err != nil {
		t.Fatal(err)
	}
	t.Setenv("COPILOTO_CONVERSACION", "fact")
	despachos := filepath.Join(common, "chanks", "despachos")
	writeTestFile(t, filepath.Join(despachos, "S1.json"),
		`{"schema":"radar.despacho/v1","sesion":"S1","worktree":`+jsonString(root)+`,"branch":"refs/heads/s1","worker":"w"}`, 0o644)
	fakeRadar(t, map[string]string{
		"etapa S1":      `{"schema":"radar.etapa/v1","sesion":"S1","etapa":3,"nombre":"Despachar"}`,
		"status --json": snapshotFixture(false, "S1=LISTO"),
	})
	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"tarjeta", "-C", root}, &salida, &errores); codigo != 0 {
		t.Fatalf("tarjeta salió %d: %s", codigo, errores.String())
	}
	out := salida.String()
	tarjetaValida(t, out)
	if !strings.Contains(out, "S1 · Etapa 3") || strings.Contains(out, "Etapa 1") {
		t.Fatalf("el hecho de la copia de trabajo no fijó el foco: %q", out)
	}
}
