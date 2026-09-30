# Tower V1 final four-session planning

## Goal

Make the remaining Tower V1 work explicit and executable in the canonical plan, with the dependency chain `S172 -> S174 -> S173 -> S150`.

## Authorized edit surface

- `openspec/plan.yaml`
- `openspec/ROADMAP.md` (generated only by `radar render`)
- `odd/tasks/tower-v1-final-four-sessions.md`

No product implementation, installer execution, HOME/global-state mutation, commit, push, or release is authorized by this planning unit.

## Decisions

- S172 exposes a dedicated `cleanup` command; it does not widen `uninstall`.
- S174 makes `torre-control` a private-release global installer/updater, keeps global engine state separate from project-local adoption, opens an interactive menu without arguments, and also provides closed scriptable subcommands.
- S173 measures context bytes actually observed by isolated Pi and Claude Code runs. Static file-byte counts may explain results but cannot replace host evidence.
- S150 documents only delivered behavior and measured evidence.

## Tasks

- [x] Derive the executable S172 cleanup plan.
- [x] Derive the executable S174 installer/update plan.
- [x] Derive the executable S173 adopter/non-adopter benchmark plan.
- [x] Derive the executable S150 final README plan.
- [x] Integrate the four Sessions, regenerate `openspec/ROADMAP.md`, and verify Radar output and dependencies.

## Verification

- `$HOME/.local/bin/radar check -C /home/emili/projects/control-tower/Main`
- `$HOME/.local/bin/radar render -C /home/emili/projects/control-tower/Main`
- Fresh `radar status`, `radar faltan`, and per-Session inspection for S172, S174, S173, and S150.
- Review the final diff and confirm no files outside the authorized edit surface changed.

## Evidence

Baseline at `c837aa3121bec2a4dac9ad8ff206499a3e55d086`: clean tracked `master`, `radar check` reported 0 errors and 63 warnings, Tower V1 reported 8/11, S172/S173/S150 were incomplete, and S174 did not exist. This task document was already untracked before integration.

Observed after integration (all commands exit 0): `$HOME/.local/bin/radar check -C /home/emili/projects/control-tower/Main` → 0 errors/63 pre-existing warnings; `$HOME/.local/bin/radar render -C /home/emili/projects/control-tower/Main` → ROADMAP regenerated; the same check → 0 errors/63 warnings. `radar status --json` and `radar faltan` → Tower V1 8/12 (66%), S172 LISTO, S174/S173/S150 PLANIFICADO; `radar sesion` for each confirmed S172→S174→S173→S150 via dependencies `[S8.13]`, `[S172]`, `[S174]`, `[S173]`. `git diff --check` → clean; status showed only plan.yaml, generated ROADMAP.md and the pre-existing untracked task document.
