package main

import (
	"os"
	"os/exec"
	"path/filepath"
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

func entregada(id, zona, commit string, deps ...string) Sesion {
	return Sesion{ID: id, Zona: zona, DependeDe: deps, Entrega: &Entrega{Commit: commit}}
}

func abierta(id, zona string, deps ...string) Sesion {
	return Sesion{ID: id, Zona: zona, DependeDe: deps, Criterios: []string{"algo verificable"}}
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
