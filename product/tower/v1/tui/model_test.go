package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"slices"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

const taggedJSON = `{"schema":"tower.v1.status/1","engine":{"installed":true,"status":"healthy","active":"123456789abcdef","previous":"abcdef123456789","activeTag":"v1.1.0","previousTag":"v1.0.2","components":{"gentleAi":{"status":"ok","version":"4.0.0"}}},"projects":[{"projectRoot":"/proyecto","status":"healthy"}],"prerequisites":{"gh":{"present":true,"version":"2.90.0","authenticated":true},"bun":{"present":true,"version":"1.3.0"},"git":{"present":true,"version":"2.50.0"},"go":{"present":true,"version":"1.26.4"}},"agents":{"claude":{"executable":true},"pi":{"config":true}},"system":{"os":"linux","arch":"x64","shell":"bash"}}`

const expectedProjectPrompt = "Quiero usar la Torre de Control en un proyecto. Preguntame en cuál: el que tenés abierto u otro.\n" +
	"Después preguntame si hago una migración completa o solo lo que falta, y recomendame solo lo que falta.\n" +
	"Instalá la Torre en ese proyecto con `torre-control project init` y armá su plan con la skill\n" +
	"chanks-1-adopcion (o chanks-1-project-kickoff si el proyecto está vacío). No guardes nada sin mi aprobación."

func openProjectPrompt(t *testing.T) model {
	t.Helper()
	m := loaded(t, healthyJSON)
	m.width = 140
	index := slices.Index(menu, "Sumar un proyecto")
	if index < 0 {
		t.Fatal("Home lacks Sumar un proyecto")
	}
	m.selected = index
	contains(t, m.View(), "Sumar un proyecto", "(prompt para tu agente)")
	m, cmd := key(m, "enter")
	if cmd != nil {
		t.Fatal("prompt screen executed an operation")
	}
	return m
}

func TestProjectPromptExactSelectableAndNarrow(t *testing.T) {
	m := openProjectPrompt(t)
	view := m.View()
	contains(t, view, expectedProjectPrompt, "Copiá este texto y pegáselo a tu agente (Claude Code, Codex, OpenCode o Pi), abierto en cualquier carpeta.", "c: copiar", "esc")
	if strings.Count(view, "Quiero usar la Torre") != 1 || strings.Contains(view, "/proyecto") || strings.ContainsAny(view, "│─┌┐└┘") {
		t.Fatal("prompt is duplicated, path-bound or boxed")
	}
	t.Log("Prompt screen:\n" + view)
	for _, size := range []tea.WindowSizeMsg{{Width: 28, Height: 12}, {Width: 10, Height: 3}, {Width: 1, Height: 1}} {
		next, _ := m.Update(size)
		m = next.(model)
		if len(strings.Split(m.View(), "\n")) > size.Height {
			t.Fatal("height overflow")
		}
		for _, line := range strings.Split(m.View(), "\n") {
			if ansi.StringWidth(line) > size.Width {
				t.Fatal("width overflow")
			}
		}
		if size.Width == 28 {
			contains(t, strings.Join(m.pageLines(), "\n"), "Quiero usar la Torre de", "chanks-1-adopcion")
			m = keys(m, "down", "down")
			if m.offset == 0 {
				t.Fatal("narrow prompt cannot scroll")
			}
		}
	}
	m = keys(m, "esc")
	if m.page != "home" {
		t.Fatal("prompt did not return home")
	}
	// This passive prompt must remain available even when status cannot load.
	m.width = 140
	m.loading, m.statusError = true, "sin conexión"
	m = keys(m, "enter")
	contains(t, strings.Join(m.pageLines(), "\n"), "Quiero")
}

type clipboardProbe struct{ model }

func (p clipboardProbe) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	next, cmd := p.model.Update(msg)
	p.model = next.(model)
	if p.copyFeedback != "" {
		return p, tea.Quit
	}
	return p, cmd
}

func TestProjectPromptClipboardOSC52ThroughBubbleTea(t *testing.T) {
	for _, tt := range []struct {
		name  string
		width int
	}{{"wide", 140}, {"narrow", 28}} {
		t.Run(tt.name, func(t *testing.T) {
			m := openProjectPrompt(t)
			m.width, m.height = tt.width, 12
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			var output bytes.Buffer
			program := tea.NewProgram(clipboardProbe{m}, tea.WithContext(ctx), tea.WithInput(strings.NewReader("")), tea.WithOutput(&output), tea.WithAltScreen(), tea.WithoutSignalHandler())
			go program.Send(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'c'}})
			result, err := program.Run()
			if err != nil {
				t.Fatal(err)
			}
			contains(t, result.View(), "Enviado al portapapeles")
			if strings.Contains(result.View(), "Copiado") {
				t.Fatal("OSC52 emission claimed confirmed clipboard delivery")
			}
			want := "\x1b]52;c;" + base64.StdEncoding.EncodeToString([]byte(expectedProjectPrompt)) + "\x07"
			if !strings.Contains(output.String(), want) {
				t.Fatalf("OSC52 not emitted through Bubble Tea output: %q", output.String())
			}
		})
	}
}

func TestProjectPromptClipboardFeedbackIsUnconfirmed(t *testing.T) {
	m := openProjectPrompt(t)
	_, cmd := key(m, "c")
	if cmd == nil {
		t.Fatal("copy did not request terminal clipboard emission")
	}
	next, _ := m.Update(clipboardResult{})
	m = next.(model)
	contains(t, m.View(), "Enviado al portapapeles de la terminal (si no aparece, seleccioná el texto)", expectedProjectPrompt)
	if strings.Contains(m.View(), "Copiado") {
		t.Fatal("unconfirmed clipboard delivery reported as copied")
	}
	m = keys(m, "esc", "enter")
	if m.copyFeedback != "" {
		t.Fatal("feedback survived reopening")
	}
	m = keys(m, "esc")
	next, _ = m.Update(clipboardResult{})
	if next.(model).copyFeedback != "" {
		t.Fatal("late clipboard result changed another page")
	}
}

func TestProjectPromptClipboardFailureStaysSelectable(t *testing.T) {
	m := openProjectPrompt(t)
	next, _ := m.Update(clipboardResult{errors.New("output unavailable")})
	m = next.(model)
	contains(t, m.View(), "No se pudo copiar", expectedProjectPrompt)
	m = keys(m, "esc", "enter")
	if strings.Contains(m.View(), "No se pudo copiar") {
		t.Fatal("stale copy feedback on reopening")
	}
}

func TestReadableVersions(t *testing.T) {
	for _, tt := range []struct{ name, data, active, previous string }{
		{"tags", taggedJSON, "v1.1.0", "v1.0.2"},
		{"legacy", healthyJSON, "versión desconocida", "versión desconocida"},
		{"unknown", `{"schema":"tower.v1.status/1","engine":{"status":"absent","activeTag":null,"previousTag":null},"projects":[]}`, "no instalado", "versión desconocida"},
		{"mixed", strings.Replace(taggedJSON, `"previousTag":"v1.0.2"`, `"previousTag":null`, 1), "v1.1.0", "versión desconocida"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			m := loaded(t, tt.data)
			contains(t, m.View(), "Versión: "+tt.active)
			contains(t, m.View(), "Anterior: "+tt.previous)
			// Exercise the actual doctor JSON boundary rather than assigning internal fields.
			var data struct{ Engine json.RawMessage }
			if err := json.Unmarshal([]byte(tt.data), &data); err != nil {
				t.Fatal(err)
			}
			m.page, m.diagnosing = "doctor", true
			next, _ := m.Update(commandResult{action: "doctor", id: m.sequence, data: data.Engine})
			m = next.(model)
			contains(t, m.View(), "Anterior: "+tt.previous)
			if tt.name == "tags" && strings.Contains(m.View(), "1234567") {
				t.Fatal("digest displayed despite known tag")
			}
		})
	}
	m := loaded(t, taggedJSON)
	m.page, m.diagnosing = "doctor", true
	next, _ := m.Update(commandResult{action: "doctor", id: m.sequence, data: []byte(`{"status":"healthy","active":"123456789abcdef","previous":"abcdef123456789","activeTag":"v1.1.0","previousTag":"v1.0.2","components":{"gentleAi":{"status":"ok","version":"4.0.0"}}}`)})
	contains(t, next.(model).View(), "Activa: v1.1.0 · Anterior: v1.0.2", "4.0.0")
}

func TestAlignedStatusAndGentleAI(t *testing.T) {
	m := loaded(t, taggedJSON)
	view := m.View()
	for label, value := range map[string]string{"Motor": "instalado · sano", "Versión": "v1.1.0 · anterior v1.0.2", "Gentle AI": "4.0.0", "Proyectos": "1", "gh": "2.90.0", "Bun": "1.3.0", "Git": "2.50.0", "Go": "1.26.4", "Claude Code": "listo", "Pi": "sólo configuración", "Codex": "no detectado", "OpenCode": "no detectado", "Sistema": "linux/x64 · bash"} {
		contains(t, view, "  "+label+strings.Repeat(" ", 13-ansi.StringWidth(label))+value)
	}
	contains(t, loaded(t, healthyJSON).View(), "  Gentle AI    falta")
	missing := strings.Replace(taggedJSON, `"status":"ok","version":"4.0.0"`, `"status":"missing","version":null`, 1)
	contains(t, loaded(t, missing).View(), "  Gentle AI    falta")
}

func TestMenuHintsAndNarrowLayout(t *testing.T) {
	m := loaded(t, taggedJSON)
	contains(t, m.View(), "> Instalar o actualizar", "  Volver a la versión anterior  (v1.0.2)", "  Proyectos"+strings.Repeat(" ", ansi.StringWidth(menu[1])-ansi.StringWidth(menu[2])+2)+"(1)")
	if strings.Contains(m.View(), "(al día)") {
		t.Fatal("invented update availability")
	}
	m.selected = 1
	contains(t, m.View(), "> Volver a la versión anterior  (v1.0.2)")
	m.width = 31
	contains(t, m.View(), "> Volver a la versión anterior")
	if strings.Contains(m.View(), "(v1.0.2)") || strings.Contains(m.View(), "(1)") {
		t.Fatal("hints must drop before truncating menu labels")
	}
	m = loaded(t, taggedJSON)
	m.loading = true
	if strings.Contains(m.View(), "(v1.0.2)") || strings.Contains(m.View(), "(1)") {
		t.Fatal("stale hints while loading")
	}
}

func TestReadableStatusStylesAndHintSafety(t *testing.T) {
	t.Setenv("TERM", "xterm-256color")
	m := loaded(t, taggedJSON)
	m.palette = newPalette(false)
	m.selected = 1
	view := m.View()
	contains(t, view, m.palette.tower.Render("> "+menu[1]), m.palette.dim.Render("(v1.0.2)"))
	m = loaded(t, healthyJSON)
	m.palette = newPalette(false)
	contains(t, m.View(), m.palette.warn.Render("falta"))
	// Tags are display data, never terminal commands.
	unsafe := strings.Replace(taggedJSON, `"activeTag":"v1.1.0"`, `"activeTag":"\u001b[31mv1.1.0\u001b[0m\n"`, 1)
	view = loaded(t, unsafe).View()
	contains(t, view, "Versión: v1.1.0 ")
	if strings.Contains(view, "\x1b") {
		t.Fatal("tag injected terminal control sequences")
	}
}

func TestMenuHintsRequireCurrentKnownData(t *testing.T) {
	for _, tt := range []struct{ name, data string }{
		{"legacy", healthyJSON},
		{"absent", `{"schema":"tower.v1.status/1","engine":{"status":"absent"},"projects":[]}`},
		{"project query failed", strings.Replace(taggedJSON, `[{"projectRoot":"/proyecto","status":"healthy"}]`, `{"error":"failed"}`, 1)},
	} {
		t.Run(tt.name, func(t *testing.T) {
			m := loaded(t, tt.data)
			if tt.name == "legacy" {
				contains(t, m.View(), "(versión desconocida)", "(1)")
			} else if tt.name == "absent" {
				contains(t, m.View(), "(0)")
				if strings.Contains(m.View(), "(ninguna)") {
					t.Fatal("rollback hint without previous release")
				}
			} else if strings.Contains(m.View(), "(1)") || strings.Contains(m.View(), "(0)") {
				t.Fatal("project count invented after query failure")
			}
			m.statusError = "estado no disponible"
			for _, line := range strings.Split(m.View(), "\n") {
				if strings.Contains(line, "(v1.0.2)") || strings.Contains(line, "(1)") || strings.Contains(line, "(0)") {
					t.Fatal("stale hints after status failure")
				}
			}
		})
	}
	m := loaded(t, taggedJSON)
	for _, size := range []tea.WindowSizeMsg{{Width: 40, Height: 40}, {Width: 31, Height: 16}, {Width: 28, Height: 12}, {Width: 10, Height: 2}, {Width: 1, Height: 1}} {
		next, _ := m.Update(size)
		m = next.(model)
		for _, line := range strings.Split(m.View(), "\n") {
			if ansi.StringWidth(line) > size.Width {
				t.Fatalf("line exceeds %d cells: %q", size.Width, line)
			}
		}
	}
}

func TestS208VersionLabelsAcrossScreens(t *testing.T) {
	for _, tt := range []struct{ tag, want string }{{"checkout-936b75f16227", "versión local de prueba"}, {"", "versión desconocida"}, {"v1.2.2", "v1.2.2"}} {
		t.Run(tt.want, func(t *testing.T) {
			m := loaded(t, taggedJSON)
			m.width, m.height = 180, 60
			m.status.Engine.ActiveTag, m.status.Engine.PreviousTag = tt.tag, tt.tag
			views := []string{m.View(), strings.Join(m.engineLines(m.status.Engine), "\n")}
			m.page, m.flow = "wizard", workflow{action: "rollback", step: 4}
			views = append(views, m.View(), strings.Join(resultLines(execution{stdout: []byte(`{"status":"healthy","active":"123456789abcdef","previous":"abcdef123456789","activeTag":"` + tt.tag + `","previousTag":"` + tt.tag + `"}`)}), "\n"))
			for _, view := range views {
				contains(t, view, tt.want)
				if strings.Contains(view, "checkout-") || strings.Contains(view, "1234567") || strings.Contains(view, "abcdef1") {
					t.Fatalf("raw version code leaked: %s", view)
				}
			}
		})
	}
}

func TestHomeRenderingSample(t *testing.T) {
	m := loaded(t, taggedJSON)
	t.Log("Home fixture:\n" + m.View())
}

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
		openKey := "enter"
		if index == 0 {
			openKey = "a" // Manual advanced navigation is passive; default runs latest.
		}
		m, cmd := key(m, openKey)
		if cmd != nil {
			t.Fatal("opening a passive screen must not execute commands")
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
	m.selected = len(menu) - 1
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
		{"healthy", healthyJSON, []string{"instalado · sano", "versión desconocida", "/proyecto", "sano", "con sesión", "1.26.4", statusRow("Claude Code", "listo"), statusRow("Pi", "sólo configuración"), statusRow("Codex", "no detectado"), statusRow("OpenCode", "listo"), "linux", "bash"}},
		{"absent", `{"schema":"tower.v1.status/1","engine":{"status":"absent"},"projects":[]}`, []string{"no instalado", statusRow("Proyectos", "0"), statusRow("Bun", "falta"), statusRow("Git", "falta"), statusRow("Go", "falta"), statusRow("gh", "falta")}},
		{"warnings", `{"schema":"tower.v1.status/1","engine":{"status":"error"},"projects":{"error":"failure"},"prerequisites":{"gh":{"present":true,"version":"2.0","authenticated":false},"go":{"present":true,"error":"failure"}}}`, []string{statusRow("Motor", "error"), statusRow("Proyectos", "error de consulta"), "sin sesión", statusRow("Go", "error de comprobación")}},
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
	contains(t, m.View(), "Diagnóstico", "instalado · sano", "versión desconocida", "volver")
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
	m.selected = len(menu) - 1
	m, _ = key(m, "down")
	if m.selected != len(menu)-1 {
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

func TestStatusDependentActionsWait(t *testing.T) {
	for _, selection := range []int{0, 1, 2} {
		for _, state := range []string{"loading", "failed"} {
			t.Run(menu[selection]+"/"+state, func(t *testing.T) {
				m := loaded(t, healthyJSON)
				m.selected = selection
				m.loading = state == "loading"
				if state == "failed" {
					m.statusError = "No se pudo cargar el estado"
				}
				m, cmd := key(m, "enter")
				if m.page != "home" || cmd != nil {
					t.Fatal("action used unavailable or stale status")
				}
				if state == "loading" {
					contains(t, m.View(), "Cargando estado…")
				}
			})
		}
	}
}

func TestStatusRequestOrdering(t *testing.T) {
	m := loaded(t, healthyJSON)
	old := m.Init()()
	m, cmd := key(m, "r")
	latest := cmd()
	next, _ := m.Update(old)
	m = next.(model)
	if !m.loading {
		t.Fatal("old status response ended latest request")
	}
	next, _ = m.Update(latest)
	m = next.(model)
	if m.loading {
		t.Fatal("latest status response ignored")
	}
	next, _ = m.Update(commandResult{action: "status", data: []byte(`{}`)})
	if next.(model).statusError != "" {
		t.Fatal("late invalid response replaced valid status")
	}
}

func TestStatusOutputDegradation(t *testing.T) {
	for _, data := range []string{"not JSON", strings.Repeat(" ", outputLimit+1) + healthyJSON} {
		m := loaded(t, data)
		contains(t, m.View(), "No se pudo cargar el estado")
		if len(data) > outputLimit {
			contains(t, m.View(), "límite")
		}
		if len(strings.Split(m.View(), "\n")) > m.height {
			t.Fatal("status error broke layout")
		}
	}
}

func TestInterfaceDrainsOnTeardown(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	started, release, returned := make(chan struct{}), make(chan struct{}), make(chan struct{})
	defer close(release)
	go func() {
		runInterface(func([]string) execution {
			close(started)
			<-release
			return execution{stdout: []byte(healthyJSON)}
		}, true, tea.WithContext(ctx), tea.WithInput(nil), tea.WithOutput(io.Discard), tea.WithoutRenderer())
		close(returned)
	}()
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("injected runner did not start")
	}
	cancel()
	select {
	case <-returned:
		t.Fatal("interface returned with an outstanding child")
	case <-time.After(30 * time.Millisecond):
	}
	release <- struct{}{}
	select {
	case <-returned:
	case <-time.After(time.Second):
		t.Fatal("interface did not return after the child finished")
	}
}

func TestRunnerRejectsCommandsAfterDrain(t *testing.T) {
	calls := 0
	run, wait := drainingRunner(func([]string) execution { calls++; return execution{} })
	run([]string{"status"})
	wait()
	if result := run([]string{"rollback"}); result.err == nil || calls != 1 {
		t.Fatal("late command crossed the closed process boundary")
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
			contains(t, view, "Sistema")
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
