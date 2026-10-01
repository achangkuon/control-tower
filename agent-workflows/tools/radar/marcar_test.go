package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// planMarcar builds a valid plan with one LISTO Session (S3), one blocked (S2)
// and one delivered (S5) over the fixture repository.
func planMarcar(t *testing.T, head string) *Plan {
	t.Helper()
	incomplete := abierta("S2", "z")
	incomplete.Encargo = &Encargo{Incompleto: true, PedidoContexto: "brief"}
	ready := abierta("S3", "z")
	ready.Encargo = &Encargo{PedidoContexto: "a", ResultadoComportamiento: "b", RestriccionesDecisiones: "c", Referencias: "d"}
	p := &Plan{Zonas: []Zona{{ID: "z", Nombre: "Z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{incomplete, ready, entregada("S5", "z", head)}}
	for i := range p.Sesiones {
		p.Sesiones[i].Resultado = "Resultado " + p.Sesiones[i].ID
		p.Sesiones[i].Autoridad = Autoridad{Texto: "openspec/plan.yaml"}
		if p.Sesiones[i].Encargo != nil && !p.Sesiones[i].encargoIncompleto() {
			p.Sesiones[i].Archivos = []string{"tracked.txt"}
		}
	}
	return p
}

// newWorktree adds a linked worktree on a fresh branch and returns its path.
func newWorktree(t *testing.T, root, name string) string {
	t.Helper()
	dir := filepath.Join(t.TempDir(), name)
	fixtureGit(t, root, "worktree", "add", "-q", "-b", "feat/"+name, dir)
	return dir
}

func despachosDir(t *testing.T, root string) string {
	t.Helper()
	common, err := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	if err != nil {
		t.Fatal(err)
	}
	return filepath.Join(common, "chanks", "despachos")
}

// snapshotTree lists every path and symlink target under dir for before/after comparison.
func snapshotTree(t *testing.T, dir string) string {
	t.Helper()
	var b strings.Builder
	_ = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if rel, _ := filepath.Rel(dir, path); strings.HasPrefix(rel, "worktrees") {
			return nil
		}
		b.WriteString(path)
		if info.Mode()&os.ModeSymlink != 0 {
			target, _ := os.Readlink(path)
			b.WriteString(" -> " + target)
		} else if info.Mode().IsRegular() {
			data, _ := os.ReadFile(path)
			b.Write(data)
		}
		b.WriteString("\n")
		return nil
	})
	return b.String()
}

func etapaDe(t *testing.T, p *Plan, root, id string) string {
	t.Helper()
	var b bytes.Buffer
	if err := cmdEtapa(&b, p, root, id); err != nil {
		t.Fatalf("etapa %s: %v", id, err)
	}
	return b.String()
}

func TestMarcarEscribeMarcadorYSesionQuedaEnCurso(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	wt := newWorktree(t, root, "paralelo")
	var out bytes.Buffer
	if err := cmdMarcar(&out, p, root, "S3", wt, ""); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "S3") || strings.Count(strings.TrimSpace(out.String()), "\n") != 0 {
		t.Fatalf("una sola línea de confirmación esperada: %q", out.String())
	}
	m, err := leerDespacho(root, "S3")
	if err != nil || m == nil {
		t.Fatalf("el lector existente debe aceptar el marcador: %v %v", m, err)
	}
	if m.Schema != "radar.despacho/v1" || m.Worktree != wt || m.Branch != "refs/heads/feat/paralelo" || m.Worker != "paralelo" || m.ReviewReady != nil {
		t.Fatalf("marcador inesperado: %+v", m)
	}
	if got := p.EstadosAt(root, head)["S3"]; got != EnCurso {
		t.Fatalf("estado = %s, esperado EN CURSO", got)
	}
	if got := etapaDe(t, p, root, "S3"); !strings.Contains(got, "Implementar y revisar") {
		t.Fatalf("etapa 4 esperada: %s", got)
	}
	var snap bytes.Buffer
	if err := cmdSesion(&snap, p, root, "S3"); err != nil || !strings.Contains(snap.String(), "EN CURSO") {
		t.Fatalf("sesion debe mostrar EN CURSO: %v %s", err, snap.String())
	}
	entries, _ := os.ReadDir(despachosDir(t, root))
	if len(entries) != 1 {
		t.Fatalf("no deben quedar temporales: %v", entries)
	}
}

func TestMarcarWorkerExplicito(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	wt := newWorktree(t, root, "w")
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", wt, "impl-1"); err != nil {
		t.Fatal(err)
	}
	if m, _ := leerDespacho(root, "S3"); m == nil || m.Worker != "impl-1" {
		t.Fatalf("worker explícito no preservado: %+v", m)
	}
}

func TestMarcarRechazaSinMutarNada(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	good := newWorktree(t, root, "good")
	detached := newWorktree(t, root, "detached")
	fixtureGit(t, detached, "checkout", "-q", "--detach")
	foreign, _ := repoGit(t)
	link := filepath.Join(t.TempDir(), "link")
	if err := os.Symlink(good, link); err != nil {
		t.Fatal(err)
	}
	unborn := filepath.Join(t.TempDir(), "unborn")
	fixtureGit(t, root, "worktree", "add", "-q", "--orphan", "-b", "huerfana", unborn)
	for _, tc := range []struct {
		name, id, worktree, worker, want string
	}{
		{"sesion desconocida", "S99", good, "", "no existe"},
		{"sesion bloqueada", "S2", good, "", "LISTO"},
		{"sesion entregada", "S5", good, "", "LISTO"},
		{"id con traversal", "../S3", good, "", "inválido"},
		{"id con barra", "a/b", good, "", "inválido"},
		{"id absoluto", "/etc/passwd", good, "", "inválido"},
		{"worktree relativo", "S3", "relativo/dir", "", "absoluta"},
		{"worktree inexistente", "S3", filepath.Join(t.TempDir(), "nada"), "", "worktree"},
		{"worktree ajeno", "S3", foreign, "", "repositorio"},
		{"worktree detached", "S3", detached, "", "detached"},
		{"worktree por symlink", "S3", link, "", "worktree"},
		{"rama sin commits", "S3", unborn, "", "rama"},
		{"worker con espacio", "S3", good, "a b", "worker"},
		{"worker con barra", "S3", good, "a/b", "worker"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			before := snapshotTree(t, filepath.Dir(despachosDir(t, root)))
			var out bytes.Buffer
			err := cmdMarcar(&out, p, root, tc.id, tc.worktree, tc.worker)
			if err == nil || !strings.Contains(err.Error(), tc.want) || out.Len() != 0 {
				t.Fatalf("se esperaba rechazo con %q: out=%q err=%v", tc.want, out.String(), err)
			}
			if after := snapshotTree(t, filepath.Dir(despachosDir(t, root))); after != before {
				t.Fatalf("un rechazo mutó el sistema de archivos:\n%s\n---\n%s", before, after)
			}
		})
	}
}

func TestMarcarNuncaSobrescribeMarcadorExistente(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	wt := newWorktree(t, root, "uno")
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", wt, ""); err != nil {
		t.Fatal(err)
	}
	dir := despachosDir(t, root)
	before := snapshotTree(t, dir)
	other := newWorktree(t, root, "dos")
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", other, ""); err == nil || !strings.Contains(err.Error(), "marcador") {
		t.Fatalf("debe rechazar un marcador existente: %v", err)
	}
	if snapshotTree(t, dir) != before {
		t.Fatal("el marcador existente fue modificado")
	}
	// An orphan (stale) marker is also refused, never silently replaced.
	fixtureGit(t, root, "worktree", "remove", "--force", wt)
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", other, ""); err == nil {
		t.Fatal("un marcador huérfano debe quitarse con desmarcar, no sobrescribirse")
	}
}

func TestMarcarRechazaDirectorioDespachosSimbolico(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	wt := newWorktree(t, root, "sym")
	common, _ := gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
	elsewhere := t.TempDir()
	if err := os.MkdirAll(filepath.Join(common, "chanks"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(elsewhere, filepath.Join(common, "chanks", "despachos")); err != nil {
		t.Fatal(err)
	}
	err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", wt, "")
	if err == nil || !strings.Contains(err.Error(), "enlace") {
		t.Fatalf("debe rechazar el directorio simbólico: %v", err)
	}
	if entries, _ := os.ReadDir(elsewhere); len(entries) != 0 {
		t.Fatalf("se escribió a través del enlace: %v", entries)
	}
	if err := cmdDesmarcar(&bytes.Buffer{}, root, "S3"); err == nil {
		t.Fatal("desmarcar tampoco debe seguir el directorio simbólico")
	}
}

func TestMarcarListoHabilitaEtapaCincoConTestigoLocal(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	wt := newWorktree(t, root, "listo")
	if err := cmdMarcarListo(&bytes.Buffer{}, p, root, "S3"); err == nil {
		t.Fatal("sin marcador no hay nada que marcar listo")
	}
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", wt, ""); err != nil {
		t.Fatal(err)
	}
	if got := etapaDe(t, p, root, "S3"); !strings.Contains(got, "Implementar y revisar") {
		t.Fatalf("antes de --listo debe ser etapa 4: %s", got)
	}
	if err := os.MkdirAll(filepath.Join(wt, "odd", "tasks"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(wt, "odd", "tasks", "s3-algo.md"), []byte("- [x] hecho\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if got := etapaDe(t, p, root, "S3"); !strings.Contains(got, "Implementar y revisar") {
		t.Fatalf("sin testigo sigue en etapa 4: %s", got)
	}
	var out bytes.Buffer
	if err := cmdMarcarListo(&out, p, root, "S3"); err != nil || strings.Count(strings.TrimSpace(out.String()), "\n") != 0 {
		t.Fatalf("listo: %v %q", err, out.String())
	}
	m, err := leerDespacho(root, "S3")
	if err != nil || m.ReviewReady == nil || m.ReviewReady.Transport != "local" || m.ReviewReady.Type != "listo para revisión" {
		t.Fatalf("testigo local esperado: %+v %v", m, err)
	}
	if got := etapaDe(t, p, root, "S3"); !strings.Contains(got, "Entregar y cerrar") {
		t.Fatalf("etapa 5 esperada: %s", got)
	}
	if err := cmdMarcarListo(&bytes.Buffer{}, p, root, "S3"); err == nil {
		t.Fatal("un segundo --listo debe rechazarse")
	}
}

func TestMarcarListoNoGeneraTemporalesYRechazaHuerfano(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	wt := newWorktree(t, root, "huerfano")
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", wt, ""); err != nil {
		t.Fatal(err)
	}
	if err := cmdMarcarListo(&bytes.Buffer{}, p, root, "S3"); err != nil {
		t.Fatal(err)
	}
	if entries, _ := os.ReadDir(despachosDir(t, root)); len(entries) != 1 {
		t.Fatalf("temporales sobrantes: %v", entries)
	}
	fixtureGit(t, root, "worktree", "remove", "--force", wt)
	dir := despachosDir(t, root)
	before := snapshotTree(t, dir)
	other := newWorktree(t, root, "otro")
	_ = other
	if err := cmdDesmarcar(&bytes.Buffer{}, root, "S3"); err != nil {
		t.Fatalf("desmarcar debe quitar marcadores huérfanos: %v", err)
	}
	if before == snapshotTree(t, dir) {
		t.Fatal("el marcador huérfano no fue quitado")
	}
}

func TestTestigoIntercomSigueValidoYHerdrNoCambia(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	path := testDispatch(t, root, "S3", true)
	m, err := leerDespacho(root, "S3")
	if err != nil || m.ReviewReady == nil || m.ReviewReady.Transport != "intercom" {
		t.Fatalf("un testigo intercom debe seguir siendo válido: %+v %v", m, err)
	}
	if got := p.EstadosAt(root, head)["S3"]; got != EnCurso {
		t.Fatalf("estado = %s", got)
	}
	// An unnamed transport is still refused.
	data, _ := os.ReadFile(path)
	var raw despacho
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatal(err)
	}
	raw.ReviewReady.Transport = "email"
	data, _ = json.Marshal(raw)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := leerDespacho(root, "S3"); err == nil {
		t.Fatal("un transporte no nombrado debe rechazarse")
	}
	// Marking a Session whose Herdr marker exists is refused and leaves it intact.
	before, _ := os.ReadFile(path)
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", newWorktree(t, root, "h"), ""); err == nil {
		t.Fatal("no debe pisar un marcador Herdr")
	}
	if after, _ := os.ReadFile(path); !bytes.Equal(before, after) {
		t.Fatal("marcador Herdr modificado")
	}
}

func TestDesmarcarQuitaSoloElArchivoExacto(t *testing.T) {
	root, head := repoGit(t)
	p := planMarcar(t, head)
	wt := newWorktree(t, root, "d")
	if err := cmdMarcar(&bytes.Buffer{}, p, root, "S3", wt, ""); err != nil {
		t.Fatal(err)
	}
	dir := despachosDir(t, root)
	neighbor := filepath.Join(dir, "S4.json")
	if err := os.WriteFile(neighbor, []byte("{}"), 0o600); err != nil {
		t.Fatal(err)
	}
	var out bytes.Buffer
	if err := cmdDesmarcar(&out, root, "S3"); err != nil || strings.Count(strings.TrimSpace(out.String()), "\n") != 0 {
		t.Fatalf("desmarcar: %v %q", err, out.String())
	}
	if _, err := os.Lstat(filepath.Join(dir, "S3.json")); !os.IsNotExist(err) {
		t.Fatal("el marcador sigue presente")
	}
	if _, err := os.Lstat(neighbor); err != nil {
		t.Fatal("desmarcar tocó otro archivo")
	}
	if _, err := os.Lstat(wt); err != nil {
		t.Fatal("desmarcar tocó el worktree")
	}
	if got := p.EstadosAt(root, head)["S3"]; got != Listo {
		t.Fatalf("estado = %s, esperado LISTO", got)
	}
	if err := cmdDesmarcar(&bytes.Buffer{}, root, "S3"); err == nil || !strings.Contains(err.Error(), "no existe") {
		t.Fatalf("sin marcador debe rechazar: %v", err)
	}
	for _, id := range []string{"../S4", "a/b", "..", "", "/x"} {
		if err := cmdDesmarcar(&bytes.Buffer{}, root, id); err == nil || !strings.Contains(err.Error(), "inválido") {
			t.Fatalf("id %q debe ser inválido: %v", id, err)
		}
	}
	if _, err := os.Lstat(neighbor); err != nil {
		t.Fatal("un ID malformado tocó otro archivo")
	}
}

func TestDesmarcarRechazaMarcadorSimbolico(t *testing.T) {
	root, _ := repoGit(t)
	dir := despachosDir(t, root)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	target := filepath.Join(t.TempDir(), "real.json")
	if err := os.WriteFile(target, []byte("{}"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(target, filepath.Join(dir, "S3.json")); err != nil {
		t.Fatal(err)
	}
	if err := cmdDesmarcar(&bytes.Buffer{}, root, "S3"); err == nil {
		t.Fatal("un marcador simbólico no se quita")
	}
	if _, err := os.Lstat(target); err != nil {
		t.Fatal("se tocó el destino del enlace")
	}
}
