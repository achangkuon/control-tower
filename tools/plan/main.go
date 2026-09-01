package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

const uso = `plan — herramienta determinista de planificación

  plan check   [-f plan.yaml] [-C raíz]   valida el plan y la partición
  plan status  [-f plan.yaml] [-C raíz]   estado calculado, colas y asientos
  plan zonas   [-f plan.yaml] [-C raíz]   cobertura de cada zona sobre el árbol

La raíz por defecto es el directorio del archivo de plan.
El estado nunca se escribe: se calcula de las dependencias, las decisiones
abiertas y la evidencia de entrega. Ver plan-naming-convention.md §17.
`

func main() {
	if len(os.Args) < 2 {
		fmt.Print(uso)
		os.Exit(2)
	}

	comando := os.Args[1]
	fs := flag.NewFlagSet(comando, flag.ExitOnError)
	archivo := fs.String("f", "plan.yaml", "archivo de plan")
	raiz := fs.String("C", "", "raíz del repositorio (por defecto: el directorio del plan)")
	_ = fs.Parse(os.Args[2:])

	if comando == "help" || comando == "-h" || comando == "--help" {
		fmt.Print(uso)
		return
	}

	p, err := Load(*archivo)
	if err != nil {
		fmt.Fprintln(os.Stderr, "✗", err)
		os.Exit(1)
	}

	root := *raiz
	if root == "" {
		root = p.Raiz
	}
	if root == "" {
		root = filepath.Dir(*archivo)
	}

	switch comando {
	case "check":
		os.Exit(cmdCheck(p, root))
	case "status":
		cmdStatus(p)
	case "zonas":
		if err := cmdZonas(p, root); err != nil {
			fmt.Fprintln(os.Stderr, "✗", err)
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "comando desconocido: %s\n\n%s", comando, uso)
		os.Exit(2)
	}
}

func cmdCheck(p *Plan, root string) int {
	hallazgos := p.Check(root)

	var errores, avisos int
	for _, h := range hallazgos {
		if h.Severidad == "error" {
			errores++
		} else {
			avisos++
		}
	}

	// Errors first, then warnings: a reader who stops after three lines should
	// have read the three that matter.
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
		fmt.Printf("✓ %s: %d zonas, %d Sesiones, partición válida\n",
			p.Producto, len(p.Zonas), len(p.Sesiones))
		return 0
	}
	fmt.Printf("%s: %d error(es), %d aviso(s)\n", p.Producto, errores, avisos)
	if errores > 0 {
		return 1
	}
	return 0
}

func cmdStatus(p *Plan) {
	estados := p.Estados()
	colas := p.ColaPorZona()
	porZona, total := p.Avance()
	asientos := p.Asientos()

	fmt.Printf("%s — %s\n\n", p.Producto, total)

	zonas := make([]string, 0, len(p.Zonas))
	for _, z := range p.Zonas {
		zonas = append(zonas, z.ID)
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
			fmt.Printf("  #%d  %-28s %s  %s\n", i+1, truncar(s.Resultado, 28), id, estados[id])
		}
		fmt.Println()
	}

	// The count of Zonas with ready work. The seats actually opened are the
	// lesser of this and the human's ceiling, and the ceiling is never raised
	// by an agent. Convention §13.
	if len(asientos) == 0 {
		fmt.Println("Asientos: 0 zonas con trabajo listo")
	} else {
		fmt.Printf("Asientos: %d zona(s) con trabajo listo — %v\n", len(asientos), asientos)
	}
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
