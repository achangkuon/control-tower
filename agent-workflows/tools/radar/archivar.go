package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

const archiveDir = "openspec/archive/sesiones/"

func archivePath(id string) string { return archiveDir + id + ".md" }

// sessionSpan locates a top-level YAML sequence item without round-tripping the plan.
// Whitespace and standalone comments after the item belong to the following
// plan content, not its history.
func sessionSpan(raw []byte, id string) (int, int, []byte, error) {
	var doc yaml.Node
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		return 0, 0, nil, err
	}
	if len(doc.Content) != 1 {
		return 0, 0, nil, fmt.Errorf("plan YAML vacío")
	}
	root := doc.Content[0]
	if root.Kind != yaml.MappingNode {
		return 0, 0, nil, fmt.Errorf("plan YAML no es un mapa")
	}
	var sessions *yaml.Node
	endLine := 0
	for i := 0; i < len(root.Content); i += 2 {
		if root.Content[i].Value == "sesiones" {
			sessions = root.Content[i+1]
			if i+2 < len(root.Content) {
				endLine = root.Content[i+2].Line
			}
			break
		}
	}
	if sessions == nil || sessions.Kind != yaml.SequenceNode {
		return 0, 0, nil, fmt.Errorf("no hay lista de sesiones")
	}
	starts := []int{0}
	for i, b := range raw {
		if b == '\n' {
			starts = append(starts, i+1)
		}
	}
	if endLine == 0 {
		endLine = len(starts)
	}
	found := -1
	for i, entry := range sessions.Content {
		if entry.Kind != yaml.MappingNode {
			return 0, 0, nil, fmt.Errorf("sesión no es un mapa")
		}
		for j := 0; j < len(entry.Content); j += 2 {
			if entry.Content[j].Value == "id" && entry.Content[j+1].Value == id {
				if found != -1 {
					return 0, 0, nil, fmt.Errorf("%s aparece más de una vez", id)
				}
				found = i
			}
		}
	}
	if found < 0 {
		return 0, 0, nil, fmt.Errorf("%s no existe en sesiones", id)
	}
	line := sessions.Content[found].Line
	if line < 1 || line > len(starts) {
		return 0, 0, nil, fmt.Errorf("posición de %s inválida", id)
	}
	start := starts[line-1]
	limit := len(raw)
	if found+1 < len(sessions.Content) {
		endLine = sessions.Content[found+1].Line
	}
	if endLine > 0 && endLine <= len(starts) {
		limit = starts[endLine-1]
	}
	if limit < start {
		return 0, 0, nil, fmt.Errorf("límite de %s inválido", id)
	}
	// Preserve trailing blank and standalone comment lines unchanged. Comments
	// nested in the item remain in the block; dedented comments do not.
	end := limit
	for end > start {
		lineStart := bytes.LastIndexByte(raw[start:end-1], '\n') + start + 1
		line := bytes.TrimSpace(raw[lineStart:end])
		if len(line) != 0 && !(bytes.HasPrefix(line, []byte("#")) && !bytes.HasPrefix(raw[lineStart:end], []byte("    "))) {
			break
		}
		end = lineStart
	}
	block := raw[start:end]
	if !bytes.HasPrefix(block, []byte("  - id: "+id+"\n")) || !bytes.HasSuffix(block, []byte("\n")) {
		return 0, 0, nil, fmt.Errorf("%s no es un bloque YAML canónico de sesión", id)
	}
	return start, end, block, nil
}

func archiveSession(planPath, root, id string) error {
	if !sesionID.MatchString(id) {
		return fmt.Errorf("ID inválido: %q", id)
	}
	root, err := canonicalRoot(root)
	if err != nil {
		return err
	}
	planFile, err := exactRepoFile(root, "openspec/plan.yaml")
	if err != nil {
		return err
	}
	if filepath.Clean(planPath) != filepath.Join(root, filepath.FromSlash(planFile)) {
		return fmt.Errorf("archivar sólo admite openspec/plan.yaml en la raíz seleccionada")
	}
	info, err := os.Lstat(planPath)
	if err != nil {
		return err
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("el plan no es un archivo regular")
	}
	raw, err := os.ReadFile(planPath)
	if err != nil {
		return err
	}
	p, err := Load(planPath)
	if err != nil {
		return err
	}
	var target *Sesion
	for i := range p.Sesiones {
		if p.Sesiones[i].ID == id {
			if target != nil {
				return fmt.Errorf("%s está duplicada", id)
			}
			target = &p.Sesiones[i]
		}
	}
	if target == nil {
		return fmt.Errorf("%s no existe", id)
	}
	if target.Historico != "" || target.Archivada {
		return fmt.Errorf("%s ya está archivada", id)
	}
	head, err := gitOutput(root, "rev-parse", "--verify", "refs/heads/master^{commit}")
	if err != nil {
		return fmt.Errorf("no se pudo resolver master: %w", err)
	}
	if target.Entrega == nil {
		return fmt.Errorf("%s no tiene entrega", id)
	}
	if ok, detail := entregaIntegrada(root, target.Entrega.Commit, head); !ok {
		return fmt.Errorf("%s: %s", id, detail)
	}
	if p.EstadosAt(root, head)[id] != Completo {
		return fmt.Errorf("%s no está completa", id)
	}
	start, end, block, err := sessionSpan(raw, id)
	if err != nil {
		return err
	}
	path := archivePath(id)
	if _, err := exactRepoFile(root, path); err != nil {
		return err
	}
	dest := filepath.Join(root, filepath.FromSlash(path))
	if _, err := os.Lstat(dest); err == nil {
		return fmt.Errorf("el histórico %s ya existe", path)
	} else if !os.IsNotExist(err) {
		return err
	}
	archive := append(append([]byte("```yaml\n"), block...), []byte("```\n")...)
	line := []byte(fmt.Sprintf("  - {id: %s, entrega: {commit: %s}, historico: %s}\n", id, target.Entrega.Commit, path))
	updated := make([]byte, 0, len(raw)-len(block)+len(line))
	updated = append(updated, raw[:start]...)
	updated = append(updated, line...)
	updated = append(updated, raw[end:]...)
	if bytes.Equal(updated, raw) {
		return fmt.Errorf("el plan no cambió")
	}
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	// Exclusive publication refuses any concurrent writer. Publish the history
	// before the plan so a failure can never leave a dangling plan reference.
	f, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return err
	}
	created, err := f.Stat()
	if err != nil {
		f.Close()
		return err
	}
	published := false
	defer func() {
		if published {
			return
		}
		// Roll back only our own inode, never a concurrently replaced archive.
		if current, statErr := os.Lstat(dest); statErr == nil && os.SameFile(created, current) {
			_ = os.Remove(dest)
		}
	}()
	if n, writeErr := f.Write(archive); writeErr != nil || n != len(archive) {
		f.Close()
		return fmt.Errorf("no se pudo escribir el histórico completo: %v", writeErr)
	}
	if err = f.Sync(); err != nil {
		f.Close()
		return err
	}
	if err = f.Close(); err != nil {
		return err
	}
	if err = syncDirectory(filepath.Dir(dest)); err != nil {
		return err
	}
	if err := atomicWriteChecked(planPath, updated, info.Mode().Perm(), func() error {
		if _, err := exactRepoFile(root, path); err != nil {
			return err
		}
		currentArchive, err := os.ReadFile(dest)
		if err != nil {
			return err
		}
		if !bytes.Equal(currentArchive, archive) {
			return fmt.Errorf("el histórico cambió mientras se archivaba %s", id)
		}
		if _, err := exactRepoFile(root, "openspec/plan.yaml"); err != nil {
			return err
		}
		current, err := os.ReadFile(planPath)
		if err != nil {
			return err
		}
		if !bytes.Equal(current, raw) {
			return fmt.Errorf("el plan cambió mientras se archivaba %s", id)
		}
		currentMaster, err := gitOutput(root, "rev-parse", "--verify", "refs/heads/master^{commit}")
		if err != nil {
			return err
		}
		if currentMaster != head {
			return fmt.Errorf("master cambió mientras se archivaba %s", id)
		}
		return nil
	}); err != nil {
		// A directory sync may fail after the atomic rename already happened.
		// Keep the historical file whenever the plan now references it.
		if current, readErr := os.ReadFile(planPath); readErr == nil && bytes.Equal(current, updated) {
			published = true
		}
		return err
	}
	published = true
	return nil
}

// A compact reference is not a second executable Session definition.
func validateArchivedReferenceShape(raw []byte) error {
	var doc yaml.Node
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		return err
	}
	if len(doc.Content) != 1 {
		return fmt.Errorf("plan vacío")
	}
	root := doc.Content[0]
	for i := 0; i < len(root.Content); i += 2 {
		if root.Content[i].Value != "sesiones" {
			continue
		}
		for _, item := range root.Content[i+1].Content {
			if item.Kind != yaml.MappingNode {
				continue
			}
			fields := map[string]*yaml.Node{}
			for j := 0; j < len(item.Content); j += 2 {
				fields[item.Content[j].Value] = item.Content[j+1]
			}
			if fields["historico"] == nil {
				continue
			}
			if item.Kind != yaml.MappingNode || len(fields) != 3 || len(item.Content) != 6 || fields["id"] == nil || fields["entrega"] == nil || fields["entrega"].Kind != yaml.MappingNode || len(fields["entrega"].Content) != 2 || fields["entrega"].Content[0].Value != "commit" {
				return fmt.Errorf("referencia histórica debe contener sólo id, entrega.commit e historico")
			}
		}
	}
	return nil
}

// archivedSession reads the exact fenced block; a reference may never redirect
// to another path, supply another ID or replace the delivery evidence.
func archivedSession(root string, ref Sesion) (Sesion, error) {
	if !sesionID.MatchString(ref.ID) || ref.Historico != archivePath(ref.ID) {
		return Sesion{}, fmt.Errorf("referencia histórica de %s inválida", ref.ID)
	}
	if _, err := exactRepoFile(root, ref.Historico); err != nil {
		return Sesion{}, err
	}
	raw, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(ref.Historico)))
	if err != nil {
		return Sesion{}, err
	}
	if !bytes.HasPrefix(raw, []byte("```yaml\n")) || !bytes.HasSuffix(raw, []byte("```\n")) {
		return Sesion{}, fmt.Errorf("histórico %s no contiene el bloque YAML", ref.Historico)
	}
	block := raw[len("```yaml\n") : len(raw)-len("```\n")]
	if !bytes.HasPrefix(block, []byte("  - id: "+ref.ID+"\n")) || !bytes.HasSuffix(block, []byte("\n")) {
		return Sesion{}, fmt.Errorf("histórico %s no contiene la Sesión %s", ref.Historico, ref.ID)
	}
	var sessions []Sesion
	dec := yaml.NewDecoder(strings.NewReader(string(block)))
	dec.KnownFields(true)
	if err := dec.Decode(&sessions); err != nil {
		return Sesion{}, err
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		return Sesion{}, fmt.Errorf("histórico %s contiene otro documento YAML", ref.Historico)
	}
	if len(sessions) != 1 || sessions[0].ID != ref.ID || sessions[0].Entrega == nil || ref.Entrega == nil || sessions[0].Entrega.Commit != ref.Entrega.Commit || sessions[0].Archivada || sessions[0].Historico != "" {
		return Sesion{}, fmt.Errorf("histórico %s no coincide con la referencia", ref.Historico)
	}
	s := sessions[0]
	s.Historico = ref.Historico
	s.Archivada = true
	return s, nil
}
