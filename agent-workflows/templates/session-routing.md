<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->
## Chanks and Gentle AI boundary

Chanks decides what is worked on and what runs in parallel. Gentle AI decides how it is implemented, reviewed and delivered. If they collide, Gentle AI wins.

- Chanks owns stages 1 Definir, 2 Preparar, 3 Paralelo and 5 Cerrar. Stage 4, implementing and reviewing, belongs to Gentle AI: Chanks hands over the Session and receives the delivered commit.
- The plan lives only in `openspec/plan.yaml`; `openspec/ROADMAP.md` is its generated view. Never read the whole plan. Start with fresh summaries from the installed `radar status --json` or `radar faltan`; use `radar etapa <ID>` only for a chosen Session, then `radar sesion <ID>` per human-chosen Session. For authorized plan edits, locate and read only the exact entry; run `radar check`, then `radar render` only after it passes.
- Radar never selects work. Propose only `LISTO` Sessions in Zona order and let the human choose. The start is organic: hand the chosen Session to Gentle AI through `chanks-4-puente`; there is no admission step.
- Parallel work happens inside one conversation: only Sessions Radar reports as compatible, only after the human approves the exact lot, each delegated to a subagent in its own git worktree; the orchestrator integrates and delivers serially. That approval is the explicit authorization Gentle AI requires for parallel writers. Load `chanks-3-paralelo`.
- Chanks skills load only when their stage is entered. Nothing here grants execution, review or delivery authority.
- Session reservation and several conversations delivering at once arrive with V2 (Pista); Herdr dispatch, Pi Intercom and sealed unattended execution are V3. None is part of this flow.
<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->
