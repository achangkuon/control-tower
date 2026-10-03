package main

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"

	tea "github.com/charmbracelet/bubbletea"
)

type workflow struct {
	action, tag, asset, sha, root, confirm, issue string
	step, frame                                 int
	advanced                                    bool
	started                                     time.Time
	lines                                       []string
}
type progressTick struct{ id uint64 }

var shaPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)
var tagPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*$`)

func validSHA(s string) bool { return shaPattern.MatchString(s) }
func validValue(s string) bool {
	return s != "" && len(s) <= 4096 && !strings.HasPrefix(s, "--") && strings.IndexFunc(s, unicode.IsControl) < 0
}
func validTag(s string) bool {
	return len(s) <= 128 && tagPattern.MatchString(s) && !strings.EqualFold(s, "latest") && !strings.Contains(s, "..") && !strings.HasSuffix(s, ".")
}
func validRoot(s string) bool { return validValue(s) && filepath.IsAbs(s) }

// KeyRunes may contain an entire paste. Controls never become submissions.
func editInput(value *string, msg tea.KeyMsg) {
	switch msg.Type {
	case tea.KeyCtrlU:
		*value = ""
	case tea.KeyBackspace, tea.KeyDelete:
		r := []rune(*value)
		if len(r) > 0 {
			*value = string(r[:len(r)-1])
		}
	case tea.KeySpace:
		if len(*value) < 4096 {
			*value += " "
		}
	case tea.KeyRunes:
		if strings.ContainsRune(string(msg.Runes), '\x1b') {
			return
		}
		for _, r := range msg.Runes {
			if unicode.IsPrint(r) && len(*value)+len(string(r)) <= 4096 {
				*value += string(r)
			}
		}
	}
}
func (m model) prerequisites() ([]string, bool) {
	lines := []string{"Requisitos"}
	ready := !m.loading && m.statusError == ""
	if !ready {
		lines = append(lines, "Espere a cargar un estado válido desde el inicio.")
	}
	for _, item := range []struct{ key, label, remedy string }{
		{"gh", "gh / sesión", "Instale gh y ejecute gh auth login para iniciar sesión."},
		{"bun", "Bun", "Instale Bun y verifique bun --version."},
		{"git", "Git", "Instale Git y verifique git --version."},
		{"go", "Go", "Instale Go y verifique go version."},
	} {
		p := m.status.Prerequisites[item.key]
		ok := p.Present && p.Version != "" && p.Error == "" && (item.key != "gh" || p.Authenticated)
		text := item.label + ": disponible"
		if !ok {
			ready = false
			text = item.label + ": falta o no se pudo verificar. " + item.remedy
		}
		lines = append(lines, text)
	}
	return lines, ready
}
func (m model) confirmation() string {
	switch m.flow.action {
	case "update":
		return "UPDATE"
	case "rollback":
		return "ROLLBACK"
	case "uninstall":
		return "UNINSTALL"
	case "cleanup":
		return "CLEANUP"
	case "init":
		return "confiar"
	}
	return ""
}
func (m *model) field() *string {
	switch m.flow.step {
	case 1:
		if m.flow.action == "init" {
			return &m.flow.root
		}
		return &m.flow.tag
	case 2:
		return &m.flow.asset
	case 3:
		return &m.flow.sha
	case 4:
		return &m.flow.confirm
	}
	return nil
}
func (m model) inputIssue() string {
	switch m.flow.step {
	case 1:
		if m.flow.action == "init" {
			if !validRoot(m.flow.root) {
				return "Ingrese una ruta absoluta válida."
			}
		} else if !validTag(m.flow.tag) {
			return "Ingrese una etiqueta de versión no vacía, sin espacios y distinta de latest."
		}
	case 2:
		if !validValue(m.flow.asset) {
			return "Ingrese el nombre del archivo del paquete."
		}
	case 3:
		if !validSHA(m.flow.sha) {
			return "El SHA-256 debe tener 64 caracteres hexadecimales en minúsculas."
		}
	case 4:
		if m.flow.confirm != m.confirmation() {
			return "Escriba exactamente " + m.confirmation() + " para confirmar."
		}
	}
	return ""
}
func (m model) releaseAction(advanced bool) (tea.Model, tea.Cmd) {
	m.page, m.offset = "wizard", 0
	m.flow = workflow{action: "install", asset: "tower-v1.json", advanced: advanced}
	if m.status.Engine.Installed {
		m.flow.action = "update"
	}
	if _, ready := m.prerequisites(); ready && !advanced {
		return m.startAction()
	}
	return m, nil
}
func (m model) homeRefresh() (tea.Model, tea.Cmd) {
	m.page, m.offset = "home", 0
	m.sequence++
	refresh := m.reloadStatus()
	return m, refresh
}
func (m model) wizardKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.flow.step == 5 {
		return m, nil
	}
	if m.flow.step == 6 && (msg.Type == tea.KeyEnter || msg.Type == tea.KeyEsc) {
		return m.homeRefresh()
	}
	if msg.Type == tea.KeyDown || msg.Type == tea.KeyUp {
		if msg.Type == tea.KeyDown {
			m.offset = min(m.maxOffset(), m.offset+1)
		} else {
			m.offset = max(0, m.offset-1)
		}
		return m, nil
	}
	if msg.Type == tea.KeyEsc {
		m.flow.issue = ""
		m.offset = 0
		switch {
		case m.flow.step == 0 || (m.flow.step == 4 && m.flow.action == "rollback"):
			m.page = "home"
		case m.flow.action == "init" && m.flow.step == 4:
			m.flow.step = 1
		case m.flow.action == "init" || m.flow.root != "":
			m.page = "projects"
		default:
			m.flow.step--
		}
		return m, nil
	}
	if msg.Type == tea.KeyEnter {
		if m.flow.step == 0 {
			_, ready := m.prerequisites()
			if ready {
				if !m.flow.advanced && (m.flow.action == "install" || m.flow.action == "update") {
					return m.startAction()
				}
				m.flow.step = 1
			}
			return m, nil
		}
		m.flow.issue = m.inputIssue()
		if m.flow.issue != "" {
			return m, nil
		}
		if m.flow.step == 4 {
			return m.startAction()
		}
		m.flow.step++
		if m.flow.action == "init" {
			m.flow.step = 4
		}
		m.offset = 0
		return m, nil
	}
	if field := m.field(); field != nil {
		editInput(field, msg)
		m.flow.issue = m.inputIssue()
	}
	m.offset = min(m.offset, m.maxOffset())
	return m, nil
}
func (m model) tick() tea.Cmd {
	return tea.Tick(200*time.Millisecond, func(time.Time) tea.Msg { return progressTick{m.sequence} })
}
func (m model) startAction() (tea.Model, tea.Cmd) {
	a := []string{m.flow.action}
	switch m.flow.action {
	case "install", "update":
		if m.flow.advanced || m.flow.tag != "" {
			a = append(a, "--tag", m.flow.tag, "--asset", m.flow.asset, "--sha256", m.flow.sha)
		} else {
			a = append(a, "--latest")
		}
	case "init", "doctor", "uninstall", "cleanup":
		a = []string{"project", m.flow.action, "--project", m.flow.root}
		if m.flow.action == "init" {
			a = append(a, "--trust", "trusted")
		}
	}
	m.sequence++
	m.flow.step, m.flow.started = 5, time.Now()
	m.offset = 0
	cmd := func() tea.Msg {
		result := execution{code: -1, err: fmt.Errorf("comando no permitido")}
		if allowedArgs(a) {
			result = m.run(a)
		}
		return commandResult{action: "operation", id: m.sequence, result: result}
	}
	return m, tea.Batch(cmd, m.tick())
}
func (m model) wizardLines() []string {
	f := m.flow
	lines := []string{}
	switch f.step {
	case 0:
		lines, _ = m.prerequisites()
	case 1:
		if f.action == "init" {
			lines = []string{"Adoptar un proyecto nuevo", "Ruta absoluta: " + clean(f.root)}
		} else {
			lines = []string{"Versión (etiqueta)", "> " + clean(f.tag)}
		}
	case 2:
		lines = []string{"Archivo del paquete", "> " + clean(f.asset)}
	case 3:
		lines = []string{"Código SHA-256", "Solicite este código a quien mantiene la Torre por un canal distinto de GitHub.", "> " + clean(f.sha)}
	case 4:
		label := map[string]string{"install": "instalar", "update": "actualizar", "rollback": "volver a la versión anterior", "doctor": "revisar", "uninstall": "desinstalar", "cleanup": "limpiar residuos", "init": "adoptar"}[f.action]
		if label == "" {
			label = f.action
		}
		lines = []string{"Revisión", "Acción: " + label}
		switch f.action {
		case "install", "update":
			lines = append(lines, "Versión: "+readableVersion(f.tag, ""), "Archivo: "+clean(f.asset), "SHA-256: "+short(f.sha))
		case "rollback":
			lines = append(lines, "Activa → anterior: "+readableVersion(m.status.Engine.ActiveTag, m.status.Engine.Active)+" → "+readableVersion(m.status.Engine.PreviousTag, m.status.Engine.Previous))
		default:
			lines = append(lines, "Proyecto: "+clean(f.root))
			if f.action == "cleanup" {
				lines = append(lines, "Limpiar residuos es sólo para una operación interrumpida.")
			}
			if f.action == "init" {
				lines = append(lines, "Se agregarán: .claude/skills/control-tower", ".agents/skills/control-tower", ".control-tower/", ".control-tower-adoption-v1/", "La confianza permite ejecutar herramientas del proyecto. Revise su contenido antes de confiar.")
			}
		}
		if word := m.confirmation(); word != "" {
			lines = append(lines, "Escriba "+word+" para confirmar:", "> "+clean(f.confirm))
		} else {
			lines = append(lines, "Enter confirma la operación.")
		}
	case 5:
		label := map[string]string{"install": "Instalando…", "update": "Actualizando…", "rollback": "Restaurando…", "init": "Adoptando…", "doctor": "Revisando…", "uninstall": "Desinstalando…", "cleanup": "Limpiando residuos…"}[f.action]
		lines = []string{fmt.Sprintf("%s %s · %d s", []string{"◐", "◓", "◑", "◒"}[f.frame%4], label, int(time.Since(f.started).Seconds()))}
		if m.quitConfirm {
			lines = append(lines, "Hay una operación en curso. ¿Desea salir cuando finalice?", "enter: esperar hasta que finalice · esc: continuar en la interfaz")
		} else if m.quitAfter {
			lines = append(lines, "Esperando a que finalice sin interrumpir la operación…", "El resultado se mostrará antes de salir.")
		}
	case 6:
		lines = append([]string{"Resultado"}, f.lines...)
		if m.quitAfter {
			lines = append(lines, "Operación finalizada. Pulse enter o q para salir.")
		} else {
			lines = append(lines, "Volver al inicio")
		}
	}
	if f.issue != "" {
		lines = append(lines, m.palette.bad.Render(f.issue))
	}
	return lines
}
func successfulLocalStatus(status string) bool {
	switch status {
	case "success", "installed", "uninstalled", "cleaned", "healthy", "outdated", "upgraded", "refreshed", "unchanged", "absent":
		return true
	}
	return false
}
func resultStatusLabel(status string) string {
	labels := map[string]string{"installed": "instalado", "activated": "activado", "restored": "restaurado", "healthy": "sano", "absent": "no instalado", "uninstalled": "desinstalado", "cleaned": "residuos limpiados", "outdated": "desactualizado", "upgraded": "actualizado", "refreshed": "actualizado", "unchanged": "al día"}
	if label := labels[status]; label != "" {
		return label
	}
	return "completado"
}
func firstLine(s string) string { return clean(strings.Split(strings.TrimSpace(s), "\n")[0]) }
func resultLines(r execution) []string {
	var result struct {
		Status, Active, Previous, ActiveTag, PreviousTag, Tag, Tui string
		LocalResult                                             *struct{ Status string }
		Registry                                                struct{ Status string }
	}
	parsed := json.Unmarshal(r.stdout, &result) == nil && (result.Status != "" || (result.LocalResult != nil && result.LocalResult.Status != ""))
	raw := firstLine(string(r.stderr))
	if raw == "" && r.err != nil {
		raw = firstLine(r.err.Error())
	}
	var lines []string
	localSucceeded := result.LocalResult != nil && successfulLocalStatus(result.LocalResult.Status)
	registryFailed := result.Registry.Status == "failed" || strings.Contains(strings.ToLower(string(r.stderr)), "registry publication failed")
	if parsed && localSucceeded && registryFailed {
		lines = []string{"La operación en el proyecto se completó, pero no se pudo actualizar la lista de proyectos", "Advertencia: la lista de proyectos puede estar desactualizada. Consulte Diagnóstico."}
	} else if r.code != 0 || r.err != nil || !parsed {
		text := "No se pudo completar la operación."
		lower := strings.ToLower(raw)
		switch {
		case strings.Contains(lower, "sha-256 mismatch"):
			text = "El código SHA-256 no coincide. Verifique el código por un canal de confianza."
		case (strings.Contains(lower, "gh") && strings.Contains(lower, "auth")) || strings.Contains(lower, "github release command failed"):
			text = "No se pudo verificar la sesión o descargar el paquete. Revise gh auth login."
		case strings.Contains(lower, "unknown launcher"):
			text = "El lanzador existente no es reconocido y se conservó sin cambios."
		case strings.Contains(lower, "chmod") || strings.Contains(lower, "permission") || strings.Contains(lower, "eacces"):
			text = "Hay un problema de permisos. Siga la indicación chmod del mensaje original, si está presente."
		}
		lines = []string{text}
	} else if result.Status == "up-to-date" {
		lines = []string{"Todas las configuraciones al día"}
	} else {
		operationStatus := result.Status
		if result.LocalResult != nil {
			operationStatus = result.LocalResult.Status
		}
		lines = []string{"Operación completada: " + resultStatusLabel(operationStatus)}
		if result.Tag != "" {
			lines = append(lines, "Versión instalada: "+readableVersion(result.Tag, ""))
		}
		if result.LocalResult == nil {
			lines = append(lines, "Activa: "+readableVersion(result.ActiveTag, result.Active)+" · Anterior: "+readableVersion(result.PreviousTag, result.Previous))
		}
	}
	if parsed && r.code == 0 && r.err == nil && result.Tui == "updated" {
		lines = append(lines, "Volvé a abrir torre-control para ver la nueva interfaz.")
	}
	if raw != "" {
		lines = append(lines, "Mensaje original: "+raw)
	}
	for _, line := range strings.Split(string(r.stderr), "\n") {
		var recovery struct {
			Type    string
			Errors  []string
			Omitted int
		}
		if json.Unmarshal([]byte(line), &recovery) == nil && recovery.Type == "tower.cli.recovery/1" {
			lines = append(lines, "Se conservó evidencia de recuperación; no repita la operación sin revisarla.")
			for _, e := range recovery.Errors {
				lines = append(lines, clean(e))
			}
			if recovery.Omitted > 0 {
				lines = append(lines, fmt.Sprintf("Otros detalles omitidos: %d", recovery.Omitted))
			}
		}
	}
	return lines
}
