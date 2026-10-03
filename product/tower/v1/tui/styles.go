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

// All status sections share the widest fixed label (Claude Code) and a two-space gap.
func statusRow(label, value string) string {
	return "  " + label + strings.Repeat(" ", max(2, 13-ansi.StringWidth(label))) + value
}

func (m model) menuLines(hints map[int]string) []string {
	labelWidth := 0
	for _, label := range menu {
		labelWidth = max(labelWidth, ansi.StringWidth(label))
	}
	// Hide the entire hint column before truncating any label or partial hint.
	hintWidth := 0
	for _, hint := range hints {
		hintWidth = max(hintWidth, ansi.StringWidth(hint)+2)
	}
	showHints := m.width >= 2+labelWidth+2+hintWidth
	lines := make([]string, 0, len(menu))
	for i, label := range menu {
		prefix := "  "
		if i == m.selected {
			prefix = "> "
		}
		line := prefix + label
		if i == m.selected {
			line = m.palette.tower.Render(line)
		}
		if hint := hints[i]; showHints && hint != "" {
			line += strings.Repeat(" ", labelWidth-ansi.StringWidth(label)+2) + m.palette.dim.Render("("+hint+")")
		}
		lines = append(lines, line)
	}
	return lines
}

func (m model) wrap(lines []string) []string {
	var wrapped []string
	for _, line := range lines {
		wrapped = append(wrapped, strings.Split(ansi.Wrap(line, max(1, m.width), ""), "\n")...)
	}
	return wrapped
}

func (m model) fit(lines []string) string {
	lines = lines[:min(len(lines), max(0, m.height))]
	for i := range lines {
		lines[i] = ansi.Truncate(lines[i], m.width, "…")
	}
	return strings.Join(lines, "\n")
}
