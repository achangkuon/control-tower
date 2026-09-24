package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func repoGit(t *testing.T) (string, string) {
	t.Helper()
	root := t.TempDir()
	for _, args := range [][]string{{"init", "-q"}, {"config", "user.email", "radar@example.test"}, {"config", "user.name", "Radar Test"}} {
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
	}
	if err := os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("base\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{{"add", "tracked.txt"}, {"commit", "-qm", "base"}} {
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
	}
	head, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	return root, head
}

func entregada(id, zona, commit string, deps ...string) Sesion {
	return Sesion{ID: id, Zona: zona, DependeDe: deps, Entrega: &Entrega{Commit: commit}}
}

func abierta(id, zona string, deps ...string) Sesion {
	return Sesion{ID: id, Zona: zona, DependeDe: deps, Criterios: []string{"algo verificable"}}
}

func TestEstadoListoSoloConDependenciasCerradas(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{Sesiones: []Sesion{
		entregada("S1", "hosts", commit),
		abierta("S2", "hosts", "S1"),
		abierta("S3", "hosts", "S2"),
	}}
	e := p.Estados(root)
	if e["S1"] != Completo || e["S2"] != Listo || e["S3"] != Planificado {
		t.Fatalf("estados derivados inesperados: %#v", e)
	}
}

func TestMotivosSiguenRaicesYConservanEstados(t *testing.T) {
	root, head := repoGit(t)
	blocked := abierta("B", "z")
	blocked.Decisiones = []Decision{{Tipo: "escala", Alcanza: "criterios"}}
	p := &Plan{Sesiones: []Sesion{
		entregada("C", "z", head), abierta("R", "z", "C"),
		abierta("N", "z", "R"), blocked, abierta("A", "z", "B"),
		abierta("M", "z", "ABSENT"), abierta("X", "z", "Y"), abierta("Y", "z", "X"),
	}}
	states := p.EstadosAt(root, head)
	motivos := p.Motivos(states)
	for id, want := range map[string]Motivo{
		"N": {Tipo: "espera-natural", Raices: []string{"R"}},
		"B": {Tipo: "falta-decision", Raices: []string{"B"}},
		"A": {Tipo: "espera-atascada", Raices: []string{"B"}},
		"M": {Tipo: "falta-planificar", Raices: []string{"ABSENT"}},
		"X": {Tipo: "espera-atascada", Raices: []string{"X", "Y"}},
		"Y": {Tipo: "espera-atascada", Raices: []string{"X", "Y"}},
	} {
		if got := motivos[id]; !reflect.DeepEqual(got, want) {
			t.Errorf("%s: got %#v, want %#v", id, got, want)
		}
	}
	if states["N"] != Planificado || states["A"] != Planificado || states["B"] != Bloqueado || states["M"] != Planificado {
		t.Fatalf("derived states changed: %#v", states)
	}
	for _, id := range []string{"C", "R"} {
		if _, exists := motivos[id]; exists {
			t.Errorf("%s should not carry a reason", id)
		}
	}
	if !reflect.DeepEqual(motivos, p.Motivos(states)) {
		t.Fatal("cycle analysis must be deterministic")
	}
}

func TestMotivosPriorizaAusenciasYNoAtribuyeMotivoATerminales(t *testing.T) {
	root, head := repoGit(t)
	blocked := abierta("B", "z")
	blocked.Decisiones = []Decision{{Tipo: "escala", Alcanza: "criterios"}}
	deferred := abierta("D", "z")
	deferred.Diferida = true
	p := &Plan{Sesiones: []Sesion{
		entregada("C", "z", head), blocked, deferred,
		abierta("M", "z", "B", "ABSENT"), abierta("W", "z", "D"),
	}}
	states := p.EstadosAt(root, head)
	reasons := p.Motivos(states)
	if got := reasons["M"]; !reflect.DeepEqual(got, Motivo{Tipo: "falta-planificar", Raices: []string{"ABSENT"}}) {
		t.Fatalf("a missing ID takes precedence: %#v", got)
	}
	if got := reasons["W"]; !reflect.DeepEqual(got, Motivo{Tipo: "espera-atascada", Raices: []string{"D"}}) {
		t.Fatalf("deferred dependency must not be called ready: %#v", got)
	}
	for _, id := range []string{"C", "D"} {
		if _, ok := reasons[id]; ok {
			t.Fatalf("terminal %s has a reason", id)
		}
	}
}

func TestMotivoDeContaminacionNombraDecisionOrigen(t *testing.T) {
	source := abierta("S1", "z")
	source.Decisiones = []Decision{{Tipo: "escala", Alcanza: "M1.2", Contamina: []string{"S2"}}}
	p := &Plan{Sesiones: []Sesion{source, abierta("S2", "z")}}
	got := p.Motivos(p.EstadosAt("", ""))["S2"]
	if !reflect.DeepEqual(got, Motivo{Tipo: "falta-decision", Raices: []string{"S1"}}) {
		t.Fatalf("semantic contamination should name the originating decision: %#v", got)
	}
}

func TestEntregaNoIntegradaNoOtorgaCompleto(t *testing.T) {
	root, _ := repoGit(t)
	p := &Plan{Sesiones: []Sesion{entregada("S1", "hosts", "no-existe")}}
	if got := p.Estados(root)["S1"]; got == Completo {
		t.Fatal("evidencia que no resuelve no puede otorgar COMPLETO")
	}
}

func TestEscalarNoEsBloquear(t *testing.T) {
	casos := []struct {
		nombre, alcanza, quiere string
	}{
		{"criterios", "criterios", Bloqueado},
		{"primer Módulo", "primer-modulo", Bloqueado},
		{"Módulo posterior", "M1.2", Listo},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			s := abierta("S1", "hosts")
			s.Decisiones = []Decision{{Tipo: "escala", Pregunta: "¿se borra?", Alcanza: c.alcanza}}
			if got := (&Plan{Sesiones: []Sesion{s}}).Estados("")["S1"]; got != c.quiere {
				t.Fatalf("quería %s, fue %s", c.quiere, got)
			}
		})
	}
}

func TestContaminacionSemanticaBloqueaAOtraSesion(t *testing.T) {
	s1 := abierta("S1", "hosts")
	s1.Decisiones = []Decision{{Tipo: "escala", Pregunta: "¿tombstone?", Alcanza: "M1.2", Contamina: []string{"S2"}}}
	p := &Plan{Sesiones: []Sesion{s1, abierta("S2", "entrega")}}
	e := p.Estados("")
	if e["S1"] != Listo || e["S2"] != Bloqueado {
		t.Fatalf("contaminación inesperada: %#v", e)
	}
}

func TestDiferidoEsDistintoDeBloqueado(t *testing.T) {
	s := abierta("S1", "hosts")
	s.Diferida = true
	if got := (&Plan{Sesiones: []Sesion{s}}).Estados("")["S1"]; got != Diferido {
		t.Fatalf("quería %s, fue %s", Diferido, got)
	}
}

func TestColaRespetaDependenciasDentroDeLaZona(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{abierta("S3", "hosts", "S2"), abierta("S1", "hosts"), abierta("S2", "hosts", "S1")}}
	if got := strings.Join(p.ColaPorZona("")["hosts"], ","); got != "S1,S2,S3" {
		t.Fatalf("cola inesperada: %s", got)
	}
}

func TestUnaColaPorZonaYNoUnaGlobal(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{abierta("S1", "hosts"), abierta("S2", "entrega"), abierta("S3", "hosts", "S1")}}
	colas := p.ColaPorZona("")
	if len(colas["hosts"]) != 2 || len(colas["entrega"]) != 1 {
		t.Fatalf("colas inesperadas: %#v", colas)
	}
}

func TestAvanceNoDaCreditoParcial(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{Sesiones: []Sesion{entregada("S1", "hosts", commit), abierta("S2", "hosts"), abierta("S3", "hosts"), abierta("S4", "hosts")}}
	_, total := p.Avance(root)
	if total.String() != "25% (1/4 S)" {
		t.Fatalf("avance inesperado: %q", total.String())
	}
}

func TestAvanceSinSesionesNoInventaPorcentaje(t *testing.T) {
	if got := (Avance{}).String(); !strings.HasPrefix(got, "—") {
		t.Fatalf("sin denominador no hay porcentaje: %q", got)
	}
}

func TestAsientosRespetanDependenciasYCimientos(t *testing.T) {
	s1 := abierta("S1", "cimientos")
	s1.Cimientos = []string{"core.mjs"}
	s2 := abierta("S2", "hosts")
	s2.Cimientos = []string{"core.mjs"}
	s3 := abierta("S3", "entrega", "S1")
	p := &Plan{Sesiones: []Sesion{s2, s1, s3}}
	if got := strings.Join(p.Asientos(""), ","); got != "cimientos" {
		t.Fatalf("asientos inesperados: %s", got)
	}
}

func conPrioridad(s Sesion, prioridad string) Sesion {
	s.Prioridad = prioridad
	return s
}

func planPriorizado(sesiones ...Sesion) *Plan {
	return &Plan{
		Prioridades: []Prioridad{{ID: "a", Nombre: "A"}, {ID: "b", Nombre: "B"}, {ID: "c", Nombre: "C"}},
		Sesiones:    sesiones,
	}
}

func commitNuevo(t *testing.T, root, nombre string) string {
	t.Helper()
	if err := os.WriteFile(filepath.Join(root, nombre), []byte(nombre+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{{"add", nombre}, {"commit", "-qm", nombre}} {
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
	}
	head, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	return head
}

func TestPrioridadActivaEsLaPrimeraConSesionesAbiertas(t *testing.T) {
	root, head := repoGit(t)
	p := planPriorizado(
		conPrioridad(entregada("S1", "z", head), "a"),
		conPrioridad(abierta("S2", "z"), "b"),
		conPrioridad(abierta("S3", "z"), "c"),
	)
	activa, ok := p.PrioridadActivaAt(root, head)
	if !ok || activa.ID != "b" {
		t.Fatalf("la prioridad activa debe ser b; fue %#v (%v)", activa, ok)
	}
	estados := p.EstadosAt(root, head)
	if estados["S1"] != Completo || estados["S2"] != Listo || estados["S3"] != Diferido {
		t.Fatalf("estados inesperados: %#v", estados)
	}
}

func TestSinPrioridadesLosEstadosNoCambian(t *testing.T) {
	root, head := repoGit(t)
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z", "S1")}}
	if _, ok := p.PrioridadActivaAt(root, head); ok {
		t.Fatal("un plan sin prioridades no tiene prioridad activa")
	}
	estados := p.EstadosAt(root, head)
	if estados["S1"] != Listo || estados["S2"] != Planificado {
		t.Fatalf("sin prioridades los estados deben ser los de siempre: %#v", estados)
	}
}

func TestDiferidaAManoMantieneAbiertaSuPrioridad(t *testing.T) {
	root, head := repoGit(t)
	postergada := conPrioridad(abierta("S1", "z"), "a")
	postergada.Diferida = true
	p := planPriorizado(postergada, conPrioridad(abierta("S2", "z"), "b"))
	activa, ok := p.PrioridadActivaAt(root, head)
	if !ok || activa.ID != "a" {
		t.Fatalf("una Sesión diferida a mano mantiene abierta su prioridad; activa fue %#v (%v)", activa, ok)
	}
	if got := p.EstadosAt(root, head)["S2"]; got != Diferido {
		t.Fatalf("S2 espera a la prioridad a; fue %s", got)
	}
}

func TestSoloLoQueSeriaListoPasaADiferido(t *testing.T) {
	root, head := repoGit(t)
	bloqueada := conPrioridad(abierta("S3", "z"), "b")
	bloqueada.Decisiones = []Decision{{Tipo: "escala", Alcanza: "criterios"}}
	p := planPriorizado(
		conPrioridad(abierta("S1", "z"), "a"),
		conPrioridad(abierta("S2", "z", "S1"), "b"),
		bloqueada,
		conPrioridad(abierta("S4", "z"), "b"),
		conPrioridad(entregada("S5", "z", head), "b"),
	)
	estados := p.EstadosAt(root, head)
	want := map[string]string{"S1": Listo, "S2": Planificado, "S3": Bloqueado, "S4": Diferido, "S5": Completo}
	for id, estado := range want {
		if estados[id] != estado {
			t.Fatalf("%s debe quedar %s; fue %s", id, estado, estados[id])
		}
	}
	if cola := strings.Join(p.ColaPorZonaAt(root, head)["z"], ","); strings.Contains(cola, "S4") {
		t.Fatalf("una Sesión diferida por prioridad sale de la cola: %s", cola)
	}
}

func TestSinSesionesAbiertasNoHayPrioridadActiva(t *testing.T) {
	root, head := repoGit(t)
	p := planPriorizado(conPrioridad(entregada("S1", "z", head), "a"), conPrioridad(entregada("S2", "z", head), "b"))
	if activa, ok := p.PrioridadActivaAt(root, head); ok {
		t.Fatalf("sin Sesiones abiertas no hay prioridad activa; fue %#v", activa)
	}
}

func TestLaPrioridadAvanzaSolaTrasUnaEntregaIntegrada(t *testing.T) {
	root, base := repoGit(t)
	s1 := conPrioridad(abierta("S1", "z"), "a")
	p := planPriorizado(s1, conPrioridad(abierta("S2", "z"), "b"))
	if got := p.EstadosAt(root, base)["S2"]; got != Diferido {
		t.Fatalf("antes de entregar S1, S2 espera; fue %s", got)
	}

	entrega := commitNuevo(t, root, "s1.txt")
	p.Sesiones[0].Entrega = &Entrega{Commit: entrega}
	head := commitNuevo(t, root, "otra.txt")
	activa, ok := p.PrioridadActivaAt(root, head)
	if !ok || activa.ID != "b" {
		t.Fatalf("tras la entrega integrada de S1 la prioridad activa debe ser b; fue %#v (%v)", activa, ok)
	}
	if got := p.EstadosAt(root, head)["S2"]; got != Listo {
		t.Fatalf("S2 queda LISTO sin editar el plan; fue %s", got)
	}
}
