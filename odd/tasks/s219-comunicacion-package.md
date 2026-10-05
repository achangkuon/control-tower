# S219 — Ship chanks-0-comunicacion-agentes in the Tower V1 package

## Purpose
Execute Session S219 (Zona producto-torre) plus its sibling Session S221 (Zona
metodo): put the communication skill into the V1 package roster, the installer,
the project instructions table, and retire the V1_PENDING_SKILLS entry.
openspec/plan.yaml and Radar stay the planning authority; this is subordinate
ODD execution continuity.

## Scope and constraints
- S219 files: product/tower/v1/bundle.mjs, product/tower/v1/install.mjs,
  product/tower/v1/instructions/project-agents.md, product/tower/v1/test/bundle.test.mjs.
- S221 files (created 2026-10-05 with maintainer authorization as S219's sister):
  agent-workflows/tools/install.py, agent-workflows/tests/test_personal_config.py,
  agent-workflows/tests/test_comunicacion_agentes.py.
- Rationale for the split: radar file-authority rejects cross-Zona archivo lists,
  and making the files global cimientos broke four delivered metodo Sessions;
  two sibling sessions in one push keep test_install.py:178's product-export
  boundary green at HEAD.
- Membership is enumerated, never discovered by traversal (bundle.mjs:22-23).
- Installed templates must not name Tower, MAIN or Support.
- Visible product contract change: minor release per the AGENTS.md release rule;
  publishing requires separate human authorization. NO release in this Session.
- No deferred or personal skills are added.

## Tasks
- [x] T0 Planning: S219 archivos restored to product-only; S221 created; radar check 0 errors; commit fc97a5a (docs(plan): split ...). Writer delegated.
- [ ] T1 S221 install.py: V1_PENDING_SKILLS -> ().
- [ ] T2 S221 test_comunicacion_agentes.py: pending assertion flipped.
- [ ] T3 S221 test_personal_config.py: 26 central, no pending-absence logic.
- [ ] T4 S219 bundle.mjs: SKILL.md + references/casos-herdr.md in workflowNames.
- [ ] T5 S219 bundle.test.mjs: membership fixtures.
- [ ] T6 S219 project-agents.md: "Which skill to load" row.
- [ ] T7 S219 install.mjs: verify whether roster-driven (report, change only if needed).
- [ ] T8 Full suites green (bun/go/python) + radar check; two commits (one per session).
- [ ] T9 Native review (maintainer asked for it), close S219+S221 in plan, push with permission.

## Progress
- 2026-10-05: planning split committed; writer delegated (task muumbwru-4-432v).
