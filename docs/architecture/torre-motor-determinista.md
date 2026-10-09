# Torre determinista — arquitectura y handoff de migración

> **Estado:** investigación arquitectónica cerrada con el mantenedor; nada fue implementado.
>
> **Propósito:** dejar un insumo versionable para adaptar la Torre al patrón útil de RDD sin copiar su lifecycle de review literalmente.
>
> **Investigación original:** `control-tower@ebc2ffb840030f7266a207536134c057a82bec70` en `master`. Sus hallazgos de core, stores, runtime y las once decisiones de §3 son evidencia histórica de esa observación; este alineamiento no repite la auditoría del engine ni la investigación web.
>
> **Checkpoint de alineamiento:** `control-tower@1658444ff52cddba3516f7e4e39bd314ccd21cdc`. Sólo verifica la coherencia de este informe con el método y las reglas vigentes: coordinación nativa Zona → Sesión, `encargo` de cuatro partes, ODD por defecto y SDD sólo por `solicitud_sdd` humana explícita. No es una auditoría nueva de runtime, tests ni instalación.
>
> **Evidencia de planificación histórica:** `radar.snapshot/v1` sobre el `HEAD` original, con 79 Sesiones cerradas de 115. Los contratos citados se obtuvieron exclusivamente mediante `radar status --json` y `radar sesion <ID>`; no se abrió ni modificó `openspec/plan.yaml` ni `openspec/ROADMAP.md` para ese análisis.
>
> **Límite:** este documento es una referencia arquitectónica alineada al método actual; no reemplaza el plan ni el canon, no selecciona trabajo, no asigna IDs nuevos y no autoriza implementación, instalación, entrega ni cambios de prioridad.

## Índice

1. [Veredicto](#1-veredicto)
2. [Las cajas que no deben confundirse](#2-las-cajas-que-no-deben-confundirse)
3. [Decisiones confirmadas](#3-decisiones-confirmadas)
4. [Qué existe hoy](#4-qué-existe-hoy)
5. [Qué se toma de RDD](#5-qué-se-toma-de-rdd)
6. [Arquitectura objetivo](#6-arquitectura-objetivo)
7. [Flujo completo](#7-flujo-completo)
8. [Modelo persistido](#8-modelo-persistido)
9. [Contrato del paquete sellado](#9-contrato-del-paquete-sellado)
10. [Autoridades y comprobantes externos](#10-autoridades-y-comprobantes-externos)
11. [Harness Pi, skills, adapters y UI](#11-harness-pi-skills-adapters-y-ui)
12. [Convergencia de stores](#12-convergencia-de-stores)
13. [Qué simplifica y qué amplía](#13-qué-simplifica-y-qué-amplía)
14. [Impacto sobre las Sesiones existentes](#14-impacto-sobre-las-sesiones-existentes)
15. [Resultados futuros todavía no planificados](#15-resultados-futuros-todavía-no-planificados)
16. [Choques concretos](#16-choques-concretos)
17. [Orden derivado de migración](#17-orden-derivado-de-migración)
18. [Verificación necesaria](#18-verificación-necesaria)
19. [Lo que no se toca](#19-lo-que-no-se-toca)
20. [Incertidumbres conservadas](#20-incertidumbres-conservadas)
21. [Retoma recomendada y límites](#21-retoma-recomendada-y-límites)

## 1. Veredicto

Sí: **es una buena idea adaptar a la Torre la forma en que RDD separa estado, autoridad, transiciones y presentación**.

Lo que se copia es el patrón:

- un motor fuera del contexto del modelo conserva la verdad;
- la identidad y la revisión se ligan de forma inmutable;
- el motor devuelve sólo la próxima transición admitida;
- los consumidores no reconstruyen tokens, rutas ni autoridad;
- los resultados se validan antes de mover estado;
- la UI muestra lo que dice el motor, pero no decide.

Lo que no se copia literalmente es la forma completa de una review RDD. Una Ejecución de Sesión dura más, puede atravesar varios pasos técnicos bajo Gentle AI, pausarse, corregirse, revisar, entregar y documentar. Por eso necesita una raíz estable con varios paquetes hijos, no una lineage de review gigante.

La forma objetivo es:

> **Chanks conserva la coordinación de producto; Gentle AI posee la descomposición técnica, checks y continuidad; la Torre, si se implementa, ejecuta sólo el estado mecánico admitido desde un único core; las autoridades externas conservan su dominio.**

## 2. Las cajas que no deben confundirse

| Caja | Qué es | Qué decide | Qué no decide | Si se apaga |
|---|---|---|---|---|
| **Chanks metodológico** | Coordinación de producto, ODD, skills, conversación y explicación | Qué preguntar, cómo preparar decisiones y cómo expresar la coordinación y el Encargo aprobados | Descomposición técnica, checks, continuidad técnica, estado runtime, locks, transiciones o entrega | Sigue existiendo el método manual |
| **Contrato Chanks** | Coordinación nativa de la Sesión y su `encargo` admitido | Declara Zona, ID, prioridad/dependencias, archivos exactos, Cimientos/recursos, autoridad y exactamente `pedido_contexto`, `resultado_comportamiento`, `restricciones_decisiones`, `referencias` | No crea campos raíz ni encabezados extra de ruta, criterios, Módulos o Tareas; el resultado/las restricciones verificables viven en el Encargo. No ejecuta ni se autoriza a sí mismo | Puede leerse y validarse sin Torre |
| **Harness Pi** | Extensión JavaScript/TypeScript alrededor del agente | Materializa contexto, presenta preguntas, llama herramientas y devuelve evidencia | No persiste ni deriva estado Tower | Pi vuelve al flujo manual explícito |
| **Ejecutable `torre`** | Frontera de proceso del motor; puede estar implementada con Bash/Bun/JavaScript | Admisión, persistencia y próxima transición mecánica | No inventa decisiones humanas, estado Radar, review RDD ni verdad del host | No existe automatización Tower-owned |
| **Core Tower** | Máquina transaccional dentro del ejecutable | Estado de Ejecución, paquetes, CAS, idempotencia, recovery y cierre operativo | No interpreta producto libremente | No hay fuente runtime durable |
| **Adapter de host** | Puerto que ejecuta un efecto real en Pi, OpenCode, Herdr, Git o tests | Sólo la mecánica específica del host y su atestación | No elige si el efecto está autorizado ni muta el store | Ese efecto queda no disponible |
| **UI / emoji** | Proyección visual | Color, texto y detalle de un estado ya resuelto | Nunca prueba inicio, éxito o cierre | El motor continúa sin decoración |
| **Radar / plan** | Autoridad de planificación y cálculo | Estado, cola, capacidad, territorio y contrato de Sesión | No adquiere recursos ni gobierna runtime | La Torre no puede admitir trabajo nuevo honestamente |
| **Gentle AI RDD** | Autoridad nativa de review del candidato | Consentimiento, lifecycle de review, corrección y resultado | No autoriza por sí solo entrega ni cierre del producto | Se sigue la política ordinaria aplicable |

### Vocabulario

- **Sesión:** unidad del plan que cierra con una entrega. Continúa siendo autoridad de producto y, en su forma nativa, se coordina como Zona → Sesión con un `encargo` de cuatro partes.
- **Ejecución de Sesión:** instancia runtime concreta que intenta realizar una Sesión aprobada; no descompone ni sustituye su autoridad de producto.
- **Jornada:** ventana operativa/autorizadora subordinada; no es la raíz de la Ejecución.
- **Paquete sellado:** entidad runtime que describe una transición o efecto acotado. No es un quinto nivel del plan.
- **Comprobante externo:** evidencia versionada emitida por una autoridad que la Torre no reemplaza.
- **Adapter:** ejecutor/atestiguador de un efecto; no es autoridad de transición.

## 3. Decisiones confirmadas

El mantenedor confirmó durante esta investigación:

1. La raíz persistida es una **Ejecución de Sesión**, no la Sesión del plan ni una Jornada completa.
2. La Torre es la única autoridad que elige y persiste la próxima transición mecánica dentro de esa Ejecución.
3. El agente recibe un **paquete de trabajo sellado** con contexto mínimo, límites y evidencia esperada.
4. **Chanks declara; la Torre ejecuta.**
5. Chanks permanece principalmente en el harness Pi y en sus skills; no se convierte entero en lógica del motor.
6. Hay un único ejecutable autoritativo `torre`. El lenguaje de implementación no define la frontera de autoridad.
7. Humano, Radar/plan, política de entrega, Gentle AI RDD, Git y hosts continúan siendo autoridades externas.
8. UI sólo proyecta. Los adapters de host sí ejecutan efectos y devuelven atestaciones.
9. `tower.db` SQLite es el store canónico. `main-store` JSON queda temporalmente como proyección de compatibilidad.
10. Una Ejecución permanece estable y contiene múltiples handoffs/paquetes hijos inmutables.
11. Tower OFF sigue siendo un camino manual Chanks explícito y separado.

## 4. Qué existe hoy

### 4.1 Entrada única parcial

`bin/torre` ya es una puerta externa, pero hoy mezcla caminos de distintas generaciones. Es un script Bash que resuelve runtime activo y delega módulos Bun.

**Evidencia:** `bin/torre:1-58`, `bin/torre:114-315`.

El lifecycle versionado, puntero activo y rollback son una buena base reutilizable.

**Evidencia:** `install/lifecycle.mjs:269-333`, `install/active-pointer.mjs:17-30`.

### 4.2 Ledger transaccional maduro

`core.mjs` ya contiene la pieza más cercana al motor deseado:

- `ct_handoff` con contenido inmutable;
- historia append-only de transiciones;
- deliveries y claims;
- CAS e idempotencia;
- efecto y terminación atestiguados;
- revisión, suspensión y recuperación;
- migraciones transaccionales.

**Evidencia:** `core.mjs:231-679`, `core.mjs:899-1085`, `core.mjs:2442-4186`, `core.mjs:4378-4405`.

El lifecycle actual del handoff es:

```text
DRAFT → VALIDATED → PUBLISHED → CLAIMED
→ STARTED → COMPLETION_ATTESTED → COMPLETED
```

También tiene rechazo, cancelación, poisoning, suspensión de trabajo, suspensión de atestación, revisión y recovery.

### 4.3 Store JSON paralelo

`main-store/store.mjs` protege objetos individuales con binding de Main, CAS por revisión, escritura atómica y validación de autoridad. Conserva decisiones estacionadas, autorizaciones, assignment locations, launch bindings, completed-work bindings y Jornadas.

**Evidencia:** `main-store/authority.mjs:3-36`, `main-store/store.mjs:88-174`, `main-store/store.mjs:245-355`, `main-store/store.mjs:403-603`.

Su límite es que la atomicidad ocurre por archivo. No existe una transacción única que cambie Jornada, autorización, assignment, launch y efecto juntos.

### 4.4 Estado distribuido

También existen stores o ledgers especializados para delivery, candidate fencing, root bindings, supervision, registry y routing de escalación.

**Evidencia:** `delivery/ledger.mjs:13-173`, `hosts/candidate-fence.mjs:273-394`, `hosts/root-binding.mjs:1-94`, `supervision/state.mjs:46-125`, `escalation/routing.mjs:181-213`.

Esos componentes pueden sobrevivir como autoridades o atestiguadores especializados, pero no como raíces alternativas de la Ejecución.

### 4.5 El agente todavía decide demasiado

El router Pi transforma frases humanas en el cuerpo completo de `torre-control` más la intención original. El modelo vuelve a recibir el reglamento y debe reconstruir qué sigue.

**Evidencia:** `extensions/pi/tower-session-router.ts:206-283`.

La consola valida comandos, pero el executor termina enviando una directiva textual a otro agente.

**Evidencia:** `console/validate.mjs:69-136`, `console/executor.mjs:8-24`.

La badge actual se calcula desde el lifecycle de la llamada Pi, no desde estado persistido Tower.

**Evidencia:** `extensions/pi/tower-session-router.ts:74-115`.

### 4.6 Partes construidas pero no conectadas

Existen contracts, adapters Pi, host-neutral ports, delivery workflow, Jornada, supervision y launch consumer, pero el payload instalado no incluye todos sus writers y módulos relacionados.

**Evidencia:** `contracts/schema-registry.mjs:6-40`, `adapters/pi/contract.mjs:29-137`, `adapters/pi/runtime.mjs:52-221`, `hosts/runtime-port.mjs:69-151`, `install/runtime-payload.mjs:34-66`.

### 4.7 Historial que no es runtime

`product/tower/generic/**` es evidencia histórica inmutable. Su flujo declara expresamente que nada fue implementado. No debe cargarse como gobernanza activa.

**Evidencia:** `product/tower/generic/FLUJO-END-TO-END.md:1-14`; clasificación registrada en la autoridad de planificación consultada por Radar.

## 5. Qué se toma de RDD

| Patrón RDD | Decisión para Torre |
|---|---|
| `inspect` separado de `start` | Copiar: inspeccionar no crea una Ejecución |
| Identidad y revisión congeladas | Copiar: Execution y packet tienen identidad/revisión propias |
| Bindings opacos | Copiar: harness y adapters no reconstruyen tokens |
| CAS e idempotencia | Copiar: toda mutación compara revisión esperada |
| `status` como única próxima transición | Copiar: no derivar del transcript |
| Consentimiento humano cerrado | Adaptar: sólo en decisiones que realmente pertenecen al humano |
| Contexto materializado y acotado | Copiar: el worker recibe una vista mínima sellada |
| Admisión de resultados | Copiar: evidencia tardía, duplicada o extranjera no mueve estado |
| Corrección y recovery acotados | Adaptar: una Sesión puede necesitar más de una corrección, siempre auditada |
| Burn/cierre terminal | Adaptar: separar review, delivery, documentación y cierre operativo |
| Badge de Pi | Copiar sólo como proyección visual |

### Lo que no se copia literalmente

1. No se congela toda la Sesión desde el primer minuto.
2. No se abre una lineage por cada microacción.
3. No se toma el texto del agente como resultado admitido.
4. No se impone el límite RDD de una corrección a toda la implementación.
5. No se confunde aprobación técnica con entrega ejecutada.
6. No se recupera desde la UI ni desde el transcript.
7. No se deja un fail-closed sin razón y salida operable.

## 6. Arquitectura objetivo

```text
┌──────────────────────────────────────────────────────────┐
│ Humano + Chanks + harness Pi                            │
│ intención · decisiones · explicación · contrato         │
└────────────────────────────┬─────────────────────────────┘
                             │ contrato versionado
                             ▼
┌──────────────────────────────────────────────────────────┐
│ Ejecutable `torre`                                      │
│                                                          │
│  API/IPC autoritativo                                   │
│          │                                               │
│  Core transaccional ──────────────── tower.db           │
│          │                    Execution + packets         │
│          ├─ policy/receipt admission                     │
│          ├─ next-transition reducer                      │
│          ├─ outbox/projections                           │
│          └─ recovery/audit                               │
└──────────┬───────────────┬───────────────┬───────────────┘
           │               │               │
           ▼               ▼               ▼
      adapter host     adapter Git     adapter tests/RDD
      efecto+prueba    efecto+prueba   invocación+receipt
           │               │               │
           └───────────────┴───────────────┘
                             │
                             ▼
                     estado admitido

UI Pi / 🗼 / 💪 = proyección del resultado anterior
```

### Regla central

Sólo el core Tower escribe la raíz de Ejecución. Un plugin, skill, adapter, host o UI puede:

- presentar una solicitud;
- ejecutar un efecto previamente autorizado;
- devolver evidencia;
- consultar una proyección.

Nunca puede abrir `tower.db` para inventar su propia transición.

## 7. Flujo completo

### 7.1 Antes de la Ejecución

1. El humano elige una Sesión entre opciones que Radar calcula `LISTO`.
2. Chanks obtiene evidencia Radar fresca y liga `HEAD`, Session ID y digests.
3. Kickoff revalida repositorio, contaminación, coordinación/Encargo, archivos exactos cuando ya se conocen y autoridad.
4. Chanks presenta la coordinación nativa admitida y su Encargo de cuatro partes; los criterios de resultado y restricciones permanecen dentro de ese Encargo.
5. `inspect` valida forma, compatibilidad y autoridades sin escribir estado.
6. Si falta una decisión humana, el harness presenta un sobre cerrado y se detiene.

ODD es el camino técnico por defecto; SDD sólo procede ante `solicitud_sdd` humana explícita y bajo sus controles nativos existentes, sin protocolo proveedor nuevo. Una Sesión nativa se retoma con la misma identidad, su registro ODD, código y evidencia observada, no con un primer Módulo Chanks; ese criterio de primer Módulo sólo subsiste donde aplique un contrato legacy. Un Encargo incompleto no autoriza ejecución ni escrituras: el límite inicial son archivos exactos. Expandirlos dentro de una Sesión coherente exige aprobación humana previa y compatibilidad fresca antes de la escritura afectada; alcance incoherente nuevo requiere otra Sesión.

### 7.2 Creación

7. `start` recibe el contrato exacto autorizado.
8. Tower revalida identidad, Radar, HEAD, política, host y versiones.
9. Una transacción crea la Ejecución en `tower.db`.
10. Tower devuelve identidad, revisión y una única próxima transición admitida.

### 7.3 Trabajo

11. Tower crea un paquete sellado para un efecto o resultado acotado.
12. Un worker/adapter reclama el paquete exacto.
13. Tower registra claim y ACK antes de permitir efectos.
14. El harness materializa sólo el contexto del paquete.
15. El worker diseña, implementa, prueba o inspecciona según el contrato.
16. Devuelve evidencia estructurada ligada a Execution, packet, attempt y worker.
17. Tower valida schema, identidad, actualidad, alcance y causalidad.
18. Si admite el resultado, mueve la Ejecución y emite el siguiente paquete.

Un paquete de implementación respeta la unidad técnica revertible que Gentle AI determine dentro de la Sesión autorizada. Otros paquetes pueden representar launch, tests, review, delivery o closure. La granularidad se decide por frontera de efecto/retry/rollback, no para crear otro nivel del plan ni un Módulo/Tarea nativo.

### 7.4 Verificación y review

19. Tower solicita los checks técnicos aplicables mediante adapters y admite sus resultados.
20. El harness ejecuta Gentle AI RDD bajo su propio lifecycle y consentimiento cuando su política nativa lo requiera.
21. Tower recibe un comprobante externo ligado al candidato exacto y al resultado que la autoridad proveedora exponga.
22. Tower no interpreta, reemplaza ni exige un archivo de receipt, `FINALIZE` o permiso de entrega como si RDD los emitiera.

### 7.5 Entrega

23. La política del repositorio y el humano aportan la autorización correspondiente.
24. Tower solicita el efecto mediante el adapter de delivery.
25. El adapter ejecuta y devuelve evidencia remota verificable.
26. Tower distingue autorización, efecto ejecutado y reconciliación.
27. Un resultado remoto incierto bloquea la transición; no dispara repetición ciega.

### 7.6 Documentación y cierre

28. Chanks/parent documenta la Sesión según la política local.
29. La autoridad del plan registra el delta confirmado; Tower no escribe `plan.yaml`.
30. Radar fresco prueba el estado resultante.
31. Tower admite los comprobantes de entrega y cierre.
32. La Ejecución pasa a terminal `COMPLETED` sólo con toda la evidencia requerida.

### 7.7 Pausa, bloqueo y recovery

- **Pausa:** deliberada y reversible mediante una transición ligada.
- **Bloqueo:** falta autoridad, evidencia o hay contradicción; `status` explica causa y salida.
- **Resultado tardío:** queda no admitido y no mueve estado.
- **Crash del adapter:** `status` y el ledger determinan si el efecto empezó, terminó o quedó incierto.
- **Corrección:** crea una nueva revisión del paquete; no reemplaza la identidad de la Ejecución.
- **Recovery excepcional:** exige actor, razón, revisión previa, evidencia y una transición explícita.

### 7.8 Tower OFF

Tower OFF no escribe ni simula una Ejecución:

```text
Humano → Radar → Chanks manual → Herdr/Intercom explícitos
→ worker → evidencia → integración serial → documentación
```

Se conservan los controles de Método V1. Lo que se pierde es persistencia y automatización Tower-owned, no seguridad semántica. Ningún terminal manual se importa luego como estado Tower por inferencia.

## 8. Modelo persistido

### 8.1 Raíz Execution

Campos semánticos mínimos, no nombres finales de API:

- `execution_id` opaco;
- `execution_revision` monotónica;
- repositorio y Git common dir canónicos;
- Session ID del plan;
- digest del snapshot Radar y del contrato de Sesión;
- referencia y versión de la coordinación nativa de Sesión admitida y del Encargo, con sus digests;
- fase actual;
- estado operativo;
- paquete vigente;
- autoridad humana de inicio;
- receipts externos admitidos;
- resultado terminal y timestamps;
- historia append-only de transiciones.

### 8.2 Fase separada del estado

Fases semánticas:

```text
ADMISSION → WORK → VERIFY → REVIEW → DELIVERY → CLOSURE
```

Estados operativos mínimos:

```text
OPEN       puede avanzar
PAUSED     pausa deliberada y recuperable
BLOCKED    falta autoridad o evidencia
COMPLETED  cierre probado
CANCELLED  cancelación autorizada
FAILED     terminó sin resultado válido
EXPIRED    perdió vigencia
```

Los nombres exactos deben fijarse en el diseño de schema. La separación sí está cerrada: no se crean combinaciones como `REVIEW_BLOCKED` y `DELIVERY_PAUSED`.

### 8.3 Handoff/packet hijo

El lifecycle `ct_handoff` existente se conserva como submáquina por paquete. La raíz referencia el paquete vigente y el paquete referencia la Ejecución.

Una nueva revisión de packet conserva:

- Execution ID;
- causalidad con el packet anterior;
- motivo de revisión;
- presupuesto y autoridad;
- estado terminal del packet reemplazado.

### 8.4 Eventos y proyecciones

Cada mutación autoritativa debe producir en la misma transacción:

1. cambio del aggregate Execution/packet;
2. transición append-only;
3. evento de outbox cuando un consumidor externo necesita una proyección;
4. respuesta idempotente ligada a request y CAS.

## 9. Contrato del paquete sellado

Un paquete debe incluir, como mínimo:

### Identidad

- Execution ID y revisión esperada;
- packet ID, revisión e intento;
- binding de transición opaco;
- expiración;
- repo, common dir y base exactos.

### Coordinación y autoridad de producto

- Session ID;
- digests de Radar status y `radar sesion`;
- coordinación nativa admitida: Zona, archivos exactos, Cimientos/recursos, prioridad/dependencias y autoridad;
- digest y referencias del Encargo, cuyas cuatro partes conservan el resultado esperado, contexto y restricciones;
- decisiones y autoridad citada.

No añade campos raíz ni encabezados extra de ruta, criterios, Módulo/Tareas o checklist de planificación. El significado verificable de resultado y restricciones permanece en el Encargo; el paquete puede llevar checks y evidencia esperada derivados de ese resultado aprobado y de la descomposición del proveedor técnico, sin inventar autoridad de producto ni duplicar planificación nativa.

### Alcance y efectos

- paths editables exactos;
- Cimientos y recursos;
- host/worker/capabilities esperados;
- efectos permitidos;
- efectos prohibidos;
- comandos/checks autorizados;
- frontera de rollback o compensación.

### Contexto materializado

- referencias exactas y sus digests;
- extracto mínimo necesario para el actor;
- nunca la skill completa como autoridad;
- nunca credenciales, tokens reutilizables o acceso directo al store.

### Evidencia esperada

- resultado estructurado;
- paths realmente cambiados;
- checks con comando y resultado observado;
- candidate/commit/tree cuando corresponda;
- comprobantes externos de host, proveedor de review, delivery o documentación, sólo cuando existan;
- condición de terminalidad y recuperabilidad.

Un comprobante de review se trata como evidencia externa genérica: Tower no presupone un receipt nativo, `FINALIZE` ni permiso de entrega de Gentle AI RDD.

## 10. Autoridades y comprobantes externos

| Autoridad | Qué emite | Qué valida Tower | Qué no puede fabricar Tower |
|---|---|---|---|
| Humano | elección, aprobación o respuesta cerrada | binding, opción, vigencia y scope | intención o consentimiento |
| Radar | snapshot y contrato de Sesión | schema, HEAD, digests y correspondencia | estados, cola, capacidad o territorio |
| Chanks | coordinación de Sesión y Encargo propuesto/revalidado | schema, fuentes y autoridad | juicio de producto ausente |
| Política | delivery y límites operativos | versión y aplicabilidad | preferencia de entrega |
| Gentle AI RDD | resultado/continuación nativa que el proveedor exponga | identidad del candidato y comprobante externo disponible | verdict, corrección, consentimiento, receipt, `FINALIZE` o permiso de entrega |
| Git/host | atestación de efecto | identidad, actualidad y causalidad | ejecución remota |
| Documentación/plan | evidencia de registro y cierre | commit, ancestry y snapshot Radar | modificación de `plan.yaml` |

Tower admite o rechaza comprobantes. No deriva un comprobante a partir de prosa del agente.

## 11. Harness Pi, skills, adapters y UI

### 11.1 Chanks permanece en el harness

Las skills conservan:

- descubrimiento y explicación;
- decisiones y coordinación de producto;
- preparación del Encargo y del alcance autorizado;
- forma de presentar bloqueos;
- comportamiento manual Tower OFF.

La Sesión nativa no agrega campos raíz ni encabezados extra de ruta, criterios o checklist técnico a esa coordinación: el resultado y las restricciones verificables siguen en el Encargo. Los checks y la evidencia esperada que el paquete estructure se derivan del resultado aprobado y del proveedor técnico; no duplican planificación nativa ni inventan autoridad de producto. Su salida hacia Tower debe referenciar el contrato admitido y el registro técnico del proveedor cuando corresponda, no ser un bloque de instrucciones que el agente vuelve a interpretar.

### 11.2 El harness Pi

Responsabilidades:

- detectar la intención pública aprobada;
- consultar el modo Tower de forma tipada;
- en OFF, seleccionar el camino manual sin afirmar garantías Tower;
- en ON, invocar `inspect/start/status` semánticos;
- materializar el paquete sellado para el agente;
- devolver evidencia estructurada;
- mostrar prompts humanos sin alterar tokens;
- renderizar estado autoritativo.

No responsabilidades:

- elegir la próxima transición;
- abrir `tower.db`;
- marcar una Ejecución completa porque terminó una llamada;
- convertir texto libre en autoridad.

### 11.3 Adapters de host

Los adapters no son sólo vistas. Pueden:

- abrir/cerrar procesos;
- adjuntar UI;
- ejecutar Git o tests;
- observar liveness;
- producir atestaciones.

El core decide cuándo y con qué binding. El adapter no decide si corresponde ni persiste la transición.

**Evidencia del contrato de efectos actual:** `hosts/launch-worker.mjs:6-29`, `hosts/runtime-port.mjs:69-151`, `hosts/production-provider.mjs:233-273`.

### 11.4 UI y emojis

- `💪 Chanks`: actividad del método/harness.
- `🗼 Torre`: operación o estado informado por Tower.
- Gentle AI conserva su identidad visual nativa.
- Main manual con Tower OFF no se etiqueta como Torre.

La UI debe distinguir:

```text
la llamada terminó ≠ el efecto terminó ≠ la Ejecución cerró
```

## 12. Convergencia de stores

### 12.1 Decisión

`tower.db` es la raíz canónica porque ya posee:

- transacciones multi-entidad;
- WAL y writers serializados;
- CAS e idempotencia;
- migraciones ancladas;
- historia de transiciones;
- claim, delivery, effect boundary y recovery.

### 12.2 Papel temporal de `main-store`

`main-store` no se borra al inicio. Se convierte en proyección de compatibilidad para consumidores todavía no migrados.

Regla:

```text
SQLite commit
  ├─ estado autoritativo
  ├─ transición
  └─ outbox event
          ↓
proyector idempotente
          ↓
JSON compatible
```

Si la proyección falla, queda pendiente. No se revierte ni duplica la transición autoritativa.

### 12.3 Migración segura

1. Inventariar JSON reales por path, bytes, digest, revisión y tipo.
2. Distinguir fixture/residuo de estado productivo.
3. Definir transformadores versionados hacia eventos/snapshots SQLite.
4. Importar idempotentemente.
5. Comparar readback canónico.
6. Cambiar consumers para leer proyección derivada o API Tower.
7. Dejar JSON read-only durante compatibilidad.
8. Retirar writer/consumer legacy sólo con journeys verdes y rollback probado.

### 12.4 Split-brain actual

Hay dos convenciones de path:

```text
<git-common-dir>/control-tower/tower.db
<git-common-dir>/control-tower/main-store/
```

Enrollment/support llaman “main store” al primero, mientras production provider usa el segundo.

**Evidencia:** `enroll/index.mjs:92-100`, `support/manifest.mjs:92-98`, `hosts/production-provider.mjs:190-203`.

## 13. Qué simplifica y qué amplía

### Simplifica

- Main deja de ser una máquina de estados humana.
- El transcript deja de ser la memoria operativa.
- ON deja de inyectar la skill completa para decidir ruta.
- Hay un solo store autoritativo.
- ACK, retry, pause, recovery y cierre dejan de ser prohibiciones conversacionales.
- Herdr e Intercom vuelven a ser transporte/vista, no autoridad accidental.
- UI y diagnóstico consultan la misma proyección.
- La instalación puede comprobar una unidad coherente.
- El modo OFF queda claramente separado, sin una “Torre reducida” escondida.

### Amplía

- Nuevo aggregate Execution sobre el handoff existente.
- Schemas para packet, evidence y receipts externos.
- API/IPC estable para inspect/start/status/admission/recovery.
- Outbox y proyección de compatibilidad.
- Adapters de efecto uniformes.
- Migración verificable del estado JSON.
- Journeys end-to-end del harness al cierre.
- Observabilidad y explicación de bloqueos/recovery.
- Version negotiation entre harness, engine, contracts y adapters.

La ampliación inicial es real. La ganancia es que esa complejidad deja de repetirse en contexto y pasa a una sola implementación verificable.

## 14. Impacto sobre las Sesiones existentes

Esta sección conserva el **mapeo propuesto por la investigación original**, no una edición ni una enmienda aprobada. Los estados se citan según Radar en el `HEAD` original y deben reconsultarse contra las reglas actuales antes de planificar. La validación siguiente debe separar el resultado que conviene preservar de cambios de mecanismo, evidencia o dependencia; en especial, no debe asumir que `S1.19` o `S8.12` conservan el mismo contrato técnico.

### 14.1 Mantener separadas y sin absorber en Tower V1

| Sesión | Recomendación | Motivo |
|---|---|---|
| `S143` | Mantener | Entrega controles Chanks verificables sin efectos y con Tower OFF; es el lado declarativo/manual que la arquitectura preserva |
| `S144` | Mantener | Prueba controles efectivos en Pi con Tower OFF y separa explícitamente `agent-workflows/` del adapter Tower |
| `S146` | Mantener | Coordina el método manual, workers y Cimientos sin fabricar persistencia Tower |
| `S123` | Mantener | Horizonte pertenece a Radar + Support + humano + escritor del plan, no al runtime Tower |
| `S117` | Mantener como trabajo no relacionado | Extrae registros de instalación para respetar Zonas; no cambia autoridad runtime |

### 14.2 Revalidar antes de cualquier propuesta de enmienda

| Sesión | Resultado que la investigación propone preservar | Mecanismo, evidencia o dependencia a revalidar contra las reglas actuales |
|---|---|---|
| `S1.19` | Regresión Pi-first, prolonged run, broker crash y cinco clientes | Confirmar si el contrato debe cubrir engine → packet → adapter → comprobante externo, o si el territorio/resultado actual exige otra separación; no tratarlo como enmienda aprobada |
| `S2.9` | `torre enroll` explícito y `torre on` activation-only | Evaluar compatibilidad/identidad del engine único y cualquier raíz mutable sin cambiar alcance por inferencia |
| `S4.12` | Quiescencia, successor impredecible y replay idempotente | Contrastar continuidad en Execution con el registro técnico ODD/SDD y evidencia externa; OpenSpec/Engram no se vuelven runtime Tower por esta nota |
| `S7.1` | Piloto terminal Pi-first aislado y candidato único | Determinar después si el recorrido completo engine, packets, comprobantes externos, adapters, UI y cierre pertenece a este resultado o a dependencias separadas |
| `S8.12` | Bundle exacto, versionado y fail-closed | Verificar la frontera de bytes entre engine, harness Pi y assets Chanks antes de alterar membresía o declarar módulos necesarios |
| `S8.13` | Preflight, activación y rollback aislados | Evaluar negociación de versiones y coherencia de store/migración sin adelantar una implementación |
| `S9.7` | Route padre y triggers públicos ya aprobados | Contrastar ON como adapter delgado hacia inspect/start/status y OFF con skills manuales frente al Encargo nativo vigente |
| `S9.8` | Fire-and-forget, terminales ligados y cero crédito por pane/candidato parcial | Evaluar packets y comprobantes del core sin convertir dispatch/terminales en planificación narrativa de Main |
| `S107` | Efecto Herdr, readback exacto y protección de recursos extranjeros | Contrastar que el adapter ejecute/atestigüe y que intención/attempt/transición permanezcan en el engine, sin asumir un cambio de `hosts/` |
| `S108` | Witness + estado terminal exacto antes de cerrar | Evaluar separación entre decisión Tower y efecto Herdr, y la evidencia externa disponible |
| `S119` | Skill explícita de runtime Herdr y ownership `producto-torre` | Evaluar una skill delgada que solicite/proyecte sin decidir lifecycle ni tocar Herdr raw/store |
| `S121` | Session ID Main-validado y witness durable | Determinar si binding canónico en Execution/packet SQLite y JSON como proyección preservan el resultado; sigue abierto, sin archivo ni reemplazo automático |

### 14.3 Mantener posterior, sin convertirlo en prerrequisito (provisional)

| Sesión | Recomendación |
|---|---|
| `S109` | Conservar su resultado V2 de ventanilla única y no reimplementar Radar. Más adelante puede consumir el API/status del engine, pero no se adelanta su prioridad ni se vuelve requisito para crear la máquina básica |

### 14.4 Lo que no se hace con el plan

- No se renumera ninguna Sesión.
- No se archiva `S121` silenciosamente.
- No se mueve trabajo V2 a Torre V1 por inferencia.
- No se cambia prioridad de `S143–S146`.
- No se inventan IDs para resultados faltantes.
- No se modifica `plan.yaml` desde este documento.

## 15. Resultados futuros todavía no planificados

La lista siguiente es un inventario técnico provisional de resultados faltantes detectados por la investigación original. No equivale a diez Sesiones nuevas, no asigna IDs, prioridad, Área ni Encargos, y no habilita ejecución. La próxima validación puede preservar un resultado, cambiar su mecanismo/evidencia/dependencia, agruparlo coherentemente o descartarlo con evidencia; recién después el humano puede aprobar un delta exacto de plan.

El próximo trabajo de planificación, si recibe esa aprobación, debe ubicar por territorio real resultados independientes para:

1. **Execution root y schema SQLite:** aggregate, transición, phase/state, external receipt refs y migración.
2. **Contratos compartidos:** Execution, sealed packet, structured evidence, decision envelope y external receipt.
3. **API/IPC Tower:** inspección pura, creación, status, admisión, decisión y recovery.
4. **Outbox y proyección JSON:** compatibilidad de `main-store` sin dual-write.
5. **Harness Pi ON:** contrato Chanks → Tower y packet → actor → evidence.
6. **Adapters de efecto:** host, Git/delivery, tests y observación, todos sin acceso directo al store.
7. **Admisión RDD:** consumir identidad/resultado nativo sin duplicar su lifecycle.
8. **Closure receipts:** delivery, documentación y Radar final sin escribir plan desde Tower.
9. **Journeys end-to-end:** happy path, decisión humana, bloqueo, crash, stale result, recovery y cierre.
10. **Retiro legacy:** console/directives, writers JSON, plugin mutador y rutas de compatibilidad sólo después de evidencia.

Estos resultados cruzan varias Zonas y superan ampliamente la referencia de 400 líneas. No deben comprimirse en una sola Sesión o commit. La descomposición exacta pertenece al futuro flujo de planificación y debe respetar Zonas y Cimientos reales.

## 16. Choques concretos

Los hallazgos fechados de código de esta sección conservan su evidencia de la investigación original, y las decisiones humanas confirmadas —incluidas las once de §3— no se reabren. No enmiendan Sesiones ni prevalecen sobre el canon nativo actual: su aplicabilidad presente y, cuando corresponda, su mecanismo, evidencia y dependencias se revalidan antes de cualquier propuesta de plan.

### 🔴 C1 — El plugin OpenCode abre el store directamente

**Choca con:** Tower como único mutador.

**Evidencia:** `plugin/tower-spike.js:171-227`.

**Contamina:** autoridad, recovery y compatibilidad multi-host.

**Resolución derivable:** el plugin queda como adapter/cliente del API Tower; no construye `mainStore`.

### 🔴 C2 — Dos raíces persistidas

**Choca con:** un único history ledger.

**Evidencia:** `core.mjs`, `main-store/store.mjs`, `enroll/index.mjs:92-100`, `hosts/production-provider.mjs:190-203`.

**Contamina:** launch, Jornada, autorizaciones, recovery e instalación.

**Resolución confirmada:** `tower.db` canónico; JSON como proyección temporal.

### 🔴 C3 — Pi inyecta la skill completa en ON

**Choca con:** paquetes sellados y próxima transición Tower-owned.

**Evidencia:** `extensions/pi/tower-session-router.ts:206-283`.

**Contamina:** `S9.7`, tamaño de contexto y determinismo.

**Resolución derivable:** el harness envía solicitudes/contratos; la skill completa queda para metodología y OFF.

### 🔴 C4 — La consola valida y luego delega criterio al agente

**Choca con:** el engine ejecuta la transición.

**Evidencia:** `console/executor.mjs:8-24`.

**Contamina:** comandos CV, cierre y errores.

**Resolución derivable:** consola/UI llama al API Tower y muestra su resultado.

### 🔴 C5 — El payload instalado omite módulos necesarios

**Choca con:** una unidad runtime coherente.

**Evidencia:** `install/runtime-payload.mjs:34-66`.

**Contamina:** `S8.12`, `S8.13`, launch y recovery.

**Resolución:** revisar membresía después de fijar engine/harness/adapters; no copiar directorios enteros sin contrato.

### 🟠 C6 — Policy hardcodea hosts y horizonte

**Choca con:** policy como autoridad externa versionada.

**Evidencia:** `policy/jornada.mjs:6-37`.

**Contamina:** elegibilidad y expansión de hosts.

**Resolución:** Tower hace cumplir una policy ligada; no decide por hardcode permanente qué hosts o riesgo son aceptables.

### 🟠 C7 — La arquitectura exploratoria anterior describe otra autoridad

`docs/architecture/sdd-tower-implementation.md` presenta una Torre principalmente de transporte y un policy agent separado. El propio documento se declara exploratorio y no aprobado como runtime contract.

**Choca con:** las decisiones confirmadas aquí sobre Ejecución, transitions y packets.

**Resolución:** conservarlo como antecedente hasta decidir su archivo o nota de supersesión; no usarlo como especificación paralela.

### 🟠 C8 — No existe journey completo

Hay tests por componente, pero no evidencia de un recorrido:

```text
contrato Chanks → Execution → packet → actor → evidence
→ RDD → delivery → documentación → closure
```

**Contamina:** cualquier declaración de Torre V1 funcional.

**Resolución:** `S1.19` y `S7.1` deben apoyarse en journeys reales del nuevo engine.

### 🟠 C9 — La badge describe la llamada, no la Ejecución

**Evidencia:** `extensions/pi/tower-session-router.ts:74-115`.

**Resolución:** renderizar la proyección firmada por Tower y distinguir llamada, efecto y cierre.

### 🟠 C10 — Hay consumer instalado sin writer equivalente

El payload incluye `main-store/launch-consumer.mjs`, pero no el writer completo de `main-store`.

**Evidencia:** `install/runtime-payload.mjs:34-66`.

**Resolución:** eliminar el wiring huérfano al converger en SQLite/outbox; no añadir otro writer independiente.

## 17. Orden derivado de migración

Esta es una secuencia técnica provisional derivada de la investigación original; no es una ruta ODD/SDD, no asigna Sesiones ni prioridades y no fija un frente de ejecución. El horizonte de planificación de dos Sesiones sólo limita la planificación futura aprobada: nunca autoriza ejecutar, adelantar ni congelar una Sesión futura.

### Paso 0 — conservar el camino manual

- No tocar `S143/S144/S146` para acelerar Tower V1.
- Mantener Tower OFF funcional y explícito.
- No activar globals reales.

### Paso 1 — contratos antes que efectos

- Execution, packet, evidence y external receipt.
- Serialización canónica, límites, digests y version negotiation.
- Fixtures y compatibilidad sin writers productivos.

### Paso 2 — raíz Execution en SQLite

- Nueva migración transaccional de `tower.db`.
- Aggregate, historia, CAS, idempotencia y status.
- Vincular sin reemplazar el lifecycle `ct_handoff`.

### Paso 3 — packets hijos

- Handoff referencia Execution.
- Next transition se calcula desde estado persistido.
- Result admission rechaza stale/duplicate/foreign.

### Paso 4 — autoridades externas

- Radar, humano, policy, RDD, Git/host y cierre.
- Receipts ligados y decisión humana cerrada.
- Cero juicio de producto dentro del reducer.

### Paso 5 — outbox y compatibilidad

- Proyección SQLite → JSON.
- Inventario/import de estado existente.
- Consumers legacy continúan temporalmente en read/projection mode.

### Paso 6 — harness Pi

- ON invoca engine; OFF conserva skills.
- No inyectar toda la skill para decidir lifecycle ON.
- UI proyecta `status` real.

### Paso 7 — adapters de efecto

- Host/Herdr/Pi/OpenCode.
- Tests/builds.
- Git/delivery.
- Todos devuelven attestations y carecen de acceso mutador al store.

### Paso 8 — review, delivery y closure

- Integrar RDD como autoridad externa.
- Diferenciar approval, effect y reconciliation.
- Cerrar sólo con documentación y Radar final comprobados.

### Paso 9 — packaging e instalación

- Bundle completo y exacto.
- Preflight de compatibilidad.
- Activación/rollback aislados.
- Sin distribución global antes de su autorización separada.

### Paso 10 — journeys y piloto

- Crash/replay/stale/duplicate.
- Cinco clientes dentro del claim existente.
- Camino completo Pi-first.
- Recovery y rollback.

### Paso 11 — retiro

- Quitar writers JSON independientes.
- Quitar mutación desde plugins.
- Retirar console/directives que dupliquen el API.
- Marcar la arquitectura exploratoria anterior como supersedida o histórica.
- Retirar compatibilidad sólo tras readback y rollback probados.

## 18. Verificación necesaria

### Contratos

- canonical bytes y domain separation;
- rechazo de unknown fields/version;
- límites de tamaño;
- credential-free payloads;
- roundtrip y digest drift.

### SQLite

- migración y rollback de DDL;
- concurrent writers;
- CAS stale;
- replay idempotente;
- outbox crash antes/después de commit;
- import JSON repetido;
- recuperación de proyección.

### Execution/packet

- una Execution, varios packets;
- packet correction conserva root;
- resultado tardío/duplicado/foreign;
- pause/block/resume/recover;
- estado terminal irreversible;
- fase y estado no se contradicen.

### Adapters

- efecto sólo con binding vigente;
- efecto incierto no se reintenta a ciegas;
- atestación falsa/stale falla;
- ningún adapter muta store;
- host heterogéneo respeta el mismo contrato.

### Harness/UI

- triggers públicos exactos;
- ON/OFF/INDETERMINATE;
- no model turn ante rechazo local;
- badge derivada de status;
- prompt humano lossless;
- ninguna skill completa decide el lifecycle ON.

### End-to-end

- happy path completo;
- decisión humana;
- worker crash;
- broker crash;
- delivery incierta;
- registro posterior a publicación;
- documentación y closure;
- Tower OFF no toca `tower.db`;
- instalación/rollback en HOME aislado.

## 19. Lo que no se toca

- Radar sigue siendo dueño del cálculo de planificación.
- `openspec/plan.yaml` sigue siendo la única autoridad editable del plan.
- El humano sigue eligiendo trabajo y resolviendo decisiones que le pertenecen.
- Chanks conserva metodología, skills y camino manual.
- Gentle AI conserva RDD y sus bindings nativos.
- La política del repositorio conserva delivery.
- Git y hosts conservan la verdad sobre efectos reales.
- `product/tower/generic/**` permanece histórico e inmutable.
- No se crea un segundo plan, `STATUS.md` ni `master-index.md`.
- No se convierte el packet runtime en un nivel del plan.
- No se afirma soporte por encima de la capacidad ya medida.

## 20. Incertidumbres conservadas

1. No se ejecutó la suite durante esta investigación; se verificó presencia y wiring estático, no salud operacional.
2. No se inspeccionaron las tablas del `tower.db` local ni se clasificaron sus registros reales para migración.
3. Los nombres exactos de comandos, schemas y estados públicos requieren diseño posterior; las semánticas sí están fijadas.
4. La partición exacta de los resultados futuros por Zona debe resolverse mediante el flujo de planificación y Radar.
5. No se comprobó una instalación XDG completa ni el contenido efectivo de una release activa.
6. El árbol puede avanzar después del `HEAD` observado; toda planificación debe recapturar Radar y Git.

## 21. Retoma recomendada y límites

Este checkpoint sólo alineó el informe con el método vigente. No modificó globals, skills, `AGENTS.md`, `openspec/config.yaml`, `openspec/plan.yaml` ni `openspec/ROADMAP.md`. Las cuatro copias personales de `PLAN-NAMING` que aún usan cuatro niveles se reportan como seguimiento: ese wording residual no es autoridad fresca de arquitectura ni prueba de que la configuración SPEC-DRIVEN/SDD de Módulo/Tarea gobierne ODD. Los archivos congelados siguen siendo archivo histórico.

La retoma recomendada es:

1. Leer este informe alineado completo y el canon vigente: `AGENTS.md`, `agent-workflows/skills/_shared/plan-naming-convention.md` y `agent-workflows/skills/chanks-4-puente/SKILL.md`.
2. Revalidar de forma read-only contra `HEAD` actual los contratos Radar afectados, primero con:

```sh
$HOME/.local/bin/radar status --json -C /home/<usuario>/projects/control-tower/Main
```

3. Reconsultar con `radar sesion <ID>` sólo las Sesiones que el delta potencial afecte; contrastar el `HEAD` nuevo con la investigación original `ebc2ffb840030f7266a207536134c057a82bec70` y este checkpoint `1658444ff52cddba3516f7e4e39bd314ccd21cdc`.
4. Distinguir para cada impacto el resultado a preservar de cualquier cambio de mecanismo, evidencia o dependencia; en particular revalidar `S1.19` y `S8.12`, sin suponer que su contrato sigue igual ni exigir una reescritura automática. Mantener `S143/S144/S146` como camino manual y `S109` posterior, sin usarlos como contenedores accidentales ni prerrequisitos de Tower V1.
5. El humano elige el orden de los deltas acotados posteriores —por ejemplo, planificación o reconciliación de configuración, skills e instrucciones— y aprueba cada uno por separado. Un delta de `plan.yaml` requiere su aprobación humana específica; el horizonte de dos Sesiones no crea un frente de autoejecución.
6. Validación read-only posterior permanece permitida. Diseño, ODD/SDD, código, checks de implementación o cambios de runtime sólo empiezan con autorización separada.

No implementar desde `docs/architecture/sdd-tower-implementation.md` como si fuera autoridad vigente; es antecedente exploratorio. Esta alineación no declara preparación, salud runtime ni tests ejecutados.

### Resultado esperado del próximo paso

Uno o más deltas acotados, cada uno todavía sujeto a aprobación humana, que:

- preserven IDs y decisiones existentes;
- distingan resultados de mecanismos, evidencia y dependencias a cambiar;
- no conviertan los diez hallazgos en diez Sesiones;
- respeten prioridades, dependencias, Zonas, Cimientos y el horizonte vigente;
- dejen cada Sesión nativa con coordinación real y el Encargo de cuatro partes, sin una jerarquía técnica paralela.
