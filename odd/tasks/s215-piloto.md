# Feature: S215 — Herramienta determinista `piloto`

Autoridad: Diseño de Piloto automático 2026-10-03 (P1–P14); mapa V2/V3 2026-10-04; delta de
S220 (sección 7 de docs/architecture/piloto-copias-de-trabajo.md); reglas de entrega del
maintainer 2026-10-06 (Engram 13259). Encargo completo en `openspec/plan.yaml` (S215).

## Alcance
Módulo Go propio `agent-workflows/tools/piloto` (patrón Radar, sin daemon) + `install-piloto.sh`
(convenio TORRE_BIN_DIR). Despegue de vuelos aprobados por el usuario (agrupando Sesiones LISTO
por Zona vía radar status --json), rondas con límites configurables (3 rondas / 10 Sesiones por
defecto, de la corrida entera), aterrizaje con informe, freno de emergencia. Ramas
`piloto/<fecha>/vuelo-<id>` y copias de trabajo por vuelo (umask 022, bun install, codegraph init,
en Worktrees/piloto-<fecha>/vuelo-<id>). Marcas radar.piloto/v1 + interruptor
radar.piloto.interruptor/v1 según el contrato que S214 documentó en radar/etapa.go. Nunca pushea,
nunca escribe en la rama principal, nunca toca la config personal.

## Tareas
- [x] T1: Preparar copia de trabajo del writer (umask 022, worktree).
- [x] T2: Implementación test-first por writer (RED → GREEN → gofmt/vet).
- [x] T3: Verificación independiente del padre (go test/vet/gofmt + radar check).
- [x] T4: Revisión RDD, integración a master, push y archivado de la Sesión.

## Evidencia de commits
- `1c188a3` feat(piloto): módulo Go determinista (marcas radar.piloto/v1, vuelos, límites, freno, retiro) — 9 archivos, 3276 líneas; `ea5a636` feat(piloto): install-piloto.sh con guardias TORRE_BIN_DIR.
- TDD: RED 84 tests observados, GREEN 31 tests + 71 subtests, estable con -count=3; gofmt/vet limpios; interop en vivo con radar real (EN CURSO, POR REVISAR con nota, P9, retiro fail-closed).
- Revisión nativa `review-94fc19c406830a3c` (high, 4 lentes): CRITICAL R3-001 determinista (cleanup no cubría fallos de escribirCorrida/escribirInterruptor tras despegar) → corrección 60 líneas (guardia extendido + test RED/GREEN) → validación dirigida aprobada → APPROVED, acuse quemado (c654d326…).
- Hallazgos informativos (trabajo posterior): R3-002 WARNING main.go:460-473; R3-003 WARNING go.mod:3; R4-despegar-orphan-state WARNING main.go:411-413.
- Reintentos mecánicos de captura: 5 (hash mal ecoado, JSON truncado, severidad inválida, hash mal ecoado, timeout 524 del proveedor); la captura de slot único resolvió donde el transporte grupal fallaba; el tope de 3 reintentos se superó con autorización explícita del maintainer.
