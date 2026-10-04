# Piloto automático — implementación sin el mantenedor presente

> **Estado:** propuesta definida con el mantenedor el 2026-10-03. Nada está implementado.
>
> **Propósito:** dejar citable cómo debe trabajar la Torre cuando el mantenedor no está presente, qué decide cada herramienta y qué queda abierto.
>
> **Evidencia de código:** `control-tower@dafbaed` en `master`, por lectura. No se ejecutó ninguna prueba.
>
> **Límite:** este documento no reemplaza el plan ni el canon, no asigna IDs de Sesión y no autoriza implementación, instalación ni entrega. La división de versiones de la sección 12 es una decisión del mantenedor que todavía no se aplicó al plan.

## 1. El problema, con un caso real

La noche del 2026-10-02 al 2026-10-03 el mantenedor pidió continuar las Sesiones S195 a S202 sin estar presente: un commit por Sesión, sin subir nada, y ante una duda dejar una nota en Engram y pasar a la siguiente. Funcionó a medias:

| Qué pasó | Qué lo habría evitado |
|---|---|
| Las dudas quedaron en notas de Engram que Radar no ve. | Un estado del plan que muestre la duda. |
| Las Sesiones se cerraron localmente para destrabar las siguientes; Radar las mostraba como completas aunque nadie las había revisado. | Un estado propio para «terminado, sin revisar». |
| Nada limitaba cuánto trabajo se apilaba sobre algo no revisado. | Un límite que aplique una herramienta, no una instrucción. |
| Subir cambios exige al mantenedor presente. | Que la corrida nunca suba nada y deje todo listo para revisar. |

## 2. La promesa

> Mientras el mantenedor no está, la Torre implementa las Sesiones que Radar permite, frena ante lo que no puede decidir y deja cada resultado listo para revisar. Nada se sube sin el mantenedor.

## 3. Nombres

| Nombre | Qué es |
|---|---|
| **Piloto automático** | El modo de trabajo. Se prende solo a pedido del usuario. |
| **`piloto`** | La herramienta determinista que opera el modo. |
| **Vuelo** | Una cadena de Sesiones que dependen una de otra, con su propia rama y copia de trabajo. |
| **Ronda** | Un piso de la cadena: cuántas Sesiones sin revisar hay debajo. |
| **NOVEDAD** | Estado de una Sesión que se frenó por una duda. |
| **POR REVISAR** | Estado de una Sesión terminada que espera la revisión del usuario. |

Familia de nombres: Radar ve, la Torre autoriza, el piloto automático vuela y Pista hace aterrizar los cambios de a uno.

## 4. Decisiones del mantenedor (2026-10-03)

| # | Decisión | Consecuencia |
|---|---|---|
| P1 | El modo lo opera **`piloto`, una herramienta determinista aparte**, con la forma de Radar. | Los límites y las reglas son de código, no de instrucciones; un agente no se los puede saltar. |
| P2 | **Radar sigue siendo el único que calcula estados.** Lee las marcas de `piloto` como hoy lee las marcas de despacho. | No hay dos herramientas con dos opiniones sobre el mismo estado. |
| P3 | Límite por defecto: **3 rondas y un tope de 10 Sesiones** por corrida. Las rondas pueden ser 1, 2, 3 o sin límite; el tope es configurable. | Las rondas protegen la calidad; el tope protege el presupuesto. |
| P4 | **Radar propone los vuelos y el usuario aprueba**, igual que `chanks-3-paralelo`. | El usuario no calcula dependencias y conserva la última palabra. |
| P5 | Las rondas avanzan **por vuelo, sin esperar al más lento.** | Una Sesión arranca apenas sus dependencias están en POR REVISAR y queda dentro del límite. |
| P6 | **La regla de LISTO de Radar depende del interruptor.** | Ver sección 7. |
| P7 | **Ante la duda, el agente frena.** | Ver sección 8. |
| P8 | La revisión al volver es **en cascada desde la base de cada vuelo**, y se sube **una vez por vuelo**. | Ver sección 9. |
| P9 | **Apagar el modo nunca borra** NOVEDAD ni POR REVISAR. Solo impide crear estados nuevos. | El trabajo hecho siempre queda visible hasta revisarlo. |
| P10 | **Una Sesión que une dos vuelos no arranca con el piloto prendido.** Dividirla se difiere a V3. | Ningún vuelo depende de otro vuelo sin revisar. |
| P11 | **El vuelo es la unidad de trabajo de una conversación orquestadora**, con el piloto prendido o apagado. | Un solo concepto para repartir trabajo. Con el piloto prendido el vuelo apila pisos sin revisar; apagado, avanza de a una Sesión entregada. |
| P12 | **V2 · Piloto** ejecuta varios vuelos con **un orquestador por corrida y un subagente por Sesión**. El número de vuelos es configurable (1 o más). | El orquestador guarda solo resúmenes; el estado vive en `piloto` y Radar, así que una conversación nueva puede retomar. El mismo orquestador hace aterrizar los vuelos de a uno: V2 no necesita Pista. |
| P13 | **V3 · Flota** agrega una conversación aparte por vuelo, Pista, el despacho y la reserva segura. | Pista deja de ser V2. Corrige D4 de `pista-entrega-ordenada.md` y la tabla de `definiciones-v1-v2-v3.md`. |
| P14 | **Conexión:** Radar calcula estados y propone vuelos; `piloto` hace los cambios (interruptor, marcas, freno); la pantalla de la Torre (TUI) tiene los controles del usuario. No hay proceso siempre prendido. | La TUI hoy solo hace consultas de lectura a Radar (`product/tower/v1/tui/radar.go:29-44`); los controles de `piloto` se suman por separado. |

## 5. El modo

### Qué guarda

| Dato | Valor por defecto | Opciones |
|---|---|---|
| Interruptor | apagado | encendido / apagado |
| Rondas máximas | 3 | 1, 2, 3, sin límite |
| Tope de Sesiones | 10 | número o sin tope |

Vive en el directorio común de Git del proyecto, junto a las marcas de despacho de Radar. No va en `openspec/plan.yaml`: el plan dice qué hay que hacer; el modo es una situación pasajera de cómo se trabaja hoy.

### Despegue

Prender el modo es una lista de despegue, no solo mover el interruptor:

1. Radar propone los vuelos posibles con lo que está LISTO.
2. El agente lee el contrato de cada Sesión de esos vuelos y hace **antes de despegar** las preguntas que puede prever sin implementar.
3. El usuario ve el resumen, aprueba o quita vuelos, y confirma.
4. Despega.

En la terminal (instalador o pantalla de la Torre) el despegue se muestra con una cuenta regresiva: `Empezando vuelo... 3...2...1...🛫`. En el chat del agente sale como mensaje fijo:

```
🛫 Despegue confirmado — 3 vuelos · hasta 3 rondas · tope 10 Sesiones en el aire
```

### Cómo se apaga

| Cómo | Qué pasa |
|---|---|
| El usuario dice que volvió | El agente muestra cómo va (`2 vuelos en el aire, ronda 2 de 3`) y **sigue hasta aterrizar**. Volver no interrumpe. |
| Aterriza solo | Llegó al límite o no queda nada LISTO. Se apaga y deja el resumen: `🛬 Aterrizaje — 7 POR REVISAR · 1 NOVEDAD · 2 sin empezar`. |
| Freno de emergencia desde el instalador | Se apaga de golpe, sin aviso. |

El interruptor se consulta solo en los dos puntos por los que cada Sesión ya pasa por `piloto`: al arrancar (marca de EN CURSO) y al cerrar (NOVEDAD o POR REVISAR). No hay nada vigilando todo el tiempo. Con el freno puesto, ninguna Sesión nueva arranca y las que estaban en el aire no pueden cerrar normalmente: quedan como NOVEDAD · *interrumpida*. Lo que tenían escrito queda en la copia de trabajo de su vuelo.

## 6. Vuelos y rondas

- Cada vuelo tiene su rama y su copia de trabajo, por ejemplo `piloto/<fecha>/vuelo-S1`. Nunca escribe en la rama principal.
- Corren a la vez tantos vuelos como Radar permita, es decir, cuyas Zonas no choquen.
- Los límites de rondas y Sesiones son de la corrida entera, no de cada vuelo.
- La ronda de una Sesión es su piso: una Sesión cuyas dependencias están en POR REVISAR en el piso 1 queda en el piso 2.
- Una Sesión con NOVEDAD no destraba a nadie; el resto del vuelo y los demás vuelos siguen.
- El trabajo de una Sesión con NOVEDAD va a una rama aparte, para que nadie construya sobre algo a medias.

Ejemplo: S1 y S2 están LISTO. S1 destraba a S3 y S4; S2 destraba a S5 y S6.

```
Piso 1: S1, S2 → EN CURSO → POR REVISAR
        └ S1 termina a las 2:00 → S3 y S4 arrancan a las 2:00
        └ S2 termina a las 4:00 → S5 y S6 arrancan a las 4:00
Piso 2: S3..S6 → POR REVISAR o NOVEDAD
Piso 3: lo que destraben, si entra en el tope de Sesiones
Aterriza: límite alcanzado, nada LISTO, o freno de emergencia.
```

## 7. Estados

| Estado | Cuándo | Quién lo marca |
|---|---|---|
| 📋 PLANIFICADO | Faltan dependencias, o la Sesión quedaría por encima del límite de rondas | Radar |
| 🟢 LISTO | Ver la regla de abajo | Radar |
| 🔵 EN CURSO | Un agente la implementa | Radar, desde la marca de `piloto` |
| 🟠 NOVEDAD | Se frenó por una duda | Radar, desde la marca y el motivo de `piloto` |
| 🟣 POR REVISAR | Terminó; su commit está en la rama del vuelo y no se subió | Radar lo deduce de Git |
| ✅ COMPLETO | Revisada y subida | Radar, como hoy |

Notas de cada estado:

| Estado | Nota | Significado |
|---|---|---|
| NOVEDAD | *decisión delicada* | Había que decidir algo que el agente no puede decidir solo. |
| NOVEDAD | *no se pudo inferir* | Faltaba información o el contrato admitía dos lecturas. |
| NOVEDAD | *interrumpida* | Freno de emergencia, o el agente se cayó con la marca de EN CURSO viva. |
| POR REVISAR | *limpia* | El agente no decidió nada por su cuenta. |
| POR REVISAR | *con decisiones* | El agente tomó N decisiones menores, anotadas en el commit. |

NOVEDAD y POR REVISAR solo se pueden **crear** con el modo prendido; `piloto` rechaza el registro con el modo apagado.

### Regla de LISTO

- **Lo técnico:** hoy una Sesión es LISTO solo si todas sus dependencias están COMPLETO o ARCHIVADO (`agent-workflows/tools/radar/state.go:238`).
- **Con el piloto prendido**, una dependencia en POR REVISAR también cuenta, siempre que la Sesión quede dentro del límite de rondas.
- **Con el piloto apagado** vuelve la regla original. Una Sesión LISTO que nunca arrancó y depende de una POR REVISAR vuelve a PLANIFICADO: con el usuario presente nadie construye a mano sobre algo no revisado. Lo que ya se hizo no cambia de estado.

### EN CURSO vuelve

V1 dejó de registrar EN CURSO y conservó `radar marcar` y `radar desmarcar` para reusarlos (`docs/architecture/definiciones-v1-v2-v3.md`, B5). El piloto los necesita para contar qué está en el aire.

### Orden de atención

El orden de los estados decide **qué vuelo se abre primero**: un vuelo con alguna NOVEDAD antes que uno con todo en POR REVISAR, y ambos antes de lanzar trabajo LISTO. Dentro de un vuelo manda la cascada, no el estado: una NOVEDAD en el piso 2 puede depender de una POR REVISAR en el piso 1.

## 8. Cuándo frena el agente

| El agente… | Ejemplos | Resultado |
|---|---|---|
| Sigue y anota | Elegir entre dos caminos técnicos equivalentes; un nombre interno; cómo organizar el código dentro de su Zona | POR REVISAR · *con decisiones* |
| Frena: decisión delicada | Cambia lo que ve el usuario del producto; contradice el PRD, el contrato o una decisión anterior; algo irreversible o externo (subir cambios, publicar, configuración personal del usuario, pagos, seguridad); tocar fuera de su Zona | NOVEDAD · *decisión delicada* |
| Frena: no se pudo inferir | El contrato admite dos lecturas con resultados distintos; falta un dato que nadie definió; las pruebas o la revisión fallan y no se arreglan en una vuelta | NOVEDAD · *no se pudo inferir* |

**Zona gris:** si el agente duda entre seguir y frenar, frena. Pierde esa Sesión esa noche, pero los demás vuelos siguen y nunca se apilan pisos sobre una decisión que el usuario podía rechazar.

La corrida nunca sube cambios, nunca publica y nunca escribe en la configuración personal del usuario.

## 9. El regreso

1. **Aterrizaje.** El usuario ve el resumen.
2. **Qué vuelo primero.** Los que tienen NOVEDAD antes que los que tienen todo en POR REVISAR.
3. **Paralelo entre vuelos.** Se puede abrir una conversación orquestadora por vuelo y resolver vuelos distintos a la vez; cada uno ya tiene su rama y su copia de trabajo.
4. **Cascada dentro del vuelo.** Primero se contestan las decisiones de las NOVEDAD; después se revisa el código desde la base hacia arriba.
5. **Análisis de impacto antes de corregir.** Si una Sesión de la base necesita un arreglo, primero se mide su efecto sobre las Sesiones de arriba y se clasifica.
6. **Traslado del arreglo.** Las Sesiones de arriba se vuelven a aplicar sobre la base corregida (un commit por Sesión lo hace posible).
7. **Subida única.** Se sube una sola vez por vuelo, hasta la última Sesión aprobada de forma consecutiva. Si S1 y S3 están aprobadas y S4 es Grave, suben S1 y S3.

### Tipo de corrección

La pregunta que decide el tipo es: **¿el arreglo cambia algo que las Sesiones de arriba usan?**

| Tipo | Qué significa | Qué se hace |
|---|---|---|
| 🟢 Leve | El arreglo es interno, o arriba solo hay que cambiar algo mecánico | Se traslada el parche |
| 🟡 Medio | Las Sesiones de arriba adaptan su lógica, pero lo que hacen sigue sirviendo | Parche y nueva revisión de cada Sesión afectada |
| 🔴 Grave | La base sobre la que se construyó lo de arriba está mal | Esas Sesiones vuelven a LISTO y se rehacen |

Cuántas Sesiones afecta es un dato del informe («Medio, afecta a 4 Sesiones»), no lo que define el tipo. Cuatro Sesiones con una línea cada una es Leve; dos Sesiones que hay que rehacer es Grave.

## 10. Relación con Radar y Pista

| Herramienta | Su trabajo en este flujo |
|---|---|
| Radar | Calcula todos los estados, propone vuelos y aplica la regla de LISTO según el interruptor |
| `piloto` | Interruptor, límites, registro del vuelo, marcas de EN CURSO y NOVEDAD, ramas y copias de trabajo, freno |
| Pista | Hace entrar los vuelos revisados al repositorio de a uno |

- POR REVISAR se parece a la cola de Pista que espera autorización humana (`docs/architecture/pista-entrega-ordenada.md`, sección 4).
- La revisión en paralelo con un orquestador por vuelo produce subidas que compiten por la rama principal: es el caso de `ecom-ecuador` que motivó Pista. **El piloto necesita a Pista para aterrizar varios vuelos.**
- Un orquestador por vuelo, aun con el piloto apagado, coincide con la promesa de Pista: conversaciones independientes que entregan por una sola puerta.
- NOVEDAD y la regla de cuándo frenar no existen en Pista: son piezas nuevas.

## 11. Qué queda abierto

- **Sesión que une dos vuelos — resuelto el 2026-10-03.** Si S7 depende de S3 (vuelo A) y de S5 (vuelo B), con el piloto prendido S7 nunca arranca: queda PLANIFICADA hasta que el usuario revise los dos vuelos. Dividir esa Sesión para que cada vuelo conserve su continuidad se difiere a V3; dividirla durante el vuelo cambiaría el alcance aprobado, que por la sección 8 es una decisión delicada.
- **Orquestadores por vuelo con el piloto apagado — resuelto el 2026-10-03 (P11).** El vuelo es la unidad de trabajo también fuera del modo. La idea del mantenedor: se despliegan conversaciones orquestadoras propias (sesiones de Pi u otro agente) que implementan cada vuelo, y al volver se despliegan otras para revisar y destrabar los vuelos. Es el despacho que antes se pensaba vía Herdr, ahora con estructura: Radar propone vuelos, cada vuelo tiene rama y copia de trabajo, la reserva de `radar marcar` evita que dos conversaciones tomen la misma Sesión y Pista ordena la entrega. Qué parte entra en V2 y cuál en V3 se define en la revisión de versiones.
- **Punto de conexión — resuelto el 2026-10-03 (P14).**
- **Versión — resuelto el 2026-10-03 (P12, P13, sección 12).** Falta aplicarlo al plan y a los documentos de definición.
- **Límite de los subagentes sin verificar.** Si un subagente puede delegar a su vez en otros subagentes. No bloquea V2 porque el orquestador delega un subagente por Sesión.
- **Sin decidir del inventario:** la maquinaria de auditoría del motor viejo (`core.mjs`, `main-store/`) y la skill diferida `chanks-0-jornada`.
- **Nada está probado.** Es diseño sobre lectura de código.

## 12. Versiones

| Versión | Qué entra |
|---|---|
| V1 | Sin cambios: adopción project-local y paralelo dentro de una conversación. |
| **V2 · Piloto** | Estados NOVEDAD y POR REVISAR en Radar, regla de LISTO según el interruptor, la herramienta `piloto`, vuelos y rondas, despegue y aterrizaje, controles en la TUI. Varios vuelos con un orquestador y un subagente por Sesión. Revisión al volver en una conversación, vuelo por vuelo. |
| **V3 · Flota** | Una conversación aparte por vuelo (implementar y revisar), Pista, despacho (Herdr u otro), reserva segura en `radar marcar`, aviso de caídas, dividir Sesiones que unen dos vuelos. |

Comparación que llevó a la decisión:

| | 1 vuelo con subagentes | Varios vuelos con subagentes (V2) | Varios vuelos con conversaciones aparte (V3) |
|---|---|---|---|
| Avance por noche | Bajo | Alto | Muy alto |
| Contexto del orquestador | Muy holgado | Holgado (resúmenes, tope de 10) | Un millón por conversación |
| Si se cae el orquestador | Se cae todo | Se caen todos los vuelos | Solo ese vuelo |
| Necesita Pista | No | No | Sí |
| Necesita lanzar conversaciones | No | No | Sí |
| Complejidad | Baja | Media | Alta |

«1 vuelo» no es una versión aparte: es V2 con el número de vuelos en 1.

### Inventario de V2 y V3 actuales contra este diseño

Relevado el 2026-10-03 por lectura (sin ejecutar `radar`; estados del `ROADMAP.md` generado). Recomendaciones, no cambios aprobados al plan.

| Pieza | Hoy | Contra el piloto |
|---|---|---|
| S203 — interruptor por proyecto en el instalador | `pista-v2`, DIFERIDO | Cambia: distinguir el interruptor del piloto y el freno de emergencia |
| S4.12 — aviso si se cae Pi | `torre-v3`, DIFERIDO | Cambia: NOVEDAD · *interrumpida* en Radar |
| S9.8 — despacho sin espera | `torre-v3`, DIFERIDO | Cambia: un orquestador por vuelo (V3) |
| S107 — pestañas, una por Sesión | `torre-v3`, DIFERIDO | Cambia: la unidad es el vuelo (V3) |
| S165 — puente Pi–semáforo | `torre-v3`, DIFERIDO | Se borra: lo reemplazan `piloto` y Pista |
| S169 — mandato sellado de varias Sesiones | `torre-v3`, DIFERIDO | Cambia: aprobación de vuelos en el despegue y límites de rondas (V2) |
| `semaphore.mjs`, `continuation/`, `supervision/` | Código dormido | Se borra (se conserva la historia) |
| `delivery/` | Código de prueba | Se conservan las ideas; Pista se escribe nueva en Go |
| `radar marcar`, estado de Radar | Conservado | Cambia: reserva segura, identidad de vuelo, estados nuevos |
| `escalation/`, `console/`, adaptadores de Herdr y Pi | Código dormido | Cambia: NOVEDAD y cascada; llamadas directas a `piloto`; lanzamiento por vuelo |
| Skills diferidas: arranque, coordinador, despacho por Herdr, implementación desatendida | No instaladas | Cambian: vuelos, despegue y regla de NOVEDAD |
| Firma de la Torre, avisos de Pi, Pi Intercom | Instalados | Se conservan |
| `core.mjs`, `main-store/`, `chanks-0-jornada` | Dormidos | Sin decidir |

Desactualizaciones encontradas: `pista-entrega-ordenada.md` dice que V2 no tiene Sesiones, pero existe S203; las skills diferidas dicen «solo V2» y el instalador las clasifica V3.

## 13. Procedencia

- Definido en una conversación con el mantenedor el 2026-10-03, desde `control-tower`, a partir de la corrida nocturna del 2026-10-02 al 2026-10-03.
- Espejo en Engram: `tower/autopilot-mode-design` y las decisiones `tower/autopilot-mode-decisions-*`.
