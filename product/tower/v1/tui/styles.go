package main

import (
	"os"
	"strings"
	"unicode"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

type palette struct{ tower, good, warn, bad, dim lipgloss.Style }

func newPalette(noColor bool) palette {
	// Fix capabilities before rendering: never query foreground or background.
	profile := termenv.ANSI
	terminal, color := os.Getenv("TERM"), os.Getenv("COLORTERM")
	switch {
	case noColor || terminal == "" || terminal == "dumb":
		profile = termenv.Ascii
	case color == "truecolor" || color == "24bit":
		profile = termenv.TrueColor
	case strings.Contains(terminal, "256color"):
		profile = termenv.ANSI256
	}
	lipgloss.SetColorProfile(profile)
	lipgloss.SetHasDarkBackground(true)
	style := func(color string) lipgloss.Style {
		s := lipgloss.NewStyle()
		if !noColor {
			s = s.Foreground(lipgloss.Color(color))
		}
		return s
	}
	return palette{style("#38BDB5"), style("#65C18C"), style("#E3B65C"), style("#E77474"), style("#929BA5")}
}

// Treat command output as text, never as terminal control sequences.
func clean(text string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return ' '
		}
		return r
	}, ansi.Strip(text))
}

func (m model) fit(lines []string) string {
	for i := range lines {
		lines[i] = ansi.Truncate(lines[i], m.width, "…")
	}
	return strings.Join(lines, "\n")
}
