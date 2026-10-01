# Session admission contract

Canonical contract for `start`, `continue` and `resume` of one approved Session. Moved here from the
always-loaded instruction block so it loads only when `chanks-3-session-kickoff` is entered.

<!-- SESSION-ADMISSION-CONTRACT:CANONICAL -->
```json
{
  "intents": ["start", "continue", "resume"],
  "evidence": {
    "source": "Radar via the read-only planning evidence helper",
    "commands": ["radar status --json", "radar sesion <ID>"],
    "binding": ["HEAD", "Session ID", "SHA-256(radar status --json exact bytes)", "SHA-256(radar sesion <ID> exact bytes)"]
  },
  "admissible": {
    "start": {"states": ["LISTO"]},
    "continue": {"states": ["LISTO", "EN CURSO"], "requires": {"native_encargo": "same Session identity plus reconciliation of native ODD record, code, and evidence", "legacy": "first pending Módulo for legacy"}},
    "resume": {"states": ["LISTO", "EN CURSO"], "requires": {"native_encargo": "same Session identity plus reconciliation of native ODD record, code, and evidence", "legacy": "first pending Módulo for legacy"}},
    "route": "chanks-3-session-kickoff"
  },
  "non_admissible": {
    "output": ["state", "blocker", "Zone-ordered LISTO choices"],
    "forbidden_fallbacks": ["chanks-3-session-kickoff", "chanks-1-cierre-de-decisiones"]
  },
  "decision_closure": "separate explicit human request for the named decision",
  "semantics": {
    "seats": "compatible capacity, never assigned agents",
    "queue": "Zone-ordered rows and length, never assigned agents",
    "listo_choices": "count of current LISTO choices, never assigned agents"
  },
  "tower_boundary": "manual-only; no Tower runtime or skills"
}
```
<!-- /SESSION-ADMISSION-CONTRACT:CANONICAL -->

`chanks-3-session-kickoff/SKILL.md` states the operative rule in plain form: run the installed
`radar status --json` and `radar sesion <ID>`; `start` requires `LISTO`; `continue`/`resume` require
`LISTO` or `EN CURSO` and the same Session. Every rejected state returns only state, blocker, and
Zone-ordered `LISTO` choices; there is no fallback to kickoff or decision closure. The `binding`
field above is kept for compatibility with consumers that already read this JSON.
