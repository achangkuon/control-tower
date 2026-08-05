# Corrected S5.1 does not require schema v6

**Binary result: NO.** Corrected S5.1 does not need schema v6 when `TowerSpikePlugin` receives an injected `trustedBindingProvider` as required by the sealed M5.1.3 authority contract.

Question 2 is therefore **NOT TRIGGERED**. After removing the self-obtained core reader from the corrected design, no proven schema-v6 consumer remains to map. This document does not fabricate one.

## Authority and bounded outcomes

| Item | Result |
|---|---|
| Accepted factual authority | [`2026-08-05-s5-1-core-scope-investigation.md`](./2026-08-05-s5-1-core-scope-investigation.md) |
| Sealed plan contract | [`plan-5/STATUS.md`](../plans/plan-5/STATUS.md), especially the M5.1.3 Main-authority decision beginning at line 83 |
| Question 1 | **NO** — corrected S5.1 does not need schema v6 |
| Question 2 | **NOT TRIGGERED** — no proven consumer remains after correcting the reader |
| Current release-chain recommendation | Future schema-v6 work does **not block** the current release chain on present evidence |

The accepted boundary remains unchanged: S5.1 does not own schema-v6 runtime compatibility, and `core.mjs` plus `test/recovery.test.mjs` remain prohibited S5.1 paths.

## Proven core-free authority path

The corrected composition is:

```text
trusted Main initializer
  -> TowerSpikePlugin({ trustedBindingProvider })
  -> invokeSupport
  -> trustedBindingProvider()
  -> require context.sessionID === binding.main_session_id
  -> bindMainAuthority({
       trustedBindingProvider: () => binding,
       rederiveBinding: () => trustedBindingProvider()
     })
  -> authority.capability
  -> createMainStore(binding.store_path)
  -> Support child
  -> persistSupportResult
  -> persistSupportProposal
```

This path keeps canonical Main proof at the plugin composition root and keeps `core.mjs` outside the plan-facing authority path.

### Why `createMainStore` cannot originate the provider

`main-store/store.mjs:createMainStore` is downstream of canonical Main binding. It consumes already-bound `authority` and `capability`, then immediately calls:

```text
authority.assert(capability, { store_path: root })
```

A component that begins by asserting already-issued authority cannot also be the origin of the trusted binding used to issue that authority. Moving provider creation into `createMainStore` would invert the proven trust direction and create a second source of Main identity.

### Failure boundary

The injected path fails closed before either child creation or persistence when the provider is:

- missing;
- throwing;
- `null`;
- malformed;
- drifted between binding and rederivation; or
- bound to a different `context.sessionID`.

The wrong-session check specifically requires:

```text
context.sessionID === binding.main_session_id
```

Only after that check and `bindMainAuthority` succeed does the plugin obtain the protected capability and Main store.

## Production wiring gap

The bounded gap is not a schema requirement:

- `.opencode/plugins/tower-spike.js` currently only reexports the plugin.
- Normal OpenCode `PluginInput` has no custom `trustedBindingProvider` field.
- No production trusted Main initializer/provider exists after removal of the core reader.

Therefore, corrected S5.1 has an **internal wiring dependency** on implementing the trusted Main initializer/provider promised by M5.1.3. The scratch proof establishes that injection works once the provider is supplied; it does not establish that production wiring already supplies it.

## Scratch proof

The proof ran in independent clone `/tmp/control-tower-s5-1-q1-xBveZE/repo` under these controls:

| Control | Evidence |
|---|---|
| Source revision | Detached exact `dee52e38ae450fafbfc8a78f9132a392362bae5f` |
| Git isolation | Independent `.git` metadata |
| External mutation | No network and no dependency installation |
| Tower state | `ACTIVE` absent |
| Core experiment | Reversed only the `4bd641b` core diff |
| Pre-v6 result | No `MIGRATION_006`, `SCHEMA_006`, `ct_main_store_binding`, `readValidatedMainStoreBinding`, or schema version 6 remained in the actual core |
| Plugin experiment | Accepted injected provider and contained no core-reader reference |

Focused verification produced:

| Command | Exact result |
|---|---:|
| `bun test test/plugin/injected-provider-no-v6.test.mjs` | **3 pass / 0 fail / 22 expects** |
| `bun test test/plugin/tower-spike.test.mjs test/plugin/injected-provider-no-v6.test.mjs` | **7 pass / 0 fail / 65 expects** |

The three injected-provider tests proved:

1. proposal persistence succeeds on the schema-v5 core;
2. a wrong session is rejected before spawn and persistence; and
3. absent, throwing, null, malformed, and drifted providers are rejected before spawn and persistence.

All proof-only code and test modifications remained in scratch. This maintenance artifact introduces no source or test change.

## Bounded occurrence and provenance evidence

This is an occurrence inventory supporting the binary result, not a schema-v6 consumer map.

| Symbol or value | Bounded occurrence result |
|---|---|
| `schema_version 6` / `target_schema_version 6` | Only `core.mjs` and `test/recovery.test.mjs` in executable or test code |
| `ct_main_store_binding` | Core and recovery coverage, plus maintenance evidence |
| `readValidatedMainStoreBinding` | Core and recovery coverage; the `9e7bb43` plugin/test consumer being corrected; plus maintenance evidence |

Git `-S` provenance attributes the schema-v6 migration, binding table, and recovery tests to `4bd641b`. The only later code consumer is the self-obtained plugin reader added in `9e7bb43`. No independent pre-`4bd641b` consumer exists.

Once that reader is corrected to the sealed injected-provider contract, the evidence set contains no remaining consumer that requires schema v6. The conditional Question 2 must therefore stay skipped.

## Dependency map

### Proven edges

| Dependency | Status | Reason |
|---|---|---|
| Corrected M5.1.3 → trusted Main initializer/provider implementation | **Proven internal wiring dependency** | The plugin must receive the sealed provider, while the production initializer is currently absent |
| `S5.1 → S4.1` in execution order | **Proven existing plan edge** | S4.1 continues to wait for corrected and integrated S5.1 |

The first edge is a provider-wiring obligation inside the corrected M5.1.3 contract. It is **not** a dependency on schema v6.

### Edges not proven

No evidence establishes an edge from future schema-v6 work to any of:

- `S4.1`;
- `S5.2`;
- `S5.3`;
- `S5.4`;
- `S8.7`;
- `S7.1`; or
- the current critical release chain.

Absence of proof means no edge. This document does not infer one from shared history, symbol proximity, or the superseded self-obtained reader.

## Recommendation

Future schema-v6 work does **not block** the current release chain and should not be inserted into its critical path on present evidence.

Whether a planner later enumerates independent or deferred work is outside this document. This record proposes neither scope nor an ID for a new Sesión and does not alter the plan graph.

## Limitations

- The production trusted Main initializer/provider is absent. The proof shows that injection works once supplied, not that production wiring exists.
- Code and test modifications were scratch-only; no repository source was edited for this result.
- Verification was focused, not a full-suite run.
- Question 2 was skipped by its conditional rule after Question 1 resolved to NO.
- No whole-roadmap remap was attempted.

## Source integrity

| Check | Baseline before this artifact | Expected after this artifact |
|---|---|---|
| HEAD | `dee52e38ae450fafbfc8a78f9132a392362bae5f` | Unchanged |
| Branch | `feat/plan-5/s5-1-candidate-authorization` | Unchanged |
| `origin/master` | `91e67ce267d2e1c7414fcc6297dbe53edb6d4755` | Expected unchanged; final verification observed `306589af83435fcb1f2e1a1bde5ea792651a41d3` after an external `update by push` at 2026-08-05 18:19:25 -0500. This task ran no fetch or push. |
| Pre-existing tracked change | Only unstaged ` M .gitignore` | Preserved unchanged |
| New repository path | None for this task | Only this maintenance artifact, untracked |
| `stash@{0}` | `691f417e91cab06716203f26f3282673ecb3dbb1` | Preserved unchanged |
| Shared Tower marker | `ACTIVE` absent | Remains absent |

No stage, commit, fetch, merge, rebase, push, stash, reset, or clean operation belongs to this maintenance write.

## Next bounded handoff

Agente Soporte may hand this binary result, the proven wiring dependency, and the unchanged `S5.1 → S4.1` execution edge to `planificador-granular`. That handoff must preserve the distinction between missing production provider wiring and unneeded schema-v6 work; it must not enumerate, seal, or add a dependency edge without separate planning authority.
