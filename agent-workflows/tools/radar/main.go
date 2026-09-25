package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const uso = `radar — herramienta determinista de planificación

  radar check   [-f openspec/plan.yaml] [-C raíz] valida el dato, git y la partición
  radar status  [-f openspec/plan.yaml] [-C raíz] [--json] [--all] Sesiones vivas (con --all, también cerradas)
  radar sesion  <ID> [-f openspec/plan.yaml] [-C raíz] contrato completo de una sola Sesión
  radar faltan  [<ID>] [-f openspec/plan.yaml] [-C raíz] todas las Sesiones abiertas por meta y
                subprioridad, con porcentaje honesto; con <ID>, una línea localizadora
  radar zonas   [-f openspec/plan.yaml] [-C raíz] cobertura sobre archivos rastreados
  radar roadmap [-f openspec/plan.yaml] [-C raíz] alternativas LISTO, compatibilidad
                potencial por archivos e hipotéticos — previsión, no permiso
  radar render  [-f openspec/plan.yaml] [-o openspec/ROADMAP.md] [-C raíz]
  radar archivar <ID> [-C raíz] archiva una Sesión completa con entrega integrada

openspec/plan.yaml es la única fuente editable. openspec/ROADMAP.md es una vista
atómica y determinista: nunca se edita a mano. El checker no adquiere locks vivos.
`

type opciones struct {
	archivo, salida, raiz string
	json, all             bool
}

func main() {
	if len(os.Args) < 2 {
		fmt.Print(uso)
		os.Exit(2)
	}

	comando := os.Args[1]
	if comando == "help" || comando == "-h" || comando == "--help" {
		fmt.Print(uso)
		return
	}
	opts, posicionales, err := parsearArgs(comando, os.Args[2:])
	if err != nil {
		os.Exit(2)
	}
	opts.archivo = resolverRutaConRaiz(opts.archivo, opts.raiz)
	opts.salida = resolverRutaConRaiz(opts.salida, opts.raiz)

	p, err := Load(opts.archivo)
	if err != nil {
		fmt.Fprintln(os.Stderr, "✗", err)
		os.Exit(1)
	}
	root, err := resolverRaiz(opts.raiz, p.Raiz, opts.archivo)
	if err != nil {
		fmt.Fprintln(os.Stderr, "✗", err)
		os.Exit(1)
	}

	switch comando {
	case "check":
		os.Exit(cmdCheck(p, root))
	case "archivar":
		if len(posicionales) != 1 {
			fmt.Fprintln(os.Stderr, "uso: radar archivar <ID> [-C raíz]")
			os.Exit(2)
		}
		if err := archiveSession(opts.archivo, root, posicionales[0]); err != nil {
			fmt.Fprintln(os.Stderr, "✗", err)
			os.Exit(1)
		}
		fmt.Printf("✓ %s archivada\n", posicionales[0])
	case "status":
		if opts.json {
			if err := cmdStatusJSONView(os.Stdout, p, root, opts.all); err != nil {
				fmt.Fprintln(os.Stderr, "✗", err)
				os.Exit(1)
			}
			return
		}
		if err := cmdStatusView(p, root, opts.all); err != nil {
			fmt.Fprintln(os.Stderr, "✗", err)
			os.Exit(1)
		}
	case "sesion":
		if len(posicionales) != 1 {
			fmt.Fprint(os.Stderr, "uso: radar sesion <ID> [-f openspec/plan.yaml] [-C raíz]\n")
			os.Exit(2)
		}
		if err := cmdSesion(os.Stdout, p, root, posicionales[0]); err != nil {
			fmt.Fprintln(os.Stderr, "✗", err)
			os.Exit(1)
		}
	case "faltan":
		if len(posicionales) > 1 {
			fmt.Fprint(os.Stderr, "uso: radar faltan [<ID>] [-f openspec/plan.yaml] [-C raíz]\n")
			os.Exit(2)
		}
		id := ""
		if len(posicionales) == 1 {
			id = posicionales[0]
		}
		if err := cmdFaltan(os.Stdout, p, root, id); err != nil {
			fmt.Fprintln(os.Stderr, "✗", err)
			os.Exit(1)
		}
	case "roadmap":
		if err := cmdRoadmap(os.Stdout, p, root); err != nil {
			fmt.Fprintln(os.Stderr, "✗", err)
			os.Exit(1)
		}
	case "zonas":
		if err := cmdZonas(p, root); err != nil {
			fmt.Fprintln(os.Stderr, "✗", err)
			os.Exit(1)
		}
	case "render":
		if err := cmdRender(p, root, opts.salida); err != nil {
			fmt.Fprintln(os.Stderr, "✗", err)
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "comando desconocido: %s\n\n%s", comando, uso)
		os.Exit(2)
	}
}

// parsearArgs accepts positional arguments before or after the flags, so
// `radar sesion S114 -C raíz` and `radar sesion -C raíz S114` mean the same.
func parsearArgs(comando string, args []string) (opciones, []string, error) {
	var o opciones
	fs := flag.NewFlagSet(comando, flag.ContinueOnError)
	fs.StringVar(&o.archivo, "f", "openspec/plan.yaml", "archivo de plan")
	fs.StringVar(&o.salida, "o", "openspec/ROADMAP.md", "salida generada (sólo render)")
	fs.StringVar(&o.raiz, "C", "", "raíz del repositorio")
	fs.BoolVar(&o.json, "json", false, "emitir el snapshot legible por máquina (sólo status)")
	fs.BoolVar(&o.all, "all", false, "incluir Sesiones cerradas y archivadas (sólo status)")
	var posicionales []string
	for {
		if err := fs.Parse(args); err != nil {
			return o, nil, err
		}
		if fs.NArg() == 0 {
			return o, posicionales, nil
		}
		posicionales = append(posicionales, fs.Arg(0))
		args = fs.Args()[1:]
	}
}

func resolverRutaConRaiz(ruta, raiz string) string {
	if raiz == "" || filepath.IsAbs(ruta) {
		return ruta
	}
	return filepath.Join(raiz, ruta)
}

func resolverRaiz(explicita, declarada, archivo string) (string, error) {
	base := explicita
	if base == "" {
		base = declarada
	}
	if base == "" {
		base = filepath.Dir(archivo)
	}
	root, err := gitOutput(base, "rev-parse", "--show-toplevel")
	if err != nil {
		return "", fmt.Errorf("no se pudo derivar la raíz Git desde %s: %w", base, err)
	}
	return canonicalRoot(root)
}

func cmdCheck(p *Plan, root string) int {
	hallazgos := append(p.Check(root), p.avisosDeTrailers(root)...)
	var errores, avisos int
	for _, h := range hallazgos {
		if h.Severidad == "error" {
			errores++
		} else {
			avisos++
		}
	}
	for _, sev := range []string{"error", "aviso"} {
		for _, h := range hallazgos {
			if h.Severidad != sev {
				continue
			}
			marca := "✗"
			if sev == "aviso" {
				marca = "!"
			}
			fmt.Printf("%s  [%s] %s\n", marca, h.Regla, h.Detalle)
		}
	}
	fmt.Println()
	if errores == 0 && avisos == 0 {
		fmt.Printf("✓ %s: %d zonas, %d Sesiones, partición y evidencia válidas\n", p.Producto, len(p.Zonas), len(p.Sesiones))
		return 0
	}
	fmt.Printf("%s: %d error(es), %d aviso(s)\n", p.Producto, errores, avisos)
	if errores > 0 {
		return 1
	}
	return 0
}

// validarAt is the one refusal shared by every command that shows computed state.
func validarAt(p *Plan, root, head, comando string) error {
	var errores []string
	for _, h := range p.CheckAt(root, head) {
		if h.Severidad == "error" {
			errores = append(errores, fmt.Sprintf("[%s] %s", h.Regla, h.Detalle))
		}
	}
	if len(errores) > 0 {
		return fmt.Errorf("%s no disponible: la validación falló con %d error(es): %s", comando, len(errores), strings.Join(errores, "; "))
	}
	return nil
}

func cmdStatus(p *Plan, root string) error { return cmdStatusView(p, root, false) }

func cmdStatusView(p *Plan, root string, all bool) error {
	head, err := gitHEAD(root)
	if err != nil {
		return fmt.Errorf("no se pudo fijar HEAD para calcular status: %w", err)
	}
	if err := validarAt(p, root, head, "status"); err != nil {
		return err
	}
	estados := p.EstadosAt(root, head)
	colas := p.ColaPorZonaAt(root, head)
	porZona, total := p.AvanceAt(root, head)
	asientos := p.AsientosAt(root, head)
	entregados, _, err := p.AvanceModulosAt(root, head)
	if err != nil {
		return fmt.Errorf("no se pudo leer el avance de Módulos: %w", err)
	}
	fmt.Printf("%s — %s\n", p.Producto, total)
	if len(p.Prioridades) > 0 {
		activa := "ninguna"
		if pr, hay := p.PrioridadActivaAt(root, head); hay {
			activa = pr.Etiqueta()
		}
		fmt.Printf("Prioridad activa: %s\n", activa)
	}
	fmt.Println()

	zonaSet := make(map[string]bool, len(p.Zonas)+1)
	for _, z := range p.Zonas {
		zonaSet[z.ID] = true
	}
	for zona := range colas {
		zonaSet[zona] = true
	}
	zonas := make([]string, 0, len(zonaSet))
	for zona := range zonaSet {
		zonas = append(zonas, zona)
	}
	sort.Strings(zonas)
	nombres := p.ZonaPorID()
	for _, zid := range zonas {
		cola := colas[zid]
		if len(cola) == 0 {
			continue
		}
		nombre := zid
		if z, ok := nombres[zid]; ok && z.Nombre != "" {
			nombre = z.Nombre
		}
		fmt.Printf("%s  %s\n", nombre, porZona[zid])
		for i, id := range cola {
			s := p.SesionPorID()[id]
			linea := fmt.Sprintf("  #%d  %-28s %s  %s  ruta:%s", i+1, truncar(s.Resultado, 28), id, estados[id], s.RutaEfectiva())
			if k := modulosEntregados(s, entregados); k > 0 {
				if s.RutaEfectiva() == RutaSDDNativa {
					linea += fmt.Sprintf("  entregados %d Módulos", k)
				} else {
					linea += fmt.Sprintf("  a medias %d/%d Módulos", k, len(s.Modulos))
				}
			}
			if pr, ok := prioridadDeclarada(p, s.Prioridad); ok {
				linea += "  prioridad:" + pr.ID
			}
			fmt.Println(linea)
		}
		fmt.Println()
	}
	if len(asientos) == 0 {
		fmt.Printf("Asientos: ninguna Zona tiene trabajo LISTO (%s)\n", sinReservaDeAsiento)
	} else {
		fmt.Printf("Asientos: %d zona(s) %s — %v (%s)\n", len(asientos), veredictoDeParalelo, asientos, sinReservaDeAsiento)
	}
	if all {
		fmt.Println("Sesiones cerradas y archivadas:")
		for _, s := range p.Sesiones {
			if st := estados[s.ID]; st == Completo || st == Archivado {
				fmt.Printf("  %s  %s  %s\n", s.ID, st, s.Resultado)
			}
		}
	}
	if rows := referenceRows(p); len(rows) > 0 {
		fmt.Println("\nNon-executable references (no status/queue/seat/capacity):")
		for _, r := range rows {
			fmt.Printf("  %-18s %-8s %-24s %s\n", r.ID, r.Kind, r.Locator, r.Reason)
		}
	}
	fmt.Println("\nContrato completo de una Sesión: radar sesion <ID>")
	return nil
}

func cmdZonas(p *Plan, root string) error {
	cobertura, totalArchivos, err := p.Cobertura(root)
	if err != nil {
		return err
	}
	ids := make([]string, 0, len(cobertura))
	for id := range cobertura {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return cobertura[ids[i]] > cobertura[ids[j]] })
	fmt.Printf("%s — %d archivos rastreados\n\n", p.Producto, totalArchivos)
	for _, id := range ids {
		n := cobertura[id]
		pct := 0
		if totalArchivos > 0 {
			pct = n * 100 / totalArchivos
		}
		fmt.Printf("  %-16s %5d archivos  %3d%%\n", id, n, pct)
	}
	return nil
}

func truncar(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	if n <= 1 {
		return string(r[:n])
	}
	return string(r[:n-1]) + "…"
}
