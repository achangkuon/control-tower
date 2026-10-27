# Agent Workflows

Version-controlled source of truth for the user-owned Chanks skill family:
product Session coordination, plan authority and closure. Gentle AI owns technical
decomposition, implementation, checks, continuity and native SDD phase surfaces;
this package never replaces, edits or regenerates its managed assets.

The original Control Tower candidate flow is frozen byte-for-byte under
`product/tower/generic/`; it is product history, not active builder policy. The
active builder does not require roles, seats, dispatch, tokens, queues or an
external coordination API.

## Install by owner

**Control Tower is the single product installer.** Its reviewed V1 roster is
exported by `product/tower/v1/runtime-config.mjs`, from the release bundle. Tower
owns on each machine:

- V1 skills in `~/.agents/skills/` and their Claude links in `~/.claude/skills/`;
- the central `_shared/plan-naming-convention.md` and `~/.local/bin/radar`;
- Claude hooks `chanks-etapa.sh` and `torre-firma.sh`, including settings registration;
- Pi `~/.pi/agent/extensions/chanks-notices.ts`;
- the `control-tower:pointer` block in the four runtime instruction files.

The complete workflow lives in each adopted project's `AGENTS.md` (S196), not in
another global workflow block. Install/update these assets through the Tower's
product lifecycle, not through the maintainer's personal installer.

**The maintainer's personal configuration lives in its own repository
(machine-setup) and installs from there** (S244). Nothing personal ships in the
Tower bundle or counts as a Tower skill. This repository owns only the product
side: the product skill roster (`tools/roster.py`), the product skills and
templates the roster declares, and the legacy helper templates the personal
installer still reads from a configured Control Tower checkout.

Gentle AI is an independent product with its own installation/update authority.
These skills do not ship with it; `author: gentleman-programming` frontmatter is
a historical template default, not provenance. Never copy Gentle AI skills or
managed `_shared` files into this repository.

### Personal configuration installs from machine-setup

The maintainer's personal configuration — the installer (`tools/install.py`),
its tests, `skills-personales/`, the six personal block templates, `personal-pi/`,
`tools/pi/`, `main-al-dia`, `carril-medir` and `chanks-0-agente-soporte` — moved
to its own repository (machine-setup, S244). Install, check and migrate from
there; this repository holds no personal sources anymore.

The installer still needs product pieces (the roster, `chanks/torre-firma.mjs`,
the `chanks/pi-*.mjs` modules, `_shared` and the two legacy templates). It takes
them from a Control Tower checkout resolved by the `--torre` flag, the
`TORRE_CHECKOUT` environment variable, or machine-setup's `tools/torre-checkout`
config file — never from machine-setup itself. `tools/roster.py` is the product
roster this repository owns; the product tests assert their contracts against it.

Carril follows the same split: it loads the machine-setup installer and points it
at the candidate worktree, so the lane shows exactly what installing that
worktree would install. `torre-setup` and `install.sh` install only the Tower.

### Compatibility and deferrals

`SKILLS`, `CHANKS_SKILLS`, `TOWER_V1_SKILLS`, `RETIRED_SKILLS`, `RETIRED_SKILL_FILES`,
`skill_source_root` and `source_files` are the public product inventory for other
consumers (now `tools/roster.py`). The personal roster and writes live in
machine-setup. Hermes is not covered by Tower's four-runtime installer either;
its helper moved with the personal installer.

| Family | Skills |
|---|---|
| Shared convention (Tower central ownership) | `_shared/plan-naming-convention.md` |
| Chanks planning and bridge (Tower V1) | `chanks-1-adopcion`, `chanks-1-autoridad`, `chanks-1-brain-dump`, `chanks-1-descubrimiento`, `chanks-1-feature`, `chanks-1-heredado`, `chanks-1-prd`, `chanks-1-project-kickoff`, `chanks-1-requirements`, `chanks-1-rfc`, `chanks-1-terreno`, `chanks-4-puente` |
| Session workflow (Tower V1) | `chanks-3-paralelo`, `chanks-0-session-context-loader`, `chanks-2-planificador-granular`, `chanks-5-session-doc` |
| Delivery policy (Tower V1) | `chanks-5-politica-de-entrega` |
| Decision and communication support (Tower V1) | `chanks-1-cierre-de-decisiones`, `chanks-0-explicalo-simple`, `chanks-0-mensajes-visibles`, `chanks-0-skill-composer`, `analisis-por-tramos`, `skill-orchestrator` |
| Personal active skills (not Tower; source in machine-setup) | `chanks-0-agente-soporte`, `torre-release`, `gentle-deck`, `gentle-video` |
| Manual agent communication (source in `skills/`, Tower V1 packaging pending, not installed yet) | `chanks-0-comunicacion-agentes` |
| Deferred to V2, Pista (source kept, not installed) | `chanks-0-jornada`, `chanks-3-session-kickoff`, `chanks-3-coordinador-manual` |
| Deferred to V3, automatic Tower (source kept, not installed) | `chanks-3-despacho-herdr`, `chanks-4-unattended-implementation` |

The five non-V1 product sources live in [`skills-diferidas/`](skills-diferidas/README.md),
grouped by version. `chanks-0-agente-soporte` moved to machine-setup
(`skills-diferidas/v2/` there) and remains installed as a personal skill, never
as a Tower V1 bundle member.

`chanks-0-comunicacion-agentes` is not deferred: it is listed in `V1_PENDING_SKILLS`
until the Tower V1 package adds it, so neither Tower nor this installer writes it.
It covers what the user asks for by hand —message, observe or stop another agent,
open a pane— and cites the native `herdr` skill for commands. Automatic Session
dispatch stays in `chanks-3-despacho-herdr` (V3).

Every existing deferred-skill retirement remains unchanged: installed copies are
archived under `.retired-skills/`, never reinstalled. The retired Pi write-lock
shim `chanks-controls.ts` still moves to `.pi/agent/.retired-controls/`, outside
Pi discovery. Retirement ownership (which installed copies are no longer
current) is computed against this repository's product sources plus the
personal sources the machine-setup installer owns.

## Native Sessions

Native product coordination is `Zona → Sesión`. A Session declares Zona, identity,
priority/dependencies, exact authorized files, Cimientos/resources, authority, and
an `encargo` with exactly `pedido_contexto`, `resultado_comportamiento`,
`restricciones_decisiones` and `referencias`. ODD is the default technical path.
Its document and Engram record are continuity evidence, not another product plan.

SDD is available only after explicit human `solicitud_sdd`; Gentle AI's native
preflight/authority/archive controls apply. Complexity does not select it.
Historical legacy routes remain readable as evidence and are not retrofitted.
Native resume reconciles Session identity with its technical record, code and
checks; legacy resume retains first-pending-Módulo behavior.

## Radiografía

`radiografia/` generates a self-contained HTML product report from each project's
`radiografia.json` and `.githooks/pre-push`. It never blocks a push. See
`radiografia/README.md`; current adopters include control-tower, proyecto-beta,
Proyecto-Alpha and Proyecto-Gamma.

## Validation

Never run fixture verification against the real HOME:

```bash
cd agent-workflows
HOME=$(mktemp -d) PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -q
cd ..
HOME=$(mktemp -d) bun test agent-workflows
```

Do not edit `sdd-*`, Gentle AI's `_shared` files, `gentle-orchestrator`,
`opencode.json`, or managed instruction blocks.

## Layout

```text
skills/                         canonical V1 product skill sources
 skills-diferidas/v2/            Pista sources
 skills-diferidas/v3/            automatic Tower sources
 templates/                      retained legacy helper templates (session-routing, plan-naming)
 tools/roster.py                product skill roster (consumed by the machine-setup installer)
 tests/                         product fixture tests
```

### Historical documents

`historico/` is traceability, not current instructions. Its documents carry
replacement banners.

| Document | Replaced by |
|---|---|
| `historico/EJECUCION-EN-PARALELO.md` | `chanks-3-paralelo` and version definitions |
| `historico/MIGRACION-ZONAS.md` | `openspec/plan.yaml` and `_shared/plan-naming-convention.md` |

Version definitions:
[`docs/architecture/definiciones-v1-v2-v3.md`](../docs/architecture/definiciones-v1-v2-v3.md).
`FLUJO-END-TO-END.md` remains because a live skill cites it; only its header is current.
