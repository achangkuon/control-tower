# S195 — Global runtime installer

## Delivered contract

`radar sesion S195` supplied the contract and confirmed the expanded authorization. Global CLI install/update now configures the verified active release: V1 skills and canon, relative Claude links, compiled Radar, passive Claude/Pi signatures, and marked runtime pointers. Gentle AI is required; doctor reports components and its version. Ownership-backed uninstall restores foreign entries. Clean committed checkouts can install without publishing.

The pre-existing `openspec/plan.yaml` authorization change was preserved. No installer ran against `/home/emili`; no repository commit, push, publish, dependency mutation, or project-adoption change was performed. Execution fixtures use disposable HOME directories.

## Decisions and boundaries

- `runtime-config.mjs` is shipped normally. `release-build.mjs` is also shipped so an installed CLI can build an explicitly named local checkout. New releases have exactly **74 members**.
- Cached S194 releases retain their exact **72-member** roster and pinned SHA-256 verification. Only the cached verifier accepts that historical roster; new acquisition still requires all 74 members.
- Runtime ownership lives at `$HOME/.local/share/torre-control/runtime-ownership.json`, alongside—not inside—the immutable V1 lifecycle root. Whole skill directories have closed membership and file digests. Shared canon ownership is file-only. Links, pointer blocks and added hook registrations have content digests too.
- Foreign differing entries are renamed to timestamp/UUID backups before replacement. Identical skill bytes are adopted, including private file modes. Updates retain the original foreign backup. Uninstall refuses modified owned resources or backups rather than deleting user edits.
- Settings are merged semantically; unrelated keys, hooks and later empty hook entries survive. Exact original formatting is restored when the generated settings remain unchanged. Private settings/instruction modes are preserved.
- Pointer replacement is surgical; unrelated bytes—including Gentle AI blocks—remain untouched. Malformed, nested, duplicated or non-line-delimited owned markers fail before installation writes. Codex/OpenCode directories are not created just to add instructions.
- Go uses an explicit allow-list with `GOWORK=off`, `GOENV=off`, `GOFLAGS=-mod=readonly`, `GOPROXY=off`, `GOSUMDB=off`, `GOTOOLCHAIN=local`, `GOTELEMETRY=off`, and `CGO_ENABLED=0`. Builds have private HOME/cache/tmp/GOPATH and reuse only the resolved module cache.
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

## Final validation

Run from `/home/emili/projects/control-tower/Main`:

```sh
bun test product/tower/v1/test/runtime-config.test.mjs product/tower/v1/test/cli.test.mjs
# 106 pass, 0 fail; 1,037 assertions

HOME="$(mktemp -d /tmp/tower-s195-suite-home.XXXXXX)" bun test product/tower/v1
# 347 pass, 1 optional Go cross-build skip, 0 fail
# 348 tests across 14 files; 6,192 assertions
```

`git diff --check` passed before this final documentation update.

## Remaining validation limits

No real-HOME acceptance run or publishing was attempted. Radar compilation is covered with an injected builder that verifies the restricted environment and output installation; the optional real Go cross-build remains skipped. A clean committed temporary repository exercised local install through the real release builder. S196 project adoption/uninstall remains out of scope.
