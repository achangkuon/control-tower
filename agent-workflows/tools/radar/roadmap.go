package main

import (
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
)

// ClaseCompatibilidad is the verdict on one pair of LISTO alternatives.
//
// These are forecast classes, not permissions. They answer "could these two
// results be worked at the same time without colliding", which is a different
// question from "may this Sesión start", and a much weaker one: the seat
// forecast in AsientosAt stays exactly as it was, and neither grants a claim.
type ClaseCompatibilidad string

const (
	// Compatible: disjoint declared files, no shared Cimiento, no shared Recurso.
	Compatible ClaseCompatibilidad = "compatible"
	// CimientoCompartido: workable, but only under coordinated intervention on
	// the exact shared file. A Cimiento is a condition, never a blanket veto.
	CimientoCompartido ClaseCompatibilidad = "cimiento-compartido"
	// SolapaArchivos: the two declarations name the same file outside any
	// Cimiento, so the combination collides.
	SolapaArchivos ClaseCompatibilidad = "solapa-archivos"
	// RecursoExcluyente: both sides hold the same exclusive resource.
	RecursoExcluyente ClaseCompatibilidad = "recurso-excluyente"
	// Indeterminado: at least one side did not declare its files. An unknown
	// declaration is never read as empty, and never as safe.
	Indeterminado ClaseCompatibilidad = "indeterminado"
)

// These two strings are the guardrail against the failure this whole view could
// cause: a reader — or a skill quoting it — treating a forecast as permission.
const (
	previsionNoEsPermiso = "Previsión sobre el plan y la base vigentes. No es permiso de ejecución: " +
		"no reserva capacidad, no asigna workers, no concede acceso y no supone que la " +
		"coordinación esté instalada. La admisión sigue siendo la de siempre."
	sinPrioridadDeclarada = "ninguna"
)

// Alternativa is one Sesión currently offered as startable, carrying the exact
// declarations every file-level conclusion is derived from.
type Alternativa struct {
	Sesion    string
	Zona      string
	Resultado string
	Prioridad string
	Archivos  []string
	Cimientos []string
	Recurso   []string
}

// alternativaDe carries the exact declarations of one Sesión, whatever its
// state, so clasificarPar can compare any two records.
func alternativaDe(s *Sesion) Alternativa {
	return Alternativa{
		Sesion: s.ID, Zona: s.Zona, Resultado: s.Resultado,
		Prioridad: s.Prioridad, Archivos: copiaOrdenada(s.Archivos),
		Cimientos: copiaOrdenada(s.Cimientos), Recurso: copiaOrdenada(s.Recurso),
	}
}

// Par is the verdict on one unordered combination, with the exact evidence that
// produced it. A verdict without the offending path is not reviewable.
type Par struct {
	A       string
	B       string
	Clase   ClaseCompatibilidad
	Motivo  string
	Detalle []string
}

// Roadmap is the structured evidence behind the human view. It is deliberately
// not a second source of truth: states and queues use the same derivation as
// EstadosAt and ColaPorZonaAt, from one captured observation.
type Roadmap struct {
	Head            string
	PrioridadActiva string
	Prevision       string
	// Interruptor names the pilot switch the LISTO rule used; Novedades and
	// Revisiones list the unattended work left for a human. All three derive from
	// the same captured observation as the states above, never from a reread.
	Interruptor string
	Novedades   []SesionPiloto
	Revisiones  []SesionPiloto
	// Autoriza exists to be read as false. A consumer that looks for execution
	// authority in this report finds an explicit denial rather than silence.
	Autoriza     bool
	Alternativas []Alternativa
	Pares        []Par
	Escenarios   []Escenario
}

// Escenario answers one bounded question: if this Sesión were closed, what
// would actually open? It separates the two claims people conflate — a
// dependency being satisfied, and a Sesión being genuinely startable.
type Escenario struct {
	Si             string
	Desbloquea     []string
	QuedanListo    []string
	SiguenSinAbrir []Retenida
}

// SesionPiloto is one Sesión the unattended run left for a human: its estado's
// motivo/nota and the flight that owns it. Radar derives it, never authors it.
type SesionPiloto struct {
	Sesion string
	Vuelo  string
	Nota   string
}

// Retenida is a Sesión whose declared dependencies would all be satisfied and
// which still would not start, with the derived state and the reason.
type Retenida struct {
	Sesion string
	Estado string
	Motivo string
}

// Roadmap projects the alternatives at the current HEAD.
func (p *Plan) Roadmap(root string) Roadmap {
	head, _ := gitHEAD(root)
	return p.RoadmapAt(root, head)
}

// RoadmapAt samples dispatch evidence once; states, queues and priority all
// derive from that observation. Hypothetical scenarios remain marker-free.
func (p *Plan) RoadmapAt(root, head string) Roadmap {
	return p.roadmapConObservacion(root, head, p.observarDespachos(root))
}

func (p *Plan) roadmapConObservacion(root, head string, obs dispatchObservation) Roadmap {
	estados := p.estadosConObservacion(root, head, nil, obs)
	return p.roadmapConEstados(root, head, estados, p.colaConEstados(estados), obs.piloto)
}

// roadmapConEstados is shared by Roadmap and Snapshot so their forecasts use
// exactly the states and queues derived from each command's single observation.
func (p *Plan) roadmapConEstados(root, head string, estados map[string]string, colas map[string][]string, piloto pilotObservation) Roadmap {
	index := p.SesionPorID()
	alternativas := make([]Alternativa, 0)
	zonas := make([]string, 0, len(colas))
	for zona := range colas {
		zonas = append(zonas, zona)
	}
	sort.Strings(zonas)
	for _, zona := range zonas {
		for _, id := range colas[zona] {
			if estados[id] != Listo {
				continue
			}
			s, existe := index[id]
			if !existe {
				continue
			}
			alternativas = append(alternativas, alternativaDe(s))
		}
	}
	pares := make([]Par, 0)
	for i := range alternativas {
		for j := i + 1; j < len(alternativas); j++ {
			pares = append(pares, clasificarPar(alternativas[i], alternativas[j]))
		}
	}
	activa := sinPrioridadDeclarada
	if pos, ok := p.prioridadActiva(estados); ok {
		activa = p.Prioridades[pos].ID
	}
	novedades, revisiones := p.sesionesPiloto(estados, piloto)
	return Roadmap{
		Head: head, PrioridadActiva: activa, Prevision: previsionNoEsPermiso,
		Interruptor:  interruptorTexto(piloto),
		Novedades:    novedades,
		Revisiones:   revisiones,
		Alternativas: alternativas, Pares: pares,
		Escenarios: p.escenariosAt(root, head, estados, index),
	}
}

// sesionesPiloto lists the unattended work in plan order: stopped for a decision
// (NOVEDAD) and finished awaiting review (POR REVISAR).
func (p *Plan) sesionesPiloto(estados map[string]string, po pilotObservation) ([]SesionPiloto, []SesionPiloto) {
	var novedades, revisiones []SesionPiloto
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		switch estados[s.ID] {
		case Novedad:
			novedades = append(novedades, SesionPiloto{Sesion: s.ID, Vuelo: po.vuelo[s.ID], Nota: po.novedad[s.ID]})
		case PorRevisar:
			revisiones = append(revisiones, SesionPiloto{Sesion: s.ID, Vuelo: po.vuelo[s.ID], Nota: po.porRevisar[s.ID]})
		}
	}
	return novedades, revisiones
}

// interruptorTexto renders the switch the rule used, so the view says which
// rule produced its verdict instead of leaving the reader to guess.
func interruptorTexto(po pilotObservation) string {
	if po.interruptor == nil {
		return "apagado"
	}
	if !po.interruptor.Prendido {
		return "apagado"
	}
	rondas, tope := "sin límite", "sin tope"
	if po.interruptor.Rondas > 0 {
		rondas = strconv.Itoa(po.interruptor.Rondas)
	}
	if po.interruptor.Tope > 0 {
		tope = strconv.Itoa(po.interruptor.Tope)
	}
	return fmt.Sprintf("prendido (%s rondas, tope %s)", rondas, tope)
}

// escenariosAt builds one scenario per Sesión that actually holds someone else
// back. Enumerating the rest would pad the report with hypotheticals nobody
// asked for, and a report nobody finishes reading protects nothing.
func (p *Plan) escenariosAt(root, head string, estados map[string]string, index map[string]*Sesion) []Escenario {
	dependientes := map[string][]string{}
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		for _, dep := range s.DependeDe {
			dependientes[dep] = append(dependientes[dep], s.ID)
		}
	}

	candidatos := make([]string, 0, len(dependientes))
	for id := range dependientes {
		if _, existe := index[id]; !existe {
			continue
		}
		if cerrada(estados[id]) {
			continue
		}
		candidatos = append(candidatos, id)
	}
	sort.Strings(candidatos)

	var out []Escenario
	for _, id := range candidatos {
		hipotesis := p.EstadosAsumiendoCerradas(root, head, map[string]bool{id: true})
		afectados := append([]string(nil), dependientes[id]...)
		sort.Strings(afectados)

		e := Escenario{Si: id}
		for _, otro := range afectados {
			s, existe := index[otro]
			if !existe || cerrada(estados[otro]) {
				continue
			}
			if !dependenciasSatisfechas(s, hipotesis, index) {
				continue
			}
			e.Desbloquea = append(e.Desbloquea, otro)
			if hipotesis[otro] == Listo {
				e.QuedanListo = append(e.QuedanListo, otro)
				continue
			}
			e.SiguenSinAbrir = append(e.SiguenSinAbrir, Retenida{
				Sesion: otro,
				Estado: vocabulario(hipotesis[otro]),
				Motivo: motivoDeRetencion(hipotesis[otro]),
			})
		}
		if len(e.Desbloquea) == 0 {
			continue
		}
		out = append(out, e)
	}
	return out
}

// dependenciasSatisfechas mirrors the unlock rule in EstadosAt exactly: a
// dependency counts only when it is COMPLETO or archived, and an edge pointing
// at something that does not exist never counts.
func dependenciasSatisfechas(s *Sesion, estados map[string]string, index map[string]*Sesion) bool {
	for _, dep := range s.DependeDe {
		d, existe := index[dep]
		if !existe {
			return false
		}
		if !(estados[d.ID] == Completo || d.Archivada) {
			return false
		}
	}
	return true
}

func motivoDeRetencion(estado string) string {
	switch estado {
	case Diferido:
		return "una prioridad anterior sigue con trabajo abierto, así que la Sesión queda postergada aunque su dependencia esté resuelta"
	case Bloqueado:
		return "arrastra un bloqueo propio: una decisión que escala, un Encargo incompleto o evidencia de entrega no integrada"
	case Planificado:
		return "todavía espera otra dependencia declarada"
	default:
		return "no deriva a LISTO bajo los criterios vigentes"
	}
}

func cerrada(estado string) bool {
	return estado == Completo || estado == Archivado
}

// clasificarPar applies the precedence the Encargo fixes, strongest first.
//
// An exclusive resource excludes outright, so it outranks everything — reporting
// such a pair as merely unknown would understate it. A file collision outside
// any Cimiento comes next. Only then does a missing declaration matter, because
// once a real conflict is proven the unknown adds nothing. A shared Cimiento is
// last among the non-compatible classes precisely because it is a condition and
// not a conflict.
func clasificarPar(a, b Alternativa) Par {
	par := Par{A: a.Sesion, B: b.Sesion}

	if comunes := interseccion(a.Recurso, b.Recurso); len(comunes) > 0 {
		par.Clase = RecursoExcluyente
		par.Motivo = "ambas declaran el mismo recurso exclusivo, así que la combinación queda excluida"
		par.Detalle = comunes
		return par
	}

	cimientos := interseccion(a.Cimientos, b.Cimientos)
	if choques := restar(interseccion(a.Archivos, b.Archivos), cimientos); len(choques) > 0 {
		par.Clase = SolapaArchivos
		par.Motivo = "las dos declaraciones nombran el mismo archivo fuera de todo Cimiento"
		par.Detalle = choques
		return par
	}

	if faltan := sinDeclaracionDeArchivos(a, b); len(faltan) > 0 {
		par.Clase = Indeterminado
		par.Motivo = "falta la declaración exacta de archivos, y una declaración desconocida no se lee como vacía ni como segura"
		par.Detalle = faltan
		return par
	}

	if len(cimientos) > 0 {
		par.Clase = CimientoCompartido
		par.Motivo = "comparten un Cimiento: la combinación exige intervención coordinada sobre ese archivo exacto"
		par.Detalle = cimientos
		return par
	}

	par.Clase = Compatible
	par.Motivo = "archivos declarados disjuntos, sin Cimiento ni recurso compartido; compartir Zona no es conflicto"
	return par
}

// sinDeclaracionDeArchivos names the sides that declared nothing, in pair order,
// so the reader knows exactly whose preparation is incomplete.
func sinDeclaracionDeArchivos(a, b Alternativa) []string {
	var faltan []string
	if len(a.Archivos) == 0 {
		faltan = append(faltan, a.Sesion)
	}
	if len(b.Archivos) == 0 {
		faltan = append(faltan, b.Sesion)
	}
	return faltan
}

func copiaOrdenada(in []string) []string {
	if len(in) == 0 {
		return nil
	}
	out := append([]string(nil), in...)
	sort.Strings(out)
	return out
}

func interseccion(a, b []string) []string {
	if len(a) == 0 || len(b) == 0 {
		return nil
	}
	set := make(map[string]bool, len(b))
	for _, v := range b {
		set[v] = true
	}
	visto := map[string]bool{}
	var out []string
	for _, v := range a {
		if set[v] && !visto[v] {
			visto[v] = true
			out = append(out, v)
		}
	}
	sort.Strings(out)
	return out
}

func restar(a, quitar []string) []string {
	if len(a) == 0 {
		return nil
	}
	if len(quitar) == 0 {
		return a
	}
	set := make(map[string]bool, len(quitar))
	for _, v := range quitar {
		set[v] = true
	}
	var out []string
	for _, v := range a {
		if !set[v] {
			out = append(out, v)
		}
	}
	return out
}

// cmdRoadmap draws the human view of the same evidence status --json carries.
//
// It refuses on the same validation errors as status: a person must never be
// shown alternatives Radar itself would not stand behind. It prints prose, never
// JSON, because a second machine-readable projection would be a second source
// of truth and this view is explicitly not one.
func cmdRoadmap(w io.Writer, p *Plan, root string) error {
	head, err := gitHEAD(root)
	if err != nil {
		return fmt.Errorf("no se pudo fijar HEAD para calcular el roadmap: %w", err)
	}
	if err := validarAt(p, root, head, "roadmap"); err != nil {
		return err
	}
	escribirRoadmap(w, p.Producto, p.RoadmapAt(root, head), p.ZonaPorID())
	return nil
}

// escribirRoadmap is the rendering alone, with no Git and no validation gate, so
// the layout can be tested for determinism without standing up a valid plan.
func escribirRoadmap(w io.Writer, producto string, r Roadmap, nombres map[string]*Zona) {
	fmt.Fprintf(w, "%s — roadmap de alternativas\n", producto)
	fmt.Fprintf(w, "Base: %s\n", r.Head)
	fmt.Fprintf(w, "Prioridad activa: %s\n", r.PrioridadActiva)
	fmt.Fprintf(w, "Interruptor del piloto: %s\n\n", markdownText(r.Interruptor))
	fmt.Fprintf(w, "%s\n\n", ajustar(r.Prevision, 78))

	if len(r.Alternativas) == 0 {
		fmt.Fprintf(w, "Alternativas: ninguna Sesión LISTO sobre esta base.\n\n")
		escribirPiloto(w, r)
		return
	}

	fmt.Fprintf(w, "Alternativas LISTO (%d)\n", len(r.Alternativas))
	zona := ""
	for _, a := range r.Alternativas {
		if a.Zona != zona {
			zona = a.Zona
			nombre := zona
			if z, ok := nombres[zona]; ok && z.Nombre != "" {
				nombre = z.Nombre
			}
			if nombre == "" {
				nombre = "(sin Zona declarada)"
			}
			fmt.Fprintf(w, "  %s\n", nombre)
		}
		fmt.Fprintf(w, "    %-6s %s\n", a.Sesion, sangrar(a.Resultado, 66, "           "))
		if len(a.Archivos) == 0 {
			fmt.Fprintf(w, "           archivos: sin declarar — toda conclusión sobre esta Sesión es indeterminada\n")
		} else {
			fmt.Fprintf(w, "           archivos (%d):\n", len(a.Archivos))
			for _, f := range a.Archivos {
				fmt.Fprintf(w, "             %s\n", f)
			}
		}
		if len(a.Cimientos) > 0 {
			fmt.Fprintf(w, "           Cimientos: %s\n", strings.Join(a.Cimientos, ", "))
		}
		if len(a.Recurso) > 0 {
			fmt.Fprintf(w, "           Recurso: %s\n", strings.Join(a.Recurso, ", "))
		}
	}
	fmt.Fprintln(w)

	if len(r.Pares) == 0 {
		fmt.Fprintf(w, "Combinaciones potenciales: hay una sola alternativa, no hay combinación que evaluar.\n\n")
	} else {
		fmt.Fprintf(w, "Combinaciones potenciales (%d)\n", len(r.Pares))
		for _, par := range r.Pares {
			fmt.Fprintf(w, "  %s + %s — %s\n", par.A, par.B, par.Clase)
			fmt.Fprintf(w, "      %s\n", sangrar(par.Motivo, 70, "      "))
			if len(par.Detalle) > 0 {
				fmt.Fprintf(w, "      evidencia: %s\n", strings.Join(par.Detalle, ", "))
			}
		}
		fmt.Fprintln(w)
	}

	if len(r.Escenarios) > 0 {
		fmt.Fprintf(w, "Escenarios hipotéticos (%d)\n", len(r.Escenarios))
		for _, e := range r.Escenarios {
			fmt.Fprintf(w, "  Si se cerrara %s:\n", e.Si)
			fmt.Fprintf(w, "      dependencia satisfecha para: %s\n", listaODefecto(e.Desbloquea, "nadie"))
			fmt.Fprintf(w, "      quedarían LISTO de verdad: %s\n", listaODefecto(e.QuedanListo, "ninguna"))
			for _, ret := range e.SiguenSinAbrir {
				fmt.Fprintf(w, "      %s sigue en %s — %s\n", ret.Sesion, ret.Estado, sangrar(ret.Motivo, 70, "          "))
			}
		}
		fmt.Fprintln(w)
	}

	escribirPiloto(w, r)
	fmt.Fprintf(w, "Los escenarios no modifican el plan, Git ni la evidencia de entrega real.\n")
	fmt.Fprintf(w, "Contrato completo de una Sesión: radar sesion <ID>\n")
}

// escribirPiloto draws the unattended work the pilot left behind. It is empty
// when there is none, so a plan without pilot evidence renders as before.
func escribirPiloto(w io.Writer, r Roadmap) {
	if len(r.Novedades) > 0 {
		fmt.Fprintf(w, "NOVEDAD (%d)\n", len(r.Novedades))
		for _, n := range r.Novedades {
			fmt.Fprintf(w, "  %s — %s%s\n", markdownText(n.Sesion), markdownText(n.Nota), vueloTexto(n.Vuelo))
		}
		fmt.Fprintln(w)
	}
	if len(r.Revisiones) > 0 {
		fmt.Fprintf(w, "POR REVISAR (%d)\n", len(r.Revisiones))
		for _, n := range r.Revisiones {
			fmt.Fprintf(w, "  %s — %s%s\n", markdownText(n.Sesion), markdownText(n.Nota), vueloTexto(n.Vuelo))
		}
		fmt.Fprintln(w)
	}
}

func vueloTexto(vuelo string) string {
	if vuelo == "" {
		return ""
	}
	return " · vuelo " + markdownText(vuelo)
}

// sangrar wraps prose and indents every continuation line, so a long result or
// reason stays inside its column instead of running off the terminal.
func sangrar(texto string, ancho int, prefijo string) string {
	lineas := strings.Split(ajustar(texto, ancho), "\n")
	return strings.Join(lineas, "\n"+prefijo)
}

func listaODefecto(in []string, vacio string) string {
	if len(in) == 0 {
		return vacio
	}
	return strings.Join(in, ", ")
}

// ajustar wraps prose at a fixed width so the paragraph reads the same in every
// terminal. The width is fixed, not detected, because a view whose bytes depend
// on the window is not deterministic.
func ajustar(texto string, ancho int) string {
	palabras := strings.Fields(texto)
	if len(palabras) == 0 {
		return ""
	}
	var b strings.Builder
	linea := palabras[0]
	for _, w := range palabras[1:] {
		if len([]rune(linea))+1+len([]rune(w)) > ancho {
			b.WriteString(linea)
			b.WriteByte('\n')
			linea = w
			continue
		}
		linea += " " + w
	}
	b.WriteString(linea)
	return b.String()
}
