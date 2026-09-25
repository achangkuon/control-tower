package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os/exec"
	"path"
	"path/filepath"
	"reflect"
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
		// Normal native ODD never has a provider change. A valid explicit human
		// SDD request does: it reaches the same fail-closed ledger checks as the
		// established full-sdd route without starting a lifecycle.
		if strings.TrimSpace(s.Cambio) == "" || (s.esEncargo() && !s.solicitudSDDValida()) {
			continue
		}
		if s.RutaEfectiva() != RutaSDDNativa {
			// Only full-sdd owns a native SDD change; asking gentle-ai about any other
			// route would report a pipeline that Sesión never enters.
			h = append(h, checkPuertaSDD(root, s)...)
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
	h = append(h, p.checkPrioridades()...)
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
	master := ""

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
		archivoPropio := s.Historico != ""
		validationHead := head
		if archivoPropio {
			if s.Historico != archivePath(s.ID) || s.Entrega == nil {
				h = append(h, Hallazgo{"error", "histórico", fmt.Sprintf("%s tiene una referencia histórica inválida", s.ID)})
			} else {
				archived, err := archivedSession(root, *s)
				if err != nil || !reflect.DeepEqual(archived, *s) {
					h = append(h, Hallazgo{"error", "histórico", fmt.Sprintf("%s: histórico ausente, modificado o inválido: %v", s.ID, err)})
				}
				if master == "" {
					resolved, resolveErr := gitOutput(root, "rev-parse", "--verify", "refs/heads/master^{commit}")
					if resolveErr != nil {
						h = append(h, Hallazgo{"error", "histórico", fmt.Sprintf("no se pudo resolver master: %v", resolveErr)})
					} else {
						master = resolved
					}
				}
				if master != "" {
					validationHead = master
					if ok, detail := entregaIntegrada(root, s.Entrega.Commit, master); !ok {
						h = append(h, Hallazgo{"error", "histórico", fmt.Sprintf("%s: %s", s.ID, detail)})
					}
				}
			}
			// Load replaces the compact reference with its full historical record.
			// Validate it as a completed Session, not as archived legacy work.
			// Keep the actual plan object unchanged.
			original := *s
			original.Archivada = false
			original.Historico = ""
			s = &original
		}

		importada := s.ImportacionLegacy != nil
		pendiente := importada && s.ImportacionLegacy.TerritorioPendiente && !s.esEncargo()
		encargoIncompleto := s.encargoIncompleto()
		decomposicionDiferida := importada && s.ImportacionLegacy.DescomposicionDiferida
		historica := esTerritorioHistorico(s)
		if importada {
			h = append(h, checkImportacionLegacy(root, validationHead, s, provenienciasVistas)...)
		}
		if decomposicionDiferida && !s.esEncargo() {
			h = append(h, checkDescomposicionDiferida(s)...)
		}
		if len(s.RutasHistoricas) > 0 && (!importada || !s.Archivada || s.Entrega != nil || pendiente || len(s.Modulos) != 0 || s.Zona != "" || len(s.Cimientos) != 0 || s.Ruta != (RutaSesion{})) {
			h = append(h, Hallazgo{"error", "rutas históricas", fmt.Sprintf("%s sólo puede preservar rutas históricas sin Módulos como importación archivada", s.ID)})
		}
		if encargoIncompleto {
			// An explicit incomplete Encargo is storable and visible but grants no
			// execution territory. checkEncargo validates its retained context.
		} else if pendiente {
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

		abierta := !archivoPropio && s.Entrega == nil && !s.Archivada
		if strings.TrimSpace(s.Resultado) == "" {
			h = append(h, Hallazgo{"error", "resultado", fmt.Sprintf("%s debe declarar un resultado no vacío", s.ID)})
		}
		h = append(h, validarAutoridad(root, s)...)
		h = append(h, validarArchivo(p, s)...)
		h = append(h, medirLoteEntregado(p, root, validationHead, s)...)
		if s.esEncargo() {
			if archivoPropio {
				h = append(h, p.checkArchivedEncargo(root, validationHead, s)...)
			} else {
				h = append(h, p.checkEncargo(root, validationHead, s)...)
			}
			h = append(h, checkSolicitudSDD(s)...)
		} else if len(s.Archivos) != 0 || s.SoloLectura || s.SolicitudSDD != nil {
			h = append(h, Hallazgo{"error", "contrato legacy", fmt.Sprintf("%s declara archivos, solo_lectura o solicitud_sdd sin encargo", s.ID)})
		}
		if abierta && !s.esEncargo() && len(s.Criterios) == 0 && !permiteCriteriosPendientes(s) {
			h = append(h, Hallazgo{"error", "criterios binarios", fmt.Sprintf("%s no tiene criterios de aceptación", s.ID)})
		}
		if abierta && !pendiente && !encargoIncompleto && !s.esEncargo() {
			h = append(h, checkRuta(s, root, head)...)
			h = append(h, checkProfundidad(s)...)
		}
		if !s.esEncargo() && (abierta || len(s.Modulos) > 0) {
			h = append(h, p.checkModulos(root, s, modulosVistos, tareasVistas, importada, pendiente, historica, archivoPropio)...)
		}
		h = append(h, checkDecisiones(s)...)
		if s.Entrega != nil {
			if s.Entrega.PR != nil && *s.Entrega.PR <= 0 {
				h = append(h, Hallazgo{"error", "entrega", fmt.Sprintf("%s declara un PR que no es positivo", s.ID)})
			}
			if !archivoPropio {
				if ok, detalle := entregaIntegrada(root, s.Entrega.Commit, head); !ok {
					h = append(h, Hallazgo{"error", "entrega integrada", fmt.Sprintf("%s: %s", s.ID, detalle)})
				}
			}
		}
	}
	return h
}

// Historical write paths retain their exact lexical shape without resolving
// today's filesystem, where a former file may now be absent or a symlink.
func rutaHistoricaNormalizada(value string) bool {
	if value == "" || strings.TrimSpace(value) != value || filepath.IsAbs(value) || path.Clean(value) != value || value == "." || strings.ContainsAny(value, `\*?[`) {
		return false
	}
	for _, part := range strings.Split(value, "/") {
		if part == "" || part == "." || part == ".." {
			return false
		}
	}
	return true
}

// checkArchivedEncargo keeps historical contract shape and legacy evidence but
// never reassigns delivered files against today's active ownership partition.
func (p *Plan) checkArchivedEncargo(root, head string, s *Sesion) []Hallazgo {
	var h []Hallazgo
	if s.Ruta != (RutaSesion{}) || len(s.RutasHistoricas) != 0 || (strings.TrimSpace(s.Cambio) != "" && !s.solicitudSDDValida()) {
		h = append(h, Hallazgo{"error", "contrato de encargo", fmt.Sprintf("%s declara ruta o cambio incompatible con su encargo", s.ID)})
	}
	if s.Encargo.Incompleto {
		h = append(h, Hallazgo{"error", "encargo incompleto", fmt.Sprintf("%s tiene entrega pero su encargo está incompleto", s.ID)})
	} else {
		for _, field := range []struct{ name, value string }{
			{"pedido_contexto", s.Encargo.PedidoContexto},
			{"resultado_comportamiento", s.Encargo.ResultadoComportamiento},
			{"restricciones_decisiones", s.Encargo.RestriccionesDecisiones},
			{"referencias", s.Encargo.Referencias},
		} {
			if strings.TrimSpace(field.value) == "" {
				h = append(h, Hallazgo{"error", "encargo", fmt.Sprintf("%s debe declarar encargo.%s", s.ID, field.name)})
			}
		}
	}
	if (s.SoloLectura && (len(s.Archivos) != 0 || len(s.Cimientos) != 0)) || (!s.SoloLectura && len(s.Archivos) == 0) {
		h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s tiene archivos incompatibles con su encargo", s.ID)})
	}
	seen := map[string]bool{}
	for _, archivo := range s.Archivos {
		if !rutaHistoricaNormalizada(archivo) {
			h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s conserva una ruta histórica no normalizada: %q", s.ID, archivo)})
		}
		if seen[archivo] {
			h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s declara dos veces %q", s.ID, archivo)})
		}
		seen[archivo] = true
	}
	for _, cimiento := range s.Cimientos {
		if !contiene(s.Archivos, cimiento) {
			h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s reserva el Cimiento %q sin declararlo en archivos", s.ID, cimiento)})
		}
	}
	return append(h, p.checkEvidenciaLegacyDeEncargo(root, head, s)...)
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

func (p *Plan) checkModulos(root string, s *Sesion, modulosVistos, tareasVistas map[string]bool, importada, pendiente, historica, archivoPropio bool) []Hallazgo {
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
			if archivoPropio {
				if !rutaHistoricaNormalizada(ruta) {
					h = append(h, Hallazgo{"error", "ruta de Módulo", fmt.Sprintf("%s: ruta histórica no normalizada %q", m.ID, ruta)})
				}
				continue // no present-day filesystem or ownership claim
			}
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
			} else if !s.esEncargo() && route != s.Ruta.Propuesta {
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
				if kind := referencias[dep]; kind != "" {
					// A future or satisfied-history reference is structurally
					// present (design.md:577, design.md:587: "closes only that
					// missing structural edge" / "may register structural
					// lineage closure"). It is not a Sesión, so it grants no
					// readiness — EstadosAt resolves depende_de only against
					// p.SesionPorID() and this dependency never becomes met by
					// this edge alone. See checkReferencias for reference-owned
					// graph rules (identity, locator, leaf, cycle).
					if kind == "satisfied" && s.Entrega == nil && !s.Archivada {
						// Unlike future_successors, satisfied_history proves
						// history already closed and never becomes a
						// dependency target (plan.go:253): an OPEN Sesión
						// waiting on it could never become LISTO through this
						// edge. That is an authoring error, not silent. A
						// closed Sesión (entrega registered, or archivada)
						// keeps the edge silently — satisfied_history exists
						// to close exactly that frozen legacy dependency for
						// an imported Sesión (migrate-control-tower-plan-zones
						// design.md:564).
						h = append(h, Hallazgo{"error", "dependencias hacia historia satisfecha",
							fmt.Sprintf("%s depende de %q, que ya es historia satisfecha (references.satisfied_history): una Sesión abierta nunca queda LISTO por esa arista", s.ID, dep)})
					}
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

// checkPrioridades validates the optional work order. A priority can only
// postpone ready work, so every shape that would silently drop a Sesión from the
// order, or make one wait on work scheduled after it, fails closed.
func (p *Plan) checkPrioridades() []Hallazgo {
	var h []Hallazgo
	if len(p.Prioridades) == 0 {
		for _, s := range p.Sesiones {
			if s.Prioridad != "" {
				h = append(h, Hallazgo{"error", "prioridades",
					fmt.Sprintf("%s declara la prioridad %q pero el plan no declara prioridades", s.ID, s.Prioridad)})
			}
		}
		return h
	}

	vistas := map[string]bool{}
	for i, pr := range p.Prioridades {
		switch {
		case strings.TrimSpace(pr.ID) == "":
			h = append(h, Hallazgo{"error", "prioridades", fmt.Sprintf("la prioridad en la posición %d está sin id", i+1)})
		case vistas[pr.ID]:
			h = append(h, Hallazgo{"error", "prioridades", fmt.Sprintf("la prioridad %q está declarada dos veces", pr.ID)})
		}
		vistas[pr.ID] = true
		if strings.TrimSpace(pr.Nombre) == "" {
			h = append(h, Hallazgo{"error", "prioridades", fmt.Sprintf("la prioridad %q no tiene nombre", pr.ID)})
		}
	}

	orden := p.PrioridadPorID()
	index := p.SesionPorID()
	for _, s := range p.Sesiones {
		pos, conocida := orden[s.Prioridad]
		abierta := s.Entrega == nil && !s.Archivada
		switch {
		case s.Prioridad == "" && abierta:
			h = append(h, Hallazgo{"error", "prioridades", fmt.Sprintf("%s está abierta y no declara prioridad", s.ID)})
		case s.Prioridad != "" && !conocida && abierta:
			// Closed history may keep a retired priority id; only open work must resolve.
			h = append(h, Hallazgo{"error", "prioridades", fmt.Sprintf("%s declara la prioridad %q, que no está en prioridades", s.ID, s.Prioridad)})
		}
		if !conocida {
			continue
		}
		for _, dep := range s.DependeDe {
			d, existe := index[dep]
			if !existe {
				continue
			}
			if posDep, ok := orden[d.Prioridad]; ok && posDep > pos {
				h = append(h, Hallazgo{"error", "prioridades",
					fmt.Sprintf("%s depende de %s, que pertenece a una prioridad posterior (%q va después de %q)", s.ID, d.ID, d.Prioridad, s.Prioridad)})
			}
		}
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
// validarArchivo checks the declared way a Sesión left the live plan. The six
// archived Sesiones of this plan proved there are three: four are replaced,
// and S4.9 and S9.4 are retained as historical evidence with neither delivery
// nor replacement.
//
// A Sesión that has not declared its path yet still passes. Requiring it here
// would fail exactly those two, which have no way to declare it until the
// field exists; a later Sesión turns the requirement on once the data is in.
func validarArchivo(p *Plan, s *Sesion) []Hallazgo {
	if s.Archivo == "" {
		return nil
	}
	if !s.Archivada {
		return []Hallazgo{{"error", "camino de archivo", fmt.Sprintf("%s declara el camino de archivo %q pero no está archivada", s.ID, s.Archivo)}}
	}
	if !contiene(CaminosDeArchivo, s.Archivo) {
		return []Hallazgo{{"error", "camino de archivo", fmt.Sprintf("%s declara el camino %q, que no es uno de %s", s.ID, s.Archivo, strings.Join(CaminosDeArchivo, ", "))}}
	}
	switch s.Archivo {
	case "entregada":
		if s.Entrega == nil || strings.TrimSpace(s.Entrega.Commit) == "" {
			return []Hallazgo{{"error", "camino de archivo", fmt.Sprintf("%s se archivó por entrega y no declara su entrega", s.ID)}}
		}
	case "reemplazada":
		if !tieneSucesora(p, s.ID) {
			return []Hallazgo{{"error", "camino de archivo", fmt.Sprintf("%s se archivó por reemplazo y no tiene sucesora que la reemplace", s.ID)}}
		}
	}
	return nil
}

// tieneSucesora accepts both shapes the plan uses: a Sesión declaring
// `reemplaza`, and a future successor declaring `replaces`. S5.14 arrives by
// the first and S9.3 by the second, so neither can be left out.
func tieneSucesora(p *Plan, id string) bool {
	for i := range p.Sesiones {
		if contiene(p.Sesiones[i].Reemplaza, id) {
			return true
		}
	}
	if p.References != nil {
		for _, f := range p.References.FutureSuccessors {
			if contiene(f.Replaces, id) {
				return true
			}
		}
	}
	return false
}

// medirLoteEntregado reads only commits reachable from the pinned HEAD. A
// Session without Module trailers retains its delivery-commit fallback.
func medirLoteEntregado(p *Plan, root, head string, s *Sesion) []Hallazgo {
	if p.Politica.TopeDeLote <= 0 || s.Entrega == nil || strings.TrimSpace(s.Entrega.Commit) == "" {
		return nil
	}
	if ok, _ := entregaIntegrada(root, s.Entrega.Commit, head); !ok {
		return nil // checkSesionesAt reports invalid delivery evidence separately.
	}
	formato := "--format=%H%x1f%(trailers:key=" + trailerDeModulo + ",valueonly,separator=%x1f)%x1e"
	out, err := gitOutput(root, "log", formato, head)
	if err != nil {
		return []Hallazgo{{"error", "tope de lote", fmt.Sprintf("%s: no se pudieron leer los commits: %v", s.ID, err)}}
	}
	deSesion := map[string]bool{}
	for _, m := range s.Modulos {
		deSesion[m.ID] = true
	}
	prefijo := "M" + strings.TrimPrefix(s.ID, "S") + "."
	lineas := map[string]int{}
	for _, registro := range strings.Split(out, "\x1e") {
		campos := strings.Split(strings.TrimSpace(registro), "\x1f")
		if len(campos) < 2 || campos[0] == "" {
			continue
		}
		ids := map[string]bool{}
		for _, trailer := range campos[1:] {
			id := strings.TrimSpace(trailer)
			if deSesion[id] || (legacyModuloID.MatchString(id) && strings.HasPrefix(id, prefijo)) {
				ids[id] = true
			}
		}
		if len(ids) == 0 {
			continue
		}
		n, measureErr := lineasDelCommit(root, campos[0], p.Politica.ExcluirDelLote)
		if measureErr != nil {
			return []Hallazgo{{"error", "tope de lote", fmt.Sprintf("%s: no se pudo medir %s: %v", s.ID, campos[0], measureErr)}}
		}
		for id := range ids {
			lineas[id] += n
		}
	}
	if len(lineas) == 0 {
		n, measureErr := lineasDelCommit(root, s.Entrega.Commit, p.Politica.ExcluirDelLote)
		if measureErr != nil {
			return []Hallazgo{{"error", "tope de lote", fmt.Sprintf("%s: no se pudo medir la entrega: %v", s.ID, measureErr)}}
		}
		lineas["sin Módulo"] = n
	}
	ids := make([]string, 0, len(lineas))
	for id := range lineas {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	var h []Hallazgo
	for _, id := range ids {
		if lineas[id] > p.Politica.TopeDeLote {
			h = append(h, Hallazgo{"aviso", "tope de lote", fmt.Sprintf("%s, %s: %d líneas medidas; tope %d", s.ID, id, lineas[id], p.Politica.TopeDeLote)})
		}
	}
	return h
}

// lineasDelCommit counts text additions and deletions, ignoring only declared
// exact files or directory prefixes. NUL numstat preserves paths with spaces.
func lineasDelCommit(root, commit string, excluir []string) (int, error) {
	out, err := gitOutput(root, "show", "--no-renames", "--numstat", "-z", "--format=", commit)
	if err != nil {
		return 0, err
	}
	total := 0
	for _, entry := range strings.Split(out, "\x00") {
		campos := strings.SplitN(strings.TrimPrefix(entry, "\n"), "\t", 3)
		if len(campos) != 3 || campos[0] == "-" || campos[1] == "-" {
			continue // Git cannot count binary lines.
		}
		skip := false
		for _, path := range excluir {
			if path != "" && (campos[2] == path || (strings.HasSuffix(path, "/") && strings.HasPrefix(campos[2], path))) {
				skip = true
				break
			}
		}
		if skip {
			continue
		}
		added, e1 := strconv.Atoi(campos[0])
		deleted, e2 := strconv.Atoi(campos[1])
		if e1 != nil || e2 != nil {
			return 0, fmt.Errorf("numstat inválido para %q", campos[2])
		}
		total += added + deleted
	}
	return total, nil
}

// lineasEscritas counts added lines in one commit. Binary files report "-" in
// numstat and are skipped rather than guessed at.
func lineasEscritas(root, commit string) (int, error) {
	out, err := gitOutput(root, "show", "--numstat", "--format=", commit)
	if err != nil {
		return 0, err
	}
	total := 0
	for _, linea := range strings.Split(out, "\n") {
		campos := strings.Fields(linea)
		if len(campos) < 3 || campos[0] == "-" {
			continue
		}
		n, err := strconv.Atoi(campos[0])
		if err != nil {
			continue
		}
		total += n
	}
	return total, nil
}

// validarTopeDeLote measures authored lines against the declared ceiling. An
// absent ceiling measures nothing: the cap is policy, and a tool that invents
// a policy nobody declared is worse than one that does not verify it.
func validarTopeDeLote(p *Plan, lineas int) []Hallazgo {
	if p.Politica.TopeDeLote == 0 {
		return nil
	}
	if p.Politica.TopeDeLote < 0 {
		return []Hallazgo{{"error", "tope de lote", fmt.Sprintf("el tope declarado es %d, y un tope no puede ser negativo", p.Politica.TopeDeLote)}}
	}
	if lineas > p.Politica.TopeDeLote {
		return []Hallazgo{{"aviso", "tope de lote", fmt.Sprintf("el candidato escribió %d líneas y el tope declarado es %d", lineas, p.Politica.TopeDeLote)}}
	}
	return nil
}

// RegistroDeDecisiones is the one citable register. Its twin under
// openspec/plans/ is retired by S114: two byte-identical copies of the same
// authority is the second source of truth the canon forbids. It is frozen —
// cited, never edited — because new decisions live in each Sesión's
// `decisiones` field, and the register stopped growing at 108.
const RegistroDeDecisiones = "openspec/archive/legacy-planning/decision-register.md"

// validarAutoridad checks where a Sesión says it came from. Every citation it
// declares is verified on its own, with the same demand whether it stands alone
// or inside a list. The legacy free text passes untouched: S114 migrates one
// Zona per Módulo and S115 turns the requirement on, so demanding the type here
// would fail every Sesión at once.
func validarAutoridad(root string, s *Sesion) []Hallazgo {
	a := s.Autoridad
	if !a.Declarada() {
		return []Hallazgo{{"error", "autoridad de Sesión", fmt.Sprintf("%s debe declarar la autoridad que delimita su alcance", s.ID)}}
	}
	if !a.Tipada() {
		return nil
	}
	var h []Hallazgo
	for i, c := range a.Citas {
		h = append(h, validarCita(root, nombreDeCita(s.ID, i, len(a.Citas)), c)...)
	}
	return h
}

// nombreDeCita is what a finding calls the citation it is about. A Sesión that
// rests on one source is written without a list, so the Sesión alone names it;
// inside a list the finding has to say which of them failed.
func nombreDeCita(sesion string, i, total int) string {
	if total == 1 {
		return sesion
	}
	return fmt.Sprintf("%s (cita %d de %d)", sesion, i+1, total)
}

// validarCita is the single verification of one citation, applied with the same
// demand to the simple form and to every element of the composed one.
func validarCita(root, nombre string, c Cita) []Hallazgo {
	if !contiene(TiposDeAutoridad, c.Tipo) {
		return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s declara el tipo de autoridad %q, que no es uno de %s", nombre, c.Tipo, strings.Join(TiposDeAutoridad, ", "))}}
	}
	etiqueta := nombre + " autoridad"
	switch c.Tipo {
	case "engram":
		if c.ID <= 0 {
			return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s cita Engram sin declarar un id", nombre)}}
		}
		// Reported, never counted as proven. Saying "verified" about something
		// this tool cannot open is how a pass stops meaning anything.
		return []Hallazgo{{"aviso", "autoridad no verificable", fmt.Sprintf("%s cita Engram %d, que vive fuera de Git: se declara y no se prueba", nombre, c.ID)}}
	case "repo":
		return validateFragmentLocator(root, c.Loc, etiqueta)
	case "decision":
		if c.Ref <= 0 {
			return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s cita una decisión sin declarar su número", nombre)}}
		}
		if c.Loc.Path != RegistroDeDecisiones {
			return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s cita la decisión %d fuera del registro: %q", nombre, c.Ref, c.Loc.Path)}}
		}
		if h := validateFragmentLocator(root, c.Loc, etiqueta); len(h) > 0 {
			return h
		}
		return verificarNumeroDeDecision(root, c, nombre)
	}
	return nil
}

// verificarNumeroDeDecision is the one check `repo` cannot make: that the bytes
// proven by the locator actually name the decision the citation claims. Without
// it a mis-copied range passes, and the citation says nothing.
func verificarNumeroDeDecision(root string, c Cita, nombre string) []Hallazgo {
	raw, err := exec.Command("git", "-C", root, "cat-file", "blob", c.Loc.Blob).Output()
	if err != nil || c.Loc.ByteEnd > len(raw) {
		return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s: el fragmento de la decisión %d no se pudo leer", nombre, c.Ref)}}
	}
	fragmento := string(raw[c.Loc.ByteStart:c.Loc.ByteEnd])
	if !fragmentoNombra(fragmento, c.Ref) {
		return []Hallazgo{{"error", "autoridad", fmt.Sprintf("%s cita la decisión %d pero el fragmento declarado no la nombra", nombre, c.Ref)}}
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
	if !contiene(RutasValidas, ruta) {
		// An invalid route value is already reported by checkRuta; saying it
		// twice in different words helps nobody.
		return nil
	}
	if ruta != RutaSDDNativa {
		return []Hallazgo{{"error", "cambio SDD", fmt.Sprintf(
			"%s declara el cambio %q con ruta %s, pero sólo una Sesión %s recorre el SDD nativo",
			s.ID, s.Cambio, ruta, RutaSDDNativa)}}
	}
	status, err := readSDDStatus(root, s.Cambio)
	if err != nil {
		return []Hallazgo{{"error", "estado SDD", fmt.Sprintf("%s declara cambio %q pero su estado no está disponible: %v", s.ID, s.Cambio, err)}}
	}
	if fasePos(status.Next) < 0 {
		return []Hallazgo{{"error", "puerta de ruta", fmt.Sprintf("%s: el cambio %q reporta la fase %q, que no pertenece al pipeline", s.ID, s.Cambio, status.Next)}}
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
