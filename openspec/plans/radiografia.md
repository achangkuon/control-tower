---
verified_against: 3f80cebcb23ee190795e9914f127f886835e9dd3
verified_at: 2026-08-28
standfirst: S4.13 está entregada, pero no garantiza la actualidad final same-stack del ocupante exacto. S4.14 está aprobada y no entregada; S9.4 conserva estado parcial en HOLD. Las cifras se derivan fuera de este juicio.
---

<!--
Este archivo es el ÚNICO que se edita a mano. Contiene el juicio que ningún script
puede derivar: qué significa un número, qué está en riesgo, qué decisión es tuya.

Las cifras NO van acá — se miden solas. Insertá bloques derivados con:
  {{instrumentos}}   la fila de números grandes
  {{avance}}         la tabla de avance por Plan
  {{cola}}           la cola de ejecución

Convenciones de bloque:
  ## Título                              → una sección
  ### ID · chip · Título                 → un hallazgo de dos capas
       chips: sólido crítico estructural nuevo deuda ritmo resuelto
       líneas: "Lo técnico:", "En simple:", "Evidencia:"
  #### N · qué destraba · Título         → una decisión
       "El contexto:" y opciones como "- A · **Título.** Consecuencia. → recomendada"

Al cambiar el juicio, actualizá `verified_against` al commit contra el que lo
verificaste. Si no coincide con HEAD, el informe lo avisa solo.
-->

{{instrumentos}}

## Qué es la Torre, sin jerga

Vos dirigís varios agentes de IA trabajando en varios proyectos a la vez. La Torre existe para repartir ese trabajo, conservar el contexto fuera de una conversación y frenar cuando aparece una decisión que sólo vos podés tomar.

La prioridad cambió: la primera implementación se hará con Pi. No porque Pi pase a ser el producto, sino porque la Torre puede poseer la identidad del proceso que lanzó y exigir comprobantes producidos por ese proceso. Eso le permite distinguir una sesión propia de una sesión que sólo dice serlo.

La unión neutral ya identifica worktree, proceso, incarnation y binding, y expone operaciones sin depender de Pi. `S4.13` valida ownership adquirido pero todavía no publicado; aun así, un proceso reemplazado en el mismo asiento puede volverse stale antes del publish final. `S4.14` está aprobada para cerrar esa ventana en el mismo stack. El host Pi sigue sin estar entregado y `S9.4` queda en HOLD.

## El veredicto actual

### 1 · sólido · Pi va primero porque la Torre puede probar a quién lanzó
Lo técnico: El roadmap promueve Pi como primer host de implementación. La identidad no se acepta por autodeclaración: se liga a proceso, ubicación de trabajo e instancia, y las respuestas relevantes deben traer prueba producida por el runtime.
En simple: La Torre no confía en una credencial escrita por el propio agente. Conserva la ficha del proceso que abrió y exige un recibo que sólo ese proceso puede producir. Esa base permite empezar por Pi sin entregar el control de la Torre a Pi.
Evidencia: `openspec/plans/decision-register.md:408-442` · `openspec/plans/plan-4/STATUS.md:735-751` · `master@5e387b3f76e176c35fc199f899aafc9a057a3f08`

### 2 · sólido · La unión neutral ya incluye operaciones observables
Lo técnico: `S4.10` cerró las cinco formas públicas de identidad y binding; `S4.11` agregó observe, health, stop y attach con challenge de un solo uso, proof producer-owned y binding/incarnation exactos. La spec canónica sincronizada tiene SHA-256 `3dfd0cdd5d5a0a4e6fb6bc17933a89c92ed204389d58e7600a06ba9bb4699373`.
En simple: El enchufe común ya no sólo identifica a cada runtime: también permite mirarlo, comprobar su salud, pedirle que se detenga y adjuntarse sin confiar en lo que el propio caller afirma. Pi puede conectarse sobre una base ya entregada, no sobre una promesa.
Evidencia: `openspec/specs/host-runtime/spec.md` · `openspec/changes/archive/2026-08-28-s4-11-host-neutral-operations/verify-report.md` · `master/origin/master@6ddf6bc77d236dffad5b8ec625379117a91ce0b3`

### 3 · sólido · Los tres roles permanentes ya son producto entregado
Lo técnico: La decisión 95 y `S8.14` fijan exactamente Main/coordinator, Support e Implementer como perfiles permanentes repo-owned y host-neutral. Planner queda como función temporal. `profiles/tower/{main,support,implementer}.md`, las dos skills Tower propietarias y `test/install/tower-role-assets.test.mjs` están integrados en `master/origin/master@54b5cda733025b0bd50c2a21dc67d1d4192ac66d`; sus 10 criterios permanecen verificados.
En simple: Los tres puestos ya salieron del taller y forman parte del producto entregado. El instalador todavía espera el adapter `S1.18`, no estos perfiles.
Evidencia: `openspec/plans/plan-8/STATUS.md` · `master/origin/master@54b5cda733025b0bd50c2a21dc67d1d4192ac66d` · Engram 9726

## Avance por Plan

Un Plan agrupa Sesiones; una Sesión es una entrega verificable. El porcentaje cuenta Sesiones cerradas sobre Sesiones enumeradas —el trabajo en curso suma cero hasta que cierra. La tabla sale del índice maestro y se actualiza sola.

{{avance}}

## La cola de ejecución

Una Sesión entra en esta cola sólo si su cadena de dependencias está satisfecha. El detalle de cada entrega vive en `openspec/plans/master-index.md`; esta vista no inventa prioridades ni cifras.

{{cola}}

## Lo que cambió para el producto

### A · resuelto · OpenCode está estacionado, no descartado
Lo técnico: `S4.4`, `S4.8` y `S4.9` quedan diferidas. Se preservan código, pruebas, decisiones, evidencia, ramas y checkpoints; el trabajo en curso de `S4.8` también queda guardado como WIP, no como candidato.
En simple: Cambiar la prioridad a Pi no tira a la basura lo construido para OpenCode ni declara que estaba mal. Se guarda completo para retomarlo desde el mismo punto si se decide volver. Estacionar significa no gastar hoy, no borrar ni invalidar.
Evidencia: `openspec/plans/plan-4/STATUS.md:666-725` · `openspec/plans/plan-4/STATUS.md:733-740` · `openspec/plans/plan-7/STATUS.md:69-75`

### B · resuelto · Los dos defectos de ownership de `S4.10` quedaron cerrados
Lo técnico: Ya no existe `activate`: `reserve` sólo publica ownership después de adquirir el listener final. Además, cualquier puerto con cleanup incierto queda cercado y una reserva posterior falla antes de intentar adquirirlo. Las regresiones diferenciales y la suite integral pasan sobre el candidato cerrado.
En simple: La Torre ya no puede declarar “este puerto es mío” sin haberlo tomado de verdad. Y si no puede confirmar que lo limpió, no se lo presta a otro proceso: prefiere frenar antes que entregar dos veces la misma llave.
Evidencia: `test/contracts/host-runtime/loopback.test.mjs:34-56` · `openspec/changes/archive/2026-08-28-s4-10-host-neutral-runtime/verify-report.md:247-291` · suite `914 pass / 0 fail / 5.291 expectativas`

### C · estructural · Cada área de trabajo tiene su propio broker y el correo en vuelo puede perderse
Lo técnico: La topología aprobada usa un broker por worktree, supervisor Tower-owned, rutas runtime cortas, IDs impredecibles y keepalive propiedad de la Torre. El mailbox actual permanece volátil; tras una caída, la recuperación repite operaciones idempotentes desde estado durable.
En simple: Cada mesa de trabajo tiene su propia centralita, así una falla no cruza trabajos. Si esa centralita cae, un mensaje que estaba viajando puede perderse: la garantía no es conservar cada sobre, sino poder reconstruir la tarea desde el registro durable sin duplicar efectos.
Evidencia: decisiones 86–87 en `openspec/plans/decision-register.md:432-434` · `openspec/plans/plan-9/STATUS.md:228-235`

### D · crítico · La capacidad inicial sigue limitada por lo que falta medir
Lo técnico: Siguen sin medirse una corrida Pi larga y desatendida, una caída del broker con tráfico y concurrencia por encima de cinco clientes. Esos puntos son gates de validación, no decisiones. El claim inicial queda limitado a un máximo de cinco clientes hasta producir evidencia atribuible al candidato exacto.
En simple: No hace falta que elijas un número más grande ni una promesa más ambiciosa. Primero hay que demostrar estabilidad durante tiempo real, recuperación durante una falla con trabajo en movimiento y carga mayor. Hasta entonces, vender más capacidad sería adivinar.
Evidencia: `openspec/plans/plan-1/STATUS.md:283-290` · `openspec/plans/plan-7/STATUS.md:73-81`

### E · crítico · `S8.11` sigue bloqueada y su intento fallido no se puede maquillar
Lo técnico: El checkpoint sellado conserva los commits locales `812703d` y `388109f`, el contrato `control-tower-S8.11-20260820-night` y su digest. La verificación integral quedó bloqueada por fallos de fixtures sobre árboles owner-read-only; no se ejecutaron harness ni suite completa y la regla terminal prohíbe reintentar ese mismo contrato.
En simple: Hay trabajo guardado, pero no hay permiso para llamarlo terminado. El próximo intento necesita un contrato atendido nuevo y acotado que corrija el entorno de prueba; repetir el examen anterior o citar un verde de otra versión sería fabricar evidencia.
Evidencia: `openspec/plans/plan-8/STATUS.md:724-734` · checkpoint ejecutable `388109f1e79f50ce05582d2b0a7b3ff8a9685f72`

### F · nuevo · La vista automática de los asientos está autorizada, pero todavía no existe
Lo técnico: La decisión 91 enumera `S9.5` en P9 con ruta `design-tasks` y dependencias `S8.12 + S9.4`. Después de confirmar un brief, Main podrá materializar únicamente sus panes Herdr y sesiones Pi exactos, validando nombre, worktree, readiness e Intercom antes del despacho. La topología planificada separa madre Tower, hija Tower/Herdr y materializador idempotente; no se implementó ninguna de las tres piezas.
En simple: Ya está decidido cómo evitar abrir escritorios de más: la aprobación del brief alcanza para mostrar exactamente los puestos nombrados y ninguno adicional. Pero hoy eso es un plano, no una capacidad disponible. La Torre todavía no abre ni reutiliza esos puestos automáticamente.
Evidencia: `openspec/plans/decision-register.md:449-451` · `openspec/plans/plan-9/STATUS.md:238-291` · candidate `8beb3d7f846a23504021d2061f75acd76ca6d09f`

## Próximas pruebas y trabajo enumerado

La lista siguiente reemplaza las antiguas “cinco decisiones”. No son preguntas para vos: son puertas medibles o Sesiones con alcance ya fijado.

| Próximo paso | Qué debe demostrar | Qué no permite afirmar todavía |
|---|---|---|
| `S4.10` — ✅ COMPLETO | Cinco contratos v1 y ownership exacto del puerto, sin importar Pi ni OpenCode | Que el adapter Pi ya funciona |
| `S4.11` — ✅ COMPLETO; `S4.12` pendiente | Operaciones observables ya entregadas; recuperación mínima Pi después de sus dependencias | Que la Torre ya supervisa o recupera una jornada Pi real |
| `S4.13` — ✅ COMPLETO; `S4.14` — 🟢 LISTO | Agregar la comprobación sincrónica final del ocupante exacto antes de publish | Que esa garantía o el supervisor Pi ya estén entregados |
| `S9.4` y `S1.17`–`S1.19` | Después de `S4.14` y un brief fresco: supervisor, adapter y regresión Pi | Que el estado parcial sea capacidad o pueda retomarse |
| `S9.5` | Materialización idempotente de sólo los asientos exactos del brief, después de cerrar `S8.12 + S9.4` | Que Herdr ya abra, reutilice o valide esos asientos automáticamente |
| Gate Pi desatendido | Una corrida prolongada atribuible al candidato | Estabilidad de larga duración sin esa evidencia |
| Gate de caída con tráfico | Recuperación idempotente tras caída real del broker | Entrega garantizada de mensajes en vuelo |
| `S8.14` — ✅ COMPLETO; `S8.12` y `S8.13` pendientes | Perfiles Tower ya entregados; luego cerrar bundle completo, instalación reversible y preflight externo | Que el bundle o la instalación estén cerrados, o que la Torre deba modificar Gentle AI, Pi o `pi-intercom` |

## Lo que pasa ahora mismo

### G · crítico · `S4.13` todavía deja una ventana final de actualidad
Lo técnico: `S4.13` valida ownership unpublished, pero no garantiza en el último instante same-stack que proceso e incarnation sigan siendo el ocupante actual del worktree estable. La decisión 98 aprueba `S4.14`: guard sincrónico opcional sobre metadata neutral congelada, inmediatamente antes de publish; sólo `true` primitivo publica.
En simple: La Torre ya revisa la llave antes de mostrarla, pero todavía le falta comprobar, justo al entregarla, que sigue en manos de la misma persona. `S4.14` es el plano aprobado para ese último control; aún no existe en runtime.
Evidencia: `openspec/plans/decision-register.md` · `openspec/plans/plan-4/STATUS.md` · Emilio Engram 9773/9774

### H · crítico · `S9.4` conserva trabajo parcial en HOLD, no capacidad
Lo técnico: `S9.4` está 📋 PLANIFICADO / HOLD hasta entregar `S4.14` y emitir un brief fresco. Implementer-1 conserva M1 `a7d724dc`, M2 como dos archivos no trackeados en Engram 9772 y una corrección sin consumir; implementer-2/3 quedan como evidencia inmutable.
En simple: Hay trabajo guardado, pero NO una función disponible ni permiso para continuarlo. Primero se entrega el último seguro neutral y después Support vuelve a asignar desde una base fresca.
Evidencia: `openspec/plans/plan-9/STATUS.md` · `openspec/plans/master-index.md` · Engram 9772–9774

## Evidencia y límites de esta radiografía

Este juicio fue reconciliado contra la base limpia `master/origin/master@3f80cebcb23ee190795e9914f127f886835e9dd3` el 2026-08-28. `verified_against` identifica los bytes usados. Instrumentos, avance y cola se derivan fuera de este archivo. `S4.13` está entregada; `S4.14` sólo está aprobada y `S9.4` conserva estado parcial en HOLD. Ninguno demuestra implementación de la guardia final, runtime Pi, despliegue ni capacidad.
