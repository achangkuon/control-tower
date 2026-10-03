package main

import (
	"errors"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

const healthyJSON = `{"schema":"tower.v1.status/1","engine":{"installed":true,"status":"healthy","active":"123456789abcdef","previous":"abcdef123456789"},"projects":[{"projectRoot":"/proyecto","status":"healthy"}],"prerequisites":{"gh":{"present":true,"version":"2.90.0","authenticated":true},"bun":{"present":true,"version":"1.3.0"},"git":{"present":true,"version":"2.50.0"},"go":{"present":true,"version":"1.26.4"}},"agents":{"claude":{"executable":true,"config":true},"pi":{"config":true},"codex":{},"opencode":{"executable":true}},"system":{"os":"linux","arch":"x64","shell":"bash"}}`

func key(m model, value string) (model, tea.Cmd) {
	msg := tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(value)}
	switch value {
	case "enter":
		msg.Type = tea.KeyEnter
	case "esc":
		msg.Type = tea.KeyEsc
	case "up":
		msg.Type = tea.KeyUp
	case "down":
		msg.Type = tea.KeyDown
	case "ctrl+c":
		msg.Type = tea.KeyCtrlC
	}
	next, cmd := m.Update(msg)
	return next.(model), cmd
}

func loaded(t *testing.T, data string) model {
	t.Helper()
	m := newModel(func(args []string) execution {
		action := args[0]
		if action != "status" {
			t.Fatalf("unexpected command: %s", action)
		}
		return execution{stdout: []byte(data)}
	}, true)
	next, _ := m.Update(m.Init()())
	return next.(model)
}

func contains(t *testing.T, view string, texts ...string) {
	t.Helper()
	for _, text := range texts {
		if !strings.Contains(view, text) {
			t.Errorf("missing %q in:\n%s", text, view)
		}
	}
}

func TestExplicitRenderer(t *testing.T) {
	for _, tt := range []struct {
		term, color string
		noColor     bool
		want        termenv.Profile
	}{
		{"xterm", "", false, termenv.ANSI},
		{"xterm-256color", "", false, termenv.ANSI256},
		{"xterm", "truecolor", false, termenv.TrueColor},
		{"dumb", "truecolor", false, termenv.Ascii},
		{"xterm-256color", "truecolor", true, termenv.Ascii},
	} {
		t.Setenv("TERM", tt.term)
		t.Setenv("COLORTERM", tt.color)
		lipgloss.SetHasDarkBackground(false)
		newPalette(tt.noColor)
		if lipgloss.ColorProfile() != tt.want || !lipgloss.HasDarkBackground() {
			t.Fatalf("renderer configuration: TERM=%q COLORTERM=%q NO_COLOR=%v", tt.term, tt.color, tt.noColor)
		}
	}
}

func TestNavigation(t *testing.T) {
	m := loaded(t, healthyJSON)
	for _, k := range []string{"down", "j", "down", "up", "k"} {
		m, _ = key(m, k)
	}
	if m.selected != 1 {
		t.Fatalf("selection = %d", m.selected)
	}
	for _, index := range []int{0, 1, 2} {
		m.selected = index
		m, cmd := key(m, "enter")
		if cmd != nil {
			t.Fatal("opening a screen must not execute commands")
		}
		contains(t, m.View(), []string{"Requisitos", "ROLLBACK", "Proyectos"}[index], "esc")
		m, _ = key(m, "esc")
		contains(t, m.View(), "Torre de Control V1", "Instalar o actualizar")
	}
	m.selected = 4
	m, _ = key(m, "enter")
	contains(t, m.View(), "Ayuda", "status", "doctor", "Instalar o actualizar")
	m, _ = key(m, "esc")
	for _, k := range []string{"q", "ctrl+c"} {
		_, cmd := key(m, k)
		if cmd == nil {
			t.Fatalf("%s did not quit", k)
		}
		if _, ok := cmd().(tea.QuitMsg); !ok {
			t.Fatalf("%s: not a quit message", k)
		}
	}
	m.selected = 5
	_, cmd := key(m, "enter")
	if _, ok := cmd().(tea.QuitMsg); !ok {
		t.Fatal("Salir did not quit")
	}
}

func TestStatusRendering(t *testing.T) {
	for _, tt := range []struct {
		name, data string
		want       []string
	}{
		{"healthy", healthyJSON, []string{"instalado / sano", "1234567", "abcdef1", "/proyecto", "sano", "con sesión", "1.26.4", "Claude Code: listo", "Pi: sólo configuración", "Codex: no detectado", "OpenCode: listo", "linux", "bash"}},
		{"absent", `{"schema":"tower.v1.status/1","engine":{"status":"absent"},"projects":[]}`, []string{"no instalado", "Proyectos (0)", "Bun: falta", "Git: falta", "Go: falta", "gh: falta"}},
		{"warnings", `{"schema":"tower.v1.status/1","engine":{"status":"error"},"projects":{"error":"failure"},"prerequisites":{"gh":{"present":true,"version":"2.0","authenticated":false},"go":{"present":true,"error":"failure"}}}`, []string{"Motor: error", "Proyectos: error de consulta", "sin sesión", "Go: error de comprobación"}},
	} {
		t.Run(tt.name, func(t *testing.T) { contains(t, loaded(t, tt.data).View(), tt.want...) })
	}
}

func TestLoadingFailureAndRefresh(t *testing.T) {
	calls := 0
	m := newModel(func([]string) execution { calls++; return execution{code: 1, err: errors.New("fallo simulado")} }, true)
	contains(t, m.View(), "Cargando estado…")
	next, _ := m.Update(m.Init()())
	m = next.(model)
	contains(t, m.View(), "No se pudo cargar el estado", "fallo simulado")
	m, cmd := key(m, "r")
	contains(t, m.View(), "Cargando estado…")
	m.Update(cmd())
	if calls != 2 {
		t.Fatalf("calls = %d", calls)
	}
	for _, data := range []string{"not JSON", `{"schema":"unknown"}`} {
		contains(t, loaded(t, data).View(), "No se pudo cargar el estado")
	}
}

func TestDiagnostic(t *testing.T) {
	m := newModel(func(args []string) execution {
		action := args[0]
		if action != "doctor" {
			t.Fatalf("unexpected action: %s", action)
		}
		return execution{stdout: []byte(`{"status":"healthy","active":"abcdef123456","previous":null}`)}
	}, true)
	m.selected = 3
	m, cmd := key(m, "enter")
	contains(t, m.View(), "Cargando diagnóstico…")
	next, _ := m.Update(cmd())
	m = next.(model)
	contains(t, m.View(), "Diagnóstico", "instalado / sano", "abcdef1", "volver")
	if strings.Contains(m.View(), `"status"`) {
		t.Fatal("raw JSON displayed")
	}
	m, _ = key(m, "enter")
	contains(t, m.View(), "Instalar o actualizar")
	m.selected = 3
	m, _ = key(m, "enter")
	next, _ = m.Update(commandResult{action: "doctor", id: m.sequence, err: errors.New("fallo simulado")})
	contains(t, next.(model).View(), "No se pudo cargar el diagnóstico")
}

func TestBoundariesAndLateDiagnostic(t *testing.T) {
	m := loaded(t, healthyJSON)
	m, _ = key(m, "up")
	if m.selected != 0 {
		t.Fatal("selection escaped top boundary")
	}
	m.selected = 5
	m, _ = key(m, "down")
	if m.selected != 5 {
		t.Fatal("selection escaped bottom boundary")
	}
	m.selected = 3
	m, _ = key(m, "enter")
	oldID := m.sequence
	m, _ = key(m, "esc")
	next, _ := m.Update(commandResult{action: "doctor", data: []byte(`{"status":"absent"}`)})
	m = next.(model)
	contains(t, m.View(), "Instalar o actualizar")
	if m.diagnostic.Status != "" {
		t.Fatal("late diagnostic changed cached state")
	}
	m, _ = key(m, "enter")
	next, _ = m.Update(commandResult{action: "doctor", id: oldID, data: []byte(`{"status":"absent"}`)})
	if !next.(model).diagnosing {
		t.Fatal("old request replaced current request")
	}
	next, _ = m.Update(commandResult{action: "doctor", id: m.sequence, data: []byte(`{}`)})
	contains(t, next.(model).View(), "respuesta de diagnóstico no válida")
	if got := clean("\x1b[31mtexto\x1b[0m\n\x07"); got != "texto  " {
		t.Fatalf("unsafe output: %q", got)
	}
}

func TestSmallLayoutAndNoColor(t *testing.T) {
	m := loaded(t, healthyJSON)
	for _, size := range []tea.WindowSizeMsg{{Width: 45, Height: 16}, {Width: 28, Height: 12}, {Width: 28, Height: 9}, {Width: 10, Height: 1}, {Width: 10, Height: 2}, {Width: 10, Height: 3}} {
		next, _ := m.Update(size)
		m = next.(model)
		view := m.View()
		if size.Height >= 9 {
			contains(t, view, "Instalar o actualizar", "Diagnóstico", "Ayuda", "Salir", "q salir")
		}
		if size.Height == 16 {
			contains(t, view, "Sistema:")
		}
		if strings.Contains(view, towerLogo) {
			t.Fatal("logo not dropped")
		}
		if strings.Contains(view, "\x1b") {
			t.Fatal("NO_COLOR emitted ANSI")
		}
		if len(strings.Split(view, "\n")) > size.Height {
			t.Fatal("view exceeds terminal height")
		}
	}
}
