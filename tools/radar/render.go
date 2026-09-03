package main

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const avisoGenerado = "<!-- GENERADO por `radar render` desde openspec/plan.yaml. NO EDITAR A MANO. -->"

var headBeforePublish = gitHEAD

func cmdRender(p *Plan, root, output string) error {
	head, err := gitHEAD(root)
	if err != nil {
		return fmt.Errorf("no se pudo fijar HEAD para renderizar: %w", err)
	}
	var errores []string
	for _, h := range p.CheckAt(root, head) {
		if h.Severidad == "error" {
			errores = append(errores, fmt.Sprintf("[%s] %s", h.Regla, h.Detalle))
		}
	}
	if len(errores) > 0 {
		return fmt.Errorf("el plan no se puede renderizar hasta corregir %d error(es): %s", len(errores), strings.Join(errores, "; "))
	}
	destino, err := resolveOutput(root, output)
	if err != nil {
		return err
	}
	raw := RenderAt(p, root, head)
	if err := atomicWriteChecked(destino, raw, 0o644, func() error {
		revalidado, err := resolveOutput(root, output)
		if err != nil {
			return fmt.Errorf("la ruta de salida cambió antes de publicar: %w", err)
		}
		if revalidado != destino {
			return fmt.Errorf("la ruta de salida cambió antes de publicar: era %s y ahora es %s", destino, revalidado)
		}
		actual, err := headBeforePublish(root)
		if err != nil {
			return fmt.Errorf("no se pudo volver a verificar HEAD antes de publicar: %w", err)
		}
		if actual != head {
			return fmt.Errorf("HEAD cambió durante el render: era %s y ahora es %s", head, actual)
		}
		return nil
	}); err != nil {
		return fmt.Errorf("no se pudo escribir %s: %w", destino, err)
	}
	fmt.Printf("✓ %s generado desde openspec/plan.yaml\n", destino)
	return nil
}

// Render is retained as a pure convenience boundary for tests and callers that
// do not publish. Publication uses RenderAt with a transaction HEAD snapshot.
func Render(p *Plan, root string) []byte {
	head, _ := gitHEAD(root)
	return RenderAt(p, root, head)
}

func RenderAt(p *Plan, root, head string) []byte {
	var b bytes.Buffer
	estados := p.EstadosAt(root, head)
	colas := p.ColaPorZonaAt(root, head)
	porZona, total := p.AvanceAt(root, head)
	asientos := p.AsientosAt(root, head)
	index := p.SesionPorID()

	fmt.Fprintln(&b, avisoGenerado)
	fmt.Fprintf(&b, "# Hoja de ruta — %s\n\n", markdownText(p.Producto))
	fmt.Fprintln(&b, "## 📍 Punto de retoma")
	fmt.Fprintf(&b, "- Cierres registrados: %s.\n", cierresRegistrados(p, estados))
	fmt.Fprintf(&b, "- Próximo trabajo ejecutable: %s.\n", proximoTrabajo(p, estados, colas))
	fmt.Fprintf(&b, "- Decisión pendiente: %s.\n\n", primeraDecisionPendiente(p))

	fmt.Fprintln(&b, "## Estado y próximo trabajo")
	ejecutable := trabajoEjecutable(p, estados, colas)
	for _, item := range ejecutable {
		fmt.Fprintf(&b, "- %s\n", item)
	}
	if len(ejecutable) == 0 {
		fmt.Fprintln(&b, "- No hay Sesiones LISTO.")
	}
	fmt.Fprintln(&b)

	fmt.Fprintln(&b, "## Avance")
	fmt.Fprintf(&b, "- **Total:** %s\n", total)
	for _, zid := range zonasOrdenadas(p, colas) {
		fmt.Fprintf(&b, "- **%s:** %s\n", markdownText(nombreZona(p, zid)), porZona[zid])
	}
	fmt.Fprintln(&b)

	fmt.Fprintln(&b, "## Zonas y colas")
	for _, zid := range zonasOrdenadas(p, colas) {
		fmt.Fprintf(&b, "### %s (%s)\n", markdownText(nombreZona(p, zid)), markdownText(zid))
		if len(colas[zid]) == 0 {
			fmt.Fprintln(&b, "- Sin Sesiones abiertas.")
		} else {
			for pos, id := range colas[zid] {
				s := index[id]
				fmt.Fprintf(&b, "%d. **%s** · %s · %s\n", pos+1, markdownText(id), estados[id], markdownText(s.Resultado))
			}
		}
		fmt.Fprintln(&b)
	}

	fmt.Fprintln(&b, "## Bloqueos")
	bloqueos := 0
	for _, s := range p.Sesiones {
		if estados[s.ID] == Bloqueado {
			bloqueos++
			fmt.Fprintf(&b, "- **%s:** %s\n", markdownText(s.ID), markdownText(resumenBloqueo(&s)))
		}
	}
	if bloqueos == 0 {
		fmt.Fprintln(&b, "- Ningún bloqueo derivado.")
	}
	fmt.Fprintln(&b)

	fmt.Fprintln(&b, "## Rutas")
	for _, s := range p.Sesiones {
		fmt.Fprintf(&b, "- **%s:** propuesta %s (%s)", markdownText(s.ID), markdownText(s.Ruta.Propuesta), markdownText(s.Ruta.Autoridad))
		if r := s.Ruta.Revalidacion; r != nil {
			fmt.Fprintf(&b, "; revalidada %s sobre %s con evidencia %s", markdownText(r.Resultado), markdownText(r.Base), markdownText(r.Evidencia))
			if r.Razon != "" {
				fmt.Fprintf(&b, "; razón: %s", markdownText(r.Razon))
			}
		} else {
			fmt.Fprint(&b, "; pendiente de revalidación en kickoff")
		}
		fmt.Fprintln(&b, ".")
	}
	fmt.Fprintln(&b)

	fmt.Fprintln(&b, "## Detalle de Módulos y Tareas")
	for _, s := range p.Sesiones {
		fmt.Fprintf(&b, "### %s — %s\n", markdownText(s.ID), markdownText(s.Resultado))
		fmt.Fprintf(&b, "- Estado derivado: %s\n", estados[s.ID])
		fmt.Fprintf(&b, "- Zona/Área: %s · %s\n", markdownText(s.Zona), markdownList(p.Area(&s)))
		fmt.Fprintf(&b, "- Depende de: %s\n", markdownList(s.DependeDe))
		fmt.Fprintf(&b, "- Cimientos: %s\n", markdownList(s.Cimientos))
		fmt.Fprintf(&b, "- Recursos: %s\n", markdownList(s.Recurso))
		fmt.Fprintln(&b, "- Criterios de aceptación:")
		for _, criterio := range s.Criterios {
			fmt.Fprintf(&b, "  - [ ] %s\n", markdownText(criterio))
		}
		for _, m := range s.Modulos {
			fmt.Fprintf(&b, "\n#### %s — %s\n", markdownText(m.ID), markdownText(m.Resultado))
			fmt.Fprintf(&b, "Rutas: %s\n\n", markdownList(m.Rutas))
			for _, t := range m.Tareas {
				fmt.Fprintf(&b, "- **%s:** %s → %s\n", markdownText(t.ID), markdownText(t.Accion), markdownText(t.Resultado))
				for _, criterio := range t.Criterios {
					fmt.Fprintf(&b, "  - [ ] %s\n", markdownText(criterio))
				}
			}
		}
		fmt.Fprintln(&b)
	}

	fmt.Fprintln(&b, "## Capacidad")
	if len(asientos) == 0 {
		fmt.Fprintln(&b, "0 Zonas compatibles con trabajo LISTO.")
	} else {
		fmt.Fprintf(&b, "%d Zona(s) compatibles con trabajo LISTO: %s.\n", len(asientos), markdownList(asientos))
	}
	fmt.Fprintln(&b, "Este valor es un pronóstico estático. No adquiere locks, no autentica al proceso invocante y no recupera claims stale.")
	return b.Bytes()
}

func markdownText(value string) string {
	value = strings.Join(strings.Fields(value), " ")
	replacer := strings.NewReplacer(
		"&", "&amp;", "<", "&lt;", ">", "&gt;", "|", "&#124;", "`", "&#96;",
		"\\", "&#92;", "*", "&#42;", "_", "&#95;", "[", "&#91;", "]", "&#93;",
		"#", "&#35;", "!", "&#33;",
	)
	return replacer.Replace(value)
}

func zonasOrdenadas(p *Plan, colas map[string][]string) []string {
	set := map[string]bool{}
	for _, z := range p.Zonas {
		set[z.ID] = true
	}
	for z := range colas {
		set[z] = true
	}
	out := make([]string, 0, len(set))
	for z := range set {
		out = append(out, z)
	}
	sort.Strings(out)
	return out
}

func nombreZona(p *Plan, id string) string {
	if z, ok := p.ZonaPorID()[id]; ok && z.Nombre != "" {
		return z.Nombre
	}
	return id
}

func cierresRegistrados(p *Plan, estados map[string]string) string {
	var ids []string
	for _, s := range p.Sesiones {
		if estados[s.ID] == Completo || estados[s.ID] == Archivado {
			ids = append(ids, s.ID)
		}
	}
	if len(ids) == 0 {
		return "ninguno"
	}
	sort.Strings(ids)
	return markdownList(ids)
}

func proximoTrabajo(p *Plan, estados map[string]string, colas map[string][]string) string {
	items := trabajoEjecutable(p, estados, colas)
	if len(items) == 0 {
		return "ninguno"
	}
	return items[0]
}

func trabajoEjecutable(p *Plan, estados map[string]string, colas map[string][]string) []string {
	index := p.SesionPorID()
	var out []string
	for _, zid := range zonasOrdenadas(p, colas) {
		for pos, id := range colas[zid] {
			if estados[id] == Listo {
				out = append(out, fmt.Sprintf("%s #%d → %s — %s", markdownText(nombreZona(p, zid)), pos+1, markdownText(id), markdownText(index[id].Resultado)))
				break
			}
		}
	}
	return out
}

func primeraDecisionPendiente(p *Plan) string {
	for _, s := range p.Sesiones {
		for _, d := range s.Decisiones {
			if d.Tipo == "escala" {
				return fmt.Sprintf("%s — %s", markdownText(s.ID), markdownText(d.Pregunta))
			}
		}
	}
	return "ninguna"
}

func resumenBloqueo(s *Sesion) string {
	if s.Entrega != nil {
		return "evidencia de entrega inválida o no integrada"
	}
	for _, d := range s.Decisiones {
		if d.Tipo == "escala" && (d.Alcanza == "criterios" || d.Alcanza == "primer-modulo") {
			return d.Pregunta
		}
	}
	return "contaminación semántica declarada por otra Sesión"
}

func markdownList(xs []string) string {
	if len(xs) == 0 {
		return "—"
	}
	safe := make([]string, len(xs))
	for i, value := range xs {
		safe[i] = markdownText(value)
	}
	return strings.Join(safe, ", ")
}

func atomicWrite(path string, data []byte, mode os.FileMode) error {
	return atomicWriteChecked(path, data, mode, nil)
}

var syncDirectory = func(path string) error {
	dir, err := os.Open(path)
	if err != nil {
		return err
	}
	defer dir.Close()
	return dir.Sync()
}

func atomicWriteChecked(path string, data []byte, mode os.FileMode, beforePublish func() error) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, ".radar-render-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Chmod(mode); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if beforePublish != nil {
		if err := beforePublish(); err != nil {
			return err
		}
	}
	if err := os.Rename(tmpName, path); err != nil {
		return err
	}
	if err := syncDirectory(dir); err != nil {
		return fmt.Errorf("rename completado pero falló el sync del directorio padre: %w", err)
	}
	return nil
}
