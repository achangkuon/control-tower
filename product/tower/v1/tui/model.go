package main

import (
	"encoding/json"
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
)

type engineState struct {
	Installed                bool
	Status, Active, Previous string
	ActiveTag, PreviousTag   string
	Components               struct {
		GentleAi struct{ Status, Version string }
	}
}
type prerequisite struct {
	Present, Authenticated bool
	Version, Error         string
}
type agentState struct{ Executable, Config bool }
type projectState struct{ ProjectRoot, Status, TowerState string }
type snapshot struct {
	Schema        string
	Engine        engineState
	Projects      json.RawMessage
	Prerequisites map[string]prerequisite
	Agents        map[string]agentState
	System        struct{ OS, Arch, Shell string }
}
type commandResult struct {
	action string
	data   []byte
	err    error
	id     uint64
	result execution
}
type model struct {
	run                             runner
	palette                         palette
	page                            string
	selected, width, height, offset int
	loading, diagnosing             bool
	status                          snapshot
	diagnostic                      engineState
	sequence, statusSequence        uint64
	quitConfirm, quitAfter          bool
	flow                            workflow
	projectSelected, projectAction  int
	projectMenu                     bool
	updateNotice                    string
	updateCheckDismissed            bool
	statusError, diagnosticError    string
	promptOrigin, copyFeedback      string
	radarRun                        radarRunFunc
	radar                           radarScreen
}

func newModel(run runner, noColor bool) model {
	return model{run: run, radarRun: installedRadarRunner, palette: newPalette(noColor), page: "home", width: 100, height: 40, loading: true, statusSequence: 1}
}

func (m model) command(action string) tea.Cmd {
	id := m.sequence
	if action == "status" {
		id = m.statusSequence
	}
	return func() tea.Msg {
		args := []string{action}
		if action == "update-check" {
			args = []string{"update", "--check"}
		}
		result := m.run(args)
		return commandResult{action: action, data: result.stdout, err: result.err, id: id, result: result}
	}
}
func (m model) Init() tea.Cmd {
	return tea.Batch(m.command("status"), m.command("update-check"))
}
func (m *model) reloadStatus() tea.Cmd {
	m.statusSequence++
	m.loading = true
	return m.command("status")
}
func (m model) operationRunning() bool {
	return (m.page == "wizard" && m.flow.step == 5) || (m.page == "radar-output" && m.radar.running)
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = max(1, msg.Width), max(1, msg.Height)
		if m.page == "radar-list" {
			m = m.focusRadarCommand()
		} else if m.page == "radar-id" {
			m = m.focusRadarInput()
		}
	case radarResult:
		if m.page == "radar-output" && m.radar.running && msg.id == m.sequence {
			m.radar.running, m.radar.code = false, msg.result.code
			m.radar.lines = radarOutputLines(msg.result)
		}
	case clipboardResult:
		if m.page == "project-prompt" {
			m.copyFeedback = "Enviado al portapapeles de la terminal (si no aparece, seleccioná el texto)"
			if msg.err != nil {
				m.copyFeedback = "No se pudo copiar. Seleccioná el texto y copialo manualmente."
			}
		}
	case progressTick:
		if m.page == "wizard" && m.flow.step == 5 && msg.id == m.sequence {
			m.flow.frame++
			return m, m.tick()
		}
	case commandResult:
		if msg.action == "operation" {
			if m.page == "wizard" && m.flow.step == 5 && msg.id == m.sequence {
				if (m.flow.action == "update" || m.flow.action == "install") &&
					msg.err == nil && msg.result.err == nil && msg.result.code == 0 {
					// A startup check arriving after this success is stale too.
					m.updateNotice, m.updateCheckDismissed = "", true
				}
				m.flow.step, m.flow.lines = 6, resultLines(msg.result)
				m.quitConfirm = false
				refresh := m.reloadStatus()
				return m, refresh
			}
			return m, nil
		}
		if msg.result.code != 0 && msg.err == nil {
			msg.err = fmt.Errorf("%s", firstLine(string(msg.result.stderr)))
		}
		if msg.action == "update-check" {
			var check struct{ Status, Latest string }
			if !m.updateCheckDismissed && msg.err == nil && msg.result.err == nil && len(msg.data) <= outputLimit &&
				json.Unmarshal(msg.data, &check) == nil && check.Status == "available" && validTag(check.Latest) {
				m.updateNotice = check.Latest
			}
			return m, nil
		}
		if msg.action == "status" {
			if msg.id != m.statusSequence {
				return m, nil
			}
			m.loading = false
			var state snapshot
			err := msg.err
			if len(msg.data) > outputLimit {
				err = fmt.Errorf("la salida excedió el límite de 64 KiB")
			} else if err == nil && (json.Unmarshal(msg.data, &state) != nil || state.Schema != "tower.v1.status/1") {
				err = fmt.Errorf("respuesta de estado no válida; actualice el estado o consulte Diagnóstico")
			}
			m.statusError = ""
			if err != nil {
				m.statusError = "No se pudo cargar el estado: " + clean(err.Error())
			} else {
				m.status = state
			}
		} else if msg.action == "doctor" {
			if msg.id != m.sequence || m.page != "doctor" {
				return m, nil
			}
			m.diagnosing = false
			var state engineState
			err := msg.err
			if err == nil && (json.Unmarshal(msg.data, &state) != nil || (state.Status != "healthy" && state.Status != "absent")) {
				err = fmt.Errorf("respuesta de diagnóstico no válida")
			}
			m.diagnosticError = ""
			if err != nil {
				m.diagnosticError = "No se pudo cargar el diagnóstico: " + clean(err.Error())
			} else {
				m.diagnostic = state
			}
			refresh := m.reloadStatus()
			return m, refresh
		}
	case tea.KeyMsg:
		if m.page == "radar-list" || m.page == "radar-id" || m.page == "radar-output" {
			return m.radarKey(msg)
		}
		if m.operationRunning() {
			switch msg.String() {
			case "enter":
				if m.quitConfirm {
					m.quitConfirm, m.quitAfter = false, true
				}
			case "esc":
				if !m.quitAfter {
					m.quitConfirm = !m.quitConfirm
				}
			case "q", "ctrl+c":
				m.quitConfirm = !m.quitAfter
			}
			return m, nil
		}
		if m.quitAfter && m.page == "wizard" && m.flow.step == 6 {
			switch msg.String() {
			case "enter", "q", "ctrl+c", "esc":
				return m, tea.Quit
			}
		}
		if msg.Type == tea.KeyCtrlC {
			return m, tea.Quit
		}
		if m.page == "wizard" {
			return m.wizardKey(msg)
		}
		if m.page == "projects" {
			return m.projectsKey(msg)
		}
		if m.page == "project-prompt" {
			switch msg.String() {
			case "c":
				return m, tea.Exec(&clipboardCommand{}, func(err error) tea.Msg { return clipboardResult{err} })
			case "esc":
				m.page, m.offset = m.promptOrigin, 0
				return m, nil
			}
		}
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit
		case "esc":
			if m.page == "doctor" && !m.diagnosing {
				return m.homeRefresh()
			}
			m.page, m.offset = "home", 0
			m.sequence++
		case "a":
			if m.page == "home" && m.selected == 0 && !m.loading && m.statusError == "" && m.status.Schema != "" {
				return m.releaseAction(true)
			}
		case "r":
			if m.page == "home" && !m.loading {
				refresh := m.reloadStatus()
				return m, refresh
			}
		case "up", "k":
			if m.page == "home" {
				m.selected = max(0, m.selected-1)
			} else {
				m.offset = max(0, m.offset-1)
			}
		case "down", "j":
			if m.page == "home" {
				m.selected = min(len(menu)-1, m.selected+1)
			} else {
				m.offset++
			}
		case "enter":
			if m.page != "home" {
				if m.page == "doctor" && !m.diagnosing {
					return m.homeRefresh()
				}
				m.page, m.offset = "home", 0
				m.sequence++
				return m, nil
			}
			if m.selected <= 2 && (m.loading || m.statusError != "" || m.status.Schema == "") {
				return m, nil
			}
			switch m.selected {
			case 0:
				return m.releaseAction(false)
			case 1:
				m.page, m.flow = "wizard", workflow{action: "rollback", step: 4}
				if m.status.Engine.Previous == "" {
					m.flow.step, m.flow.lines = 6, []string{"No hay una versión anterior disponible."}
				}
			case 2:
				m.page, m.projectSelected, m.projectAction, m.projectMenu = "projects", 0, 0, false
			case 3:
				m.sequence++
				m.page, m.diagnosing, m.diagnosticError = "doctor", true, ""
				return m, m.command("doctor")
			case 4:
				m.page = "help"
			case 5:
				m = m.openProjectPrompt()
			case 6:
				return m, tea.Quit
			}
		}
	}
	m.offset = min(m.offset, m.maxOffset())
	return m, nil
}

func (m model) pageLines() []string {
	body := []string{}
	if m.page == "radar-list" || m.page == "radar-id" || m.page == "radar-output" {
		return m.radarLines()
	}
	if m.page == "wizard" {
		return m.wrap(m.wizardLines())
	}
	if m.page == "projects" {
		return m.projectLines()
	}
	if m.page == "project-prompt" {
		return m.promptLines()
	}
	switch m.page {
	case "doctor":
		body = []string{"Diagnóstico", "Comprobación global de sólo lectura."}
		if m.diagnosing {
			body = append(body, "Cargando diagnóstico…")
		} else if m.diagnosticError != "" {
			body = append(body, m.palette.bad.Render(m.diagnosticError))
		} else {
			body = append(body, m.palette.dim.Render(activationLine(m.diagnostic)))
			body = append(body, m.engineLines(m.diagnostic)...)
		}
	case "project-update":
		body = []string{"Actualizar la Torre", "Volvé al inicio y elegí Instalar o actualizar para poner al día los proyectos registrados.",
			"También podés actualizar sólo este proyecto: torre-control project update --project <ruta-absoluta>.",
			"Se conservan los archivos modificados por el usuario y el respaldo para desinstalar."}
	case "help":
		body = []string{"Ayuda", "↑/↓ o j/k: mover la selección; enter: elegir.", "esc: volver; r: refrescar el estado; q o Ctrl-C: salir.",
			"Instalar o actualizar: buscar la última versión publicada, sin preguntas.", "a sobre esa opción: Versión específica (avanzado).", "Volver a la versión anterior: restaurar el motor.",
			"Proyectos: gestionar proyectos.", "Sumar un proyecto: copiar un prompt para tu agente.", "Diagnóstico: comprobar el motor, sin modificarlo.", "Ayuda: consultar esta guía. Salir: cerrar la interfaz.",
			"Datos: TORRE_CONTROL_CLI (por defecto torre-control).", "status: motor, proyectos, requisitos, agentes y sistema.", "doctor: integridad global del motor; no repara ni activa versiones."}
	}
	return body
}
func (m model) viewportHeight() int {
	// With only one terminal row, interactive Radar content beats the footer.
	if m.height == 1 && (m.page == "radar-list" || m.page == "radar-id") {
		return 1
	}
	return max(0, m.height-1)
}

func (m model) maxOffset() int { return max(0, len(m.pageLines())-max(1, m.viewportHeight())) }
func (m model) View() string {
	if m.page == "home" {
		return m.homeView()
	}
	body := m.pageLines()
	space := m.viewportHeight()
	start := min(m.offset, m.maxOffset())
	body = body[start:min(len(body), start+space)]
	footer := "esc: volver · enter: continuar · ↑↓: desplazar"
	if m.page == "radar-list" {
		footer = "enter: ejecutar · esc: proyecto · ↑↓: elegir"
	} else if m.page == "radar-id" {
		footer = "enter: ejecutar · esc: comandos"
	} else if m.page == "radar-output" {
		footer = "esc: comandos · ↑↓/PgUp/PgDn: desplazar"
		if m.radar.running {
			footer = "Esperá a que termine Radar (máximo 30 s)."
		}
	} else if m.page == "project-prompt" {
		footer = "c: copiar · esc: volver · ↑↓: desplazar"
		if m.copyFeedback != "" {
			footer = m.copyFeedback + " · esc: volver"
		}
	} else if m.operationRunning() {
		footer = "q / Ctrl-C / esc: solicitar salida"
	} else if m.quitAfter {
		footer = "Operación finalizada · enter / q: salir"
	}
	return m.fit(append(body, footer))
}
