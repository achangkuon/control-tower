package main

import (
	"fmt"
	"os/exec"
	"strings"
	"testing"
)

// S111: radar used to ask gentle-ai a single boolean and believe whatever the
// plan declared about its route. These cover the contract it now reads instead.

func conStatusSDD(t *testing.T, cuerpo string, fallo error) {
	t.Helper()
	original := runSDDStatus
	t.Cleanup(func() { runSDDStatus = original })
	runSDDStatus = func(root, change string) ([]byte, error) {
		if fallo != nil {
			return nil, fallo
		}
		return []byte(cuerpo), nil
	}
}

func statusValido(next string) string {
	return fmt.Sprintf(`{"schemaName":"gentle-ai.sdd-status","schemaVersion":2,"nextRecommended":%q}`, next)
}

func sesionConCambio(ruta string) *Sesion {
	return &Sesion{ID: "S1", Cambio: "un-cambio", Ruta: RutaSesion{Propuesta: ruta}}
}

func TestPuertaSDDRechazaUnaRutaQueEntraAntesDeLoQuePuedeCorrer(t *testing.T) {
	casos := map[string]struct{ ruta, next, espera string }{
		"direct sin tasks":      {"direct", "tasks", "entra por \"apply\""},
		"direct sin proposal":   {"direct", "proposal", "entra por \"apply\""},
		"design-tasks sin spec": {"design-tasks", "specs", "entra por \"design\""},
		"design-tasks sin nada": {"design-tasks", "proposal", "entra por \"design\""},
	}
	for nombre, c := range casos {
		t.Run(nombre, func(t *testing.T) {
			conStatusSDD(t, statusValido(c.next), nil)
			h := checkPuertaSDD("/repo", sesionConCambio(c.ruta))
			if len(h) != 1 || h[0].Regla != "puerta de ruta" {
				t.Fatalf("se esperaba un hallazgo de puerta de ruta, salió %+v", h)
			}
			if !strings.Contains(h[0].Detalle, c.espera) {
				t.Fatalf("el hallazgo no nombra la puerta declarada: %s", h[0].Detalle)
			}
			if !strings.Contains(h[0].Detalle, c.next) {
				t.Fatalf("el hallazgo no nombra la fase observada: %s", h[0].Detalle)
			}
		})
	}
}

func TestPuertaSDDAceptaUnaRutaQueYaAlcanzoOPasoSuPuerta(t *testing.T) {
	casos := map[string]struct{ ruta, next string }{
		"direct en apply":          {"direct", "apply"},
		"direct ya verificando":    {"direct", "verify"},
		"design-tasks en design":   {"design-tasks", "design"},
		"design-tasks ya en apply": {"design-tasks", "apply"},
		"full-sdd en proposal":     {"full-sdd", "proposal"},
		"full-sdd ya en archive":   {"full-sdd", "archive"},
	}
	for nombre, c := range casos {
		t.Run(nombre, func(t *testing.T) {
			conStatusSDD(t, statusValido(c.next), nil)
			if h := checkPuertaSDD("/repo", sesionConCambio(c.ruta)); len(h) != 0 {
				t.Fatalf("una ruta honesta no debe producir hallazgos: %+v", h)
			}
		})
	}
}

func TestPuertaSDDFallaCerradoAnteUnContratoQueNoReconoce(t *testing.T) {
	casos := map[string]struct {
		cuerpo string
		fallo  error
		regla  string
	}{
		"schema con otro nombre":   {`{"schemaName":"otra.cosa","schemaVersion":2,"nextRecommended":"apply"}`, nil, "estado SDD"},
		"schema de otra versión":   {`{"schemaName":"gentle-ai.sdd-status","schemaVersion":3,"nextRecommended":"apply"}`, nil, "estado SDD"},
		"JSON inválido":            {`{no es json`, nil, "estado SDD"},
		"segundo valor pegado":     {statusValido("apply") + `{"otro":1}`, nil, "estado SDD"},
		"falta nextRecommended":    {`{"schemaName":"gentle-ai.sdd-status","schemaVersion":2}`, nil, "estado SDD"},
		"el proveedor no responde": {"", fmt.Errorf("gentle-ai ausente"), "estado SDD"},
		"fase fuera del pipeline":  {statusValido("select-change"), nil, "puerta de ruta"},
	}
	for nombre, c := range casos {
		t.Run(nombre, func(t *testing.T) {
			conStatusSDD(t, c.cuerpo, c.fallo)
			h := checkPuertaSDD("/repo", sesionConCambio("direct"))
			if len(h) != 1 || h[0].Regla != c.regla {
				t.Fatalf("se esperaba un hallazgo %q, salió %+v", c.regla, h)
			}
			if !strings.Contains(h[0].Detalle, "S1") {
				t.Fatalf("el hallazgo no nombra la Sesión: %s", h[0].Detalle)
			}
		})
	}
}

func TestPuertaSDDNoRepiteElHallazgoDeUnaRutaInvalida(t *testing.T) {
	// checkRuta ya reporta un valor de ruta fuera del conjunto cerrado. Decirlo
	// dos veces con otras palabras no ayuda a nadie.
	conStatusSDD(t, statusValido("proposal"), nil)
	if h := checkPuertaSDD("/repo", sesionConCambio("inventada")); len(h) != 0 {
		t.Fatalf("una ruta inválida la reporta checkRuta, no esta función: %+v", h)
	}
}

// TestEstadoSDDSeLeeDelProveedorReal exercises the invocation and the field
// names against the installed binary. Every other test in this file feeds
// hand-written JSON, so none of them would catch a wrong flag or a renamed
// field — exactly the two mistakes that make a contract consumer useless.
func TestEstadoSDDSeLeeDelProveedorReal(t *testing.T) {
	if _, err := exec.LookPath(sddAttemptExecutable); err != nil {
		t.Skipf("%s no está instalado", sddAttemptExecutable)
	}
	root, err := exec.Command("git", "rev-parse", "--show-toplevel").Output()
	if err != nil {
		t.Skip("no hay repositorio git")
	}
	repo := strings.TrimSpace(string(root))

	listado, err := exec.Command(sddAttemptExecutable, "sdd-status", "--cwd", repo).CombinedOutput()
	if err != nil && len(listado) == 0 {
		t.Skip("el proveedor no respondió")
	}
	cambio := ""
	for _, linea := range strings.Split(string(listado), "\n") {
		if _, resto, ok := strings.Cut(linea, "sdd-status "); ok {
			if nombre, _, ok := strings.Cut(resto, " "); ok {
				cambio = nombre
				break
			}
		}
	}
	if cambio == "" {
		t.Skip("el repositorio no tiene ningún cambio SDD para consultar")
	}

	status, err := readSDDStatus(repo, cambio)
	if err != nil {
		t.Fatalf("el contrato real no se pudo leer para %q: %v", cambio, err)
	}
	if fasePos(status.Next) < 0 {
		t.Fatalf("el proveedor reporta la fase %q, que no está en FasesSDD: el contrato cambió", status.Next)
	}
}

func TestPuertaSDDUsaLaRevalidacionCuandoExiste(t *testing.T) {
	// La revalidación gana sobre la propuesta: es la decisión de implementación.
	conStatusSDD(t, statusValido("design"), nil)
	s := sesionConCambio("full-sdd")
	s.Ruta.Revalidacion = &Revalidacion{Resultado: "direct"}
	h := checkPuertaSDD("/repo", s)
	if len(h) != 1 || !strings.Contains(h[0].Detalle, "direct") {
		t.Fatalf("debe juzgar la ruta revalidada, no la propuesta: %+v", h)
	}
}
