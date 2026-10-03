# S199 — Automatic latest-release install/update

`Instalar o actualizar` now starts the latest published release path without asking for a tag, asset, digest or confirmation. Equal verified installed/latest tags produce exactly `Todas las configuraciones al día`. Successful acquisition/activation displays the full installed tag. Press `a` while that Home option is selected for `Versión específica (avanzado)` and the existing manual wizard.

## Contract and trust boundary

Source: `radar sesion S199`; the complete plan was not read. Work started on clean `master`.

- Maintainer-approved same-origin checksum trust: authenticated `gh` against the private `achangkuon/control-tower` release repository. This is not an independent signature or checksum channel; the advanced manual digest path remains independent.
- `torre-control install --latest` handles an absent installation; `torre-control update --latest` handles an installed engine. Common explicit storage overrides remain supported. Latest, manual and checkout modes are exclusive.
- Offline doctor verifies cached provenance/launcher before its installed tag is compared with `gh release view --repo achangkuon/control-tower --json tagName`. Equality returns JSON status `up-to-date`, without any asset download or HOME changes.
- Different tags are pinned exactly once. Download `tower-v1.json.sha256`, admit exactly 64 lowercase hex characters, two spaces, `tower-v1.json`, and one LF, then download and verify the package. Missing/malformed checksums have Spanish refusal messages; mismatched package bytes retain the existing SHA-256 refusal. All these failures preserve fresh and installed HOME snapshots.
- The admitted byte receipt is replayed through the existing verified bootstrap/global lifecycle, retaining envelope, member, provenance and activation checks without a second package download.
- Release build writes `<out>.sha256` alongside every package, exclusively with mode 0644 and content `<digest>  <basename(out)>\n`. All output destinations are admitted before publication, including checksum collisions.
- Tag validation retains the closed ASCII/pinned-tag policy, also rejecting trailing CR/LF in acquisition and matching that policy in the TUI.

## Implementation surfaces

Requested production/tests: `release.mjs`, `cli.mjs`, `release-build.mjs`, their three JS test files, and `tui/wizard.go`, `tui/wizard_test.go` under `product/tower/v1/`.

Essential extra files inside the pre-approved `product/tower/` boundary:

- `tui/main.go`: admit only the two exact latest argv shapes across the process boundary.
- `tui/model.go`: default latest dispatch; guarded advanced shortcut and help.
- `tui/home.go`: discoverable advanced shortcut, compact footer retains exit text.
- `tui/model_test.go`: navigation now opens the passive advanced screen instead of assuming the default is passive.

Rollback unit: latest acquisition/dispatch, checksum output, associated TUI routing/rendering, tests and this record. No lifecycle format, dependency, installed storage schema or global module change.

## Test-first evidence

- RED JS: `HOME=$(mktemp -d) bun test product/tower/v1` — **385 pass / 1 skip / 5 fail / 1 error**. Latest CLI behavior tests failed on unsupported flag handling; checksum emission failed with ENOENT; checksum destination refusal failed because the build wrote anyway. Release unit tests could not load the not-yet-exported `acquireLatestRelease` API (explicitly an import failure, not a claimed behavior assertion).
- RED Go: the isolated command below failed `TestLatestDefault`, the advanced wizard scenarios and `TestClosedArguments`: missing advanced hint/default execution, missing installed tag, and rejected latest argv.
- GREEN JS after implementation: **398 pass / 1 skip / 0 fail**. First Go rerun exposed two old assumptions: passive default navigation and a truncated narrow-terminal exit hint. Both were corrected within scope; final Go suite passed.
- TRIANGULATE/REFACTOR: installed and fresh no-change refusal snapshots; equal tags never download; newer release installs with verified provenance; malformed/exact-name/digest/tag cases; exclusive CLI modes; build checksum destination collisions/determinism; both TUI install/update defaults and advanced manual flow; exact up-to-date result line; existing operation/error/quit-wait/terminal-width tests remain green.

## Final validation

```sh
cd product/tower/v1/tui && HOME=$(mktemp -d) GOCACHE=$(mktemp -d) GOMODCACHE=/home/emili/go/pkg/mod GOENV=off GOTELEMETRY=off GOWORK=off GOPROXY=off go test ./...
```

Result: **30 top-level tests / 0 fail**, one package passed. HOME/build cache are disposable; existing module dependencies are read offline. No real-HOME configuration change.

```sh
set -o pipefail && HOME=$(mktemp -d) bun test product/tower/v1 2>&1 | tail -n 12
```

Result: **398 pass / 1 skip / 0 fail**, 399 tests across 14 files, 7313 assertions. The existing optional real tiny Go cross-build remains skipped. GitHub calls in latest tests use injected runners; no real GitHub API was called. `git diff --check` passed.

No live release download, interactive terminal smoke test, commit, push or publication was performed. Review and terminal Git actions remain with the maintainer.

## Next publish

Build from the maintainer's clean committed tree and upload **`tower-v1.json.sha256` together with `tower-v1.json`**, the stamped `torre-install.mjs`, and the generated platform TUI binaries on the same published release/tag. Keep the checksum file bytes unchanged. Older releases without the checksum are intentionally refused by latest acquisition; older CLI/TUI versions need the new stamped installer/TUI bootstrap to gain this command and UI. The latest engine lifecycle itself does not add a separate TUI-binary updater.
