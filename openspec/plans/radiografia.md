---
verified_against: 5e387b3f76e176c35fc199f899aafc9a057a3f08
verified_at: 2026-08-28
standfirst: La primera entrega host-neutral ya cerró: la Torre tiene cinco contratos públicos v1 y ownership de puerto que falla cerrado. OpenCode sigue estacionado; la próxima entrega habilitada es S4.11. Las cifras se miden solas contra el código.
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

La unión neutral ya está construida: identidad, worktree, proceso, incarnación y binding no dependen de Pi. El próximo paso agrega operaciones observables sobre esa base; recién después se conecta el host. Así, si OpenCode vuelve más adelante, ambos podrán enchufarse al mismo contrato sin convertir a la Torre en dependiente de un proveedor.

## El veredicto actual

### 1 · sólido · Pi va primero porque la Torre puede probar a quién lanzó
Lo técnico: El roadmap promueve Pi como primer host de implementación. La identidad no se acepta por autodeclaración: se liga a proceso, ubicación de trabajo e instancia, y las respuestas relevantes deben traer prueba producida por el runtime.
En simple: La Torre no confía en una credencial escrita por el propio agente. Conserva la ficha del proceso que abrió y exige un recibo que sólo ese proceso puede producir. Esa base permite empezar por Pi sin entregar el control de la Torre a Pi.
Evidencia: `openspec/plans/decision-register.md:408-442` · `openspec/plans/plan-4/STATUS.md:735-751` · `master@5e387b3f76e176c35fc199f899aafc9a057a3f08`

### 2 · sólido · La unión neutral ya existe y publica cinco contratos v1
Lo técnico: `S4.10` cerró con cinco formas públicas, cerradas e independientemente versionables: identidad, worktree, proceso, incarnación y binding. El binding liga los otros cuatro identificadores al puerto loopback exacto sin importar Pi ni OpenCode.
En simple: El enchufe común ya está construido. Tiene cinco piezas con responsabilidades separadas y no acepta datos inventados o sobrantes; Pi se conectará después sin convertir ese enchufe en algo exclusivo de Pi.
Evidencia: `openspec/specs/host-runtime/spec.md:7-31` · `openspec/plans/plan-4/STATUS.md:739-755` · `test/contracts/host-runtime/shapes.test.mjs`

### 3 · resuelto · El instalador de la Torre ahora incluye conducta propia de la Torre
Lo técnico: La decisión 88 divide la entrega entre `S8.12`, dueña del bundle versionado, y `S8.13`, dueña de instalación, activación, rollback y preflight. El bundle incluye runtime, contrato neutral, adapter Pi y perfiles/skills Tower-specific, incluido Support. La configuración de Pi y `pi-intercom`, y las skills genéricas de Gentle AI, quedan fuera.
En simple: Instalar la Torre ya no significa copiar sólo su código: también instala cómo deben comportarse sus roles propios. Pero no invade productos ajenos. Gentle AI sigue actualizando sus capacidades generales, y la Torre sólo comprueba que Pi y su comunicación externa sean compatibles antes de tocar nada.
Evidencia: `openspec/plans/decision-register.md:440-442` · `openspec/plans/plan-8/STATUS.md:938-954`

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

## Próximas pruebas y trabajo enumerado

La lista siguiente reemplaza las antiguas “cinco decisiones”. No son preguntas para vos: son puertas medibles o Sesiones con alcance ya fijado.

| Próximo paso | Qué debe demostrar | Qué no permite afirmar todavía |
|---|---|---|
| `S4.10` — ✅ COMPLETO | Cinco contratos v1 y ownership exacto del puerto, sin importar Pi ni OpenCode | Que el adapter Pi ya funciona |
| `S4.11` y `S4.12` | Operaciones observables y composición neutral antes del host | Que la Torre ya supervisa una jornada real |
| `S9.4` y `S1.17`–`S1.19` | Supervisor, adapter y regresión Pi con aislamiento y recibos verificables | Capacidad por encima de cinco clientes |
| Gate Pi desatendido | Una corrida prolongada atribuible al candidato | Estabilidad de larga duración sin esa evidencia |
| Gate de caída con tráfico | Recuperación idempotente tras caída real del broker | Entrega garantizada de mensajes en vuelo |
| `S8.12` y `S8.13` | Bundle Tower completo, instalación reversible y preflight externo | Que la Torre deba instalar o modificar Gentle AI, Pi o `pi-intercom` |

## Lo que pasa ahora mismo

### F · sólido · `S4.11` quedó desbloqueada y lista
Lo técnico: `S4.10` está ✅ COMPLETO y satisfizo la única dependencia de `S4.11`, que ahora figura 🟢 LISTO. Su Área agrega observe, health, stop y attach host-neutral sobre el binding ya verificado; todavía no implementa el adapter Pi.
En simple: La base común ya pasó su examen. El siguiente trabajo de esta cadena puede empezar: hacer que la Torre observe, compruebe salud, detenga y se reconecte sin depender todavía de un host particular.
Evidencia: `openspec/plans/plan-4/STATUS.md:739-763` · `openspec/plans/master-index.md:9-19`

### G · crítico · OpenCode sigue estacionado y el adapter Pi todavía espera
Lo técnico: `S4.4`, `S4.8` y `S4.9` permanecen 🟡 DIFERIDO con preservación absoluta. `S9.4` y `S1.17`–`S1.19` siguen detrás de `S4.11`; `S4.12` conserva sus dependencias propias. `S8.12` sólo aparece según la cola canónica y no cambia el estado de OpenCode ni autoriza trabajo host específico.
En simple: Cerrar el contrato común no reactiva OpenCode ni salta directamente a Pi. Primero hay que construir las operaciones neutrales de `S4.11`; lo estacionado se conserva intacto y no se presenta como trabajo activo.
Evidencia: `openspec/plans/master-index.md:9-25` · `openspec/plans/plan-4/STATUS.md:733-763` · `openspec/plans/release-chain.md:270-274`

## Evidencia y límites de esta radiografía

Este juicio fue reconciliado contra `master@5e387b3f76e176c35fc199f899aafc9a057a3f08` el 2026-08-28. Las cifras de instrumentos, avance y cola son derivadas por el generador; no se escriben a mano acá.

La suite integral del candidato informó `914 pass`, `0 fail` y `5.291 expectativas`. Ese verde prueba el estado actual del repositorio y el cierre de `S4.10`; no prueba todavía las operaciones de `S4.11`, el adapter Pi, la corrida desatendida ni capacidad por encima del límite vigente.
