# Feature: Reglas de entrega de v2-piloto en encargos (S214–S217)

Autoridad: Emilio, 2026-10-06 (confirmación en conversación; Engram 13259).

## Contexto
Emilio confirmó cuatro reglas de entrega para el piloto automático (flujo
commit-por-commit con revisión humana al aterrizar, aislamiento por vuelo,
reintentos de fallos mecánicos de revisión, y sonda de consentimiento RDD al
despegue). Las reglas viven en los encargos de S215 y S217; S214 y S216 no
requieren cambios.

## Tareas
- [x] T1: Anotar en S215 la sonda de consentimiento RDD al despegue y el reintento de fallos mecánicos de revisión.
- [x] T2: Anotar en S217 el flujo commit-por-commit (revisión humana, entrega según política, actualización de plan y estados por el orquestador).
- [x] T3: Validar con `radar check`, commit de unidad de trabajo en rama, revisión nativa RDD del candidato.

## Evidencia de commits
- `38f01fe` docs(plan): record maintainer-confirmed delivery rules in V2 encargos (S215, S217) — rama `feat/v2-reglas-entrega`.
- Revisión nativa `review-f4fe1adf14d296e7` (lente review-reliability, tier medium): APPROVED, acuse quemado (consumed_revision 36b44a2b…).
- `radar check`: 0 errores, 63 avisos base.
