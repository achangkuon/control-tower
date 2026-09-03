# Asignación de las 24 Sesiones abiertas de control-tower

> Fase 2 de [MIGRACION-ZONAS.md](MIGRACION-ZONAS.md). Asignadas por el `Área` que cada
> Sesión declara en su `STATUS.md`, nunca por el plan del que venían.
> control-tower no fue modificado.

---

## El resultado

| Cómo cae | Primera pasada | **Segunda pasada, antes de decidir** |
|---|---:|---:|
| Una sola zona, limpio | 7 | **17** |
| Sólo cimientos | 4 | **—** ¹ |
| Cruza dos o más zonas | 11 | **5** |
| No se puede asignar | 2 | **2** |

¹ Las cuatro de sólo cimientos ahora tienen domicilio: `zona: cimientos` (ver más abajo).

La segunda pasada dejó cinco cruces por resolver. La autoridad aprobada ya los cerró: cuatro
originales se reemplazan por resultados de una sola Zona (`S100`–`S108`) y `S7.1` pertenece a
Entrega como verificación terminal exclusiva. **No queda un cruce pendiente de decisión.**

Lo que cambió entre pasadas no fueron las Sesiones: fue **la partición**. Yo había puesto en
zonas cosas que en realidad toca cualquier feature.

---

## Lo que estaba mal en mi primer plano

| Ruta | La tenía en | Va en | Por qué |
|---|---|---|---|
| `bin/` | Instalación | **Cimientos** | Toda feature que agrega un comando toca el entrypoint |
| `console/` | zona propia | **Cimientos** | El vocabulario del CLI crece con cada feature |
| `skills/` | zona propia | **Cimientos** | Toda feature actualiza la skill que la expone a los agentes |
| `README.md`, `ROADMAP.md` | Documentación | **Cimientos** | Los toca cualquiera |
| `openspec/changes/` | Documentación | zona **Archivo** | Es historia SDD: 160 archivos donde nadie trabaja |
| `openspec/{prd,rfc,specs,plans}`, `docs/` | Documentación | zona **Autoridad** | Los documentos de intención sí son trabajo real |

Es el mismo error que cometí con `workspace/` y por la misma razón: **agrupé por nombre en
vez de por quién necesita modificarlo.** Tres veces en un día. Es un argumento fuerte para
escribir la regla precisa —«si más de una Zona modifica el mismo archivo, es Cimiento»— y
hacer verificables sus declaraciones en vez de confiar en el dibujo manual.

**Partición verificada**: `plan check` sobre los 441 archivos rastreados — 10 zonas más
Cimientos, cero huérfanos, cero solapes.

| Zona | Archivos | % |
|---|---:|---:|
| Archivo | 160 | 36% |
| Contratos | 67 | 15% |
| Hosts | 51 | 11% |
| Cimientos | 45 | 10% |
| Autoridad | 44 | 9% |
| Asientos | 27 | 6% |
| Entrega | 16 | 3% |
| Instalación | 11 | 2% |
| Capacidades | 8 | 1% |
| Enrolamiento | 7 | 1% |
| Jornada | 5 | 1% |

---

## Las 17 que quedan limpias

| Zona | Sesiones |
|---|---|
| **Hosts** | `S1.19` · `S4.12` · `S9.9` · `S9.7` · `S9.8` · `S12.6` |
| **Instalación** | `S8.11` · `S8.12` · `S8.13` |
| **Cimientos** | `S1.20` · `S12.1` · `S12.3` · `S12.4` |
| **Asientos** | `S5.5` |
| **Entrega** | `S12.5` |
| **Enrolamiento** | `S2.9` |
| **Autoridad** | `S12.9` |

Seis zonas distintas con trabajo listo. **La Torre podría abrir seis asientos** si tuvieras
el techo puesto ahí — y con tres, elige las tres primeras de la cola.

### El ajuste que esto obliga en el canon

Cuatro Sesiones tocan **sólo** cimientos: `S1.20` (`core.mjs`), `S12.1` (`.githooks/`,
`package.json`), `S12.3` y `S12.4` (`core.mjs`, `db/`). El canon dice que Cimientos «no es
una zona» —cierto para la *propiedad*, nadie lo posee en exclusiva— pero una Sesión cuyo
trabajo **es** el sustrato compartido necesita domicilio.

> **`zona: cimientos` es válida**, y es el único lugar donde la exclusividad se aplica **por
> archivo** en vez de por zona. Dos Sesiones pueden estar en Cimientos a la vez mientras no
> reserven el mismo archivo.

Consecuencia forzada de una decisión ya tomada, no una decisión nueva. Y ya tiene su caso:
**`S12.3`, `S12.4` y `S12.5` declaran las tres `core.mjs` «en exclusiva»**. `plan` valida esas
rutas exactas y su pronóstico estático no las ofrece juntas. No adquiere locks ni conoce claims
en vivo: la Torre posterior debe serializarlas sobre `core.mjs`, con MAIN coordinando owner,
orden, liberación y recuperación ante interrupciones.

## Las 2 que no se pueden asignar

| Sesión | Lo que dice su `Área` |
|---|---|
| `S2.10` menú central | `OWNER SIN RESOLVER — renderer/handler del menú central no localizado` |
| `S9.2` reciclado de asientos | `PENDIENTE DE ENUMERAR` |

Ninguna sabe qué archivos toca, así que ninguna recibe zona. **Y las dos ya figuran 🔴
BLOQUEADO** en control-tower: el modelo nuevo llega a la misma conclusión por un camino más
corto. Una Sesión que no sabe qué toca no se puede programar, y no hace falta leer una nota
para saberlo.

---

## Las 4 originales que se reemplazan

El maintainer aprobó la división después de contrastarla con la autoridad viva de
`control-tower`. Las cuatro originales pasan a 📚 ARCHIVADO **sólo cuando** todas sus sucesoras
`reemplaza` estén registradas y cada dependencia activa afectada haya sido reescrita hacia las
sucesoras aplicables. El conjunto nuevo es contiguo (`S100`–`S108`) porque estas propuestas
nunca se aplicaron. **No se renumeró ningún ID existente o aplicado.**

### `S5.14` — tres resultados ordenados

| Nueva | Resultado | Zona | Depende de | Cimientos | Reemplaza |
|---|---|---|---|---|---|
| `S100` | contrato de schema de `delivery-policy`, incluido `planning.prepare_through` fail-closed | Contratos | `S5.13` | — | `[S5.14]` |
| `S101` | resolución de política: `prepare_through` opaco y `horizon_ceiling` salen de la política resuelta | Capacidades | `S100` | — | `[S5.14]` |
| `S102` | continuación ligada a la política resuelta **antes** de validaciones o callbacks; sin literales de fase u horizonte | Entrega | `S101` | — | `[S5.14]` |

`S5.13` se conserva donde es causal: precede el contrato que comparte
`schemas/delivery-policy-v1.schema.json` y la política. La cadena mantiene la autoridad de
`S5.14`: contrato → resolución → binding previo a cualquier validación/callback.

### `S5.15` — dos resultados significativos

| Nueva | Resultado | Zona | Depende de | Cimientos | Reemplaza |
|---|---|---|---|---|---|
| `S103` | retirar el enumerador `deriveNextModule` y sus pruebas, preservando intacto `compareWorkerClaim` | Entrega | `S5.5`, `S102` | — | `[S5.15]` |
| `S104` | retirar módulo, schema, registro y validador de `session-plan-snapshot`; regenerar el payload sin miembros huérfanos | Contratos | `S103` | `install/runtime-payload.mjs` | `[S5.15]` |

La redacción anterior «registrar el esquema» estaba al revés: la autoridad exige **retirarlo**.
`install/runtime-payload.mjs` es el primer Cimiento exacto que recorta una ruta amplia de Zona;
`S104` lo reserva en exclusividad aunque el resto de su resultado viva en Contratos.

### `S9.3` — Contratos, después Asientos

| Nueva | Resultado | Zona | Depende de | Cimientos | Reemplaza |
|---|---|---|---|---|---|
| `S105` | schemas cerrados de fingerprint y receipt de instalación | Contratos | — | — | `[S9.3]` |
| `S106` | caché externa congelada de Bun con publicación atómica del receipt y `bun ci` obligatorio | Asientos | `S9.1`, `S105` | — | `[S9.3]` |

El resultado de caché conserva las dos causas: existe para el pool entregado por `S9.1` y no
puede preceder a sus schemas.

### `S9.5` — Hosts, después Asientos

| Nueva | Resultado | Zona | Depende de | Cimientos | Reemplaza |
|---|---|---|---|---|---|
| `S107` | topología Herdr exacta y readback determinista de labels, panes y cwd | Hosts | `S1.18`, `S9.7` | — | `[S9.5]` |
| `S108` | materialización idempotente de los asientos aprobados, sin autoridad de dispatch | Asientos | `S1.18`, `S9.7`, `S107` | — | `[S9.5]` |

Los gates originales `S1.18` y `S9.7` permanecen explícitos donde protegen la materialización;
la división no los borra por accidente.

## `S7.1` — verificación terminal en Entrega

`S7.1` pertenece a la Zona **Entrega**. No crea una Zona nueva y no es una Sesión de
Cimientos. Su trabajo es leer y verificar todas las Zonas contra **un único candidato de
release inmutable**, identificado por commit SHA y/o tree SHA según el contrato vivo. Toda
su evidencia terminal debe repetir ese mismo identificador. Leer una Zona no transfiere
ownership sobre sus archivos.

La ejecución es exclusiva respecto de ese candidato y el freeze es responsabilidad runtime de
MAIN/Torre, no una garantía del Go tool actual. Si encuentra un defecto, `S7.1` no lo corrige:
MAIN crea una Sesión nueva en la Zona responsable. Esa corrección invalida **toda** evidencia
previa de `S7.1`, aunque alguna comprobación aislada todavía parezca vigente. Sólo una ejecución
completa contra el nuevo commit SHA y/o tree SHA puede cerrarla. Support registra la evidencia
documental; el ejecutor no adquiere propiedad sobre archivos de Autoridad.

---

## Regla aprobada para todo cruce

Se aplica al trabajo que **modifica** superficies de varias Zonas, siempre en este orden. La
verificación terminal de sólo lectura puede inspeccionarlas todas y pertenecer a la Zona de su
resultado:

1. **Reclasificar como Cimientos** todo archivo que deba modificar más de una Zona.
2. **Partir la Sesión por Zona** cuando cada resultado siga siendo significativo.
3. **Crear una Zona nueva** sólo cuando partir destruya el resultado.
4. **Revisar la partición** si los cruces se repiten: el corte está mal, no las Sesiones.

## Decisiones cerradas en esta corrección

- [x] Partición de segunda pasada aprobada.
- [x] Reemplazos corregidos y aprobados: `S100`–`S108`.
- [x] `zona: cimientos` documentada como domicilio sin ownership permanente.
- [x] Regla ordenada de cuatro pasos incorporada al canon.
- [x] `install/runtime-payload.mjs` declarado primer Cimiento exacto bajo una ruta amplia.
- [x] `S7.1` asignada a Entrega con candidato inmutable y protocolo de reejecución completa.

`control-tower` sigue sin modificaciones en este batch; estas asignaciones son el insumo de su
migración posterior.
