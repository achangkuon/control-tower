package main

import (
	"reflect"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestProjectActions(t *testing.T) {
	for i, action := range []string{"doctor", "uninstall", "cleanup"} {
		t.Run(action, func(t *testing.T) {
			m, calls := actionModel(t, true)
			m.selected = 2
			m = keys(m, "enter")
			contains(t, m.View(), "/proyecto", "sano", "Adoptar un proyecto nuevo")
			m = keys(m, "enter")
			for n := 0; n < i; n++ {
				m = keys(m, "down")
			}
			m = keys(m, "enter")
			if action != "doctor" {
				m = keys(m, "WRONG", "enter")
				if len(*calls) != 0 {
					t.Fatal("confirmation bypass")
				}
			}
			if action == "cleanup" {
				contains(t, m.View(), "operación interrumpida")
			}
			m.flow.confirm = map[string]string{"uninstall": "UNINSTALL", "cleanup": "CLEANUP"}[action]
			m, cmd := key(m, "enter")
			m = finish(m, cmd)
			if !reflect.DeepEqual(*calls, [][]string{{"project", action, "--project", "/proyecto"}}) {
				t.Fatal(*calls)
			}
			m, cmd = key(m, "esc")
			m = finish(m, cmd)
			if m.page != "home" || (*calls)[1][0] != "status" {
				t.Fatal("no refresh")
			}
		})
	}
}
func TestAdoptProject(t *testing.T) {
	m, calls := actionModel(t, true)
	m.selected = 2
	m = keys(m, "enter", "down", "enter")
	for _, path := range []string{"", "relative"} {
		m.flow.root = path
		m = keys(m, "enter")
		contains(t, m.View(), "ruta absoluta")
		if m.flow.step != 1 {
			t.Fatal("invalid path advanced")
		}
	}
	m.flow.root = "/nuevo proyecto"
	m = keys(m, "enter")
	contains(t, m.View(), ".claude/skills/control-tower", ".agents/skills/control-tower", ".control-tower/", ".control-tower-adoption-v1/", "confiar", "confianza")
	m = keys(m, "trusted", "enter")
	if len(*calls) != 0 {
		t.Fatal("wrong trust accepted")
	}
	m = keys(m, "esc")
	if m.flow.root != "/nuevo proyecto" {
		t.Fatal("lost path")
	}
	m = keys(m, "enter")
	m.flow.confirm = "confiar"
	m.run = func(args []string) execution {
		*calls = append(*calls, args)
		return execution{code: 1, stdout: []byte(`{"localResult":{"status":"installed"},"registry":{"status":"failed"}}`), stderr: []byte("Invalid Tower CLI: local operation succeeded but registry publication failed: denied\n")}
	}
	m, cmd := key(m, "enter")
	m = finish(m, cmd)
	if !reflect.DeepEqual(*calls, [][]string{{"project", "init", "--project", "/nuevo proyecto", "--trust", "trusted"}}) {
		t.Fatal(*calls)
	}
	contains(t, m.View(), "La operación en el proyecto se completó, pero no se pudo actualizar la lista de proyectos", "denied")
}
func TestStaleDiagnosticAndScroll(t *testing.T) {
	m, _ := actionModel(t, true)
	m.selected = 3
	m, old := key(m, "enter")
	m = keys(m, "esc")
	m, newer := key(m, "enter")
	next, _ := m.Update(old())
	m = next.(model)
	if !m.diagnosing {
		t.Fatal("stale result accepted")
	}
	m = finish(m, newer)
	m.page = "help"
	m.height = 6
	for i := 0; i < 100; i++ {
		m = keys(m, "down")
	}
	if m.offset > len(m.pageLines()) {
		t.Fatal("unbounded offset")
	}
	next, _ = m.Update(tea.WindowSizeMsg{Width: 30, Height: 100})
	m = next.(model)
	if m.offset != 0 {
		t.Fatal("resize retained invalid offset")
	}
	for _, h := range []int{1, 2, 3} {
		next, _ = m.Update(tea.WindowSizeMsg{Width: 10, Height: h})
		m = next.(model)
		if len(strings.Split(m.View(), "\n")) > h {
			t.Fatal("height overflow")
		}
	}
}
