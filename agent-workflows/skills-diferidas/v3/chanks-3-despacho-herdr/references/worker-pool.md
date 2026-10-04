# Control Tower worker-pool declaration (V2)

Moved from the repository `AGENTS.md`, where every agent loaded it. It is the reusable
worker-pool declaration that `../SKILL.md` reads before any pool operation in this
repository. Another repository declares its own pool in its own `AGENTS.md`. This is V2
material: Herdr dispatch is not part of the ordinary Chanks flow.

## Operación local: pool manual y parche de issue

Este contrato es local a Control Tower y gobierna la operación manual con la Torre
apagada; no reemplaza ni repite la política de entrega. El pool actual es `Main` más
estos cuatro workers persistentes y reutilizables. Esta es una topología elegida para
este flujo manual, no un límite universal para agentes que el humano autorice. Cada
asignación cambia la rama y el agente del worker; no crea ni descarta el worktree ni
un entorno que siga siendo válido.

| Worker y tab Herdr exacto | Worktree persistente, relativo a `Main` | Elegibilidad de rol |
|---|---|---|
| `issue-resolver` | `../Worktrees/issue-resolver` | Sesión seleccionada por humano, respaldada por un issue de Control Tower y admisible por Radar; o parche de error de flujo ya aprobado con autorización humana exacta por issue, sin Sesión de producto y con compatibilidad actual verificada. |
| `implementer-1` | `../Worktrees/implementer-1` | Sólo una Sesión seleccionada por humano, aprobada, admisible por Radar y compatible con el trabajo concurrente. |
| `implementer-2` | `../Worktrees/implementer-2` | Sólo una Sesión seleccionada por humano, aprobada, admisible por Radar y compatible con el trabajo concurrente. |
| `implementer-3` | `../Worktrees/implementer-3` | Sólo una Sesión seleccionada por humano, aprobada, admisible por Radar y compatible con el trabajo concurrente. |

El identificador de tab Herdr de cada worker es exactamente su ID de worker de la
primera columna. Al crear cada worker, ejecutá una vez `bun install --frozen-lockfile`.
Éste sigue siendo el único comando de preparación: repetilo sólo si faltan dependencias
o cambió `bun.lock`; ése sigue siendo el predicado autoritativo de entorno faltante o
stale. Una asignación nueva conserva el entorno válido. Nunca copies ni enlaces
`node_modules` desde otro checkout: cada worktree mantiene sus propias dependencias.

`issue-resolver` sólo trabaja issues de Control Tower. Para Sesiones conserva admisión
Radar y aprobación humana. Alternativamente, un parche que restaura un flujo ya aprobado
requiere autorización humana por issue vinculada a base Git exacta, resultado, worker,
archivos exactos, Cimientos y Recursos; issue o fricción no son autorización. Compará
esos conjuntos con cada Sesión activa y la base vigente antes de ocupar el worker o
escribir. Ausencia, alcance desconocido, colisión o deriva detienen sólo el parche: no
se inventa Sesión LISTO, marcador `radar.despacho/v1`, cola ni progreso. Producto nuevo,
API, permisos o cambio de datos requieren autoridad de Sesión. El procedimiento está en
`../SKILL.md` (Issue-Patch Mode) y su handoff de parche `../assets/issue-patch-handoff.md`;
la política aprobada no prueba que se haya lanzado, integrado o cerrado ningún parche.
