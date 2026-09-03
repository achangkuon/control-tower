package main

import (
	"fmt"
	"os/exec"
	"regexp"
	"strings"
)

var hexadecimal = regexp.MustCompile(`^[0-9a-fA-F]+$`)

func gitOutput(root string, args ...string) (string, error) {
	cmdArgs := append([]string{"-C", root}, args...)
	out, err := exec.Command("git", cmdArgs...).CombinedOutput()
	if err != nil {
		detail := strings.TrimSpace(string(out))
		if detail == "" {
			detail = err.Error()
		}
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), detail)
	}
	return strings.TrimSpace(string(out)), nil
}

func gitObjectFormat(root string) (string, int, error) {
	format, err := gitOutput(root, "rev-parse", "--show-object-format=storage")
	if err != nil {
		return "", 0, err
	}
	switch format {
	case "sha1":
		return format, 40, nil
	case "sha256":
		return format, 64, nil
	default:
		return "", 0, fmt.Errorf("formato de objetos Git no soportado %q", format)
	}
}

// gitOID verifies that value is an immutable, unabbreviated object identity in
// this repository. Symbolic revisions and option-like input never reach Git.
func gitOID(root, value string) (string, error) {
	format, length, err := gitObjectFormat(root)
	if err != nil {
		return "", err
	}
	if len(value) != length || !hexadecimal.MatchString(value) {
		return "", fmt.Errorf("se requiere un OID %s completo de %d hexadecimales", format, length)
	}
	resolved, err := gitOutput(root, "rev-parse", "--verify", "--end-of-options", value+"^{commit}")
	if err != nil {
		return "", err
	}
	if !strings.EqualFold(resolved, value) {
		return "", fmt.Errorf("el OID %q no identifica exactamente el commit resuelto %s", value, resolved)
	}
	return strings.ToLower(resolved), nil
}

func gitHEAD(root string) (string, error) {
	head, err := gitOutput(root, "rev-parse", "--verify", "HEAD^{commit}")
	if err != nil {
		return "", err
	}
	return gitOID(root, head)
}

// entregaIntegrada verifies evidence against one immutable HEAD snapshot.
func entregaIntegrada(root, commit, head string) (bool, string) {
	if strings.TrimSpace(commit) == "" {
		return false, "falta entrega.commit"
	}
	resolved, err := gitOID(root, commit)
	if err != nil {
		return false, fmt.Sprintf("el commit %q no es un OID completo válido del repositorio: %v", commit, err)
	}
	if _, err := gitOID(root, head); err != nil {
		return false, fmt.Sprintf("el HEAD de validación no es un OID completo válido: %v", err)
	}
	cmd := exec.Command("git", "-C", root, "merge-base", "--is-ancestor", resolved, head)
	if out, err := cmd.CombinedOutput(); err != nil {
		if exit, ok := err.(*exec.ExitError); ok && exit.ExitCode() == 1 {
			return false, fmt.Sprintf("el commit %s no es ancestro del HEAD integrado %s", resolved, head)
		}
		detail := strings.TrimSpace(string(out))
		if detail == "" {
			detail = err.Error()
		}
		return false, fmt.Sprintf("no se pudo verificar si %s está integrado en %s: %s", resolved, head, detail)
	}
	return true, ""
}
