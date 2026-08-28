---
name: coordinador_multi_agente
description: Protocolo de coordinación entre agentes (Claude, PI, OpenCode) para evitar colisiones en DB local (Docker) y DB producción (Supabase) cuando trabajan en paralelo sobre worktrees separados. Obligatorio antes de db reset, db push o db dump.
---


# 🤝 Coordinador Multi-Agente

Eres el **Coordinador de Recursos Compartidos**. Cuando varios agentes trabajan en paralelo sobre el mismo proyecto en worktrees separados, git queda aislado pero **la base de datos NO**. Tu rol: garantizar que **nunca dos agentes toquen el mismo recurso de DB al mismo tiempo**.

> **Regla mental de una línea**: worktrees aíslan *código*; la DB es un recurso *compartido*. Coordiná la DB.

---

## Trigger

Cargá este skill OBLIGATORIAMENTE antes de:

- `npx supabase db reset` (toca Docker local — destructivo)
- `npx supabase db push` (toca PRODUCCIÓN)
- `npx supabase db dump` (lee producción)
- Arrancar `preparador_de_sesion` o cualquier sesión que toque backend/DB
- Antes de codear cualquier sesión nueva que no pase por `preparador_de_sesion`: correr el flujo de reserva de área (leer el board → reservar)

**No cargar** para: frontend puro (TSX/CSS/hooks sin servicios), git add/commit/push, PRs, tsc, jest unitario.

---

## Modelo Mental

```
┌──────────────────────────────────────────────────────────┐
│  COMPARTIDO (coordinar 🔒)        NO COMPARTIDO (libre ✅) │
│  ─────────────────────────        ──────────────────────  │
│  • Docker local (db reset)        • git add/commit/push   │
│  • Supabase prod (db push)        • PRs / merges          │
│  • db dump (lectura prod)         • tsc --noEmit          │
│                                   • jest (unit)           │
│  UN agente a la vez               cada worktree solo      │
└──────────────────────────────────────────────────────────┘
```

### 🔀 DB vs ÁREA — dos candados distintos

Son candados **independientes** sobre el mismo skill, no se sustituyen entre sí:

- **DB** (existente, arriba): Docker local / Supabase prod. Coordina la **ejecución** de `db reset`/`db push`/`db dump`.
- **ÁREA/CÓDIGO** (nuevo, ver "🔀 Coordinación de entrega/merge" más abajo): `app + área funcional` reservada en `openspec/plans/reservas-activas.md`. Coordina **quién codea qué** y la **entrega/merge** a `main`.

Una reserva de `supabase/migrations` como área de código (crear el `.sql`/tipos/servicio) **NO reemplaza** el semáforo DB para **ejecutar** `db reset`/`db push`. Si tu sesión toca `supabase/migrations` como área Y necesita correr `db push`, seguí AMBOS protocolos: reservá el área (abajo) Y avisá por el semáforo DB (arriba) antes de ejecutar.

---

## 🔄 Protocolo de 3 pasos (modelo DB compartida — DEFAULT)

### Paso 1 — Verificar quién está activo
```bash
cd <repo_root>
git worktree list          # qué ramas están checked-out y dónde
intercom({ action: "list" })   # sesiones PI activas (si intercom está)
```
- Solo tu worktree → probablemente solo, igual avisá.
- Otros worktrees → hay otro agente, coordiná sí o sí.

### Paso 2 — Avisar ANTES (candado lógico)
- **PI ↔ PI (intercom)**: `intercom({ action:"send", to:"<sesión>", message:"🔒 Voy a usar [DB local/prod] para [motivo]. ~X min. ¿Libre?" })`
- **PI ↔ Claude / agente externo**: el usuario es el semáforo. Preguntar: *"¿El otro agente está en medio de un db reset/push? ¿Puedo proceder?"*

### Paso 3 — Ejecutar y LIBERAR rápido
Apenas confirmás que está libre, ejecutá **inmediatamente** y liberá al terminar (ventana mínima — minimiza la latencia del semáforo humano):
```
🔓 [DB local/prod] LIBRE. Operación completada.
```

---

## 🚦 Semáforo de recursos

| Operación | Recurso | ¿Compartido? | Regla |
|-----------|---------|:---:|-------|
| `git add/commit/push` | Worktree / GitHub | ❌ | Libre, ramas distintas |
| `tsc --noEmit` / `jest` (unit) | Worktree | ❌ | Cada uno en su carpeta |
| **`supabase db reset`** | **Docker local** | **✅** | 🔒 UNO a la vez. Avisar antes/después |
| **`supabase db push`** | **Supabase cloud** | **✅** | 🔒 UNO a la vez. **Solo desde `main` actualizado** |
| `supabase db dump` | Supabase cloud | ⚠️ lectura | Read-only: seguro en paralelo; avisar es cortesía, no bloqueo |
| **GitHub merge / PR a `main`** | **GitHub + token de entrega global** | **🔒 serial** | Codeo paralelo libre. El tramo final (`rebase-si-conflicto-real → review → push → PR`) se serializa GLOBALMENTE con un token único repo-wide (cola de entrega casera / merge-queue), un agente a la vez — haya o no solape de área. Motivo: sin `--pre-pr-ci-attestation`, un rebase post-review reescribe el candidato y fuerza re-review (PR #278). La reserva de área NO gatea el token; solo abarata la cola evitando conflictos reales en la misma área. Ver "🔀 Coordinación de entrega/merge (modelo ÁREA)" más abajo |

---

## 🔑 Reglas de oro (las que evitan los incidentes reales)

1. **`db push` SOLO desde `main` actualizado, NUNCA desde una rama feature.**
   Pushear migraciones de una feature antes de mergear genera *drift*: el remoto queda adelante de `main`. Orden correcto: `merge a main` → `git pull` en tu worktree → `db push`.

2. **Numeración de migraciones para no colisionar / quedar fuera de orden.**
   El segundo agente en mergear hace `git fetch origin main && git merge main` en su rama **ANTES de crear su migración**, así su timestamp queda naturalmente DESPUÉS del último mergeado. Si igual quedó fuera de orden, `db push --include-all` (es seguro si los contenidos son independientes).

3. **Nunca asumir "total son tablas distintas".** Docker es UN proceso; `db reset` borra TODO el local, no solo "tus" tablas.

4. **Tras un `db reset` del otro agente, vos perdés tu data local sembrada** → re-seed antes de seguir.

---

## 🅱️ Modelo B (opcional, avanzado) — stacks locales AISLADOS

Solo si necesitás aislamiento total simultáneo (3+ agentes, tests de integración en paralelo, resets muy frecuentes). Para 2 agentes en validación visual normal **NO vale la pena** (un humano mira una pantalla a la vez → validación secuencial sobre la DB compartida es más simple).

**Cómo se monta** (por worktree):
1. `config.toml` con `project_id` único + **todos los puertos distintos** (`[api]`, `[db]`, `[studio]`, `[inbucket]`, `[analytics]`…). Ej: worktree A api `54321`, worktree B api `54331`.
2. `npx supabase start` en cada worktree → dos stacks Docker independientes.

**Validación en emulador con stacks aislados — el detalle del QR:**

> El **QR apunta al dev server de Metro/Expo (el código)**, NO a la DB. La DB la decide la URL de Supabase en el `.env`/config que la app lee al arrancar.

```
Worktree A → Metro :8081 → QR-A (código A) ; .env_A → Supabase A (:54321) → Emulador 1
Worktree B → Metro :8082 → QR-B (código B) ; .env_B → Supabase B (:54331) → Emulador 2
```
- Son 2 QRs porque hay **2 Metro servers** (uno por worktree), no porque el QR elija DB.
- Cada worktree apunta a su stack vía su `.env` (`EXPO_PUBLIC_SUPABASE_URL`).
- Necesitás **2 emuladores/dispositivos** para verlos en paralelo.
- Recordá el host correcto: Android emulator `10.0.2.2`, iOS sim `localhost`, dispositivo físico = IP de LAN — tanto para Metro como para la URL de Supabase.

**Tradeoff**: aislamiento real (cero coordinación de DB) vs ~2x RAM/CPU + setup de puertos + 2 emuladores. Por eso es opcional.

---

## 👤 Coordinación manual (PI ↔ Claude) — el punto frágil

Cuando el otro agente es externo (Claude, OpenCode) y no comparte intercom, el **usuario es el semáforo**. Es inherentemente *race-prone* (hay latencia entre "¿libre?" y "dale"). Mitigación:
- Avisar → confirmar → ejecutar **YA** → liberar. Ventana mínima.
- Ambos agentes deben conocer y respetar este protocolo proactivamente.

```
Agente: "¿El otro agente está en medio de un db reset/push? Necesito hacer db push de la migración X."
Usuario: "No, está codeando. Dale."
Agente: "🔒 db push…" → "🔓 Listo, prod actualizada."
```

---

## ✅ Checklist antes de tocar DB
```
☐ Cargué coordinador_multi_agente
☐ Verifiqué worktrees activos (git worktree list) + intercom list
☐ Avisé al otro agente (o al usuario) qué recurso voy a usar + tiempo estimado
☐ Recibí confirmación de que está libre
☐ (db push) ¿Estoy en main actualizado, no en una feature branch?
☐ Ejecuté y LIBERÉ inmediatamente ("LIBRE")
```

## 📊 Al cerrar la sesión
```
☐ Liberé todos los recursos que tomé (db local, prod)
☐ El otro agente sabe que terminé
☐ Mis migraciones están mergeadas en main
☐ Hice db push desde main si correspondía
```

---

## 🔗 Relación con otros skills
| Skill | Relación |
|-------|----------|
| `preparador_de_sesion` | Incluye `db reset`. Cargar **este skill primero**, después el preparador. Su Fase 1.5 ejecuta el flujo de reserva de área de este skill. |
| `branch-pr` / PRs | No tocan DB. **Restricción de ÁREA**: revisar `reservas-activas.md` y reservar el `(app + área)` antes de codear (ver sección "🔀 Coordinación de entrega/merge" abajo). |
| `ingeniero_qa_destructivo` | Si usa DB → coordinar. Unit tests → libre. |

**Regla de oro**: si un skill incluye `db reset` o `db push`, cargá `coordinador_multi_agente` ANTES.

---

## 🔀 Coordinación de entrega/merge (modelo ÁREA)

> Candado **ortogonal** al semáforo DB de arriba (ver "DB vs ÁREA — dos candados distintos" en el Modelo Mental). Este protocolo coordina **quién codea qué área** y **la entrega/merge a `main`**, no la DB.

### Flujo de preguntas de inicio de sesión (una pregunta a la vez)

**Paso 0 — Sincronizar y leer el board.** `git fetch origin` → leer `openspec/plans/reservas-activas.md`. El board se lee ANTES de decidir en qué trabajar.

**Paso 1 — Sembrar opciones desde planes + Notion (NO texto libre).**
- **openspec**: leer la tabla "📊 Estado de un vistazo" de `openspec/plans/master-index.md` (filas `🔄 EN CURSO` / `🟡` / pendientes) + el `STATUS.md` del plan activo relevante.
- **Notion (autónomo vía MCP)**: `search(query: "ServiTask pendientes")` para ubicar la página/DB del proyecto → `fetch(id)` de esa página para leer los ítems pendientes. Preferir la skill `session-doc` (wrapper no destructivo de Notion) si está disponible. **Fallback** (MCP Notion no conectado): pedir al usuario que pegue los pendientes; el flujo sigue asistido, no falla.

Presentar los pendientes como **opciones enumeradas** y hacer UNA pregunta:

> "Trabajo pendiente detectado. ¿Cuál tomamos esta sesión?
> 1) `[plan/Notion ref]` — <título del ítem>
> 2) `[plan/Notion ref]` — <título del ítem>
> …
> N) Otra tarea (describila)."

STOP y esperar respuesta (regla del repo: una pregunta a la vez).

**Paso 2 — Mapear elección → reserva `app + área funcional`.** Derivar `owner` (convención de rama del repo, `<agente>`), `rama` (`feat|fix|db/<agente>/<tarea>`), `app + área` (lista canónica del board), `plan/Notion ref`, `propósito` (una línea), `ventana entrega esperada`.

**Paso 3 — Chequeo de solape (aviso anticipado, NO gatea el token de entrega).**
```
¿Existe fila ACTIVE|DELIVERING con la MISMA (app + área)?
├─ NO  → sin solape: aterrizar reserva (Paso 4) y codear libre.
└─ SÍ  → solape: NO arrancar en paralelo sobre la misma área. Preguntar al
          usuario (semáforo) UNA opción: (i) elegir otra área no-solapada;
          (ii) esperar a que la reserva en conflicto pase a MERGED.
```
> El token de entrega global (más abajo) serializa el tramo final **haya o no solape** — es el mecanismo por defecto de todo agente al entregar, no una opción condicional del solape.

**Paso 4 — Aterrizar la reserva (PRIMERA acción de la sesión).** Commit docs-only sobre `reservas-activas.md` (fila `ACTIVE`) → **PR docs-lane vía `branch-pr`** (cero lentes, CI rápido, auto-merge tras verde) referenciando el issue de coordinación reutilizable **#313** con `Refs #313` en el cuerpo (**NUNCA `Closes`/`Fixes`** — el issue queda abierto permanentemente) → `git fetch` para que el board sea visible a los demás.

**Paso 5 — Codear, luego entregar (tramo final serial, un agente a la vez).** Ver protocolo del token abajo.

### Schema del board

`openspec/plans/reservas-activas.md` — pull-based, columnas: `owner | rama | app+área | plan/Notion | propósito | started-at | estado | ventana`. `estado` ∈ `ACTIVE | DELIVERING | MERGED | ABANDONED`. Taxonomía canónica de `app+área` vive en el header del board (se amplía por PR docs-lane). Puntero desde `master-index.md` § "Cómo leer este índice".

### State machine

```
[inexistente] --(Paso 4: commit docs-lane)--> ACTIVE
   ACTIVE --(toma el token de entrega global)--> DELIVERING
   DELIVERING --(merge OK, commit único, libera token)--> MERGED   (fila cerrada/borrada, área libre)
   ACTIVE|DELIVERING --(timeout / sesión abandonada / rama descartada)--> ABANDONED
   ABANDONED --(tras verificación humana)--> reclamable por cualquier agente
```

- **ACTIVE**: área reservada, owner codeando. Sin lock. Áreas disjuntas conviven en paralelo, 100% libre.
- **DELIVERING**: el owner sostiene el **token de entrega único repo-wide** durante el tramo final corto (`rebase-si-conflicto-real → review → push → PR`). Solo UNA reserva en todo el repo puede estar `DELIVERING` a la vez, haya o no solape de área. Un segundo agente que quiera entregar ESPERA a que se libere el token.
- **MERGED**: PR mergeado (commit único). Token liberado. Fila cerrada/borrada.
- **ABANDONED**: sesión cortada sin mergear. Área liberada tras verificación humana (sin timeout duro automático en v1).

### Protocolo del token de entrega global (semáforo humano, 4 pasos)

```
avisar   → "Voy a entregar. ¿Hay otro agente en el tramo final (DELIVERING) ahora mismo?"
confirmar→ usuario responde "libre / esperá" (garantiza un solo DELIVERING repo-wide)
ejecutar → YA, en orden: git fetch → rebase SOLO si conflicto real →
           review (4R o judgment-day) → push + PR
liberar  → fila → MERGED, token suelto (siguiente agente puede tomarlo)
```
Espeja el semáforo DB existente (avisar→confirmar→ejecutar→liberar). El token es **global**, no per-área: aunque dos agentes trabajen áreas disjuntas, el tramo final se serializa igual (sin `--pre-pr-ci-attestation` no hay pase gratis de `compatible base advance`). **Comandos seguros mientras otro sostiene el token**: lecturas y trabajo local no destructivo (tsc, jest unit, edición en el propio worktree). Se serializa SOLO el tramo `rebase→review→push→PR`, no el codeo.

### Orden exacto del tramo final (regla de oro: sin rebase entre el review y el push)

```
git fetch origin
# rebase SOLO si hay conflicto real con origin/main (nunca por prolijidad)
# review: lente 4R como subagente, o judgment-day si el maintainer lo pide
git push && <abrir PR INMEDIATO>
```

> **Lifecycle nativo de gentle-ai: REMOVIDO el 2026-07-21.** Los comandos
> `gentle-ai review start/finalize/validate`, los receipts, `--lineage` y los gates
> `pre-push`/`pre-pr` se sacaron porque el defecto upstream devolvía `stop` sin salida
> y bloqueaba toda entrega. No los reintroduzcas.
> Restauración: `~/.claude/.skill-backups/RESTORE-gentle-ai-review-lifecycle.md`.

- **Prerequisito git**: `git fetch origin` antes de comparar contra `origin/main`.
- **Regla de oro (anti-PR#278)**: el rebase-si-hace-falta va ANTES del review, NUNCA entre el review y el push. Un rebase post-review reescribe el candidato y el review deja de aplicar a lo que se entrega.
- **Commit único**: la entrega revisada debe ser exactamente un commit desde su base (modelo squash/single-commit).
- **Rol del board**: mantener path-sets disjuntos reduce la probabilidad de conflicto real de rebase; NO sustituye la serialización.
- **Si el candidato cambia después del review**: tratarlo como señal de fallo → volver al Paso 3 (re-coordinar) y rehacer la entrega en orden. El review vale para los bytes que se revisaron, no para los que se pushean.

### PR docs-lane del board (carril de entrega de reservas)

Toda reserva (Paso 4) y su liberación (`ACTIVE`/`DELIVERING` → `MERGED`) viaja como PR docs-lane vía `branch-pr` (cero lentes de review, CI rápido, auto-merge tras verde) — **nunca bypass directo a `main`**. El cuerpo de la PR referencia el issue de coordinación reutilizable con `Refs #313` (**NUNCA `Closes`/`Fixes`**, para que el issue no se auto-cierre — queda abierto permanentemente como tracking). Esto satisface la regla dura de `branch-pr` ("todo PR linkea un issue aprobado") sin abrir un issue nuevo por cada reserva.
