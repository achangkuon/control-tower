# Delta for Legacy Import Preflight

## ADDED Requirements

### Requirement: Requests and legacy records are strict untrusted hints

The preflight MUST reject a malformed top-level request. Each record MUST be exactly `{id,name,root,kind}` with string values; legacy values MUST remain advisory and MUST NOT authorize, select, or fill canonical facts.

#### Scenario: Malformed request or record

- GIVEN the request is not the required collection, or a record has missing, extra, or non-string fields
- WHEN preflight runs
- THEN it rejects the affected input with `INVALID_REQUEST` or `MALFORMED_RECORD` and no candidate

#### Scenario: Exact legacy duplicate

- GIVEN records contain the same `id` more than once
- WHEN preflight runs in input order
- THEN the first occurrence remains eligible for normal processing and every later occurrence is rejected with `DUPLICATE_ID`

### Requirement: Authoritative derivation and project-registry contract

Canonical facts MUST come only from the injected derivation authority. Invalid or thrown derivation MUST be reported without guessing; incomplete facts MUST be reported explicitly. Every complete candidate MUST use the existing project-registry validation and canonicalization contract, with no new path policy.

#### Scenario: Verified, incomplete, invalid, or failed derivation

- GIVEN a valid hint is processed by derivation
- WHEN derivation returns verified facts, incomplete facts, invalid facts, or throws
- THEN the result is respectively eligible, rejected with `INCOMPLETE_FACTS`, rejected with `DERIVATION_INVALID`, or rejected with `DERIVATION_FAILED`

#### Scenario: Contract decision

- GIVEN derivation supplies complete facts
- WHEN the existing project-registry contract validates and canonicalizes them
- THEN acceptance uses its exact canonical values, or rejection uses `CONTRACT_REJECTED`

### Requirement: Optional current-registry comparison is exact and read-only

When requested, comparison MUST use only the existing registry contract and a read-only current-registry read. Conflicts MUST compare exact canonical values only: `project_id` to existing `project_id`; each alias to existing aliases; and `canonical_root`, `git_common_dir`, and `main_store_path` only to the same field. No cross-class comparison or resolution is permitted.

#### Scenario: Empty, valid, invalid, or failed registry read

- GIVEN comparison is not requested, the current registry is empty, loaded and valid, loaded but invalid, or cannot be read
- WHEN preflight runs
- THEN it distinguishes those states, using `REGISTRY_INVALID` for invalid loaded data and `REGISTRY_READ_FAILED` for a read failure, without mutation

#### Scenario: Same-class conflicts

- GIVEN a valid loaded registry contains an exact same-class value
- WHEN comparison runs
- THEN it reports the corresponding `PROJECT_ID_CONFLICT`, `ALIAS_CONFLICT`, `CANONICAL_ROOT_CONFLICT`, `GIT_COMMON_DIR_CONFLICT`, or `MAIN_STORE_PATH_CONFLICT`, without resolving either value

### Requirement: Issue vocabulary and ordering are closed and stable

The closed vocabulary is exactly `INVALID_REQUEST`, `MALFORMED_RECORD`, `DUPLICATE_ID`, `DERIVATION_INVALID`, `DERIVATION_FAILED`, `INCOMPLETE_FACTS`, `CONTRACT_REJECTED`, `REGISTRY_READ_FAILED`, `REGISTRY_INVALID`, and the five conflict codes named above. Results MUST preserve input order; issues MUST follow this precedence: request, record, duplicate, derivation, incomplete facts, contract, registry state, then conflicts in the field order named above. The ordering MUST be observable but MUST NOT prescribe implementation details.

#### Scenario: Reproducible diagnostics

- GIVEN identical input, authority outcome, and registry observation
- WHEN preflight is repeated
- THEN issue codes and their ordering are identical

### Requirement: Secret boundary and isolation are mandatory

Issues and errors MUST omit raw hints, injected messages or causes, credentials, and secrets. A successful ready result MUST intentionally include the complete verified canonical entry. The preflight MUST remain private, additive, and no-save/no-write; it MUST NOT bootstrap, enroll, resolve, touch runtime, Git, databases, `ACTIVE`, or P8.

#### Scenario: Safe failure and ready output

- GIVEN a failure contains secret-bearing input or injected error data, or a candidate is ready
- WHEN the result is returned
- THEN failure output contains only stable categories and safe fields, while ready output contains the complete verified canonical entry

#### Scenario: Existing state is unchanged

- GIVEN any request, conflict, or failure
- WHEN preflight completes
- THEN no authoritative state changes and no public integration surface is added
