package main

import (
	"encoding/json"

	tea "github.com/charmbracelet/bubbletea"
)

var projectActions = []string{"Revisar", "Desinstalar", "Limpiar residuos"}

func (m model) projectList() ([]projectState, bool) {
	var projects []projectState
	err := json.Unmarshal(m.status.Projects, &projects)
	return projects, err == nil && !m.loading && m.statusError == ""
}
func (m model) projectLines() []string {
	projects, ok := m.projectList()
	lines := []string{"Proyectos"}
	if !ok {
		lines = append(lines, "No se pudo consultar la lista de proyectos. Volvé al inicio y refrescá el estado.")
	}
	if m.projectMenu && m.projectSelected < len(projects) {
		lines = append(lines, clean(projects[m.projectSelected].ProjectRoot))
		for i, label := range projectActions {
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
			lines = append(lines, prefix+clean(p.ProjectRoot)+" · "+m.health(p.Status))
		}
		prefix := "  "
		if m.projectSelected == len(projects) {
			prefix = "> "
		}
		lines = append(lines, prefix+"Adoptar un proyecto nuevo")
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
			m.projectAction = min(2, m.projectAction+1)
		} else {
			m.projectSelected = min(len(projects), m.projectSelected+1)
		}
	case "enter":
		if !ok {
			return m, nil
		}
		if m.projectSelected == len(projects) {
			m.page, m.flow = "wizard", workflow{action: "init", step: 1}
		} else if !m.projectMenu {
			m.projectMenu = true
			m.projectAction = 0
		} else {
			m.page, m.flow = "wizard", workflow{action: []string{"doctor", "uninstall", "cleanup"}[m.projectAction], root: projects[m.projectSelected].ProjectRoot, step: 4}
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
