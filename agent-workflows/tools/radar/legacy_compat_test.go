package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func legacyFixture(t *testing.T) (string, string, ImportacionLegacy) {
	t.Helper()
	root := t.TempDir()
	git := func(args ...string) string {
		t.Helper()
		out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
		if err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
		return strings.TrimSpace(string(out))
	}
	git("init", "-q")
	git("config", "user.email", "radar@example.test")
	git("config", "user.name", "Radar Test")
	if err := os.MkdirAll(filepath.Join(root, "legacy"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "legacy", "STATUS.md"), []byte("# Plan\n## Sesión 2.10 — Legacy\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	git("add", ".")
	git("commit", "-qm", "legacy")
	commit := git("rev-parse", "HEAD")
	blob := git("rev-parse", "HEAD:legacy/STATUS.md")
	if err := os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("head\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	git("add", ".")
	git("commit", "-qm", "head")
	head := git("rev-parse", "HEAD")
	return root, head, ImportacionLegacy{OrigenCommit: commit, OrigenRuta: "legacy/STATUS.md", OrigenBlob: blob, OrigenEncabezado: "## Sesión 2.10 — Legacy"}
}

func importedSession(prov ImportacionLegacy, pending bool) Sesion {
	prov.TerritorioPendiente = pending
	s := Sesion{ID: "S2.10", Zona: "z", Resultado: "legacy", Autoridad: "approved", Criterios: []string{"binary"}, ImportacionLegacy: &prov,
		Ruta: RutaSesion{Propuesta: "direct", Autoridad: "approved"}, Modulos: []Modulo{{ID: "M2.10.1", Resultado: "module", Rutas: []string{"tracked.txt"}, Tareas: []Tarea{{ID: "T2.10.1.1", Accion: "act", Resultado: "done", Criterios: []string{"binary"}}}}}}
	if pending {
		s.Zona = ""
		s.Ruta = RutaSesion{}
		s.Modulos[0].Rutas = nil
		s.Decisiones = []Decision{{Tipo: "escala", Pregunta: "Where?", Evidencia: "unknown", Checkpoint: "before", Opciones: []Opcion{{Opcion: "find", Consecuencia: "resolve"}}, Clase: "dependencias-o-evidencia-contradictorias", Alcanza: "criterios"}}
	}
	return s
}

func legacyErrors(p *Plan, root, head string) []Hallazgo { return p.checkSesionesAt(root, head) }

func hasLegacyError(h []Hallazgo, rule, detail string) bool {
	for _, finding := range h {
		if finding.Severidad == "error" && finding.Regla == rule && finding.Detalle == detail {
			return true
		}
	}
	return false
}

func TestLegacyImportAcceptsProvenDottedHierarchy(t *testing.T) {
	root, head, prov := legacyFixture(t)
	s := importedSession(prov, false)
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	if h := legacyErrors(p, root, head); len(h) != 0 {
		t.Fatalf("proven import rejected: %#v", h)
	}
}

func TestLegacyImportRejectsUnprovenSourceRow(t *testing.T) {
	root, head, good := legacyFixture(t)
	cases := map[string]func(*ImportacionLegacy){
		"missing": func(p *ImportacionLegacy) { p.OrigenBlob = "" }, "current": func(p *ImportacionLegacy) { p.OrigenCommit = head },
		"blob": func(p *ImportacionLegacy) { p.OrigenBlob = p.OrigenCommit }, "heading": func(p *ImportacionLegacy) { p.OrigenEncabezado = "## Sesión 9.9 — Other" },
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			p := good
			mutate(&p)
			s := importedSession(p, false)
			if len(legacyErrors(&Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}, root, head)) == 0 {
				t.Fatal("unproven row accepted")
			}
		})
	}
	s1, s2 := importedSession(good, false), importedSession(good, false)
	s2.ID = "S3.1"
	if len(legacyErrors(&Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s1, s2}}, root, head)) == 0 {
		t.Fatal("duplicate provenance accepted")
	}
}

func TestOrdinaryRowsCannotUseLegacyIDsOrPendingTerritory(t *testing.T) {
	root, head, prov := legacyFixture(t)
	s := importedSession(prov, false)
	s.ImportacionLegacy = nil
	if len(legacyErrors(&Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}, root, head)) == 0 {
		t.Fatal("ordinary dotted ID accepted")
	}
}

func TestLegacyHierarchyRemainsStructuralAndUnique(t *testing.T) {
	root, head, prov := legacyFixture(t)
	for _, id := range []string{"M2.11.1", "M2.10.01"} {
		t.Run(id, func(t *testing.T) {
			s := importedSession(prov, false)
			s.Modulos[0].ID = id
			if len(legacyErrors(&Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}, root, head)) == 0 {
				t.Fatal("bad hierarchy accepted")
			}
		})
	}
}

func TestPendingTerritoryRequiresBlockingEscalation(t *testing.T) {
	root, head, prov := legacyFixture(t)
	for _, reach := range []string{"", "M2.10.2"} {
		t.Run(reach, func(t *testing.T) {
			s := importedSession(prov, true)
			s.Decisiones[0].Alcanza = reach
			if len(legacyErrors(&Plan{Sesiones: []Sesion{s}}, root, head)) == 0 {
				t.Fatal("nonblocking pending accepted")
			}
		})
	}
}

func TestPendingTerritoryAllowsSourceDeferredZeroTasks(t *testing.T) {
	root, head, prov := legacyFixture(t)
	pending := importedSession(prov, true)
	pending.Decisiones[0].Alcanza = "primer-modulo"
	pending.Modulos[0].Tareas = nil
	if h := legacyErrors(&Plan{Sesiones: []Sesion{pending}}, root, head); len(h) != 0 {
		t.Fatalf("source-deferred pending module rejected: %#v", h)
	}

	cases := map[string]func(*Sesion){
		"ordinary": func(s *Sesion) { s.ImportacionLegacy = nil },
		"resolved import": func(s *Sesion) {
			s.ImportacionLegacy.TerritorioPendiente = false
			s.Zona = "z"
			s.Ruta = RutaSesion{Propuesta: "direct", Autoridad: "approved"}
			s.Modulos[0].Rutas = []string{"tracked.txt"}
		},
		"pending before criteria": func(s *Sesion) { s.Decisiones[0].Alcanza = "criterios" },
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			s := pending
			s.Decisiones = append([]Decision(nil), pending.Decisiones...)
			s.Modulos = append([]Modulo(nil), pending.Modulos...)
			provenance := *pending.ImportacionLegacy
			s.ImportacionLegacy = &provenance
			mutate(&s)
			p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
			h := legacyErrors(p, root, head)
			if !hasLegacyError(h, "jerarquía", "M2.10.1 no tiene Tareas enumeradas") {
				t.Fatalf("missing zero-task hierarchy error: %#v", h)
			}
		})
	}
}

func TestPendingTerritoryRejectsTerritoryAndTerminalFlags(t *testing.T) {
	root, head, prov := legacyFixture(t)
	cases := map[string]func(*Sesion){"zone": func(s *Sesion) { s.Zona = "z" }, "foundation": func(s *Sesion) { s.Cimientos = []string{"x"} }, "path": func(s *Sesion) { s.Modulos[0].Rutas = []string{"x"} }, "route": func(s *Sesion) { s.Ruta.Propuesta = "direct" }, "archive": func(s *Sesion) { s.Archivada = true }, "defer": func(s *Sesion) { s.Diferida = true }}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			s := importedSession(prov, true)
			mutate(&s)
			if len(legacyErrors(&Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}, root, head)) == 0 {
				t.Fatal("invalid pending accepted")
			}
		})
	}
}

func TestPendingTerritoryDerivesBlockedWithoutNewStatus(t *testing.T) {
	_, _, prov := legacyFixture(t)
	s := importedSession(prov, true)
	p := &Plan{Sesiones: []Sesion{s}}
	if got := p.EstadosAt("", "")[s.ID]; got != Bloqueado {
		t.Fatalf("got %s", got)
	}
	if len([]string{Planificado, Listo, EnCurso, Bloqueado, Diferido, Completo, Archivado}) != 7 {
		t.Fatal("status set changed")
	}
}

func TestPendingTerritoryHasNoQueueOwnerSeatOrCapacity(t *testing.T) {
	_, _, prov := legacyFixture(t)
	s := importedSession(prov, true)
	p := &Plan{Sesiones: []Sesion{s}}
	zones, total := p.AvanceAt("", "")
	if len(p.ColaPorZonaAt("", "")) != 0 || len(p.Area(&s)) != 0 || len(p.AsientosAt("", "")) != 0 || len(zones) != 0 || total.Total != 1 {
		t.Fatalf("pending leaked: zones=%v total=%v", zones, total)
	}
}

func TestPendingRenderOmitsTerritoryAndPreservesHierarchy(t *testing.T) {
	_, _, prov := legacyFixture(t)
	s := importedSession(prov, true)
	out := string(RenderAt(&Plan{Producto: "x", Sesiones: []Sesion{s}}, "", ""))
	for _, want := range []string{"S2.10", "M2.10.1", "T2.10.1.1", "territorio pendiente"} {
		if !strings.Contains(out, want) {
			t.Fatalf("missing %q", want)
		}
	}
	if strings.Contains(out, "Zona/Área") || strings.Contains(out, "Rutas: —") {
		t.Fatal("pending territory rendered")
	}
}

func TestResolvedLegacyTerritoryKeepsIdentityAndUsesOrdinaryRules(t *testing.T) {
	root, head, prov := legacyFixture(t)
	s := importedSession(prov, false)
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	if len(legacyErrors(p, root, head)) != 0 || strings.Join(p.ColaPorZonaAt(root, head)["z"], ",") != "S2.10" {
		t.Fatal("resolved import did not use ordinary rules")
	}
}
