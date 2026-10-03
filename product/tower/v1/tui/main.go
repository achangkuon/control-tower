package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/term"
)

type execution struct {
	stdout, stderr []byte
	code           int
	err            error
}
type runner func([]string) execution

const outputLimit = 64 * 1024

type boundedOutput struct {
	data      []byte
	truncated bool
}

func (b *boundedOutput) Write(p []byte) (int, error) {
	n := min(len(p), outputLimit-len(b.data))
	b.data = append(b.data, p[:n]...)
	b.truncated = b.truncated || n < len(p)
	return len(p), nil
}

// Only these positional shapes may cross the process boundary; never use a shell.
func allowedArgs(a []string) bool {
	if len(a) == 1 {
		return a[0] == "status" || a[0] == "doctor" || a[0] == "rollback"
	}
	if len(a) == 7 && (a[0] == "install" || a[0] == "update") {
		return a[1] == "--tag" && validTag(a[2]) && a[3] == "--asset" && validValue(a[4]) && a[5] == "--sha256" && validSHA(a[6])
	}
	if len(a) >= 4 && a[0] == "project" && a[2] == "--project" && validRoot(a[3]) {
		if len(a) == 6 {
			return a[1] == "init" && a[4] == "--trust" && a[5] == "trusted"
		}
		return len(a) == 4 && (a[1] == "doctor" || a[1] == "uninstall" || a[1] == "cleanup")
	}
	return false
}
func commandTimeout(a []string) time.Duration {
	if a[0] == "install" || a[0] == "update" {
		return 5 * time.Minute
	}
	return 30 * time.Second
}
func cliRunner(cli string) runner {
	return func(args []string) execution {
		if !allowedArgs(args) {
			return execution{code: -1, err: fmt.Errorf("comando no permitido")}
		}
		ctx, cancel := context.WithTimeout(context.Background(), commandTimeout(args))
		defer cancel()
		cmd := exec.CommandContext(ctx, cli, args...)
		var out, errout boundedOutput
		cmd.Stdout, cmd.Stderr = &out, &errout
		err := cmd.Run()
		code := 0
		if err != nil {
			code = -1
			if exit, ok := err.(*exec.ExitError); ok {
				code = exit.ExitCode()
			}
		}
		if ctx.Err() != nil {
			err = fmt.Errorf("se agotó el tiempo del comando; la operación se interrumpió. Compruebe el estado con Diagnóstico")
		}
		if out.truncated || errout.truncated {
			err = fmt.Errorf("la salida excedió el límite de 64 KiB")
			if code == 0 {
				code = -1
			}
		}
		return execution{stdout: out.data, stderr: errout.data, code: code, err: err}
	}
}

// Close admission before waiting, so even late Bubble Tea commands cannot detach a child.
func drainingRunner(run runner) (runner, func()) {
	var mu sync.Mutex
	var children sync.WaitGroup
	closed := false
	guarded := func(args []string) execution {
		mu.Lock()
		if closed {
			mu.Unlock()
			return execution{code: -1, err: fmt.Errorf("la interfaz se está cerrando")}
		}
		children.Add(1)
		mu.Unlock()
		defer children.Done()
		return run(args)
	}
	wait := func() {
		mu.Lock()
		closed = true
		mu.Unlock()
		children.Wait()
	}
	return guarded, wait
}
func runInterface(run runner, noColor bool, options ...tea.ProgramOption) (tea.Model, error) {
	guarded, wait := drainingRunner(run)
	defer wait()
	options = append(options, tea.WithFilter(func(current tea.Model, msg tea.Msg) tea.Msg {
		if _, quitting := msg.(tea.QuitMsg); quitting && current.(model).operationRunning() {
			return tea.KeyMsg{Type: tea.KeyCtrlC}
		}
		return msg
	}))
	return tea.NewProgram(newModel(guarded, noColor), options...).Run()
}
func main() {
	if !term.IsTerminal(os.Stdin.Fd()) || !term.IsTerminal(os.Stdout.Fd()) {
		fmt.Fprintln(os.Stderr, "La interfaz requiere una terminal en la entrada y la salida.")
		os.Exit(2)
	}
	cli := os.Getenv("TORRE_CONTROL_CLI")
	if cli == "" {
		cli = "torre-control"
	}
	_, noColor := os.LookupEnv("NO_COLOR")
	if _, err := runInterface(cliRunner(cli), noColor, tea.WithAltScreen()); err != nil {
		fmt.Fprintln(os.Stderr, "No se pudo iniciar la interfaz de terminal.")
		os.Exit(1)
	}
}
