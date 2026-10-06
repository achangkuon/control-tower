package main

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

var projectActions = []string{"Revisar", "Desinstalar", "Limpiar residuos"}

// S203: the mode switch delegates to `piloto` through the S216 runner seam. The
// TUI never parses or writes radar.piloto marks (P2) and keeps no mode state (P14).
const (
	pilotoOnAction  = "Prender piloto"
	pilotoOffAction = "Apagar piloto"
	pilotoOffNote   = "Apagar no borra NOVEDAD ni POR REVISAR: lo trabajado queda visible hasta su revisión (P9)."
)

const projectPrompt = "Quiero usar la Torre de Control en un proyecto. Preguntame en cuál: el que tenés abierto u otro.\n" +
	"Después preguntame si hago una migración completa o solo lo que falta, y recomendame solo lo que falta.\n" +
	"Instalá la Torre en ese proyecto con `torre-control project init` y armá su plan con la skill\n" +
	"chanks-1-adopcion (o chanks-1-project-kickoff si el proyecto está vacío). No guardes nada sin mi aprobación."

type clipboardResult struct{ err error }

// Exec uses Bubble Tea's configured output, including when the alternate screen is active.
// OSC 52 needs no external clipboard process or terminal response.
type clipboardCommand struct{ output io.Writer }

func (c *clipboardCommand) SetStdin(io.Reader)    {}
func (c *clipboardCommand) SetStderr(io.Writer)   {}
func (c *clipboardCommand) SetStdout(w io.Writer) { c.output = w }
func (c *clipboardCommand) Run() error {
	_, err := io.WriteString(c.output, "\x1b]52;c;"+base64.StdEncoding.EncodeToString([]byte(projectPrompt))+"\x07")
	return err
}

func (m model) openProjectPrompt() model {
	m.promptOrigin, m.page, m.offset, m.copyFeedback = m.page, "project-prompt", 0, ""
	return m
}

func (m model) promptLines() []string {
	lines := []string{"Sumar un proyecto", "Copiá este texto y pegáselo a tu agente (Claude Code, Codex, OpenCode o Pi), abierto en cualquier carpeta.", ""}
	lines = append(lines, strings.Split(projectPrompt, "\n")...)
	return m.wrap(lines)
}

func (m model) projectHealth(p projectState) string {
	if p.Status == "outdated" {
		return "🟠 Desactualizado — actualizá la Torre"
	}
	if p.Status == "healthy" {
		switch p.TowerState {
		case "active":
			return "🟢 Torre activa"
		case "needs-plan":
			return "🟡 Falta armar el plan"
		}
	}
	if (p.Status == "unadopted" || p.Status == "uninstalled") && p.TowerState == "skills-only" {
		return "⚪ Solo skills"
	}
	return m.health(p.Status)
}

func projectActionsFor(p projectState) []string {
	if p.Status == "invalid" && p.PermissionError {
		return append([]string{"Corregir permisos"}, projectActions...)
	}
	if p.Status == "outdated" {
		return append([]string{"Actualizar la Torre"}, projectActions...)
	}
	if p.Status == "healthy" && p.TowerState == "active" {
		return append([]string{"Comandos de Radar"}, projectActions...)
	}
	if p.Status == "healthy" && p.TowerState == "needs-plan" {
		return append([]string{"Ver el prompt para armar el plan"}, projectActions...)
	}
	return append([]string(nil), projectActions...)
}

// pilotoStateKnown reports whether the S216 seam has a fresh switch reading for
// root. The TUI stores nothing of its own (P14): this is the last `piloto` read.
func (m model) pilotoStateKnown(root string) bool {
	return root != "" && m.pilot.root == root && m.pilot.estadoErr == "" && m.pilot.estado != ""
}

func (m model) pilotoPrendido(root string) bool {
	return m.pilotoStateKnown(root) && m.pilot.prendido()
}

// pilotoToggleLabel names the switch action after the fresh reading, defaulting
// to the documented default (off) until the seam has read that project.
func (m model) pilotoToggleLabel(root string) string {
	if m.pilotoPrendido(root) {
		return pilotoOffAction
	}
	return pilotoOnAction
}

func (m model) pilotoBadge(root string) string {
	if !m.pilotoStateKnown(root) {
		return ""
	}
	if m.pilot.prendido() {
		return " · piloto prendido"
	}
	return " · piloto apagado"
}

func (m model) actionsForProject(p projectState) []string {
	actions := projectActionsFor(p)
	// Only a healthy adopted project can hold a pilot run; other states keep
	// their lifecycle actions untouched.
	if p.Status == "healthy" && p.TowerState != "" {
		return append(actions, m.pilotoToggleLabel(p.ProjectRoot))
	}
	return actions
}

func (m model) projectList() ([]projectState, bool) {
	if m.loading || m.statusError != "" {
		return nil, false
	}
	var projects []projectState
	err := json.Unmarshal(m.status.Projects, &projects)
	return projects, err == nil
}
func (m model) projectLines() []string {
	projects, ok := m.projectList()
	lines := []string{"Proyectos"}
	if m.loading {
		return append(lines, "Cargando estado…")
	}
	if !ok {
		return append(lines, "No se pudo consultar la lista de proyectos. Vuelva al inicio y actualice el estado.")
	}
	if m.projectMenu && m.projectSelected < len(projects) {
		lines = append(lines, clean(projects[m.projectSelected].ProjectRoot))
		for i, label := range m.actionsForProject(projects[m.projectSelected]) {
			prefix := "  "
			if i == m.projectAction {
				prefix = "> "
			}
			lines = append(lines, prefix+label)
		}
	} else {
		for i, p := range projects {
			prefix := "  "
			if i == m.projectSelected {
				prefix = "> "
			}
			lines = append(lines, prefix+clean(p.ProjectRoot)+" · "+m.projectHealth(p)+m.pilotoBadge(p.ProjectRoot))
		}
		prefix := "  "
		if m.projectSelected == len(projects) {
			prefix = "> "
		}
		lines = append(lines, prefix+"Sumar un proyecto")
	}
	return lines
}
func (m model) projectsKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	projects, ok := m.projectList()
	m.projectSelected = min(m.projectSelected, len(projects))
	switch msg.String() {
	case "q":
		return m, tea.Quit
	case "esc":
		if m.projectMenu {
			m.projectMenu = false
		} else {
			m.page = "home"
		}
		m.offset = 0
	case "up", "k":
		if m.projectMenu {
			m.projectAction = max(0, m.projectAction-1)
		} else {
			m.projectSelected = max(0, m.projectSelected-1)
		}
	case "down", "j":
		if m.projectMenu {
			if m.projectSelected < len(projects) {
				m.projectAction = min(len(m.actionsForProject(projects[m.projectSelected]))-1, m.projectAction+1)
			}
		} else {
			m.projectSelected = min(len(projects), m.projectSelected+1)
		}
	case "enter":
		if !ok {
			return m, nil
		}
		if m.projectSelected == len(projects) {
			m = m.openProjectPrompt()
		} else if !m.projectMenu {
			m.projectMenu = true
			m.projectAction = 0
		} else {
			project := projects[m.projectSelected]
			actions := m.actionsForProject(project)
			m.projectAction = min(m.projectAction, len(actions)-1)
			switch actions[m.projectAction] {
			case "Comandos de Radar":
				m = m.openRadar(project.ProjectRoot)
			case "Actualizar la Torre":
				m.page, m.offset = "project-update", 0
			case "Corregir permisos":
				m.flow.root = project.ProjectRoot
				m.page, m.offset = "project-permissions", 0
			case "Ver el prompt para armar el plan":
				m = m.openProjectPrompt()
			case pilotoOnAction, pilotoOffAction:
				return m.projectPilotoSwitch(project, actions[m.projectAction] == pilotoOffAction)
			default:
				index := map[string]int{"Revisar": 0, "Desinstalar": 1, "Limpiar residuos": 2}[actions[m.projectAction]]
				m.page, m.flow = "wizard", workflow{action: []string{"doctor", "uninstall", "cleanup"}[index], root: project.ProjectRoot, step: 4}
			}
		}
	}
	if m.page == "projects" {
		// Keep the selected row in view without allowing offsets beyond the content.
		row := m.projectSelected + 1
		if m.projectMenu {
			row = m.projectAction + 2
		}
		m.offset = min(m.maxOffset(), max(0, row-max(1, m.height-1)+1))
	}
	return m, nil
}

// projectPilotoSwitch delegates the mode switch to the deterministic `piloto`
// CLI through the S216 runner seam (P14). Turning off appends the P9 notice so
// the result states that reviewed work stays visible until its review.
func (m model) projectPilotoSwitch(project projectState, off bool) (tea.Model, tea.Cmd) {
	m.pilot.root, m.pilot.estado, m.pilot.estadoErr = project.ProjectRoot, "", ""
	if !off {
		return m.runPilot("prender", []string{"interruptor", "on"}, true)
	}
	base := m.pilotoRun
	m.pilotoRun = func(root string, args []string, input string) execution {
		result := base(root, args, input)
		if result.err == nil && result.code == 0 &&
			len(args) == 2 && args[0] == "interruptor" && args[1] == "off" {
			result.stdout = append(append([]byte(nil), result.stdout...), []byte(pilotoOffNote+"\n")...)
		}
		return result
	}
	next, cmd := m.runPilot("apagar", []string{"interruptor", "off"}, true)
	if restored, ok := next.(model); ok {
		restored.pilotoRun = base
		return restored, cmd
	}
	return next, cmd
}
