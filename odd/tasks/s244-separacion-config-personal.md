# S244 — Separación de la configuración personal (control-tower → machine-setup)

control-tower es público; su configuración personal del mantenedor se muda a machine-setup
(decisión 2A: opción B, mudanza total; sin reescribir historial). La Torre queda sólo producto.
Todos los agentes siguen funcionando byte a byte igual.

## Specs
- S1 — Verbatim (T1, orden-config-agentes.md): decision "1. A, pero que los agenetes lo puedan seguir usando". A = "todo lo personal (instalador, sus tests, tus skills personales, tus 6 reglas, el overlay personal de Pi)". The Torre keeps only the product. Agents keep working throughout.
- S2 — Verbatim: decision "2. A" = remove them from now on with one commit; the history keeps them. No history rewrite.
- S3 — Encargo: "las instrucciones de los cuatro agentes (Claude, Codex, OpenCode, Pi) quedan byte a byte iguales tras instalar desde machine-setup".
- S4 — Encargo: "install.py --check da OK; las suites de ambos repos pasan; torre-setup sigue funcionando".
- S5 — Encargo: "El instalador lee sólo lo personal; cuando necesita piezas del producto (módulos chanks/pi-*.mjs, la firma, el roster V1) las toma de un checkout de control-tower indicado por configuración, nunca de su propio repo."
- S6 — Encargo: "En control-tower, un módulo de roster de producto (agent-workflows/tools/roster.py) reemplaza lo que importaban las siete pruebas; torre-setup e install.sh instalan sólo la Torre y dejan de llamar al instalador personal; carril usa el instalador de machine-setup contra el worktree que prueba; AGENTS.md y agent-workflows/README.md describen la separación; los archivos personales se borran del repo en un commit."
- S7 — Encargo: "No se reescribe el historial (decisión 2A del mantenedor). No cambia qué se instala ni dónde: mismos bloques, mismas skills, mismas rutas runtime. Hermes queda fuera. Las skills creativas son otra entrega."
- S8 — Encargo: "Antes de instalar en la máquina real, snapshot de las instrucciones de los cuatro agentes" + pregunta al mantenedor (gate humano).
- S9 — Encargo: "No hagas push sin mi autorización." (mantenedor, 2026-10-26, esta conversación)
- S10 — Encargo: "Las referencias en docs/ y en product/tower/generic/README.md quedan para una entrega posterior."

## Contrato de separación (diseño)
- machine-setup (rama `feat/orden-config-agentes`) recibe, con el mismo layout relativo que usaba install.py:
  - `tools/install.py` — instalador personal; `root` = propio repo. Piezas de producto (roster, `chanks/torre-firma.mjs`, `chanks/pi-admission|pi-authority|pi-switch.mjs`, `_shared`, carpetas de skills de producto para el escaneo de retirados) resueltas desde un checkout de control-tower indicado por: flag `--torre <ruta>` > env `TORRE_CHECKOUT` > archivo de configuración `tools/torre-checkout` (ruta, commiteada) > error.
  - `tools/prepare-personal-config.py` — helper Hermes/snapshot; importa install.py: se muda con el instalador (Hermes runtime queda fuera; esto preserva la capacidad de migración sin dejar código muerto que importe un módulo borrado).
  - `tests/` — test_install.py, test_personal_config.py, test_personal_pi_composition.py, test_personal_pi_materialize.py, test_main_al_dia.py, test_carril_medir.py, test_pi_overlay_rebuild.py (los que prueban lo personal). Runner: `python3 -m unittest discover -s tests`.
  - `skills-personales/`, `templates/` (las 6 personales), `skills-diferidas/v2/chanks-0-agente-soporte/`, `personal-pi/`, `tools/pi/`, `tools/main-al-dia`, `tools/carril-medir`.
- control-tower (rama de vuelo `piloto/2026-10-26/vuelo-S244`):
  - `agent-workflows/tools/roster.py` — módulo de roster de producto: SHARED, CHANKS_SKILLS (familia chanks de producto), SUPPORT_SKILLS, V2/V3_DEFERRED_SKILLS, DEFERRED_SKILLS, DEFERRED_SOURCE_VERSIONS, V1_PENDING_SKILLS, TOWER_V1_SKILLS, STOP_MANAGING_SKILLS, SKILLS, RETIRED_SKILLS, RETIRED_SKILL_FILES, skill_source_root(root, skill), source_files(root, skills).
  - Las siete pruebas de producto (builder_flow, chanks_jornada, comunicacion_agentes, coordinador_manual, despacho_herdr, mensajes_visibles, paralelo) importan roster.py, no install.py.
  - `tools/setup.sh` (torre-setup): sin instalación/estado de skills personales; instala sólo la Torre.
  - `install.sh:161-168`: sin llamada al instalador personal.
  - `tools/carril`: resuelve el instalador en machine-setup (env `MACHINE_SETUP` > `~/projects/machine-setup`) y lo corre contra el worktree candidato (el worktree es la raíz de producto).
  - AGENTS.md y agent-workflows/README.md describen la separación; los archivos personales se borran en un commit (S2).
  - El chequeo de roster vs product/tower/v1/runtime-config.mjs (test_install.py:173-178) vive en el test_install.py mudado, contra el checkout de Torre configurado.
- Compatibilidad byte a byte: mismos bloques, mismas skills, mismas rutas runtime (S7). La línea carril-settings que usa installer.SKILLS pasa a usar el roster del root de producto (el worktree candidato), que es exactamente lo que el lane debe mostrar.

## Tasks
| ID | Specs | Route | Status | Evidence / commit |
|---|---|---|---|---|
| T1 | S1,S5 | delegated: machine-setup side | pending | mudar instalador+tests+skills+plantillas+personal-pi+tools/pi+main-al-dia+carril-medir+agente-soporte; instalador lee producto del checkout configurado |
| T2 | S6 | inline control-tower | pending | roster.py + 7 pruebas re-apuntadas |
| T3 | S6 | inline control-tower | pending | torre-setup e install.sh sin instalador personal |
| T4 | S6 | inline control-tower | pending | carril usa instalador de machine-setup |
| T5 | S6,S10 | inline control-tower | pending | AGENTS.md + README.md describen la separación |
| T6 | S2 | inline control-tower | pending | borrado de archivos personales en un commit |
| T7 | S3,S4,S8 | inline | pending | snapshot 4 agentes → pregunta al mantenedor → instalar desde machine-setup → byte a byte + --check + suites de ambos repos + torre-setup |
| T8 | S9 | inline | pending | reporte de cierre: commit, pruebas, clasificación de release; sin push |

## Log
- L1 (2026-10-26, mantenedor, verbatim): "Implementá la Sesión S244 del plan de esta Torre (control-tower). Seguí el flujo del AGENTS.md de este repo: corré 'radar etapa' y 'radar sesion S244', y trabajá solo con los archivos que la Sesión declara (su encargo trae el alcance aprobado, el mapa del acoplamiento y las restricciones). La parte del otro repo vive en /home/emili/projects/machine-setup: leé su odd/tasks/orden-config-agentes.md (S1 y L5) y no toques las otras tareas de ese documento. Antes de instalar algo en la máquina real, sacá un snapshot de las instrucciones de los cuatro agentes y preguntame. No hagas push sin mi autorización. Cuando termines, reportame el commit, las pruebas y si algo viaja en una release."
- L2 (2026-10-26): Emilio eligió piloto automático (relay de la sesión de machine-setup); sonda de consentimiento RDD respondida por él: sí. Vuelo S244 despegado: rama `piloto/2026-10-26/vuelo-S244`, worktree `Worktrees/piloto-2026-10-26/vuelo-S244`.
- L3 (2026-10-26): decisión de diseño: prepare-personal-config.py se muda con el instalador (importa install.py; dejarlo sería código muerto). Reportado al mantenedor en el cierre.
