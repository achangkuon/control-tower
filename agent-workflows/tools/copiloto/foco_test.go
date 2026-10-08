package main

import (
	"bytes"
	"path/filepath"
	"strings"
	"testing"
)

func TestFocoNuevoArrancaEnNinguno(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)

	f, err := leerFoco(common, "conversacion-nueva")
	if err != nil {
		t.Fatalf("leerFoco: %v", err)
	}
	if f.Conversacion != "conversacion-nueva" {
		t.Fatalf("conversación = %q", f.Conversacion)
	}
	if f.Foco != focoNinguno {
		t.Fatalf("foco de una conversación nueva = %q, quiere %q", f.Foco, focoNinguno)
	}
	if f.PanoramaVisto {
		t.Fatalf("una conversación nueva no puede haber visto el panorama")
	}
}

func TestFocoAislamientoPorConversacion(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)

	if err := escribirFoco(common, focoGuardado{Schema: esquemaFoco, Conversacion: "c1", Foco: "S238", PanoramaVisto: true}); err != nil {
		t.Fatal(err)
	}
	otra, err := leerFoco(common, "c2")
	if err != nil {
		t.Fatal(err)
	}
	if otra.Foco != focoNinguno {
		t.Fatalf("la conversación c2 ve el foco de c1: %q", otra.Foco)
	}
	uno, err := leerFoco(common, "c1")
	if err != nil {
		t.Fatal(err)
	}
	if uno.Foco != "S238" || !uno.PanoramaVisto {
		t.Fatalf("c1 perdió su foco: %+v", uno)
	}
}

func TestQueFocoSeGuardaNoCambiaPorRelectura(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	if err := escribirFoco(common, focoGuardado{Schema: esquemaFoco, Conversacion: "c", Foco: focoIdea}); err != nil {
		t.Fatal(err)
	}
	f, err := leerFoco(common, "c")
	if err != nil {
		t.Fatal(err)
	}
	if f.Schema != esquemaFoco {
		t.Fatalf("schema = %q", f.Schema)
	}
	if f.Foco != focoIdea {
		t.Fatalf("foco = %q", f.Foco)
	}
}

func TestValidarConversacion(t *testing.T) {
	validas := []string{"a", "S238", "conv-1", "a.b_c-9", strings.Repeat("x", 128)}
	for _, v := range validas {
		if err := validarConversacion(v); err != nil {
			t.Fatalf("validarConversacion(%q) = %v, quiere nil", v, err)
		}
	}
	invalidas := []string{"", ".", "..", "a/b", "../x", "a b", "a\tb", strings.Repeat("x", 129), "-x"}
	for _, v := range invalidas {
		if err := validarConversacion(v); err == nil {
			t.Fatalf("validarConversacion(%q) = nil, quiere error", v)
		}
	}
}

func TestSesionDeWorktree(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	if got, err := sesionDeWorktree(common, root); err != nil || got != "" {
		t.Fatalf("sin despachos = %q (%v), quiere vacío", got, err)
	}

	despachos := filepath.Join(common, "chanks", "despachos")
	writeTestFile(t, filepath.Join(despachos, "S1.json"),
		`{"schema":"radar.despacho/v1","sesion":"S1","worktree":`+jsonString(root)+`,"branch":"refs/heads/s1","worker":"w"}`, 0o644)
	otro := t.TempDir()
	writeTestFile(t, filepath.Join(despachos, "S2.json"),
		`{"schema":"radar.despacho/v1","sesion":"S2","worktree":`+jsonString(otro)+`,"branch":"refs/heads/s2","worker":"w"}`, 0o644)

	got, err := sesionDeWorktree(common, root)
	if err != nil {
		t.Fatal(err)
	}
	if got != "S1" {
		t.Fatalf("sesionDeWorktree = %q, quiere S1", got)
	}
}

func TestConversacionResueltaOrden(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	t.Setenv("COPILOTO_CONVERSACION", "")

	if got := conversacionResuelta(common, "explicita"); got != "explicita" {
		t.Fatalf("explícita = %q", got)
	}
	t.Setenv("COPILOTO_CONVERSACION", "de-env")
	if got := conversacionResuelta(common, ""); got != "de-env" {
		t.Fatalf("env = %q", got)
	}
	t.Setenv("COPILOTO_CONVERSACION", "")
	if got := conversacionResuelta(common, ""); got != "principal" {
		t.Fatalf("sin nada = %q, quiere principal", got)
	}
	if err := marcarActiva(common, "puntero"); err != nil {
		t.Fatal(err)
	}
	if got := conversacionResuelta(common, ""); got != "puntero" {
		t.Fatalf("activa = %q, quiere puntero", got)
	}
}

func TestCLIFocoRegistraYLee(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	t.Setenv("COPILOTO_CONVERSACION", "conv-cli")
	fakeRadar(t, map[string]string{"sesion S238": ""})

	correr := func(args ...string) (int, string, string) {
		var salida, errores bytes.Buffer
		codigo := ejecutar(append(args, "-C", root), &salida, &errores)
		return codigo, salida.String(), errores.String()
	}

	if codigo, _, e := correr("foco", "S238"); codigo != 0 {
		t.Fatalf("foco S238 salió %d: %s", codigo, e)
	}
	if f, _ := leerFoco(common, "conv-cli"); f.Foco != "S238" || !f.PanoramaVisto {
		t.Fatalf("no se registró S238: %+v", f)
	}

	if codigo, _, _ := correr("foco", "idea"); codigo != 0 {
		t.Fatalf("foco idea falló")
	}
	if f, _ := leerFoco(common, "conv-cli"); f.Foco != focoIdea {
		t.Fatalf("foco idea = %q", f.Foco)
	}

	if codigo, _, _ := correr("foco", "ninguno"); codigo != 0 {
		t.Fatalf("foco ninguno falló")
	}
	f, _ := leerFoco(common, "conv-cli")
	if f.Foco != focoNinguno || f.PanoramaVisto {
		t.Fatalf("foco ninguno debe reiniciar el panorama: %+v", f)
	}

	codigo, salida, _ := correr("foco")
	if codigo != 0 || !strings.Contains(salida, focoNinguno) {
		t.Fatalf("foco sin argumento = %d %q", codigo, salida)
	}
}

func TestCLIFocoRechazaSesionDesconocida(t *testing.T) {
	root := repoGit(t)
	common := commonDe(t, root)
	t.Setenv("COPILOTO_CONVERSACION", "conv-x")
	fakeRadar(t, map[string]string{})

	var salida, errores bytes.Buffer
	if codigo := ejecutar([]string{"foco", "S999", "-C", root}, &salida, &errores); codigo == 0 {
		t.Fatalf("foco S999 debía fallar")
	}
	f, _ := leerFoco(common, "conv-x")
	if f.Foco != focoNinguno {
		t.Fatalf("se registró una Sesión desconocida: %q", f.Foco)
	}
}

func TestCLIFocoRechazaValorInvalido(t *testing.T) {
	root := repoGit(t)
	t.Setenv("COPILOTO_CONVERSACION", "conv-x")
	fakeRadar(t, map[string]string{})
	for _, malo := range []string{"cualquiera", "S", "idea2"} {
		var salida, errores bytes.Buffer
		if codigo := ejecutar([]string{"foco", malo, "-C", root}, &salida, &errores); codigo == 0 {
			t.Fatalf("foco %q debía fallar", malo)
		}
	}
}

func jsonString(s string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"', '\\':
			b.WriteByte('\\')
			b.WriteRune(r)
		default:
			b.WriteRune(r)
		}
	}
	b.WriteByte('"')
	return b.String()
}
