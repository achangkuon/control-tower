package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
)

// estadoListo is the vocabulary word Radar emits (the emoji is presentation
// only). `piloto` never recomputes a state: it reads what Radar published (P2).
const (
	estadoListo     = "LISTO"
	claseCompatible = "compatible"
)

// SesionEstado is the subset of Radar's snapshot `piloto` consumes: identity,
// territory, computed state and declared dependencies.
type SesionEstado struct {
	ID        string   `json:"id"`
	Zona      string   `json:"zona"`
	Estado    string   `json:"estado"`
	DependeDe []string `json:"depende_de,omitempty"`
}

// ParCompatibilidad is one pair verdict from `radar status --json`. A pair
// without a verdict is read as incompatible: unknown is never read as safe.
type ParCompatibilidad struct {
	A     string `json:"a"`
	B     string `json:"b"`
	Clase string `json:"clase"`
}

// Snapshot is the slice of radar.snapshot/v1 the pilot needs. It deliberately
// accepts unknown fields: Radar's projection grows, and the pilot must not
// refuse a newer Radar for adding a field.
type Snapshot struct {
	Schema         string              `json:"schema"`
	Head           string              `json:"head"`
	Sesiones       []SesionEstado      `json:"sesiones"`
	Compatibilidad []ParCompatibilidad `json:"compatibilidad,omitempty"`
}

func decodificarSnapshot(data []byte) (Snapshot, error) {
	var s Snapshot
	if err := json.Unmarshal(data, &s); err != nil {
		return Snapshot{}, fmt.Errorf("snapshot de Radar ilegible: %w", err)
	}
	return s, nil
}

func clavePar(a, b string) string {
	if a > b {
		a, b = b, a
	}
	return a + "\x00" + b
}

func compatibleConTodos(s SesionEstado, grupo []SesionEstado, compat map[string]string) bool {
	for _, otro := range grupo {
		if compat[clavePar(s.ID, otro.ID)] != claseCompatible {
			return false
		}
	}
	return true
}

// vuelosPosibles groups the LISTO Sesiones into possible flights: one flight per
// READY anchor that does not collide with the flights already chosen, extended
// with its dependent chain. Flights run in parallel, so their Zonas must not
// collide (design section 6). A Sesión that depends on two flights is carried by
// the first one and marked Union: it never starts while the mode is on (P10).
func vuelosPosibles(snap Snapshot) []Vuelo {
	compat := map[string]string{}
	for _, p := range snap.Compatibilidad {
		compat[clavePar(p.A, p.B)] = p.Clase
	}
	var elegidos []SesionEstado
	var vuelos []Vuelo
	for _, s := range snap.Sesiones {
		if s.Estado != estadoListo {
			continue
		}
		if !compatibleConTodos(s, elegidos, compat) {
			continue
		}
		elegidos = append(elegidos, s)
		vuelos = append(vuelos, Vuelo{ID: s.ID, Ancla: s.ID})
	}
	if len(vuelos) == 0 {
		return nil
	}

	dueno := map[string]string{}
	union := map[string]bool{}
	for _, v := range vuelos {
		dueno[v.ID] = v.ID
	}
	// Fixpoint: each unowned Sesión joins the single flight its owned
	// dependencies point to, or is marked Union when they point to two. A
	// dependent is never owned before its dependency, so ownership is
	// recomputed until it stops changing.
	for cambio := true; cambio; {
		cambio = false
		for _, s := range snap.Sesiones {
			if union[s.ID] {
				continue
			}
			primer, conflicto := "", ""
			for _, d := range s.DependeDe {
				if o := dueno[d]; o != "" {
					if primer == "" {
						primer = o
					} else if o != primer {
						conflicto = primer
						break
					}
				}
			}
			switch {
			case conflicto != "":
				if dueno[s.ID] != conflicto || !union[s.ID] {
					dueno[s.ID] = conflicto
					union[s.ID] = true
					cambio = true
				}
			case primer != "" && dueno[s.ID] != primer:
				dueno[s.ID] = primer
				cambio = true
			}
		}
	}

	miembros := map[string][]Miembro{}
	for _, s := range snap.Sesiones {
		o := dueno[s.ID]
		if o == "" {
			continue
		}
		miembros[o] = append(miembros[o], Miembro{Sesion: s.ID, DependeDe: s.DependeDe, Union: union[s.ID]})
	}
	for i := range vuelos {
		vuelos[i].Sesiones = miembros[vuelos[i].ID]
	}
	return vuelos
}

// pisos is each Sesión's floor inside its flight: 1 when it depends on nothing
// pending, otherwise one above the deepest pending dependency (design section 6).
func pisos(v Vuelo) map[string]int {
	deps := map[string][]string{}
	miembros := map[string]bool{}
	for _, m := range v.Sesiones {
		deps[m.Sesion] = m.DependeDe
		miembros[m.Sesion] = true
	}
	piso := map[string]int{}
	var calcular func(id string, camino map[string]bool) int
	calcular = func(id string, camino map[string]bool) int {
		if p, ok := piso[id]; ok {
			return p
		}
		if camino[id] {
			return 1 // un ciclo no puede colgarse; se lee como piso 1
		}
		camino[id] = true
		maximo := 0
		for _, d := range deps[id] {
			if !miembros[d] {
				continue
			}
			if x := calcular(d, camino); x > maximo {
				maximo = x
			}
		}
		delete(camino, id)
		piso[id] = maximo + 1
		return piso[id]
	}
	for _, m := range v.Sesiones {
		calcular(m.Sesion, map[string]bool{})
	}
	return piso
}

func vueloDe(c *Corrida, sesion string) (*Vuelo, bool) {
	if c == nil {
		return nil, false
	}
	for i := range c.Vuelos {
		for _, m := range c.Vuelos[i].Sesiones {
			if m.Sesion == sesion {
				return &c.Vuelos[i], true
			}
		}
	}
	return nil, false
}

func vueloPorID(c *Corrida, id string) (*Vuelo, bool) {
	if c == nil {
		return nil, false
	}
	for i := range c.Vuelos {
		if c.Vuelos[i].ID == id {
			return &c.Vuelos[i], true
		}
	}
	return nil, false
}

func miembroDe(v *Vuelo, sesion string) (Miembro, bool) {
	for _, m := range v.Sesiones {
		if m.Sesion == sesion {
			return m, true
		}
	}
	return Miembro{}, false
}

func sesionesDeVuelo(v Vuelo) []string {
	ids := make([]string, 0, len(v.Sesiones))
	for _, m := range v.Sesiones {
		ids = append(ids, m.Sesion)
	}
	return ids
}

func leerMarcas(root string, c *Corrida) (map[string]*Marca, error) {
	marcas := map[string]*Marca{}
	if c == nil {
		return marcas, nil
	}
	for _, v := range c.Vuelos {
		for _, m := range v.Sesiones {
			if _, leida := marcas[m.Sesion]; leida {
				continue
			}
			marca, err := leerMarca(root, m.Sesion)
			if err != nil {
				return nil, err
			}
			if marca != nil {
				marcas[m.Sesion] = marca
			}
		}
	}
	return marcas, nil
}

// iniciadas counts the Sesiones the run already dispatched, which is what the
// run's Sesión cap limits. It is code, not an instruction an agent can ignore (P1).
func iniciadas(c *Corrida, marcas map[string]*Marca) int {
	total := 0
	for _, v := range c.Vuelos {
		for _, m := range v.Sesiones {
			if marcas[m.Sesion] != nil {
				total++
			}
		}
	}
	return total
}

// puedeEmpezar is the single admission gate the orchestrator cannot bypass: the
// switch must be on, the Sesión must belong to exactly one flight, its floor must
// fit the round ceiling, the run must be under its cap and every dependency must
// already be POR REVISAR. A NOVEDAD unlocks nobody (design section 6).
func puedeEmpezar(c *Corrida, marcas map[string]*Marca, i *Interruptor, sesion string) error {
	if i == nil || !i.Prendido {
		return fmt.Errorf("el piloto está apagado: no se crean estados nuevos")
	}
	v, ok := vueloDe(c, sesion)
	if !ok {
		return fmt.Errorf("la Sesión %s no pertenece a ningún vuelo de la corrida", sesion)
	}
	m, ok := miembroDe(v, sesion)
	if !ok {
		return fmt.Errorf("la Sesión %s no pertenece al vuelo %s", sesion, v.ID)
	}
	if m.Union {
		return fmt.Errorf("la Sesión %s une dos vuelos: no arranca con el piloto prendido (P10)", sesion)
	}
	if previa := marcas[sesion]; previa != nil {
		return fmt.Errorf("la Sesión %s ya tiene marca %s", sesion, previa.Estado)
	}
	if i.Tope > 0 && iniciadas(c, marcas) >= i.Tope {
		return fmt.Errorf("la corrida alcanzó el tope de %d Sesiones", i.Tope)
	}
	todos := pisos(*v)
	if i.Rondas > 0 && todos[sesion] > i.Rondas {
		return fmt.Errorf("la Sesión %s está en el piso %d y el límite de la corrida es %d rondas", sesion, todos[sesion], i.Rondas)
	}
	for _, d := range m.DependeDe {
		if _, esMiembro := miembroDe(v, d); !esMiembro {
			continue
		}
		previa := marcas[d]
		if previa == nil || previa.Estado != estadoCierre {
			return fmt.Errorf("la Sesión %s depende de %s, que no está POR REVISAR", sesion, d)
		}
	}
	return nil
}

func corridaActual(root string) (*Corrida, error) {
	c, err := leerCorrida(root)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, fmt.Errorf("no hay corrida: usá `piloto despegar` primero")
	}
	return c, nil
}

func marcarEnCurso(root string, i *Interruptor, sesion string) (*Marca, error) {
	c, err := corridaActual(root)
	if err != nil {
		return nil, err
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return nil, err
	}
	if err := puedeEmpezar(c, marcas, i, sesion); err != nil {
		return nil, err
	}
	v, _ := vueloDe(c, sesion)
	m := Marca{Sesion: sesion, Vuelo: v.ID, Rama: v.Rama, Estado: estadoEnCurso, Ronda: pisos(*v)[sesion]}
	if err := escribirMarca(root, m); err != nil {
		return nil, err
	}
	return &m, nil
}

func marcarCierre(root string, i *Interruptor, sesion, commit string, decisiones int) (*Marca, error) {
	if i == nil || !i.Prendido {
		return nil, fmt.Errorf("el piloto está apagado: no se crean estados nuevos")
	}
	if decisiones < 0 {
		return nil, fmt.Errorf("las decisiones anotadas no pueden ser negativas")
	}
	c, err := corridaActual(root)
	if err != nil {
		return nil, err
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return nil, err
	}
	v, ok := vueloDe(c, sesion)
	if !ok {
		return nil, fmt.Errorf("la Sesión %s no pertenece a ningún vuelo de la corrida", sesion)
	}
	previa := marcas[sesion]
	if previa == nil || previa.Estado != estadoEnCurso {
		return nil, fmt.Errorf("la Sesión %s no está EN CURSO", sesion)
	}
	cOID, err := commitValido(root, commit)
	if err != nil {
		return nil, fmt.Errorf("commit de la Sesión %s inválido: %w", sesion, err)
	}
	dentro, err := commitEnRama(root, cOID, v.Rama)
	if err != nil {
		return nil, err
	}
	if !dentro {
		return nil, fmt.Errorf("el commit %s no está en la rama %s del vuelo", cOID, v.Rama)
	}
	nueva := Marca{Sesion: sesion, Vuelo: v.ID, Rama: v.Rama, Estado: estadoCierre, Commit: cOID, Decisiones: decisiones, Ronda: previa.Ronda}
	if err := escribirMarca(root, nueva); err != nil {
		return nil, err
	}
	return &nueva, nil
}

func marcarNovedad(root string, i *Interruptor, sesion, motivo string) (*Marca, error) {
	if i == nil || !i.Prendido {
		return nil, fmt.Errorf("el piloto está apagado: no se crean estados nuevos")
	}
	if !motivoValido(motivo) {
		return nil, fmt.Errorf("motivo inválido %q: usá %q, %q o %q", motivo, motivoDecisionDelicada, motivoNoSePudoInferir, motivoInterrumpida)
	}
	c, err := corridaActual(root)
	if err != nil {
		return nil, err
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return nil, err
	}
	v, ok := vueloDe(c, sesion)
	if !ok {
		return nil, fmt.Errorf("la Sesión %s no pertenece a ningún vuelo de la corrida", sesion)
	}
	previa := marcas[sesion]
	if previa != nil && previa.Estado == estadoCierre {
		return nil, fmt.Errorf("la Sesión %s ya está POR REVISAR", sesion)
	}
	ronda := pisos(*v)[sesion]
	if previa != nil {
		ronda = previa.Ronda
	}
	nueva := Marca{Sesion: sesion, Vuelo: v.ID, Rama: v.Rama, Estado: estadoNovedad, Motivo: motivo, Ronda: ronda}
	if err := escribirMarca(root, nueva); err != nil {
		return nil, err
	}
	return &nueva, nil
}

// frenar is the emergency brake: nothing new starts and everything in flight
// becomes NOVEDAD · interrumpida, keeping its work in the flight's copy. The
// switch is flipped off last, so the marks are written while the mode is still on.
func frenar(root string, i *Interruptor) ([]string, error) {
	if i == nil || !i.Prendido {
		return nil, nil
	}
	c, err := leerCorrida(root)
	if err != nil {
		return nil, err
	}
	if c == nil {
		c = &Corrida{}
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return nil, err
	}
	var interrumpidas []string
	for _, v := range c.Vuelos {
		for _, m := range v.Sesiones {
			previa := marcas[m.Sesion]
			if previa == nil || previa.Estado != estadoEnCurso {
				continue
			}
			nueva := Marca{Sesion: m.Sesion, Vuelo: v.ID, Rama: v.Rama, Estado: estadoNovedad, Motivo: motivoInterrumpida, Ronda: previa.Ronda}
			if err := escribirMarca(root, nueva); err != nil {
				return nil, err
			}
			interrumpidas = append(interrumpidas, m.Sesion)
		}
	}
	if err := escribirInterruptor(root, Interruptor{Prendido: false, Rondas: i.Rondas, Tope: i.Tope}); err != nil {
		return nil, err
	}
	return interrumpidas, nil
}

// retirarVuelo removes a flight's copy and branch, and only after the approved
// portion is integrated into the local integrated branch. A flight with a
// NOVEDAD keeps both intact (D3), and any doubt refuses.
func retirarVuelo(root, id string) error {
	c, err := corridaActual(root)
	if err != nil {
		return err
	}
	v, ok := vueloPorID(c, id)
	if !ok {
		return fmt.Errorf("el vuelo %s no está en la corrida", id)
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return err
	}
	integradas := 0
	var integrada string
	for _, m := range v.Sesiones {
		previa := marcas[m.Sesion]
		if previa == nil {
			continue
		}
		switch previa.Estado {
		case estadoEnCurso:
			return fmt.Errorf("el vuelo %s tiene la Sesión %s EN CURSO: no se retira hasta que cierre", id, m.Sesion)
		case estadoNovedad:
			return fmt.Errorf("el vuelo %s tiene una NOVEDAD (%s): conserva copia y rama (D3)", id, m.Sesion)
		case estadoCierre:
			if integrada == "" {
				if integrada, err = ramaIntegrada(root); err != nil {
					return err
				}
			}
			dentro, err := commitEnRama(root, previa.Commit, integrada)
			if err != nil {
				return err
			}
			if !dentro {
				return fmt.Errorf("la porción aprobada del vuelo %s no está integrada: falta %s", id, previa.Commit)
			}
			integradas++
		}
	}
	if integradas == 0 {
		return fmt.Errorf("el vuelo %s no tiene porción aprobada integrada; no se retira", id)
	}
	if v.Copia != "" {
		if info, err := os.Lstat(v.Copia); err == nil {
			if !info.IsDir() {
				return fmt.Errorf("la copia %s del vuelo %s no es un directorio", v.Copia, id)
			}
			pending, err := trabajoPendiente(v.Copia)
			if err != nil {
				return err
			}
			if pending {
				return fmt.Errorf("la copia %s tiene trabajo sin confirmar; no se retira", v.Copia)
			}
		} else if !errors.Is(err, os.ErrNotExist) {
			return err
		}
	}
	if err := retirarCopia(root, v.Rama, v.Copia); err != nil {
		return err
	}
	restantes := make([]Vuelo, 0, len(c.Vuelos))
	for _, otro := range c.Vuelos {
		if otro.ID != id {
			restantes = append(restantes, otro)
		}
	}
	c.Vuelos = restantes
	return escribirCorrida(root, *c)
}

// SesionReporte is one line of the run report.
type SesionReporte struct {
	Sesion string
	Estado string
	Nota   string
	Ronda  int
}

type VueloResumen struct {
	ID             string
	Sesiones       []SesionReporte
	RondaAlcanzada int
	PorRevisar     int
	Novedad        int
	EnCurso        int
	SinEmpezar     int
}

// Resumen is the landing report: per flight, per Sesión, plus the run totals the
// orchestrator keeps instead of the full state (P12).
type Resumen struct {
	Vuelos           []VueloResumen
	PorRevisar       int
	Novedad          int
	EnCurso          int
	SinEmpezar       int
	Iniciadas        int
	Rondas           int
	Tope             int
	Prendido         bool
	DebeAterrizar    bool
	MotivoAterrizaje string
}

func notaRevision(decisiones int) string {
	switch {
	case decisiones <= 0:
		return "limpia"
	case decisiones == 1:
		return "con 1 decisión anotada"
	default:
		return fmt.Sprintf("con %d decisiones anotadas", decisiones)
	}
}

func hayArrancable(c *Corrida, marcas map[string]*Marca, i *Interruptor) bool {
	for _, v := range c.Vuelos {
		for _, m := range v.Sesiones {
			if err := puedeEmpezar(c, marcas, i, m.Sesion); err == nil {
				return true
			}
		}
	}
	return false
}

// resumir computes the run report and whether the run should land: the cap was
// reached, or nothing is in flight and nothing can start.
func resumir(root string) (Resumen, error) {
	c, err := corridaActual(root)
	if err != nil {
		return Resumen{}, err
	}
	i, err := leerInterruptor(root)
	if err != nil {
		return Resumen{}, err
	}
	if i == nil {
		i = &Interruptor{Rondas: rondasPorDefecto, Tope: topePorDefecto}
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return Resumen{}, err
	}
	r := Resumen{Rondas: i.Rondas, Tope: i.Tope, Prendido: i.Prendido, Iniciadas: iniciadas(c, marcas)}
	for _, v := range c.Vuelos {
		todos := pisos(v)
		vr := VueloResumen{ID: v.ID}
		for _, m := range v.Sesiones {
			sr := SesionReporte{Sesion: m.Sesion, Ronda: todos[m.Sesion]}
			previa := marcas[m.Sesion]
			switch {
			case previa == nil:
				sr.Estado = "SIN EMPEZAR"
				r.SinEmpezar++
				vr.SinEmpezar++
			case previa.Estado == estadoEnCurso:
				sr.Estado, sr.Ronda = "EN CURSO", previa.Ronda
				r.EnCurso++
				vr.EnCurso++
			case previa.Estado == estadoCierre:
				sr.Estado, sr.Ronda, sr.Nota = "POR REVISAR", previa.Ronda, notaRevision(previa.Decisiones)
				r.PorRevisar++
				vr.PorRevisar++
			case previa.Estado == estadoNovedad:
				sr.Estado, sr.Ronda, sr.Nota = "NOVEDAD", previa.Ronda, previa.Motivo
				r.Novedad++
				vr.Novedad++
			}
			// La ronda alcanzada es la más profunda que llegó a arrancar, no el
			// piso de lo que todavía no empezó.
			if previa != nil && sr.Ronda > vr.RondaAlcanzada {
				vr.RondaAlcanzada = sr.Ronda
			}
			vr.Sesiones = append(vr.Sesiones, sr)
		}
		r.Vuelos = append(r.Vuelos, vr)
	}
	switch {
	case i.Tope > 0 && r.Iniciadas >= i.Tope:
		r.DebeAterrizar, r.MotivoAterrizaje = true, fmt.Sprintf("tope de %d Sesiones alcanzado", i.Tope)
	case r.EnCurso == 0 && !hayArrancable(c, marcas, i):
		r.DebeAterrizar, r.MotivoAterrizaje = true, "no queda nada por arrancar"
	}
	sort.SliceStable(r.Vuelos, func(a, b int) bool { return r.Vuelos[a].ID < r.Vuelos[b].ID })
	return r, nil
}
