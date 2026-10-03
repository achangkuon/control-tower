package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"
)

func radarModel(t *testing.T) model {
	t.Helper()
	m := loaded(t, healthyJSON)
	m.status.Projects = json.RawMessage(`[{"projectRoot":"/proyecto con espacios","status":"healthy","towerState":"active"}]`)
	m.page = "projects"
	m = keys(m, "enter", "enter")
	if m.page != "radar-list" {
		t.Fatalf("active project did not open Radar: %s", m.View())
	}
	return m
}

func TestRadarCommandGuideAndLifecycleRouting(t *testing.T) {
	m := radarModel(t)
	want := []struct{ name, description string }{
		{"etapa", "Qué etapa permite la evidencia antes de actuar"},
		{"faltan", "Qué Sesiones faltan y el avance por área"},
		{"status", "Sesiones LISTO, en curso y compatibilidad"},
		{"sesion", "Contrato completo de una Sesión"},
		{"check", "Valida el plan"},
		{"zonas", "Qué archivos pertenecen a cada zona"},
		{"roadmap", "Alternativas LISTO y qué destrabarían"},
	}
	if len(radarCommands) != len(want) {
		t.Fatal("wrong read-only command count")
	}
	for i, command := range want {
		if radarCommands[i].name != command.name {
			t.Fatalf("command %d: %+v", i, radarCommands[i])
		}
		contains(t, m.View(), command.name, command.description)
	}
	for _, forbidden := range []string{"archivar", "marcar", "desmarcar", "render"} {
		if strings.Contains(m.View(), forbidden) {
			t.Fatalf("mutating command visible: %s", forbidden)
		}
	}
	wantList := `Comandos de Radar
/proyecto con espacios
Solo lectura.
> etapa [ID]
  Qué etapa permite la evidencia antes de actuar
  faltan
  Qué Sesiones faltan y el avance por área
  status
  Sesiones LISTO, en curso y compatibilidad
  sesion <ID>
  Contrato completo de una Sesión
  check
  Valida el plan
  zonas
  Qué archivos pertenecen a cada zona
  roadmap
  Alternativas LISTO y qué destrabarían
enter: ejecutar · esc: proyecto · ↑↓: elegir`
	if m.View() != wantList {
		t.Fatalf("command rendering changed:\n%s", m.View())
	}
	t.Log("Command list:\n" + m.View())
	output := keys(m, "down", "down", "down", "down")
	output.radarRun = func(string, []string) execution {
		return execution{code: 1, stdout: []byte("Plan revisado.\n"), stderr: []byte("Falta una zona.\n")}
	}
	output, cmd := key(output, "enter")
	output = finish(output, cmd)
	wantOutput := `Radar · check
/proyecto con espacios
Salida: código 1

Plan revisado.
Falta una zona.
esc: comandos · ↑↓/PgUp/PgDn: desplazar`
	if output.View() != wantOutput {
		t.Fatalf("output rendering changed:\n%s", output.View())
	}
	t.Log("Short output fixture:\n" + output.View())
	m = keys(m, "esc")
	if m.page != "projects" || !m.projectMenu {
		t.Fatal("lost project menu origin")
	}
	for i, action := range []string{"doctor", "uninstall", "cleanup"} {
		n := m
		n.projectAction = i + 1
		n = keys(n, "enter")
		if n.page != "wizard" || n.flow.action != action || n.flow.root != "/proyecto con espacios" {
			t.Fatalf("active project lifecycle shifted: %+v", n.flow)
		}
	}
}

func TestRadarSessionIDsAndOptionalStage(t *testing.T) {
	for _, command := range []string{"sesion", "etapa"} {
		for _, id := range []string{"", "S123", "S1.11", "S2.3.4", "S0", "S01", "S1.0", "s123", "S1.", " S123", "S123 ", "S1;render", "--help", "S1\n", "S1/2"} {
			t.Run(command+"/"+fmt.Sprintf("%q", id), func(t *testing.T) {
				m := radarModel(t)
				if command == "sesion" {
					m = keys(m, "down", "down", "down")
				}
				m, cmd := key(m, "enter")
				if cmd != nil || m.page != "radar-id" {
					t.Fatal("ID prompt ran prematurely")
				}
				if command == "etapa" {
					contains(t, m.View(), "enter sin ID")
				}
				m = keys(m, id)
				var got []string
				m.radarRun = func(root string, args []string) execution {
					if root != "/proyecto con espacios" {
						t.Fatal(root)
					}
					got = args
					return execution{stdout: []byte("Contrato\n")}
				}
				m, cmd = key(m, "enter")
				valid := id == "S123" || id == "S1.11" || id == "S2.3.4" || (command == "etapa" && id == "")
				if !valid {
					if cmd != nil || m.page != "radar-id" {
						t.Fatal("invalid ID reached executor")
					}
					contains(t, m.View(), "ID no válido", "S123", "S1.11")
					return
				}
				if cmd == nil {
					t.Fatal("no Radar execution")
				}
				m = finish(m, cmd)
				want := []string{command}
				if id != "" {
					want = append(want, id)
				}
				if !reflect.DeepEqual(got, want) {
					t.Fatalf("argv: %q", got)
				}
				contains(t, m.View(), "Contrato")
				m = keys(m, "esc")
				if m.page != "radar-list" {
					t.Fatal("output did not return to commands")
				}
			})
		}
	}
	m := radarModel(t)
	m = keys(m, "enter", "S12")
	next, _ := m.Update(tea.KeyMsg{Type: tea.KeyBackspace})
	m = next.(model)
	if m.radar.id != "S1" {
		t.Fatal("backspace did not edit ID")
	}
	m = keys(m, "esc", "enter")
	if m.radar.id != "" {
		t.Fatal("ID leaked into next prompt")
	}
}

func TestRadarFocusOnSmallTerminals(t *testing.T) {
	for _, size := range []tea.WindowSizeMsg{{Width: 12, Height: 2}, {Width: 28, Height: 3}, {Width: 12, Height: 1}} {
		t.Run(fmt.Sprintf("%dx%d", size.Width, size.Height), func(t *testing.T) {
			m := loaded(t, healthyJSON)
			next, _ := m.Update(size)
			m = next.(model).openRadar("/un/proyecto/con/una/ruta/muy/larga")
			contains(t, m.View(), "> etapa [ID]")
			for i := 0; i < len(radarCommands); i++ {
				contains(t, m.View(), "> "+radarCommands[m.radar.selected].name)
				next, _ = m.Update(tea.KeyMsg{Type: tea.KeyPgDown})
				m = next.(model)
				contains(t, m.View(), "> "+radarCommands[m.radar.selected].name)
				m = keys(m, "down")
			}
			m = keys(m, "esc")
			m = m.openRadar("/un/proyecto/con/una/ruta/muy/larga")
			m = keys(m, "enter")
			contains(t, m.View(), "> ")
			m = keys(m, "S123456789123456789")
			contains(t, m.View(), "789")
		})
	}
	for _, command := range []string{"etapa", "sesion"} {
		t.Run(command+"/edit-and-resize", func(t *testing.T) {
			m := radarModel(t)
			if command == "sesion" {
				m = keys(m, "down", "down", "down")
			}
			m = keys(m, "enter", "S12")
			next, _ := m.Update(tea.WindowSizeMsg{Width: 12, Height: 2})
			m = next.(model)
			contains(t, m.View(), "> S12")
			m = keys(m, "!", "enter")
			contains(t, m.View(), "> S12!")
			next, _ = m.Update(tea.KeyMsg{Type: tea.KeyBackspace})
			m = next.(model)
			contains(t, m.View(), "> S12")
			m = keys(m, "esc")
			contains(t, m.View(), "> "+command)
		})
	}
}

func fakeRadarHome(t *testing.T) (string, string) {
	t.Helper()
	home := t.TempDir()
	binary := filepath.Join(home, ".local", "bin", "radar")
	if err := os.MkdirAll(filepath.Dir(binary), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(binary, []byte("fake radar"), 0755); err != nil {
		t.Fatal(err)
	}
	return home, binary
}

func TestRadarRunnerAdmissionAndProcessBoundary(t *testing.T) {
	home, binary := fakeRadarHome(t)
	root := t.TempDir()
	calls := 0
	executor := func(ctx context.Context, path string, args []string, cwd string, output io.Writer) (int, error) {
		calls++
		if path != binary || cwd != root {
			t.Fatalf("binary/cwd: %q %q", path, cwd)
		}
		deadline, ok := ctx.Deadline()
		if !ok || time.Until(deadline) > 30*time.Second || time.Until(deadline) < 29*time.Second {
			t.Fatal("missing 30-second timeout")
		}
		if !reflect.DeepEqual(args, []string{"sesion", "S1.11"}) {
			t.Fatalf("argv changed: %q", args)
		}
		_, _ = io.WriteString(output, "stdout\nstderr\n")
		return 7, errors.New("exit status 7")
	}
	run := radarRunner(home, executor)
	result := run(root, []string{"sesion", "S1.11"})
	if result.code != 7 || result.err == nil || string(result.stdout) != "stdout\nstderr\n" {
		t.Fatalf("lost process result: %+v", result)
	}
	for _, args := range [][]string{
		nil, {"archivar", "S123"}, {"marcar", "S123"}, {"desmarcar", "S123"}, {"render"},
		{"check", "--help"}, {"status", "--all"}, {"faltan", "S123"}, {"sesion"}, {"sesion", "S0"},
		{"etapa", "S123", "render"}, {"sesion", "S123; echo nope"}, {"sh", "-c", "radar check"},
	} {
		if result := run(root, args); result.err == nil {
			t.Fatalf("unsafe argv accepted: %q", args)
		}
	}
	if calls != 1 {
		t.Fatal("mutating/malformed command reached executor")
	}
	m := radarModel(t)
	m.page, m.radar.command, m.radar.id = "radar-id", "archivar", "S123"
	m.radarRun = func(string, []string) execution {
		t.Fatal("UI bypassed whitelist")
		return execution{}
	}
	_, cmd := key(m, "enter")
	if cmd != nil {
		t.Fatal("forged mutating command runnable")
	}
}

func TestRadarRunnerMissingBinaryCapAndTimeout(t *testing.T) {
	run := radarRunner(t.TempDir(), func(context.Context, string, []string, string, io.Writer) (int, error) {
		t.Fatal("missing binary reached executor")
		return 0, nil
	})
	result := run(t.TempDir(), []string{"check"})
	m := radarModel(t)
	m.radarRun = func(string, []string) execution { return result }
	m = keys(m, "down", "down", "down", "down")
	m, cmd := key(m, "enter")
	m = finish(m, cmd)
	contains(t, m.View(), "Instalar o actualizar", "Radar no está instalado")
	home, _ := fakeRadarHome(t)
	run = radarRunner(home, func(_ context.Context, _ string, _ []string, _ string, out io.Writer) (int, error) {
		for i := 0; i < 3; i++ {
			_, _ = io.WriteString(out, strings.Repeat("x", outputLimit))
		}
		return 0, nil
	})
	result = run(t.TempDir(), []string{"status"})
	if len(result.stdout)+len(result.stderr) > outputLimit || result.err == nil || result.code == 0 {
		t.Fatalf("output cap not enforced: %d, %+v", len(result.stdout), result.err)
	}
	contains(t, result.err.Error(), "64 KiB")
	run = radarRunner(home, func(context.Context, string, []string, string, io.Writer) (int, error) {
		return -1, context.DeadlineExceeded
	})
	contains(t, run(t.TempDir(), []string{"check"}).err.Error(), "tiempo", "30")
}

func TestRadarOutputScrollReturnAndNarrowTerminal(t *testing.T) {
	m := radarModel(t)
	calls := 0
	m.radarRun = func(string, []string) execution {
		calls++
		return execution{code: 2, stdout: []byte("Primera línea\n\x1b[31mSegunda línea\x1b[0m\n" + strings.Repeat("Otra línea larga de Radar\n", 25)), stderr: []byte("Error del plan\n")}
	}
	m = keys(m, "down")
	m, cmd := key(m, "enter")
	if cmd == nil {
		t.Fatal("read-only selection did not run")
	}
	// Keep the child attached until its bounded execution completes.
	m = keys(m, "esc", "q")
	if m.page != "radar-output" {
		t.Fatal("left running command")
	}
	m = finish(m, cmd)
	contains(t, m.View(), "código 2", "Primera línea", "Segunda línea", "Error del plan")
	if strings.Contains(m.View(), "\x1b") {
		t.Fatal("terminal control escaped sanitizer")
	}
	t.Log("Output view:\n" + m.View())
	m.height = 7
	next, _ := m.Update(tea.KeyMsg{Type: tea.KeyPgDown})
	m = next.(model)
	if m.offset != 6 {
		t.Fatalf("page down offset: %d", m.offset)
	}
	m = keys(m, "down")
	if m.offset != 7 {
		t.Fatal("down did not scroll")
	}
	next, _ = m.Update(tea.KeyMsg{Type: tea.KeyPgUp})
	m = next.(model)
	if m.offset != 1 {
		t.Fatal("page up did not scroll")
	}
	m = keys(m, "up")
	if m.offset != 0 {
		t.Fatal("up did not scroll")
	}
	for i := 0; i < 100; i++ {
		m = keys(m, "down")
	}
	if m.offset != m.maxOffset() {
		t.Fatal("unbounded output scroll")
	}
	m = keys(m, "esc")
	if m.page != "radar-list" || m.radar.selected != 1 || !strings.Contains(m.View(), "> faltan") {
		t.Fatal("did not return to same visible command")
	}
	m, cmd = key(m, "enter")
	m = finish(m, cmd)
	if calls != 2 {
		t.Fatal("cannot run another command")
	}
	for _, page := range []string{"radar-list", "radar-id", "radar-output"} {
		m.page = page
		for _, size := range []tea.WindowSizeMsg{{Width: 28, Height: 9}, {Width: 10, Height: 3}, {Width: 1, Height: 1}} {
			next, _ = m.Update(size)
			m = next.(model)
			for i := 0; i < 10; i++ {
				m = keys(m, "down")
			}
			view := m.View()
			if len(strings.Split(view, "\n")) > size.Height {
				t.Fatal("height overflow")
			}
			for _, line := range strings.Split(view, "\n") {
				if ansi.StringWidth(line) > size.Width {
					t.Fatal("width overflow")
				}
			}
		}
	}
	m.width, m.height, m.page, m.radar.selected = 28, 9, "radar-list", 0
	for i := 0; i < 6; i++ {
		m = keys(m, "down")
	}
	contains(t, m.View(), "> roadmap", "Alternativas LISTO", "destrabarían")
}

func TestRadarRunningAndStaleResults(t *testing.T) {
	m := radarModel(t)
	m = keys(m, "down")
	m.radarRun = func(string, []string) execution {
		return execution{stdout: []byte("Salida actual")}
	}
	m, cmd := key(m, "enter")
	if !m.operationRunning() {
		t.Fatal("running Radar is not protected by the program quit filter")
	}
	for _, keyMsg := range []tea.KeyMsg{{Type: tea.KeyCtrlC}, {Type: tea.KeyEsc}, {Type: tea.KeyRunes, Runes: []rune{'q'}}} {
		next, quit := m.Update(keyMsg)
		m = next.(model)
		if quit != nil || m.page != "radar-output" {
			t.Fatal("running process can detach")
		}
	}
	next, _ := m.Update(radarResult{id: m.sequence - 1, result: execution{stdout: []byte("Salida vieja")}})
	m = next.(model)
	if !m.radar.running {
		t.Fatal("stale result completed current command")
	}
	m = finish(m, cmd)
	if m.operationRunning() {
		t.Fatal("completed Radar still prevents exit")
	}
	m = keys(m, "esc")
	next, _ = m.Update(radarResult{id: m.sequence, result: execution{stdout: []byte("Duplicado")}})
	m = next.(model)
	if m.page != "radar-list" || strings.Contains(m.View(), "Duplicado") {
		t.Fatal("late output replaced command list")
	}
}

// The test executable doubles as a fake installed Radar, without a shell or real HOME.
func TestMain(m *testing.M) {
	switch os.Getenv("TOWER_FAKE_RADAR") {
	case "hang":
		time.Sleep(time.Second)
		os.Exit(0)
	case "cap":
		_, _ = io.WriteString(os.Stdout, strings.Repeat("x", outputLimit))
		_, _ = io.WriteString(os.Stderr, strings.Repeat("y", outputLimit))
		os.Exit(0)
	case "1":
		cwd, _ := os.Getwd()
		fmt.Printf("cwd=%s\nargv=%s\n", cwd, strings.Join(os.Args[1:], "|"))
		fmt.Fprintln(os.Stderr, "fake stderr")
		os.Exit(3)
	}
	os.Exit(m.Run())
}

func TestRadarNativeExecutorUsesInstalledBinary(t *testing.T) {
	home, binary := fakeRadarHome(t)
	executable, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(executable)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(binary, data, 0755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HOME", home)
	t.Setenv("TOWER_FAKE_RADAR", "1")
	root := t.TempDir()
	result := installedRadarRunner(root, []string{"sesion", "S1.11"})
	if result.code != 3 {
		t.Fatalf("exit code: %+v", result)
	}
	contains(t, string(result.stdout), "cwd="+root, "argv=sesion|S1.11", "fake stderr")
	t.Setenv("TOWER_FAKE_RADAR", "cap")
	result = installedRadarRunner(root, []string{"status"})
	if len(result.stdout) != outputLimit || result.err == nil || result.code == 0 {
		t.Fatal("native stdout/stderr escaped shared output cap")
	}
	t.Setenv("TOWER_FAKE_RADAR", "hang")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	start := time.Now()
	code, err := executeRadar(ctx, binary, []string{"check"}, root, io.Discard)
	if ctx.Err() != context.DeadlineExceeded || err == nil || code == 0 || time.Since(start) > 500*time.Millisecond {
		t.Fatalf("native executor ignored cancellation: %d %v", code, err)
	}
}

func TestRadarReadOnlyShapesReachExecutor(t *testing.T) {
	home, _ := fakeRadarHome(t)
	for _, args := range [][]string{{"etapa"}, {"etapa", "S123"}, {"faltan"}, {"status"}, {"sesion", "S1.11"}, {"check"}, {"zonas"}, {"roadmap"}} {
		t.Run(strings.Join(args, "/"), func(t *testing.T) {
			called := false
			run := radarRunner(home, func(_ context.Context, _ string, got []string, _ string, _ io.Writer) (int, error) {
				called = true
				if !reflect.DeepEqual(got, args) {
					t.Fatalf("argv mismatch: %q", got)
				}
				return 0, nil
			})
			if result := run(t.TempDir(), args); result.err != nil || !called {
				t.Fatalf("read-only command refused: %q %v", args, result.err)
			}
		})
	}
}
