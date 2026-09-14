package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
)

type attemptStatus struct {
	DecisionRequired *bool `json:"decision_required"`
}

var sddAttemptExecutable = "gentle-ai"

var runSDDAttemptStatus = func(root, change string) ([]byte, error) {
	cmd := exec.Command(sddAttemptExecutable, "sdd-attempt", "status", "--cwd", root, "--change", change)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("gentle-ai sdd-attempt status: %w: %s", err, bytes.TrimSpace(out))
	}
	return out, nil
}

func readAttemptStatus(root, change string) (bool, error) {
	raw, err := runSDDAttemptStatus(root, change)
	if err != nil {
		return false, err
	}
	var status attemptStatus
	dec := json.NewDecoder(bytes.NewReader(raw))
	if err := dec.Decode(&status); err != nil {
		return false, fmt.Errorf("JSON inválido: %w", err)
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		if err == nil {
			return false, fmt.Errorf("JSON inválido: contiene otro valor")
		}
		return false, fmt.Errorf("JSON inválido después del primer valor: %w", err)
	}
	if status.DecisionRequired == nil {
		return false, fmt.Errorf("JSON corrupto: falta decision_required")
	}
	return *status.DecisionRequired, nil
}

// FasesSDD is the pipeline in order. A route's entry gate is a position in it,
// and "earlier than the declared gate" is the only comparison this tool makes.
// Convention §15.
var FasesSDD = []string{"proposal", "specs", "design", "tasks", "apply", "verify", "archive"}

// RutaSDDNativa is the only route that runs gentle-ai's native SDD pipeline.
// direct and design-tasks use gentle-ai's non-SDD implementation path and verify
// against the plan's criteria, so they never declare a `cambio`. Convention §15.
const RutaSDDNativa = "full-sdd"

// fasePos returns the position of a phase in the pipeline, or -1 when the name
// is not one this contract knows. An unknown phase is never treated as valid.
func fasePos(fase string) int {
	for i, f := range FasesSDD {
		if f == fase {
			return i
		}
	}
	return -1
}

// sddStatus is the part of gentle-ai.sdd-status@2 this tool reads. Radar never
// derives phase progress itself: gentle-ai owns that rule and publishes it, and
// a second implementation of the same fact is a second source of truth.
type sddStatus struct {
	SchemaName    string `json:"schemaName"`
	SchemaVersion int    `json:"schemaVersion"`
	Next          string `json:"nextRecommended"`
}

var runSDDStatus = func(root, change string) ([]byte, error) {
	cmd := exec.Command(sddAttemptExecutable, "sdd-status", change, "--cwd", root, "--json")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("gentle-ai sdd-status: %w: %s", err, bytes.TrimSpace(out))
	}
	return out, nil
}

// readSDDStatus validates the schema before any field is used. An unrecognised
// name or version fails closed: consuming fields from a contract this tool does
// not know is how a silent pass gets manufactured.
func readSDDStatus(root, change string) (*sddStatus, error) {
	raw, err := runSDDStatus(root, change)
	if err != nil {
		return nil, err
	}
	var status sddStatus
	dec := json.NewDecoder(bytes.NewReader(raw))
	if err := dec.Decode(&status); err != nil {
		return nil, fmt.Errorf("JSON inválido: %w", err)
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		if err == nil {
			return nil, fmt.Errorf("JSON inválido: contiene otro valor")
		}
		return nil, fmt.Errorf("JSON inválido después del primer valor: %w", err)
	}
	if status.SchemaName != "gentle-ai.sdd-status" || status.SchemaVersion != 2 {
		return nil, fmt.Errorf("schema no reconocido: %q v%d", status.SchemaName, status.SchemaVersion)
	}
	if status.Next == "" {
		return nil, fmt.Errorf("JSON corrupto: falta nextRecommended")
	}
	return &status, nil
}
