package main

import (
	"fmt"
	"strings"
)

// Encargo is the native ODD brief. Its presence deliberately distinguishes a
// new Session from the preserved legacy hierarchy of route, Modules and Tasks.
// The four text fields are product context, not an executor work breakdown.
type Encargo struct {
	PedidoContexto          string `yaml:"pedido_contexto"`
	ResultadoComportamiento string `yaml:"resultado_comportamiento"`
	RestriccionesDecisiones string `yaml:"restricciones_decisiones"`
	Referencias             string `yaml:"referencias"`
	Incompleto              bool   `yaml:"incompleto"`
}

// SolicitudSDD records the exceptional human selection of SDD for a native
// Session. Absence means native ODD; Radar does not choose a route or invoke a
// provider from this marker.
type SolicitudSDD struct {
	SolicitudHumana bool   `yaml:"solicitud_humana"`
	Autoridad       string `yaml:"autoridad"`
}

func (s *Sesion) esEncargo() bool { return s.Encargo != nil }

func (s *Sesion) encargoIncompleto() bool {
	return s.Encargo != nil && s.Encargo.Incompleto
}

func (s *Sesion) solicitudSDDValida() bool {
	return s.SolicitudSDD != nil && s.SolicitudSDD.SolicitudHumana && strings.TrimSpace(s.SolicitudSDD.Autoridad) != ""
}

func (p *Plan) checkEncargo(root, head string, s *Sesion) []Hallazgo {
	var h []Hallazgo
	e := s.Encargo
	if e == nil {
		return h
	}
	if s.Ruta != (RutaSesion{}) || len(s.RutasHistoricas) != 0 {
		h = append(h, Hallazgo{"error", "contrato de encargo", fmt.Sprintf("%s usa encargo y no puede reinterpretar ruta ni rutas históricas legacy", s.ID)})
	}
	if strings.TrimSpace(s.Cambio) != "" && !s.solicitudSDDValida() {
		h = append(h, Hallazgo{"error", "contrato de encargo", fmt.Sprintf("%s sólo puede declarar cambio con una solicitud_sdd humana válida", s.ID)})
	}
	if e.Incompleto {
		if strings.TrimSpace(e.PedidoContexto) == "" {
			h = append(h, Hallazgo{"error", "encargo incompleto", fmt.Sprintf("%s debe conservar al menos pedido_contexto al marcarse incompleto", s.ID)})
		}
		if s.Entrega != nil || s.Archivada || s.Diferida {
			h = append(h, Hallazgo{"error", "encargo incompleto", fmt.Sprintf("%s incompleto no puede declarar entrega, archivada ni diferida", s.ID)})
		}
	} else {
		for _, field := range []struct {
			name, value string
		}{
			{"pedido_contexto", e.PedidoContexto},
			{"resultado_comportamiento", e.ResultadoComportamiento},
			{"restricciones_decisiones", e.RestriccionesDecisiones},
			{"referencias", e.Referencias},
		} {
			if strings.TrimSpace(field.value) == "" {
				h = append(h, Hallazgo{"error", "encargo", fmt.Sprintf("%s debe declarar encargo.%s", s.ID, field.name)})
			}
		}
	}
	if e.Incompleto && s.Zona != "" {
		if s.Zona == "cimientos" {
			if len(s.Cimientos) == 0 {
				h = append(h, Hallazgo{"error", "sesión", fmt.Sprintf("%s vive en zona: cimientos pero no declara ningún archivo para reservar", s.ID)})
			}
		} else if _, ok := p.ZonaPorID()[s.Zona]; !ok {
			h = append(h, Hallazgo{"error", "sesión", fmt.Sprintf("%s vive en la zona %q, que no existe", s.ID, s.Zona)})
		}
	}
	if s.SoloLectura {
		if len(s.Archivos) != 0 || len(s.Cimientos) != 0 {
			h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s es solo_lectura y no puede declarar archivos autorizados ni Cimientos reservados", s.ID)})
		}
		return append(h, p.checkEvidenciaLegacyDeEncargo(root, head, s)...)
	}
	if len(s.Archivos) == 0 && !e.Incompleto {
		h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s debe declarar archivos exactos o marcar solo_lectura", s.ID)})
		return h
	}
	seen := map[string]bool{}
	for _, archivo := range s.Archivos {
		normalizado, err := exactRepoFile(root, archivo)
		if err != nil {
			h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s: %v", s.ID, err)})
			continue
		}
		if seen[normalizado] {
			h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s declara dos veces %q", s.ID, normalizado)})
			continue
		}
		seen[normalizado] = true
		autorizado := false
		if contiene(s.Cimientos, normalizado) {
			for _, regla := range p.Cimientos.Rutas {
				if matchRule(regla, normalizado) {
					autorizado = true
					break
				}
			}
		} else if s.Zona != "cimientos" {
			for _, owner := range p.owners(normalizado) {
				if owner.Kind == "zona" && owner.ID == s.Zona {
					autorizado = true
				}
			}
		}
		if !autorizado {
			h = append(h, Hallazgo{"error", "autoridad de archivo", fmt.Sprintf("%s no autoriza %q desde la Zona %q ni como Cimiento exacto reservado", s.ID, normalizado, s.Zona)})
		}
	}
	for _, cimiento := range s.Cimientos {
		if !contiene(s.Archivos, cimiento) {
			h = append(h, Hallazgo{"error", "archivo autorizado", fmt.Sprintf("%s reserva el Cimiento %q sin declararlo en archivos", s.ID, cimiento)})
		}
	}
	h = append(h, p.checkEvidenciaLegacyDeEncargo(root, head, s)...)
	return h
}

// checkEvidenciaLegacyDeEncargo preserves only delivery history from a migrated
// row. Native Archivos remain the entire current authorization boundary; old
// Module paths never become write authorization or native progress.
func (p *Plan) checkEvidenciaLegacyDeEncargo(root, head string, s *Sesion) []Hallazgo {
	if len(s.Modulos) == 0 {
		return nil
	}
	if s.ImportacionLegacy == nil {
		return []Hallazgo{{"error", "evidencia legacy", fmt.Sprintf("%s sólo puede conservar Módulos legacy con importacion_legacy probada", s.ID)}}
	}
	entregados, _, err := p.AvanceModulosAt(root, head)
	if err != nil {
		return []Hallazgo{{"error", "evidencia legacy", fmt.Sprintf("%s no pudo leer entregas legacy: %v", s.ID, err)}}
	}
	prefijo := "M" + strings.TrimPrefix(s.ID, "S") + "."
	var h []Hallazgo
	for _, m := range s.Modulos {
		if !legacyModuloID.MatchString(m.ID) || !strings.HasPrefix(m.ID, prefijo) {
			h = append(h, Hallazgo{"error", "evidencia legacy", fmt.Sprintf("%s no conserva un Módulo legacy válido: %q", s.ID, m.ID)})
			continue
		}
		if _, ok := entregados[m.ID]; !ok {
			h = append(h, Hallazgo{"error", "evidencia legacy", fmt.Sprintf("%s conserva %s sin trailer Modulo alcanzable desde HEAD", s.ID, m.ID)})
		}
	}
	return h
}

func checkSolicitudSDD(s *Sesion) []Hallazgo {
	if s.SolicitudSDD == nil {
		return nil
	}
	if !s.SolicitudSDD.SolicitudHumana || strings.TrimSpace(s.SolicitudSDD.Autoridad) == "" {
		return []Hallazgo{{"error", "solicitud SDD", fmt.Sprintf("%s debe declarar solicitud_humana y autoridad para usar SDD", s.ID)}}
	}
	return nil
}

func archivosDeSesion(s *Sesion) []string {
	if s.esEncargo() {
		return s.Archivos
	}
	var out []string
	for _, m := range s.Modulos {
		out = append(out, m.Rutas...)
	}
	return out
}
