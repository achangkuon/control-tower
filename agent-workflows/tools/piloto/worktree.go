package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

// gitOutput is the single place `piloto` spawns Git.
func gitOutput(root string, args ...string) (string, error) {
	cmdArgs := append([]string{"-C", root}, args...)
	out, err := exec.Command("git", cmdArgs...).CombinedOutput()
	if err != nil {
		detalle := strings.TrimSpace(string(out))
		if detalle == "" {
			detalle = err.Error()
		}
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), detalle)
	}
	return strings.TrimSpace(string(out)), nil
}

func gitRun(root string, args ...string) error {
	_, err := gitOutput(root, args...)
	return err
}

// ramaIntegrada resolves the local integrated branch the same way Radar's gate
// does: refs/remotes/origin/HEAD selects the matching local branch, otherwise a
// single master/main is unambiguous. Two of them are refused, never guessed.
func ramaIntegrada(root string) (string, error) {
	if remoto, err := gitOutput(root, "symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"); err == nil {
		if nombre, ok := strings.CutPrefix(remoto, "refs/remotes/origin/"); ok && nombre != "" && nombre != "HEAD" {
			ref := "refs/heads/" + nombre
			if _, err := gitOutput(root, "rev-parse", "--verify", ref+"^{commit}"); err == nil {
				return ref, nil
			}
		}
	}
	var elegida string
	for _, nombre := range []string{"master", "main"} {
		ref := "refs/heads/" + nombre
		if _, err := gitOutput(root, "rev-parse", "--verify", ref+"^{commit}"); err == nil {
			if elegida != "" {
				return "", fmt.Errorf("ramas locales master y main ambiguas: configurá refs/remotes/origin/HEAD para seleccionar una")
			}
			elegida = ref
		}
	}
	if elegida == "" {
		return "", fmt.Errorf("no hay rama integrada local: creá master o main, o configurá refs/remotes/origin/HEAD")
	}
	return elegida, nil
}

// rutaCopia is the work copy of a flight: <repo-parent>/Worktrees/piloto-<fecha>/vuelo-<id>,
// at the same depth as the main checkout so the repository's own tests still
// find their sibling checkout (S220 D2, section 4).
func rutaCopia(root, fecha, vuelo string) (string, error) {
	if !patronFecha.MatchString(fecha) || !idValido(vuelo) {
		return "", fmt.Errorf("fecha o vuelo inválidos: %q %q", fecha, vuelo)
	}
	padre, err := repoPadre(root)
	if err != nil {
		return "", err
	}
	return filepath.Join(padre, "Worktrees", "piloto-"+fecha, "vuelo-"+vuelo), nil
}

// crearCopia creates the flight branch and its work copy with umask 022. The
// umask is not cosmetic: install.py rejects any mode other than 755 and a
// checkout under umask 002 leaves tracked 100755 files at 775 (S220, section 3).
func crearCopia(root, base, rama, ruta string) error {
	if !filepath.IsAbs(ruta) || filepath.Clean(ruta) != ruta {
		return fmt.Errorf("la copia debe ser una ruta absoluta normalizada: %q", ruta)
	}
	corta, ok := strings.CutPrefix(rama, "refs/heads/")
	if !ok || corta == "" {
		return fmt.Errorf("rama de vuelo inválida: %q", rama)
	}
	if _, err := os.Lstat(ruta); err == nil {
		return fmt.Errorf("la copia %s ya existe", ruta)
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if _, err := gitOutput(root, "show-ref", "--verify", rama); err == nil {
		return fmt.Errorf("la rama %s ya existe", rama)
	}
	previo := syscall.Umask(0o022)
	err := os.MkdirAll(filepath.Dir(ruta), 0o755)
	if err == nil {
		err = gitRun(root, "worktree", "add", "-b", corta, ruta, base)
	}
	syscall.Umask(previo)
	if err != nil {
		// A failed checkout must not leave a half-created branch behind.
		_ = gitRun(root, "branch", "-D", corta)
		return err
	}
	return nil
}

func comandoEn(dir, nombre string, args ...string) error {
	cmd := exec.Command(nombre, args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		detalle := strings.TrimSpace(string(out))
		if detalle == "" {
			detalle = err.Error()
		}
		return fmt.Errorf("%s %s en %s: %s", nombre, strings.Join(args, " "), dir, detalle)
	}
	return nil
}

// prepararCopiaReal is the S220 D4 minimum: bun install when the copy carries a
// package.json. Go shares GOCACHE and Python is stdlib, so neither needs
// anything. S234: `codegraph init` is no longer run — it left .codegraph/ with
// no real index (the agent recreates it on demand), so takeoff gains nothing.
func prepararCopiaReal(ruta string) error {
	if _, err := os.Lstat(filepath.Join(ruta, "package.json")); err == nil {
		if _, err := exec.LookPath("bun"); err != nil {
			return fmt.Errorf("la copia tiene package.json y bun no está instalado: %w", err)
		}
		if err := comandoEn(ruta, "bun", "install"); err != nil {
			return err
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

var prepararCopia = prepararCopiaReal

func trabajoPendiente(ruta string) (bool, error) {
	// S234: .codegraph/ is a tool artifact the agent recreates on demand, never
	// pending work; any other untracked file still blocks the withdrawal.
	out, err := gitOutput(ruta, "status", "--porcelain", ".", ":(exclude).codegraph")
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(out) != "", nil
}

// regenerables are tool artifacts any flight recreates on demand (takeoff runs
// bun install). An ignored path under one of them is never worth keeping.
var regenerables = map[string]bool{
	"node_modules":  true,
	".codegraph":    true,
	"__pycache__":   true,
	".pytest_cache": true,
}

// ignoradosValiosos lists the gitignored paths inside the copy that are not
// regenerable artifacts. `git worktree remove` deletes ignored files without a
// word, and `git status --porcelain` never shows them (#169), so withdrawal has
// to ask for them explicitly. Files are listed one by one: collapsing directories
// would hide that an ignored folder only holds regenerable artifacts.
func ignoradosValiosos(ruta string) ([]string, error) {
	// Not gitOutput: it trims, and trimming a NUL-separated list would rename the
	// first and last paths (" node_modules/x" would pass as regenerable).
	cmd := exec.Command("git", "-C", ruta, "ls-files", "-z", "--others", "--ignored", "--exclude-standard")
	var errBuf strings.Builder
	cmd.Stderr = &errBuf
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("git ls-files --ignored: %s", strings.TrimSpace(errBuf.String()+" "+err.Error()))
	}
	var valiosos []string
	for _, p := range strings.Split(string(out), "\x00") {
		if p == "" {
			continue
		}
		regenerable := false
		for _, parte := range strings.Split(strings.TrimSuffix(p, "/"), "/") {
			if regenerables[parte] {
				regenerable = true
				break
			}
		}
		if !regenerable {
			valiosos = append(valiosos, p)
		}
	}
	return valiosos, nil
}

// retirarCopia removes the work copy and then the branch. Git itself refuses to
// remove a dirty worktree, so a rejection never discards uncommitted work.
func retirarCopia(root, rama, ruta string) error {
	corta, ok := strings.CutPrefix(rama, "refs/heads/")
	if !ok || corta == "" {
		return fmt.Errorf("rama de vuelo inválida: %q", rama)
	}
	if info, err := os.Lstat(ruta); err == nil {
		if !info.IsDir() {
			return fmt.Errorf("la copia %s no es un directorio", ruta)
		}
		if err := gitRun(root, "worktree", "remove", ruta); err != nil {
			return err
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if _, err := gitOutput(root, "show-ref", "--verify", rama); err == nil {
		if err := gitRun(root, "branch", "-D", corta); err != nil {
			return err
		}
	}
	return nil
}

// retirarCopiaForce is the takeoff cleanup path: it removes a copy this same
// command just created, unstaged files included. It is never used for a flight
// that ran.
func retirarCopiaForce(root, rama, ruta string) error {
	corta, ok := strings.CutPrefix(rama, "refs/heads/")
	if !ok || corta == "" {
		return fmt.Errorf("rama de vuelo inválida: %q", rama)
	}
	if info, err := os.Lstat(ruta); err == nil {
		if !info.IsDir() {
			return fmt.Errorf("la copia %s no es un directorio", ruta)
		}
		if err := gitRun(root, "worktree", "remove", "--force", ruta); err != nil {
			return err
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if _, err := gitOutput(root, "show-ref", "--verify", rama); err == nil {
		if err := gitRun(root, "branch", "-D", corta); err != nil {
			return err
		}
	}
	return nil
}

// commitValido verifies an immutable, unabbreviated object identity: the same
// contract Radar enforces before it accepts a cierre mark's commit.
func commitValido(root, commit string) (string, error) {
	if commit == "" || !soloHexadecimal(commit) {
		return "", fmt.Errorf("se requiere un OID completo hexadecimal: %q", commit)
	}
	resuelto, err := gitOutput(root, "rev-parse", "--verify", "--end-of-options", commit+"^{commit}")
	if err != nil {
		return "", err
	}
	if !strings.EqualFold(resuelto, commit) {
		return "", fmt.Errorf("el OID %q no identifica exactamente el commit resuelto %s", commit, resuelto)
	}
	return strings.ToLower(resuelto), nil
}

func soloHexadecimal(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9', r >= 'a' && r <= 'f', r >= 'A' && r <= 'F':
		default:
			return false
		}
	}
	return s != ""
}

// commitEnRama reports whether commit is reachable from rama. Only a completed
// ancestry check answers; every lookup failure is an error, never a "no".
func commitEnRama(root, commit, rama string) (bool, error) {
	resuelto, err := commitValido(root, commit)
	if err != nil {
		return false, err
	}
	ramaOID, err := gitOutput(root, "rev-parse", "--verify", "--end-of-options", rama+"^{commit}")
	if err != nil {
		return false, err
	}
	out, err := exec.Command("git", "-C", root, "merge-base", "--is-ancestor", resuelto, ramaOID).CombinedOutput()
	if err == nil {
		return true, nil
	}
	var exit *exec.ExitError
	if errors.As(err, &exit) && exit.ExitCode() == 1 {
		return false, nil
	}
	return false, fmt.Errorf("no se pudo verificar si %s está en %s: %s", resuelto, rama, strings.TrimSpace(string(out)))
}
