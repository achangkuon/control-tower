# Audit D — Can the Control Tower own a branded TUI badge inside Pi?

**Subject:** `pi` v0.84.4 (`@earendil-works/pi-coding-agent`), plus the Pi packages installed for this
maintainer: `gentle-pi@2.3.0`, `pi-intercom@0.13.0`, `pi-mcp-adapter@2.32.1`.
**Date:** 2026-09-03 · **Method:** source reading of the installed packages plus one CLI invocation
(`pi --help`). **Cost: 0 model-contacting invocations.** Nothing was executed, installed, or mutated.
**Brief:** the maintainer asked whether Tower operations can render in Pi the way Gentle AI renders
`🌹 Gentle AI · completed · review capture` — an emoji, a name, and a colour — and which Tower surfaces
are cheap or expensive to badge.
**Scope:** presentation only. This audit decides nothing about Tower authority, enrolment, or delivery.

---

## Verdict

**Yes, and the mechanism is already in the Tower's hands.** Pi's extension API exposes per-tool
`renderCall` / `renderResult`, and the canonical implementation of exactly the requested badge is
70 lines long (`gentle-pi/lib/gentle-ai-renderer.ts`). The Tower already ships a loaded Pi extension
(`extensions/pi/tower-session-router.ts`), so the attachment point exists and needs no new plumbing.

Two corrections to assumptions that were on the table:

1. **The theme cannot carry the badge.** `theme.fg()` accepts only a closed union of ~46 named tokens.
   A theme file chooses *which* blue; it can neither add a token nor contribute an emoji or a label.
   The badge is extension code, and the theme is its palette.
2. **Routing the Tower into Pi over MCP forfeits the badge.** MCP does reach Pi — but through
   `pi-mcp-adapter`, which renders MCP rows itself and exposes no per-server emoji, icon, or label
   setting. A Tower reached over MCP renders as a prefixed tool name in the adapter's own style.

That second point matches the route the plan already chose: `plan-8/STATUS.md:1006` carries
`adapters/pi/**` and `extensions/pi/**` in `RUNTIME_PAYLOAD_FILES`, `:1010` and `:1041` explicitly
exclude Pi/Intercom configuration, and `plan-9/STATUS.md:255` records Pi as *a second host, not a
transport*. **No MCP surface for Pi is planned, and none should be.**

The one surface that genuinely resists badging is the one that prompted the question. The `intercom`
row the maintainer photographed belongs to `pi-intercom`, a third-party package — not to the Tower's
own intercom (`adapters/pi/runtime.mjs`), which is transport and paints no row at all.

---

## Scorecard

| # | Question | Verdict | One line |
|---|---|---|---|
| 1 | Can an extension paint an emoji + name + colour on a tool row? | **PASS** | `pi.registerTool({ label, renderCall, renderResult })`; `docs/extensions.md:2238`. |
| 2 | Is there a working reference to copy? | **PASS** | `gentle-pi/lib/gentle-ai-renderer.ts` — 70 lines, whole badge. |
| 3 | Does the Tower already have a loaded Pi extension? | **PASS** | `extensions/pi/tower-session-router.ts`, declared in `extensions/pi/package.json`. |
| 4 | Can a custom theme add a Tower colour token? | **FAIL** | `ThemeColor` is a closed union; theme JSON is schema-validated. |
| 5 | Can built-in tools (`bash`, `read`) be re-rendered? | **PASS** | Re-register by name, delegate `execute`; `examples/extensions/built-in-tool-renderer.ts`. |
| 6 | Does Pi core speak MCP? | **FAIL** | No flag, no command, no doc; package resources are extensions/skills/prompt-templates/themes. |
| 7 | Does the maintainer's Pi speak MCP anyway? | **PASS** | `pi-mcp-adapter@2.32.1`, listed in `~/.pi/agent/settings.json`; it is what reads `~/.pi/agent/mcp.json`. |
| 8 | Can MCP-routed tools carry the Tower badge? | **FAIL** | The adapter self-renders; settings expose only `showStatusIcon` and `toolPrefix`. |
| 9 | Is the photographed `intercom` row the Tower's? | **NO** | It is `pi-intercom@0.13.0`, third-party MIT. |

---

## Evidence

### 1. The render hook

`docs/extensions.md:2238` ("Custom Rendering"): a registered tool may define `renderCall` and
`renderResult`, each returning a TUI `Component`. `renderCall` owns the header row — the line that
carries the emoji, the name, and the colour.

Beyond tool rows, the API also offers `pi.appendEntry` + `pi.registerEntryRenderer` (TUI-only cards
that never enter LLM context), `pi.registerMessageRenderer` (cards that do), `ctx.ui.setStatus`
(persistent footer), and `ctx.ui.setWidget`.

### 2. The canonical badge, in full

`gentle-pi@2.3.0`, `lib/gentle-ai-renderer.ts`, line 61 — the entire visual contract:

```ts
const lines = [theme.fg(color, theme.bold(`🌹︎ Gentle AI · ${status} · ${operationPath}`))];
```

`status` is derived from the render context (`preparing` → `running` → `completed` / `failed`) and
`color` maps to four stock tokens: `warning`, `success`, `error`, `dim`. The file is 70 lines total,
including the result renderer and the component-reuse cache. There is no private API in it.

### 3. Why the theme cannot own the badge

`dist/modes/interactive/theme/theme.d.ts:4` declares `ThemeColor` as a closed string union of ~46
tokens (`accent`, `mdLink`, `toolTitle`, `success`, …). `theme.fg(color, text)` accepts nothing else.
Theme JSON is validated against a schema and rejects unknown keys with a listing of the required
tokens (`dist/modes/interactive/theme/theme.js:415-441`).

The maintainer's active theme is `Gentle` (`~/.pi/agent/settings.json`), shipped by `gentle-pi`
alongside `Gentleman-Cute` and `Gentleman-Sexy`. A Tower blue belongs in that file **as the value of
an existing token**; the emoji and the label do not belong there at all.

### 4. MCP reaches Pi, but not the badge

Pi core has no MCP: `pi --help` (0.84.4) lists no MCP flag or command, `docs/` has no MCP page, and
`docs/packages.md:5` enumerates package resources as extensions, skills, prompt templates, and themes.

`pi-mcp-adapter@2.32.1` supplies MCP as an extension, and is what consumes `~/.pi/agent/mcp.json`.
It renders MCP rows itself (`toolResultRendering: "compact" | "boxed"`), and its settings table
(`README.md:368-410`) offers only `showStatusIcon` — a global plug glyph — and `toolPrefix`, which
shapes the tool *name*. There is no per-server emoji, icon, or display name.

Consequence: a Tower exposed to Pi through `mcp.mjs` + the adapter renders as
`controltower_tower_status` in the adapter's style. MCP and the Tower badge are mutually exclusive.

### 5. Two different things named "intercom"

| | `pi-intercom@0.13.0` | Tower intercom |
|---|---|---|
| Owner | third-party npm, MIT | Control Tower |
| Location | `~/.pi/agent/npm/node_modules/pi-intercom/` | `adapters/pi/runtime.mjs`, `workspace/pi-supervisor.mjs` |
| Pi surface | tool `intercom` (`index.ts:2088`), tool `contact_supervisor` (`index.ts:1817`), both with `renderCall` | none — it is transport |
| Renders a row today | yes | no |

The row the maintainer photographed (`intercom list` / `intercom send →`) is the first column. It is
proof the pattern works, and simultaneously the reason that particular row is expensive: badging it
means forking the package or re-registering the `intercom` tool from a Tower extension, which
replaces it wholesale and transfers its maintenance to the Tower.

Audit C already classified `pi-intercom` as a third-party substrate the Tower *leverages*. This audit
adds only that its TUI rows are its own, not the Tower's.

---

## Cost map

| # | Surface | Cost | Basis |
|---|---|---|---|
| 1 | Enrolment / session router | **Low** | `extensions/pi/tower-session-router.ts` is already loaded; add `appendEntry` + `registerEntryRenderer`. |
| 2 | Persistent session indicator | **Low** | One `ctx.ui.setStatus("tower", …)` call, or a widget. |
| 3 | Any new Tower-defined Pi tool | **None** | Born with `label` + `renderCall`. Zero exist today. |
| 4 | Radar → `tower_radar` tool | **Low-medium** | ~40-60 lines to wrap the Go binary in `agent-workflows/tools/radar`, ~30 to render. |
| 5 | `bin/torre` → tool | **Low-medium** | Same shape as #4; granularity (one tool with subcommands vs. one per command) is an open product decision. |
| 6 | Third-party `intercom` row | **High** | Not Tower code; requires a fork or a wholesale tool replacement. |
| 7 | Anything routed via MCP | **N/A** | The adapter does not yield the render. |

**Cross-cutting cost.** `extensions/pi/package.json` declares a closed `requiredCapabilities` list and
a reviewed `reviewedTransforms` inventory. Adding render capability means amending that contract —
cheap, but not invisible, and it is the contract `S8.13` preflight validates.

**A note on #4 and #5.** Wrapping a command in a tool is not only a rendering choice. A tool is a hard
rule the agent cannot route around; a `bash` invocation always can be. The alternative — re-registering
`bash` and pattern-matching Tower commands — works (`examples/extensions/built-in-tool-renderer.ts`)
but makes the Tower the owner of every `bash` row in the session. The tool wrapper is the better
design on its own merits, and the badge is a by-product.

---

## What this audit does not decide

- Which surfaces get badged, and in what order. That is a plan decision.
- The Tower's colour, glyph, and wording. Presentation copy, maintainer-owned.
- Whether `bin/torre` becomes one tool or several. Open, and named above as such.
- Anything about Tower authority, enrolment semantics, or delivery. Untouched.
