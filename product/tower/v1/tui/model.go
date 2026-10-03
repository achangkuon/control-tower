package main

import (
	"encoding/json"
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
)

type runner func(string) ([]byte, error)
type engineState struct {
	Installed                bool
	Status, Active, Previous string
}
type prerequisite struct {
	Present, Authenticated bool
	Version, Error         string
}
type agentState struct{ Executable, Config bool }
type projectState struct{ ProjectRoot, Status string }
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
}
type model struct {
	run                             runner
	palette                         palette
	page                            string
	selected, width, height, offset int
	loading, diagnosing             bool
	status                          snapshot
	diagnostic                      engineState
	statusError, diagnosticError    string
}

func newModel(run runner, noColor bool) model {
	return model{run: run, palette: newPalette(noColor), page: "home", width: 100, height: 40, loading: true}
}

func (m model) command(action string) tea.Cmd {
	return func() tea.Msg {
		data, err := m.run(action)
		return commandResult{action: action, data: data, err: err}
	}
}
func (m model) Init() tea.Cmd { return m.command("status") }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = max(1, msg.Width), max(1, msg.Height)
	case commandResult:
		if msg.action == "status" {
			m.loading = false
			var state snapshot
			err := msg.err
			if err == nil && (json.Unmarshal(msg.data, &state) != nil || state.Schema != "tower.v1.status/1") {
				err = fmt.Errorf("respuesta de estado no válida")
			}
			m.statusError = ""
			if err != nil {
				m.statusError = "No se pudo cargar el estado: " + clean(err.Error())
			} else {
				m.status = state
			}
		} else if msg.action == "doctor" {
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
		}
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit
		case "esc":
			m.page, m.offset = "home", 0
		case "r":
			if m.page == "home" && !m.loading {
				m.loading = true
				return m, m.command("status")
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
				m.page, m.offset = "home", 0
				return m, nil
			}
			switch m.selected {
			case 3:
				m.page, m.diagnosing, m.diagnosticError = "doctor", true, ""
				return m, m.command("doctor")
			case 4:
				m.page = "help"
			case 5:
				return m, tea.Quit
			default:
				m.page = "soon"
			}
		}
	}
	return m, nil
}

func (m model) View() string {
	if m.page == "home" {
		return m.homeView()
	}
	body := []string{"Disponible en la próxima versión"}
	switch m.page {
	case "doctor":
		body = []string{"Diagnóstico", "Comprobación global de sólo lectura."}
		if m.diagnosing {
			body = append(body, "Cargando diagnóstico…")
		} else if m.diagnosticError != "" {
			body = append(body, m.palette.bad.Render(m.diagnosticError))
		} else {
			body = append(body, m.engineLines(m.diagnostic)...)
		}
	case "help":
		body = []string{"Ayuda", "↑/↓ o j/k: mover la selección; enter: elegir.", "esc: volver; r: refrescar el estado; q o Ctrl-C: salir.",
			"Instalar o actualizar: preparar el motor (próxima versión).", "Volver a la versión anterior: restaurar el motor (próxima versión).",
			"Proyectos: gestionar proyectos (próxima versión).", "Diagnóstico: comprobar el motor, sin modificarlo.", "Ayuda: consultar esta guía. Salir: cerrar la interfaz.",
			"Datos: TORRE_CONTROL_CLI (por defecto torre-control).", "status: motor, proyectos, requisitos, agentes y sistema.", "doctor: integridad global del motor; no repara ni activa versiones."}
	}
	space := max(0, m.height-3)
	start := min(m.offset, max(0, len(body)-space))
	body = body[start:min(len(body), start+space)]
	return m.fit(append(body, "", "Volver", "esc o enter volver · j/k desplazar · q salir"))
}
