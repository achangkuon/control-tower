# Feature: S220 — Diagnóstico de copias de trabajo por vuelo

Autoridad: Pedido del maintainer el 2026-10-04 (Engram/plan S220). Encargo completo en
`openspec/plan.yaml` (S220). Único archivo autorizado: `docs/architecture/piloto-copias-de-trabajo.md`.

## Alcance
Informe de diagnóstico, sin corregir nada: cómo se crea hoy una copia de trabajo y qué le falta
para quedar lista; crear por vuelo vs reciclar (costo medido); comportamiento de gate de push,
aviso de revisión y Radar desde copia enlazada; retiro de copia y rama; decisiones del mantenedor
con opciones/consecuencia/recomendación y delta para S215.

## Tareas
- [x] T1: Exploración de evidencia (path:line): piloto-automatico.md, .githooks/pre-push, s218, #139/#152, dependencias y modos.
- [x] T2: Medición de costos: copia nueva vs reciclada (worktree + dependencias Bun/Go/Python).
- [x] T3: Redacción del informe en docs/architecture/piloto-copias-de-trabajo.md con decisiones para el mantenedor.
- [x] T4: Decisiones resueltas (D1 por vuelo, D2 Worktrees/, D3 retiro tras revisión, D4 mínimo+CodeGraph) y aplicadas al informe.

## Evidencia de commits
- (este commit) Informe completo con decisiones resueltas; mediciones sobre master@4520543.
