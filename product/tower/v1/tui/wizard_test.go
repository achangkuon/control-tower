package main

import (
	"reflect"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

func actionModel(t *testing.T, installed bool) (model, *[][]string) {
	t.Helper()
	m := loaded(t, healthyJSON)
	m.status.Engine.Installed = installed
	calls := new([][]string)
	m.run = func(args []string) execution {
		*calls = append(*calls, append([]string(nil), args...))
		if args[0] == "status" {
			return execution{stdout: []byte(healthyJSON)}
		}
		if len(args) == 1 && args[0] == "doctor" {
			return execution{stdout: []byte(`{"status":"healthy","active":"newversion"}`)}
		}
		return execution{stdout: []byte(`{"status":"activated","active":"newversion","previous":"oldversion"}`)}
	}
	return m, calls
}
func keys(m model, values ...string) model {
	for _, value := range values {
		m, _ = key(m, value)
	}
	return m
}
func finish(m model, cmd tea.Cmd) model {
	msg := cmd()
	if batch, ok := msg.(tea.BatchMsg); ok {
		msg = batch[0]()
	}
	next, _ := m.Update(msg)
	return next.(model)
}
func TestLatestDefault(t *testing.T) {
	for _, installed := range []bool{false, true} {
		t.Run(map[bool]string{false: "install", true: "update"}[installed], func(t *testing.T) {
			m, calls := actionModel(t, installed)
			contains(t, m.View(), "avanzado")
			m.run = func(args []string) execution {
				*calls = append(*calls, args)
				return execution{stdout: []byte(`{"status":"up-to-date","tag":"v1.2.3"}`)}
			}
			m, cmd := key(m, "enter")
			if cmd == nil || m.flow.step != 5 {
				t.Fatal("default asked a question instead of starting latest")
			}
			contains(t, m.View(), "…", "0 s")
			m = finish(m, cmd)
			want := [][]string{{map[bool]string{false: "install", true: "update"}[installed], "--latest"}}
			if !reflect.DeepEqual(*calls, want) {
				t.Fatalf("argv: %v", *calls)
			}
			contains(t, m.View(), "Todas las configuraciones al día")
		})
	}
	if lines := resultLines(execution{stdout: []byte(`{"status":"up-to-date","tag":"v1.2.3"}`)}); !reflect.DeepEqual(lines, []string{"Todas las configuraciones al día"}) {
		t.Fatalf("up-to-date message: %v", lines)
	}
	lines := strings.Join(resultLines(execution{stdout: []byte(`{"status":"activated","tag":"v9.9.9","active":"abc"}`)}), "\n")
	contains(t, lines, "v9.9.9")
}

func TestUpdatedInterfaceReopenMessage(t *testing.T) {
	for _, status := range []string{"activated", "up-to-date"} {
		t.Run(status, func(t *testing.T) {
			lines := strings.Join(resultLines(execution{stdout: []byte(`{"status":"` + status + `","tui":"updated"}`)}), "\n")
			contains(t, lines, "Volvé a abrir torre-control para ver la nueva interfaz")
		})
	}
	for _, r := range []execution{
		{stdout: []byte(`{"status":"activated","tui":"unchanged"}`)},
		{stdout: []byte(`{"status":"activated","tui":"unavailable:assets"}`)},
		{code: 1, stdout: []byte(`{"status":"activated","tui":"updated"}`)},
	} {
		if strings.Contains(strings.Join(resultLines(r), "\n"), "Volvé a abrir") {
			t.Fatal("reopen message without a successful interface update")
		}
	}
}

func TestReleaseWizard(t *testing.T) {
	for _, action := range []string{"install", "update"} {
		t.Run(action, func(t *testing.T) {
			m, calls := actionModel(t, action == "update")
			m = keys(m, "a", "enter", "v9.9.9", "enter")
			contains(t, m.View(), "tower-v1.json")
			m = keys(m, "enter")
			if m.flow.sha != "" {
				t.Fatal("SHA prefilled")
			}
			m = keys(m, "abc", "enter")
			contains(t, m.View(), "64", "minúsculas", "Solicite este código a quien mantiene la Torre por un canal distinto de GitHub.")
			m = keys(m, "esc")
			contains(t, m.View(), "tower-v1.json")
			m = keys(m, "enter")
			if m.flow.sha != "abc" {
				t.Fatal("Esc lost SHA")
			}
			next, _ := m.Update(tea.KeyMsg{Type: tea.KeyCtrlU})
			m = next.(model)
			m = keys(m, strings.Repeat("a", 64), "enter")
			contains(t, m.View(), "Revisión", map[string]string{"install": "instalar", "update": "actualizar"}[action], "v9.9.9")
			if action == "update" {
				m = keys(m, "WRONG", "enter")
				if len(*calls) != 0 {
					t.Fatal("wrong confirmation ran command")
				}
				next, _ = m.Update(tea.KeyMsg{Type: tea.KeyCtrlU})
				m = next.(model)
				m = keys(m, "UPDATE")
			}
			m, cmd := key(m, "enter")
			contains(t, m.View(), "…", "0 s")
			m = finish(m, cmd)
			want := []string{action, "--tag", "v9.9.9", "--asset", "tower-v1.json", "--sha256", strings.Repeat("a", 64)}
			if !reflect.DeepEqual(*calls, [][]string{want}) {
				t.Fatalf("argv: %v", *calls)
			}
			contains(t, m.View(), "Activa: versión desconocida", "Anterior: versión desconocida", "Volver al inicio")
			m, cmd = key(m, "enter")
			m = finish(m, cmd)
			if m.page != "home" || (*calls)[1][0] != "status" {
				t.Fatal("no refresh")
			}
		})
	}
}
func TestWizardValidationAndInput(t *testing.T) {
	m, calls := actionModel(t, false)
	m.status.Prerequisites["go"] = prerequisite{}
	m = keys(m, "enter", "enter")
	contains(t, m.View(), "Go", "Instale")
	if m.flow.step != 0 {
		t.Fatal("missing prerequisite passed")
	}
	m = keys(m, "esc")
	m.status.Prerequisites["go"] = prerequisite{Present: true, Version: "1.26"}
	m = keys(m, "a", "enter")
	for _, value := range []string{"", "latest", "two tags"} {
		m.flow.tag = value
		m = keys(m, "enter")
		if m.flow.step != 1 {
			t.Fatalf("invalid tag %q accepted", value)
		}
	}
	m.flow.tag = ""
	m = keys(m, "qñ\r\n")
	if m.flow.tag != "qñ" || m.flow.step != 1 {
		t.Fatal("paste submitted or q quit")
	}
	next, _ := m.Update(tea.KeyMsg{Type: tea.KeyBackspace})
	m = next.(model)
	if m.flow.tag != "q" {
		t.Fatal("rune backspace")
	}
	m = keys(m, "\x1b[31m")
	if m.flow.tag != "q" {
		t.Fatal("control sequence entered")
	}
	if len(*calls) != 0 {
		t.Fatal("validation ran command")
	}
	for _, sha := range []string{"", "ABC", strings.Repeat("A", 64), strings.Repeat("g", 64)} {
		if validSHA(sha) {
			t.Fatalf("invalid SHA %q", sha)
		}
	}
}
func TestRollbackWizard(t *testing.T) {
	m, calls := actionModel(t, true)
	m.selected = 1
	m = keys(m, "enter", "WRONG", "enter")
	contains(t, m.View(), "versión desconocida → versión desconocida", "ROLLBACK")
	if len(*calls) != 0 {
		t.Fatal("unconfirmed rollback")
	}
	m.flow.confirm = "ROLLBACK"
	m, cmd := key(m, "enter")
	m = finish(m, cmd)
	if !reflect.DeepEqual(*calls, [][]string{{"rollback"}}) {
		t.Fatal(*calls)
	}
	m, _ = actionModel(t, true)
	m.status.Engine.Previous = ""
	m.selected = 1
	m = keys(m, "enter")
	contains(t, m.View(), "No hay una versión anterior")
}
func TestActionErrors(t *testing.T) {
	for _, tt := range []struct{ raw, want string }{
		{"Release SHA-256 mismatch", "no coincide"}, {"gh not authenticated", "gh auth login"}, {"GitHub Release command failed", "gh auth login"},
		{"unknown launcher", "se conservó"}, {"group- or world-writable; run: chmod 755 /ruta", "chmod 755 /ruta"},
		{"other failure", "No se pudo completar"},
	} {
		t.Run(tt.raw, func(t *testing.T) {
			m, _ := actionModel(t, true)
			m.selected = 1
			m = keys(m, "enter")
			m.flow.confirm = "ROLLBACK"
			m.run = func([]string) execution {
				return execution{code: 1, stderr: []byte("Invalid Tower CLI: " + tt.raw + "\n{\"type\":\"tower.cli.recovery/1\",\"errors\":[\"retained evidence\"]}\n")}
			}
			m, cmd := key(m, "enter")
			m = finish(m, cmd)
			contains(t, m.View(), tt.want, tt.raw, "retained evidence")
		})
	}
}
func TestOperationFailurePaths(t *testing.T) {
	for _, action := range []string{"install", "update", "rollback", "doctor", "uninstall", "cleanup", "init"} {
		t.Run(action, func(t *testing.T) {
			m, calls := actionModel(t, true)
			m.page = "wizard"
			m.flow = workflow{action: action, step: 4, tag: "v1", asset: "a.json", sha: strings.Repeat("a", 64)}
			if action != "install" && action != "update" && action != "rollback" {
				m.flow.root = "/proyecto"
			}
			m.flow.confirm = m.confirmation()
			m.run = func(args []string) execution {
				*calls = append(*calls, args)
				return execution{code: 1, stderr: []byte("Invalid Tower CLI: simulated failure\n")}
			}
			m, cmd := key(m, "enter")
			m = finish(m, cmd)
			contains(t, m.View(), "No se pudo completar", "simulated failure", "Volver al inicio")
			if len(*calls) != 1 {
				t.Fatal("action did not run exactly once")
			}
			m, cmd = key(m, "esc")
			m = finish(m, cmd)
			if m.page != "home" || (*calls)[1][0] != "status" {
				t.Fatal("failure did not refresh")
			}
		})
	}
	if commandTimeout([]string{"install"}) != 5*time.Minute || commandTimeout([]string{"status"}) != 30*time.Second {
		t.Fatal("unexpected command deadlines")
	}
	if result := cliRunner("must-not-run")([]string{"list"}); result.err == nil {
		t.Fatal("adapter accepted forbidden argv")
	}
}

func TestOperationQuitWaitsAndRefreshes(t *testing.T) {
	for _, exitKey := range []string{"q", "ctrl+c", "esc"} {
		t.Run(exitKey, func(t *testing.T) {
			m, calls := actionModel(t, true)
			m.page, m.flow = "wizard", workflow{action: "rollback", step: 4, confirm: "ROLLBACK"}
			m, operation := key(m, "enter")
			m, cmd := key(m, exitKey)
			if cmd != nil {
				t.Fatal("quit detached a running operation")
			}
			contains(t, m.View(), "Hay una operación en curso", "enter", "esc")
			m, _ = key(m, "esc")
			m, _ = key(m, exitKey)
			m, cmd = key(m, "enter")
			if cmd != nil {
				t.Fatal("confirmation quit before child completion")
			}
			contains(t, m.View(), "Esperando", "sin interrumpir")
			batch := operation().(tea.BatchMsg)
			next, refresh := m.Update(batch[0]())
			m = next.(model)
			if refresh == nil || !m.loading || m.flow.step != 6 {
				t.Fatal("completion did not reload status")
			}
			if refresh().(commandResult).action != "status" || len(*calls) != 2 {
				t.Fatal("unexpected completion refresh")
			}
			contains(t, m.View(), "Operación completada")
			_, cmd = key(m, "q")
			if cmd == nil {
				t.Fatal("completed operation prevented exit")
			}
			if _, ok := cmd().(tea.QuitMsg); !ok {
				t.Fatal("completed operation did not quit")
			}
		})
	}
}

func TestPartialSuccessAndRecovery(t *testing.T) {
	for _, localStatus := range []string{"success", "installed", "uninstalled", "cleaned", "failed"} {
		t.Run(localStatus, func(t *testing.T) {
			registryJSON := `,"registry":{"status":"failed"}`
			if localStatus == "success" {
				registryJSON = ""
			}
			r := execution{code: 1, stdout: []byte(`{"localResult":{"status":"` + localStatus + `"}` + registryJSON + `}`), stderr: []byte("local operation succeeded but registry publication failed: denied\n{\"type\":\"tower.cli.recovery/1\",\"errors\":[\"retained evidence\"],\"omitted\":2}\n")}
			view := strings.Join(resultLines(r), "\n")
			if localStatus == "failed" {
				contains(t, view, "No se pudo completar")
			} else {
				contains(t, view, "se completó", "Advertencia", "lista de proyectos")
				if strings.Contains(view, "No se pudo completar") {
					t.Fatal("local success presented as total failure")
				}
			}
			contains(t, view, "denied", "evidencia de recuperación", "retained evidence", "omitidos: 2")
		})
	}
}

func TestClosedArguments(t *testing.T) {
	for _, args := range [][]string{{"status"}, {"doctor"}, {"rollback"}, {"install", "--latest"}, {"update", "--latest"}, {"install", "--tag", "v1", "--asset", "tower-v1.json", "--sha256", strings.Repeat("a", 64)}, {"update", "--tag", "v1", "--asset", "a", "--sha256", strings.Repeat("a", 64)}, {"project", "init", "--project", "/path with spaces", "--trust", "trusted"}, {"project", "doctor", "--project", "/p"}, {"project", "uninstall", "--project", "/p"}, {"project", "cleanup", "--project", "/p"}} {
		if !allowedArgs(args) {
			t.Fatal("rejected", args)
		}
	}
	for _, args := range [][]string{nil, {"list"}, {"status", "--state", "/p"}, {"rollback", "extra"}, {"project", "init", "--project", "/p", "--trust", "untrusted"}, {"project", "doctor", "--project", "relative"}, {"install", "--tag", "latest", "--asset", "a", "--sha256", "abc"}, {"project", "cleanup", "--project", "/p", "--registry", "/r"}} {
		if allowedArgs(args) {
			t.Fatal("allowed", args)
		}
	}
	b := boundedOutput{}
	b.Write([]byte(strings.Repeat("a", outputLimit+1)))
	if len(b.data) != outputLimit || !b.truncated {
		t.Fatal("unbounded output")
	}
}
