package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
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
	case "status":
		// status --json is the machine projection the pilot panel reads.
		return len(args) == 1 || (len(args) == 2 && args[1] == "--json")
	case "check", "faltan", "zonas", "roadmap":
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

// ---- S216: piloto control panel ----
//
// Radar owns every pilot state: the panel only reads `radar status --json` and
// the deterministic `piloto` CLI (P2, P14). It never parses or writes marks,
// and it keeps no authoritative state of its own.

// pilotoAllowedArgs bounds every argument shape the panel may send to `piloto`.
// despegar is deliberately absent: it needs the terminal, so it runs through
// tea.ExecProcess instead of the bounded runner.
func pilotoAllowedArgs(args []string) bool {
	if len(args) == 0 {
		return false
	}
	switch args[0] {
	case "interruptor":
		if len(args) == 1 {
			return true
		}
		if len(args) == 2 {
			return args[1] == "on" || args[1] == "off" || args[1] == "estado"
		}
	case "freno", "informe":
		return len(args) == 1
	}
	return false
}

// realDestino resolves a candidate so a symlink cannot smuggle a binary out of
// the checkout being worked on.
func realDestino(p string) string {
	if p == "" {
		return ""
	}
	if abs, err := filepath.Abs(p); err == nil {
		p = abs
	}
	resuelto, err := filepath.EvalSymlinks(p)
	if err != nil {
		return ""
	}
	return resuelto
}

func pathDentro(p, root string) bool {
	return p == root || strings.HasPrefix(p, root+string(os.PathSeparator))
}

// resolverPilotoBin finds the installed piloto the same way the pre-push gate
// does: PATH, then the fixed install location. A candidate whose real path is
// inside the checkout is discarded, never executed (anti-planting).
func resolverPilotoBin(root, home string) (string, error) {
	var candidatos []string
	if p, err := exec.LookPath("piloto"); err == nil && strings.ContainsRune(p, os.PathSeparator) {
		candidatos = append(candidatos, p)
	}
	if home != "" {
		candidatos = append(candidatos, filepath.Join(home, ".local", "bin", "piloto"))
	}
	realRoot := realDestino(root)
	for _, c := range candidatos {
		info, err := os.Stat(c)
		if err != nil || info.IsDir() || info.Mode().Perm()&0o111 == 0 {
			continue
		}
		destino := realDestino(c)
		if destino == "" || (realRoot != "" && pathDentro(destino, realRoot)) {
			continue
		}
		return destino, nil
	}
	return "", fmt.Errorf("piloto no está disponible; instalalo con agent-workflows/tools/install-piloto.sh")
}

func resolverPiloto(root string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("no se pudo localizar piloto: %w", err)
	}
	return resolverPilotoBin(root, home)
}

type pilotoExecutor func(context.Context, string, []string, string, io.Reader, io.Writer) (int, error)
type pilotoRunFunc func(root string, args []string, input string) execution
type pilotExecFunc func(*exec.Cmd, tea.ExecCallback) tea.Cmd

func executePiloto(ctx context.Context, binary string, args []string, root string, input io.Reader, output io.Writer) (int, error) {
	cmd := exec.CommandContext(ctx, binary, args...)
	cmd.Dir, cmd.Stdin, cmd.Stdout, cmd.Stderr = root, input, output, output
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

func pilotoRunner(home string, execute pilotoExecutor) pilotoRunFunc {
	return func(root string, args []string, input string) execution {
		if !pilotoAllowedArgs(args) || !filepath.IsAbs(root) {
			return execution{code: -1, err: fmt.Errorf("comando del piloto no permitido")}
		}
		binary, err := resolverPilotoBin(root, home)
		if err != nil {
			return execution{code: -1, err: err}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		var output boundedOutput
		var stdin io.Reader
		if input != "" {
			stdin = strings.NewReader(input)
		}
		code, err := execute(ctx, binary, append([]string(nil), args...), root, stdin, &output)
		if ctx.Err() != nil || errors.Is(err, context.DeadlineExceeded) {
			err = fmt.Errorf("se agotó el tiempo del piloto (30 segundos)")
		} else if err != nil && code == -1 {
			err = fmt.Errorf("no se pudo ejecutar piloto: %w", err)
		}
		if output.truncated {
			err = fmt.Errorf("la salida del piloto excedió el límite de 64 KiB")
			if code == 0 {
				code = -1
			}
		}
		return execution{stdout: output.data, code: code, err: err}
	}
}

func installedPilotoRunner(root string, args []string, input string) execution {
	home, err := os.UserHomeDir()
	if err != nil {
		return execution{code: -1, err: fmt.Errorf("no se pudo localizar piloto: %w", err)}
	}
	return pilotoRunner(home, executePiloto)(root, args, input)
}

type pilotSesionEstado struct {
	ID            string `json:"id"`
	Estado        string `json:"estado"`
	Vuelo         string `json:"vuelo"`
	MotivoNovedad string `json:"motivo_novedad"`
	NotaRevision  string `json:"nota_revision"`
}

type pilotAvance struct {
	PorRevisar int `json:"por_revisar"`
	Novedad    int `json:"novedad"`
}

// pilotSnapshot mirrors only the fields the panel reads from radar.snapshot/v1.
type pilotSnapshot struct {
	Schema              string              `json:"schema"`
	Avance              pilotAvance         `json:"avance"`
	Sesiones            []pilotSesionEstado `json:"sesiones"`
	PilotosInvalidos    []string            `json:"pilotos_invalidos"`
	InterruptorInvalido bool                `json:"interruptor_invalido"`
}

// pilotScreen holds the last read, never authoritative state. Every read comes
// from Radar or `piloto`, so reopening the panel reconstitutes the truth.
type pilotScreen struct {
	root      string
	selected  int
	estado    string
	estadoErr string
	snap      pilotSnapshot
	snapErr   string
	rondas    map[string]string
	running   bool
	countdown int
	output    []string
	code      int
}

type pilotRefreshMsg struct {
	id       uint64
	result   execution
	mutating bool
	snap     execution
	estado   execution
	informe  execution
}

type pilotTick struct{}
type pilotExecDone struct{ err error }

func (p pilotScreen) prendido() bool { return strings.Contains(p.estado, "prendido") }

func (p *pilotScreen) apply(snap, estado, informe execution) {
	p.snapErr = ""
	p.snap, p.rondas = pilotSnapshot{}, nil
	if snap.err != nil {
		p.snapErr = "No se pudo leer el estado del piloto: " + clean(snap.err.Error())
	} else if json.Unmarshal(snap.stdout, &p.snap) != nil || p.snap.Schema != "radar.snapshot/v1" {
		p.snapErr = "No se pudo leer el estado del piloto: respuesta de Radar no válida"
		p.snap = pilotSnapshot{}
	} else {
		p.rondas = pilotRondas(string(informe.stdout))
	}
	p.estadoErr = ""
	p.estado = ""
	if estado.err != nil {
		p.estadoErr = "No se pudo leer el interruptor: " + clean(estado.err.Error())
	} else {
		p.estado = clean(firstLine(string(estado.stdout)))
	}
}

// pilotRondas reads the per-flight round `piloto informe` publishes. Radar does
// not project the round, so the deterministic CLI stays its owner.
func pilotRondas(informe string) map[string]string {
	rondas := map[string]string{}
	for _, line := range strings.Split(informe, "\n") {
		if !strings.HasPrefix(line, "Vuelo ") {
			continue
		}
		id, resto, ok := strings.Cut(strings.TrimPrefix(line, "Vuelo "), " — ronda ")
		if !ok {
			continue
		}
		n, _, _ := strings.Cut(resto, " ")
		if id != "" && n != "" {
			rondas[clean(id)] = clean(n)
		}
	}
	return rondas
}

func (m model) openPilot(root string) (tea.Model, tea.Cmd) {
	m.pilot = pilotScreen{root: root}
	m.page, m.offset = "pilot", 0
	return m.pilotRefresh()
}

func (m model) pilotRefresh() (tea.Model, tea.Cmd) {
	return m.runPilot("", nil, false)
}

func (m model) runPilot(label string, args []string, mutating bool) (tea.Model, tea.Cmd) {
	if mutating && !pilotoAllowedArgs(args) {
		m.page, m.offset = "pilot-output", 0
		m.pilot.output, m.pilot.code = []string{"Comando del piloto no permitido."}, -1
		return m, nil
	}
	m.sequence++
	id, root := m.sequence, m.pilot.root
	run, radarRun := m.pilotoRun, m.radarRun
	m.pilot.running = true
	if mutating {
		m.page, m.offset = "pilot-output", 0
		m.pilot.output, m.pilot.code, m.pilot.countdown = nil, 0, 0
	}
	return m, func() tea.Msg {
		msg := pilotRefreshMsg{id: id, mutating: mutating}
		if mutating {
			msg.result = run(root, args, "")
		}
		msg.snap = radarRun(root, []string{"status", "--json"})
		msg.estado = run(root, []string{"interruptor", "estado"}, "")
		msg.informe = run(root, []string{"informe"}, "")
		return msg
	}
}

func (m model) pilotTickCmd() tea.Cmd {
	return tea.Tick(300*time.Millisecond, func(time.Time) tea.Msg { return pilotTick{} })
}

func (m model) startPilotDespegue() (tea.Model, tea.Cmd) {
	root := m.pilot.root
	resolve := m.pilotoBin
	if resolve == nil {
		resolve = resolverPiloto
	}
	binary, err := resolve(root)
	if err != nil {
		m.page, m.offset = "pilot-output", 0
		m.pilot.output, m.pilot.code = []string{clean(err.Error())}, -1
		return m, nil
	}
	cmd := exec.Command(binary, "despegar")
	cmd.Dir = root
	execute := m.pilotExec
	if execute == nil {
		execute = tea.ExecProcess
	}
	m.page, m.offset = "pilot-output", 0
	m.pilot.running, m.pilot.code, m.pilot.output = true, 0, nil
	return m, execute(cmd, func(err error) tea.Msg { return pilotExecDone{err: err} })
}

func (m model) pilotControls() []string {
	toggle := "Prender el piloto"
	if m.pilot.prendido() {
		toggle = "Apagar el piloto"
	}
	return []string{toggle, "Vuelos en curso", "Despegar", "Freno de emergencia"}
}

func pilotControlDescriptions() []string {
	return []string{
		"Prende o apaga el modo piloto",
		"Ronda, tope y estado de cada Sesión",
		"Cuenta regresiva y aprobación vuelo por vuelo",
		"Detiene la corrida: nada nuevo arranca",
	}
}

func (m model) pilotActivate() (tea.Model, tea.Cmd) {
	m.pilot.selected = min(max(0, m.pilot.selected), len(m.pilotControls())-1)
	switch m.pilot.selected {
	case 0:
		if m.pilot.prendido() {
			return m.runPilot("apagar", []string{"interruptor", "off"}, true)
		}
		return m.runPilot("prender", []string{"interruptor", "on"}, true)
	case 1:
		m.page, m.offset = "pilot-flights", 0
	case 2:
		m.page, m.offset = "pilot-despegue", 0
		m.pilot.countdown = 1
		return m, m.pilotTickCmd()
	case 3:
		m.page, m.offset = "pilot-freno", 0
	}
	return m, nil
}

func (m model) pilotKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.pilot.running {
		return m, nil
	}
	// The emergency brake is one key away from every pilot view.
	if msg.String() == "f" && m.page != "pilot-freno" {
		m.pilot.countdown = 0
		m.page, m.offset = "pilot-freno", 0
		return m, nil
	}
	switch m.page {
	case "pilot-freno":
		switch msg.String() {
		case "enter", "s":
			return m.runPilot("freno", []string{"freno"}, true)
		case "esc", "n":
			m.page, m.offset = "pilot", 0
		}
	case "pilot-despegue":
		if msg.String() == "esc" {
			m.pilot.countdown = 0
			m.page, m.offset = "pilot", 0
		}
	case "pilot-output", "pilot-flights":
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "esc":
			m.page, m.offset = "pilot", 0
		case "up", "k":
			m.offset = max(0, m.offset-1)
		case "down", "j":
			m.offset++
		case "pgup":
			m.offset = max(0, m.offset-max(1, m.height-1))
		case "pgdown":
			m.offset += max(1, m.height-1)
		}
	case "pilot":
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "esc":
			m.page, m.offset = "projects", 0
		case "up", "k":
			m.pilot.selected = max(0, m.pilot.selected-1)
		case "down", "j":
			m.pilot.selected = min(len(m.pilotControls())-1, m.pilot.selected+1)
		case "r":
			return m.pilotRefresh()
		case "enter":
			return m.pilotActivate()
		}
	}
	m.offset = min(m.offset, m.maxOffset())
	return m, nil
}

func (m model) pilotLines() []string {
	switch m.page {
	case "pilot-flights":
		return m.wrap(m.pilotFlightLines())
	case "pilot-output":
		return m.wrap(m.pilotOutputLines())
	case "pilot-freno":
		return m.wrap(m.pilotFrenoLines())
	case "pilot-despegue":
		return m.wrap(m.pilotDespegueLines())
	}
	return m.wrap(m.pilotPanelLines())
}

func (m model) pilotSwitchLines() []string {
	if m.pilot.estadoErr != "" {
		return []string{m.palette.bad.Render(m.pilot.estadoErr)}
	}
	if m.pilot.estado == "" {
		return []string{"Interruptor: sin estado disponible"}
	}
	return []string{m.pilot.estado}
}

func (m model) pilotWarnings() []string {
	if m.pilot.snapErr != "" {
		return nil
	}
	var lines []string
	if len(m.pilot.snap.PilotosInvalidos) > 0 {
		lines = append(lines, m.palette.warn.Render("Marcas de piloto inválidas (no otorgan estado): "+clean(strings.Join(m.pilot.snap.PilotosInvalidos, ", "))))
	}
	if m.pilot.snap.InterruptorInvalido {
		lines = append(lines, m.palette.warn.Render("Interruptor del piloto inválido (se lee como apagado)."))
	}
	return lines
}

func (m model) pilotPanelLines() []string {
	lines := []string{"Piloto automático", clean(m.pilot.root), "Consultivo: el estado lo publica Radar; los controles llaman a piloto."}
	lines = append(lines, m.pilotSwitchLines()...)
	lines = append(lines, m.pilotWarnings()...)
	if m.pilot.snapErr != "" {
		lines = append(lines, m.palette.bad.Render(m.pilot.snapErr))
	} else if m.pilot.snap.Schema != "" {
		lines = append(lines, fmt.Sprintf("Vuelos: %d en curso · POR REVISAR: %d · NOVEDAD: %d", len(pilotoVuelos(m.pilot.snap.Sesiones)), m.pilot.snap.Avance.PorRevisar, m.pilot.snap.Avance.Novedad))
	}
	for i, label := range m.pilotControls() {
		prefix := "  "
		if i == m.pilot.selected {
			prefix = "> "
		}
		lines = append(lines, prefix+label, "  "+pilotControlDescriptions()[i])
	}
	return lines
}

func pilotoVuelos(sesiones []pilotSesionEstado) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range sesiones {
		if s.Vuelo == "" || seen[s.Vuelo] {
			continue
		}
		seen[s.Vuelo] = true
		out = append(out, s.Vuelo)
	}
	sort.Strings(out)
	return out
}

func pilotNota(s pilotSesionEstado) string {
	switch s.Estado {
	case "NOVEDAD":
		return clean(s.MotivoNovedad)
	case "POR REVISAR":
		return clean(s.NotaRevision)
	case "EN CURSO":
		return "en curso"
	}
	return ""
}

func (m model) pilotFlightLines() []string {
	lines := []string{"Vuelos en curso", clean(m.pilot.root)}
	lines = append(lines, m.pilotSwitchLines()...)
	lines = append(lines, m.pilotWarnings()...)
	if m.pilot.snapErr != "" {
		return append(lines, m.palette.bad.Render(m.pilot.snapErr))
	}
	vuelos := pilotoVuelos(m.pilot.snap.Sesiones)
	if len(vuelos) == 0 {
		lines = append(lines, "No hay vuelos en curso.")
	}
	for _, id := range vuelos {
		heading := "Vuelo " + clean(id)
		if ronda := m.pilot.rondas[id]; ronda != "" {
			heading += " — ronda " + ronda
		}
		lines = append(lines, heading)
		for _, s := range m.pilot.snap.Sesiones {
			if s.Vuelo != id {
				continue
			}
			lines = append(lines, "  "+clean(s.ID)+"  "+clean(s.Estado)+"  "+pilotNota(s))
		}
	}
	lines = append(lines, fmt.Sprintf("POR REVISAR: %d · NOVEDAD: %d", m.pilot.snap.Avance.PorRevisar, m.pilot.snap.Avance.Novedad))
	return lines
}

func (m model) pilotOutputLines() []string {
	lines := []string{"Piloto · " + clean(m.pilot.root)}
	if m.pilot.code != 0 {
		lines = append(lines, fmt.Sprintf("Salida: código %d", m.pilot.code))
	}
	lines = append(lines, "")
	return append(lines, m.pilot.output...)
}

func (m model) pilotFrenoLines() []string {
	return []string{
		"Freno de emergencia",
		clean(m.pilot.root),
		"Detiene la corrida: nada nuevo arranca y lo que está en el aire queda NOVEDAD · interrumpida.",
		"Confirmá el freno: enter o s para frenar · esc o n para volver.",
	}
}

func (m model) pilotDespegueLines() []string {
	frame := min(max(m.pilot.countdown, 1), 3)
	return []string{
		"Despegue",
		clean(m.pilot.root),
		fmt.Sprintf("Empezando vuelo… %d", 4-frame),
		"El piloto propone los vuelos y vos aprobás cada uno.",
	}
}
