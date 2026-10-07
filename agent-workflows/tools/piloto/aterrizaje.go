package main

import (
	"fmt"
	"io"
	"os"
	"strings"
)

// S217 — el aterrizaje de la porción aprobada. `piloto` determiniza el traslado
// del arreglo y la integración local; nunca sube: la subida sigue la política
// ordinaria de entrega del repositorio y la ejecuta el orquestador.

// PasoTraslado is one Sesión above the corrected base, with the commit that
// carries its work.
type PasoTraslado struct {
	Sesion string
	Commit string
}

// PlanTraslado is the deterministic rebase/cherry-pick plan: the Sesiones above
// the corrected base, in cascade order, over the corrected base commit.
type PlanTraslado struct {
	Vuelo       string
	Base        string
	CommitsBase string
	Pasos       []PasoTraslado
}

// planTraslado measures the affected Sesiones above the fixed one and lists the
// commit of each. A Sesión above without a cierre mark carries no work and is
// not a step.
func planTraslado(c *Corrida, marcas map[string]*Marca, sesion string) (*PlanTraslado, error) {
	imp, err := analizarImpacto(c, sesion)
	if err != nil {
		return nil, err
	}
	plan := &PlanTraslado{Vuelo: imp.Vuelo, Base: sesion}
	for _, id := range imp.Afectadas {
		if m := marcas[id]; m != nil && m.Estado == estadoCierre && m.Commit != "" {
			plan.Pasos = append(plan.Pasos, PasoTraslado{Sesion: id, Commit: m.Commit})
		}
	}
	return plan, nil
}

// trasladar reapplies the planned commits onto the corrected base inside the
// flight's work copy, one cherry-pick per Sesión (one commit per Sesión). Any
// step that does not apply cleanly aborts the whole operation and leaves the
// branch untouched: never lose work, never force.
func trasladar(root, sesion, baseCorregida string) (*PlanTraslado, error) {
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
	plan, err := planTraslado(c, marcas, sesion)
	if err != nil {
		return nil, err
	}
	if len(plan.Pasos) == 0 {
		return nil, fmt.Errorf("no hay Sesiones de arriba con entrega que trasladar sobre %s", sesion)
	}
	if v.Copia == "" {
		return nil, fmt.Errorf("el vuelo %s no tiene copia de trabajo", v.ID)
	}
	info, err := os.Lstat(v.Copia)
	if err != nil {
		return nil, fmt.Errorf("no se pudo abrir la copia del vuelo %s: %w", v.ID, err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("la copia %s del vuelo %s no es un directorio", v.Copia, v.ID)
	}
	pendiente, err := trabajoPendiente(v.Copia)
	if err != nil {
		return nil, err
	}
	if pendiente {
		return nil, fmt.Errorf("la copia %s tiene trabajo sin confirmar; el traslado se niega", v.Copia)
	}
	if strings.TrimSpace(baseCorregida) == "" {
		if baseCorregida, err = gitOutput(v.Copia, "rev-parse", "HEAD^{commit}"); err != nil {
			return nil, err
		}
	}
	base, err := commitValido(root, baseCorregida)
	if err != nil {
		return nil, fmt.Errorf("base corregida inválida: %w", err)
	}
	dentro, err := commitEnRama(root, base, v.Rama)
	if err != nil {
		return nil, err
	}
	if !dentro {
		return nil, fmt.Errorf("la base corregida %s no está en la rama %s del vuelo", base, v.Rama)
	}
	cabeza, err := gitOutput(v.Copia, "rev-parse", "HEAD^{commit}")
	if err != nil {
		return nil, err
	}
	if !strings.EqualFold(cabeza, base) {
		return nil, fmt.Errorf("la copia está en %s y la base corregida es %s: poné la copia en la base antes de trasladar", cabeza, base)
	}
	plan.CommitsBase = base
	// Una sola secuencia de cherry-pick por Sesión: si un paso choca, el abort
	// revierte la secuencia entera y la rama queda donde estaba.
	secuencia := []string{"cherry-pick"}
	var ids []string
	for _, paso := range plan.Pasos {
		secuencia = append(secuencia, paso.Commit)
		ids = append(ids, paso.Sesion)
	}
	if err := gitRun(v.Copia, secuencia...); err != nil {
		_ = gitRun(v.Copia, "cherry-pick", "--abort")
		return nil, fmt.Errorf("el traslado (%s) no aplica limpio: %w", strings.Join(ids, ", "), err)
	}
	return plan, nil
}

// Aterrizaje is the approved portion of one flight: the consecutive prefix from
// the base up to the last approved Sesión, and the commit of that last one.
type Aterrizaje struct {
	Vuelo     string
	Aprobadas []string
	Ultima    string
}

// aterrizarVuelo validates and integrates the approved portion of a flight into
// the local integrated branch. It refuses without an explicit approval flag and
// unless every Sesión up to the last approved one is POR REVISAR in the record;
// a Sesión that joins two flights waits for the review of both. It never pushes:
// the upload follows the repository's ordinary delivery policy.
func aterrizarVuelo(root, vuelo string, aprobadas []string, confirmado bool) (*Aterrizaje, error) {
	if !confirmado {
		return nil, fmt.Errorf("el aterrizaje necesita la aprobación explícita del usuario")
	}
	c, err := corridaActual(root)
	if err != nil {
		return nil, err
	}
	v, ok := vueloPorID(c, vuelo)
	if !ok {
		return nil, fmt.Errorf("el vuelo %s no está en la corrida", vuelo)
	}
	if len(aprobadas) == 0 {
		return nil, fmt.Errorf("no hay ninguna Sesión aprobada en el vuelo %s", vuelo)
	}
	orden := ordenDeCascada(*v)
	indice := map[string]int{}
	for i, s := range orden {
		indice[s] = i
	}
	aprobado := map[string]bool{}
	ultimo := -1
	for _, s := range aprobadas {
		i, ok := indice[s]
		if !ok {
			return nil, fmt.Errorf("la Sesión %s no pertenece al vuelo %s", s, vuelo)
		}
		aprobado[s] = true
		if i > ultimo {
			ultimo = i
		}
	}
	for i := 0; i <= ultimo; i++ {
		if !aprobado[orden[i]] {
			return nil, fmt.Errorf("la porción aprobada no es consecutiva desde la base: falta %s", orden[i])
		}
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return nil, err
	}
	porcion := orden[:ultimo+1]
	var commitFinal string
	for _, s := range porcion {
		m := marcas[s]
		if m == nil || m.Estado != estadoCierre {
			return nil, fmt.Errorf("la Sesión %s no está POR REVISAR en el registro: no se aterriza", s)
		}
		dentro, err := commitEnRama(root, m.Commit, v.Rama)
		if err != nil {
			return nil, err
		}
		if !dentro {
			return nil, fmt.Errorf("el commit de %s no está en la rama %s del vuelo", s, v.Rama)
		}
		miembro, _ := miembroDe(v, s)
		if pendientes := vuelosUnionPendientes(c, marcas, v, miembro); len(pendientes) > 0 {
			return nil, fmt.Errorf("la Sesión %s une dos vuelos y espera la revisión de %s", s, strings.Join(pendientes, ", "))
		}
		commitFinal = m.Commit
	}
	if err := integrarLocal(root, commitFinal); err != nil {
		return nil, err
	}
	return &Aterrizaje{Vuelo: vuelo, Aprobadas: porcion, Ultima: commitFinal}, nil
}

// integrarLocal fast-forwards the integrated branch to the approved commit. It
// refuses any other current branch and any non-fast-forward: nothing is merged
// from a rewritten base, and there is no push.
func integrarLocal(root, commit string) error {
	rama, err := ramaIntegrada(root)
	if err != nil {
		return err
	}
	actual, err := gitOutput(root, "symbolic-ref", "--quiet", "HEAD")
	if err != nil {
		return fmt.Errorf("no se pudo leer la rama actual: %w", err)
	}
	if actual != rama {
		return fmt.Errorf("la rama actual es %s y la integrada es %s: integrá desde la rama integrada", actual, rama)
	}
	objetivo, err := commitValido(root, commit)
	if err != nil {
		return err
	}
	cabeza, err := gitOutput(root, "rev-parse", "HEAD^{commit}")
	if err != nil {
		return err
	}
	avance, err := commitEnRama(root, cabeza, objetivo)
	if err != nil {
		return err
	}
	if !avance {
		return fmt.Errorf("la porción aprobada no es avance rápido desde %s; revisá la rama integrada", cabeza)
	}
	return gitRun(root, "merge", "--ff-only", objetivo)
}

func formatearAterrizaje(w io.Writer, a *Aterrizaje) {
	ultimaSesion := a.Aprobadas[len(a.Aprobadas)-1]
	fmt.Fprintf(w, "🛬 Vuelo %s aterrizó — porción aprobada integrada: %s\n", a.Vuelo, strings.Join(a.Aprobadas, " → "))
	fmt.Fprintf(w, "   ✅ Última Sesión aprobada: %s (%s)\n", ultimaSesion, a.Ultima)
	fmt.Fprintln(w, "   La subida sigue la política ordinaria de entrega del repositorio; piloto no sube.")
}

func formatearPlanTraslado(w io.Writer, plan *PlanTraslado) {
	fmt.Fprintf(w, "⌦ Traslado sobre la base corregida %s (vuelo %s):\n", plan.CommitsBase, plan.Vuelo)
	for i, p := range plan.Pasos {
		fmt.Fprintf(w, "  %d. %s (%s)\n", i+1, p.Sesion, p.Commit)
	}
}

// cmdTraslado y cmdAterrizar son los puntos de registro que main.go conecta en
// su dispatch; la subida posterior sigue la política ordinaria del repositorio.
func cmdTraslado(w io.Writer, root, sesion, base string) error {
	plan, err := trasladar(root, sesion, base)
	if err != nil {
		return err
	}
	formatearPlanTraslado(w, plan)
	return nil
}

func cmdAterrizar(w io.Writer, root, vuelo string, aprobadas []string, confirmado bool) error {
	a, err := aterrizarVuelo(root, vuelo, aprobadas, confirmado)
	if err != nil {
		return err
	}
	formatearAterrizaje(w, a)
	return nil
}
