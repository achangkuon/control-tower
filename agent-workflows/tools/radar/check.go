package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os/exec"
	"regexp"
	"sort"
	"strconv"
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
		h = append(h, checkPuertaSDD(root, s)...)
	}
	h = append(h, p.checkZonas()...)
	h = append(h, p.checkGrafo()...)
	h = append(h, p.checkLinaje()...)
	h = append(h, p.checkReferencias(root)...)
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
	provenienciasVistas := map[string]bool{}

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

		importada := s.ImportacionLegacy != nil
		pendiente := importada && s.ImportacionLegacy.TerritorioPendiente
		decomposicionDiferida := importada && s.ImportacionLegacy.DescomposicionDiferida
		historica := esTerritorioHistorico(s)
		if importada {
			h = append(h, checkImportacionLegacy(root, head, s, provenienciasVistas)...)
		}
		if decomposicionDiferida {
			h = append(h, checkDescomposicionDiferida(s)...)
		}
		if len(s.RutasHistoricas) > 0 && (!importada || !s.Archivada || s.Entrega != nil || pendiente || len(s.Modulos) != 0 || s.Zona != "" || len(s.Cimientos) != 0 || s.Ruta != (RutaSesion{})) {
			h = append(h, Hallazgo{"error", "rutas históricas", fmt.Sprintf("%s sólo puede preservar rutas históricas sin Módulos como importación archivada", s.ID)})
		}
		if pendiente {
			if s.Zona != "" || len(s.Cimientos) != 0 || s.Ruta != (RutaSesion{}) || s.Entrega != nil || s.Archivada || s.Diferida {
				h = append(h, Hallazgo{"error", "territorio pendiente", fmt.Sprintf("%s declara territorio, ruta o estado terminal", s.ID)})
			}
			if !bloqueaAqui(s) {
				h = append(h, Hallazgo{"error", "territorio pendiente", fmt.Sprintf("%s no tiene una decisión escala que alcance criterios o primer-modulo", s.ID)})
			}
		} else if decomposicionDiferida {
			// A frozen design-tasks source can defer decomposition, but it never
			// supplies territory or makes the Session executable.
		} else if historica {
			if len(s.Cimientos) != 0 || s.Ruta != (RutaSesion{}) {
				h = append(h, Hallazgo{"error", "territorio histórico", fmt.Sprintf("%s declara Cimientos o ruta de ejecución", s.ID)})
			}
			propietariosActuales := map[string]bool{}
			todasSinDueño := s.Archivada
			tieneRutaSinDueño := false
			tieneRutaTrackedSinDueño := false
			rutas := 0
			tracked, err := trackedFilesAt(root, head)
			if err != nil {
				todasSinDueño = false
			}
			rutasTracked := map[string]bool{}
			for _, ruta := range tracked {
				rutasTracked[ruta] = true
			}
			for _, m := range s.Modulos {
				for _, ruta := range m.Rutas {
					rutas++
					owners := p.owners(ruta)
					if len(owners) != 0 || rutasTracked[ruta] {
						todasSinDueño = false
					}
					if len(owners) == 0 {
						tieneRutaSinDueño = true
						tieneRutaTrackedSinDueño = tieneRutaTrackedSinDueño || rutasTracked[ruta]
					}
					for _, owner := range owners {
						propietariosActuales[owner.Kind+":"+owner.ID] = true
					}
				}
			}
			carrierHistorico := len(s.RutasHistoricas) > 0 && len(s.Modulos) == 0
			for _, ruta := range s.RutasHistoricas {
				normalizada, pathErr := exactRepoFile(root, ruta)
				if pathErr != nil {
					h = append(h, Hallazgo{"error", "rutas históricas", fmt.Sprintf("%s: %v", s.ID, pathErr)})
				} else if !rutasTracked[normalizada] {
					h = append(h, Hallazgo{"error", "rutas históricas", fmt.Sprintf("%s sólo puede preservar archivos históricos tracked", s.ID)})
				}
			}
			if !carrierHistorico && (rutas == 0 || tieneRutaTrackedSinDueño || (len(propietariosActuales) == 0 && !todasSinDueño) || (tieneRutaSinDueño && !s.Archivada)) {
				h = append(h, Hallazgo{"error", "territorio histórico", fmt.Sprintf("%s no prueba rutas históricas con dueño actual ni rutas ausentes archivadas sin dueño", s.ID)})
			}
		} else if s.Zona == "" {
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
		h = append(h, validarAutoridad(root, s)...)
		if abierta && len(s.Criterios) == 0 && !permiteCriteriosPendientes(s) {
			h = append(h, Hallazgo{"error", "criterios binarios", fmt.Sprintf("%s no tiene criterios de aceptación", s.ID)})
		}
		if abierta && !pendiente {
			h = append(h, checkRuta(s, root, head)...)
			h = append(h, checkProfundidad(s)...)
		}
		if abierta || len(s.Modulos) > 0 {
			h = append(h, p.checkModulos(root, s, modulosVistos, tareasVistas, importada, pendiente, historica)...)
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
	sesionID                    = regexp.MustCompile(`^S[1-9][0-9]*$`)
	moduloID                    = regexp.MustCompile(`^M[1-9][0-9]*\.[1-9][0-9]*$`)
	tareaID                     = regexp.MustCompile(`^T[1-9][0-9]*\.[1-9][0-9]*\.[1-9][0-9]*$`)
	legacySesionID              = regexp.MustCompile(`^S[1-9][0-9]*(\.[1-9][0-9]*)*$`)
	legacyModuloID              = regexp.MustCompile(`^M[1-9][0-9]*(\.[1-9][0-9]*)+$`)
	legacyTareaID               = regexp.MustCompile(`^T[1-9][0-9]*(\.[1-9][0-9]*){2,}$`)
	legacyHeading               = regexp.MustCompile(`^#{1,6} Sesión S?([1-9][0-9]*(?:\.[1-9][0-9]*)*)(?:\s|—|-|$)`)
	legacyDeferredDecomposition = "**Decisiones:** las define `session-plan` al desparquear. **Módulos:** ídem."
	legacyFullSDDDecomposition  = "**Módulos:** los escribe la fase `tasks` de SDD. Este Plan fija el contrato y no duplica esa\ndescomposición."
)

type deferredDecompositionSignature struct {
	route   string
	markers []string
}

var legacyDeferredDecompositions = []deferredDecompositionSignature{
	{route: "design-tasks", markers: []string{legacyDeferredDecomposition}},
	{route: "design-tasks", markers: []string{
		"Los Módulos y Tareas los escribe\n`session-plan` en su elaboración; este Plan fija el contrato y los criterios y **no debe duplicar\nesa descomposición**.",
		"**Módulos:** los define `session-plan`.",
	}},
	{route: "full-sdd", markers: []string{legacyFullSDDDecomposition}},
}

func deferredDecompositionRoute(section string) (string, bool) {
	complete := -1
	for i, signature := range legacyDeferredDecompositions {
		matches := true
		for _, marker := range signature.markers {
			count := strings.Count(section, marker)
			if count > 1 {
				return "", false
			}
			matches = matches && count == 1
		}
		if matches {
			if complete >= 0 {
				return "", false
			}
			complete = i
		}
	}
	if complete < 0 {
		return "", false
	}
	for i, signature := range legacyDeferredDecompositions {
		if i == complete {
			continue
		}
		for _, marker := range signature.markers {
			if strings.Contains(section, marker) {
				return "", false
			}
		}
	}
	return legacyDeferredDecompositions[complete].route, true
}

func checkDescomposicionDiferida(s *Sesion) []Hallazgo {
	if s.Entrega != nil || s.Archivada || (s.Ruta.Propuesta != "design-tasks" && s.Ruta.Propuesta != "full-sdd") {
		return []Hallazgo{{"error", "descomposición diferida", fmt.Sprintf("%s sólo permite la compatibilidad diferida importada de design-tasks o full-sdd", s.ID)}}
	}
	if len(s.Modulos) != 0 {
		if s.Ruta.Revalidacion == nil {
			return []Hallazgo{{"error", "descomposición diferida", fmt.Sprintf("%s debe revalidar la ruta contra HEAD después de escribir Módulos y Tareas", s.ID)}}
		}
		return nil
	}
	if s.Ruta.Revalidacion != nil {
		return []Hallazgo{{"error", "descomposición diferida", fmt.Sprintf("%s no puede revalidar ni ejecutar sin Módulos y Tareas", s.ID)}}
	}
	for _, d := range s.Decisiones {
		if d.Tipo != "escala" || d.Alcanza != "primer-modulo" || strings.TrimSpace(d.Pregunta) == "" || strings.TrimSpace(d.Evidencia) == "" || strings.TrimSpace(d.Checkpoint) == "" || !contiene(ClasesQueEscalan, d.Clase) || len(d.Opciones) == 0 {
			continue
		}
		completa := true
		for _, o := range d.Opciones {
			completa = completa && strings.TrimSpace(o.Opcion) != "" && strings.TrimSpace(o.Consecuencia) != ""
		}
		if completa {
			return nil
		}
	}
	return []Hallazgo{{"error", "descomposición diferida", fmt.Sprintf("%s debe conservar una decisión escala completa que alcance primer-modulo", s.ID)}}
}

func (p *Plan) checkModulos(root string, s *Sesion, modulosVistos, tareasVistas map[string]bool, importada, pendiente, historica bool) []Hallazgo {
	var h []Hallazgo
	permiteTareasPendientes := false
	if pendiente {
		for _, d := range s.Decisiones {
			if d.Tipo == "escala" && d.Alcanza == "primer-modulo" {
				permiteTareasPendientes = true
				break
			}
		}
	}
	sesionValida := sesionID.MatchString(s.ID)
	if importada {
		sesionValida = legacySesionID.MatchString(s.ID)
	}
	if !sesionValida && !s.Archivada {
		h = append(h, Hallazgo{"error", "identificadores", fmt.Sprintf("%s no es un ID plano de Sesión válido", s.ID)})
	}
	prefijoModulo := "M" + strings.TrimPrefix(s.ID, "S") + "."
	for _, m := range s.Modulos {
		moduloValido := moduloID.MatchString(m.ID)
		if importada {
			moduloValido = legacyModuloID.MatchString(m.ID)
		}
		if !moduloValido || !strings.HasPrefix(m.ID, prefijoModulo) {
			h = append(h, Hallazgo{"error", "identificadores", fmt.Sprintf("el Módulo %q no pertenece de forma consistente a %s", m.ID, s.ID)})
		}
		if modulosVistos[m.ID] {
			h = append(h, Hallazgo{"error", "identificadores", fmt.Sprintf("el Módulo %q está repetido", m.ID)})
		}
		modulosVistos[m.ID] = true
		if strings.TrimSpace(m.Resultado) == "" {
			h = append(h, Hallazgo{"error", "resultado", fmt.Sprintf("%s debe declarar un resultado no vacío", m.ID)})
		}
		if len(m.Rutas) == 0 && !pendiente && !m.ReadOnly {
			h = append(h, Hallazgo{"error", "jerarquía", fmt.Sprintf("%s no declara archivos concretos", m.ID)})
		}
		if m.ReadOnly && len(m.Rutas) != 0 {
			h = append(h, Hallazgo{"error", "jerarquía", fmt.Sprintf("%s es read-only y no puede declarar archivos modificados", m.ID)})
		}
		if pendiente && len(m.Rutas) != 0 {
			h = append(h, Hallazgo{"error", "territorio pendiente", fmt.Sprintf("%s declara rutas", m.ID)})
		}
		if len(m.Tareas) == 0 && !permiteTareasPendientes {
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
			if !autorizada && !historica {
				h = append(h, Hallazgo{"error", "autoridad de Módulo", fmt.Sprintf("%s no autoriza %q desde la Zona %q ni como Cimiento exacto reservado", s.ID, normalizada, s.Zona)})
			}
		}
		prefijoTarea := "T" + strings.TrimPrefix(m.ID, "M") + "."
		for _, t := range m.Tareas {
			tareaValida := tareaID.MatchString(t.ID)
			if importada {
				tareaValida = legacyTareaID.MatchString(t.ID)
			}
			if !tareaValida || !strings.HasPrefix(t.ID, prefijoTarea) {
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

func permiteCriteriosPendientes(s *Sesion) bool {
	if s.ImportacionLegacy == nil || !s.ImportacionLegacy.TerritorioPendiente {
		return false
	}
	for _, d := range s.Decisiones {
		if d.Tipo == "escala" && d.Alcanza == "criterios" {
			return true
		}
	}
	return false
}

func legacySessionSection(raw, heading string) string {
	lines := strings.Split(raw, "\n")
	for i, line := range lines {
		if line != heading {
			continue
		}
		for j := i + 1; j < len(lines); j++ {
			if legacyHeading.MatchString(lines[j]) {
				return strings.Join(lines[i:j], "\n")
			}
		}
		return strings.Join(lines[i:], "\n")
	}
	return ""
}

func checkImportacionLegacy(root, head string, s *Sesion, vistas map[string]bool) []Hallazgo {
	var h []Hallazgo
	p := s.ImportacionLegacy
	if strings.TrimSpace(p.OrigenCommit) == "" || strings.TrimSpace(p.OrigenRuta) == "" || strings.TrimSpace(p.OrigenBlob) == "" || strings.TrimSpace(p.OrigenEncabezado) == "" {
		return []Hallazgo{{"error", "importación legacy", fmt.Sprintf("%s no declara proveniencia completa", s.ID)}}
	}
	commit, err := gitOID(root, p.OrigenCommit)
	if err != nil {
		return []Hallazgo{{"error", "importación legacy", fmt.Sprintf("%s commit inválido: %v", s.ID, err)}}
	}
	if commit == head {
		h = append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s usa HEAD actual como origen", s.ID)})
	} else if _, err := gitOutput(root, "merge-base", "--is-ancestor", commit, head); err != nil {
		h = append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s origen no es ancestro estricto", s.ID)})
	}
	ruta, err := exactRepoFile(root, p.OrigenRuta)
	if err != nil {
		return append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s ruta inválida: %v", s.ID, err)})
	}
	entry, err := gitOutput(root, "ls-tree", commit, "--", ruta)
	parts := strings.Fields(entry)
	if err != nil || len(parts) != 4 || parts[1] != "blob" || parts[2] != p.OrigenBlob {
		h = append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s no prueba el blob exacto", s.ID)})
	} else if raw, err := gitOutput(root, "cat-file", "blob", p.OrigenBlob); err != nil {
		h = append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s blob ilegible", s.ID)})
	} else {
		count := 0
		for _, line := range strings.Split(raw, "\n") {
			if line == p.OrigenEncabezado {
				count++
			}
		}
		match := legacyHeading.FindStringSubmatch(p.OrigenEncabezado)
		if count != 1 || len(match) != 2 || "S"+match[1] != s.ID {
			h = append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s encabezado no identifica una fila única", s.ID)})
		}
		if p.DescomposicionDiferida {
			route, ok := deferredDecompositionRoute(legacySessionSection(raw, p.OrigenEncabezado))
			if !ok {
				h = append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s no prueba el aplazamiento de Módulos y Tareas", s.ID)})
			} else if route != s.Ruta.Propuesta {
				h = append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s usa %s pero su firma congelada exige %s", s.ID, s.Ruta.Propuesta, route)})
			}
		}
	}
	key := commit + "\x00" + ruta + "\x00" + p.OrigenEncabezado
	if vistas[key] {
		h = append(h, Hallazgo{"error", "importación legacy", fmt.Sprintf("%s repite la fila de origen", s.ID)})
	}
	vistas[key] = true
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
		if len(s.Modulos) == 0 && !(s.ImportacionLegacy != nil && s.ImportacionLegacy.DescomposicionDiferida && s.Ruta.Propuesta == "design-tasks") {
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
	referencias := p.referenceKinds()
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
				if referencias[dep] != "" {
					// A future or satisfied-history reference is structurally
					// present (design.md:577, design.md:587: "closes only that
					// missing structural edge" / "may register structural
					// lineage closure"). It is not a Sesión, so it grants no
					// readiness — EstadosAt resolves depende_de only against
					// p.SesionPorID() and this dependency never becomes met by
					// this edge alone. See checkReferencias for reference-owned
					// graph rules (identity, locator, leaf, cycle).
					continue
				}
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

// referenceKinds maps every reference identity (future_successors and
// satisfied_history) to its kind, so checkGrafo can recognize a dependency
// target that is structurally present without being a Sesión. It does not
// validate shape or duplicates — checkReferencias owns that.
func (p *Plan) referenceKinds() map[string]string {
	kinds := map[string]string{}
	if p.References == nil {
		return kinds
	}
	for _, f := range p.References.FutureSuccessors {
		if f.ID != "" {
			kinds[f.ID] = "future"
		}
	}
	for _, s := range p.References.SatisfiedHistory {
		if s.ID != "" {
			kinds[s.ID] = "satisfied"
		}
	}
	return kinds
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
// RegistroDeDecisiones is the one citable register. Its twin under
// openspec/plans/ is retired by S114: two byte-identical copies of the same
// authority is the second source of truth the canon forbids. It is frozen —
// cited, never edited — because new decisions live in each Sesión's
// `decisiones` field, and the register stopped growing at 108.
const RegistroDeDecisiones = "openspec/archive/legacy-planning/decision-register.md"

// validarAutoridad checks where a Sesión says it came from. The legacy free
// text passes untouched: S114 migrates one Zona per Módulo and S115 turns the
// requirement on, so demanding the type here would fail every Sesión at once.
func validarAutoridad(root string, s *Sesion) []Hallazgo {
	a := s.Autoridad
	if !a.Declarada() {
		return []Hallazgo{{"error", "autoridad de Sesión", fmt.Sprintf("%s debe declarar la autoridad que delimita su alcance", s.ID)}}
	}
	if !a.Tipada() {
		return nil
	}
	if !contiene(TiposDeAutoridad, a.Tipo) {
		return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s declara el tipo de autoridad %q, que no es uno de %s", s.ID, a.Tipo, strings.Join(TiposDeAutoridad, ", "))}}
	}
	etiqueta := s.ID + " autoridad"
	switch a.Tipo {
	case "engram":
		if a.ID <= 0 {
			return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s cita Engram sin declarar un id", s.ID)}}
		}
		// Reported, never counted as proven. Saying "verified" about something
		// this tool cannot open is how a pass stops meaning anything.
		return []Hallazgo{{"aviso", "autoridad no verificable", fmt.Sprintf("%s cita Engram %d, que vive fuera de Git: se declara y no se prueba", s.ID, a.ID)}}
	case "repo":
		return validateFragmentLocator(root, a.Loc, etiqueta)
	case "decision":
		if a.Ref <= 0 {
			return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s cita una decisión sin declarar su número", s.ID)}}
		}
		if a.Loc.Path != RegistroDeDecisiones {
			return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s cita la decisión %d fuera del registro: %q", s.ID, a.Ref, a.Loc.Path)}}
		}
		if h := validateFragmentLocator(root, a.Loc, etiqueta); len(h) > 0 {
			return h
		}
		return verificarNumeroDeDecision(root, a, s.ID)
	}
	return nil
}

// verificarNumeroDeDecision is the one check `repo` cannot make: that the bytes
// proven by the locator actually name the decision the Sesión claims. Without
// it a mis-copied range passes, and the citation says nothing.
func verificarNumeroDeDecision(root string, a Autoridad, sesion string) []Hallazgo {
	raw, err := exec.Command("git", "-C", root, "cat-file", "blob", a.Loc.Blob).Output()
	if err != nil || a.Loc.ByteEnd > len(raw) {
		return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s: el fragmento de la decisión %d no se pudo leer", sesion, a.Ref)}}
	}
	fragmento := string(raw[a.Loc.ByteStart:a.Loc.ByteEnd])
	if !fragmentoNombra(fragmento, a.Ref) {
		return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s cita la decisión %d pero el fragmento declarado no la nombra", sesion, a.Ref)}}
	}
	return nil
}

// fragmentoNombra accepts the two shapes the register uses: `Decisión 54` and
// ranges like `Decisiones 49–53`, plus the older numbered prose list.
func fragmentoNombra(fragmento string, ref int) bool {
	for _, m := range rangoDeDecision.FindAllStringSubmatch(fragmento, -1) {
		desde, err := strconv.Atoi(m[1])
		if err != nil {
			continue
		}
		hasta := desde
		if m[2] != "" {
			if v, err := strconv.Atoi(m[2]); err == nil {
				hasta = v
			}
		}
		if ref >= desde && ref <= hasta {
			return true
		}
	}
	return false
}

// rangoDeDecision matches `Decisión N`, `Decisiones N–M` (en dash or hyphen),
// and a leading `N.` from the numbered prose list of decisions 1 to 48.
var rangoDeDecision = regexp.MustCompile(`(?i)(?:decisi[oó]n(?:es)?\s+|^\s*|\n\s*)(\d+)(?:\s*[–-]\s*(\d+))?[.\s]`)

// checkPuertaSDD proves that the declared route is not claiming a gate the
// pipeline cannot reach yet. Convention §15: the three routes are three doors
// into one pipeline, so a Sesión entering at `apply` whose change is still owed
// a proposal is declaring a route it cannot run.
//
// The comparison is deliberately one-directional. Being further along than the
// declared gate is ordinary — work advances. Being *behind* it is the lie.
func checkPuertaSDD(root string, s *Sesion) []Hallazgo {
	ruta := s.RutaEfectiva()
	puerta, conocida := PuertaDeRuta[ruta]
	if !conocida {
		// An invalid route value is already reported by checkRuta; saying it
		// twice in different words helps nobody.
		return nil
	}
	status, err := readSDDStatus(root, s.Cambio)
	if err != nil {
		return []Hallazgo{{"error", "estado SDD", fmt.Sprintf("%s declara cambio %q pero su estado no está disponible: %v", s.ID, s.Cambio, err)}}
	}
	observada := fasePos(status.Next)
	if observada < 0 {
		return []Hallazgo{{"error", "puerta de ruta", fmt.Sprintf("%s: el cambio %q reporta la fase %q, que no pertenece al pipeline", s.ID, s.Cambio, status.Next)}}
	}
	if observada < fasePos(puerta) {
		return []Hallazgo{{"error", "puerta de ruta", fmt.Sprintf(
			"%s declara la ruta %s, que entra por %q, pero su cambio %q todavía debe %q",
			s.ID, ruta, puerta, s.Cambio, status.Next)}}
	}
	return nil
}

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

// checkReferencias enforces the generic reference contract: shape, locator, identity, edges, leaf, and cycle rules; no migration-specific knowledge.
func (p *Plan) checkReferencias(root string) []Hallazgo {
	if p.References == nil {
		return nil
	}
	var h []Hallazgo
	kinds := map[string]string{}
	deps := map[string][]string{}
	reps := map[string][]string{}
	sesionesPorID := p.SesionPorID()
	for _, s := range p.Sesiones {
		if s.ID != "" {
			kinds[s.ID] = "sesion"
		}
	}
	add := func(id, kind, ctx string) {
		if id == "" {
			h = append(h, Hallazgo{"error", "referencia", ctx + " no declara `id`"})
		} else if _, dup := kinds[id]; dup {
			h = append(h, Hallazgo{"error", "identidad de referencia", fmt.Sprintf("%s repite el identificador %q", ctx, id)})
		} else {
			kinds[id] = kind
		}
	}
	for i := range p.References.FutureSuccessors {
		f := &p.References.FutureSuccessors[i]
		ctx := fmt.Sprintf("future_successors[%d]", i)
		if f.ID != "" {
			ctx = f.ID
		}
		add(f.ID, "future", ctx)
		deps[f.ID], reps[f.ID] = f.Dependencies, f.Replaces
		if strings.TrimSpace(f.Reason) == "" || strings.TrimSpace(f.Result) == "" || strings.TrimSpace(f.Zone) == "" {
			h = append(h, Hallazgo{"error", "referencia futura", ctx + " debe declarar reason, result y zone"})
		}
		h = append(h, validateFragmentLocator(root, f.AssignmentSource, ctx+" assignment_source")...)
		for _, dep := range f.Dependencies {
			if kind := kinds[dep]; kind == "" || kind == "satisfied" {
				h = append(h, Hallazgo{"error", "dependencias de referencia", fmt.Sprintf("%s depende de %q, que no existe como Sesión o sucesora futura", f.ID, dep)})
			}
		}
		for _, original := range f.Replaces {
			orig, ok := sesionesPorID[original]
			if !ok || kinds[original] != "sesion" {
				h = append(h, Hallazgo{"error", "linaje de referencia", fmt.Sprintf("%s reemplaza a %q, que no es una Sesión existente", f.ID, original)})
			} else if !orig.Archivada {
				h = append(h, Hallazgo{"error", "linaje de referencia", fmt.Sprintf("%s reemplaza a %s, que no está archivada", f.ID, original)})
			}
		}
	}
	for i := range p.References.SatisfiedHistory {
		s := &p.References.SatisfiedHistory[i]
		ctx := fmt.Sprintf("satisfied_history[%d]", i)
		if s.ID != "" {
			ctx = s.ID
		}
		add(s.ID, "satisfied", ctx)
		if strings.TrimSpace(s.Reason) == "" {
			h = append(h, Hallazgo{"error", "referencia histórica", ctx + " debe declarar reason"})
		}
		h = append(h, validateFragmentLocator(root, s.TerminalSource, ctx+" terminal_source")...)
	}
	for _, s := range p.Sesiones {
		// A Sesión's depende_de closes structurally on a satisfied-history
		// identity — that closure is the reference's whole purpose
		// (design.md:577) — so it is never rejected here. A satisfied-history
		// reference is already a graph leaf: its closed shape (`SatisfiedHistory`
		// carries no `dependencies` field; KnownFields(true) rejects one) means
		// it can declare no outgoing edge of its own, and referenceCycleErrors
		// below never follows a "satisfied" kind further. The only remaining
		// historical-leaf restriction is replacement direction, checked next.
		for _, original := range s.Reemplaza {
			if kind, ok := kinds[original]; ok && kind != "sesion" {
				h = append(h, Hallazgo{"error", "linaje de referencia", fmt.Sprintf("%s no puede reemplazar la referencia %q", s.ID, original)})
			}
		}
		deps[s.ID], reps[s.ID] = s.DependeDe, s.Reemplaza
	}
	h = append(h, referenceCycleErrors(kinds, deps, "dependencias de referencia circulares")...)
	h = append(h, referenceCycleErrors(kinds, reps, "linaje de referencia circular")...)
	return h
}

// referenceCycleErrors detects cycles; satisfied-history is never followed as a target.
func referenceCycleErrors(kinds map[string]string, edges map[string][]string, regla string) []Hallazgo {
	var h []Hallazgo
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
		vecinos := append([]string(nil), edges[id]...)
		sort.Strings(vecinos)
		for _, dep := range vecinos {
			if kinds[dep] != "" && kinds[dep] != "satisfied" {
				visit(dep, append(camino, id))
			}
		}
		estado[id] = 2
	}
	ids := make([]string, 0, len(kinds))
	for id := range kinds {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	for _, id := range ids {
		visit(id, nil)
	}
	for _, c := range ciclos {
		h = append(h, Hallazgo{"error", regla, "ciclo: " + c})
	}
	return h
}

// validateFragmentLocator proves only immutable-locator structure, never fragment meaning.
func validateFragmentLocator(root string, loc FragmentLocator, etiqueta string) []Hallazgo {
	commit, err := gitOID(root, loc.Commit)
	if err != nil {
		return []Hallazgo{{"error", "locator de referencia", fmt.Sprintf("%s: commit inválido: %v", etiqueta, err)}}
	}
	ruta, err := exactRepoFile(root, loc.Path)
	if err != nil {
		return []Hallazgo{{"error", "locator de referencia", fmt.Sprintf("%s: ruta inválida: %v", etiqueta, err)}}
	}
	entry, err := gitOutput(root, "ls-tree", commit, "--", ruta)
	parts := strings.Fields(entry)
	if err != nil || len(parts) != 4 || parts[1] != "blob" || (parts[0] != "100644" && parts[0] != "100755") || parts[2] != loc.Blob {
		return []Hallazgo{{"error", "locator de referencia", fmt.Sprintf("%s: no prueba un blob regular exacto", etiqueta)}}
	}
	raw, err := exec.Command("git", "-C", root, "cat-file", "blob", loc.Blob).Output()
	if err != nil {
		return []Hallazgo{{"error", "locator de referencia", fmt.Sprintf("%s: blob ilegible: %v", etiqueta, err)}}
	}
	if loc.LineStart < 1 || loc.LineEnd < loc.LineStart || loc.ByteStart < 0 || loc.ByteEnd <= loc.ByteStart || loc.ByteEnd > len(raw) {
		return []Hallazgo{{"error", "locator de referencia", fmt.Sprintf("%s: los límites de línea o byte no son válidos", etiqueta)}}
	}
	starts := []int{0}
	for i, b := range raw {
		if b == '\n' {
			starts = append(starts, i+1)
		}
	}
	lineEndByte := len(raw)
	if loc.LineEnd < len(starts) {
		lineEndByte = starts[loc.LineEnd]
	}
	var h []Hallazgo
	if loc.LineEnd > len(starts) || starts[loc.LineStart-1] != loc.ByteStart || lineEndByte != loc.ByteEnd {
		h = append(h, Hallazgo{"error", "locator de referencia", fmt.Sprintf("%s: el intervalo de línea no coincide con el de bytes", etiqueta)})
	}
	sum := sha256.Sum256(raw[loc.ByteStart:loc.ByteEnd])
	if !strings.EqualFold(loc.FragmentSHA256, hex.EncodeToString(sum[:])) {
		h = append(h, Hallazgo{"error", "locator de referencia", fmt.Sprintf("%s: el sha256 no coincide con los bytes exactos", etiqueta)})
	}
	return h
}
