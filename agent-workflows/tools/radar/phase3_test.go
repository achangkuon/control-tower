package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func sesionEjecutable(id, zona string) Sesion {
	return Sesion{
		ID:        id,
		Zona:      zona,
		Resultado: "resultado observable",
		Autoridad: Autoridad{Texto: "PRD §1"},
		Criterios: []string{"el resultado existe"},
		Ruta:      RutaSesion{Propuesta: "direct", Autoridad: "RFC §1"},
		Modulos: []Modulo{{
			ID:        "M" + strings.TrimPrefix(id, "S") + ".1",
			Resultado: "cambio coherente",
			Rutas:     []string{"tracked.txt"},
			Tareas: []Tarea{{
				ID:        "T" + strings.TrimPrefix(id, "S") + ".1.1",
				Accion:    "probar el resultado",
				Resultado: "resultado probado",
				Criterios: []string{"la prueba observa el fallo o el éxito"},
			}},
		}},
	}
}

func TestJerarquiaExigeModulosYTareas(t *testing.T) {
	casos := []struct {
		nombre string
		sesion Sesion
		regla  string
	}{
		{"sin Módulos", Sesion{ID: "S1", Zona: "z", Criterios: []string{"x"}, Ruta: RutaSesion{Propuesta: "direct", Autoridad: "RFC"}}, "profundidad por ruta"},
		{"sin Tareas", Sesion{ID: "S1", Zona: "z", Criterios: []string{"x"}, Ruta: RutaSesion{Propuesta: "direct", Autoridad: "RFC"}, Modulos: []Modulo{{ID: "M1.1", Rutas: []string{"tracked.txt"}}}}, "jerarquía"},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{c.sesion}}
			if len(hallazgosDe(p.checkSesiones(""), c.regla)) == 0 {
				t.Fatal("la jerarquía incompleta debería fallar")
			}
		})
	}
}

func TestIDsDeModuloYTareaDebenPertenecerASuPadre(t *testing.T) {
	s := sesionEjecutable("S23", "z")
	s.Modulos[0].ID = "M24.1"
	s.Modulos[0].Tareas[0].ID = "T24.1.1"
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	if got := hallazgosDe(p.checkSesiones(""), "identificadores"); len(got) != 1 {
		t.Fatalf("sólo el Módulo inconsistente con la Sesión debería fallar; la Tarea pertenece al Módulo: fue %#v", got)
	}
}

func TestIDsDeModuloYTareaSonUnicosEnTodoElPlan(t *testing.T) {
	s1 := sesionEjecutable("S1", "z")
	s2 := sesionEjecutable("S2", "z")
	s2.Modulos[0].ID = s1.Modulos[0].ID
	s2.Modulos[0].Tareas[0].ID = s1.Modulos[0].Tareas[0].ID
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s1, s2}}
	if got := hallazgosDe(p.checkSesiones(""), "identificadores"); len(got) < 2 {
		t.Fatalf("IDs globalmente repetidos deberían fallar; fue %#v", got)
	}
}

func TestRutaPropuestaUsaConjuntoCerradoYAutoridad(t *testing.T) {
	s := sesionEjecutable("S1", "z")
	s.Ruta = RutaSesion{Propuesta: "inventada"}
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	if got := hallazgosDe(p.checkSesiones(""), "ruta propuesta"); len(got) != 1 {
		t.Fatalf("ruta fuera del conjunto o sin autoridad debe fallar; fue %#v", got)
	}
}

func TestRutaRevalidadaUsaHEADExactoYExplicaCambios(t *testing.T) {
	root, head := repoGit(t)
	s := sesionEjecutable("S1", "z")
	s.Ruta.Revalidacion = &Revalidacion{Resultado: "design-tasks", Base: head, Evidencia: "readiness/1"}
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	if got := hallazgosDe(p.checkSesiones(root), "ruta revalidada"); len(got) != 1 || !strings.Contains(got[0].Detalle, "sin registrar razón") {
		t.Fatalf("un cambio sin razón debería ser el único error de revalidación; fue %#v", got)
	}
	s.Ruta.Revalidacion.Razon = "la base agregó un contrato compartido"
	if got := hallazgosDe(p.checkSesiones(root), "ruta revalidada"); len(got) != 0 {
		t.Fatalf("revalidación completa debería ser válida; fue %#v", got)
	}
}

func TestRutaRevalidadaSobreOtraBaseFalla(t *testing.T) {
	root, _ := repoGit(t)
	s := sesionEjecutable("S1", "z")
	s.Ruta.Revalidacion = &Revalidacion{Resultado: "direct", Base: strings.Repeat("0", 40), Evidencia: "readiness/1"}
	p := &Plan{Zonas: []Zona{{ID: "z", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{s}}
	if len(hallazgosDe(p.checkSesiones(root), "ruta revalidada")) == 0 {
		t.Fatal("una revalidación stale debe fallar")
	}
}

func TestEntregaAceptaPushDirectoYPRPositivoOpcional(t *testing.T) {
	root, head := repoGit(t)
	s := Sesion{ID: "S1", Zona: "z", Entrega: &Entrega{Commit: head}}
	p := &Plan{Sesiones: []Sesion{s}}
	if got := hallazgosDe(p.checkSesiones(root), "entrega"); len(got) != 0 {
		t.Fatalf("un commit integrado sin PR es evidencia válida; fue %#v", got)
	}
	pr := 0
	p.Sesiones[0].Entrega.PR = &pr
	if got := hallazgosDe(p.checkSesiones(root), "entrega"); len(got) != 1 {
		t.Fatalf("un PR presente debe ser positivo; fue %#v", got)
	}
}

func TestEntregaDeOtraRamaNoOtorgaCompleto(t *testing.T) {
	root, base := repoGit(t)
	if out, err := exec.Command("git", "-C", root, "checkout", "-qb", "lateral").CombinedOutput(); err != nil {
		t.Fatalf("crear rama: %v: %s", err, out)
	}
	if err := os.WriteFile(filepath.Join(root, "lateral.txt"), []byte("lateral\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{{"add", "lateral.txt"}, {"commit", "-qm", "lateral"}} {
		if out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
	}
	lateral, err := gitHEAD(root)
	if err != nil {
		t.Fatal(err)
	}
	if out, err := exec.Command("git", "-C", root, "checkout", "-q", base).CombinedOutput(); err != nil {
		t.Fatalf("volver al integrado: %v: %s", err, out)
	}
	p := &Plan{Sesiones: []Sesion{{ID: "S1", Zona: "z", Entrega: &Entrega{Commit: lateral}}}}
	if len(hallazgosDe(p.checkSesiones(root), "entrega integrada")) != 1 {
		t.Fatal("un commit lateral debe fallar validación")
	}
	if got := p.Estados(root)["S1"]; got == Completo {
		t.Fatal("un commit lateral no puede derivar COMPLETO")
	}
}

func TestLoadRechazaEstadoMutableYSchemaV1(t *testing.T) {
	for _, raw := range []string{
		"schema: plan\nschema_version: 2\nproducto: x\nsesiones:\n  - id: S1\n    estado: LISTO\n",
		"schema: plan\nschema_version: 1\nproducto: x\n",
	} {
		dir := t.TempDir()
		path := filepath.Join(dir, "plan.yaml")
		if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
			t.Fatal(err)
		}
		if p, err := Load(path); err == nil {
			t.Fatalf("el dato incompatible debería rechazarse; cargó %#v", p)
		}
	}
}
