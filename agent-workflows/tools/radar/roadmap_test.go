package main

import (
	"reflect"
	"strings"
	"testing"
)

// lista builds a Sesión that will derive to LISTO: no dependencies, and the
// exact files it is authorized to touch. A roadmap conclusion is only as good
// as this declaration, so the helper always makes it explicit.
func lista(id, zona string, archivos ...string) Sesion {
	s := abierta(id, zona)
	s.Archivos = archivos
	return s
}

func parEntre(r Roadmap, a, b string) (Par, bool) {
	for _, par := range r.Pares {
		if (par.A == a && par.B == b) || (par.A == b && par.B == a) {
			return par, true
		}
	}
	return Par{}, false
}

// Criterion 1: every current LISTO alternative, in Zona order, and nothing else.
// A queue head is not the whole answer — the person is choosing among all of them.
func TestRoadmapEnumeraTodasLasAlternativasListoEnOrdenDeZona(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "metodo", Nombre: "Método"}, {ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{
			lista("S2", "metodo", "a.go"),
			lista("S1", "metodo", "b.go"),
			lista("S3", "hosts", "c.go"),
			entregada("S4", "hosts", commit),
			abierta("S5", "hosts", "S3"), // PLANIFICADO: depends on open work
		},
	}

	r := p.RoadmapAt(root, commit)

	var ids []string
	for _, a := range r.Alternativas {
		ids = append(ids, a.Sesion)
	}
	// Zona id ascending, then Sesión id: hosts before metodo, S1 before S2.
	if !reflect.DeepEqual(ids, []string{"S3", "S1", "S2"}) {
		t.Fatalf("alternativas esperadas [S3 S1 S2], obtenidas %v", ids)
	}
	if r.Alternativas[0].Zona != "hosts" || r.Alternativas[0].Archivos[0] != "c.go" {
		t.Fatalf("la alternativa debe cargar su Zona y sus archivos exactos: %#v", r.Alternativas[0])
	}
	if r.Head != commit {
		t.Fatalf("el roadmap se fija a la base vigente, esperado %s, obtenido %s", commit, r.Head)
	}
}

// Criterion 4, the one that separates this view from the seat forecast: sharing
// a Zona is not a conflict. Two disjoint results inside Método are compatible,
// even though AsientosAt would only ever offer one seat for that Zona.
func TestRoadmapNoVetaTrabajoDisjuntoEnLaMismaZona(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Zonas: []Zona{{ID: "metodo", Nombre: "Método"}},
		Sesiones: []Sesion{
			lista("S1", "metodo", "radar/roadmap.go"),
			lista("S2", "metodo", "chanks/controls.mjs"),
		},
	}

	par, hay := parEntre(p.RoadmapAt(root, commit), "S1", "S2")
	if !hay {
		t.Fatal("el roadmap debe enumerar el par S1/S2")
	}
	if par.Clase != Compatible {
		t.Fatalf("archivos disjuntos en la misma Zona deben ser compatibles, obtenido %q (%s)", par.Clase, par.Motivo)
	}
	if len(par.Detalle) != 0 {
		t.Fatalf("un par compatible no tiene detalle de conflicto: %v", par.Detalle)
	}
}

// Criterion 5: the conclusion uses the exact declared files, and names the ones
// that collide. A verdict without the offending path is not reviewable.
func TestRoadmapSolapeDeArchivosExcluyeLaCombinacion(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Zonas: []Zona{{ID: "metodo"}},
		Sesiones: []Sesion{
			lista("S1", "metodo", "radar/main.go", "radar/state.go"),
			lista("S2", "metodo", "radar/state.go", "radar/render.go"),
		},
	}

	par, _ := parEntre(p.RoadmapAt(root, commit), "S1", "S2")
	if par.Clase != SolapaArchivos {
		t.Fatalf("un archivo compartido excluye la combinación, obtenido %q", par.Clase)
	}
	if !reflect.DeepEqual(par.Detalle, []string{"radar/state.go"}) {
		t.Fatalf("el veredicto debe nombrar el archivo exacto, obtenido %v", par.Detalle)
	}
}

// Criterion 6: a shared Cimiento is a condition of coordinated intervention,
// never a blanket veto. The pair stays on the table, flagged.
func TestRoadmapCimientoCompartidoEsCondicionNoVeto(t *testing.T) {
	root, commit := repoGit(t)
	s1 := lista("S1", "metodo", "radar/main.go", "shared/base.go")
	s1.Cimientos = []string{"shared/base.go"}
	s2 := lista("S2", "hosts", "hosts/pi.go", "shared/base.go")
	s2.Cimientos = []string{"shared/base.go"}
	p := &Plan{Zonas: []Zona{{ID: "metodo"}, {ID: "hosts"}}, Sesiones: []Sesion{s1, s2}}

	par, _ := parEntre(p.RoadmapAt(root, commit), "S1", "S2")
	if par.Clase != CimientoCompartido {
		t.Fatalf("un Cimiento compartido es condición, obtenido %q", par.Clase)
	}
	if !reflect.DeepEqual(par.Detalle, []string{"shared/base.go"}) {
		t.Fatalf("la condición debe nombrar el Cimiento exacto, obtenido %v", par.Detalle)
	}
}

// Criterion 7: an exclusive resource held by both sides removes the combination.
func TestRoadmapRecursoExclusivoExcluyeLaCombinacion(t *testing.T) {
	root, commit := repoGit(t)
	s1 := lista("S1", "metodo", "a.go")
	s1.Recurso = []string{"sesión Herdr enfocada"}
	s2 := lista("S2", "hosts", "b.go")
	s2.Recurso = []string{"sesión Herdr enfocada"}
	p := &Plan{Zonas: []Zona{{ID: "metodo"}, {ID: "hosts"}}, Sesiones: []Sesion{s1, s2}}

	par, _ := parEntre(p.RoadmapAt(root, commit), "S1", "S2")
	if par.Clase != RecursoExcluyente {
		t.Fatalf("un recurso exclusivo compartido excluye, obtenido %q", par.Clase)
	}
	if !reflect.DeepEqual(par.Detalle, []string{"sesión Herdr enfocada"}) {
		t.Fatalf("el veredicto debe nombrar el recurso exacto, obtenido %v", par.Detalle)
	}
}

// Criterion 5, second half: an unknown or incomplete declaration is never read
// as empty or safe. This is the case that would silently authorize a collision.
func TestRoadmapDeclaracionFaltanteEsIndeterminadaNoSegura(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Zonas: []Zona{{ID: "metodo"}},
		Sesiones: []Sesion{
			lista("S1", "metodo", "radar/main.go"),
			lista("S2", "metodo"), // no declara archivos
		},
	}

	par, _ := parEntre(p.RoadmapAt(root, commit), "S1", "S2")
	if par.Clase != Indeterminado {
		t.Fatalf("una declaración faltante nunca es compatible, obtenido %q", par.Clase)
	}
	if !reflect.DeepEqual(par.Detalle, []string{"S2"}) {
		t.Fatalf("el veredicto debe nombrar quién no declaró, obtenido %v", par.Detalle)
	}
}

// An exclusive resource outranks a missing file declaration: the combination is
// already excluded, and reporting it as merely unknown would understate it.
func TestRoadmapRecursoExclusivoPrevaleceSobreDeclaracionFaltante(t *testing.T) {
	root, commit := repoGit(t)
	s1 := lista("S1", "metodo")
	s1.Recurso = []string{"raíz Pi"}
	s2 := lista("S2", "hosts")
	s2.Recurso = []string{"raíz Pi"}
	p := &Plan{Zonas: []Zona{{ID: "metodo"}, {ID: "hosts"}}, Sesiones: []Sesion{s1, s2}}

	par, _ := parEntre(p.RoadmapAt(root, commit), "S1", "S2")
	if par.Clase != RecursoExcluyente {
		t.Fatalf("el recurso excluyente manda sobre lo indeterminado, obtenido %q", par.Clase)
	}
}

// Criterion 3: the view is a forecast. It must say so in its own payload, so a
// reader — or a skill quoting it — cannot present it as permission to execute.
func TestRoadmapDeclaraQueNoAutorizaEjecucion(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{Zonas: []Zona{{ID: "metodo"}}, Sesiones: []Sesion{lista("S1", "metodo", "a.go")}}

	r := p.RoadmapAt(root, commit)
	if r.Prevision == "" {
		t.Fatal("el roadmap debe declarar explícitamente que es previsión y no permiso")
	}
	if r.Autoriza {
		t.Fatal("el roadmap nunca autoriza ejecución")
	}
}

// Determinism is the whole contract of a generated view: same plan and base,
// same bytes. A pair order that shuffles between runs cannot be reviewed.
func TestRoadmapEsDeterminista(t *testing.T) {
	root, commit := repoGit(t)
	nuevo := func() *Plan {
		return &Plan{
			Zonas: []Zona{{ID: "metodo"}, {ID: "hosts"}},
			Sesiones: []Sesion{
				lista("S3", "hosts", "c.go"),
				lista("S1", "metodo", "a.go"),
				lista("S2", "metodo", "b.go"),
			},
		}
	}

	if a, b := nuevo().RoadmapAt(root, commit), nuevo().RoadmapAt(root, commit); !reflect.DeepEqual(a, b) {
		t.Fatalf("el roadmap debe ser determinista:\n%#v\n%#v", a, b)
	}
}

// Only LISTO work is an alternative. A DIFERIDO Sesión — postponed by an earlier
// priority — is not on offer, and pairing it would invent capacity.
func TestRoadmapIgnoraSesionesDiferidasPorPrioridad(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Zonas:       []Zona{{ID: "metodo"}, {ID: "hosts"}},
		Prioridades: []Prioridad{{ID: "v1", Nombre: "V1"}, {ID: "v2", Nombre: "V2"}},
		Sesiones: []Sesion{
			func() Sesion { s := lista("S1", "metodo", "a.go"); s.Prioridad = "v1"; return s }(),
			func() Sesion { s := lista("S2", "hosts", "b.go"); s.Prioridad = "v2"; return s }(),
		},
	}

	r := p.RoadmapAt(root, commit)
	if len(r.Alternativas) != 1 || r.Alternativas[0].Sesion != "S1" {
		t.Fatalf("sólo S1 está LISTO bajo la prioridad activa: %#v", r.Alternativas)
	}
	if r.PrioridadActiva != "v1" {
		t.Fatalf("el roadmap debe declarar la prioridad activa, obtenido %q", r.PrioridadActiva)
	}
}

// --- T2: hypothetical scenarios -------------------------------------------

func escenarioDe(r Roadmap, id string) (Escenario, bool) {
	for _, e := range r.Escenarios {
		if e.Si == id {
			return e, true
		}
	}
	return Escenario{}, false
}

func retenida(e Escenario, id string) (Retenida, bool) {
	for _, r := range e.SiguenSinAbrir {
		if r.Sesion == id {
			return r, true
		}
	}
	return Retenida{}, false
}

// Criterion 8, the whole point of the scenarios: a satisfied dependency and a
// genuinely startable Sesión are not the same claim. Conflating them is how a
// roadmap starts promising capacity that admission will refuse.
func TestEscenarioDistingueDependenciaSatisfechaDeListoReal(t *testing.T) {
	root, commit := repoGit(t)
	conPrioridad := func(s Sesion, pr string) Sesion { s.Prioridad = pr; return s }
	p := &Plan{
		Zonas:       []Zona{{ID: "metodo"}, {ID: "hosts"}},
		Prioridades: []Prioridad{{ID: "v1", Nombre: "V1"}, {ID: "v2", Nombre: "V2"}},
		Sesiones: []Sesion{
			conPrioridad(lista("S1", "metodo", "a.go"), "v1"),
			conPrioridad(lista("S9", "metodo", "z.go"), "v1"), // keeps v1 open after S1 closes
			conPrioridad(func() Sesion { s := lista("S2", "hosts", "b.go"); s.DependeDe = []string{"S1"}; return s }(), "v2"),
		},
	}

	e, hay := escenarioDe(p.RoadmapAt(root, commit), "S1")
	if !hay {
		t.Fatal("S1 bloquea a S2, así que merece un escenario")
	}
	if len(e.Desbloquea) != 1 || e.Desbloquea[0] != "S2" {
		t.Fatalf("cerrar S1 satisface la dependencia de S2: %v", e.Desbloquea)
	}
	if len(e.QuedanListo) != 0 {
		t.Fatalf("S2 no queda LISTO: su prioridad v2 todavía no es la activa, obtenido %v", e.QuedanListo)
	}
	r, sigue := retenida(e, "S2")
	if !sigue || r.Estado != "DIFERIDO" {
		t.Fatalf("S2 debe aparecer retenida en DIFERIDO, obtenido %#v", r)
	}
	if r.Motivo == "" {
		t.Fatal("una Sesión retenida debe explicar por qué no abre")
	}
}

// Criterion 9, the demonstrative case the Encargo names: resolving S123's
// dependency on S122 does not make V2 executable while V2 is not the active
// priority. This mirrors the real plan, where Método V1 still has open work.
func TestEscenarioS123NoSeVuelveEjecutableMientrasV2NoSeaLaPrioridadActiva(t *testing.T) {
	root, commit := repoGit(t)
	conPrioridad := func(s Sesion, pr string) Sesion { s.Prioridad = pr; return s }
	s123 := lista("S123", "metodo", "skills/session-doc.md")
	s123.DependeDe = []string{"S122"}
	p := &Plan{
		Zonas: []Zona{{ID: "metodo"}},
		Prioridades: []Prioridad{
			{ID: "metodo-v1", Nombre: "Método V1"},
			{ID: "torre-v2", Nombre: "Torre V2"},
		},
		Sesiones: []Sesion{
			conPrioridad(lista("S122", "metodo", "radar/render.go"), "metodo-v1"),
			conPrioridad(lista("S145", "metodo", "radar/roadmap.go"), "metodo-v1"),
			conPrioridad(s123, "torre-v2"),
		},
	}

	e, _ := escenarioDe(p.RoadmapAt(root, commit), "S122")
	if len(e.Desbloquea) != 1 || e.Desbloquea[0] != "S123" {
		t.Fatalf("cerrar S122 satisface la dependencia de S123: %v", e.Desbloquea)
	}
	if len(e.QuedanListo) != 0 {
		t.Fatalf("V2 no se vuelve ejecutable por resolver la dependencia: %v", e.QuedanListo)
	}
	if r, _ := retenida(e, "S123"); r.Estado != "DIFERIDO" {
		t.Fatalf("S123 sigue diferida mientras Método V1 tenga trabajo abierto: %#v", r)
	}
}

// The other half of criterion 8: when the priority does accompany it, the
// scenario says so plainly. A view that only ever answers "no" is useless.
func TestEscenarioAbreDeVerdadCuandoLaPrioridadAcompana(t *testing.T) {
	root, commit := repoGit(t)
	dep := lista("S2", "hosts", "b.go")
	dep.DependeDe = []string{"S1"}
	p := &Plan{
		Zonas:    []Zona{{ID: "metodo"}, {ID: "hosts"}},
		Sesiones: []Sesion{lista("S1", "metodo", "a.go"), dep},
	}

	e, _ := escenarioDe(p.RoadmapAt(root, commit), "S1")
	if len(e.QuedanListo) != 1 || e.QuedanListo[0] != "S2" {
		t.Fatalf("sin prioridades declaradas, cerrar S1 abre S2: %#v", e)
	}
	if len(e.SiguenSinAbrir) != 0 {
		t.Fatalf("nada queda retenido: %#v", e.SiguenSinAbrir)
	}
}

// A dependency that is only partly satisfied is not satisfied. Closing S1 alone
// leaves S3 waiting on S2, so S3 never enters the scenario as unlocked.
func TestEscenarioNoDesbloqueaConUnaDependenciaPendiente(t *testing.T) {
	root, commit := repoGit(t)
	s3 := lista("S3", "hosts", "c.go")
	s3.DependeDe = []string{"S1", "S2"}
	p := &Plan{
		Zonas:    []Zona{{ID: "metodo"}, {ID: "hosts"}},
		Sesiones: []Sesion{lista("S1", "metodo", "a.go"), lista("S2", "metodo", "b.go"), s3},
	}

	e, _ := escenarioDe(p.RoadmapAt(root, commit), "S1")
	for _, id := range e.Desbloquea {
		if id == "S3" {
			t.Fatalf("S3 todavía espera a S2, no debe figurar como desbloqueada: %v", e.Desbloquea)
		}
	}
}

// Only work that actually holds someone back earns a scenario. Enumerating the
// rest would pad the report with hypotheticals nobody asked.
func TestEscenarioSoloParaSesionesQueBloquean(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Zonas:    []Zona{{ID: "metodo"}},
		Sesiones: []Sesion{lista("S1", "metodo", "a.go"), lista("S2", "metodo", "b.go")},
	}

	if r := p.RoadmapAt(root, commit); len(r.Escenarios) != 0 {
		t.Fatalf("nadie depende de nadie, no hay escenarios: %#v", r.Escenarios)
	}
}

// "los escenarios no modifican el plan, Git ni la evidencia de entrega real".
func TestEscenarioNoModificaElPlanNiLosEstadosReales(t *testing.T) {
	root, commit := repoGit(t)
	dep := lista("S2", "hosts", "b.go")
	dep.DependeDe = []string{"S1"}
	p := &Plan{
		Zonas:    []Zona{{ID: "metodo"}, {ID: "hosts"}},
		Sesiones: []Sesion{lista("S1", "metodo", "a.go"), dep},
	}

	antes := p.EstadosAt(root, commit)
	_ = p.RoadmapAt(root, commit)
	despues := p.EstadosAt(root, commit)

	if !reflect.DeepEqual(antes, despues) {
		t.Fatalf("el escenario alteró los estados reales:\n%v\n%v", antes, despues)
	}
	if despues["S2"] != Planificado {
		t.Fatalf("S2 sigue PLANIFICADO en la realidad, obtenido %q", despues["S2"])
	}
	for i := range p.Sesiones {
		if p.Sesiones[i].Entrega != nil {
			t.Fatalf("el escenario inventó evidencia de entrega en %s", p.Sesiones[i].ID)
		}
	}
}

// --- T3: the human view ----------------------------------------------------

func renderRoadmap(t *testing.T, p *Plan, root string) string {
	t.Helper()
	head, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	var b strings.Builder
	escribirRoadmap(&b, p.Producto, p.RoadmapAt(root, head), p.ZonaPorID())
	return b.String()
}

// The view refuses on exactly the same validation errors as status: a person
// must never be shown alternatives Radar itself would not stand behind.
func TestCmdRoadmapRechazaUnPlanQueNoValida(t *testing.T) {
	root, _ := repoGit(t)
	p := &Plan{Producto: "control-tower", Zonas: []Zona{{ID: "metodo"}}, Sesiones: []Sesion{lista("S1", "metodo", "a.go")}}

	var b strings.Builder
	err := cmdRoadmap(&b, p, root)
	if err == nil {
		t.Fatal("un plan inválido no puede producir un roadmap")
	}
	if !strings.Contains(err.Error(), "roadmap no disponible") {
		t.Fatalf("el rechazo debe nombrar el comando: %v", err)
	}
	if b.Len() != 0 {
		t.Fatalf("un rechazo no imprime una vista parcial:\n%s", b.String())
	}
}

// Criterion 3: the forecast must announce itself as a forecast. This is the one
// line that stops the report from being quoted as authority.
func TestVistaRoadmapSeparaPrevisionDePermiso(t *testing.T) {
	root, commit := repoGit(t)
	_ = commit
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "metodo", Nombre: "Método"}},
		Sesiones: []Sesion{lista("S1", "metodo", "a.go"), lista("S2", "metodo", "b.go")},
	}

	out := renderRoadmap(t, p, root)
	if !strings.Contains(out, "No es permiso de ejecución") {
		t.Fatalf("la vista debe negar explícitamente que autorice ejecución:\n%s", out)
	}
	if !strings.Contains(out, "Previsión") {
		t.Fatalf("la vista debe nombrarse previsión:\n%s", out)
	}
}

// Criteria 1 and 2 as the person reads them: every alternative, and the explicit
// verdict per combination with the evidence that produced it.
func TestVistaRoadmapListaAlternativasYVeredictos(t *testing.T) {
	root, _ := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "metodo", Nombre: "Método"}},
		Sesiones: []Sesion{
			func() Sesion { s := lista("S1", "metodo", "radar/state.go"); s.Resultado = "Motor"; return s }(),
			func() Sesion { s := lista("S2", "metodo", "radar/state.go"); s.Resultado = "Vista"; return s }(),
		},
	}

	out := renderRoadmap(t, p, root)
	for _, quiere := range []string{"S1", "S2", "Motor", "Vista", "radar/state.go", "solapa-archivos"} {
		if !strings.Contains(out, quiere) {
			t.Fatalf("la vista debe contener %q:\n%s", quiere, out)
		}
	}
}

// A view that prints JSON would become a second machine source. It must not.
func TestVistaRoadmapNoEmiteJSON(t *testing.T) {
	root, _ := repoGit(t)
	p := &Plan{Producto: "control-tower", Zonas: []Zona{{ID: "metodo"}}, Sesiones: []Sesion{lista("S1", "metodo", "a.go")}}

	out := renderRoadmap(t, p, root)
	if strings.Contains(out, `"schema"`) || strings.Contains(out, SnapshotSchema) {
		t.Fatalf("la vista humana no emite la proyección máquina:\n%s", out)
	}
}

// Same plan and base, same bytes — the contract of any generated view.
func TestVistaRoadmapEsDeterminista(t *testing.T) {
	root, _ := repoGit(t)
	nuevo := func() *Plan {
		return &Plan{
			Producto: "control-tower",
			Zonas:    []Zona{{ID: "metodo"}, {ID: "hosts"}},
			Sesiones: []Sesion{lista("S3", "hosts", "c.go"), lista("S1", "metodo", "a.go"), lista("S2", "metodo", "b.go")},
		}
	}
	if a, b := renderRoadmap(t, nuevo(), root), renderRoadmap(t, nuevo(), root); a != b {
		t.Fatalf("la vista debe ser determinista:\n%s\n---\n%s", a, b)
	}
}

// Nothing ready is a real answer, not an empty page.
func TestVistaRoadmapSinAlternativasLoDiceExplicitamente(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{Producto: "control-tower", Zonas: []Zona{{ID: "metodo"}}, Sesiones: []Sesion{entregada("S1", "metodo", commit)}}

	out := renderRoadmap(t, p, root)
	if !strings.Contains(out, "ninguna Sesión LISTO") {
		t.Fatalf("sin alternativas la vista debe decirlo:\n%s", out)
	}
}

// The scenarios reach the page, with the distinction intact.
func TestVistaRoadmapMuestraEscenariosYSuRetencion(t *testing.T) {
	root, _ := repoGit(t)
	conPrioridad := func(s Sesion, pr string) Sesion { s.Prioridad = pr; return s }
	dep := lista("S2", "hosts", "b.go")
	dep.DependeDe = []string{"S1"}
	p := &Plan{
		Producto:    "control-tower",
		Zonas:       []Zona{{ID: "metodo"}, {ID: "hosts"}},
		Prioridades: []Prioridad{{ID: "v1", Nombre: "V1"}, {ID: "v2", Nombre: "V2"}},
		Sesiones: []Sesion{
			conPrioridad(lista("S1", "metodo", "a.go"), "v1"),
			conPrioridad(lista("S9", "metodo", "z.go"), "v1"),
			conPrioridad(dep, "v2"),
		},
	}

	out := renderRoadmap(t, p, root)
	if !strings.Contains(out, "Si se cerrara S1") {
		t.Fatalf("la vista debe enunciar el escenario:\n%s", out)
	}
	if !strings.Contains(out, "DIFERIDO") {
		t.Fatalf("la vista debe mostrar que S2 sigue retenida:\n%s", out)
	}
}

// The command has to be discoverable, or nobody runs it.
func TestUsoDocumentaElComandoRoadmap(t *testing.T) {
	if !strings.Contains(uso, "radar roadmap") {
		t.Fatalf("el texto de uso debe documentar roadmap:\n%s", uso)
	}
}
