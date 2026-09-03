package main

import (
	"fmt"
	"regexp"
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
	head, err := gitHEAD(root)
	if err != nil {
		return []Hallazgo{{"error", "git", fmt.Sprintf("no se pudo fijar HEAD: %v", err)}}
	}
	return p.CheckAt(root, head)
}

// CheckAt validates all Git-dependent evidence against one immutable HEAD.
func (p *Plan) CheckAt(root, head string) []Hallazgo {
	var h []Hallazgo
	p.ledgerDecisionRequired = make(map[string]bool)
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if strings.TrimSpace(s.Cambio) == "" {
			continue
		}
		decisionRequired, err := readAttemptStatus(root, s.Cambio)
		if err != nil {
			h = append(h, Hallazgo{"error", "ledger SDD", fmt.Sprintf("%s declara cambio %q pero su ledger no está disponible: %v", s.ID, s.Cambio, err)})
			continue
		}
		p.ledgerDecisionRequired[s.ID] = decisionRequired
	}
	h = append(h, p.checkZonas()...)
	h = append(h, p.checkGrafo()...)
	h = append(h, p.checkLinaje()...)
	h = append(h, p.checkCimientos(root)...)
	h = append(h, p.checkSesionesAt(root, head)...)
	if part, err := p.VerificarParticionAt(root, head); err != nil {
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

func (p *Plan) checkSesiones(root string) []Hallazgo {
	head, _ := gitHEAD(root)
	return p.checkSesionesAt(root, head)
}

func (p *Plan) checkSesionesAt(root, head string) []Hallazgo {
	var h []Hallazgo
	zonas := p.ZonaPorID()
	sesionesVistas := map[string]bool{}
	modulosVistos := map[string]bool{}
	tareasVistas := map[string]bool{}

	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if s.ID == "" {
			h = append(h, Hallazgo{"error", "sesión", "hay una Sesión sin `id`"})
			continue
		}
		if sesionesVistas[s.ID] {
			h = append(h, Hallazgo{"error", "sesión", fmt.Sprintf("la Sesión %q está declarada dos veces", s.ID)})
		}
		sesionesVistas[s.ID] = true

		if s.Zona == "" {
			h = append(h, Hallazgo{"error", "sesión", fmt.Sprintf("%s no declara zona", s.ID)})
		} else if s.Zona == "cimientos" {
			if len(s.Cimientos) == 0 {
				h = append(h, Hallazgo{"error", "sesión", fmt.Sprintf("%s vive en zona: cimientos pero no declara ningún archivo para reservar", s.ID)})
			}
		} else if _, ok := zonas[s.Zona]; !ok {
			h = append(h, Hallazgo{"error", "sesión", fmt.Sprintf("%s vive en la zona %q, que no existe", s.ID, s.Zona)})
		}

		abierta := s.Entrega == nil && !s.Archivada
		if strings.TrimSpace(s.Resultado) == "" {
			h = append(h, Hallazgo{"error", "resultado", fmt.Sprintf("%s debe declarar un resultado no vacío", s.ID)})
		}
		if strings.TrimSpace(s.Autoridad) == "" {
			h = append(h, Hallazgo{"error", "autoridad de Sesión", fmt.Sprintf("%s debe declarar la autoridad que delimita su alcance", s.ID)})
		}
		if abierta && len(s.Criterios) == 0 {
			h = append(h, Hallazgo{"error", "criterios binarios", fmt.Sprintf("%s no tiene criterios de aceptación", s.ID)})
		}
		if abierta {
			h = append(h, checkRuta(s, root, head)...)
			h = append(h, checkProfundidad(s)...)
		}
		if abierta || len(s.Modulos) > 0 {
			h = append(h, p.checkModulos(root, s, modulosVistos, tareasVistas)...)
		}
		h = append(h, checkDecisiones(s)...)
		if s.Entrega != nil {
			if s.Entrega.PR != nil && *s.Entrega.PR <= 0 {
				h = append(h, Hallazgo{"error", "entrega", fmt.Sprintf("%s declara un PR que no es positivo", s.ID)})
			}
			if ok, detalle := entregaIntegrada(root, s.Entrega.Commit, head); !ok {
				h = append(h, Hallazgo{"error", "entrega integrada", fmt.Sprintf("%s: %s", s.ID, detalle)})
			}
		}
	}
	return h
}

var (
	sesionID = regexp.MustCompile(`^S[1-9][0-9]*$`)
	moduloID = regexp.MustCompile(`^M[1-9][0-9]*\.[1-9][0-9]*$`)
	tareaID  = regexp.MustCompile(`^T[1-9][0-9]*\.[1-9][0-9]*\.[1-9][0-9]*$`)
)

func (p *Plan) checkModulos(root string, s *Sesion, modulosVistos, tareasVistas map[string]bool) []Hallazgo {
	var h []Hallazgo
	if !sesionID.MatchString(s.ID) && !s.Archivada {
		h = append(h, Hallazgo{"error", "identificadores", fmt.Sprintf("%s no es un ID plano de Sesión válido", s.ID)})
	}
	prefijoModulo := "M" + strings.TrimPrefix(s.ID, "S") + "."
	for _, m := range s.Modulos {
		if !moduloID.MatchString(m.ID) || !strings.HasPrefix(m.ID, prefijoModulo) {
			h = append(h, Hallazgo{"error", "identificadores", fmt.Sprintf("el Módulo %q no pertenece de forma consistente a %s", m.ID, s.ID)})
		}
		if modulosVistos[m.ID] {
			h = append(h, Hallazgo{"error", "identificadores", fmt.Sprintf("el Módulo %q está repetido", m.ID)})
		}
		modulosVistos[m.ID] = true
		if strings.TrimSpace(m.Resultado) == "" {
			h = append(h, Hallazgo{"error", "resultado", fmt.Sprintf("%s debe declarar un resultado no vacío", m.ID)})
		}
		if len(m.Rutas) == 0 {
			h = append(h, Hallazgo{"error", "jerarquía", fmt.Sprintf("%s no declara archivos concretos", m.ID)})
		}
		if len(m.Tareas) == 0 {
			h = append(h, Hallazgo{"error", "jerarquía", fmt.Sprintf("%s no tiene Tareas enumeradas", m.ID)})
		}
		for _, ruta := range m.Rutas {
			normalizada, err := exactRepoFile(root, ruta)
			if err != nil {
				h = append(h, Hallazgo{"error", "ruta de Módulo", fmt.Sprintf("%s: %v", m.ID, err)})
				continue
			}
			autorizada := false
			if contiene(s.Cimientos, normalizada) {
				for _, regla := range p.Cimientos.Rutas {
					if matchRule(regla, normalizada) {
						autorizada = true
						break
					}
				}
			} else if s.Zona != "cimientos" {
				for _, owner := range p.owners(normalizada) {
					if owner.Kind == "zona" && owner.ID == s.Zona {
						autorizada = true
					}
				}
			}
			if !autorizada {
				h = append(h, Hallazgo{"error", "autoridad de Módulo", fmt.Sprintf("%s no autoriza %q desde la Zona %q ni como Cimiento exacto reservado", s.ID, normalizada, s.Zona)})
			}
		}
		prefijoTarea := "T" + strings.TrimPrefix(m.ID, "M") + "."
		for _, t := range m.Tareas {
			if !tareaID.MatchString(t.ID) || !strings.HasPrefix(t.ID, prefijoTarea) {
				h = append(h, Hallazgo{"error", "identificadores", fmt.Sprintf("la Tarea %q no pertenece de forma consistente a %s", t.ID, m.ID)})
			}
			if tareasVistas[t.ID] {
				h = append(h, Hallazgo{"error", "identificadores", fmt.Sprintf("la Tarea %q está repetida", t.ID)})
			}
			tareasVistas[t.ID] = true
			if strings.TrimSpace(t.Resultado) == "" {
				h = append(h, Hallazgo{"error", "resultado", fmt.Sprintf("%s debe declarar un resultado no vacío", t.ID)})
			}
			if strings.TrimSpace(t.Accion) == "" || len(t.Criterios) == 0 {
				h = append(h, Hallazgo{"error", "jerarquía", fmt.Sprintf("%s necesita acción y criterios binarios", t.ID)})
			}
		}
	}
	return h
}

func checkRuta(s *Sesion, root, head string) []Hallazgo {
	var h []Hallazgo
	if !contiene(RutasValidas, s.Ruta.Propuesta) || strings.TrimSpace(s.Ruta.Autoridad) == "" {
		h = append(h, Hallazgo{"error", "ruta propuesta", fmt.Sprintf("%s debe declarar ruta.propuesta (%s) y autoridad", s.ID, strings.Join(RutasValidas, ", "))})
	}
	if r := s.Ruta.Revalidacion; r != nil {
		if !contiene(RutasValidas, r.Resultado) || strings.TrimSpace(r.Evidencia) == "" || strings.TrimSpace(r.Base) == "" {
			h = append(h, Hallazgo{"error", "ruta revalidada", fmt.Sprintf("%s debe declarar resultado, base exacta y evidencia", s.ID)})
		}
		if r.Resultado != s.Ruta.Propuesta && strings.TrimSpace(r.Razon) == "" {
			h = append(h, Hallazgo{"error", "ruta revalidada", fmt.Sprintf("%s cambió de %q a %q sin registrar razón", s.ID, s.Ruta.Propuesta, r.Resultado)})
		}
		base, err := gitOID(root, r.Base)
		if err != nil {
			h = append(h, Hallazgo{"error", "ruta revalidada", fmt.Sprintf("%s no declara una base Git inmutable completa: %v", s.ID, err)})
		} else if _, err := gitOutput(root, "merge-base", "--is-ancestor", base, head); err != nil {
			h = append(h, Hallazgo{"error", "ruta revalidada", fmt.Sprintf("%s fue revalidada sobre %s, que no es ancestro del HEAD fijado %s", s.ID, base, head)})
		}
	}
	return h
}

func checkProfundidad(s *Sesion) []Hallazgo {
	switch s.Ruta.Propuesta {
	case "direct", "design-tasks":
		if len(s.Modulos) == 0 {
			return []Hallazgo{{"error", "profundidad por ruta", fmt.Sprintf("%s usa la ruta propuesta %s y debe enumerar al menos un Módulo", s.ID, s.Ruta.Propuesta)}}
		}
	case "full-sdd":
		if len(s.Modulos) > 0 {
			return []Hallazgo{{"error", "profundidad por ruta", fmt.Sprintf("%s usa la ruta propuesta full-sdd y no puede declarar Módulos", s.ID)}}
		}
	}
	return nil
}

func checkDecisiones(s *Sesion) []Hallazgo {
	var h []Hallazgo
	for _, d := range s.Decisiones {
		if d.Tipo == "resuelta" {
			valida := strings.TrimSpace(d.Resolucion) != "" && strings.TrimSpace(d.Autoridad) != "" && strings.TrimSpace(d.Falsificador) != ""
			for _, descartada := range d.Descartadas {
				valida = valida && strings.TrimSpace(descartada.Opcion) != "" && strings.TrimSpace(descartada.Razon) != ""
			}
			if !valida {
				h = append(h, Hallazgo{"error", "decisión resuelta", fmt.Sprintf("%s debe preservar resolución, autoridad, falsificador y descartadas completas", s.ID)})
			}
			continue
		}
		contratoValido := strings.TrimSpace(d.Evidencia) != "" && strings.TrimSpace(d.Checkpoint) != "" && len(d.Opciones) > 0
		for _, opcion := range d.Opciones {
			if strings.TrimSpace(opcion.Opcion) == "" || strings.TrimSpace(opcion.Consecuencia) == "" {
				contratoValido = false
			}
		}
		if !contratoValido {
			h = append(h, Hallazgo{"error", "contrato de decisión", fmt.Sprintf("%s debe declarar evidencia, checkpoint y opciones no vacías con su consecuencia: %q", s.ID, d.Pregunta)})
		}
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
	sucesoras := map[string][]string{}
	for _, s := range p.Sesiones {
		if s.Archivada {
			continue
		}
		for _, original := range s.Reemplaza {
			sucesoras[original] = append(sucesoras[original], s.ID)
		}
	}
	for original := range sucesoras {
		sort.Strings(sucesoras[original])
	}

	for _, s := range p.Sesiones {
		for _, dep := range s.DependeDe {
			d, ok := index[dep]
			if !ok {
				h = append(h, Hallazgo{"error", "dependencias",
					fmt.Sprintf("%s depende de %q, que no existe", s.ID, dep)})
				continue
			}
			if !s.Archivada && d.Archivada && len(sucesoras[dep]) > 0 {
				h = append(h, Hallazgo{"error", "dependencias reemplazadas",
					fmt.Sprintf("%s depende de %s, que fue archivada y reemplazada por %s; reescribí la dependencia hacia las sucesoras aplicables",
						s.ID, dep, strings.Join(sucesoras[dep], ", "))})
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

// checkLinaje validates replacement history. Replacements keep stable IDs honest:
// an active Sesión may supersede one or more archived Sesiones, and several active
// Sesiones may independently point to the same archived original.
func (p *Plan) checkLinaje() []Hallazgo {
	var h []Hallazgo
	index := p.SesionPorID()

	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		for _, originalID := range s.Reemplaza {
			original, ok := index[originalID]
			switch {
			case originalID == s.ID:
				h = append(h, Hallazgo{"error", "linaje",
					fmt.Sprintf("%s no puede reemplazarse a sí misma", s.ID)})
			case !ok:
				h = append(h, Hallazgo{"error", "linaje",
					fmt.Sprintf("%s reemplaza a %q, que no existe", s.ID, originalID)})
			default:
				if s.Archivada {
					h = append(h, Hallazgo{"error", "linaje",
						fmt.Sprintf("%s declara reemplazos pero está archivada", s.ID)})
				}
				if !original.Archivada {
					h = append(h, Hallazgo{"error", "linaje",
						fmt.Sprintf("%s reemplaza a %s, que no está archivada", s.ID, originalID)})
				}
			}
		}
	}

	estado := map[string]int{}
	var visit func(string, []string)
	visit = func(id string, camino []string) {
		switch estado[id] {
		case 2:
			return
		case 1:
			h = append(h, Hallazgo{"error", "linaje circular",
				fmt.Sprintf("ciclo: %s", strings.Join(append(camino, id), " → "))})
			return
		}
		estado[id] = 1
		if s, ok := index[id]; ok {
			refs := append([]string(nil), s.Reemplaza...)
			sort.Strings(refs)
			for _, ref := range refs {
				if _, existe := index[ref]; existe {
					visit(ref, append(camino, id))
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

	return h
}

// checkCimientos verifies that reserved files are actually declared cimientos.
// Reserving a file that is not shared is noise; reserving a shared file that was
// never declared means the partition does not know it is shared.
func (p *Plan) checkCimientos(root string) []Hallazgo {
	var h []Hallazgo
	for _, s := range p.Sesiones {
		for _, f := range s.Cimientos {
			normalizada, err := exactRepoFile(root, f)
			if err != nil {
				h = append(h, Hallazgo{"error", "reserva de cimientos", fmt.Sprintf("%s: %v", s.ID, err)})
				continue
			}
			declarado := false
			for _, r := range p.Cimientos.Rutas {
				if matchRule(r, normalizada) {
					declarado = true
					break
				}
			}
			if !declarado {
				h = append(h, Hallazgo{"error", "reserva de cimientos",
					fmt.Sprintf("%s reserva %q, que no está declarado como cimiento", s.ID, normalizada)})
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
