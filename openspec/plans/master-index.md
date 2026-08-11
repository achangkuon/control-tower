# Índice Maestro — Control Tower

> Fuente técnica de verdad. Los planes, `STATUS.md` y artefactos enlazados tienen el detalle; este archivo dice DÓNDE estamos.
> Última reconciliación: 2026-08-11 contra el cierre publicado de `S5.6` en `origin/master@75ddcf9`, su [verify PASS](../changes/archive/2026-08-11-s5-6-canonical-session-snapshot/verify-report.md) y los planes canónicos.
> Este archivo mide **planificación**. Para el estado del **código** — qué existe, qué corre y qué está desplegado — ver [implementation-state](implementation-state.md). Para **qué falta para salir** y en qué orden lo permite el grafo, ver [release-chain](release-chain.md). Las decisiones durables viven en el [registro de decisiones](decision-register.md).

## 📍 Punto de retoma

`S5.6` está ✅ COMPLETO y publicado en `origin/master@75ddcf9`: implementación `20e06c5` + `8cf7aab` + `10ae5e0` + `4de42fe`, evidencia `f0103fd`, 10/10 Tareas, 10/10 criterios, focused 75/0/348 y suite completa 588/0/3452. El cambio quedó archivado y la spec canónica sincronizada.

`S5.7` sigue 🟢 LISTO y es el próximo nodo ejecutable de la hebra P5. Después `S5.8` y `S5.5`, ambas 📋 PLANIFICADO; Option B permanece resuelta para `S5.8`.

**Pero la acción más barata disponible no es `S5.7`: es verificar si `S1.11` y `S1.12` siguen 🔴 BLOQUEADO de verdad.** Sus prerrequisitos `S1.9` y `S1.10` están ✅ COMPLETO y sus Tareas son «evidence record only», sin dependencia de código. Si el bloqueo es estado obsoleto, las dos pasan a 🟢 LISTO y la hebra P1→P4 abre en paralelo con P5 — capacidad 2 en vez de 1, con `Área` y `Recurso` disjuntos. Si es real, hay que enumerar qué la destraba.

`S5.2` sigue 🔴 BLOQUEADO por los hallazgos 1, 3 y 5 del recheck 8193 y la decisión estacionada 8195; `S5.3` conserva el bloqueo transitivo. `S8.7` sigue 🔴 BLOQUEADO por el inicializador confiable de producción pendiente.

**Tres decisiones esperan al maintainer:** si `S3.5` y `S3.6` viven en P3 —lo que reabre un Plan cerrado—, qué se hace con el candidato estacionado de `S5.2`, y quién origina `trustedBindingProvider` en producción para `S8.7`.

### Auditoría de alcance del 2026-08-11

Sesión read-only de evaluación pedida por el maintainer. No cambió estados ni dependencias de Sesiones; sí corrigió documentos que reportaban mal el estado. Sus salidas son la re-medición global de [implementation-state](implementation-state.md) y la [comparación de alcance](scope-comparison.md).

**Cuatro correcciones documentales:**

1. **La brecha 1 estaba cerrada hacía siete días.** El corte de runtime se ejecutó el 2026-08-03; `~/.local/bin/torre` es symlink al runtime instalado y el `core.mjs` activo es byte-idéntico al del repositorio. `implementation-state` sostuvo «construido ≠ desplegado» sin re-medir.
2. **La brecha 4 se reabrió.** 132 commits `docs` contra 70 de código (1,9 : 1) en todo el historial; la corrección declarada el 2026-07-31 no movió la proporción.
3. **La contradicción `S7.1` ↔ `S4.4`** entre el grafo y la tabla de [release-chain](release-chain.md) valía siete Sesiones. **Resuelta por el maintainer: gana el grafo, se construyen las catorce restantes.**
4. **`decision-register.md` afirmaba que el bloqueo del sellado desatendido era específico de este repositorio.** No lo es: `remote-control` falla también.

**Dos brechas nuevas, ambas sin Sesión que las cubra:**

- **Brecha 6** — el contrato del payload (`scanClosure`) rechaza estructuralmente todo directorio que no sea `bin` o `install`, así que el 44% del código de producto no puede viajar en el artefacto instalable.
- **Brecha 7** — la Torre no puede supervisar un repositorio sin estar armada dentro de ese repositorio, lo que bloquea el sellado desatendido en los dos repositorios en uso.

**Decisiones del maintainer tomadas en esta sesión:** el dashboard queda retirado del alcance y se reemplaza por una TUI, cuyo requisito se escribe después de cerrar la Torre; `jornada/` consume `execution-contract.schema.json` en vez de reconstruir el sellado; la clasificación de ruta de las Sesiones sin ruta se resuelve con `planificador-granular`; se construyen las catorce Sesiones restantes.

**Remediación ejecutada en la misma sesión.** La brecha 5 pasó a ✅ CERRADA: registro de la Torre saneado, cola en cero y ramas de `Main` y `v2` corregidas. Se podaron las ramas ya integradas —110 → 24 locales, 86 → 18 remotas— sin tocar las cuatro ocupadas por worktrees vivos ni el trabajo sin integrar. `s5-1` y `s5-6` **no** se registran por decisión del maintainer: el registro es un acto del agente al arrancar, y ambos worktrees están ociosos. Detalle y deuda derivada en [implementation-state](implementation-state.md).

**Alcance nuevo, enumerado el 2026-08-11 como `S3.5` y `S3.6`** en [plan-3](plan-3/STATUS.md): ejecución del contrato sellado de Jornada (ruta `design-tasks`) y supervisión sin armado local, que resuelve la brecha 7 (ruta `full-sdd`). **Su ubicación escala:** aceptarlas en P3 reabre un Plan ✅ COMPLETO y cambia su denominador de `4` a `6`. Hasta que el maintainer decida, P3 conserva `100% (4/4 S)` y las dos cuentan como alcance sin ID asignado.

### 🔴 La cadena de release está incompleta — hallazgo del 2026-08-11

[release-chain](release-chain.md) incorpora `S1.16`–`S1.19` y deja `S1.11`–`S1.15` fuera «hasta que una dependencia explícita los incorpore». **Esa dependencia existe y está escrita en tres lugares**: `p7-host-neutral-loop-opencode-adapter/tasks.md:25` (`S1.13`–`S1.16` consumen el registro que posee `S1.11`), `p8-slice-planning/tasks.md:31` (`S1.17` exige `S1.11` y `S1.12`) y el Roadmap de [plan-1](plan-1/STATUS.md).

`S1.11`–`S1.15` entran en la cadena: sin ellas no arrancan `S1.16` ni `S1.17`, y sin ésas no hay `S4.2`–`S4.4` ni `S7.1`. **El resto conocido pasa de 14 a 19 Sesiones**, más `S3.5` y `S3.6` si se aprueban.

**Sin resolver:** `S1.11` y `S1.12` figuran 🔴 BLOQUEADO, pero `S1.9` y `S1.10` están ✅ COMPLETO y sus Tareas son «evidence record only». Puede ser estado obsoleto. Verificarlo primero: si el bloqueo ya no existe, las dos son 🟢 LISTO y la rama arranca hoy.

### Rutas clasificadas el 2026-08-11

Siete Sesiones carecían de ruta declarada — no nueve, como registró una medición previa: `S5.5` y `S8.7` ya la tenían.

| ID | Ruta actual | Proyectada al destrabar |
|---|---|---|
| `S5.2` | `blocked` | `direct` |
| `S5.3` | `blocked` | `design-tasks` |
| `S7.1` | `blocked` | `design-tasks` |
| `S1.16` | `blocked` | `design-tasks` |
| `S1.17` | `blocked` | `direct` |
| `S1.18` | `direct` | — |
| `S1.19` | `direct` | — |

Ninguna de las siete requiere `full-sdd`. Las cuatro `blocked` lo están por decisiones abiertas o registros no aprobados, **nunca por falta de especificación**: `S5.2` ya tiene quince criterios binarios y sus cuatro Tareas en orden RED → GREEN. El costo de proceso observado no venía de `full-sdd` mal aplicado a estas Sesiones, sino de que nunca se les asignó ruta.

## Granularidad

Plan → Sesión (1 PR) → Módulo (archivos) → Tarea (mín. 3).
El tiempo es estimación, no límite. Ver `/home/emili/.claude/skills/_shared/plan-naming-convention.md`.

## 📊 Estado de un vistazo

**Avance global**: 2/9 Planes cerrados (22%) · Sesiones cerradas en planes activos: 19/40 (48%). Cálculo auditable: P1 `10/19` + P4 `1/4` + P5 `3/8` + P7 `0/1` + P8 `5/8`; P2 se excluye porque su STATUS declara trabajo pendiente sin Sesiones enumeradas, por lo que no tiene denominador de Plan derivable.

| ID | Plan | Estado | % | Est. | Dueño | Qué falta | Ref |
|----|------|--------|---|------|-------|-----------|-----|
| P0 | Documentación canónica | ✅ COMPLETO | 100% (3/3 S) | — | Maintainer | — | [STATUS](plan-0/STATUS.md) |
| P1 | Sustrato mecánico | 🔴 BLOQUEADO | 53% (10/19 S) | — | Main | S1.11–S1.19 | [STATUS](plan-1/STATUS.md) |
| P2 | Contratos y registro de producto | 🔵 EN CURSO | — (responsabilidades restantes de Change B sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-2/STATUS.md) |
| P3 | Workspace y orquestación | ✅ COMPLETO | 100% (4/4 S) | — | Main | — | [STATUS](plan-3/STATUS.md) |
| P4 | Hosts y línea exclusiva | 🔵 EN CURSO | 25% (1/4 S) | — | Main | S4.2, S4.3, S4.4 | [STATUS](plan-4/STATUS.md) |
| P5 | Entrega y continuación | 🔵 EN CURSO | 38% (3/8 S) | — | Main | S5.2, S5.3, S5.5, S5.7, S5.8 | [STATUS](plan-5/STATUS.md) |
| P6 | Campañas multiproyecto | 📋 PLANIFICADO | — (sin Sesiones enumeradas) | — | Main | — | [STATUS](plan-6/STATUS.md) |
| P7 | Conformidad de release | 📋 PLANIFICADO | 0% (0/1 S) | — | Maintainer | S7.1 | [STATUS](plan-7/STATUS.md) |
| P8 | Release instalable | 🔵 EN CURSO | 63% (5/8 S) | — | Maintainer | S8.7, S8.5, S8.6 | [STATUS](plan-8/STATUS.md) |

## 🗂️ Planes archivados

Ninguno.
