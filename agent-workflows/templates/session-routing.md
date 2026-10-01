<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->
## Chanks and Gentle AI boundary

Chanks decides what is worked on and what runs in parallel. Gentle AI decides how it is implemented, reviewed and delivered. If they collide, Gentle AI wins.

- Chanks owns stages 1 Definir, 2 Preparar, 3 Paralelo and 5 Cerrar. Stage 4, implementing and reviewing, belongs to Gentle AI: Chanks hands over the Session and receives the delivered commit.
- The plan lives only in `openspec/plan.yaml`; `openspec/ROADMAP.md` is its generated view. Read state with the installed Radar: `radar status --json`, `radar sesion <ID>`, `radar faltan`, `radar check`.
- Radar never selects work. Propose only `LISTO` Sessions in Zona order and let the human choose. Start or resume the chosen Session with `chanks-3-session-kickoff`.
- Parallel work: only Sessions Radar reports as compatible, only after the human approves the exact lot, each in its own git worktree. That approval is the explicit authorization Gentle AI requires for parallel writers.
- Chanks skills load only when their stage is entered. Nothing here grants execution, review or delivery authority.
- Herdr dispatch, Pi Intercom and sealed unattended execution are V2 and are not part of this flow.
<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->
