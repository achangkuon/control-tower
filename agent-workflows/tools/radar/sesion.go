package main

import (
	"fmt"
	"io"
	"strings"
)

// cmdSesion prints the complete contract of exactly one Sesión, so an agent reads
// the work it was handed instead of the whole plan. It refuses exactly where
// `radar status` refuses: a computed state only exists over a valid plan.
func cmdSesion(w io.Writer, p *Plan, root, id string) error {
	head, err := gitHEAD(root)
	if err != nil {
		return fmt.Errorf("no se pudo fijar HEAD para calcular sesion: %w", err)
	}
	if err := validarAt(p, root, head, "sesion"); err != nil {
		return err
	}
	s, ok := p.SesionPorID()[id]
	if !ok {
		for _, r := range referenceRows(p) {
			if r.ID == id {
				return fmt.Errorf("%s es una referencia no ejecutable (%s): no tiene contrato de Sesión", id, r.Kind)
			}
		}
		return fmt.Errorf("la Sesión %s no existe en el plan", id)
	}
	entregados, _, err := p.AvanceModulosAt(root, head)
	if err != nil {
		return fmt.Errorf("no se pudo leer el avance de Módulos: %w", err)
	}
	escribirSesionConAvance(w, p, s, p.EstadosAt(root, head), entregados)
	return nil
}

// escribirSesion writes one Sesión's contract without Módulo progress.
func escribirSesion(w io.Writer, p *Plan, s *Sesion, estados map[string]string) {
	escribirSesionConAvance(w, p, s, estados, nil)
}

// escribirSesionConAvance writes one Sesión's contract. Other Sesiones appear only
// as dependency IDs next to their computed state. A non-nil entregados marks each
// Módulo delivered or pending and names the Módulo to resume from.
func escribirSesionConAvance(w io.Writer, p *Plan, s *Sesion, estados map[string]string, entregados map[string]string) {
	fmt.Fprintf(w, "%s — %s\n", s.ID, s.Resultado)
	fmt.Fprintf(w, "Estado: %s\n", estados[s.ID])
	area := p.Area(s)
	if s.Zona == "cimientos" {
		// A cimientos Sesión owns no Zona: its exact reservations are its whole territory.
		area = s.Cimientos
	}
	fmt.Fprintf(w, "Zona: %s · Área: %s\n", s.Zona, listaTexto(area))
	if pr, ok := prioridadDeclarada(p, s.Prioridad); ok {
		fmt.Fprintf(w, "Prioridad: %s\n", pr.Etiqueta())
	}
	fmt.Fprintf(w, "Autoridad: %s\n", autoridadTexto(s.Autoridad))
	deps := make([]string, 0, len(s.DependeDe))
	for _, d := range s.DependeDe {
		estado := estados[d]
		if estado == "" {
			estado = "sin estado"
		}
		deps = append(deps, fmt.Sprintf("%s (%s)", d, estado))
	}
	fmt.Fprintf(w, "Depende de: %s\n", listaTexto(deps))
	fmt.Fprintf(w, "Cimientos: %s\n", listaTexto(s.Cimientos))
	fmt.Fprintf(w, "Recurso: %s\n", listaTexto(s.Recurso))
	fmt.Fprintf(w, "Ruta: propuesta %s (%s)", s.Ruta.Propuesta, s.Ruta.Autoridad)
	if r := s.Ruta.Revalidacion; r != nil {
		fmt.Fprintf(w, "; revalidada %s sobre %s: %s", r.Resultado, r.Base, r.Evidencia)
		if r.Razon != "" {
			fmt.Fprintf(w, "; razón: %s", r.Razon)
		}
	}
	fmt.Fprintln(w)
	if s.Entrega != nil {
		fmt.Fprintf(w, "Entrega: %s\n", s.Entrega.Commit)
	}

	fmt.Fprintln(w, "\nCriterios:")
	for _, c := range s.Criterios {
		fmt.Fprintf(w, "  - %s\n", c)
	}

	fmt.Fprintln(w, "\nDecisiones:")
	if len(s.Decisiones) == 0 {
		fmt.Fprintln(w, "  —")
	}
	for _, d := range s.Decisiones {
		fmt.Fprintf(w, "  - [%s · %s] %s\n", d.Tipo, d.Clase, d.Pregunta)
		for _, campo := range [][2]string{
			{"Resolución", d.Resolucion}, {"Criterio", d.Criterio}, {"Autoridad", d.Autoridad},
			{"Evidencia", d.Evidencia}, {"Checkpoint", d.Checkpoint}, {"Alcanza", d.Alcanza},
			{"Falsificador", d.Falsificador},
		} {
			if campo[1] != "" {
				fmt.Fprintf(w, "    %s: %s\n", campo[0], campo[1])
			}
		}
		if len(d.Contamina) > 0 {
			fmt.Fprintf(w, "    Contamina: %s\n", listaTexto(d.Contamina))
		}
		for _, o := range d.Opciones {
			fmt.Fprintf(w, "    Opción: %s → %s\n", o.Opcion, o.Consecuencia)
		}
		for _, x := range d.Descartadas {
			fmt.Fprintf(w, "    Descartada: %s → %s\n", x.Opcion, x.Razon)
		}
	}

	fmt.Fprintln(w, "\nMódulos:")
	if len(s.Modulos) == 0 {
		fmt.Fprintln(w, "  —")
	}
	primerPendiente := ""
	for _, m := range s.Modulos {
		marca := ""
		if entregados != nil {
			if commit, ok := entregados[m.ID]; ok {
				marca = " · entregado " + abreviarCommit(commit)
			} else {
				marca = " · pendiente"
				if primerPendiente == "" {
					primerPendiente = m.ID
				}
			}
		}
		fmt.Fprintf(w, "  %s — %s%s\n", m.ID, m.Resultado, marca)
		fmt.Fprintf(w, "    Rutas: %s\n", listaTexto(m.Rutas))
		for _, t := range m.Tareas {
			fmt.Fprintf(w, "    - %s: %s → %s\n", t.ID, t.Accion, t.Resultado)
			for _, c := range t.Criterios {
				if c != t.Resultado {
					fmt.Fprintf(w, "        · %s\n", c)
				}
			}
		}
	}
	if entregados != nil && len(s.Modulos) > 0 {
		if primerPendiente == "" {
			primerPendiente = "— (todos los Módulos entregados)"
		}
		fmt.Fprintf(w, "\nRetomar desde: %s\n", primerPendiente)
	}
}

// prioridadDeclarada resolves a Sesión's priority only when the plan declares it,
// so every text surface stays byte-identical for plans without priorities.
func prioridadDeclarada(p *Plan, id string) (Prioridad, bool) {
	if pos, ok := p.PrioridadPorID()[id]; ok {
		return p.Prioridades[pos], true
	}
	return Prioridad{}, false
}

// Etiqueta names a priority for text surfaces as "Nombre (id)".
func (pr Prioridad) Etiqueta() string {
	return fmt.Sprintf("%s (%s)", pr.Nombre, pr.ID)
}

func abreviarCommit(commit string) string {
	if len(commit) > 12 {
		return commit[:12]
	}
	return commit
}

func autoridadTexto(a Autoridad) string {
	if !a.Tipada() {
		return a.Texto
	}
	partes := make([]string, 0, len(a.Citas))
	for _, c := range a.Citas {
		switch c.Tipo {
		case "decision":
			partes = append(partes, fmt.Sprintf("decision %d · %s", c.Ref, locatorProvenance(c.Loc)))
		case "engram":
			partes = append(partes, fmt.Sprintf("engram #%d", c.ID))
		case "repo":
			partes = append(partes, "repo · "+locatorProvenance(c.Loc))
		default:
			partes = append(partes, c.Tipo)
		}
	}
	return strings.Join(partes, "; ")
}

func listaTexto(items []string) string {
	if len(items) == 0 {
		return "—"
	}
	return strings.Join(items, ", ")
}
