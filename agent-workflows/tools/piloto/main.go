package main

import (
	"bufio"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const uso = `piloto — herramienta determinista del piloto automático

  piloto despegar [-C raíz] [--rondas N] [--tope N] [--aprobar <id,id>] [--sin-preparar]
                  propone los vuelos posibles con lo LISTO de Radar, pide aprobación
                  vuelo por vuelo y despega los aprobados (rama y copia de trabajo)
  piloto ronda <vuelo> [-C raíz]
                  muestra los pisos del vuelo y qué Sesión puede arrancar
  piloto marcar <sesión> (--en-curso | --cierre --commit <sha> [--decisiones N] |
                  --novedad --motivo <motivo>) [-C raíz]
                  registra la marca radar.piloto/v1 de esa Sesión
  piloto informe [-C raíz]
                  resumen de la corrida: POR REVISAR, NOVEDAD, ronda y sin empezar
  piloto freno [-C raíz]
                  frena la corrida: nada nuevo arranca y lo EN CURSO queda NOVEDAD · interrumpida
  piloto interruptor [on|off|estado] [--rondas N] [--tope N] [-C raíz]
                  prende, apaga o muestra el interruptor y los límites de la corrida
  piloto retirar <vuelo> [-C raíz]
                  retira copia de trabajo y rama de un vuelo ya integrado

El estado vive en el directorio común de Git: el interruptor, los límites y las
marcas que Radar lee. La corrida nunca escribe en la rama principal, nunca sube
nada y nunca toca la configuración personal del usuario.
`

func main() {
	os.Exit(ejecutar(os.Args[1:], os.Stdout, os.Stderr, os.Stdin))
}

// extraerRaiz pulls -C <raíz> out of the arguments so every command understands
// it in the same place, before or after its own flags.
func extraerRaiz(args []string) ([]string, string, error) {
	var resto []string
	raiz := ""
	for i := 0; i < len(args); i++ {
		if args[i] == "-C" {
			if i+1 >= len(args) {
				return nil, "", fmt.Errorf("-C necesita una raíz")
			}
			raiz = args[i+1]
			i++
			continue
		}
		resto = append(resto, args[i])
	}
	return resto, raiz, nil
}

// parsearConPosicionales accepts positional arguments before or after the flags,
// so `piloto marcar S1 --en-curso` and `piloto marcar --en-curso S1` agree.
func parsearConPosicionales(fs *flag.FlagSet, args []string) ([]string, error) {
	var pos []string
	for {
		if err := fs.Parse(args); err != nil {
			return nil, err
		}
		if fs.NArg() == 0 {
			return pos, nil
		}
		pos = append(pos, fs.Arg(0))
		args = fs.Args()[1:]
	}
}

func ejecutar(args []string, salida, errores io.Writer, entrada io.Reader) int {
	if len(args) == 0 {
		fmt.Fprint(errores, uso)
		return 2
	}
	switch args[0] {
	case "help", "-h", "--help":
		fmt.Fprint(salida, uso)
		return 0
	case "--version", "version":
		fmt.Fprintln(salida, "piloto v1")
		return 0
	}
	comando := args[0]
	resto, raiz, err := extraerRaiz(args[1:])
	if err != nil {
		fmt.Fprintln(errores, "✗", err)
		return 2
	}
	if raiz == "" {
		cwd, e := os.Getwd()
		if e != nil {
			fmt.Fprintln(errores, "✗", e)
			return 1
		}
		raiz = cwd
	}
	root, err := gitOutput(raiz, "rev-parse", "--show-toplevel")
	if err != nil {
		fmt.Fprintln(errores, "✗", fmt.Errorf("no se pudo derivar la raíz Git desde %s: %w", raiz, err))
		return 1
	}
	falla := func(err error) int {
		fmt.Fprintln(errores, "✗", err)
		return 1
	}
	switch comando {
	case "despegar":
		fs := flag.NewFlagSet("despegar", flag.ContinueOnError)
		fs.SetOutput(errores)
		aprobar := fs.String("aprobar", "", "IDs de vuelo aprobados, separados por coma")
		rondas := fs.Int("rondas", rondasPorDefecto, "rondas máximas de la corrida (0 = sin límite)")
		tope := fs.Int("tope", topePorDefecto, "tope de Sesiones de la corrida (0 = sin tope)")
		sinPreparar := fs.Bool("sin-preparar", false, "no correr bun install ni codegraph init en las copias")
		if _, err := parsearConPosicionales(fs, resto); err != nil {
			return 2
		}
		var ids []string
		for _, id := range strings.Split(*aprobar, ",") {
			if id = strings.TrimSpace(id); id != "" {
				ids = append(ids, id)
			}
		}
		if err := cmdDespegar(salida, entrada, root, ids, *rondas, *tope, *sinPreparar); err != nil {
			return falla(err)
		}
	case "ronda":
		fs := flag.NewFlagSet("ronda", flag.ContinueOnError)
		fs.SetOutput(errores)
		pos, err := parsearConPosicionales(fs, resto)
		if err != nil {
			return 2
		}
		if len(pos) != 1 {
			fmt.Fprint(errores, "uso: piloto ronda <vuelo> [-C raíz]\n")
			return 2
		}
		if err := cmdRonda(salida, root, pos[0]); err != nil {
			return falla(err)
		}
	case "marcar":
		fs := flag.NewFlagSet("marcar", flag.ContinueOnError)
		fs.SetOutput(errores)
		enCurso := fs.Bool("en-curso", false, "marcar la Sesión EN CURSO")
		cierre := fs.Bool("cierre", false, "marcar la Sesión POR REVISAR con su commit")
		novedad := fs.Bool("novedad", false, "marcar la Sesión NOVEDAD con su motivo")
		commit := fs.String("commit", "", "commit de entrega (sólo --cierre)")
		motivo := fs.String("motivo", "", "motivo del freno (sólo --novedad)")
		decisiones := fs.Int("decisiones", 0, "decisiones menores anotadas (sólo --cierre)")
		pos, err := parsearConPosicionales(fs, resto)
		if err != nil {
			return 2
		}
		fmtUso := "uso: piloto marcar <sesión> (--en-curso | --cierre --commit <sha> [--decisiones N] | --novedad --motivo <motivo>)\n"
		if len(pos) != 1 {
			fmt.Fprint(errores, fmtUso)
			return 2
		}
		estado, cuantos := "", 0
		for _, elegido := range []struct {
			si   bool
			cual string
		}{{*enCurso, estadoEnCurso}, {*cierre, estadoCierre}, {*novedad, estadoNovedad}} {
			if elegido.si {
				estado = elegido.cual
				cuantos++
			}
		}
		if cuantos != 1 {
			fmt.Fprint(errores, fmtUso)
			return 2
		}
		if err := cmdMarcar(salida, root, pos[0], estado, *commit, *motivo, *decisiones); err != nil {
			return falla(err)
		}
	case "informe":
		if err := cmdInforme(salida, root); err != nil {
			return falla(err)
		}
	case "freno":
		if err := cmdFreno(salida, root); err != nil {
			return falla(err)
		}
	case "interruptor":
		fs := flag.NewFlagSet("interruptor", flag.ContinueOnError)
		fs.SetOutput(errores)
		rondas := fs.Int("rondas", -1, "rondas máximas (0 = sin límite); -1 conserva")
		tope := fs.Int("tope", -1, "tope de Sesiones (0 = sin tope); -1 conserva")
		pos, err := parsearConPosicionales(fs, resto)
		if err != nil {
			return 2
		}
		if len(pos) > 1 {
			fmt.Fprint(errores, "uso: piloto interruptor [on|off|estado] [--rondas N] [--tope N] [-C raíz]\n")
			return 2
		}
		accion := "estado"
		if len(pos) == 1 {
			accion = pos[0]
		}
		if err := cmdInterruptor(salida, root, accion, *rondas, *tope); err != nil {
			return falla(err)
		}
	case "retirar":
		fs := flag.NewFlagSet("retirar", flag.ContinueOnError)
		fs.SetOutput(errores)
		pos, err := parsearConPosicionales(fs, resto)
		if err != nil {
			return 2
		}
		if len(pos) != 1 {
			fmt.Fprint(errores, "uso: piloto retirar <vuelo> [-C raíz]\n")
			return 2
		}
		if err := cmdRetirar(salida, root, pos[0]); err != nil {
			return falla(err)
		}
	default:
		fmt.Fprintf(errores, "comando desconocido: %s\n\n%s", comando, uso)
		return 2
	}
	return 0
}

// realDestino resolves a candidate to its real destination so a symlink cannot
// smuggle a binary out of the checkout being worked on.
func realDestino(p string) string {
	if p == "" {
		return ""
	}
	if abs, err := filepath.Abs(p); err == nil {
		p = abs
	}
	resuelto, err := filepath.EvalSymlinks(p)
	if err != nil {
		return ""
	}
	return resuelto
}

func pathDentro(p, root string) bool {
	return p == root || strings.HasPrefix(p, root+string(os.PathSeparator))
}

// resolverRadar finds the installed radar the same way the pre-push gate does:
// PATH, an explicit RADAR_BIN, then the fixed install location. A candidate that
// resolves inside the checkout is discarded, never executed.
func resolverRadar(root string) (string, error) {
	var candidatos []string
	if p, err := exec.LookPath("radar"); err == nil && strings.ContainsRune(p, os.PathSeparator) {
		candidatos = append(candidatos, p)
	}
	if v := os.Getenv("RADAR_BIN"); v != "" {
		candidatos = append(candidatos, v)
	}
	if home, err := os.UserHomeDir(); err == nil {
		candidatos = append(candidatos, filepath.Join(home, ".local", "bin", "radar"))
	}
	realRoot := realDestino(root)
	for _, c := range candidatos {
		info, err := os.Stat(c)
		if err != nil || info.IsDir() || info.Mode().Perm()&0o111 == 0 {
			continue
		}
		destino := realDestino(c)
		if destino == "" || (realRoot != "" && pathDentro(destino, realRoot)) {
			continue
		}
		return destino, nil
	}
	return "", fmt.Errorf("radar no está disponible; instalalo con agent-workflows/tools/install-radar.sh")
}

func ejecutarRadarStatus(bin, root string) ([]byte, error) {
	cmd := exec.Command(bin, "status", "--json", "-C", root)
	out, err := cmd.Output()
	if err != nil {
		var exit *exec.ExitError
		if errors.As(err, &exit) && len(exit.Stderr) > 0 {
			return nil, fmt.Errorf("radar status --json falló: %s", strings.TrimSpace(string(exit.Stderr)))
		}
		return nil, fmt.Errorf("radar status --json falló: %w", err)
	}
	return out, nil
}

// radarStatus is the read seam: tests replace it with a fixed snapshot.
var radarStatus = ejecutarRadarStatus

func textoRondas(rondas int) string {
	if rondas <= 0 {
		return "sin límite de rondas"
	}
	if rondas == 1 {
		return "1 ronda"
	}
	return fmt.Sprintf("%d rondas", rondas)
}

func textoTope(tope int) string {
	if tope <= 0 {
		return "sin tope de Sesiones"
	}
	if tope == 1 {
		return "tope 1 Sesión"
	}
	return fmt.Sprintf("tope %d Sesiones", tope)
}

// aprobarVuelos resolves the user's per-flight approval: explicit IDs when the
// orchestrator already asked, otherwise one answer per candidate on stdin. An
// incomplete answer refuses the whole takeoff, never guesses.
func aprobarVuelos(w io.Writer, entrada io.Reader, candidatos []Vuelo, aprobar []string) ([]Vuelo, error) {
	porID := map[string]Vuelo{}
	for _, v := range candidatos {
		porID[v.ID] = v
	}
	if len(aprobar) > 0 {
		var out []Vuelo
		for _, id := range aprobar {
			v, ok := porID[id]
			if !ok {
				return nil, fmt.Errorf("el vuelo %q no está entre los posibles", id)
			}
			out = append(out, v)
		}
		return out, nil
	}
	lector := bufio.NewScanner(entrada)
	var out []Vuelo
	for _, v := range candidatos {
		fmt.Fprintf(w, "¿Despegar el vuelo %s (%s)? [s/N]: ", v.ID, strings.Join(sesionesDeVuelo(v), ", "))
		if !lector.Scan() {
			return nil, fmt.Errorf("aprobación incompleta: la entrada terminó antes de decidir el vuelo %s", v.ID)
		}
		switch strings.ToLower(strings.TrimSpace(lector.Text())) {
		case "s", "si", "sí", "y", "yes":
			out = append(out, v)
		}
	}
	return out, nil
}

// cmdDespegar is the takeoff checklist: Radar proposes, the user approves, and
// only then are branches, copies and the switch created. Predictable contract
// questions are asked here, before flying, not mid-flight.
func cmdDespegar(w io.Writer, entrada io.Reader, root string, aprobar []string, rondas, tope int, sinPreparar bool) error {
	if rondas < 0 || rondas > 3 {
		return fmt.Errorf("las rondas deben ser 0 (sin límite), 1, 2 o 3")
	}
	if tope < 0 {
		return fmt.Errorf("el tope de Sesiones no puede ser negativo")
	}
	actual, err := leerInterruptor(root)
	if err != nil {
		return err
	}
	if actual != nil && actual.Prendido {
		return fmt.Errorf("ya hay una corrida prendida: aterrizá o apagá el piloto antes de despegar otra")
	}
	if c, err := leerCorrida(root); err != nil {
		return err
	} else if c != nil && len(c.Vuelos) > 0 {
		return fmt.Errorf("quedan vuelos de una corrida anterior: retiralos con `piloto retirar <vuelo>`")
	}
	bin, err := resolverRadar(root)
	if err != nil {
		return err
	}
	datos, err := radarStatus(bin, root)
	if err != nil {
		return err
	}
	snap, err := decodificarSnapshot(datos)
	if err != nil {
		return err
	}
	candidatos := vuelosPosibles(snap)
	if len(candidatos) == 0 {
		return fmt.Errorf("Radar no tiene Sesiones LISTO: no hay vuelos posibles")
	}
	fmt.Fprintf(w, "🛫 Vuelos posibles: %d\n", len(candidatos))
	for _, v := range candidatos {
		fmt.Fprintf(w, "  vuelo %s — %d Sesiones — %s\n", v.ID, len(v.Sesiones), strings.Join(sesionesDeVuelo(v), ", "))
	}
	fmt.Fprintln(w)
	aprobados, err := aprobarVuelos(w, entrada, candidatos, aprobar)
	if err != nil {
		return err
	}
	if len(aprobados) == 0 {
		return fmt.Errorf("no se aprobó ningún vuelo")
	}
	fecha := ahora().Format("2006-01-02")
	base, err := ramaIntegrada(root)
	if err != nil {
		return err
	}
	c := Corrida{Fecha: fecha, Inicio: ahora().UTC().Format("2006-01-02T15:04:05Z07:00")}
	despegar := func() error {
		for _, v := range aprobados {
			v.Rama = ramaDeVuelo(fecha, v.ID)
			if v.Copia, err = rutaCopia(root, fecha, v.ID); err != nil {
				return err
			}
			if err := crearCopia(root, base, v.Rama, v.Copia); err != nil {
				return err
			}
			c.Vuelos = append(c.Vuelos, v)
			if !sinPreparar {
				if err := prepararCopia(v.Copia); err != nil {
					return err
				}
			}
		}
		return nil
	}
	if err := despegar(); err != nil {
		// Un despegue a medias no deja ramas ni copias huérfanas: nada se perdió,
		// así que se retiran las que este mismo comando creó.
		for _, v := range c.Vuelos {
			_ = retirarCopiaForce(root, v.Rama, v.Copia)
		}
		return err
	}
	if err := escribirCorrida(root, c); err != nil {
		return err
	}
	if err := escribirInterruptor(root, Interruptor{Prendido: true, Rondas: rondas, Tope: tope}); err != nil {
		return err
	}
	fmt.Fprintf(w, "🛫 Despegue confirmado — %d vuelos · hasta %s · %s\n", len(c.Vuelos), textoRondas(rondas), textoTope(tope))
	fmt.Fprintln(w)
	fmt.Fprintln(w, "Lista de despegue (lo que el orquestador cierra antes de volar):")
	fmt.Fprintln(w, "  [ ] Sonda de consentimiento RDD: una pregunta sobre un cambio trivial de una línea; el usuario elige «autorizar siempre» y el lineage se abandona antes de que corra ningún revisor. Es una vez por corrida.")
	fmt.Fprintln(w, "  [ ] Preguntas previsibles de los contratos, ya cerradas con el usuario.")
	fmt.Fprintln(w, "  [ ] Confirmado: la corrida no sube, no publica y no toca la configuración personal del usuario.")
	return nil
}

func cmdInterruptor(w io.Writer, root, accion string, rondas, tope int) error {
	actual, err := leerInterruptor(root)
	if err != nil {
		return err
	}
	if actual == nil {
		actual = &Interruptor{Rondas: rondasPorDefecto, Tope: topePorDefecto}
	}
	switch accion {
	case "", "estado":
		estado := "apagado"
		if actual.Prendido {
			estado = "prendido"
		}
		fmt.Fprintf(w, "Interruptor del piloto: %s · %s · %s\n", estado, textoRondas(actual.Rondas), textoTope(actual.Tope))
		return nil
	case "on":
		i := Interruptor{Prendido: true, Rondas: actual.Rondas, Tope: actual.Tope}
		if rondas >= 0 {
			i.Rondas = rondas
		}
		if tope >= 0 {
			i.Tope = tope
		}
		if err := escribirInterruptor(root, i); err != nil {
			return err
		}
		fmt.Fprintf(w, "✓ piloto prendido · %s · %s\n", textoRondas(i.Rondas), textoTope(i.Tope))
		return nil
	case "off":
		i := Interruptor{Prendido: false, Rondas: actual.Rondas, Tope: actual.Tope}
		if err := escribirInterruptor(root, i); err != nil {
			return err
		}
		fmt.Fprintf(w, "✓ piloto apagado · %s · %s\n", textoRondas(i.Rondas), textoTope(i.Tope))
		return nil
	default:
		return fmt.Errorf("acción desconocida %q: usá on, off o estado", accion)
	}
}

func cmdRonda(w io.Writer, root, vuelo string) error {
	c, err := corridaActual(root)
	if err != nil {
		return err
	}
	v, ok := vueloPorID(c, vuelo)
	if !ok {
		return fmt.Errorf("el vuelo %s no está en la corrida", vuelo)
	}
	i, err := leerInterruptor(root)
	if err != nil {
		return err
	}
	if i == nil {
		i = &Interruptor{Rondas: rondasPorDefecto, Tope: topePorDefecto}
	}
	marcas, err := leerMarcas(root, c)
	if err != nil {
		return err
	}
	todos := pisos(*v)
	fmt.Fprintf(w, "Vuelo %s — %s · %s · %s\n", v.ID, v.Rama, textoRondas(i.Rondas), textoTope(i.Tope))
	for _, m := range v.Sesiones {
		estado := "sin empezar"
		if previa := marcas[m.Sesion]; previa != nil {
			estado = previa.Estado
		}
		union := ""
		if m.Union {
			union = "  (une dos vuelos: no arranca)"
		}
		fmt.Fprintf(w, "  %s  piso %d  %s%s\n", m.Sesion, todos[m.Sesion], estado, union)
	}
	var arrancables []string
	for _, m := range v.Sesiones {
		if err := puedeEmpezar(c, marcas, i, m.Sesion); err == nil {
			arrancables = append(arrancables, m.Sesion)
		}
	}
	if len(arrancables) == 0 {
		fmt.Fprintln(w, "  Puede arrancar: nada por ahora")
	} else {
		fmt.Fprintf(w, "  Puede arrancar: %s\n", strings.Join(arrancables, ", "))
	}
	return nil
}

func cmdMarcar(w io.Writer, root, sesion, estado, commit, motivo string, decisiones int) error {
	i, err := leerInterruptor(root)
	if err != nil {
		return err
	}
	var m *Marca
	switch estado {
	case estadoEnCurso:
		m, err = marcarEnCurso(root, i, sesion)
	case estadoCierre:
		m, err = marcarCierre(root, i, sesion, commit, decisiones)
	case estadoNovedad:
		m, err = marcarNovedad(root, i, sesion, motivo)
	default:
		return fmt.Errorf("estado desconocido %q: usá en-curso, cierre o novedad", estado)
	}
	if err != nil {
		return err
	}
	fmt.Fprintf(w, "✓ %s → %s\n", m.Sesion, m.Estado)
	return nil
}

func cmdInforme(w io.Writer, root string) error {
	r, err := resumir(root)
	if err != nil {
		return err
	}
	if len(r.Vuelos) == 0 {
		fmt.Fprintln(w, "No hay vuelos en la corrida.")
	}
	for _, v := range r.Vuelos {
		fmt.Fprintf(w, "Vuelo %s — ronda %d · %d POR REVISAR · %d NOVEDAD · %d sin empezar\n",
			v.ID, v.RondaAlcanzada, v.PorRevisar, v.Novedad, v.SinEmpezar)
		for _, s := range v.Sesiones {
			nota := s.Nota
			if s.Estado == "SIN EMPEZAR" {
				nota = fmt.Sprintf("piso %d", s.Ronda)
			}
			if nota == "" {
				fmt.Fprintf(w, "  %s  %s\n", s.Sesion, s.Estado)
			} else {
				fmt.Fprintf(w, "  %s  %s  %s\n", s.Sesion, s.Estado, nota)
			}
		}
	}
	fmt.Fprintf(w, "\n🛬 Aterrizaje — %d POR REVISAR · %d NOVEDAD · %d sin empezar (iniciadas: %d · %s)\n",
		r.PorRevisar, r.Novedad, r.SinEmpezar, r.Iniciadas, textoTope(r.Tope))
	if r.DebeAterrizar {
		fmt.Fprintf(w, "  Motivo: %s\n", r.MotivoAterrizaje)
	}
	fmt.Fprintln(w, "  Apagá el modo con `piloto interruptor off`; apagar no borra NOVEDAD ni POR REVISAR (P9).")
	return nil
}

func cmdFreno(w io.Writer, root string) error {
	i, err := leerInterruptor(root)
	if err != nil {
		return err
	}
	if i == nil || !i.Prendido {
		fmt.Fprintln(w, "El piloto ya está apagado; no hay nada que frenar.")
		return nil
	}
	interrumpidas, err := frenar(root, i)
	if err != nil {
		return err
	}
	if len(interrumpidas) == 0 {
		fmt.Fprintln(w, "Freno puesto: no había Sesiones en el aire.")
	}
	for _, id := range interrumpidas {
		fmt.Fprintf(w, "  %s quedó NOVEDAD · interrumpida (su trabajo sigue en la copia del vuelo)\n", id)
	}
	fmt.Fprintln(w, "🛑 Piloto apagado.")
	return nil
}

func cmdRetirar(w io.Writer, root, vuelo string) error {
	if err := retirarVuelo(root, vuelo); err != nil {
		return err
	}
	fmt.Fprintf(w, "✓ vuelo %s retirado (copia y rama)\n", vuelo)
	return nil
}
