package main

import (
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
)

// SnapshotSchema versions the machine-readable projection. A consumer that
// cannot recognise it must stop rather than guess at the fields.
const SnapshotSchema = "radar.snapshot/v1"

// Snapshot is the machine-readable projection of a computed plan state. It
// exists so a report never re-derives progress from a rendered document: Radar
// stays the single owner of the calculation, and the reader only draws it.
//
// Every field here is already computed by EstadosAt/AvanceAt/ColaPorZonaAt.
// Nothing is calculated twice, and nothing authored is invented — there is
// deliberately no Zona "estado", because a Zona is territory, not work.
type Snapshot struct {
	Schema              string          `json:"schema"`
	Producto            string          `json:"producto"`
	Head                string          `json:"head"`
	Avance              AvanceJSON      `json:"avance"`
	PrioridadActiva     *PrioridadJSON  `json:"prioridad_activa,omitempty"`
	Prioridades         []PrioridadJSON `json:"prioridades,omitempty"`
	Zonas               []ZonaSnapshot  `json:"zonas"`
	Sesiones            []SesionEstado  `json:"sesiones"`
	Asientos            []string        `json:"asientos"`
	TerritorioPendiente int             `json:"territorio_pendiente"`
}

// AvanceJSON mirrors Avance with explicit JSON names so the wire contract does
// not drift with Go field names.
type AvanceJSON struct {
	Cerradas int `json:"cerradas"`
	Total    int `json:"total"`
}

type ZonaSnapshot struct {
	ID       string      `json:"id"`
	Nombre   string      `json:"nombre"`
	Cerradas int         `json:"cerradas"`
	Total    int         `json:"total"`
	Cola     []ColaEntry `json:"cola"`
}

type ColaEntry struct {
	Posicion  int    `json:"posicion"`
	Sesion    string `json:"sesion"`
	Estado    string `json:"estado"`
	Resultado string `json:"resultado"`
}

type SesionEstado struct {
	ID        string `json:"id"`
	Zona      string `json:"zona"`
	Estado    string `json:"estado"`
	Resultado string `json:"resultado"`
	Prioridad string `json:"prioridad,omitempty"`
}

// PrioridadJSON is one declared priority. Plans without priorities emit none of
// these fields, so the v1 wire contract only grows.
type PrioridadJSON struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
}

// Snapshot projects the plan at the current HEAD.
func (p *Plan) Snapshot(root string) Snapshot {
	head, _ := gitHEAD(root)
	return p.SnapshotAt(root, head)
}

func (p *Plan) SnapshotAt(root, head string) Snapshot {
	estados := p.EstadosAt(root, head)
	colas := p.ColaPorZonaAt(root, head)
	porZona, total := p.AvanceAt(root, head)
	index := p.SesionPorID()
	nombres := p.ZonaPorID()

	// Declared Zonas and Zonas that only appear through a queue are both real;
	// a Sesión pointing at an undeclared Zona must stay visible, not vanish.
	ids := map[string]bool{}
	for _, z := range p.Zonas {
		ids[z.ID] = true
	}
	for zona := range colas {
		ids[zona] = true
	}
	for zona := range porZona {
		ids[zona] = true
	}
	delete(ids, "")

	orden := make([]string, 0, len(ids))
	for id := range ids {
		orden = append(orden, id)
	}
	sort.Strings(orden)

	zonas := make([]ZonaSnapshot, 0, len(orden))
	for _, id := range orden {
		nombre := id
		if z, ok := nombres[id]; ok && z.Nombre != "" {
			nombre = z.Nombre
		}
		cola := make([]ColaEntry, 0, len(colas[id]))
		for i, sid := range colas[id] {
			entry := ColaEntry{Posicion: i + 1, Sesion: sid, Estado: vocabulario(estados[sid])}
			if s, ok := index[sid]; ok {
				entry.Resultado = s.Resultado
			}
			cola = append(cola, entry)
		}
		zonas = append(zonas, ZonaSnapshot{
			ID:       id,
			Nombre:   nombre,
			Cerradas: porZona[id].Cerradas,
			Total:    porZona[id].Total,
			Cola:     cola,
		})
	}

	sesiones := make([]SesionEstado, 0, len(p.Sesiones))
	pendiente := 0
	for i := range p.Sesiones {
		s := &p.Sesiones[i]
		if esTerritorioPendiente(s) {
			pendiente++
		}
		sesiones = append(sesiones, SesionEstado{
			ID:        s.ID,
			Zona:      s.Zona,
			Estado:    vocabulario(estados[s.ID]),
			Resultado: s.Resultado,
			Prioridad: s.Prioridad,
		})
	}

	asientos := p.AsientosAt(root, head)
	if asientos == nil {
		asientos = []string{}
	}

	prioridades := make([]PrioridadJSON, 0, len(p.Prioridades))
	for _, pr := range p.Prioridades {
		prioridades = append(prioridades, PrioridadJSON{ID: pr.ID, Nombre: pr.Nombre})
	}
	var activa *PrioridadJSON
	if pr, hay := p.PrioridadActivaAt(root, head); hay {
		activa = &PrioridadJSON{ID: pr.ID, Nombre: pr.Nombre}
	}

	return Snapshot{
		Schema:              SnapshotSchema,
		Producto:            p.Producto,
		Head:                head,
		Avance:              AvanceJSON{Cerradas: total.Cerradas, Total: total.Total},
		PrioridadActiva:     activa,
		Prioridades:         prioridades,
		Zonas:               zonas,
		Sesiones:            sesiones,
		Asientos:            asientos,
		TerritorioPendiente: pendiente,
	}
}

// vocabulario strips the presentation emoji so a consumer compares against the
// vocabulary word alone. Radar owns how a state is drawn; the word is the contract.
func vocabulario(estado string) string {
	_, palabra, hay := strings.Cut(estado, " ")
	if !hay {
		return estado
	}
	return palabra
}

// cmdStatusJSON emits the machine-readable projection. It refuses on the same
// validation errors as the human status: a consumer must never receive numbers
// Radar itself would not stand behind.
func cmdStatusJSON(w io.Writer, p *Plan, root string) error {
	head, err := gitHEAD(root)
	if err != nil {
		return fmt.Errorf("no se pudo fijar HEAD para calcular status: %w", err)
	}
	var errores []string
	for _, h := range p.CheckAt(root, head) {
		if h.Severidad == "error" {
			errores = append(errores, fmt.Sprintf("[%s] %s", h.Regla, h.Detalle))
		}
	}
	if len(errores) > 0 {
		return fmt.Errorf("status no disponible: la validación falló con %d error(es): %s", len(errores), strings.Join(errores, "; "))
	}
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(p.SnapshotAt(root, head))
}
