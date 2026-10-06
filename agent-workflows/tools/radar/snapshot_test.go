package main

import (
	"encoding/json"
	"os"
	"reflect"
	"strings"
	"testing"
)

func TestStatusViewOmitsClosedAndArchivedButPreservesTotals(t *testing.T) {
	root, head := repoGit(t)
	p := &Plan{Sesiones: []Sesion{
		entregada("S1", "z", head),
		{ID: "S2", Zona: "z", Archivada: true, Historico: archivePath("S2"), Entrega: &Entrega{Commit: head}},
		abierta("S3", "z", "S2"),
	}}
	short := p.SnapshotViewAt(root, head, false)
	full := p.SnapshotViewAt(root, head, true)
	if short.Avance.Total != 3 || short.Avance.Cerradas != 2 || len(short.Sesiones) != 1 || short.Sesiones[0].ID != "S3" {
		t.Fatalf("default projection loses live work or totals: %+v", short)
	}
	if len(full.Sesiones) != 3 || full.Sesiones[1].Estado != "ARCHIVADO" || full.Sesiones[2].Estado != "LISTO" {
		t.Fatalf("--all loses archived readiness: %+v", full.Sesiones)
	}
}

func TestStatusJSONDefaultAndAll(t *testing.T) {
	root, head := repoGit(t)
	p := planConDosSesiones(head)
	for _, tc := range []struct {
		all    bool
		closed bool
	}{{false, false}, {true, true}} {
		var out strings.Builder
		if err := cmdStatusJSONView(&out, p, root, tc.all); err != nil {
			t.Fatal(err)
		}
		var snapshot Snapshot
		if err := json.Unmarshal([]byte(out.String()), &snapshot); err != nil {
			t.Fatal(err)
		}
		if snapshot.Avance.Total != 3 {
			t.Fatalf("lost total: %+v", snapshot.Avance)
		}
		found := false
		for _, s := range snapshot.Sesiones {
			if s.ID == "S1" {
				found = true
			}
		}
		if found != tc.closed {
			t.Fatalf("all=%v: closed visible=%v", tc.all, found)
		}
	}
}

func TestStatusTextOnlyListsClosedWithAll(t *testing.T) {
	root, head := repoGit(t)
	p := planConDosSesiones(head)
	short := captureStdout(t, func() {
		if err := cmdStatusView(p, root, false); err != nil {
			t.Fatal(err)
		}
	})
	full := captureStdout(t, func() {
		if err := cmdStatusView(p, root, true); err != nil {
			t.Fatal(err)
		}
	})
	if strings.Contains(short, "Sesiones cerradas y archivadas:") || strings.Contains(short, "S1  ✅ COMPLETO") {
		t.Fatalf("default text exposed completed Session: %s", short)
	}
	if !strings.Contains(full, "S1  ✅ COMPLETO") || !strings.Contains(full, "1/3 S") {
		t.Fatalf("--all lost closed Session or progress: %s", full)
	}
}

func TestSnapshotHorizonCountsReadyAndRanksPreparationRoots(t *testing.T) {
	root, head := repoGit(t)
	blocked := abierta("B", "z")
	blocked.Decisiones = []Decision{{Tipo: "escala", Alcanza: "criterios"}}
	p := &Plan{Zonas: []Zona{{ID: "empty"}, {ID: "z"}}, Sesiones: []Sesion{
		abierta("R", "z"), abierta("N", "z", "R"), abierta("N2", "z", "R"),
		blocked, abierta("A", "z", "B"), abierta("M", "z", "ABSENT"),
	}}
	s := p.SnapshotAt(root, head)
	if s.Zonas[0].Listas != 0 || s.Zonas[0].DeficitHorizonte != 2 || s.Zonas[1].Listas != 1 || s.Zonas[1].DeficitHorizonte != 1 {
		t.Fatalf("incorrect horizon: %#v", s.Zonas)
	}
	want := []RaizPreparacion{{ID: "B", Desbloquea: 2}, {ID: "R", Desbloquea: 2}, {ID: "ABSENT", Desbloquea: 1}}
	if !reflect.DeepEqual(s.Zonas[1].RaicesPreparacion, want) {
		t.Fatalf("roots: got %#v want %#v", s.Zonas[1].RaicesPreparacion, want)
	}
	for _, ses := range s.Sesiones {
		if ses.ID == "N" && (ses.Motivo == nil || ses.Motivo.Tipo != "espera-natural") {
			t.Fatalf("planned session missing reason: %#v", ses)
		}
		if ses.ID == "R" && ses.Motivo != nil {
			t.Fatalf("ready session has reason: %#v", ses)
		}
	}
}

func TestSnapshotReportsTotalAndPerZonaAvance(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}, {ID: "entrega", Nombre: "Entrega"}},
		Sesiones: []Sesion{
			entregada("S1", "hosts", commit),
			abierta("S2", "hosts", "S1"),
			abierta("S3", "entrega"),
		},
	}

	s := p.SnapshotAt(root, commit)

	if s.Producto != "control-tower" || s.Head != commit {
		t.Fatalf("identidad del snapshot inesperada: %#v", s)
	}
	if s.Avance.Cerradas != 1 || s.Avance.Total != 3 {
		t.Fatalf("avance total esperado 1/3, obtenido %d/%d", s.Avance.Cerradas, s.Avance.Total)
	}
	if len(s.Zonas) != 2 {
		t.Fatalf("se esperaban 2 Zonas, hay %d", len(s.Zonas))
	}
	if s.Zonas[0].ID != "entrega" || s.Zonas[1].ID != "hosts" {
		t.Fatalf("las Zonas deben salir ordenadas por id: %#v", s.Zonas)
	}
	hosts := s.Zonas[1]
	if hosts.Nombre != "Hosts" || hosts.Cerradas != 1 || hosts.Total != 2 {
		t.Fatalf("avance de la Zona hosts inesperado: %#v", hosts)
	}
}

// The report draws a row per Zona and needs the queue head to say what is next.
func TestSnapshotCarriesTheZonaQueueWithDerivedStates(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{
			entregada("S1", "hosts", commit),
			abierta("S2", "hosts", "S1"),
			abierta("S3", "hosts", "S2"),
		},
	}
	p.Sesiones[1].Resultado = "Adaptador de host neutral"

	cola := p.SnapshotAt(root, commit).Zonas[0].Cola
	if len(cola) != 2 {
		t.Fatalf("se esperaban 2 Sesiones en cola, hay %d: %#v", len(cola), cola)
	}
	if cola[0].Sesion != "S2" || cola[0].Posicion != 1 || cola[0].Resultado != "Adaptador de host neutral" {
		t.Fatalf("cabeza de cola inesperada: %#v", cola[0])
	}
	if cola[0].Estado != "LISTO" || cola[1].Estado != "PLANIFICADO" {
		t.Fatalf("estados de cola inesperados: %#v", cola)
	}
}

// The vocabulary word is the contract; the emoji is presentation Radar owns and
// a JSON consumer must never have to strip.
func TestSnapshotEmitsStatesWithoutEmoji(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{entregada("S1", "hosts", commit), abierta("S2", "hosts", "S1")},
	}

	s := p.SnapshotAt(root, commit)
	if len(s.Sesiones) != 2 {
		t.Fatalf("se esperaban 2 Sesiones, hay %d", len(s.Sesiones))
	}
	for _, ses := range s.Sesiones {
		if strings.ContainsAny(ses.Estado, "📋🟢🔵🔴🟡✅📚") {
			t.Fatalf("el estado %q no debe llevar emoji", ses.Estado)
		}
	}
	if s.Sesiones[0].Estado != "COMPLETO" || s.Sesiones[1].Estado != "LISTO" {
		t.Fatalf("estados de Sesión inesperados: %#v", s.Sesiones)
	}
	if s.Sesiones[0].Zona != "hosts" {
		t.Fatalf("cada Sesión debe declarar su Zona: %#v", s.Sesiones[0])
	}
}

// A report that reads this must be able to diff two runs; map iteration order
// would make identical facts serialize differently.
func TestSnapshotJSONIsDeterministicAndSelfDescribing(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "metodo", Nombre: "Método"}, {ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{
			entregada("S1", "hosts", commit),
			abierta("S2", "metodo"),
			abierta("S3", "hosts", "S1"),
		},
	}

	first, err := json.Marshal(p.SnapshotAt(root, commit))
	if err != nil {
		t.Fatal(err)
	}
	second, err := json.Marshal(p.SnapshotAt(root, commit))
	if err != nil {
		t.Fatal(err)
	}
	if string(first) != string(second) {
		t.Fatalf("dos snapshots de los mismos hechos difieren:\n%s\n%s", first, second)
	}

	var decoded Snapshot
	if err := json.Unmarshal(first, &decoded); err != nil {
		t.Fatalf("el snapshot no vuelve a decodificar: %v", err)
	}
	if decoded.Schema != "radar.snapshot/v1" {
		t.Fatalf("el snapshot debe declarar su esquema, dijo %q", decoded.Schema)
	}
	if decoded.Avance.Total != 3 || len(decoded.Zonas) != 2 {
		t.Fatalf("el snapshot decodificado perdió hechos: %#v", decoded)
	}
}

// A Sesión with proven pending territory counts in the total but belongs to no
// Zona; dropping it from the total would understate the work that exists.
func TestSnapshotKeepsPendingTerritoryOutOfZonasButInTheTotal(t *testing.T) {
	root, commit := repoGit(t)
	huerfana := abierta("S9", "")
	huerfana.ImportacionLegacy = &ImportacionLegacy{TerritorioPendiente: true}
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{entregada("S1", "hosts", commit), huerfana},
	}

	s := p.SnapshotAt(root, commit)
	if s.Avance.Total != 2 {
		t.Fatalf("el total debe contar la Sesión sin Zona: %#v", s.Avance)
	}
	if s.Zonas[0].Total != 1 {
		t.Fatalf("la Zona no debe contar territorio pendiente: %#v", s.Zonas[0])
	}
	if s.TerritorioPendiente != 1 {
		t.Fatalf("el snapshot debe declarar cuántas Sesiones no tienen Zona, dijo %d", s.TerritorioPendiente)
	}
}

// The CLI is the only surface a report can reach; a snapshot that Radar can
// compute but not emit is not usable by anyone.
func TestCmdStatusJSONEmitsTheSnapshot(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts", Rutas: []string{"tracked.txt"}}},
		Sesiones: []Sesion{completa("S1", "hosts", commit), pendiente("S2", "hosts", "S1")},
	}

	var out strings.Builder
	if err := cmdStatusJSON(&out, p, root); err != nil {
		t.Fatalf("status --json falló: %v", err)
	}

	var decoded Snapshot
	if err := json.Unmarshal([]byte(out.String()), &decoded); err != nil {
		t.Fatalf("la salida no es JSON válido: %v\n%s", err, out.String())
	}
	if decoded.Schema != SnapshotSchema || decoded.Avance.Total != 2 {
		t.Fatalf("snapshot emitido inesperado: %#v", decoded)
	}
	if len(decoded.Zonas) != 1 || decoded.Zonas[0].Cerradas != 1 {
		t.Fatalf("el snapshot emitido perdió el avance por Zona: %#v", decoded.Zonas)
	}
}

// Numbers Radar would not stand behind must never reach a consumer: a report
// that renders them turns invalid data into a published fact.
func TestCmdStatusJSONRefusesInvalidData(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{entregada("S1", "hosts", commit)},
	}

	var out strings.Builder
	err := cmdStatusJSON(&out, p, root)
	if err == nil {
		t.Fatal("una zona sin rutas debe impedir emitir el snapshot")
	}
	if out.Len() != 0 {
		t.Fatalf("no debe emitirse nada cuando la validación falla, salió %q", out.String())
	}
}

func TestSnapshotExponeLasPrioridadesSinCambiarSuEsquema(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto:    "control-tower",
		Zonas:       []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Prioridades: []Prioridad{{ID: "a", Nombre: "A"}, {ID: "b", Nombre: "B"}},
		Sesiones:    []Sesion{conPrioridad(abierta("S1", "hosts"), "a"), conPrioridad(abierta("S2", "hosts"), "b")},
	}
	raw, err := json.Marshal(p.SnapshotAt(root, commit))
	if err != nil {
		t.Fatal(err)
	}
	var decoded Snapshot
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Schema != SnapshotSchema {
		t.Fatalf("las prioridades no cambian el esquema, dijo %q", decoded.Schema)
	}
	if decoded.PrioridadActiva == nil || decoded.PrioridadActiva.ID != "a" || decoded.PrioridadActiva.Nombre != "A" {
		t.Fatalf("el snapshot debe exponer la prioridad activa: %s", raw)
	}
	if len(decoded.Prioridades) != 2 || decoded.Prioridades[1].ID != "b" {
		t.Fatalf("el snapshot debe exponer la lista ordenada: %s", raw)
	}
	if decoded.Sesiones[0].Prioridad != "a" || decoded.Sesiones[1].Prioridad != "b" || decoded.Sesiones[1].Estado != "DIFERIDO" {
		t.Fatalf("cada Sesión debe llevar su prioridad y su estado calculado: %s", raw)
	}
}

func TestSnapshotSinPrioridadesNoAgregaCampos(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{Producto: "control-tower", Zonas: []Zona{{ID: "hosts", Nombre: "Hosts"}}, Sesiones: []Sesion{abierta("S1", "hosts")}}
	raw, err := json.Marshal(p.SnapshotAt(root, commit))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "prioridad") {
		t.Fatalf("un plan sin prioridades no agrega campos al snapshot: %s", raw)
	}
}

// completa and pendiente build Sesiones that satisfy the whole checker, so the
// emission tests exercise the real refusal path instead of bypassing it.
func completa(id, zona, commit string, deps ...string) Sesion {
	s := pendiente(id, zona, deps...)
	s.Entrega = &Entrega{Commit: commit}
	return s
}

func pendiente(id, zona string, deps ...string) Sesion {
	return Sesion{
		ID:        id,
		Zona:      zona,
		Resultado: "Resultado observable de " + id,
		Autoridad: Autoridad{Texto: "openspec/changes/ejemplo/tasks.md"},
		DependeDe: deps,
		Criterios: []string{"Criterio binario verificable"},
		Ruta:      RutaSesion{Propuesta: "direct", Autoridad: "openspec/changes/ejemplo/tasks.md"},
		Modulos: []Modulo{{
			ID:        "M" + strings.TrimPrefix(id, "S") + ".1",
			Resultado: "Módulo observable de " + id,
			Rutas:     []string{"tracked.txt"},
			Tareas: []Tarea{{
				ID:        "T" + strings.TrimPrefix(id, "S") + ".1.1",
				Accion:    "Ejecutar la acción atómica de " + id,
				Resultado: "Resultado atómico de " + id,
				Criterios: []string{"Criterio binario verificable"},
			}},
		}},
	}
}

// --- S145: the machine side of the roadmap ---------------------------------

// Criterion 11: Main consumes facts, never prose. Every declaration the human
// view reasons about has to be reachable from the canonical JSON projection.
func TestSnapshotExponeLasDeclaracionesDeCadaSesion(t *testing.T) {
	root, commit := repoGit(t)
	s := abierta("S2", "metodo", "S1")
	s.Archivos = []string{"radar/roadmap.go", "radar/main.go"}
	s.Cimientos = []string{"shared/base.go"}
	s.Recurso = []string{"raíz Pi"}
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "metodo", Nombre: "Método"}},
		Sesiones: []Sesion{entregada("S1", "metodo", commit), s},
	}

	var encontrada *SesionEstado
	for i, ses := range p.SnapshotAt(root, commit).Sesiones {
		if ses.ID == "S2" {
			encontrada = &p.SnapshotAt(root, commit).Sesiones[i]
		}
	}
	if encontrada == nil {
		t.Fatal("S2 debe estar en el snapshot")
	}
	// Sorted, so a consumer can compare two declarations without normalising.
	if !reflect.DeepEqual(encontrada.Archivos, []string{"radar/main.go", "radar/roadmap.go"}) {
		t.Fatalf("archivos esperados ordenados, obtenido %v", encontrada.Archivos)
	}
	if !reflect.DeepEqual(encontrada.Cimientos, []string{"shared/base.go"}) {
		t.Fatalf("cimientos inesperados: %v", encontrada.Cimientos)
	}
	if !reflect.DeepEqual(encontrada.Recurso, []string{"raíz Pi"}) {
		t.Fatalf("recurso inesperado: %v", encontrada.Recurso)
	}
	if !reflect.DeepEqual(encontrada.DependeDe, []string{"S1"}) {
		t.Fatalf("depende_de inesperado: %v", encontrada.DependeDe)
	}
}

// The pairwise verdicts are a result, so they belong in the machine projection
// and not only in the rendered page.
func TestSnapshotExponeLosParesDeCompatibilidad(t *testing.T) {
	root, commit := repoGit(t)
	a := abierta("S1", "metodo")
	a.Archivos = []string{"radar/state.go"}
	b := abierta("S2", "metodo")
	b.Archivos = []string{"radar/state.go"}
	p := &Plan{Producto: "control-tower", Zonas: []Zona{{ID: "metodo"}}, Sesiones: []Sesion{a, b}}

	s := p.SnapshotAt(root, commit)
	if len(s.Compatibilidad) != 1 {
		t.Fatalf("se esperaba un par, hay %d: %#v", len(s.Compatibilidad), s.Compatibilidad)
	}
	par := s.Compatibilidad[0]
	if par.Clase != string(SolapaArchivos) || par.A != "S1" || par.B != "S2" {
		t.Fatalf("par inesperado: %#v", par)
	}
	if !reflect.DeepEqual(par.Detalle, []string{"radar/state.go"}) {
		t.Fatalf("el par debe cargar su evidencia exacta: %v", par.Detalle)
	}
}

func TestSnapshotExponeLosEscenarios(t *testing.T) {
	root, commit := repoGit(t)
	dep := abierta("S2", "hosts", "S1")
	dep.Archivos = []string{"b.go"}
	a := abierta("S1", "metodo")
	a.Archivos = []string{"a.go"}
	p := &Plan{Producto: "control-tower", Zonas: []Zona{{ID: "metodo"}, {ID: "hosts"}}, Sesiones: []Sesion{a, dep}}

	s := p.SnapshotAt(root, commit)
	if len(s.Escenarios) != 1 {
		t.Fatalf("se esperaba un escenario, hay %d: %#v", len(s.Escenarios), s.Escenarios)
	}
	if s.Escenarios[0].Si != "S1" || !reflect.DeepEqual(s.Escenarios[0].QuedanListo, []string{"S2"}) {
		t.Fatalf("escenario inesperado: %#v", s.Escenarios[0])
	}
}

// The wire contract only grows. The schema keeps its version, every field that
// was already there keeps its name, and the new ones disappear when empty.
func TestSnapshotConservaElContratoV1YSoloCrece(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "metodo", Nombre: "Método"}},
		Sesiones: []Sesion{entregada("S1", "metodo", commit)},
	}

	crudo, err := json.Marshal(p.SnapshotAt(root, commit))
	if err != nil {
		t.Fatal(err)
	}
	var wire map[string]any
	if err := json.Unmarshal(crudo, &wire); err != nil {
		t.Fatal(err)
	}
	if wire["schema"] != SnapshotSchema {
		t.Fatalf("el schema no cambia de versión al crecer: %v", wire["schema"])
	}
	for _, campo := range []string{"producto", "head", "avance", "zonas", "sesiones", "asientos", "territorio_pendiente"} {
		if _, hay := wire[campo]; !hay {
			t.Fatalf("el campo v1 %q desapareció del contrato", campo)
		}
	}
	// Nothing to say, nothing emitted: a closed plan does not grow the payload.
	for _, campo := range []string{"compatibilidad", "escenarios"} {
		if _, hay := wire[campo]; hay {
			t.Fatalf("%q debe omitirse cuando está vacío", campo)
		}
	}
	sesiones := wire["sesiones"].([]any)
	primera := sesiones[0].(map[string]any)
	for _, campo := range []string{"archivos", "cimientos", "recurso", "depende_de"} {
		if _, hay := primera[campo]; hay {
			t.Fatalf("%q debe omitirse cuando la Sesión no lo declara", campo)
		}
	}
}

// --- S214: the machine side of the unattended states ------------------------

func TestSnapshotExponeLosEstadosDelPiloto(t *testing.T) {
	root, head := repoGit(t)
	commit := ramaVueloConCommit(t, root, "piloto/2026-10-08/vuelo-v1", "s1.txt")
	testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoCierre, Commit: commit, Ronda: 1, Decisiones: 1})
	testMarcaPiloto(t, root, "S2", marcaPiloto{Vuelo: "v2", Rama: "refs/heads/piloto/2026-10-08/vuelo-v2", Estado: pilotoNovedad, Motivo: MotivoDecisionDelicada, Ronda: 1})
	p := &Plan{Producto: "control-tower", Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z")}}

	s := p.SnapshotAt(root, head)
	porID := map[string]SesionEstado{}
	for _, ses := range s.Sesiones {
		porID[ses.ID] = ses
	}
	if got := porID["S1"]; got.Estado != "POR REVISAR" || got.NotaRevision != "con 1 decisión anotada" || got.Vuelo != "v1" {
		t.Fatalf("POR REVISAR mal expuesto: %#v", got)
	}
	if got := porID["S2"]; got.Estado != "NOVEDAD" || got.MotivoNovedad != MotivoDecisionDelicada || got.Vuelo != "v2" {
		t.Fatalf("NOVEDAD mal expuesta: %#v", got)
	}
	if s.Avance.PorRevisar != 1 || s.Avance.Novedad != 1 {
		t.Fatalf("el avance debe contar el trabajo sin revisar: %#v", s.Avance)
	}
}

func TestSnapshotOmiteLosCamposDelPilotoSinEvidencia(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{Producto: "control-tower", Zonas: []Zona{{ID: "z", Nombre: "Z"}}, Sesiones: []Sesion{entregada("S1", "z", commit)}}
	raw, err := json.Marshal(p.SnapshotAt(root, commit))
	if err != nil {
		t.Fatal(err)
	}
	for _, campo := range []string{"motivo_novedad", "nota_revision", "vuelo", "por_revisar", "novedad"} {
		if strings.Contains(string(raw), campo) {
			t.Fatalf("%q debe omitirse sin evidencia del piloto: %s", campo, raw)
		}
	}
}

func TestSnapshotReportaMarcasDePilotoInvalidas(t *testing.T) {
	root, head := repoGit(t)
	path := testMarcaPiloto(t, root, "S1", marcaPiloto{Vuelo: "v1", Rama: "refs/heads/piloto/2026-10-08/vuelo-v1", Estado: pilotoEnCurso, Ronda: 1})
	if err := os.WriteFile(path, []byte(`{"schema":"otro"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z")}}
	if snap := p.SnapshotAt(root, head); len(snap.PilotosInvalidos) != 1 || snap.PilotosInvalidos[0] != "S1" {
		t.Fatalf("una marca inválida debe reportarse, no otorgar estado: %#v", snap)
	}
}
