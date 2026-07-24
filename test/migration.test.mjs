import { afterEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import * as tower from "../core.mjs"
import {
  restoreFrozenSnapshot,
  snapshotRuntimeBoundary,
  verifyTrackedEntry,
} from "./helpers/restore-fixture.mjs"

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const torrePath = join(packageRoot, "bin", "torre")
const installPath = join(packageRoot, "install.sh")
const evidencePath = join(
  packageRoot,
  "openspec",
  "changes",
  "autonomous-continuation-control-tower",
  "evidence",
  "p0-baseline-freeze.md",
)
const temporaryDirectories = []
const git = (repository, args) =>
  execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
const expectedTrackedPaths = [
  ".gitignore",
  "bin/torre",
  "core.mjs",
  "core.mjs.bak.20260721-161315",
  "install.sh",
  "mcp.mjs",
  "plugin/tower-spike.js",
  "README.md",
  "ROADMAP.md",
  "test/fail-closed.test.mjs",
  "test/fixtures/paused-send.mjs",
  "validate-compact-message.py",
]
// Resolve the runtime boundary from the shared Git common directory so the
// assertion holds in both a normal clone (`.git/control-tower`) and a linked
// worktree, where the canonical Tower lives under the Main clone's `.git`.
const actualRuntimeRoot = join(
  resolve(packageRoot, git(packageRoot, ["rev-parse", "--git-common-dir"])),
  "control-tower",
)
const actualActivePath = join(actualRuntimeRoot, "ACTIVE")
const expectedAbsentRuntimeBoundary = [
  { path: relative(packageRoot, actualRuntimeRoot), exists: false },
]
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
}
const digest = (value) =>
  `sha256:${createHash("sha256").update(Buffer.from(value)).digest("hex")}`
const correctedMigration001Sql = `CREATE TABLE ct_schema_migration (
  version INTEGER PRIMARY KEY CHECK(version >= 1),
  ddl_checksum TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
CREATE TABLE ct_continuation_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  anchor_id TEXT NOT NULL UNIQUE,
  anchor_epoch INTEGER NOT NULL CHECK(anchor_epoch = 1),
  anchor_secret_digest TEXT NOT NULL,
  config_digest TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK(schema_version >= 1),
  mode TEXT NOT NULL DEFAULT 'OFF' CHECK(mode IN ('OFF', 'ON', 'ROLLING_BACK'))
);
CREATE TABLE ct_idempotency (
  operation TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  request_identity TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  cas_digest TEXT NOT NULL,
  response_json TEXT NOT NULL,
  committed_at TEXT NOT NULL,
  PRIMARY KEY (operation, scope_key),
  UNIQUE (operation, request_identity)
);
`
const supersededMigration001Checksum = "sha256:47f63b10e516ac977e1cc26723b064eb037a4a2cdb84246b1c183903b909eb41"
const correctedMigration001Checksum = "sha256:961501e0f605e0052afd8b9ad091112667fa1c1ee3496f0f4320f63541d6e8fc"
const expectedMigration002Checksum = "sha256:22371db1fb23c72d4049b177080cd8e08eb0029e5ad7e20df709ebf6ec505b12"
const expectedMigration002Sql = `CREATE TABLE ct_claimant_binding (
  binding_id TEXT PRIMARY KEY CHECK(length(binding_id) = 43),
  effective_uid INTEGER NOT NULL CHECK(effective_uid >= 0),
  canonical_repo TEXT NOT NULL CHECK(length(canonical_repo) > 0),
  git_common_dir TEXT NOT NULL CHECK(length(git_common_dir) > 0),
  worktree TEXT NOT NULL CHECK(length(worktree) > 0),
  branch TEXT NOT NULL CHECK(length(branch) > 0),
  host_process_instance TEXT NOT NULL CHECK(length(host_process_instance) > 0),
  plugin_instance TEXT NOT NULL CHECK(length(plugin_instance) > 0),
  root_session_id TEXT NOT NULL CHECK(length(root_session_id) > 0),
  mcp_process_instance TEXT NOT NULL CHECK(length(mcp_process_instance) > 0),
  pid_start_marker TEXT NOT NULL CHECK(length(pid_start_marker) > 0),
  binding_epoch INTEGER NOT NULL CHECK(binding_epoch > 0),
  binding_status TEXT NOT NULL CHECK(binding_status IN ('ACTIVE', 'RETIRED', 'MULTIPLEXED')),
  identity_digest TEXT NOT NULL UNIQUE CHECK(length(identity_digest) = 71),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  ended_at TEXT,
  CHECK((binding_status = 'ACTIVE' AND ended_at IS NULL) OR
        (binding_status IN ('RETIRED', 'MULTIPLEXED') AND ended_at IS NOT NULL)),
  UNIQUE(effective_uid, canonical_repo, git_common_dir, plugin_instance, binding_epoch)
);
CREATE UNIQUE INDEX ct_claimant_binding_one_active
ON ct_claimant_binding(effective_uid, canonical_repo, git_common_dir, plugin_instance)
WHERE binding_status = 'ACTIVE';
CREATE INDEX ct_claimant_binding_context_lookup
ON ct_claimant_binding(effective_uid, canonical_repo, git_common_dir, plugin_instance,
                       binding_status, binding_epoch);
CREATE TABLE ct_claimant_conflict (
  conflict_id TEXT PRIMARY KEY CHECK(length(conflict_id) = 43),
  plugin_scope_digest TEXT NOT NULL CHECK(length(plugin_scope_digest) = 71),
  incumbent_binding_id TEXT NOT NULL CHECK(length(incumbent_binding_id) = 43),
  attempted_binding_id TEXT NOT NULL CHECK(length(attempted_binding_id) = 43),
  incumbent_identity_digest TEXT NOT NULL CHECK(length(incumbent_identity_digest) = 71),
  attempted_identity_digest TEXT NOT NULL CHECK(length(attempted_identity_digest) = 71),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  conflict_digest TEXT NOT NULL UNIQUE CHECK(length(conflict_digest) = 71),
  detected_at TEXT NOT NULL CHECK(length(detected_at) = 24),
  CHECK(incumbent_binding_id <> attempted_binding_id),
  CHECK(incumbent_identity_digest <> attempted_identity_digest)
);
CREATE INDEX ct_claimant_conflict_scope_history
ON ct_claimant_conflict(plugin_scope_digest, detected_at, conflict_id);
CREATE TRIGGER ct_claimant_conflict_no_update
BEFORE UPDATE ON ct_claimant_conflict
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_CONFLICT');
END;
CREATE TRIGGER ct_claimant_conflict_no_delete
BEFORE DELETE ON ct_claimant_conflict
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_CONFLICT');
END;
CREATE TABLE ct_rollback_lease (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  rollback_epoch INTEGER NOT NULL DEFAULT 0 CHECK(rollback_epoch >= 0),
  lease_status TEXT NOT NULL DEFAULT 'NONE' CHECK(lease_status IN ('NONE', 'ACTIVE', 'EXPIRED')),
  lease_version INTEGER NOT NULL DEFAULT 0 CHECK(lease_version >= 0),
  owner_main_binding_id TEXT,
  lease_expires_at TEXT,
  CHECK((lease_status = 'NONE' AND owner_main_binding_id IS NULL AND lease_expires_at IS NULL) OR
        (lease_status IN ('ACTIVE', 'EXPIRED') AND owner_main_binding_id IS NOT NULL AND lease_expires_at IS NOT NULL))
);
`
const expectedMigration003Checksum = "sha256:c382e9322a5934f1db3cb9685a345d8141a6263102ef9f027ca03396338a65b6"
const expectedMigration003Sql = `CREATE TABLE ct_main_binding (
  main_binding_id TEXT PRIMARY KEY CHECK(length(main_binding_id) = 43),
  anchor_id TEXT NOT NULL CHECK(length(anchor_id) = 43),
  anchor_epoch INTEGER NOT NULL CHECK(anchor_epoch = 1),
  config_digest TEXT NOT NULL CHECK(length(config_digest) = 71),
  host_process_instance TEXT NOT NULL CHECK(length(host_process_instance) > 0),
  plugin_instance TEXT NOT NULL CHECK(length(plugin_instance) > 0),
  root_session_id TEXT NOT NULL CHECK(length(root_session_id) > 0),
  mcp_process_instance TEXT NOT NULL CHECK(length(mcp_process_instance) = 43),
  pid_start_marker TEXT NOT NULL CHECK(length(pid_start_marker) > 0),
  binding_epoch INTEGER NOT NULL CHECK(binding_epoch > 0),
  main_session_id TEXT NOT NULL CHECK(length(main_session_id) > 0),
  binding_status TEXT NOT NULL CHECK(binding_status IN ('ACTIVE', 'RETIRED')),
  identity_digest TEXT NOT NULL UNIQUE CHECK(length(identity_digest) = 71),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  ended_at TEXT,
  CHECK(main_session_id = root_session_id),
  CHECK((binding_status = 'ACTIVE' AND ended_at IS NULL) OR
        (binding_status = 'RETIRED' AND ended_at IS NOT NULL)),
  UNIQUE(anchor_id, binding_epoch)
);
CREATE UNIQUE INDEX ct_main_binding_one_active
ON ct_main_binding(anchor_id)
WHERE binding_status = 'ACTIVE';
CREATE INDEX ct_main_binding_history
ON ct_main_binding(anchor_id, binding_epoch, binding_status);
CREATE TABLE ct_activation (
  activation_epoch INTEGER PRIMARY KEY CHECK(activation_epoch > 0),
  main_binding_id TEXT NOT NULL CHECK(length(main_binding_id) = 43),
  main_binding_epoch INTEGER NOT NULL CHECK(main_binding_epoch > 0),
  evidence_digest TEXT NOT NULL CHECK(length(evidence_digest) = 71),
  precondition_digest TEXT NOT NULL CHECK(length(precondition_digest) = 71),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  activation_digest TEXT NOT NULL UNIQUE CHECK(length(activation_digest) = 71),
  activated_at TEXT NOT NULL CHECK(length(activated_at) = 24),
  UNIQUE(main_binding_id, activation_epoch)
);
CREATE TRIGGER ct_activation_no_update
BEFORE UPDATE ON ct_activation
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_ACTIVATION');
END;
CREATE TRIGGER ct_activation_no_delete
BEFORE DELETE ON ct_activation
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_ACTIVATION');
END;
`
const expectedMigration004Checksum = "sha256:fb951119bd42f22aee7ed4f025298e12e604ff65cc7022aef4353fcba446ae57"
const expectedMigration004Sql = `CREATE TABLE ct_handoff (
  id TEXT PRIMARY KEY CHECK(length(id) = 43),
  lineage_id TEXT NOT NULL CHECK(length(lineage_id) = 36),
  revision INTEGER NOT NULL CHECK(revision >= 1),
  state TEXT NOT NULL CHECK(state IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'CLAIMED', 'STARTED', 'COMPLETION_ATTESTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'POISONED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED')),
  generation INTEGER NOT NULL DEFAULT 0 CHECK(generation >= 0),
  payload_json TEXT NOT NULL CHECK(length(CAST(payload_json AS BLOB)) BETWEEN 1 AND 65536),
  payload_digest TEXT NOT NULL CHECK(length(payload_digest) = 71),
  handoff_fingerprint TEXT NOT NULL UNIQUE CHECK(length(handoff_fingerprint) = 71),
  repository_fingerprint TEXT NOT NULL CHECK(length(repository_fingerprint) = 71),
  git_common_dir_fingerprint TEXT NOT NULL CHECK(length(git_common_dir_fingerprint) = 71),
  source_merge_sha TEXT NOT NULL CHECK(length(source_merge_sha) IN (40, 64)),
  source_merge_url TEXT NOT NULL CHECK(length(source_merge_url) BETWEEN 1 AND 2048),
  next_unit_scope_digest TEXT NOT NULL CHECK(length(next_unit_scope_digest) = 71),
  dependencies_digest TEXT NOT NULL CHECK(length(dependencies_digest) = 71),
  references_digest TEXT NOT NULL CHECK(length(references_digest) = 71),
  snapshots_digest TEXT NOT NULL CHECK(length(snapshots_digest) = 71),
  provenance_digest TEXT NOT NULL CHECK(length(provenance_digest) = 71),
  decision_summary_digest TEXT NOT NULL CHECK(length(decision_summary_digest) = 71),
  producer_binding_id TEXT NOT NULL CHECK(length(producer_binding_id) = 43),
  producer_identity_digest TEXT NOT NULL CHECK(length(producer_identity_digest) = 71),
  producer_ctx_json TEXT NOT NULL CHECK(length(CAST(producer_ctx_json AS BLOB)) BETWEEN 1 AND 4096),
  producer_ctx_digest TEXT NOT NULL CHECK(length(producer_ctx_digest) = 71),
  validation_evidence_json TEXT CHECK(validation_evidence_json IS NULL OR length(CAST(validation_evidence_json AS BLOB)) BETWEEN 1 AND 65536),
  validation_digest TEXT CHECK(validation_digest IS NULL OR length(validation_digest) = 71),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  validated_at TEXT CHECK(validated_at IS NULL OR length(validated_at) = 24),
  published_at TEXT CHECK(published_at IS NULL OR length(published_at) = 24),
  UNIQUE(lineage_id, revision)
);
CREATE INDEX ct_handoff_state_order
ON ct_handoff(state, created_at, id);
CREATE TRIGGER ct_handoff_immutable_content
BEFORE UPDATE ON ct_handoff
WHEN NEW.id IS NOT OLD.id
  OR NEW.lineage_id IS NOT OLD.lineage_id
  OR NEW.revision IS NOT OLD.revision
  OR NEW.payload_json IS NOT OLD.payload_json
  OR NEW.payload_digest IS NOT OLD.payload_digest
  OR NEW.handoff_fingerprint IS NOT OLD.handoff_fingerprint
  OR NEW.repository_fingerprint IS NOT OLD.repository_fingerprint
  OR NEW.git_common_dir_fingerprint IS NOT OLD.git_common_dir_fingerprint
  OR NEW.source_merge_sha IS NOT OLD.source_merge_sha
  OR NEW.source_merge_url IS NOT OLD.source_merge_url
  OR NEW.next_unit_scope_digest IS NOT OLD.next_unit_scope_digest
  OR NEW.dependencies_digest IS NOT OLD.dependencies_digest
  OR NEW.references_digest IS NOT OLD.references_digest
  OR NEW.snapshots_digest IS NOT OLD.snapshots_digest
  OR NEW.provenance_digest IS NOT OLD.provenance_digest
  OR NEW.decision_summary_digest IS NOT OLD.decision_summary_digest
  OR NEW.producer_binding_id IS NOT OLD.producer_binding_id
  OR NEW.producer_identity_digest IS NOT OLD.producer_identity_digest
  OR NEW.producer_ctx_json IS NOT OLD.producer_ctx_json
  OR NEW.producer_ctx_digest IS NOT OLD.producer_ctx_digest
  OR NEW.created_at IS NOT OLD.created_at
  OR (OLD.validation_evidence_json IS NOT NULL AND NEW.validation_evidence_json IS NOT OLD.validation_evidence_json)
  OR (OLD.validation_digest IS NOT NULL AND NEW.validation_digest IS NOT OLD.validation_digest)
  OR (OLD.validated_at IS NOT NULL AND NEW.validated_at IS NOT OLD.validated_at)
  OR (OLD.published_at IS NOT NULL AND NEW.published_at IS NOT OLD.published_at)
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_HANDOFF');
END;
CREATE TRIGGER ct_handoff_no_delete
BEFORE DELETE ON ct_handoff
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_HANDOFF');
END;
CREATE TABLE ct_handoff_transition (
  transition_id TEXT PRIMARY KEY CHECK(length(transition_id) = 43),
  handoff_id TEXT NOT NULL CHECK(length(handoff_id) = 43),
  generation INTEGER NOT NULL CHECK(generation >= 0),
  operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'VALIDATE', 'PUBLISH', 'CLAIM', 'ACK', 'ATTEST_COMPLETION', 'COMPLETE', 'REJECT', 'REVISE', 'RECOVER')),
  from_state TEXT CHECK(from_state IS NULL OR from_state IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'CLAIMED', 'STARTED', 'COMPLETION_ATTESTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'POISONED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED')),
  to_state TEXT NOT NULL CHECK(to_state IN ('DRAFT', 'VALIDATED', 'PUBLISHED', 'CLAIMED', 'STARTED', 'COMPLETION_ATTESTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'POISONED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED')),
  authority_kind TEXT NOT NULL CHECK(authority_kind IN ('PRODUCER', 'MAIN', 'CLAIMANT')),
  authority_binding_id TEXT NOT NULL CHECK(length(authority_binding_id) = 43),
  authority_identity_digest TEXT NOT NULL CHECK(length(authority_identity_digest) = 71),
  request_identity TEXT NOT NULL CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  decision_digest TEXT CHECK(decision_digest IS NULL OR length(decision_digest) = 71),
  response_digest TEXT NOT NULL CHECK(length(response_digest) = 71),
  occurred_at TEXT NOT NULL CHECK(length(occurred_at) = 24),
  UNIQUE(operation, request_identity)
);
CREATE INDEX ct_handoff_transition_history
ON ct_handoff_transition(handoff_id, generation, occurred_at, transition_id);
CREATE TRIGGER ct_handoff_transition_no_update
BEFORE UPDATE ON ct_handoff_transition
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_HANDOFF_TRANSITION');
END;
CREATE TRIGGER ct_handoff_transition_no_delete
BEFORE DELETE ON ct_handoff_transition
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_HANDOFF_TRANSITION');
END;
CREATE TABLE ct_delivery (
  delivery_id TEXT PRIMARY KEY CHECK(length(delivery_id) = 43),
  handoff_id TEXT NOT NULL CHECK(length(handoff_id) = 43),
  generation INTEGER NOT NULL CHECK(generation >= 0),
  purpose TEXT NOT NULL CHECK(purpose IN ('WORK', 'ATTESTATION_REDELIVERY')),
  delivery_state TEXT NOT NULL CHECK(delivery_state IN ('PENDING', 'CLAIMED', 'CLOSED')),
  handoff_state_snapshot TEXT NOT NULL CHECK(handoff_state_snapshot IN ('PUBLISHED', 'COMPLETION_ATTESTED')),
  claim_id TEXT CHECK(claim_id IS NULL OR length(claim_id) = 43),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  claimed_at TEXT CHECK(claimed_at IS NULL OR length(claimed_at) = 24),
  closed_at TEXT CHECK(closed_at IS NULL OR length(closed_at) = 24),
  UNIQUE(handoff_id, generation),
  CHECK((delivery_state = 'PENDING' AND claim_id IS NULL AND claimed_at IS NULL AND closed_at IS NULL) OR
        (delivery_state = 'CLAIMED' AND claim_id IS NOT NULL AND claimed_at IS NOT NULL AND closed_at IS NULL) OR
        (delivery_state = 'CLOSED' AND closed_at IS NOT NULL))
);
CREATE INDEX ct_delivery_pending_order
ON ct_delivery(delivery_state, created_at, delivery_id);
CREATE TRIGGER ct_delivery_immutable_identity
BEFORE UPDATE ON ct_delivery
WHEN NEW.delivery_id IS NOT OLD.delivery_id
  OR NEW.handoff_id IS NOT OLD.handoff_id
  OR NEW.generation IS NOT OLD.generation
  OR NEW.purpose IS NOT OLD.purpose
  OR NEW.handoff_state_snapshot IS NOT OLD.handoff_state_snapshot
  OR NEW.created_at IS NOT OLD.created_at
  OR (OLD.claim_id IS NOT NULL AND NEW.claim_id IS NOT OLD.claim_id)
  OR (OLD.claimed_at IS NOT NULL AND NEW.claimed_at IS NOT OLD.claimed_at)
  OR (OLD.closed_at IS NOT NULL AND NEW.closed_at IS NOT OLD.closed_at)
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_DELIVERY');
END;
CREATE TRIGGER ct_delivery_no_delete
BEFORE DELETE ON ct_delivery
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_DELIVERY');
END;
CREATE TABLE ct_claim (
  claim_id TEXT PRIMARY KEY CHECK(length(claim_id) = 43),
  delivery_id TEXT NOT NULL UNIQUE CHECK(length(delivery_id) = 43),
  handoff_id TEXT NOT NULL CHECK(length(handoff_id) = 43),
  generation INTEGER NOT NULL CHECK(generation >= 0),
  purpose TEXT NOT NULL CHECK(purpose IN ('WORK', 'ATTESTATION_REDELIVERY')),
  claimant_binding_id TEXT NOT NULL CHECK(length(claimant_binding_id) = 43),
  claimant_identity_digest TEXT NOT NULL CHECK(length(claimant_identity_digest) = 71),
  claimant_ctx_json TEXT NOT NULL CHECK(length(CAST(claimant_ctx_json AS BLOB)) BETWEEN 1 AND 4096),
  claimant_ctx_digest TEXT NOT NULL CHECK(length(claimant_ctx_digest) = 71),
  claimant_fence_digest TEXT NOT NULL UNIQUE CHECK(length(claimant_fence_digest) = 71),
  token_salt TEXT NOT NULL UNIQUE CHECK(length(token_salt) = 43),
  token_hash TEXT NOT NULL UNIQUE CHECK(length(token_hash) = 71),
  budget_scope_digest TEXT NOT NULL CHECK(length(budget_scope_digest) = 71),
  budget_sequence INTEGER NOT NULL CHECK(budget_sequence >= 1),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  claim_state TEXT NOT NULL CHECK(claim_state IN ('LIVE', 'CLOSED')),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  closed_at TEXT CHECK(closed_at IS NULL OR length(closed_at) = 24),
  UNIQUE(handoff_id, generation),
  CHECK((claim_state = 'LIVE' AND closed_at IS NULL) OR
        (claim_state = 'CLOSED' AND closed_at IS NOT NULL))
);
CREATE INDEX ct_claim_state_lookup
ON ct_claim(claim_state, handoff_id, generation);
CREATE TRIGGER ct_claim_immutable_identity
BEFORE UPDATE ON ct_claim
WHEN NEW.claim_id IS NOT OLD.claim_id
  OR NEW.delivery_id IS NOT OLD.delivery_id
  OR NEW.handoff_id IS NOT OLD.handoff_id
  OR NEW.generation IS NOT OLD.generation
  OR NEW.purpose IS NOT OLD.purpose
  OR NEW.claimant_binding_id IS NOT OLD.claimant_binding_id
  OR NEW.claimant_identity_digest IS NOT OLD.claimant_identity_digest
  OR NEW.claimant_ctx_json IS NOT OLD.claimant_ctx_json
  OR NEW.claimant_ctx_digest IS NOT OLD.claimant_ctx_digest
  OR NEW.claimant_fence_digest IS NOT OLD.claimant_fence_digest
  OR NEW.token_salt IS NOT OLD.token_salt
  OR NEW.token_hash IS NOT OLD.token_hash
  OR NEW.budget_scope_digest IS NOT OLD.budget_scope_digest
  OR NEW.budget_sequence IS NOT OLD.budget_sequence
  OR NEW.request_identity IS NOT OLD.request_identity
  OR NEW.request_digest IS NOT OLD.request_digest
  OR NEW.cas_digest IS NOT OLD.cas_digest
  OR NEW.created_at IS NOT OLD.created_at
  OR (OLD.closed_at IS NOT NULL AND NEW.closed_at IS NOT OLD.closed_at)
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_CLAIM');
END;
CREATE TRIGGER ct_claim_no_delete
BEFORE DELETE ON ct_claim
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_CLAIM');
END;
CREATE TABLE ct_session_budget (
  budget_scope_digest TEXT PRIMARY KEY CHECK(length(budget_scope_digest) = 71),
  budget_scope_json TEXT NOT NULL CHECK(length(CAST(budget_scope_json AS BLOB)) BETWEEN 1 AND 4096),
  budget_limit INTEGER NOT NULL DEFAULT 1 CHECK(budget_limit = 1),
  consumed_count INTEGER NOT NULL DEFAULT 0 CHECK(consumed_count BETWEEN 0 AND budget_limit),
  last_claim_id TEXT CHECK(last_claim_id IS NULL OR length(last_claim_id) = 43),
  created_at TEXT NOT NULL CHECK(length(created_at) = 24),
  updated_at TEXT NOT NULL CHECK(length(updated_at) = 24),
  CHECK((consumed_count = 0 AND last_claim_id IS NULL) OR
        (consumed_count > 0 AND last_claim_id IS NOT NULL))
);
CREATE TRIGGER ct_session_budget_immutable_scope
BEFORE UPDATE ON ct_session_budget
WHEN NEW.budget_scope_digest IS NOT OLD.budget_scope_digest
  OR NEW.budget_scope_json IS NOT OLD.budget_scope_json
  OR NEW.budget_limit IS NOT OLD.budget_limit
  OR NEW.created_at IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_SESSION_BUDGET');
END;
CREATE TRIGGER ct_session_budget_no_delete
BEFORE DELETE ON ct_session_budget
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_SESSION_BUDGET');
END;
`
const expectedMigration004ObjectNames = [
  "ct_claim_state_lookup", "ct_delivery_pending_order", "ct_handoff_state_order", "ct_handoff_transition_history",
  "ct_claim", "ct_delivery", "ct_handoff", "ct_handoff_transition", "ct_session_budget",
  "ct_claim_immutable_identity", "ct_claim_no_delete", "ct_delivery_immutable_identity", "ct_delivery_no_delete",
  "ct_handoff_immutable_content", "ct_handoff_no_delete", "ct_handoff_transition_no_delete",
  "ct_handoff_transition_no_update", "ct_session_budget_immutable_scope", "ct_session_budget_no_delete",
]
const captureError = (operation) => {
  try {
    operation()
  } catch (error) {
    return error
  }
  return null
}
const errorCode = (operation) => {
  try {
    operation()
  } catch (error) {
    return error.code
  }
  return null
}
const createMainFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "control-tower-main-"))
  const main = join(root, "main")
  const linked = join(root, "linked")
  temporaryDirectories.push(root)
  mkdirSync(main)
  git(main, ["init", "-q", "-b", "main"])
  git(main, ["config", "user.email", "tower-test@example.invalid"])
  git(main, ["config", "user.name", "Tower Test"])
  git(main, ["commit", "-q", "--allow-empty", "-m", "initial"])
  git(main, ["worktree", "add", "-q", "-b", "linked", linked])
  return { root, main, linked }
}
const seedLegacy = (main) => {
  const runtime = join(main, ".git", "control-tower")
  mkdirSync(runtime, { recursive: true, mode: 0o700 })
  const db = new Database(join(runtime, "tower.db"))
  db.run(`CREATE TABLE agent (name TEXT PRIMARY KEY, role TEXT NOT NULL, worktree TEXT NOT NULL, branch TEXT, state TEXT NOT NULL, task TEXT, note TEXT, pr_url TEXT, updated_at TEXT NOT NULL);
CREATE TABLE message (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, sender TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL, consumed_at TEXT);
CREATE INDEX message_pending ON message (recipient, id) WHERE consumed_at IS NULL;
CREATE TABLE lock (name TEXT PRIMARY KEY, holder TEXT, acquired_at TEXT);`)
  db.run("INSERT INTO agent VALUES ('legacy','agent','/tmp/legacy','legacy','READY',NULL,NULL,NULL,'before')")
  db.close()
}
const runConcurrentBootstraps = async (root, main, requests) => {
  const runner = join(root, "concurrent-bootstrap.mjs")
  writeFileSync(runner, `import { Database } from "bun:sqlite"
import { existsSync, writeFileSync } from "node:fs"

const options = JSON.parse(Bun.argv.at(-1))
const transaction = Database.prototype.transaction
Database.prototype.transaction = function (callback) {
  const operation = transaction.call(this, callback)
  return {
    immediate(...args) {
      writeFileSync(options.ready, "")
      while (!existsSync(options.release)) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5)
      }
      return operation.immediate(...args)
    },
  }
}
const tower = await import(options.core)
try {
  console.log(JSON.stringify({ value: tower.bootstrapAdmin(options.request, options.main) }))
} catch (error) {
  console.log(JSON.stringify({ code: error.code }))
}
`)
  const children = requests.map((request, index) => {
    const ready = join(root, `bootstrap-ready-${index}`)
    const release = join(root, `release-bootstrap-${index}`)
    const child = Bun.spawn([
      process.execPath,
      runner,
      JSON.stringify({
        core: new URL("../core.mjs", import.meta.url).href,
        main,
        ready,
        release,
        request,
      }),
    ], { stdout: "pipe", stderr: "pipe" })
    return { child, ready, release }
  })
  const deadline = Date.now() + 5000
  while (children.some(({ ready }) => !existsSync(ready))) {
    if (Date.now() >= deadline) throw new Error("concurrent bootstraps did not reach the writer transaction")
    await Bun.sleep(5)
  }
  const results = []
  for (const { child, release } of children) {
    writeFileSync(release, "")
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    results.push(JSON.parse(stdout.trim()))
  }
  return results
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("P1 owner-provisioned anchor and Migration 001", () => {
  test("CT-R8-S3 derives one Main and provisions exact owner-only authority", () => {
    const { root, main, linked } = createMainFixture()
    const absolute = tower.deriveCanonicalMainContext(main)
    const relative = tower.deriveCanonicalMainContext(join(root, "main", "..", "main"))
    const fromLinked = tower.deriveCanonicalMainContext(linked)
    const configDigest = digest(canonical(absolute))
    const marker = join(root, "executed")
    for (const name of ["requirements.txt", "CMakeLists.txt", "guide.mdx", "README.sh"]) {
      writeFileSync(join(main, name), `#!/bin/sh\ntouch ${marker}\n`, { mode: 0o755 })
    }

    expect(relative).toEqual(absolute)
    expect(fromLinked).toEqual(absolute)
    expect(absolute).toMatchObject({ canonical_repo: main, main_worktree: main, branch: "main" })
    const request_identity = randomUUID()
    const created = tower.provisionMainAuthorityAnchor(
      { request_identity, expected_config_digest: configDigest },
      linked,
    )
    const anchorPath = join(absolute.git_common_dir, "control-tower", "main_authority_anchor_v1.json")
    const stats = lstatSync(anchorPath)
    const anchor = JSON.parse(readFileSync(anchorPath, "utf8"))

    expect(created).toEqual({ anchor_id: anchor.anchor_id, anchor_epoch: 1, state: "PROVISIONED", replayed: false })
    expect(stats.mode & 0o777).toBe(0o600)
    expect(stats.nlink).toBe(1)
    expect(anchor).toMatchObject({ kind: "main_authority_anchor_v1", version: 1, context: absolute, config_digest: configDigest })
    expect(created.anchor_secret).toBeUndefined()
    expect(existsSync(marker)).toBe(false)
    expect(tower.provisionMainAuthorityAnchor({ request_identity, expected_config_digest: configDigest }, main)).toEqual({ ...created, replayed: true })
    expect(errorCode(() => tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: configDigest }, main))).toBe("CT_ANCHOR_MISMATCH")
  })

  test("provisioning enforces exact owner-only modes under a restrictive umask", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const request = {
      request_identity: randomUUID(),
      expected_config_digest: digest(canonical(context)),
    }
    const previousUmask = process.umask(0o777)

    try {
      expect(tower.provisionMainAuthorityAnchor(request, main)).toMatchObject({
        state: "PROVISIONED",
        replayed: false,
      })
    } finally {
      process.umask(previousUmask)
    }

    const runtime = join(context.git_common_dir, "control-tower")
    const anchor = join(runtime, "main_authority_anchor_v1.json")
    expect(lstatSync(runtime).mode & 0o777).toBe(0o700)
    expect(lstatSync(anchor).mode & 0o777).toBe(0o600)
    expect(lstatSync(anchor).nlink).toBe(1)
  })

  test("CT-R8-S1 migrates exact bytes once, replays, fences CAS, and preserves legacy", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const configDigest = digest(canonical(context))
    const anchor = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: configDigest }, main)
    seedLegacy(main)
    const request = { request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }
    expect(errorCode(() => tower.bootstrapAdmin({ ...request, expected_anchor_id: "wrong" }, main))).toBe("CT_FENCE_MISMATCH")
    const first = tower.bootstrapAdmin(request, main)
    const db = new Database(join(context.git_common_dir, "control-tower", "tower.db"))

    expect(tower.MIGRATION_001_SQL).toBe(correctedMigration001Sql)
    expect(Buffer.byteLength(tower.MIGRATION_001_SQL)).toBe(854)
    expect(digest(tower.MIGRATION_001_SQL)).toBe(correctedMigration001Checksum)
    expect(tower.MIGRATION_001_CHECKSUM).toBe(correctedMigration001Checksum)
    expect(first).toEqual({ anchor_id: anchor.anchor_id, schema_version: 1, mode: "OFF", replayed: false })
    const expectedManifest = correctedMigration001Sql.trimEnd().split(";\n").map((statement) => {
      const sql = statement.replace(/;$/, "")
      const name = sql.match(/^CREATE TABLE (\w+)/)[1]
      return { type: "table", name, tbl_name: name, sql }
    }).sort((left, right) => left.name.localeCompare(right.name))
    expect(db.query(`SELECT type,name,tbl_name,sql FROM sqlite_master
      WHERE name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%' ORDER BY type,name`).all()).toEqual(expectedManifest)
    expect(db.query("SELECT name,state FROM agent").get()).toEqual({ name: "legacy", state: "READY" })
    db.close()
    expect(tower.bootstrapAdmin(request, main)).toEqual({ ...first, replayed: true })
    expect(errorCode(() => tower.bootstrapAdmin({ ...request, request_identity: randomUUID(), expected_schema_version: 1 }, main))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const drifted = new Database(join(context.git_common_dir, "control-tower", "tower.db"))
    drifted.run("UPDATE ct_continuation_state SET mode='ON' WHERE id=1")
    drifted.close()
    expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_FENCE_MISMATCH")
  })

  test("superseded Migration 001 is identified and refused without rebuild, rename, or copy", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const oldSql = correctedMigration001Sql.replaceAll(">= 1", "= 1")
    expect(digest(oldSql)).toBe(supersededMigration001Checksum)
    const db = new Database(dbPath)
    db.run(oldSql)
    db.run("INSERT INTO ct_schema_migration VALUES (1,?,'2026-07-22T00:00:00.000Z')", [supersededMigration001Checksum])
    db.run("INSERT INTO ct_continuation_state VALUES (1,?,?,?,?,1,'OFF')", [provisioned.anchor_id, 1, "sha256:fixture", digest(canonical(context))])
    db.close()
    const snapshot = () => {
      const readonly = new Database(dbPath, { readonly: true })
      const manifest = readonly.query("SELECT type,name,tbl_name,rootpage,sql FROM sqlite_master ORDER BY type,name").all()
      const migrations = readonly.query("SELECT * FROM ct_schema_migration").all()
      const state = readonly.query("SELECT * FROM ct_continuation_state").all()
      readonly.close()
      return { bytes: digest(readFileSync(dbPath)), entries: readdirSync(dirname(dbPath)).sort(), manifest, migrations, state }
    }
    const before = snapshot()
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 1, target_schema_version: 1, expected_mode: "OFF" }

    const error = captureError(() => tower.bootstrapAdmin(request, main))

    expect(tower.SUPERSEDED_MIGRATION_001_CHECKSUM).toBe(supersededMigration001Checksum)
    expect(error?.code).toBe("CT_SCHEMA_INVALID")
    expect(error?.cause?.message).toBe("SUPERSEDED_MIGRATION_001")
    expect(snapshot()).toEqual(before)
  })

  test("schema-version-1 replay rejects unexpected continuation object drift non-mutating", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }
    tower.bootstrapAdmin(request, main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const drifted = new Database(dbPath)
    drifted.run("CREATE TABLE ct_unexpected (id INTEGER)")
    drifted.close()
    const before = digest(readFileSync(dbPath))

    expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_SCHEMA_INVALID")
    expect(digest(readFileSync(dbPath))).toBe(before)
    const after = new Database(dbPath, { readonly: true })
    expect(after.query("SELECT name FROM sqlite_master WHERE name GLOB 'ct_*' ORDER BY name").all()).toEqual([
      { name: "ct_continuation_state" }, { name: "ct_idempotency" }, { name: "ct_schema_migration" }, { name: "ct_unexpected" },
    ])
    after.close()
  })

  test("simultaneous identical bootstraps commit once and replay once", async () => {
    const { root, main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }

    const results = await runConcurrentBootstraps(root, main, [request, request])

    expect(results.map(({ code }) => code)).toEqual([undefined, undefined])
    expect(results.map(({ value }) => value?.replayed).sort()).toEqual([false, true])
    const db = new Database(join(context.git_common_dir, "control-tower", "tower.db"), { readonly: true })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_schema_migration").get()).toEqual({ count: 1 })
    expect(db.query("SELECT COUNT(*) AS count FROM ct_idempotency").get()).toEqual({ count: 1 })
    db.close()
  })

  test("a changed concurrent bootstrap conflicts without partial state", async () => {
    const { root, main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }
    const changed = { ...request, request_identity: randomUUID(), expected_schema_version: 1 }

    const results = await runConcurrentBootstraps(root, main, [request, changed])

    expect(results).toEqual([
      { value: { anchor_id: provisioned.anchor_id, schema_version: 1, mode: "OFF", replayed: false } },
      { code: "CT_IDEMPOTENCY_CONFLICT" },
    ])
    const db = new Database(join(context.git_common_dir, "control-tower", "tower.db"), { readonly: true })
    expect(db.query("SELECT version FROM ct_schema_migration").all()).toEqual([{ version: 1 }])
    expect(db.query("SELECT request_identity FROM ct_idempotency").all()).toEqual([{ request_identity: request.request_identity }])
    expect(db.query("SELECT schema_version,mode FROM ct_continuation_state").all()).toEqual([{ schema_version: 1, mode: "OFF" }])
    expect(db.query("SELECT name,state FROM agent").all()).toEqual([{ name: "legacy", state: "READY" }])
    db.close()
  })

  test("legacy object drift is rejected before additive DDL", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const drifted = new Database(dbPath)
    drifted.run("ALTER TABLE agent ADD COLUMN drift TEXT")
    drifted.close()
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }

    expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_SCHEMA_INVALID")

    const after = new Database(dbPath)
    expect(after.query("SELECT name FROM sqlite_master WHERE name GLOB 'ct_*'").all()).toEqual([])
    expect(after.query("SELECT state FROM agent WHERE name='legacy'").get()).toEqual({ state: "READY" })
    after.close()
  })

  test("provision/bootstrap stay CLI-only and install delegates only when explicit", () => {
    const { root, main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const configDigest = digest(canonical(context))
    const requestIdentity = randomUUID()
    const env = { ...process.env, HOME: root, CONTROL_TOWER_CORE: join(packageRoot, "core.mjs"), OPENCODE_CONFIG_DIR: join(root, "missing") }
    const provisioned = JSON.parse(execFileSync("bash", [installPath, "--provision-main", "--repo", main, "--request-identity", requestIdentity, "--expected-config-digest", configDigest], { encoding: "utf8", env }))
    seedLegacy(main)
    const bootstrapped = JSON.parse(execFileSync("bash", [torrePath, "bootstrap-admin", "--repo", main, "--request-identity", randomUUID(), "--expected-anchor-id", provisioned.anchor_id, "--expected-schema-version", "0", "--target-schema-version", "1", "--expected-mode", "OFF"], { encoding: "utf8", env }))

    expect(provisioned).toMatchObject({ state: "PROVISIONED", replayed: false })
    expect(bootstrapped).toEqual({ anchor_id: provisioned.anchor_id, schema_version: 1, mode: "OFF", replayed: false })
    expect(readFileSync(join(root, "main", ".git", "control-tower", "main_authority_anchor_v1.json"), "utf8")).not.toContain("role")
  })

  test("unsafe type, link, owner, and mode predicates fail closed", () => {
    const uid = process.geteuid()
    expect(tower.isSafeAnchorEntry({ type: "file", uid: uid + 1, mode: 0o600, nlink: 1 }, { type: "file", uid, mode: 0o600, singleLink: true })).toBe(false)
    for (const unsafe of [
      (path) => chmodSync(path, 0o644),
      (path) => { const copy = `${path}.link`; linkSync(path, copy) },
      (path) => { rmSync(path); symlinkSync("missing", path) },
    ]) {
      const { main } = createMainFixture()
      const context = tower.deriveCanonicalMainContext(main)
      const request = { request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }
      tower.provisionMainAuthorityAnchor(request, main)
      const path = join(context.git_common_dir, "control-tower", "main_authority_anchor_v1.json")
      unsafe(path)
      expect(errorCode(() => tower.provisionMainAuthorityAnchor(request, main))).toBe("CT_ANCHOR_MISMATCH")
    }
  })

  test("unsafe runtime directory type, symlink, and mode are non-mutating", () => {
    for (const arrange of [
      (root) => mkdirSync(root, { mode: 0o755 }),
      (root) => writeFileSync(root, "not a directory\n"),
      (root) => {
        const target = `${root}-target`
        mkdirSync(target, { mode: 0o700 })
        symlinkSync(target, root)
      },
    ]) {
      const { main } = createMainFixture()
      const context = tower.deriveCanonicalMainContext(main)
      const runtime = join(context.git_common_dir, "control-tower")
      arrange(runtime)
      const request = { request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }

      expect(errorCode(() => tower.provisionMainAuthorityAnchor(request, main))).toBe("CT_ANCHOR_MISMATCH")
      const anchorPath = join(runtime, "main_authority_anchor_v1.json")
      expect(existsSync(anchorPath)).toBe(false)
    }
  })

  test("canonical anchors reject padded secrets and malformed creation timestamps", () => {
    for (const mutate of [
      (anchor) => { anchor.anchor_secret = `${anchor.anchor_secret}=` },
      (anchor) => { anchor.created_at = "2026-07-22T00:00:00Z" },
    ]) {
      const { main } = createMainFixture()
      const context = tower.deriveCanonicalMainContext(main)
      const request = { request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }
      tower.provisionMainAuthorityAnchor(request, main)
      const anchorPath = join(context.git_common_dir, "control-tower", "main_authority_anchor_v1.json")
      const anchor = JSON.parse(readFileSync(anchorPath, "utf8"))
      mutate(anchor)
      writeFileSync(anchorPath, `${canonical(anchor)}\n`)

      expect(errorCode(() => tower.provisionMainAuthorityAnchor(request, main))).toBe("CT_ANCHOR_MISMATCH")
    }
  })

  test("DDL failure rolls back every Slice 1 object and preserves legacy bytes", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const before = new Database(dbPath)
    const legacyBefore = before.query("SELECT * FROM agent WHERE name='legacy'").get()
    before.close()
    const originalMode = lstatSync(dbPath).mode & 0o777
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }

    chmodSync(dbPath, 0o400)
    try {
      expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_SCHEMA_INVALID")
    } finally {
      chmodSync(dbPath, originalMode)
    }

    const after = new Database(dbPath)
    expect(after.query("SELECT name FROM sqlite_master WHERE name GLOB 'ct_*'").all()).toEqual([])
    expect(after.query("SELECT * FROM agent WHERE name='legacy'").get()).toEqual(legacyBefore)
    after.close()
  })

  test("a bounded busy writer leaves Migration 001 replayable", () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const provisioned = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const request = { request_identity: randomUUID(), expected_anchor_id: provisioned.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }
    const locker = new Database(dbPath)
    locker.run("BEGIN IMMEDIATE")
    const started = Date.now()
    expect(errorCode(() => tower.bootstrapAdmin(request, main))).toBe("CT_BUSY")
    const elapsed = Date.now() - started
    expect(elapsed).toBeGreaterThanOrEqual(200)
    expect(elapsed).toBeLessThan(1500)
    locker.run("ROLLBACK"); locker.close()
    expect(tower.bootstrapAdmin(request, main)).toMatchObject({ schema_version: 1, mode: "OFF" })
  })

  test("CT-R8-S4 missing anchor and schema drift fail without provisioning or partial DDL", () => {
    const { main } = createMainFixture()
    expect(errorCode(() => tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: "missing", expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }, main))).toBe("CT_ANCHOR_REQUIRED")
    expect(existsSync(join(main, ".git", "control-tower"))).toBe(false)

    const context = tower.deriveCanonicalMainContext(main)
    const configDigest = digest(canonical(context))
    tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: configDigest }, main)
    seedLegacy(main)
    const dbPath = join(context.git_common_dir, "control-tower", "tower.db")
    const db = new Database(dbPath)
    db.run("CREATE TABLE ct_drift (id INTEGER)")
    db.close()
    expect(errorCode(() => tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: "unused", expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }, main))).toBe("CT_SCHEMA_INVALID")
    const after = new Database(dbPath)
    expect(after.query("SELECT name FROM sqlite_master WHERE name IN ('ct_schema_migration','ct_continuation_state','ct_idempotency')").all()).toEqual([])
    expect(after.query("SELECT state FROM agent WHERE name='legacy'").get()).toEqual({ state: "READY" })
    after.close()
  })
})

describe("P2 Migration 002", () => {
  const provisionV1 = () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const anchor = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }, main)
    return { main, context, anchor, dbPath: join(context.git_common_dir, "control-tower", "tower.db") }
  }
  const upgradeRequest = (anchor, request_identity = randomUUID()) => ({
    request_identity, expected_anchor_id: anchor.anchor_id,
    expected_schema_version: 1, target_schema_version: 2, expected_mode: "OFF",
  })

  test("pins exact Migration 002 bytes, checksum, manifest, lease seed, and replay", () => {
    const fixture = provisionV1()
    const request = upgradeRequest(fixture.anchor)

    expect(tower.MIGRATION_002_SQL).toBe(expectedMigration002Sql)
    expect(Buffer.byteLength(tower.MIGRATION_002_SQL)).toBe(3627)
    expect(digest(tower.MIGRATION_002_SQL)).toBe(expectedMigration002Checksum)
    expect(tower.MIGRATION_002_CHECKSUM).toBe(expectedMigration002Checksum)
    expect(tower.bootstrapAdmin(request, fixture.main)).toEqual({ anchor_id: fixture.anchor.anchor_id, schema_version: 2, mode: "OFF", replayed: false })

    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT version,ddl_checksum FROM ct_schema_migration ORDER BY version").all()).toEqual([
      { version: 1, ddl_checksum: correctedMigration001Checksum },
      { version: 2, ddl_checksum: expectedMigration002Checksum },
    ])
    expect(db.query("SELECT rollback_epoch,lease_status,lease_version,owner_main_binding_id,lease_expires_at FROM ct_rollback_lease").get()).toEqual({ rollback_epoch: 0, lease_status: "NONE", lease_version: 0, owner_main_binding_id: null, lease_expires_at: null })
    expect(db.query("SELECT name,state FROM agent").get()).toEqual({ name: "legacy", state: "READY" })
    expect(db.query("SELECT name FROM sqlite_master WHERE name GLOB 'ct_*' ORDER BY name").all().map(({ name }) => name)).toEqual([
      "ct_claimant_binding", "ct_claimant_binding_context_lookup", "ct_claimant_binding_one_active",
      "ct_claimant_conflict", "ct_claimant_conflict_no_delete", "ct_claimant_conflict_no_update",
      "ct_claimant_conflict_scope_history", "ct_continuation_state", "ct_idempotency", "ct_rollback_lease", "ct_schema_migration",
    ])
    db.close()
    expect(tower.bootstrapAdmin(request, fixture.main)).toEqual({ anchor_id: fixture.anchor.anchor_id, schema_version: 2, mode: "OFF", replayed: true })
    expect(errorCode(() => tower.bootstrapAdmin(upgradeRequest(fixture.anchor), fixture.main))).toBe("CT_IDEMPOTENCY_CONFLICT")
  })

  test("Migration 002 DDL failure rolls back all v2 state", () => {
    const fixture = provisionV1()
    const before = new Database(fixture.dbPath, { readonly: true })
    const legacy = before.query("SELECT * FROM agent").all()
    before.close()
    const mode = lstatSync(fixture.dbPath).mode & 0o777
    chmodSync(fixture.dbPath, 0o400)
    try {
      expect(errorCode(() => tower.bootstrapAdmin(upgradeRequest(fixture.anchor), fixture.main))).toBe("CT_SCHEMA_INVALID")
    } finally { chmodSync(fixture.dbPath, mode) }
    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT version FROM ct_schema_migration").all()).toEqual([{ version: 1 }])
    expect(db.query("SELECT name FROM sqlite_master WHERE name IN ('ct_claimant_binding','ct_claimant_conflict','ct_rollback_lease')").all()).toEqual([])
    expect(db.query("SELECT * FROM agent").all()).toEqual(legacy)
    db.close()
  })

  test("Migration 002 writer wait is bounded and retryable", () => {
    const fixture = provisionV1()
    const request = upgradeRequest(fixture.anchor)
    const locker = new Database(fixture.dbPath)
    locker.run("BEGIN IMMEDIATE")
    const started = Date.now()
    expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_BUSY")
    expect(Date.now() - started).toBeGreaterThanOrEqual(200)
    expect(Date.now() - started).toBeLessThan(1500)
    locker.run("ROLLBACK"); locker.close()
    expect(tower.bootstrapAdmin(request, fixture.main)).toMatchObject({ schema_version: 2, replayed: false })
  })
})

describe("P3-A Migration 003", () => {
  const provisionV2 = () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const anchor = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 0, target_schema_version: 1, expected_mode: "OFF" }, main)
    tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version: 1, target_schema_version: 2, expected_mode: "OFF" }, main)
    return { main, context, anchor, dbPath: join(context.git_common_dir, "control-tower", "tower.db") }
  }
  const upgradeRequest = (anchor, request_identity = randomUUID()) => ({
    request_identity, expected_anchor_id: anchor.anchor_id,
    expected_schema_version: 2, target_schema_version: 3, expected_mode: "OFF",
  })

  test("CT-R8-S5 pins Migration 003 bytes, schema-3 manifest, null Main CAS, and replay", () => {
    const fixture = provisionV2()
    const request = upgradeRequest(fixture.anchor)
    const before = new Database(fixture.dbPath, { readonly: true })
    const claimantRows = before.query("SELECT * FROM ct_claimant_binding").all()
    const legacyRows = before.query("SELECT * FROM agent").all()
    before.close()

    expect(tower.MIGRATION_003_SQL).toBe(expectedMigration003Sql)
    expect(Buffer.byteLength(tower.MIGRATION_003_SQL)).toBe(2457)
    expect(digest(tower.MIGRATION_003_SQL)).toBe(expectedMigration003Checksum)
    expect(tower.MIGRATION_003_CHECKSUM).toBe(expectedMigration003Checksum)
    expect(tower.bootstrapAdmin(request, fixture.main)).toEqual({ anchor_id: fixture.anchor.anchor_id, schema_version: 3, mode: "OFF", replayed: false })

    const expected = new Database(":memory:")
    expected.run(expectedMigration003Sql)
    const expectedObjects = expected.query("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name GLOB 'ct_*' ORDER BY type,name").all()
    expected.close()
    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT version,ddl_checksum FROM ct_schema_migration ORDER BY version").all()).toEqual([
      { version: 1, ddl_checksum: correctedMigration001Checksum },
      { version: 2, ddl_checksum: expectedMigration002Checksum },
      { version: 3, ddl_checksum: expectedMigration003Checksum },
    ])
    expect(db.query("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name IN ('ct_main_binding','ct_main_binding_one_active','ct_main_binding_history','ct_activation','ct_activation_no_update','ct_activation_no_delete') ORDER BY type,name").all()).toEqual(expectedObjects)
    expect(db.query("SELECT * FROM ct_main_binding").all()).toEqual([])
    expect(db.query("SELECT * FROM ct_activation").all()).toEqual([])
    expect(db.query("SELECT * FROM ct_claimant_binding").all()).toEqual(claimantRows)
    expect(db.query("SELECT * FROM agent").all()).toEqual(legacyRows)
    const idempotency = db.query("SELECT request_digest,cas_digest FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:2->3'").get()
    db.close()
    expect(idempotency).toEqual({
      request_digest: digest(canonical(request)),
      cas_digest: digest(canonical({
        expected_anchor_id: fixture.anchor.anchor_id, expected_schema_version: 2, target_schema_version: 3,
        expected_mode: "OFF", derived_anchor_epoch: 1, derived_config_digest: fixture.context.config_digest ?? digest(canonical(fixture.context)),
        expected_rollback_epoch: 0, expected_lease_version: 0, expected_lease_status: "NONE",
        expected_main_binding_state: "ABSENT", expected_activation_epoch: 0,
      })),
    })
    expect(tower.bootstrapAdmin(request, fixture.main)).toEqual({ anchor_id: fixture.anchor.anchor_id, schema_version: 3, mode: "OFF", replayed: true })
    expect(errorCode(() => tower.bootstrapAdmin(upgradeRequest(fixture.anchor), fixture.main))).toBe("CT_IDEMPOTENCY_CONFLICT")
  })

  test("Migration 003 preconditions enforce OFF, lease, target scope, then request CAS", () => {
    const fixture = provisionV2()
    const request = upgradeRequest(fixture.anchor)
    const db = new Database(fixture.dbPath)
    db.run("INSERT INTO ct_idempotency VALUES ('bootstrapAdmin','schema:2->3',?,?,?,?,?)", [randomUUID(), "request", "cas", "{}", new Date().toISOString()])
    db.run("UPDATE ct_continuation_state SET mode='ON' WHERE id=1")
    db.close()

    expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_FENCE_MISMATCH")
    const mutable = new Database(fixture.dbPath)
    mutable.run("UPDATE ct_continuation_state SET mode='OFF' WHERE id=1")
    mutable.run("UPDATE ct_rollback_lease SET lease_version=1 WHERE id=1")
    mutable.close()
    expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_FENCE_MISMATCH")

    const seeded = new Database(fixture.dbPath)
    seeded.run("UPDATE ct_rollback_lease SET lease_version=0 WHERE id=1")
    seeded.close()
    expect(errorCode(() => tower.bootstrapAdmin({ ...request, expected_anchor_id: "wrong" }, fixture.main))).toBe("CT_IDEMPOTENCY_CONFLICT")

    const absent = new Database(fixture.dbPath)
    absent.run("DELETE FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:2->3'")
    absent.close()
    expect(errorCode(() => tower.bootstrapAdmin({ ...request, expected_anchor_id: "wrong" }, fixture.main))).toBe("CT_FENCE_MISMATCH")
  })

  test("Migration 003 rollback and schema-2 CAS failures preserve P2 and legacy state", () => {
    const fixture = provisionV2()
    const request = upgradeRequest(fixture.anchor)
    const before = readFileSync(fixture.dbPath)
    expect(errorCode(() => tower.bootstrapAdmin({ ...request, expected_anchor_id: "wrong" }, fixture.main))).toBe("CT_FENCE_MISMATCH")
    expect(readFileSync(fixture.dbPath)).toEqual(before)

    const mode = lstatSync(fixture.dbPath).mode & 0o777
    chmodSync(fixture.dbPath, 0o400)
    try { expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_SCHEMA_INVALID") }
    finally { chmodSync(fixture.dbPath, mode) }
    const db = new Database(fixture.dbPath, { readonly: true })
    expect(db.query("SELECT version FROM ct_schema_migration ORDER BY version").all()).toEqual([{ version: 1 }, { version: 2 }])
    expect(db.query("SELECT name FROM sqlite_master WHERE name IN ('ct_main_binding','ct_activation')").all()).toEqual([])
    expect(db.query("SELECT name,state FROM agent").get()).toEqual({ name: "legacy", state: "READY" })
    expect(db.query("SELECT rollback_epoch,lease_status,lease_version FROM ct_rollback_lease").get()).toEqual({ rollback_epoch: 0, lease_status: "NONE", lease_version: 0 })
    db.close()
  })

  test("Migration 003 writer wait is bounded and retryable", () => {
    const fixture = provisionV2()
    const request = upgradeRequest(fixture.anchor)
    const locker = new Database(fixture.dbPath)
    locker.run("BEGIN IMMEDIATE")
    const started = Date.now()
    expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_BUSY")
    expect(Date.now() - started).toBeGreaterThanOrEqual(200)
    expect(Date.now() - started).toBeLessThan(1500)
    locker.run("ROLLBACK"); locker.close()
    expect(tower.bootstrapAdmin(request, fixture.main)).toMatchObject({ schema_version: 3, replayed: false })
  })
})

describe("P4-A1a Migration 004 definitions", () => {
  const manifestRows = (db) => db.query(`SELECT type,name,tbl_name,sql FROM sqlite_master
    WHERE name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%' ORDER BY type,name`).all()

  test("pins exact LF bytes, line count, terminal newline, and checksum independently", () => {
    expect(tower.MIGRATION_004_SQL).toBe(expectedMigration004Sql)
    expect(Buffer.byteLength(tower.MIGRATION_004_SQL)).toBe(12159)
    expect(tower.MIGRATION_004_SQL.split("\n").length - 1).toBe(215)
    expect(tower.MIGRATION_004_SQL.endsWith("\n")).toBe(true)
    expect(tower.MIGRATION_004_SQL.endsWith("\n\n")).toBe(false)
    expect(tower.MIGRATION_004_SQL.includes("\r")).toBe(false)
    expect(digest(tower.MIGRATION_004_SQL)).toBe(expectedMigration004Checksum)
    expect(tower.MIGRATION_004_CHECKSUM).toBe(expectedMigration004Checksum)
  })

  test("pins all 19 new definitions and the complete 36-object schema-4 manifest", () => {
    const additions = new Database(":memory:")
    additions.run(expectedMigration004Sql)
    const expectedAdditions = manifestRows(additions)
    additions.close()
    expect(expectedAdditions.map(({ name }) => name)).toEqual(expectedMigration004ObjectNames)
    expect(expectedAdditions).toHaveLength(19)

    const complete = new Database(":memory:")
    complete.run(correctedMigration001Sql + expectedMigration002Sql + expectedMigration003Sql + expectedMigration004Sql)
    const expectedObjects = manifestRows(complete)
    complete.close()
    expect(expectedObjects).toHaveLength(36)
    expect(tower.SCHEMA_004_MANIFEST).toEqual({
      schema_version: 4,
      objects: expectedObjects,
      migrations: [
        { version: 1, ddl_checksum: correctedMigration001Checksum },
        { version: 2, ddl_checksum: expectedMigration002Checksum },
        { version: 3, ddl_checksum: expectedMigration003Checksum },
        { version: 4, ddl_checksum: expectedMigration004Checksum },
      ],
    })
  })

})

describe("P4-A1b fresh Migration 004 and empty replay", () => {
  const provisionV3 = () => {
    const { main } = createMainFixture()
    const context = tower.deriveCanonicalMainContext(main)
    const anchor = tower.provisionMainAuthorityAnchor({ request_identity: randomUUID(), expected_config_digest: digest(canonical(context)) }, main)
    seedLegacy(main)
    for (const [expected_schema_version, target_schema_version] of [[0, 1], [1, 2], [2, 3]]) {
      tower.bootstrapAdmin({ request_identity: randomUUID(), expected_anchor_id: anchor.anchor_id, expected_schema_version, target_schema_version, expected_mode: "OFF" }, main)
    }
    return { main, context, anchor, dbPath: join(context.git_common_dir, "control-tower", "tower.db") }
  }
  const upgradeRequest = (anchor, request_identity = randomUUID()) => ({
    request_identity, expected_anchor_id: anchor.anchor_id,
    expected_schema_version: 3, target_schema_version: 4, expected_mode: "OFF",
  })
  const manifestEvidence = (db, schema_version) => ({
    kind: "schema_manifest_evidence_v1", version: 1, schema_version,
    objects: db.query(`SELECT type,name,tbl_name,sql FROM sqlite_master
      WHERE name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%' ORDER BY type,name`).all(),
    migrations: db.query("SELECT version,ddl_checksum FROM ct_schema_migration ORDER BY version").all(),
  })

  test("fresh 3->4 commits exact evidence, zero successor rows, and public empty replay", () => {
    const fixture = provisionV3(), request = upgradeRequest(fixture.anchor)
    const before = new Database(fixture.dbPath, { readonly: true })
    const schema3Digest = digest(canonical(manifestEvidence(before, 3)))
    const preserved = {
      legacy: before.query("SELECT * FROM agent").all(),
      main: before.query("SELECT * FROM ct_main_binding").all(),
      claimant: before.query("SELECT * FROM ct_claimant_binding").all(),
    }
    before.close()

    expect(tower.bootstrapAdmin(request, fixture.main)).toEqual({ anchor_id: fixture.anchor.anchor_id, schema_version: 4, mode: "OFF", replayed: false })
    const db = new Database(fixture.dbPath, { readonly: true })
    const envelope = JSON.parse(db.query("SELECT response_json FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'").get().response_json)
    const schema4Digest = digest(canonical(manifestEvidence(db, 4)))
    expect(envelope).toEqual({
      kind: "bootstrap_schema4_response_v1", version: 1,
      public_response: { anchor_id: fixture.anchor.anchor_id, schema_version: 4, mode: "OFF", replayed: false },
      evidence: {
        request, request_digest: digest(canonical(request)),
        cas_input: {
          expected_anchor_id: fixture.anchor.anchor_id, expected_schema_version: 3, target_schema_version: 4,
          expected_mode: "OFF", derived_anchor_epoch: 1, derived_config_digest: digest(canonical(fixture.context)),
          observed_rollback_epoch: 0, observed_lease_version: 0, observed_lease_status: "NONE",
          observed_active_main_binding_id: null, observed_active_main_binding_epoch: 0,
          observed_activation_epoch: 0, active_claimant_bindings: 0, delivery_plane: "ABSENT_SCHEMA_3",
        },
        cas_digest: expect.any(String), migration_004_checksum: expectedMigration004Checksum,
        schema_3_manifest_digest: schema3Digest, schema_4_manifest_digest: schema4Digest,
      },
    })
    expect(envelope.evidence.cas_digest).toBe(digest(canonical(envelope.evidence.cas_input)))
    expect(db.query("SELECT version,ddl_checksum FROM ct_schema_migration ORDER BY version").all().at(-1)).toEqual({ version: 4, ddl_checksum: expectedMigration004Checksum })
    for (const table of ["ct_handoff", "ct_handoff_transition", "ct_delivery", "ct_claim", "ct_session_budget"]) {
      expect(db.query(`SELECT COUNT(*) AS count FROM ${table}`).get().count).toBe(0)
    }
    expect(db.query("SELECT * FROM agent").all()).toEqual(preserved.legacy)
    expect(db.query("SELECT * FROM ct_main_binding").all()).toEqual(preserved.main)
    expect(db.query("SELECT * FROM ct_claimant_binding").all()).toEqual(preserved.claimant)
    db.close()
    expect(tower.bootstrapAdmin(request, fixture.main)).toEqual({ anchor_id: fixture.anchor.anchor_id, schema_version: 4, mode: "OFF", replayed: true })
    expect(errorCode(() => tower.bootstrapAdmin({ ...request, request_identity: randomUUID() }, fixture.main))).toBe("CT_IDEMPOTENCY_CONFLICT")
  })

  test("fresh/replay precedence rejects mode, lease, request, checksum, manifest, and evidence drift", () => {
    for (const mutate of [
      (db) => db.run("UPDATE ct_continuation_state SET mode='ON'"),
      (db) => db.run("UPDATE ct_rollback_lease SET lease_status='ACTIVE',owner_main_binding_id=?,lease_expires_at='2026-07-22T00:00:00.000Z'", ["x".repeat(43)]),
    ]) {
      const fixture = provisionV3(), request = upgradeRequest(fixture.anchor), db = new Database(fixture.dbPath)
      mutate(db); db.close()
      expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_FENCE_MISMATCH")
    }
    const wrongCas = provisionV3(), wrongRequest = upgradeRequest(wrongCas.anchor)
    expect(errorCode(() => tower.bootstrapAdmin({ ...wrongRequest, expected_anchor_id: "wrong" }, wrongCas.main))).toBe("CT_FENCE_MISMATCH")

    for (const [mutate, expected] of [
      [(db) => db.run("UPDATE ct_schema_migration SET ddl_checksum=? WHERE version=4", [digest("wrong")]), "CT_SCHEMA_INVALID"],
      [(db) => db.run("DROP TRIGGER ct_claim_no_delete"), "CT_SCHEMA_INVALID"],
      [(db) => db.run("UPDATE ct_idempotency SET response_json='{}' WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'"), "CT_SCHEMA_INVALID"],
      [(db) => db.run("UPDATE ct_idempotency SET cas_digest=? WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'", [digest("wrong-cas")]), "CT_SCHEMA_INVALID"],
    ]) {
      const fixture = provisionV3(), request = upgradeRequest(fixture.anchor)
      tower.bootstrapAdmin(request, fixture.main)
      const db = new Database(fixture.dbPath); mutate(db); db.close()
      expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe(expected)
    }
  })

  test("schema-4 replay request fences precede conflicting tuple comparison without mutation", () => {
    const fixture = provisionV3(), request = upgradeRequest(fixture.anchor)
    tower.bootstrapAdmin(request, fixture.main)
    const before = readFileSync(fixture.dbPath)

    for (const changedRequest of [
      { ...request, request_identity: randomUUID(), expected_schema_version: 4 },
      { ...request, request_identity: randomUUID(), expected_mode: "ON" },
    ]) {
      expect(errorCode(() => tower.bootstrapAdmin(changedRequest, fixture.main))).toBe("CT_FENCE_MISMATCH")
      expect(readFileSync(fixture.dbPath)).toEqual(before)
    }

    expect(errorCode(() => tower.bootstrapAdmin({ ...request, request_identity: randomUUID() }, fixture.main))).toBe("CT_IDEMPOTENCY_CONFLICT")
    expect(readFileSync(fixture.dbPath)).toEqual(before)
  })

  test("schema-4 replay fences mode and lease before missing or malformed migration evidence", () => {
    const evidenceFaults = [
      (db) => db.run("DELETE FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'"),
      (db) => db.run("UPDATE ct_idempotency SET response_json='{}' WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'"),
    ]
    const fenceFaults = [
      (db) => db.run("UPDATE ct_continuation_state SET mode='ON' WHERE id=1"),
      (db) => db.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK' WHERE id=1"),
      (db) => db.run("UPDATE ct_rollback_lease SET lease_status='ACTIVE',owner_main_binding_id=?,lease_expires_at='2026-07-22T00:00:00.000Z' WHERE id=1", ["x".repeat(43)]),
    ]

    for (const evidenceFault of evidenceFaults) {
      for (const fenceFault of fenceFaults) {
        const fixture = provisionV3(), request = upgradeRequest(fixture.anchor)
        tower.bootstrapAdmin(request, fixture.main)
        const db = new Database(fixture.dbPath)
        evidenceFault(db); fenceFault(db); db.close()
        expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_FENCE_MISMATCH")
      }

      const fixture = provisionV3(), request = upgradeRequest(fixture.anchor)
      tower.bootstrapAdmin(request, fixture.main)
      const db = new Database(fixture.dbPath)
      evidenceFault(db); db.close()
      expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_SCHEMA_INVALID")
    }
  })

  test("competing faults preserve checksum, manifest, committed request, then request-CAS precedence", () => {
    const checksumFirst = provisionV3(), checksumRequest = upgradeRequest(checksumFirst.anchor)
    tower.bootstrapAdmin(checksumRequest, checksumFirst.main)
    const checksumDb = new Database(checksumFirst.dbPath)
    checksumDb.run("UPDATE ct_schema_migration SET ddl_checksum=? WHERE version=1", [supersededMigration001Checksum])
    checksumDb.run("DROP TRIGGER ct_claim_no_delete")
    checksumDb.run("UPDATE ct_idempotency SET response_json='{}',cas_digest=? WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'", [digest("wrong-cas")])
    checksumDb.close()
    const checksumError = captureError(() => tower.bootstrapAdmin({ ...checksumRequest, request_identity: randomUUID(), expected_anchor_id: "wrong" }, checksumFirst.main))
    expect(checksumError?.code).toBe("CT_SCHEMA_INVALID")
    expect(checksumError?.cause?.message).toBe("SUPERSEDED_MIGRATION_001")

    const manifestFirst = provisionV3(), manifestRequest = upgradeRequest(manifestFirst.anchor)
    tower.bootstrapAdmin(manifestRequest, manifestFirst.main)
    const manifestDb = new Database(manifestFirst.dbPath)
    manifestDb.run("DROP TRIGGER ct_claim_no_delete")
    manifestDb.close()
    expect(errorCode(() => tower.bootstrapAdmin({ ...manifestRequest, request_identity: randomUUID(), expected_anchor_id: "wrong" }, manifestFirst.main))).toBe("CT_SCHEMA_INVALID")

    const committedFirst = provisionV3(), committedRequest = upgradeRequest(committedFirst.anchor)
    const committedDb = new Database(committedFirst.dbPath)
    committedDb.run("INSERT INTO ct_idempotency VALUES ('bootstrapAdmin','schema:3->4',?,?,?,?,?)", [randomUUID(), digest("occupied-request"), digest("occupied-cas"), "{}", "2026-07-22T00:00:00.000Z"])
    committedDb.close()
    expect(errorCode(() => tower.bootstrapAdmin({ ...committedRequest, expected_anchor_id: "wrong" }, committedFirst.main))).toBe("CT_IDEMPOTENCY_CONFLICT")
  })

  test("partial DDL failure and bounded busy roll back fully and retry from byte-identical schema 3", () => {
    const fixture = provisionV3(), request = upgradeRequest(fixture.anchor)
    const blocker = new Database(fixture.dbPath)
    blocker.run(`CREATE TRIGGER force_migration_004_failure BEFORE INSERT ON ct_schema_migration
      WHEN NEW.version=4 BEGIN SELECT RAISE(ABORT, 'forced-late-migration-failure'); END`)
    blocker.close()
    const before = readFileSync(fixture.dbPath)
    expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_SCHEMA_INVALID")
    expect(readFileSync(fixture.dbPath)).toEqual(before)
    const rolledBack = new Database(fixture.dbPath)
    expect(rolledBack.query("SELECT version FROM ct_schema_migration ORDER BY version").all()).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }])
    expect(rolledBack.query("SELECT name FROM sqlite_master WHERE name IN ('ct_handoff','ct_handoff_transition','ct_delivery','ct_claim','ct_session_budget')").all()).toEqual([])
    rolledBack.run("DROP TRIGGER force_migration_004_failure")
    rolledBack.close()
    const locker = new Database(fixture.dbPath); locker.run("BEGIN IMMEDIATE")
    const started = Date.now()
    expect(errorCode(() => tower.bootstrapAdmin(request, fixture.main))).toBe("CT_BUSY")
    expect(Date.now() - started).toBeGreaterThanOrEqual(200)
    expect(Date.now() - started).toBeLessThan(1500)
    locker.run("ROLLBACK"); locker.close()
    expect(tower.bootstrapAdmin(request, fixture.main)).toMatchObject({ schema_version: 4, replayed: false })
  })
})

describe("P0 frozen snapshot restore", () => {
  test("recursively manifests unknown nested runtime entries and full special modes", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-runtime-manifest-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const nestedDirectory = join(repository, ".git", "control-tower", "unknown", "nested")
    const nestedFile = join(nestedDirectory, "state.bin")
    mkdirSync(nestedDirectory, { recursive: true })
    writeFileSync(nestedFile, "runtime state\n", { mode: 0o644 })
    execFileSync("chmod", ["4644", nestedFile])

    const manifest = snapshotRuntimeBoundary(repository)

    expect(manifest.map(({ path }) => path)).toEqual([
      ".git/control-tower",
      ".git/control-tower/unknown",
      ".git/control-tower/unknown/nested",
      ".git/control-tower/unknown/nested/state.bin",
    ])
    expect(manifest.at(-1)).toMatchObject({ kind: "file", mode: 0o104644 })
  })

  test("fails closed when the runtime ACTIVE marker is present", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-runtime-active-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const runtimeRoot = join(repository, ".git", "control-tower")
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(join(runtimeRoot, "ACTIVE"), "")

    expect(() => snapshotRuntimeBoundary(repository)).toThrow(
      "Control Tower must be OFF: .git/control-tower/ACTIVE is present",
    )
  })

  test("selects the shared Git common-directory runtime from a linked worktree", () => {
    const root = mkdtempSync(join(tmpdir(), "control-tower-linked-runtime-"))
    const main = join(root, "main")
    const linked = join(root, "linked")
    temporaryDirectories.push(root)
    mkdirSync(main)
    git(main, ["init", "-q", "-b", "main"])
    git(main, ["config", "user.email", "tower-test@example.invalid"])
    git(main, ["config", "user.name", "Tower Test"])
    git(main, ["commit", "-q", "--allow-empty", "-m", "initial"])
    git(main, ["worktree", "add", "-q", "-b", "linked", linked])
    const sharedRuntimeRoot = join(main, ".git", "control-tower")
    mkdirSync(sharedRuntimeRoot)
    writeFileSync(join(sharedRuntimeRoot, "shared-state"), "authoritative\n")

    const manifest = snapshotRuntimeBoundary(linked)

    expect(manifest.map(({ path }) => path)).toEqual([
      "../main/.git/control-tower",
      "../main/.git/control-tower/shared-state",
    ])
    expect(manifest.at(-1)).toMatchObject({ kind: "file", sha256: expect.any(String) })
  })

  test("fails closed when a descendant disappears during a runtime snapshot", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-unstable-runtime-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const runtimeRoot = join(repository, ".git", "control-tower")
    const disappearingPath = join(runtimeRoot, "disappearing-state")
    mkdirSync(runtimeRoot)
    writeFileSync(disappearingPath, "transient\n")

    expect(() =>
      snapshotRuntimeBoundary(repository, {
        beforeEntrySnapshot(path) {
          if (path === disappearingPath) rmSync(path)
        },
      }),
    ).toThrow("unstable Control Tower runtime snapshot")
  })

  test("fails closed when a directory gains an entry during a runtime snapshot", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-growing-runtime-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const runtimeRoot = join(repository, ".git", "control-tower")
    const existingPath = join(runtimeRoot, "existing-state")
    mkdirSync(runtimeRoot)
    writeFileSync(existingPath, "stable before listing\n")

    expect(() =>
      snapshotRuntimeBoundary(repository, {
        beforeEntrySnapshot(path) {
          if (path === existingPath) {
            writeFileSync(join(runtimeRoot, "concurrent-state"), "added after listing\n")
          }
        },
      }),
    ).toThrow("unstable Control Tower runtime snapshot")
  })

  test("fails closed when a nested runtime directory gains an entry after listing", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-growing-nested-runtime-"))
    temporaryDirectories.push(repository)
    git(repository, ["init", "-q"])
    const nestedDirectory = join(repository, ".git", "control-tower", "nested")
    const existingPath = join(nestedDirectory, "existing-state")
    mkdirSync(nestedDirectory, { recursive: true })
    writeFileSync(existingPath, "stable before listing\n")

    expect(() =>
      snapshotRuntimeBoundary(repository, {
        beforeEntrySnapshot(path) {
          if (path === existingPath) {
            writeFileSync(join(nestedDirectory, "concurrent-state"), "added after listing\n")
          }
        },
      }),
    ).toThrow("unstable Control Tower runtime snapshot")
  })

  for (const snapshot of [
    {
      ref: "f583df7",
      commit: "f583df7187252f92d4a63c06e4fa6f160d21e9d9",
      tree: "f3cd37a342543a557a2d251a640f553dcfa40d06",
      archiveSha256: "d2d522bf458c06af8098c47e431c3d4c59969c8dceff331a420fc40ae10764e5",
    },
    {
      ref: "71ab571",
      commit: "71ab5714dc967942fb202576a75fa93b75f45c1b",
      tree: "02e38b90318e5fa06d0baa4bd912654e77040e3f",
      archiveSha256: "98a80cddf8507deca8fc199d8c8be6d6600481ac0a7cc6a7f11c4a84b005b0f2",
    },
  ]) {
    test(`restores ${snapshot.ref} into an isolated root with exact tracked bytes`, () => {
      const destination = mkdtempSync(join(tmpdir(), `control-tower-restore-${snapshot.ref}-`))
      temporaryDirectories.push(destination)
      const runtimeBefore = snapshotRuntimeBoundary(packageRoot)

      expect(runtimeBefore).toEqual(expectedAbsentRuntimeBoundary)
      expect(existsSync(actualActivePath)).toBe(false)

      const restored = restoreFrozenSnapshot({
        repository: packageRoot,
        destination,
        ref: snapshot.ref,
      })

      expect({
        commit: restored.commit,
        tree: restored.tree,
        archiveSha256: restored.archiveSha256,
        trackedFiles: restored.trackedFiles,
      }).toEqual({
        commit: snapshot.commit,
        tree: snapshot.tree,
        archiveSha256: snapshot.archiveSha256,
        trackedFiles: 12,
      })
      expect(restored.trackedEntries).toHaveLength(12)
      expect(restored.trackedEntries.map(({ path }) => path)).toEqual(expectedTrackedPaths)
      expect(restored.trackedEntries.every(({ contentMatches }) => contentMatches)).toBe(true)
      expect(restored.trackedEntries.every(({ modeMatches }) => modeMatches)).toBe(true)
      expect(snapshotRuntimeBoundary(packageRoot)).toEqual(expectedAbsentRuntimeBoundary)
      expect(existsSync(actualActivePath)).toBe(false)
      expect(readFileSync(evidencePath, "utf8")).toContain(snapshot.archiveSha256)
    })
  }

  test("restores exact regular-file permissions under a restrictive umask", () => {
    const destination = mkdtempSync(join(tmpdir(), "control-tower-restore-umask-"))
    temporaryDirectories.push(destination)
    const previousUmask = process.umask(0o077)

    try {
      const restored = restoreFrozenSnapshot({
        repository: packageRoot,
        destination,
        ref: "71ab571",
      })

      for (const entry of restored.trackedEntries) {
        const expectedMode = entry.mode === "100755" ? 0o755 : 0o644
        expect(lstatSync(join(destination, entry.path)).mode & 0o777).toBe(expectedMode)
      }
    } finally {
      process.umask(previousUmask)
    }
  })

  test("restores 100644, 100755, and 120000 entries with exact identity", () => {
    const repository = mkdtempSync(join(tmpdir(), "control-tower-mode-repository-"))
    const destination = mkdtempSync(join(tmpdir(), "control-tower-mode-restore-"))
    temporaryDirectories.push(repository, destination)
    mkdirSync(join(repository, "nested"))
    writeFileSync(join(repository, "regular.txt"), "regular bytes\n", { mode: 0o644 })
    writeFileSync(join(repository, "nested", "executable.sh"), "#!/bin/sh\nexit 0\n", {
      mode: 0o755,
    })
    symlinkSync("nested/executable.sh", join(repository, "command-link"))
    git(repository, ["init", "-q"])
    git(repository, ["config", "user.email", "tower-test@example.invalid"])
    git(repository, ["config", "user.name", "Tower Test"])
    git(repository, ["add", "."])
    git(repository, ["commit", "-q", "-m", "mode fixture"])

    const restored = restoreFrozenSnapshot({ repository, destination, ref: "HEAD" })

    expect(restored.trackedEntries.map(({ mode, path }) => ({ mode, path }))).toEqual([
      { mode: "120000", path: "command-link" },
      { mode: "100755", path: "nested/executable.sh" },
      { mode: "100644", path: "regular.txt" },
    ])
    expect(lstatSync(join(destination, "regular.txt")).mode & 0o777).toBe(0o644)
    expect(lstatSync(join(destination, "nested", "executable.sh")).mode & 0o777).toBe(0o755)
    expect(lstatSync(join(destination, "command-link")).isSymbolicLink()).toBe(true)
    expect(readlinkSync(join(destination, "command-link"))).toBe("nested/executable.sh")
  })

  test("rejects exact-mode drift after restoration", () => {
    const destination = mkdtempSync(join(tmpdir(), "control-tower-mode-drift-"))
    temporaryDirectories.push(destination)
    const restored = restoreFrozenSnapshot({
      repository: packageRoot,
      destination,
      ref: "71ab571",
    })
    const regularEntry = restored.trackedEntries.find(({ mode }) => mode === "100644")
    chmodSync(join(destination, regularEntry.path), 0o600)

    expect(() =>
      verifyTrackedEntry(packageRoot, restored.commit, destination, regularEntry),
    ).toThrow(`restored entry mismatch: ${regularEntry.path}`)
  })

  test("rejects special permission bits on restored regular files", () => {
    const destination = mkdtempSync(join(tmpdir(), "control-tower-special-mode-drift-"))
    temporaryDirectories.push(destination)
    const restored = restoreFrozenSnapshot({
      repository: packageRoot,
      destination,
      ref: "71ab571",
    })

    for (const [gitMode, driftMode, driftModeText] of [
      ["100644", 0o4644, "4644"],
      ["100755", 0o4755, "4755"],
    ]) {
      const entry = restored.trackedEntries.find(({ mode }) => mode === gitMode)
      execFileSync("chmod", [driftModeText, join(destination, entry.path)])

      expect(lstatSync(join(destination, entry.path)).mode & 0o7777).toBe(driftMode)
      expect(() => verifyTrackedEntry(packageRoot, restored.commit, destination, entry)).toThrow(
        `restored entry mismatch: ${entry.path}`,
      )
    }
  })
})
