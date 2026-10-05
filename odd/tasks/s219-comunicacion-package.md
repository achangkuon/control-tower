# S219 — Ship chanks-0-comunicacion-agentes in the Tower V1 package

## Purpose
Execute Session S219 (Zona producto-torre): put the communication skill into the
V1 package roster, the installer, the project instructions table, and the pending
lists of the personal installer. openspec/plan.yaml and Radar stay the planning
authority; this is subordinate ODD execution continuity.

## Scope and constraints
- Authorized files: product/tower/v1/bundle.mjs, product/tower/v1/install.mjs,
  product/tower/v1/instructions/project-agents.md, product/tower/v1/test/bundle.test.mjs,
  agent-workflows/tools/install.py, agent-workflows/tests/test_personal_config.py
  (the last two were maintainer-authorized additions on 2026-10-05: V1_PENDING_SKILLS
  removal and its test expectations).
- Membership is enumerated, never discovered by traversal (bundle.mjs:22-23).
- Installed templates must not name Tower, MAIN or Support.
- Visible product contract change: minor release per the AGENTS.md release rule;
  publishing requires separate human authorization. NO release in this Session.
- No deferred or personal skills are added.

## Tasks
- [ ] T1 bundle.mjs: add SKILL.md + references/casos-herdr.md to workflowNames.
- [ ] T2 bundle.test.mjs: fix the membership fixture tests.
- [ ] T3 install.mjs: whatever the installer needs so the skill lands in the central folder (verify, may be roster-driven already).
- [ ] T4 project-agents.md: add the "Which skill to load" row (no forbidden strings).
- [ ] T5 install.py: remove chanks-0-comunicacion-agentes from V1_PENDING_SKILLS.
- [ ] T6 test_personal_config.py: 26 central expectations; drop the pending-absence assertions.
- [ ] T7 Full suites green (bun/go/python) + radar check; commit per work unit.
- [ ] T8 Native review (maintainer asked for it), close S219 in plan, push with permission.

## Progress
- T0: S219 archivos expanded with maintainer authorization (2026-10-05); implementation
  delegated to a writer.
