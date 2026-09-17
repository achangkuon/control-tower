package main

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func encargoValido() Encargo {
	return Encargo{
		PedidoContexto:          "Adaptar el contrato de Sesión aprobado.",
		ResultadoComportamiento: "La Sesión muestra el resultado observable y conserva sus requisitos.",
		RestriccionesDecisiones: "No cambia el snapshot/v1 ni habilita concurrencia nueva.",
		Referencias:             "openspec/plan.yaml",
	}
}

func sesionEncargo(id, zona string) Sesion {
	return Sesion{
		ID:         id,
		Zona:       zona,
		Resultado:  "resultado coordinado",
		Autoridad:  Autoridad{Texto: "aprobación humana"},
		Archivos:   []string{"native.txt"},
		Encargo:    &Encargo{},
		Prioridad:  "",
		Decisiones: nil,
	}
}

func planEncargoValido() *Plan {
	s := sesionEncargo("S1", "native")
	s.Encargo = ptrEncargo(encargoValido())
	return &Plan{
		Producto: "fixture",
		Zonas: []Zona{
			{ID: "base", Rutas: []string{"tracked.txt"}},
			{ID: "native", Rutas: []string{"native.txt"}},
		},
		Sesiones: []Sesion{s},
	}
}

func ptrEncargo(value Encargo) *Encargo { return &value }

func erroresEncargo(h []Hallazgo) []Hallazgo {
	var out []Hallazgo
	for _, finding := range h {
		if finding.Severidad == "error" {
			out = append(out, finding)
		}
	}
	return out
}

func TestEncargoAceptaSesionODDConArchivosExactosYCuatroSecciones(t *testing.T) {
	root, head := repoGit(t)
	p := planEncargoValido()
	if got := p.checkSesionesAt(root, head); len(got) != 0 {
		t.Fatalf("la Sesión native ODD fue rechazada: %#v", got)
	}
	if got := p.EstadosAt(root, head)["S1"]; got != Listo {
		t.Fatalf("estado native = %s, quiere LISTO", got)
	}
	if got := p.Area(&p.Sesiones[0]); strings.Join(got, ",") != "native.txt" {
		t.Fatalf("el Área por Zona cambió: %v", got)
	}
	if len(p.Sesiones[0].Modulos) != 0 || p.Sesiones[0].Ruta != (RutaSesion{}) {
		t.Fatal("el encargo native no usa el contrato legacy de ruta o Módulos")
	}

	var sesion strings.Builder
	escribirSesion(&sesion, p, &p.Sesiones[0], p.EstadosAt(root, head))
	for _, want := range []string{
		"Archivos autorizados: native.txt",
		"Encargo:",
		"Pedido y contexto: Adaptar el contrato de Sesión aprobado.",
		"Resultado y comportamiento: La Sesión muestra el resultado observable y conserva sus requisitos.",
		"Restricciones y decisiones: No cambia el snapshot/v1 ni habilita concurrencia nueva.",
		"Referencias: openspec/plan.yaml",
	} {
		if !strings.Contains(sesion.String(), want) {
			t.Fatalf("radar sesion no muestra %q:\n%s", want, sesion.String())
		}
	}

	render := string(RenderAt(p, root, head))
	for _, want := range []string{"## Detalle de Sesiones", "### S1 — resultado coordinado", "Archivos autorizados: native.txt", "Pedido y contexto"} {
		if !strings.Contains(render, want) {
			t.Fatalf("render native no muestra %q:\n%s", want, render)
		}
	}
}

func TestEncargoRenderNeutralizaControlesSinCambiarEstructura(t *testing.T) {
	root, head := repoGit(t)
	p := planEncargoValido()
	p.Sesiones[0].Encargo.PedidoContexto = "pedido\n## encabezado <script> & `code`"
	render := string(RenderAt(p, root, head))
	for _, unsafe := range []string{"<script>", "\n## encabezado", "`code`"} {
		if strings.Contains(render, unsafe) {
			t.Fatalf("el render dejó control Markdown/HTML %q:\n%s", unsafe, render)
		}
	}
	for _, safe := range []string{"&lt;script&gt;", "&#35;&#35; encabezado", "&#96;code&#96;"} {
		if !strings.Contains(render, safe) {
			t.Fatalf("el render no neutralizó %q:\n%s", safe, render)
		}
	}
}

func TestEncargoRechazaArchivosNoExactosYRespetaPropiedadFutura(t *testing.T) {
	root, head := repoGit(t)
	base := planEncargoValido()
	for _, path := range []string{"../escape.txt", "/escape.txt", "native/*.txt", "native/", " native.txt", "native.txt "} {
		t.Run(path, func(t *testing.T) {
			p := *base
			p.Sesiones = append([]Sesion(nil), base.Sesiones...)
			p.Sesiones[0].Archivos = []string{path}
			if len(hallazgosDe(p.checkSesionesAt(root, head), "archivo autorizado")) == 0 {
				t.Fatalf("se aceptó la ruta no exacta %q", path)
			}
		})
	}

	t.Run("symlink", func(t *testing.T) {
		if err := os.Symlink("tracked.txt", filepath.Join(root, "native-link.txt")); err != nil {
			t.Fatal(err)
		}
		p := planEncargoValido()
		p.Zonas[1].Rutas = []string{"native-link.txt"}
		p.Sesiones[0].Archivos = []string{"native-link.txt"}
		if len(hallazgosDe(p.checkSesionesAt(root, head), "archivo autorizado")) == 0 {
			t.Fatal("se aceptó un enlace simbólico como archivo autorizado")
		}
	})

	t.Run("future path belongs to declared Zone", func(t *testing.T) {
		p := planEncargoValido()
		p.Sesiones[0].Zona = "base"
		if len(hallazgosDe(p.checkSesionesAt(root, head), "autoridad de archivo")) == 0 {
			t.Fatal("una ruta futura fuera de la Zona fue autorizada")
		}
	})

	t.Run("exact foundation requires exact reservation", func(t *testing.T) {
		p := planEncargoValido()
		p.Cimientos.Rutas = []string{"native.txt"}
		p.Sesiones[0].Zona = "base"
		p.Sesiones[0].Cimientos = nil
		if len(hallazgosDe(p.checkSesionesAt(root, head), "autoridad de archivo")) == 0 {
			t.Fatal("un Cimiento no reservado fue autorizado")
		}
		p.Sesiones[0].Cimientos = []string{"native.txt"}
		if got := p.checkSesionesAt(root, head); len(got) != 0 {
			t.Fatalf("un Cimiento exacto reservado fue rechazado: %#v", got)
		}
	})
}

func TestEncargoDistingueReadOnlyDeEvidenciaFaltanteEIncompleta(t *testing.T) {
	root, head := repoGit(t)
	readOnly := planEncargoValido()
	readOnly.Sesiones[0].Archivos = nil
	readOnly.Sesiones[0].SoloLectura = true
	if got := readOnly.checkSesionesAt(root, head); len(got) != 0 {
		t.Fatalf("la Sesión read-only explícita fue rechazada: %#v", got)
	}
	if got := readOnly.EstadosAt(root, head)["S1"]; got != Listo {
		t.Fatalf("read-only explícita = %s, quiere LISTO", got)
	}

	missing := planEncargoValido()
	missing.Sesiones[0].Archivos = nil
	if len(hallazgosDe(missing.checkSesionesAt(root, head), "archivo autorizado")) == 0 {
		t.Fatal("la ausencia de archivos se confundió con read-only")
	}

	incomplete := planEncargoValido()
	incomplete.Sesiones[0].Zona = ""
	incomplete.Sesiones[0].Archivos = nil
	incomplete.Sesiones[0].Encargo = ptrEncargo(Encargo{Incompleto: true, PedidoContexto: "Falta resolver el territorio."})
	if got := incomplete.checkSesionesAt(root, head); len(got) != 0 {
		t.Fatalf("el encargo explícitamente incompleto no se puede conservar: %#v", got)
	}
	if got := incomplete.EstadosAt(root, head)["S1"]; got != Bloqueado {
		t.Fatalf("encargo incompleto = %s, quiere BLOQUEADO", got)
	}
	if len(incomplete.ColaPorZonaAt(root, head)) != 0 || len(incomplete.AsientosAt(root, head)) != 0 {
		t.Fatal("el encargo incompleto obtuvo cola o asiento")
	}
	if out := string(RenderAt(incomplete, root, head)); !strings.Contains(out, "Encargo incompleto") || !strings.Contains(out, "Falta resolver el territorio.") {
		t.Fatalf("el encargo incompleto no se muestra claramente:\n%s", out)
	}

	unknown := planEncargoValido()
	unknown.Sesiones[0].Zona = ""
	unknown.Sesiones[0].Archivos = nil
	unknown.Sesiones[0].Encargo = ptrEncargo(Encargo{PedidoContexto: "Falta resolver el territorio."})
	if len(unknown.checkSesionesAt(root, head)) == 0 {
		t.Fatal("un encargo desconocido no marcado incompleto fue aceptado")
	}
}

func TestEncargoIncompletoRenderizaCamposOpcionalesVaciosSinEspacioFinal(t *testing.T) {
	root, head := repoGit(t)
	p := planEncargoValido()
	s := &p.Sesiones[0]
	s.Zona = ""
	s.Archivos = nil
	s.Encargo = ptrEncargo(Encargo{Incompleto: true, PedidoContexto: "Falta resolver el territorio."})

	render := string(RenderAt(p, root, head))
	if !strings.Contains(render, "  - Pedido y contexto: Falta resolver el territorio.\n") {
		t.Fatalf("el pedido incompleto no conservó su contenido:\n%s", render)
	}
	for _, label := range []string{"Resultado y comportamiento", "Restricciones y decisiones", "Referencias"} {
		if !strings.Contains(render, "  - "+label+":\n") {
			t.Fatalf("el campo vacío %q no conservó etiqueta e indentación:\n%s", label, render)
		}
		if strings.Contains(render, "  - "+label+": \n") {
			t.Fatalf("el campo vacío %q dejó espacio final:\n%s", label, render)
		}
	}
}

func TestEncargoProyectaDecisionResueltaSinPreguntaEnCLIMarkdown(t *testing.T) {
	root, head := repoGit(t)
	decision := Decision{
		Tipo:         "resuelta",
		Clase:        "contrato-visible",
		Resolucion:   "Conservar <contrato>",
		Criterio:     "Medir <resultado>",
		Autoridad:    "Mantenedor <11248>",
		Evidencia:    "Registro <evidencia>",
		Checkpoint:   "Antes de <apply>",
		Alcanza:      "encargo",
		Falsificador: "Falla <guardia>",
		Contamina:    []string{"límite <actual>"},
		Contaminaba:  []string{"límite <histórico>"},
		Opciones: []Opcion{
			{Opcion: "Continuar <ODD>", Consecuencia: "Conserva <alcance>"},
		},
		Descartadas: []Descartada{
			{Opcion: "Cambiar <schema>", Razon: "Expande <producto>"},
		},
	}
	fields := []struct {
		label string
		value string
	}{
		{"Resolución", decision.Resolucion},
		{"Criterio", decision.Criterio},
		{"Autoridad", decision.Autoridad},
		{"Evidencia", decision.Evidencia},
		{"Checkpoint", decision.Checkpoint},
		{"Alcanza", decision.Alcanza},
		{"Falsificador", decision.Falsificador},
	}

	for _, tc := range []struct {
		name       string
		incomplete bool
	}{
		{"complete", false},
		{"incomplete", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := planEncargoValido()
			s := &p.Sesiones[0]
			if tc.incomplete {
				s.Zona = ""
				s.Archivos = nil
				s.Encargo = ptrEncargo(Encargo{Incompleto: true, PedidoContexto: "Falta resolver el territorio."})
			}
			s.Decisiones = []Decision{decision}

			var cli strings.Builder
			escribirSesion(&cli, p, s, p.EstadosAt(root, head))
			markdown := string(RenderAt(p, root, head))
			for name, output := range map[string]string{"CLI": cli.String(), "Markdown": markdown} {
				for _, label := range []string{"Pedido y contexto:", "Resultado y comportamiento:", "Restricciones y decisiones:", "Referencias:"} {
					if strings.Count(output, label) != 1 {
						t.Fatalf("%s no conserva exactamente cuatro secciones: falta o duplica %q:\n%s", name, label, output)
					}
				}
				for _, line := range strings.Split(output, "\n") {
					if strings.TrimRight(line, " \t") != line {
						t.Fatalf("%s dejó whitespace final en %q", name, line)
					}
				}
			}

			if !strings.Contains(cli.String(), "Decisión estructurada: [resuelta · contrato-visible]\n") || strings.Contains(cli.String(), "Decisión estructurada: [resuelta · contrato-visible]:") {
				t.Fatalf("CLI inventó o dejó separador para pregunta ausente:\n%s", cli.String())
			}
			if !strings.Contains(markdown, "Decisión estructurada [resuelta · contrato-visible]\n") || strings.Contains(markdown, "Decisión estructurada [resuelta · contrato-visible]:") {
				t.Fatalf("Markdown inventó o dejó separador para pregunta ausente:\n%s", markdown)
			}
			for _, field := range fields {
				if !strings.Contains(cli.String(), field.label+": "+field.value) {
					t.Fatalf("CLI omitió %s %q:\n%s", field.label, field.value, cli.String())
				}
				if !strings.Contains(markdown, field.label+": "+markdownText(field.value)) {
					t.Fatalf("Markdown omitió o no escapó %s %q:\n%s", field.label, field.value, markdown)
				}
			}
			for _, boundary := range []struct {
				label  string
				values []string
			}{
				{"Contamina", decision.Contamina},
				{"Contaminaba", decision.Contaminaba},
			} {
				if !strings.Contains(cli.String(), boundary.label+": "+listaTexto(boundary.values)) {
					t.Fatalf("CLI omitió %s:\n%s", boundary.label, cli.String())
				}
				if !strings.Contains(markdown, boundary.label+": "+markdownList(boundary.values)) {
					t.Fatalf("Markdown omitió o no escapó %s:\n%s", boundary.label, markdown)
				}
			}
			for _, option := range decision.Opciones {
				if !strings.Contains(cli.String(), "Opción: "+option.Opcion+" → "+option.Consecuencia) {
					t.Fatalf("CLI omitió opción disponible:\n%s", cli.String())
				}
				if !strings.Contains(markdown, "Opción: "+markdownText(option.Opcion)+" → "+markdownText(option.Consecuencia)) {
					t.Fatalf("Markdown omitió o no escapó opción disponible:\n%s", markdown)
				}
			}
			for _, discarded := range decision.Descartadas {
				if !strings.Contains(cli.String(), "Descartada: "+discarded.Opcion+" → "+discarded.Razon) {
					t.Fatalf("CLI omitió alternativa descartada:\n%s", cli.String())
				}
				if !strings.Contains(markdown, "Descartada: "+markdownText(discarded.Opcion)+" → "+markdownText(discarded.Razon)) {
					t.Fatalf("Markdown omitió o no escapó alternativa descartada:\n%s", markdown)
				}
			}
		})
	}
}

func TestEncargoSDDExigeSolicitudHumanaConAutoridadYNoReinterpretaLegacy(t *testing.T) {
	root, head := repoGit(t)
	p := planEncargoValido()
	p.Sesiones[0].SolicitudSDD = &SolicitudSDD{SolicitudHumana: true, Autoridad: "decisión 11218"}
	if got := p.checkSesionesAt(root, head); len(got) != 0 {
		t.Fatalf("la solicitud SDD humana explícita fue rechazada: %#v", got)
	}

	for name, mutate := range map[string]func(*Sesion){
		"missing human request": func(s *Sesion) { s.SolicitudSDD = &SolicitudSDD{Autoridad: "decisión 11218"} },
		"missing authority":     func(s *Sesion) { s.SolicitudSDD = &SolicitudSDD{SolicitudHumana: true} },
		"legacy route":          func(s *Sesion) { s.Ruta = RutaSesion{Propuesta: "full-sdd", Autoridad: "legacy"} },
		"legacy modules":        func(s *Sesion) { s.Modulos = []Modulo{{ID: "M1.1"}} },
	} {
		t.Run(name, func(t *testing.T) {
			candidate := planEncargoValido()
			mutate(&candidate.Sesiones[0])
			if len(candidate.checkSesionesAt(root, head)) == 0 {
				t.Fatalf("se aceptó %s en un encargo native", name)
			}
		})
	}

	legacy := sesionEjecutable("S2", "base")
	legacy.SolicitudSDD = &SolicitudSDD{SolicitudHumana: true, Autoridad: "decisión 11218"}
	legacyPlan := &Plan{Zonas: []Zona{{ID: "base", Rutas: []string{"tracked.txt"}}}, Sesiones: []Sesion{legacy}}
	if len(hallazgosDe(legacyPlan.checkSesionesAt(root, head), "contrato legacy")) == 0 {
		t.Fatal("una solicitud_sdd en el contrato legacy fue reinterpretada silenciosamente")
	}
}

func TestEncargoSolicitudSDDActivaLaValidacionProviderSinCambiarODD(t *testing.T) {
	root, head := repoGit(t)
	p := planEncargoValido()
	p.Sesiones[0].SolicitudSDD = &SolicitudSDD{SolicitudHumana: true, Autoridad: "decisión 11218"}
	p.Sesiones[0].Cambio = "native-sdd"

	previousAttempt, previousStatus := runSDDAttemptStatus, runSDDStatus
	defer func() {
		runSDDAttemptStatus, runSDDStatus = previousAttempt, previousStatus
	}()
	attemptCalls, statusCalls := 0, 0
	runSDDAttemptStatus = func(gotRoot, change string) ([]byte, error) {
		attemptCalls++
		if gotRoot != root || change != "native-sdd" {
			t.Fatalf("ledger recibió root/change incorrectos: %q %q", gotRoot, change)
		}
		return []byte(`{"decision_required":false}`), nil
	}
	runSDDStatus = func(gotRoot, change string) ([]byte, error) {
		statusCalls++
		if gotRoot != root || change != "native-sdd" {
			t.Fatalf("status recibió root/change incorrectos: %q %q", gotRoot, change)
		}
		return []byte(`{"schemaName":"gentle-ai.sdd-status","schemaVersion":2,"nextRecommended":"apply"}`), nil
	}
	if got := p.Sesiones[0].RutaEfectiva(); got != RutaSDDNativa {
		t.Fatalf("solicitud SDD efectiva = %q, quiere %q", got, RutaSDDNativa)
	}
	if got := erroresEncargo(p.CheckAt(root, head)); len(got) != 0 || attemptCalls != 1 || statusCalls != 1 {
		t.Fatalf("solicitud SDD no recorrió validación fail-closed: findings=%#v attempt=%d status=%d", got, attemptCalls, statusCalls)
	}

	runSDDAttemptStatus = func(string, string) ([]byte, error) { return []byte(`{}`), nil }
	if len(hallazgosDe(p.CheckAt(root, head), "ledger SDD")) == 0 {
		t.Fatal("un ledger SDD nativo corrupto fue aceptado")
	}

	odd := planEncargoValido()
	odd.Sesiones[0].Cambio = "forbidden-on-odd"
	if len(hallazgosDe(odd.CheckAt(root, head), "contrato de encargo")) == 0 {
		t.Fatal("ODD normal con cambio fue aceptado")
	}
}

func TestEncargoTieneExactamenteCuatroSeccionesSinCriteriosRoot(t *testing.T) {
	root, head := repoGit(t)
	p := planEncargoValido()
	p.Sesiones[0].Criterios = nil
	if got := p.checkSesionesAt(root, head); len(got) != 0 {
		t.Fatalf("encargo sin criterios root fue rechazado: %#v", got)
	}
	var sesion strings.Builder
	escribirSesion(&sesion, p, &p.Sesiones[0], p.EstadosAt(root, head))
	render := string(RenderAt(p, root, head))
	for _, out := range []string{sesion.String(), render} {
		for _, want := range []string{"Pedido y contexto:", "Resultado y comportamiento:", "Restricciones y decisiones:", "Referencias:"} {
			if !strings.Contains(out, want) {
				t.Fatalf("falta sección %q:\n%s", want, out)
			}
		}
		if strings.Contains(out, "Requisitos observables") || strings.Contains(out, "Criterios:") {
			t.Fatalf("un encargo agregó una quinta sección: %s", out)
		}
	}
}

func TestEncargoIncompletoConservaTerritorioConocidoPeroNoEsEjecutable(t *testing.T) {
	root, head := repoGit(t)
	p := planEncargoValido()
	p.Zonas[1].Rutas = []string{"native/"}
	p.Cimientos.Rutas = []string{"native.txt"}
	s := &p.Sesiones[0]
	s.Cimientos = []string{"native.txt"}
	s.Recurso = []string{"shared-resource"}
	s.Encargo.Incompleto = true
	if got := erroresEncargo(p.CheckAt(root, head)); len(got) != 0 {
		t.Fatalf("encargo incompleto con hechos conocidos fue rechazado: %#v", got)
	}
	if got := p.EstadosAt(root, head)[s.ID]; got != Bloqueado {
		t.Fatalf("encargo incompleto conocido = %s, quiere BLOQUEADO", got)
	}
	if len(p.ColaPorZonaAt(root, head)) != 0 || len(p.AsientosAt(root, head)) != 0 || p.Area(s) != nil {
		t.Fatal("encargo incompleto conocido obtuvo territorio ejecutable, cola o asiento")
	}
	s.Archivos = []string{"../invalid.txt"}
	if len(hallazgosDe(p.checkSesionesAt(root, head), "archivo autorizado")) == 0 {
		t.Fatal("encargo incompleto aceptó una ruta conocida inválida")
	}
}

func TestEncargoConservaProvenienciaYModuloLegacyYaEntregado(t *testing.T) {
	root, _, provenance := legacyFixture(t)
	git := func(args ...string) string {
		t.Helper()
		out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
		if err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
		return strings.TrimSpace(string(out))
	}
	if err := os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("delivered\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	git("add", "tracked.txt")
	git("commit", "-qm", "deliver legacy module\n\nModulo: M2.10.1")
	head := git("rev-parse", "HEAD")

	s := importedSession(provenance, true)
	s.Encargo = ptrEncargo(encargoValido())
	s.Zona = "native"
	s.Archivos = []string{"native.txt"}
	s.Criterios = nil
	s.Ruta = RutaSesion{}
	s.Decisiones = []Decision{{Tipo: "escala", Pregunta: "¿Qué límite conserva?", Evidencia: "autoridad humana", Checkpoint: "antes de ejecutar", Opciones: []Opcion{{Opcion: "conservar", Consecuencia: "mantiene compatibilidad"}}, Clase: "contrato-visible", Alcanza: "encargo"}}
	p := &Plan{Producto: "migration", Zonas: []Zona{{ID: "base", Rutas: []string{"tracked.txt"}}, {ID: "legacy", Rutas: []string{"legacy/"}}, {ID: "native", Rutas: []string{"native.txt"}}}, Sesiones: []Sesion{s}}
	if got := erroresEncargo(p.CheckAt(root, head)); len(got) != 0 {
		t.Fatalf("migración con proveniencia y Módulo entregado fue rechazado: %#v", got)
	}
	delivered, _, err := p.AvanceModulosAt(root, head)
	if err != nil || delivered["M2.10.1"] != head {
		t.Fatalf("no se preservó evidencia alcanzable del Módulo: delivered=%#v err=%v", delivered, err)
	}
	var out strings.Builder
	escribirSesionConAvance(&out, p, &p.Sesiones[0], p.EstadosAt(root, head), delivered)
	for _, want := range []string{"Importación legacy:", "M2.10.1", "continuidad ODD nativa"} {
		if !strings.Contains(out.String(), want) {
			t.Fatalf("la vista native no conservó evidencia %q:\n%s", want, out.String())
		}
	}
	if strings.Contains(out.String(), "Retomar desde: M2.10.1") {
		t.Fatalf("la retoma native usó un Módulo legacy pendiente:\n%s", out.String())
	}

	s.ImportacionLegacy.OrigenRuta = "legacy/<provenance>.md"
	s.Decisiones[0].Pregunta = "¿Qué <límite> conserva?"
	render := string(RenderAt(p, root, head))
	for _, view := range []string{out.String(), render} {
		coordination, encargo := strings.Index(view, "Coordinación:"), strings.Index(view, "Encargo:")
		if coordination < 0 || encargo < 0 || coordination > encargo {
			t.Fatalf("la coordinación no precede las cuatro partes del Encargo:\n%s", view)
		}
		brief := view[encargo:]
		for _, label := range []string{"Pedido y contexto:", "Resultado y comportamiento:", "Restricciones y decisiones:", "Referencias:"} {
			if strings.Count(brief, label) != 1 {
				t.Fatalf("la etiqueta primaria %q no aparece exactamente una vez:\n%s", label, view)
			}
		}
		if strings.Contains(brief, "Importación legacy:") || strings.Contains(brief, "Módulo legacy entregado:") || strings.Count(view, "Ejecución: ODD nativo") != 1 {
			t.Fatalf("historial o ejecución se duplicó como sección del Encargo:\n%s", view)
		}
	}
	if strings.Contains(render, "<provenance>") || strings.Contains(render, "<límite>") || !strings.Contains(render, "&lt;provenance&gt;") || !strings.Contains(render, "&lt;límite&gt;") {
		t.Fatalf("render no neutralizó evidencia o decisión nuevas:\n%s", render)
	}
	if !strings.Contains(out.String(), "Restricciones y decisiones: No cambia el snapshot/v1 ni habilita concurrencia nueva.\n    Decisión estructurada:") || !strings.Contains(render, "Restricciones y decisiones: No cambia el snapshot/v1 ni habilita concurrencia nueva.\n    - Decisión estructurada") {
		t.Fatalf("la decisión no quedó anidada bajo restricciones:\nCLI:\n%s\nRENDER:\n%s", out.String(), render)
	}

	p.Sesiones[0].Modulos[0].ID = "M2.10.2"
	if len(hallazgosDe(p.CheckAt(root, head), "evidencia legacy")) == 0 {
		t.Fatal("un Módulo legacy sin entrega alcanzable fue aceptado")
	}
}

func TestEncargoIncompletoRechazaEstadosTerminales(t *testing.T) {
	root, head := repoGit(t)
	for _, tc := range []struct {
		name   string
		mutate func(*Sesion)
	}{
		{"entrega", func(s *Sesion) { s.Entrega = &Entrega{Commit: head} }},
		{"archivada", func(s *Sesion) { s.Archivada = true }},
		{"diferida", func(s *Sesion) { s.Diferida = true }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := planEncargoValido()
			s := &p.Sesiones[0]
			s.Zona = ""
			s.Archivos = nil
			s.Encargo = ptrEncargo(Encargo{Incompleto: true, PedidoContexto: "Falta confirmar el territorio."})
			if got := p.EstadosAt(root, head)[s.ID]; got != Bloqueado {
				t.Fatalf("incompleto aceptable = %s, quiere BLOQUEADO", got)
			}
			tc.mutate(s)
			if len(hallazgosDe(p.checkSesionesAt(root, head), "encargo incompleto")) == 0 {
				t.Fatalf("un encargo incompleto %s no fue rechazado", tc.name)
			}
		})
	}
}

func TestEncargoMantieneSnapshotV1YSmokeCLIMixto(t *testing.T) {
	root := t.TempDir()
	git := func(args ...string) string {
		t.Helper()
		out, err := exec.Command("git", append([]string{"-C", root}, args...)...).CombinedOutput()
		if err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
		return strings.TrimSpace(string(out))
	}
	git("init", "-q")
	git("config", "user.email", "radar@example.test")
	git("config", "user.name", "Radar Test")
	if err := os.MkdirAll(filepath.Join(root, "openspec"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("tracked\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	plan := `schema: plan
schema_version: 3
producto: mixed
zonas:
  - id: base
    rutas: [tracked.txt]
  - id: native
    rutas: [native.txt]
cimientos:
  rutas: [openspec/]
sesiones:
  - id: S1
    zona: native
    resultado: native result
    autoridad: human approval
    archivos: [native.txt]
    encargo:
      pedido_contexto: native request
      resultado_comportamiento: native observable behavior
      restricciones_decisiones: native constraints
      referencias: native reference
  - id: S2
    zona: base
    resultado: legacy result
    autoridad: legacy approval
    criterios: [legacy observable result]
    ruta:
      propuesta: direct
      autoridad: legacy approval
    modulos:
      - id: M2.1
        resultado: legacy module
        rutas: [tracked.txt]
        tareas:
          - id: T2.1.1
            accion: test legacy behavior
            resultado: legacy behavior
            criterios: [legacy behavior]
`
	planPath := filepath.Join(root, "openspec", "plan.yaml")
	if err := os.WriteFile(planPath, []byte(plan), 0o600); err != nil {
		t.Fatal(err)
	}
	git("add", ".")
	git("commit", "-qm", "fixture")
	head := git("rev-parse", "HEAD")
	fixtureBytes, err := os.ReadFile(planPath)
	if err != nil {
		t.Fatal(err)
	}

	candidate := filepath.Join(t.TempDir(), "radar")
	build := exec.Command("go", "build", "-o", candidate, ".")
	build.Dir = "."
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("no se pudo compilar el candidato: %v: %s", err, out)
	}
	run := func(args ...string) string {
		t.Helper()
		cmd := exec.Command(candidate, args...)
		cmd.Dir = root
		out, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("radar %v: %v: %s", args, err, out)
		}
		return string(out)
	}
	status := run("status", "--json", "-f", "openspec/plan.yaml", "-C", root)
	var snapshot map[string]any
	if err := json.Unmarshal([]byte(status), &snapshot); err != nil {
		t.Fatalf("snapshot inválido: %v\n%s", err, status)
	}
	for _, key := range []string{"schema", "producto", "head", "avance", "zonas", "sesiones", "asientos", "territorio_pendiente"} {
		if _, ok := snapshot[key]; !ok {
			t.Fatalf("snapshot/v1 perdió la clave %q: %s", key, status)
		}
	}
	if len(snapshot) != 8 || snapshot["schema"] != SnapshotSchema {
		t.Fatalf("snapshot/v1 cambió su forma o schema: %s", status)
	}
	sessions, ok := snapshot["sesiones"].([]any)
	if !ok || len(sessions) != 2 {
		t.Fatalf("snapshot/v1 cambió sus Sesiones: %s", status)
	}
	for _, row := range sessions {
		fields, ok := row.(map[string]any)
		if !ok || len(fields) != 4 || fields["id"] == nil || fields["zona"] == nil || fields["estado"] == nil || fields["resultado"] == nil {
			t.Fatalf("snapshot/v1 agregó o perdió datos de Sesión: %s", status)
		}
	}
	for _, id := range []string{"S1", "S2"} {
		out := run("sesion", id, "-f", "openspec/plan.yaml", "-C", root)
		if !strings.Contains(out, id) {
			t.Fatalf("radar sesion %s no imprimió su contrato: %s", id, out)
		}
		gotBytes, err := os.ReadFile(planPath)
		if err != nil || !bytes.Equal(gotBytes, fixtureBytes) || git("rev-parse", "HEAD") != head {
			t.Fatalf("el comando read-only alteró fixture o HEAD: err=%v", err)
		}
	}
	run("render", "-f", "openspec/plan.yaml", "-o", "openspec/ROADMAP.md", "-C", root)
	rendered, err := os.ReadFile(filepath.Join(root, "openspec", "ROADMAP.md"))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"Detalle de Sesiones", "native request", "Detalle de Módulos y Tareas", "M2.1"} {
		if !bytes.Contains(rendered, []byte(want)) {
			t.Fatalf("render mixto no contiene %q:\n%s", want, rendered)
		}
	}
}
