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

// canonicalPlanPath resolves planPath the same way canonicalRoot resolves a
// root: absolute, symlink-free, cleaned. A relative planPath (the CLI default
// `-f openspec/plan.yaml` stays relative even under `-C .`) must canonicalize
// to the same bytes as an equivalent absolute one, or the safety comparison
// below rejects every relative invocation regardless of the actual file.
func canonicalPlanPath(planPath string) (string, error) {
	abs, err := filepath.Abs(planPath)
	if err != nil {
		return "", err
	}
	real, err := filepath.EvalSymlinks(abs)
	if err != nil {
		return "", fmt.Errorf("no se pudo resolver el plan %s: %w", abs, err)
	}
	return filepath.Clean(real), nil
}

// lineageFindings reuses checkLinaje/checkGrafo rather than re-deriving a
// narrower archivar-only lineage rule that could drift from what `radar
// check` actually enforces.
func lineageFindings(p *Plan) []Hallazgo {
	var h []Hallazgo
	for _, f := range append(p.checkLinaje(), p.checkGrafo()...) {
		if f.Severidad == "error" {
			h = append(h, f)
		}
	}
	return h
}

// archivingWouldInvalidateLineage simulates archiving id and reports the first
// lineage error that only appears afterward — e.g. the target itself declares
// `reemplaza` (checkLinaje: "declara reemplazos pero está archivada"), or some
// other active Sesión still depends directly on id while an active successor
// already replaces it (checkGrafo: "dependencias reemplazadas"). Refusing here
// keeps the plan valid; archivar never writes a Session into a state `radar
// check` would immediately reject.
func archivingWouldInvalidateLineage(p *Plan, id string) *Hallazgo {
	before := map[Hallazgo]bool{}
	for _, f := range lineageFindings(p) {
		before[f] = true
	}
	simulated := *p
	simulated.Sesiones = append([]Sesion(nil), p.Sesiones...)
	for i := range simulated.Sesiones {
		if simulated.Sesiones[i].ID == id {
			simulated.Sesiones[i].Archivada = true
		}
	}
	for _, f := range lineageFindings(&simulated) {
		if !before[f] {
			f := f
			return &f
		}
	}
	return nil
}

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

// cierreOptions selects the closure shape. With an empty commit,
// `archiveSession` keeps its historical behavior: archive an already-registered
// delivery and stop. A commit turns the call into the one-command closure that
// registers, archives, checks and renders, rolling everything back on failure.
type cierreOptions struct {
	commit string
	render string
}

func archiveSession(planPath, root, id string) error {
	return archiveSessionCierre(planPath, root, id, cierreOptions{})
}

func archiveSessionCierre(planPath, root, id string, opts cierreOptions) error {
	// IDs are permanent and never renumbered (canon), so a legacy dotted Session
	// (S1.11) is as archivable as a plain one; legacySesionID is a strict
	// superset of sesionID and accepts both.
	if !legacySesionID.MatchString(id) {
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
	// planPath may arrive relative (e.g. `-C .` leaves the default `-f` relative
	// too): canonicalize before comparing against the canonical root join, the
	// same way canonicalRoot already does for root itself.
	canonicalPlanPath, err := canonicalPlanPath(planPath)
	if err != nil {
		return err
	}
	if canonicalPlanPath != filepath.Join(root, filepath.FromSlash(planFile)) {
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
	integratedRef, head, err := integratedLocalBranch(root)
	if err != nil {
		return fmt.Errorf("no se pudo resolver la rama integrada: %w", err)
	}
	if opts.commit != "" {
		resolved, err := gitOID(root, opts.commit)
		if err != nil {
			return fmt.Errorf("validar el commit de %s: %w", id, err)
		}
		if target.Entrega == nil {
			target.Entrega = &Entrega{}
		}
		target.Entrega.Commit = resolved
	}
	if target.Entrega == nil {
		return fmt.Errorf("%s no tiene entrega registrada: cerrá con `radar archivar %s --commit <oid completo>` o declarala en plan.yaml", id, id)
	}
	if ok, detail := entregaIntegrada(root, target.Entrega.Commit, head); !ok {
		return fmt.Errorf("%s: %s", id, detail)
	}
	if p.EstadosAt(root, head)[id] != Completo {
		return fmt.Errorf("%s no está completa", id)
	}
	if h := archivingWouldInvalidateLineage(p, id); h != nil {
		return fmt.Errorf("%s: archivar dejaría el plan inválido (%s): %s", id, h.Regla, h.Detalle)
	}
	start, end, block, err := sessionSpan(raw, id)
	if err != nil {
		return err
	}
	// The historical record must carry the same delivery as the compact
	// reference: `archivedSession` re-derives the Session from the fenced block
	// and refuses when the two disagree. With --commit the block may not have an
	// entrega yet, so it is written into the record too.
	if opts.commit != "" {
		block, err = bloqueConEntrega(block, id, target.Entrega.Commit)
		if err != nil {
			return err
		}
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
	updated := make([]byte, 0, len(raw)+len(line))
	updated = append(updated, raw[:start]...)
	updated = append(updated, line...)
	updated = append(updated, raw[end:]...)
	if bytes.Equal(updated, raw) {
		return fmt.Errorf("el plan no cambió")
	}
	// With --commit the closure touches three files. Resolve and snapshot the
	// rendered view up front, so a rejected check or render restores the exact
	// prior state instead of leaving a half-closed Session.
	render := opts.render
	if render == "" {
		render = "openspec/ROADMAP.md"
	}
	var (
		renderPath    string
		roadmapRaw    []byte
		roadmapMode   os.FileMode
		roadmapExists bool
	)
	if opts.commit != "" {
		renderPath, err = resolveOutput(root, render)
		if err != nil {
			return fmt.Errorf("render de %s: %w", id, err)
		}
		if fi, statErr := os.Lstat(renderPath); statErr == nil {
			if !fi.Mode().IsRegular() {
				return fmt.Errorf("render de %s: %s no es un archivo regular", id, renderPath)
			}
			roadmapMode = fi.Mode().Perm()
			roadmapExists = true
			if roadmapRaw, err = os.ReadFile(renderPath); err != nil {
				return fmt.Errorf("render de %s: no se pudo leer %s: %w", id, renderPath, err)
			}
		} else if !os.IsNotExist(statErr) {
			return fmt.Errorf("render de %s: no se pudo inspeccionar %s: %w", id, renderPath, statErr)
		}
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
		currentRef, currentHead, err := integratedLocalBranch(root)
		if err != nil {
			return err
		}
		if currentRef != integratedRef || currentHead != head {
			return fmt.Errorf("la rama integrada cambió mientras se archivaba %s", id)
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
	if opts.commit == "" {
		return nil
	}
	// The in-memory plan still holds the full Session. Mark it archived so
	// check and render see the closure the compact reference now describes.
	for i := range p.Sesiones {
		if p.Sesiones[i].ID == id {
			p.Sesiones[i].Archivada = true
			p.Sesiones[i].Historico = archivePath(id)
		}
	}
	rollback := func() {
		_ = atomicWrite(planPath, raw, info.Mode().Perm())
		if current, statErr := os.Lstat(dest); statErr == nil && os.SameFile(created, current) {
			_ = os.Remove(dest)
		}
		if roadmapExists {
			_ = atomicWrite(renderPath, roadmapRaw, roadmapMode)
		} else {
			_ = os.Remove(renderPath)
		}
	}
	if err := checkArchivado(p, root, id); err != nil {
		rollback()
		return err
	}
	if err := cmdRender(p, root, renderPath); err != nil {
		rollback()
		return fmt.Errorf("render de %s: %w", id, err)
	}
	return nil
}

// checkArchivado mirrors `radar check`'s exit rule: only error-severity
// findings gate the closure, and the refusal names the failed step.
func checkArchivado(p *Plan, root, id string) error {
	var errores []string
	for _, h := range append(p.Check(root), p.avisosDeTrailers(root)...) {
		if h.Severidad == "error" {
			errores = append(errores, fmt.Sprintf("[%s] %s", h.Regla, h.Detalle))
		}
	}
	if len(errores) > 0 {
		return fmt.Errorf("check de %s falló tras archivar (%d error(es)): %s", id, len(errores), strings.Join(errores, "; "))
	}
	return nil
}

// bloqueConEntrega returns the canonical session block with `entrega.commit`
// set, preserving every other field. Commit mode must write the delivery into
// the historical record too: the compact reference only carries the commit and
// `archivedSession` requires both to agree.
func bloqueConEntrega(block []byte, id, commit string) ([]byte, error) {
	var doc yaml.Node
	if err := yaml.Unmarshal(desindentarBloque(block), &doc); err != nil {
		return nil, fmt.Errorf("no se pudo reinterpretar el bloque de %s: %w", id, err)
	}
	if len(doc.Content) != 1 || doc.Content[0].Kind != yaml.SequenceNode || len(doc.Content[0].Content) != 1 || doc.Content[0].Content[0].Kind != yaml.MappingNode {
		return nil, fmt.Errorf("el bloque de %s no es una Sesión canónica", id)
	}
	setEntregaCommit(doc.Content[0].Content[0], commit)
	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	if err := enc.Encode(&doc); err != nil {
		return nil, fmt.Errorf("no se pudo reescribir el bloque de %s: %w", id, err)
	}
	if err := enc.Close(); err != nil {
		return nil, err
	}
	return sangrarBloque(buf.Bytes()), nil
}

// desindentarBloque removes the two leading spaces that make the block a
// sequence item nested under `sesiones:`.
func desindentarBloque(block []byte) []byte {
	var b strings.Builder
	for _, line := range strings.SplitAfter(string(block), "\n") {
		b.WriteString(strings.TrimPrefix(line, "  "))
	}
	return []byte(b.String())
}

// sangrarBloque restores the two-space nesting of a session block.
func sangrarBloque(block []byte) []byte {
	var b strings.Builder
	for _, line := range strings.SplitAfter(string(block), "\n") {
		switch {
		case line == "":
			continue
		case strings.TrimSpace(strings.TrimSuffix(line, "\n")) == "":
			b.WriteString(line)
		default:
			b.WriteString("  ")
			b.WriteString(line)
		}
	}
	return []byte(b.String())
}

func nodoEscalar(value string) *yaml.Node {
	return &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: value}
}

// setEntregaCommit sets or inserts `commit` inside the item's `entrega` mapping.
func setEntregaCommit(item *yaml.Node, commit string) {
	for i := 0; i+1 < len(item.Content); i += 2 {
		if item.Content[i].Value != "entrega" {
			continue
		}
		if entrega := item.Content[i+1]; entrega.Kind == yaml.MappingNode {
			for j := 0; j+1 < len(entrega.Content); j += 2 {
				if entrega.Content[j].Value == "commit" {
					entrega.Content[j+1].SetString(commit)
					return
				}
			}
			entrega.Content = append([]*yaml.Node{nodoEscalar("commit"), nodoEscalar(commit)}, entrega.Content...)
			return
		}
		item.Content[i+1] = &yaml.Node{Kind: yaml.MappingNode, Tag: "!!map", Content: []*yaml.Node{nodoEscalar("commit"), nodoEscalar(commit)}}
		return
	}
	item.Content = append(item.Content, nodoEscalar("entrega"), &yaml.Node{Kind: yaml.MappingNode, Tag: "!!map", Content: []*yaml.Node{nodoEscalar("commit"), nodoEscalar(commit)}})
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
	if !legacySesionID.MatchString(ref.ID) || ref.Historico != archivePath(ref.ID) {
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
