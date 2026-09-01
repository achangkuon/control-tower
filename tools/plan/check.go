package main

import (
	"fmt"
	"sort"
	"strings"
)

// Check validates everything the tool can decide without judgement.
//
// What it deliberately does NOT check is in convention §17: whether the cut into
// Zonas is a good cut, whether a decision is honestly derivable, whether an
// acceptance criterion is really binary. Those need a human. Pretending to check
// them would make the pass meaningless.
func (p *Plan) Check(root string) []Hallazgo {
	var h []Hallazgo

	h = append(h, p.checkZonas()...)
	h = append(h, p.checkSesiones()...)
	h = append(h, p.checkGrafo()...)
	h = append(h, p.checkCimientos()...)

	if part, err := p.VerificarParticion(root); err != nil {
		h = append(h, Hallazgo{"error", "partición", err.Error()})
	} else {
		h = append(h, part...)
	}

	return h
}

func (p *Plan) checkZonas() []Hallazgo {
	var h []Hallazgo
	vistas := map[string]bool{}

	for _, z := range p.Zonas {
		if z.ID == "" {
			h = append(h, Hallazgo{"error", "zona", "hay una zona sin `id`"})
			continue
		}
		if vistas[z.ID] {
			h = append(h, Hallazgo{"error", "zona", fmt.Sprintf("la zona %q está declarada dos veces", z.ID)})
		}
		vistas[z.ID] = true

		// A Zona without paths is a theme, and themes do not partition
		// anything. Convention §3.
		if len(z.Rutas) == 0 {
			h = append(h, Hallazgo{"error", "zona definida por rutas",
				fmt.Sprintf("la zona %q no declara rutas: es un tema, no una zona", z.ID)})
		}
	}

	for _, z := range p.Zonas {
		for _, dep := range z.DependeDe {
			if !vistas[dep] {
				h = append(h, Hallazgo{"error", "zona",
					fmt.Sprintf("la zona %q depende de %q, que no existe", z.ID, dep)})
			}
		}
	}

	if len(p.Cimientos.Rutas) == 0 {
		h = append(h, Hallazgo{"aviso", "cimientos",
			"no se declaró ningún cimiento: revisá si de verdad no hay nada compartido"})
	}

	return h
}

func (p *Plan) checkSesiones() []Hallazgo {
	var h []Hallazgo
	zonas := p.ZonaPorID()
	vistas := map[string]bool{}

	for _, s := range p.Sesiones {
		if s.ID == "" {
			h = append(h, Hallazgo{"error", "sesión", "hay una Sesión sin `id`"})
			continue
		}
		if vistas[s.ID] {
			h = append(h, Hallazgo{"error", "sesión", fmt.Sprintf("la Sesión %q está declarada dos veces", s.ID)})
		}
		vistas[s.ID] = true

		if s.Zona == "" {
			h = append(h, Hallazgo{"error", "sesión", fmt.Sprintf("%s no declara zona", s.ID)})
		} else if _, ok := zonas[s.Zona]; !ok {
			h = append(h, Hallazgo{"error", "sesión",
				fmt.Sprintf("%s vive en la zona %q, que no existe", s.ID, s.Zona)})
		}

		// Criteria authored after the work describe it; criteria authored
		// before it constrain it. Only the second kind can fail. §12.
		if len(s.Criterios) == 0 && s.Entrega == nil && !s.Archivada {
			h = append(h, Hallazgo{"error", "criterios binarios",
				fmt.Sprintf("%s no tiene criterios de aceptación", s.ID)})
		}

		if s.Ruta != "" && !contiene(RutasValidas, s.Ruta) {
			h = append(h, Hallazgo{"error", "ruta",
				fmt.Sprintf("%s declara la ruta %q, que no es una de: %s",
					s.ID, s.Ruta, strings.Join(RutasValidas, ", "))})
		}

		h = append(h, checkDecisiones(&s)...)
	}

	return h
}

func checkDecisiones(s *Sesion) []Hallazgo {
	var h []Hallazgo
	for _, d := range s.Decisiones {
		switch d.Tipo {
		case "derivable":
			// Both halves are required: an approved authority AND a criterion
			// you can falsify. "Use good judgement" is not a criterion. §14.
			if d.Autoridad == "" || d.Criterio == "" {
				h = append(h, Hallazgo{"error", "decisión derivable",
					fmt.Sprintf("%s marca una decisión como derivable sin autoridad y criterio: %q", s.ID, d.Pregunta)})
			}
			if d.Clase != "" && contiene(ClasesQueEscalan, d.Clase) {
				h = append(h, Hallazgo{"error", "clases que siempre escalan",
					fmt.Sprintf("%s marca como derivable una decisión de clase %q, que siempre escala: %q",
						s.ID, d.Clase, d.Pregunta)})
			}
		case "escala":
			if d.Alcanza == "" {
				h = append(h, Hallazgo{"error", "decisión que escala",
					fmt.Sprintf("%s no dice hasta dónde llega la decisión %q — sin eso no se puede saber si bloquea", s.ID, d.Pregunta)})
			}
			if d.Clase != "" && !contiene(ClasesQueEscalan, d.Clase) {
				h = append(h, Hallazgo{"aviso", "clase desconocida",
					fmt.Sprintf("%s usa la clase %q, que no es una de las ocho", s.ID, d.Clase)})
			}
		case "":
			h = append(h, Hallazgo{"error", "decisión",
				fmt.Sprintf("%s tiene una decisión sin `tipo`: %q", s.ID, d.Pregunta)})
		default:
			h = append(h, Hallazgo{"error", "decisión",
				fmt.Sprintf("%s usa el tipo %q; sólo existen `derivable` y `escala`", s.ID, d.Tipo)})
		}
	}
	return h
}

// checkGrafo finds missing dependencies and cycles. A cycle is not a slow plan:
// it is a plan where nothing can ever start, and it is invisible when the graph
// is only rendered as a table sorted by id.
func (p *Plan) checkGrafo() []Hallazgo {
	var h []Hallazgo
	index := p.SesionPorID()

	for _, s := range p.Sesiones {
		for _, dep := range s.DependeDe {
			if _, ok := index[dep]; !ok {
				h = append(h, Hallazgo{"error", "dependencias",
					fmt.Sprintf("%s depende de %q, que no existe", s.ID, dep)})
			}
		}
		for _, d := range s.Decisiones {
			for _, c := range d.Contamina {
				if _, ok := index[c]; !ok {
					h = append(h, Hallazgo{"error", "contaminación",
						fmt.Sprintf("%s declara que contamina a %q, que no existe", s.ID, c)})
				}
			}
		}
	}

	estado := map[string]int{}
	var ciclos []string

	var visit func(id string, camino []string)
	visit = func(id string, camino []string) {
		switch estado[id] {
		case 2:
			return
		case 1:
			ciclos = append(ciclos, strings.Join(append(camino, id), " → "))
			return
		}
		estado[id] = 1
		if s, ok := index[id]; ok {
			deps := append([]string(nil), s.DependeDe...)
			sort.Strings(deps)
			for _, dep := range deps {
				if _, ok := index[dep]; ok {
					visit(dep, append(camino, id))
				}
			}
		}
		estado[id] = 2
	}

	ids := make([]string, 0, len(index))
	for id := range index {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	for _, id := range ids {
		visit(id, nil)
	}

	for _, c := range ciclos {
		h = append(h, Hallazgo{"error", "dependencias circulares",
			fmt.Sprintf("ciclo: %s", c)})
	}

	return h
}

// checkCimientos verifies that reserved files are actually declared cimientos.
// Reserving a file that is not shared is noise; reserving a shared file that was
// never declared means the partition does not know it is shared.
func (p *Plan) checkCimientos() []Hallazgo {
	var h []Hallazgo
	for _, s := range p.Sesiones {
		for _, f := range s.Cimientos {
			declarado := false
			for _, r := range p.Cimientos.Rutas {
				if matchRule(r, f) {
					declarado = true
					break
				}
			}
			if !declarado {
				h = append(h, Hallazgo{"error", "reserva de cimientos",
					fmt.Sprintf("%s reserva %q, que no está declarado como cimiento", s.ID, f)})
			}
		}
	}
	return h
}

func contiene(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}
