package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func gitEn(t *testing.T, root string, args ...string) string {
	t.Helper()
	out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
	return strings.TrimSpace(string(out))
}

func commitConModulo(t *testing.T, root, modulo string) string {
	t.Helper()
	gitEn(t, root, "commit", "-q", "--allow-empty", "-m", "trabajo", "-m", "Modulo: "+modulo)
	return gitEn(t, root, "rev-parse", "HEAD")
}

// planDosModulos builds one open Sesión whose two Módulos own distinct tracked files.
func planDosModulos(t *testing.T) (*Plan, string) {
	t.Helper()
	root, _ := repoGit(t)
	if err := os.WriteFile(filepath.Join(root, "otro.txt"), []byte("otro\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	gitEn(t, root, "add", "otro.txt")
	gitEn(t, root, "commit", "-qm", "otro")

	s := sesionEjecutable("S1", "hosts")
	segundo := s.Modulos[0]
	segundo.ID = "M1.2"
	segundo.Rutas = []string{"otro.txt"}
	segundo.Tareas = []Tarea{{ID: "T1.2.1", Accion: "probar lo segundo", Resultado: "lo segundo existe", Criterios: []string{"lo segundo existe"}}}
	s.Modulos = append(s.Modulos, segundo)
	return &Plan{
		Producto: "x",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts", Rutas: []string{"tracked.txt", "otro.txt"}}},
		Sesiones: []Sesion{s},
	}, root
}

func TestTrailerAlcanzableDesdeHEADMarcaModuloEntregado(t *testing.T) {
	p, root := planDosModulos(t)
	commit := commitConModulo(t, root, "M1.1")

	entregados, desconocidos, err := p.AvanceModulosAt(root, gitEn(t, root, "rev-parse", "HEAD"))
	if err != nil {
		t.Fatal(err)
	}
	if entregados["M1.1"] != commit {
		t.Fatalf("M1.1 debe contar como entregado por %s: %v", commit, entregados)
	}
	if _, ok := entregados["M1.2"]; ok {
		t.Fatalf("M1.2 no tiene trailer y no puede contar: %v", entregados)
	}
	if len(desconocidos) != 0 {
		t.Fatalf("no hay trailers desconocidos: %v", desconocidos)
	}
}

func TestTrailerFueraDeHEADNoCuenta(t *testing.T) {
	p, root := planDosModulos(t)
	base := gitEn(t, root, "rev-parse", "--abbrev-ref", "HEAD")
	gitEn(t, root, "checkout", "-q", "-b", "lateral")
	commitConModulo(t, root, "M1.1")
	gitEn(t, root, "checkout", "-q", base)

	entregados, _, err := p.AvanceModulosAt(root, gitEn(t, root, "rev-parse", "HEAD"))
	if err != nil {
		t.Fatal(err)
	}
	if len(entregados) != 0 {
		t.Fatalf("un commit fuera de HEAD no cuenta: %v", entregados)
	}
}

func TestTrailerDeModuloFullSDDPerteneceASesionPorPrefijo(t *testing.T) {
	root, _ := repoGit(t)
	full := sesionEjecutable("S1", "z")
	full.Modulos = nil
	full.Ruta.Revalidacion = &Revalidacion{Resultado: RutaSDDNativa}
	direct := sesionEjecutable("S2", "z")
	designTasks := sesionEjecutable("S3", "z")
	designTasks.Ruta.Propuesta = "design-tasks"
	p := &Plan{Sesiones: []Sesion{full, direct, designTasks}}

	for _, modulo := range []string{"M1.1", "M1.2", "M2.2", "M3.2", "M9.9"} {
		commitConModulo(t, root, modulo)
	}
	entregados, desconocidos, err := p.AvanceModulosAt(root, gitEn(t, root, "rev-parse", "HEAD"))
	if err != nil {
		t.Fatal(err)
	}
	for _, modulo := range []string{"M1.1", "M1.2"} {
		if _, ok := entregados[modulo]; !ok {
			t.Fatalf("%s debe pertenecer a la Sesión full-sdd: %v", modulo, entregados)
		}
	}
	wantDesconocidos := []string{"M2.2", "M3.2", "M9.9"}
	if strings.Join(desconocidos, ",") != strings.Join(wantDesconocidos, ",") {
		t.Fatalf("direct y design-tasks no deben reconocer trailers fuera de sus Módulos; desconocidos: %v", desconocidos)
	}
	avisos := p.avisosDeTrailers(root)
	if len(avisos) != len(wantDesconocidos) || avisos[2].Severidad != "aviso" || !strings.Contains(avisos[2].Detalle, "M9.9") {
		t.Fatalf("los trailers realmente desconocidos deben conservar sus avisos: %#v", avisos)
	}
}

func TestStatusMuestraEntregadosDeFullSDDSinDenominador(t *testing.T) {
	root, _ := repoGit(t)
	s := sesionEjecutable("S1", "z")
	s.Modulos = nil
	s.Ruta.Propuesta = RutaSDDNativa
	p := &Plan{
		Producto: "x",
		Zonas:    []Zona{{ID: "z", Nombre: "Zona", Rutas: []string{"tracked.txt"}}},
		Sesiones: []Sesion{s},
	}
	commitConModulo(t, root, "M1.1")
	commitConModulo(t, root, "M1.2")

	out := captureStdout(t, func() {
		if err := cmdStatus(p, root); err != nil {
			t.Fatalf("status falló: %v", err)
		}
	})
	if !strings.Contains(out, "entregados 2 Módulos") {
		t.Fatalf("status debe mostrar los Módulos entregados de full-sdd:\n%s", out)
	}
	if strings.Contains(out, "2/0 Módulos") {
		t.Fatalf("full-sdd no debe mostrar un denominador inexistente:\n%s", out)
	}
}

func TestStatusMarcaSesionAMediasSinCambiarSuEstado(t *testing.T) {
	p, root := planDosModulos(t)
	commitConModulo(t, root, "M1.1")

	out := captureStdout(t, func() {
		if err := cmdStatus(p, root); err != nil {
			t.Fatalf("status falló: %v", err)
		}
	})
	if !strings.Contains(out, Listo) || !strings.Contains(out, "a medias 1/2 Módulos") {
		t.Fatalf("status debe conservar el estado y marcar a medias 1/2 Módulos:\n%s", out)
	}
}

func TestSesionMarcaCadaModuloYNombraElPrimerPendiente(t *testing.T) {
	p, root := planDosModulos(t)
	commit := commitConModulo(t, root, "M1.1")

	var out strings.Builder
	if err := cmdSesion(&out, p, root, "S1"); err != nil {
		t.Fatalf("sesion falló: %v", err)
	}
	got := out.String()
	for _, want := range []string{"entregado " + commit[:12], "pendiente", "Retomar desde: M1.2"} {
		if !strings.Contains(got, want) {
			t.Fatalf("la salida debe contener %q:\n%s", want, got)
		}
	}
}

func TestCheckAvisaTrailerDeModuloInexistente(t *testing.T) {
	p, root := planDosModulos(t)
	commitConModulo(t, root, "M9.9")

	out := captureStdout(t, func() { cmdCheck(p, root) })
	if !strings.Contains(out, "!  [trailer de Módulo]") || !strings.Contains(out, "M9.9") {
		t.Fatalf("un trailer desconocido debe ser un aviso que lo nombre:\n%s", out)
	}
	if strings.Contains(out, "✗  [trailer de Módulo]") {
		t.Fatalf("un trailer desconocido nunca es un error:\n%s", out)
	}
}
