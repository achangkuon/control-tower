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
