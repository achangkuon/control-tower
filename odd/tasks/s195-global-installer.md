# S195 — Global runtime installer

## Delivered contract

`radar sesion S195` supplied the contract and confirmed the expanded authorization. Global CLI install/update now configures the verified active release: V1 skills and canon, relative Claude links, compiled Radar, passive Claude/Pi signatures, and marked runtime pointers. Gentle AI is required; doctor reports components and its version. Ownership-backed uninstall restores foreign entries. Clean committed checkouts can install without publishing.

The pre-existing `openspec/plan.yaml` authorization change was preserved. No installer ran against `/home/emili`; no repository commit, push, publish, dependency mutation, or project-adoption policy redesign was performed. Execution fixtures use disposable HOME directories.

## Decisions and boundaries

- `runtime-config.mjs` is shipped normally. `release-build.mjs` is also shipped so an installed CLI can build an explicitly named local checkout. After the S204 vendor follow-up, new releases have exactly **91 members** (81 bundle members plus 10 Tower modules).
- Cached S194/S195 releases retain their exact **72/74-member** rosters and pinned SHA-256 verification. Only the cached verifier accepts those historical rosters; new acquisition requires all 91 members. Partial or fictitious hybrid rosters are rejected.
- Runtime ownership lives at `$HOME/.local/share/torre-control/runtime-ownership.json`, alongside—not inside—the immutable V1 lifecycle root. Whole skill directories have closed membership and file digests. Shared canon ownership is file-only. Links, pointer blocks and added hook registrations have content digests too.
- Foreign differing entries are renamed to timestamp/UUID backups before replacement. Identical skill bytes are adopted, including private file modes. Updates retain the original foreign backup. Uninstall refuses modified owned resources or backups rather than deleting user edits.
- Settings are merged semantically; unrelated keys, hooks and later empty hook entries survive. Exact original formatting is restored when the generated settings remain unchanged. Private settings/instruction modes are preserved.
- Pointer replacement is surgical; unrelated bytes—including Gentle AI blocks—remain untouched. Malformed, nested, duplicated or non-line-delimited owned markers fail before installation writes. Codex/OpenCode directories are not created just to add instructions.
- Go uses an explicit allow-list with `GOWORK=off`, `GOENV=off`, `GOFLAGS=-mod=vendor`, `GOPROXY=off`, `GOSUMDB=off`, `GOTOOLCHAIN=local`, `GOTELEMETRY=off`, and `CGO_ENABLED=0`. Radar builds have private HOME/tmp/GOPATH and initially empty private GOCACHE/GOMODCACHE. No operator module-cache probe or reuse occurs.
- CLI operations pass explicit HOME/environment/runner to the global lifecycle. The pre-existing engine-only API path without `home` remains for low-level lifecycle callers/tests. Rollback with HOME reconciles runtime resources from the cached verified previous release.
- Runtime writes are not a multi-resource atomic transaction. An exceptional mid-write failure retains `.runtime-lock` ownership recovery evidence and displaced bytes, returns nonzero, and blocks automatic reentry. Doctor reports modified components. Manual recovery remains necessary; this is not silently treated as a successful installation.

## Commands added

```text
torre-control install --from-checkout <repo>
torre-control update --from-checkout <repo>
torre-control uninstall
torre-control --help
```

Local mode invokes the existing release builder against a clean committed tree, then uses the same envelope/member digest verifier and global activation path. It never substitutes unchecked working files or downloads from GitHub.

## Observed test-first evidence

| Behavior | RED observed | GREEN observed |
| --- | --- | --- |
| Runtime resources and safety | Initial missing module, then no-op scaffold: **8 failures** covering skills, backups, Go build, signatures, invalid JSON, pointers, escapes and Gentle AI | **8 pass, 0 fail** after implementation |
| Exact release roster | Bootstrap/release-build focused run: **6 failures** after tests required 74 members | **25 pass, 1 optional skip, 0 fail** |
| Standalone Gentle AI prerequisite | Installer incorrectly returned success when Gentle AI was missing: **1 failure** | Installer suite: **15 pass, 0 fail** |
| CLI help/prerequisite | Help returned 1; missing-Gentle dispatch incorrectly proceeded: **2 failures** | Subsequent focused CLI runs passed |
| Invalid settings before CLI parent preparation | Snapshot showed unwanted `.local` parents: **1 failure** | Subsequent CLI run passed with unchanged HOME snapshot |
| Runtime failure evidence | Injected fault was ignored: **1 failure** | Recovery-evidence and reentry-refusal test passed |
| Adoption and surgical uninstall | Private-mode identical skill was backed up; empty unrelated hook was lost; new-runtime pointer was not diagnosed: **3 failures** | Triangulation tests passed |
| Cached S194 compatibility | Cached verifier export absent: **1 failure** | Exact historical roster/digest and real lifecycle update tests passed |
| Rollback consistency | Pointer still named the newer release: **1 failure** | Runtime pointer follows verified previous release |
| Hook equality/private modes | Reordered but identical hook was refused: **1 failure** | Semantic equality and private-mode round trip passed |
| Absent uninstall | Empty HOME acquired `.local` directories: **1 failure** | Absent uninstall is read-only and idempotent |

Further triangulation loads the generated Pi extension in a fresh isolated-HOME Bun process: successful direct Radar and installed-roster reads notify; failed, compound, non-Radar and no-UI results do not. A fresh process is necessary because Bun caches `os.homedir()` at startup; changing HOME inside the test process did not exercise installed-skill detection correctly.

## Original delivery validation (fabb2eb)

Run from `/home/emili/projects/control-tower/Main`:

```sh
bun test product/tower/v1/test/runtime-config.test.mjs product/tower/v1/test/cli.test.mjs
# 106 pass, 0 fail; 1,037 assertions

HOME="$(mktemp -d /tmp/tower-s195-suite-home.XXXXXX)" bun test product/tower/v1
# 347 pass, 1 optional Go cross-build skip, 0 fail
# 348 tests across 14 files; 6,192 assertions
```

`git diff --check` passed before this final documentation update.

## S204 vendored offline Radar follow-up

The approved vendor bytes from `1fbf0c3` are unchanged. The closed bundle explicitly includes 17 dependency files under `radar/vendor/`: `modules.txt`, YAML implementation sources, LICENSE, NOTICE and README. Source/destination drift checks reject missing, extra and linked vendor entries. Release-build also inspects the entire committed vendor subtree so unlisted additions cannot silently disappear from an exported release. Standalone intake has an explicit vendor allow-list in addition to exact stamped membership. Existing limits remain 1 MiB/member, 8 MiB aggregate and 16 MiB wire.

Runtime staging creates nested vendor directories and builds with the restricted environment above, without inheriting ambient Go overrides. Newly generated binary permissions are normalized through a no-follow regular-file descriptor; private-mode and symlink ownership guards remain intact. Existing project-adoption tree copying includes vendor bytes automatically; no adoption policy/API change was needed.

### Follow-up RED → GREEN evidence

- `bun test product/tower/v1/test/bundle.test.mjs --test-name-pattern 'real bundled Radar'`: **1 intended failure**, real Go reported inconsistent vendoring / missing explicit YAML entry. The reviewed-roster checks also observed three failures, and the adopted-project build observed one failure for unexpected `vendor`.
- `bun test product/tower/v1/test/runtime-config.test.mjs --test-name-pattern 'Radar builds with|real runtime Radar'`: **2 intended failures**, two Go calls instead of one and an unwanted `go env` probe. The first real runtime build then exposed unsafe generated permissions; descriptor normalization fixed it without following links.
- `bun test product/tower/v1/test/install.test.mjs --test-name-pattern 'vendor intake'`: **1 intended failure**, an unreviewed vendor file was accepted. Explicit vendor membership now rejects it.
- `bun test product/tower/v1/test/bootstrap.test.mjs --test-name-pattern 'cached exact'`: **1 intended failure**, historical membership no longer matched after adding vendor. Exact original 72/74-member sets now pass; the fabricated 89-member hybrid is rejected.
- `bun test product/tower/v1/test/release-build.test.mjs --test-name-pattern 'committed vendor drift'`: **1 intended failure**, committed vendor additions were silently omitted and publication succeeded. Whole-subtree metadata admission now refuses them before output writes.
- The first seven-file focused run had **153 pass, 1 optional skip, 1 fail**: a seven-case adoption test exceeded its shared 5-second timeout with the larger journal. Checks were split into independent bounded tests, preserving every negative case and adding modified-vendor coverage. `HOME="$(mktemp -d /tmp/tower-s195-vendor-adoption.XXXXXX)" bun test product/tower/v1/test/adoption.test.mjs`: **32 pass, 0 fail**.
- Final full-suite GREEN covers all fixes and triangulates missing/substituted/extra vendor paths, empty module caches, hostile ambient Go settings, modified adopted vendor files, historical digest checks and substituted binary symlinks.

### Final follow-up validation

Run from `/home/emili/projects/control-tower/Main`:

```sh
HOME="$(mktemp -d /tmp/tower-s195-vendor-suite.XXXXXX)" bun test product/tower/v1
# 362 pass, 1 pre-existing optional TUI Go cross-build skip, 0 fail
# 363 tests across 14 files; 6,765 assertions
```

Three real Radar compilations ran successfully: release bundle, runtime staging and adopted project, each using an initially empty private module cache. These tests skip only when Go is absent. Bundle/adoption checks also confirm the module cache remains empty; the bundle-built binary successfully runs `help`. No operator HOME or cache was used. `git diff --check` passed.

## Remaining validation limits

No real-HOME acceptance run, commit, push or publishing was attempted. The unrelated optional TUI cross-build remains skipped. Historical cache admission preserves inspection/update compatibility; historical payloads do not retroactively gain vendored bytes. A clean committed temporary repository exercised local install through the real release builder. Beyond copying and verifying the vendor tree, S196 lifecycle work remains out of scope.
