package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"sort"
	"strings"
)

// snapshot is the slice of Radar's machine projection the copiloto reads: the
// pilot switch, the live Session states and the authorized files. Every field is
// already computed by Radar; the copiloto only draws it.
type snapshot struct {
	Schema   string           `json:"schema"`
	Piloto   *pilotoSnapshot  `json:"piloto,omitempty"`
	Sesiones []sesionSnapshot `json:"sesiones"`
}

type pilotoSnapshot struct {
	Prendido bool `json:"prendido"`
}

type sesionSnapshot struct {
	ID       string   `json:"id"`
	Estado   string   `json:"estado"`
	Archivos []string `json:"archivos,omitempty"`
}

func leerSnapshot(root string) (snapshot, error) {
	out, err := radarSalida(root, "status", "--json")
	if err != nil {
		return snapshot{}, err
	}
	var snap snapshot
	if err := json.Unmarshal(out, &snap); err != nil {
		return snap, fmt.Errorf("snapshot de Radar ilegible: %w", err)
	}
	if snap.Schema != "radar.snapshot/v1" {
		return snap, fmt.Errorf("snapshot de Radar inesperado: %q", snap.Schema)
	}
	return snap, nil
}

// panoramaDe draws the one Etapa 0 line. The words are the contract; the counts
// come from Radar, never from a hand-written total.
func panoramaDe(snap snapshot) string {
	listas := 0
	var enCurso []string
	for _, s := range snap.Sesiones {
		switch s.Estado {
		case "LISTO":
			listas++
		case "EN CURSO":
			enCurso = append(enCurso, s.ID)
		}
	}
	sort.Strings(enCurso)
	palabra := "LISTAS"
	if listas == 1 {
		palabra = "LISTA"
	}
	linea := fmt.Sprintf("🧭 %d %s · %d EN CURSO", listas, palabra, len(enCurso))
	if len(enCurso) > 0 {
		linea += ": " + strings.Join(enCurso, ", ")
	}
	return linea
}

func cmdPanorama(salida, errores io.Writer, root string) int {
	snap, err := leerSnapshot(root)
	if err != nil {
		fmt.Fprintln(errores, "✗", err)
		return 1
	}
	fmt.Fprintln(salida, panoramaDe(snap))
	return 0
}

const usoTarjeta = `copiloto tarjeta [--conversacion <nombre>] [-C raíz]
`

// cmdTarjeta resolves the focus and draws the stage. It never blocks: a missing
// Radar degrades to silence and a named hint, never to a failed session.
func cmdTarjeta(salida, errores io.Writer, root, common string, args []string) int {
	fs := flag.NewFlagSet("tarjeta", flag.ContinueOnError)
	fs.SetOutput(errores)
	fs.Usage = func() { fmt.Fprint(errores, usoTarjeta) }
	convFlag := fs.String("conversacion", "", "nombre de la conversación")
	pos, err := parsearConPosicionales(fs, args)
	if err != nil {
		return 2
	}
	if len(pos) > 0 {
		fmt.Fprintln(errores, "✗ tarjeta no toma argumentos")
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

	// The work copy of a dispatched Session is a fact, not a stored choice.
	if sesion, _ := sesionDeWorktree(common, root); sesion != "" {
		return tarjetaSesion(salida, errores, root, sesion)
	}

	f, err := leerFoco(common, conversacion)
	if err != nil {
		fmt.Fprintln(errores, "✗", err)
		return 1
	}
	switch f.Foco {
	case focoIdea:
		return tarjetaIdea(salida)
	case focoNinguno:
		// Etapa 0: one panorama line at the start, then nothing.
		if f.PanoramaVisto {
			return 0
		}
		snap, err := leerSnapshot(root)
		if err != nil {
			fmt.Fprintln(errores, "🧭 panorama no disponible:", err)
			return 0
		}
		fmt.Fprintln(salida, panoramaDe(snap))
		f.PanoramaVisto = true
		if err := escribirFoco(common, f); err != nil {
			fmt.Fprintln(errores, "✗", err)
			return 0
		}
		return 0
	default:
		return tarjetaSesion(salida, errores, root, f.Foco)
	}
}

// tarjetaIdea draws the Etapa 1 card: close the open ambiguities with the human
// before anything reaches plan.yaml, and name the skill that does it.
func tarjetaIdea(salida io.Writer) int {
	fmt.Fprintln(salida, "🧭 Etapa 1 · Definir: cerrá las dudas abiertas con el humano y armá la propuesta de alcance; no escribas plan.yaml sin aprobación.")
	fmt.Fprintln(salida, "🧭 skill: chanks-1-cierre-de-decisiones · idea suelta: chanks-1-brain-dump · capacidad nueva: chanks-1-feature · producto vivo: chanks-1-descubrimiento")
	return 0
}

type etapaOferta struct {
	Schema string `json:"schema"`
	Sesion string `json:"sesion"`
	Etapa  int    `json:"etapa"`
	Nombre string `json:"nombre"`
}

// leerEtapa asks Radar the one applicable stage. The copiloto derives it, never
// invents it, and a refusal is guidance naming the reason — never a lock.
func leerEtapa(root, sesion string) (etapaOferta, error) {
	out, err := radarSalida(root, "etapa", sesion)
	if err != nil {
		return etapaOferta{}, err
	}
	var e etapaOferta
	if err := json.Unmarshal(out, &e); err != nil {
		return e, fmt.Errorf("etapa de Radar ilegible: %w", err)
	}
	if e.Schema != "radar.etapa/v1" || e.Sesion != sesion || e.Etapa < 1 || e.Etapa > 5 {
		return e, fmt.Errorf("etapa de Radar inesperada para %s", sesion)
	}
	return e, nil
}

func razonDeError(err error) string {
	var m struct {
		Reason string `json:"reason"`
	}
	if json.Unmarshal([]byte(strings.TrimSpace(err.Error())), &m) == nil {
		return m.Reason
	}
	return ""
}

// tarjetaSinEtapa turns a Radar refusal into one signed guidance line.
func tarjetaSinEtapa(sesion string, err error) string {
	texto := "Radar no da etapa para " + sesion + "."
	switch razonDeError(err) {
	case "sesion_desconocida":
		texto = "Radar no conoce " + sesion + "; corregí el foco con `copiloto foco`."
	case "plan_invalido":
		texto = "Radar no puede leer el plan; corré `radar check`."
	case "despacho_huerfano":
		texto = "El despacho de " + sesion + " quedó huérfano; mirá `radar faltan`."
	case "marcador_invalido":
		texto = "El marcador de despacho de " + sesion + " es inválido; revisalo."
	case "etapa_no_aplicable":
		texto = sesion + " no tiene una etapa 0–5 aplicable; mirá `radar sesion " + sesion + "`."
	case "git_no_disponible":
		texto = "Git no está disponible; la etapa no se puede calcular."
	default:
		if razon := razonDeError(err); razon != "" {
			texto += " Motivo: " + razon + "."
		}
	}
	return "🧭 " + texto
}

func skillDeEtapa(etapa int) string {
	switch etapa {
	case 2:
		return "chanks-2-planificador-granular"
	case 3:
		return "chanks-3-paralelo"
	case 4:
		return "chanks-4-puente"
	case 5:
		return "chanks-5-session-doc"
	}
	return ""
}

// accionDeEtapa is the next step. In Etapa 4 it names the contract without
// prescribing steps: Gentle AI decides how, so the card never repeats it.
func accionDeEtapa(et etapaOferta, prendido bool) string {
	switch et.Etapa {
	case 2:
		return "completá el encargo hasta LISTO"
	case 3:
		if prendido {
			return "¿con piloto automático o en esta conversación?"
		}
		return "elegí el lote o seguí con esta Sesión"
	case 4:
		return "entregá a Gentle AI; acá manda Gentle AI"
	case 5:
		return "cerrá con `radar archivar " + et.Sesion + " --commit <sha>`"
	}
	return ""
}

// tarjetaSesion draws the card of the focused Session: stage, skill, next step
// and the files Radar authorizes. At most three lines.
func tarjetaSesion(salida, errores io.Writer, root, sesion string) int {
	et, err := leerEtapa(root, sesion)
	if err != nil {
		fmt.Fprintln(salida, tarjetaSinEtapa(sesion, err))
		return 0
	}

	prendido := false
	var archivos []string
	if snap, err := leerSnapshot(root); err == nil {
		prendido = snap.Piloto != nil && snap.Piloto.Prendido
		for _, s := range snap.Sesiones {
			if s.ID == sesion {
				archivos = s.Archivos
			}
		}
	} else if errores != nil {
		// The stage still guides; only the files and the switch are missing.
		fmt.Fprintln(errores, "🧭 sin archivos autorizados ni interruptor:", err)
	}

	fmt.Fprintf(salida, "🧭 %s · Etapa %d · %s: %s\n", et.Sesion, et.Etapa, et.Nombre, accionDeEtapa(et, prendido))
	fmt.Fprintln(salida, "🧭 skill: "+skillDeEtapa(et.Etapa))
	if len(archivos) > 0 {
		fmt.Fprintln(salida, "🧭 archivos: "+strings.Join(archivos, ", "))
	}
	return 0
}
