package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRenderCoincideConGoldenYEsDeterminista(t *testing.T) {
	p, err := Load(filepath.Join("testdata", "plan.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	want, err := os.ReadFile(filepath.Join("testdata", "ROADMAP.golden.md"))
	if err != nil {
		t.Fatal(err)
	}
	first := Render(p, "")
	second := Render(p, "")
	if !bytes.Equal(first, second) {
		t.Fatal("dos renders del mismo dato deben ser idénticos byte por byte")
	}
	if !bytes.Equal(first, want) {
		t.Fatalf("render distinto del golden\n--- want ---\n%s\n--- got ---\n%s", want, first)
	}
	if !bytes.HasPrefix(first, []byte(avisoGenerado)) {
		t.Fatal("la vista debe empezar con el aviso de no editar")
	}
}

func TestRenderMuestraMotivosJuntoALasSesionesNoListas(t *testing.T) {
	root, head := repoGit(t)
	p := &Plan{Zonas: []Zona{{ID: "z", Nombre: "Z"}}, Sesiones: []Sesion{
		abierta("R", "z"), abierta("N", "z", "R"),
	}}
	got := string(RenderAt(p, root, head))
	if !strings.Contains(got, "**N** · 📋 PLANIFICADO · espera-natural (R)") {
		t.Fatalf("missing adjacent reason in queue: %s", got)
	}
	if strings.Contains(got, "**R** · 🟢 LISTO · espera-") {
		t.Fatalf("ready session must not have reason: %s", got)
	}
}

func TestRenderMuestraLaPrioridadActivaYLaDeCadaSesion(t *testing.T) {
	root, commit := repoGit(t)
	got := string(RenderAt(planPriorizadoValido(commit), root, commit))
	for _, want := range []string{"- Prioridad activa: A.", "· prioridad A", "· prioridad B"} {
		if !bytes.Contains([]byte(got), []byte(want)) {
			t.Fatalf("la vista debe incluir %q:\n%s", want, got)
		}
	}
}

func TestRenderPresentaLaCapacidadComoVeredictoDeParalelo(t *testing.T) {
	root, commit := repoGit(t)
	got := RenderAt(planPriorizadoValido(commit), root, commit)
	for _, want := range []string{"pueden trabajar en paralelo sin compartir Zona, Cimientos ni Recurso", "Radar no reserva el asiento"} {
		if !bytes.Contains(got, []byte(want)) {
			t.Fatalf("la vista debe decir %q:\n%s", want, got)
		}
	}
	if bytes.Contains(got, []byte("Este valor es un pronóstico estático")) {
		t.Fatalf("la vista no debe presentar la capacidad como un pronóstico dudoso:\n%s", got)
	}
}

// A Sesión BLOQUEADO only by its own incomplete Encargo must say so, instead
// of falling through to the generic "contaminación semántica declarada por
// otra Sesión" text that blames another Sesión for something it never
// declared (see state.go:185, encargo.go:29).
func TestResumenBloqueoDiceEncargoIncompleto(t *testing.T) {
	s := &Sesion{ID: "S149", Encargo: &Encargo{Incompleto: true, PedidoContexto: "x"}}

	got := resumenBloqueo(s, false)
	want := "Encargo incompleto: falta planificar"
	if got != want {
		t.Fatalf("quería %q, fue %q", want, got)
	}
}

// Entrega inválida keeps deciding first, exactly as before.
func TestResumenBloqueoEntregaSigueGanandoSobreEncargoIncompleto(t *testing.T) {
	s := &Sesion{ID: "S1", Encargo: &Encargo{Incompleto: true, PedidoContexto: "x"}, Entrega: &Entrega{Commit: "deadbeef"}}

	got := resumenBloqueo(s, false)
	want := "evidencia de entrega inválida o no integrada"
	if got != want {
		t.Fatalf("quería %q, fue %q", want, got)
	}
}

// A Sesión's own escalating decision keeps winning over its incomplete
// Encargo — existing behavior for Sesiones that already had one.
func TestResumenBloqueoDecisionPropiaSigueGanandoSobreEncargoIncompleto(t *testing.T) {
	s := &Sesion{
		ID:      "S1",
		Encargo: &Encargo{Incompleto: true, PedidoContexto: "x"},
		Decisiones: []Decision{
			{Tipo: "escala", Alcanza: "criterios", Pregunta: "¿Se aprueba el criterio X?"},
		},
	}

	got := resumenBloqueo(s, false)
	want := "¿Se aprueba el criterio X?"
	if got != want {
		t.Fatalf("quería %q, fue %q", want, got)
	}
}

func TestAtomicWriteConvergeSinArchivosTemporales(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "openspec", "ROADMAP.md")
	data := []byte("contenido estable\n")
	if err := atomicWrite(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := atomicWrite(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, data) {
		t.Fatalf("escritura no convergente: %q", got)
	}
	entries, err := os.ReadDir(filepath.Dir(path))
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name() != "ROADMAP.md" {
		t.Fatalf("la escritura atómica dejó residuos: %#v", entries)
	}
}
