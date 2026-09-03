# Migración al modelo de zonas

> **Constancia de trabajo.** Este archivo es la fuente de verdad de QUÉ estamos haciendo,
> qué está implementado localmente y qué falta. El razonamiento completo, con dibujos, está en
> el documento de decisión:
> https://claude.ai/code/artifact/e92d2b38-10ad-480d-b7b2-ba9cc68283ec
>
> La autoridad del flujo es [FLUJO-END-TO-END.md](FLUJO-END-TO-END.md). El reparto de tres
> escritores de [EJECUCION-EN-PARALELO.md](EJECUCION-EN-PARALELO.md) describe la construcción
> inicial y queda como historia útil; la corrección actual usa **un solo escritor secuencial**.
>
> Última reconciliación: 2026-09-03 · `agent-workflows` `feat/modelo-de-zonas@6245fad`, 22
> commits por delante del remoto, sin push. Las ocho correcciones C1–C8 están decididas;
> **cero decisiones del maintainer bloquean la corrección actual de Fase A**.

---

## 📍 Punto de retoma

**Cerrado localmente:** el candidato integrado de Fase A está en `752f532`. Control Tower tiene
cuatro commits locales en `master@72cebbe` —`4654ed8` gate documental, `3f0a7be` skill de entrega,
`11ad740` contrato de asset de rol v2/500 tokens y `72cebbe` tab MAIN determinista— con suite
registrada `1110/1110` y prueba viva Torre-OFF `1 → MAIN` sin crear panes. Herdr tiene el arreglo
fuente limpio en `fix/herdr-skill-contract@d8a22841`, y la copia runtime de Pi ya fue actualizada.
Las revisiones nativas de Control Tower (`review-81a34ccc70a174c1`) y Herdr
(`review-925c9e68544811fe`) fueron aprobadas y reconocidas. La enmienda de seis líneas de
[FLUJO-END-TO-END.md](FLUJO-END-TO-END.md) también cerró con riesgo bajo.

**Checkpoint sucio actual:** continuar únicamente en
`/home/emili/projects/agent-workflows-worktrees/implementer-1`, rama
`fix/fase-a-rdd-correction@752f532`. Solo están modificados `tools/radar/contract_test.go` y
`tools/radar/correction_test.go` (65 adiciones, 10 eliminaciones), más `.codegraph/` sin trackear.
Los tests todavía no se ejecutaron. El alcance son seis hallazgos CRITICAL previos: gate de DB
para recursos vivos; compatibilidad de decisiones resueltas; deadlock entre profundidad de ruta
y revalidación; schema v3 con rechazo explícito de v2; y retiro de skills sin pérdida. Riesgo y
resiliencia duplicaron una misma causa raíz del gate de recursos.

**No entregado ni instalado:** ninguna rama de Agent Workflows, Control Tower o Herdr fue
pusheada. Las skills nuevas `chanks-*` no están instaladas en ninguno de los cuatro roots
(`~/.agents`, Claude, OpenCode y Codex); esto es propagación pendiente, no ausencia afirmada en
la fuente. El binario instalado `herdr --skill` todavía expone el contrato viejo hasta un futuro
build/install. Los commits locales de Control Tower tampoco son runtime remoto. El residuo legacy
sin trackear `tools/plan/plan` sigue presente y no se borra ni se ignora sin decisión del
maintainer.

**Siguiente acción exacta:** entrar al worktree `agent-workflows-worktrees/implementer-1`, confirmar
la rama `fix/fase-a-rdd-correction` y ejecutar primero el test Go focalizado del paquete
`tools/radar` (`cd tools/radar && go test .`) para capturar RED. Después implementar la corrección
mínima sin superar el presupuesto aprobado ayer de **190 líneas de diff total** —no ampliarlo en
silencio a 400—, normalizar, ejecutar los checks Go/Python focalizados y amplios, congelar los
bytes y abrir desde Pi un **candidato RDD ordinario nuevo**. El linaje viejo de Agent Workflows
`review-4b55f432bbdf7f40` no está disponible ni es reutilizable en el estado nativo actual; no
reutilizarlo sin evidencia explícita de recuperación nativa.

---

## Cómo leer el estado: tres ejes distintos

| Eje | Pregunta | Estado actual |
|---|---|---|
| **Fuente local** | ¿El cambio existe en un commit o worktree local? | Sí, con el detalle de la matriz; la corrección de Fase A aún está sucia y sin tests. |
| **Remoto** | ¿La rama o commit fue pusheado? | No para Agent Workflows, Control Tower ni Herdr. |
| **Runtime instalado** | ¿Lo ejecutan hoy los agentes/binarios instalados? | Parcial: Pi recibió la copia runtime de Herdr; `herdr --skill` sigue viejo y `chanks-*` no fue propagado. |

Un cambio puede estar implementado y verificado **localmente** sin estar pusheado ni instalado.
Este documento no usa “cerrado localmente” como sinónimo de “entregado”.

## 📊 Estado de un vistazo

Los únicos significados usados abajo son: `✅ implementado y verificado`, `🔵 parcial`,
`🟡 pendiente` y `📚 fuera de alcance`.

| Grupo | ID | Estado | Fuente local | Remoto | Runtime instalado / qué falta |
|---|---|---|---|---|---|
| Implementación | Fase A | 🔵 parcial | Candidato integrado `752f532`; corrección sucia en `fix/fase-a-rdd-correction` | No | Corregir 6 CRITICAL, probar, revisar en linaje nuevo y propagar `chanks-*` |
| Implementación | Fase B | 🟡 pendiente | Control Tower aún no tiene `openspec/plan.yaml` ni ROADMAP; conserva `master-index`/`STATUS` legacy | No | Migrar el plan real después de cerrar Fase A |
| Implementación | Fase C | 📚 fuera de alcance | Sin implementación en esta obra | No | Medidor, conexión del Horizonte al dispatch, freeze terminal y `S9.9` |
| Flujo | Tramo 1 · Autoridad | 🔵 parcial | Construido en el candidato local | No | Corrección Fase A y propagación |
| Flujo | Tramo 2 · Planificación | 🔵 parcial | Construido en el candidato local; no se crea una madre de planificación | No | Corrección Fase A y propagación |
| Flujo | Tramo 3 · Enrutado | 🔵 parcial | Construido en el candidato local | No | Resolver profundidad/revalidación; propagar |
| Flujo | Tramo 4 · Ejecución | 🔵 parcial | Pipeline y retiro de skills en candidato local | No | Garantizar retiro sin pérdida; propagar |
| Flujo | Tramo 5 · Revisión | 🔵 parcial | RDD nativo funcionó desde Pi en CT y Herdr | No | Nueva revisión ordinaria para el candidato corregido de Agent Workflows |
| Flujo | Tramo 6 · Entrega | 🔵 parcial | Skill de entrega local en Control Tower `3f0a7be` | No | No está entregada ni instalada remotamente |
| Flujo | Tramo 7 · Cierre | 🔵 parcial | Gate documental local `4654ed8`; enmienda de FLUJO cerrada | No | Propagar, cerrar sobre un plan real y completar la entrega |
| Corrección | C1 · retirar `est:` | 🔵 parcial | Integrada en candidato Fase A | No | Pasar corrección y nueva revisión |
| Corrección | C2 · pipeline SDD común | 🔵 parcial | Integrada en candidato Fase A | No | Pasar corrección y nueva revisión |
| Corrección | C3 · disolver `session-plan` | 🔵 parcial | Integrada en candidato Fase A | No | Verificar retiro sin pérdida; no volver a adaptarla |
| Corrección | C4 · sin madre de planificación | 🔵 parcial | Integrada en candidato Fase A | No | Propagar contrato corregido |
| Corrección | C5 · `plan` → `radar` | 🔵 parcial | `tools/radar` es la fuente vigente; queda residuo legacy sin trackear | No | No borrar/ignorar `tools/plan/plan` sin decisión |
| Corrección | C6 · `blocked` no es ruta | 🔵 parcial | Integrada en candidato Fase A | No | Pasar corrección y nueva revisión |
| Corrección | C7 · nuevo gate documental | ✅ implementado y verificado | Control Tower `4654ed8`, local | No | No confundir verificación local con entrega |
| Corrección | C8 · asientos para planificar | 🔵 parcial | Contrato del método integrado | No | Conexión del Horizonte a MAIN queda en Fase C |
| Contrato | Schema v3 | 🔵 parcial | Target aprobado; la fuente aún acepta v2 en `tools/radar/plan.go:138-162` | No | Rechazar v2 explícitamente y verificar v3 |
| Instalación | Propagación `chanks-*` | 🟡 pendiente | No se afirma ausencia en fuente | No | Ausentes en los cuatro roots instalados |
| Compatibilidad | Residuo `tools/plan/plan` | 🔵 parcial | Existe sin trackear en el checkout principal | No aplica | Preservar hasta decisión del maintainer |
| Revisión | Linaje AW viejo | 📚 fuera de alcance | `review-4b55f432bbdf7f40` no está disponible ni es reutilizable en el estado nativo actual | No aplica | No reutilizar sin evidencia explícita de recuperación nativa; crear linaje nuevo |
| Integración | Herdr | 🔵 parcial | Fuente limpia `d8a22841`; runtime Pi actualizado | No | Binario instalado `herdr --skill` sigue viejo |
| Integración | Control Tower | 🔵 parcial | `master@72cebbe`, 4 commits locales; `1110/1110` registrado | No | No presentado como entregado ni instalado remoto |

### Política de revisión vigente

La expectativa histórica “RDD encendida → 4R siempre” quedó **superada por la política del runtime**.
El proveedor/RAR nativo selecciona los lentes según el riesgo; hoy los candidatos de riesgo medio
seleccionaron un solo lente `review-reliability`. Pi corre gentle-pi **2.3.0** y hoy inició,
completó y reconoció revisiones nativas; no hay una restricción vigente que impida iniciar RDD
desde Pi.

---

## Qué estamos haciendo

Cambiar cómo se planifica el trabajo para que varios agentes puedan trabajar en paralelo sin que
el humano sostenga varios contextos a la vez.

**Tres raíces del problema:**

1. **Documentación** — un mismo hecho vive escrito a mano en varios lugares y nada lo calcula.
2. **Organización** — el territorio se agregaba después del corte y `Área` no impedía colisiones.
3. **Flujo** — faltaba un camino único de idea a plan aprobado con la ruta mínima honesta.

**Modelo objetivo:** un plan por producto; Zona → Sesión → Módulo → Tarea; Zonas exclusivas;
Cimientos reservados por archivo exacto; estado calculado; `openspec/plan.yaml` como dato editable
y ROADMAP como vista generada; Support como autor; SDD compartido por las tres puertas de entrada.

---

## Decisiones cerradas

No se relitigan. Las correcciones C1–C8 también están decididas y no requieren nuevas preguntas.

| # | Decisión |
|---|---|
| 1 | Un solo plan, único, sin fecha de cierre |
| 2 | Cuatro niveles: Zona → Sesión → Módulo → Tarea |
| 3 | El nivel se llama **Zona**; `Área` significa otra cosa |
| 4 | La Sesión es lo que entra en un PR, cortada dentro de una Zona |
| 5 | Las Zonas se cortan por dominio de negocio, ajustado por proyecto |
| 6 | Las Zonas no se solapan: forman una partición exhaustiva |
| 7 | `Área` deja de escribirse: se deriva de la Zona |
| 8 | Un obrero por Zona; `zona: cimientos` solo admite reservas exactas disjuntas |
| 9 | Cruces: Cimientos → partir por Zona → Zona nueva si partir destruye el resultado → revisar la partición si se repite |
| 10 | Cimiento = archivo exacto que más de una Zona necesita modificar |
| 11 | `radar` valida y pronostica; Torre/MAIN adquiere y libera reservas vivas |
| 12 | MAIN coordina y Support no toca código |
| 13 | El identificador es plano, permanente y mudo (`S23`) |
| 14 | La hoja de ruta se lee por Zona y posición, no por identificador |
| 15 | El estado se calcula; nunca se escribe |
| 16 | Un solo archivo de plan, con Support como único autor |
| 17 | La hoja de ruta generada se guarda en el repo |
| 18 | El techo de asientos lo pone el humano; el cálculo incluye implementación y planificación |
| 19 | La herramienta es un binario único durable y luego se integra a la Torre |
| 20 | SDD conserva una pipeline; la ruta propone y revalida su puerta de entrada |

**C1–C8 decididas:** retirar `est:`; compartir pipeline SDD; disolver `session-plan`; no crear
madre de planificación; renombrar `plan` a `radar`; retirar `blocked` de las rutas; liberar el
gate documental con `openspec/plan.yaml`; y contar asientos de planificación. Cero decisiones del
maintainer bloquean la corrección actual.

---

## Plan de trabajo reconciliado

Dos repos participan: **`agent-workflows`** (canon, herramienta y skills) y
**`control-tower`** (banco de pruebas). `Servi-Task-U` no se toca hasta que Control Tower funcione
con el modelo nuevo.

### Fase 1 — Canon y contrato del método

- [x] Construir localmente el canon de Zonas, Cimientos, estado calculado y rutas.
- [x] Producir la primera implementación local de C1–C8 en el candidato integrado de Fase A.
- [ ] Corregir los seis hallazgos CRITICAL antes de considerar probado ese candidato, dentro del
      presupuesto total aprobado de 190 líneas.
- [ ] Verificar el candidato corregido y abrir un RDD ordinario nuevo desde Pi.
- [ ] Propagar `chanks-*` a los cuatro agentes, preservando los bloques manuales.

La construcción inicial se repartió entre tres escritores como registra
[EJECUCION-EN-PARALELO.md](EJECUCION-EN-PARALELO.md). Ese reparto ya no es una instrucción de
ejecución: **la corrección vigente tiene un solo escritor secuencial**.

### Fase 2 y 2b — Prueba del modelo y correcciones derivadas

- [x] Validar la partición real de Control Tower: 10 Zonas, 441 archivos, cero huérfanos y cero solapes.
- [x] Asignar las 24 Sesiones abiertas y aprobar los reemplazos `S100`–`S108`.
- [x] Definir Cimientos por umbral, reservas exactas y carve-out sin ocultar solapes.
- [x] Agregar linaje `reemplaza`, evidencia Git y render determinista.

Esta evidencia histórica sostuvo el candidato integrado, pero no reemplaza los tests pendientes
de la corrección actual.

### Fase 3 — Ciclo diario

- [x] Integrar localmente planificación, kickoff, cierre y soporte con el modelo de Zonas.
- [x] Renombrar la herramienta fuente a `radar`.
- [ ] Llevar el schema a v3 y rechazar v2 explícitamente; v2 no es el contrato final.
- [ ] Completar la corrección y su nueva revisión ordinaria.

### Fase 4 — Autoridad, planificación y puente SDD

- [x] Construir localmente las skills `chanks-*` y el puente plan↔SDD en el candidato de Fase A.
- [x] Hacer que proyecto nuevo sea una variante de autoridad, no una fábrica paralela de documentos.
- [x] Mantener los ocho pasos de planificación en una sola skill: **no crear una madre de planificación**.
- [x] Disolver `session-plan`, `coordinador_multi_agente` y `big-files-remediation-loop` en la fuente integrada.
- [ ] Verificar que el retiro sea lossless y propagar los contratos corregidos.

No instalar `coordinador_multi_agente`: fue disuelto. No adaptar `session-plan`: fue disuelto.

### Fase 5 — Integración con Torre y revisión

- [x] Implementar y verificar localmente el nuevo gate documental de Control Tower.
- [x] Implementar localmente la skill de entrega y el contrato de asset de rol.
- [ ] Completar el consumo de plan-data por Support, templates y brief diario.
- [ ] Implementar el gate de DB para recursos vivos dentro de la corrección Fase A.
- [ ] Construir en Fase C el medidor runtime, la recuperación stale y el freeze terminal.

La revisión no se implementa con “4R siempre”. RAR/provider elige los lentes; el candidato
corregido de Agent Workflows debe iniciar una revisión ordinaria nueva desde Pi.

### Fase 6 — Asientos y Horizonte

- [x] Incorporar al contrato que los asientos sirven tanto para implementar como para planificar.
- [ ] Conectar en Fase C el hueco de planificación calculado por `radar status` con el dispatch de MAIN.
- [ ] Mantener el techo humano de asientos y hacer que la Torre proponga ampliarlo cuando corresponda.

### Fase 7 — Aplicar a productos

- [ ] **Fase B:** crear `openspec/plan.yaml` y ROADMAP en Control Tower; retirar sus documentos legacy.
- [ ] Migrar `Servi-Task-U` solo después de validar Control Tower.
- [ ] Revisar las skills locales de ServiTask que lean el canon anterior.

---

## Qué no se toca en la corrección actual

- [FLUJO-END-TO-END.md](FLUJO-END-TO-END.md), que sigue siendo la autoridad del flujo.
- Fase B: la migración del plan real de Control Tower.
- Fase C: medidor, conexión del Horizonte a MAIN, freeze terminal y `S9.9`.
- `Servi-Task-U`.
- El residuo sin trackear `tools/plan/plan`, hasta que el maintainer decida borrarlo o ignorarlo.
- Los siete estados y las ocho clases que siempre escalan.
- PRD, RFC y REQUIREMENTS, que responden preguntas distintas.
- `decision-register.md` de Control Tower: registra decisiones, no estado calculado.
