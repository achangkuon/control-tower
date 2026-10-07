# Feature: S217 — Revisión al volver y aterrizaje de la porción aprobada

Autoridad: Diseño de Piloto automático 2026-10-03 (P1–P14); reglas de entrega del maintainer
2026-10-06 (Engram 13259, ya en el encargo). Encargo completo en `openspec/plan.yaml` (S217).
Zona metodo, prioridad v2-piloto. depende_de: S215 (✅ entregada).

## Alcance
`piloto` expone los pasos de la revisión al volver como comandos deterministas: informe por
vuelo (POR REVISAR con nota, NOVEDAD con motivo, ronda alcanzada, Sesiones sin empezar), orden
de cascada base-arriba (NOVEDAD primero), registro de resolución de NOVEDAD, análisis de
impacto Leve/Medio/Grave antes de parchar, traslado de Sesiones de arriba sobre la base
corregida (posible por un-commit-por-Sesión) y aterrizaje de la porción aprobada — subida única
por vuelo hasta la última Sesión aprobada de forma consecutiva, con aprobación explícita del
usuario; una Sesión que une dos vuelos espera la revisión de ambos. La subida sigue la política
ordinaria de entrega del repositorio. La revisión es humana; `piloto` determiniza el orden y el
registro, no el juicio de calidad. El orquestador actualiza plan y estados por cada commit
entregado (regla del maintainer; comportamiento de la conversación, no de la herramienta).

## Tareas
- [x] T1: Preparar copia de trabajo del writer.
- [x] T2: Implementación test-first por writer (RED → GREEN → gofmt/vet).
- [x] T3: Verificación independiente del padre.
- [x] T4: Revisión RDD, integración a master, push y archivado de la Sesión.

## Evidencia de commits
- `fd0a118` revision.go: informe por vuelo, orden de cascada base-arriba (NOVEDAD primero, unión espera ambos), registro de resolución de NOVEDAD, análisis de impacto Leve/Medio/Grave; `e4f72c0` aterrizaje.go: traslado atómico (cherry-pick único con --abort, fail-closed) y aterrizaje de la porción aprobada consecutiva (ff-only local, nunca pushea); `6eac44e` main.go: 6 comandos cableados (informe-vuelo, orden-revision, resolver-novedad, impacto, trasladar, aterrizar) — expansión de superficie autorizada por el maintainer.
- TDD: RED observado por slice (incluye hardening: el traslado secuencial dejaba trabajo parcial → cherry-pick único atómico); GREEN 46 tests / 84 subtests, -race verde, gofmt/vet limpios.
- Revisión `review-b1b1bfd2d793a5f9` (medium, reliability) APPROVED a la primera, acuse quemado (09fe9764…). Advisories informativos: R3-aterrizaje-format-empty-slice (aterrizaje.go:252), R3-informe-fallthrough-empty-estado (revision.go:115-135), R3-planTraslado-silently-skips-unclosable (aterrizaje.go:45-47), R3-resolver-novedad-oversize-untested (revision.go:148-150) — trabajo posterior.
