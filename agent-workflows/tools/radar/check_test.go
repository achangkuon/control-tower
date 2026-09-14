package main

import (
	"os"
	"path/filepath"
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

	if len(hallazgosDe(p.checkSesiones(""), "sesión")) == 0 {
		t.Error("una Sesión en una zona que no existe debería fallar")
	}
}

func TestSesionAbiertaSinCriteriosFalla(t *testing.T) {
	p := &Plan{
		Zonas:    []Zona{{ID: "hosts", Rutas: []string{"hosts/"}}},
		Sesiones: []Sesion{{ID: "S1", Zona: "hosts"}},
	}

	if len(hallazgosDe(p.checkSesiones(""), "criterios binarios")) != 1 {
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

	if len(hallazgosDe(p.checkSesiones(""), "criterios binarios")) != 0 {
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
	root, _ := repoGit(t)
	p := &Plan{
		Cimientos: Cimientos{Rutas: []string{"package.json"}},
		Sesiones:  []Sesion{{ID: "S1", Zona: "z", Cimientos: []string{"hosts/claude.mjs"}}},
	}

	if len(hallazgosDe(p.checkCimientos(root), "reserva de cimientos")) != 1 {
		t.Error("reservar algo que no es cimiento significa que la partición no sabe que es compartido")
	}
}

func TestReservaDeCimientoDebeSerUnArchivoExacto(t *testing.T) {
	root, _ := repoGit(t)
	p := &Plan{
		Cimientos: Cimientos{Rutas: []string{"scripts/"}},
		Sesiones:  []Sesion{{ID: "S1", Zona: "cimientos", Cimientos: []string{"scripts/"}}},
	}

	if len(hallazgosDe(p.checkCimientos(root), "reserva de cimientos")) != 1 {
		t.Error("una reserva amplia permitiría bloquear o editar más de un archivo como si fuera una unidad")
	}
}

func TestReglaAmpliaDeCimientosClasificaUnaReservaExacta(t *testing.T) {
	root, _ := repoGit(t)
	p := &Plan{
		Cimientos: Cimientos{Rutas: []string{"scripts/"}},
		Sesiones:  []Sesion{{ID: "S1", Zona: "cimientos", Cimientos: []string{"scripts/check.sh"}}},
	}

	if got := hallazgosDe(p.checkCimientos(root), "reserva de cimientos"); len(got) != 0 {
		t.Fatalf("la clasificación puede ser amplia aunque la reserva sea un archivo exacto; fue %#v", got)
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

func TestCimientoExactoRecortaUnaRutaAmpliaDeZona(t *testing.T) {
	p := &Plan{
		Zonas:     []Zona{{ID: "instalacion", Rutas: []string{"install/"}}},
		Cimientos: Cimientos{Rutas: []string{"install/runtime-payload.mjs"}},
	}

	got := p.owners("install/runtime-payload.mjs")
	if len(got) != 1 || got[0].Kind != "cimientos" {
		t.Fatalf("el Cimiento exacto debería recortar la ruta amplia de una Zona; fue %#v", got)
	}
}

func TestCimientoExactoNoOcultaSolapeEntreZonas(t *testing.T) {
	p := &Plan{
		Zonas: []Zona{
			{ID: "instalacion", Rutas: []string{"install/"}},
			{ID: "runtime", Rutas: []string{"install/*.mjs"}},
		},
		Cimientos: Cimientos{Rutas: []string{"install/runtime-payload.mjs"}},
	}

	got := p.owners("install/runtime-payload.mjs")
	if len(got) != 2 || got[0].Kind != "zona" || got[1].Kind != "zona" {
		t.Fatalf("un Cimiento no debe ocultar el solape real de dos Zonas; fue %#v", got)
	}
}

func TestZonaCimientosEsDomicilioValidoConReservaExacta(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{{
		ID: "S1", Zona: "cimientos", Cimientos: []string{"core.mjs"}, Criterios: []string{"x"},
	}}}

	if got := hallazgosDe(p.checkSesiones(""), "sesión"); len(got) != 0 {
		t.Fatalf("zona: cimientos debería ser válida sin declarar una Zona permanente; fue %#v", got)
	}
}

func TestZonaCimientosSinReservaFalla(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{{ID: "S1", Zona: "cimientos", Criterios: []string{"x"}}}}

	if got := hallazgosDe(p.checkSesiones(""), "sesión"); len(got) != 1 {
		t.Fatalf("zona: cimientos sin ningún archivo reservado no describe un resultado de Cimientos; fue %#v", got)
	}
}

func TestLoadRechazaDocumentosYContenidoYAMLPosteriores(t *testing.T) {
	dir := t.TempDir()
	archivo := filepath.Join(dir, "plan.yaml")
	raw := "schema: plan\nschema_version: 1\nproducto: prueba\n---\nschema: plan\nschema_version: 1\nproducto: oculto\n"
	if err := os.WriteFile(archivo, []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}

	if p, err := Load(archivo); err == nil {
		t.Fatalf("un segundo documento YAML no puede ignorarse; se cargó %#v", p)
	}
}

func TestLoadAceptaReemplazaComoListaYMantieneParserEstricto(t *testing.T) {
	casos := []struct {
		nombre string
		campo  string
		falla  bool
	}{
		{"lista válida", "reemplaza: [S0]", false},
		{"escalar inválido", "reemplaza: S0", true},
		{"campo desconocido", "reemplazo: [S0]", true},
	}

	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			dir := t.TempDir()
			archivo := filepath.Join(dir, "plan.yaml")
			raw := "schema: plan\nschema_version: 3\nproducto: prueba\nsesiones:\n  - id: S1\n    " + c.campo + "\n"
			if err := os.WriteFile(archivo, []byte(raw), 0o600); err != nil {
				t.Fatal(err)
			}
			p, err := Load(archivo)
			if c.falla {
				if err == nil {
					t.Fatalf("%s debería rechazarse; se cargó %#v", c.campo, p)
				}
				return
			}
			if err != nil {
				t.Fatalf("una lista reemplaza válida debería parsearse: %v", err)
			}
			if len(p.Sesiones[0].Reemplaza) != 1 || p.Sesiones[0].Reemplaza[0] != "S0" {
				t.Fatalf("reemplaza no conservó la lista: %#v", p.Sesiones[0].Reemplaza)
			}
		})
	}
}

func TestLinajeValidoAdmiteVariosReemplazosDelMismoOriginal(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{
		{ID: "S5.14", Archivada: true},
		{ID: "S100", Zona: "contratos", Criterios: []string{"x"}, Reemplaza: []string{"S5.14"}},
		{ID: "S101", Zona: "capacidades", Criterios: []string{"x"}, Reemplaza: []string{"S5.14"}},
	}}

	if got := p.checkLinaje(); len(got) != 0 {
		t.Fatalf("varias Sesiones activas pueden reemplazar la misma original archivada; fue %#v", got)
	}
}

func TestLinajeRechazaReferenciasInvalidas(t *testing.T) {
	casos := []struct {
		nombre string
		plan   *Plan
		minimo int
		regla  string
	}{
		{"referencia inexistente", &Plan{Sesiones: []Sesion{{ID: "S1", Reemplaza: []string{"S99"}}}}, 1, "linaje"},
		{"autorreferencia", &Plan{Sesiones: []Sesion{{ID: "S1", Reemplaza: []string{"S1"}}}}, 1, "linaje"},
		{"reemplazo archivado", &Plan{Sesiones: []Sesion{{ID: "S0", Archivada: true}, {ID: "S1", Archivada: true, Reemplaza: []string{"S0"}}}}, 1, "linaje"},
		{"original activa", &Plan{Sesiones: []Sesion{{ID: "S0"}, {ID: "S1", Reemplaza: []string{"S0"}}}}, 1, "linaje"},
	}

	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			if got := len(hallazgosDe(c.plan.checkLinaje(), c.regla)); got < c.minimo {
				t.Fatalf("quería al menos %d hallazgo(s) de %q; obtuvo %d", c.minimo, c.regla, got)
			}
		})
	}
}

func TestLinajeCircularSeReporta(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{
		{ID: "S1", Reemplaza: []string{"S2"}},
		{ID: "S2", Reemplaza: []string{"S1"}},
	}}

	if got := hallazgosDe(p.checkLinaje(), "linaje circular"); len(got) == 0 {
		t.Fatal("un ciclo de reemplazos debe reportarse aunque otras reglas de archivo también fallen")
	}
}

func TestDependenciaActivaNoPuedeApuntarAOriginalReemplazada(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{
		{ID: "S1", Archivada: true},
		{ID: "S2", Zona: "contratos", Reemplaza: []string{"S1"}},
		{ID: "S3", Zona: "entrega", DependeDe: []string{"S1"}},
	}}

	got := hallazgosDe(p.checkGrafo(), "dependencias reemplazadas")
	if len(got) != 1 || !strings.Contains(got[0].Detalle, "S2") {
		t.Fatalf("la dependencia debe exigir rewire explícito hacia la sucesora; fue %#v", got)
	}
}

func TestDependenciaReescritaHaciaReemplazoEsValida(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{
		{ID: "S1", Archivada: true},
		{ID: "S2", Zona: "contratos", Reemplaza: []string{"S1"}},
		{ID: "S3", Zona: "entrega", DependeDe: []string{"S2"}},
	}}

	if got := hallazgosDe(p.checkGrafo(), "dependencias reemplazadas"); len(got) != 0 {
		t.Fatalf("una dependencia reescrita hacia la sucesora no debe fallar; fue %#v", got)
	}
}

func TestOriginalArchivadaSinReemplazoSigueCerrandoDependenciasHistoricas(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{
		{ID: "S1", Archivada: true},
		{ID: "S2", Zona: "entrega", DependeDe: []string{"S1"}},
	}}

	if got := hallazgosDe(p.checkGrafo(), "dependencias reemplazadas"); len(got) != 0 {
		t.Fatalf("una original archivada sin sucesoras conserva la semántica histórica; fue %#v", got)
	}
}

func detallesDe(h []Hallazgo) string {
	var partes []string
	for _, x := range h {
		partes = append(partes, x.Detalle)
	}
	return strings.Join(partes, " | ")
}

func TestPrioridadesValidasNoReportanErrores(t *testing.T) {
	p := &Plan{
		Prioridades: []Prioridad{{ID: "a", Nombre: "A"}, {ID: "b", Nombre: "B"}},
		Sesiones:    []Sesion{{ID: "S1", Prioridad: "a"}, {ID: "S2", Prioridad: "b", DependeDe: []string{"S1"}}},
	}
	if got := hallazgosDe(p.checkPrioridades(), "prioridades"); len(got) != 0 {
		t.Fatalf("una lista válida no debe fallar; fue %#v", got)
	}
}

func TestListaDePrioridadesFallaCerrada(t *testing.T) {
	casos := []struct {
		nombre      string
		prioridades []Prioridad
		menciona    string
	}{
		{"id vacío", []Prioridad{{ID: " ", Nombre: "A"}}, "sin id"},
		{"id duplicado", []Prioridad{{ID: "a", Nombre: "A"}, {ID: "a", Nombre: "Otra"}}, `"a"`},
		{"nombre vacío", []Prioridad{{ID: "a", Nombre: ""}}, `"a"`},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			p := &Plan{Prioridades: c.prioridades}
			got := hallazgosDe(p.checkPrioridades(), "prioridades")
			if len(got) == 0 || !strings.Contains(detallesDe(got), c.menciona) {
				t.Fatalf("%s debe fallar mencionando %s; fue %#v", c.nombre, c.menciona, got)
			}
		})
	}
}

func TestPrioridadSinListaFalla(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{{ID: "S2", Prioridad: "a"}}}
	if got := hallazgosDe(p.checkPrioridades(), "prioridades"); len(got) != 1 || !strings.Contains(got[0].Detalle, "S2") {
		t.Fatalf("una prioridad sin lista declarada debe fallar nombrando S2; fue %#v", got)
	}
}

func TestSesionAbiertaDebeDeclararUnaPrioridadConocida(t *testing.T) {
	lista := []Prioridad{{ID: "a", Nombre: "A"}}
	sinPrioridad := &Plan{Prioridades: lista, Sesiones: []Sesion{{ID: "S2"}}}
	if got := hallazgosDe(sinPrioridad.checkPrioridades(), "prioridades"); len(got) != 1 || !strings.Contains(got[0].Detalle, "S2") {
		t.Fatalf("una Sesión abierta sin prioridad debe fallar nombrándola; fue %#v", got)
	}
	desconocida := &Plan{Prioridades: lista, Sesiones: []Sesion{{ID: "S2", Prioridad: "z"}}}
	got := hallazgosDe(desconocida.checkPrioridades(), "prioridades")
	if len(got) != 1 || !strings.Contains(got[0].Detalle, "S2") || !strings.Contains(got[0].Detalle, `"z"`) {
		t.Fatalf("una prioridad desconocida debe fallar nombrando S2 y z; fue %#v", got)
	}
}

func TestSesionCerradaPuedeOmitirPrioridad(t *testing.T) {
	p := &Plan{
		Prioridades: []Prioridad{{ID: "a", Nombre: "A"}},
		Sesiones: []Sesion{
			{ID: "S1", Entrega: &Entrega{Commit: strings.Repeat("a", 40)}},
			{ID: "S2", Archivada: true},
			{ID: "S3", Archivada: true, Prioridad: "retirada"},
		},
	}
	if got := hallazgosDe(p.checkPrioridades(), "prioridades"); len(got) != 0 {
		t.Fatalf("una Sesión entregada o archivada puede omitir prioridad o conservar una ya retirada; fue %#v", got)
	}
}

func TestDependenciaHaciaUnaPrioridadPosteriorFalla(t *testing.T) {
	p := &Plan{
		Prioridades: []Prioridad{{ID: "a", Nombre: "A"}, {ID: "b", Nombre: "B"}},
		Sesiones:    []Sesion{{ID: "S1", Prioridad: "a", DependeDe: []string{"S2"}}, {ID: "S2", Prioridad: "b"}},
	}
	got := hallazgosDe(p.checkPrioridades(), "prioridades")
	if len(got) != 1 || !strings.Contains(got[0].Detalle, "S1") || !strings.Contains(got[0].Detalle, "S2") {
		t.Fatalf("depender de una prioridad posterior debe fallar nombrando S1 y S2; fue %#v", got)
	}
}

func TestCheckIncluyeLasReglasDePrioridad(t *testing.T) {
	root, head := repoGit(t)
	p := &Plan{Sesiones: []Sesion{{ID: "S2", Prioridad: "a"}}}
	if got := hallazgosDe(p.CheckAt(root, head), "prioridades"); len(got) == 0 {
		t.Fatal("radar check debe aplicar las reglas de prioridad")
	}
}
