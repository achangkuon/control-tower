package main

import (
	"fmt"
	"sort"
	"strings"
)

// trailerDeModulo is the commit trailer that records which Módulo a commit delivers.
const trailerDeModulo = "Modulo"

// AvanceModulosAt reads `Modulo:` trailers from the commits reachable from head.
// It returns every plan Módulo delivered, with the newest commit that names it,
// and the trailer values that name no Módulo of the plan. Git is the evidence:
// the plan is never written per Módulo, and a commit outside head never counts.
func (p *Plan) AvanceModulosAt(root, head string) (map[string]string, []string, error) {
	formato := "--format=%H%x1f%(trailers:key=" + trailerDeModulo + ",valueonly,separator=%x1f)%x1e"
	out, err := gitOutput(root, "log", formato, head)
	if err != nil {
		return nil, nil, err
	}
	conocidos := map[string]bool{}
	for _, s := range p.Sesiones {
		for _, m := range s.Modulos {
			conocidos[m.ID] = true
		}
	}
	entregados := map[string]string{}
	vistos := map[string]bool{}
	var desconocidos []string
	for _, registro := range strings.Split(out, "\x1e") {
		campos := strings.Split(strings.TrimSpace(registro), "\x1f")
		for _, valor := range campos[1:] {
			id := strings.TrimSpace(valor)
			switch {
			case id == "":
			case conocidos[id] || p.trailerPerteneceAFullSDD(id):
				if _, ya := entregados[id]; !ya {
					entregados[id] = campos[0]
				}
			case !vistos[id]:
				vistos[id] = true
				desconocidos = append(desconocidos, id)
			}
		}
	}
	sort.Strings(desconocidos)
	return entregados, desconocidos, nil
}

// trailerPerteneceAFullSDD reports whether a valid Módulo trailer belongs to an
// existing Sesión that effectively runs the native SDD route. Full SDD owns no
// planned Módulos, so its committed Módulo trailers are its delivery evidence.
func (p *Plan) trailerPerteneceAFullSDD(id string) bool {
	if !legacyModuloID.MatchString(id) {
		return false
	}
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		prefijo := "M" + strings.TrimPrefix(s.ID, "S") + "."
		if s.RutaEfectiva() == RutaSDDNativa && strings.HasPrefix(id, prefijo) {
			return true
		}
	}
	return false
}

// modulosEntregados counts delivery evidence for one Sesión. Direct and
// design-tasks Sesiones count their declared Módulos; full-sdd counts trailers
// owned by its Session ID because it has no planned Módulos to enumerate.
func modulosEntregados(s *Sesion, entregados map[string]string) int {
	if s.RutaEfectiva() == RutaSDDNativa {
		n := 0
		prefijo := "M" + strings.TrimPrefix(s.ID, "S") + "."
		for id := range entregados {
			if legacyModuloID.MatchString(id) && strings.HasPrefix(id, prefijo) {
				n++
			}
		}
		return n
	}

	n := 0
	for _, m := range s.Modulos {
		if _, ok := entregados[m.ID]; ok {
			n++
		}
	}
	return n
}

// avisosDeTrailers reports trailers that name no Módulo. They are warnings, never
// errors: a typo in a commit message must not stop the plan from being read.
func (p *Plan) avisosDeTrailers(root string) []Hallazgo {
	head, err := gitHEAD(root)
	if err != nil {
		return nil // Check already reports an unreadable HEAD.
	}
	_, desconocidos, err := p.AvanceModulosAt(root, head)
	if err != nil {
		return []Hallazgo{{"aviso", "trailer de Módulo", fmt.Sprintf("no se pudieron leer los trailers de Git: %v", err)}}
	}
	h := make([]Hallazgo, 0, len(desconocidos))
	for _, id := range desconocidos {
		h = append(h, Hallazgo{"aviso", "trailer de Módulo", fmt.Sprintf("un commit declara %s: %s, que no es un Módulo del plan", trailerDeModulo, id)})
	}
	return h
}
