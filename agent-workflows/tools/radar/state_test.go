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

// fixtureGit runs repository-local Git setup without relying on the host's default branch.
func fixtureGit(t *testing.T, root string, args ...string) string {
	t.Helper()
	out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
	return strings.TrimSpace(string(out))
}

func TestIntegratedLocalBranchSelection(t *testing.T) {
	for _, tc := range []struct {
		name, local, origin, selected, failure string
	}{
		{"master only", "master", "", "master", ""},
		{"main only", "main", "", "main", ""},
		{"origin selects main over master", "both", "main", "main", ""},
		{"origin selects master over main", "both", "master", "master", ""},
		{"stale origin falls back to sole branch", "master", "main", "master", ""},
		{"stale origin does not break ambiguity", "both", "missing", "", "origin/HEAD"},
		{"both without origin are ambiguous", "both", "", "", "origin/HEAD"},
		{"neither branch exists", "neither", "", "", "main"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root, head := repoGit(t)
			if fixtureGit(t, root, "symbolic-ref", "--short", "HEAD") != "master" {
				fixtureGit(t, root, "branch", "-m", "master")
			}
			switch tc.local {
			case "main":
				fixtureGit(t, root, "branch", "-m", "main")
			case "both":
				fixtureGit(t, root, "branch", "main")
				fixtureGit(t, root, "commit", "--allow-empty", "-qm", "master advance")
			case "neither":
				fixtureGit(t, root, "branch", "-m", "work")
			}
			if tc.origin != "" {
				fixtureGit(t, root, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/"+tc.origin)
			}
			ref, oid, err := integratedLocalBranch(root)
			if tc.failure != "" {
				if err == nil || !strings.Contains(err.Error(), tc.failure) {
					t.Fatalf("expected actionable error containing %q, got %v", tc.failure, err)
				}
				return
			}
			wantOID := head
			if tc.local == "both" && tc.selected == "master" {
				wantOID = fixtureGit(t, root, "rev-parse", "HEAD")
			}
			if err != nil || ref != "refs/heads/"+tc.selected || oid != wantOID {
				t.Fatalf("wanted %s at %s, got ref=%q oid=%q err=%v", tc.selected, wantOID, ref, oid, err)
			}
		})
	}
}

func entregada(id, zona, commit string, deps ...string) Sesion {
	return Sesion{ID: id, Zona: zona, DependeDe: deps, Entrega: &Entrega{Commit: commit}}
}

func abierta(id, zona string, deps ...string) Sesion {
	return Sesion{ID: id, Zona: zona, DependeDe: deps, Criterios: []string{"algo verificable"}}
}

func TestUnaObservacionPorComandoNoMezclaEstadosYAsientos(t *testing.T) {
	root, head := repoGit(t)
	testDispatch(t, root, "S2", false)
	p := &Plan{Producto: "Producto", Zonas: []Zona{{ID: "z", Nombre: "Z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{abierta("S2", "z")}}
	valid := &Plan{Producto: "Producto", Zonas: p.Zonas, Sesiones: []Sesion{pendiente("S2", "z")}}
	original := readDispatchMarker
	defer func() { readDispatchMarker = original }()
	for _, tc := range []struct {
		name string
		run  func()
	}{
		{"snapshot", func() {
			s := p.SnapshotAt(root, head)
			if s.Sesiones[0].Estado != "EN CURSO" || s.Zonas[0].Cola[0].Estado != "EN CURSO" || len(s.Asientos) != 0 || len(s.DespachosHuerfanos) != 0 {
				t.Fatalf("snapshot contradiction: %#v", s)
			}
		}},
		{"render", func() {
			text := string(RenderAt(p, root, head))
			if !strings.Contains(text, "🔵 EN CURSO") || strings.Contains(text, "Ninguna Zona tiene trabajo LISTO.") == false {
				t.Fatalf("render contradiction: %s", text)
			}
		}},
		{"faltan", func() {
			text := string(RenderFaltanAt(p, root, head))
			if !strings.Contains(text, "Reanudar EN CURSO") || strings.Contains(text, "1 lista(s) para empezar") {
				t.Fatalf("faltan contradiction: %s", text)
			}
		}},
		{"status --json", func() {
			var out strings.Builder
			if err := cmdStatusJSON(&out, valid, root); err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(out.String(), `"estado": "EN CURSO"`) || !strings.Contains(out.String(), `"asientos": []`) {
				t.Fatalf("status contradiction: %s", out.String())
			}
		}},
		{"etapa", func() {
			var out strings.Builder
			if err := cmdEtapa(&out, valid, root, "S2"); err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(out.String(), "Implementar y revisar") {
				t.Fatalf("etapa contradiction: %s", out.String())
			}
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			readDispatchMarker = func(root, id string) (*despacho, error) {
				calls++
				if calls != 1 {
					return nil, nil
				}
				return original(root, id)
			}
			tc.run()
			if calls != 1 {
				t.Fatalf("read marker %d times, want one", calls)
			}
		})
	}
}

func TestRoadmapYSnapshotUsanLaMismaObservacionAunqueDiscoDifiera(t *testing.T) {
	root, head := repoGit(t)
	testDispatch(t, root, "S1", false) // Disk says EN CURSO; the sampled observation says LISTO.
	s1 := abierta("S1", "z")
	s1.Archivos = []string{"tracked.txt"}
	s2 := abierta("S2", "z")
	s2.Archivos = []string{"other.txt"}
	p := &Plan{Sesiones: []Sesion{s1, s2, abierta("S3", "z", "S1")}}
	original := readDispatchMarker
	defer func() { readDispatchMarker = original }()
	for _, tc := range []struct {
		name string
		run  func() ([]string, []Par, []Escenario)
	}{
		{"roadmap", func() ([]string, []Par, []Escenario) {
			r := p.RoadmapAt(root, head)
			ids := make([]string, 0, len(r.Alternativas))
			for _, a := range r.Alternativas {
				ids = append(ids, a.Sesion)
			}
			return ids, r.Pares, r.Escenarios
		}},
		{"snapshot", func() ([]string, []Par, []Escenario) {
			s := p.SnapshotAt(root, head)
			if s.Sesiones[0].Estado != "LISTO" || s.Zonas[0].Listas != 2 {
				t.Fatalf("snapshot contradicts observed state: %#v", s)
			}
			ids := make([]string, 0, len(s.Compatibilidad)+1)
			for _, entry := range s.Zonas[0].Cola {
				if entry.Estado == "LISTO" {
					ids = append(ids, entry.Sesion)
				}
			}
			pairs := make([]Par, 0, len(s.Compatibilidad))
			for _, pair := range s.Compatibilidad {
				pairs = append(pairs, Par{A: pair.A, B: pair.B, Clase: ClaseCompatibilidad(pair.Clase)})
			}
			scenarios := make([]Escenario, 0, len(s.Escenarios))
			for _, scenario := range s.Escenarios {
				scenarios = append(scenarios, Escenario{Si: scenario.Si, QuedanListo: scenario.QuedanListo})
			}
			return ids, pairs, scenarios
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			readDispatchMarker = func(root, id string) (*despacho, error) {
				calls++
				if calls <= len(p.Sesiones) {
					return nil, nil
				}
				return original(root, id)
			}
			ids, pairs, scenarios := tc.run()
			if calls != len(p.Sesiones) {
				t.Fatalf("marker sampled %d times for %d sessions", calls, len(p.Sesiones))
			}
			if !reflect.DeepEqual(ids, []string{"S1", "S2"}) || len(pairs) != 1 || pairs[0].A != "S1" || pairs[0].B != "S2" || pairs[0].Clase != Compatible {
				t.Fatalf("alternatives/pairs contradict first observation: ids=%v pairs=%#v", ids, pairs)
			}
			if len(scenarios) != 1 || scenarios[0].Si != "S1" || !reflect.DeepEqual(scenarios[0].QuedanListo, []string{"S3"}) {
				t.Fatalf("scenario contradicts marker-free assumption: %#v", scenarios)
			}
		})
	}
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

// --- S214: the unattended states and the switch-dependent rule ---------------

// ramaVueloConCommit creates the flight branch and one commit on it, then
// returns to the base branch. The commit is the Sesión's delivery evidence.
func ramaVueloConCommit(t *testing.T, root, rama, archivo string) string {
	t.Helper()
	base := fixtureGit(t, root, "symbolic-ref", "--short", "HEAD")
	fixtureGit(t, root, "checkout", "-q", "-b", rama)
	commit := commitNuevo(t, root, archivo)
	fixtureGit(t, root, "checkout", "-q", base)
	return commit
}

func TestNovedadYPorRevisarDesdeLasMarcas(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z")}}
	testMarcaPiloto(t, root, "S1", marcaPiloto{
		Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1",
		Estado: pilotoCierre, Commit: commit, Ronda: 1, Decisiones: 2,
	})
	testMarcaPiloto(t, root, "S2", marcaPiloto{
		Vuelo: "v2", Rama: "refs/heads/piloto/2026-10-08/vuelo-v2",
		Estado: pilotoNovedad, Motivo: MotivoDecisionDelicada, Ronda: 1,
	})

	estados := p.EstadosAt(root, head)
	if estados["S1"] != PorRevisar || estados["S2"] != Novedad {
		t.Fatalf("estados de piloto inesperados: %#v", estados)
	}
	obs := p.observarDespachos(root)
	if got := obs.piloto.porRevisar["S1"]; got != "con 2 decisiones anotadas" {
		t.Fatalf("nota de revisión inesperada: %q", got)
	}
	if got := obs.piloto.novedad["S2"]; got != MotivoDecisionDelicada {
		t.Fatalf("motivo de novedad inesperado: %q", got)
	}
	if obs.piloto.vuelo["S1"] != "v1" || obs.piloto.vuelo["S2"] != "v2" {
		t.Fatalf("identidad de vuelo inesperada: %#v", obs.piloto.vuelo)
	}
}

func TestPorRevisarExigeEvidenciaEnGit(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	otro := commitNuevo(t, root, "otro.txt")
	for _, tc := range []struct{ name, vuelo, rama, commit string }{
		{"commit fuera de la rama del vuelo", "v1", "refs/heads/piloto/2026-10-08/vuelo-v1", otro},
		{"rama inexistente", "v9", "refs/heads/piloto/2026-10-08/vuelo-v9", commit},
	} {
		t.Run(tc.name, func(t *testing.T) {
			testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: tc.vuelo, Rama: tc.rama, Estado: pilotoCierre, Commit: tc.commit, Ronda: 1})
			p := &Plan{Sesiones: []Sesion{abierta("S1", "z")}}
			if got := p.EstadosAt(root, head)["S1"]; got == PorRevisar {
				t.Fatalf("POR REVISAR sin evidencia en Git: %s", got)
			}
		})
	}
}

func TestPorRevisarSeApagaAlIntegrarLaRama(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z")}}
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1})
	if got := p.EstadosAt(root, head)["S1"]; got != PorRevisar {
		t.Fatalf("con la rama sin subir debe ser POR REVISAR; fue %s", got)
	}
	fixtureGit(t, root, "merge", "--ff-only", "piloto/2026-10-08/vuelo-v1")
	if got := p.EstadosAt(root, head)["S1"]; got == PorRevisar {
		t.Fatalf("una rama ya integrada no espera revisión; fue %s", got)
	}
}

func TestEnCursoDesdeLaMarcaDelPiloto(t *testing.T) {
	root, head := repoGit(t)
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z")}}
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoEnCurso, Ronda: 1})
	if got := p.EstadosAt(root, head)["S1"]; got != EnCurso {
		t.Fatalf("una marca en-curso viva debe ser EN CURSO; fue %s", got)
	}
}

func TestPorRevisarSeApagaConUpstream(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z")}}
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1})
	if got := p.EstadosAt(root, head)["S1"]; got != PorRevisar {
		t.Fatalf("con la rama sin subir debe ser POR REVISAR; fue %s", got)
	}
	base := fixtureGit(t, root, "symbolic-ref", "--short", "HEAD")
	fixtureGit(t, root, "branch", "--set-upstream-to="+base, "piloto/2026-10-08/vuelo-v1")
	if got := p.EstadosAt(root, head)["S1"]; got == PorRevisar {
		t.Fatalf("una rama con upstream dejó de esperar revisión; fue %s", got)
	}
}

func TestTerminalesYMarcaInvalidaNoCambianDeEstado(t *testing.T) {
	root, head := repoGit(t)
	p := &Plan{Sesiones: []Sesion{entregada("S1", "z", head), abierta("S2", "z")}}
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoNovedad, Motivo: MotivoInterrumpida, Ronda: 1})
	// A malformed mark never grants a state: fail closed, report it as invalid.
	path := testMarcaPiloto(t, root, "S2", marcaPiloto{Vuelo: "v2", Rama: "refs/heads/piloto/2026-10-08/vuelo-v2", Estado: pilotoEnCurso, Ronda: 1})
	if err := os.WriteFile(path, []byte(`{"schema":"otro"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	estados := p.EstadosAt(root, head)
	if estados["S1"] != Completo {
		t.Fatalf("lo ya completado no cambia de estado; fue %s", estados["S1"])
	}
	if estados["S2"] != Listo {
		t.Fatalf("una marca inválida no otorga estado; fue %s", estados["S2"])
	}
	if obs := p.observarDespachos(root); len(obs.piloto.invalid) != 1 || obs.piloto.invalid[0] != "S2" {
		t.Fatalf("la marca inválida debe reportarse: %#v", obs.piloto.invalid)
	}
}

func TestReglaDeListoDependeDelInterruptor(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1})
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z", "S1")}}

	// Off: the original rule holds and a POR REVISAR dependency never unblocks.
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: false, Rondas: 3, Tope: 10})
	if got := p.EstadosAt(root, head)["S2"]; got != Planificado {
		t.Fatalf("con el piloto apagado S2 debe quedar PLANIFICADO; fue %s", got)
	}

	// On, inside the ceiling: the POR REVISAR dependency unblocks the dependent.
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: true, Rondas: 3, Tope: 10})
	estados := p.EstadosAt(root, head)
	if estados["S1"] != PorRevisar || estados["S2"] != Listo {
		t.Fatalf("con el piloto prendido S2 debe quedar LISTO; fue %#v", estados)
	}

	// Turning it off again sends a not-yet-started LISTO back to PLANIFICADO.
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: false, Rondas: 3, Tope: 10})
	if got := p.EstadosAt(root, head)["S2"]; got != Planificado {
		t.Fatalf("apagar el piloto devuelve S2 a PLANIFICADO; fue %s", got)
	}
}

func TestLimiteDeRondasDeLaCorridaFrenaALasDependencias(t *testing.T) {
	root, head := repoGit(t)
	commit1 := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	commit2 := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v2", "s2.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit1, Ronda: 1})
	testMarcaPiloto(t, root, "S2", marcaPiloto{Vuelo: "v2", Rama: "refs/heads/piloto/2026-10-08/vuelo-v2", Estado: pilotoCierre, Commit: commit2, Ronda: 2})
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z", "S1"), abierta("S3", "z", "S2")}}

	// S2 is on floor 2 and S3 on floor 3: a ceiling of 2 stops S3, a ceiling of 3 lets it in.
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: true, Rondas: 2, Tope: 10})
	if got := p.EstadosAt(root, head)["S3"]; got != Planificado {
		t.Fatalf("por encima del límite de rondas S3 no arranca; fue %s", got)
	}

	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: true, Rondas: 3, Tope: 10})
	if got := p.EstadosAt(root, head)["S3"]; got != Listo {
		t.Fatalf("dentro del límite de rondas S3 queda LISTO; fue %s", got)
	}
}

func TestSinLimiteDeRondasNoFrenaDependencias(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1})
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: true, Rondas: 0, Tope: 10})
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z", "S1"), abierta("S3", "z", "S2")}}
	estados := p.EstadosAt(root, head)
	if estados["S1"] != PorRevisar || estados["S2"] != Listo || estados["S3"] != Planificado {
		t.Fatalf("sin límite la cascada avanza de a un piso; fue %#v", estados)
	}
}

func TestNovedadNuncaDestrabaAunqueElPilotoEstePrendido(t *testing.T) {
	root, head := repoGit(t)
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoNovedad, Motivo: MotivoNoSePudoInferir, Ronda: 1})
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: true, Rondas: 0, Tope: 10})
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z", "S1")}}
	estados := p.EstadosAt(root, head)
	if estados["S1"] != Novedad || estados["S2"] != Planificado {
		t.Fatalf("una NOVEDAD no destraba a nadie; fue %#v", estados)
	}
}

func TestInterruptorInvalidoSeLeeComoApagado(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1})
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: true, Rondas: 9, Tope: 10})
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z", "S1")}}
	obs := p.observarDespachos(root)
	if !obs.piloto.interruptorInvalido || obs.piloto.activo() {
		t.Fatalf("un interruptor inválido se lee como apagado: %#v", obs.piloto)
	}
	if got := obs.piloto.porRevisar["S1"]; got == "" {
		t.Fatal("POR REVISAR no depende del interruptor")
	}
	if got := p.EstadosAt(root, head)["S2"]; got != Planificado {
		t.Fatalf("un interruptor inválido no puede destrabar a nadie; fue %s", got)
	}
}

func TestApagarElModoNoBorraNovedadNiPorRevisar(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1})
	testMarcaPiloto(t, root, "S2", marcaPiloto{Vuelo: "v2", Rama: "refs/heads/piloto/2026-10-08/vuelo-v2", Estado: pilotoNovedad, Motivo: MotivoInterrumpida, Ronda: 1})
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: false, Rondas: 1, Tope: 1})
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z"), entregada("S3", "z", head)}}
	estados := p.EstadosAt(root, head)
	if estados["S1"] != PorRevisar || estados["S2"] != Novedad || estados["S3"] != Completo {
		t.Fatalf("apagar el modo no borra los estados ya ganados; fue %#v", estados)
	}
}

func TestLasVistasMuestranLosEstadosYElVueloDelPiloto(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1, Decisiones: 2})
	testMarcaPiloto(t, root, "S2", marcaPiloto{Vuelo: "v2", Rama: "refs/heads/piloto/2026-10-08/vuelo-v2", Estado: pilotoNovedad, Motivo: MotivoNoSePudoInferir, Ronda: 1})
	p := &Plan{Producto: "control-tower", Zonas: []Zona{{ID: "z", Nombre: "Z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z")}}
	obs := p.observarDespachos(root)
	estados := p.estadosConObservacion(root, head, nil, obs)

	render := string(RenderAt(p, root, head))
	for _, quiere := range []string{"POR REVISAR", "NOVEDAD", "vuelo v1", "vuelo v2", "con 2 decisiones anotadas", MotivoNoSePudoInferir} {
		if !strings.Contains(render, quiere) {
			t.Fatalf("el render debe mostrar %q:\n%s", quiere, render)
		}
	}

	faltan := string(RenderFaltanAt(p, root, head))
	for _, quiere := range []string{"POR REVISAR", "NOVEDAD", "vuelo v1"} {
		if !strings.Contains(faltan, quiere) {
			t.Fatalf("faltan debe mostrar %q:\n%s", quiere, faltan)
		}
	}

	var sesion strings.Builder
	escribirSesionConAvance(&sesion, p, &p.Sesiones[0], estados, nil, obs.piloto)
	if !strings.Contains(sesion.String(), "POR REVISAR") || !strings.Contains(sesion.String(), "con 2 decisiones anotadas") || !strings.Contains(sesion.String(), "vuelo v1") {
		t.Fatalf("sesion debe mostrar estado, nota y vuelo:\n%s", sesion.String())
	}

	var roadmap strings.Builder
	escribirRoadmap(&roadmap, p.Producto, p.RoadmapAt(root, head), p.ZonaPorID())
	for _, quiere := range []string{"POR REVISAR", "NOVEDAD", "vuelo v1"} {
		if !strings.Contains(roadmap.String(), quiere) {
			t.Fatalf("roadmap debe mostrar %q:\n%s", quiere, roadmap.String())
		}
	}
}

func TestRoadmapYAvanceProyectanElTrabajoSinRevisar(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1})
	testMarcaPiloto(t, root, "S2", marcaPiloto{Vuelo: "v2", Rama: "refs/heads/piloto/2026-10-08/vuelo-v2", Estado: pilotoNovedad, Motivo: MotivoInterrumpida, Ronda: 1})
	p := &Plan{Producto: "control-tower", Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z")}}

	r := p.RoadmapAt(root, head)
	if len(r.Revisiones) != 1 || r.Revisiones[0].Sesion != "S1" || r.Revisiones[0].Vuelo != "v1" {
		t.Fatalf("roadmap debe listar el trabajo por revisar: %#v", r.Revisiones)
	}
	if len(r.Novedades) != 1 || r.Novedades[0].Sesion != "S2" || r.Novedades[0].Nota != MotivoInterrumpida {
		t.Fatalf("roadmap debe listar las novedades: %#v", r.Novedades)
	}

	if got := resumenRevision(p.EstadosAt(root, head)); got != "1 POR REVISAR · 1 NOVEDAD" {
		t.Fatalf("resumen de revisión inesperado: %q", got)
	}
}

func TestMotivoDeDependenciaDelPilotoNoEsAtasco(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1})
	testMarcaPiloto(t, root, "S2", marcaPiloto{Vuelo: "v2", Rama: "refs/heads/piloto/2026-10-08/vuelo-v2", Estado: pilotoNovedad, Motivo: MotivoDecisionDelicada, Ronda: 1})
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z"), abierta("S3", "z", "S1"), abierta("S4", "z", "S2")}}
	motivos := p.Motivos(p.EstadosAt(root, head))
	if got := motivos["S3"]; got.Tipo != "espera-natural" || len(got.Raices) != 1 || got.Raices[0] != "S1" {
		t.Fatalf("una dependencia POR REVISAR espera naturalmente: %#v", got)
	}
	if got := motivos["S4"]; got.Tipo != "falta-decision" || len(got.Raices) != 1 || got.Raices[0] != "S2" {
		t.Fatalf("una dependencia con NOVEDAD espera una decisión: %#v", got)
	}
}

func TestLaRondaRegistradaEsPisoMinimoDeLaSesion(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	// S1 has no POR REVISAR dependency, so only its recorded floor lifts it.
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 3})
	testInterruptorPiloto(t, root, interruptorPiloto{Prendido: true, Rondas: 2, Tope: 10})
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z", "S1")}}
	if got := p.EstadosAt(root, head)["S2"]; got != Planificado {
		t.Fatalf("el piso registrado de S1 pone a S2 fuera de rondas; fue %s", got)
	}
}
