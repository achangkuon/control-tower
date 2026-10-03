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

var menu = []string{"Instalar o actualizar", "Volver a la versión anterior", "Proyectos", "Diagnóstico", "Ayuda", "Salir"}

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

func (m model) engineLines(state engineState) []string {
	health := m.health(state.Status)
	if state.Status == "healthy" {
		health = m.palette.good.Render("instalado / sano")
	}
	return []string{"Motor: " + health, "  Activa: " + short(state.Active) + " · Anterior: " + short(state.Previous)}
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
		lines = append(lines, m.palette.bad.Render("Proyectos: error de consulta"))
	} else {
		entries := []string{fmt.Sprintf("Proyectos (%d)", len(projects))}
		for _, project := range projects {
			entries = append(entries, "  "+clean(project.ProjectRoot)+": "+m.health(project.Status))
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
		requirements = append(requirements, "  "+item.label+": "+value)
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
		agents = append(agents, "  "+item.label+": "+value)
	}
	if compact {
		lines[0] += " · " + lines[1] + " · " + strings.TrimSpace(lines[2])
		lines = append(lines[:1], lines[3:]...)
		lines = append(lines, strings.Join(requirements, " · "), strings.Join(agents, " · "))
	} else {
		lines = append(lines, requirements...)
		lines = append(lines, agents...)
	}
	system := m.status.System
	return append(lines, "Sistema: "+clean(system.OS+"/"+system.Arch+" · "+system.Shell))
}

func (m model) homeView() string {
	version := "no instalado"
	if m.loading {
		version = "consultando…"
	} else if m.statusError != "" {
		version = "no disponible"
	} else if m.status.Engine.Active != "" {
		version = short(m.status.Engine.Active)
	}
	header := []string{m.palette.tower.Render("Torre de Control V1"), m.palette.dim.Render("Versión del motor: " + version)}
	tail := []string{""}
	for i, label := range menu {
		prefix := "  "
		if i == m.selected {
			prefix = "> "
		}
		line := prefix + label
		if i == m.selected {
			line = m.palette.tower.Render(line)
		}
		tail = append(tail, line)
	}
	tail = append(tail, "", "↑↓ o j/k mover · enter elegir · r refrescar · q salir")
	if m.height < 11 {
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
		tail[len(tail)-1] = "↑↓/j/k · enter · r · q salir"
	}
	return m.fit(append(append(header, status...), tail...))
}
