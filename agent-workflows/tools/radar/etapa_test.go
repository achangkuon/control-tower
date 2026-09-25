package main

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func testDispatch(t *testing.T, root, id string, ready bool) string {
	t.Helper()
	common, err := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		t.Fatal(err)
	}
	dir := filepath.Join(common, "chanks", "despachos")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	branch, err := gitOutput(root, "symbolic-ref", "--quiet", "HEAD")
	if err != nil {
		t.Fatal(err)
	}
	marker := despacho{Schema: "radar.despacho/v1", Sesion: id, Worker: "implementer-1", Worktree: root, Branch: branch}
	if ready {
		marker.ReviewReady = &reviewWitness{Transport: "intercom", Type: "listo para revisión", MessageID: "msg-123", Sesion: id, ReceivedAt: "2026-09-15T12:00:00Z", Worker: marker.Worker, Worktree: root, Branch: branch}
	}
	data, err := json.Marshal(marker)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, id+".json")
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestEtapaOfreceUnaSolaEtapaSegunContexto(t *testing.T) {
	root, head := repoGit(t)
	incomplete := abierta("S2", "z")
	incomplete.Encargo = &Encargo{Incompleto: true, PedidoContexto: "brief"}
	ready := abierta("S3", "z")
	ready.Encargo = &Encargo{PedidoContexto: "a", ResultadoComportamiento: "b", RestriccionesDecisiones: "c", Referencias: "d"}
	active := abierta("S4", "z")
	active.Encargo = ready.Encargo
	p := &Plan{Zonas: []Zona{{ID: "z", Nombre: "Z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{incomplete, ready, active, entregada("S5", "z", head)}}
	for i := range p.Sesiones {
		p.Sesiones[i].Resultado = "Resultado " + p.Sesiones[i].ID
		p.Sesiones[i].Autoridad = Autoridad{Texto: "openspec/plan.yaml"}
		if p.Sesiones[i].Encargo != nil && !p.Sesiones[i].encargoIncompleto() {
			p.Sesiones[i].Archivos = []string{"tracked.txt"}
		}
	}
	testDispatch(t, root, "S4", false)
	for _, tc := range []struct{ id, stage string }{{"", "Definir"}, {"S2", "Preparar"}, {"S3", "Despachar"}, {"S4", "Implementar y revisar"}} {
		t.Run(tc.stage, func(t *testing.T) {
			var b bytes.Buffer
			if err := cmdEtapa(&b, p, root, tc.id); err != nil {
				t.Fatalf("%v: checks=%v", err, p.CheckAt(root, head))
			}
			if !strings.Contains(b.String(), tc.stage) {
				t.Fatalf("expected %q: %s", tc.stage, b.String())
			}
		})
	}
	var b bytes.Buffer
	if err := cmdEtapa(&b, p, root, "S5"); err == nil || !strings.Contains(err.Error(), `"reason"`) || b.Len() != 0 {
		t.Fatalf("terminal must fail closed with one machine-readable reason: output=%q err=%v", b.String(), err)
	}
}

func TestEtapaDosNoIgnoraContaminacionExterna(t *testing.T) {
	root, _ := repoGit(t)
	source := abierta("S1", "z")
	source.Resultado = "Fuente"
	source.Autoridad = Autoridad{Texto: "openspec/plan.yaml"}
	source.Encargo = &Encargo{PedidoContexto: "a", ResultadoComportamiento: "b", RestriccionesDecisiones: "c", Referencias: "d"}
	source.Archivos = []string{"tracked.txt"}
	source.Decisiones = []Decision{{Tipo: "escala", Pregunta: "¿Resolver?", Alcanza: "M1.2", Contamina: []string{"S2"}, Evidencia: "evidencia", Checkpoint: "antes de implementar", Opciones: []Opcion{{Opcion: "A", Consecuencia: "B"}}}}
	victim := abierta("S2", "z")
	victim.Resultado = "Pendiente"
	victim.Autoridad = source.Autoridad
	victim.Encargo = &Encargo{Incompleto: true, PedidoContexto: "brief"}
	p := &Plan{Zonas: []Zona{{ID: "z", Nombre: "Z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{source, victim}}
	var out bytes.Buffer
	err := cmdEtapa(&out, p, root, "S2")
	if err == nil || !strings.Contains(err.Error(), `"reason":"etapa_no_aplicable"`) || out.Len() != 0 {
		head, _ := gitHEAD(root)
		t.Fatalf("external decision must block stage 2: output=%q err=%v checks=%v", out.String(), err, p.CheckAt(root, head))
	}
}

func TestTestigoDeRevisionVinculadoAlDespacho(t *testing.T) {
	root, _ := repoGit(t)
	path := testDispatch(t, root, "S4", true)
	original, err := leerDespacho(root, "S4")
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name   string
		change func(*reviewWitness)
	}{
		{"transport", func(w *reviewWitness) { w.Transport = "email" }},
		{"type", func(w *reviewWitness) { w.Type = "otro" }},
		{"missing message", func(w *reviewWitness) { w.MessageID = "" }},
		{"wrong session", func(w *reviewWitness) { w.Sesion = "S5" }},
		{"invalid time", func(w *reviewWitness) { w.ReceivedAt = "yesterday" }},
		{"wrong worker", func(w *reviewWitness) { w.Worker = "implementer-2" }},
		{"wrong worktree", func(w *reviewWitness) { w.Worktree = filepath.Join(t.TempDir(), "other") }},
		{"wrong branch", func(w *reviewWitness) { w.Branch = "refs/heads/other" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			copy := *original
			witness := *original.ReviewReady
			tc.change(&witness)
			copy.ReviewReady = &witness
			data, err := json.Marshal(copy)
			if err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(path, data, 0o600); err != nil {
				t.Fatal(err)
			}
			if _, err := leerDespacho(root, "S4"); err == nil {
				t.Fatal("invalid witness accepted")
			}
		})
	}
}

func TestTestigoRechazaCamposDuplicados(t *testing.T) {
	root, _ := repoGit(t)
	path := testDispatch(t, root, "S4", true)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	broken := strings.Replace(string(data), `"message_id":"msg-123"`, `"message_id":"otro","message_id":"msg-123"`, 1)
	if broken == string(data) {
		t.Fatal("fixture missing message ID")
	}
	if err := os.WriteFile(path, []byte(broken), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := leerDespacho(root, "S4"); err == nil {
		t.Fatal("duplicate nested message ID accepted")
	}
}

func TestEtapaCincoExigeTareasCerradasYTestigoDurable(t *testing.T) {
	root, _ := repoGit(t)
	s := abierta("S4", "z")
	s.Encargo = &Encargo{PedidoContexto: "a", ResultadoComportamiento: "b", RestriccionesDecisiones: "c", Referencias: "d"}
	s.Resultado = "Resultado S4"
	s.Autoridad = Autoridad{Texto: "openspec/plan.yaml"}
	s.Archivos = []string{"tracked.txt"}
	p := &Plan{Zonas: []Zona{{ID: "z", Nombre: "Z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	path := testDispatch(t, root, "S4", true)
	dir := filepath.Join(root, "odd", "tasks")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	tasks := filepath.Join(dir, "s4-work.md")
	for _, tc := range []struct{ body, stage string }{{"- [ ] pendiente\n", "Implementar y revisar"}, {"- [x] cerrado\n- [ ]\n", "Implementar y revisar"}, {"- [x] cerrado\n", "Entregar y cerrar"}, {"sin tareas\n", "Implementar y revisar"}} {
		if err := os.WriteFile(tasks, []byte(tc.body), 0o600); err != nil {
			t.Fatal(err)
		}
		var b bytes.Buffer
		if err := cmdEtapa(&b, p, root, "S4"); err != nil {
			head, _ := gitHEAD(root)
			t.Fatalf("%v checks=%v", err, p.CheckAt(root, head))
		}
		if !strings.Contains(b.String(), tc.stage) {
			t.Fatalf("body %q wanted %q: %s", tc.body, tc.stage, b.String())
		}
	}
	m, err := leerDespacho(root, "S4")
	if err != nil {
		t.Fatal(err)
	}
	m.ReviewReady = nil
	data, _ := json.Marshal(m)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	// A missing witness never grants stage 5, even with checked tasks.
	if err := os.WriteFile(tasks, []byte("- [x] cerrado\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	var b bytes.Buffer
	if err := cmdEtapa(&b, p, root, "S4"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(b.String(), "Implementar y revisar") {
		t.Fatal(b.String())
	}
}

func TestMarcadorNoSigueLinksNiConcedeEstadoAOrfanos(t *testing.T) {
	root, head := repoGit(t)
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z")}}
	path := testDispatch(t, root, "S1", false)
	if p.EstadosAt(root, head)["S1"] != EnCurso {
		t.Fatal("live dispatch must be EN CURSO")
	}
	// Branch absent: preserve orphan evidence, but do not claim live work.
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var m despacho
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatal(err)
	}
	m.Branch = "refs/heads/no-such-branch"
	data, _ = json.Marshal(m)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	if p.EstadosAt(root, head)["S1"] != Listo {
		t.Fatal("orphan must not confer EN CURSO")
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatal("orphan must remain on disk", err)
	}
	branch, err := gitOutput(root, "symbolic-ref", "--quiet", "HEAD")
	if err != nil {
		t.Fatal(err)
	}
	m.Branch = branch
	data, _ = json.Marshal(m)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(path, filepath.Join(filepath.Dir(path), "S2.json")); err != nil {
		t.Fatal(err)
	}
	if p.EstadosAt(root, head)["S2"] == EnCurso {
		t.Fatal("symlink cannot confer state")
	}
	if _, err := leerDespacho(root, "../S1"); err == nil {
		t.Fatal("traversal must be rejected")
	}
}

func TestArchivoDespachoRechazaLinksEnCadaComponente(t *testing.T) {
	for _, component := range []string{"chanks", "despachos", "marker"} {
		t.Run(component, func(t *testing.T) {
			common := t.TempDir()
			outside := t.TempDir()
			chanks := filepath.Join(common, "chanks")
			dir := filepath.Join(chanks, "despachos")
			if err := os.MkdirAll(dir, 0o700); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(dir, "S1.json"), []byte(`{}`), 0o600); err != nil {
				t.Fatal(err)
			}
			switch component {
			case "chanks":
				if err := os.Rename(chanks, filepath.Join(outside, "chanks")); err != nil {
					t.Fatal(err)
				}
				if err := os.Symlink(filepath.Join(outside, "chanks"), chanks); err != nil {
					t.Fatal(err)
				}
			case "despachos":
				if err := os.Rename(dir, filepath.Join(outside, "despachos")); err != nil {
					t.Fatal(err)
				}
				if err := os.Symlink(filepath.Join(outside, "despachos"), dir); err != nil {
					t.Fatal(err)
				}
			case "marker":
				if err := os.Rename(filepath.Join(dir, "S1.json"), filepath.Join(outside, "S1.json")); err != nil {
					t.Fatal(err)
				}
				if err := os.Symlink(filepath.Join(outside, "S1.json"), filepath.Join(dir, "S1.json")); err != nil {
					t.Fatal(err)
				}
			}
			if _, err := leerArchivoDespacho(common, "S1"); err == nil {
				t.Fatal("symlink accepted")
			}
		})
	}
}

func TestArchivoDespachoRechazaIdentidadDeDescriptorDistinta(t *testing.T) {
	for _, component := range []string{"chanks", "despachos", "marker"} {
		t.Run(component, func(t *testing.T) {
			common := t.TempDir()
			dir := filepath.Join(common, "chanks", "despachos")
			if err := os.MkdirAll(dir, 0o700); err != nil {
				t.Fatal(err)
			}
			marker := filepath.Join(dir, "S1.json")
			if err := os.WriteFile(marker, []byte(`{}`), 0o600); err != nil {
				t.Fatal(err)
			}
			alternate := filepath.Join(t.TempDir(), component)
			if component == "marker" {
				if err := os.WriteFile(alternate, []byte(`{}`), 0o600); err != nil {
					t.Fatal(err)
				}
			} else if err := os.Mkdir(alternate, 0o700); err != nil {
				t.Fatal(err)
			}
			target := marker
			if component != "marker" {
				target = filepath.Join(common, "chanks")
				if component == "despachos" {
					target = dir
				}
			}
			original := openDispatchPath
			openDispatchPath = func(path string) (*os.File, error) {
				if path == target {
					return os.Open(alternate)
				}
				return original(path)
			}
			t.Cleanup(func() { openDispatchPath = original })
			if _, err := leerArchivoDespacho(common, "S1"); err == nil {
				t.Fatal("path/descriptor identity mismatch accepted")
			}
		})
	}
}

func TestArchivoDespachoRevalidaPadreTrasAbrirMarcador(t *testing.T) {
	common := t.TempDir()
	dir := filepath.Join(common, "chanks", "despachos")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	marker := filepath.Join(dir, "S1.json")
	if err := os.WriteFile(marker, []byte(`{}`), 0o600); err != nil {
		t.Fatal(err)
	}
	moved := filepath.Join(t.TempDir(), "despachos")
	original := openDispatchPath
	openDispatchPath = func(path string) (*os.File, error) {
		if path == marker {
			// The descriptor still names the original inode, but the parent is now a link.
			if err := os.Rename(dir, moved); err != nil {
				t.Fatal(err)
			}
			if err := os.Symlink(moved, dir); err != nil {
				t.Fatal(err)
			}
		}
		return original(path)
	}
	t.Cleanup(func() { openDispatchPath = original })
	if _, err := leerArchivoDespacho(common, "S1"); err == nil {
		t.Fatal("swapped parent accepted despite identical marker inode")
	}
}

func TestMarcadorFailClosedYEstadoFuerte(t *testing.T) {
	root, head := repoGit(t)
	deferred := abierta("S2", "z")
	deferred.Diferida = true
	blocked := abierta("S3", "z")
	blocked.Decisiones = []Decision{{Tipo: "escala", Alcanza: "criterios"}}
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), deferred, blocked, entregada("S4", "z", head)}}
	for _, id := range []string{"S1", "S2", "S3", "S4"} {
		testDispatch(t, root, id, false)
	}
	states := p.EstadosAt(root, head)
	for id, expected := range map[string]string{"S1": EnCurso, "S2": Diferido, "S3": Bloqueado, "S4": Completo} {
		if states[id] != expected {
			t.Errorf("%s = %q, want %q", id, states[id], expected)
		}
	}
	path, err := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		t.Fatal(err)
	}
	path = filepath.Join(path, "chanks", "despachos", "S1.json")
	original, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct{ name, data string }{
		{"unknown schema", strings.Replace(string(original), "radar.despacho/v1", "radar.despacho/v2", 1)},
		{"wrong identity", strings.Replace(string(original), `"sesion":"S1"`, `"sesion":"S9"`, 1)},
		{"unknown field", strings.TrimSuffix(string(original), "}") + `,"unexpected":true}`},
		{"duplicate identity", strings.TrimSuffix(string(original), "}") + `,"sesion":"S1"}`},
		{"bad witness", strings.TrimSuffix(string(original), "}") + `,"review_ready":"2026-09-15T12:00:00Z"}`},
		{"trailing object", string(original) + `{}`},
		{"malformed", `not json`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if err := os.WriteFile(path, []byte(tc.data), 0o600); err != nil {
				t.Fatal(err)
			}
			if p.EstadosAt(root, head)["S1"] == EnCurso {
				t.Fatal("bad marker granted EN CURSO")
			}
			if _, err := leerDespacho(root, "S1"); err == nil {
				t.Fatal("bad marker accepted")
			}
		})
	}
}

func TestMarcadorInvalidoNoSeReportaHuerfano(t *testing.T) {
	root, head := repoGit(t)
	path := testDispatch(t, root, "S1", false)
	if err := os.WriteFile(path, []byte(`{"schema":"unknown"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z")}}
	snap := p.SnapshotAt(root, head)
	if len(snap.DespachosHuerfanos) != 0 || len(snap.DespachosInvalidos) != 1 || snap.DespachosInvalidos[0] != "S1" {
		t.Fatalf("malformed evidence must be invalid, not orphan: %#v", snap)
	}
}

func TestMarcadorDeWorktreeVinculadoYReanudacionPrimero(t *testing.T) {
	root, head := repoGit(t)
	sibling := filepath.Join(t.TempDir(), "worker")
	cmd := exec.Command("git", "-C", root, "worktree", "add", "-qb", "worker", sibling)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git worktree: %v: %s", err, out)
	}
	testDispatch(t, sibling, "S2", false)
	p := &Plan{Sesiones: []Sesion{abierta("S1", "z"), abierta("S2", "z")}}
	if p.EstadosAt(root, head)["S2"] != EnCurso {
		t.Fatal("linked worktree marker must resolve via common dir")
	}
	snap := p.SnapshotAt(root, head)
	if snap.Sesiones[0].ID != "S2" || snap.Sesiones[1].ID != "S1" {
		t.Fatalf("resumption must precede ready: %#v", snap.Sesiones)
	}
	marker, err := leerDespacho(root, "S2")
	if err != nil {
		t.Fatal(err)
	}
	marker.Worktree = filepath.Join(t.TempDir(), "gone")
	data, _ := json.Marshal(marker)
	common, err := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(common, "chanks", "despachos", "S2.json")
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	orphan := p.SnapshotAt(root, head)
	if orphan.Sesiones[1].Estado != "LISTO" || len(orphan.DespachosHuerfanos) != 1 || orphan.DespachosHuerfanos[0] != "S2" {
		t.Fatalf("orphan should remain visible but not EN CURSO: %#v", orphan)
	}
}
