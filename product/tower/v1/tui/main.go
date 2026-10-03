package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/term"
)

func main() {
	if !term.IsTerminal(os.Stdin.Fd()) || !term.IsTerminal(os.Stdout.Fd()) {
		fmt.Fprintln(os.Stderr, "La interfaz requiere una terminal en la entrada y la salida.")
		os.Exit(2)
	}
	cli := os.Getenv("TORRE_CONTROL_CLI")
	if cli == "" {
		cli = "torre-control"
	}
	run := func(action string) ([]byte, error) {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		data, err := exec.CommandContext(ctx, cli, action).Output()
		if err != nil {
			return nil, fmt.Errorf("el comando %s no pudo completarse", action)
		}
		return data, nil
	}
	_, noColor := os.LookupEnv("NO_COLOR")
	if _, err := tea.NewProgram(newModel(run, noColor), tea.WithAltScreen()).Run(); err != nil {
		fmt.Fprintln(os.Stderr, "No se pudo iniciar la interfaz de terminal.")
		os.Exit(1)
	}
}
