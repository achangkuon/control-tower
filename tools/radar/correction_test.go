package main

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestGitEvidenceRequiresFullImmutableOID(t *testing.T) {
	root, head := repoGit(t)
	cases := []string{"HEAD", "HEAD~1", "main", head[:12], "--help"}
	for _, value := range cases {
		t.Run(value, func(t *testing.T) {
			if _, err := gitOID(root, value); err == nil {
				t.Fatalf("%q no es evidencia Git inmutable completa", value)
			}
		})
	}
	if got, err := gitOID(root, head); err != nil || got != head {
		t.Fatalf("el OID completo de HEAD debería aceptarse: got=%q err=%v", got, err)
	}
}

func TestGitEvidenceSupportsRepositoryObjectFormat(t *testing.T) {
	root := t.TempDir()
	if out, err := exec.Command("git", "-C", root, "init", "-q", "--object-format=sha256").CombinedOutput(); err != nil {
		t.Skipf("Git sin soporte SHA-256: %v: %s", err, out)
	}
	for _, args := range [][]string{{"config", "user.email", "radar@example.test"}, {"config", "user.name", "Radar Test"}} {
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatal(err, string(out))
		}
	}
	if err := os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("base\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{{"add", "tracked.txt"}, {"commit", "-qm", "base"}} {
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatal(err, string(out))
		}
	}
	head, err := gitHEAD(root)
	if err != nil || len(head) != 64 {
		t.Fatalf("HEAD SHA-256 completo esperado: %q %v", head, err)
	}
	if got, err := gitOID(root, head); err != nil || got != head {
		t.Fatalf("OID SHA-256 debería validarse: %q %v", got, err)
	}
}

func TestEntregaInvalidaBloqueaYStatusFallaCerrado(t *testing.T) {
	root, head := repoGit(t)
	s := sesionEjecutable("S1", "z")
	s.Entrega = &Entrega{Commit: "HEAD"}
	p := &Plan{Producto: "x", Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	if got := p.EstadosAt(root, head)["S1"]; got != Bloqueado {
		t.Fatalf("evidencia inválida debe bloquear, no quedar ejecutable: %s", got)
	}
	if err := cmdStatus(p, root); err == nil {
		t.Fatal("status debe validar primero y fallar cerrado")
	}
}

func TestRutasDeModuloSonExactasYAutorizadas(t *testing.T) {
	root, head := repoGit(t)
	if err := os.Mkdir(filepath.Join(root, "dir"), 0o700); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name, route, zone                string
		zoneRules, foundations, reserved []string
		wantRule                         string
	}{
		{"archivo de Zona", "nuevo.go", "z", []string{"*.go"}, nil, nil, ""},
		{"Cimiento exacto reservado", "shared/new.go", "z", []string{"*.go"}, []string{"shared/"}, []string{"shared/new.go"}, ""},
		{"escape", "../fuera.go", "z", []string{"*.go"}, nil, nil, "ruta de Módulo"},
		{"glob", "*.go", "z", []string{"*.go"}, nil, nil, "ruta de Módulo"},
		{"directorio", "dir", "z", []string{"dir/"}, nil, nil, "ruta de Módulo"},
		{"otra Zona", "nuevo.go", "otra", []string{"*.go"}, nil, nil, "autoridad de Módulo"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			s := sesionEjecutable("S1", tc.zone)
			s.Modulos[0].Rutas = []string{tc.route}
			s.Cimientos = tc.reserved
			p := &Plan{Zonas: []Zona{{ID: "z", Rutas: tc.zoneRules}, {ID: "otra", Rutas: []string{"otra/"}}}, Cimientos: Cimientos{Rutas: tc.foundations}, Sesiones: []Sesion{s}}
			h := p.checkSesionesAt(root, head)
			if tc.wantRule == "" {
				if got := append(hallazgosDe(h, "ruta de Módulo"), hallazgosDe(h, "autoridad de Módulo")...); len(got) != 0 {
					t.Fatalf("ruta válida rechazada: %#v", got)
				}
			} else if len(hallazgosDe(h, tc.wantRule)) == 0 {
				t.Fatalf("faltó hallazgo %q: %#v", tc.wantRule, h)
			}
		})
	}
}

func TestRutaDeModuloRechazaComponenteSymlink(t *testing.T) {
	root, head := repoGit(t)
	outside := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(root, "link")); err != nil {
		t.Skipf("symlink no disponible: %v", err)
	}
	s := sesionEjecutable("S1", "z")
	s.Modulos[0].Rutas = []string{"link/new.go"}
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"link/"}}}, Sesiones: []Sesion{s}}
	if len(hallazgosDe(p.checkSesionesAt(root, head), "ruta de Módulo")) == 0 {
		t.Fatal("una ruta que atraviesa symlink debe rechazarse")
	}
}

func TestResultadosNoPuedenEstarEnBlanco(t *testing.T) {
	root, head := repoGit(t)
	s := sesionEjecutable("S1", "z")
	s.Resultado = " \n"
	s.Modulos[0].Resultado = "\t"
	s.Modulos[0].Tareas[0].Resultado = " "
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	if got := hallazgosDe(p.checkSesionesAt(root, head), "resultado"); len(got) != 3 {
		t.Fatalf("Sesión, Módulo y Tarea deben exigir resultado: %#v", got)
	}
}

func TestAsientosCombinanConflictosDeCimientosYRecursos(t *testing.T) {
	cases := []struct {
		name     string
		sessions []Sesion
		want     string
	}{
		{"recurso compartido", []Sesion{withClaims(abierta("S1", "a"), nil, []string{"db"}), withClaims(abierta("S2", "b"), nil, []string{"db"})}, "a"},
		{"recursos disjuntos", []Sesion{withClaims(abierta("S1", "a"), nil, []string{"db-a"}), withClaims(abierta("S2", "b"), nil, []string{"db-b"})}, "a,b"},
		{"conflicto combinado", []Sesion{withClaims(abierta("S1", "a"), []string{"shared.go"}, []string{"db-a"}), withClaims(abierta("S2", "b"), []string{"shared.go"}, []string{"db-b"}), withClaims(abierta("S3", "c"), []string{"other.go"}, []string{"db-a"})}, "a"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p := &Plan{Sesiones: tc.sessions}
			if got := strings.Join(p.AsientosAt("", ""), ","); got != tc.want {
				t.Fatalf("asientos=%q want=%q", got, tc.want)
			}
		})
	}
}

func withClaims(s Sesion, files, resources []string) Sesion {
	s.Cimientos = files
	s.Recurso = resources
	return s
}

func TestOutputConfinementRejectsEscapesSymlinksAndNonRegularTargets(t *testing.T) {
	root, _ := repoGit(t)
	outside := t.TempDir()
	if _, err := resolveOutput(root, filepath.Join(outside, "ROADMAP.md")); err == nil {
		t.Fatal("salida absoluta fuera del repo debería fallar")
	}
	if _, err := resolveOutput(root, "../ROADMAP.md"); err == nil {
		t.Fatal("escape relativo debería fallar")
	}
	if err := os.Mkdir(filepath.Join(root, "as-dir"), 0o700); err != nil {
		t.Fatal(err)
	}
	if _, err := resolveOutput(root, "as-dir"); err == nil {
		t.Fatal("un destino directorio debería fallar")
	}
	if err := os.WriteFile(filepath.Join(root, "ordinary.md"), []byte("do not overwrite\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := resolveOutput(root, "ordinary.md"); err == nil {
		t.Fatal("un archivo regular arbitrario no debería ser sobrescrito")
	}
	generated := filepath.Join(root, "generated.md")
	if err := os.WriteFile(generated, []byte(avisoGenerado+"\nold\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if got, err := resolveOutput(root, "generated.md"); err != nil || got != generated {
		t.Fatalf("una vista previamente generada debería poder reemplazarse: %q %v", got, err)
	}
	if err := os.Symlink(outside, filepath.Join(root, "linked")); err == nil {
		if _, err := resolveOutput(root, "linked/ROADMAP.md"); err == nil {
			t.Fatal("un componente symlink debería fallar")
		}
	}
	want := filepath.Join(root, "openspec", "ROADMAP.md")
	if got, err := resolveOutput(root, "openspec/ROADMAP.md"); err != nil || got != want {
		t.Fatalf("el default dentro del repo debería aceptarse: %q %v", got, err)
	}
	if got, err := resolveOutput(root, filepath.Join(root, "test-output.md")); err != nil || got != filepath.Join(root, "test-output.md") {
		t.Fatalf("un override absoluto interno debería aceptarse: %q %v", got, err)
	}
}

func TestAtomicWriteSurfacesParentDirectorySyncFailure(t *testing.T) {
	old := syncDirectory
	syncDirectory = func(string) error { return errors.New("sync-dir") }
	defer func() { syncDirectory = old }()
	if err := atomicWrite(filepath.Join(t.TempDir(), "ROADMAP.md"), []byte("x"), 0o600); err == nil || !strings.Contains(err.Error(), "sync-dir") {
		t.Fatalf("el fallo de sync del padre debe propagarse: %v", err)
	}
}

func TestRenderRefusesPublishWhenHeadChanges(t *testing.T) {
	root, head := repoGit(t)
	s := sesionEjecutable("S1", "z")
	p := &Plan{Producto: "x", Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	old := headBeforePublish
	headBeforePublish = func(string) (string, error) { return strings.Repeat("f", len(head)), nil }
	defer func() { headBeforePublish = old }()
	output := filepath.Join("openspec", "ROADMAP.md")
	if err := cmdRender(p, root, output); err == nil || !strings.Contains(err.Error(), "HEAD cambió") {
		t.Fatalf("render debería rechazar el cambio de HEAD: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, output)); !os.IsNotExist(err) {
		t.Fatalf("no debía publicarse ROADMAP: %v", err)
	}
}

func TestMarkdownTextNormalizesAndNeutralizesStructure(t *testing.T) {
	hostile := "ok\n# injected | `code` <script> *bold*"
	got := markdownText(hostile)
	for _, forbidden := range []string{"\n", "<script>", "`", "|", "*bold*"} {
		if strings.Contains(got, forbidden) {
			t.Fatalf("contenido hostil no neutralizado (%q) en %q", forbidden, got)
		}
	}
}

func TestRenderNeutralizesHostilePlanScalars(t *testing.T) {
	s := abierta("S1", "z")
	s.Resultado = "resultado\n## heading | `code` <b>"
	s.Criterios = []string{"criterio\n# injected"}
	s.Ruta = RutaSesion{Propuesta: "direct", Autoridad: "RFC | `x` <i>"}
	s.Modulos = []Modulo{{
		ID: "M1.1", Resultado: "módulo\n### injected", Rutas: []string{"x.go"},
		Tareas: []Tarea{{ID: "T1.1.1", Accion: "acción\n- injected", Resultado: "hecho\n# result", Criterios: []string{"ok | no"}}},
	}}
	p := &Plan{Producto: "producto\n# injected", Zonas: []Zona{{ID: "z", Nombre: "Zona | <x>", Rutas: []string{"x.go"}}}, Sesiones: []Sesion{s}}
	got := string(RenderAt(p, "", ""))
	for _, forbidden := range []string{"\n# injected", "\n## heading", "\n### injected", "<b>", "<i>", "`code`", " | "} {
		if strings.Contains(got, forbidden) {
			t.Fatalf("render permitió estructura hostil %q:\n%s", forbidden, got)
		}
	}
}

func TestCierresRegistradosNoInventaElUltimoPorOrdenYAML(t *testing.T) {
	p := &Plan{Sesiones: []Sesion{{ID: "S20"}, {ID: "S3"}}}
	estados := map[string]string{"S20": Completo, "S3": Archivado}
	if got := cierresRegistrados(p, estados); got != "S20, S3" {
		t.Fatalf("cierres deben reportarse determinísticamente sin semántica temporal: %q", got)
	}
}
