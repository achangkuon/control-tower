# Audit E — Herdr skill ownership and the fragility of the current placement

> **Scope.** Read-only. Establishes who authored each of the two pane-related skills, why a herdr
> source clone exists on the maintainer's disk, and what is lost when that clone is deleted.
> **Method.** Git authorship trace over `herdrdev/herdr` and `control-tower`, plus filesystem
> inspection of installed runtime copies. Every claim carries a commit or `file:line`.
> **Date.** 2026-09-04. **Trigger.** Maintainer cleanup of unrecognised `~/projects` directories.
> **Base.** Tower citations resolve against `master@43130ad`, which carries the `agent-workflows`
> subtree; this branch is 65 commits behind it and does not contain that directory.

---

## Headline

There are **two** skills about panes, not one, and the confusion between them is the whole finding.
`skills/torre-control/SKILL.md` is Tower-owned, already safe, and already carries the doctrine.
`skills/herdr/SKILL.md` is authored and shipped by the herdr project; the maintainer's contribution
to it is a six-line cross-reference plus a regression test. **That contribution is the only thing on
the clone worth preserving, and it is preserved verbatim below.** Once this document is committed,
`~/projects/herdr-s4-2` and `~/projects/herdr-worktrees` (6.9 GB) hold nothing unrecoverable.

The placement is fragile in a specific, dated way: herdr emits its own skill from its own binary, so
every herdr upgrade overwrites the maintainer's paragraph on this host with no warning.

---

## 1. The two skills

| | `skills/torre-control/SKILL.md` | `skills/herdr/SKILL.md` |
|---|---|---|
| Repository | `control-tower` | `herdrdev/herdr` |
| Created | 2026-08-29, `6237275` *feat(tower): establish project-owned role routing* | 2026-07-29, `f6060cf6` *fix: scope agent skill installation* |
| Author | achangkuon | Ogulcan Celik |
| Later authors | achangkuon | Ogulcan Celik, akbash |
| achangkuon's edits | the whole file | one commit, `d8a22841`, 2026-09-03 |
| Distribution | installed with Control Tower | emitted by the `herdr` binary and listed in `Cargo.toml:16` `include` |
| At risk | no | **yes — overwritten on every herdr upgrade** |

The Tower skill already owns the doctrine. `skills/torre-control/SKILL.md:16-17`:

> **Never invoke `herdr` to seat a worker. Always `torre asiento`.** It owns the topology in code
> (`hosts/herdr-topology.mjs`), works with Tower OFF or ON, and fails closed where prose is
> forgotten. A hand-written `herdr pane split` is drift.

And `:25`:

> Herdr tabs are visibility, never Git isolation. `MAIN → SUPPORT → AGENTES`.

**This is the skill the maintainer remembered writing. It exists, it is his, and it is committed.**

---

## 2. Why a herdr source clone exists

The clone is not a duplicate installation. The installed binary is Homebrew's
`/home/linuxbrew/.linuxbrew/bin/herdr` at **0.8.2**; the clone's `Cargo.toml` declares **0.8.0**.
Nothing on this host resolves herdr through the clone.

The clone exists because the skill could not be made deterministic from outside herdr.
`herdr --skill` prints the skill from the binary, so its content is a **build output**, not a file the
Tower can pin. `d8a22841` adds a Rust regression test that asserts the emitted skill still defers to
the Tower — `tests/cli/surface.rs`, `skill_output_preserves_activation_ownership_and_approval_contracts`:

```rust
assert!(
    skill.contains("Control Tower dispatch") && skill.contains("torre asiento"),
    "skill must defer Tower seat ownership to torre asiento: {skill}"
);
assert!(
    skill.contains("Inspect the blocked UI and ask the user before answering it")
        && skill.contains("Never authorize via `agent send-keys` autonomously"),
    "skill must require human approval for blocked agent UI: {skill}"
);
```

That is a correct instinct pointed at the wrong repository: it makes **herdr's** build fail if
herdr drops the Tower deferral, which protects nothing the Tower controls and nothing that survives
a herdr release the maintainer does not build himself.

---

## 3. The rule being preserved

`d8a22841` inserts one paragraph into herdr's skill, immediately after its opening description.
Reproduced verbatim so the clone can be deleted:

> Activate this skill only for an explicit Herdr request. Direct, non-Tower Herdr work remains in
> this skill. Control Tower dispatch, Tower ON/OFF decisions, topology selection, and seat lifecycle
> ownership are excluded; route them through `torre-control` → `torre asiento`, then use Herdr only
> within the topology and seat assignment that owner provides.

The same commit tightens two operational sentences of herdr's own prose:

> A successful `agent start` returns only after Herdr detects the expected agent in the same pane and
> considers it ready for interactive input. If the agent is blocked during startup, the command
> returns `agent_not_ready` immediately but keeps the name available for `agent read` and
> `agent send-keys`. Wait until the agent becomes idle before prompting it. Startup defaults to a
> 30-second timeout.

> If the agent is already `blocked`, it returns `agent_blocked` without sending input. Inspect the
> blocked UI and ask the user before answering it. Never authorize via `agent send-keys`
> autonomously.

**Live location on this host:** `~/.pi/agent/skills/herdr/SKILL.md` carries all three edits and is the
only copy that does. No equivalent exists under `~/.claude`, `~/.config/opencode`, or `~/.codex`.

---

## 4. The August work, and why it is not preserved

Ten commits dated 2026-08-14 on the clone's `feat/agent-root-observation-v1` add OpenCode session
lineage and pane-bound root observation to herdr's Rust core: 893 insertions across 25 files, mostly
`src/terminal/state.rs` (+450). They exist on no remote branch and in no pull request.

They were half of a paired change. The same day, Control Tower received `98a2da2`
*feat(host): project visible roots in Herdr* — `hosts/herdr.mjs` (+40) with tests (+42), and it
reached `master`.

**The Tower then retired its half.** `3857a81`, 2026-08-26, *refactor(hosts): retire legacy Herdr
launch path*, deleted `hosts/herdr.mjs` (−49) and `test/hosts/herdr.test.mjs` (−61), net −279/+74.
Its replacement arrived 2026-08-30 in `cb3ed7e` *fix(tower): seat worker panes inside the AGENTES
tab*, which created `hosts/herdr-topology.mjs` — the module that drives herdr **as shipped**, through
`tab list`, `pane current` and `tab rename`, with no herdr modification at all.

The current architecture is therefore "the Tower consumes herdr unmodified", decided in code twelve
days after the August experiment. The ten commits support the path that decision removed. They are
recorded here and not preserved.

---

## 5. Where the skill belongs — and the constraint the canon already sets

The approved end-to-end flow already rules on this. `agent-workflows/FLUJO-END-TO-END.md:164-168`:

> **Frontera del asiento:** MAIN carga `torre-control` y entra por `torre asiento`; esa puerta posee
> la topología y delega en Herdr tanto con la Torre encendida como apagada. Ni MAIN ni el kickoff
> crean el asiento con un `herdr pane split` escrito a mano. La skill de runtime `herdr` se carga
> solo cuando hay que inspeccionar o controlar Herdr explícitamente; no reemplaza `torre asiento`
> **ni se convierte en una skill nueva del método.**

So a Tower-owned herdr skill **cannot** take a `chanks-<tramo>-<nombre>` name: the canon excludes it
from the method skills by name. Its correct home is box 3 of the same document
(`FLUJO-END-TO-END.md:24`), *Skills de la maquinaria* — `control-tower/Main/skills/`, beside
`torre-control`, `torre-control-entregas` and `torre-control-soporte`. Its connection to the flow is
through tramo ③ Enrutado, which is where the seat boundary lives; it is referenced there, not
enumerated as a tramo skill.

### The ownership gap

No enumerated Sesión owns that surface. Decision 104 closed the neighbouring ownership and left this
outside it (`inventario-de-producto.md:348`): `S9.5` owns Herdr topology and materialisation only,
`S9.8` owns fire-and-forget dispatch and skill terminality, `S8.12` packages the resulting bytes.
A Tower-owned herdr runtime skill is none of those.

The surface is also not free to edit. `test/install/tower-role-assets.test.mjs:12-100` hardcodes the `ASSET_CONTRACTS`
manifest of every Tower skill — name, roles and cross-references — so adding one is a code change
with a failing test until the manifest is updated, not a documentation edit.

**Consequence:** placing this skill requires new authority and an enumerated Sesión. It is recorded
here as an unowned surface, not resolved here.

---

## 6. Disposition

| Item | Finding | Action |
|---|---|---|
| `skills/torre-control/SKILL.md` | Tower-owned, committed, carries the doctrine | none — already safe |
| The six-line cross-reference and its two prose tightenings | Live only in `~/.pi/…` and one unpushed commit | **preserved verbatim in §3** |
| The Rust regression test | Protects herdr's build, not the Tower's | recorded in §2; not preserved as code |
| Ten commits of 2026-08-14 | Support a Tower path retired in `3857a81` | recorded in §4; not preserved |
| `~/projects/herdr-s4-2`, `~/projects/herdr-worktrees` | 6.9 GB, of which 4.6 GB is Rust build cache | disposable once this document is committed |
| A Tower-owned herdr runtime skill | No owning Plan or Sesión | **needs maintainer authority — see §5** |
