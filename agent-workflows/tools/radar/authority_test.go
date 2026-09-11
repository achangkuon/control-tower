package main

import (
	"os/exec"
	"strings"
	"testing"
)

// S112: `autoridad` stops being free text nobody checks. These cover the three
// types, and the one verification `repo` cannot make — that the bytes a
// `decision` citation proves actually name the decision it claims.

func sesionConAutoridad(a Autoridad) *Sesion {
	return &Sesion{ID: "S1", Zona: "z", Resultado: "r", Autoridad: a}
}

func TestAutoridadSinDeclararFallaCerrado(t *testing.T) {
	h := validarAutoridad("/repo", sesionConAutoridad(Autoridad{}))
	if len(h) != 1 || h[0].Regla != "autoridad de Sesión" {
		t.Fatalf("una Sesión sin autoridad debe fallar: %+v", h)
	}
}

func TestAutoridadEnTextoLibreSiguePasando(t *testing.T) {
	// S114 migra Zona por Zona y S115 enciende la exigencia. Exigir el tipo
	// ahora fallaría las 76 Sesiones de una vez.
	if h := validarAutoridad("/repo", sesionConAutoridad(Autoridad{Texto: "Decisiones 88 y 95"})); len(h) != 0 {
		t.Fatalf("la forma vieja todavía no se exige: %+v", h)
	}
}

func TestAutoridadConTipoDesconocidoFallaCerrado(t *testing.T) {
	h := validarAutoridad("/repo", sesionConAutoridad(Autoridad{Tipo: "inventado"}))
	if len(h) != 1 || h[0].Regla != "autoridad" {
		t.Fatalf("un tipo fuera del conjunto cerrado debe fallar: %+v", h)
	}
	if !strings.Contains(h[0].Detalle, "repo, decision, engram") {
		t.Fatalf("el hallazgo debe nombrar los tres tipos válidos: %s", h[0].Detalle)
	}
}

func TestAutoridadEngramSeDeclaraYNoSePrueba(t *testing.T) {
	h := validarAutoridad("/repo", sesionConAutoridad(Autoridad{Tipo: "engram", ID: 9921}))
	if len(h) != 1 || h[0].Severidad != "aviso" || h[0].Regla != "autoridad no verificable" {
		t.Fatalf("engram se reporta como no verificable, no como error: %+v", h)
	}
	if !strings.Contains(h[0].Detalle, "9921") {
		t.Fatalf("el aviso debe nombrar la observación citada: %s", h[0].Detalle)
	}
}

func TestAutoridadEngramExigeUnID(t *testing.T) {
	h := validarAutoridad("/repo", sesionConAutoridad(Autoridad{Tipo: "engram"}))
	if len(h) != 1 || h[0].Severidad != "error" {
		t.Fatalf("citar Engram sin id debe fallar: %+v", h)
	}
}

func TestAutoridadDecisionExigeNumeroYRegistro(t *testing.T) {
	casos := map[string]Autoridad{
		"sin número":      {Tipo: "decision", Loc: FragmentLocator{Path: RegistroDeDecisiones}},
		"fuera del libro": {Tipo: "decision", Ref: 55, Loc: FragmentLocator{Path: "openspec/plans/decision-register.md"}},
	}
	for nombre, a := range casos {
		t.Run(nombre, func(t *testing.T) {
			h := validarAutoridad("/repo", sesionConAutoridad(a))
			if len(h) != 1 || h[0].Severidad != "error" || h[0].Regla != "autoridad" {
				t.Fatalf("debe fallar cerrado: %+v", h)
			}
		})
	}
}

// decision55 is the real locator for `## Decisión 55` in the frozen register,
// computed from the tree. A test using invented bytes would prove nothing.
func decision55(t *testing.T) (string, Autoridad) {
	t.Helper()
	raw, err := exec.Command("git", "rev-parse", "--show-toplevel").Output()
	if err != nil {
		t.Skip("no hay repositorio git")
	}
	repo := strings.TrimSpace(string(raw))
	commit, err := exec.Command("git", "-C", repo, "rev-parse", "HEAD").Output()
	if err != nil {
		t.Skip("no se pudo fijar HEAD")
	}
	blob, err := exec.Command("git", "-C", repo, "rev-parse", "HEAD:"+RegistroDeDecisiones).Output()
	if err != nil {
		t.Skipf("%s no está en HEAD", RegistroDeDecisiones)
	}
	return repo, Autoridad{
		Tipo: "decision",
		Ref:  55,
		Loc: FragmentLocator{
			Commit:         strings.TrimSpace(string(commit)),
			Path:           RegistroDeDecisiones,
			Blob:           strings.TrimSpace(string(blob)),
			LineStart:      187,
			LineEnd:        188,
			ByteStart:      68892,
			ByteEnd:        68975,
			FragmentSHA256: "5f81e57cd92a49a18f44aa642cbd53d2bc93585825ebcca145d8c4d04687c27c",
		},
	}
}

func TestAutoridadDecisionSePruebaContraElRegistroReal(t *testing.T) {
	repo, a := decision55(t)
	if h := validarAutoridad(repo, sesionConAutoridad(a)); len(h) != 0 {
		t.Fatalf("una cita exacta a la Decisión 55 debe pasar: %+v", h)
	}
}

func TestAutoridadDecisionRechazaUnNumeroQueElFragmentoNoNombra(t *testing.T) {
	// Es la única verificación que el tipo repo no puede hacer: los bytes
	// existen y el sha coincide, pero nombran otra decisión.
	repo, a := decision55(t)
	a.Ref = 56
	h := validarAutoridad(repo, sesionConAutoridad(a))
	if len(h) != 1 || !strings.Contains(h[0].Detalle, "no la nombra") {
		t.Fatalf("un número que el fragmento no nombra debe fallar: %+v", h)
	}
}

func TestFragmentoNombraLasDosFormasDelRegistro(t *testing.T) {
	casos := []struct {
		nombre    string
		fragmento string
		ref       int
		espera    bool
	}{
		{"encabezado exacto", "## Decisión 55 — la radiografía", 55, true},
		{"encabezado de rango", "## Decisiones 49–53 — cierre de P9", 51, true},
		{"borde inferior del rango", "## Decisiones 49–53 — cierre", 49, true},
		{"borde superior del rango", "## Decisiones 49–53 — cierre", 53, true},
		{"fuera del rango", "## Decisiones 49–53 — cierre", 54, false},
		{"lista numerada vieja", "30. **Árbitro documental:** gana el STATUS", 30, true},
		{"otro número en el texto", "## Decisión 55 — ver la 400 líneas", 99, false},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			if got := fragmentoNombra(c.fragmento, c.ref); got != c.espera {
				t.Fatalf("fragmentoNombra(%q, %d) = %v", c.fragmento, c.ref, got)
			}
		})
	}
}

func TestAutoridadAceptaLasDosFormasAlCargarElYAML(t *testing.T) {
	raw := "schema: plan\nschema_version: 3\nproducto: x\nsesiones:\n" +
		"  - id: S1\n    autoridad: texto libre de siempre\n" +
		"  - id: S2\n    autoridad:\n      tipo: engram\n      id: 9921\n"
	p, err := loadYAML(t, raw)
	if err != nil {
		t.Fatalf("el plan con las dos formas debe cargar: %v", err)
	}
	if p.Sesiones[0].Autoridad.Tipada() || p.Sesiones[0].Autoridad.Texto != "texto libre de siempre" {
		t.Fatalf("la forma vieja se pierde al cargar: %+v", p.Sesiones[0].Autoridad)
	}
	if !p.Sesiones[1].Autoridad.Tipada() || p.Sesiones[1].Autoridad.ID != 9921 {
		t.Fatalf("la forma tipada se pierde al cargar: %+v", p.Sesiones[1].Autoridad)
	}
}
