# Plan 0 — Documentación canónica

**Estado:** ✅ COMPLETO

## Resumen

| Campo | Detalle |
|---|---|
| Dependencias | Ninguna; este Plan fija la autoridad documental de V1. |
| Outputs | PRD, RFC y REQUIREMENTS aprobados; roadmap; Plan Catalog; Plan Manifest con 15 `slice_id`; proposals A–I; Installable V1 revision 1; Autonomous V2 revision 1; product version map; convención canónica de nombres. |
| Roadmap | `S0.1` y `S0.2` están cerradas. Cualquier cambio posterior requiere una revisión explícita del documento autoritativo correspondiente. |
| Referencias | [PRD](../../prd/sdd-tower-implementation-v1.md), [RFC](../../rfc/sdd-tower-implementation-v1.md), [REQUIREMENTS](../../specs/sdd-tower-implementation-v1-requirements.md), [Plan Catalog](../manifest.yaml), [Plan Manifest](../sdd-tower-implementation/manifest.yaml), [Installable V1](../installable-v1/revisions/1/manifest.yaml), [Autonomous V2](../autonomous-v2/revisions/1/manifest.yaml), [version map](../product-version-map.yaml). |

`docs/architecture/sdd-tower-implementation.md` conserva material de exploración y no reemplaza los tres contratos normativos.

Installable V1 revision 1 es el contrato de release activo. Autonomous V2 revision 1 preserva la continuación A–I/P6–P11 y consume el ArtifactRef exacto del V1 publicado. `product-version-map.yaml` conserva el pointer canónico y el rollback atómico sin eliminar revisiones históricas.

## Sesión 0.1 — Contratos y artefactos canónicos

**Estado:** ✅ COMPLETO

### Módulo 0.1.1 — PRD

- [x] Tarea 0.1.1.1 — Definir problema, usuario, alcance y no-objetivos.
- [x] Tarea 0.1.1.2 — Definir jornada, control remoto, recovery y campañas V1.
- [x] Tarea 0.1.1.3 — Aprobar criterios de aceptación de producto.

### Módulo 0.1.2 — RFC

- [x] Tarea 0.1.2.1 — Separar producto y mecanismo plan-agnostic.
- [x] Tarea 0.1.2.2 — Fijar roles, autoridad, stores y flujos.
- [x] Tarea 0.1.2.3 — Fijar single-host/fallback, Telegram, recovery y adopción.

### Módulo 0.1.3 — REQUIREMENTS

- [x] Tarea 0.1.3.1 — Fijar schemas y canonicalización.
- [x] Tarea 0.1.3.2 — Fijar state machines, APIs, errores y retención.
- [x] Tarea 0.1.3.3 — Fijar 26 escenarios y gates A–G.

### Módulo 0.1.4 — Índices machine-readable

- [x] Tarea 0.1.4.1 — Publicar el roadmap aprobado.
- [x] Tarea 0.1.4.2 — Validar el Plan Catalog.
- [x] Tarea 0.1.4.3 — Validar el Plan Manifest de 15 slices y sus ArtifactRefs.

## Sesión 0.2 — Migración canónica de nombres

**Estado:** ✅ COMPLETO

**Evidencia:** [PR #69](https://github.com/achangkuon/control-tower/pull/69), merge `fa20b908f129b9f26b2b1fd7d341a170eea4384c`.

### Módulo 0.2.1 — Convención y migración global

- [x] Tarea 0.2.1.1 — Fijar la jerarquía Plan → Sesión → Módulo → Tarea, los estados cerrados y la estructura del índice maestro.
- [x] Tarea 0.2.1.2 — Migrar la documentación de planificación sin renombrar entidades de dominio ni asignar IDs sin límite de PR demostrable.
- [x] Tarea 0.2.1.3 — Integrar la migración global mediante PR #69 y registrar su merge canónico.
