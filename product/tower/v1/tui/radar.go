package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

var radarCommands = []struct{ name, description string }{
	{"etapa", "Qué etapa permite la evidencia antes de actuar"},
	{"faltan", "Qué Sesiones faltan y el avance por área"},
	{"status", "Sesiones LISTO, en curso y compatibilidad"},
	{"sesion", "Contrato completo de una Sesión"},
	{"check", "Valida el plan"},
	{"zonas", "Qué archivos pertenecen a cada zona"},
	{"roadmap", "Alternativas LISTO y qué destrabarían"},
}

// Accept current and legacy Radar Session IDs, never flags or shell fragments.
var radarID = regexp.MustCompile(`^S[1-9][0-9]*(\.[1-9][0-9]*)*$`)

func allowedRadarArgs(args []string) bool {
	if len(args) == 0 || len(args) > 2 {
		return false
	}
	switch args[0] {
	case "sesion":
		return len(args) == 2 && radarID.MatchString(args[1])
	case "etapa":
		return len(args) == 1 || radarID.MatchString(args[1])
	case "check", "status", "faltan", "zonas", "roadmap":
		return len(args) == 1
	}
	return false
}

type radarExecutor func(context.Context, string, []string, string, io.Writer) (int, error)
type radarRunFunc func(string, []string) execution

func executeRadar(ctx context.Context, binary string, args []string, root string, output io.Writer) (int, error) {
	cmd := exec.CommandContext(ctx, binary, args...)
	cmd.Dir, cmd.Stdout, cmd.Stderr = root, output, output
	// Bound waiting for inherited output pipes as well as the direct process.
	cmd.WaitDelay = time.Second
	err := cmd.Run()
	if err == nil {
		return 0, nil
	}
	var exit *exec.ExitError
	if errors.As(err, &exit) {
		return exit.ExitCode(), err
	}
	return -1, err
}

func radarRunner(home string, execute radarExecutor) radarRunFunc {
	return func(root string, args []string) execution {
		if !allowedRadarArgs(args) || !filepath.IsAbs(root) {
			return execution{code: -1, err: fmt.Errorf("comando de Radar no permitido")}
		}
		binary := filepath.Join(home, ".local", "bin", "radar")
		info, err := os.Stat(binary)
		if err != nil || !info.Mode().IsRegular() {
			return execution{code: -1, err: fmt.Errorf("Radar no está instalado. Ejecutá «Instalar o actualizar» desde el inicio")}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		// Both streams share one bounded writer; exec serializes writes to it.
		var output boundedOutput
		code, err := execute(ctx, binary, append([]string(nil), args...), root, &output)
		if ctx.Err() != nil || errors.Is(err, context.DeadlineExceeded) {
			err = fmt.Errorf("se agotó el tiempo de Radar (30 segundos)")
		} else if err != nil && code == -1 {
			err = fmt.Errorf("no se pudo ejecutar Radar: %w", err)
		}
		if output.truncated {
			err = fmt.Errorf("la salida de Radar excedió el límite de 64 KiB")
			if code == 0 {
				code = -1
			}
		}
		return execution{stdout: output.data, code: code, err: err}
	}
}

func installedRadarRunner(root string, args []string) execution {
	home, err := os.UserHomeDir()
	if err != nil {
		return execution{code: -1, err: fmt.Errorf("no se pudo localizar Radar: %w", err)}
	}
	return radarRunner(home, executeRadar)(root, args)
}

type radarScreen struct {
	root, command, id, error string
	selected                 int
	running                  bool
	lines                    []string
	code                     int
}

type radarResult struct {
	id     uint64
	result execution
}

func (m model) openRadar(root string) model {
	m.page, m.offset = "radar-list", 0
	m.radar = radarScreen{root: root}
	return m.focusRadarCommand()
}

func (m model) runRadar(args []string) (tea.Model, tea.Cmd) {
	// Defense in depth: forged UI state must not bypass process admission.
	if !allowedRadarArgs(args) {
		m.radar.error = "Comando de Radar no permitido. Usá la lista de comandos."
		return m, nil
	}
	m.sequence++
	id, root, run := m.sequence, m.radar.root, m.radarRun
	m.page, m.offset, m.radar.running = "radar-output", 0, true
	m.radar.lines, m.radar.code, m.radar.error = nil, 0, ""
	return m, func() tea.Msg {
		return radarResult{id: id, result: run(root, args)}
	}
}

func (m model) radarKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Do not detach a running child on navigation or quit; execution is bounded.
	if m.radar.running {
		return m, nil
	}
	if m.page == "radar-id" {
		switch msg.Type {
		case tea.KeyEsc:
			m.page, m.offset = "radar-list", 0
			m = m.focusRadarCommand()
		case tea.KeyEnter:
			if !radarID.MatchString(m.radar.id) && !(m.radar.command == "etapa" && m.radar.id == "") {
				m.radar.error = "ID no válido. Usá S123 o S1.11."
				return m.focusRadarInput(), nil
			}
			args := []string{m.radar.command}
			if m.radar.id != "" {
				args = append(args, m.radar.id)
			}
			return m.runRadar(args)
		case tea.KeyBackspace, tea.KeyDelete:
			runes := []rune(m.radar.id)
			if len(runes) > 0 {
				m.radar.id = string(runes[:len(runes)-1])
			}
		case tea.KeyRunes:
			m.radar.id += string(msg.Runes)
		case tea.KeySpace:
			m.radar.id += " "
		case tea.KeyCtrlC:
			return m, tea.Quit
		}
		if m.page == "radar-id" {
			m = m.focusRadarInput()
		}
		return m, nil
	}
	switch msg.String() {
	case "q", "ctrl+c":
		return m, tea.Quit
	case "esc":
		if m.page == "radar-list" {
			m.page = "projects"
		} else {
			m.page = "radar-list"
		}
		m.offset = 0
	case "enter":
		if m.page == "radar-list" {
			m.radar.selected = min(max(0, m.radar.selected), len(radarCommands)-1)
			m.radar.command = radarCommands[m.radar.selected].name
			m.radar.id, m.radar.error = "", ""
			if m.radar.command == "sesion" || m.radar.command == "etapa" {
				m.page, m.offset = "radar-id", 0
			} else {
				return m.runRadar([]string{m.radar.command})
			}
		}
	case "up", "k":
		if m.page == "radar-list" {
			m.radar.selected = max(0, m.radar.selected-1)
		} else {
			m.offset = max(0, m.offset-1)
		}
	case "down", "j":
		if m.page == "radar-list" {
			m.radar.selected = min(len(radarCommands)-1, m.radar.selected+1)
		} else {
			m.offset++
		}
	case "pgup":
		m.offset = max(0, m.offset-max(1, m.height-1))
	case "pgdown":
		m.offset += max(1, m.height-1)
	}
	if m.page == "radar-list" {
		m = m.focusRadarCommand()
	} else if m.page == "radar-id" {
		m = m.focusRadarInput()
	}
	m.offset = min(m.offset, m.maxOffset())
	return m, nil
}

func radarLabel(name string) string {
	if name == "sesion" {
		return name + " <ID>"
	}
	if name == "etapa" {
		return name + " [ID]"
	}
	return name
}

// Keep both the command and its explanation visible when the viewport permits.
func (m model) focusRadarCommand() model {
	row := len(m.wrap([]string{"Comandos de Radar", clean(m.radar.root), "Solo lectura."}))
	for i, command := range radarCommands {
		block := len(m.wrap([]string{"  " + radarLabel(command.name), "  " + command.description}))
		if i == m.radar.selected {
			m.offset = min(m.offset, row)
			m.offset = max(m.offset, min(row, row+block-max(1, m.viewportHeight())))
			break
		}
		row += block
	}
	m.offset = min(m.offset, m.maxOffset())
	return m
}

// Follow the end of the editable line when it wraps; the current input must
// take priority over headings, optional help and validation errors.
func (m model) focusRadarInput() model {
	row := len(m.wrap([]string{"Radar · " + m.radar.command, "ID de Sesión (S123 o S1.11):"}))
	end := row + len(m.wrap([]string{"> " + clean(m.radar.id)}))
	m.offset = max(min(m.offset, row), end-max(1, m.viewportHeight()))
	m.offset = min(m.offset, m.maxOffset())
	return m
}

func (m model) radarLines() []string {
	lines := []string{"Comandos de Radar", clean(m.radar.root), "Solo lectura."}
	switch m.page {
	case "radar-list":
		for i, command := range radarCommands {
			prefix, label := "  ", radarLabel(command.name)
			if i == m.radar.selected {
				prefix = "> "
			}
			// Titles share the tower logo color so commands stand out from their descriptions.
			lines = append(lines, prefix+m.palette.tower.Render(label), "  "+command.description)
		}
	case "radar-id":
		lines = []string{"Radar · " + m.radar.command, "ID de Sesión (S123 o S1.11):", "> " + clean(m.radar.id)}
		if m.radar.command == "etapa" {
			lines = append(lines, "Opcional: enter sin ID consulta la etapa del proyecto.")
		}
		if m.radar.error != "" {
			lines = append(lines, m.radar.error)
		}
	case "radar-output":
		label := m.radar.command
		if m.radar.id != "" {
			label += " " + m.radar.id
		}
		lines = []string{"Radar · " + label, clean(m.radar.root)}
		if m.radar.running {
			lines = append(lines, "Ejecutando… (máximo 30 segundos)")
		} else {
			if m.radar.code != 0 {
				lines = append(lines, fmt.Sprintf("Salida: código %d", m.radar.code))
			}
			lines = append(lines, "")
			lines = append(lines, m.radar.lines...)
		}
	}
	return m.wrap(lines)
}

func radarOutputLines(result execution) []string {
	lines := []string{}
	for _, stream := range [][]byte{result.stdout, result.stderr} {
		if len(stream) > 0 {
			for _, line := range strings.Split(strings.TrimRight(string(stream), "\r\n"), "\n") {
				lines = append(lines, clean(line))
			}
		}
	}
	if result.err != nil {
		lines = append(lines, "Error: "+clean(result.err.Error()))
	}
	if len(lines) == 0 {
		lines = append(lines, "El comando no produjo salida.")
	}
	return lines
}
