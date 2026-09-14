package main

import (
	"strings"
	"testing"
)

func planConDosSesiones(commit string) *Plan {
	s3 := pendiente("S3", "hosts")
	s3.Resultado = "otra Sesión que no debe aparecer"
	return &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts", Rutas: []string{"tracked.txt"}}},
		Sesiones: []Sesion{completa("S1", "hosts", commit), pendiente("S2", "hosts", "S1"), s3},
	}
}

func TestSesionImprimeSoloEsaSesion(t *testing.T) {
	root, commit := repoGit(t)
	p := planConDosSesiones(commit)
	estados := p.EstadosAt(root, commit)

	var out strings.Builder
	if err := cmdSesion(&out, p, root, "S2"); err != nil {
		t.Fatalf("sesion falló sobre un plan válido: %v", err)
	}
	got := out.String()
	for _, want := range []string{"S2", estados["S2"], "hosts", "S1 (" + estados["S1"] + ")"} {
		if !strings.Contains(got, want) {
			t.Fatalf("la salida debe contener %q:\n%s", want, got)
		}
	}
	if strings.Contains(got, "S3") {
		t.Fatalf("ninguna otra Sesión puede aparecer en la salida:\n%s", got)
	}
}

func TestEscribirSesionImprimeElContratoCompleto(t *testing.T) {
	s := sesionEjecutable("S7", "hosts")
	s.Cimientos = []string{"AGENTS.md"}
	s.Recurso = []string{"panel compartido"}
	s.Decisiones = []Decision{{
		Tipo: "resuelta", Pregunta: "¿qué forma usa?", Resolucion: "la forma simple",
		Clase: "contrato-visible", Descartadas: []Descartada{{Opcion: "la forma compleja", Razon: "cuesta más"}},
	}}
	p := &Plan{
		Zonas:    []Zona{{ID: "hosts", Rutas: []string{"tracked.txt"}}},
		Sesiones: []Sesion{s},
	}

	var out strings.Builder
	escribirSesion(&out, p, &p.Sesiones[0], map[string]string{"S7": "🟢 LISTO"})
	got := out.String()
	for _, want := range []string{
		"S7", "resultado observable", "🟢 LISTO", "hosts", "tracked.txt", "PRD §1",
		"AGENTS.md", "panel compartido", "el resultado existe",
		"¿qué forma usa?", "la forma simple", "contrato-visible", "la forma compleja",
		"direct", "RFC §1", "M7.1", "cambio coherente", "T7.1.1", "probar el resultado",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("el contrato debe incluir %q:\n%s", want, got)
		}
	}
}

func TestSesionInexistenteFallaConUnaLinea(t *testing.T) {
	root, commit := repoGit(t)
	p := planConDosSesiones(commit)

	var out strings.Builder
	err := cmdSesion(&out, p, root, "S999")
	if err == nil {
		t.Fatal("un ID inexistente debe fallar")
	}
	if strings.Contains(err.Error(), "\n") {
		t.Fatalf("el mensaje debe ser de una línea: %q", err.Error())
	}
	if out.Len() != 0 {
		t.Fatalf("no debe imprimirse nada, salió %q", out.String())
	}
}

func TestSesionReferenciaNoEjecutableFalla(t *testing.T) {
	root, commit, blob, raw := referenceFixture(t)
	p := referencedFixturePlan(validLocator(commit, blob, raw, 1, 1))

	var out strings.Builder
	err := cmdSesion(&out, p, root, "S102")
	if err == nil {
		t.Fatal("una referencia no ejecutable no tiene contrato de Sesión")
	}
	if strings.Contains(err.Error(), "\n") || !strings.Contains(err.Error(), "S102") {
		t.Fatalf("el mensaje debe ser de una línea y nombrar la referencia: %q", err.Error())
	}
	if out.Len() != 0 {
		t.Fatalf("no debe imprimirse nada, salió %q", out.String())
	}
}

func TestSesionFallaCerradoConPlanInvalido(t *testing.T) {
	root, _ := repoGit(t)
	s := sesionEjecutable("S1", "z")
	s.Entrega = &Entrega{Commit: "HEAD"}
	p := &Plan{Producto: "x", Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}

	var out strings.Builder
	err := cmdSesion(&out, p, root, "S1")
	if err == nil {
		t.Fatal("sesion debe validar primero y fallar cerrado igual que status")
	}
	if strings.Contains(err.Error(), "\n") {
		t.Fatalf("el mensaje debe ser de una línea: %q", err.Error())
	}
	if out.Len() != 0 {
		t.Fatalf("no debe imprimirse ningún estado, salió %q", out.String())
	}
}

func TestStatusTextoTerminaNombrandoSesion(t *testing.T) {
	root, commit := repoGit(t)
	p := planConDosSesiones(commit)

	out := captureStdout(t, func() {
		if err := cmdStatus(p, root); err != nil {
			t.Fatalf("status falló: %v", err)
		}
	})
	lineas := strings.Split(strings.TrimRight(out, "\n"), "\n")
	if ultima := lineas[len(lineas)-1]; !strings.Contains(ultima, "radar sesion <ID>") {
		t.Fatalf("la última línea de status debe indicar `radar sesion <ID>`, fue %q", ultima)
	}
}

func TestStatusJSONNoNombraSesion(t *testing.T) {
	root, commit := repoGit(t)
	p := planConDosSesiones(commit)

	var out strings.Builder
	if err := cmdStatusJSON(&out, p, root); err != nil {
		t.Fatalf("status --json falló: %v", err)
	}
	if strings.Contains(out.String(), "radar sesion") {
		t.Fatalf("status --json no cambia: %s", out.String())
	}
}

func TestParsearArgsAceptaIDAntesYDespuesDeLasBanderas(t *testing.T) {
	for _, args := range [][]string{{"-C", "/repo", "S114"}, {"S114", "-C", "/repo"}} {
		opts, posicionales, err := parsearArgs("sesion", args)
		if err != nil {
			t.Fatalf("%v: %v", args, err)
		}
		if opts.raiz != "/repo" || len(posicionales) != 1 || posicionales[0] != "S114" {
			t.Fatalf("%v: raiz=%q posicionales=%v", args, opts.raiz, posicionales)
		}
	}
}
