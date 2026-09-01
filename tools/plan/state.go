package main

import (
	"fmt"
	"sort"
)

// Status is derived, never authored. Convention §9.
const (
	Planificado = "📋 PLANIFICADO"
	Listo       = "🟢 LISTO"
	EnCurso     = "🔵 EN CURSO"
	Bloqueado   = "🔴 BLOQUEADO"
	Diferido    = "🟡 DIFERIDO"
	Completo    = "✅ COMPLETO"
	Archivado   = "📚 ARCHIVADO"
)

// Estados computes every Sesión's state in one pass.
//
// Order matters and encodes the convention:
//
//  1. Terminal states first — a closed Sesión is closed regardless of what its
//     dependencies look like now.
//  2. Then BLOQUEADO, because §14 is explicit that a blocked Sesión is blocked
//     even when its dependencies are met.
//  3. Then LISTO vs PLANIFICADO, from the dependency graph.
//
// EN CURSO is deliberately absent: it is a runtime claim held by an agent, not
// a property of the plan. Asking the plan who is working right now is asking the
// wrong document.
func (p *Plan) Estados() map[string]string {
	estados := make(map[string]string, len(p.Sesiones))
	index := p.SesionPorID()

	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		switch {
		case s.Archivada:
			estados[s.ID] = Archivado
		case s.Entrega != nil:
			estados[s.ID] = Completo
		case s.Diferida:
			estados[s.ID] = Diferido
		}
	}

	// Blocking, from this Sesión's own escalating decisions.
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if _, ya := estados[s.ID]; ya {
			continue
		}
		if bloqueaAqui(s) {
			estados[s.ID] = Bloqueado
		}
	}

	// Blocking declared by someone else's `Contamina:` — the semantic case that
	// is invisible in the graph, the Zona and the Recurso.
	for i := range p.Sesiones {
		for _, d := range p.Sesiones[i].Decisiones {
			if d.Tipo != "escala" {
				continue
			}
			for _, victima := range d.Contamina {
				if st, ya := estados[victima]; ya && (st == Completo || st == Archivado || st == Diferido) {
					continue
				}
				if _, existe := index[victima]; existe {
					estados[victima] = Bloqueado
				}
			}
		}
	}

	// Everything else falls out of the dependency graph.
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if _, ya := estados[s.ID]; ya {
			continue
		}
		listo := true
		for _, dep := range s.DependeDe {
			d, existe := index[dep]
			if !existe {
				listo = false
				break
			}
			if !(d.Entrega != nil || d.Archivada) {
				listo = false
				break
			}
		}
		if listo {
			estados[s.ID] = Listo
		} else {
			estados[s.ID] = Planificado
		}
	}

	return estados
}

// bloqueaAqui reports whether an open decision reaches far enough forward to
// stop the Sesión. Convention §14: escalating is not blocking. A decision that
// lands on a later Módulo leaves the Sesión LISTO with that Módulo marked.
//
// This distinction is the difference between a plan an agent can start and a
// wall of red nobody can begin, which is exactly how the previous model failed.
func bloqueaAqui(s *Sesion) bool {
	for _, d := range s.Decisiones {
		if d.Tipo != "escala" {
			continue
		}
		if d.Alcanza == "criterios" || d.Alcanza == "primer-modulo" {
			return true
		}
	}
	return false
}

// ColaPorZona returns, for each Zona, its startable and planned Sesiones in
// dependency order. One queue per Zona, never one global queue: a single queue
// mixing Zonas is what made the roadmap unreadable.
func (p *Plan) ColaPorZona() map[string][]string {
	estados := p.Estados()
	index := p.SesionPorID()

	porZona := map[string][]*Sesion{}
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		st := estados[s.ID]
		if st == Completo || st == Archivado || st == Diferido {
			continue
		}
		porZona[s.Zona] = append(porZona[s.Zona], s)
	}

	out := map[string][]string{}
	for zona, sesiones := range porZona {
		orden := ordenTopologico(sesiones, index)
		out[zona] = orden
	}
	return out
}

// ordenTopologico sorts within a Zona so a Sesión never precedes what it needs.
// Ties break by id, so the output is stable across runs — an ordering that
// shuffles between runs cannot be read as a queue.
func ordenTopologico(sesiones []*Sesion, index map[string]*Sesion) []string {
	local := map[string]*Sesion{}
	for _, s := range sesiones {
		local[s.ID] = s
	}

	visitado := map[string]int{} // 0 unvisited, 1 in progress, 2 done
	var orden []string

	ids := make([]string, 0, len(local))
	for id := range local {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	var visit func(string)
	visit = func(id string) {
		if visitado[id] != 0 {
			return // done, or a cycle Check already reported
		}
		visitado[id] = 1
		s := local[id]
		deps := append([]string(nil), s.DependeDe...)
		sort.Strings(deps)
		for _, dep := range deps {
			if _, enZona := local[dep]; enZona {
				visit(dep)
			}
		}
		visitado[id] = 2
		orden = append(orden, id)
	}

	for _, id := range ids {
		visit(id)
	}
	return orden
}

// Avance computes the percentage per Zona and in total. Convention §11: the
// denominator is enumerated Sesiones, a Sesión counts only when closed, and the
// fraction always travels with the number.
type Avance struct {
	Cerradas int
	Total    int
}

func (a Avance) String() string {
	if a.Total == 0 {
		return "— (sin Sesiones enumeradas)"
	}
	return fmt.Sprintf("%d%% (%d/%d S)", a.Cerradas*100/a.Total, a.Cerradas, a.Total)
}

func (p *Plan) Avance() (map[string]Avance, Avance) {
	estados := p.Estados()
	porZona := map[string]Avance{}
	var total Avance

	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		a := porZona[s.Zona]
		a.Total++
		total.Total++
		if st := estados[s.ID]; st == Completo || st == Archivado {
			a.Cerradas++
			total.Cerradas++
		}
		porZona[s.Zona] = a
	}
	return porZona, total
}

// Asientos reports how many Zonas have ready work. Convention §13: the seats
// actually opened are min(this, the human's ceiling). The ceiling is never
// raised by an agent, and work is never batched to fill seats.
func (p *Plan) Asientos() []string {
	estados := p.Estados()
	conTrabajo := map[string]bool{}
	for i := range p.Sesiones {
		if estados[p.Sesiones[i].ID] == Listo {
			conTrabajo[p.Sesiones[i].Zona] = true
		}
	}
	var out []string
	for z := range conTrabajo {
		out = append(out, z)
	}
	sort.Strings(out)
	return out
}
