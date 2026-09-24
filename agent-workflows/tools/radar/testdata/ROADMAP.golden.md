<!-- GENERADO por `radar render` desde openspec/plan.yaml. NO EDITAR A MANO. -->
# Hoja de ruta — ejemplo

## 📍 Punto de retoma
- Cierres registrados: ninguno.
- Próximo trabajo ejecutable: Cocina #1 → S1 — instalar horno.
- Decisión pendiente: S2 — ¿riego manual o automático?.

## Estado y próximo trabajo
- Cocina #1 → S1 — instalar horno

## Avance
- **Total:** 0% (0/2 S)
- **Cocina:** 0% (0/1 S)
- **Patio:** 0% (0/1 S)

## Zonas y colas
### Cocina (cocina)
1. **S1** · 🟢 LISTO · instalar horno

### Patio (patio)
1. **S2** · 🔴 BLOQUEADO · falta-decision (S2) · definir riego

## Bloqueos
- **S2:** ¿riego manual o automático? · falta-decision (S2)

## Rutas
- **S1:** propuesta direct (RFC cocina §1); pendiente de revalidación en kickoff.
- **S2:** propuesta design-tasks (PRD patio §2); pendiente de revalidación en kickoff.

## Detalle de Módulos y Tareas
### S1 — instalar horno
- Estado derivado: 🟢 LISTO
- Zona/Área: cocina · cocina/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] el horno enciende

#### M1.1 — conectar horno
Rutas: cocina/horno.go

- **T1.1.1:** probar encendido → encendido probado
  - [ ] la prueba falla sin conexión

### S2 — definir riego
- Estado derivado: 🔴 BLOQUEADO · falta-decision (S2)
- Zona/Área: patio · patio/
- Depende de: S1
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] el riego tiene contrato

#### M2.1 — contrato de riego
Rutas: patio/riego.go

- **T2.1.1:** especificar el contrato → contrato especificado
  - [ ] la alternativa aprobada está representada

## Capacidad
1 Zona(s) con trabajo LISTO pueden trabajar en paralelo sin compartir Zona, Cimientos ni Recurso: cocina.
Radar no reserva el asiento: no adquiere locks, no autentica al proceso invocante y no recupera claims stale.
