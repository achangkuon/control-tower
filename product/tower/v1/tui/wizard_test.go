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
func TestReleaseWizard(t *testing.T) {
	for _, action := range []string{"install", "update"} {
		t.Run(action, func(t *testing.T) {
			m, calls := actionModel(t, action == "update")
			m = keys(m, "enter", "enter", "v9.9.9", "enter")
			contains(t, m.View(), "tower-v1.json")
			m = keys(m, "enter")
			if m.flow.sha != "" {
				t.Fatal("SHA prefilled")
			}
			m = keys(m, "abc", "enter")
			contains(t, m.View(), "64", "minúsculas", "canal distinto de GitHub")
			m = keys(m, "esc")
			contains(t, m.View(), "tower-v1.json")
			m = keys(m, "enter")
			if m.flow.sha != "abc" {
				t.Fatal("Esc lost SHA")
			}
			next, _ := m.Update(tea.KeyMsg{Type: tea.KeyCtrlU})
			m = next.(model)
			m = keys(m, strings.Repeat("a", 64), "enter")
			contains(t, m.View(), "Revisión", action, "v9.9.9")
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
			contains(t, m.View(), "newvers", "oldvers", "Volver al inicio")
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
	contains(t, m.View(), "Go", "Instalá")
	if m.flow.step != 0 {
		t.Fatal("missing prerequisite passed")
	}
	m = keys(m, "esc")
	m.status.Prerequisites["go"] = prerequisite{Present: true, Version: "1.26"}
	m = keys(m, "enter", "enter")
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
	contains(t, m.View(), "1234567", "abcdef1", "ROLLBACK")
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

func TestClosedArguments(t *testing.T) {
	for _, args := range [][]string{{"status"}, {"doctor"}, {"rollback"}, {"install", "--tag", "v1", "--asset", "tower-v1.json", "--sha256", strings.Repeat("a", 64)}, {"update", "--tag", "v1", "--asset", "a", "--sha256", strings.Repeat("a", 64)}, {"project", "init", "--project", "/path with spaces", "--trust", "trusted"}, {"project", "doctor", "--project", "/p"}, {"project", "uninstall", "--project", "/p"}, {"project", "cleanup", "--project", "/p"}} {
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
