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
func (p *Plan) Estados(root string) map[string]string {
	head, _ := gitHEAD(root)
	return p.EstadosAt(root, head)
}

func (p *Plan) EstadosAt(root, head string) map[string]string {
	return p.estadosAsumiendo(root, head, nil)
}

// EstadosAsumiendoCerradas answers "what would the plan look like if these
// Sesiones were closed" without touching the plan, Git, or real delivery
// evidence. The assumption is a parameter, never a mutation, so a hypothetical
// can never leak into the states every other command reports.
//
// It deliberately shares one body with EstadosAt: a second copy of the
// derivation would be a second answer, and the plan only gets to have one.
// Motivo explains why an open Sesión cannot start; Raices are sorted IDs of
// the earliest actionable blockers at the selected severity.
type Motivo struct {
	Tipo   string   `json:"tipo"`
	Raices []string `json:"raices"`
}

// Motivos is a projection of derived states, never another state machine.
// Missing dependencies outrank decisions, stalled chains and natural waits.
func (p *Plan) Motivos(estados map[string]string) map[string]Motivo {
	index := p.SesionPorID()
	cache := map[string]Motivo{}
	visiting := map[string]int{}
	var walk func(string, []string) Motivo
	walk = func(id string, path []string) Motivo {
		if start, cycle := visiting[id]; cycle {
			roots := append([]string(nil), path[start:]...)
			sort.Strings(roots)
			return Motivo{Tipo: "espera-atascada", Raices: roots}
		}
		if reason, ok := cache[id]; ok {
			return reason
		}
		s, exists := index[id]
		if !exists {
			return Motivo{Tipo: "falta-planificar", Raices: []string{id}}
		}
		var reason Motivo
		switch estados[id] {
		case Bloqueado:
			roots := map[string]bool{}
			if bloqueaAqui(s) || p.ledgerDecisionRequired[id] {
				roots[id] = true
			}
			for _, other := range p.Sesiones {
				for _, d := range other.Decisiones {
					if d.Tipo != "escala" {
						continue
					}
					for _, victim := range d.Contamina {
						if victim == id {
							roots[other.ID] = true
						}
					}
				}
			}
			if len(roots) == 0 {
				reason = Motivo{Tipo: "falta-planificar", Raices: []string{id}}
			} else {
				reason = Motivo{Tipo: "falta-decision"}
				for root := range roots {
					reason.Raices = append(reason.Raices, root)
				}
				sort.Strings(reason.Raices)
			}
		case Listo:
			reason = Motivo{Tipo: "espera-natural", Raices: []string{id}}
		case Planificado:
			visiting[id] = len(path)
			path = append(path, id)
			for _, dep := range s.DependeDe {
				if estados[dep] == Completo || estados[dep] == Archivado {
					continue
				}
				part := walk(dep, path)
				if estados[dep] == Bloqueado {
					part = Motivo{Tipo: "espera-atascada", Raices: []string{dep}}
				}
				if part.Tipo == "" { // A deferred dependency cannot be prepared yet.
					part = Motivo{Tipo: "espera-atascada", Raices: []string{dep}}
				}
				reason = combinarMotivos(reason, part)
			}
			delete(visiting, id)
			if reason.Tipo == "" {
				reason = Motivo{Tipo: "falta-planificar", Raices: []string{id}}
			}
		}
		cache[id] = reason
		return reason
	}
	out := map[string]Motivo{}
	for _, s := range p.Sesiones {
		if estados[s.ID] == Planificado || estados[s.ID] == Bloqueado {
			out[s.ID] = walk(s.ID, nil)
		}
	}
	return out
}

func combinarMotivos(a, b Motivo) Motivo {
	rank := map[string]int{"espera-natural": 1, "espera-atascada": 2, "falta-decision": 3, "falta-planificar": 4}
	if rank[a.Tipo] < rank[b.Tipo] {
		return b
	}
	if rank[a.Tipo] > rank[b.Tipo] {
		return a
	}
	roots := map[string]bool{}
	for _, ids := range [][]string{a.Raices, b.Raices} {
		for _, id := range ids {
			roots[id] = true
		}
	}
	a.Raices = make([]string, 0, len(roots))
	for id := range roots {
		a.Raices = append(a.Raices, id)
	}
	sort.Strings(a.Raices)
	return a
}

func (p *Plan) EstadosAsumiendoCerradas(root, head string, cerradas map[string]bool) map[string]string {
	return p.estadosAsumiendo(root, head, cerradas)
}

func (p *Plan) estadosAsumiendo(root, head string, cerradas map[string]bool) map[string]string {
	estados := make(map[string]string, len(p.Sesiones))
	index := p.SesionPorID()

	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		switch {
		case cerradas[s.ID]:
			estados[s.ID] = Completo
		case s.Archivada:
			estados[s.ID] = Archivado
		case s.Entrega != nil:
			if integrada, _ := entregaIntegrada(root, s.Entrega.Commit, head); integrada {
				estados[s.ID] = Completo
			} else {
				// Invalid or non-integrated evidence is an explicit stop, never
				// runnable work that falls through to LISTO/PLANIFICADO.
				estados[s.ID] = Bloqueado
			}
		case s.Diferida:
			estados[s.ID] = Diferido
		case s.encargoIncompleto():
			estados[s.ID] = Bloqueado
		}
	}

	// Blocking, from this Sesión's own escalating decisions.
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if _, ya := estados[s.ID]; ya {
			continue
		}
		if bloqueaAqui(s) || p.ledgerDecisionRequired[s.ID] {
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
			if !(estados[d.ID] == Completo || d.Archivada) {
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

	p.aplicarPrioridades(estados)
	return estados
}

// aplicarPrioridades is the last pass on purpose. Dependencies unlock only on
// COMPLETO or ARCHIVADO, so turning LISTO into DIFERIDO here cannot change any
// other Sesión's state. Only would-be LISTO work is postponed: a BLOQUEADO
// Sesión keeps showing its blocker while it waits.
func (p *Plan) aplicarPrioridades(estados map[string]string) {
	activa, hay := p.prioridadActiva(estados)
	if !hay {
		return
	}
	orden := p.PrioridadPorID()
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if pos, conocida := orden[s.Prioridad]; conocida && pos > activa && estados[s.ID] == Listo {
			estados[s.ID] = Diferido
		}
	}
}

// prioridadActiva returns the position of the first priority that still has a
// Sesión not COMPLETO or ARCHIVADO. A manually deferred Sesión keeps its priority
// open. Sesiones without a known priority never choose it.
func (p *Plan) prioridadActiva(estados map[string]string) (int, bool) {
	orden := p.PrioridadPorID()
	activa := -1
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		pos, conocida := orden[s.Prioridad]
		if !conocida || estados[s.ID] == Completo || estados[s.ID] == Archivado {
			continue
		}
		if activa == -1 || pos < activa {
			activa = pos
		}
	}
	return activa, activa >= 0
}

// PrioridadActivaAt reports the priority currently offering work, if any.
func (p *Plan) PrioridadActivaAt(root, head string) (Prioridad, bool) {
	pos, hay := p.prioridadActiva(p.EstadosAt(root, head))
	if !hay {
		return Prioridad{}, false
	}
	return p.Prioridades[pos], true
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
		if d.Alcanza == "criterios" || d.Alcanza == "primer-modulo" || d.Alcanza == "encargo" {
			return true
		}
	}
	return false
}

// ColaPorZona returns, for each Zona, its startable and planned Sesiones in
// dependency order. One queue per Zona, never one global queue: a single queue
// mixing Zonas is what made the roadmap unreadable.
func (p *Plan) ColaPorZona(root string) map[string][]string {
	head, _ := gitHEAD(root)
	return p.ColaPorZonaAt(root, head)
}

func (p *Plan) ColaPorZonaAt(root, head string) map[string][]string {
	estados := p.EstadosAt(root, head)
	index := p.SesionPorID()

	porZona := map[string][]*Sesion{}
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if esTerritorioPendiente(s) {
			continue
		}
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

func (p *Plan) Avance(root string) (map[string]Avance, Avance) {
	head, _ := gitHEAD(root)
	return p.AvanceAt(root, head)
}

func (p *Plan) AvanceAt(root, head string) (map[string]Avance, Avance) {
	estados := p.EstadosAt(root, head)
	porZona := map[string]Avance{}
	var total Avance

	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		total.Total++
		cerrada := estados[s.ID] == Completo || estados[s.ID] == Archivado
		if cerrada {
			total.Cerradas++
		}
		if esTerritorioPendiente(s) || esTerritorioHistorico(s) {
			continue
		}
		a := porZona[s.Zona]
		a.Total++
		if cerrada {
			a.Cerradas++
		}
		porZona[s.Zona] = a
	}
	return porZona, total
}

// Asientos forecasts a deterministic compatible set of Zonas with ready work.
// It is static scheduling: the Tower must still acquire and release live claims.
// The first LISTO Sesión in each Zona queue is its candidate; Zona ids break ties.
func (p *Plan) Asientos(root string) []string {
	head, _ := gitHEAD(root)
	return p.AsientosAt(root, head)
}

func (p *Plan) AsientosAt(root, head string) []string {
	estados := p.EstadosAt(root, head)
	index := p.SesionPorID()
	colas := p.ColaPorZonaAt(root, head)

	zonas := make([]string, 0, len(colas))
	for zona := range colas {
		zonas = append(zonas, zona)
	}
	sort.Strings(zonas)

	reservados := map[string]bool{}
	recursos := map[string]bool{}
	var out []string
	for _, zona := range zonas {
		var candidata *Sesion
		for _, id := range colas[zona] {
			if estados[id] == Listo {
				candidata = index[id]
				break
			}
		}
		if candidata == nil || reservaEnConflicto(candidata.Cimientos, reservados) || reservaEnConflicto(candidata.Recurso, recursos) {
			continue
		}
		out = append(out, zona)
		for _, archivo := range candidata.Cimientos {
			reservados[archivo] = true
		}
		for _, recurso := range candidata.Recurso {
			recursos[recurso] = true
		}
	}
	return out
}

func esTerritorioHistorico(s *Sesion) bool {
	return s.ImportacionLegacy != nil && !s.ImportacionLegacy.TerritorioPendiente && s.Zona == "" && (s.Entrega != nil || s.Archivada)
}

func reservaEnConflicto(archivos []string, reservados map[string]bool) bool {
	for _, archivo := range archivos {
		if reservados[archivo] {
			return true
		}
	}
	return false
}
