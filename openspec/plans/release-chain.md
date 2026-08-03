# Cadena de release — producto único

> Decidido el 2026-08-01 por el maintainer. Este archivo define **qué tiene que estar
> cerrado para declarar la primera versión del producto**, y en qué orden lo permite el
> grafo de dependencias.
>
> El [master-index](master-index.md) dice DÓNDE estamos. Este archivo dice QUÉ FALTA
> para salir. El estado del código vive en [implementation-state](implementation-state.md).

## La decisión

**Control Tower es un solo producto con un solo roadmap.** Las etiquetas `installable-v1`
y `autonomous-v2` dejan de ser identidades de producto.

Motivo: el maintainer definió que la primera versión no se declara hasta poder **aprobar
desde el teléfono** las decisiones que requieren su autoridad. Esa capacidad está
especificada en `sdd-tower-implementation-v1-requirements.md` §16–§17, y el split del
2026-07-31 la había reasignado al lane `autonomous-v2`. Con ese alcance dentro, la
frontera entre los dos "productos" ya no describe el trabajo: dejó de separar dos cosas
entregables y pasó a separar la primera versión de sí misma.

### Lo que NO cambia

1. **La entrega sigue siendo incremental.** Un roadmap único no significa que nada sale
   hasta que sale todo. Cada Sesión sigue siendo una unidad entregable a `master`, y el
   orden lo dicta el grafo, no un big bang.
2. **`CT_V2_ONLY` no se borra.** `bin/torre:28` corta capacidades en código, no en prosa.
   Al desaparecer la frontera de producto, esa línea pasa a ser un **flag de capacidad
   opt-in, apagado por defecto**. La autonomía se enciende porque alguien la enciende,
   nunca porque se cayó una etiqueta.
3. **Los lanes siguen sirviendo como afinidad de trabajo**, no como límite de producto.

## El punto de release

La primera versión se declara cuando el maintainer puede, desde Telegram:

- ver el estado de un proyecto registrado;
- recibir el escalamiento de toda decisión que requiera su autoridad;
- aprobar o rechazar esa decisión sobre un **objetivo exacto**, con sobre inmutable,
  nonce de un solo uso y expiración;
- prender y apagar el ruteo a Telegram según esté fuera o en casa.

Y cuando, con Hermes ausente, la operación local por CLI sigue completa.

## La cadena

```mermaid
graph LR
  S88["S8.8 adopción · 🔵"] --> S87["S8.7 puente · 📋"]
  S03["S0.3 enmienda spec · 🟢"] --> S87
  S31["S3.1 workspace · 🟢"] --> S32["S3.2 orquestación · 📋"]
  S32 --> S51["S5.1 authorization store · 📋"]
  S51 --> S41["S4.1 hosts · 📋"]
  S41 --> S52["S5.2 entrega idempotente · 📋"]
  S52 --> S53["S5.3 continuación · 📋"]
  S51 --> S54["S5.4 ruteo de escalamiento · 📋"]
  S51 --> S87
  S53 --> S71["S7.1 conformidad · 📋"]
  S87 --> S71
  S54 --> S71
```

| Orden | ID | Resultado | Estado | Depende de |
|---|---|---|---|---|
| — | `S8.8` | Adopción del instalable en el runtime en uso | 🔵 EN CURSO | `S8.2` ✅ |
| ✅ | `S0.3` | Enmienda del requisito de puente acotado | ✅ COMPLETO | — |
| — | `S3.1` | Workspace | 🟢 LISTO | `S2.4` ✅ |
| 1 | `S3.2` | Orquestación | 📋 PLANIFICADO | `S3.1` |
| 2 | `S5.1` | Authorization store + Telegram + validación Git/PR/check/SHA | 📋 PLANIFICADO | `S3.2` |
| 3 | `S4.1` | Hosts y línea exclusiva | 📋 PLANIFICADO | `S3.1`, `S3.2`, `S5.1` |
| 4 | `S5.2` | Entrega idempotente y post-check | 📋 PLANIFICADO | `S4.1` |
| 5 | `S5.4` | Ruteo de escalamiento fuera/en casa | 📋 PLANIFICADO | `S5.1` |
| 6 | `S5.3` | Continuación | 📋 PLANIFICADO | `S5.2` |
| 7 | `S8.7` | Puente Hermes/Telegram | 📋 PLANIFICADO | `S8.4` ✅, `S8.8`, `S0.3`, `S5.1` |
| 8 | `S7.1` | Conformidad de release | 📋 PLANIFICADO | `S5.3`, `S8.7`, `S5.4` |

**Once Sesiones · 1 cerrada.** Nueve ya enumeradas más dos nuevas — `S0.3` y `S5.4`.

`S0.3` cerró el 2026-08-01 en `9595b92`. Con eso, la contradicción entre specs sobre si el
puente puede transportar un callback de merge **ya no existe**, y `S8.7` pierde uno de sus
tres bloqueos: le quedan `S8.8` y `S5.1`.

## Capacidad paralela hoy

Derivada del grafo, no declarada. Dos Sesiones corren juntas sólo si se cumplen las tres:
independencia en el grafo, `Área` disjunta y `Recurso` disjunto.

Hoy hay tres Sesiones que pueden empezar: `S8.8` (ya 🔵), `S0.3` y `S3.1`.

- `S8.8` × `S0.3`: independientes; `Área` disjunta (`bin/torre` + data-root XDG contra
  `openspec/**`); `Recurso` disjunto. **Corren en paralelo.**
- `S8.8` × `S3.1`: independientes en el grafo. `Área` a confirmar cuando `S3.1` enumere la
  suya; `S8.8` reclama la máquina real del maintainer como `Recurso`. **Verificar antes de
  paralelizar.**

**Capacidad hoy: 2, con una tercera a confirmar.** Del punto 1 en adelante la cadena es
casi lineal — `S3.2 → S5.1 → S4.1 → S5.2 → S5.3` es una sola hebra. Ese es el costo real
del alcance elegido: no se compra con más agentes.

## Enmienda pendiente — `S0.3`

Hay una **contradicción viva** entre dos documentos que hoy describen la primera versión:

| Fuente | Qué dice |
|---|---|
| `openspec/specs/sdd-tower-implementation-v1-requirements.md` §16–§17 | La autorización de merge por Telegram es parte del alcance. Define canal, sobre, callback, fallback textual y revalidación. |
| `changes/archive/2026-07-31-installable-v1-autonomous-v2-split/specs/installable-control-tower-v1/spec.md:73-87` | El puente **MUST NOT** exponer Git delivery ni merge. El escenario *Remote authority is rejected* obliga a **rechazar** una solicitud de merge que venga de Hermes. |

No se resuelve interpretando. En una frontera de autoridad, la ambigüedad es el incidente.
`S0.3` amenda el requisito del puente acotado para que el puente pueda **presentar** una
autorización y **transportar** un callback acotado, manteniendo intacto el principio de
§16.1: *Hermes presenta; Main crea, valida y consume.* El puente nunca tiene autoridad;
transporta la decisión de quien sí la tiene.

## Drift reconciliado — ✅ CERRADO el 2026-08-03

`schemas/authorization-v1.schema.json` y `main-store/store.mjs` **ya coinciden**. Se resolvió
como prerrequisito, fuera del freno de ejecución, porque era un contrato que dos archivos leían
distinto y no trabajo nuevo de `S5.1`.

Eran **seis** divergencias, no las dos que este documento registraba:

| Schema exigía | Store exigía | Resolución |
|---|---|---|
| `pr` (PR-specific), opcional | `target`, `source_sha`, `target_sha` | `delivery` con `shape` (`pull-request`/`direct-push`) |
| `required_checks_digest`, `policy_report_digest` | `checks` | ganan los digests |
| `registry_revision` + `jornada_revision` | un solo `revision` | ganan los dos del schema |
| `nonce_hash`, `created_at`, `action`, `state`, `schema`, `schema_version` | no los exigía | el store los exige |
| clave `state` | clave `status` | `state` |
| valores `PENDING\|CONSUMED\|REJECTED\|EXPIRED\|REVOKED` | `PENDING\|APPROVED\|REVOKED\|EXPIRED` | `PENDING\|APPROVED\|REJECTED\|EXPIRED\|REVOKED` |

**El schema mandaba**, por `sdd-tower-implementation-v1-requirements.md:111` (lista normativa) y
`contracts/schema-registry.mjs:12`. Pero necesitaba enmienda antes de que el store se le adaptara:
su `action` era `MERGE_PR` y su único binding de entrega era `pr`, las dos cosas atadas a entrega
por pull request, incompatibles con el corte política/seguridad de `d232fdf`. Ahora `action` es
`MERGE` y el binding es `delivery`, con condicionales que exigen `number` sólo en `pull-request`
y prohíben `delivery` en `START_JORNADA`.

**Dos cosas que la reconciliación destapó y arregló de paso:**

- El store **no podía registrar un rechazo**. Sus decisiones terminales eran `APPROVED`, `REVOKED`
  y `EXPIRED`; `REJECTED` no existía pese a estar en el enum canónico. Ahora sí.
- `createAuthorization` validaba contra un array `required` escrito a mano al lado de un schema
  canónico — que es exactamente cómo se produjo el drift. Ahora valida contra `authorization-v1`
  vía `contracts/validate.mjs`, así que la clase de bug es estructuralmente imposible.

`S5.1` sigue siendo la Sesión que toma posesión del authorization store; ya no arranca con un
contrato roto debajo.

Corresponde a `S5.1`, que es la Sesión que toma posesión del authorization store.

## Alcance sin ID

Se registra explícitamente en lugar de esconderse:

- **P2 — responsabilidades posteriores de Change B.** Sin límite de un PR demostrable. Ver
  el [apéndice de migración](plan-vocabulary-migration-appendix.md).
- **P6 — Campañas multiproyecto.** Sin Sesiones enumeradas. Fuera de la cadena de release.
- **P1 — `S1.11`–`S1.19`.** Enumeradas pero **fuera de la cadena**: ningún Plan de la
  cadena declara a P1 como dependencia. No bloquea la primera versión.
- **P8 — `S8.5` y `S8.6`.** 🟡 DIFERIDO por decisión del 2026-07-31. Se mantienen fuera.
