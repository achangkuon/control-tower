package main

import (
	"strings"
	"testing"
)

func hallazgosDe(h []Hallazgo, regla string) []Hallazgo {
	var out []Hallazgo
	for _, x := range h {
		if x.Regla == regla {
			out = append(out, x)
		}
	}
	return out
}

func TestMatchRule(t *testing.T) {
	casos := []struct {
		patron, archivo string
		quiere          bool
	}{
		{"hosts/", "hosts/claude.mjs", true},
		{"hosts/", "hosts/pi/adapter.mjs", true},
		{"hosts/", "hostsx/otro.mjs", false},
		{"hosts/**", "hosts/claude.mjs", true},
		{"core.mjs", "core.mjs", true},
		{"core.mjs", "test/core.mjs", false},
		{"test/*.test.mjs", "test/lifecycle.test.mjs", true},
		{"test/*.test.mjs", "test/hosts/claude.test.mjs", false},
	}

	for _, c := range casos {
		if got := matchRule(c.patron, c.archivo); got != c.quiere {
			t.Errorf("matchRule(%q, %q) = %v, quería %v", c.patron, c.archivo, got, c.quiere)
		}
	}
}

// A Zona without paths is a theme, and themes partition nothing. This is the
// check that would have caught "Sustrato mecánico" being treated as a Zona.
func TestZonaSinRutasEsUnTema(t *testing.T) {
	p := &Plan{Zonas: []Zona{{ID: "sustrato", Nombre: "Sustrato mecánico"}}}

	h := hallazgosDe(p.checkZonas(), "zona definida por rutas")
	if len(h) != 1 {
		t.Fatalf("una zona sin rutas debería dar un hallazgo; dio %d", len(h))
	}
	if !strings.Contains(h[0].Detalle, "sustrato") {
		t.Errorf("el hallazgo debería nombrar la zona; fue %q", h[0].Detalle)
	}
}

func TestSesionEnZonaInexistente(t *testing.T) {
	p := &Plan{
		Zonas:    []Zona{{ID: "hosts", Rutas: []string{"hosts/"}}},
		Sesiones: []Sesion{{ID: "S1", Zona: "fantasma", Criterios: []string{"x"}}},
	}

	if len(hallazgosDe(p.checkSesiones(), "sesión")) == 0 {
		t.Error("una Sesión en una zona que no existe debería fallar")
	}
}

func TestSesionAbiertaSinCriteriosFalla(t *testing.T) {
	p := &Plan{
		Zonas:    []Zona{{ID: "hosts", Rutas: []string{"hosts/"}}},
		Sesiones: []Sesion{{ID: "S1", Zona: "hosts"}},
	}

	if len(hallazgosDe(p.checkSesiones(), "criterios binarios")) != 1 {
		t.Error("una Sesión abierta sin criterios de aceptación debería fallar")
	}
}

func TestSesionEntregadaNoNecesitaCriterios(t *testing.T) {
	// Demanding criteria from work that already shipped would block every
	// migration of an existing project on rewriting history.
	p := &Plan{
		Zonas:    []Zona{{ID: "hosts", Rutas: []string{"hosts/"}}},
		Sesiones: []Sesion{{ID: "S1", Zona: "hosts", Entrega: &Entrega{Commit: "abc"}}},
	}

	if len(hallazgosDe(p.checkSesiones(), "criterios binarios")) != 0 {
		t.Error("una Sesión ya entregada no debería exigir criterios")
	}
}

func TestDerivableExigeAutoridadYCriterio(t *testing.T) {
	s := Sesion{ID: "S1", Zona: "hosts", Criterios: []string{"x"}, Decisiones: []Decision{
		{Tipo: "derivable", Pregunta: "¿cómo se llama el índice?", Autoridad: "RFC"},
	}}

	if len(hallazgosDe(checkDecisiones(&s), "decisión derivable")) != 1 {
		t.Error("derivable sin criterio falsificable debería fallar")
	}
}

// The eight classes are closed: authority plus criterion never make them
// derivable, because the cost of being wrong is not paid by the agent.
func TestClaseQueSiempreEscalaNoPuedeSerDerivable(t *testing.T) {
	s := Sesion{ID: "S1", Zona: "hosts", Criterios: []string{"x"}, Decisiones: []Decision{{
		Tipo:      "derivable",
		Pregunta:  "¿borramos la tabla vieja?",
		Autoridad: "el RFC lo cubre",
		Criterio:  "coincide con la convención",
		Clase:     "migracion-o-perdida-de-datos",
	}}}

	if len(hallazgosDe(checkDecisiones(&s), "clases que siempre escalan")) != 1 {
		t.Error("una decisión de una de las ocho clases nunca es derivable")
	}
}

func TestDecisionQueEscalaDebeDecirHastaDondeLlega(t *testing.T) {
	s := Sesion{ID: "S1", Zona: "hosts", Criterios: []string{"x"}, Decisiones: []Decision{
		{Tipo: "escala", Pregunta: "¿?", Clase: "api-publica"},
	}}

	if len(hallazgosDe(checkDecisiones(&s), "decisión que escala")) != 1 {
		t.Error("sin `alcanza` no se puede calcular si la Sesión está bloqueada")
	}
}

func TestCicloEnLasDependencias(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{
		{ID: "S1", Zona: "z", DependeDe: []string{"S2"}},
		{ID: "S2", Zona: "z", DependeDe: []string{"S1"}},
	}}

	if len(hallazgosDe(p.checkGrafo(), "dependencias circulares")) == 0 {
		t.Error("un ciclo debería detectarse: es un plan donde nada puede empezar nunca")
	}
}

func TestDependenciaInexistenteSeReporta(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{{ID: "S1", Zona: "z", DependeDe: []string{"S99"}}}}

	if len(hallazgosDe(p.checkGrafo(), "dependencias")) != 1 {
		t.Error("depender de una Sesión que no existe debería fallar")
	}
}

func TestReservaDeCimientoNoDeclarado(t *testing.T) {
	p := &Plan{
		Cimientos: Cimientos{Rutas: []string{"package.json"}},
		Sesiones:  []Sesion{{ID: "S1", Zona: "z", Cimientos: []string{"hosts/claude.mjs"}}},
	}

	if len(hallazgosDe(p.checkCimientos(), "reserva de cimientos")) != 1 {
		t.Error("reservar algo que no es cimiento significa que la partición no sabe que es compartido")
	}
}

func TestOwnersDetectaSolape(t *testing.T) {
	p := &Plan{Zonas: []Zona{
		{ID: "a", Rutas: []string{"test/"}},
		{ID: "b", Rutas: []string{"test/hosts/"}},
	}}

	if got := p.owners("test/hosts/x.mjs"); len(got) != 2 {
		t.Errorf("un archivo reclamado por dos zonas debe reportar dos dueños; reportó %d", len(got))
	}
}

func TestOwnersDetectaHuerfano(t *testing.T) {
	p := &Plan{Zonas: []Zona{{ID: "a", Rutas: []string{"hosts/"}}}}

	if got := p.owners("delivery/x.mjs"); len(got) != 0 {
		t.Errorf("un archivo sin dueño no debe tener ninguno; reportó %d", len(got))
	}
}
