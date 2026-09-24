package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// planFaltanDeMuestra builds one small, deterministic plan that exercises every
// case `radar faltan` must distinguish: a closed Sesión, one LISTO, one
// PLANIFICADO (pending dependency, never BLOQUEADO), one BLOQUEADO with its
// blocker reused from resumenBloqueo, one priority-deferred Sesión ("espera
// turno"), one explicitly parked Sesión (`diferida: true`, excluded from both
// the percentage and the listing), and one Sesión with no declared priority
// (the "Sin meta declarada" fallback bucket).
func planFaltanDeMuestra(head string) *Plan {
	s1 := conPrioridad(entregada("S1", "cimientos", head), "metodo-v1-radar")
	s1.Resultado = "Primera sesión, ya entregada"

	s2 := conPrioridad(abierta("S2", "cimientos"), "metodo-v1-radar")
	s2.Resultado = "Segunda sesión, lista"

	s3 := conPrioridad(abierta("S3", "cimientos", "S2"), "metodo-v1")
	s3.Resultado = "Tercera sesión, depende de S2"

	s4 := conPrioridad(abierta("S4", "hosts"), "torre-v1")
	s4.Resultado = "Cuarta sesión, espera su turno"

	s5 := conPrioridad(abierta("S5", "hosts"), "torre-v1")
	s5.Decisiones = []Decision{{Tipo: "escala", Alcanza: "criterios", Pregunta: "¿Se aprueba el criterio X?"}}
	s5.Resultado = "Quinta sesión, bloqueada"

	s6 := conPrioridad(abierta("S6", "hosts"), "torre-v2")
	s6.Diferida = true
	s6.Resultado = "Sexta sesión, apartada a mano"

	s7 := abierta("S7", "hosts")
	s7.Resultado = "Séptima sesión, sin meta declarada"

	return &Plan{
		Producto: "Control Tower",
		Prioridades: []Prioridad{
			{ID: "metodo-v1-radar", Nombre: "Método V1 · Radar prioritario"},
			{ID: "metodo-v1", Nombre: "Método V1"},
			{ID: "torre-v1", Nombre: "Torre V1 · Release instalable"},
			{ID: "torre-v2", Nombre: "Torre V2"},
		},
		Sesiones: []Sesion{s1, s2, s3, s4, s5, s6, s7},
	}
}

func TestRenderFaltanCoincideConGoldenYEsDeterminista(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)

	want, err := os.ReadFile(filepath.Join("testdata", "faltan.golden.txt"))
	if err != nil {
		t.Fatal(err)
	}
	first := RenderFaltanAt(p, root, head)
	second := RenderFaltanAt(p, root, head)
	if !bytes.Equal(first, second) {
		t.Fatal("dos renders del mismo dato deben ser idénticos byte por byte")
	}
	if !bytes.Equal(first, want) {
		t.Fatalf("render distinto del golden\n--- want ---\n%s\n--- got ---\n%s", want, first)
	}
}

func TestRenderFaltanExcluyeSoloLasApartadasDelPorcentaje(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)
	got := string(RenderFaltanAt(p, root, head))

	// Método V1: S1 (COMPLETO) + S2 (LISTO) + S3 (PLANIFICADO) = 1/3.
	if !strings.Contains(got, "Método V1: 33% (1/3 S)") {
		t.Fatalf("el porcentaje de Método V1 debe ser 33%% (1/3 S):\n%s", got)
	}
	// Torre V2 sólo tiene S6, que es diferida:true y no cuenta en el denominador.
	if !strings.Contains(got, "Torre V2: — (sin Sesiones enumeradas)") {
		t.Fatalf("Torre V2 no debe contar la Sesión apartada en su porcentaje:\n%s", got)
	}
}

func TestRenderFaltanMuestraEsperaTurnoYElBloqueo(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)
	got := string(RenderFaltanAt(p, root, head))

	if !strings.Contains(got, "S4 — Cuarta sesión, espera su turno (espera turno)") {
		t.Fatalf("una Sesión diferida por prioridad debe mostrarse como 'espera turno':\n%s", got)
	}
	if !strings.Contains(got, "S5 — Quinta sesión, bloqueada (🔴 BLOQUEADO: ¿Se aprueba el criterio X?)") {
		t.Fatalf("una Sesión bloqueada debe mostrar su bloqueo reusando resumenBloqueo:\n%s", got)
	}
	if strings.Contains(got, "S6") {
		t.Fatalf("una Sesión apartada a mano (diferida:true) no aparece en la lista, sólo en el aviso del pie:\n%s", got)
	}
}

func TestRenderFaltanPie(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)
	got := string(RenderFaltanAt(p, root, head))

	// Abiertas y no apartadas: S2, S3, S4, S5, S7 = 5. Listas: S2, S7 = 2.
	if !strings.Contains(got, "Faltan 5 Sesión(es); 2 lista(s) para empezar.") {
		t.Fatalf("el pie debe contar 5 Sesiones restantes y 2 listas:\n%s", got)
	}
	if !strings.Contains(got, "1 Sesión(es) apartada(s) (diferida: true)") {
		t.Fatalf("el pie debe avisar de la Sesión apartada:\n%s", got)
	}
}

// Legacy Sesiones without a declared priority are all closed in the real plan;
// the fallback bucket must stay hidden instead of printing "100% ... Sin
// Sesiones abiertas." noise.
func TestRenderFaltanOcultaSinMetaDeclaradaSinAbiertas(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)
	legacy := entregada("S8", "hosts", head)
	legacy.Resultado = "Octava sesión, legacy cerrada"
	p.Sesiones[6] = legacy
	got := string(RenderFaltanAt(p, root, head))

	if strings.Contains(got, metaSinDeclarar) {
		t.Fatalf("la meta de reserva sólo aparece con una Sesión abierta en ella:\n%s", got)
	}
}

func TestLineaFaltanUnoFormatoConSubprioridad(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)
	got, err := LineaFaltanUno(p, root, head, "S4")
	if err != nil {
		t.Fatal(err)
	}
	want := "S4 (Torre V1 › Release instalable › hosts — Cuarta sesión, espera su turno, espera turno)"
	if got != want {
		t.Fatalf("quería %q, fue %q", want, got)
	}
}

func TestLineaFaltanUnoFormatoSinSubprioridad(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)
	got, err := LineaFaltanUno(p, root, head, "S3")
	if err != nil {
		t.Fatal(err)
	}
	want := "S3 (Método V1 › cimientos — Tercera sesión, depende de S2, 📋 PLANIFICADO)"
	if got != want {
		t.Fatalf("quería %q, fue %q", want, got)
	}
}

func TestLineaFaltanUnoSinMetaDeclarada(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)
	got, err := LineaFaltanUno(p, root, head, "S7")
	if err != nil {
		t.Fatal(err)
	}
	want := "S7 (Sin meta declarada › hosts — Séptima sesión, sin meta declarada, 🟢 LISTO)"
	if got != want {
		t.Fatalf("quería %q, fue %q", want, got)
	}
}

func TestLineaFaltanUnoRechazaIDInexistente(t *testing.T) {
	root, head := repoGit(t)
	p := planFaltanDeMuestra(head)
	if _, err := LineaFaltanUno(p, root, head, "S999"); err == nil {
		t.Fatal("un ID inexistente debe fallar")
	}
}
