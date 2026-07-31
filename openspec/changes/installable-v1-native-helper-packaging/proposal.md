# Proposal: Installable V1 Native Helper Packaging

> **Planning status:** Unnumbered P8 candidate after S8.2. Assign no Sesión ID until Tareas prove one-PR fit.

## Intent

Provide one auditable way to distribute the correct native advisory-lock helper without risking registry writes. Wrong, tampered, incompatible, or ineligible helpers must fail deterministically before mutation.

## Scope

### In Scope
- Reproducible packages and versions for Linux glibc, Linux musl, macOS, and WSL2 using its matching Linux artifact.
- Closed `helper_release_manifest_v1`: exact `{kind,version,key_id,signature_algorithm,releases}` envelope and exact `{helper,os,arch,libc,abi,helper_version,protocol_version,build_id,binary_sha256,signature}` release records.
- One integrity mechanism: detached Ed25519 signatures verified by a pinned release public key over records containing binary SHA-256; no alternate trust path.
- No-write eligibility using only `realpath`, `lstat`, `statfs`/`statvfs`, `uname`, WSL metadata, and mount-table reads. Open an existing guard `O_RDONLY|O_NOFOLLOW`, nonblocking-lock, then unlock; report an absent guard as uninitialized. Never create temporary files or mutate content/metadata.
- Allow only local ext4/xfs/btrfs on Linux, local APFS on macOS, and local non-DrvFS ext4 on WSL2. Fail closed on native Windows, NFS, SMB/CIFS, DrvFS, unverified mounts, or unknown platform/libc/architecture facts.

### Out of Scope
- Helper activation or pointer mutation; guard ownership/recovery; enrollment/layout; Project/Main; Support; CLI/Telegram; DB/runtime/`ACTIVE`; shared documentation.

## Capabilities

### New Capabilities
- `native-helper-packaging`: release matrix, manifest, signature/compatibility verification, no-write eligibility, and deterministic rejection contracts.

### Modified Capabilities
- None.

## Approach

Build immutable artifacts, canonically serialize one manifest, sign each release, and verify schema, target, digest, signature, ABI, protocol, and version in fixed order. Consumers receive verified bytes and diagnostics only.

## Relationship to Umbrella P8

This bounded dependency is extracted from `installable-v1-enrollment-main-support`. Its failed spec/design remain untouched; later P8 work may depend on this capability.

## Affected Areas (Forecast Only)

| Area | Impact |
|---|---|
| `native-helper/**` | New package inputs |
| `install/native-helper/**` | New verifier/probe |
| `schemas/helper-release-manifest-v1.schema.json` | New schema |
| `test/install/native-helper-*.test.mjs` | New evidence |

## Risks

| Risk | Mitigation |
|---|---|
| Signing-key compromise | Offline custody, explicit key identity, fail closed |
| ABI/target mismatch | Exact target tuple and fixed probe |
| Mount misclassification | Closed allowlist; unknown means unsupported |

## Dependencies

- S8.2; native toolchains/runners; release hosting; Ed25519 key custody/rotation.

## Rollback Plan

Withdraw affected manifest/artifacts and retain the last verified release. No state rollback applies.

## Success Criteria

- [ ] Every supported target has exactly one reproducible, manifest-matching artifact.
- [ ] Tamper, signature, schema, compatibility, and target failures are deterministic and write nothing.
- [ ] Every denied platform/filesystem fails before helper use with zero filesystem mutation.
- [ ] No out-of-scope path or authority changes.

## Proposal Question Round

No business question blocks this proposal. Design must close toolchain, hosting, and signing-key custody/rotation.
