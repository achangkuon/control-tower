# S226 · Exclusive installer territory (#158)

Session: S226 (Resolución de problemas › Generales › metodo, PLANIFICADO → EN CURSO)
Authority: agent-workflows/tools/install.py + agent-workflows/tools/install-radar.sh + agent-workflows/tests/test_personal_config.py
Issue: #158. Decision: option A — both installers stay; disputed files get one exclusive owner (radar + chanks-etapa.sh → Torre; personal blocks → personal installer, unchanged).

## Tasks

- [ ] T1 — RED: tests proving (a) install-radar.sh refuses to overwrite a Torre-owned
      ~/.local/bin/radar (ownership manifest present) with a clear message naming the Torre
      route, unless --force; (b) install.py no longer writes ~/.claude/hooks/chanks-etapa.sh
      (Torre-owned, like torre-firma.sh already protected at install.py:163-165).
- [ ] T2 — GREEN: implement both guards minimally; --force documented as an explicit dev
      escape (Talvez the Torre preflight will report the modified entry until next install).
- [ ] T3 — Suites green (python suite at minimum), work-unit commit, deliver per repo policy
      from Main, close #158.

## Evidence

- RED: install-radar.sh overwrote a Torre-owned radar (exit 0) — caught by
  RadarInstallerTerritoryTests before the guard. GREEN after the guard; 6/6 territory tests pass;
  full python suite 519 OK; full bun suite 2141 pass / 0 fail (muvlz5cb-5-v92y).
- Discovery: install.py already stopped writing chanks-etapa.sh in S197 (3ad0bf8) — contract
  locked with a regression test; the install.py change is docs-only. Leftover dead hook-writer
  code + test_install.py coverage = follow-up (needs surface expansion approval).
- Native review review-a9f0a09f40edcdbb: 4 lenses, approved first pass, 6 informational
  findings (no corrections). Commit: 95b3bc9. Delivered b287b5d..95b3bc9 to master.
