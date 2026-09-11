package main

import (
	"strings"
	"testing"
)

// S113: archiving has three legitimate paths, not one. The six archived
// Sesiones of the live plan proved it — four are replaced, and S4.9 and S9.4
// are retained as historical evidence with neither delivery nor replacement.
//
// The path is never inferred. Inferring "historical" from the absence of the
// other two would turn every forgotten delivery into legitimate history, which
// is the exact mistake this check exists to catch.

func archivada(id string, camino string) Sesion {
	return Sesion{ID: id, Zona: "z", Resultado: "r", Autoridad: Autoridad{Texto: "a"},
		Criterios: []string{"c"}, Archivada: true, Archivo: camino}
}

func TestArchivoRechazaUnCaminoFueraDelConjunto(t *testing.T) {
	// Que el valor sea uno de los tres es una cosa; que su evidencia esté es
	// otra, y la cubren los tests por camino.
	s := archivada("S1", "inventado")
	h := hallazgosDe(validarArchivo(&Plan{}, &s), "camino de archivo")
	if len(h) != 1 {
		t.Fatalf("un camino fuera del conjunto cerrado debe fallar: %+v", h)
	}
	if !strings.Contains(h[0].Detalle, "entregada, reemplazada, historica") {
		t.Fatalf("el hallazgo debe nombrar los tres caminos: %s", h[0].Detalle)
	}
}

func TestArchivoSinDeclararTodaviaPasa(t *testing.T) {
	// Exigirlo acá fallaría S4.9 y S9.4, que hoy no tienen cómo declararlo.
	s := archivada("S1", "")
	if h := validarArchivo(&Plan{}, &s); len(h) != 0 {
		t.Fatalf("la exigencia se enciende en una Sesión posterior: %+v", h)
	}
}

func TestArchivoEntregadaExigeEvidenciaIntegrada(t *testing.T) {
	s := archivada("S1", "entregada")
	h := hallazgosDe(validarArchivo(&Plan{}, &s), "camino de archivo")
	if len(h) != 1 || !strings.Contains(h[0].Detalle, "entrega") {
		t.Fatalf("declarar entrega sin evidencia debe fallar: %+v", h)
	}
	s.Entrega = &Entrega{Commit: "abc"}
	if h := hallazgosDe(validarArchivo(&Plan{}, &s), "camino de archivo"); len(h) != 0 {
		t.Fatalf("con evidencia declarada debe pasar: %+v", h)
	}
}

func TestArchivoReemplazadaExigeUnaSucesora(t *testing.T) {
	s := archivada("S1", "reemplazada")
	p := &Plan{Sesiones: []Sesion{s}}
	h := hallazgosDe(validarArchivo(p, &p.Sesiones[0]), "camino de archivo")
	if len(h) != 1 || !strings.Contains(h[0].Detalle, "sucesora") {
		t.Fatalf("declarar reemplazo sin sucesora debe fallar: %+v", h)
	}
}

func TestArchivoReemplazadaAceptaLasDosFormasDeSucesion(t *testing.T) {
	// El plan usa las dos: `reemplaza` en una Sesión, y `replaces` en una
	// sucesora futura de references. S5.14 llega por la primera y S9.3 por la
	// segunda, así que ninguna de las dos puede quedar afuera.
	t.Run("desde una Sesión", func(t *testing.T) {
		p := &Plan{Sesiones: []Sesion{
			archivada("S1", "reemplazada"),
			{ID: "S2", Reemplaza: []string{"S1"}},
		}}
		if h := hallazgosDe(validarArchivo(p, &p.Sesiones[0]), "camino de archivo"); len(h) != 0 {
			t.Fatalf("una sucesora declarada en el plan alcanza: %+v", h)
		}
	})
	t.Run("desde una sucesora futura", func(t *testing.T) {
		p := &Plan{
			Sesiones:   []Sesion{archivada("S1", "reemplazada")},
			References: &References{FutureSuccessors: []FutureSuccessor{{ID: "S100", Replaces: []string{"S1"}}}},
		}
		if h := hallazgosDe(validarArchivo(p, &p.Sesiones[0]), "camino de archivo"); len(h) != 0 {
			t.Fatalf("una sucesora futura también alcanza: %+v", h)
		}
	})
}

func TestArchivoHistoricaNoExigeNada(t *testing.T) {
	// Es el caso de S4.9 y S9.4: ni entrega ni reemplazo, y es legítimo.
	s := archivada("S1", "historica")
	if h := hallazgosDe(validarArchivo(&Plan{}, &s), "camino de archivo"); len(h) != 0 {
		t.Fatalf("evidencia histórica no exige entrega ni sucesora: %+v", h)
	}
}

func TestArchivoNoAplicaAUnaSesionViva(t *testing.T) {
	s := Sesion{ID: "S1", Archivo: "historica"}
	h := hallazgosDe(validarArchivo(&Plan{}, &s), "camino de archivo")
	if len(h) != 1 || !strings.Contains(h[0].Detalle, "no está archivada") {
		t.Fatalf("declarar un camino sin estar archivada debe fallar: %+v", h)
	}
}

// --- tope del lote de revisión ---

func TestTopeAusenteNoSeMideYNoFalla(t *testing.T) {
	// Una herramienta que inventa una política que nadie declaró es peor que
	// una que no la verifica.
	p := &Plan{}
	if h := validarTopeDeLote(p, 10_000); len(h) != 0 {
		t.Fatalf("sin tope declarado no hay nada que medir: %+v", h)
	}
}

func TestTopeDeclaradoMideYAvisaAlSuperarse(t *testing.T) {
	p := &Plan{Politica: Politica{TopeDeLote: 400}}
	if h := validarTopeDeLote(p, 400); len(h) != 0 {
		t.Fatalf("el borde exacto no supera el tope: %+v", h)
	}
	h := hallazgosDe(validarTopeDeLote(p, 401), "tope de lote")
	if len(h) != 1 {
		t.Fatalf("superar el tope debe producir un hallazgo: %+v", h)
	}
	if !strings.Contains(h[0].Detalle, "401") || !strings.Contains(h[0].Detalle, "400") {
		t.Fatalf("el hallazgo debe nombrar las líneas y el tope: %s", h[0].Detalle)
	}
}

// TestLoteEntregadoSeMideContraUnCommitReal exercises the measurement against
// git rather than a fixture. The other tests here feed a line count directly,
// so none of them would catch a wrong numstat invocation — the mistake that
// makes a measurement silently report zero.
func TestLoteEntregadoSeMideContraUnCommitReal(t *testing.T) {
	root, head := repoGit(t)
	lineas, err := lineasEscritas(root, head)
	if err != nil {
		t.Fatalf("no se pudo medir %s: %v", head, err)
	}
	if lineas <= 0 {
		t.Fatalf("un commit con contenido no puede medir %d líneas: la invocación de numstat está mal", lineas)
	}
}

func TestTopeNegativoEsUnaDeclaracionInvalida(t *testing.T) {
	p := &Plan{Politica: Politica{TopeDeLote: -1}}
	if h := hallazgosDe(validarTopeDeLote(p, 1), "tope de lote"); len(h) != 1 {
		t.Fatalf("un tope negativo debe fallar como declaración inválida: %+v", h)
	}
}
