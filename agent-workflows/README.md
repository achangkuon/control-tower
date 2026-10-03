# Agent Workflows

Version-controlled source of truth for the generic user-owned builder: human-directed
parent/subagent workflow routing, planning evidence, closure evidence, delivery policy, and
shared-path risk. The active builder does not require roles, seats, dispatch, tokens, queues,
or an external coordination API. The original Control Tower candidate flow is frozen
byte-for-byte under `product/tower/generic/`; it is product history, not active builder policy.
Gentle AI owns technical decomposition, implementation, checks, continuity, and native SDD phase
surfaces; this package does not replace, edit, invoke, or regenerate those managed assets. Chanks
owns product Session coordination, plan authority, and closure.

These skills do **not** ship with Gentle AI. The `author: gentleman-programming`
frontmatter on several of them is a `skill-creator` template default, not
provenance. To verify what Gentle AI actually ships, grep its binary — it embeds
its own skills:

```bash
rg -c -a --fixed-strings "<skill-name>" "$(brew --prefix gentle-ai)/bin/gentle-ai"
```

Zero hits means the skill is owned here.

## Quick Path

New machine:

```bash
git clone git@github.com:achangkuon/agent-workflows.git
cd agent-workflows && ./tools/setup.sh
```

With no arguments it opens an interactive menu — install, update skills, update
the Tower, or diagnose — with a live status header. Flags drive the same actions
headlessly: `--install`, `--with-tower`, `--update`, `--check`, `--dry-run`.

Installing also creates the global command `torre-control`, so the menu opens from
anywhere afterwards. It is a launcher, not a copy — it execs the current
checkout, so `git pull` updates the tool with no reinstall step. `--link`
recreates it; `SETUP_LAUNCHER` renames it and `SETUP_BIN_DIR` relocates it.

The menu is plain Bash by design: no Go toolchain, no per-OS release pipeline,
nothing to install before it can install anything. It repaints on the alternate
screen buffer and caches its status block, because recomputing that block on
every keypress is what makes a shell menu stutter.

### Portability

Linux and macOS, Intel or Apple Silicon. It stays inside Bash 3.2 — the version
macOS still ships — and uses no GNU-only flags, so it needs no Homebrew Bash and
no coreutils. The one place the difference shows is the escape-sequence read:
Bash 3.2 rejects a fractional `read -t`, so `ESC_TIMEOUT` falls back to one
second there. Arrow keys are unaffected — their bytes are already buffered — and
`j`/`k` never touch that path.

Requirements are `git` and `python3`, plus `bun` and `jq` only for
`--with-tower`. Everything else is POSIX.

Already set up, editing skills:

```bash
python3 tools/install.py
python3 tools/install.py --check
python3 -m unittest discover -s tests -v
```

Restart Claude, OpenCode, Codex, and Pi sessions after installation so each
runtime reloads its skills and manual routing block.

### What `setup.sh` owns, and what it refuses to own

It installs exactly two things: the skills in this repository, and the Control
Tower from its own repository (opt-in, `--with-tower`). Each half keeps its own
installer — `tools/install.py` here, `install.sh` there — and `setup.sh` only
composes them in the safe order, least specific first.

**Gentle AI is checked, never installed.** It is a separate product with its own
binary, installer and update authority; installing it from here would fork its
release channel and defeat `gentle-ai sync`. A missing Gentle AI is a warning
with a pointer to its own instructions, not a failure.

**The Tower is opt-in on purpose.** These generic skills describe how work is done
and must keep working with the Tower absent. A project that uses the Tower supplies
its own operator skills and authority routes; this package does not install or
simulate them.

`setup.sh` seeds the `SESSION-SKILL-ARCHITECTURE:MANUAL` block for the agents
this machine actually has, because `install.py` replaces that block but refuses
to invent it — it will not guess where in someone's instruction file the routing
belongs. Existing files are backed up and appended to, never rewritten.

### Absent runtimes are skipped

A machine rarely has all four agents. `MANUAL_FILES` and `runtime_skill_roots`
stay complete as the contract; `installed_manual_paths` and
`installed_skill_roots` narrow them to what is present. A runtime whose marker
directory is absent is skipped and never created. A runtime that IS present but
is missing its instruction file still fails closed — that is a broken install,
not an absent one.

## Radiografía

`radiografia/` is a project-agnostic engine that generates a self-contained HTML
product report, written to be read by someone who does not program. It is driven by a
committed `radiografia.json` in each project and fires from `.githooks/pre-push`, so it
runs identically for Claude Code, OpenCode, Codex, Pi and a human — the trigger is git,
not an assistant. It never blocks a push.

See `radiografia/README.md`. Adopted today by control-tower, ecom-ecuador,
Servi-Task-U and Finanzas-Personales.

## Native Sessions

Native product coordination is `Zona → Sesión`. A Session declares Zona, identity,
priority/dependencies, exact authorized files, Cimientos/resources, authority, and an `encargo`
with exactly `pedido_contexto`, `resultado_comportamiento`, `restricciones_decisiones`, and
`referencias`. ODD is the default technical path. Its document and Engram record are subordinate
continuity evidence, not a second product plan or status source.

SDD is available only after explicit human `solicitud_sdd`; Gentle AI's existing native
preflight/authority/archive controls then apply. Complexity does not select it. Historical legacy
`direct`, `design-tasks`, `full-sdd`, Módulo, and Task contracts remain readable as historical or
technical evidence and are not retrofitted into native planning. Native resume reconciles the same
Session identity with its technical record, code, and evidence; legacy resume keeps first pending
Módulo behavior.

## Skill families

| Family | Skills |
| --- | --- |
| Shared conventions | `_shared/plan-naming-convention.md` |
| Chanks planning and bridge | `chanks-1-adopcion`, `chanks-1-autoridad`, `chanks-1-brain-dump`, `chanks-1-descubrimiento`, `chanks-1-feature`, `chanks-1-heredado`, `chanks-1-prd`, `chanks-1-project-kickoff`, `chanks-1-requirements`, `chanks-1-rfc`, `chanks-1-terreno`, `chanks-4-puente` |
| Session workflow | `chanks-3-paralelo`, `chanks-0-session-context-loader`, `chanks-2-planificador-granular`, `chanks-0-agente-soporte`, `chanks-5-session-doc` |
| Delivery policy | `chanks-5-politica-de-entrega` |
| Deferred to V2, Pista (source kept, not installed, installed copies archived under `.retired-skills/`) | `chanks-3-session-kickoff` |
| Deferred to V3 (source kept, not installed, installed copies archived under `.retired-skills/`) | `chanks-0-jornada`, `chanks-3-coordinador-manual`, `chanks-3-despacho-herdr`, `chanks-4-unattended-implementation` |
| Decision and communication support | `chanks-1-cierre-de-decisiones`, `chanks-0-explicalo-simple`, `chanks-0-mensajes-visibles`, `chanks-0-skill-composer` |

### `_shared` is deliberately partial

`~/.claude/skills/_shared/` is a **mixed** directory: eight files are managed by
Gentle AI and one, `plan-naming-convention.md`, is owned here. This repository
therefore tracks only that one file. The installer copies per file and never
deletes, so it overlays the owned convention and leaves the Gentle AI files for
`gentle-ai sync` to manage. Do not add the managed files here — a frozen copy
would silently defeat their upstream updates.

### Frozen product flow and current builder

The installer/setup description below remains existing installation evidence and is not rewritten
by this migration. The active skill source is the generic builder described above. Any Control
Tower-specific choreography belongs only in the frozen product snapshot under
`product/tower/generic/` or in its own product repository; it is not a generic dependency.
Global synchronization and fresh-session verification remain outstanding after source changes.

## Installation

The rule is single: the maintainer's own skills (the installer roster,
`CHANKS_SKILLS` and `SUPPORT_SKILLS`) are edited in `agent-workflows/skills/` from
any agent and installed into one central folder, `~/.agents/skills`.

- `~/.agents/skills` holds the only real copy of every own skill, written per file
  and atomically. Pi, OpenCode and Codex read it natively.
- Claude Code has no skills-path setting, so `~/.claude/skills/<name>` is a relative
  symlink to `../../.agents/skills/<name>`, one per own skill. A real directory
  already at that name is archived to `~/.claude/skills/.retired-skills/<name>-<UTC
  stamp>` and then replaced by the link; a link pointing elsewhere is replaced; the
  correct link is left alone.
- `~/.config/opencode/skills` and `~/.codex/skills` no longer receive own skills.
  Any real copy found there is archived to that root's `.retired-skills/`, never
  deleted. A symlink found there is left untouched.
- `_shared/plan-naming-convention.md` keeps its per-root overlay in all four roots:
  `_shared` is a Gentle AI directory with per-runtime content.
- Hermes is handled in a later step.
- Gentle AI skills (`sdd-*` and the rest) are managed by `gentle-ai` per runtime and
  are not part of this.

`--check` and `--dry-run` report the new change kinds as `own-skill-archive` (a real
copy to archive), `skill-link` (a missing link to create) and `skill-link-replace`
(a link pointing elsewhere), the last two with the target. A second run after an
install reports no changes. The installer still refuses a symlinked runtime root and
never writes through a skill symlink.

It also owns one manual prompt-policy block in the Claude, OpenCode, Codex,
and Pi instruction files: `SESSION-SKILL-ARCHITECTURE:MANUAL` states the
Chanks and Gentle AI boundary in under 2 KB. V1 starts a Session organically:
the human chooses a `LISTO` Session and `chanks-4-puente` hands it to Gentle AI,
with no admission step, no dispatch marker and no "in progress" state. Parallel
work happens inside one conversation, where the orchestrator delegates each
approved Session to a subagent in its own worktree and integrates serially. The
formal start (`chanks-3-session-kickoff` and its admission contract) and the
Radar dispatch markers are deferred to V2 (Pista): their sources and tests stay
in this repository unchanged. The block is a prompt instruction, not executable Gentle AI
enforcement. The installer no longer ships an SDD gatekeeper block: how SDD is
run belongs to Gentle AI. A gatekeeper block already present in an instruction
file is left untouched.

### Existing personal blocks: targeted preparation

The installer also corrects four **existing** personal instruction blocks:
`AGENT-PROPAGATION-MAP:MANUAL`, `doc-guard-rule`,
`EXPLAIN-TO-MAINTAINER:MANUAL` and `PLAN-NAMING:GLOBAL`. Their canonical templates live under `templates/`.
Propagation names the repository as the editable own-skill source and
`~/.agents/skills` as the central installation, without copying Gentle AI assets.
Closure names `chanks-5-session-doc`; explanation uses the central
`chanks-0-explicalo-simple` reference. Project-specific documentation destinations
and opt-outs still take precedence.

These four blocks are **replace-if-present**: an absent block stays absent. This
is not a blanket rewrite of personal instructions. The required session-routing
block keeps its existing behavior; Hermes is not added to this installer's
instruction targets.

Two runtimes are the exception (maintainer decision B3, 2026-10-01). They also
**receive** the blocks listed in `ADDED_WHEN_ABSENT_BLOCKS` when they lack them:

| Runtime | File | Written by | Blocks added when absent |
|---|---|---|---|
| Codex | `~/.codex/AGENTS.md` | `tools/install.py` | `doc-guard-rule`, `EXPLAIN-TO-MAINTAINER:MANUAL`, `PLAN-NAMING:GLOBAL` |
| Hermes | `~/.hermes/SOUL.md` | `tools/prepare-personal-config.py --stage hermes` | `doc-guard-rule`, `EXPLAIN-TO-MAINTAINER:MANUAL`, `PLAN-NAMING:GLOBAL` |

An added block is appended at the end of the file after one blank line; no existing
byte is rewritten. A block already present is replaced in place, never duplicated,
and a second run changes nothing. A half-present, inline or managed-nested marker
is refused before any write. `AGENT-PROPAGATION-MAP:MANUAL` is not added anywhere.

The plan-naming block (`PLAN-NAMING:GLOBAL`) is one text in all five runtimes
(maintainer decision of 2026-10-01). `templates/plan-naming.md` holds the wording
that Claude Code had installed. Only the line that names the canon file varies: the
template carries a `{{PLAN_NAMING_CANON}}` placeholder that the installer resolves
per personal file, to the skill root where it writes `_shared/` for that runtime
(`PLAN_NAMING_CANON_ROOTS` in `tools/install.py`):

| Runtime | Canon path named in the block |
|---|---|
| Claude Code | `~/.claude/skills/_shared/plan-naming-convention.md` |
| OpenCode | `~/.config/opencode/skills/_shared/plan-naming-convention.md` |
| Codex | `~/.codex/skills/_shared/plan-naming-convention.md` |
| Pi | `~/.agents/skills/_shared/plan-naming-convention.md` |
| Hermes | `~/.agents/skills/_shared/plan-naming-convention.md` |

Pi and Hermes get no `_shared/` overlay of their own from this installer; both read
the central folder, which every install writes. A copy that differs from the unified
text, such as Pi's older and shorter wording, is replaced in place on the next
install. The snapshot stage compares each runtime against its own rendering, so a
block that names another runtime's path counts as stale.

### Preparing the personal-runtime retirement

`tools/prepare-personal-config.py` is a separate, opt-in migration for the
maintainer's configuration. It defaults to a read-only preflight; only an
explicit `--apply` writes. Every selected stage preflights its complete set of
changes before applying any of them. It refuses unknown owned-file bytes,
ambiguous hooks, malformed managed blocks, symlink traversal, and incomplete
central skill copies rather than guessing.

Run stages in this order when a separately authorized live deployment is
scheduled:

1. `--stage primary`: retire the maintainer-owned Claude autosync hook, script,
   and slash command. Do this **before** applying `install.py`, so the old hook
   cannot propagate the four V3-deferred skills back into runtimes.
2. Apply the central skills installer and finish the primary instruction
   corrections.
3. `--stage hermes --hermes-python <installed-Hermes-Python>` last: validate
   `skills.external_dirs` with Hermes' own PyYAML, point it at `~/.agents/skills`,
   update existing personal blocks, add the two blocks above when absent, remove
   only the old unattended-consent block, and archive only real copies of the maintainer's own skills.
4. `--stage snapshot` after every correction: preserve the prior manual-block
   restore store at the immutable `boundary-2026-10-01` path, then refresh the
   compatible snapshot from the five current instruction files.

For example, inspect without writing with
`python3 tools/prepare-personal-config.py --stage primary --check`. The Hermes
stage requires the exact installed interpreter explicitly; system Python is
not assumed to include PyYAML. Fixture tests never apply changes to the real
home directory.

Before any runtime write, preflight rejects duplicate, unclosed, overlapping,
non-line-delimited or managed-nested targeted blocks. Opening markers may be
unannotated or carry exactly the existing annotation
`(manual — NOT gentle-ai managed; do not overwrite on sync)`; unsupported
annotations fail closed rather than being mistaken for absence. Unrelated
personal content, managed bytes and existing instruction file modes are preserved;
symlinked instruction destinations are refused. Repeated fixture installs are
idempotent. Source tests do not authorize live installation or prove behavior in a
fresh conversation: those remain separate maintainer-authorized checks.

Gentle AI `sync` or `install` may rewrite instruction surfaces; survival is not
guaranteed. Before either operation, back up the manual blocks. Afterwards,
inspect the actual diff, restore only when the canonical blocks were lost, run
`python3 tools/install.py --check`, and restart affected runtimes. OpenCode also
requires a controlled runtime smoke verification before claiming the policy is
effective; file presence alone is insufficient evidence of prompt loading.

The installer preserves every byte outside its declared block, requires
the existing routing marker, rejects duplicate/nested owned markers, and never
invokes Gentle AI. Before writing, it preflights every destination. Runtime skill roots may be created;
instruction files and their parent directories must already exist as regular
paths. Missing, wrong-type, symlinked, escaping, or managed-block-nested paths
raise `InstallError` and leave all destinations untouched.

Use `--check` to fail when runtime copies drift. Use `--dry-run` to print the
planned changes without writing anything. Both modes accept `--home PATH` for
isolated verification.

### Avisos pasivos de Chanks en Pi

`install.py` genera `~/.pi/agent/extensions/chanks-notices.ts`, separado del
control retirado. Usa sólo el evento público `tool_result` y `ctx.ui.notify`:

| Resultado exitoso observado | Aviso |
|---|---|
| `read` del `SKILL.md` exacto de una skill de `CHANKS_SKILLS` instalada en `~/.agents/skills/<nombre>/SKILL.md` | `💪 Chanks · <nombre> · lectura completada` |
| `bash` con una llamada directa a Radar reconocida por `radarDirecto` | `🗼 Torre · radar <subcomando>` |

También observa los resultados reales anidados de codemode: cada hijo tiene su
propio `input`, ID y `parentToolCallId`; el resultado agregado de codemode no se
interpreta. No anuncia solicitudes antes del resultado, comandos compuestos,
pipelines, otras herramientas, skills ajenas/diferidas ni copias del checkout.
Admite rutas absolutas, relativas a `ctx.cwd` y `~/`, pero exige el archivo regular
canónico instalado; rechaza aliases y symlinks que redirigen la raíz o la skill.
Errores de herramienta, ausencia de UI y fallas cosméticas no cambian el resultado.
No conserva estado de llamadas: cada resultado elegible genera un aviso.

**No hay admisión, locks, etapas, prompts, herramientas nuevas, subprocesos ni
mutación de argumentos/resultados.** No depende de la API privada de annotations
ni reactiva `chanks-controls.ts`. Importa sólo `radarDirecto` desde
`chanks/torre-firma.mjs`, mediante una URL absoluta de este checkout: éste debe
seguir disponible; moverlo exige regenerar el archivo.

Para un despliegue aislado **con autorización operativa separada**, desde la raíz
del repositorio:

```bash
python3 agent-workflows/tools/install.py --pi-notices-only --dry-run
python3 agent-workflows/tools/install.py --pi-notices-only
python3 agent-workflows/tools/install.py --pi-notices-only --check
```

Ese modo/helper `install_pi_notices(home, root)` sólo crea/reemplaza atómicamente
`chanks-notices.ts` (y sus directorios si faltan), conserva el modo existente,
rechaza destinos symlink/wrong-type y no reescribe bytes ya correctos. No toca
skills, instrucciones, settings, hooks, npm, overlay ni controles retirados.
`--check` informa `DRIFT pi-notices`; `--dry-run` no escribe. Ambos aceptan
`--home PATH` para fixtures. **El instalador completo sí tiene efectos amplios**:
skills, bloques manuales, launchers/hooks existentes, npm/settings, herramientas
del overlay y archivos retirados. No usarlo para desplegar sólo estos avisos.

Prueba visual pendiente hasta instalar con permiso: `/reload` o una sesión nueva
carga la extensión. Leer una skill instalada y ejecutar un Radar directo debe
mostrar los dos avisos; repetir mediante codemode debe mostrarlos para los hijos.
Un README ajeno o un comando compuesto no debe anunciarlos. En el SDK codemode
no se carga automáticamente: la prueba anidada debe cargarlo explícitamente.
Tests con handlers/fixtures y `--check` prueban lógica/bytes, no la carga ni la
visualización real en una conversación nueva.

### Control pieces deferred to later versions

The installer no longer writes two control pieces. Their sources stay in this
repository, and a copy already installed is archived, never deleted.

| Piece | Deferred to | Installed path | Source kept at |
|---|---|---|---|
| Pi write lock | V2 | `~/.pi/agent/extensions/chanks-controls.ts` | `PI_EXTENSION_TEMPLATE` in `tools/install.py` and `chanks/pi-*.mjs` |
| Claude Tower signature hook | V3 | `~/.claude/hooks/torre-firma.sh` | `tools/hooks/torre-firma.sh` |

The stage notice hook `chanks-etapa.sh` is unaffected and is still installed.

`--check` and `--dry-run` report an installed copy as `retired-control` without
mutation. After ordinary installation succeeds, apply moves it to
`<runtime-root>/.retired-controls/<timestamp-unique>/<original-relative-path>`,
where the runtime root is `~/.pi/agent` or `~/.claude`. The Pi archive sits outside
`extensions/`, so Pi does not discover the archived shim. A symlink at either path
is refused before any write. To undo, move the backup to its original path.

### Retiring obsolete skill files

Removed files inside retained skills are retired only when their relative path
and SHA-256 match an explicit historical entry in `RETIRED_SKILL_FILES`. Modified,
unlisted, or missing files stay untouched; current source files always win over
tombstones, including reintroduced paths and restored Notion assets. Future
removals must extend the registry with reviewed canonical hashes; there is no
mutable ownership database or recursive directory cleanup.

`--check` and `--dry-run` report matching copies as `retired-skill-file` without
mutation. After ordinary installation succeeds, apply rechecks the path and
digest and moves matching bytes to
`<runtime-root>/.retired-skills/files/<timestamp-unique>/<original-relative-path>`.
Each backup has a private collision-safe directory. To undo retirement, inspect
the backup and move it back to its original relative path without overwriting
new user content. Empty skill directories remain in place.

Known obsolete destinations and archive ancestors are validated before writes:
symlinks, wrong types, and path escapes fail closed. A content edit after planning
is preserved by the final digest check; this is not a lock or a guarantee against
concurrent writers changing paths between validation and rename. Run installation
without other processes editing the same skill files. Existing whole-skill
retirement remains separate.

Do not edit `sdd-*`, the Gentle AI files inside `_shared`,
`gentle-orchestrator`, `opencode.json`, or any content inside
`<!-- gentle-ai:* -->` markers. Runtime copies are adapters and
discovery surfaces; this repository is the canonical source.

## Layout

```text
skills/                         canonical generic user-owned skills
templates/session-routing.md    manual boundary block template (<= 2000 bytes)
tools/install.py                install, check, and dry-run implementation
tests/test_install.py           focused standard-library tests
```

### Historical documents

`historico/` holds documents about the previous system. They are kept for traceability and
are not instructions for current work; each one opens with a banner that says what replaced it.

| Document | What it was | Replaced by |
| --- | --- | --- |
| `historico/EJECUCION-EN-PARALELO.md` | Coordination contract for a three-agent build in September 2026 | `chanks-3-paralelo` and the version definitions |
| `historico/MIGRACION-ZONAS.md` | Progress record of the migration to the Zona model | `openspec/plan.yaml` and `_shared/plan-naming-convention.md` |

The current flow per version (V1 without semaphore, V2 Pista, V3 automatic Tower) is defined in
[`docs/architecture/definiciones-v1-v2-v3.md`](../docs/architecture/definiciones-v1-v2-v3.md).
`FLUJO-END-TO-END.md` stays in place because a live skill cites it; only its header is current.
