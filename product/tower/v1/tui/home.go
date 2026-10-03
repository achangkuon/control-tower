package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

const towerLogo = `        ╷
     ╭──┴──╮
  ╭──┴─────┴──╮
  │ ▚▚▚▚▚▚▚▚▚ │
  ╰──┬─────┬──╯
     │     │
     │     │
   ╭─┴─────┴─╮
 ╭─┴─────────┴─╮
─────────────────`

var menu = []string{"Instalar o actualizar", "Volver a la versión anterior", "Proyectos", "Diagnóstico", "Ayuda", "Sumar un proyecto", "Salir"}

func short(version string) string {
	if version == "" {
		return "ninguna"
	}
	return clean(version[:min(len(version), 7)])
}

func (m model) health(value string) string {
	if value == "healthy" {
		return m.palette.good.Render("sano")
	}
	labels := map[string]string{"absent": "no instalado", "missing": "ausente", "unadopted": "sin adoptar", "inaccessible": "inaccesible", "unsafe": "inseguro", "invalid": "inválido", "error": "error"}
	label, ok := labels[value]
	if !ok {
		label = "desconocido"
	}
	if value == "absent" || value == "missing" || value == "unadopted" {
		return m.palette.warn.Render(label)
	}
	return m.palette.bad.Render(label)
}

func readableVersion(tag, _ string) string {
	if strings.HasPrefix(tag, "checkout-") {
		return "versión local de prueba"
	}
	if tag != "" {
		return clean(tag)
	}
	return "versión desconocida"
}

func activationLine(state engineState) string {
	return "Activa: " + readableVersion(state.ActiveTag, state.Active) + " · Anterior: " + readableVersion(state.PreviousTag, state.Previous)
}

func (m model) engineLines(state engineState) []string {
	health := m.health(state.Status)
	if state.Status == "healthy" {
		health = m.palette.good.Render("instalado · sano")
	}
	version := readableVersion(state.ActiveTag, state.Active)
	if state.Previous != "" || state.PreviousTag != "" {
		version += " · anterior " + readableVersion(state.PreviousTag, state.Previous)
	}
	gentle := state.Components.GentleAi
	gentleVersion := m.palette.warn.Render("falta")
	if gentle.Status == "ok" && gentle.Version != "" {
		gentleVersion = m.palette.good.Render(clean(gentle.Version))
	}
	return []string{statusRow("Motor", health), statusRow("Versión", version), statusRow("Gentle AI", gentleVersion)}
}

func (m model) statusLines(compact bool) []string {
	if m.loading {
		return []string{"Estado", "Cargando estado…"}
	}
	if m.statusError != "" {
		return []string{"Estado", m.palette.bad.Render(m.statusError)}
	}
	lines := append([]string{"Estado"}, m.engineLines(m.status.Engine)...)
	var projects []projectState
	if json.Unmarshal(m.status.Projects, &projects) != nil {
		lines = append(lines, statusRow("Proyectos", m.palette.bad.Render("error de consulta")))
	} else {
		entries := []string{statusRow("Proyectos", fmt.Sprint(len(projects)))}
		for _, project := range projects {
			entries = append(entries, "  "+clean(project.ProjectRoot)+": "+m.projectHealth(project))
		}
		if compact {
			lines = append(lines, strings.Join(entries, " · "))
		} else {
			lines = append(lines, entries...)
		}
	}
	requirements := []string{"Requisitos"}
	for _, item := range []struct{ key, label string }{{"gh", "gh"}, {"bun", "Bun"}, {"git", "Git"}, {"go", "Go"}} {
		p := m.status.Prerequisites[item.key]
		value := m.palette.good.Render(clean(p.Version))
		if !p.Present {
			value = m.palette.warn.Render("falta")
		} else if p.Error != "" || p.Version == "" {
			value = m.palette.warn.Render("error de comprobación")
		}
		if item.key == "gh" && p.Present {
			if p.Authenticated {
				value += " · " + m.palette.good.Render("con sesión")
			} else {
				value += " · " + m.palette.warn.Render("sin sesión")
			}
		}
		if compact {
			requirements = append(requirements, item.label+" "+value)
		} else {
			requirements = append(requirements, statusRow(item.label, value))
		}
	}
	agents := []string{"Agentes"}
	for _, item := range []struct{ key, label string }{{"claude", "Claude Code"}, {"pi", "Pi"}, {"codex", "Codex"}, {"opencode", "OpenCode"}} {
		a := m.status.Agents[item.key]
		value := m.palette.dim.Render("no detectado")
		if a.Executable {
			value = m.palette.good.Render("listo")
		} else if a.Config {
			value = m.palette.warn.Render("sólo configuración")
		}
		if compact {
			agents = append(agents, item.label+" "+value)
		} else {
			agents = append(agents, statusRow(item.label, value))
		}
	}
	system := m.status.System
	systemLine := statusRow("Sistema", clean(system.OS+"/"+system.Arch+" · "+system.Shell))
	if compact {
		// Keep the system summary in the short layout; detailed rows follow if space permits.
		lines = append([]string{systemLine}, lines[1:]...)
		return append(lines, statusRow("Requisitos", strings.Join(requirements[1:], " · ")), statusRow("Agentes", strings.Join(agents[1:], " · ")))
	}
	lines = append(lines, requirements...)
	lines = append(lines, agents...)
	return append(lines, systemLine)
}

func (m model) homeView() string {
	version := "no instalado"
	if m.loading {
		version = "consultando…"
	} else if m.statusError != "" {
		version = "no disponible"
	} else if m.status.Engine.Active != "" {
		version = readableVersion(m.status.Engine.ActiveTag, m.status.Engine.Active)
	}
	header := []string{m.palette.tower.Render("Torre de Control V1"), m.palette.dim.Render("Versión: " + version)}
	hints := map[int]string{5: "prompt para tu agente"}
	if !m.loading && m.statusError == "" && m.status.Schema != "" {
		if m.height >= 18 {
			header = append(header, m.palette.dim.Render(activationLine(m.status.Engine)))
		}
		if m.status.Engine.Previous != "" {
			hints[1] = readableVersion(m.status.Engine.PreviousTag, m.status.Engine.Previous)
		}
		var projects []projectState
		if json.Unmarshal(m.status.Projects, &projects) == nil {
			hints[2] = fmt.Sprint(len(projects))
		}
	}
	tail := append([]string{""}, m.menuLines(hints)...)
	tail = append(tail, "", "↑↓ o j/k mover · enter elegir · a: Versión específica (avanzado) · r refrescar · q salir")
	if m.height < 12 {
		tail = append(tail[1:len(tail)-2], tail[len(tail)-1])
		header = header[:min(len(header), max(0, m.height-len(tail)))]
	}
	status := m.statusLines(false)
	logo := strings.Split(m.palette.tower.Render(towerLogo), "\n")
	if m.width >= 50 && len(logo)+len(header)+len(status)+len(tail) <= m.height {
		header = append(logo, header...)
	}
	if len(header)+len(status)+len(tail) > m.height {
		status = m.statusLines(true)
	}
	available := max(0, m.height-len(header)-len(tail))
	if len(status) > available {
		status = status[:available]
	}
	if m.height < 16 || m.width < 60 {
		tail[len(tail)-1] = "enter · a avanzado · q salir"
	}
	return m.fit(append(append(header, status...), tail...))
}
