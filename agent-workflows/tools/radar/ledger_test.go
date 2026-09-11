package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLedgerSDDInvocaContratoReadOnlyExacto(t *testing.T) {
	dir := t.TempDir()
	argsPath := filepath.Join(dir, "args")
	executable := filepath.Join(dir, "gentle-ai-fake")
	script := "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$RADAR_ARGS\"\nprintf '{\"decision_required\":false}'\n"
	if err := os.WriteFile(executable, []byte(script), 0o700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("RADAR_ARGS", argsPath)
	oldExecutable := sddAttemptExecutable
	sddAttemptExecutable = executable
	t.Cleanup(func() { sddAttemptExecutable = oldExecutable })

	blocked, err := readAttemptStatus("/repo", "mi-cambio")
	if err != nil || blocked {
		t.Fatalf("status válido inesperado: blocked=%v err=%v", blocked, err)
	}
	raw, err := os.ReadFile(argsPath)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := strings.TrimSpace(string(raw)), "sdd-attempt\nstatus\n--cwd\n/repo\n--change\nmi-cambio"; got != want {
		t.Fatalf("argumentos del contrato read-only:\n%s", got)
	}
}

func TestLedgerSDDDeclaradoSeConsultaYPuedeBloquear(t *testing.T) {
	root, head := repoGit(t)
	original := runSDDAttemptStatus
	t.Cleanup(func() { runSDDAttemptStatus = original })

	cases := []struct {
		name string
		json string
		want string
	}{
		{"sin decisión pendiente", `{"decision_required":false}`, Listo},
		{"decisión requerida", `{"decision_required":true}`, Bloqueado},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			var gotRoot, gotChange string
			runSDDAttemptStatus = func(root, change string) ([]byte, error) {
				gotRoot, gotChange = root, change
				return []byte(tt.json), nil
			}
			p := &Plan{Sesiones: []Sesion{{
				ID: "S1", Zona: "z", Resultado: "r", Autoridad: Autoridad{Texto: "PRD"}, Cambio: "mi-cambio",
				Criterios: []string{"c"}, Ruta: RutaSesion{Propuesta: "full-sdd", Autoridad: "kickoff"},
			}}}
			if got := hallazgosDe(p.CheckAt(root, head), "ledger SDD"); len(got) != 0 {
				t.Fatalf("ledger válido produjo error: %#v", got)
			}
			if gotRoot != root || gotChange != "mi-cambio" {
				t.Fatalf("consulta incorrecta: root=%q change=%q", gotRoot, gotChange)
			}
			if got := p.EstadosAt(root, head)["S1"]; got != tt.want {
				t.Fatalf("estado con ledger %s: quería %s, fue %s", tt.json, tt.want, got)
			}
			if tt.want == Bloqueado && !strings.Contains(string(RenderAt(p, root, head)), "ledger SDD requiere una decisión") {
				t.Fatal("el render debe explicar el bloqueo aportado por el ledger")
			}
		})
	}
}

func TestLedgerSDDFallaCerradoCuandoFueDeclarado(t *testing.T) {
	root, head := repoGit(t)
	original := runSDDAttemptStatus
	t.Cleanup(func() { runSDDAttemptStatus = original })

	cases := []struct {
		name string
		raw  []byte
		err  error
	}{
		{"JSON inválido", []byte(`{"decision_required":`), nil},
		{"comando no disponible", nil, errors.New("executable file not found")},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			runSDDAttemptStatus = func(_, _ string) ([]byte, error) { return tt.raw, tt.err }
			p := &Plan{Sesiones: []Sesion{{ID: "S1", Cambio: "mi-cambio"}}}
			if got := hallazgosDe(p.CheckAt(root, head), "ledger SDD"); len(got) != 1 {
				t.Fatalf("un ledger declarado ilegible debe fallar cerrado: %#v", got)
			}
		})
	}
}

func TestCambioAusenteNoConsultaLedgerNiCambiaEstado(t *testing.T) {
	original := runSDDAttemptStatus
	t.Cleanup(func() { runSDDAttemptStatus = original })
	calls := 0
	runSDDAttemptStatus = func(_, _ string) ([]byte, error) {
		calls++
		return []byte(`{"decision_required":true}`), nil
	}
	p := &Plan{Sesiones: []Sesion{{ID: "S1", Cambio: "  "}}}
	p.CheckAt("", "")
	if calls != 0 {
		t.Fatalf("cambio vacío no representa un ledger: %d consultas", calls)
	}
	if got := p.EstadosAt("", "")["S1"]; got != Listo {
		t.Fatalf("sin ledger el estado previo se conserva; fue %s", got)
	}
}
