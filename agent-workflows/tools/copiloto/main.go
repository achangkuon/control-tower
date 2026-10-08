package main

import (
	"bytes"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const uso = `copiloto — guía determinista del flujo chanks

  copiloto foco <ninguno|idea|S###> [--conversacion <nombre>] [-C raíz]
                  registra el foco de esta conversación (registro y guía, nunca
                  un candado). Sin argumento, muestra el foco vigente. El foco es
                  por conversación: una conversación nueva arranca en ninguno, y
                  la copia de trabajo de una Sesión con marcador de despacho lo
                  fija como un hecho, sin preguntar.
  copiloto tarjeta [--conversacion <nombre>] [-C raíz]
                  imprime la tarjeta de la etapa (0 a 5) derivada de Radar: la
                  etapa, su skill, el siguiente paso y los archivos autorizados.
  copiloto panorama [-C raíz]
                  imprime la línea de panorama (LISTAS y EN CURSO) de Radar.

El foco vive en el directorio común de Git (chanks/copiloto) y sobrevive
cualquier copia de trabajo. Radar es la única fuente de las etapas y del
panorama; Engram nunca decide. El copiloto guía, nunca bloquea.
`

func main() {
	os.Exit(ejecutar(os.Args[1:], os.Stdout, os.Stderr))
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
// so `copiloto foco S238 --conversacion c` and `copiloto foco --conversacion c S238` agree.
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

func gitOutput(root string, args ...string) (string, error) {
	cmdArgs := append([]string{"-C", root}, args...)
	out, err := exec.Command("git", cmdArgs...).CombinedOutput()
	if err != nil {
		detalle := strings.TrimSpace(string(out))
		if detalle == "" {
			detalle = err.Error()
		}
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), detalle)
	}
	return strings.TrimSpace(string(out)), nil
}

// commonDir is the Git common directory: the one place shared by every linked
// worktree, so the focus survives the copy it was written from.
func commonDir(root string) (string, error) {
	return gitOutput(root, "rev-parse", "--path-format=absolute", "--git-common-dir")
}

// radarSalida is the single Radar read seam: every stage, the panorama and the
// authorized files come from here, never from memory and never from a
// hand-written state file. Tests replace it with fixed answers.
var radarSalida = func(root string, args ...string) ([]byte, error) {
	bin, err := resolverRadar(root)
	if err != nil {
		return nil, err
	}
	return ejecutarRadar(bin, args...)
}

func ejecutarRadar(bin string, args ...string) ([]byte, error) {
	cmd := exec.Command(bin, args...)
	var salida, errores bytes.Buffer
	cmd.Stdout = &salida
	cmd.Stderr = &errores
	if err := cmd.Run(); err != nil {
		detalle := strings.TrimSpace(errores.String())
		if detalle == "" {
			detalle = err.Error()
		}
		return nil, fmt.Errorf("%s", detalle)
	}
	return salida.Bytes(), nil
}

func realDestino(p string) string {
	resuelto, err := filepath.EvalSymlinks(p)
	if err != nil {
		return ""
	}
	abs, err := filepath.Abs(resuelto)
	if err != nil {
		return ""
	}
	return abs
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

func ejecutar(args []string, salida, errores io.Writer) int {
	if len(args) == 0 {
		fmt.Fprint(errores, uso)
		return 2
	}
	switch args[0] {
	case "help", "-h", "--help":
		fmt.Fprint(salida, uso)
		return 0
	case "--version", "version":
		fmt.Fprintln(salida, "copiloto v1")
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
	common, err := commonDir(root)
	if err != nil {
		fmt.Fprintln(errores, "✗", err)
		return 1
	}
	switch comando {
	case "foco":
		return cmdFoco(salida, errores, root, common, resto)
	case "tarjeta":
		return cmdTarjeta(salida, errores, root, common, resto)
	case "panorama":
		return cmdPanorama(salida, errores, root)
	default:
		fmt.Fprintf(errores, "comando desconocido: %s\n\n%s", comando, uso)
		return 2
	}
}
