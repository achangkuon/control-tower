package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestArchivedHistoryUsesIntegratedMainNotCurrentHEAD(t *testing.T) {
	root, plan, head, _ := archiveFixture(t)
	if fixtureGit(t, root, "symbolic-ref", "--short", "HEAD") != "master" {
		fixtureGit(t, root, "branch", "-m", "master")
	}
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	fixtureGit(t, root, "branch", "-m", "main")
	fixtureGit(t, root, "switch", "-qc", "work", head)
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	if got := hallazgosDe(p.checkSesionesAt(root, head), "histórico"); len(got) != 0 {
		t.Fatalf("archived evidence on local main rejected: %+v", got)
	}
}

func TestArchivedHistoryRejectsNoIntegratedBranch(t *testing.T) {
	root, plan, head, _ := archiveFixture(t)
	if fixtureGit(t, root, "symbolic-ref", "--short", "HEAD") != "master" {
		fixtureGit(t, root, "branch", "-m", "master")
	}
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	fixtureGit(t, root, "branch", "-m", "work")
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	findings := hallazgosDe(p.checkSesionesAt(root, head), "histórico")
	if len(findings) == 0 || !strings.Contains(findings[0].Detalle, "main") {
		t.Fatalf("missing integrated branch should explain local main/master requirement: %+v", findings)
	}
}

func TestArchivedHistoryRejectsAmbiguousIntegratedBranches(t *testing.T) {
	root, plan, head, _ := archiveFixture(t)
	if fixtureGit(t, root, "symbolic-ref", "--short", "HEAD") != "master" {
		fixtureGit(t, root, "branch", "-m", "master")
	}
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	fixtureGit(t, root, "branch", "main")
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	if p.EstadosAt(root, head)["S1"] != Bloqueado {
		t.Fatal("ambiguous integrated branches must block archived completion")
	}
	findings := hallazgosDe(p.checkSesionesAt(root, head), "histórico")
	if len(findings) == 0 || !strings.Contains(findings[0].Detalle, "origin/HEAD") {
		t.Fatalf("ambiguous integrated branches must produce an actionable finding: %+v", findings)
	}
}

func TestArchivedHistoryStillReceivesCompletedSessionValidation(t *testing.T) {
	for _, tc := range []struct {
		name, old, replacement, rule string
	}{
		{"empty result", "    resultado: Finished\n", "    resultado: \"   \"\n", "resultado"},
		{"missing authority", "    autoridad: repo evidence\n", "    autoridad: \"\"\n", "autoridad de Sesión"},
		{"invalid zone", "    zona: method\n", "    zona: fabricated\n", "sesión"},
		{"invalid PR", "    entrega:\n", "    entrega:\n      pr: 0\n", "entrega"},
		{"incomplete brief", "    resultado: Finished\n", "    resultado: Finished\n    encargo:\n      pedido_contexto: preserved\n", "encargo"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root, plan, head, _ := archiveFixture(t)
			replacePlan(t, plan, "    resultado: Finished\n", "    resultado: Finished\n    autoridad: repo evidence\n")
			replacePlan(t, plan, "sesiones:\n", "zonas:\n  - id: method\n    rutas: [tracked.txt]\nsesiones:\n")
			if err := archiveSession(plan, root, "S1"); err != nil {
				t.Fatal(err)
			}
			archive := filepath.Join(root, "openspec", "archive", "sesiones", "S1.md")
			p, err := Load(plan)
			if err != nil {
				t.Fatal(err)
			}
			for _, finding := range hallazgosDe(p.checkSesionesAt(root, head), tc.rule) {
				if strings.Contains(finding.Detalle, "S1") {
					t.Fatalf("valid archive already fails %s: %+v", tc.rule, finding)
				}
			}
			replacePlan(t, archive, tc.old, tc.replacement)
			p, err = Load(plan)
			if err != nil {
				t.Fatalf("tampered shape should load for validation: %v", err)
			}
			for _, finding := range hallazgosDe(p.checkSesionesAt(root, head), tc.rule) {
				if finding.Severidad == "error" && strings.Contains(finding.Detalle, "S1") {
					return
				}
			}
			t.Fatalf("archived S1 lost %s validation", tc.rule)
		})
	}
}

func TestArchivedBriefKeepsShapeButNotLiveOwnership(t *testing.T) {
	root, plan, head, _ := archiveFixture(t)
	replacePlan(t, plan, "sesiones:\n", "zonas:\n  - id: method\n    rutas: [tracked.txt]\nsesiones:\n")
	replacePlan(t, plan, "    resultado: Finished\n", "    resultado: Finished\n    autoridad: repo evidence\n    archivos: [tracked.txt]\n    encargo:\n      pedido_contexto: context\n      resultado_comportamiento: behavior\n      restricciones_decisiones: constraints\n      referencias: refs\n")
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	// Later ownership changes do not revoke historical authorizations.
	replacePlan(t, plan, "rutas: [tracked.txt]", "rutas: [new.txt]")
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	for _, rule := range []string{"autoridad de archivo", "archivo autorizado", "encargo"} {
		for _, finding := range hallazgosDe(p.checkSesionesAt(root, head), rule) {
			if strings.Contains(finding.Detalle, "S1") {
				t.Fatalf("historical S1 failed %s after ownership moved: %+v", rule, finding)
			}
		}
	}
}

func TestArchivedReferenceCheckRejectsLostHistoryAndDuplicateID(t *testing.T) {
	root, plan, _, _ := archiveFixture(t)
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	head, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	if got := hallazgosDe(p.checkSesionesAt(root, head), "histórico"); len(got) != 0 {
		t.Fatalf("valid historical reference rejected: %+v", got)
	}
	p.Sesiones = append(p.Sesiones, p.Sesiones[0])
	if got := hallazgosDe(p.checkSesionesAt(root, head), "sesión"); len(got) == 0 {
		t.Fatal("duplicate archived ID accepted")
	}
	p.Sesiones = p.Sesiones[:2]
	archive := filepath.Join(root, "openspec", "archive", "sesiones", "S1.md")
	if err := os.Rename(archive, archive+".away"); err != nil {
		t.Fatal(err)
	}
	if got := hallazgosDe(p.checkSesionesAt(root, head), "histórico"); len(got) == 0 {
		t.Fatal("missing history accepted")
	}
}

func TestArchivedModulesKeepShapeWhenFormerFileBecomesSymlink(t *testing.T) {
	root, plan, head, _ := archiveFixture(t)
	replacePlan(t, plan, "sesiones:\n", "zonas:\n  - id: method\n    rutas: [tracked.txt]\nsesiones:\n")
	replacePlan(t, plan, "    resultado: Finished\n", "    resultado: Finished\n    autoridad: repo evidence\n    modulos:\n      - id: M1.1\n        resultado: module\n        rutas: [tracked.txt]\n        tareas:\n          - id: T1.1.1\n            accion: do\n            resultado: done\n            criterios: [done]\n")
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	if err := os.Rename(filepath.Join(root, "tracked.txt"), filepath.Join(root, "old.txt")); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink("old.txt", filepath.Join(root, "tracked.txt")); err != nil {
		t.Fatal(err)
	}
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	for _, finding := range hallazgosDe(p.checkSesionesAt(root, head), "ruta de Módulo") {
		if strings.Contains(finding.Detalle, "M1.1") {
			t.Fatalf("historical module path treated as live write target: %+v", finding)
		}
	}
}

func TestArchivedReferenceRejectsHistoryChangedSinceLoad(t *testing.T) {
	root, plan, head, _ := archiveFixture(t)
	replacePlan(t, plan, "    resultado: Finished\n", "    resultado: Finished\n    autoridad: repo evidence\n")
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	archive := filepath.Join(root, "openspec", "archive", "sesiones", "S1.md")
	replacePlan(t, archive, "autoridad: repo evidence", "autoridad: different evidence")
	if got := hallazgosDe(p.checkSesionesAt(root, head), "histórico"); len(got) == 0 {
		t.Fatal("a history changed after Load was accepted from stale memory")
	}
}

func TestArchivedReferenceCheckRejectsInvalidDelivery(t *testing.T) {
	root, plan, _, _ := archiveFixture(t)
	if err := archiveSession(plan, root, "S1"); err != nil {
		t.Fatal(err)
	}
	p, err := Load(plan)
	if err != nil {
		t.Fatal(err)
	}
	p.Sesiones[0].Entrega.Commit = strings.Repeat("f", 40)
	head, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	if got := hallazgosDe(p.checkSesionesAt(root, head), "histórico"); len(got) == 0 {
		t.Fatal("invalid delivery accepted")
	}
}

func commitLote(t *testing.T, root, path, body, message string) string {
	t.Helper()
	file := filepath.Join(root, path)
	if err := os.MkdirAll(filepath.Dir(file), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(file, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{{"add", "--", path}, {"commit", "-qm", message}} {
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

func TestLoteEntregadoMideCadaModulo(t *testing.T) {
	root, _ := repoGit(t)
	commitLote(t, root, "one.txt", "a\nb\nc\n", "first\n\nModulo: M1.1")
	delivery := commitLote(t, root, "two.txt", "d\ne\nf\ng\n", "second\n\nModulo: M1.2")
	p := &Plan{Politica: Politica{TopeDeLote: 2}}
	s := &Sesion{ID: "S1", Entrega: &Entrega{Commit: delivery}, Modulos: []Modulo{{ID: "M1.1"}, {ID: "M1.2"}}}
	h := medirLoteEntregado(p, root, delivery, s)
	if len(h) != 2 || h[0].Severidad != "aviso" || h[1].Severidad != "aviso" ||
		!strings.Contains(h[0].Detalle, "M1.1") || !strings.Contains(h[0].Detalle, "3") ||
		!strings.Contains(h[1].Detalle, "M1.2") || !strings.Contains(h[1].Detalle, "4") {
		t.Fatalf("cada Módulo debe tener su aviso y su medida: %+v", h)
	}
	p.Sesiones = []Sesion{*s}
	if got := hallazgosDe(p.checkSesionesAt(root, delivery), "tope de lote"); len(got) != 2 || got[0].Severidad != "aviso" || got[1].Severidad != "aviso" {
		t.Fatalf("radar check debe publicar avisos, nunca errores: %+v", got)
	}
}

func TestLoteSumaBorradosYExcluyeRutasDeclaradas(t *testing.T) {
	root, _ := repoGit(t)
	commitLote(t, root, "code.txt", "a\nb\nc\n", "start\n\nModulo: M1.1")
	delivery := commitLote(t, root, "code.txt", "a\n", "delete\n\nModulo: M1.1")
	commitLote(t, root, "policy.txt", "p\nq\nr\ns\nt\n", "policy\n\nModulo: M1.1")
	commitLote(t, root, "notes/doc.md", "p\nq\nr\ns\n", "docs\n\nModulo: M1.1")
	head := commitLote(t, root, "notes-sibling/doc.md", "x\ny\nz\n", "other\n\nModulo: M1.1")
	s := &Sesion{ID: "S1", Entrega: &Entrega{Commit: delivery}, Modulos: []Modulo{{ID: "M1.1"}}}
	p := &Plan{Politica: Politica{TopeDeLote: 7, ExcluirDelLote: []string{"policy.txt", "notes/"}}}
	// Three added and two deleted lines plus the sibling's three: 8.
	got := medirLoteEntregado(p, root, head, s)
	if len(got) != 1 || got[0].Severidad != "aviso" || !strings.Contains(got[0].Detalle, "S1, M1.1: 8 líneas medidas; tope 7") {
		t.Fatalf("la exclusión exacta y de prefijo no debe esconder un directorio hermano: %+v", got)
	}
	p.Politica.TopeDeLote = 8
	if got := medirLoteEntregado(p, root, head, s); len(got) != 0 {
		t.Fatalf("el borde exacto no avisa: %+v", got)
	}
	p.Politica.ExcluirDelLote = nil
	p.Politica.TopeDeLote = 16
	if got := medirLoteEntregado(p, root, head, s); len(got) != 1 || !strings.Contains(got[0].Detalle, "17 líneas medidas") {
		t.Fatalf("sin exclusiones se cuenta todo, incluidos borrados: %+v", got)
	}
}

func TestLoteNativoConTrailerSinModulosDeclarados(t *testing.T) {
	root, _ := repoGit(t)
	commitLote(t, root, "first.txt", "a\nb\n", "first\n\nModulo: M1.1")
	delivery := commitLote(t, root, "last.txt", "c\n", "delivery")
	s := &Sesion{ID: "S1", Entrega: &Entrega{Commit: delivery}}
	p := &Plan{Politica: Politica{TopeDeLote: 1}}
	got := medirLoteEntregado(p, root, delivery, s)
	if len(got) != 1 || !strings.Contains(got[0].Detalle, "M1.1: 2 líneas") {
		t.Fatalf("los trailers nativos cuentan aun sin Módulos declarados: %+v", got)
	}
}

func TestLoteSinTrailersUsaEntregaYSinTopeNoMide(t *testing.T) {
	root, _ := repoGit(t)
	delivery := commitLote(t, root, "code.txt", "a\nb\n", "delivery")
	head := commitLote(t, root, "later.txt", "a\nb\nc\nd\n", "later")
	s := &Sesion{ID: "S1", Entrega: &Entrega{Commit: delivery}}
	p := &Plan{Politica: Politica{TopeDeLote: 1}}
	got := medirLoteEntregado(p, root, head, s)
	if len(got) != 1 || got[0].Severidad != "aviso" || !strings.Contains(got[0].Detalle, "S1, sin Módulo: 2 líneas medidas; tope 1") {
		t.Fatalf("la Sesión sin trailers mide sólo su entrega: %+v", got)
	}
	p.Politica.TopeDeLote = 0
	s.Entrega.Commit = "not-a-commit"
	if got := medirLoteEntregado(p, root, head, s); len(got) != 0 {
		t.Fatalf("sin tope no se consulta Git ni se falla: %+v", got)
	}
}

func TestLoteSoloLeeAncestriaDelHeadFijado(t *testing.T) {
	root, base := repoGit(t)
	fixtureGit := func(args ...string) {
		t.Helper()
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
	}
	fixtureGit("switch", "-qc", "outside", base)
	commitLote(t, root, "off.txt", "a\nb\nc\nd\n", "outside\n\nModulo: M1.1")
	fixtureGit("switch", "-q", "-")
	delivery := commitLote(t, root, "inside.txt", "a\n", "inside\n\nModulo: M1.1")
	if err := os.WriteFile(filepath.Join(root, "inside.txt"), []byte("a\nb\nc\nd\ne\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	s := &Sesion{ID: "S1", Entrega: &Entrega{Commit: delivery}, Modulos: []Modulo{{ID: "M1.1"}}}
	p := &Plan{Politica: Politica{TopeDeLote: 1}}
	if got := medirLoteEntregado(p, root, delivery, s); len(got) != 0 {
		t.Fatalf("ni la rama ajena ni el árbol sucio pertenecen al HEAD fijado: %+v", got)
	}
}

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

// An open Sesión (no entrega, not archivada) that depends on a
// satisfied_history id can never become LISTO through that edge: plan.go:253
// documents that satisfied_history never becomes a dependency target, and
// EstadosAt only resolves depende_de against p.SesionPorID(). checkGrafo must
// say so, naming the Sesión and the id, instead of accepting it in silence
// like a future_successors edge.
func TestDependenciaHaciaSatisfiedHistoryEsError(t *testing.T) {
	p := &Plan{
		References: &References{SatisfiedHistory: []SatisfiedHistory{{ID: "S8.10", Reason: "cerrada por evidencia legacy"}}},
		Sesiones:   []Sesion{{ID: "S8.12", Zona: "z", DependeDe: []string{"S8.10"}}},
	}

	got := hallazgosDe(p.checkGrafo(), "dependencias hacia historia satisfecha")
	if len(got) != 1 {
		t.Fatalf("una dependencia viva hacia satisfied_history debe reportarse como error; obtuvo %#v", got)
	}
	if !strings.Contains(got[0].Detalle, "S8.12") || !strings.Contains(got[0].Detalle, "S8.10") {
		t.Fatalf("el hallazgo debe nombrar la Sesión y el id: %q", got[0].Detalle)
	}
}

// A closed Sesión — one with entrega registered — keeps a satisfied_history
// edge silently: satisfied_history exists precisely to close a frozen legacy
// dependency for an imported Sesión that already delivered (migration to
// Zonas, design.md:564), so this is not an authoring error.
func TestDependenciaHaciaSatisfiedHistoryDesdeSesionConEntregaNoEsError(t *testing.T) {
	p := &Plan{
		References: &References{SatisfiedHistory: []SatisfiedHistory{{ID: "S1.9", Reason: "cerrada por evidencia legacy"}}},
		Sesiones:   []Sesion{{ID: "S1.11", Zona: "z", DependeDe: []string{"S1.9"}, Entrega: &Entrega{Commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"}}},
	}

	if got := hallazgosDe(p.checkGrafo(), "dependencias hacia historia satisfecha"); len(got) != 0 {
		t.Fatalf("una Sesión con entrega no debe reportar error al depender de satisfied_history: %#v", got)
	}
}

// A closed Sesión — one marked archivada — keeps a satisfied_history edge
// silently for the same reason: it is closed, not open work waiting on an
// edge that can never resolve.
func TestDependenciaHaciaSatisfiedHistoryDesdeSesionArchivadaNoEsError(t *testing.T) {
	p := &Plan{
		References: &References{SatisfiedHistory: []SatisfiedHistory{{ID: "S2.4", Reason: "cerrada por evidencia legacy"}}},
		Sesiones:   []Sesion{{ID: "S3.1", Zona: "z", DependeDe: []string{"S2.4"}, Archivada: true}},
	}

	if got := hallazgosDe(p.checkGrafo(), "dependencias hacia historia satisfecha"); len(got) != 0 {
		t.Fatalf("una Sesión archivada no debe reportar error al depender de satisfied_history: %#v", got)
	}
}

// A dependency toward a future_successors id keeps today's behavior exactly:
// it is structurally present but grants no readiness, and checkGrafo stays
// silent about it — only checkReferencias owns its shape and cycle rules.
func TestDependenciaHaciaFutureSuccessorsMantieneSilencio(t *testing.T) {
	p := &Plan{
		References: &References{FutureSuccessors: []FutureSuccessor{{ID: "S200", Reason: "sucesora aprobada", Result: "x", Zone: "z"}}},
		Sesiones:   []Sesion{{ID: "S1", Zona: "z", DependeDe: []string{"S200"}}},
	}

	if got := p.checkGrafo(); len(got) != 0 {
		t.Fatalf("una dependencia hacia future_successors no debe reportarse: %#v", got)
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
