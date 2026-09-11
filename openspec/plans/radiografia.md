---
verified_against: 0360f6548e2ce4a52032a60840717f2839948893
verified_at: 2026-09-11
standfirst: S1.18 ya entregó el adapter Pi, pero S9.9 quedó bloqueada al comprobar que la apertura de asientos no ata todas sus operaciones al workspace Herdr autorizado. El candidato parcial está estacionado sin crédito; la apertura de workers y S1.20 permanecen suspendidas.
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

La unión neutral ya identifica worktree, proceso, incarnation y binding, y expone operaciones sin depender de Pi. `S4.14` cerró la ventana que quedaba después de `S4.13`: confirma en el mismo stack al ocupante exacto inmediatamente antes del publish final. `S9.6` cerró la fuente que intercepta intención de Sesión y la enruta a la Torre; `S9.4` cerró la comprobación de PID, cwd y start-token contra el kernel antes y después de la observación async. `S1.17` agregó el gate privado que separa identidad neutral de scope, epoch, rol y capabilities Tower-owned. `S1.18` ya sumó el adapter runtime: lifecycle guardado, dispatch reconocido, progreso, terminalidad retryable y decisiones inmutables. Todavía no equivale a su materializador, a una instalación global activa ni a evidencia con procesos Pi e Intercom reales.

## El veredicto actual

### 1 · sólido · Pi va primero porque la Torre puede probar a quién lanzó
Lo técnico: El roadmap promueve Pi como primer host de implementación. La identidad no se acepta por autodeclaración: se liga a proceso, ubicación de trabajo e instancia, y las respuestas relevantes deben traer prueba producida por el runtime.
En simple: La Torre no confía en una credencial escrita por el propio agente. Conserva la ficha del proceso que abrió y exige un recibo que sólo ese proceso puede producir. Esa base permite empezar por Pi sin entregar el control de la Torre a Pi.
Evidencia: `openspec/plans/decision-register.md:408-442` · `openspec/plans/plan-4/STATUS.md:735-751` · `master@5e387b3f76e176c35fc199f899aafc9a057a3f08`

### 2 · sólido · La unión neutral ya incluye operaciones observables
Lo técnico: `S4.10` cerró las cinco formas públicas de identidad y binding; `S4.11` agregó observe, health, stop y attach con challenge de un solo uso, proof producer-owned y binding/incarnation exactos. La spec canónica sincronizada tiene SHA-256 `3dfd0cdd5d5a0a4e6fb6bc17933a89c92ed204389d58e7600a06ba9bb4699373`.
En simple: El enchufe común ya no sólo identifica a cada runtime: también permite mirarlo, comprobar su salud, pedirle que se detenga y adjuntarse sin confiar en lo que el propio caller afirma. Pi puede conectarse sobre una base ya entregada, no sobre una promesa.
Evidencia: `openspec/specs/host-runtime/spec.md` · `openspec/changes/archive/2026-08-28-s4-11-host-neutral-operations/verify-report.md` · `master/origin/master@6ddf6bc77d236dffad5b8ec625379117a91ce0b3`

### 3 · crítico · El adapter Pi está entregado; la Torre no está activa
Lo técnico: `S1.18` cerró en `3ebb83373cf9507274a87e5206f315dce34a6a4f` y `2cd64c4a32e178c88632348696353c2dd8654c56` el lifecycle con ownership validado, dispatch reconocido, progreso, terminalidad retryable y snapshot inmutable de decisiones. La separación del builder sincronizó los globals genéricos y `check` pasó, pero no probó una Sesión nueva. La Torre sigue inactiva; `product/tower/generic/` preserva el original pasivo y los perfiles y skills candidatos de `product/tower/` siguen editables, sin release. `S8.12` todavía debe empaquetar los bytes Tower actuales y `S8.13` debe ejercitar, sólo en un HOME/runtime aislado, materialización, preflight, activación y rollback de `control-tower-activation.json`.
En simple: El enchufe entre la Torre y Pi existe, pero no está funcionando en una Torre activa ni fue probado en una sesión nueva. Mover el producto separa sus fuentes del builder; no lo instala, publica ni lo convierte en una promesa operativa.
Evidencia: `openspec/plans/plan-1/STATUS.md` S1.18 · `openspec/plans/plan-8/STATUS.md` S8.12–S8.13 · `0c48356f43dc76cd4838bbd97638fa10954fde00` · `0360f6548e2ce4a52032a60840717f2839948893`

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
Evidencia: `test/contracts/host-runtime/loopback.test.mjs:34-56` · `openspec/changes/archive/2026-08-28-s4-10-host-neutral-runtime/verify-report.md:247-291` · suite `914 pass / sin fallos / 5.291 expectativas`

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

### F · bloqueado · La apertura automática puede cruzar el workspace equivocado
Lo técnico: `S9.9` demostró que discovery y creación no estaban ligados en todas sus operaciones a `HERDR_WORKSPACE_ID`: el intento real abrió `AGENTES` en otro proyecto y el gate cerró ese pane antes de iniciar Pi. El candidato parcial corrige discovery, readback y cleanup, pero conserva un `pane split` sin scope y la suite integral termina 1107/1. La decisión 107 rechazó ampliar el Área; `torre asiento abrir` queda suspendido.
En simple: La Torre encontró el escritorio correcto pero intentó instalarlo en otro edificio. Frenó antes de arrancar al trabajador. La reparación está guardada, no entregada: hasta resolver el último comando sin dirección explícita no se abre ningún asiento ni continúa S1.20.
Evidencia: `openspec/plans/decision-register.md` decisiones 106–107 · `openspec/plans/plan-9/STATUS.md` S9.9 · candidato local `8a5b0fa91c480938428f9f42dc9b4b40f27e90a4`

## Próximas pruebas y trabajo enumerado

La lista siguiente reemplaza las antiguas “cinco decisiones”. No son preguntas para vos: son puertas medibles o Sesiones con alcance ya fijado.

| Próximo paso | Qué debe demostrar | Qué no permite afirmar todavía |
|---|---|---|
| `S4.10` — ✅ COMPLETO | Cinco contratos v1 y ownership exacto del puerto, sin importar Pi ni OpenCode | Que el adapter Pi ya funciona |
| `S4.11` — ✅ COMPLETO; `S4.12` pendiente | Operaciones observables ya entregadas; recuperación mínima Pi después de sus dependencias | Que la Torre ya supervisa o recupera una jornada Pi real |
| `S4.13` y `S4.14` — ✅ COMPLETO | Validación unpublished y comprobación sincrónica final del ocupante exacto antes de publish | Que el adapter Pi o el runtime global instalado ya funcionen |
| `S9.4`, `S1.17` y `S1.18` — ✅ COMPLETO; `S1.19` pendiente | Supervisor, actualidad del proceso, gate privado y adapter runtime ya entregados; falta la regresión con Pi/Intercom reales | Que Pi ya esté materializado, habilitado globalmente o probado en una jornada real |
| `S9.5` | Materialización idempotente de sólo los asientos exactos del brief; `S1.18` y `S9.6` ya cerraron sus dependencias | Que Herdr ya abra, reutilice o valide esos asientos automáticamente |
| Gate Pi desatendido | Una corrida prolongada atribuible al candidato | Estabilidad de larga duración sin esa evidencia |
| Gate de caída con tráfico | Recuperación idempotente tras caída real del broker | Entrega garantizada de mensajes en vuelo |
| `S8.14` y `S9.6` — ✅ COMPLETO; `S8.12` y `S8.13` pendientes | Perfiles y fuente Pi-first entregados; empaquetar el set local y cerrar materialización, probe, activación y rollback atómicos | Que el runtime Tower instalado enrute automáticamente, esté coherente, verificado o disponible |

## Lo que pasa ahora mismo

### G · resuelto · `S4.14` cierra la ventana final de actualidad
Lo técnico: El candidato `daf7e0e7af4122417ce2bec8a48a11c65a40f23c`, cherry-picked de `dc8e1d9ba752249398fde5760369684ef211c642`, ejecuta el guard neutral sincrónico sobre metadata congelada inmediatamente antes de publish; sólo `true` primitivo publica. El diff exacto suma 146 líneas authored en implementación, test y spec. Focused 18/18 (202 expectations), host-runtime 34/34 (321) y suite completa 950/950 (5.642 expectations, 74 archivos, 103,13 s) pasaron sobre árbol limpio.
En simple: La Torre vuelve a comprobar la llave en el instante de entregarla. Si el proceso cambió, respondió algo ambiguo o falló, no publica ownership viejo. El código está verificado localmente y todavía falta el push directo.
Evidencia: `contracts/host-runtime/ownership-registry.mjs` · `test/contracts/host-runtime/ownership.test.mjs` · `openspec/specs/host-runtime/spec.md` · candidato `daf7e0e7af4122417ce2bec8a48a11c65a40f23c`

### H · resuelto · El adapter conserva autoridad y cierre aun cuando el transporte falla
Lo técnico: `S9.4` y `S1.17` separan actualidad del proceso, identidad y capabilities Tower-owned. `S1.18` valida ownership antes de detener, acepta como éxito la desaparición probada tras `stop`, liga un `dispatch_id` estable y sólo compromete un terminal después de entrega reconocida; un fallo libera la reserva para retry y la solicitud de decisión se copia y congela antes de esperar.
En simple: La Torre comprueba la llave antes de apagar un proceso y no confunde “ya desapareció correctamente” con un error. Si falla el envío del resultado final, puede reintentarlo; si dos cierres compiten, sólo uno puede quedar confirmado. Además, una pregunta al mantenedor no puede cambiar mientras espera respuesta.
Evidencia: `openspec/plans/plan-9/STATUS.md` S9.4 · `openspec/plans/plan-1/STATUS.md` S1.17–S1.18 · `3ebb83373cf9507274a87e5206f315dce34a6a4f` · `2cd64c4a32e178c88632348696353c2dd8654c56`

### I · resuelto · `S2.8` eliminó los nombres de fase sin fabricar un verde integral
Lo técnico: El código local `480afb92bf99d38ee166070d09ec6485bc5de2c4`, parent `c2fb6399ee1332821663735d02833f78b9371402`, toca sólo los tres paths de `Área` y suma 45 líneas authored. AC1–AC5 pasan; safety quedó 72/72, `M2.8.1` pasó de RED 72/1 a 74/74 y `M2.8.2` de RED 74/1 a 75/75. La única integral fue 952/953 por `test/hosts/candidate-fence.test.mjs:432`, fuera de `Área`; el diagnóstico aislado autorizado pasó 17/17 y el caso exacto no reprodujo. AC6 cierra por la decisión 103, no como PASS.
En simple: El cambio hace exactamente una cosa: la Torre deja de entender nombres internos del proceso de trabajo y conserva el resto del contrato. El examen total tuvo una falla ajena que no volvió a aparecer al aislarla; Emilio autorizó cerrar sólo este candidato sin convertir ese 952/953 en un aprobado general.
Evidencia: `schemas/binding-delta-v1.schema.json` · `test/contracts/schema.test.mjs` · `test/fixtures/contracts/schema-cases-v1.json` · [decisión 103](decision-register.md) · candidato `480afb92bf99d38ee166070d09ec6485bc5de2c4`

## Evidencia y límites de esta radiografía

Este juicio conserva como última entrega de código de producto `2cd64c4a32e178c88632348696353c2dd8654c56`. `S9.6` acredita la fuente Pi-first, `S9.4` la actualidad de kernel del supervisor, `S1.17` el gate privado de autoridad y `S1.18` el adapter runtime sobre seams inyectados. `S9.9` está bloqueada con un candidato local no entregado; el focused pasa 25/25, pero la suite integral 1107/1108 y el `pane split` sin workspace impiden cualquier crédito. La cadena global queda detenida en `S9.9`; después siguen `S1.20 + S2.9 → S9.7 → S9.5 → S9.8 → S8.12`, más `S1.19` y `S4.12`, y finalmente `S8.13`. Todavía no se acreditan runtime Pi/Intercom real, jornada desatendida, packaging Tower, materialización de `control-tower-activation.json`, lifecycle atómico, activación, rollback, materialización Herdr, asignación ni capacidad.
