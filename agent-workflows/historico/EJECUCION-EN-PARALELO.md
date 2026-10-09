> **DOCUMENTO HISTÓRICO — no describe el flujo vigente.** Este contrato repartió una obra de
> septiembre de 2026 entre un coordinador (MAIN) y tres agentes, con puerta serial y carriles.
> Ese reparto ya terminó y no es una instrucción para el trabajo actual. Lo reemplazan la skill
> `chanks-3-paralelo` (trabajo paralelo de V1) y las definiciones de versión.
>
> Flujo vigente: V1 no tiene semáforo, ni arranque formal de Sesión, ni marcas de despacho; el
> trabajo paralelo ocurre dentro de una sola conversación. V2 es Pista (entrega ordenada) y V3 es
> la Torre automática. La referencia vigente es
> [`docs/architecture/definiciones-v1-v2-v3.md`](../../docs/architecture/definiciones-v1-v2-v3.md);
> el plan editable es [`openspec/plan.yaml`](../../openspec/plan.yaml).
>
> Se conserva solo para trazabilidad. Movido a `agent-workflows/historico/` el 2026-10-01
> (decisión D2).

# Ejecución en paralelo — contrato de coordinación

> **Para quién es este archivo:** para el agente que coordina (MAIN) con la **Torre apagada**,
> y para los tres agentes que implementan. Es el contrato: qué toca cada uno, qué **no** toca,
> y en qué orden.
>
> **La autoridad del alcance** es [FLUJO-END-TO-END.md](../FLUJO-END-TO-END.md). Este archivo no
> redefine nada: solo reparte. Si los dos se contradicen, gana el otro.
>
> Escrito el 2026-09-02 sobre `agent-workflows@74b4d42` · `control-tower@ed81454` ·
> `gentle-ai 2.5.0`.

---

## Las tres fases, en este orden

El maintainer fijó la prioridad el 2026-09-02. **No se solapan.**

| | Fase | Qué es | Termina cuando |
|---|---|---|---|
| **A** | **El método unificado** | Aplicar las ocho correcciones y construir las skills de los siete tramos | Los cuatro agentes leen el canon nuevo y `radar` valida contra él |
| **B** | **Adaptar control-tower** | Migrar su plan al modelo de Zonas: reasignar las 24 Sesiones abiertas, generar el `plan.yaml`, retirar `STATUS.md` y `master-index.md` | `radar check` valida el plan real y `radar render` genera su ROADMAP |
| **C** | **La Torre como producto** | Retomar su cola de 18 Sesiones: el medidor, el Horizonte lado MAIN, el freeze terminal, `S9.9` | Fuera del alcance de este archivo |

**Consecuencia importante de este orden:** durante la Fase A la cola viva de `control-tower`
está **parada**. Eso elimina la única colisión real que tenía el reparto — el agente que toca
la maquinaria no compite con `S9.9` ni con el dispatch de workers, porque nadie los está
trabajando.

---

## Fase A — la puerta, tres carriles y la convergencia

### Paso 0 · La puerta serial

**Nadie arranca hasta que esto esté hecho y verificado.** Son dos archivos.

| Qué | Dónde | Por qué bloquea |
|---|---|---|
| El gate reconoce `openspec/plan.yaml` en vez de `STATUS.md`, con salida honesta | `~/.claude/hooks/doc-guard.sh:87` | Hoy hace `grep -Eq 'STATUS\.md'`. El modelo nuevo borra ese archivo: sin corregirlo, **ninguna Conversación se puede cerrar nunca más** |
| El párrafo de cierre deja de nombrar `STATUS.md` y `master-index` | `control-tower/AGENTS.md` líneas 10, 156, 224, 240 | Es el documento canónico de entrega del repo que se migra en la Fase B |

**Criterio binario:** una Conversación que solo edita `openspec/plan.yaml` cierra sin bloqueo, y
una que no cerró nada puede declarar «nada que registrar» y también cierra.

### Los tres carriles

**El reparto es una partición por rutas, no por repositorio.** Ningún archivo tiene dos dueños.
Es el mismo modelo de Zonas aplicado a esta obra.

---

#### 🅐 Carril CANON

**Posee exactamente:**

```
agent-workflows/skills/_shared/plan-naming-convention.md
~/.claude/CLAUDE.md          (solo los bloques "Plan Naming Standard" y "Chanks and Gentle AI boundary")
```

**Trabajo:**

1. **C1 — sacar `est:`.** §5 completa, y sus menciones en §11 y en el checklist §18.
2. **C2 — las tres rutas son una pipeline SDD** con `verify` y `archive` comunes y obligatorios.
   Reescribe §15: la tabla de rutas pasa a nombrar la puerta de entrada de cada una
   (`direct`→`apply`, `design-tasks`→`design`, `full-sdd`→`proposal`).
3. **C6 — `blocked` sale del conjunto de rutas.** Quedan tres. §15, y coherencia con §9, donde
   🔴 BLOQUEADO es un estado calculado.
4. **C4 — no hay skill madre en planificación.** Si el canon lo insinúa, corregirlo.
5. **Vocabulario del tiempo:** Jornada · Conversación · Sesión. Sección nueva.
6. **Los dos bloques de `~/.claude/CLAUDE.md`** alineados con todo lo anterior.

**NO toca:** ningún `SKILL.md`, ningún `.go`, ningún archivo de `control-tower`.

**Criterio binario:** `rg 'est:' skills/_shared/plan-naming-convention.md` no devuelve nada, §15
lista tres rutas, y los bloques de `CLAUDE.md` no contradicen ninguna línea del canon.

---

#### 🅑 Carril HERRAMIENTA

**Posee exactamente:**

```
agent-workflows/tools/plan/**      →  pasa a llamarse radar
agent-workflows/PLANO-CONTROL-TOWER.md   (solo las invocaciones `plan check`)
```

**Trabajo:**

1. **C5 — `plan` → `radar`.** Binario, subcomandos (`check`, `status`, `zonas`, `render`),
   README y las invocaciones citadas. Cross-compilar de nuevo para macOS.
2. **C6 en código —** `plan.go:125`: sacar `"blocked"` de `RutasValidas`. `radar check` pasa a
   **rechazar** `ruta: blocked` en vez de aceptarlo.
3. **C1 en código —** borrar `Sesion.Est` (`plan.go:56`) y `Modulo.Est` (`plan.go:67`).
   *Este alcance no estaba en el documento original: salió de leer el Go.*
4. **Campo `autoridad` a nivel Sesión.** Hoy existe `RutaSesion.Autoridad` (`plan.go:83`,
   validado en `check.go:218`) y `Decision.Autoridad` (`plan.go:108`, validado en
   `check.go:245`), pero **no hay autoridad del alcance de la Sesión**. Agregarlo y validarlo.
5. **El esquema de decisión crece.** Hoy `Decision` tiene siete campos: `tipo`, `pregunta`,
   `criterio`, `autoridad`, `clase`, `alcanza`, `contamina`. Faltan **`evidencia`**,
   **`opciones`** y **`checkpoint`**.
6. **El ledger de intentos, cuarta entrada del estado.** `state.go` calcula 🔴 BLOQUEADO desde
   dependencias, decisiones que contaminan y entrega. Se agrega el contador agotado de
   gentle-ai como cuarta entrada. Nadie lo escribe: se calcula, igual que las otras tres.
7. **`radar check` valida por ruta** — exigiendo y prohibiendo. En `full-sdd` los Módulos deben
   estar vacíos, y eso es una exigencia, no una tolerancia.

**NO toca:** el canon, ningún `SKILL.md`, ningún archivo de `control-tower`.

**Criterio binario:** `gofmt` sin diferencias, `go vet` limpio, `go test ./...` en verde, y
`radar check -f borrador-control-tower.yaml` válido con 10 Zonas. Un plan con `ruta: blocked`
o con `est:` es **rechazado**.

---

#### 🅒 Carril SKILLS

**Posee exactamente:**

```
agent-workflows/skills/*/          (todo menos _shared/plan-naming-convention.md)
control-tower/skills/torre-control-entregas/
```

**Trabajo:**

1. **Tramo 1 — siete skills nuevas**, cinco por extracción de skills que ya existen:
   `chanks-1-autoridad` (madre) · `chanks-1-brain-dump` · `chanks-1-feature` ·
   `chanks-1-heredado` · y las cuatro hijas del arranque: `chanks-1-terreno`, `chanks-1-prd`,
   `chanks-1-rfc`, `chanks-1-requirements`.
   Más tres adaptaciones: `project-kickoff` pasa a mini-madre que **no escribe documentos**;
   `architecture-audit` se recorta a `chanks-1-descubrimiento`; `chanks-1-cierre-de-decisiones` pasa a
   mandar delta a Support. El bloque de política de entrega **nace en `chanks-1-terreno`**,
   con PR como default.
2. **Tramo 2 — dos referencias compartidas:** `references/ubicacion-y-cruces.md` (compartida con
   `chanks-1-heredado`) y `references/juicio-de-ruta.md` (hoy esa prosa está duplicada en tres
   skills).
3. **Tramo 3 — `chanks-3-session-kickoff` se achica a cuatro pasos.** Sale «elegir la primera 🟢 LISTO»:
   con brief, el kickoff **recibe**, no elige. El brief de Support suma el **runtime del asiento**.
4. **Tramo 4 — nace `chanks-4-puente`** (traductor plan↔SDD, arma el delta y se lo manda a
   Support; **no escribe el plan**). **Se disuelven tres:** `session-plan`,
   `coordinador_multi_agente`, `big-files-remediation-loop`.
   ⚠️ `chanks-3-session-kickoff:54` invoca a `session-plan` para la ruta `design-tasks`: si se disuelve
   sin tocar el kickoff, esa ruta apunta al vacío. **Van en el mismo commit.**
5. **Tramo 6 — `torre-control-entregas`** (caja 3, vive en `control-tower`) reparte el token de
   entrega entre obreros. `chanks-5-politica-de-entrega` cambia su orden de detección.

**NO toca:** `plan-naming-convention.md`, `tools/`, ni ningún otro archivo de `control-tower`.

**Criterio binario:** ninguna skill nombra `est:`, `blocked` como ruta, `STATUS.md` ni
`master-index.md`; `chanks-3-session-kickoff` no invoca `session-plan`; y las tres disueltas ya no existen.

---

### Los Cimientos de esta obra

Rutas que más de un carril necesitaría tocar. **Se reservan; no se comparten.**

| Ruta | Dueño exclusivo | Por qué |
|---|---|---|
| `FLUJO-END-TO-END.md` | **nadie escribe** | Es la autoridad. Los tres la leen; ninguno la modifica |
| `~/.claude/CLAUDE.md` | 🅐 Canon | No está bajo git. Dos escritores acá se pisan sin red |
| `MIGRACION-ZONAS.md` | MAIN | Solo se toca al cerrar la Fase A, para marcar el avance |
| `EJECUCION-EN-PARALELO.md` | MAIN | Este archivo |

### La convergencia

Cuando los tres carriles terminan, **en serie y en este orden**:

1. **Propagar a los cuatro agentes** y verificar que los bloques manuales sobrevivan.
   Codex pierde los suyos **siempre**: snapshot antes, `manual-blocks.py check` después, y
   leer el diff antes de decidir entre `save` y `restore`.
2. **Instalar `coordinador_multi_agente`**, que nunca llegó a instalarse.
3. **Marcar la Fase 1 de [MIGRACION-ZONAS.md](MIGRACION-ZONAS.md) como cerrada.**

---

## El protocolo con la Torre apagada

MAIN sigue siendo MAIN con la Torre encendida y apagada. **Lo que cambia no es quién coordina —
es cómo viajan las órdenes.** Apagada: sin persistencia, sin acuse y sin retry.

1. **MAIN arma el brief** de la Jornada: por cada carril, el asiento, la rama, el **runtime**,
   el alcance exacto (las rutas que posee) y sus dependencias.
2. **El maintainer aprueba el brief.** Es el jefe: no coordina, decide. Sin esa aprobación no
   se despacha.
3. **MAIN despacha a peers vivos.** Un agente por carril. Sin acuse: si un peer no responde,
   MAIN lo detecta al no ver resultado, no por un mecanismo de la Torre.
4. **Cada agente trabaja solo en su partición**, commitea por Módulo y reporta a MAIN.
5. **MAIN mueve las ramas.** El obrero entrega; MAIN integra. Lo que el obrero hace solo, no lo
   hace cuando hay brief.

### Aviso sobre el runtime de Pi

**Baseline verificado:** Pi 0.85.1, gentle-pi 2.5.0 y Gentle AI package-local 2.7.0; RDD está
disponible. La capacidad efectiva del asiento se verifica en su runtime al armar cada brief;
no se infiere desde el bloqueo histórico.

---

## Qué NO hace ningún carril en la Fase A

- No migra el plan de `control-tower` — eso es Fase B.
- No toca `S9.9` ni ninguna Sesión de la cola de la Torre — eso es Fase C.
- No construye el medidor, el Horizonte lado MAIN ni el freeze terminal — Fase C.
- No toca `Proyecto-Alpha`.
- No reabre ninguna de las ocho correcciones: están decididas y su autoridad está en
  [FLUJO-END-TO-END.md](../FLUJO-END-TO-END.md) §3.3.
