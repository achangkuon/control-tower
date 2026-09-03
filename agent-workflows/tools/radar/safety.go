package main

import (
	"bytes"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
)

func canonicalRoot(root string) (string, error) {
	if strings.TrimSpace(root) == "" {
		return "", fmt.Errorf("la raíz del repositorio está vacía")
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	real, err := filepath.EvalSymlinks(abs)
	if err != nil {
		return "", fmt.Errorf("no se pudo resolver la raíz %s: %w", abs, err)
	}
	info, err := os.Stat(real)
	if err != nil || !info.IsDir() {
		return "", fmt.Errorf("la raíz %s no es un directorio accesible", real)
	}
	return filepath.Clean(real), nil
}

func insideRoot(root, candidate string) bool {
	rel, err := filepath.Rel(root, candidate)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel)
}

// exactRepoFile validates a normalized repository-relative exact file path.
// Existing symlinks and non-regular final targets are rejected; absent final
// targets remain plannable when their existing ancestors are ordinary dirs.
func exactRepoFile(root, value string) (string, error) {
	if value == "" || strings.TrimSpace(value) != value || filepath.IsAbs(value) || strings.Contains(value, `\`) {
		return "", fmt.Errorf("%q no es una ruta relativa exacta normalizada", value)
	}
	if path.Clean(value) != value || value == "." || strings.ContainsAny(value, "*?[") {
		return "", fmt.Errorf("%q debe nombrar un archivo exacto, sin patrones, directorios ni ..", value)
	}
	for _, part := range strings.Split(value, "/") {
		if part == "" || part == "." || part == ".." {
			return "", fmt.Errorf("%q contiene componentes vacíos o no normalizados", value)
		}
	}
	base, err := canonicalRoot(root)
	if err != nil {
		return "", err
	}
	candidate := filepath.Join(base, filepath.FromSlash(value))
	if !insideRoot(base, candidate) {
		return "", fmt.Errorf("%q escapa de la raíz del repositorio", value)
	}
	current := base
	parts := strings.Split(value, "/")
	for i, part := range parts {
		current = filepath.Join(current, part)
		info, err := os.Lstat(current)
		if os.IsNotExist(err) {
			break
		}
		if err != nil {
			return "", fmt.Errorf("no se pudo inspeccionar %q: %w", value, err)
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return "", fmt.Errorf("%q atraviesa un enlace simbólico", value)
		}
		if i < len(parts)-1 && !info.IsDir() {
			return "", fmt.Errorf("%q atraviesa un componente que no es directorio", value)
		}
		if i == len(parts)-1 && !info.Mode().IsRegular() {
			return "", fmt.Errorf("%q no es un archivo regular", value)
		}
	}
	return filepath.ToSlash(value), nil
}

func resolveOutput(root, output string) (string, error) {
	base, err := canonicalRoot(root)
	if err != nil {
		return "", err
	}
	candidate := output
	if !filepath.IsAbs(candidate) {
		candidate = filepath.Join(base, candidate)
	}
	candidate = filepath.Clean(candidate)
	if !insideRoot(base, candidate) || candidate == base {
		return "", fmt.Errorf("la salida %q debe permanecer dentro de %s", output, base)
	}
	rel, err := filepath.Rel(base, candidate)
	if err != nil {
		return "", err
	}
	if _, err := exactRepoFile(base, filepath.ToSlash(rel)); err != nil {
		return "", fmt.Errorf("salida insegura: %w", err)
	}
	if info, err := os.Lstat(candidate); err == nil && info.Mode().IsRegular() {
		file, err := os.Open(candidate)
		if err != nil {
			return "", fmt.Errorf("no se pudo verificar el destino existente: %w", err)
		}
		prefix := make([]byte, len(avisoGenerado))
		n, readErr := file.Read(prefix)
		closeErr := file.Close()
		if readErr != nil && n == 0 {
			return "", fmt.Errorf("no se pudo verificar la autoría del destino existente: %w", readErr)
		}
		if closeErr != nil {
			return "", fmt.Errorf("no se pudo cerrar el destino durante la verificación: %w", closeErr)
		}
		if n != len(prefix) || !bytes.Equal(prefix, []byte(avisoGenerado)) {
			return "", fmt.Errorf("se rechaza sobrescribir %s: no es una vista generada por radar", candidate)
		}
	}
	return candidate, nil
}
