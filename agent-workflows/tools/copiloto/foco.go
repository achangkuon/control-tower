package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// The copiloto's on-disk contract. It lives under the Git common directory, next
// to the pilot's state, so a linked worktree reads the same focus. The copiloto
// is the only writer; Radar never reads it — Radar stays the single source of
// stages and panorama.
const (
	esquemaFoco = "copiloto.foco/v1"

	focoNinguno = "ninguno"
	focoIdea    = "idea"

	conversacionPorDefecto = "principal"
)

var (
	patronConversacion = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`)
	patronFoco         = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._-]{0,127}$`)
)

// focoGuardado is the focus of one conversation. A missing file means `ninguno`
// and a panorama that has not been shown yet: that is how every new conversation
// starts at Etapa 0 without anyone erasing anything.
type focoGuardado struct {
	Schema        string `json:"schema"`
	Conversacion  string `json:"conversacion"`
	Foco          string `json:"foco"`
	PanoramaVisto bool   `json:"panorama_visto"`
}

func validarConversacion(c string) error {
	if c == "." || c == ".." || !patronConversacion.MatchString(c) {
		return fmt.Errorf("nombre de conversación inválido: %q", c)
	}
	return nil
}

// focoValido accepts the two named states and any Radar-style Session token. The
// token is a shape only: Radar decides whether the Session exists.
func focoValido(v string) bool {
	return v == focoNinguno || v == focoIdea || patronFoco.MatchString(v)
}

func directorioComponentes(base string, partes []string, crear bool) (string, error) {
	actual := base
	for _, parte := range partes {
		actual = filepath.Join(actual, parte)
		info, err := os.Lstat(actual)
		if errors.Is(err, os.ErrNotExist) && crear {
			if err = os.Mkdir(actual, 0o700); err == nil {
				info, err = os.Lstat(actual)
			}
		}
		if err != nil {
			return "", err
		}
		if !info.IsDir() {
			return "", fmt.Errorf("ruta del copiloto es un enlace simbólico o no es directorio: %s", actual)
		}
	}
	return actual, nil
}

func dirCopiloto(common string, crear bool) (string, error) {
	return directorioComponentes(common, []string{"chanks", "copiloto"}, crear)
}

func dirFocos(common string, crear bool) (string, error) {
	base, err := dirCopiloto(common, crear)
	if err != nil {
		return "", err
	}
	return directorioComponentes(base, []string{"focos"}, crear)
}

// leerFoco returns the stored focus, or the Etapa 0 default when the conversation
// has no file yet.
func leerFoco(common, conversacion string) (focoGuardado, error) {
	f := focoGuardado{Schema: esquemaFoco, Conversacion: conversacion, Foco: focoNinguno}
	if err := validarConversacion(conversacion); err != nil {
		return f, err
	}
	dir, err := dirFocos(common, false)
	if errors.Is(err, os.ErrNotExist) {
		return f, nil
	}
	if err != nil {
		return f, err
	}
	data, err := os.ReadFile(filepath.Join(dir, conversacion+".json"))
	if errors.Is(err, os.ErrNotExist) {
		return f, nil
	}
	if err != nil {
		return f, err
	}
	var guardado focoGuardado
	if err := json.Unmarshal(data, &guardado); err != nil {
		return f, fmt.Errorf("foco ilegible: %w", err)
	}
	if guardado.Schema != esquemaFoco || guardado.Conversacion != conversacion || !focoValido(guardado.Foco) {
		return f, fmt.Errorf("contrato de foco inválido para %q", conversacion)
	}
	return guardado, nil
}

// escribirFoco writes one conversation's focus atomically. A reader never sees a
// half-written file, and the previous focus stays intact until the rename.
func escribirFoco(common string, f focoGuardado) error {
	if err := validarConversacion(f.Conversacion); err != nil {
		return err
	}
	if !focoValido(f.Foco) {
		return fmt.Errorf("foco inválido: %q", f.Foco)
	}
	f.Schema = esquemaFoco
	dir, err := dirFocos(common, true)
	if err != nil {
		return err
	}
	data, err := json.Marshal(f)
	if err != nil {
		return err
	}
	data = append(data, '\n')
	tmp, err := os.CreateTemp(dir, "."+f.Conversacion+".tmp-*")
	if err != nil {
		return err
	}
	nombre := tmp.Name()
	defer os.Remove(nombre)
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(nombre, 0o600); err != nil {
		return err
	}
	return os.Rename(nombre, filepath.Join(dir, f.Conversacion+".json"))
}

// marcarActiva records which conversation the runtime last identified. It is how
// a later `copiloto foco` run by the agent lands in the right conversation.
func marcarActiva(common, conversacion string) error {
	if err := validarConversacion(conversacion); err != nil {
		return err
	}
	dir, err := dirCopiloto(common, true)
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, ".activa.tmp-*")
	if err != nil {
		return err
	}
	nombre := tmp.Name()
	defer os.Remove(nombre)
	if _, err := tmp.WriteString(conversacion + "\n"); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(nombre, 0o600); err != nil {
		return err
	}
	return os.Rename(nombre, filepath.Join(dir, "activa"))
}

func leerActiva(common string) string {
	dir, err := dirCopiloto(common, false)
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(filepath.Join(dir, "activa"))
	if err != nil {
		return ""
	}
	c := strings.TrimSpace(string(data))
	if validarConversacion(c) != nil {
		return ""
	}
	return c
}

// conversacionResuelta names the conversation in a fixed order: an explicit
// argument, the runtime environment, the active pointer, then a single default.
// Distinct names never share a focus.
func conversacionResuelta(common, explicita string) string {
	if explicita != "" {
		return explicita
	}
	if env := os.Getenv("COPILOTO_CONVERSACION"); env != "" {
		return env
	}
	if activa := leerActiva(common); activa != "" {
		return activa
	}
	return conversacionPorDefecto
}

// sesionDeWorktree reads the dispatch markers and returns the Session whose work
// copy is this exact checkout. That is a fact, not a choice: no approval is
// needed because Radar already recorded the human-approved dispatch.
func sesionDeWorktree(common, root string) (string, error) {
	dir := filepath.Join(common, "chanks", "despachos")
	entradas, err := os.ReadDir(dir)
	if errors.Is(err, os.ErrNotExist) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	raiz := realDestino(root)
	var encontradas []string
	for _, entrada := range entradas {
		if entrada.IsDir() || !strings.HasSuffix(entrada.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, entrada.Name()))
		if err != nil {
			continue
		}
		var m struct {
			Schema   string `json:"schema"`
			Sesion   string `json:"sesion"`
			Worktree string `json:"worktree"`
		}
		if json.Unmarshal(data, &m) != nil {
			continue
		}
		if m.Schema != "radar.despacho/v1" || m.Sesion == "" || m.Worktree == "" {
			continue
		}
		if raiz != "" && realDestino(m.Worktree) == raiz {
			encontradas = append(encontradas, m.Sesion)
		}
	}
	sort.Strings(encontradas)
	if len(encontradas) == 0 {
		return "", nil
	}
	return encontradas[0], nil
}

// sesionExiste asks Radar, the only source, whether the Session exists.
func sesionExiste(root, id string) error {
	_, err := radarSalida(root, "sesion", id)
	return err
}

const usoFoco = `copiloto foco <ninguno|idea|S###> [--conversacion <nombre>] [-C raíz]
`

func cmdFoco(salida, errores io.Writer, root, common string, args []string) int {
	fs := flag.NewFlagSet("foco", flag.ContinueOnError)
	fs.SetOutput(errores)
	fs.Usage = func() { fmt.Fprint(errores, usoFoco) }
	convFlag := fs.String("conversacion", "", "nombre de la conversación")
	pos, err := parsearConPosicionales(fs, args)
	if err != nil {
		return 2
	}
	if len(pos) > 1 {
		fmt.Fprintln(errores, "✗ foco toma un solo valor: ninguno, idea o S###")
		return 2
	}
	conversacion := conversacionResuelta(common, *convFlag)
	if err := validarConversacion(conversacion); err != nil {
		fmt.Fprintln(errores, "✗", err)
		return 1
	}
	if *convFlag != "" {
		if err := marcarActiva(common, conversacion); err != nil {
			fmt.Fprintln(errores, "✗", err)
			return 1
		}
	}

	// Read mode: `copiloto foco` with no value shows what is in play.
	if len(pos) == 0 {
		if s, _ := sesionDeWorktree(common, root); s != "" {
			fmt.Fprintf(salida, "🧭 foco %s (copia de trabajo)\n", s)
			return 0
		}
		f, err := leerFoco(common, conversacion)
		if err != nil {
			fmt.Fprintln(errores, "✗", err)
			return 1
		}
		fmt.Fprintf(salida, "🧭 foco %s\n", f.Foco)
		return 0
	}

	valor := pos[0]
	if !focoValido(valor) {
		fmt.Fprintf(errores, "✗ foco inválido: %q; usá ninguno, idea o la Sesión (S###)\n", valor)
		return 2
	}
	if valor != focoNinguno && valor != focoIdea {
		if err := sesionExiste(root, valor); err != nil {
			fmt.Fprintf(errores, "✗ Radar no conoce la Sesión %s; corregí el foco\n", valor)
			return 1
		}
	}
	// Returning to Etapa 0 restarts the panorama: the human asked to think again.
	f := focoGuardado{
		Schema:        esquemaFoco,
		Conversacion:  conversacion,
		Foco:          valor,
		PanoramaVisto: valor != focoNinguno,
	}
	if err := escribirFoco(common, f); err != nil {
		fmt.Fprintln(errores, "✗", err)
		return 1
	}
	fmt.Fprintf(salida, "🧭 foco %s\n", valor)
	return 0
}
