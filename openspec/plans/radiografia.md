---
verified_against: 47a7389b76a4b87d09d439e478b5874a701257ca
verified_at: 2026-08-28
standfirst: Las operaciones host-neutral ya están entregadas. S8.14 tiene un candidato local verificado y S9.4 es el próximo inicio; los tres perfiles permanentes Tower existen en el candidato, pero todavía no están entregados en master. Las cifras se miden solas contra el código.
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

La unión neutral ya está construida y entregada: identidad, worktree, proceso, incarnación, binding y las operaciones observe/health/stop/attach no dependen de Pi. El próximo paso conecta el host Pi mediante `S9.4`. Así, si OpenCode vuelve más adelante, ambos podrán enchufarse al mismo contrato sin convertir a la Torre en dependiente de un proveedor.

## El veredicto actual

### 1 · sólido · Pi va primero porque la Torre puede probar a quién lanzó
Lo técnico: El roadmap promueve Pi como primer host de implementación. La identidad no se acepta por autodeclaración: se liga a proceso, ubicación de trabajo e instancia, y las respuestas relevantes deben traer prueba producida por el runtime.
En simple: La Torre no confía en una credencial escrita por el propio agente. Conserva la ficha del proceso que abrió y exige un recibo que sólo ese proceso puede producir. Esa base permite empezar por Pi sin entregar el control de la Torre a Pi.
Evidencia: `openspec/plans/decision-register.md:408-442` · `openspec/plans/plan-4/STATUS.md:735-751` · `master@5e387b3f76e176c35fc199f899aafc9a057a3f08`

### 2 · sólido · La unión neutral ya incluye operaciones observables
Lo técnico: `S4.10` cerró las cinco formas públicas de identidad y binding; `S4.11` agregó observe, health, stop y attach con challenge de un solo uso, proof producer-owned y binding/incarnation exactos. La spec canónica sincronizada tiene SHA-256 `3dfd0cdd5d5a0a4e6fb6bc17933a89c92ed204389d58e7600a06ba9bb4699373`.
En simple: El enchufe común ya no sólo identifica a cada runtime: también permite mirarlo, comprobar su salud, pedirle que se detenga y adjuntarse sin confiar en lo que el propio caller afirma. Pi puede conectarse sobre una base ya entregada, no sobre una promesa.
Evidencia: `openspec/specs/host-runtime/spec.md` · `openspec/changes/archive/2026-08-28-s4-11-host-neutral-operations/verify-report.md` · `master/origin/master@6ddf6bc77d236dffad5b8ec625379117a91ce0b3`

### 3 · nuevo · Los tres roles permanentes tienen candidato verificado, no entrega
Lo técnico: La decisión 95 y `S8.14` fijan exactamente Main/coordinator, Support e Implementer como perfiles permanentes repo-owned y host-neutral. Planner queda como función temporal. El candidato local `47a7389b76a4b87d09d439e478b5874a701257ca` crea `profiles/tower/{main,support,implementer}.md`, liga las dos skills Tower propietarias y agrega `test/install/tower-role-assets.test.mjs`; sus 10 criterios pasan, pero el commit todavía no llegó a `master`.
En simple: Los tres puestos ya tienen archivos probados, pero siguen en el taller local. Hasta entregarlos no forman parte del producto disponible ni destraban el instalador.
Evidencia: `openspec/plans/plan-8/STATUS.md` · candidato local `47a7389b76a4b87d09d439e478b5874a701257ca` · Engram 9726

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
| `S9.4` y `S1.17`–`S1.19` | Supervisor, adapter y regresión Pi con aislamiento y recibos verificables | Capacidad por encima de cinco clientes |
| `S9.5` | Materialización idempotente de sólo los asientos exactos del brief, después de cerrar `S8.12 + S9.4` | Que Herdr ya abra, reutilice o valide esos asientos automáticamente |
| Gate Pi desatendido | Una corrida prolongada atribuible al candidato | Estabilidad de larga duración sin esa evidencia |
| Gate de caída con tráfico | Recuperación idempotente tras caída real del broker | Entrega garantizada de mensajes en vuelo |
| `S8.14`, `S8.12` y `S8.13` | Entregar los tres perfiles Tower ya verificados, luego cerrar bundle completo, instalación reversible y preflight externo | Que los perfiles formen parte de `master` o que la Torre deba modificar Gentle AI, Pi o `pi-intercom` |

## Lo que pasa ahora mismo

### G · sólido · `S8.14` ocupa una línea local y `S9.4` es el próximo inicio
Lo técnico: `S8.14` está 🔵 EN CURSO con candidato local verificado y por eso queda fuera de la cola. La cola canónica empieza `#1 S9.4`, seguida por `S1.17`, `S1.18` y `S8.12`; la capacidad inmediata disponible es 1. `S8.12` preserva `S8.10` y todavía espera `S1.18 + S8.14`; un candidato no entregado no satisface esa dependencia.
En simple: Los perfiles ya están probados en una mesa de trabajo y la otra mesa puede empezar la conexión con Pi. Pero el instalador debe seguir esperando hasta que esos perfiles lleguen a `master` y cierre el adapter.
Evidencia: `openspec/plans/master-index.md` · `openspec/plans/plan-8/STATUS.md` · candidato `47a7389b76a4b87d09d439e478b5874a701257ca`

### H · crítico · OpenCode sigue estacionado y el adapter Pi todavía espera
Lo técnico: `S4.4`, `S4.8` y `S4.9` permanecen 🟡 DIFERIDO con preservación absoluta. `S9.4` ya tiene satisfecha `S4.11`; `S1.18` depende de `S1.17`; `S4.12` depende de `S9.4 + S1.18`; `S8.13` conserva `S8.12 + S1.19 + S4.12`; y `S7.1` conserva `S1.19 + S4.12 + S8.13 + S5.5`. El candidato de `S8.14` no reactiva OpenCode, no implementa el host Pi y no satisface dependencias hasta entregarse.
En simple: El candidato de perfiles no cambia todavía qué está entregado. OpenCode sigue guardado, Pi aún necesita supervisor, adaptación y pruebas, y los tres perfiles deben llegar a `master` antes de entrar al instalador.
Evidencia: `openspec/plans/master-index.md:9-25` · `openspec/plans/plan-4/STATUS.md:733-763` · `openspec/plans/plan-9/STATUS.md:228-291`

## Evidencia y límites de esta radiografía

Este juicio fue reconciliado contra el candidato local verificado `47a7389b76a4b87d09d439e478b5874a701257ca` el 2026-08-28. `verified_against` se actualiza porque su contrato sella el commit cuyos bytes sustentan este juicio; no afirma entrega, que sigue pendiente de `master`. Las cifras de instrumentos, avance y cola son derivadas por el generador y no se escriben a mano acá. `S8.14` permanece 🔵 EN CURSO: perfiles, skills y test están implementados y verificados localmente, no entregados.

La última suite integral registrada para `S4.11` informó `934 pass`, `0 fail` y `5.502 expectativas`; este cierre documental no la reejecutó. Ese verde prueba las operaciones host-neutral entregadas, pero no prueba todavía el adapter Pi, la corrida desatendida ni capacidad por encima del límite vigente.
