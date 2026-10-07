package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
)

// S217 — la revisión al volver. Radar es dueño de los estados (P2); `piloto`
// determiniza el orden y el registro, nunca el juicio de calidad. Este archivo
// reúne el informe por vuelo, el orden de cascada base-arriba y los registros
// de revisión (resolución de NOVEDAD, clasificación de impacto).

const (
	estadoCompleto   = "COMPLETO"
	estadoArchivado  = "ARCHIVADO"
	estadoPorRevisar = "POR REVISAR"
	estadoSinEmpezar = "SIN EMPEZAR"
	estadoEnCursoTxt = "EN CURSO"
	estadoCompletaTx = "COMPLETA"

	esquemaResolucion = "radar.piloto.resolucion/v1"
	esquemaCorreccion = "radar.piloto.correccion/v1"
	topeDecision      = 1500

	impactoLeve  = "leve"
	impactoMedio = "medio"
	impactoGrave = "grave"
)

// snapshotRadar is the Radar read seam: it resolves the installed radar and
// decodes its status JSON. Tests replace it with a fixed snapshot so review
// never depends on an installed radar or on the host's real state.
var snapshotRadar = func(root string) (Snapshot, error) {
	bin, err := resolverRadar(root)
	if err != nil {
		return Snapshot{}, err
	}
	datos, err := radarStatus(bin, root)
	if err != nil {
		return Snapshot{}, err
	}
	return decodificarSnapshot(datos)
}

// EstadoRevision is one Sesión of a flight as the review sees it.
type EstadoRevision struct {
	Sesion string
	Estado string
	Nota   string
	Ronda  int
	Union  bool
}

// VueloRevision is the per-flight review report.
type VueloRevision struct {
	ID             string
	Sesiones       []EstadoRevision
	Orden          []string
	RondaAlcanzada int
	PorRevisar     int
	Novedad        int
	EnCurso        int
	SinEmpezar     int
	Completa       int
}

// InformeRevision is the landing review report: what each flight leaves to
// review, how many decisions it carries and in which order it is reviewed.
type InformeRevision struct {
	Vuelos []VueloRevision
}

// PasoRevision is one step of the review conversation: a Sesión of a flight.
// Union marks a Sesión that depends on two flights: it waits for both.
type PasoRevision struct {
	Vuelo  string
	Sesion string
	Union  bool
	Espera []string
}

// informeRevision reads the corrida, the marks and Radar's snapshot and builds
// the per-flight review report. Radar owns every state (P2): the marks only add
// the review-specific note, never a state `piloto` invented.
func informeRevision(root string) (*InformeRevision, error) {
	c, err := corridaActual(root)
	if err != nil {
		return nil, err
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return nil, err
	}
	snap, err := snapshotRadar(root)
	if err != nil {
		return nil, fmt.Errorf("no se pudo leer el estado de Radar: %w", err)
	}
	radar := map[string]string{}
	for _, s := range snap.Sesiones {
		radar[s.ID] = s.Estado
	}
	inf := &InformeRevision{}
	for _, v := range c.Vuelos {
		vr := VueloRevision{ID: v.ID, Orden: ordenDeCascada(v)}
		todos := pisos(v)
		for _, m := range v.Sesiones {
			er := EstadoRevision{Sesion: m.Sesion, Ronda: todos[m.Sesion], Union: m.Union}
			previa := marcas[m.Sesion]
			if previa != nil {
				er.Ronda = previa.Ronda
			}
			switch {
			case radar[m.Sesion] == estadoCompleto || radar[m.Sesion] == estadoArchivado:
				er.Estado = estadoCompletaTx
				vr.Completa++
			case previa == nil:
				er.Estado = estadoSinEmpezar
				vr.SinEmpezar++
			case previa.Estado == estadoEnCurso:
				er.Estado = estadoEnCursoTxt
				vr.EnCurso++
			case previa.Estado == estadoCierre:
				er.Estado, er.Nota = estadoPorRevisar, notaRevision(previa.Decisiones)
				vr.PorRevisar++
			case previa.Estado == estadoNovedad:
				er.Estado, er.Nota = "NOVEDAD", previa.Motivo
				vr.Novedad++
			}
			if previa != nil && er.Ronda > vr.RondaAlcanzada {
				vr.RondaAlcanzada = er.Ronda
			}
			vr.Sesiones = append(vr.Sesiones, er)
		}
		inf.Vuelos = append(inf.Vuelos, vr)
	}
	sort.SliceStable(inf.Vuelos, func(a, b int) bool { return inf.Vuelos[a].ID < inf.Vuelos[b].ID })
	return inf, nil
}

func formatearInformeRevision(w io.Writer, inf *InformeRevision) {
	if len(inf.Vuelos) == 0 {
		fmt.Fprintln(w, "No hay vuelos en la corrida.")
		return
	}
	fmt.Fprintf(w, "Revisión de la corrida — %d vuelo(s)\n", len(inf.Vuelos))
	for _, v := range inf.Vuelos {
		fmt.Fprintf(w, "\nVuelo %s — ronda %d · %d POR REVISAR · %d NOVEDAD · %d sin empezar\n",
			v.ID, v.RondaAlcanzada, v.PorRevisar, v.Novedad, v.SinEmpezar)
		if len(v.Orden) > 0 {
			fmt.Fprintf(w, "  Orden de revisión: %s\n", strings.Join(v.Orden, " → "))
		}
		for _, s := range v.Sesiones {
			union := ""
			if s.Union {
				union = "  (une dos vuelos)"
			}
			if s.Nota == "" {
				fmt.Fprintf(w, "  %s  %s%s\n", s.Sesion, s.Estado, union)
			} else {
				fmt.Fprintf(w, "  %s  %s  %s%s\n", s.Sesion, s.Estado, s.Nota, union)
			}
		}
	}
}

// Resolucion is the deterministic record that a NOVEDAD was answered: the
// maintainer's decision text reference, keyed by flight and Sesión. It never
// changes a Radar state (P2); it only documents the answer.
type Resolucion struct {
	Schema   string `json:"schema"`
	Sesion   string `json:"sesion"`
	Vuelo    string `json:"vuelo"`
	Motivo   string `json:"motivo"`
	Decision string `json:"decision"`
	Ronda    int    `json:"ronda"`
}

func dirRegistros(common, carpeta string, crear bool) (string, error) {
	base, err := dirPiloto(common, crear)
	if err != nil {
		return "", err
	}
	return directorioComponentes(base, []string{carpeta}, crear)
}

// leerRegistro reads one strict evidence file from a registered folder, refusing
// symlinks and malformed content exactly like the marks reader.
func leerRegistro(root, carpeta, id string, out any) (bool, error) {
	if !idValido(id) {
		return false, fmt.Errorf("ID de piloto inválido: %q", id)
	}
	if root == "" {
		return false, nil
	}
	common, err := commonDir(root)
	if err != nil {
		return false, err
	}
	data, err := leerArchivoRegular(common, []string{"chanks", "piloto", carpeta, id + ".json"})
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := decodificarEstricto(data, out); err != nil {
		return false, err
	}
	return true, nil
}

func escribirRegistro(root, carpeta, id string, v any) error {
	if !idValido(id) {
		return fmt.Errorf("ID de piloto inválido: %q", id)
	}
	common, err := commonDir(root)
	if err != nil {
		return err
	}
	dir, err := dirRegistros(common, carpeta, true)
	if err != nil {
		return err
	}
	return escribirJSONAtomico(dir, id+".json", v)
}

// resolverNovedad registers the maintainer's answer to a NOVEDAD. It fails
// closed unless the Sesión actually has a NOVEDAD mark to resolve and the
// decision carries real text.
func resolverNovedad(root, sesion, decision string) (*Resolucion, error) {
	if !idValido(sesion) {
		return nil, fmt.Errorf("ID de piloto inválido: %q", sesion)
	}
	decision = strings.TrimSpace(decision)
	if decision == "" {
		return nil, fmt.Errorf("la resolución necesita el texto de la decisión del mantenedor")
	}
	if len(decision) > topeDecision {
		return nil, fmt.Errorf("la decisión supera los %d caracteres admisibles", topeDecision)
	}
	c, err := corridaActual(root)
	if err != nil {
		return nil, err
	}
	v, ok := vueloDe(c, sesion)
	if !ok {
		return nil, fmt.Errorf("la Sesión %s no pertenece a ningún vuelo de la corrida", sesion)
	}
	marca, err := leerMarca(root, sesion)
	if err != nil {
		return nil, err
	}
	if marca == nil || marca.Estado != estadoNovedad {
		return nil, fmt.Errorf("la Sesión %s no tiene una NOVEDAD por resolver", sesion)
	}
	r := Resolucion{Schema: esquemaResolucion, Sesion: sesion, Vuelo: v.ID, Motivo: marca.Motivo, Decision: decision, Ronda: marca.Ronda}
	if err := escribirRegistro(root, "resoluciones", sesion, r); err != nil {
		return nil, err
	}
	return &r, nil
}

func leerResolucion(root, sesion string) (*Resolucion, error) {
	var r Resolucion
	ok, err := leerRegistro(root, "resoluciones", sesion, &r)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, nil
	}
	if r.Schema != esquemaResolucion || r.Sesion != sesion || !idValido(r.Vuelo) || !motivoValido(r.Motivo) || strings.TrimSpace(r.Decision) == "" || r.Ronda < 1 || len(r.Decision) > topeDecision {
		return nil, fmt.Errorf("resolución de %s inválida", sesion)
	}
	return &r, nil
}

func tipoImpactoValido(tipo string) bool {
	switch tipo {
	case impactoLeve, impactoMedio, impactoGrave:
		return true
	}
	return false
}

func cuantasSesiones(n int) string {
	if n == 1 {
		return "1 Sesión"
	}
	return fmt.Sprintf("%d Sesiones", n)
}

// Impacto is the pre-fix analysis: which Sesiones above the fixed one consume
// its outputs, plus the three classification options. The human picks the type;
// how many Sesiones it touches is a report datum, not the definition (design
// section 9).
type Impacto struct {
	Sesion    string
	Vuelo     string
	Afectadas []string
	Opciones  []string
}

// Correccion is the recorded classification of a fix.
type Correccion struct {
	Schema    string   `json:"schema"`
	Sesion    string   `json:"sesion"`
	Vuelo     string   `json:"vuelo"`
	Tipo      string   `json:"tipo"`
	Afectadas []string `json:"afectadas,omitempty"`
	Ronda     int      `json:"ronda"`
}

// analizarImpacto walks the declared dependency graph of the flight and returns
// the transitive dependents of sesion, base-upward. A Sesión outside the corrida
// fails closed: there is nothing deterministic to measure.
func analizarImpacto(c *Corrida, sesion string) (*Impacto, error) {
	v, ok := vueloDe(c, sesion)
	if !ok {
		return nil, fmt.Errorf("la Sesión %s no pertenece a ningún vuelo de la corrida", sesion)
	}
	dependientes := map[string][]string{}
	for _, m := range v.Sesiones {
		for _, d := range m.DependeDe {
			if _, esMiembro := miembroDe(v, d); esMiembro {
				dependientes[d] = append(dependientes[d], m.Sesion)
			}
		}
	}
	vistos := map[string]bool{sesion: true}
	var afectadas []string
	var recorrer func(id string)
	recorrer = func(id string) {
		for _, dep := range dependientes[id] {
			if vistos[dep] {
				continue
			}
			vistos[dep] = true
			afectadas = append(afectadas, dep)
			recorrer(dep)
		}
	}
	recorrer(sesion)
	// Base-arriba: el piso ordena la cadena, la declaración desempata.
	todos := pisos(*v)
	sort.SliceStable(afectadas, func(a, b int) bool { return todos[afectadas[a]] < todos[afectadas[b]] })
	n := len(afectadas)
	impacto := &Impacto{
		Sesion:    sesion,
		Vuelo:     v.ID,
		Afectadas: afectadas,
		Opciones: []string{
			"Leve: el parche se traslada arriba",
			fmt.Sprintf("Medio: parche y nueva revisión de cada Sesión afectada (%s)", cuantasSesiones(n)),
			fmt.Sprintf("Grave: %s vuelven a LISTO y se rehacen", cuantasSesiones(n)),
		},
	}
	return impacto, nil
}

// registrarImpacto records the human's classification together with the
// affected set the tool measured. Grave is recorded, never applied: Radar owns
// the states (P2) and the orchestrator updates the plan.
func registrarImpacto(root, sesion, tipo string) (*Correccion, error) {
	if !idValido(sesion) {
		return nil, fmt.Errorf("ID de piloto inválido: %q", sesion)
	}
	if !tipoImpactoValido(tipo) {
		return nil, fmt.Errorf("tipo de impacto inválido %q: usá %q, %q o %q", tipo, impactoLeve, impactoMedio, impactoGrave)
	}
	c, err := corridaActual(root)
	if err != nil {
		return nil, err
	}
	imp, err := analizarImpacto(c, sesion)
	if err != nil {
		return nil, err
	}
	marca, err := leerMarca(root, sesion)
	if err != nil {
		return nil, err
	}
	vuelo, ok := vueloPorID(c, imp.Vuelo)
	if !ok {
		return nil, fmt.Errorf("el vuelo %s no está en la corrida", imp.Vuelo)
	}
	ronda := pisos(*vuelo)[sesion]
	if marca != nil {
		ronda = marca.Ronda
	}
	cor := Correccion{Schema: esquemaCorreccion, Sesion: sesion, Vuelo: imp.Vuelo, Tipo: tipo, Afectadas: imp.Afectadas, Ronda: ronda}
	if err := escribirRegistro(root, "correcciones", sesion, cor); err != nil {
		return nil, err
	}
	return &cor, nil
}

func leerCorreccion(root, sesion string) (*Correccion, error) {
	var cor Correccion
	ok, err := leerRegistro(root, "correcciones", sesion, &cor)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, nil
	}
	if cor.Schema != esquemaCorreccion || cor.Sesion != sesion || !idValido(cor.Vuelo) || !tipoImpactoValido(cor.Tipo) || cor.Ronda < 1 {
		return nil, fmt.Errorf("corrección de %s inválida", sesion)
	}
	for _, a := range cor.Afectadas {
		if !idValido(a) {
			return nil, fmt.Errorf("corrección de %s inválida: afectada %q", sesion, a)
		}
	}
	return &cor, nil
}

func vueloTieneNovedad(v Vuelo, marcas map[string]*Marca) bool {
	for _, m := range v.Sesiones {
		if p := marcas[m.Sesion]; p != nil && p.Estado == estadoNovedad {
			return true
		}
	}
	return false
}

// ordenDeVuelos puts the flights with a NOVEDAD first (design section 7), then
// the rest, preserving the corrida's approval order inside each group.
func ordenDeVuelos(c *Corrida, marcas map[string]*Marca) []string {
	if c == nil {
		return nil
	}
	var conNovedad, resto []string
	for _, v := range c.Vuelos {
		if vueloTieneNovedad(v, marcas) {
			conNovedad = append(conNovedad, v.ID)
		} else {
			resto = append(resto, v.ID)
		}
	}
	return append(conNovedad, resto...)
}

// ordenDeCascada is the review order inside a flight: base-upward by floor,
// stable by declaration. A Sesión that joins two flights (Union) never starts
// with the pilot on, so it goes last and waits for the other flight.
func ordenDeCascada(v Vuelo) []string {
	todos := pisos(v)
	var normales, uniones []Miembro
	for _, m := range v.Sesiones {
		if m.Union {
			uniones = append(uniones, m)
		} else {
			normales = append(normales, m)
		}
	}
	porPiso := func(lista []Miembro) {
		sort.SliceStable(lista, func(a, b int) bool { return todos[lista[a].Sesion] < todos[lista[b].Sesion] })
	}
	porPiso(normales)
	porPiso(uniones)
	ids := make([]string, 0, len(v.Sesiones))
	for _, m := range normales {
		ids = append(ids, m.Sesion)
	}
	for _, m := range uniones {
		ids = append(ids, m.Sesion)
	}
	return ids
}

// vueloRevisado reports whether every Sesión of a flight already has a cierre
// mark: that is what "reviewed" means for a joining Sesión waiting on it.
func vueloRevisado(v Vuelo, marcas map[string]*Marca) bool {
	if len(v.Sesiones) == 0 {
		return false
	}
	for _, m := range v.Sesiones {
		if p := marcas[m.Sesion]; p == nil || p.Estado != estadoCierre {
			return false
		}
	}
	return true
}

// vuelosUnionPendientes lists the other flights a joining Sesión still waits
// for: those that own a direct dependency and are not fully reviewed.
func vuelosUnionPendientes(c *Corrida, marcas map[string]*Marca, propio *Vuelo, m Miembro) []string {
	if !m.Union || c == nil || propio == nil {
		return nil
	}
	var pendientes []string
	for i := range c.Vuelos {
		otro := &c.Vuelos[i]
		if otro.ID == propio.ID {
			continue
		}
		contiene := false
		for _, d := range m.DependeDe {
			if _, ok := miembroDe(otro, d); ok {
				contiene = true
				break
			}
		}
		if contiene && !vueloRevisado(*otro, marcas) {
			pendientes = append(pendientes, otro.ID)
		}
	}
	return pendientes
}

// ordenDeRevision flattens the review conversation: flight by flight (NOVEDAD
// first), inside each flight the base-upward cascade.
func ordenDeRevision(c *Corrida, marcas map[string]*Marca) []PasoRevision {
	if c == nil {
		return nil
	}
	var pasos []PasoRevision
	for _, id := range ordenDeVuelos(c, marcas) {
		v, ok := vueloPorID(c, id)
		if !ok {
			continue
		}
		for _, sesion := range ordenDeCascada(*v) {
			m, _ := miembroDe(v, sesion)
			pasos = append(pasos, PasoRevision{Vuelo: id, Sesion: sesion, Union: m.Union, Espera: vuelosUnionPendientes(c, marcas, v, m)})
		}
	}
	return pasos
}

func formatearOrden(w io.Writer, pasos []PasoRevision) {
	if len(pasos) == 0 {
		fmt.Fprintln(w, "No hay Sesiones por revisar.")
		return
	}
	fmt.Fprintln(w, "Orden de revisión (NOVEDAD primero; dentro del vuelo, base-arriba):")
	for i, p := range pasos {
		nota := ""
		switch {
		case p.Union && len(p.Espera) > 0:
			nota = fmt.Sprintf("  (une dos vuelos: espera %s)", strings.Join(p.Espera, ", "))
		case p.Union:
			nota = "  (une dos vuelos)"
		}
		fmt.Fprintf(w, "  %d. %s · %s%s\n", i+1, p.Vuelo, p.Sesion, nota)
	}
}

func formatearImpacto(w io.Writer, imp *Impacto) {
	fmt.Fprintf(w, "Impacto de corregir %s (vuelo %s): %s arriba\n", imp.Sesion, imp.Vuelo, cuantasSesiones(len(imp.Afectadas)))
	if len(imp.Afectadas) > 0 {
		fmt.Fprintf(w, "  Sesiones afectadas: %s\n", strings.Join(imp.Afectadas, ", "))
	}
	fmt.Fprintln(w, "  El tipo lo decidís vos:")
	for _, o := range imp.Opciones {
		fmt.Fprintf(w, "    - %s\n", o)
	}
}

// Los comandos siguientes son los puntos de registro que main.go conecta en su
// dispatch: la lógica vive acá, la conversación sigue en el orquestador.
func cmdInformeRevision(w io.Writer, root string) error {
	inf, err := informeRevision(root)
	if err != nil {
		return err
	}
	formatearInformeRevision(w, inf)
	return nil
}

func cmdOrdenRevision(w io.Writer, root string) error {
	c, err := corridaActual(root)
	if err != nil {
		return err
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return err
	}
	formatearOrden(w, ordenDeRevision(c, marcas))
	return nil
}

func cmdResolverNovedad(w io.Writer, root, sesion, decision string) error {
	r, err := resolverNovedad(root, sesion, decision)
	if err != nil {
		return err
	}
	fmt.Fprintf(w, "✓ NOVEDAD de %s resuelta (vuelo %s): %s\n", r.Sesion, r.Vuelo, r.Decision)
	return nil
}

func cmdImpacto(w io.Writer, root, sesion, tipo string) error {
	if tipo == "" {
		c, err := corridaActual(root)
		if err != nil {
			return err
		}
		imp, err := analizarImpacto(c, sesion)
		if err != nil {
			return err
		}
		formatearImpacto(w, imp)
		return nil
	}
	cor, err := registrarImpacto(root, sesion, tipo)
	if err != nil {
		return err
	}
	fmt.Fprintf(w, "✓ impacto de %s registrado como %s (%s)\n", cor.Sesion, cor.Tipo, cuantasSesiones(len(cor.Afectadas)))
	return nil
}
