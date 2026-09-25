# S158 — Stage-five skill rename and delivery-policy reader

## Authority

- Approved Session: S158 — chanks-6-politica-de-entrega se renombra chanks-5-politica-de-entrega y suma el modo leer para la etapa 5; chanks-7-session-doc se renombra chanks-5-session-doc completa; toda referencia cruzada vigente apunta al nombre nuevo.
- Base: `ed36a61a9334cde06bda65edb7dd1ec3ae504758` on `master`.
- Fresh Radar state: `LISTO`; stage 3 (`Despachar`).
- `radar status --json` SHA-256: `7685d06d98e6d59872a5ec9054afb0134c69ecc4308c8bd4f409d9146c553feb`.
- `radar sesion S158` SHA-256: `f662caccf2fd96aa53813b5c127780ae092a1d0f30fe9fca6436fd7c58ceab4c`.
- Route: native ODD; strict TDD applies.
- S158 and S159 overlap `agent-workflows/tools/install.py` and `agent-workflows/tests/test_install.py`; the approved chain runs them serially, S158 first.
- `AGENTS.md` Cimiento reservation: exact mentions only. Main holds the serial intervention; the live Intercom roster reported no other session in this cwd before the first write. No other Cimiento path is authorized.
- Skill installation/propagation remains deferred until S159.

## Scope interpretation

- Rename the complete live `chanks-7-session-doc` tree without rewriting descriptive asset payload identifiers; the approved result says to move that tree with the same content.
- Update live operational references, not frozen historical snapshots. Historical evidence remains byte-identical.
- S123 stays `DIFERIDO`; at closure, only its reserved file path moves from `chanks-7-session-doc/SKILL.md` to `chanks-5-session-doc/SKILL.md`.
- `.atl/skill-registry.md` is outside the exact Session scope and is not regenerated here. Repository installation and five-agent propagation happen only after S159.

## Tasks

- [x] T1 — Add strict-TDD contracts for the new skill trees, delivery-policy read mode, installation/retirement lists, live cross-references, and preserved historical evidence. Proof: focused RED preceded implementation; builder 21/21, focused installer 3/3, coordinator 30/30.
- [x] T2 — Rename both stage-five skills and implement delivery-policy read routing while preserving the existing declaration mode and session-doc payload content. Proof: independent verifier confirmed both complete trees and byte-identical session-doc assets/references.
- [x] T3 — Update every authorized live consumer, installer reference, template, canonical convention, method document, and exact `AGENTS.md` mentions; repoint only S123's reserved path at closure. Proof: one scoped RED→GREEN correction replaced the stale `.chanks-7-session-doc.json` reference with the real `.session-doc.json`; independent verifier returned PASS.
- [ ] T4 — Run focused and regression verification, native review or recorded fallback, deliver the coherent implementation commit, then record closure evidence without propagating skills.

## Checkpoint

Implementation and independent verification are complete. The candidate has no S158-caused failures; the full installer suite still contains two base-identical assertions against out-of-scope kickoff wording. Next: run the native review entry, then deliver the implementation if review is unavailable or closes cleanly.
