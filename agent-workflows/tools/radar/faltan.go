package main

import (
	"bytes"
	"fmt"
	"io"
	"sort"
	"strings"
)

// `radar faltan` is a read-only human view over exactly the computed state
// EstadosAt, ColaPorZonaAt and AvanceAt already produce. It adds no field to
// the plan schema and changes no other command: `status`, `sesion`, the JSON
// snapshot and state computation are untouched.
//
// `status` shows the executable queue per Zona and hides everything else —
// closed work, priority-deferred work, and parked work all disappear from
// view together. `faltan` answers the different question a product owner
// asks: what is left to finish each goal, and why isn't a given Sesión
// showing up in the queue.

// metaSinDeclarar groups every open Sesión whose declared `prioridad` does
// not match a `prioridades` entry (or declares none). It is never written to
// the plan; it only appears in the output when such a Sesión actually exists,
// so a plan where every open Sesión has a known priority never grows one.
const metaSinDeclarar = "Sin meta declarada"

// subprioridadFaltan is one sub-category inside a goal: every open Sesión
// whose declared priority shares the same goal and the same sub-priority
// text. Nombre is "" for a priority declared with no sub-priority segment —
// a bare goal, such as `torre-v2` above, with no " · " in its Nombre.
type subprioridadFaltan struct {
	Nombre   string
	Sesiones []*Sesion
}

// metaFaltan is one goal: the leading segment of a declared priority's
// Nombre, before " · ". Avance excludes every Sesión with `diferida: true`
// from both its numerator and denominator (Engram 11432) — a Sesión DIFERIDO
// only because a higher priority is still open keeps counting for its goal.
type metaFaltan struct {
	Nombre string
	Avance Avance
	Subs   []*subprioridadFaltan
}

// metaYSub splits a declared priority's Nombre into (goal, sub-priority) on
// the first " · ". A bare Nombre with no separator is a goal with no
// sub-priority — the sub-priority segment is "".
func metaYSub(nombre string) (string, string) {
	if i := strings.Index(nombre, " · "); i >= 0 {
		return nombre[:i], nombre[i+len(" · "):]
	}
	return nombre, ""
}

// construirFaltan groups every Sesión — open or closed — into its goal for
// the percentage, and every open, non-parked Sesión into its (goal,
// sub-priority) bucket for the listing. Goals and sub-priorities are seeded
// in Prioridades declaration order first, so an empty goal still appears with
// its own "Sin Sesiones abiertas." line instead of silently vanishing.
func construirFaltan(p *Plan, estados map[string]string) []*metaFaltan {
	metaPorNombre := map[string]*metaFaltan{}
	var metas []*metaFaltan

	metaDe := func(nombre string) *metaFaltan {
		m, ok := metaPorNombre[nombre]
		if !ok {
			m = &metaFaltan{Nombre: nombre}
			metaPorNombre[nombre] = m
			metas = append(metas, m)
		}
		return m
	}
	subDe := func(m *metaFaltan, sub string) *subprioridadFaltan {
		for _, s := range m.Subs {
			if s.Nombre == sub {
				return s
			}
		}
		s := &subprioridadFaltan{Nombre: sub}
		m.Subs = append(m.Subs, s)
		return s
	}

	for _, pr := range p.Prioridades {
		meta, sub := metaYSub(pr.Nombre)
		subDe(metaDe(meta), sub)
	}

	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		meta, sub := metaSinDeclarar, ""
		if pr, ok := prioridadDeclarada(p, s.Prioridad); ok {
			meta, sub = metaYSub(pr.Nombre)
		}
		m := metaDe(meta)
		if !s.Diferida {
			m.Avance.Total++
			if estados[s.ID] == Completo || estados[s.ID] == Archivado {
				m.Avance.Cerradas++
			}
		}
		if estados[s.ID] == Completo || estados[s.ID] == Archivado || s.Diferida {
			continue
		}
		sd := subDe(m, sub)
		sd.Sesiones = append(sd.Sesiones, s)
	}

	for _, m := range metas {
		for _, sub := range m.Subs {
			sort.Slice(sub.Sesiones, func(i, j int) bool { return sub.Sesiones[i].ID < sub.Sesiones[j].ID })
		}
	}
	return metas
}

// tieneAbiertas reports whether any sub-priority of m lists an open Sesión.
func tieneAbiertas(m *metaFaltan) bool {
	for _, sub := range m.Subs {
		if len(sub.Sesiones) > 0 {
			return true
		}
	}
	return false
}

// estadoFaltan renames only the DIFERIDO Radar assigns because a higher
// priority is still open — never the explicit `diferida: true` case, which
// never reaches the listing at all (construirFaltan excludes it above).
func estadoFaltan(estados map[string]string, s *Sesion) string {
	if estados[s.ID] == Diferido && !s.Diferida {
		return "espera turno"
	}
	return estados[s.ID]
}

// lineaFaltan is one Sesión inside the grouped listing. A BLOQUEADO Sesión
// reuses resumenBloqueo — the same blocker summary `radar render` writes to
// the ROADMAP's "## Bloqueos" section — so a Sesión never explains its own
// block two different ways.
func lineaFaltan(estados map[string]string, ledgerDecisionRequired map[string]bool, s *Sesion) string {
	estado := estadoFaltan(estados, s)
	if estados[s.ID] == Bloqueado {
		estado = fmt.Sprintf("%s: %s", estado, resumenBloqueo(s, ledgerDecisionRequired[s.ID]))
	}
	return fmt.Sprintf("%s — %s (%s)", s.ID, s.Resultado, estado)
}

// RenderFaltan is the pure convenience boundary for tests and callers that do
// not need a transaction HEAD snapshot; cmdFaltan uses RenderFaltanAt.
func RenderFaltan(p *Plan, root string) []byte {
	head, _ := gitHEAD(root)
	return RenderFaltanAt(p, root, head)
}

func RenderFaltanAt(p *Plan, root, head string) []byte {
	var b bytes.Buffer
	estados := p.EstadosAt(root, head)
	metas := construirFaltan(p, estados)

	fmt.Fprintf(&b, "%s — lo que falta\n\n", p.Producto)

	for _, m := range metas {
		if m.Nombre == metaSinDeclarar && !tieneAbiertas(m) {
			continue
		}
		fmt.Fprintf(&b, "%s: %s\n", m.Nombre, m.Avance)
		huboSesiones := false
		for _, sub := range m.Subs {
			if len(sub.Sesiones) == 0 {
				continue
			}
			huboSesiones = true
			if sub.Nombre == "" {
				for _, s := range sub.Sesiones {
					fmt.Fprintf(&b, "  - %s\n", lineaFaltan(estados, p.ledgerDecisionRequired, s))
				}
				continue
			}
			fmt.Fprintf(&b, "  %s\n", sub.Nombre)
			for _, s := range sub.Sesiones {
				fmt.Fprintf(&b, "    - %s\n", lineaFaltan(estados, p.ledgerDecisionRequired, s))
			}
		}
		if !huboSesiones {
			fmt.Fprintln(&b, "  Sin Sesiones abiertas.")
		}
		fmt.Fprintln(&b)
	}

	totalRestante, listas, apartadas := 0, 0, 0
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if s.Diferida {
			apartadas++
			continue
		}
		st := estados[s.ID]
		if st == Completo || st == Archivado {
			continue
		}
		totalRestante++
		if st == Listo {
			listas++
		}
	}
	fmt.Fprintf(&b, "Faltan %d Sesión(es); %d lista(s) para empezar.\n", totalRestante, listas)
	if apartadas > 0 {
		fmt.Fprintf(&b, "%d Sesión(es) apartada(s) (diferida: true) no cuentan en los porcentajes ni en la lista.\n", apartadas)
	}
	return b.Bytes()
}

// LineaFaltanUno is the one-line locator for `radar faltan <ID>`: goal,
// sub-priority (when declared), Zona, título and estado — the same vocabulary
// as the grouped listing, so a Sesión reads the same way in both.
//
// Format: `<ID> (<meta> › [<subprioridad> ›] <Zona> — <título>, <estado>)`.
// The sub-priority segment is omitted when the declared priority has none.
func LineaFaltanUno(p *Plan, root, head, id string) (string, error) {
	s, ok := p.SesionPorID()[id]
	if !ok {
		return "", fmt.Errorf("la Sesión %s no existe en el plan", id)
	}
	estados := p.EstadosAt(root, head)

	meta, sub := metaSinDeclarar, ""
	if pr, ok := prioridadDeclarada(p, s.Prioridad); ok {
		meta, sub = metaYSub(pr.Nombre)
	}
	zona := s.Zona
	if strings.TrimSpace(zona) == "" {
		zona = "—"
	}

	migajas := meta
	if sub != "" {
		migajas += " › " + sub
	}
	migajas += " › " + zona

	return fmt.Sprintf("%s (%s — %s, %s)", s.ID, migajas, s.Resultado, estadoFaltan(estados, s)), nil
}

func cmdFaltan(w io.Writer, p *Plan, root, id string) error {
	head, err := gitHEAD(root)
	if err != nil {
		return fmt.Errorf("no se pudo fijar HEAD para calcular faltan: %w", err)
	}
	if err := validarAt(p, root, head, "faltan"); err != nil {
		return err
	}
	if id != "" {
		linea, err := LineaFaltanUno(p, root, head, id)
		if err != nil {
			return err
		}
		fmt.Fprintln(w, linea)
		return nil
	}
	_, err = w.Write(RenderFaltanAt(p, root, head))
	return err
}
