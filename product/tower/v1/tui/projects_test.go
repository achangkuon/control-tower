package main

import (
	"encoding/json"
	"reflect"
	"slices"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestS222InvalidPermissionsOfferFixCommand(t *testing.T) {
	m := loaded(t, healthyJSON)
	m.status.Projects = json.RawMessage(`[{"projectRoot":"/proyecto","status":"invalid","permissionError":true}]`)
	m.page = "projects"
	contains(t, m.View(), "inválido")
	m = keys(m, "enter")
	contains(t, m.View(), "Corregir permisos", "Revisar", "Desinstalar", "Limpiar residuos")
	m, cmd := key(m, "enter")
	if cmd != nil {
		t.Fatal("permissions action must be informational and execute nothing")
	}
	if m.page != "project-permissions" {
		t.Fatalf("page = %s", m.page)
	}
	contains(t, m.View(), "Corregir permisos", "checkout de Git",
		"torre-control project doctor --project /proyecto --fix-permissions")
	m = keys(m, "esc")
	if m.page != "home" {
		t.Fatalf("esc left page %s", m.page)
	}
}

func TestS222PermissionsActionOnlyForInvalidPermissionErrors(t *testing.T) {
	for _, tt := range []struct {
		name    string
		project string
		want    bool
	}{
		{"invalid with permission error", `{"projectRoot":"/proyecto","status":"invalid","permissionError":true}`, true},
		{"invalid without permission error", `{"projectRoot":"/proyecto","status":"invalid"}`, false},
		{"healthy with permission flag", `{"projectRoot":"/proyecto","status":"healthy","permissionError":true}`, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			m := loaded(t, healthyJSON)
			m.status.Projects = json.RawMessage(`[` + tt.project + `]`)
			m.page = "projects"
			m = keys(m, "enter")
			contains(t, m.View(), "Revisar")
			if got := strings.Contains(m.View(), "Corregir permisos"); got != tt.want {
				t.Fatalf("Corregir permisos: got %v want %v\n%s", got, tt.want, m.View())
			}
		})
	}
}

func TestS208OutdatedProjectOffersUpdateNotRadar(t *testing.T) {
	m := loaded(t, healthyJSON)
	m.width = 120
	m.status.Projects = json.RawMessage(`[{"projectRoot":"/proyecto","status":"outdated","towerState":"active"}]`)
	m.page = "projects"
	contains(t, m.View(), "🟠 Desactualizado — actualizá la Torre")
	m = keys(m, "enter")
	contains(t, m.View(), "Actualizar la Torre")
	if strings.Contains(m.View(), "Comandos de Radar") {
		t.Fatal("outdated project offered Radar")
	}
	m = keys(m, "enter")
	contains(t, m.View(), "Instalar o actualizar", "torre-control project update --project")
}

func TestProjectActions(t *testing.T) {
	for i, action := range []string{"doctor", "uninstall", "cleanup"} {
		t.Run(action, func(t *testing.T) {
			m, calls := actionModel(t, true)
			m.selected = 2
			m = keys(m, "enter")
			contains(t, m.View(), "/proyecto", "sano", "Sumar un proyecto")
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
func TestRadarActionOnlyForActiveProjects(t *testing.T) {
	for _, tt := range []struct{ status, state string }{
		{"healthy", "active"}, {"healthy", "needs-plan"}, {"unadopted", "skills-only"},
		{"missing", "active"}, {"unsafe", "active"}, {"healthy", ""},
	} {
		t.Run(tt.status+"-"+tt.state, func(t *testing.T) {
			m := loaded(t, healthyJSON)
			m.status.Projects = json.RawMessage(`[{"projectRoot":"/proyecto","status":"` + tt.status + `","towerState":"` + tt.state + `"}]`)
			m.page = "projects"
			m = keys(m, "enter")
			want := tt.status == "healthy" && tt.state == "active"
			if strings.Contains(m.View(), "Comandos de Radar") != want {
				t.Fatalf("Radar action availability: want %v\n%s", want, m.View())
			}
			contains(t, m.View(), "Revisar", "Desinstalar", "Limpiar residuos")
		})
	}
}

func TestAdoptProject(t *testing.T) {
	m, calls := actionModel(t, true)
	// Retain coverage for the existing manual adoption workflow, no longer a menu entry.
	m.page, m.flow = "wizard", workflow{action: "init", step: 1}
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
func TestTowerProjectStatesAndPlanPrompt(t *testing.T) {
	m := loaded(t, healthyJSON)
	m.status.Projects = json.RawMessage(`[{"projectRoot":"/activo","status":"healthy","towerState":"active"},{"projectRoot":"/sin-plan","status":"healthy","towerState":"needs-plan"},{"projectRoot":"/skills","status":"unadopted","towerState":"skills-only"}]`)
	m.selected = 2
	m = keys(m, "enter")
	contains(t, m.View(), "🟢 Torre activa", "🟡 Falta armar el plan", "⚪ Solo skills", "Sumar un proyecto")
	t.Log("Three-state project list:\n" + m.View())
	m = keys(m, "down", "enter")
	contains(t, m.View(), "Ver el prompt para armar el plan", "Revisar", "Desinstalar", "Limpiar residuos")
	m = keys(m, "enter")
	contains(t, m.View(), "Quiero usar la Torre de Control")
	m = keys(m, "esc")
	if m.page != "projects" || !m.projectMenu {
		t.Fatal("prompt did not return to plan actions")
	}
	m = keys(m, "esc", "down", "down", "enter")
	contains(t, m.View(), "Quiero usar la Torre de Control")
	m = keys(m, "esc")
	if m.page != "projects" {
		t.Fatal("prompt lost project list origin")
	}
}

func TestTowerStateDoesNotHideProjectErrors(t *testing.T) {
	for _, tt := range []struct{ status, label string }{{"missing", "ausente"}, {"unsafe", "inseguro"}, {"inaccessible", "inaccesible"}, {"invalid", "inválido"}} {
		t.Run(tt.status, func(t *testing.T) {
			m := loaded(t, healthyJSON)
			m.status.Projects = json.RawMessage(`[{"projectRoot":"/proyecto","status":"` + tt.status + `","towerState":"active"}]`)
			m.page = "projects"
			contains(t, m.View(), tt.label)
			if strings.Contains(m.View(), "Torre activa") {
				t.Fatal("Tower state hid an error")
			}
		})
	}
}

func TestNeedsPlanKeepsLifecycleActions(t *testing.T) {
	for i, action := range []string{"doctor", "uninstall", "cleanup"} {
		t.Run(action, func(t *testing.T) {
			m := loaded(t, healthyJSON)
			m.status.Projects = json.RawMessage(`[{"projectRoot":"/sin-plan","status":"healthy","towerState":"needs-plan"}]`)
			m.page = "projects"
			m = keys(m, "enter")
			for n := 0; n <= i; n++ {
				m = keys(m, "down")
			}
			m = keys(m, "enter")
			if m.page != "wizard" || m.flow.action != action || m.flow.root != "/sin-plan" {
				t.Fatalf("wrong lifecycle action: %+v", m.flow)
			}
		})
	}
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

// ---- S203: per-project piloto switch in the installer/TUI ----

// projectPilotoModel loads a projects page whose piloto reads go through the S216
// runner seam, the same seam the panel uses. The TUI keeps no state of its own (P14).
func projectPilotoModel(t *testing.T, projectJSON, estado string) model {
	t.Helper()
	m := loaded(t, healthyJSON)
	m.status.Projects = json.RawMessage(projectJSON)
	m.radarRun = func(string, []string) execution {
		return execution{stdout: []byte(`{"schema":"radar.snapshot/v1"}`)}
	}
	m.pilotoRun = func(root string, args []string, input string) execution {
		switch {
		case slices.Equal(args, []string{"interruptor", "estado"}):
			return execution{stdout: []byte(estado)}
		case slices.Equal(args, []string{"informe"}):
			return execution{}
		}
		return execution{stdout: []byte("✓ piloto\n")}
	}
	m.page = "projects"
	m.projectSelected = 0
	return m
}

func hasCall(calls [][]string, want []string) bool {
	return slices.ContainsFunc(calls, func(call []string) bool { return slices.Equal(call, want) })
}

// openProjectPilotoToggle opens the first project's action menu and moves the
// cursor onto the appended piloto switch, failing loudly if it is absent.
func openProjectPilotoToggle(t *testing.T, m model) model {
	t.Helper()
	m = keys(m, "enter")
	projects, ok := m.projectList()
	if !ok || len(projects) == 0 {
		t.Fatal("project list unavailable")
	}
	actions := m.actionsForProject(projects[0])
	last := len(actions) - 1
	if actions[last] != pilotoOnAction && actions[last] != pilotoOffAction {
		t.Fatalf("last action is not the piloto switch: %v", actions)
	}
	for i := 0; i < last; i++ {
		m = keys(m, "down")
	}
	return m
}

func TestS203AdoptedProjectOffersPilotoSwitch(t *testing.T) {
	m := projectPilotoModel(t, `[{"projectRoot":"/adoptado","status":"healthy","towerState":"active"}]`, pilotApagado)
	m = keys(m, "enter")
	contains(t, m.View(), "/adoptado", "Comandos de Radar", "Revisar", "Desinstalar", "Limpiar residuos", pilotoOnAction)
	if strings.Contains(m.View(), "Freno de emergencia") {
		t.Fatal("the emergency brake belongs to the S216 panel, not the project detail")
	}
}

func TestS203PilotoSwitchLabelFollowsPanelRead(t *testing.T) {
	m := projectPilotoModel(t, `[{"projectRoot":"/adoptado","status":"healthy","towerState":"active"}]`, pilotPrendido)
	m, cmd := key(m, "p")
	if cmd == nil {
		t.Fatal("opening the pilot panel must read the switch state")
	}
	m = finish(m, cmd)
	m = keys(m, "esc")
	if m.page != "projects" {
		t.Fatalf("page = %s", m.page)
	}
	m = keys(m, "enter")
	contains(t, m.View(), pilotoOffAction)
	if strings.Contains(m.View(), pilotoOnAction) {
		t.Fatalf("stale switch label after a fresh read:\n%s", m.View())
	}
}

func TestS203FreshPilotoBadgeInProjectList(t *testing.T) {
	m := projectPilotoModel(t, `[{"projectRoot":"/adoptado","status":"healthy","towerState":"active"},{"projectRoot":"/otro","status":"healthy","towerState":"active"}]`, pilotPrendido)
	if strings.Contains(m.View(), "piloto prendido") {
		t.Fatal("badge appeared before any fresh read")
	}
	m, cmd := key(m, "p")
	m = finish(m, cmd)
	m = keys(m, "esc")
	contains(t, m.View(), "piloto prendido")
	if strings.Count(m.View(), "piloto prendido") != 1 {
		t.Fatalf("the badge must describe only the read project:\n%s", m.View())
	}
	if strings.Contains(m.View(), "piloto apagado") {
		t.Fatal("an unread project invented a switch state")
	}
}

func TestS203ApagarPilotoInvokesCLIAndNotesP9(t *testing.T) {
	m := projectPilotoModel(t, `[{"projectRoot":"/adoptado","status":"healthy","towerState":"active"}]`, pilotPrendido)
	m.pilot.root, m.pilot.estado = "/adoptado", pilotPrendido
	var calls [][]string
	m.pilotoRun = func(root string, args []string, input string) execution {
		calls = append(calls, append([]string(nil), args...))
		switch {
		case slices.Equal(args, []string{"interruptor", "estado"}):
			return execution{stdout: []byte(pilotApagado)}
		case slices.Equal(args, []string{"informe"}):
			return execution{}
		}
		return execution{stdout: []byte("✓ piloto apagado · 3 rondas · tope 10 Sesiones\n")}
	}
	m = openProjectPilotoToggle(t, m)
	contains(t, m.View(), pilotoOffAction)
	m, cmd := key(m, "enter")
	if cmd == nil {
		t.Fatal("the switch must call the S216 runner seam")
	}
	m = finish(m, cmd)
	if !hasCall(calls, []string{"interruptor", "off"}) {
		t.Fatalf("piloto switch args: %v", calls)
	}
	contains(t, m.View(), "piloto apagado", "Piloto · /adoptado", "NOVEDAD", "POR REVISAR", "revisión")
}

func TestS203PrenderPilotoInvokesCLI(t *testing.T) {
	m := projectPilotoModel(t, `[{"projectRoot":"/adoptado","status":"healthy","towerState":"active"}]`, pilotApagado)
	m.pilot.root, m.pilot.estado = "/adoptado", pilotApagado
	var calls [][]string
	m.pilotoRun = func(root string, args []string, input string) execution {
		calls = append(calls, append([]string(nil), args...))
		switch {
		case slices.Equal(args, []string{"interruptor", "estado"}):
			return execution{stdout: []byte(pilotPrendido)}
		case slices.Equal(args, []string{"informe"}):
			return execution{}
		}
		return execution{stdout: []byte("✓ piloto prendido · 3 rondas · tope 10 Sesiones\n")}
	}
	m = openProjectPilotoToggle(t, m)
	contains(t, m.View(), pilotoOnAction)
	m, cmd := key(m, "enter")
	m = finish(m, cmd)
	if !hasCall(calls, []string{"interruptor", "on"}) {
		t.Fatalf("piloto switch args: %v", calls)
	}
	if strings.Contains(m.View(), "NOVEDAD ni POR REVISAR") {
		t.Fatal("the P9 note only belongs to turning the mode off")
	}
}

func TestS203PilotoSwitchOnlyForAdoptedProjects(t *testing.T) {
	for _, tt := range []struct {
		name, project string
		want          bool
	}{
		{"active", `{"projectRoot":"/p","status":"healthy","towerState":"active"}`, true},
		{"needs plan", `{"projectRoot":"/p","status":"healthy","towerState":"needs-plan"}`, true},
		{"skills only", `{"projectRoot":"/p","status":"unadopted","towerState":"skills-only"}`, false},
		{"unadopted", `{"projectRoot":"/p","status":"healthy"}`, false},
		{"outdated", `{"projectRoot":"/p","status":"outdated","towerState":"active"}`, false},
		{"invalid", `{"projectRoot":"/p","status":"invalid"}`, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			m := projectPilotoModel(t, `[`+tt.project+`]`, pilotApagado)
			m = keys(m, "enter")
			got := strings.Contains(m.View(), pilotoOnAction) || strings.Contains(m.View(), pilotoOffAction)
			if got != tt.want {
				t.Fatalf("piloto switch offered: got %v want %v\n%s", got, tt.want, m.View())
			}
		})
	}
}
