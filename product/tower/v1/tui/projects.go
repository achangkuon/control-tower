package main

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

var projectActions = []string{"Revisar", "Desinstalar", "Limpiar residuos"}

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

func actionsForProject(p projectState) []string {
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
	return projectActions
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
		for i, label := range actionsForProject(projects[m.projectSelected]) {
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
			lines = append(lines, prefix+clean(p.ProjectRoot)+" · "+m.projectHealth(p))
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
				m.projectAction = min(len(actionsForProject(projects[m.projectSelected]))-1, m.projectAction+1)
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
			actions := actionsForProject(project)
			m.projectAction = min(m.projectAction, len(actions)-1)
			if actions[m.projectAction] == "Comandos de Radar" {
				m = m.openRadar(project.ProjectRoot)
			} else if actions[m.projectAction] == "Actualizar la Torre" {
				m.page, m.offset = "project-update", 0
			} else if actions[m.projectAction] == "Corregir permisos" {
				m.flow.root = project.ProjectRoot
				m.page, m.offset = "project-permissions", 0
			} else if actions[m.projectAction] == "Ver el prompt para armar el plan" {
				m = m.openProjectPrompt()
			} else {
				index := m.projectAction - (len(actions) - len(projectActions))
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
