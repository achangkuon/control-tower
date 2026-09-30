package main

import (
	"fmt"
	"os/exec"
	"regexp"
	"strings"
	"sync"
)

var hexadecimal = regexp.MustCompile(`^[0-9a-fA-F]+$`)

// gitCommand is the single place Radar spawns git, so a test can count processes.
var gitCommand = func(args ...string) *exec.Cmd { return exec.Command("git", args...) }

func gitOutput(root string, args ...string) (string, error) {
	cmdArgs := append([]string{"-C", root}, args...)
	out, err := gitCommand(cmdArgs...).CombinedOutput()
	if err != nil {
		detail := strings.TrimSpace(string(out))
		if detail == "" {
			detail = err.Error()
		}
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), detail)
	}
	return strings.TrimSpace(string(out)), nil
}

// formatosDeObjetos remembers each repository's object format: it is fixed at
// init, and gitOID asks for it on every verification.
var formatosDeObjetos sync.Map

func gitObjectFormat(root string) (string, int, error) {
	format, err := formatoDeObjetos(root)
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

func formatoDeObjetos(root string) (string, error) {
	if format, hay := formatosDeObjetos.Load(root); hay {
		return format.(string), nil
	}
	format, err := gitOutput(root, "rev-parse", "--show-object-format=storage")
	if err != nil {
		return "", err
	}
	formatosDeObjetos.Store(root, format)
	return format, nil
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

// integratedLocalBranch resolves the local integrated ref and its immutable
// commit. A valid origin/HEAD selects the matching local branch; absent that
// authority, only a single local master/main is unambiguous.
func integratedLocalBranch(root string) (string, string, error) {
	resolve := func(ref string) (string, error) {
		oid, err := gitOutput(root, "rev-parse", "--verify", "--end-of-options", ref+"^{commit}")
		if err != nil {
			return "", err
		}
		return gitOID(root, oid)
	}
	remote, err := gitOutput(root, "symbolic-ref", "--quiet", "refs/remotes/origin/HEAD")
	if err == nil {
		if name, ok := strings.CutPrefix(remote, "refs/remotes/origin/"); ok && name != "" && name != "HEAD" {
			ref := "refs/heads/" + name
			if oid, err := resolve(ref); err == nil {
				return ref, oid, nil
			}
		}
	}
	var selectedRef, selectedOID string
	for _, name := range []string{"master", "main"} {
		ref := "refs/heads/" + name
		if oid, err := resolve(ref); err == nil {
			if selectedRef != "" {
				return "", "", fmt.Errorf("ramas locales master y main ambiguas: configurá refs/remotes/origin/HEAD para seleccionar una rama local")
			}
			selectedRef, selectedOID = ref, oid
		}
	}
	if selectedRef == "" {
		return "", "", fmt.Errorf("no hay rama integrada local: creá refs/heads/main o refs/heads/master, o configurá refs/remotes/origin/HEAD hacia una rama local existente")
	}
	return selectedRef, selectedOID, nil
}

type integracion struct {
	integrada bool
	detalle   string
}

// integraciones remembers definitive ancestry answers. Both ends are full OIDs,
// so the answer never changes; a projection asks it once per hypothetical
// scenario, which spawned thousands of identical git processes. Lookup errors
// are never remembered, so a transient failure is always asked again.
var integraciones sync.Map

// entregaIntegrada verifies evidence against one immutable HEAD snapshot.
func entregaIntegrada(root, commit, head string) (bool, string) {
	clave := root + "\x00" + commit + "\x00" + head
	if previa, hay := integraciones.Load(clave); hay {
		r := previa.(integracion)
		return r.integrada, r.detalle
	}
	integrada, detalle, definitiva := verificarIntegracion(root, commit, head)
	if definitiva {
		integraciones.Store(clave, integracion{integrada, detalle})
	}
	return integrada, detalle
}

// verificarIntegracion reports whether its answer is definitive: only a
// completed ancestry check is, every lookup failure is not.
func verificarIntegracion(root, commit, head string) (bool, string, bool) {
	if strings.TrimSpace(commit) == "" {
		return false, "falta entrega.commit", true
	}
	resolved, err := gitOID(root, commit)
	if err != nil {
		return false, fmt.Sprintf("el commit %q no es un OID completo válido del repositorio: %v", commit, err), false
	}
	if _, err := gitOID(root, head); err != nil {
		return false, fmt.Sprintf("el HEAD de validación no es un OID completo válido: %v", err), false
	}
	cmd := gitCommand("-C", root, "merge-base", "--is-ancestor", resolved, head)
	if out, err := cmd.CombinedOutput(); err != nil {
		if exit, ok := err.(*exec.ExitError); ok && exit.ExitCode() == 1 {
			return false, fmt.Sprintf("el commit %s no es ancestro del HEAD integrado %s", resolved, head), true
		}
		detail := strings.TrimSpace(string(out))
		if detail == "" {
			detail = err.Error()
		}
		return false, fmt.Sprintf("no se pudo verificar si %s está integrado en %s: %s", resolved, head, detail), false
	}
	return true, "", true
}
