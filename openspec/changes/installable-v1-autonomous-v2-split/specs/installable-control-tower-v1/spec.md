# Installable Control Tower V1 Specification

## Purpose

Define a local-first, lifecycle-safe contract for multiple enrolled projects. V1 MUST configure and validate components, but MUST NOT perform autonomous execution.

## Requirements

### Requirement: Explicit project enrollment and safe layout

It MUST enroll projects, isolate identity and Tower state, and validate the recommended `<project>/Main/` owner clone plus `Worktrees/` before mutation. Existing layouts MAY be accepted when Git common directory, remote/branch, ownership, and paths are safe. It MUST NOT relocate, recycle, reset, clean, stash, or replace content.

#### Scenario: Two projects remain isolated

- GIVEN two repositories are explicitly enrolled
- WHEN either project is diagnosed or operated
- THEN identity, paths, queue, and history resolve only to that project

#### Scenario: Unsafe existing layout fails closed

- GIVEN dirty, symlinked, incompatible, or wrong-remote Main/Worktrees content
- WHEN enrollment or validation runs
- THEN it reports a precise error and performs no relocation or destructive repair

### Requirement: Sole Main authority and manual worker boundary

Each enrolled project MUST have `Main/` as sole V1 orchestrator. Support MAY prepare read-only briefs, decomposition, conflict, or capacity reports, but MUST NOT register, claim locks, mutate repositories, or deliver. Workers MUST be manually prepared; V1 MUST NOT create sessions, Git worktrees, workers, assignments, or launches.

#### Scenario: Support cannot gain authority

- GIVEN Support inspects a project with pending work
- WHEN it produces a report
- THEN Main remains the only orchestrator and no registration, lock, mutation, or delivery occurs

#### Scenario: V1 receives an automation request

- GIVEN a request would create a worker, session, or worktree
- WHEN a V1 command or integration receives it
- THEN it rejects the request as V2-only and leaves Tower and repositories unchanged

### Requirement: Optional host detection and integration

V1 MUST detect Bun, Git, and available OpenCode, Pi, and Claude installations and report versions/capabilities. Integration MUST be opt-in and limited to present hosts; an absent optional host MUST be diagnostic, not an installation failure.

#### Scenario: Partial host matrix succeeds

- GIVEN OpenCode is installed but Pi and Claude are absent
- WHEN install and diagnose run
- THEN OpenCode is integrated when opted in and the absent hosts are reported optional

#### Scenario: Host configuration is unsafe

- GIVEN an opted-in host has an incompatible or externally managed configuration
- WHEN integration is attempted
- THEN it fails safely with an actionable diagnostic and preserves the prior configuration

### Requirement: Versioned lifecycle and release evidence

V1 MUST install an immutable versioned runtime with an active-version record and support idempotent install, diagnose, upgrade, rollback, and uninstall. It MUST preserve user configuration, checkout-installer configuration, and Tower DB/history by default. Release evidence MUST cover clean Linux/WSL systemd and macOS launchd behavior, host smoke/rollback, and a clean-machine run.

#### Scenario: Failed upgrade rolls back

- GIVEN version N is active and version N+1 fails validation
- WHEN upgrade completes
- THEN N remains active and configuration and Tower history are unchanged

#### Scenario: Uninstall preserves history

- GIVEN a V1 installation has `.git/control-tower` state and host backups
- WHEN explicit uninstall runs
- THEN integrations/runtime links are removed while backups and Tower history remain recoverable

### Requirement: Optional bounded Hermes bridge

Hermes/Telegram MAY be enabled explicitly for state presentation and bounded arm/disarm or intent instructions to the enrolled project's Main only. It MUST NOT expose raw shell, worker selection or launch, Git delivery, merge, or hidden project authority. Local CLI and Support operation MUST remain complete when Hermes is absent.

#### Scenario: Local fallback works

- GIVEN Hermes is disabled or unavailable
- WHEN a user operates through CLI and local Support
- THEN diagnostics and permitted local operation remain available without remote transport

#### Scenario: Remote authority is rejected

- GIVEN Hermes sends a worker-launch, shell, Git-delivery, or merge request
- WHEN V1 evaluates the request
- THEN it rejects the request and records no repository or worker mutation
