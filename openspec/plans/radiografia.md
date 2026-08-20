---
verified_against: 7a2b88a94eb75201eddb9e66c1a8b0c3dfb5af97
verified_at: 2026-08-20
standfirst: Dónde está el producto hoy, qué se movió, y las cinco decisiones que dependen de vos. Las cifras se miden solas contra el código; el juicio de abajo se escribe a mano y lleva estampado contra qué commit se verificó.
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

Vos dirigís varios agentes de IA trabajando en varios proyectos a la vez. Hoy eso se degrada: cada sesión pierde el contexto, dos agentes pisan el mismo archivo, y vos tenés que estar sentado frente a la terminal para que algo avance. La Torre reparte el trabajo, guarda el estado en disco en vez de en la conversación, impide que dos agentes escriban lo mismo, y cuando aparece una decisión que es tuya, frena y te la manda al celular. **La versión 1 se declara terminada cuando podés aprobar una decisión desde el teléfono.** Ese es el corte, y no es una feature más: es la definición de "listo".

## El veredicto en tres frases

### 1 · sólido · Los cimientos están bien construidos y muy bien probados
Lo técnico: La suite corre en verde y las líneas de test superan a las de producto. Las piezas de seguridad —autoridad, candados, contratos versionados, frenar ante la duda— están hechas con un rigor poco común: el sistema prefiere detenerse a adivinar.

### 2 · crítico · El módulo que arma las decisiones para vos sigue sin que nadie lo llame
Lo técnico: Todo `escalation/` —tres archivos, con sus tests en verde— tiene cero llamadores en el producto. Ningún comando de `bin/torre` lista decisiones pendientes, y el módulo no viaja en el instalable.

### 3 · estructural · No hay medio producto sin empaquetar: hay dos productos que no se hablan
Lo técnico: `core.mjs`, el corazón de lo instalado, no importa un solo archivo del repositorio — sólo módulos de Node y de Bun. Ninguno de los archivos que quedan afuera es usado por lo que sí se instala. Agregarlos a la lista instalaría código muerto. El contador de arriba mide exactamente eso.

## Avance por Plan

Un Plan agrupa Sesiones; una Sesión es una entrega verificable. El porcentaje cuenta Sesiones cerradas sobre Sesiones enumeradas — el trabajo en curso suma cero hasta que cierra. La tabla sale del índice maestro y se actualiza sola.

{{avance}}

## La cola de ejecución

Una Sesión entra en esta cola sólo si toda su cadena de dependencias está satisfecha. Nada acá espera una decisión tuya. El detalle de qué entrega cada una vive en `openspec/plans/master-index.md`.

{{cola}}

## Los cinco problemas de fondo

### A · crítico · El escalamiento está escrito, probado y apagado
Lo técnico: No falta transporte remoto. Con Moshi como control remoto de la máquina, el modo local es el correcto. Lo que falta es que algo llame al módulo y algo lo muestre: `escalation/{request,routing,parking-composition}.mjs` no tiene un solo llamador fuera de sus tests.
En simple: La Torre sabe armar la pregunta perfecta —con evidencia, opciones y consecuencias— y sabe qué hacer con tu respuesta. Pero nadie le pide que la arme, y no hay ninguna pantalla donde aparezca. Sigue teniendo dueño: `S5.5`, que le da su primer consumidor.
Evidencia: Cero llamadores fuera de `test/` · ausente de `RUNTIME_PAYLOAD_FILES` · `S5.5` 🟢 LISTO

### B · estructural · Son dos productos en un repositorio, sin un solo cable entre ellos
Lo técnico: El payload instalado es import-closed y funciona. Lo medido es otra cosa: ninguno de los archivos no instalados es importado por el payload. `core.mjs`, el 74% de lo que se instala, importa exclusivamente `node:*` y `bun:sqlite`. Quedan afuera `contracts/`, `registry/`, `escalation/`, `capabilities/`, `console/`, `workspace/`, `enroll/`, `policy/`, `continuation/`, `supervision/`, `delivery/` —recién entregado con `S5.2`—, el `dashboard/` y casi todo `main-store/`.
En simple: Hay dos autos en el taller. Uno anda y es el que se entrega. El otro está impecablemente construido, pieza por pieza, y no tiene el motor conectado a nada. Abrir el camión no arregla nada: llegarían piezas sueltas. El trabajo real es enchufar esos módulos, y sigue sin estar enumerado ni asignado.
Evidencia: Decisión 54 · `S8.9` 🟢 cubre el envío, no el cableado · cada Sesión que cierra agranda la brecha: `S5.2` bajó el share instalado

### C · nuevo · La documentación del plan afirmó cosas falsas sobre el código dos veces en una semana
Lo técnico: `M9.1.1` figuraba `✅ COMPLETO` y su código no existe en `master`. Y la auditoría de deudas atribuyó un hallazgo de `S5.2` a un archivo que la propia Sesión tiene prohibido tocar.
En simple: El tablero que usás para saber dónde estás se puede desincronizar del taller sin que nadie se dé cuenta, y las dos veces empujó hacia parecer más avanzado de lo que estaba. Se detectaron por auditoría manual, no por una alarma. Este informe existe para reducir eso: las cifras ya no las escribe nadie.
Evidencia: Decisión 50 · corrección de la decisión 46 en `plan-5/STATUS.md:199`

### D · deuda · `core.mjs`: 4.646 líneas que no son de nadie
Lo técnico: Un solo archivo concentra el 40% del código de producto y el 74% de lo que se instala, y no importa nada del repositorio. Ningún Plan lo reclama. Al mismo tiempo, los módulos que nombran las capacidades centrales son los más chicos: `continuation/` tiene 35 líneas y `jornada/` tiene 144.
En simple: Lo que corre todos los días es una pieza gigante y vieja; lo que se está construyendo con todo el rigor son piezas nuevas, chiquitas y desconectadas. El andamio está desplegado y el edificio no. Es la misma raíz que el problema B mirada desde el otro lado: mientras nadie parta esa pieza, no hay dónde enchufar lo nuevo.
Evidencia: Sin dueño enumerado en ningún Plan

### E · ritmo · Se documenta más del doble de lo que se construye
Lo técnico: El ratio de líneas de documentación sobre producto está en el instrumento de arriba, y el pie de página trae el reparto de commits de las últimas horas. El `dashboard/` sigue leyendo de `mock-fixtures.mjs`: nunca se le conectó una fuente real.
En simple: El proceso es riguroso y eso es lo que hace que el sistema sea confiable — pensar en papel encontró un Módulo fantasma y corrigió un diagnóstico entero. Pero también es caro. No está mal en sí; está mal si no lo elegiste a conciencia. Es la palanca más grande que tenés para que lo que falta tarde meses o semanas.
Evidencia: `dashboard/sources/` sólo mock

## Decisiones que dependen de vos

Ordenadas por cuánto destraban. Ninguna la puede tomar un agente: las cinco caen en clases que siempre escalan —contrato visible del producto, alcance, seguridad o irreversibilidad.

#### 1 · el problema A · define la versión 1 · Dónde se te muestra una decisión pendiente
El contexto: es la que define cuándo la versión 1 está terminada. No hace falta construir transporte; falta que algo llame al módulo y algo lo muestre. `S5.5` resuelve la mitad. Queda decidir la superficie donde la ves.
- A · **Arrancar `S5.5` y agregarle un `torre decisiones`.** Un comando que lista lo estacionado y te deja responder. Es lo mínimo que te hace ver la pregunta desde Moshi, y cabe en la Sesión que ya está lista. → recomendada
- B · **Arrancar `S5.5` tal como está y decidir la superficie después.** Respeta el alcance sellado. La decisión queda en disco y visible sólo leyendo el archivo.
- C · **Conectarlo al `dashboard/` que ya existe.** Hay un tablero autenticado que hoy lee datos falsos. Es más trabajo, y ese tablero es uno de los módulos que no se instalan ni están enchufados a nada.

#### 2 · el problema B · sucesora de la decisión 54 · Quién enchufa al producto la mitad que hoy no está conectada
El contexto: ya le diste dueño a la mitad "enviar" con `S8.9`. La medición dejó claro que esa mitad no arregla el fondo: los archivos no instalados no los usa nadie. La mitad "cablear" sigue sin enumerar, y es la brecha más grande del proyecto medida en líneas.
- A · **Enumerar un Plan de cableado con inventario primero.** Antes de escribir código, clasificar cada archivo en tres cajones: va al producto y falta enchufar, es andamio interno, o se borra. Cuesta una sesión de análisis y evita construir puentes hacia código que no debería existir. → recomendada
- B · **Que cada Sesión futura enchufe lo suyo al cerrar.** Cero coordinación. Pero es exactamente el mecanismo que produjo esta brecha: nadie es dueño del conjunto y nunca cierra.
- C · **Esperar al examen final (`S7.1`) y que él mida el hueco.** Lo hace con datos duros, pero llegar al examen de salida con la mitad del repositorio desconectada lo convierte en un informe de daños.

#### 3 · deuda con dueño perdido · El candado huérfano de `main-store/store.mjs`
El contexto: si el proceso que toma ese candado muere de golpe, el archivo del candado queda para siempre y esa parte del almacén no se puede volver a escribir nunca. Se creyó que se arreglaba dentro de `S5.2` y se verificó que era falso: son dos candados distintos que se parecen, y ese archivo está prohibido dentro de `S5.2`.
- A · **Un arreglo puntual autorizado fuera de Sesión.** Es un cambio chico y localizado, del mismo tamaño que el piso de puerto que ya aprobaste así, con test de borde propio. → recomendada
- B · **Enumerar una Sesión de deuda.** Más ordenado y auditable, pero mete un defecto real de pérdida de escritura detrás de cinco Sesiones.
- C · **Dejarlo abierto y documentado.** Cero trabajo hoy; el día que pase, esa parte del almacén queda inutilizable y hay que destrabarla a mano.

#### 4 · última decisión abierta del Plan 9 · Cuántos asientos de trabajo tiene el pool
El contexto: la capa de asientos quedó enumerada como `S9.4`. Falta un solo número. Cada asiento cuesta una instalación de dependencias, y por eso mismo aprobaste la caché compartida en la decisión 53. No bloquea a `S9.1`.
- A · **Tres asientos.** Cubre el patrón que ya usás: uno planificando, uno implementando, uno libre para una urgencia. Costo acotado y predecible. → recomendada
- B · **Cinco o más.** Deja lugar a campañas multiproyecto sin repensar el pool. Multiplica el costo de dependencias, que la caché amortigua pero no elimina.
- C · **Empezar con dos y crecer si molesta.** El mínimo que prueba que el mecanismo funciona. Si el pool es fijo por contrato, agrandarlo después puede no ser gratis.

#### 5 · no bloquea nada hoy · Si la Torre tiene que correr en Mac
El contexto: `hosts/production-provider.mjs` rechaza toda plataforma que no sea Linux, y no se puede aflojar: para garantizar que los bytes que verificó son los que ejecuta usa un mecanismo del sistema que macOS no tiene y Node no puede sustituir. El resto del producto sí es portable.
- A · **Dejarlo así: la Torre es Linux.** Cero trabajo, cero riesgo, y la garantía de seguridad se conserva intacta. → recomendada
- B · **Enumerar una Sesión de soporte macOS.** Habría que diseñar una garantía equivalente y probar que es igual de fuerte. Es trabajo de seguridad, no de portabilidad.
