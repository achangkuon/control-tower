package main

import (
	"fmt"
	"os/exec"
	"strings"
	"testing"
)

// S111 made radar read gentle-ai.sdd-status instead of believing a boolean.
// S135 narrows that contract: only a full-sdd Sesión runs the native SDD
// pipeline, so only a full-sdd Sesión may declare `cambio`.

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

// sinConsultarGentleAI fails the test if radar asks gentle-ai anything.
func sinConsultarGentleAI(t *testing.T) {
	t.Helper()
	status, attempt := runSDDStatus, runSDDAttemptStatus
	t.Cleanup(func() { runSDDStatus, runSDDAttemptStatus = status, attempt })
	runSDDStatus = func(root, change string) ([]byte, error) {
		t.Fatalf("radar no debe consultar sdd-status para %q", change)
		return nil, nil
	}
	runSDDAttemptStatus = func(root, change string) ([]byte, error) {
		t.Fatalf("radar no debe consultar sdd-attempt para %q", change)
		return nil, nil
	}
}

func statusValido(next string) string {
	return fmt.Sprintf(`{"schemaName":"gentle-ai.sdd-status","schemaVersion":2,"nextRecommended":%q}`, next)
}

func sesionConCambio(ruta string) *Sesion {
	return &Sesion{ID: "S1", Cambio: "un-cambio", Ruta: RutaSesion{Propuesta: ruta}}
}

func TestCambioFueraDeFullSDDFallaSinConsultarGentleAI(t *testing.T) {
	for _, ruta := range []string{"direct", "design-tasks"} {
		t.Run(ruta, func(t *testing.T) {
			sinConsultarGentleAI(t)
			h := checkPuertaSDD("/repo", sesionConCambio(ruta))
			if len(h) != 1 || h[0].Regla != "cambio SDD" {
				t.Fatalf("se esperaba un hallazgo de cambio SDD, salió %+v", h)
			}
			if !strings.Contains(h[0].Detalle, "S1") || !strings.Contains(h[0].Detalle, ruta) || !strings.Contains(h[0].Detalle, "full-sdd") {
				t.Fatalf("el hallazgo debe nombrar la Sesión, su ruta y full-sdd: %s", h[0].Detalle)
			}
		})
	}
}

func TestCheckNoConsultaElLedgerParaCambioFueraDeFullSDD(t *testing.T) {
	root, head := repoGit(t)
	sinConsultarGentleAI(t)
	p := &Plan{Sesiones: []Sesion{*sesionConCambio("direct")}}
	if got := hallazgosDe(p.CheckAt(root, head), "cambio SDD"); len(got) != 1 {
		t.Fatalf("radar check debe rechazar el cambio de una Sesión direct; salió %+v", got)
	}
}

func TestCheckNoConsultaGentleAIConRutaInvalidaYCambio(t *testing.T) {
	// checkRuta owns an invalid route; radar must not ask gentle-ai about a change
	// that no full-sdd Sesión owns.
	root, head := repoGit(t)
	sinConsultarGentleAI(t)
	p := &Plan{Sesiones: []Sesion{*sesionConCambio("inventada")}}
	if got := hallazgosDe(p.CheckAt(root, head), "ledger SDD"); len(got) != 0 {
		t.Fatalf("una ruta inválida no debe consultar el ledger; salió %+v", got)
	}
}

func TestPuertaSDDAceptaFullSDDEnCualquierFaseDelPipeline(t *testing.T) {
	for _, next := range []string{"proposal", "design", "apply", "archive"} {
		t.Run(next, func(t *testing.T) {
			conStatusSDD(t, statusValido(next), nil)
			if h := checkPuertaSDD("/repo", sesionConCambio("full-sdd")); len(h) != 0 {
				t.Fatalf("una Sesión full-sdd con su cambio no debe producir hallazgos: %+v", h)
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
			h := checkPuertaSDD("/repo", sesionConCambio("full-sdd"))
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
	sinConsultarGentleAI(t)
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
	sinConsultarGentleAI(t)
	s := sesionConCambio("full-sdd")
	s.Ruta.Revalidacion = &Revalidacion{Resultado: "direct"}
	h := checkPuertaSDD("/repo", s)
	if len(h) != 1 || h[0].Regla != "cambio SDD" || !strings.Contains(h[0].Detalle, "direct") {
		t.Fatalf("debe juzgar la ruta revalidada, no la propuesta: %+v", h)
	}
}
