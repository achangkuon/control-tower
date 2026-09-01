package main

import (
	"strings"
	"testing"
)

// entregada builds a Sesión that shipped: closure is evidence, not an assertion.
func entregada(id, zona string, deps ...string) Sesion {
	return Sesion{ID: id, Zona: zona, DependeDe: deps, Entrega: &Entrega{Commit: "abc123"}}
}

func abierta(id, zona string, deps ...string) Sesion {
	return Sesion{ID: id, Zona: zona, DependeDe: deps, Criterios: []string{"algo verificable"}}
}

func TestEstadoListoSoloConDependenciasCerradas(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{
		entregada("S1", "hosts"),
		abierta("S2", "hosts", "S1"),
		abierta("S3", "hosts", "S2"),
	}}

	e := p.Estados()
	if e["S1"] != Completo {
		t.Errorf("S1 con entrega debería ser %s, fue %s", Completo, e["S1"])
	}
	if e["S2"] != Listo {
		t.Errorf("S2 con su única dependencia cerrada debería ser %s, fue %s", Listo, e["S2"])
	}
	if e["S3"] != Planificado {
		t.Errorf("S3 depende de S2 que sigue abierta: debería ser %s, fue %s", Planificado, e["S3"])
	}
}

// The distinction §14 exists for: an escalating decision does not block by
// itself. Getting this wrong is what turned a fresh plan into a wall of red.
func TestEscalarNoEsBloquear(t *testing.T) {
	casos := []struct {
		nombre  string
		alcanza string
		quiere  string
	}{
		{"alcanza los criterios", "criterios", Bloqueado},
		{"alcanza el primer Módulo", "primer-modulo", Bloqueado},
		{"alcanza un Módulo posterior", "M3", Listo},
	}

	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			s := abierta("S1", "hosts")
			s.Decisiones = []Decision{{
				Tipo:     "escala",
				Pregunta: "¿se borra o se marca?",
				Clase:    "migracion-o-perdida-de-datos",
				Alcanza:  c.alcanza,
			}}
			p := &Plan{Sesiones: []Sesion{s}}

			if got := p.Estados()["S1"]; got != c.quiere {
				t.Errorf("con una decisión que %s, S1 debería ser %s, fue %s", c.nombre, c.quiere, got)
			}
		})
	}
}

func TestContaminacionSemanticaBloqueaAOtraSesion(t *testing.T) {
	s1 := abierta("S1", "hosts")
	s1.Decisiones = []Decision{{
		Tipo:      "escala",
		Pregunta:  "¿tombstone o delete?",
		Clase:     "migracion-o-perdida-de-datos",
		Alcanza:   "M3",
		Contamina: []string{"S2"},
	}}
	// S2 shares no path, no resource and no edge with S1. Nothing in the graph
	// reveals the contamination — that is why it must be declared.
	s2 := abierta("S2", "entrega")

	p := &Plan{Sesiones: []Sesion{s1, s2}}
	e := p.Estados()

	if e["S1"] != Listo {
		t.Errorf("S1 con la decisión en un Módulo posterior debería ser %s, fue %s", Listo, e["S1"])
	}
	if e["S2"] != Bloqueado {
		t.Errorf("S2 está declarada como contaminada: debería ser %s, fue %s", Bloqueado, e["S2"])
	}
}

func TestContaminacionNoReabreUnaSesionCerrada(t *testing.T) {
	s1 := abierta("S1", "hosts")
	s1.Decisiones = []Decision{{
		Tipo: "escala", Pregunta: "?", Alcanza: "M2", Contamina: []string{"S2"},
	}}
	p := &Plan{Sesiones: []Sesion{s1, entregada("S2", "entrega")}}

	if got := p.Estados()["S2"]; got != Completo {
		t.Errorf("una Sesión ya entregada no se reabre por contaminación: quería %s, fue %s", Completo, got)
	}
}

func TestDiferidoEsDistintoDeBloqueado(t *testing.T) {
	s := abierta("S1", "hosts")
	s.Diferida = true
	p := &Plan{Sesiones: []Sesion{s}}

	if got := p.Estados()["S1"]; got != Diferido {
		t.Errorf("DIFERIDO es «eligió no»; quería %s, fue %s", Diferido, got)
	}
}

func TestDependenciaInexistenteNoDejaListaLaSesion(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{abierta("S1", "hosts", "S99")}}

	if got := p.Estados()["S1"]; got != Planificado {
		t.Errorf("una dependencia que no existe no puede contar como cerrada: quería %s, fue %s", Planificado, got)
	}
}

func TestColaRespetaDependenciasDentroDeLaZona(t *testing.T) {
	p := &Plan{
		Zonas: []Zona{{ID: "hosts", Rutas: []string{"hosts/"}}},
		Sesiones: []Sesion{
			abierta("S3", "hosts", "S2"),
			abierta("S1", "hosts"),
			abierta("S2", "hosts", "S1"),
		},
	}

	cola := p.ColaPorZona()["hosts"]
	if strings.Join(cola, ",") != "S1,S2,S3" {
		t.Errorf("la cola debería ir S1,S2,S3 pese al orden de declaración; fue %v", cola)
	}
}

func TestLaColaNoIncluyeSesionesCerradas(t *testing.T) {
	p := &Plan{
		Zonas: []Zona{{ID: "hosts", Rutas: []string{"hosts/"}}},
		Sesiones: []Sesion{
			entregada("S1", "hosts"),
			abierta("S2", "hosts", "S1"),
		},
	}

	cola := p.ColaPorZona()["hosts"]
	if len(cola) != 1 || cola[0] != "S2" {
		t.Errorf("una Sesión entregada sale de la cola; fue %v", cola)
	}
}

func TestUnaColaPorZonaYNoUnaGlobal(t *testing.T) {
	p := &Plan{
		Zonas: []Zona{
			{ID: "hosts", Rutas: []string{"hosts/"}},
			{ID: "entrega", Rutas: []string{"delivery/"}},
		},
		Sesiones: []Sesion{
			abierta("S1", "hosts"),
			abierta("S2", "entrega"),
			abierta("S3", "hosts", "S1"),
		},
	}

	colas := p.ColaPorZona()
	if len(colas["hosts"]) != 2 || len(colas["entrega"]) != 1 {
		t.Errorf("cada zona lleva su propia cola; fue %v", colas)
	}
	// Position is per Zona: both queues start at #1. That is what makes each
	// list short and readable instead of a global jump between zones.
	if colas["hosts"][0] != "S1" || colas["entrega"][0] != "S2" {
		t.Errorf("cada cola arranca en su propia #1; fue %v", colas)
	}
}

func TestAvanceNoDaCreditoParcial(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{
		entregada("S1", "hosts"),
		abierta("S2", "hosts"),
		abierta("S3", "hosts"),
		abierta("S4", "hosts"),
	}}

	_, total := p.Avance()
	if total.String() != "25% (1/4 S)" {
		t.Errorf("EN CURSO suma cero y la fracción siempre viaja con el número; fue %q", total.String())
	}
}

func TestAvanceSinSesionesNoInventaUnPorcentaje(t *testing.T) {
	var a Avance
	if !strings.HasPrefix(a.String(), "—") {
		t.Errorf("sin denominador no hay porcentaje; fue %q", a.String())
	}
}

func TestAsientosSonZonasConTrabajoListo(t *testing.T) {
	p := &Plan{
		Zonas: []Zona{
			{ID: "hosts", Rutas: []string{"hosts/"}},
			{ID: "entrega", Rutas: []string{"delivery/"}},
			{ID: "consola", Rutas: []string{"console/"}},
		},
		Sesiones: []Sesion{
			abierta("S1", "hosts"),         // LISTO
			abierta("S2", "entrega", "S1"), // PLANIFICADO: espera a S1
			entregada("S3", "consola"),     // cerrada
		},
	}

	asientos := p.Asientos()
	if len(asientos) != 1 || asientos[0] != "hosts" {
		t.Errorf("sólo hosts tiene trabajo listo hoy; fue %v", asientos)
	}
}
