// Control Tower — store.
//
// One SQLite database per repository, at <git-common-dir>/control-tower/tower.db.
// All worktrees of a repo share it; separate repos never do. It lives inside
// .git, so it is never versioned and never dirties a branch.
//
// This file is the only place that touches the database. The MCP server and the
// OpenCode plugin both go through it, so there is one definition of what a
// legal state transition is.
//
// Why SQLite and not Engram: the delivery token needs "grant only if nobody
// holds it" to be ONE atomic step. Engram's mem_update is a blind overwrite
// with no conditional update, so read-decide-write leaves a window where two
// callers both see "free" and both take it — the same shape of bug as two
// agents overwriting a single-file mailbox. `BEGIN IMMEDIATE` closes it.
// Engram remains the right home for narrative: why we decided things, what
// happened last session. The tower holds only what is true right now.

import { Database } from "bun:sqlite"
import { execFileSync } from "node:child_process"
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import {
  appendFileSync, chmodSync, closeSync, constants, existsSync, fchmodSync, fsyncSync, linkSync,
  lstatSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync,
} from "node:fs"
import { basename, isAbsolute, join, normalize } from "node:path"

export const STATES = [
  "PLANNED",
  "ASSIGNED",
  "WORKING",
  "READY",
  "DELIVERING",
  "PR_OPEN",
  "MERGED",
  "BLOCKED",
  "WAITING_HUMAN",
  "COMPLETE",
]

// Held by at most one agent at a time. Parallel WORK is fine and expected;
// what serializes is delivery and schema mutation. Two agents with zero file
// overlap still share one remote and one database, so disjoint scope does not
// make simultaneous delivery safe.
export const LOCKS = ["git-delivery", "db-writer"]

export const INACTIVE_ERROR = "control tower is off for this repository; run `torre on` to enable it"

const now = () => new Date().toISOString()

// States that mean the loop stopped and is waiting on a person. They are
// marked in the trace so `torre log` shows the one thing you cannot infer from
// watching messages fly past: that nothing is coming next.
export const NEEDS_HUMAN = ["BLOCKED", "WAITING_HUMAN"]

/**
 * Append one line to the shared trace. Every actor writes here — plugin, MCP,
 * both sides of a handoff — so the log is the whole story of the run and not
 * just the wakes. Best-effort: a trace that cannot be written must never take
 * down the operation it was describing.
 */
export const trace = (root, actor, line, flag = "") => {
  try {
    appendFileSync(join(root, "tower.log"), `${now()} ${actor} ${flag}${line}\n`)
  } catch {
    // nothing sensible to do; losing a log line beats failing the caller
  }
}

const git = (cwd, args) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim()

const ctError = (code, cause) => Object.assign(new Error(code, { cause }), { code })
const jcs = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`
}
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const rfc3339Milliseconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const isBase64url32 = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) &&
  Buffer.from(value, "base64url").length === 32 && Buffer.from(value, "base64url").toString("base64url") === value
const ANCHOR_NAME = "main_authority_anchor_v1.json"

export const MIGRATION_001_SQL = `CREATE TABLE ct_schema_migration (
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
export const MIGRATION_001_CHECKSUM = sha256(Buffer.from(MIGRATION_001_SQL))
export const SUPERSEDED_MIGRATION_001_CHECKSUM = "sha256:47f63b10e516ac977e1cc26723b064eb037a4a2cdb84246b1c183903b909eb41"
export const MIGRATION_002_SQL = `CREATE TABLE ct_claimant_binding (
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
export const MIGRATION_002_CHECKSUM = sha256(Buffer.from(MIGRATION_002_SQL))
export const MIGRATION_003_SQL = `CREATE TABLE ct_main_binding (
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
export const MIGRATION_003_CHECKSUM = sha256(Buffer.from(MIGRATION_003_SQL))
export const MIGRATION_004_SQL = `CREATE TABLE ct_handoff (
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
export const MIGRATION_004_CHECKSUM = sha256(Buffer.from(MIGRATION_004_SQL))
export const MIGRATION_005_SQL = `CREATE TABLE ct_termination_receipt (
  receipt_id TEXT PRIMARY KEY CHECK(length(receipt_id) = 43),
  subject_kind TEXT NOT NULL CHECK(subject_kind IN ('CLAIMANT', 'MAIN')),
  subject_binding_id TEXT NOT NULL CHECK(length(subject_binding_id) = 43),
  subject_identity_digest TEXT NOT NULL CHECK(length(subject_identity_digest) = 71),
  subject_binding_epoch INTEGER NOT NULL CHECK(subject_binding_epoch > 0),
  process_role TEXT NOT NULL CHECK(process_role IN ('HOST', 'MCP')),
  pairing_digest TEXT NOT NULL CHECK(length(pairing_digest) = 71),
  issuer TEXT NOT NULL CHECK(issuer = 'CT_MAIN_OBSERVER_V1'),
  verifier TEXT NOT NULL CHECK(verifier = 'CT_MAIN_VERIFIER_V1'),
  method TEXT NOT NULL CHECK(method = 'OS_PROCESS_TABLE_V1'),
  observation TEXT NOT NULL CHECK(observation IN ('ABSENT', 'REPLACED')),
  terminated INTEGER NOT NULL CHECK(terminated = 1),
  os_boot_id TEXT NOT NULL CHECK(length(os_boot_id) BETWEEN 1 AND 256),
  os_session_id TEXT NOT NULL CHECK(length(os_session_id) BETWEEN 1 AND 256),
  host_process_instance TEXT NOT NULL CHECK(length(host_process_instance) > 0),
  plugin_instance TEXT NOT NULL CHECK(length(plugin_instance) > 0),
  root_session_id TEXT NOT NULL CHECK(length(root_session_id) > 0),
  mcp_process_instance TEXT NOT NULL CHECK(length(mcp_process_instance) = 43),
  pid_start_marker TEXT NOT NULL CHECK(length(pid_start_marker) BETWEEN 1 AND 128),
  observed_start_marker TEXT CHECK(observed_start_marker IS NULL OR length(observed_start_marker) BETWEEN 1 AND 128),
  rollback_epoch INTEGER NOT NULL CHECK(rollback_epoch >= 0),
  lease_version INTEGER NOT NULL CHECK(lease_version >= 0),
  generation INTEGER NOT NULL CHECK(generation >= 0),
  handoff_id TEXT CHECK(handoff_id IS NULL OR length(handoff_id) = 43),
  receipt_json TEXT NOT NULL CHECK(length(CAST(receipt_json AS BLOB)) BETWEEN 1 AND 8192),
  receipt_digest TEXT NOT NULL UNIQUE CHECK(length(receipt_digest) = 71),
  observed_at TEXT NOT NULL CHECK(length(observed_at) = 24),
  recorded_at TEXT NOT NULL CHECK(length(recorded_at) = 24),
  CHECK(recorded_at >= observed_at),
  CHECK((subject_kind = 'CLAIMANT' AND handoff_id IS NOT NULL) OR
        (subject_kind = 'MAIN' AND handoff_id IS NULL AND generation = 0)),
  CHECK((observation = 'ABSENT' AND observed_start_marker IS NULL) OR
        (observation = 'REPLACED' AND observed_start_marker IS NOT NULL AND observed_start_marker <> pid_start_marker)),
  UNIQUE(subject_binding_id, subject_binding_epoch, process_role, rollback_epoch, generation)
);
CREATE INDEX ct_termination_receipt_subject_lookup
ON ct_termination_receipt(subject_binding_id, subject_binding_epoch, rollback_epoch, generation, process_role);
CREATE INDEX ct_termination_receipt_pairing
ON ct_termination_receipt(pairing_digest, process_role);
CREATE TRIGGER ct_termination_receipt_no_update
BEFORE UPDATE ON ct_termination_receipt
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_TERMINATION_RECEIPT');
END;
CREATE TRIGGER ct_termination_receipt_no_delete
BEFORE DELETE ON ct_termination_receipt
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_TERMINATION_RECEIPT');
END;
CREATE TABLE ct_quiescence_snapshot (
  snapshot_id TEXT PRIMARY KEY CHECK(length(snapshot_id) = 43),
  snapshot_kind TEXT NOT NULL CHECK(snapshot_kind IN ('ROLLBACK_FREEZE', 'ROLLBACK_FINISH')),
  rollback_epoch INTEGER NOT NULL CHECK(rollback_epoch > 0),
  lease_version INTEGER NOT NULL CHECK(lease_version > 0),
  owner_main_binding_id TEXT NOT NULL CHECK(length(owner_main_binding_id) = 43),
  owner_main_binding_epoch INTEGER NOT NULL CHECK(owner_main_binding_epoch > 0),
  owner_main_identity_digest TEXT NOT NULL CHECK(length(owner_main_identity_digest) = 71),
  live_claims INTEGER NOT NULL CHECK(live_claims >= 0),
  live_deliveries INTEGER NOT NULL CHECK(live_deliveries >= 0),
  live_workers INTEGER NOT NULL CHECK(live_workers >= 0),
  pending_work INTEGER NOT NULL CHECK(pending_work >= 0),
  pending_attestation INTEGER NOT NULL CHECK(pending_attestation >= 0),
  frozen_inventory_json TEXT NOT NULL CHECK(length(CAST(frozen_inventory_json AS BLOB)) BETWEEN 1 AND 65536),
  frozen_inventory_digest TEXT NOT NULL CHECK(length(frozen_inventory_digest) = 71),
  polling_witness TEXT NOT NULL CHECK(polling_witness = 'UNAVAILABLE_BEFORE_P7'),
  quiescence_json TEXT NOT NULL CHECK(length(CAST(quiescence_json AS BLOB)) BETWEEN 1 AND 65536),
  quiescence_digest TEXT NOT NULL UNIQUE CHECK(length(quiescence_digest) = 71),
  observed_at TEXT NOT NULL CHECK(length(observed_at) = 24),
  CHECK(snapshot_kind = 'ROLLBACK_FREEZE' OR
        (live_claims = 0 AND live_deliveries = 0 AND live_workers = 0 AND pending_work = 0 AND pending_attestation = 0)),
  UNIQUE(rollback_epoch, snapshot_kind)
);
CREATE INDEX ct_quiescence_snapshot_epoch
ON ct_quiescence_snapshot(rollback_epoch, snapshot_kind, observed_at);
CREATE TRIGGER ct_quiescence_snapshot_no_update
BEFORE UPDATE ON ct_quiescence_snapshot
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_QUIESCENCE_SNAPSHOT');
END;
CREATE TRIGGER ct_quiescence_snapshot_no_delete
BEFORE DELETE ON ct_quiescence_snapshot
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_QUIESCENCE_SNAPSHOT');
END;
CREATE TABLE ct_rollback_epoch (
  rollback_epoch INTEGER PRIMARY KEY CHECK(rollback_epoch > 0),
  epoch_state TEXT NOT NULL CHECK(epoch_state IN ('OPEN', 'FINISHED')),
  begin_owner_main_binding_id TEXT NOT NULL CHECK(length(begin_owner_main_binding_id) = 43),
  begin_owner_main_binding_epoch INTEGER NOT NULL CHECK(begin_owner_main_binding_epoch > 0),
  begin_owner_main_identity_digest TEXT NOT NULL CHECK(length(begin_owner_main_identity_digest) = 71),
  prior_activation_epoch INTEGER NOT NULL CHECK(prior_activation_epoch > 0),
  begin_lease_version INTEGER NOT NULL CHECK(begin_lease_version > 0),
  begin_lease_expires_at TEXT NOT NULL CHECK(length(begin_lease_expires_at) = 24),
  freeze_quiescence_digest TEXT NOT NULL CHECK(length(freeze_quiescence_digest) = 71),
  finish_lease_version INTEGER CHECK(finish_lease_version IS NULL OR finish_lease_version > 0),
  finish_quiescence_digest TEXT CHECK(finish_quiescence_digest IS NULL OR length(finish_quiescence_digest) = 71),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  rollback_digest TEXT NOT NULL UNIQUE CHECK(length(rollback_digest) = 71),
  begun_at TEXT NOT NULL CHECK(length(begun_at) = 24),
  finished_at TEXT CHECK(finished_at IS NULL OR length(finished_at) = 24),
  CHECK((epoch_state = 'OPEN' AND finish_lease_version IS NULL AND finish_quiescence_digest IS NULL AND finished_at IS NULL) OR
        (epoch_state = 'FINISHED' AND finish_lease_version IS NOT NULL AND finish_quiescence_digest IS NOT NULL AND finished_at IS NOT NULL))
);
CREATE UNIQUE INDEX ct_rollback_epoch_one_open
ON ct_rollback_epoch(epoch_state)
WHERE epoch_state = 'OPEN';
CREATE TRIGGER ct_rollback_epoch_immutable_begin
BEFORE UPDATE ON ct_rollback_epoch
WHEN NEW.rollback_epoch IS NOT OLD.rollback_epoch
  OR NEW.begin_owner_main_binding_id IS NOT OLD.begin_owner_main_binding_id
  OR NEW.begin_owner_main_binding_epoch IS NOT OLD.begin_owner_main_binding_epoch
  OR NEW.begin_owner_main_identity_digest IS NOT OLD.begin_owner_main_identity_digest
  OR NEW.prior_activation_epoch IS NOT OLD.prior_activation_epoch
  OR NEW.begin_lease_version IS NOT OLD.begin_lease_version
  OR NEW.begin_lease_expires_at IS NOT OLD.begin_lease_expires_at
  OR NEW.freeze_quiescence_digest IS NOT OLD.freeze_quiescence_digest
  OR NEW.request_identity IS NOT OLD.request_identity
  OR NEW.request_digest IS NOT OLD.request_digest
  OR NEW.cas_digest IS NOT OLD.cas_digest
  OR NEW.rollback_digest IS NOT OLD.rollback_digest
  OR NEW.begun_at IS NOT OLD.begun_at
  OR OLD.epoch_state = 'FINISHED'
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_ROLLBACK_EPOCH');
END;
CREATE TRIGGER ct_rollback_epoch_no_delete
BEFORE DELETE ON ct_rollback_epoch
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_ROLLBACK_EPOCH');
END;
CREATE TABLE ct_main_rebind (
  rebind_id TEXT PRIMARY KEY CHECK(length(rebind_id) = 43),
  rollback_epoch INTEGER NOT NULL CHECK(rollback_epoch > 0),
  old_main_binding_id TEXT NOT NULL CHECK(length(old_main_binding_id) = 43),
  old_main_binding_epoch INTEGER NOT NULL CHECK(old_main_binding_epoch > 0),
  old_main_identity_digest TEXT NOT NULL CHECK(length(old_main_identity_digest) = 71),
  new_main_binding_id TEXT NOT NULL CHECK(length(new_main_binding_id) = 43),
  new_main_binding_epoch INTEGER NOT NULL CHECK(new_main_binding_epoch > 0),
  new_main_identity_digest TEXT NOT NULL CHECK(length(new_main_identity_digest) = 71),
  termination_pairing_digest TEXT NOT NULL CHECK(length(termination_pairing_digest) = 71),
  lease_version_before INTEGER NOT NULL CHECK(lease_version_before > 0),
  lease_version_after INTEGER NOT NULL CHECK(lease_version_after > 0),
  lease_expires_at TEXT NOT NULL CHECK(length(lease_expires_at) = 24),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  rebind_digest TEXT NOT NULL UNIQUE CHECK(length(rebind_digest) = 71),
  occurred_at TEXT NOT NULL CHECK(length(occurred_at) = 24),
  CHECK(old_main_binding_id <> new_main_binding_id),
  CHECK(new_main_binding_epoch = old_main_binding_epoch + 1),
  CHECK(lease_version_after = lease_version_before + 1),
  UNIQUE(rollback_epoch, new_main_binding_id)
);
CREATE INDEX ct_main_rebind_epoch
ON ct_main_rebind(rollback_epoch, occurred_at, rebind_id);
CREATE TRIGGER ct_main_rebind_no_update
BEFORE UPDATE ON ct_main_rebind
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_MAIN_REBIND');
END;
CREATE TRIGGER ct_main_rebind_no_delete
BEFORE DELETE ON ct_main_rebind
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_MAIN_REBIND');
END;
CREATE TABLE ct_recovery_disposition (
  disposition_id TEXT PRIMARY KEY CHECK(length(disposition_id) = 43),
  handoff_id TEXT NOT NULL CHECK(length(handoff_id) = 43),
  disposition TEXT NOT NULL CHECK(disposition IN ('NOT_STARTED', 'ROLLED_BACK', 'CANCELLED', 'POISONED', 'SUSPEND_PENDING', 'REDELIVER_WORK', 'SUSPEND_ATTESTATION', 'REDELIVER_ATTESTATION')),
  from_state TEXT NOT NULL CHECK(from_state IN ('PUBLISHED', 'CLAIMED', 'STARTED', 'COMPLETION_ATTESTED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED')),
  to_state TEXT NOT NULL CHECK(to_state IN ('PUBLISHED', 'CANCELLED', 'POISONED', 'WORK_SUSPENDED', 'ATTESTATION_SUSPENDED', 'COMPLETION_ATTESTED')),
  from_generation INTEGER NOT NULL CHECK(from_generation >= 0),
  to_generation INTEGER NOT NULL CHECK(to_generation >= 0),
  mode TEXT NOT NULL CHECK(mode IN ('ON', 'ROLLING_BACK')),
  rollback_epoch INTEGER NOT NULL CHECK(rollback_epoch >= 0),
  lease_version INTEGER NOT NULL CHECK(lease_version >= 0),
  main_binding_id TEXT NOT NULL CHECK(length(main_binding_id) = 43),
  main_binding_epoch INTEGER NOT NULL CHECK(main_binding_epoch > 0),
  main_identity_digest TEXT NOT NULL CHECK(length(main_identity_digest) = 71),
  termination_pairing_digest TEXT CHECK(termination_pairing_digest IS NULL OR length(termination_pairing_digest) = 71),
  rollback_proof_digest TEXT CHECK(rollback_proof_digest IS NULL OR length(rollback_proof_digest) = 71),
  frozen_inventory_digest TEXT CHECK(frozen_inventory_digest IS NULL OR length(frozen_inventory_digest) = 71),
  preserved_attestation_digest TEXT CHECK(preserved_attestation_digest IS NULL OR length(preserved_attestation_digest) = 71),
  attestation_source_generation INTEGER CHECK(attestation_source_generation IS NULL OR attestation_source_generation >= 0),
  closed_delivery_id TEXT CHECK(closed_delivery_id IS NULL OR length(closed_delivery_id) = 43),
  closed_claim_id TEXT CHECK(closed_claim_id IS NULL OR length(closed_claim_id) = 43),
  created_delivery_id TEXT CHECK(created_delivery_id IS NULL OR length(created_delivery_id) = 43),
  request_identity TEXT NOT NULL UNIQUE CHECK(length(request_identity) = 36),
  request_digest TEXT NOT NULL CHECK(length(request_digest) = 71),
  cas_digest TEXT NOT NULL CHECK(length(cas_digest) = 71),
  disposition_digest TEXT NOT NULL UNIQUE CHECK(length(disposition_digest) = 71),
  occurred_at TEXT NOT NULL CHECK(length(occurred_at) = 24),
  CHECK(to_generation = from_generation + (CASE WHEN disposition IN ('NOT_STARTED', 'ROLLED_BACK', 'REDELIVER_WORK', 'REDELIVER_ATTESTATION') THEN 1 ELSE 0 END)),
  CHECK((disposition = 'NOT_STARTED' AND from_state = 'CLAIMED' AND to_state = 'PUBLISHED') OR
        (disposition = 'ROLLED_BACK' AND from_state = 'STARTED' AND to_state = 'PUBLISHED') OR
        (disposition = 'REDELIVER_WORK' AND from_state = 'WORK_SUSPENDED' AND to_state = 'PUBLISHED') OR
        (disposition = 'SUSPEND_PENDING' AND from_state = 'PUBLISHED' AND to_state = 'WORK_SUSPENDED') OR
        (disposition = 'SUSPEND_ATTESTATION' AND from_state = 'COMPLETION_ATTESTED' AND to_state = 'ATTESTATION_SUSPENDED') OR
        (disposition = 'REDELIVER_ATTESTATION' AND from_state = 'ATTESTATION_SUSPENDED' AND to_state = 'COMPLETION_ATTESTED') OR
        (disposition = 'CANCELLED' AND to_state = 'CANCELLED') OR
        (disposition = 'POISONED' AND to_state = 'POISONED')),
  CHECK(disposition NOT IN ('NOT_STARTED', 'ROLLED_BACK', 'SUSPEND_ATTESTATION') OR termination_pairing_digest IS NOT NULL),
  CHECK(disposition NOT IN ('SUSPEND_PENDING', 'REDELIVER_WORK', 'REDELIVER_ATTESTATION') OR termination_pairing_digest IS NULL),
  CHECK((disposition = 'ROLLED_BACK') = (rollback_proof_digest IS NOT NULL)),
  CHECK((disposition IN ('SUSPEND_PENDING', 'SUSPEND_ATTESTATION')) = (frozen_inventory_digest IS NOT NULL)),
  CHECK((disposition IN ('SUSPEND_ATTESTATION', 'REDELIVER_ATTESTATION')) = (preserved_attestation_digest IS NOT NULL)),
  CHECK((preserved_attestation_digest IS NOT NULL) = (attestation_source_generation IS NOT NULL)),
  CHECK((disposition IN ('NOT_STARTED', 'ROLLED_BACK', 'REDELIVER_WORK', 'REDELIVER_ATTESTATION')) = (created_delivery_id IS NOT NULL)),
  CHECK(closed_claim_id IS NULL OR closed_delivery_id IS NOT NULL),
  CHECK(mode = 'ON' OR disposition NOT IN ('NOT_STARTED', 'ROLLED_BACK', 'REDELIVER_WORK', 'REDELIVER_ATTESTATION')),
  CHECK(mode = 'ROLLING_BACK' OR disposition NOT IN ('SUSPEND_PENDING', 'SUSPEND_ATTESTATION')),
  CHECK(mode = 'ON' OR (rollback_epoch > 0 AND lease_version > 0)),
  UNIQUE(handoff_id, from_generation, disposition)
);
CREATE INDEX ct_recovery_disposition_history
ON ct_recovery_disposition(handoff_id, from_generation, occurred_at, disposition_id);
CREATE INDEX ct_recovery_disposition_epoch
ON ct_recovery_disposition(rollback_epoch, disposition, occurred_at);
CREATE TRIGGER ct_recovery_disposition_no_update
BEFORE UPDATE ON ct_recovery_disposition
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_RECOVERY_DISPOSITION');
END;
CREATE TRIGGER ct_recovery_disposition_no_delete
BEFORE DELETE ON ct_recovery_disposition
BEGIN
  SELECT RAISE(ABORT, 'CT_IMMUTABLE_RECOVERY_DISPOSITION');
END;
`
export const MIGRATION_005_CHECKSUM = sha256(Buffer.from(MIGRATION_005_SQL))
const MANIFEST_SQL = `SELECT type, name, tbl_name, sql
FROM sqlite_master
WHERE name IN ('agent','message','message_pending','lock',
               'ct_schema_migration','ct_continuation_state','ct_idempotency')
   OR (name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%')
ORDER BY type, name;`
const normalizeSchemaSql = (sql) => sql.replace(/\s+/g, " ").replace(/\s*([(),])\s*/g, "$1").trim()
const LEGACY_SQL = new Map([
  ["table:agent:agent", "CREATE TABLE agent(name TEXT PRIMARY KEY,role TEXT NOT NULL,worktree TEXT NOT NULL,branch TEXT,state TEXT NOT NULL,task TEXT,note TEXT,pr_url TEXT,updated_at TEXT NOT NULL)"],
  ["table:message:message", "CREATE TABLE message(id INTEGER PRIMARY KEY AUTOINCREMENT,recipient TEXT NOT NULL,sender TEXT NOT NULL,text TEXT NOT NULL,created_at TEXT NOT NULL,consumed_at TEXT)"],
  ["index:message_pending:message", "CREATE INDEX message_pending ON message(recipient,id)WHERE consumed_at IS NULL"],
  ["table:lock:lock", "CREATE TABLE lock(name TEXT PRIMARY KEY,holder TEXT,acquired_at TEXT)"],
])
const schemaObjects = (sql) => {
  const db = new Database(":memory:")
  try {
    db.run(sql)
    return new Map(db.query(`SELECT type,name,tbl_name,sql FROM sqlite_master
      WHERE name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%' ORDER BY type,name`).all().map((row) => [row.name, row]))
  } finally { db.close() }
}
const V1_OBJECTS = schemaObjects(MIGRATION_001_SQL)
const V2_OBJECTS = new Map([...V1_OBJECTS, ...schemaObjects(MIGRATION_002_SQL)])
const V3_OBJECTS = new Map([...V2_OBJECTS, ...schemaObjects(MIGRATION_003_SQL)])
const V4_OBJECTS = new Map([...V3_OBJECTS, ...schemaObjects(MIGRATION_004_SQL)])
const V5_OBJECTS = new Map([...V4_OBJECTS, ...schemaObjects(MIGRATION_005_SQL)])
export const SCHEMA_004_MANIFEST = Object.freeze({
  schema_version: 4,
  objects: Object.freeze([...V4_OBJECTS.values()]
    .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name))
    .map((row) => Object.freeze({ ...row }))),
  migrations: Object.freeze([
    Object.freeze({ version: 1, ddl_checksum: MIGRATION_001_CHECKSUM }),
    Object.freeze({ version: 2, ddl_checksum: MIGRATION_002_CHECKSUM }),
    Object.freeze({ version: 3, ddl_checksum: MIGRATION_003_CHECKSUM }),
    Object.freeze({ version: 4, ddl_checksum: MIGRATION_004_CHECKSUM }),
  ]),
})
// P6-A pins the schema-5 manifest definition only; no bootstrapAdmin target-version
// branch, execution path, or SCHEMA_MANIFESTS lookup entry accepts or reaches schema 5
// yet (P6-B owns the fresh 4->5 execution/version-acceptance work). This export exists
// solely so tests can independently verify the complete 58-object schema-5 manifest and
// the exact v1..v5 checksum chain ahead of that execution work.
export const SCHEMA_005_MANIFEST = Object.freeze({
  schema_version: 5,
  objects: Object.freeze([...V5_OBJECTS.values()]
    .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name))
    .map((row) => Object.freeze({ ...row }))),
  migrations: Object.freeze([
    Object.freeze({ version: 1, ddl_checksum: MIGRATION_001_CHECKSUM }),
    Object.freeze({ version: 2, ddl_checksum: MIGRATION_002_CHECKSUM }),
    Object.freeze({ version: 3, ddl_checksum: MIGRATION_003_CHECKSUM }),
    Object.freeze({ version: 4, ddl_checksum: MIGRATION_004_CHECKSUM }),
    Object.freeze({ version: 5, ddl_checksum: MIGRATION_005_CHECKSUM }),
  ]),
})
const SCHEMA_MANIFESTS = new Map([
  [1, { objects: V1_OBJECTS, migrations: new Map([[1, MIGRATION_001_CHECKSUM]]) }],
  [2, { objects: V2_OBJECTS, migrations: new Map([[1, MIGRATION_001_CHECKSUM], [2, MIGRATION_002_CHECKSUM]]) }],
  [3, { objects: V3_OBJECTS, migrations: new Map([[1, MIGRATION_001_CHECKSUM], [2, MIGRATION_002_CHECKSUM], [3, MIGRATION_003_CHECKSUM]]) }],
  [4, { objects: V4_OBJECTS, migrations: new Map([[1, MIGRATION_001_CHECKSUM], [2, MIGRATION_002_CHECKSUM], [3, MIGRATION_003_CHECKSUM], [4, MIGRATION_004_CHECKSUM]]) }],
  // P6-B wires schema 5 into the runtime dispatch map: inspectSchema/bootstrapAdmin
  // now recognize a real schema-5 database, exactly mirroring the V4_OBJECTS shape.
  [5, { objects: V5_OBJECTS, migrations: new Map([[1, MIGRATION_001_CHECKSUM], [2, MIGRATION_002_CHECKSUM], [3, MIGRATION_003_CHECKSUM], [4, MIGRATION_004_CHECKSUM], [5, MIGRATION_005_CHECKSUM]]) }],
])
const manifestEvidence = (db, schema_version) => ({
  kind: "schema_manifest_evidence_v1", version: 1, schema_version,
  objects: db.query(`SELECT type,name,tbl_name,sql FROM sqlite_master
    WHERE name GLOB 'ct_*' AND name NOT LIKE 'sqlite_%' ORDER BY type,name`).all(),
  migrations: db.query("SELECT version,ddl_checksum FROM ct_schema_migration ORDER BY version").all(),
})
const expectedManifestDigest = (schema_version) => {
  const manifest = SCHEMA_MANIFESTS.get(schema_version)
  return requestDigest({
    kind: "schema_manifest_evidence_v1", version: 1, schema_version,
    objects: [...manifest.objects.values()].sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name)),
    migrations: [...manifest.migrations].map(([version, ddl_checksum]) => ({ version, ddl_checksum })),
  })
}

export const deriveCanonicalMainContext = (cwd) => {
  const common = normalize(realpathSync(git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])))
  const candidates = execFileSync("git", ["worktree", "list", "--porcelain", "-z"], { cwd, encoding: "utf8" })
    .split("\0").filter((line) => line.startsWith("worktree ")).map((line) => line.slice(9))
  const mains = candidates.filter((path) => normalize(realpathSync(git(path, ["rev-parse", "--path-format=absolute", "--absolute-git-dir"]))) === common)
  if (mains.length !== 1) throw new Error("canonical Main is missing or ambiguous")
  const main = normalize(realpathSync(mains[0]))
  const branch = git(main, ["symbolic-ref", "--short", "HEAD"])
  if (!branch) throw new Error("canonical Main branch is detached or ambiguous")
  return { canonical_repo: main, git_common_dir: common, main_worktree: main, branch, trusted_uid: process.geteuid() }
}

export const isSafeAnchorEntry = (entry, expected) =>
  entry.uid === expected.uid && entry.mode === expected.mode && entry.type === expected.type &&
  (!expected.singleLink || entry.nlink === 1)
const entrySafe = (stats, type, mode, uid, singleLink = false) => isSafeAnchorEntry(
  { type: stats.isSymbolicLink() ? "symlink" : stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other", uid: stats.uid, mode: stats.mode & 0o777, nlink: stats.nlink },
  { type, mode, uid, singleLink },
)
const ensureRuntime = (context, create) => {
  const commonStats = lstatSync(context.git_common_dir)
  if (!commonStats.isDirectory() || commonStats.isSymbolicLink()) throw ctError("CT_ANCHOR_MISMATCH")
  const root = join(context.git_common_dir, "control-tower")
  if (!existsSync(root) && create) {
    mkdirSync(root, { mode: 0o700 })
    chmodSync(root, 0o700)
  }
  if (!existsSync(root)) throw ctError("CT_ANCHOR_REQUIRED")
  if (!entrySafe(lstatSync(root), "directory", 0o700, context.trusted_uid)) throw ctError("CT_ANCHOR_MISMATCH")
  return root
}
const configDigest = (context) => sha256(Buffer.from(jcs(context)))
const requestDigest = (value) => sha256(Buffer.from(jcs(value)))
const anchorResponse = (anchor, replayed) => ({ anchor_id: anchor.anchor_id, anchor_epoch: 1, state: "PROVISIONED", replayed })
const readAnchor = (context) => {
  const root = ensureRuntime(context, false)
  const path = join(root, ANCHOR_NAME)
  if (!existsSync(path)) throw ctError("CT_ANCHOR_REQUIRED")
  if (!entrySafe(lstatSync(path), "file", 0o600, context.trusted_uid, true)) throw ctError("CT_ANCHOR_MISMATCH")
  try {
    const bytes = readFileSync(path, "utf8")
    const anchor = JSON.parse(bytes)
    const keys = ["anchor_epoch","anchor_id","anchor_secret","config_digest","context","created_at","kind","provision_request_digest","provision_request_identity","version"]
    if (bytes !== `${jcs(anchor)}\n` || JSON.stringify(Object.keys(anchor).sort()) !== JSON.stringify(keys) ||
        anchor.kind !== "main_authority_anchor_v1" || anchor.version !== 1 || anchor.anchor_epoch !== 1 ||
        anchor.config_digest !== configDigest(context) || jcs(anchor.context) !== jcs(context) ||
        !isBase64url32(anchor.anchor_id) || !isBase64url32(anchor.anchor_secret) ||
        anchor.anchor_id === anchor.anchor_secret || !rfc3339Milliseconds.test(anchor.created_at) ||
        new Date(anchor.created_at).toISOString() !== anchor.created_at) throw new Error("anchor mismatch")
    return { anchor, bytes, root, path }
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    throw ctError("CT_ANCHOR_MISMATCH", error)
  }
}

export const provisionMainAuthorityAnchor = (request, cwd = process.cwd()) => {
  let context
  try { context = deriveCanonicalMainContext(cwd) } catch (error) { throw ctError("CT_ANCHOR_MISMATCH", error) }
  const expected = configDigest(context)
  if (!uuid.test(request?.request_identity ?? "") || request?.expected_config_digest !== expected) throw ctError("CT_ANCHOR_MISMATCH")
  let root
  try { root = ensureRuntime(context, true) } catch (error) { throw error.code ? error : ctError("CT_ANCHOR_MISMATCH", error) }
  const path = join(root, ANCHOR_NAME)
  if (existsSync(path)) {
    const { anchor } = readAnchor(context)
    const digest = requestDigest({ request_identity: request.request_identity, expected_config_digest: expected })
    if (anchor.provision_request_identity !== request.request_identity || anchor.provision_request_digest !== digest) throw ctError("CT_ANCHOR_MISMATCH")
    return anchorResponse(anchor, true)
  }
  const anchor = {
    kind: "main_authority_anchor_v1", version: 1,
    anchor_id: randomBytes(32).toString("base64url"), anchor_secret: randomBytes(32).toString("base64url"), anchor_epoch: 1,
    context, config_digest: expected, provision_request_identity: request.request_identity,
    provision_request_digest: requestDigest({ request_identity: request.request_identity, expected_config_digest: expected }),
    created_at: new Date().toISOString(),
  }
  const temp = join(root, `.${ANCHOR_NAME}.${randomBytes(12).toString("hex")}`)
  let fd
  try {
    fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    fchmodSync(fd, 0o600)
    writeFileSync(fd, `${jcs(anchor)}\n`); fsyncSync(fd); closeSync(fd); fd = undefined
    linkSync(temp, path); unlinkSync(temp)
    readAnchor(context)
    const dir = openSync(root, constants.O_RDONLY | constants.O_DIRECTORY); fsyncSync(dir); closeSync(dir)
    return anchorResponse(anchor, false)
  } catch (error) {
    if (fd !== undefined) closeSync(fd)
    rmSync(temp, { force: true })
    if (error?.code === "EEXIST" || existsSync(path)) throw ctError("CT_ANCHOR_MISMATCH", error)
    throw error
  }
}

const inspectSchema = (db) => {
  const rows = db.query(MANIFEST_SQL).all()
  const legacy = rows.filter(({ name }) => !name.startsWith("ct_"))
  if (legacy.length !== 4 || legacy.some((row) =>
    LEGACY_SQL.get(`${row.type}:${row.name}:${row.tbl_name}`) !== normalizeSchemaSql(row.sql),
  )) throw ctError("CT_SCHEMA_INVALID")
  const continuation = rows.filter(({ name }) => name.startsWith("ct_"))
  if (continuation.length === 0) return 0
  const migrationTable = continuation.find(({ type, name, tbl_name }) =>
    type === "table" && name === "ct_schema_migration" && tbl_name === name)
  if (!migrationTable) throw ctError("CT_SCHEMA_INVALID")
  const migrations = db.query("SELECT version,ddl_checksum FROM ct_schema_migration ORDER BY version").all()
  if (migrations.some(({ version, ddl_checksum }) =>
    version === 1 && ddl_checksum === SUPERSEDED_MIGRATION_001_CHECKSUM)) {
    throw ctError("CT_SCHEMA_INVALID", new Error("SUPERSEDED_MIGRATION_001"))
  }
  const version = migrations.at(-1)?.version
  const manifest = SCHEMA_MANIFESTS.get(version)
  if (!manifest || migrations.length !== manifest.migrations.size || migrations.some(({ version: migrationVersion, ddl_checksum }) =>
    manifest.migrations.get(migrationVersion) !== ddl_checksum)) throw ctError("CT_SCHEMA_INVALID")
  if (continuation.length !== manifest.objects.size || continuation.some((row) => {
    const expected = manifest.objects.get(row.name)
    return !expected || row.type !== expected.type || row.tbl_name !== expected.tbl_name || row.sql !== expected.sql
  })) throw ctError("CT_SCHEMA_INVALID")
  return version
}
const continuationState = (db, authority, expectedVersion) => {
  const rows = db.query("SELECT * FROM ct_continuation_state").all()
  if (rows.length !== 1 || rows[0].id !== 1 || rows[0].schema_version !== expectedVersion) throw ctError("CT_SCHEMA_INVALID")
  const state = rows[0]
  if (state.anchor_id !== authority.anchor.anchor_id ||
      state.anchor_secret_digest !== sha256(Buffer.from(authority.anchor.anchor_secret, "base64url")) ||
      state.config_digest !== authority.anchor.config_digest) throw ctError("CT_ANCHOR_MISMATCH")
  if (state.anchor_epoch !== 1 || !["OFF", "ON", "ROLLING_BACK"].includes(state.mode)) throw ctError("CT_FENCE_MISMATCH")
  return state
}
const validateContinuationState = (db, authority, version = 1) => {
  const state = continuationState(db, authority, version)
  if (state.mode !== "OFF") throw ctError("CT_FENCE_MISMATCH")
  return state
}
const busy = (error) => error?.code === "SQLITE_BUSY" || /locked|busy/i.test(error?.message ?? "")

export const bootstrapAdmin = (request, cwd = process.cwd()) => {
  let context, authority
  try { context = deriveCanonicalMainContext(cwd); authority = readAnchor(context) }
  catch (error) { throw error.code ? error : ctError("CT_ANCHOR_MISMATCH", error) }
  if (!uuid.test(request?.request_identity ?? "") || ![1, 2, 3, 4, 5].includes(request?.target_schema_version) ||
      (![4, 5].includes(request.target_schema_version) && request.expected_mode !== "OFF") ||
      ([4, 5].includes(request.target_schema_version) && (Object.getPrototypeOf(request) !== Object.prototype ||
        JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(["expected_anchor_id", "expected_mode", "expected_schema_version", "request_identity", "target_schema_version"])))) throw ctError("CT_SCHEMA_INVALID")
  const dbPath = join(authority.root, "tower.db")
  if (!existsSync(dbPath)) throw ctError("CT_SCHEMA_INVALID")
  const db = new Database(dbPath); db.run("PRAGMA busy_timeout = 250")
  const target = request.target_schema_version
  const scope = target === 1 ? "admin-bootstrap" : `schema:${target - 1}->${target}`
  const requestValue = { request_identity: request.request_identity, expected_anchor_id: request.expected_anchor_id, expected_schema_version: request.expected_schema_version, target_schema_version: target, expected_mode: [4, 5].includes(target) ? request.expected_mode : "OFF" }
  const request_digest = requestDigest(requestValue)
  const casValue = { expected_anchor_id: request.expected_anchor_id, expected_schema_version: request.expected_schema_version, target_schema_version: target, expected_mode: "OFF", derived_anchor_epoch: 1, derived_config_digest: authority.anchor.config_digest }
  if (target >= 2 && target < 4) Object.assign(casValue, { expected_rollback_epoch: 0, expected_lease_version: 0, expected_lease_status: "NONE" })
  if (target === 3) Object.assign(casValue, { expected_main_binding_state: "ABSENT", expected_activation_epoch: 0 })
  let cas_digest = requestDigest(casValue)
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (target === 4) {
        if (![3, 4].includes(version)) throw ctError("CT_SCHEMA_INVALID")
        const state = continuationState(db, authority, version)
        const lease = validateLease(db)
        if (version === 4) validateSchema4Persistence(db, authority)
        if (state.mode !== "OFF" || lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_FENCE_MISMATCH")
        const persisted = validateSchema3Persistence(db, authority)
        const main = coherentMain(persisted.rows)
        const activeClaimants = db.query("SELECT COUNT(*) AS count FROM ct_claimant_binding WHERE binding_status='ACTIVE'").get().count
        if (version === 3 && persisted.activations.length !== 0) throw ctError("CT_SCHEMA_INVALID")
        const currentHistoricalCas = {
          expected_anchor_id: authority.anchor.anchor_id, expected_schema_version: 3, target_schema_version: 4,
          expected_mode: "OFF", derived_anchor_epoch: 1, derived_config_digest: authority.anchor.config_digest,
          observed_rollback_epoch: persisted.lease.rollback_epoch, observed_lease_version: persisted.lease.lease_version,
          observed_lease_status: "NONE", observed_active_main_binding_id: main?.main_binding_id ?? null,
          observed_active_main_binding_epoch: main?.binding_epoch ?? 0, observed_activation_epoch: 0,
          active_claimant_bindings: activeClaimants, delivery_plane: "ABSENT_SCHEMA_3",
        }
        const committed = db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'").get()
        if (version === 4) {
          const envelope = validateSchema4BootstrapEnvelope(db, committed, authority)
          const historicalCas = envelope.evidence.cas_input
          cas_digest = requestDigest({ ...historicalCas, expected_anchor_id: request.expected_anchor_id, expected_schema_version: request.expected_schema_version, expected_mode: request.expected_mode })
          if (request.expected_schema_version !== 3 || request.expected_mode !== "OFF") throw ctError("CT_FENCE_MISMATCH")
          if (committed.request_identity !== request.request_identity || committed.request_digest !== request_digest || committed.cas_digest !== cas_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
          return { ...envelope.public_response, replayed: true }
        }
        const historicalCas = currentHistoricalCas
        cas_digest = requestDigest({ ...historicalCas, expected_anchor_id: request.expected_anchor_id, expected_schema_version: request.expected_schema_version, expected_mode: request.expected_mode })
        if (committed) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        if (activeClaimants !== 0) throw ctError("CT_FENCE_MISMATCH")
        if (request.expected_anchor_id !== authority.anchor.anchor_id || request.expected_schema_version !== 3 || request.expected_mode !== "OFF") throw ctError("CT_FENCE_MISMATCH")
        const schema3ManifestDigest = requestDigest(manifestEvidence(db, 3))
        db.run(MIGRATION_004_SQL)
        if (db.run("UPDATE ct_continuation_state SET schema_version=4 WHERE id=1 AND schema_version=3").changes !== 1) throw ctError("CT_SCHEMA_INVALID")
        const applied = now()
        db.run("INSERT INTO ct_schema_migration VALUES (4,?,?)", [MIGRATION_004_CHECKSUM, applied])
        if (readFileSync(authority.path, "utf8") !== authority.bytes) throw ctError("CT_ANCHOR_MISMATCH")
        if (inspectSchema(db) !== 4) throw ctError("CT_SCHEMA_INVALID")
        const successor = validateSchema4Persistence(db, authority)
        if (Object.values(successor).some((count) => count !== 0)) throw ctError("CT_SCHEMA_INVALID")
        const publicResponse = { anchor_id: authority.anchor.anchor_id, schema_version: 4, mode: "OFF", replayed: false }
        const envelope = { kind: "bootstrap_schema4_response_v1", version: 1, public_response: publicResponse, evidence: {
          request: requestValue, request_digest, cas_input: historicalCas, cas_digest: requestDigest(historicalCas),
          migration_004_checksum: MIGRATION_004_CHECKSUM, schema_3_manifest_digest: schema3ManifestDigest,
          schema_4_manifest_digest: requestDigest(manifestEvidence(db, 4)),
        } }
        db.run("INSERT INTO ct_idempotency VALUES ('bootstrapAdmin','schema:3->4',?,?,?,?,?)", [request.request_identity, request_digest, cas_digest, jcs(envelope), applied])
        validateSchema4BootstrapEnvelope(db, db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'").get(), authority, historicalCas)
        return publicResponse
      }
      // P6-B fresh/retry 4->5 lane. Unlike 3->4, this lane never requires an
      // empty delivery plane: a schema-4 database with real handoff,
      // transition, delivery, claim, and budget history migrates in place.
      // It still requires mode OFF, lease NONE, and zero ACTIVE claimant
      // bindings, and never down-migrates a real schema-5 database.
      if (target === 5) {
        if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
        const state = continuationState(db, authority, version)
        const lease = validateLease(db)
        validateSchema4CommitEvidence(db, authority)
        const persisted = validateSchema3Persistence(db, authority)
        validateSchema4Persistence(db, authority)
        if (version === 5) validateSchema5CommitEvidence(db, authority)
        if (state.mode !== "OFF" || lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_FENCE_MISMATCH")
        const main = coherentMain(persisted.rows)
        const activeClaimants = db.query("SELECT COUNT(*) AS count FROM ct_claimant_binding WHERE binding_status='ACTIVE'").get().count
        const currentHistoricalCas = {
          expected_anchor_id: authority.anchor.anchor_id, expected_schema_version: 4, target_schema_version: 5,
          expected_mode: "OFF", derived_anchor_epoch: 1, derived_config_digest: authority.anchor.config_digest,
          observed_rollback_epoch: persisted.lease.rollback_epoch, observed_lease_version: persisted.lease.lease_version,
          observed_lease_status: "NONE", observed_active_main_binding_id: main?.main_binding_id ?? null,
          observed_active_main_binding_epoch: main?.binding_epoch ?? 0, observed_activation_epoch: persisted.activations.length,
          active_claimant_bindings: activeClaimants, delivery_plane: "SCHEMA_4_VALIDATED", recovery_plane: "ABSENT_SCHEMA_4",
        }
        const committed5 = db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:4->5'").get()
        if (version === 5) {
          const envelope = validateSchema5BootstrapEnvelope(db, committed5, authority)
          const historicalCas = envelope.evidence.cas_input
          cas_digest = requestDigest({ ...historicalCas, expected_anchor_id: request.expected_anchor_id, expected_schema_version: request.expected_schema_version, expected_mode: request.expected_mode })
          if (request.expected_schema_version !== 4 || request.expected_mode !== "OFF") throw ctError("CT_FENCE_MISMATCH")
          if (committed5.request_identity !== request.request_identity || committed5.request_digest !== request_digest || committed5.cas_digest !== cas_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
          return { ...envelope.public_response, replayed: true }
        }
        const historicalCas = currentHistoricalCas
        cas_digest = requestDigest({ ...historicalCas, expected_anchor_id: request.expected_anchor_id, expected_schema_version: request.expected_schema_version, expected_mode: request.expected_mode })
        if (committed5) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        if (activeClaimants !== 0) throw ctError("CT_FENCE_MISMATCH")
        if (request.expected_anchor_id !== authority.anchor.anchor_id || request.expected_schema_version !== 4 || request.expected_mode !== "OFF") throw ctError("CT_FENCE_MISMATCH")
        const schema4ManifestDigest = requestDigest(manifestEvidence(db, 4))
        db.run(MIGRATION_005_SQL)
        if (db.run("UPDATE ct_continuation_state SET schema_version=5 WHERE id=1 AND schema_version=4").changes !== 1) throw ctError("CT_SCHEMA_INVALID")
        const applied5 = now()
        db.run("INSERT INTO ct_schema_migration VALUES (5,?,?)", [MIGRATION_005_CHECKSUM, applied5])
        if (readFileSync(authority.path, "utf8") !== authority.bytes) throw ctError("CT_ANCHOR_MISMATCH")
        if (inspectSchema(db) !== 5) throw ctError("CT_SCHEMA_INVALID")
        for (const table of ["ct_termination_receipt", "ct_quiescence_snapshot", "ct_rollback_epoch", "ct_main_rebind", "ct_recovery_disposition"]) {
          if (db.query(`SELECT COUNT(*) AS count FROM ${table}`).get().count !== 0) throw ctError("CT_SCHEMA_INVALID")
        }
        const publicResponse5 = { anchor_id: authority.anchor.anchor_id, schema_version: 5, mode: "OFF", replayed: false }
        const envelope5 = { kind: "bootstrap_schema5_response_v1", version: 1, public_response: publicResponse5, evidence: {
          request: requestValue, request_digest, cas_input: historicalCas, cas_digest: requestDigest(historicalCas),
          migration_005_checksum: MIGRATION_005_CHECKSUM, schema_4_manifest_digest: schema4ManifestDigest,
          schema_5_manifest_digest: requestDigest(manifestEvidence(db, 5)),
        } }
        db.run("INSERT INTO ct_idempotency VALUES ('bootstrapAdmin','schema:4->5',?,?,?,?,?)", [request.request_identity, request_digest, cas_digest, jcs(envelope5), applied5])
        validateSchema5BootstrapEnvelope(db, db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:4->5'").get(), authority, historicalCas)
        return publicResponse5
      }
      if (version === target) {
        const row = db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key=?").get(scope)
        if (!row || row.request_identity !== request.request_identity || row.request_digest !== request_digest || row.cas_digest !== cas_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        validateContinuationState(db, authority, target)
        if (target >= 2) validateLease(db)
        if (target === 3) validateSchema3Persistence(db, authority)
        return { ...JSON.parse(row.response_json), replayed: true }
      }
      if (target === 1) {
        if (version !== 0) throw ctError("CT_SCHEMA_INVALID")
        if (request.expected_anchor_id !== authority.anchor.anchor_id || request.expected_schema_version !== 0) throw ctError("CT_FENCE_MISMATCH")
        const response = { anchor_id: authority.anchor.anchor_id, schema_version: 1, mode: "OFF", replayed: false }
        db.run(MIGRATION_001_SQL)
        const applied = now()
        db.run("INSERT INTO ct_schema_migration VALUES (1,?,?)", [MIGRATION_001_CHECKSUM, applied])
        db.run("INSERT INTO ct_continuation_state VALUES (1,?,?,?,?,1,'OFF')", [authority.anchor.anchor_id, 1, sha256(Buffer.from(authority.anchor.anchor_secret, "base64url")), authority.anchor.config_digest])
        db.run("INSERT INTO ct_idempotency VALUES ('bootstrapAdmin','admin-bootstrap',?,?,?,?,?)", [request.request_identity, request_digest, cas_digest, jcs(response), applied])
        assertAdminCommit(db, authority, 1)
        return response
      }
      if (version !== target - 1) throw ctError("CT_SCHEMA_INVALID")
      if (target === 3) {
        validateContinuationState(db, authority, version)
        const lease = validateLease(db)
        if (lease.rollback_epoch !== 0 || lease.lease_status !== "NONE" || lease.lease_version !== 0) throw ctError("CT_FENCE_MISMATCH")
      }
      if (db.query("SELECT 1 FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key=?").get(scope)) throw ctError("CT_IDEMPOTENCY_CONFLICT")
      if (target !== 3) validateContinuationState(db, authority, version)
      if (request.expected_anchor_id !== authority.anchor.anchor_id || request.expected_schema_version !== version) throw ctError("CT_FENCE_MISMATCH")
      if (target === 2) {
        db.run(MIGRATION_002_SQL)
        db.run("INSERT INTO ct_rollback_lease VALUES (1,0,'NONE',0,NULL,NULL)")
      } else db.run(MIGRATION_003_SQL)
      if (db.run("UPDATE ct_continuation_state SET schema_version=? WHERE id=1 AND schema_version=?", [target, version]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      const applied = now()
      db.run("INSERT INTO ct_schema_migration VALUES (?,?,?)", [target, target === 2 ? MIGRATION_002_CHECKSUM : MIGRATION_003_CHECKSUM, applied])
      const response = { anchor_id: authority.anchor.anchor_id, schema_version: target, mode: "OFF", replayed: false }
      db.run("INSERT INTO ct_idempotency VALUES ('bootstrapAdmin',?,?,?,?,?,?)", [scope, request.request_identity, request_digest, cas_digest, jcs(response), applied])
      assertAdminCommit(db, authority, target); validateLease(db)
      if (target === 3) {
        const persisted = validateSchema3Persistence(db, authority)
        if (persisted.rows.length !== 0) throw ctError("CT_SCHEMA_INVALID")
      }
      return response
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  } finally { db.close() }
}

const assertAdminCommit = (db, authority, version) => {
  if (readFileSync(authority.path, "utf8") !== authority.bytes) throw ctError("CT_ANCHOR_MISMATCH")
  if (inspectSchema(db) !== version) throw ctError("CT_SCHEMA_INVALID")
  validateContinuationState(db, authority, version)
}
const validateLease = (db) => {
  const rows = db.query("SELECT * FROM ct_rollback_lease").all()
  if (rows.length !== 1) throw ctError("CT_SCHEMA_INVALID")
  const lease = rows[0]
  if (!Number.isSafeInteger(lease.rollback_epoch) || lease.rollback_epoch < 0 || !Number.isSafeInteger(lease.lease_version) || lease.lease_version < 0 ||
      !["NONE", "ACTIVE", "EXPIRED"].includes(lease.lease_status) ||
      (lease.lease_status === "NONE" ? lease.owner_main_binding_id !== null || lease.lease_expires_at !== null : typeof lease.owner_main_binding_id !== "string" || !rfc3339Milliseconds.test(lease.lease_expires_at ?? ""))) throw ctError("CT_SCHEMA_INVALID")
  return lease
}

const opaque = (value, limit = 256) => typeof value === "string" && Buffer.byteLength(value) >= 1 && Buffer.byteLength(value) <= limit && !value.includes("\0")
const absolutePath = (value) => typeof value === "string" && value.length > 0 && !value.includes("\0") && isAbsolute(value) && normalize(value) === value
const safeEpoch = (value) => Number.isSafeInteger(value) && value >= 0
const forbiddenCtxKeys = new Set(["ctx", "actor", "role", "session", "effective_uid", "canonical_repo", "git_common_dir", "worktree", "branch", "host_process_instance", "plugin_instance", "root_session_id", "mcp_process_instance", "pid_start_marker", "binding_epoch"])
const registrationKeys = ["expected_binding_epoch", "expected_binding_state", "request_identity"]
const bindingFields = ["effective_uid", "canonical_repo", "git_common_dir", "worktree", "branch", "host_process_instance", "plugin_instance", "root_session_id", "mcp_process_instance", "pid_start_marker", "binding_epoch"]
const sameRootFields = bindingFields.filter((field) => !["mcp_process_instance", "pid_start_marker", "binding_epoch"].includes(field))
const makeId = () => randomBytes(32).toString("base64url")
const tuple = (ctx, epoch = ctx.binding_epoch) => Object.fromEntries(bindingFields.map((field) => [field, field === "binding_epoch" ? epoch : ctx[field]]))
const scope = (ctx) => ({ effective_uid: ctx.effective_uid, canonical_repo: ctx.canonical_repo, git_common_dir: ctx.git_common_dir, plugin_instance: ctx.plugin_instance })
const equalFields = (left, right, fields) => fields.every((field) => left[field] === right[field])
const freezeCtx = (value) => Object.freeze(Object.assign(Object.create(null), value))

const continuationAuthority = (cwd) => {
  try {
    const canonical = deriveCanonicalMainContext(cwd)
    return { authority: readAnchor(canonical), cwd }
  } catch (error) { throw error.code?.startsWith("CT_") ? error : ctError("CT_ANCHOR_MISMATCH", error) }
}
const continuationHandle = (cwd, payloadInvalid = false) => {
  const resolved = continuationAuthority(cwd)
  const dbPath = join(resolved.authority.root, "tower.db")
  if (!existsSync(dbPath)) throw ctError("CT_SCHEMA_INVALID")
  const db = new Database(dbPath); db.run("PRAGMA busy_timeout = 250")
  return { ...resolved, db, payloadInvalid }
}
const gateContinuation = ({ db, authority }) => {
  const version = inspectSchema(db)
  if (![2, 3, 4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
  const state = continuationState(db, authority, version)
  const lease = validateLease(db)
  if (version === 4) { validateSchema4CommitEvidence(db, authority); validateSchema3Persistence(db, authority); validateSchema4Persistence(db, authority) }
  if (version === 5) { validateSchema4CommitEvidence(db, authority); validateSchema5CommitEvidence(db, authority); validateSchema3Persistence(db, authority); validateSchema4Persistence(db, authority) }
  if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
  if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
  if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
  return lease
}
const assertRegisterRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(registrationKeys) || !uuid.test(request.request_identity ?? "") ||
      !safeEpoch(request.expected_binding_epoch) || !["ABSENT", "ACTIVE"].includes(request.expected_binding_state)) throw ctError("CT_PAYLOAD_INVALID")
}
const createCtxFactory = ({ trustedMetadata, processIdentity, cwd, authority }, stableProcess) => () => {
  let host, processSnapshot, derived
  try {
    host = trustedMetadata.snapshot(); processSnapshot = processIdentity.snapshot()
    const git_common_dir = normalize(realpathSync(git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])))
    const worktree = normalize(realpathSync(git(cwd, ["rev-parse", "--show-toplevel"])))
    const branch = git(cwd, ["symbolic-ref", "--short", "HEAD"])
    derived = { effective_uid: process.geteuid(), canonical_repo: authority.anchor.context.canonical_repo, git_common_dir, worktree, branch }
    if (git_common_dir !== authority.anchor.context.git_common_dir) throw new Error("wrong repository")
  } catch (error) { throw ctError("CT_SESSION_ISOLATION_UNPROVEN", error) }
  const copiedProcess = { mcp_process_instance: processSnapshot?.mcp_process_instance, pid_start_marker: processSnapshot?.pid_start_marker }
  const copiedHost = { host_process_instance: host?.host_process_instance, plugin_instance: host?.plugin_instance, root_session_id: host?.root_session_id, binding_epoch: host?.binding_epoch }
  if (![copiedHost.host_process_instance, copiedHost.plugin_instance, copiedHost.root_session_id].every((value) => opaque(value)) || !safeEpoch(copiedHost.binding_epoch) ||
      !isBase64url32(copiedProcess.mcp_process_instance) || !opaque(copiedProcess.pid_start_marker, 128) || !Number.isSafeInteger(derived.effective_uid) || derived.effective_uid < 0 ||
      ![derived.canonical_repo, derived.git_common_dir, derived.worktree].every(absolutePath) || !opaque(derived.branch, 255)) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  if (stableProcess.value && !equalFields(stableProcess.value, copiedProcess, ["mcp_process_instance", "pid_start_marker"])) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  stableProcess.value ??= copiedProcess
  return freezeCtx({ ...derived, ...copiedHost, ...copiedProcess })
}

const mainIdentityFields = ["host_process_instance", "plugin_instance", "root_session_id", "mcp_process_instance", "pid_start_marker"]
const mainBindingValue = (authority, identity, binding_epoch) => ({
  kind: "main_binding_v1", version: 1,
  anchor_id: authority.anchor.anchor_id, anchor_epoch: 1, config_digest: authority.anchor.config_digest,
  authority_context: authority.anchor.context,
  identity: { ...Object.fromEntries(mainIdentityFields.map((field) => [field, identity[field]])), binding_epoch, main_session_id: identity.root_session_id },
})
const mainCasValue = (authority, expectedEpoch, targetDigest, lease, incumbent, schemaVersion = 3) => ({
  expected_anchor_id: authority.anchor.anchor_id, expected_binding_epoch: expectedEpoch, target_binding_epoch: expectedEpoch + 1,
  target_identity_digest: targetDigest, schema_version: schemaVersion, mode: "OFF",
  observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE",
  observed_active_main_binding_id: incumbent?.main_binding_id ?? null,
  observed_active_main_binding_epoch: incumbent?.binding_epoch ?? 0,
})
const assertMainBinding = (row, authority) => {
  if (!row || !isBase64url32(row.main_binding_id) || row.anchor_id !== authority.anchor.anchor_id || row.anchor_epoch !== 1 || row.config_digest !== authority.anchor.config_digest ||
      !mainIdentityFields.slice(0, 3).every((field) => opaque(row[field])) || !isBase64url32(row.mcp_process_instance) || !opaque(row.pid_start_marker, 128) ||
      !safeEpoch(row.binding_epoch) || row.binding_epoch === 0 || row.main_session_id !== row.root_session_id || !["ACTIVE", "RETIRED"].includes(row.binding_status) ||
      !/^sha256:[0-9a-f]{64}$/.test(row.identity_digest) || !rfc3339Milliseconds.test(row.created_at) ||
      (row.binding_status === "ACTIVE" ? row.ended_at !== null : !rfc3339Milliseconds.test(row.ended_at ?? ""))) throw ctError("CT_SCHEMA_INVALID")
  if (row.identity_digest !== requestDigest(mainBindingValue(authority, row, row.binding_epoch))) throw ctError("CT_SCHEMA_INVALID")
  return row
}
const readMainRows = (db, authority) => db.query("SELECT * FROM ct_main_binding ORDER BY binding_epoch").all().map((row) => assertMainBinding(row, authority))
// P6-E: ct_main_rebind is immutable and self-verifying via rebind_digest,
// mirroring assertActivation's pattern for ct_activation.
const mainRebindValue = (row) => ({
  kind: "main_rebind_v1", version: 1, rollback_epoch: row.rollback_epoch,
  old_main_binding_id: row.old_main_binding_id, old_main_binding_epoch: row.old_main_binding_epoch, old_main_identity_digest: row.old_main_identity_digest,
  new_main_binding_id: row.new_main_binding_id, new_main_binding_epoch: row.new_main_binding_epoch, new_main_identity_digest: row.new_main_identity_digest,
  termination_pairing_digest: row.termination_pairing_digest, lease_version_before: row.lease_version_before, lease_version_after: row.lease_version_after,
  lease_expires_at: row.lease_expires_at, request_identity: row.request_identity, request_digest: row.request_digest, cas_digest: row.cas_digest, occurred_at: row.occurred_at,
})
const assertMainRebind = (row) => {
  if (!row || !isBase64url32(row.rebind_id) || !safeEpoch(row.rollback_epoch) || row.rollback_epoch === 0 ||
      !isBase64url32(row.old_main_binding_id) || !safeEpoch(row.old_main_binding_epoch) || row.old_main_binding_epoch === 0 || !sha256Digest.test(row.old_main_identity_digest ?? "") ||
      !isBase64url32(row.new_main_binding_id) || row.new_main_binding_epoch !== row.old_main_binding_epoch + 1 || !sha256Digest.test(row.new_main_identity_digest ?? "") ||
      !sha256Digest.test(row.termination_pairing_digest ?? "") || !safeEpoch(row.lease_version_before) || row.lease_version_before === 0 || row.lease_version_after !== row.lease_version_before + 1 ||
      !rfc3339Milliseconds.test(row.lease_expires_at ?? "") || !uuid.test(row.request_identity ?? "") ||
      ![row.request_digest, row.cas_digest, row.rebind_digest].every((value) => sha256Digest.test(value ?? "")) || !rfc3339Milliseconds.test(row.occurred_at ?? ""))
    throw ctError("CT_SCHEMA_INVALID")
  if (row.rebind_digest !== requestDigest(mainRebindValue(row))) throw ctError("CT_SCHEMA_INVALID")
  return row
}
const expectedMainCommit = (authority, rows, target, requestIdentity, lease, schemaVersion = 3) => {
  const expectedEpoch = target.binding_epoch - 1
  const predecessor = expectedEpoch === 0 ? null : rows.find(({ binding_epoch }) => binding_epoch === expectedEpoch)
  if (expectedEpoch > 0 && !predecessor) throw ctError("CT_SCHEMA_INVALID")
  const request = { request_identity: requestIdentity, expected_anchor_id: authority.anchor.anchor_id, expected_binding_epoch: expectedEpoch }
  const response = { main_binding_id: target.main_binding_id, binding_epoch: target.binding_epoch, state: "ACTIVE", replayed: false }
  return {
    scope_key: `main:${authority.anchor.anchor_id}:epoch:${target.binding_epoch}`,
    request_digest: requestDigest(request),
    cas_digest: requestDigest(mainCasValue(authority, expectedEpoch, target.identity_digest, lease, predecessor, schemaVersion)),
    response_json: jcs(response), response,
  }
}
const mainCommitSchemaBoundary = (db, authority, rows) => {
  if (!db.query("SELECT 1 FROM ct_schema_migration WHERE version=4").get()) return null
  const committed = db.query("SELECT response_json FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'").get()
  let envelope
  try { envelope = JSON.parse(committed?.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
  const casInput = envelope?.evidence?.cas_input
  const epoch = casInput?.observed_active_main_binding_epoch, id = casInput?.observed_active_main_binding_id
  const historicalMain = epoch === 0 ? null : rows.find(({ binding_epoch, main_binding_id }) => binding_epoch === epoch && main_binding_id === id)
  if (!safeEpoch(epoch) || casInput.expected_anchor_id !== authority.anchor.anchor_id ||
      (epoch === 0 ? id !== null : !historicalMain)) throw ctError("CT_SCHEMA_INVALID")
  return epoch
}
// P6-B mirrors mainCommitSchemaBoundary for the 4->5 migration boundary: a
// Main binding created after this boundary embeds schema_version:5 in its
// CAS (mainCasValue's schemaVersion argument), not 4, so historical CAS
// reconstruction must know which of the two post-4 boundaries a given row
// falls after.
const mainCommitSchema5Boundary = (db, authority, rows) => {
  if (!db.query("SELECT 1 FROM ct_schema_migration WHERE version=5").get()) return null
  const committed = db.query("SELECT response_json FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:4->5'").get()
  let envelope
  try { envelope = JSON.parse(committed?.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
  const casInput = envelope?.evidence?.cas_input
  const epoch = casInput?.observed_active_main_binding_epoch, id = casInput?.observed_active_main_binding_id
  const historicalMain = epoch === 0 ? null : rows.find(({ binding_epoch, main_binding_id }) => binding_epoch === epoch && main_binding_id === id)
  if (!safeEpoch(epoch) || casInput.expected_anchor_id !== authority.anchor.anchor_id ||
      (epoch === 0 ? id !== null : !historicalMain)) throw ctError("CT_SCHEMA_INVALID")
  return epoch
}
const mainCommitSchemaVersion = (boundary4, target, boundary5 = null) =>
  boundary4 === null || target.binding_epoch <= boundary4 ? 3 : (boundary5 === null || target.binding_epoch <= boundary5 ? 4 : 5)
const sha256Digest = /^sha256:[0-9a-f]{64}$/
const activationTransition = (authority, main, evidence, lease) => ({
  kind: "activation_transition_v1", version: 1, anchor_id: authority.anchor.anchor_id,
  config_digest: authority.anchor.config_digest, expected_mode: "OFF", expected_binding_epoch: main.binding_epoch,
  main_binding_id: main.main_binding_id, main_identity_digest: main.identity_digest, evidence_digest: evidence,
  observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version,
})
const activationCas = (transitionDigest, main, evidence, lease, prior, target, preconditionDigest) => ({
  transition_digest: transitionDigest, expected_mode: "OFF", expected_binding_epoch: main.binding_epoch,
  main_binding_id: main.main_binding_id, main_identity_digest: main.identity_digest, evidence_digest: evidence,
  observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version,
  observed_lease_status: "NONE", prior_activation_epoch: prior, target_activation_epoch: target,
  precondition_digest: preconditionDigest,
})
const activationValue = (row) => ({
  kind: "activation_v1", version: 1, activation_epoch: row.activation_epoch,
  main_binding_id: row.main_binding_id, main_binding_epoch: row.main_binding_epoch,
  evidence_digest: row.evidence_digest, precondition_digest: row.precondition_digest,
  request_identity: row.request_identity, request_digest: row.request_digest, cas_digest: row.cas_digest,
  activated_at: row.activated_at,
})
const assertActivation = (row) => {
  if (!row || !safeEpoch(row.activation_epoch) || row.activation_epoch === 0 || !isBase64url32(row.main_binding_id) ||
      !safeEpoch(row.main_binding_epoch) || row.main_binding_epoch === 0 || ![row.evidence_digest, row.precondition_digest, row.request_digest, row.cas_digest, row.activation_digest].every((value) => sha256Digest.test(value ?? "")) ||
      !uuid.test(row.request_identity ?? "") || !rfc3339Milliseconds.test(row.activated_at ?? "") ||
      row.activation_digest !== requestDigest(activationValue(row))) throw ctError("CT_SCHEMA_INVALID")
  return row
}
function validateSchema3Persistence(db, authority) {
  const rows = readMainRows(db, authority), lease = validateLease(db)
  const currentLeaseIsHistoricalSeed = lease.lease_status === "NONE" && lease.rollback_epoch === 0 && lease.lease_version === 0
  const schemaBoundary = mainCommitSchemaBoundary(db, authority, rows)
  const schema5Boundary = mainCommitSchema5Boundary(db, authority, rows)
  // P6-E: a ct_main_binding row can now originate from bootstrapMain OR from
  // an immutable rebindMain rebind (disaster recovery, no bootstrapMain row
  // at all). Every row must be accounted for by exactly one provenance.
  // ct_main_rebind exists only at schema 5+; schema 3/4 databases never
  // reach this table at all (P6-E rebind cannot exist before Migration 005).
  const hasRebindTable = db.query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ct_main_rebind'").get() !== null
  const rebinds = hasRebindTable ? db.query("SELECT * FROM ct_main_rebind ORDER BY new_main_binding_epoch").all().map(assertMainRebind) : []
  const rebindTargetIds = new Set(rebinds.map((row) => row.new_main_binding_id))
  const mainCommits = db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapMain' ORDER BY scope_key").all()
  if (mainCommits.length + rebinds.length !== rows.length) throw ctError("CT_SCHEMA_INVALID")
  for (const row of mainCommits) {
    if (!uuid.test(row.request_identity ?? "") || !rfc3339Milliseconds.test(row.committed_at ?? "")) throw ctError("CT_SCHEMA_INVALID")
    let response
    try { response = JSON.parse(row.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
    const target = rows.find(({ main_binding_id }) => main_binding_id === response.main_binding_id)
    if (!target || rebindTargetIds.has(target.main_binding_id)) throw ctError("CT_SCHEMA_INVALID")
    const expected = expectedMainCommit(authority, rows, target, row.request_identity, lease, mainCommitSchemaVersion(schemaBoundary, target, schema5Boundary))
    const casValid = currentLeaseIsHistoricalSeed ? row.cas_digest === expected.cas_digest : sha256Digest.test(row.cas_digest ?? "")
    if (row.scope_key !== expected.scope_key || row.request_digest !== expected.request_digest || !casValid || row.response_json !== expected.response_json) throw ctError("CT_SCHEMA_INVALID")
  }
  for (const rebind of rebinds) {
    const target = rows.find(({ main_binding_id }) => main_binding_id === rebind.new_main_binding_id)
    const oldRow = rows.find(({ main_binding_id }) => main_binding_id === rebind.old_main_binding_id)
    const committed = db.query("SELECT * FROM ct_idempotency WHERE operation='rebindMain' AND request_identity=?").get(rebind.request_identity)
    let response
    try { response = JSON.parse(committed?.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
    if (!target || !oldRow || oldRow.binding_status !== "RETIRED" || target.identity_digest !== rebind.new_main_identity_digest ||
        oldRow.identity_digest !== rebind.old_main_identity_digest || target.binding_epoch !== rebind.new_main_binding_epoch || oldRow.binding_epoch !== rebind.old_main_binding_epoch ||
        !committed || response?.public_response?.main_binding_id !== rebind.new_main_binding_id || response.public_response.binding_epoch !== rebind.new_main_binding_epoch)
      throw ctError("CT_SCHEMA_INVALID")
  }
  const activations = db.query("SELECT * FROM ct_activation ORDER BY activation_epoch").all().map(assertActivation)
  const activationCommits = db.query("SELECT * FROM ct_idempotency WHERE operation='activate' ORDER BY scope_key").all()
  if (activations.length !== activationCommits.length) throw ctError("CT_SCHEMA_INVALID")
  for (const [index, activation] of activations.entries()) {
    if (activation.activation_epoch !== index + 1) throw ctError("CT_SCHEMA_INVALID")
    const main = rows.find(({ main_binding_id, binding_epoch }) => main_binding_id === activation.main_binding_id && binding_epoch === activation.main_binding_epoch)
    if (!main) throw ctError("CT_SCHEMA_INVALID")
    const expectedRequest = { request_identity: activation.request_identity, expected_mode: "OFF", expected_binding_epoch: main.binding_epoch, evidence_digest: activation.evidence_digest }
    const response = { mode: "ON", activation_epoch: activation.activation_epoch, replayed: false }
    const committed = activationCommits.find(({ request_identity }) => request_identity === activation.request_identity)
    const transitionDigest = requestDigest(activationTransition(authority, main, activation.evidence_digest, lease))
    const exactCas = requestDigest(activationCas(transitionDigest, main, activation.evidence_digest, lease, activation.activation_epoch - 1, activation.activation_epoch, activation.precondition_digest))
    const scopeValid = currentLeaseIsHistoricalSeed ? committed?.scope_key === `activation:${transitionDigest}` : /^activation:sha256:[0-9a-f]{64}$/.test(committed?.scope_key ?? "")
    const casValid = currentLeaseIsHistoricalSeed ? committed?.cas_digest === exactCas : committed?.cas_digest === activation.cas_digest
    if (!committed || !scopeValid || !casValid || committed.request_digest !== requestDigest(expectedRequest) ||
        committed.response_json !== jcs(response) || committed.committed_at !== activation.activated_at ||
        activation.request_digest !== committed.request_digest || activation.cas_digest !== committed.cas_digest) throw ctError("CT_SCHEMA_INVALID")
  }
  return { rows, lease, activations }
}
const canonicalJson = (text, maxBytes) => {
  if (typeof text !== "string" || Buffer.byteLength(text) < 1 || Buffer.byteLength(text) > maxBytes) throw ctError("CT_SCHEMA_INVALID")
  let value
  try { value = JSON.parse(text) } catch { throw ctError("CT_SCHEMA_INVALID") }
  if (jcs(value) !== text) throw ctError("CT_SCHEMA_INVALID")
  return value
}
const validTimestamp = (value, nullable = false) => (nullable && value === null) || rfc3339Milliseconds.test(value ?? "")
const exactKeys = (value, keys) => value && Object.getPrototypeOf(value) === Object.prototype && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys.slice().sort())
const boundedText = (value, limit) => {
  if (!opaque(value, limit)) return false
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) { if (++index >= value.length || value.charCodeAt(index) < 0xdc00 || value.charCodeAt(index) > 0xdfff) return false }
    else if (code >= 0xdc00 && code <= 0xdfff) return false
  }
  return true
}
const strictSorted = (rows, fields) => rows.every((row, index) => index === 0 || (() => {
  for (const field of fields) { const comparison = Buffer.compare(Buffer.from(rows[index - 1][field]), Buffer.from(row[field])); if (comparison) return comparison < 0 }
  return false
})())
const repoRelative = (value) => boundedText(value, 1024) && !value.startsWith("/") && !value.includes("\\") && value.split("/").every((part) => part && part !== "." && part !== "..")
const validHandoffPayload = (payload) => {
  const dependencies = payload?.next_unit?.dependencies, references = payload?.next_unit?.references, snapshots = payload?.snapshots
  if (!exactKeys(payload, ["decision_summary", "kind", "lineage", "next_unit", "provenance", "repository", "snapshots", "version"]) ||
      !exactKeys(payload.lineage, ["lineage_id", "revision"]) || !exactKeys(payload.repository, ["git_common_dir_fingerprint", "repository_fingerprint", "source_merge"]) ||
      !exactKeys(payload.repository.source_merge, ["sha", "url"]) || !exactKeys(payload.next_unit, ["dependencies", "references", "scope", "unit_id"]) ||
      !exactKeys(payload.provenance, ["source_digest", "source_kind", "source_ref"]) || payload.kind !== "control_tower_handoff_v1" || payload.version !== 1 ||
      !uuid.test(payload.lineage.lineage_id ?? "") || !safeEpoch(payload.lineage.revision) || payload.lineage.revision === 0 ||
      !boundedText(payload.next_unit.unit_id, 128) || !boundedText(payload.next_unit.scope, 4096) || !boundedText(payload.decision_summary, 8192) ||
      !boundedText(payload.provenance.source_kind, 64) || !boundedText(payload.provenance.source_ref, 1024) || !sha256Digest.test(payload.provenance.source_digest ?? "") ||
      !sha256Digest.test(payload.repository.repository_fingerprint ?? "") || !sha256Digest.test(payload.repository.git_common_dir_fingerprint ?? "") ||
      !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(payload.repository.source_merge.sha ?? "") || !boundedText(payload.repository.source_merge.url, 2048) ||
      !Array.isArray(dependencies) || dependencies.length > 64 || !Array.isArray(references) || references.length > 128 || !Array.isArray(snapshots) || snapshots.length > 64) return false
  if (dependencies.some((item) => !exactKeys(item, ["digest", "id"]) || !boundedText(item.id, 128) || !sha256Digest.test(item.digest ?? "")) || !strictSorted(dependencies, ["id", "digest"])) return false
  if (references.some((item) => !exactKeys(item, ["digest", "kind", "value"]) || !["FILE", "COMMIT", "URL"].includes(item.kind) || !sha256Digest.test(item.digest ?? "") ||
      (item.kind === "FILE" ? !repoRelative(item.value) : item.kind === "COMMIT" ? !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(item.value ?? "") : !boundedText(item.value, 2048))) || !strictSorted(references, ["kind", "value", "digest"])) return false
  return !snapshots.some((item) => !exactKeys(item, ["digest", "name"]) || !boundedText(item.name, 128) || !sha256Digest.test(item.digest ?? "")) && strictSorted(snapshots, ["name", "digest"])
}
// P5-A (CT-R12): the effect manifest is the durable effect record — there is
// no separate ct_effect table. Structurally complete means exact shape,
// contiguous 0-based effect_index, bounded JCS, and a caller
// pre_start_boundary_digest that matches the server-recomputed boundary over
// {effect_index,target_kind,target,pre_state_digest} in manifest order.
// Returns null for any structural/digest failure so callers can classify it
// as CT_EFFECT_MANIFEST_INVALID (fresh ack) or CT_SCHEMA_INVALID (historical
// re-verification of an already-persisted row).
const effectTargetKinds = new Set(["DATABASE", "EXTERNAL_API", "FILESYSTEM"])
const effectManifestDigests = (manifest, id, generation) => {
  if (!exactKeys(manifest, ["effects", "generation", "id", "kind", "pre_start_boundary_digest", "version"]) || manifest.kind !== "effect_manifest_v1" ||
      manifest.version !== 1 || manifest.id !== id || manifest.generation !== generation || !sha256Digest.test(manifest.pre_start_boundary_digest ?? "") ||
      !Array.isArray(manifest.effects) || manifest.effects.length < 1 || manifest.effects.length > 256) return null
  for (let index = 0; index < manifest.effects.length; index++) {
    const effect = manifest.effects[index]
    if (!exactKeys(effect, ["compensatability", "effect_index", "observability", "operation", "pre_state_digest", "target", "target_kind"]) ||
        effect.effect_index !== index || !effectTargetKinds.has(effect.target_kind) || !boundedText(effect.target, 1024) || !boundedText(effect.operation, 128) ||
        !["OBSERVABLE", "UNOBSERVABLE"].includes(effect.observability) || !["COMPENSATABLE", "NON_COMPENSATABLE"].includes(effect.compensatability) ||
        !sha256Digest.test(effect.pre_state_digest ?? "")) return null
  }
  const manifestJson = jcs(manifest)
  if (Buffer.byteLength(manifestJson) > 65536) return null
  const boundary = { kind: "effect_boundary_v1", version: 1, id, generation,
    effects: manifest.effects.map(({ effect_index, target_kind, target, pre_state_digest }) => ({ effect_index, target_kind, target, pre_state_digest })) }
  const pre_start_boundary_digest = requestDigest(boundary)
  if (manifest.pre_start_boundary_digest !== pre_start_boundary_digest) return null
  return { effect_manifest_digest: sha256(Buffer.from(manifestJson)), pre_start_boundary_digest }
}
const validEvidenceReference = (evidence, reference) => {
  if (!evidence || !reference || evidence.kind !== reference.kind || evidence.value !== reference.value || evidence.digest !== reference.digest || !sha256Digest.test(evidence.observed_digest ?? "")) return false
  if (reference.kind === "URL") return exactKeys(evidence, ["digest", "fetch", "kind", "observed_digest", "value"]) && evidence.fetch === "NONE" && evidence.digest === sha256(reference.value) && evidence.observed_digest === evidence.digest
  if (reference.kind === "COMMIT") return exactKeys(evidence, ["digest", "kind", "observed_digest", "resolved_oid", "value"]) && evidence.resolved_oid === reference.value && evidence.observed_digest === sha256(reference.value)
  return exactKeys(evidence, ["digest", "kind", "node_type", "observed_digest", "value"]) && evidence.node_type === "REGULAR" && evidence.observed_digest === reference.digest
}
// P5-C (CT-R1-S3): committed_result_v1 mirrors the accepted complete request
// — id/generation/attestation_digest are pure request-internal consistency
// checks, so a malformed committed_result is CT_PAYLOAD_INVALID exactly like
// any other malformed request field, never a dedicated code.
const committedResultKeys = ["attestation_digest", "effect_settlement_digest", "generation", "id", "kind", "result_digest", "result_ref", "version"]
const validCommittedResult = (committed_result, id, generation, attestation_digest) =>
  exactKeys(committed_result, committedResultKeys) && committed_result.kind === "committed_result_v1" && committed_result.version === 1 &&
  committed_result.id === id && committed_result.generation === generation && committed_result.attestation_digest === attestation_digest &&
  sha256Digest.test(committed_result.result_digest ?? "") && sha256Digest.test(committed_result.effect_settlement_digest ?? "") && boundedText(committed_result.result_ref, 2048)
// P5-C (CT-R12-S3/S4): compensation_receipt_v1/rollback_proof_v1 are shapes
// and a pure boundary-equality rule only — the STARTED-rollback operation
// that would produce a real observed_boundary_digest from an independent
// read-back is RECOVER, which executes in P6. These validators are exported
// for direct unit coverage; no P5-C route persists or accepts either shape.
const compensationReceiptKeys = ["compensation_operation", "effect_index", "generation", "id", "kind", "occurred_at", "read_back_digest", "read_back_matches_pre_state", "target", "target_kind", "version"]
export const validCompensationReceipt = (receipt, id, generation, effect) =>
  Boolean(effect) && exactKeys(receipt, compensationReceiptKeys) && receipt.kind === "compensation_receipt_v1" && receipt.version === 1 &&
  receipt.id === id && receipt.generation === generation && receipt.effect_index === effect.effect_index && receipt.target_kind === effect.target_kind && receipt.target === effect.target &&
  boundedText(receipt.compensation_operation, 128) && sha256Digest.test(receipt.read_back_digest ?? "") && typeof receipt.read_back_matches_pre_state === "boolean" && validTimestamp(receipt.occurred_at)
const rollbackProofKeys = ["boundary_equal", "generation", "id", "kind", "observed_boundary_digest", "pre_start_boundary_digest", "receipts", "version"]
export const rollbackProofDigest = (proof) => requestDigest(proof)
export const validRollbackProof = (proof, id, generation, manifest, pre_start_boundary_digest) => {
  if (!exactKeys(proof, rollbackProofKeys) || proof.kind !== "rollback_proof_v1" || proof.version !== 1 || proof.id !== id || proof.generation !== generation ||
      proof.pre_start_boundary_digest !== pre_start_boundary_digest || !sha256Digest.test(proof.observed_boundary_digest ?? "") || typeof proof.boundary_equal !== "boolean" ||
      !Array.isArray(proof.receipts) || proof.receipts.length !== manifest.effects.length) return false
  const receiptsValid = proof.receipts.every((receipt, index) => validCompensationReceipt(receipt, id, generation, manifest.effects[index]))
  if (!receiptsValid) return false
  const computedMatches = proof.receipts.map((receipt, index) => receipt.read_back_digest === manifest.effects[index].pre_state_digest)
  if (proof.receipts.some((receipt, index) => receipt.read_back_matches_pre_state !== computedMatches[index])) return false
  const observedBoundary = { kind: "effect_boundary_v1", version: 1, id, generation,
    effects: manifest.effects.map(({ effect_index, target_kind, target }, index) => ({ effect_index, target_kind, target, pre_state_digest: proof.receipts[index].read_back_digest })) }
  const observedBoundaryDigest = requestDigest(observedBoundary)
  if (proof.observed_boundary_digest !== observedBoundaryDigest) return false
  const fullyProvable = manifest.effects.every((effect) => effect.observability === "OBSERVABLE" && effect.compensatability === "COMPENSATABLE")
  const expectedBoundaryEqual = fullyProvable && computedMatches.every(Boolean) && observedBoundaryDigest === pre_start_boundary_digest
  return proof.boundary_equal === expectedBoundaryEqual
}
const schema4States = new Set(["DRAFT", "VALIDATED", "PUBLISHED", "CLAIMED", "STARTED", "COMPLETION_ATTESTED", "COMPLETED", "REJECTED", "CANCELLED", "POISONED", "WORK_SUSPENDED", "ATTESTATION_SUSPENDED"])
const schema4ReverseLinkValid = (_operation, valid) => valid
// P6-B (corrective): the total (from_state,to_state)->disposition map named
// verbatim by design.md's "RECOVER envelopes" section; each pair is unique.
const recoverDispositionPairs = new Map([
  ["CLAIMED>PUBLISHED", "NOT_STARTED"],
  ["STARTED>PUBLISHED", "ROLLED_BACK"],
  ["PUBLISHED>WORK_SUSPENDED", "SUSPEND_PENDING"],
  ["WORK_SUSPENDED>PUBLISHED", "REDELIVER_WORK"],
  ["COMPLETION_ATTESTED>ATTESTATION_SUSPENDED", "SUSPEND_ATTESTATION"],
  ["ATTESTATION_SUSPENDED>COMPLETION_ATTESTED", "REDELIVER_ATTESTATION"],
])
const recoverCancelPoisonSources = new Set(["PUBLISHED", "CLAIMED", "STARTED", "COMPLETION_ATTESTED"])
const recoverDisposition = (row) => {
  if (row.to_state === "CANCELLED" && recoverCancelPoisonSources.has(row.from_state)) return "CANCELLED"
  if (row.to_state === "POISONED" && recoverCancelPoisonSources.has(row.from_state)) return "POISONED"
  return recoverDispositionPairs.get(`${row.from_state}>${row.to_state}`) ?? null
}
const recoverGenerationIncrementDispositions = new Set(["NOT_STARTED", "ROLLED_BACK", "REDELIVER_WORK", "REDELIVER_ATTESTATION"])
// P6-F: REDELIVER_WORK/REDELIVER_ATTESTATION name no delivery/claim to close
// (design.md:1797/1799 — "none (the row is already non-live and
// claimless)"), unlike every other disposition, so the historical
// reconstruction and the live handler both force delivery/claim to null for
// exactly these two actions rather than reusing the generic lookup.
const recoverRedeliveryActions = new Set(["REDELIVER_WORK", "REDELIVER_ATTESTATION"])
// P6-F: design.md:1841 adds exactly one new schema4Transition pair —
// COMPLETION_ATTESTED->COMPLETION_ATTESTED — gated on purpose ==
// 'ATTESTATION_REDELIVERY', because continuationClaim (unchanged since
// P4-B) leaves the handoff state untouched for that purpose. Every other
// CLAIM row keeps the original PUBLISHED->CLAIMED shape.
const schema4Transition = (row, previous, purpose) => {
  const fixed = { CREATE: [null, "DRAFT"], VALIDATE: ["DRAFT", "VALIDATED"], PUBLISH: ["VALIDATED", "PUBLISHED"], ACK: ["CLAIMED", "STARTED"],
    ATTEST_COMPLETION: ["STARTED", "COMPLETION_ATTESTED"], COMPLETE: ["COMPLETION_ATTESTED", "COMPLETED"], REVISE: [null, "DRAFT"] }[row.operation]
  if (fixed && (row.from_state !== fixed[0] || row.to_state !== fixed[1])) return false
  if (row.operation === "CLAIM" && !(purpose === "ATTESTATION_REDELIVERY"
    ? row.from_state === "COMPLETION_ATTESTED" && row.to_state === "COMPLETION_ATTESTED"
    : row.from_state === "PUBLISHED" && row.to_state === "CLAIMED")) return false
  if (row.operation === "REJECT" && (!["DRAFT", "VALIDATED", "PUBLISHED"].includes(row.from_state) || row.to_state !== "REJECTED")) return false
  if (row.operation === "RECOVER" && !recoverDisposition(row)) return false
  return ["CREATE", "REVISE"].includes(row.operation) ? previous === null : row.from_state === previous
}
function validateSchema4Persistence(db, authority) {
  try {
    const version = inspectSchema(db)
    // P6-B (corrective): RECOVER accepted at schema 5 only; schema 4 keeps
    // the exact original query, provably unchanged.
    const futureHistoryPresent = version === 5
      ? db.query(`SELECT
      EXISTS(SELECT 1 FROM ct_handoff WHERE state NOT IN ('DRAFT','VALIDATED','PUBLISHED','CLAIMED','STARTED','COMPLETION_ATTESTED','COMPLETED','REJECTED','CANCELLED','POISONED','WORK_SUSPENDED','ATTESTATION_SUSPENDED')) OR
      EXISTS(SELECT 1 FROM ct_handoff_transition WHERE operation NOT IN ('CREATE','VALIDATE','PUBLISH','CLAIM','ACK','ATTEST_COMPLETION','COMPLETE','REJECT','REVISE','RECOVER')) OR
      EXISTS(SELECT 1 FROM ct_delivery WHERE purpose NOT IN ('WORK','ATTESTATION_REDELIVERY') OR delivery_state NOT IN ('PENDING','CLAIMED','CLOSED')) OR
      EXISTS(SELECT 1 FROM ct_claim WHERE purpose NOT IN ('WORK','ATTESTATION_REDELIVERY') OR claim_state NOT IN ('LIVE','CLOSED')) AS invalid`).get().invalid
      : db.query(`SELECT
      EXISTS(SELECT 1 FROM ct_handoff WHERE generation<>0 OR state NOT IN ('DRAFT','VALIDATED','PUBLISHED','CLAIMED','STARTED','COMPLETION_ATTESTED','COMPLETED','REJECTED')) OR
      EXISTS(SELECT 1 FROM ct_handoff_transition WHERE generation<>0 OR operation NOT IN ('CREATE','VALIDATE','PUBLISH','CLAIM','ACK','ATTEST_COMPLETION','COMPLETE','REJECT','REVISE')) OR
      EXISTS(SELECT 1 FROM ct_delivery WHERE generation<>0 OR purpose<>'WORK' OR delivery_state NOT IN ('PENDING','CLAIMED','CLOSED')) OR
      EXISTS(SELECT 1 FROM ct_claim WHERE generation<>0 OR purpose<>'WORK' OR claim_state NOT IN ('LIVE','CLOSED')) OR
      EXISTS(SELECT 1 FROM ct_idempotency WHERE operation='recover') AS invalid`).get().invalid
    if (futureHistoryPresent) throw ctError("CT_SCHEMA_INVALID")
    const bindings = new Map(db.query("SELECT * FROM ct_claimant_binding").all().map((row) => [row.binding_id, assertClaimantBinding(row, authority)]))
    for (const row of db.query("SELECT * FROM ct_claimant_conflict").all()) {
      const incumbent = bindings.get(row.incumbent_binding_id), attempted = bindings.get(row.attempted_binding_id)
      const value = Object.fromEntries(["plugin_scope_digest", "incumbent_binding_id", "attempted_binding_id", "incumbent_identity_digest", "attempted_identity_digest", "request_identity", "request_digest", "cas_digest"].map((field) => [field, row[field]]))
      if (!isBase64url32(row.conflict_id) || !incumbent || !attempted || incumbent.binding_status !== "MULTIPLEXED" || attempted.binding_status !== "MULTIPLEXED" ||
          incumbent.identity_digest !== row.incumbent_identity_digest || attempted.identity_digest !== row.attempted_identity_digest || ![row.plugin_scope_digest, row.request_digest, row.cas_digest, row.conflict_digest].every((digest) => sha256Digest.test(digest ?? "")) ||
          !uuid.test(row.request_identity ?? "") || row.conflict_digest !== requestDigest(value) || !validTimestamp(row.detected_at)) throw ctError("CT_SCHEMA_INVALID")
    }
    const mains = new Map(db.query("SELECT * FROM ct_main_binding").all().map((row) => [row.main_binding_id, assertMainBinding(row, authority)]))
    const handoffs = new Map()
    for (const row of db.query("SELECT * FROM ct_handoff").all()) {
      const producer = bindings.get(row.producer_binding_id) ?? mains.get(row.producer_binding_id)
      const producerIsMain = mains.has(row.producer_binding_id)
      const payload = canonicalJson(row.payload_json, 65536), producerCtx = canonicalJson(row.producer_ctx_json, 4096)
      const digestFields = ["payload_digest", "handoff_fingerprint", "repository_fingerprint", "git_common_dir_fingerprint", "next_unit_scope_digest", "dependencies_digest", "references_digest", "snapshots_digest", "provenance_digest", "decision_summary_digest", "producer_identity_digest", "producer_ctx_digest"]
      const mainProducerCtx = producerIsMain && producerCtx.effective_uid === authority.anchor.context.trusted_uid && producerCtx.canonical_repo === authority.anchor.context.canonical_repo &&
        producerCtx.git_common_dir === authority.anchor.context.git_common_dir && producerCtx.worktree === authority.anchor.context.main_worktree && producerCtx.branch === authority.anchor.context.branch &&
        producerCtx.binding_epoch === producer.binding_epoch && mainIdentityFields.every((field) => producerCtx[field] === producer[field])
      if (!isBase64url32(row.id) || !uuid.test(row.lineage_id ?? "") || !safeEpoch(row.revision) || row.revision === 0 || !schema4States.has(row.state) || !safeEpoch(row.generation) ||
          !digestFields.every((field) => sha256Digest.test(row[field] ?? "")) || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(row.source_merge_sha ?? "") || !opaque(row.source_merge_url, 2048) ||
          !producer || row.producer_identity_digest !== producer.identity_digest || row.payload_digest !== requestDigest(payload) || row.producer_ctx_digest !== requestDigest(producerCtx) ||
          JSON.stringify(Object.keys(producerCtx).sort()) !== JSON.stringify(bindingFields.slice().sort()) || !(producerIsMain ? mainProducerCtx : equalFields(producerCtx, producer, bindingFields)) || !validTimestamp(row.created_at)) throw ctError("CT_SCHEMA_INVALID")
      const payloadKeys = ["decision_summary", "kind", "lineage", "next_unit", "provenance", "repository", "snapshots", "version"]
      const nextKeys = ["dependencies", "references", "scope", "unit_id"]
      if (!validHandoffPayload(payload) || JSON.stringify(Object.keys(payload).sort()) !== JSON.stringify(payloadKeys) || payload.kind !== "control_tower_handoff_v1" || payload.version !== 1 ||
          JSON.stringify(Object.keys(payload.lineage ?? {}).sort()) !== JSON.stringify(["lineage_id", "revision"]) || payload.lineage.lineage_id !== row.lineage_id || payload.lineage.revision !== row.revision ||
          JSON.stringify(Object.keys(payload.repository ?? {}).sort()) !== JSON.stringify(["git_common_dir_fingerprint", "repository_fingerprint", "source_merge"]) ||
          JSON.stringify(Object.keys(payload.repository.source_merge ?? {}).sort()) !== JSON.stringify(["sha", "url"]) || JSON.stringify(Object.keys(payload.next_unit ?? {}).sort()) !== JSON.stringify(nextKeys) ||
          JSON.stringify(Object.keys(payload.provenance ?? {}).sort()) !== JSON.stringify(["source_digest", "source_kind", "source_ref"]) || !Array.isArray(payload.next_unit.dependencies) || !Array.isArray(payload.next_unit.references) || !Array.isArray(payload.snapshots) ||
          payload.repository.repository_fingerprint !== row.repository_fingerprint || payload.repository.git_common_dir_fingerprint !== row.git_common_dir_fingerprint || payload.repository.source_merge.sha !== row.source_merge_sha || payload.repository.source_merge.url !== row.source_merge_url ||
          row.repository_fingerprint !== requestDigest({ kind: "canonical_repo_v1", path: authority.anchor.context.canonical_repo }) || row.git_common_dir_fingerprint !== requestDigest({ kind: "git_common_dir_v1", path: authority.anchor.context.git_common_dir }) ||
          row.next_unit_scope_digest !== requestDigest({ unit_id: payload.next_unit.unit_id, scope: payload.next_unit.scope }) || row.dependencies_digest !== requestDigest(payload.next_unit.dependencies) || row.references_digest !== requestDigest(payload.next_unit.references) ||
          row.snapshots_digest !== requestDigest(payload.snapshots) || row.decision_summary_digest !== sha256(payload.decision_summary) ||
          payload.provenance.source_digest !== requestDigest({ source_kind: payload.provenance.source_kind, source_ref: payload.provenance.source_ref, source_merge_sha: row.source_merge_sha, source_merge_url: row.source_merge_url }) ||
          row.provenance_digest !== requestDigest({ source_digest: payload.provenance.source_digest, references_digest: row.references_digest, snapshots_digest: row.snapshots_digest })) throw ctError("CT_SCHEMA_INVALID")
      const validationPresent = row.validation_evidence_json !== null || row.validation_digest !== null || row.validated_at !== null
      if (validationPresent && (row.validation_evidence_json === null || !sha256Digest.test(row.validation_digest ?? "") || !validTimestamp(row.validated_at) || row.validation_digest !== requestDigest(canonicalJson(row.validation_evidence_json, 65536)))) throw ctError("CT_SCHEMA_INVALID")
      if (!validationPresent && ["VALIDATED", "PUBLISHED", "CLAIMED", "STARTED", "COMPLETION_ATTESTED", "COMPLETED"].includes(row.state)) throw ctError("CT_SCHEMA_INVALID")
      if (row.published_at !== null && (!validationPresent || !validTimestamp(row.published_at))) throw ctError("CT_SCHEMA_INVALID")
      if ((row.validated_at !== null && row.validated_at < row.created_at) || (row.published_at !== null && row.published_at < row.validated_at)) throw ctError("CT_SCHEMA_INVALID")
      if (["PUBLISHED", "CLAIMED", "STARTED", "COMPLETION_ATTESTED", "COMPLETED"].includes(row.state) && row.published_at === null) throw ctError("CT_SCHEMA_INVALID")
      if (validationPresent) {
        const evidence = canonicalJson(row.validation_evidence_json, 65536)
        const expectedContent = Object.fromEntries(["next_unit_scope_digest", "dependencies_digest", "references_digest", "snapshots_digest", "decision_summary_digest"].map((field) => [field, row[field]]))
        const expectedProvenance = { source_digest: payload.provenance.source_digest, provenance_digest: row.provenance_digest, producer_binding_id: row.producer_binding_id, producer_identity_digest: row.producer_identity_digest, producer_ctx_digest: row.producer_ctx_digest }
        const validator = mains.get(evidence?.validator?.main_binding_id)
        if (evidence.kind !== "handoff_validation_evidence_v1" || evidence.version !== 1 || evidence.id !== row.id || evidence.lineage_id !== row.lineage_id || evidence.revision !== row.revision ||
            evidence.payload_digest !== row.payload_digest || evidence.handoff_fingerprint !== row.handoff_fingerprint || evidence.repository_fingerprint !== row.repository_fingerprint || evidence.git_common_dir_fingerprint !== row.git_common_dir_fingerprint ||
            jcs(evidence.content) !== jcs(expectedContent) || jcs(evidence.provenance) !== jcs(expectedProvenance) || evidence.source_merge?.requested_sha !== row.source_merge_sha || evidence.source_merge?.url !== row.source_merge_url || evidence.source_merge?.is_ancestor !== true ||
            !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(evidence.source_merge?.resolved_oid ?? "") || evidence.source_merge.resolved_oid !== row.source_merge_sha || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(evidence.source_merge?.main_head_oid ?? "") ||
            !exactKeys(evidence, ["content", "git_common_dir_fingerprint", "handoff_fingerprint", "id", "kind", "lineage_id", "payload_digest", "provenance", "references", "repository_fingerprint", "revision", "source_merge", "validator", "version"]) ||
          !exactKeys(evidence.source_merge, ["is_ancestor", "main_head_oid", "requested_sha", "resolved_oid", "url"]) || !exactKeys(evidence.validator, ["main_binding_epoch", "main_binding_id", "main_identity_digest"]) ||
          !Array.isArray(evidence.references) || evidence.references.length !== payload.next_unit.references.length || evidence.references.some((item, index) => !validEvidenceReference(item, payload.next_unit.references[index])) ||
          !validator || evidence.validator.main_binding_epoch !== validator.binding_epoch || evidence.validator.main_identity_digest !== validator.identity_digest) throw ctError("CT_SCHEMA_INVALID")
      }
      const fingerprint = { kind: "handoff_fingerprint_v1", version: 1 }
      for (const field of ["id", "lineage_id", "revision", "payload_digest", "repository_fingerprint", "git_common_dir_fingerprint", "next_unit_scope_digest", "dependencies_digest", "references_digest", "snapshots_digest", "provenance_digest", "decision_summary_digest", "producer_binding_id", "producer_identity_digest", "producer_ctx_digest"]) fingerprint[field] = row[field]
      if (row.handoff_fingerprint !== requestDigest(fingerprint)) throw ctError("CT_SCHEMA_INVALID")
      handoffs.set(row.id, row)
    }

    const transitionOperations = { CREATE: "create", VALIDATE: "validate", PUBLISH: "publish", CLAIM: "claim", ACK: "ack", ATTEST_COMPLETION: "attestCompletion", COMPLETE: "complete", REJECT: "reject", REVISE: "revise", RECOVER: "recover" }
    const mainOperations = new Set(["VALIDATE", "PUBLISH", "ATTEST_COMPLETION", "REJECT", "REVISE", "RECOVER"])
    const transitions = new Map(), transitionRecords = []
    for (const row of db.query("SELECT rowid AS sequence,* FROM ct_handoff_transition ORDER BY occurred_at,transition_id").all()) {
      const handoff = handoffs.get(row.handoff_id), authorityRow = row.authority_kind === "MAIN" ? mains.get(row.authority_binding_id) : bindings.get(row.authority_binding_id)
      const operation = transitionOperations[row.operation]
      const committed = operation && db.query("SELECT * FROM ct_idempotency WHERE operation=? AND request_identity=?").get(operation, row.request_identity)
      let response
      try { response = JSON.parse(committed?.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
      const isP4Operation = ["CREATE", "VALIDATE", "PUBLISH", "CLAIM"].includes(row.operation)
      const responseValue = isP4Operation ? response?.public_response : response?.public_response ?? response
      if (!handoff || !operation || !isBase64url32(row.transition_id) || !safeEpoch(row.generation) || row.generation > handoff.generation || !schema4States.has(row.to_state) ||
          (row.from_state !== null && !schema4States.has(row.from_state)) || !authorityRow || authorityRow.identity_digest !== row.authority_identity_digest ||
          (mainOperations.has(row.operation) ? row.authority_kind !== "MAIN" : row.operation === "CREATE" ? row.authority_kind !== "PRODUCER" : row.authority_kind !== "CLAIMANT") || !uuid.test(row.request_identity ?? "") ||
          ![row.request_digest, row.cas_digest, row.response_digest].every((value) => sha256Digest.test(value ?? "")) || (row.decision_digest !== null && !sha256Digest.test(row.decision_digest)) || !validTimestamp(row.occurred_at) ||
          !committed || committed.request_digest !== row.request_digest || committed.cas_digest !== row.cas_digest || committed.committed_at !== row.occurred_at || jcs(response) !== committed.response_json ||
          (isP4Operation && (!exactKeys(response, ["evidence", "kind", "public_response", "version"]) || response.version !== 1 || !responseValue)) || row.response_digest !== requestDigest(responseValue)) throw ctError("CT_SCHEMA_INVALID")
      const history = transitions.get(row.handoff_id) ?? [], previous = history.at(-1)
      const generationIncrement = row.operation === "RECOVER" && recoverGenerationIncrementDispositions.has(recoverDisposition(row)) ? 1 : 0
      if (row.occurred_at < handoff.created_at || !schema4Transition(row, previous?.to_state ?? null, row.operation === "CLAIM" ? responseValue?.purpose : undefined) || (previous ? row.generation !== previous.generation + generationIncrement : row.generation !== 0) ||
          (row.operation === "CREATE" ? row.decision_digest !== null : row.decision_digest === null)) throw ctError("CT_SCHEMA_INVALID")
      history.push(row); transitions.set(row.handoff_id, history); transitionRecords.push({ row, committed, response })
    }
    for (const [id, handoff] of handoffs) {
      const current = transitions.get(id)?.at(-1)
      const first = transitions.get(id)?.[0]
      const revised = first?.operation === "REVISE" && handoff.revision > 1 && [...handoffs.values()].some((candidate) => candidate.lineage_id === handoff.lineage_id && candidate.revision === handoff.revision - 1 && candidate.state === "REJECTED")
      if (!current || current.to_state !== handoff.state || current.generation !== handoff.generation || (first?.operation !== "CREATE" && !revised) ||
          (first.operation === "CREATE" && (first.generation !== 0 || first.occurred_at !== handoff.created_at))) throw ctError("CT_SCHEMA_INVALID")
    }

    const budgets = new Map()
    for (const row of db.query("SELECT * FROM ct_session_budget").all()) {
      const scopeValue = canonicalJson(row.budget_scope_json, 4096)
      const keys = ["canonical_repo", "effective_uid", "git_common_dir", "kind", "plugin_instance", "root_session_id", "version"]
      if (!sha256Digest.test(row.budget_scope_digest ?? "") || row.budget_scope_digest !== requestDigest(scopeValue) || JSON.stringify(Object.keys(scopeValue).sort()) !== JSON.stringify(keys) ||
          scopeValue.kind !== "session_budget_v1" || scopeValue.version !== 1 || !Number.isSafeInteger(scopeValue.effective_uid) || scopeValue.effective_uid < 0 ||
          !absolutePath(scopeValue.canonical_repo) || !absolutePath(scopeValue.git_common_dir) || !opaque(scopeValue.plugin_instance) || !opaque(scopeValue.root_session_id) ||
          row.budget_limit !== 1 || ![0, 1].includes(row.consumed_count) || (row.consumed_count === 0 ? row.last_claim_id !== null : !isBase64url32(row.last_claim_id)) || !validTimestamp(row.created_at) || !validTimestamp(row.updated_at) || row.updated_at < row.created_at) throw ctError("CT_SCHEMA_INVALID")
      budgets.set(row.budget_scope_digest, row)
    }

    const deliveries = new Map(db.query("SELECT * FROM ct_delivery").all().map((row) => [row.delivery_id, row]))
    const claims = new Map()
    for (const row of db.query("SELECT * FROM ct_claim").all()) {
      const handoff = handoffs.get(row.handoff_id), delivery = deliveries.get(row.delivery_id), binding = bindings.get(row.claimant_binding_id)
      const claimantCtx = canonicalJson(row.claimant_ctx_json, 4096), budget = budgets.get(row.budget_scope_digest)
      if (!isBase64url32(row.claim_id) || !delivery || !handoff || delivery.handoff_id !== row.handoff_id || delivery.generation !== row.generation || delivery.purpose !== row.purpose ||
          !binding || binding.identity_digest !== row.claimant_identity_digest || JSON.stringify(Object.keys(claimantCtx).sort()) !== JSON.stringify(bindingFields.slice().sort()) || !equalFields(claimantCtx, binding, bindingFields) ||
          !["effective_uid", "canonical_repo", "git_common_dir", "plugin_instance", "root_session_id"].every((field) => canonicalJson(budget?.budget_scope_json ?? "", 4096)[field] === claimantCtx[field]) ||
          row.claimant_ctx_digest !== requestDigest(claimantCtx) || ![row.claimant_identity_digest, row.claimant_ctx_digest, row.claimant_fence_digest, row.token_hash, row.budget_scope_digest, row.request_digest, row.cas_digest].every((value) => sha256Digest.test(value ?? "")) ||
          !isBase64url32(row.token_salt) || !budget || row.budget_sequence !== 1 || budget.consumed_count !== 1 || budget.last_claim_id !== row.claim_id || !uuid.test(row.request_identity ?? "") ||
          !["LIVE", "CLOSED"].includes(row.claim_state) || !validTimestamp(row.created_at) || (row.claim_state === "LIVE" ? row.closed_at !== null : !validTimestamp(row.closed_at)) || (row.closed_at !== null && row.closed_at < row.created_at)) throw ctError("CT_SCHEMA_INVALID")
      claims.set(row.claim_id, row)
    }
    for (const row of deliveries.values()) {
      const handoff = handoffs.get(row.handoff_id), claim = row.claim_id === null ? null : claims.get(row.claim_id)
      const timestamps = validTimestamp(row.created_at) && validTimestamp(row.claimed_at, true) && validTimestamp(row.closed_at, true)
      const purposeValid = row.purpose === "WORK" ? row.handoff_state_snapshot === "PUBLISHED" : row.purpose === "ATTESTATION_REDELIVERY" && row.handoff_state_snapshot === "COMPLETION_ATTESTED"
      if (!isBase64url32(row.delivery_id) || !handoff || row.generation > handoff.generation || !purposeValid || !timestamps ||
          (row.claimed_at !== null && row.claimed_at < row.created_at) || (row.closed_at !== null && row.closed_at < (row.claimed_at ?? row.created_at)) ||
          (row.delivery_state !== "CLOSED" && row.generation !== handoff.generation) || (row.delivery_state === "PENDING" && claim !== null) ||
          (row.delivery_state === "CLAIMED" && (!claim || claim.claim_state !== "LIVE")) || (row.delivery_state === "CLOSED" && claim?.claim_state === "LIVE")) throw ctError("CT_SCHEMA_INVALID")
    }
    for (const budget of budgets.values()) if (budget.consumed_count === 1 && !claims.has(budget.last_claim_id)) throw ctError("CT_SCHEMA_INVALID")

    // P6-B: a schema-5 database can hold P4/P5 writer fences recorded either
    // before the migration (schema_version:4) or after (schema_version:5);
    // both remain valid historical fences under mode ON.
    // P6-E (corrective): a RECOVER row's writer fence may also be
    // ROLLING_BACK/ACTIVE, but only for the four dispositions design.md:1842
    // names verbatim (SUSPEND_PENDING, SUSPEND_ATTESTATION, CANCELLED,
    // POISONED) — passed in as `disposition` by the RECOVER-specific
    // reconstruction below; every other historical caller omits it and keeps
    // the original ON-only fence exactly as before.
    const rollingBackFenceDispositions = new Set(["SUSPEND_PENDING", "SUSPEND_ATTESTATION", "CANCELLED", "POISONED"])
    const validHistoricalWriterFence = (value, disposition = null) => exactKeys(value, ["anchor_id", "config_digest", "mode", "observed_lease_status", "observed_lease_version", "observed_rollback_epoch", "schema_version"]) &&
      [4, 5].includes(value.schema_version) && value.anchor_id === authority.anchor.anchor_id && value.config_digest === authority.anchor.config_digest &&
      safeEpoch(value.observed_rollback_epoch) && safeEpoch(value.observed_lease_version) &&
      (value.mode === "ON" ? value.observed_lease_status === "NONE" :
        value.mode === "ROLLING_BACK" && disposition !== null && rollingBackFenceDispositions.has(disposition) && value.observed_lease_status === "ACTIVE")
    const sameValue = (left, right) => jcs(left) === jcs(right)
    const recordsFor = (handoffId, operation) => transitionRecords.filter(({ row }) => row.handoff_id === handoffId && row.operation === operation)
    const attestationDigestFor = (handoffId, generation) => {
      const direct = recordsFor(handoffId, "ATTEST_COMPLETION").find(({ row }) => row.generation === generation)?.row?.decision_digest
      if (direct || version !== 5) return direct ?? null
      const redeliveries = db.query("SELECT preserved_attestation_digest,attestation_source_generation FROM ct_recovery_disposition WHERE handoff_id=? AND disposition='REDELIVER_ATTESTATION' AND to_generation=?").all(handoffId, generation)
      if (redeliveries.length !== 1) return null
      const source = recordsFor(handoffId, "ATTEST_COMPLETION").find(({ row }) => row.generation === redeliveries[0].attestation_source_generation)?.row
      return source?.decision_digest === redeliveries[0].preserved_attestation_digest ? source.decision_digest : null
    }
    const claimsByRequest = new Map([...claims.values()].map((claim) => [claim.request_identity, claim]))

    for (const [id, handoff] of handoffs) {
      const createRecords = recordsFor(id, "CREATE"), reviseRecords = recordsFor(id, "REVISE"), validateRecords = recordsFor(id, "VALIDATE"), publishRecords = recordsFor(id, "PUBLISH")
      const validationPresent = handoff.validation_evidence_json !== null || handoff.validation_digest !== null || handoff.validated_at !== null
      const publicationPresent = handoff.published_at !== null
      if (createRecords.length + reviseRecords.length !== 1 || validateRecords.length > 1 || publishRecords.length > 1 || validationPresent !== (validateRecords.length === 1) || publicationPresent !== (publishRecords.length === 1)) throw ctError("CT_SCHEMA_INVALID")
      const workDeliveries = [...deliveries.values()].filter((delivery) => delivery.handoff_id === id && delivery.purpose === "WORK")
      for (const delivery of workDeliveries) {
        const published = publishRecords.find(({ response }) => response?.evidence?.delivery_id === delivery.delivery_id && response.evidence.cas_input?.expected_generation === delivery.generation)
        const redelivered = transitionRecords.find(({ row, response }) => row.handoff_id === id && row.operation === "RECOVER" && row.to_state === "PUBLISHED" &&
          row.generation === delivery.generation && response?.evidence?.created_delivery_id === delivery.delivery_id)
        if (!published && !redelivered) throw ctError("CT_SCHEMA_INVALID")
      }
      // P6-F: design.md:1843 — every ATTESTATION_REDELIVERY delivery must
      // reverse-link to exactly one REDELIVER_ATTESTATION disposition row at
      // its own generation; only a RECOVER row can ever create one (no
      // PUBLISH/CLAIM path creates this purpose).
      const attestationRedeliveryDeliveries = [...deliveries.values()].filter((delivery) => delivery.handoff_id === id && delivery.purpose === "ATTESTATION_REDELIVERY")
      for (const delivery of attestationRedeliveryDeliveries) {
        const redelivered = transitionRecords.find(({ row, response }) => row.handoff_id === id && row.operation === "RECOVER" && row.to_state === "COMPLETION_ATTESTED" &&
          row.generation === delivery.generation && response?.evidence?.created_delivery_id === delivery.delivery_id)
        if (!redelivered) throw ctError("CT_SCHEMA_INVALID")
      }
      for (const { response } of publishRecords) {
        const delivery = deliveries.get(response?.evidence?.delivery_id)
        if (!delivery || delivery.handoff_id !== id || delivery.generation !== response.evidence.cas_input?.expected_generation || delivery.purpose !== "WORK") throw ctError("CT_SCHEMA_INVALID")
      }
    }

    for (const claim of claims.values()) {
      const records = transitionRecords.filter(({ row }) => row.operation === "CLAIM" && row.request_identity === claim.request_identity)
      const delivery = deliveries.get(claim.delivery_id)
      if (records.length !== 1 || !delivery || records[0].row.handoff_id !== claim.handoff_id || records[0].row.generation !== claim.generation ||
          records[0].row.authority_binding_id !== claim.claimant_binding_id || delivery.claim_id !== claim.claim_id) throw ctError("CT_SCHEMA_INVALID")
    }
    for (const delivery of deliveries.values()) {
      const claim = delivery.claim_id === null ? null : claims.get(delivery.claim_id)
      if ((delivery.delivery_state === "CLAIMED") !== Boolean(claim?.claim_state === "LIVE") || (delivery.claim_id !== null && !claim)) throw ctError("CT_SCHEMA_INVALID")
    }

    // P5-A: every historical ACK row is re-verified byte-exact against its
    // own claim, delivery, handoff, and effect-manifest rows — a
    // coherent-looking row whose evidence does not reconstruct exactly is
    // CT_SCHEMA_INVALID, never repaired. REJECT/RECOVER remain unreachable
    // here because futureHistoryPresent above already rejected them.
    for (const { row, committed, response } of transitionRecords) {
      if (row.operation !== "ACK") continue
      const handoff = handoffs.get(row.handoff_id)
      const claim = [...claims.values()].find((entry) => entry.handoff_id === row.handoff_id && entry.generation === row.generation)
      const delivery = claim && deliveries.get(claim.delivery_id)
      const evidence = response?.evidence, cas = evidence?.cas_input
      const authorityBinding = bindings.get(cas?.claimant_authority_v1?.binding_id)
      const manifestDigests = evidence?.request && effectManifestDigests(evidence.request.effect_manifest, row.handoff_id, row.generation)
      const expectedRequest = claim && delivery && manifestDigests && { request_identity: row.request_identity, delivery_id: delivery.delivery_id, id: row.handoff_id,
        es: "CLAIMED", eg: row.generation, purpose: "WORK", effect_manifest: evidence.request.effect_manifest, token_hash: claim.token_hash }
      const expectedCas = claim && delivery && manifestDigests && { kind: "ack_cas_v1", version: 1, writer_fence_v1: cas?.writer_fence_v1, claimant_authority_v1: cas?.claimant_authority_v1,
        delivery_id: delivery.delivery_id, id: row.handoff_id, expected_delivery_state: "CLAIMED", expected_handoff_state: "CLAIMED", expected_generation: row.generation,
        purpose: "WORK", claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, token_hash: claim.token_hash,
        handoff_fingerprint: handoff?.handoff_fingerprint, effect_manifest_digest: manifestDigests.effect_manifest_digest, pre_start_boundary_digest: manifestDigests.pre_start_boundary_digest }
      const publicResponse = { id: row.handoff_id, state: "STARTED", generation: row.generation, replayed: false }
      const decision = manifestDigests && claim && requestDigest({ kind: "ack_decision_v1", version: 1, delivery_id: delivery?.delivery_id, id: row.handoff_id, from_state: "CLAIMED", to_state: "STARTED",
        generation: row.generation, claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, token_hash: claim.token_hash,
        effect_manifest_digest: manifestDigests.effect_manifest_digest, pre_start_boundary_digest: manifestDigests.pre_start_boundary_digest })
      // P5-B/P5-C: attestCompletion and complete may have advanced this
      // handoff past STARTED and closed its claim/delivery since this ACK
      // row was recorded, so the current state/claim/delivery check accepts
      // every later-lifecycle value — the exact "current" top-of-history
      // check above already pinned STARTED as this row's own to_state.
      // P6-F (bug found and fixed — necessary for CT-R7-S10): the original
      // P6-D/P6-E enumeration only recognized a RECOVER row sourced directly
      // from STARTED, so it rejected the (COMPLETION_ATTESTED->ATTESTATION_
      // SUSPENDED) and (ATTESTATION_SUSPENDED->COMPLETION_ATTESTED@+1) pairs
      // this unit's own SUSPEND_ATTESTATION/REDELIVER_ATTESTATION dispositions
      // legitimately produce two hops downstream of every real ATTEST_
      // COMPLETION — status()/recover()/complete() all call
      // validateSchema4Persistence, so this was a latent CT_SCHEMA_INVALID
      // dead-end for every real SUSPEND_ATTESTATION disposition, not only a
      // P6-F-introduced gap. Widened to recognize both, still driven only by
      // a real, already-validated ct_recovery_disposition-backed row.
      const ackRecovery = recordsFor(row.handoff_id, "RECOVER").find(({ row: recoverRow }) =>
        (recoverRow.from_state === "STARTED" && (recoverRow.to_state === "PUBLISHED" ? recoverRow.generation === row.generation + 1 : recoverRow.generation === row.generation)) ||
        (recoverRow.from_state === "ATTESTATION_SUSPENDED" && recoverRow.to_state === "COMPLETION_ATTESTED" && recoverRow.generation === row.generation + 1))?.row
      const currentAckStateValid = ackRecovery
        ? ackRecovery.to_state === "PUBLISHED" ? handoff?.state === "PUBLISHED" && handoff.generation === row.generation + 1
          : ackRecovery.from_state === "ATTESTATION_SUSPENDED" ? ["COMPLETION_ATTESTED", "COMPLETED"].includes(handoff?.state) && handoff.generation === row.generation + 1
            : ["CANCELLED", "POISONED"].includes(ackRecovery.to_state) && handoff?.state === ackRecovery.to_state && handoff.generation === row.generation
        : ["STARTED", "COMPLETION_ATTESTED", "COMPLETED", "ATTESTATION_SUSPENDED"].includes(handoff?.state) && handoff?.generation === row.generation
      if (!currentAckStateValid || !claim || !["LIVE", "CLOSED"].includes(claim.claim_state) ||
          !delivery || !["CLAIMED", "CLOSED"].includes(delivery.delivery_state) || delivery.claim_id !== claim.claim_id || !manifestDigests ||
          !authorityBinding || authorityBinding.identity_digest !== cas.claimant_authority_v1.identity_digest ||
          claim.claimant_binding_id !== authorityBinding.binding_id || claim.claimant_identity_digest !== authorityBinding.identity_digest || claim.claimant_ctx_digest !== cas.claimant_authority_v1.ctx_digest ||
          !exactKeys(response, ["evidence", "kind", "public_response", "version"]) || response.kind !== "ack_response_envelope_v1" || response.version !== 1 ||
          !exactKeys(evidence, ["cas_digest", "cas_input", "claim_id", "claimant_fence_digest", "effect_manifest_digest", "pre_start_boundary_digest", "request", "request_digest", "scope_key", "token_hash"]) ||
          !exactKeys(evidence.request, ["delivery_id", "eg", "effect_manifest", "es", "id", "purpose", "request_identity", "token_hash"]) ||
          evidence.claim_id !== claim.claim_id || evidence.claimant_fence_digest !== claim.claimant_fence_digest || evidence.token_hash !== claim.token_hash ||
          evidence.effect_manifest_digest !== manifestDigests.effect_manifest_digest || evidence.pre_start_boundary_digest !== manifestDigests.pre_start_boundary_digest ||
          !validHistoricalWriterFence(cas.writer_fence_v1) || !exactKeys(cas.claimant_authority_v1, ["binding_id", "ctx_digest", "identity_digest"]) ||
          !sameValue(evidence.request, expectedRequest) || !sameValue(cas, expectedCas) || evidence.scope_key !== `handoff:${row.handoff_id}:generation:${row.generation}:ack` ||
          committed.scope_key !== evidence.scope_key || evidence.request_digest !== requestDigest(expectedRequest) || evidence.cas_digest !== requestDigest(expectedCas) ||
          row.request_digest !== evidence.request_digest || row.cas_digest !== evidence.cas_digest || committed.request_digest !== evidence.request_digest || committed.cas_digest !== evidence.cas_digest ||
          !sameValue(response.public_response, publicResponse) || row.response_digest !== requestDigest(publicResponse) || row.decision_digest !== decision ||
          row.authority_binding_id !== authorityBinding.binding_id || row.authority_identity_digest !== authorityBinding.identity_digest) throw ctError("CT_SCHEMA_INVALID")
    }

    // P5-B/P5-C: every historical ATTEST_COMPLETION row is re-verified
    // byte-exact against its own claim, delivery, handoff, and the persisted
    // ACK effect envelope it references — the server-derived
    // attestation_evidence_v1/attestation_digest is recomputed fresh from
    // those immutable rows, never trusted from the stored envelope. A
    // coherent-looking row whose evidence does not reconstruct exactly is
    // CT_SCHEMA_INVALID, never repaired. complete may have advanced this
    // handoff past COMPLETION_ATTESTED and closed its claim/delivery since
    // this row was recorded, so the state/claim/delivery check accepts every
    // later-lifecycle value. REJECT/RECOVER remain unreachable here because
    // futureHistoryPresent above already rejected them.
    for (const { row, committed, response } of transitionRecords) {
      if (row.operation !== "ATTEST_COMPLETION") continue
      const handoff = handoffs.get(row.handoff_id)
      const claim = [...claims.values()].find((entry) => entry.handoff_id === row.handoff_id && entry.generation === row.generation)
      const delivery = claim && deliveries.get(claim.delivery_id)
      const main = mains.get(row.authority_binding_id)
      const ackRecord = recordsFor(row.handoff_id, "ACK").find((entry) => entry.row.generation === row.generation)
      const manifestDigests = ackRecord?.response?.evidence && { effect_manifest_digest: ackRecord.response.evidence.effect_manifest_digest, pre_start_boundary_digest: ackRecord.response.evidence.pre_start_boundary_digest }
      const evidence = response?.evidence, cas = evidence?.cas_input
      const expectedAttestationEvidence = handoff && claim && delivery && manifestDigests && main && {
        kind: "attestation_evidence_v1", version: 1,
        id: row.handoff_id, lineage_id: handoff.lineage_id, revision: handoff.revision, generation: row.generation, handoff_fingerprint: handoff.handoff_fingerprint,
        repository_fingerprint: handoff.repository_fingerprint, git_common_dir_fingerprint: handoff.git_common_dir_fingerprint,
        source_merge: { sha: handoff.source_merge_sha, url: handoff.source_merge_url },
        content: { next_unit_scope_digest: handoff.next_unit_scope_digest, provenance_digest: handoff.provenance_digest, decision_summary_digest: handoff.decision_summary_digest },
        claim: { claim_id: claim.claim_id, delivery_id: delivery.delivery_id, purpose: "WORK", claimant_fence_digest: claim.claimant_fence_digest, claimant_identity_digest: claim.claimant_identity_digest },
        effects: manifestDigests,
        attestor: { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, main_identity_digest: main.identity_digest },
      }
      const expectedAttestationDigest = expectedAttestationEvidence && requestDigest(expectedAttestationEvidence)
      const expectedRequest = { request_identity: row.request_identity, id: row.handoff_id, es: "STARTED", eg: row.generation }
      const expectedCas = handoff && claim && manifestDigests && expectedAttestationDigest && { kind: "attest_cas_v1", version: 1, writer_fence_v1: cas?.writer_fence_v1, main_authority_v1: cas?.main_authority_v1,
        id: row.handoff_id, expected_state: "STARTED", expected_generation: row.generation, handoff_fingerprint: handoff.handoff_fingerprint,
        claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, effect_manifest_digest: manifestDigests.effect_manifest_digest, pre_start_boundary_digest: manifestDigests.pre_start_boundary_digest,
        attestation_digest: expectedAttestationDigest, expected_attestation: "ABSENT" }
      const publicResponse = { id: row.handoff_id, state: "COMPLETION_ATTESTED", generation: row.generation, replayed: false }
      const attestationRecovery = recordsFor(row.handoff_id, "RECOVER").find(({ row: recoverRow }) =>
        recoverRow.from_state === "COMPLETION_ATTESTED" && recoverRow.generation === row.generation)?.row
      // P6-F (bug found and fixed — necessary for CT-R7-S10): the original
      // P6-D/P6-E enumeration recognized only CANCELLED/POISONED as a legal
      // same-generation continuation of COMPLETION_ATTESTED, so a real
      // SUSPEND_ATTESTATION disposition (also sourced from COMPLETION_ATTESTED
      // at this exact generation) was rejected outright, and the outer
      // unconditional `handoff.generation !== row.generation` guard rejected
      // every subsequent REDELIVER_ATTESTATION too, since that disposition
      // always increments generation. Both are now recognized, still driven
      // only by real, already-validated ct_recovery_disposition-backed rows.
      const redeliverAttestation = recordsFor(row.handoff_id, "RECOVER").find(({ row: recoverRow }) =>
        recoverRow.from_state === "ATTESTATION_SUSPENDED" && recoverRow.to_state === "COMPLETION_ATTESTED" && recoverRow.generation === row.generation + 1)?.row
      const currentAttestationStateValid = attestationRecovery
        ? attestationRecovery.to_state === "ATTESTATION_SUSPENDED"
          ? redeliverAttestation
            ? ["COMPLETION_ATTESTED", "COMPLETED"].includes(handoff?.state) && handoff.generation === row.generation + 1
            : handoff?.state === "ATTESTATION_SUSPENDED" && handoff.generation === row.generation
          : ["CANCELLED", "POISONED"].includes(attestationRecovery.to_state) && handoff?.state === attestationRecovery.to_state && handoff.generation === row.generation
        : ["COMPLETION_ATTESTED", "COMPLETED"].includes(handoff?.state) && handoff.generation === row.generation
      if (!currentAttestationStateValid || !claim || !["LIVE", "CLOSED"].includes(claim.claim_state) ||
          !delivery || !["CLAIMED", "CLOSED"].includes(delivery.delivery_state) || delivery.claim_id !== claim.claim_id || !manifestDigests || !expectedAttestationEvidence ||
          !main || main.identity_digest !== row.authority_identity_digest ||
          !exactKeys(response, ["evidence", "kind", "public_response", "version"]) || response.kind !== "attestCompletion_response_envelope_v1" || response.version !== 1 ||
          !exactKeys(evidence, ["attestation_digest", "attestation_evidence", "cas_digest", "cas_input", "claim_id", "effect_manifest_digest", "pre_start_boundary_digest", "request", "request_digest", "scope_key"]) ||
          evidence.claim_id !== claim.claim_id || evidence.effect_manifest_digest !== manifestDigests.effect_manifest_digest || evidence.pre_start_boundary_digest !== manifestDigests.pre_start_boundary_digest ||
          evidence.attestation_digest !== expectedAttestationDigest || !sameValue(evidence.attestation_evidence, expectedAttestationEvidence) ||
          !validHistoricalWriterFence(cas.writer_fence_v1) || !exactKeys(cas.main_authority_v1, ["binding_epoch", "identity_digest", "main_binding_id"]) ||
          cas.main_authority_v1.main_binding_id !== main.main_binding_id || cas.main_authority_v1.binding_epoch !== main.binding_epoch || cas.main_authority_v1.identity_digest !== main.identity_digest ||
          !sameValue(evidence.request, expectedRequest) || !sameValue(cas, expectedCas) || evidence.scope_key !== `handoff:${row.handoff_id}:generation:${row.generation}:attest` ||
          committed.scope_key !== evidence.scope_key || evidence.request_digest !== requestDigest(expectedRequest) || evidence.cas_digest !== requestDigest(expectedCas) ||
          row.request_digest !== evidence.request_digest || row.cas_digest !== evidence.cas_digest || committed.request_digest !== evidence.request_digest || committed.cas_digest !== evidence.cas_digest ||
          !sameValue(response.public_response, publicResponse) || row.response_digest !== requestDigest(publicResponse) || row.decision_digest !== expectedAttestationDigest ||
          row.authority_binding_id !== main.main_binding_id) throw ctError("CT_SCHEMA_INVALID")
    }

    // P5-C: every historical COMPLETE row is re-verified byte-exact against
    // its own claim, delivery, handoff, and the persisted ATTEST_COMPLETION
    // decision_digest it consumes — single-use is structural because the
    // state CAS moves COMPLETION_ATTESTED->COMPLETED exactly once and this
    // is always the final row for its handoff (the top-of-history check
    // above already pinned COMPLETED as this row's own to_state). REJECT and
    // RECOVER remain unreachable here because futureHistoryPresent above
    // already rejected them.
    for (const { row, committed, response } of transitionRecords) {
      if (row.operation !== "COMPLETE") continue
      const handoff = handoffs.get(row.handoff_id)
      const claim = [...claims.values()].find((entry) => entry.handoff_id === row.handoff_id && entry.generation === row.generation)
      const delivery = claim && deliveries.get(claim.delivery_id)
      const attestationDigest = attestationDigestFor(row.handoff_id, row.generation)
      const evidence = response?.evidence, cas = evidence?.cas_input
      const authorityBinding = bindings.get(cas?.claimant_authority_v1?.binding_id)
      const expectedRequest = claim && delivery && attestationDigest && evidence?.committed_result && { request_identity: row.request_identity, delivery_id: delivery.delivery_id, id: row.handoff_id,
        es: "COMPLETION_ATTESTED", eg: row.generation, purpose: claim.purpose, attestation_digest: attestationDigest, committed_result: evidence.committed_result, token_hash: claim.token_hash }
      const expectedCas = claim && delivery && attestationDigest && evidence?.result_digest && { kind: "complete_cas_v1", version: 1, writer_fence_v1: cas?.writer_fence_v1, claimant_authority_v1: cas?.claimant_authority_v1,
        delivery_id: delivery.delivery_id, id: row.handoff_id, expected_delivery_state: "CLAIMED", expected_handoff_state: "COMPLETION_ATTESTED", expected_generation: row.generation,
        purpose: claim.purpose, claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, token_hash: claim.token_hash,
        attestation_digest: attestationDigest, expected_claim_state: "LIVE", result_digest: evidence.result_digest }
      const publicResponse = { id: row.handoff_id, state: "COMPLETED", generation: row.generation, replayed: false }
      const decision = claim && attestationDigest && evidence?.result_digest && requestDigest({ kind: "complete_decision_v1", version: 1, delivery_id: delivery?.delivery_id, id: row.handoff_id,
        from_state: "COMPLETION_ATTESTED", to_state: "COMPLETED", generation: row.generation, purpose: claim.purpose, claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest,
        token_hash: claim.token_hash, attestation_digest: attestationDigest, result_digest: evidence.result_digest })
      if (!handoff || handoff.state !== "COMPLETED" || handoff.generation !== row.generation || !claim || claim.claim_state !== "CLOSED" || claim.closed_at !== row.occurred_at ||
          !delivery || delivery.delivery_state !== "CLOSED" || delivery.closed_at !== row.occurred_at || delivery.claim_id !== claim.claim_id || !attestationDigest ||
          !authorityBinding || authorityBinding.identity_digest !== cas?.claimant_authority_v1?.identity_digest ||
          claim.claimant_binding_id !== authorityBinding.binding_id || claim.claimant_identity_digest !== authorityBinding.identity_digest || claim.claimant_ctx_digest !== cas.claimant_authority_v1.ctx_digest ||
          !exactKeys(response, ["evidence", "kind", "public_response", "version"]) || response.kind !== "complete_response_envelope_v1" || response.version !== 1 ||
          !exactKeys(evidence, ["attestation_digest", "cas_digest", "cas_input", "claim_id", "committed_result", "delivery_id", "request", "request_digest", "result_digest", "scope_key", "token_hash"]) ||
          evidence.claim_id !== claim.claim_id || evidence.delivery_id !== delivery.delivery_id || evidence.token_hash !== claim.token_hash || evidence.attestation_digest !== attestationDigest ||
          !validCommittedResult(evidence.committed_result, row.handoff_id, row.generation, attestationDigest) || evidence.result_digest !== evidence.committed_result?.result_digest ||
          !validHistoricalWriterFence(cas.writer_fence_v1) || !exactKeys(cas.claimant_authority_v1, ["binding_id", "ctx_digest", "identity_digest"]) ||
          !sameValue(evidence.request, expectedRequest) || !sameValue(cas, expectedCas) || evidence.scope_key !== `handoff:${row.handoff_id}:generation:${row.generation}:complete` ||
          committed.scope_key !== evidence.scope_key || evidence.request_digest !== requestDigest(expectedRequest) || evidence.cas_digest !== requestDigest(expectedCas) ||
          row.request_digest !== evidence.request_digest || row.cas_digest !== evidence.cas_digest || committed.request_digest !== evidence.request_digest || committed.cas_digest !== evidence.cas_digest ||
          !sameValue(response.public_response, publicResponse) || row.response_digest !== requestDigest(publicResponse) || row.decision_digest !== decision ||
          row.authority_binding_id !== authorityBinding.binding_id || row.authority_identity_digest !== authorityBinding.identity_digest) throw ctError("CT_SCHEMA_INVALID")
    }

    // P5-D: REJECT is reconstructed from the handoff's exact safe source
    // state and its optional unclaimed PENDING delivery. The closed delivery
    // id is server-derived and the transition/envelope must bind it exactly.
    for (const { row, committed, response } of transitionRecords) {
      if (row.operation !== "REJECT") continue
      const handoff = handoffs.get(row.handoff_id), main = mains.get(row.authority_binding_id)
      const deliveriesForHandoff = [...deliveries.values()].filter((entry) => entry.handoff_id === row.handoff_id && entry.generation === row.generation)
      const claimsForHandoff = [...claims.values()].filter((entry) => entry.handoff_id === row.handoff_id && entry.generation === row.generation)
      const delivery = row.from_state === "PUBLISHED" && deliveriesForHandoff.length === 1 ? deliveriesForHandoff[0] : null
      const closedDeliveryId = delivery?.delivery_id ?? null
      const evidence = response?.evidence, cas = evidence?.cas_input
      const expectedRequest = { request_identity: row.request_identity, id: row.handoff_id, es: row.from_state, eg: row.generation }
      const expectedCas = handoff && main && { kind: "reject_cas_v1", version: 1, writer_fence_v1: cas?.writer_fence_v1,
        main_authority_v1: { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest },
        id: row.handoff_id, expected_state: row.from_state, expected_generation: row.generation, handoff_fingerprint: handoff.handoff_fingerprint,
        expected_delivery: row.from_state === "PUBLISHED" ? "PENDING_UNCLAIMED" : "ABSENT", delivery_id: closedDeliveryId }
      const publicResponse = { id: row.handoff_id, state: "REJECTED", generation: row.generation, replayed: false }
      const decision = requestDigest({ kind: "reject_decision_v1", version: 1, id: row.handoff_id, from_state: row.from_state,
        to_state: "REJECTED", generation: row.generation, closed_delivery_id: closedDeliveryId })
      if (!handoff || handoff.state !== "REJECTED" || !main || main.identity_digest !== row.authority_identity_digest ||
          !exactKeys(response, ["evidence", "kind", "public_response", "version"]) || response.kind !== "reject_response_envelope_v1" || response.version !== 1 ||
          !exactKeys(evidence, ["cas_digest", "cas_input", "closed_delivery_id", "request", "request_digest", "scope_key"]) ||
          evidence.closed_delivery_id !== closedDeliveryId || !sameValue(evidence.request, expectedRequest) || !sameValue(cas, expectedCas) ||
          !validHistoricalWriterFence(cas?.writer_fence_v1) || !exactKeys(cas?.main_authority_v1, ["binding_epoch", "identity_digest", "main_binding_id"]) ||
          evidence.scope_key !== `handoff:${row.handoff_id}:generation:${row.generation}:reject` || committed.scope_key !== evidence.scope_key ||
          evidence.request_digest !== requestDigest(expectedRequest) || evidence.cas_digest !== requestDigest(expectedCas) ||
          row.request_digest !== evidence.request_digest || row.cas_digest !== evidence.cas_digest || committed.request_digest !== evidence.request_digest || committed.cas_digest !== evidence.cas_digest ||
          !sameValue(response.public_response, publicResponse) || row.response_digest !== requestDigest(publicResponse) || row.decision_digest !== decision ||
          row.authority_binding_id !== main.main_binding_id || (row.from_state === "PUBLISHED"
            ? (!delivery || delivery.delivery_state !== "CLOSED" || delivery.claim_id !== null || delivery.closed_at !== row.occurred_at || claimsForHandoff.length !== 0)
            : deliveriesForHandoff.length !== 0 || claimsForHandoff.length !== 0)) throw ctError("CT_SCHEMA_INVALID")
    }

    // P5-D: REVISE is the origin transition of the new handoff. Its persisted
    // request, CAS, result, and decision must bind one exact REJECTED N source
    // to one immutable DRAFT N+1 target; no prior row is rewritten.
    for (const { row, committed, response } of transitionRecords) {
      if (row.operation !== "REVISE") continue
      const handoff = handoffs.get(row.handoff_id), evidence = response?.evidence, cas = evidence?.cas_input
      const source = handoffs.get(evidence?.source_id), main = mains.get(row.authority_binding_id)
      const payload = handoff && canonicalJson(handoff.payload_json, 65536)
      const expectedRequest = handoff && source && { request_identity: row.request_identity, source_id: source.id, lineage_id: handoff.lineage_id,
        revision: handoff.revision, payload, payload_digest: handoff.payload_digest }
      const expectedCas = handoff && source && main && { kind: "revise_cas_v1", version: 1, writer_fence_v1: cas?.writer_fence_v1,
        main_authority_v1: { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest },
        lineage_id: handoff.lineage_id, target_revision: handoff.revision, source_id: source.id, source_revision: source.revision,
        source_expected_state: "REJECTED", payload_digest: handoff.payload_digest, handoff_fingerprint: handoff.handoff_fingerprint,
        expected_lineage_revision: "ABSENT" }
      const publicResponse = handoff && { id: handoff.id, state: "DRAFT", generation: 0, revision: handoff.revision, replayed: false }
      const decision = handoff && source && requestDigest({ kind: "revise_decision_v1", version: 1, new_id: handoff.id, lineage_id: handoff.lineage_id,
        revision: handoff.revision, source_id: source.id, source_revision: source.revision, new_handoff_fingerprint: handoff.handoff_fingerprint })
      const sourceReject = source && recordsFor(source.id, "REJECT")
      if (!handoff || !source || source.state !== "REJECTED" || source.lineage_id !== handoff.lineage_id || source.revision + 1 !== handoff.revision ||
          sourceReject.length !== 1 || sourceReject[0].row.occurred_at > row.occurred_at || row.occurred_at !== handoff.created_at ||
          handoff.producer_binding_id !== main?.main_binding_id || handoff.producer_identity_digest !== main?.identity_digest ||
          !exactKeys(response, ["evidence", "kind", "public_response", "version"]) || response.kind !== "revise_response_envelope_v1" || response.version !== 1 ||
          !exactKeys(evidence, ["cas_digest", "cas_input", "new_handoff_fingerprint", "new_id", "request", "request_digest", "scope_key", "source_id", "source_revision"]) ||
          evidence.new_id !== handoff.id || evidence.new_handoff_fingerprint !== handoff.handoff_fingerprint || evidence.source_id !== source.id || evidence.source_revision !== source.revision ||
          !sameValue(evidence.request, expectedRequest) || !sameValue(cas, expectedCas) || !validHistoricalWriterFence(cas?.writer_fence_v1) ||
          !exactKeys(cas?.main_authority_v1, ["binding_epoch", "identity_digest", "main_binding_id"]) ||
          evidence.scope_key !== `handoff:${handoff.lineage_id}:revision:${handoff.revision}` || committed.scope_key !== evidence.scope_key ||
          evidence.request_digest !== requestDigest(expectedRequest) || evidence.cas_digest !== requestDigest(expectedCas) ||
          row.request_digest !== evidence.request_digest || row.cas_digest !== evidence.cas_digest || committed.request_digest !== evidence.request_digest || committed.cas_digest !== evidence.cas_digest ||
          !sameValue(response.public_response, publicResponse) || row.response_digest !== requestDigest(publicResponse) || row.decision_digest !== decision ||
          row.authority_binding_id !== main?.main_binding_id || row.authority_identity_digest !== main?.identity_digest) throw ctError("CT_SCHEMA_INVALID")
    }

    for (const { row, committed, response } of transitionRecords) {
      if (["ACK", "ATTEST_COMPLETION", "COMPLETE", "REJECT"].includes(row.operation)) {
        const handoff = handoffs.get(row.handoff_id)
        const handoffClaims = [...claims.values()].filter((claim) => claim.handoff_id === row.handoff_id && claim.generation === row.generation)
        const handoffDeliveries = [...deliveries.values()].filter((delivery) => delivery.handoff_id === row.handoff_id && delivery.generation === row.generation)
        const claim = handoffClaims.length === 1 ? handoffClaims[0] : null
        const delivery = row.operation === "REJECT"
          ? (claim ? deliveries.get(claim.delivery_id) : handoffDeliveries.length === 1 ? handoffDeliveries[0] : null)
          : (claim ? deliveries.get(claim.delivery_id) : null)
        if (["ACK", "ATTEST_COMPLETION"].includes(row.operation) && (!claim || !delivery || delivery.claim_id !== claim.claim_id ||
            !((claim.claim_state === "LIVE" && delivery.delivery_state === "CLAIMED") || (claim.claim_state === "CLOSED" && delivery.delivery_state === "CLOSED")) ||
            claim.created_at > row.occurred_at || delivery.claimed_at > row.occurred_at)) throw ctError("CT_SCHEMA_INVALID")
        if (row.operation === "COMPLETE" && (!claim || !delivery || claim.claim_state !== "CLOSED" || delivery.delivery_state !== "CLOSED" ||
            claim.closed_at !== row.occurred_at || delivery.closed_at !== row.occurred_at)) throw ctError("CT_SCHEMA_INVALID")
        if (row.operation === "REJECT" && (row.from_state === "PUBLISHED"
          ? (!delivery || claim || delivery.delivery_state !== "CLOSED" || delivery.closed_at !== row.occurred_at)
          : handoffDeliveries.length !== 0 || handoffClaims.length !== 0)) throw ctError("CT_SCHEMA_INVALID")
        if (!handoff || row.occurred_at < handoff.created_at) throw ctError("CT_SCHEMA_INVALID")
      }
    }

    // P6-B (corrective): real RECOVER validator replacing `dormantOperations`
    // (which guessed the disposition from `from_state` alone and had no proof
    // member). Derives disposition from the map above, cross-checks every
    // field against the reverse-linked ct_recovery_disposition row `recover()`
    // (P6-D) writes. Reachable only at schema 5.
    if (version === 5) {
      const recoveryDispositions = new Map(db.query("SELECT * FROM ct_recovery_disposition").all()
        .map((row) => [`${row.handoff_id}:${row.from_generation}:${row.disposition}`, row]))
      for (const { row, committed, response } of transitionRecords) {
        if (row.operation !== "RECOVER") continue
        const disposition = recoverDisposition(row)
        const generationIncrement = recoverGenerationIncrementDispositions.has(disposition) ? 1 : 0
        const fromGeneration = row.generation - generationIncrement
        const dispositionRow = recoveryDispositions.get(`${row.handoff_id}:${fromGeneration}:${disposition}`)
        const handoff = handoffs.get(row.handoff_id)
        const handoffClaims = [...claims.values()].filter((claim) => claim.handoff_id === row.handoff_id && claim.generation === fromGeneration)
        const handoffDeliveries = [...deliveries.values()].filter((delivery) => delivery.handoff_id === row.handoff_id && delivery.generation === fromGeneration)
        // P6-F: REDELIVER_WORK/REDELIVER_ATTESTATION close no delivery/claim
        // (design.md:1797/1799) even though a now-CLOSED row from the prior
        // SUSPEND_PENDING/SUSPEND_ATTESTATION still exists at fromGeneration;
        // the closed/claim references for these two dispositions are always null.
        const isRedelivery = recoverRedeliveryActions.has(disposition)
        const claim = isRedelivery ? null : (handoffClaims.length === 1 ? handoffClaims[0] : null)
        const delivery = isRedelivery ? null : (claim ? deliveries.get(claim.delivery_id) : handoffDeliveries.length === 1 ? handoffDeliveries[0] : null)
        const createdDelivery = generationIncrement && dispositionRow ? deliveries.get(dispositionRow.created_delivery_id) : null
        const authorityRow = row.authority_kind === "MAIN" ? mains.get(row.authority_binding_id) : null
        const evidence = response?.evidence, cas = evidence?.cas_input, writerFence = cas?.writer_fence_v1
        const expectedDeliveryId = delivery?.delivery_id ?? null, expectedClaimId = claim?.claim_id ?? null
        const expectedCreatedDeliveryId = createdDelivery?.delivery_id ?? null
        const expectedRequest = { request_identity: row.request_identity, id: row.handoff_id, es: row.from_state, eg: fromGeneration,
          action: disposition, expected_rollback_epoch: dispositionRow?.rollback_epoch, delivery_id: expectedDeliveryId,
          claim_id: expectedClaimId, rollback_proof: disposition === "ROLLED_BACK" ? evidence?.rollback_proof : null }
        const expectedCas = dispositionRow && handoff && authorityRow && { kind: `${disposition.toLowerCase()}_cas_v1`, version: 1,
          writer_fence_v1: writerFence,
          main_authority_v1: { main_binding_id: authorityRow.main_binding_id, binding_epoch: authorityRow.binding_epoch, identity_digest: authorityRow.identity_digest },
          id: row.handoff_id, disposition, expected_state: row.from_state, expected_generation: fromGeneration, target_generation: row.generation,
          expected_rollback_epoch: dispositionRow.rollback_epoch, expected_lease_version: dispositionRow.lease_version,
          expected_lease_status: dispositionRow.mode === "ON" ? "NONE" : "ACTIVE", expected_delivery_state: delivery ? claim ? "CLAIMED" : "PENDING" : "ABSENT",
          expected_claim_state: claim ? "LIVE" : "ABSENT", delivery_id: expectedDeliveryId, claim_id: expectedClaimId,
          handoff_fingerprint: handoff.handoff_fingerprint, termination_pairing_digest: dispositionRow.termination_pairing_digest,
          rollback_proof_digest: dispositionRow.rollback_proof_digest, frozen_inventory_digest: dispositionRow.frozen_inventory_digest,
          preserved_attestation_digest: dispositionRow.preserved_attestation_digest }
        const expectedDecision = dispositionRow && { kind: "recover_decision_v1", version: 1, disposition, id: row.handoff_id,
          from_state: row.from_state, to_state: row.to_state, from_generation: fromGeneration, to_generation: row.generation,
          rollback_epoch: dispositionRow.rollback_epoch, closed_delivery_id: expectedDeliveryId, closed_claim_id: expectedClaimId,
          created_delivery_id: expectedCreatedDeliveryId, termination_pairing_digest: dispositionRow.termination_pairing_digest,
          rollback_proof_digest: dispositionRow.rollback_proof_digest, frozen_inventory_digest: dispositionRow.frozen_inventory_digest,
          preserved_attestation_digest: dispositionRow.preserved_attestation_digest }
        const expectedScope = `handoff:${row.handoff_id}:generation:${fromGeneration}:${disposition.toLowerCase()}`
        const expectedPublicResponse = { id: row.handoff_id, state: row.to_state, generation: row.generation, replayed: false }
        const rollbackProofValid = disposition !== "ROLLED_BACK" ? evidence?.rollback_proof === null && dispositionRow?.rollback_proof_digest === null : (() => {
          const ack = recordsFor(row.handoff_id, "ACK").find(({ row: ackRow }) => ackRow.generation === fromGeneration)
          const manifest = ack?.response?.evidence?.request?.effect_manifest, preStart = ack?.response?.evidence?.pre_start_boundary_digest
          return Boolean(manifest && preStart && validRollbackProof(evidence?.rollback_proof, row.handoff_id, fromGeneration, manifest, preStart) &&
            evidence.rollback_proof.boundary_equal === true && rollbackProofDigest(evidence.rollback_proof) === dispositionRow.rollback_proof_digest)
        })()
        const attestationRows = disposition === "SUSPEND_ATTESTATION" || disposition === "REDELIVER_ATTESTATION"
          ? recordsFor(row.handoff_id, "ATTEST_COMPLETION").filter(({ row: attestRow }) => attestRow.generation === dispositionRow?.attestation_source_generation)
          : []
        const suspensionRows = disposition === "REDELIVER_ATTESTATION"
          ? [...recoveryDispositions.values()].filter((candidate) => candidate.handoff_id === row.handoff_id && candidate.disposition === "SUSPEND_ATTESTATION" && candidate.to_generation === fromGeneration)
          : []
        const attestationSourceValid = disposition === "SUSPEND_ATTESTATION"
          ? attestationRows.length === 1 && dispositionRow.preserved_attestation_digest === attestationRows[0].row.decision_digest && dispositionRow.attestation_source_generation === fromGeneration
          : disposition === "REDELIVER_ATTESTATION"
            ? attestationRows.length === 1 && suspensionRows.length === 1 && dispositionRow.preserved_attestation_digest === attestationRows[0].row.decision_digest &&
              dispositionRow.preserved_attestation_digest === suspensionRows[0].preserved_attestation_digest && dispositionRow.attestation_source_generation === suspensionRows[0].attestation_source_generation
            : dispositionRow?.preserved_attestation_digest === null && dispositionRow?.attestation_source_generation === null
        const claimant = claim ? bindings.get(claim.claimant_binding_id) : null
        let terminationPairingValid = !claim && dispositionRow?.termination_pairing_digest === null
        if (claim && claimant && dispositionRow?.termination_pairing_digest) {
          try {
            const pairing = verifyTerminationPairing(db, { subjectBindingId: claimant.binding_id, subjectBindingEpoch: claimant.binding_epoch,
              subjectIdentityDigest: claimant.identity_digest, rollbackEpoch: dispositionRow.rollback_epoch, generation: fromGeneration,
              subjectKind: "CLAIMANT", handoffId: row.handoff_id, leaseVersion: dispositionRow.lease_version,
              hostProcessInstance: claimant.host_process_instance, pluginInstance: claimant.plugin_instance, rootSessionId: claimant.root_session_id,
              mcpProcessInstance: claimant.mcp_process_instance, pidStartMarker: claimant.pid_start_marker }, false)
            terminationPairingValid = claim.claimant_identity_digest === claimant.identity_digest && pairing.pairing_digest === dispositionRow.termination_pairing_digest
          } catch { terminationPairingValid = false }
        }
        if (row.authority_kind !== "MAIN" || !authorityRow || !dispositionRow || dispositionRow.handoff_id !== row.handoff_id ||
            dispositionRow.from_generation !== fromGeneration || dispositionRow.to_generation !== row.generation || dispositionRow.from_state !== row.from_state ||
            dispositionRow.to_state !== row.to_state || dispositionRow.disposition !== disposition || dispositionRow.main_binding_id !== authorityRow.main_binding_id ||
            dispositionRow.main_binding_epoch !== authorityRow.binding_epoch || dispositionRow.main_identity_digest !== authorityRow.identity_digest ||
            dispositionRow.request_identity !== row.request_identity || dispositionRow.occurred_at !== row.occurred_at ||
            dispositionRow.closed_delivery_id !== expectedDeliveryId || dispositionRow.closed_claim_id !== expectedClaimId ||
            dispositionRow.created_delivery_id !== expectedCreatedDeliveryId || dispositionRow.mode !== writerFence?.mode ||
            dispositionRow.rollback_epoch !== writerFence?.observed_rollback_epoch || dispositionRow.lease_version !== writerFence?.observed_lease_version) throw ctError("CT_SCHEMA_INVALID")
        if (!validHistoricalWriterFence(writerFence, disposition) || !rollbackProofValid || !terminationPairingValid || !attestationSourceValid ||
            !exactKeys(response, ["evidence", "kind", "public_response", "version"]) || response.kind !== `${disposition.toLowerCase()}_response_envelope_v1` || response.version !== 1 ||
            !exactKeys(evidence, ["attestation_source_generation", "cas_digest", "cas_input", "closed_claim_id", "closed_delivery_id", "created_delivery_id", "disposition_id", "frozen_inventory_digest", "preserved_attestation_digest", "request", "request_digest", "rollback_proof", "rollback_proof_digest", "scope_key", "termination_pairing_digest"]) ||
            !exactKeys(evidence.request, ["action", "claim_id", "delivery_id", "eg", "es", "expected_rollback_epoch", "id", "request_identity", "rollback_proof"]) ||
            !sameValue(evidence.request, expectedRequest) || !sameValue(cas, expectedCas) || evidence.scope_key !== expectedScope || committed.scope_key !== expectedScope ||
            evidence.request_digest !== requestDigest(expectedRequest) || evidence.cas_digest !== requestDigest(expectedCas) ||
            evidence.disposition_id !== dispositionRow.disposition_id || evidence.closed_delivery_id !== expectedDeliveryId ||
            evidence.closed_claim_id !== expectedClaimId || evidence.created_delivery_id !== expectedCreatedDeliveryId ||
            evidence.termination_pairing_digest !== dispositionRow.termination_pairing_digest || evidence.rollback_proof_digest !== dispositionRow.rollback_proof_digest ||
            evidence.frozen_inventory_digest !== dispositionRow.frozen_inventory_digest || evidence.preserved_attestation_digest !== dispositionRow.preserved_attestation_digest ||
            evidence.attestation_source_generation !== dispositionRow.attestation_source_generation ||
            dispositionRow.request_digest !== evidence.request_digest || dispositionRow.cas_digest !== evidence.cas_digest ||
            dispositionRow.disposition_digest !== requestDigest(expectedDecision) || row.request_digest !== evidence.request_digest || row.cas_digest !== evidence.cas_digest ||
            row.decision_digest !== dispositionRow.disposition_digest || committed.request_digest !== evidence.request_digest || committed.cas_digest !== evidence.cas_digest ||
            !sameValue(response.public_response, expectedPublicResponse) || row.response_digest !== requestDigest(expectedPublicResponse)) throw ctError("CT_SCHEMA_INVALID")
        const closesDelivery = ["NOT_STARTED", "ROLLED_BACK", "CANCELLED", "POISONED", "SUSPEND_PENDING", "SUSPEND_ATTESTATION"].includes(disposition)
        if (closesDelivery && delivery && (delivery.delivery_state !== "CLOSED" || delivery.closed_at !== row.occurred_at)) throw ctError("CT_SCHEMA_INVALID")
        if (["NOT_STARTED", "ROLLED_BACK", "CANCELLED", "POISONED", "SUSPEND_ATTESTATION"].includes(disposition) && claim && (claim.claim_state !== "CLOSED" || claim.closed_at !== row.occurred_at)) throw ctError("CT_SCHEMA_INVALID")
        if (generationIncrement && (!createdDelivery || createdDelivery.created_at !== row.occurred_at || !["PENDING", "CLAIMED", "CLOSED"].includes(createdDelivery.delivery_state))) throw ctError("CT_SCHEMA_INVALID")
        if (!handoff || row.occurred_at < handoff.created_at) throw ctError("CT_SCHEMA_INVALID")
      }
    }

    const envelopeKinds = { CREATE: "create_response_envelope_v1", VALIDATE: "validate_response_envelope_v1", PUBLISH: "publish_response_envelope_v1", CLAIM: "claim_response_envelope_v1" }
    for (const { row, committed, response } of transitionRecords) {
      if (!envelopeKinds[row.operation]) continue
      const handoff = handoffs.get(row.handoff_id), payload = JSON.parse(handoff.payload_json), evidence = response.evidence, cas = evidence?.cas_input
      const extraEvidence = { CREATE: [], VALIDATE: ["validation_digest"], PUBLISH: ["delivery_id", "validation_digest"],
        CLAIM: ["budget_scope_digest", "budget_sequence", "claim_id", "claimant_fence_digest", "token_hash"] }[row.operation]
      if (response.kind !== envelopeKinds[row.operation] || !exactKeys(evidence, ["cas_digest", "cas_input", ...extraEvidence, "request", "request_digest", "scope_key"]) ||
          !evidence.request || evidence.request.request_identity !== row.request_identity || evidence.request_digest !== requestDigest(evidence.request) ||
          evidence.cas_digest !== requestDigest(cas) || committed.scope_key !== evidence.scope_key || committed.request_digest !== evidence.request_digest ||
          committed.cas_digest !== evidence.cas_digest || row.request_digest !== evidence.request_digest || row.cas_digest !== evidence.cas_digest || !validHistoricalWriterFence(cas?.writer_fence_v1)) throw ctError("CT_SCHEMA_INVALID")

      let expectedRequest, expectedCas, expectedScope, publicResponse, decision, reverseValid
      if (row.operation === "CREATE") {
        const producerAuthority = { binding_id: handoff.producer_binding_id, identity_digest: handoff.producer_identity_digest, ctx_digest: handoff.producer_ctx_digest }
        expectedRequest = { request_identity: row.request_identity, lineage_id: handoff.lineage_id, revision: handoff.revision, payload, payload_digest: handoff.payload_digest }
        expectedScope = `handoff:${handoff.lineage_id}:revision:${handoff.revision}`
        expectedCas = { kind: "create_cas_v1", version: 1, writer_fence_v1: cas.writer_fence_v1, producer_authority_v1: producerAuthority,
          lineage_id: handoff.lineage_id, revision: handoff.revision, payload_digest: handoff.payload_digest, expected_lineage_revision: "ABSENT" }
        publicResponse = { id: handoff.id, state: "DRAFT", generation: 0, replayed: false }; decision = null
        reverseValid = row.occurred_at === handoff.created_at && row.authority_binding_id === handoff.producer_binding_id && row.authority_identity_digest === handoff.producer_identity_digest
      } else if (row.operation === "VALIDATE") {
        const main = mains.get(row.authority_binding_id)
        const mainAuthority = main && { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
        expectedRequest = { request_identity: row.request_identity, id: handoff.id, es: "DRAFT", eg: row.generation, payload_digest: handoff.payload_digest }
        expectedScope = `handoff:${handoff.id}:generation:${row.generation}:validate`
        expectedCas = { kind: "validate_cas_v1", version: 1, writer_fence_v1: cas.writer_fence_v1, main_authority_v1: mainAuthority,
          id: handoff.id, expected_state: "DRAFT", expected_generation: row.generation, payload_digest: handoff.payload_digest, handoff_fingerprint: handoff.handoff_fingerprint, validation_digest: handoff.validation_digest }
        publicResponse = { id: handoff.id, state: "VALIDATED", generation: row.generation, replayed: false }; decision = handoff.validation_digest
        reverseValid = Boolean(main) && evidence.validation_digest === handoff.validation_digest && handoff.validated_at === row.occurred_at
      } else if (row.operation === "PUBLISH") {
        const main = mains.get(row.authority_binding_id), delivery = deliveries.get(evidence.delivery_id)
        const mainAuthority = main && { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
        expectedRequest = { request_identity: row.request_identity, id: handoff.id, es: "VALIDATED", eg: row.generation }
        expectedScope = `handoff:${handoff.id}:generation:${row.generation}:publish`
        expectedCas = { kind: "publish_cas_v1", version: 1, writer_fence_v1: cas.writer_fence_v1, main_authority_v1: mainAuthority,
          id: handoff.id, expected_state: "VALIDATED", expected_generation: row.generation, payload_digest: handoff.payload_digest, handoff_fingerprint: handoff.handoff_fingerprint, validation_digest: handoff.validation_digest, expected_delivery: "ABSENT" }
        publicResponse = { id: handoff.id, state: "PUBLISHED", generation: row.generation, replayed: false }; decision = handoff.validation_digest
        reverseValid = Boolean(main) && evidence.validation_digest === handoff.validation_digest && Boolean(delivery) && delivery.handoff_id === handoff.id && delivery.generation === row.generation &&
          delivery.purpose === "WORK" && delivery.handoff_state_snapshot === "PUBLISHED" && delivery.created_at === row.occurred_at && handoff.published_at === row.occurred_at
      } else {
        const claim = claimsByRequest.get(row.request_identity), delivery = claim && deliveries.get(claim.delivery_id), binding = claim && bindings.get(claim.claimant_binding_id)
        const claimantAuthority = claim && { binding_id: claim.claimant_binding_id, identity_digest: claim.claimant_identity_digest, ctx_digest: claim.claimant_ctx_digest }
        expectedRequest = claim && delivery && { request_identity: row.request_identity, delivery_id: delivery.delivery_id, id: handoff.id, es: row.from_state, eg: row.generation, purpose: claim.purpose }
        expectedScope = delivery && `delivery:${delivery.delivery_id}:claim`
        expectedCas = claim && delivery && { kind: "claim_cas_v1", version: 1, writer_fence_v1: cas.writer_fence_v1, claimant_authority_v1: claimantAuthority,
          delivery_id: delivery.delivery_id, id: handoff.id, expected_delivery_state: "PENDING", expected_handoff_state: row.from_state, expected_generation: row.generation, purpose: claim.purpose,
          handoff_fingerprint: handoff.handoff_fingerprint, budget_scope_digest: claim.budget_scope_digest, budget_limit: 1, observed_budget_consumed: 0, target_budget_sequence: 1, token_scheme: "hmac-sha256-anchor-v1" }
        publicResponse = claim && delivery && { kind: "claim_response_v1", version: 1, id: handoff.id, state: row.to_state, generation: row.generation, delivery_id: delivery.delivery_id, purpose: claim.purpose, replayed: false }
        const fence = claim && delivery && { kind: "claimant_fence_v1", version: 1, delivery_id: delivery.delivery_id, id: handoff.id, generation: row.generation, purpose: claim.purpose,
          claimant_binding_id: claim.claimant_binding_id, claimant_identity_digest: claim.claimant_identity_digest, claimant_ctx_digest: claim.claimant_ctx_digest,
          observed_rollback_epoch: cas.writer_fence_v1.observed_rollback_epoch, observed_lease_version: cas.writer_fence_v1.observed_lease_version, budget_scope_digest: claim.budget_scope_digest, budget_sequence: 1 }
        const material = claim && delivery && { kind: "claim_token_v1", version: 1, claim_id: claim.claim_id, delivery_id: delivery.delivery_id, id: handoff.id, generation: row.generation, purpose: claim.purpose, claimant_fence_digest: claim.claimant_fence_digest, token_salt: claim.token_salt }
        const token = material && createHmac("sha256", Buffer.from(authority.anchor.anchor_secret, "base64url")).update(jcs(material)).digest("base64url")
        decision = claim && delivery && requestDigest({ kind: "claim_decision_v1", version: 1, delivery_id: delivery.delivery_id, id: handoff.id, from_state: row.from_state, to_state: row.to_state, generation: row.generation, purpose: claim.purpose,
          claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, budget_scope_digest: claim.budget_scope_digest, budget_sequence: 1, token_hash: claim.token_hash })
        reverseValid = Boolean(claim && delivery && binding) && claim.handoff_id === handoff.id && claim.generation === row.generation &&
          sameValue({ claim_id: evidence.claim_id, claimant_fence_digest: evidence.claimant_fence_digest, budget_scope_digest: evidence.budget_scope_digest, budget_sequence: evidence.budget_sequence, token_hash: evidence.token_hash },
            { claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, budget_scope_digest: claim.budget_scope_digest, budget_sequence: 1, token_hash: claim.token_hash }) &&
          claim.claimant_fence_digest === requestDigest(fence) && claim.token_hash === sha256(Buffer.from(token)) && claim.request_digest === row.request_digest && claim.cas_digest === row.cas_digest &&
          claim.created_at === row.occurred_at && delivery.claimed_at === row.occurred_at
      }
      if (!schema4ReverseLinkValid(row.operation, reverseValid && evidence.scope_key === expectedScope && sameValue(evidence.request, expectedRequest) && sameValue(cas, expectedCas) && sameValue(response.public_response, publicResponse) &&
          row.response_digest === requestDigest(publicResponse) && row.decision_digest === decision)) throw ctError("CT_SCHEMA_INVALID")
    }
    const persistedTransitionOperations = new Set(Object.values(transitionOperations))
    if (db.query("SELECT operation,request_identity FROM ct_idempotency").all().filter(({ operation }) => persistedTransitionOperations.has(operation)).some(({ operation, request_identity }) =>
      !transitionRecords.some(({ row }) => transitionOperations[row.operation] === operation && row.request_identity === request_identity))) throw ctError("CT_SCHEMA_INVALID")
    return { handoffs: handoffs.size, transitions: transitionRecords.length, deliveries: deliveries.size, claims: claims.size, budget_scopes: budgets.size }
  } catch (error) { throw error.code === "CT_SCHEMA_INVALID" ? error : ctError("CT_SCHEMA_INVALID", error) }
}
function validateSchema4BootstrapEnvelope(db, row, authority, historicalCas = undefined) {
  if (!row || !uuid.test(row.request_identity ?? "") || !rfc3339Milliseconds.test(row.committed_at ?? "")) throw ctError("CT_SCHEMA_INVALID")
  let envelope
  try { envelope = JSON.parse(row.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
  const request = envelope?.evidence?.request
  if (!request || Object.getPrototypeOf(request) !== Object.prototype ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(["expected_anchor_id", "expected_mode", "expected_schema_version", "request_identity", "target_schema_version"]) ||
      request.request_identity !== row.request_identity || request.expected_anchor_id !== authority.anchor.anchor_id ||
      request.expected_schema_version !== 3 || request.target_schema_version !== 4 || request.expected_mode !== "OFF") throw ctError("CT_SCHEMA_INVALID")
  const casInput = historicalCas ?? envelope?.evidence?.cas_input
  const casKeys = ["active_claimant_bindings", "delivery_plane", "derived_anchor_epoch", "derived_config_digest", "expected_anchor_id", "expected_mode", "expected_schema_version", "observed_activation_epoch", "observed_active_main_binding_epoch", "observed_active_main_binding_id", "observed_lease_status", "observed_lease_version", "observed_rollback_epoch", "target_schema_version"]
  if (!casInput || JSON.stringify(Object.keys(casInput).sort()) !== JSON.stringify(casKeys) ||
      casInput.expected_anchor_id !== authority.anchor.anchor_id || casInput.expected_schema_version !== 3 || casInput.target_schema_version !== 4 ||
      casInput.expected_mode !== "OFF" || casInput.derived_anchor_epoch !== 1 || casInput.derived_config_digest !== authority.anchor.config_digest ||
      !safeEpoch(casInput.observed_rollback_epoch) || !safeEpoch(casInput.observed_lease_version) || casInput.observed_lease_status !== "NONE" ||
      !safeEpoch(casInput.observed_active_main_binding_epoch) || (casInput.observed_active_main_binding_id !== null && !isBase64url32(casInput.observed_active_main_binding_id)) ||
      casInput.observed_activation_epoch !== 0 || casInput.active_claimant_bindings !== 0 || casInput.delivery_plane !== "ABSENT_SCHEMA_3") throw ctError("CT_SCHEMA_INVALID")
  const publicResponse = { anchor_id: authority.anchor.anchor_id, schema_version: 4, mode: "OFF", replayed: false }
  // Uses the frozen SCHEMA_MANIFESTS-derived digest, not a live db query: this
  // envelope validator is now also reached while the live database is at
  // schema 5 or later (P6-B), where a live `manifestEvidence(db, 4)` read
  // would incorrectly pick up post-schema-4 objects/migrations. The frozen
  // digest is exactly what a schema-4 database produced at migration time.
  const expected = { kind: "bootstrap_schema4_response_v1", version: 1, public_response: publicResponse, evidence: {
    request, request_digest: requestDigest(request), cas_input: casInput, cas_digest: requestDigest(casInput),
    migration_004_checksum: MIGRATION_004_CHECKSUM, schema_3_manifest_digest: expectedManifestDigest(3),
    schema_4_manifest_digest: expectedManifestDigest(4),
  } }
  if (row.request_digest !== expected.evidence.request_digest || row.cas_digest !== expected.evidence.cas_digest ||
      row.response_json !== jcs(expected)) throw ctError("CT_SCHEMA_INVALID")
  return envelope
}
const validateSchema4CommitEvidence = (db, authority) => validateSchema4BootstrapEnvelope(db,
  db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:3->4'").get(), authority)
// P6-B mirrors validateSchema4BootstrapEnvelope for the 4->5 lane: unlike the
// 3->4 envelope, the 4->5 CAS shape carries a real observed_activation_epoch
// (not forced 0) and the "SCHEMA_4_VALIDATED"/"ABSENT_SCHEMA_4" markers
// instead of "ABSENT_SCHEMA_3", since a non-empty delivery/recovery plane is
// legal at this boundary.
function validateSchema5BootstrapEnvelope(db, row, authority, historicalCas = undefined) {
  if (!row || !uuid.test(row.request_identity ?? "") || !rfc3339Milliseconds.test(row.committed_at ?? "")) throw ctError("CT_SCHEMA_INVALID")
  let envelope
  try { envelope = JSON.parse(row.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
  const request = envelope?.evidence?.request
  if (!request || Object.getPrototypeOf(request) !== Object.prototype ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(["expected_anchor_id", "expected_mode", "expected_schema_version", "request_identity", "target_schema_version"]) ||
      request.request_identity !== row.request_identity || request.expected_anchor_id !== authority.anchor.anchor_id ||
      request.expected_schema_version !== 4 || request.target_schema_version !== 5 || request.expected_mode !== "OFF") throw ctError("CT_SCHEMA_INVALID")
  const casInput = historicalCas ?? envelope?.evidence?.cas_input
  const casKeys = ["active_claimant_bindings", "delivery_plane", "derived_anchor_epoch", "derived_config_digest", "expected_anchor_id", "expected_mode", "expected_schema_version", "observed_activation_epoch", "observed_active_main_binding_epoch", "observed_active_main_binding_id", "observed_lease_status", "observed_lease_version", "observed_rollback_epoch", "recovery_plane", "target_schema_version"]
  if (!casInput || JSON.stringify(Object.keys(casInput).sort()) !== JSON.stringify(casKeys) ||
      casInput.expected_anchor_id !== authority.anchor.anchor_id || casInput.expected_schema_version !== 4 || casInput.target_schema_version !== 5 ||
      casInput.expected_mode !== "OFF" || casInput.derived_anchor_epoch !== 1 || casInput.derived_config_digest !== authority.anchor.config_digest ||
      !safeEpoch(casInput.observed_rollback_epoch) || !safeEpoch(casInput.observed_lease_version) || casInput.observed_lease_status !== "NONE" ||
      !safeEpoch(casInput.observed_active_main_binding_epoch) || (casInput.observed_active_main_binding_id !== null && !isBase64url32(casInput.observed_active_main_binding_id)) ||
      !safeEpoch(casInput.observed_activation_epoch) || casInput.active_claimant_bindings !== 0 ||
      casInput.delivery_plane !== "SCHEMA_4_VALIDATED" || casInput.recovery_plane !== "ABSENT_SCHEMA_4") throw ctError("CT_SCHEMA_INVALID")
  const publicResponse = { anchor_id: authority.anchor.anchor_id, schema_version: 5, mode: "OFF", replayed: false }
  // Same frozen-digest fix as validateSchema4BootstrapEnvelope: never read
  // live db objects here, since this validator can run at any schema >= 5.
  const expected = { kind: "bootstrap_schema5_response_v1", version: 1, public_response: publicResponse, evidence: {
    request, request_digest: requestDigest(request), cas_input: casInput, cas_digest: requestDigest(casInput),
    migration_005_checksum: MIGRATION_005_CHECKSUM, schema_4_manifest_digest: expectedManifestDigest(4),
    schema_5_manifest_digest: expectedManifestDigest(5),
  } }
  if (row.request_digest !== expected.evidence.request_digest || row.cas_digest !== expected.evidence.cas_digest ||
      row.response_json !== jcs(expected)) throw ctError("CT_SCHEMA_INVALID")
  return envelope
}
const validateSchema5CommitEvidence = (db, authority) => validateSchema5BootstrapEnvelope(db,
  db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapAdmin' AND scope_key='schema:4->5'").get(), authority)
const assertMainRequest = (request) => {
  const keys = ["expected_anchor_id", "expected_binding_epoch", "request_identity"]
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(keys) ||
      Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) || !uuid.test(request.request_identity ?? "") ||
      typeof request.expected_anchor_id !== "string" || !safeEpoch(request.expected_binding_epoch)) throw ctError("CT_PAYLOAD_INVALID")
}
const assertCanonicalMainCtx = (ctx, authority) => {
  const expected = authority.anchor.context
  if (ctx.effective_uid !== expected.trusted_uid || ctx.canonical_repo !== expected.canonical_repo || ctx.git_common_dir !== expected.git_common_dir ||
      ctx.worktree !== expected.main_worktree || ctx.branch !== expected.branch) throw ctError("CT_ADMIN_REQUIRED")
}
const coherentMain = (rows) => {
  if (rows.length === 0) return null
  const active = rows.filter(({ binding_status }) => binding_status === "ACTIVE")
  if (active.length !== 1 || active[0] !== rows.at(-1) || rows.some((row, index) => row.binding_epoch !== index + 1 || (index < rows.length - 1 && row.binding_status !== "RETIRED"))) throw ctError("CT_MAIN_BINDING_CONFLICT")
  return active[0]
}
const assertMainGate = (ctx, authority, main) => {
  if (!main) throw ctError("CT_WORKFLOW_MAIN_REQUIRED")
  const expected = authority.anchor.context
  if (ctx.effective_uid !== expected.trusted_uid || ctx.canonical_repo !== expected.canonical_repo || ctx.git_common_dir !== expected.git_common_dir || ctx.worktree !== expected.main_worktree || ctx.branch !== expected.branch ||
      !mainIdentityFields.every((field) => main[field] === ctx[field])) throw ctError("CT_WORKFLOW_MAIN_REQUIRED")
  if (ctx.binding_epoch !== main.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
}
const assertActivationRequest = (request) => {
  const keys = Object.keys(request ?? {}).sort()
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || keys.some((key) => forbiddenCtxKeys.has(key)) ||
      keys.some((key) => !["evidence_digest", "expected_binding_epoch", "expected_mode", "request_identity"].includes(key)) ||
      !["expected_binding_epoch", "expected_mode", "request_identity"].every((key) => keys.includes(key)) ||
      !uuid.test(request.request_identity ?? "") || request.expected_mode !== "OFF" || !safeEpoch(request.expected_binding_epoch)) throw ctError("CT_PAYLOAD_INVALID")
  if (!sha256Digest.test(request.evidence_digest ?? "")) throw ctError("CT_ACTIVATION_EVIDENCE_REQUIRED")
}
const currentActivationCommit = (db, authority, main, lease, activation) => {
  const transitionDigest = requestDigest(activationTransition(authority, main, activation.evidence_digest, lease))
  const committed = db.query("SELECT * FROM ct_idempotency WHERE operation='activate' AND request_identity=?").get(activation.request_identity)
  const expectedRequest = { request_identity: activation.request_identity, expected_mode: "OFF", expected_binding_epoch: main.binding_epoch, evidence_digest: activation.evidence_digest }
  const expectedCas = requestDigest(activationCas(transitionDigest, main, activation.evidence_digest, lease, activation.activation_epoch - 1, activation.activation_epoch, activation.precondition_digest))
  if (!committed || committed.scope_key !== `activation:${transitionDigest}` || committed.request_digest !== requestDigest(expectedRequest) || committed.cas_digest !== expectedCas || activation.cas_digest !== expectedCas) throw ctError("CT_SCHEMA_INVALID")
  return committed
}
const activationPrecondition = (db, authority, main, lease, prior, schemaVersion) => {
  const value = {
    kind: "activation_precondition_v1", version: 1, schema_version: schemaVersion, mode: "OFF",
    anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
    rollback_epoch: lease.rollback_epoch, lease_version: lease.lease_version, lease_status: "NONE",
    main_binding_id: main.main_binding_id, main_binding_epoch: main.binding_epoch, main_identity_digest: main.identity_digest,
    prior_activation_epoch: prior,
    active_claimant_bindings: db.query("SELECT COUNT(*) AS count FROM ct_claimant_binding WHERE binding_status='ACTIVE'").get().count,
    multiplexed_claimant_bindings: db.query("SELECT COUNT(*) AS count FROM ct_claimant_binding WHERE binding_status='MULTIPLEXED'").get().count,
    claimant_conflicts: db.query("SELECT COUNT(*) AS count FROM ct_claimant_conflict").get().count,
  }
  if ([4, 5].includes(schemaVersion)) Object.assign(value, { delivery_plane: schemaVersion === 4 ? "SCHEMA_4_EMPTY" : "SCHEMA_5_EMPTY",
    handoffs: db.query("SELECT COUNT(*) AS count FROM ct_handoff").get().count,
    transitions: db.query("SELECT COUNT(*) AS count FROM ct_handoff_transition").get().count,
    deliveries: db.query("SELECT COUNT(*) AS count FROM ct_delivery").get().count,
    claims: db.query("SELECT COUNT(*) AS count FROM ct_claim").get().count,
    budget_scopes: db.query("SELECT COUNT(*) AS count FROM ct_session_budget").get().count })
  else value.delivery_plane = "ABSENT_SCHEMA_3"
  value.polling_plane = "UNAVAILABLE_BEFORE_P7"
  return value
}

export const continuationActivate = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![3, 4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const persisted = validateSchema3Persistence(db, authority)
      if (version === 4) { validateSchema4CommitEvidence(db, authority); validateSchema4Persistence(db, authority) }
      if (version === 5) { validateSchema4CommitEvidence(db, authority); validateSchema5CommitEvidence(db, authority); validateSchema4Persistence(db, authority) }
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (persisted.lease.lease_status !== "NONE" || persisted.lease.owner_main_binding_id !== null || persisted.lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertActivationRequest(request)
      const ctx = ctxFactory(), main = coherentMain(persisted.rows)
      if (state.mode === "ON" && (!main || persisted.activations.length === 0)) throw ctError("CT_MAIN_BINDING_CONFLICT")
      assertMainGate(ctx, authority, main)
      const transitionDigest = requestDigest(activationTransition(authority, main, request.evidence_digest, persisted.lease))
      const scopeKey = `activation:${transitionDigest}`, request_digest = requestDigest(request)
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='activate' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='activate' AND scope_key=?").get(scopeKey)
      if (state.mode === "ON") {
        const current = persisted.activations.at(-1)
        if (current.main_binding_id !== main.main_binding_id || current.main_binding_epoch !== main.binding_epoch) throw ctError("CT_SCHEMA_INVALID")
        currentActivationCommit(db, authority, main, persisted.lease, current)
        if (byIdentity && byScope && byIdentity.scope_key === byScope.scope_key && byIdentity.request_identity === byScope.request_identity &&
            byIdentity.request_digest === request_digest && current.request_identity === request.request_identity && current.evidence_digest === request.evidence_digest) {
          const expectedCas = requestDigest(activationCas(transitionDigest, main, request.evidence_digest, persisted.lease, current.activation_epoch - 1, current.activation_epoch, current.precondition_digest))
          if (byIdentity.cas_digest !== expectedCas || current.cas_digest !== expectedCas) throw ctError("CT_SCHEMA_INVALID")
          return { ...JSON.parse(byIdentity.response_json), replayed: true }
        }
        if (byIdentity || byScope) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        throw ctError("CT_FENCE_MISMATCH")
      }
      if (byIdentity || byScope) throw ctError("CT_IDEMPOTENCY_CONFLICT")
      if (request.expected_binding_epoch !== main.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      const prior = persisted.activations.at(-1)?.activation_epoch ?? 0
      const precondition = activationPrecondition(db, authority, main, persisted.lease, prior, version)
      const finishedRollback = version === 5 && persisted.lease.rollback_epoch > 0 && db.query("SELECT epoch_state FROM ct_rollback_epoch WHERE rollback_epoch=?").get(persisted.lease.rollback_epoch)?.epoch_state === "FINISHED"
      const nonLiveHistoryOnly = finishedRollback && db.query("SELECT COUNT(*) AS count FROM ct_claim WHERE claim_state='LIVE'").get().count === 0 &&
        db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE delivery_state IN ('PENDING','CLAIMED')").get().count === 0
      if (precondition.active_claimant_bindings !== 0 || (!nonLiveHistoryOnly && ["handoffs", "transitions", "deliveries", "claims", "budget_scopes"].some((field) => (precondition[field] ?? 0) !== 0))) throw ctError("CT_NOT_QUIESCENT")
      const precondition_digest = requestDigest(precondition), target = prior + 1
      const cas_digest = requestDigest(activationCas(transitionDigest, main, request.evidence_digest, persisted.lease, prior, target, precondition_digest))
      const activated_at = now(), response = { mode: "ON", activation_epoch: target, replayed: false }
      const activation = { activation_epoch: target, main_binding_id: main.main_binding_id, main_binding_epoch: main.binding_epoch, evidence_digest: request.evidence_digest, precondition_digest, request_identity: request.request_identity, request_digest, cas_digest, activated_at }
      db.run(`INSERT INTO ct_activation(activation_epoch,main_binding_id,main_binding_epoch,evidence_digest,precondition_digest,request_identity,request_digest,cas_digest,activation_digest,activated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`, [...Object.values(activation).slice(0, 8), requestDigest(activationValue(activation)), activated_at])
      db.run("INSERT INTO ct_idempotency VALUES ('activate',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(response), activated_at])
      if (db.run("UPDATE ct_continuation_state SET mode='ON' WHERE id=1 AND mode='OFF'").changes !== 1) throw ctError("CT_FENCE_MISMATCH")
      validateSchema3Persistence(db, authority)
      return response
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const assertStatusRequest = (request) => {
  if (request !== undefined && (typeof request !== "object" || request === null || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).length !== 0)) throw ctError("CT_PAYLOAD_INVALID")
}
export const continuationStatus = (handle) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![3, 4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const persisted = validateSchema3Persistence(db, authority)
      const schema4 = version === 4 ? (validateSchema4CommitEvidence(db, authority), validateSchema4Persistence(db, authority)) : null
      const schema5 = version === 5 ? (validateSchema4CommitEvidence(db, authority), validateSchema5CommitEvidence(db, authority), validateSchema4Persistence(db, authority)) : null
      const noneLease = persisted.lease.lease_status === "NONE" && persisted.lease.owner_main_binding_id === null && persisted.lease.lease_expires_at === null
      if ((state.mode === "OFF" || state.mode === "ON") ? !noneLease : !["ACTIVE", "EXPIRED"].includes(persisted.lease.lease_status)) throw ctError("CT_SCHEMA_INVALID")
      const main = coherentMain(persisted.rows)
      if (state.mode === "ON") {
        if (!main) throw ctError("CT_MAIN_BINDING_CONFLICT")
        const current = persisted.activations.at(-1)
        if (!current || current.main_binding_id !== main.main_binding_id || current.main_binding_epoch !== main.binding_epoch) throw ctError("CT_SCHEMA_INVALID")
        currentActivationCommit(db, authority, main, persisted.lease, current)
      }
      if (state.mode === "ROLLING_BACK" && (!main || persisted.lease.owner_main_binding_id !== main.main_binding_id)) throw ctError("CT_MAIN_BINDING_CONFLICT")
      const workers = db.query("SELECT COUNT(*) AS count FROM ct_claimant_binding WHERE binding_status='ACTIVE'").get().count
      const counts = (schema4 || schema5) ? {
        claims: db.query("SELECT COUNT(*) AS count FROM ct_claim WHERE claim_state='LIVE'").get().count,
        deliveries: db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE delivery_state IN ('PENDING','CLAIMED')").get().count,
        work: db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE delivery_state='PENDING' AND purpose='WORK'").get().count,
        attestation: db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE delivery_state='PENDING' AND purpose='ATTESTATION_REDELIVERY'").get().count,
      } : { claims: 0, deliveries: 0, work: 0, attestation: 0 }
      return { mode: state.mode, schema_version: version, rollback_epoch: persisted.lease.rollback_epoch, lease_status: persisted.lease.lease_status,
        main_binding_status: main ? "ACTIVE" : "ABSENT", live_counts: { claims: counts.claims, deliveries: counts.deliveries, workers }, pending_counts: { work: counts.work, attestation: counts.attestation } }
    })()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

export const continuationBootstrapMain = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![3, 4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const persisted = validateSchema3Persistence(db, authority)
      if (version === 4) { validateSchema4CommitEvidence(db, authority); validateSchema4Persistence(db, authority) }
      if (version === 5) { validateSchema4CommitEvidence(db, authority); validateSchema5CommitEvidence(db, authority); validateSchema4Persistence(db, authority) }
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (state.mode === "ON") throw ctError("CT_FENCE_MISMATCH")
      if (persisted.lease.lease_status === "ACTIVE") throw ctError("CT_ROLLBACK_LEASE_ACTIVE")
      if (persisted.lease.lease_status === "EXPIRED") throw ctError("CT_FENCE_MISMATCH")
      assertMainRequest(request)
      const ctx = ctxFactory()
      assertCanonicalMainCtx(ctx, authority)
      const targetEpoch = request.expected_binding_epoch + 1
      const targetDigest = requestDigest(mainBindingValue(authority, ctx, targetEpoch))
      const scopeKey = `main:${authority.anchor.anchor_id}:epoch:${targetEpoch}`
      const request_digest = requestDigest(request)
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapMain' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='bootstrapMain' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        const target = persisted.rows.find(({ binding_epoch }) => binding_epoch === targetEpoch)
        const schemaBoundary = target && mainCommitSchemaBoundary(db, authority, persisted.rows)
        const schema5Boundary = target && mainCommitSchema5Boundary(db, authority, persisted.rows)
        const expected = target && expectedMainCommit(authority, persisted.rows, target, request.request_identity, persisted.lease, mainCommitSchemaVersion(schemaBoundary, target, schema5Boundary))
        if (!target || byIdentity.cas_digest !== expected.cas_digest || target.identity_digest !== targetDigest || byIdentity.request_digest !== request_digest ||
            ![request.expected_binding_epoch, targetEpoch].includes(ctx.binding_epoch) || !mainIdentityFields.every((field) => target[field] === ctx[field])) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        return { ...expected.response, replayed: true }
      }
      const incumbent = coherentMain(persisted.rows)
      if (request.expected_anchor_id !== authority.anchor.anchor_id || request.expected_binding_epoch !== (incumbent?.binding_epoch ?? 0) || ctx.binding_epoch !== (incumbent?.binding_epoch ?? 0)) throw ctError("CT_FENCE_MISMATCH")
      if (incumbent) {
        if (!["host_process_instance", "plugin_instance", "root_session_id"].every((field) => incumbent[field] === ctx[field]) ||
            incumbent.mcp_process_instance === ctx.mcp_process_instance || incumbent.pid_start_marker === ctx.pid_start_marker) throw ctError("CT_MAIN_BINDING_CONFLICT")
      }
      const cas_digest = requestDigest(mainCasValue(authority, request.expected_binding_epoch, targetDigest, persisted.lease, incumbent, version))
      const committed = now(), mainBindingId = makeId()
      if (incumbent) db.run("UPDATE ct_main_binding SET binding_status='RETIRED',ended_at=? WHERE main_binding_id=?", [committed, incumbent.main_binding_id])
      db.run(`INSERT INTO ct_main_binding(main_binding_id,anchor_id,anchor_epoch,config_digest,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch,main_session_id,binding_status,identity_digest,created_at,ended_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,'ACTIVE',?,?,NULL)`, [mainBindingId, authority.anchor.anchor_id, 1, authority.anchor.config_digest, ...mainIdentityFields.map((field) => ctx[field]), targetEpoch, ctx.root_session_id, targetDigest, committed])
      const response = { main_binding_id: mainBindingId, binding_epoch: targetEpoch, state: "ACTIVE", replayed: false }
      db.run("INSERT INTO ct_idempotency VALUES ('bootstrapMain',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(response), committed])
      validateSchema3Persistence(db, authority)
      return response
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

// P4-A2 create: exact top-level request shape/type checks only. Deep payload
// content validity is verified later, after producer authority and
// idempotency classification, per the design's error-precedence order.
const createRequestKeys = ["lineage_id", "payload", "payload_digest", "request_identity", "revision"]
const assertCreateRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(createRequestKeys) ||
      !uuid.test(request.request_identity ?? "") || !uuid.test(request.lineage_id ?? "") ||
      !safeEpoch(request.revision) || request.revision === 0 || !sha256Digest.test(request.payload_digest ?? "") ||
      !request.payload || Object.getPrototypeOf(request.payload) !== Object.prototype) throw ctError("CT_PAYLOAD_INVALID")
}
export const continuationCreate = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority); if (version === 5) validateSchema5CommitEvidence(db, authority); validateSchema3Persistence(db, authority); validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertCreateRequest(request)

      // Exact ACTIVE producer (PRODUCER) predicate — identical shape to the
      // predicate register/receive already use for this scope.
      const ctx = ctxFactory(), pluginScopeDigest = requestDigest(scope(ctx))
      if (db.query("SELECT 1 FROM ct_claimant_conflict WHERE plugin_scope_digest=? LIMIT 1").get(pluginScopeDigest)) throw ctError("CT_SESSION_MULTIPLEXED")
      const bindings = scopeBindings(db, ctx, authority)
      if (bindings.some(({ binding_status }) => binding_status === "MULTIPLEXED")) throw ctError("CT_SESSION_MULTIPLEXED")
      const active = bindings.filter(({ binding_status }) => binding_status === "ACTIVE")
      if (active.length !== 1) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      const producer = active[0]
      if (producer.binding_epoch !== ctx.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      if (!equalFields(producer, ctx, bindingFields)) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")

      const producerCtx = tuple(ctx), producerCtxJson = jcs(producerCtx), producerCtxDigest = requestDigest(producerCtx)
      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const producerAuthority = { binding_id: producer.binding_id, identity_digest: producer.identity_digest, ctx_digest: producerCtxDigest }
      const casValue = { kind: "create_cas_v1", version: 1, writer_fence_v1: writerFence, producer_authority_v1: producerAuthority,
        lineage_id: request.lineage_id, revision: request.revision, payload_digest: request.payload_digest, expected_lineage_revision: "ABSENT" }
      const request_digest = requestDigest(request), cas_digest = requestDigest(casValue)
      const scopeKey = `handoff:${request.lineage_id}:revision:${request.revision}`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='create' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='create' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest || byIdentity.cas_digest !== cas_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "create_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }

      // Full structural/JCS/bounds/digest proof plus repository/common-dir
      // fingerprint equality — create does not interpret source policy.
      const payload = request.payload
      if (!validHandoffPayload(payload) || payload.lineage.lineage_id !== request.lineage_id || payload.lineage.revision !== request.revision) throw ctError("CT_PAYLOAD_INVALID")
      const payloadJson = jcs(payload)
      if (Buffer.byteLength(payloadJson) > 65536 || sha256(Buffer.from(payloadJson)) !== request.payload_digest) throw ctError("CT_PAYLOAD_INVALID")
      const repositoryFingerprint = requestDigest({ kind: "canonical_repo_v1", path: authority.anchor.context.canonical_repo })
      const gitCommonDirFingerprint = requestDigest({ kind: "git_common_dir_v1", path: authority.anchor.context.git_common_dir })
      const sourceDigest = requestDigest({ source_kind: payload.provenance.source_kind, source_ref: payload.provenance.source_ref,
        source_merge_sha: payload.repository.source_merge.sha, source_merge_url: payload.repository.source_merge.url })
      if (payload.repository.repository_fingerprint !== repositoryFingerprint || payload.repository.git_common_dir_fingerprint !== gitCommonDirFingerprint ||
          payload.provenance.source_digest !== sourceDigest) throw ctError("CT_PAYLOAD_INVALID")

      const nextUnitScopeDigest = requestDigest({ unit_id: payload.next_unit.unit_id, scope: payload.next_unit.scope })
      const dependenciesDigest = requestDigest(payload.next_unit.dependencies), referencesDigest = requestDigest(payload.next_unit.references)
      const snapshotsDigest = requestDigest(payload.snapshots)
      const provenanceDigest = requestDigest({ source_digest: sourceDigest, references_digest: referencesDigest, snapshots_digest: snapshotsDigest })
      const decisionSummaryDigest = sha256(payload.decision_summary)
      const id = makeId(), created_at = now()
      const fingerprint = { kind: "handoff_fingerprint_v1", version: 1, id, lineage_id: request.lineage_id, revision: request.revision,
        payload_digest: request.payload_digest, repository_fingerprint: repositoryFingerprint, git_common_dir_fingerprint: gitCommonDirFingerprint,
        next_unit_scope_digest: nextUnitScopeDigest, dependencies_digest: dependenciesDigest, references_digest: referencesDigest, snapshots_digest: snapshotsDigest,
        provenance_digest: provenanceDigest, decision_summary_digest: decisionSummaryDigest,
        producer_binding_id: producer.binding_id, producer_identity_digest: producer.identity_digest, producer_ctx_digest: producerCtxDigest }
      const handoffFingerprint = requestDigest(fingerprint)

      db.run(`INSERT INTO ct_handoff(id,lineage_id,revision,state,generation,payload_json,payload_digest,handoff_fingerprint,repository_fingerprint,git_common_dir_fingerprint,
        source_merge_sha,source_merge_url,next_unit_scope_digest,dependencies_digest,references_digest,snapshots_digest,provenance_digest,decision_summary_digest,
        producer_binding_id,producer_identity_digest,producer_ctx_json,producer_ctx_digest,validation_evidence_json,validation_digest,created_at,validated_at,published_at)
        VALUES (?,?,?,'DRAFT',0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,?,NULL,NULL)`,
        [id, request.lineage_id, request.revision, payloadJson, request.payload_digest, handoffFingerprint, repositoryFingerprint, gitCommonDirFingerprint,
          payload.repository.source_merge.sha, payload.repository.source_merge.url, nextUnitScopeDigest, dependenciesDigest, referencesDigest, snapshotsDigest,
          provenanceDigest, decisionSummaryDigest, producer.binding_id, producer.identity_digest, producerCtxJson, producerCtxDigest, created_at])

      const publicResponse = { id, state: "DRAFT", generation: 0, replayed: false }
      const response_digest = requestDigest(publicResponse)
      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,0,'CREATE',NULL,'DRAFT','PRODUCER',?,?,?,?,?,NULL,?,?)`,
        [makeId(), id, producer.binding_id, producer.identity_digest, request.request_identity, request_digest, cas_digest, response_digest, created_at])

      const envelope = { kind: "create_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest } }
      db.run("INSERT INTO ct_idempotency VALUES ('create',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), created_at])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

// P4-A3 validate/publish: live inert observations for fresh `validate` only.
// Exact replay never re-reads Git/filesystem state; malformed structure,
// unresolved references, or a failed digest/ancestry match is always
// non-mutating CT_PAYLOAD_INVALID.
const resolveFileNoFollow = (canonicalRepo, relativePath) => {
  let current = canonicalRepo
  for (const [index, segment] of relativePath.split("/").entries()) {
    current = join(current, segment)
    let stats
    try { stats = lstatSync(current) } catch { throw ctError("CT_PAYLOAD_INVALID") }
    if (stats.isSymbolicLink()) throw ctError("CT_PAYLOAD_INVALID")
    const isLast = index === relativePath.split("/").length - 1
    if (isLast ? !stats.isFile() : !stats.isDirectory()) throw ctError("CT_PAYLOAD_INVALID")
  }
  try { return readFileSync(current) } catch { throw ctError("CT_PAYLOAD_INVALID") }
}
const resolveCommitOid = (canonicalRepo, value) => {
  try { return git(canonicalRepo, ["rev-parse", "--verify", `${value}^{commit}`]) } catch { throw ctError("CT_PAYLOAD_INVALID") }
}
const liveEvidenceReference = (canonicalRepo, reference) => {
  if (reference.kind === "URL") {
    if (reference.digest !== sha256(reference.value)) throw ctError("CT_PAYLOAD_INVALID")
    return { kind: "URL", value: reference.value, digest: reference.digest, observed_digest: reference.digest, fetch: "NONE" }
  }
  if (reference.kind === "COMMIT") {
    const resolvedOid = resolveCommitOid(canonicalRepo, reference.value)
    if (resolvedOid !== reference.value) throw ctError("CT_PAYLOAD_INVALID")
    return { kind: "COMMIT", value: reference.value, digest: reference.digest, observed_digest: sha256(reference.value), resolved_oid: resolvedOid }
  }
  const observedDigest = sha256(resolveFileNoFollow(canonicalRepo, reference.value))
  if (observedDigest !== reference.digest) throw ctError("CT_PAYLOAD_INVALID")
  return { kind: "FILE", value: reference.value, digest: reference.digest, observed_digest: observedDigest, node_type: "REGULAR" }
}
const liveValidationEvidence = (authority, handoff, payload, main) => {
  const canonicalRepo = authority.anchor.context.canonical_repo
  const resolvedOid = resolveCommitOid(canonicalRepo, payload.repository.source_merge.sha)
  if (resolvedOid !== handoff.source_merge_sha) throw ctError("CT_PAYLOAD_INVALID")
  const mainHeadOid = resolveCommitOid(canonicalRepo, "HEAD")
  try { git(canonicalRepo, ["merge-base", "--is-ancestor", resolvedOid, mainHeadOid]) } catch { throw ctError("CT_PAYLOAD_INVALID") }
  const references = payload.next_unit.references.map((reference) => liveEvidenceReference(canonicalRepo, reference))
  return {
    kind: "handoff_validation_evidence_v1", version: 1, id: handoff.id, lineage_id: handoff.lineage_id, revision: handoff.revision,
    payload_digest: handoff.payload_digest, handoff_fingerprint: handoff.handoff_fingerprint, repository_fingerprint: handoff.repository_fingerprint,
    git_common_dir_fingerprint: handoff.git_common_dir_fingerprint,
    content: { next_unit_scope_digest: handoff.next_unit_scope_digest, dependencies_digest: handoff.dependencies_digest, references_digest: handoff.references_digest,
      snapshots_digest: handoff.snapshots_digest, decision_summary_digest: handoff.decision_summary_digest },
    provenance: { source_digest: payload.provenance.source_digest, provenance_digest: handoff.provenance_digest, producer_binding_id: handoff.producer_binding_id,
      producer_identity_digest: handoff.producer_identity_digest, producer_ctx_digest: handoff.producer_ctx_digest },
    source_merge: { requested_sha: handoff.source_merge_sha, resolved_oid: resolvedOid, url: handoff.source_merge_url, main_head_oid: mainHeadOid, is_ancestor: true },
    references,
    validator: { main_binding_id: main.main_binding_id, main_binding_epoch: main.binding_epoch, main_identity_digest: main.identity_digest },
  }
}

const validateRequestKeys = ["eg", "es", "id", "payload_digest", "request_identity"]
const assertValidateRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(validateRequestKeys) ||
      !uuid.test(request.request_identity ?? "") || !isBase64url32(request.id) || request.es !== "DRAFT" ||
      !safeEpoch(request.eg) || !sha256Digest.test(request.payload_digest ?? "")) throw ctError("CT_PAYLOAD_INVALID")
}
export const continuationValidate = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority)
      if (version === 5) validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertValidateRequest(request)

      // Exact ACTIVE Main predicate — same canonical-worktree/epoch gate
      // bootstrapMain/activate already use.
      const ctx = ctxFactory(), main = coherentMain(persisted.rows)
      assertMainGate(ctx, authority, main)

      const request_digest = requestDigest(request)
      const scopeKey = `handoff:${request.id}:generation:${request.eg}:validate`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='validate' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='validate' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "validate_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }

      const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.id)
      if (!handoff) throw ctError("CT_NOT_FOUND")
      if (handoff.state !== request.es) throw ctError("CT_INVALID_TRANSITION")
      if (handoff.generation !== request.eg || handoff.payload_digest !== request.payload_digest) throw ctError("CT_FENCE_MISMATCH")

      // Fresh derivation only: read/verify the immutable handoff, perform the
      // approved live observations, then derive validation_digest before
      // constructing the complete CAS — never accepted from the request.
      const payload = canonicalJson(handoff.payload_json, 65536)
      const evidence = liveValidationEvidence(authority, handoff, payload, main)
      const validationEvidenceJson = jcs(evidence)
      const validationDigest = requestDigest(evidence)

      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: "validate_cas_v1", version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        id: request.id, expected_state: "DRAFT", expected_generation: request.eg, payload_digest: handoff.payload_digest,
        handoff_fingerprint: handoff.handoff_fingerprint, validation_digest: validationDigest }
      const cas_digest = requestDigest(casValue)
      const validatedAt = now()

      if (db.run("UPDATE ct_handoff SET state='VALIDATED', validation_evidence_json=?, validation_digest=?, validated_at=? WHERE id=? AND state='DRAFT'",
        [validationEvidenceJson, validationDigest, validatedAt, request.id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")

      const publicResponse = { id: request.id, state: "VALIDATED", generation: request.eg, replayed: false }
      const response_digest = requestDigest(publicResponse)
      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,?,'VALIDATE','DRAFT','VALIDATED','MAIN',?,?,?,?,?,?,?,?)`,
        [makeId(), request.id, request.eg, main.main_binding_id, main.identity_digest, request.request_identity, request_digest, cas_digest, validationDigest, response_digest, validatedAt])

      const envelope = { kind: "validate_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, validation_digest: validationDigest } }
      db.run("INSERT INTO ct_idempotency VALUES ('validate',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), validatedAt])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const publishRequestKeys = ["eg", "es", "id", "request_identity"]
const assertPublishRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(publishRequestKeys) ||
      !uuid.test(request.request_identity ?? "") || !isBase64url32(request.id) || request.es !== "VALIDATED" || !safeEpoch(request.eg)) throw ctError("CT_PAYLOAD_INVALID")
}
export const continuationPublish = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority)
      if (version === 5) validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertPublishRequest(request)

      const ctx = ctxFactory(), main = coherentMain(persisted.rows)
      assertMainGate(ctx, authority, main)

      const request_digest = requestDigest(request)
      const scopeKey = `handoff:${request.id}:generation:${request.eg}:publish`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='publish' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='publish' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "publish_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }

      const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.id)
      if (!handoff) throw ctError("CT_NOT_FOUND")
      if (handoff.state !== request.es) throw ctError("CT_INVALID_TRANSITION")
      if (handoff.generation !== request.eg) throw ctError("CT_FENCE_MISMATCH")
      if (db.query("SELECT 1 FROM ct_delivery WHERE handoff_id=? AND generation=?").get(request.id, request.eg)) throw ctError("CT_FENCE_MISMATCH")

      // Fully reverify the persisted evidence/digest — never accept a caller
      // validation_digest or regenerate the evidence from live observations.
      const evidence = canonicalJson(handoff.validation_evidence_json, 65536)
      const validationDigest = requestDigest(evidence)
      if (validationDigest !== handoff.validation_digest) throw ctError("CT_SCHEMA_INVALID")

      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: "publish_cas_v1", version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        id: request.id, expected_state: "VALIDATED", expected_generation: request.eg, payload_digest: handoff.payload_digest,
        handoff_fingerprint: handoff.handoff_fingerprint, validation_digest: validationDigest, expected_delivery: "ABSENT" }
      const cas_digest = requestDigest(casValue)
      const publishedAt = now(), deliveryId = makeId()

      if (db.run("UPDATE ct_handoff SET state='PUBLISHED', published_at=? WHERE id=? AND state='VALIDATED'",
        [publishedAt, request.id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")

      db.run(`INSERT INTO ct_delivery(delivery_id,handoff_id,generation,purpose,delivery_state,handoff_state_snapshot,claim_id,created_at,claimed_at,closed_at)
        VALUES (?,?,?,'WORK','PENDING','PUBLISHED',NULL,?,NULL,NULL)`, [deliveryId, request.id, request.eg, publishedAt])

      const publicResponse = { id: request.id, state: "PUBLISHED", generation: request.eg, replayed: false }
      const response_digest = requestDigest(publicResponse)
      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,?,'PUBLISH','VALIDATED','PUBLISHED','MAIN',?,?,?,?,?,?,?,?)`,
        [makeId(), request.id, request.eg, main.main_binding_id, main.identity_digest, request.request_identity, request_digest, cas_digest, validationDigest, response_digest, publishedAt])

      const envelope = { kind: "publish_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, validation_digest: validationDigest, delivery_id: deliveryId } }
      db.run("INSERT INTO ct_idempotency VALUES ('publish',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), publishedAt])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const claimRequestKeys = ["delivery_id", "eg", "es", "id", "purpose", "request_identity"]
const assertClaimRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(claimRequestKeys) ||
      !uuid.test(request.request_identity ?? "") || !isBase64url32(request.delivery_id) || !isBase64url32(request.id) ||
      !["WORK", "ATTESTATION_REDELIVERY"].includes(request.purpose) || !safeEpoch(request.eg) ||
      request.es !== (request.purpose === "WORK" ? "PUBLISHED" : "COMPLETION_ATTESTED")) throw ctError("CT_PAYLOAD_INVALID")
}
// P4-B: atomic claim. Only WORK/PUBLISHED deliveries can actually exist in
// this slice (A3 creates those); the ATTESTATION_REDELIVERY branch is wired
// structurally per the design amendment but its rows only appear once P5
// creates COMPLETION_ATTESTED deliveries — a claim naming one today cannot
// find a matching delivery and fails CT_NOT_FOUND/CT_INVALID_TRANSITION
// before reaching any handoff-state mutation.
export const continuationClaim = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority); if (version === 5) validateSchema5CommitEvidence(db, authority); validateSchema3Persistence(db, authority); validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertClaimRequest(request)

      // Exact ACTIVE claimant (CLAIMANT) predicate — identical shape to the
      // predicate register/receive/create already use for this scope.
      const ctx = ctxFactory(), pluginScopeDigest = requestDigest(scope(ctx))
      if (db.query("SELECT 1 FROM ct_claimant_conflict WHERE plugin_scope_digest=? LIMIT 1").get(pluginScopeDigest)) throw ctError("CT_SESSION_MULTIPLEXED")
      const bindings = scopeBindings(db, ctx, authority)
      if (bindings.some(({ binding_status }) => binding_status === "MULTIPLEXED")) throw ctError("CT_SESSION_MULTIPLEXED")
      const active = bindings.filter(({ binding_status }) => binding_status === "ACTIVE")
      if (active.length !== 1) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      const claimant = active[0]
      if (claimant.binding_epoch !== ctx.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      if (!equalFields(claimant, ctx, bindingFields)) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")

      const request_digest = requestDigest(request)
      const scopeKey = `delivery:${request.delivery_id}:claim`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='claim' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='claim' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "claim_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        const { id, state: publicState, generation, delivery_id, purpose } = envelope.public_response
        return { id, state: publicState, generation, replayed: true, delivery_id, purpose }
      }

      const delivery = db.query("SELECT * FROM ct_delivery WHERE delivery_id=?").get(request.delivery_id)
      if (!delivery) throw ctError("CT_NOT_FOUND")
      const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.id)
      if (!handoff) throw ctError("CT_NOT_FOUND")

      const repositoryFingerprint = requestDigest({ kind: "canonical_repo_v1", path: authority.anchor.context.canonical_repo })
      const gitCommonDirFingerprint = requestDigest({ kind: "git_common_dir_v1", path: authority.anchor.context.git_common_dir })
      if (delivery.purpose !== request.purpose || handoff.state !== request.es) throw ctError("CT_INVALID_TRANSITION")
      if (delivery.handoff_id !== request.id || delivery.generation !== request.eg || handoff.generation !== request.eg ||
          handoff.repository_fingerprint !== repositoryFingerprint || handoff.git_common_dir_fingerprint !== gitCommonDirFingerprint ||
          delivery.delivery_state !== "PENDING" || delivery.claim_id !== null) throw ctError("CT_FENCE_MISMATCH")

      const occurredAt = now()
      const claimantCtx = tuple(ctx), claimantCtxJson = jcs(claimantCtx), claimantCtxDigest = requestDigest(claimantCtx)
      const budgetScope = { kind: "session_budget_v1", version: 1, effective_uid: ctx.effective_uid, canonical_repo: ctx.canonical_repo,
        git_common_dir: ctx.git_common_dir, plugin_instance: ctx.plugin_instance, root_session_id: ctx.root_session_id }
      const budgetScopeJson = jcs(budgetScope), budgetScopeDigest = requestDigest(budgetScope)
      const claimId = makeId(), tokenSalt = makeId()

      const claimantFence = { kind: "claimant_fence_v1", version: 1, delivery_id: request.delivery_id, id: request.id, generation: request.eg, purpose: request.purpose,
        claimant_binding_id: claimant.binding_id, claimant_identity_digest: claimant.identity_digest, claimant_ctx_digest: claimantCtxDigest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, budget_scope_digest: budgetScopeDigest, budget_sequence: 1 }
      const claimantFenceDigest = requestDigest(claimantFence)
      const tokenMaterial = { kind: "claim_token_v1", version: 1, claim_id: claimId, delivery_id: request.delivery_id, id: request.id,
        generation: request.eg, purpose: request.purpose, claimant_fence_digest: claimantFenceDigest, token_salt: tokenSalt }
      const token = createHmac("sha256", Buffer.from(authority.anchor.anchor_secret, "base64url")).update(jcs(tokenMaterial)).digest("base64url")
      const tokenHash = sha256(Buffer.from(token))

      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const claimantAuthority = { binding_id: claimant.binding_id, identity_digest: claimant.identity_digest, ctx_digest: claimantCtxDigest }
      const casValue = { kind: "claim_cas_v1", version: 1, writer_fence_v1: writerFence, claimant_authority_v1: claimantAuthority,
        delivery_id: request.delivery_id, id: request.id, expected_delivery_state: "PENDING", expected_handoff_state: request.es,
        expected_generation: request.eg, purpose: request.purpose, handoff_fingerprint: handoff.handoff_fingerprint, budget_scope_digest: budgetScopeDigest,
        budget_limit: 1, observed_budget_consumed: 0, target_budget_sequence: 1, token_scheme: "hmac-sha256-anchor-v1" }
      const cas_digest = requestDigest(casValue)

      // Session budget: seed the absent scope, then CAS-consume 0->1. Any
      // throw below rolls back this seed too, so an exhausted budget leaves
      // the scope exactly as it was.
      if (!db.query("SELECT 1 FROM ct_session_budget WHERE budget_scope_digest=?").get(budgetScopeDigest))
        db.run("INSERT INTO ct_session_budget(budget_scope_digest,budget_scope_json,budget_limit,consumed_count,last_claim_id,created_at,updated_at) VALUES (?,?,1,0,NULL,?,?)",
          [budgetScopeDigest, budgetScopeJson, occurredAt, occurredAt])
      if (db.run("UPDATE ct_session_budget SET consumed_count=1,last_claim_id=?,updated_at=? WHERE budget_scope_digest=? AND consumed_count=0",
        [claimId, occurredAt, budgetScopeDigest]).changes !== 1) throw ctError("CT_SESSION_BUDGET_EXHAUSTED")

      db.run(`INSERT INTO ct_claim(claim_id,delivery_id,handoff_id,generation,purpose,claimant_binding_id,claimant_identity_digest,claimant_ctx_json,claimant_ctx_digest,
        claimant_fence_digest,token_salt,token_hash,budget_scope_digest,budget_sequence,request_identity,request_digest,cas_digest,claim_state,created_at,closed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,'LIVE',?,NULL)`,
        [claimId, request.delivery_id, request.id, request.eg, request.purpose, claimant.binding_id, claimant.identity_digest, claimantCtxJson, claimantCtxDigest,
          claimantFenceDigest, tokenSalt, tokenHash, budgetScopeDigest, request.request_identity, request_digest, cas_digest, occurredAt])

      if (db.run("UPDATE ct_delivery SET delivery_state='CLAIMED', claim_id=?, claimed_at=? WHERE delivery_id=? AND delivery_state='PENDING'",
        [claimId, occurredAt, request.delivery_id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")

      let toState = handoff.state
      if (request.purpose === "WORK") {
        if (db.run("UPDATE ct_handoff SET state='CLAIMED' WHERE id=? AND state='PUBLISHED'", [request.id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
        toState = "CLAIMED"
      }

      const publicResponseTemplate = { kind: "claim_response_v1", version: 1, id: request.id, state: toState, generation: request.eg,
        delivery_id: request.delivery_id, purpose: request.purpose, replayed: false }
      const response_digest = requestDigest(publicResponseTemplate)
      const claimDecision = { kind: "claim_decision_v1", version: 1, delivery_id: request.delivery_id, id: request.id, from_state: request.es, to_state: toState,
        generation: request.eg, purpose: request.purpose, claim_id: claimId, claimant_fence_digest: claimantFenceDigest, budget_scope_digest: budgetScopeDigest,
        budget_sequence: 1, token_hash: tokenHash }
      const decision_digest = requestDigest(claimDecision)

      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,?,'CLAIM',?,?,'CLAIMANT',?,?,?,?,?,?,?,?)`,
        [makeId(), request.id, request.eg, request.es, toState, claimant.binding_id, claimant.identity_digest, request.request_identity, request_digest, cas_digest, decision_digest, response_digest, occurredAt])

      const envelope = { kind: "claim_response_envelope_v1", version: 1, public_response: publicResponseTemplate,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, claim_id: claimId, claimant_fence_digest: claimantFenceDigest,
          budget_scope_digest: budgetScopeDigest, budget_sequence: 1, token_hash: tokenHash } }
      db.run("INSERT INTO ct_idempotency VALUES ('claim',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), occurredAt])

      return { id: request.id, state: toState, generation: request.eg, replayed: false, delivery_id: request.delivery_id, purpose: request.purpose, token }
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const ackRequestKeys = ["delivery_id", "effect_manifest", "eg", "es", "id", "purpose", "request_identity", "token"]
const assertAckRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(ackRequestKeys) ||
      !uuid.test(request.request_identity ?? "") || !isBase64url32(request.delivery_id) || !isBase64url32(request.id) ||
      request.es !== "CLAIMED" || !safeEpoch(request.eg) || request.purpose !== "WORK" || !isBase64url32(request.token)) throw ctError("CT_PAYLOAD_INVALID")
}
// P5-A: ack is the sole start operation — there is no `start` API and there
// must never be one. It CASes CLAIMED->STARTED only once a complete effect
// manifest and its recomputed pre-start boundary are persisted (CT-R12); the
// persisted `ack` envelope is the durable effect record, there is no
// separate table. The bearer is validated token-free: the caller resends the
// raw token, the server hashes its UTF-8 bytes once and constant-time
// compares that hash against the persisted ct_claim.token_hash — the raw
// token is never stored, returned again, or placed in any envelope.
export const continuationAck = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority); if (version === 5) validateSchema5CommitEvidence(db, authority); validateSchema3Persistence(db, authority); validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertAckRequest(request)

      // Exact ACTIVE claimant (CLAIMANT) predicate — identical shape to the
      // predicate claim/create already use for this scope.
      const ctx = ctxFactory(), pluginScopeDigest = requestDigest(scope(ctx))
      if (db.query("SELECT 1 FROM ct_claimant_conflict WHERE plugin_scope_digest=? LIMIT 1").get(pluginScopeDigest)) throw ctError("CT_SESSION_MULTIPLEXED")
      const bindings = scopeBindings(db, ctx, authority)
      if (bindings.some(({ binding_status }) => binding_status === "MULTIPLEXED")) throw ctError("CT_SESSION_MULTIPLEXED")
      const active = bindings.filter(({ binding_status }) => binding_status === "ACTIVE")
      if (active.length !== 1) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      const claimant = active[0]
      if (claimant.binding_epoch !== ctx.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      if (!equalFields(claimant, ctx, bindingFields)) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")

      const { token, ...tokenFreeRequest } = request
      const authenticated_request = { ...tokenFreeRequest, token_hash: sha256(Buffer.from(token)) }
      const request_digest = requestDigest(authenticated_request)
      const scopeKey = `handoff:${request.id}:generation:${request.eg}:ack`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='ack' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='ack' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "ack_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        const { id, state: publicState, generation } = envelope.public_response
        return { id, state: publicState, generation, replayed: true }
      }

      const delivery = db.query("SELECT * FROM ct_delivery WHERE delivery_id=?").get(request.delivery_id)
      if (!delivery) throw ctError("CT_NOT_FOUND")
      const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.id)
      if (!handoff) throw ctError("CT_NOT_FOUND")

      if (handoff.state !== request.es) throw ctError("CT_INVALID_TRANSITION")
      const repositoryFingerprint = requestDigest({ kind: "canonical_repo_v1", path: authority.anchor.context.canonical_repo })
      const gitCommonDirFingerprint = requestDigest({ kind: "git_common_dir_v1", path: authority.anchor.context.git_common_dir })
      if (delivery.handoff_id !== request.id || delivery.purpose !== request.purpose || delivery.generation !== request.eg || handoff.generation !== request.eg ||
          handoff.repository_fingerprint !== repositoryFingerprint || handoff.git_common_dir_fingerprint !== gitCommonDirFingerprint) throw ctError("CT_FENCE_MISMATCH")
      if (delivery.delivery_state !== "CLAIMED" || delivery.claim_id === null) throw ctError("CT_INVALID_TRANSITION")
      const claim = db.query("SELECT * FROM ct_claim WHERE claim_id=?").get(delivery.claim_id)
      if (!claim) throw ctError("CT_FENCE_MISMATCH")
      if (claim.claim_state !== "LIVE") throw ctError("CT_INVALID_TRANSITION")
      const callerCtx = tuple(ctx), callerCtxDigest = requestDigest(callerCtx)
      if (claim.claimant_binding_id !== claimant.binding_id || claim.claimant_identity_digest !== claimant.identity_digest || claim.claimant_ctx_digest !== callerCtxDigest) throw ctError("CT_FENCE_MISMATCH")

      const tokenHash = sha256(Buffer.from(token))
      const presented = Buffer.from(tokenHash), stored = Buffer.from(claim.token_hash)
      if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) throw ctError("CT_TOKEN_MISMATCH")

      const manifestDigests = effectManifestDigests(request.effect_manifest, request.id, request.eg)
      if (!manifestDigests) throw ctError("CT_EFFECT_MANIFEST_INVALID")
      const { effect_manifest_digest, pre_start_boundary_digest } = manifestDigests

      const occurredAt = now()
      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const claimantAuthority = { binding_id: claimant.binding_id, identity_digest: claimant.identity_digest, ctx_digest: callerCtxDigest }
      const casValue = { kind: "ack_cas_v1", version: 1, writer_fence_v1: writerFence, claimant_authority_v1: claimantAuthority,
        delivery_id: request.delivery_id, id: request.id, expected_delivery_state: "CLAIMED", expected_handoff_state: "CLAIMED", expected_generation: request.eg,
        purpose: "WORK", claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, token_hash: tokenHash,
        handoff_fingerprint: handoff.handoff_fingerprint, effect_manifest_digest, pre_start_boundary_digest }
      const cas_digest = requestDigest(casValue)

      if (db.run("UPDATE ct_handoff SET state='STARTED' WHERE id=? AND state='CLAIMED'", [request.id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")

      const publicResponse = { id: request.id, state: "STARTED", generation: request.eg, replayed: false }
      const response_digest = requestDigest(publicResponse)
      const ackDecision = { kind: "ack_decision_v1", version: 1, delivery_id: request.delivery_id, id: request.id, from_state: "CLAIMED", to_state: "STARTED",
        generation: request.eg, claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, token_hash: tokenHash,
        effect_manifest_digest, pre_start_boundary_digest }
      const decision_digest = requestDigest(ackDecision)

      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,?,'ACK','CLAIMED','STARTED','CLAIMANT',?,?,?,?,?,?,?,?)`,
        [makeId(), request.id, request.eg, claimant.binding_id, claimant.identity_digest, request.request_identity, request_digest, cas_digest, decision_digest, response_digest, occurredAt])

      const envelope = { kind: "ack_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request: authenticated_request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest,
          claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, token_hash: tokenHash,
          effect_manifest_digest, pre_start_boundary_digest } }
      db.run("INSERT INTO ct_idempotency VALUES ('ack',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), occurredAt])

      return { id: request.id, state: "STARTED", generation: request.eg, replayed: false }
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const attestCompletionRequestKeys = ["eg", "es", "id", "request_identity"]
const assertAttestCompletionRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(attestCompletionRequestKeys) ||
      !uuid.test(request.request_identity ?? "") || !isBase64url32(request.id) || request.es !== "STARTED" || !safeEpoch(request.eg)) throw ctError("CT_PAYLOAD_INVALID")
}
// P5-B: attestCompletion is Main-authority-only and derives every evidence
// member itself — the caller supplies no digest, evidence, or authority,
// exactly as P4 validate never accepts a caller validation_digest.
// Attestation is single-use: the STARTED->COMPLETION_ATTESTED state CAS can
// succeed only once per handoff/generation, so a genuine second attempt
// always finds a non-STARTED state and fails CT_INVALID_TRANSITION before
// any mutation.
export const continuationAttestCompletion = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority)
      if (version === 5) validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertAttestCompletionRequest(request)

      // Exact ACTIVE Main predicate — same canonical-worktree/epoch gate
      // validate/publish already use for this scope.
      const ctx = ctxFactory(), main = coherentMain(persisted.rows)
      assertMainGate(ctx, authority, main)

      const request_digest = requestDigest(request)
      const scopeKey = `handoff:${request.id}:generation:${request.eg}:attest`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='attestCompletion' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='attestCompletion' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "attestCompletion_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        const { id, state: publicState, generation } = envelope.public_response
        return { id, state: publicState, generation, replayed: true }
      }

      const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.id)
      if (!handoff) throw ctError("CT_NOT_FOUND")
      if (handoff.state !== request.es) throw ctError("CT_INVALID_TRANSITION")
      if (handoff.generation !== request.eg) throw ctError("CT_FENCE_MISMATCH")

      const claim = db.query("SELECT * FROM ct_claim WHERE handoff_id=? AND generation=? AND claim_state='LIVE'").get(request.id, request.eg)
      if (!claim) throw ctError("CT_FENCE_MISMATCH")
      const delivery = db.query("SELECT * FROM ct_delivery WHERE delivery_id=?").get(claim.delivery_id)
      if (!delivery || delivery.delivery_state !== "CLAIMED" || delivery.claim_id !== claim.claim_id) throw ctError("CT_FENCE_MISMATCH")

      // Recompute the persisted ACK effect envelope this attestation binds
      // to — never trust anything but the immutable persisted digests.
      const ackRow = db.query("SELECT * FROM ct_idempotency WHERE operation='ack' AND scope_key=?").get(`handoff:${request.id}:generation:${request.eg}:ack`)
      let ackEnvelope
      try { ackEnvelope = ackRow && JSON.parse(ackRow.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
      const effect_manifest_digest = ackEnvelope?.evidence?.effect_manifest_digest, pre_start_boundary_digest = ackEnvelope?.evidence?.pre_start_boundary_digest
      if (!sha256Digest.test(effect_manifest_digest ?? "") || !sha256Digest.test(pre_start_boundary_digest ?? "")) throw ctError("CT_SCHEMA_INVALID")

      const occurredAt = now()
      const attestationEvidence = {
        kind: "attestation_evidence_v1", version: 1,
        id: request.id, lineage_id: handoff.lineage_id, revision: handoff.revision, generation: request.eg, handoff_fingerprint: handoff.handoff_fingerprint,
        repository_fingerprint: handoff.repository_fingerprint, git_common_dir_fingerprint: handoff.git_common_dir_fingerprint,
        source_merge: { sha: handoff.source_merge_sha, url: handoff.source_merge_url },
        content: { next_unit_scope_digest: handoff.next_unit_scope_digest, provenance_digest: handoff.provenance_digest, decision_summary_digest: handoff.decision_summary_digest },
        claim: { claim_id: claim.claim_id, delivery_id: delivery.delivery_id, purpose: "WORK", claimant_fence_digest: claim.claimant_fence_digest, claimant_identity_digest: claim.claimant_identity_digest },
        effects: { effect_manifest_digest, pre_start_boundary_digest },
        attestor: { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, main_identity_digest: main.identity_digest },
      }
      const attestationDigest = requestDigest(attestationEvidence)

      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: "attest_cas_v1", version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        id: request.id, expected_state: "STARTED", expected_generation: request.eg, handoff_fingerprint: handoff.handoff_fingerprint,
        claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, effect_manifest_digest, pre_start_boundary_digest,
        attestation_digest: attestationDigest, expected_attestation: "ABSENT" }
      const cas_digest = requestDigest(casValue)

      if (db.run("UPDATE ct_handoff SET state='COMPLETION_ATTESTED' WHERE id=? AND state='STARTED'", [request.id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")

      const publicResponse = { id: request.id, state: "COMPLETION_ATTESTED", generation: request.eg, replayed: false }
      const response_digest = requestDigest(publicResponse)

      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,?,'ATTEST_COMPLETION','STARTED','COMPLETION_ATTESTED','MAIN',?,?,?,?,?,?,?,?)`,
        [makeId(), request.id, request.eg, main.main_binding_id, main.identity_digest, request.request_identity, request_digest, cas_digest, attestationDigest, response_digest, occurredAt])

      const envelope = { kind: "attestCompletion_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest,
          attestation_digest: attestationDigest, attestation_evidence: attestationEvidence, claim_id: claim.claim_id, effect_manifest_digest, pre_start_boundary_digest } }
      db.run("INSERT INTO ct_idempotency VALUES ('attestCompletion',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), occurredAt])

      return { id: request.id, state: "COMPLETION_ATTESTED", generation: request.eg, replayed: false }
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const completeRequestKeys = ["attestation_digest", "committed_result", "delivery_id", "eg", "es", "id", "purpose", "request_identity", "token"]
const assertCompleteRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(completeRequestKeys) ||
      !uuid.test(request.request_identity ?? "") || !isBase64url32(request.delivery_id) || !isBase64url32(request.id) ||
      request.es !== "COMPLETION_ATTESTED" || !safeEpoch(request.eg) || !["WORK", "ATTESTATION_REDELIVERY"].includes(request.purpose) ||
      !isBase64url32(request.token) || !sha256Digest.test(request.attestation_digest ?? "") ||
      !validCommittedResult(request.committed_result, request.id, request.eg, request.attestation_digest)) throw ctError("CT_PAYLOAD_INVALID")
}
// P5-C: complete is the claimant's sole completion operation — it consumes
// the single-use attestation by CASing COMPLETION_ATTESTED->COMPLETED and
// closing the claim and delivery in the same transaction. The state CAS can
// succeed only once per handoff/generation, so the attestation is
// structurally single-use; the fixed single-use scope key
// (handoff:<id>:generation:<eg>:complete) means any second call for the
// same handoff/generation — same or distinct request_identity — is resolved
// by the idempotency pair before any state is re-examined (CT-R6-S3), the
// same structural pattern P5-B established for attestCompletion. The bearer
// is validated token-free exactly like ack: the caller resends the raw
// token, the server hashes its UTF-8 bytes once and constant-time compares
// that hash against the persisted ct_claim.token_hash — the raw token is
// never stored, returned again, or placed in any envelope.
export const continuationComplete = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      const lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority); if (version === 5) validateSchema5CommitEvidence(db, authority); validateSchema3Persistence(db, authority); validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertCompleteRequest(request)

      // Exact ACTIVE claimant (CLAIMANT) predicate — identical shape to the
      // predicate ack/claim/create already use for this scope.
      const ctx = ctxFactory(), pluginScopeDigest = requestDigest(scope(ctx))
      if (db.query("SELECT 1 FROM ct_claimant_conflict WHERE plugin_scope_digest=? LIMIT 1").get(pluginScopeDigest)) throw ctError("CT_SESSION_MULTIPLEXED")
      const bindings = scopeBindings(db, ctx, authority)
      if (bindings.some(({ binding_status }) => binding_status === "MULTIPLEXED")) throw ctError("CT_SESSION_MULTIPLEXED")
      const active = bindings.filter(({ binding_status }) => binding_status === "ACTIVE")
      if (active.length !== 1) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      const claimant = active[0]
      if (claimant.binding_epoch !== ctx.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      if (!equalFields(claimant, ctx, bindingFields)) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")

      const { token, ...tokenFreeRequest } = request
      const authenticated_request = { ...tokenFreeRequest, token_hash: sha256(Buffer.from(token)) }
      const request_digest = requestDigest(authenticated_request)
      const scopeKey = `handoff:${request.id}:generation:${request.eg}:complete`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='complete' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='complete' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "complete_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        const { id, state: publicState, generation } = envelope.public_response
        return { id, state: publicState, generation, replayed: true }
      }

      const delivery = db.query("SELECT * FROM ct_delivery WHERE delivery_id=?").get(request.delivery_id)
      if (!delivery) throw ctError("CT_NOT_FOUND")
      const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.id)
      if (!handoff) throw ctError("CT_NOT_FOUND")

      if (handoff.state !== request.es) throw ctError("CT_INVALID_TRANSITION")
      const repositoryFingerprint = requestDigest({ kind: "canonical_repo_v1", path: authority.anchor.context.canonical_repo })
      const gitCommonDirFingerprint = requestDigest({ kind: "git_common_dir_v1", path: authority.anchor.context.git_common_dir })
      if (delivery.handoff_id !== request.id || delivery.purpose !== request.purpose || delivery.generation !== request.eg || handoff.generation !== request.eg ||
          handoff.repository_fingerprint !== repositoryFingerprint || handoff.git_common_dir_fingerprint !== gitCommonDirFingerprint) throw ctError("CT_FENCE_MISMATCH")
      if (delivery.delivery_state !== "CLAIMED" || delivery.claim_id === null) throw ctError("CT_INVALID_TRANSITION")
      const claim = db.query("SELECT * FROM ct_claim WHERE claim_id=?").get(delivery.claim_id)
      if (!claim) throw ctError("CT_FENCE_MISMATCH")
      if (claim.claim_state !== "LIVE") throw ctError("CT_INVALID_TRANSITION")
      const callerCtx = tuple(ctx), callerCtxDigest = requestDigest(callerCtx)
      if (claim.claimant_binding_id !== claimant.binding_id || claim.claimant_identity_digest !== claimant.identity_digest || claim.claimant_ctx_digest !== callerCtxDigest) throw ctError("CT_FENCE_MISMATCH")

      const tokenHash = sha256(Buffer.from(token))
      const presented = Buffer.from(tokenHash), stored = Buffer.from(claim.token_hash)
      if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) throw ctError("CT_TOKEN_MISMATCH")

      // P6-F: design.md:1848 — after REDELIVER_ATTESTATION the handoff sits
      // at eg+1 while its attestation was recorded at the source generation,
      // so the ordinary same-generation ATTEST_COMPLETION lookup finds
      // nothing. Extend exactly this one rung: when no ATTEST_COMPLETION
      // transition exists at (id, eg), resolve the unique
      // ct_recovery_disposition row that redelivered this exact generation
      // and require the caller's attestation_digest to equal its preserved
      // digest, which must itself equal the decision_digest of the
      // ATTEST_COMPLETION transition at its recorded source generation — no
      // other complete rung changes.
      const attestRow = db.query("SELECT decision_digest FROM ct_handoff_transition WHERE handoff_id=? AND generation=? AND operation='ATTEST_COMPLETION'").get(request.id, request.eg)
      if (attestRow) {
        if (request.attestation_digest !== attestRow.decision_digest) throw ctError("CT_FENCE_MISMATCH")
      } else {
        const redelivery = db.query("SELECT * FROM ct_recovery_disposition WHERE disposition='REDELIVER_ATTESTATION' AND handoff_id=? AND to_generation=?").get(request.id, request.eg)
        if (!redelivery || request.attestation_digest !== redelivery.preserved_attestation_digest) throw ctError("CT_FENCE_MISMATCH")
        const sourceAttestRow = db.query("SELECT decision_digest FROM ct_handoff_transition WHERE handoff_id=? AND generation=? AND operation='ATTEST_COMPLETION'").get(request.id, redelivery.attestation_source_generation)
        if (!sourceAttestRow || redelivery.preserved_attestation_digest !== sourceAttestRow.decision_digest) throw ctError("CT_FENCE_MISMATCH")
      }

      const occurredAt = now()
      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const claimantAuthority = { binding_id: claimant.binding_id, identity_digest: claimant.identity_digest, ctx_digest: callerCtxDigest }
      const casValue = { kind: "complete_cas_v1", version: 1, writer_fence_v1: writerFence, claimant_authority_v1: claimantAuthority,
        delivery_id: request.delivery_id, id: request.id, expected_delivery_state: "CLAIMED", expected_handoff_state: "COMPLETION_ATTESTED", expected_generation: request.eg,
        purpose: request.purpose, claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, token_hash: tokenHash,
        attestation_digest: request.attestation_digest, expected_claim_state: "LIVE", result_digest: request.committed_result.result_digest }
      const cas_digest = requestDigest(casValue)

      if (db.run("UPDATE ct_handoff SET state='COMPLETED' WHERE id=? AND state='COMPLETION_ATTESTED'", [request.id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (db.run("UPDATE ct_claim SET claim_state='CLOSED', closed_at=? WHERE claim_id=? AND claim_state='LIVE'", [occurredAt, claim.claim_id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (db.run("UPDATE ct_delivery SET delivery_state='CLOSED', closed_at=? WHERE delivery_id=? AND delivery_state='CLAIMED'", [occurredAt, request.delivery_id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")

      const publicResponse = { id: request.id, state: "COMPLETED", generation: request.eg, replayed: false }
      const response_digest = requestDigest(publicResponse)
      const completeDecision = { kind: "complete_decision_v1", version: 1, delivery_id: request.delivery_id, id: request.id, from_state: "COMPLETION_ATTESTED", to_state: "COMPLETED",
        generation: request.eg, purpose: request.purpose, claim_id: claim.claim_id, claimant_fence_digest: claim.claimant_fence_digest, token_hash: tokenHash,
        attestation_digest: request.attestation_digest, result_digest: request.committed_result.result_digest }
      const decision_digest = requestDigest(completeDecision)

      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,?,'COMPLETE','COMPLETION_ATTESTED','COMPLETED','CLAIMANT',?,?,?,?,?,?,?,?)`,
        [makeId(), request.id, request.eg, claimant.binding_id, claimant.identity_digest, request.request_identity, request_digest, cas_digest, decision_digest, response_digest, occurredAt])

      const envelope = { kind: "complete_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request: authenticated_request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest,
          attestation_digest: request.attestation_digest, committed_result: request.committed_result, result_digest: request.committed_result.result_digest,
          claim_id: claim.claim_id, delivery_id: request.delivery_id, token_hash: tokenHash } }
      db.run("INSERT INTO ct_idempotency VALUES ('complete',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), occurredAt])

      return { id: request.id, state: "COMPLETED", generation: request.eg, replayed: false }
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const rejectRequestKeys = ["eg", "es", "id", "request_identity"]
const assertRejectRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(rejectRequestKeys) || !uuid.test(request.request_identity ?? "") ||
      !isBase64url32(request.id) || !["DRAFT", "VALIDATED", "PUBLISHED"].includes(request.es) || !safeEpoch(request.eg)) throw ctError("CT_PAYLOAD_INVALID")
}
export const continuationReject = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version), lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority)
      if (version === 5) validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertRejectRequest(request)
      const ctx = ctxFactory(), main = coherentMain(persisted.rows)
      assertMainGate(ctx, authority, main)

      const request_digest = requestDigest(request), scopeKey = `handoff:${request.id}:generation:${request.eg}:reject`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='reject' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='reject' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "reject_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }

      const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.id)
      if (!handoff) throw ctError("CT_NOT_FOUND")
      if (handoff.state !== request.es) throw ctError("CT_INVALID_TRANSITION")
      if (handoff.generation !== request.eg) throw ctError("CT_FENCE_MISMATCH")
      const deliveries = db.query("SELECT * FROM ct_delivery WHERE handoff_id=? AND generation=?").all(request.id, request.eg)
      const claims = db.query("SELECT * FROM ct_claim WHERE handoff_id=? AND generation=?").all(request.id, request.eg)
      let delivery = null
      if (request.es === "PUBLISHED") {
        if (deliveries.length !== 1 || claims.length !== 0 || deliveries[0].purpose !== "WORK" || deliveries[0].delivery_state !== "PENDING" || deliveries[0].claim_id !== null) throw ctError("CT_INVALID_TRANSITION")
        delivery = deliveries[0]
      } else if (deliveries.length !== 0 || claims.length !== 0) throw ctError("CT_INVALID_TRANSITION")

      const occurredAt = now(), closedDeliveryId = delivery?.delivery_id ?? null
      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: "reject_cas_v1", version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        id: request.id, expected_state: request.es, expected_generation: request.eg, handoff_fingerprint: handoff.handoff_fingerprint,
        expected_delivery: request.es === "PUBLISHED" ? "PENDING_UNCLAIMED" : "ABSENT", delivery_id: closedDeliveryId }
      const cas_digest = requestDigest(casValue)
      if (db.run("UPDATE ct_handoff SET state='REJECTED' WHERE id=? AND state=? AND generation=?", [request.id, request.es, request.eg]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (delivery && db.run("UPDATE ct_delivery SET delivery_state='CLOSED',closed_at=? WHERE delivery_id=? AND delivery_state='PENDING' AND claim_id IS NULL", [occurredAt, delivery.delivery_id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")

      const publicResponse = { id: request.id, state: "REJECTED", generation: request.eg, replayed: false }
      const response_digest = requestDigest(publicResponse)
      const decision_digest = requestDigest({ kind: "reject_decision_v1", version: 1, id: request.id, from_state: request.es,
        to_state: "REJECTED", generation: request.eg, closed_delivery_id: closedDeliveryId })
      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,?,'REJECT',?,'REJECTED','MAIN',?,?,?,?,?,?,?,?)`,
        [makeId(), request.id, request.eg, request.es, main.main_binding_id, main.identity_digest, request.request_identity, request_digest, cas_digest, decision_digest, response_digest, occurredAt])
      const envelope = { kind: "reject_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, closed_delivery_id: closedDeliveryId } }
      db.run("INSERT INTO ct_idempotency VALUES ('reject',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), occurredAt])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const reviseRequestKeys = ["lineage_id", "payload", "payload_digest", "request_identity", "revision", "source_id"]
const assertReviseRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(reviseRequestKeys) || !uuid.test(request.request_identity ?? "") ||
      !isBase64url32(request.source_id) || !uuid.test(request.lineage_id ?? "") || !safeEpoch(request.revision) || request.revision < 2 ||
      !sha256Digest.test(request.payload_digest ?? "") || !request.payload || Object.getPrototypeOf(request.payload) !== Object.prototype) throw ctError("CT_PAYLOAD_INVALID")
}
export const continuationRevise = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (![4, 5].includes(version)) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version), lease = validateLease(db)
      validateSchema4CommitEvidence(db, authority)
      if (version === 5) validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (lease.lease_status !== "NONE" || lease.owner_main_binding_id !== null || lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      assertReviseRequest(request)
      const ctx = ctxFactory(), main = coherentMain(persisted.rows)
      assertMainGate(ctx, authority, main)

      const request_digest = requestDigest(request), scopeKey = `handoff:${request.lineage_id}:revision:${request.revision}`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='revise' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='revise' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "revise_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }

      const source = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.source_id)
      if (!source) throw ctError("CT_NOT_FOUND")
      if (source.state !== "REJECTED") throw ctError("CT_INVALID_TRANSITION")
      if (source.lineage_id !== request.lineage_id || source.revision + 1 !== request.revision) throw ctError("CT_FENCE_MISMATCH")
      if (db.query("SELECT 1 FROM ct_handoff WHERE lineage_id=? AND revision=?").get(request.lineage_id, request.revision)) throw ctError("CT_IDEMPOTENCY_CONFLICT")

      const payload = request.payload
      if (!validHandoffPayload(payload) || payload.lineage.lineage_id !== request.lineage_id || payload.lineage.revision !== request.revision) throw ctError("CT_PAYLOAD_INVALID")
      const payloadJson = jcs(payload)
      if (Buffer.byteLength(payloadJson) > 65536 || sha256(Buffer.from(payloadJson)) !== request.payload_digest) throw ctError("CT_PAYLOAD_INVALID")
      const repositoryFingerprint = requestDigest({ kind: "canonical_repo_v1", path: authority.anchor.context.canonical_repo })
      const gitCommonDirFingerprint = requestDigest({ kind: "git_common_dir_v1", path: authority.anchor.context.git_common_dir })
      const sourceDigest = requestDigest({ source_kind: payload.provenance.source_kind, source_ref: payload.provenance.source_ref,
        source_merge_sha: payload.repository.source_merge.sha, source_merge_url: payload.repository.source_merge.url })
      if (payload.repository.repository_fingerprint !== repositoryFingerprint || payload.repository.git_common_dir_fingerprint !== gitCommonDirFingerprint ||
          payload.provenance.source_digest !== sourceDigest) throw ctError("CT_PAYLOAD_INVALID")

      const producerCtx = tuple(ctx), producerCtxJson = jcs(producerCtx), producerCtxDigest = requestDigest(producerCtx)
      const nextUnitScopeDigest = requestDigest({ unit_id: payload.next_unit.unit_id, scope: payload.next_unit.scope })
      const dependenciesDigest = requestDigest(payload.next_unit.dependencies), referencesDigest = requestDigest(payload.next_unit.references)
      const snapshotsDigest = requestDigest(payload.snapshots), provenanceDigest = requestDigest({ source_digest: sourceDigest, references_digest: referencesDigest, snapshots_digest: snapshotsDigest })
      const decisionSummaryDigest = sha256(payload.decision_summary), id = makeId(), occurredAt = now()
      const fingerprint = { kind: "handoff_fingerprint_v1", version: 1, id, lineage_id: request.lineage_id, revision: request.revision,
        payload_digest: request.payload_digest, repository_fingerprint: repositoryFingerprint, git_common_dir_fingerprint: gitCommonDirFingerprint,
        next_unit_scope_digest: nextUnitScopeDigest, dependencies_digest: dependenciesDigest, references_digest: referencesDigest, snapshots_digest: snapshotsDigest,
        provenance_digest: provenanceDigest, decision_summary_digest: decisionSummaryDigest,
        producer_binding_id: main.main_binding_id, producer_identity_digest: main.identity_digest, producer_ctx_digest: producerCtxDigest }
      const handoffFingerprint = requestDigest(fingerprint)
      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: "revise_cas_v1", version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        lineage_id: request.lineage_id, target_revision: request.revision, source_id: source.id, source_revision: source.revision,
        source_expected_state: "REJECTED", payload_digest: request.payload_digest, handoff_fingerprint: handoffFingerprint,
        expected_lineage_revision: "ABSENT" }
      const cas_digest = requestDigest(casValue)

      db.run(`INSERT INTO ct_handoff(id,lineage_id,revision,state,generation,payload_json,payload_digest,handoff_fingerprint,repository_fingerprint,git_common_dir_fingerprint,
        source_merge_sha,source_merge_url,next_unit_scope_digest,dependencies_digest,references_digest,snapshots_digest,provenance_digest,decision_summary_digest,
        producer_binding_id,producer_identity_digest,producer_ctx_json,producer_ctx_digest,validation_evidence_json,validation_digest,created_at,validated_at,published_at)
        VALUES (?,?,?,'DRAFT',0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,?,NULL,NULL)`,
        [id, request.lineage_id, request.revision, payloadJson, request.payload_digest, handoffFingerprint, repositoryFingerprint, gitCommonDirFingerprint,
          payload.repository.source_merge.sha, payload.repository.source_merge.url, nextUnitScopeDigest, dependenciesDigest, referencesDigest, snapshotsDigest,
          provenanceDigest, decisionSummaryDigest, main.main_binding_id, main.identity_digest, producerCtxJson, producerCtxDigest, occurredAt])
      const publicResponse = { id, state: "DRAFT", generation: 0, revision: request.revision, replayed: false }
      const response_digest = requestDigest(publicResponse)
      const decision_digest = requestDigest({ kind: "revise_decision_v1", version: 1, new_id: id, lineage_id: request.lineage_id,
        revision: request.revision, source_id: source.id, source_revision: source.revision, new_handoff_fingerprint: handoffFingerprint })
      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,0,'REVISE',NULL,'DRAFT','MAIN',?,?,?,?,?,?,?,?)`,
        [makeId(), id, main.main_binding_id, main.identity_digest, request.request_identity, request_digest, cas_digest, decision_digest, response_digest, occurredAt])
      const envelope = { kind: "revise_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, new_id: id, new_handoff_fingerprint: handoffFingerprint,
          source_id: source.id, source_revision: source.revision } }
      db.run("INSERT INTO ct_idempotency VALUES ('revise',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), occurredAt])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

// P6-C: recordTerminationReceipt is server-only proof. The request merely
// names a persisted binding and a process role; every other field (identity,
// process tuple, PID-reuse observation, boot/session ids) is derived from the
// constructor-owned processObserver capability and the persisted row, never
// from the caller. Freshness is a 30-second window, re-verified at every use
// by validTerminationPairing below — never a durable licence.
const TERMINATION_RECEIPT_FRESHNESS_MS = 30_000
const recordTerminationReceiptKeys = ["process_role", "request_identity", "subject_binding_epoch", "subject_binding_id", "subject_kind"]
const assertRecordTerminationReceiptRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(recordTerminationReceiptKeys) ||
      !uuid.test(request.request_identity ?? "") || !["CLAIMANT", "MAIN"].includes(request.subject_kind) ||
      !isBase64url32(request.subject_binding_id) || !safeEpoch(request.subject_binding_epoch) || request.subject_binding_epoch === 0 ||
      !["HOST", "MCP"].includes(request.process_role)) throw ctError("CT_PAYLOAD_INVALID")
}
// The rollback-owner-Main branch is structurally present for P6-E's rollback
// plane (mode ROLLING_BACK), but is unreachable until beginRollback exists —
// only mode ON is exercised by this unit's own tests.
const recoveryMainAuthority = (persisted, state) => {
  const main = coherentMain(persisted.rows)
  if (state.mode === "ON") { if (!main) throw ctError("CT_WORKFLOW_MAIN_REQUIRED"); return main }
  if (!main || persisted.lease.owner_main_binding_id !== main.main_binding_id) throw ctError("CT_MAIN_BINDING_CONFLICT")
  return main
}
// The subject binding row is read, never asserted by the caller. MAIN names
// the exact persisted ct_main_binding row (handoff_id NULL, generation 0);
// CLAIMANT must own exactly one LIVE ct_claim, whose handoff/generation are
// the claim's, never the caller's.
const resolveTerminationSubject = (db, authority, request) => {
  if (request.subject_kind === "MAIN") {
    const row = db.query("SELECT * FROM ct_main_binding WHERE main_binding_id=?").get(request.subject_binding_id)
    if (!row) throw ctError("CT_NOT_FOUND")
    const asserted = assertMainBinding(row, authority)
    if (asserted.binding_epoch !== request.subject_binding_epoch) throw ctError("CT_SCHEMA_INVALID")
    return { binding_id: asserted.main_binding_id, binding_epoch: asserted.binding_epoch, identity_digest: asserted.identity_digest,
      host_process_instance: asserted.host_process_instance, plugin_instance: asserted.plugin_instance, root_session_id: asserted.root_session_id,
      mcp_process_instance: asserted.mcp_process_instance, pid_start_marker: asserted.pid_start_marker, handoff_id: null, generation: 0 }
  }
  const row = db.query("SELECT * FROM ct_claimant_binding WHERE binding_id=?").get(request.subject_binding_id)
  if (!row) throw ctError("CT_NOT_FOUND")
  const asserted = assertClaimantBinding(row, authority)
  if (asserted.binding_epoch !== request.subject_binding_epoch) throw ctError("CT_SCHEMA_INVALID")
  const claims = db.query("SELECT * FROM ct_claim WHERE claim_state='LIVE' AND claimant_binding_id=?").all(asserted.binding_id)
  if (claims.length !== 1) throw ctError("CT_NOT_FOUND")
  return { binding_id: asserted.binding_id, binding_epoch: asserted.binding_epoch, identity_digest: asserted.identity_digest,
    host_process_instance: asserted.host_process_instance, plugin_instance: asserted.plugin_instance, root_session_id: asserted.root_session_id,
    mcp_process_instance: asserted.mcp_process_instance, pid_start_marker: asserted.pid_start_marker, handoff_id: claims[0].handoff_id, generation: claims[0].generation }
}
const terminationReceiptValue = (request, subject, observation, observedAt, lease) => ({
  kind: "termination_receipt_v1", version: 1,
  subject: { kind: request.subject_kind, binding_id: subject.binding_id, identity_digest: subject.identity_digest, binding_epoch: subject.binding_epoch },
  process: { role: request.process_role, host_process_instance: subject.host_process_instance, plugin_instance: subject.plugin_instance, root_session_id: subject.root_session_id,
    mcp_process_instance: subject.mcp_process_instance, pid_start_marker: subject.pid_start_marker, observed_start_marker: observation.observed_start_marker ?? null },
  proof: { issuer: "CT_MAIN_OBSERVER_V1", verifier: "CT_MAIN_VERIFIER_V1", method: "OS_PROCESS_TABLE_V1", observation: observation.status,
    os_boot_id: observation.os_boot_id, os_session_id: observation.os_session_id, terminated: true },
  binding: { rollback_epoch: lease.rollback_epoch, lease_version: lease.lease_version, generation: subject.generation, handoff_id: subject.handoff_id },
  observed_at: observedAt,
})
const terminationPairingValue = (subject, observation, lease) => ({
  kind: "termination_pairing_v1", version: 1, subject_binding_id: subject.binding_id, subject_identity_digest: subject.identity_digest,
  subject_binding_epoch: subject.binding_epoch, rollback_epoch: lease.rollback_epoch, generation: subject.generation,
  os_boot_id: observation.os_boot_id, os_session_id: observation.os_session_id, roles: ["HOST", "MCP"],
})

const recoverRequestKeys = ["action", "claim_id", "delivery_id", "eg", "es", "expected_rollback_epoch", "id", "request_identity", "rollback_proof"]
// P6-F: design.md:1797/1799 name REDELIVER_WORK/REDELIVER_ATTESTATION as
// "ON only, ACTIVE Main" — added to onRecoverActions (the ON-mode legality
// gate) and, transitively, to allRecoverActions (the request-shape
// allow-list) below. Neither name is ever added to
// rollingBackOnlyRecoverActions, rollingBackLegalRecoverActions, or
// rollingBackFenceDispositions — design.md:1801 forbids both of them under
// ROLLING_BACK explicitly.
const onRecoverActions = new Set(["NOT_STARTED", "ROLLED_BACK", "CANCELLED", "POISONED", "REDELIVER_WORK", "REDELIVER_ATTESTATION"])
// P6-E (corrective): design.md:1794-1795 names CANCELLED/POISONED mode as "ON
// or ROLLING_BACK, ACTIVE or rollback-owner Main" and design.md:1801 forbids
// only NOT_STARTED/ROLLED_BACK/REDELIVER_WORK/REDELIVER_ATTESTATION under
// ROLLING_BACK — CANCELLED/POISONED are legal under both modes. Kept as two
// separate sets: rollingBackOnlyRecoverActions gates the frozen-inventory-
// digest proof (SUSPEND_PENDING/SUSPEND_ATTESTATION only, per the
// ct_recovery_disposition CHECK), while rollingBackLegalRecoverActions gates
// ROLLING_BACK-mode legality (adds CANCELLED/POISONED).
const rollingBackOnlyRecoverActions = new Set(["SUSPEND_PENDING", "SUSPEND_ATTESTATION"])
const rollingBackLegalRecoverActions = new Set([...rollingBackOnlyRecoverActions, "CANCELLED", "POISONED"])
const allRecoverActions = new Set([...onRecoverActions, ...rollingBackOnlyRecoverActions])
const recoverToStates = { NOT_STARTED: "PUBLISHED", ROLLED_BACK: "PUBLISHED", CANCELLED: "CANCELLED", POISONED: "POISONED", SUSPEND_PENDING: "WORK_SUSPENDED", SUSPEND_ATTESTATION: "ATTESTATION_SUSPENDED",
  REDELIVER_WORK: "PUBLISHED", REDELIVER_ATTESTATION: "COMPLETION_ATTESTED" }
const assertRecoverRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(recoverRequestKeys) || !uuid.test(request.request_identity ?? "") ||
      !isBase64url32(request.id) || !["PUBLISHED", "CLAIMED", "STARTED", "COMPLETION_ATTESTED", "WORK_SUSPENDED", "ATTESTATION_SUSPENDED"].includes(request.es) || !safeEpoch(request.eg) ||
      !allRecoverActions.has(request.action) || !safeEpoch(request.expected_rollback_epoch) ||
      // P6-F: REDELIVER_WORK/REDELIVER_ATTESTATION name no delivery/claim to
      // close (design.md:1786's "null exactly when the disposition names
      // none"), so the accepted request must carry both as null; every
      // other disposition still requires a non-null delivery_id.
      !(recoverRedeliveryActions.has(request.action) ? request.delivery_id === null : isBase64url32(request.delivery_id)) ||
      !(recoverRedeliveryActions.has(request.action) ? request.claim_id === null : (request.claim_id === null || isBase64url32(request.claim_id))) ||
      !(request.rollback_proof === null || (request.rollback_proof && Object.getPrototypeOf(request.rollback_proof) === Object.prototype)))
    throw ctError("CT_PAYLOAD_INVALID")
}

// P6-D added ON-mode recovery; P6-E extends the same handler to accept mode
// ROLLING_BACK for SUSPEND_PENDING/SUSPEND_ATTESTATION (ROLLING_BACK-only) and
// for CANCELLED/POISONED (legal under both ON and ROLLING_BACK, per
// design.md:1794-1795). P6-F adds REDELIVER_WORK/REDELIVER_ATTESTATION
// (ON-only): unlike every other disposition, these name no delivery/claim to
// close — the prior SUSPEND_PENDING/SUSPEND_ATTESTATION already closed that
// row — so no delivery/claim lookup runs for them and only a fresh PENDING
// delivery is created. Every accepted disposition appends one transition,
// disposition, and idempotency row in the same transaction.
export const continuationRecover = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (version !== 5) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      validateSchema4CommitEvidence(db, authority); validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      assertRecoverRequest(request)
      if (state.mode === "ON") {
        if (persisted.lease.lease_status !== "NONE" || persisted.lease.owner_main_binding_id !== null || persisted.lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
        if (request.expected_rollback_epoch !== persisted.lease.rollback_epoch) throw ctError("CT_FENCE_MISMATCH")
        if (!onRecoverActions.has(request.action)) throw ctError("CT_RECOVERY_DISPOSITION_FORBIDDEN")
      } else {
        if (persisted.lease.lease_status !== "ACTIVE") throw ctError("CT_SCHEMA_INVALID")
        if (request.expected_rollback_epoch !== persisted.lease.rollback_epoch) throw ctError("CT_ROLLBACK_IN_PROGRESS")
        if (!rollingBackLegalRecoverActions.has(request.action)) throw ctError("CT_RECOVERY_DISPOSITION_FORBIDDEN")
      }
      const ctx = ctxFactory(), main = recoveryMainAuthority(persisted, state)
      assertMainGate(ctx, authority, main)

      const request_digest = requestDigest(request), scopeKey = `handoff:${request.id}:generation:${request.eg}:${request.action.toLowerCase()}`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='recover' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='recover' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== `${request.action.toLowerCase()}_response_envelope_v1` || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }

      const handoff = db.query("SELECT * FROM ct_handoff WHERE id=?").get(request.id)
      if (!handoff) throw ctError("CT_NOT_FOUND")
      const expectedSource = { NOT_STARTED: "CLAIMED", ROLLED_BACK: "STARTED", SUSPEND_PENDING: "PUBLISHED", SUSPEND_ATTESTATION: "COMPLETION_ATTESTED",
        REDELIVER_WORK: "WORK_SUSPENDED", REDELIVER_ATTESTATION: "ATTESTATION_SUSPENDED" }[request.action]
      if (handoff.state !== request.es || (expectedSource ? request.es !== expectedSource : !recoverCancelPoisonSources.has(request.es))) throw ctError("CT_INVALID_TRANSITION")
      if (handoff.generation !== request.eg) throw ctError("CT_FENCE_MISMATCH")

      // P6-F: REDELIVER_WORK/REDELIVER_ATTESTATION close no delivery/claim —
      // the row at this exact generation is already CLOSED (by the prior
      // SUSPEND_PENDING/SUSPEND_ATTESTATION) and design.md:1797/1799 require
      // no proof and name no closure — so no delivery/claim lookup runs and
      // both remain null, matching the null request fields asserted above.
      const isRedelivery = recoverRedeliveryActions.has(request.action)
      let delivery = null, claim = null
      if (!isRedelivery) {
        const deliveries = db.query("SELECT * FROM ct_delivery WHERE handoff_id=? AND generation=?").all(request.id, request.eg)
        const claims = db.query("SELECT * FROM ct_claim WHERE handoff_id=? AND generation=?").all(request.id, request.eg)
        if (deliveries.length !== 1 || claims.length > 1) throw ctError("CT_SCHEMA_INVALID")
        delivery = deliveries[0]; claim = claims[0] ?? null
        // CT-R7-S8: a genuinely PUBLISHED/PENDING pair can never carry a real
        // claim through any normal flow (claiming always moves the handoff to
        // CLAIMED), so this rung exists purely as defense-in-depth and must run
        // before every other fence/proof check, never masked by them.
        if (request.action === "SUSPEND_PENDING" && claims.length > 0) throw ctError("CT_RECOVERY_CLAIM_PRESENT")
        if (delivery.delivery_id !== request.delivery_id || delivery.purpose !== "WORK" || delivery.claim_id !== (claim?.claim_id ?? null) ||
            request.claim_id !== (claim?.claim_id ?? null)) throw ctError("CT_FENCE_MISMATCH")
        const claimedSource = ["CLAIMED", "STARTED", "COMPLETION_ATTESTED"].includes(request.es)
        if (claimedSource !== Boolean(claim) || (claim && (claim.claim_state !== "LIVE" || delivery.delivery_state !== "CLAIMED")) ||
            (!claim && (delivery.delivery_state !== "PENDING" || delivery.claim_id !== null))) throw ctError("CT_INVALID_TRANSITION")
      }

      let terminationPairingDigest = null
      if (claim) {
        const claimant = db.query("SELECT * FROM ct_claimant_binding WHERE binding_id=?").get(claim.claimant_binding_id)
        if (!claimant || claimant.identity_digest !== claim.claimant_identity_digest) throw ctError("CT_SCHEMA_INVALID")
        terminationPairingDigest = validTerminationPairing(db, { subjectBindingId: claimant.binding_id, subjectBindingEpoch: claimant.binding_epoch,
          subjectIdentityDigest: claimant.identity_digest, rollbackEpoch: persisted.lease.rollback_epoch, generation: request.eg }).pairing_digest
      }

      let rollbackProofValue = null, rollbackProofValueDigest = null
      if (request.action === "ROLLED_BACK") {
        const ackRow = db.query("SELECT response_json FROM ct_idempotency WHERE operation='ack' AND scope_key=?").get(`handoff:${request.id}:generation:${request.eg}:ack`)
        let ackEnvelope
        try { ackEnvelope = ackRow && JSON.parse(ackRow.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        const manifest = ackEnvelope?.evidence?.request?.effect_manifest, preStart = ackEnvelope?.evidence?.pre_start_boundary_digest
        if (!manifest || !preStart || !validRollbackProof(request.rollback_proof, request.id, request.eg, manifest, preStart) || request.rollback_proof.boundary_equal !== true)
          throw ctError("CT_RECOVERY_REQUIRED")
        rollbackProofValue = request.rollback_proof
        rollbackProofValueDigest = rollbackProofDigest(request.rollback_proof)
      } else if (request.rollback_proof !== null) throw ctError("CT_PAYLOAD_INVALID")

      // P6-E: SUSPEND_PENDING/SUSPEND_ATTESTATION require the already-persisted
      // ROLLBACK_FREEZE snapshot of this epoch as their frozen-inventory proof
      // (never a fresh recomputation); SUSPEND_ATTESTATION additionally
      // preserves the ATTEST_COMPLETION decision it will let REDELIVER_ATTESTATION
      // (P6-F) consume later.
      let frozenInventoryDigestValue = null
      if (rollingBackOnlyRecoverActions.has(request.action)) {
        const freeze = db.query("SELECT frozen_inventory_digest FROM ct_quiescence_snapshot WHERE rollback_epoch=? AND snapshot_kind='ROLLBACK_FREEZE'").get(persisted.lease.rollback_epoch)
        if (!freeze) throw ctError("CT_SCHEMA_INVALID")
        frozenInventoryDigestValue = freeze.frozen_inventory_digest
      }
      let preservedAttestationDigestValue = null, attestationSourceGenerationValue = null
      if (request.action === "SUSPEND_ATTESTATION") {
        const attested = db.query("SELECT decision_digest FROM ct_handoff_transition WHERE handoff_id=? AND generation=? AND operation='ATTEST_COMPLETION'").get(request.id, request.eg)
        if (!attested) throw ctError("CT_SCHEMA_INVALID")
        preservedAttestationDigestValue = attested.decision_digest
        attestationSourceGenerationValue = request.eg
      } else if (request.action === "REDELIVER_ATTESTATION") {
        const suspended = db.query("SELECT preserved_attestation_digest,attestation_source_generation FROM ct_recovery_disposition WHERE handoff_id=? AND disposition='SUSPEND_ATTESTATION' AND to_generation=?").all(request.id, request.eg)
        if (suspended.length !== 1) throw ctError("CT_SCHEMA_INVALID")
        const attested = db.query("SELECT decision_digest FROM ct_handoff_transition WHERE handoff_id=? AND generation=? AND operation='ATTEST_COMPLETION'").get(request.id, suspended[0].attestation_source_generation)
        if (!attested || attested.decision_digest !== suspended[0].preserved_attestation_digest) throw ctError("CT_SCHEMA_INVALID")
        preservedAttestationDigestValue = suspended[0].preserved_attestation_digest
        attestationSourceGenerationValue = suspended[0].attestation_source_generation
      }

      const increments = recoverGenerationIncrementDispositions.has(request.action)
      const toState = recoverToStates[request.action], toGeneration = request.eg + (increments ? 1 : 0)
      const occurredAt = now(), createdDeliveryId = increments ? makeId() : null, dispositionId = makeId()
      const createdDeliveryPurpose = request.action === "REDELIVER_ATTESTATION" ? "ATTESTATION_REDELIVERY" : "WORK"
      const writerFence = { schema_version: version, mode: state.mode, anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: persisted.lease.rollback_epoch, observed_lease_version: persisted.lease.lease_version, observed_lease_status: persisted.lease.lease_status }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: `${request.action.toLowerCase()}_cas_v1`, version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        id: request.id, disposition: request.action, expected_state: request.es, expected_generation: request.eg, target_generation: toGeneration,
        expected_rollback_epoch: request.expected_rollback_epoch, expected_lease_version: persisted.lease.lease_version, expected_lease_status: persisted.lease.lease_status,
        expected_delivery_state: delivery?.delivery_state ?? "ABSENT", expected_claim_state: claim?.claim_state ?? "ABSENT", delivery_id: delivery?.delivery_id ?? null,
        claim_id: claim?.claim_id ?? null, handoff_fingerprint: handoff.handoff_fingerprint, termination_pairing_digest: terminationPairingDigest,
        rollback_proof_digest: rollbackProofValueDigest, frozen_inventory_digest: frozenInventoryDigestValue, preserved_attestation_digest: preservedAttestationDigestValue }
      const cas_digest = requestDigest(casValue)

      if (db.run("UPDATE ct_handoff SET state=?,generation=? WHERE id=? AND state=? AND generation=?", [toState, toGeneration, request.id, request.es, request.eg]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (claim && db.run("UPDATE ct_claim SET claim_state='CLOSED',closed_at=? WHERE claim_id=? AND claim_state='LIVE'", [occurredAt, claim.claim_id]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (delivery && db.run("UPDATE ct_delivery SET delivery_state='CLOSED',closed_at=? WHERE delivery_id=? AND delivery_state=?", [occurredAt, delivery.delivery_id, delivery.delivery_state]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (createdDeliveryId) db.run(`INSERT INTO ct_delivery(delivery_id,handoff_id,generation,purpose,delivery_state,handoff_state_snapshot,claim_id,created_at,claimed_at,closed_at)
        VALUES (?,?,?,?,'PENDING',?,NULL,?,NULL,NULL)`, [createdDeliveryId, request.id, toGeneration, createdDeliveryPurpose, toState, occurredAt])

      const decisionValue = { kind: "recover_decision_v1", version: 1, disposition: request.action, id: request.id, from_state: request.es, to_state: toState,
        from_generation: request.eg, to_generation: toGeneration, rollback_epoch: persisted.lease.rollback_epoch, closed_delivery_id: delivery?.delivery_id ?? null,
        closed_claim_id: claim?.claim_id ?? null, created_delivery_id: createdDeliveryId, termination_pairing_digest: terminationPairingDigest,
        rollback_proof_digest: rollbackProofValueDigest, frozen_inventory_digest: frozenInventoryDigestValue, preserved_attestation_digest: preservedAttestationDigestValue }
      const decision_digest = requestDigest(decisionValue)
      db.run(`INSERT INTO ct_recovery_disposition(disposition_id,handoff_id,disposition,from_state,to_state,from_generation,to_generation,mode,rollback_epoch,lease_version,
        main_binding_id,main_binding_epoch,main_identity_digest,termination_pairing_digest,rollback_proof_digest,frozen_inventory_digest,preserved_attestation_digest,
        attestation_source_generation,closed_delivery_id,closed_claim_id,created_delivery_id,request_identity,request_digest,cas_digest,disposition_digest,occurred_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [dispositionId, request.id, request.action, request.es, toState, request.eg, toGeneration, state.mode, persisted.lease.rollback_epoch, persisted.lease.lease_version,
          main.main_binding_id, main.binding_epoch, main.identity_digest, terminationPairingDigest, rollbackProofValueDigest, frozenInventoryDigestValue, preservedAttestationDigestValue,
          attestationSourceGenerationValue, delivery?.delivery_id ?? null, claim?.claim_id ?? null, createdDeliveryId, request.request_identity, request_digest, cas_digest, decision_digest, occurredAt])
      const publicResponse = { id: request.id, state: toState, generation: toGeneration, replayed: false }
      const response_digest = requestDigest(publicResponse)
      db.run(`INSERT INTO ct_handoff_transition(transition_id,handoff_id,generation,operation,from_state,to_state,authority_kind,authority_binding_id,authority_identity_digest,
        request_identity,request_digest,cas_digest,decision_digest,response_digest,occurred_at) VALUES (?,?,?,'RECOVER',?,?,'MAIN',?,?,?,?,?,?,?,?)`,
        [makeId(), request.id, toGeneration, request.es, toState, main.main_binding_id, main.identity_digest, request.request_identity, request_digest, cas_digest, decision_digest, response_digest, occurredAt])
      const envelope = { kind: `${request.action.toLowerCase()}_response_envelope_v1`, version: 1, public_response: publicResponse, evidence: {
        request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, disposition_id: dispositionId,
        closed_delivery_id: delivery?.delivery_id ?? null, closed_claim_id: claim?.claim_id ?? null, created_delivery_id: createdDeliveryId,
        termination_pairing_digest: terminationPairingDigest, rollback_proof: rollbackProofValue, rollback_proof_digest: rollbackProofValueDigest,
        frozen_inventory_digest: frozenInventoryDigestValue, preserved_attestation_digest: preservedAttestationDigestValue, attestation_source_generation: attestationSourceGenerationValue } }
      db.run("INSERT INTO ct_idempotency VALUES ('recover',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), occurredAt])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

export const continuationRecordTerminationReceipt = (handle, ctxFactory, request, processObserver) => {
  const { db, authority } = handle
  if (!processObserver?.observe) throw ctError("CT_RECOVERY_REQUIRED")
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (version !== 5) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      validateSchema4CommitEvidence(db, authority); validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ON") {
        if (persisted.lease.lease_status !== "NONE" || persisted.lease.owner_main_binding_id !== null || persisted.lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      } else if (persisted.lease.lease_status !== "ACTIVE") throw ctError("CT_SCHEMA_INVALID")
      assertRecordTerminationReceiptRequest(request)
      const ctx = ctxFactory(), main = recoveryMainAuthority(persisted, state)
      assertMainGate(ctx, authority, main)
      const subject = resolveTerminationSubject(db, authority, request)

      const scopeKey = `termination:${subject.binding_id}:epoch:${subject.binding_epoch}:generation:${subject.generation}:${request.process_role}`
      const request_digest = requestDigest(request)
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='recordTerminationReceipt' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='recordTerminationReceipt' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "record_termination_receipt_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }

      const observedAt = now()
      const observation = processObserver.observe({ role: request.process_role, host_process_instance: subject.host_process_instance,
        plugin_instance: subject.plugin_instance, root_session_id: subject.root_session_id, mcp_process_instance: subject.mcp_process_instance,
        pid_start_marker: subject.pid_start_marker })
      if (!observation || !["ABSENT", "REPLACED", "PRESENT", "AMBIGUOUS"].includes(observation.status) ||
          !opaque(observation.os_boot_id, 256) || !opaque(observation.os_session_id, 256)) throw ctError("CT_SCHEMA_INVALID")
      // CT-R7-S1's live process and CT-R7-S5's PID-reuse ambiguity: neither
      // may ever be persisted as proof of termination.
      if (observation.status === "PRESENT" || observation.status === "AMBIGUOUS") throw ctError("CT_RECOVERY_REQUIRED")
      if (observation.status === "ABSENT" && observation.observed_start_marker != null) throw ctError("CT_SCHEMA_INVALID")
      if (observation.status === "REPLACED" && (!opaque(observation.observed_start_marker, 128) || observation.observed_start_marker === subject.pid_start_marker)) throw ctError("CT_SCHEMA_INVALID")

      const receiptValue = terminationReceiptValue(request, subject, observation, observedAt, persisted.lease)
      const receiptJson = jcs(receiptValue)
      if (Buffer.byteLength(receiptJson) > 8192) throw ctError("CT_SCHEMA_INVALID")
      const receiptDigest = requestDigest(receiptValue)
      const pairingDigest = requestDigest(terminationPairingValue(subject, observation, persisted.lease))
      const recordedAt = now()
      if (Date.parse(recordedAt) - Date.parse(observedAt) > TERMINATION_RECEIPT_FRESHNESS_MS) throw ctError("CT_RECOVERY_REQUIRED")

      const writerFence = { schema_version: version, mode: state.mode, anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: persisted.lease.rollback_epoch, observed_lease_version: persisted.lease.lease_version, observed_lease_status: persisted.lease.lease_status }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: "record_termination_receipt_cas_v1", version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        subject_kind: request.subject_kind, subject_binding_id: subject.binding_id, subject_binding_epoch: subject.binding_epoch,
        subject_identity_digest: subject.identity_digest, process_role: request.process_role, handoff_id: subject.handoff_id, generation: subject.generation,
        observation: observation.status, receipt_digest: receiptDigest }
      const cas_digest = requestDigest(casValue)
      const receiptId = makeId()

      db.run(`INSERT INTO ct_termination_receipt(receipt_id,subject_kind,subject_binding_id,subject_identity_digest,subject_binding_epoch,process_role,pairing_digest,
        issuer,verifier,method,observation,terminated,os_boot_id,os_session_id,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,
        observed_start_marker,rollback_epoch,lease_version,generation,handoff_id,receipt_json,receipt_digest,observed_at,recorded_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [receiptId, request.subject_kind, subject.binding_id, subject.identity_digest, subject.binding_epoch, request.process_role, pairingDigest,
          "CT_MAIN_OBSERVER_V1", "CT_MAIN_VERIFIER_V1", "OS_PROCESS_TABLE_V1", observation.status, observation.os_boot_id, observation.os_session_id,
          subject.host_process_instance, subject.plugin_instance, subject.root_session_id, subject.mcp_process_instance, subject.pid_start_marker,
          observation.observed_start_marker ?? null, persisted.lease.rollback_epoch, persisted.lease.lease_version, subject.generation, subject.handoff_id,
          receiptJson, receiptDigest, observedAt, recordedAt])

      const publicResponse = { subject_kind: request.subject_kind, process_role: request.process_role, recorded: true, replayed: false }
      const envelope = { kind: "record_termination_receipt_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, receipt_id: receiptId, pairing_digest: pairingDigest } }
      db.run("INSERT INTO ct_idempotency VALUES ('recordTerminationReceipt',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), recordedAt])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

// Canonical source validation shared by live consumers and immutable-history
// readers. Historical reads re-check the proof's recording-time window but do
// not turn the 30-second live-use window into an expiry for valid old history.
function verifyTerminationPairing(db, { subjectBindingId, subjectBindingEpoch, subjectIdentityDigest, rollbackEpoch, generation,
  subjectKind, handoffId, leaseVersion, hostProcessInstance, pluginInstance, rootSessionId, mcpProcessInstance, pidStartMarker }, requireFresh = true) {
  const rows = db.query(`SELECT * FROM ct_termination_receipt WHERE subject_binding_id=? AND subject_binding_epoch=? AND rollback_epoch=? AND generation=?`)
    .all(subjectBindingId, subjectBindingEpoch, rollbackEpoch, generation)
  if (rows.length !== 2) throw ctError("CT_RECOVERY_REQUIRED")
  const host = rows.find((row) => row.process_role === "HOST"), mcp = rows.find((row) => row.process_role === "MCP")
  if (!host || !mcp || host.subject_identity_digest !== subjectIdentityDigest || mcp.subject_identity_digest !== subjectIdentityDigest ||
      host.os_boot_id !== mcp.os_boot_id || host.os_session_id !== mcp.os_session_id) throw ctError("CT_RECOVERY_REQUIRED")
  const expectedPairing = { kind: "termination_pairing_v1", version: 1, subject_binding_id: subjectBindingId, subject_identity_digest: subjectIdentityDigest,
    subject_binding_epoch: subjectBindingEpoch, rollback_epoch: rollbackEpoch, generation, os_boot_id: host.os_boot_id, os_session_id: host.os_session_id, roles: ["HOST", "MCP"] }
  const expectedPairingDigest = requestDigest(expectedPairing), nowMs = Date.now()
  if (host.pairing_digest !== expectedPairingDigest || mcp.pairing_digest !== expectedPairingDigest) throw ctError("CT_RECOVERY_REQUIRED")
  for (const row of [host, mcp]) {
    const reconstructed = {
      kind: "termination_receipt_v1", version: 1,
      subject: { kind: row.subject_kind, binding_id: row.subject_binding_id, identity_digest: row.subject_identity_digest, binding_epoch: row.subject_binding_epoch },
      process: { role: row.process_role, host_process_instance: row.host_process_instance, plugin_instance: row.plugin_instance, root_session_id: row.root_session_id,
        mcp_process_instance: row.mcp_process_instance, pid_start_marker: row.pid_start_marker, observed_start_marker: row.observed_start_marker },
      proof: { issuer: row.issuer, verifier: row.verifier, method: row.method, observation: row.observation, os_boot_id: row.os_boot_id, os_session_id: row.os_session_id, terminated: true },
      binding: { rollback_epoch: row.rollback_epoch, lease_version: row.lease_version, generation: row.generation, handoff_id: row.handoff_id }, observed_at: row.observed_at,
    }
    const observedMs = Date.parse(row.observed_at), recordedMs = Date.parse(row.recorded_at), observationValid = row.observation === "ABSENT"
      ? row.observed_start_marker === null : row.observation === "REPLACED" && opaque(row.observed_start_marker, 128) && row.observed_start_marker !== row.pid_start_marker
    if (!validTimestamp(row.observed_at) || !validTimestamp(row.recorded_at) || !Number.isFinite(observedMs) || !Number.isFinite(recordedMs) ||
        recordedMs < observedMs || recordedMs - observedMs > TERMINATION_RECEIPT_FRESHNESS_MS || (requireFresh && (nowMs < observedMs || nowMs - observedMs > TERMINATION_RECEIPT_FRESHNESS_MS)) ||
        row.issuer !== "CT_MAIN_OBSERVER_V1" || row.verifier !== "CT_MAIN_VERIFIER_V1" || row.method !== "OS_PROCESS_TABLE_V1" || row.terminated !== 1 || !observationValid ||
        (subjectKind !== undefined && row.subject_kind !== subjectKind) || (handoffId !== undefined && row.handoff_id !== handoffId) ||
        (leaseVersion !== undefined && row.lease_version !== leaseVersion) || (hostProcessInstance !== undefined && row.host_process_instance !== hostProcessInstance) ||
        (pluginInstance !== undefined && row.plugin_instance !== pluginInstance) || (rootSessionId !== undefined && row.root_session_id !== rootSessionId) ||
        (mcpProcessInstance !== undefined && row.mcp_process_instance !== mcpProcessInstance) || (pidStartMarker !== undefined && row.pid_start_marker !== pidStartMarker) ||
        row.receipt_json !== jcs(reconstructed) || requestDigest(reconstructed) !== row.receipt_digest) throw ctError("CT_RECOVERY_REQUIRED")
  }
  return { pairing_digest: expectedPairingDigest, host, mcp }
}
export const validTerminationPairing = (db, args) => verifyTerminationPairing(db, args, true)

// P6-C: pure derivation only — persistence into ct_quiescence_snapshot is
// P6-E's beginRollback/finishRollback. Uses the identical live/pending
// queries continuationStatus already runs, so a snapshot can never disagree
// with what a caller could observe in the same writer transaction.
const nonTerminalHandoffStates = ["DRAFT", "VALIDATED", "PUBLISHED", "CLAIMED", "STARTED", "COMPLETION_ATTESTED", "WORK_SUSPENDED", "ATTESTATION_SUSPENDED"]
export const deriveFrozenInventory = (db, rollbackEpoch) => ({
  kind: "frozen_inventory_v1", version: 1, rollback_epoch: rollbackEpoch,
  handoffs: db.query(`SELECT id, state, generation FROM ct_handoff WHERE state IN (${nonTerminalHandoffStates.map(() => "?").join(",")}) ORDER BY id ASC`)
    .all(...nonTerminalHandoffStates),
})
export const deriveQuiescenceSnapshot = (db, { snapshotKind, rollbackEpoch, leaseVersion, owner, observedAt = now() }) => {
  const liveClaims = db.query("SELECT COUNT(*) AS count FROM ct_claim WHERE claim_state='LIVE'").get().count
  const liveDeliveries = db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE delivery_state IN ('PENDING','CLAIMED')").get().count
  const liveWorkers = db.query("SELECT COUNT(*) AS count FROM ct_claimant_binding WHERE binding_status='ACTIVE'").get().count
  const pendingWork = db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE delivery_state='PENDING' AND purpose='WORK'").get().count
  const pendingAttestation = db.query("SELECT COUNT(*) AS count FROM ct_delivery WHERE delivery_state='PENDING' AND purpose='ATTESTATION_REDELIVERY'").get().count
  const frozenInventory = deriveFrozenInventory(db, rollbackEpoch)
  const value = {
    kind: "quiescence_v1", version: 1, snapshot_kind: snapshotKind, rollback_epoch: rollbackEpoch, lease_version: leaseVersion,
    owner: { main_binding_id: owner.main_binding_id, binding_epoch: owner.binding_epoch, main_identity_digest: owner.identity_digest },
    live_counts: { claims: liveClaims, deliveries: liveDeliveries, workers: liveWorkers },
    pending_counts: { work: pendingWork, attestation: pendingAttestation },
    frozen_inventory_digest: requestDigest(frozenInventory),
    polling_plane: "UNAVAILABLE_BEFORE_P7",
    observed_at: observedAt,
  }
  return { value, digest: requestDigest(value), frozenInventory }
}

// P6-E: the rollback plane. beginRollback/rebindMain/finishRollback transfer
// authority and the singleton ct_rollback_lease across a real ROLLING_BACK
// window, each as one bounded transaction with its own immutable audit row
// (ct_rollback_epoch / ct_main_rebind).
const ROLLBACK_LEASE_DURATION_MS = 600_000

const rollbackEpochValue = (row) => ({
  kind: "rollback_epoch_v1", version: 1, rollback_epoch: row.rollback_epoch,
  begin_owner_main_binding_id: row.begin_owner_main_binding_id, begin_owner_main_binding_epoch: row.begin_owner_main_binding_epoch,
  begin_owner_main_identity_digest: row.begin_owner_main_identity_digest, prior_activation_epoch: row.prior_activation_epoch,
  begin_lease_version: row.begin_lease_version, begin_lease_expires_at: row.begin_lease_expires_at,
  freeze_quiescence_digest: row.freeze_quiescence_digest, request_identity: row.request_identity,
  request_digest: row.request_digest, cas_digest: row.cas_digest, begun_at: row.begun_at,
})

const beginRollbackKeys = ["expected_activation_epoch", "expected_binding_epoch", "expected_mode", "request_identity"]
const assertBeginRollbackRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(beginRollbackKeys) || !uuid.test(request.request_identity ?? "") ||
      request.expected_mode !== "ON" || !safeEpoch(request.expected_binding_epoch) || request.expected_binding_epoch === 0 ||
      !safeEpoch(request.expected_activation_epoch) || request.expected_activation_epoch === 0) throw ctError("CT_PAYLOAD_INVALID")
}

export const continuationBeginRollback = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (version !== 5) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      validateSchema4CommitEvidence(db, authority); validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      assertBeginRollbackRequest(request)
      // A replay must be reachable even after this exact call already moved
      // ON->ROLLING_BACK, so the scope key targets the current already-open
      // epoch under ROLLING_BACK and the next epoch under ON; the
      // idempotency lookup itself runs before any hard mode/lease fence.
      const targetEpoch = state.mode === "ROLLING_BACK" ? persisted.lease.rollback_epoch : persisted.lease.rollback_epoch + 1
      const targetLeaseVersion = persisted.lease.lease_version + 1
      const request_digest = requestDigest(request), scopeKey = `rollback:${targetEpoch}:begin`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='beginRollback' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='beginRollback' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "begin_rollback_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }
      if (state.mode === "ROLLING_BACK") throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (persisted.lease.lease_status !== "NONE" || persisted.lease.owner_main_binding_id !== null || persisted.lease.lease_expires_at !== null) throw ctError("CT_SCHEMA_INVALID")
      const ctx = ctxFactory(), main = coherentMain(persisted.rows)
      assertMainGate(ctx, authority, main)
      if (request.expected_binding_epoch !== main.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      const currentActivationEpoch = persisted.activations.at(-1)?.activation_epoch ?? 0
      if (request.expected_activation_epoch !== currentActivationEpoch) throw ctError("CT_FENCE_MISMATCH")

      const observedAt = now()
      const { value: quiescenceValue, digest: quiescenceDigest, frozenInventory } = deriveQuiescenceSnapshot(db, {
        snapshotKind: "ROLLBACK_FREEZE", rollbackEpoch: targetEpoch, leaseVersion: targetLeaseVersion,
        owner: { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }, observedAt,
      })
      const leaseExpiresAt = new Date(Date.parse(observedAt) + ROLLBACK_LEASE_DURATION_MS).toISOString()
      const writerFence = { schema_version: version, mode: "ON", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: persisted.lease.rollback_epoch, observed_lease_version: persisted.lease.lease_version, observed_lease_status: "NONE" }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: "begin_rollback_cas_v1", version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        prior_activation_epoch: currentActivationEpoch, target_rollback_epoch: targetEpoch, target_lease_version: targetLeaseVersion, freeze_quiescence_digest: quiescenceDigest }
      const cas_digest = requestDigest(casValue)
      const rollbackRow = { rollback_epoch: targetEpoch, begin_owner_main_binding_id: main.main_binding_id, begin_owner_main_binding_epoch: main.binding_epoch,
        begin_owner_main_identity_digest: main.identity_digest, prior_activation_epoch: currentActivationEpoch, begin_lease_version: targetLeaseVersion,
        begin_lease_expires_at: leaseExpiresAt, freeze_quiescence_digest: quiescenceDigest, request_identity: request.request_identity, request_digest, cas_digest, begun_at: observedAt }
      const rollbackDigest = requestDigest(rollbackEpochValue(rollbackRow))

      if (db.run("UPDATE ct_rollback_lease SET rollback_epoch=?,lease_status='ACTIVE',lease_version=?,owner_main_binding_id=?,lease_expires_at=? WHERE id=1 AND lease_status='NONE' AND rollback_epoch=?",
        [targetEpoch, targetLeaseVersion, main.main_binding_id, leaseExpiresAt, persisted.lease.rollback_epoch]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (db.run("UPDATE ct_continuation_state SET mode='ROLLING_BACK' WHERE id=1 AND mode='ON'").changes !== 1) throw ctError("CT_FENCE_MISMATCH")
      db.run(`INSERT INTO ct_rollback_epoch(rollback_epoch,epoch_state,begin_owner_main_binding_id,begin_owner_main_binding_epoch,begin_owner_main_identity_digest,
        prior_activation_epoch,begin_lease_version,begin_lease_expires_at,freeze_quiescence_digest,finish_lease_version,finish_quiescence_digest,
        request_identity,request_digest,cas_digest,rollback_digest,begun_at,finished_at) VALUES (?,'OPEN',?,?,?,?,?,?,?,NULL,NULL,?,?,?,?,?,NULL)`,
        [targetEpoch, main.main_binding_id, main.binding_epoch, main.identity_digest, currentActivationEpoch, targetLeaseVersion, leaseExpiresAt,
          quiescenceDigest, request.request_identity, request_digest, cas_digest, rollbackDigest, observedAt])
      db.run(`INSERT INTO ct_quiescence_snapshot(snapshot_id,snapshot_kind,rollback_epoch,lease_version,owner_main_binding_id,owner_main_binding_epoch,owner_main_identity_digest,
        live_claims,live_deliveries,live_workers,pending_work,pending_attestation,frozen_inventory_json,frozen_inventory_digest,polling_witness,quiescence_json,quiescence_digest,observed_at)
        VALUES (?,'ROLLBACK_FREEZE',?,?,?,?,?,?,?,?,?,?,?,?,'UNAVAILABLE_BEFORE_P7',?,?,?)`,
        [makeId(), targetEpoch, targetLeaseVersion, main.main_binding_id, main.binding_epoch, main.identity_digest,
          quiescenceValue.live_counts.claims, quiescenceValue.live_counts.deliveries, quiescenceValue.live_counts.workers,
          quiescenceValue.pending_counts.work, quiescenceValue.pending_counts.attestation, jcs(frozenInventory), quiescenceValue.frozen_inventory_digest, jcs(quiescenceValue), quiescenceDigest, observedAt])

      const publicResponse = { mode: "ROLLING_BACK", rollback_epoch: targetEpoch, lease_version: targetLeaseVersion, lease_expires_at: leaseExpiresAt, replayed: false }
      const envelope = { kind: "begin_rollback_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, freeze_quiescence_digest: quiescenceDigest } }
      db.run("INSERT INTO ct_idempotency VALUES ('beginRollback',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), observedAt])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const rebindMainKeys = ["expected_binding_epoch", "expected_lease_version", "expected_rollback_epoch", "request_identity"]
const assertRebindMainRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(rebindMainKeys) || !uuid.test(request.request_identity ?? "") ||
      !safeEpoch(request.expected_rollback_epoch) || request.expected_rollback_epoch === 0 || !safeEpoch(request.expected_lease_version) || request.expected_lease_version === 0 ||
      !safeEpoch(request.expected_binding_epoch) || request.expected_binding_epoch === 0) throw ctError("CT_PAYLOAD_INVALID")
}

// rebindMain's only authority requirement is the canonical Main worktree
// context plus an expired lease plus fresh old-Main termination proof — never
// a match against the (presumed-dead) old Main's own process identity, which
// is exactly the disaster this operation exists to recover from.
export const continuationRebindMain = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (version !== 5) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      validateSchema4CommitEvidence(db, authority); validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ON") throw ctError("CT_FENCE_MISMATCH")
      assertRebindMainRequest(request)
      // The scope key is built only from the caller's own declared fields
      // (never re-derived from the post-rebind persisted state), so a genuine
      // replay stays reachable after this exact call retires the old Main and
      // moves lease_version forward — exactly like beginRollback's replay.
      const targetEpoch = request.expected_binding_epoch + 1
      const request_digest = requestDigest(request), scopeKey = `rollback:${request.expected_rollback_epoch}:rebind:${targetEpoch}`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='rebindMain' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='rebindMain' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "rebind_main_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }
      if (persisted.lease.lease_status !== "ACTIVE") throw ctError("CT_SCHEMA_INVALID")
      if (request.expected_rollback_epoch !== persisted.lease.rollback_epoch) throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (request.expected_lease_version !== persisted.lease.lease_version) throw ctError("CT_FENCE_MISMATCH")
      const oldMain = coherentMain(persisted.rows)
      if (!oldMain || oldMain.main_binding_id !== persisted.lease.owner_main_binding_id || oldMain.binding_epoch !== request.expected_binding_epoch) throw ctError("CT_MAIN_BINDING_CONFLICT")
      if (Date.parse(persisted.lease.lease_expires_at) > Date.now()) throw ctError("CT_ROLLBACK_LEASE_ACTIVE")
      const ctx = ctxFactory()
      assertCanonicalMainCtx(ctx, authority)
      if (ctx.binding_epoch !== oldMain.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      const pairing = validTerminationPairing(db, { subjectBindingId: oldMain.main_binding_id, subjectBindingEpoch: oldMain.binding_epoch,
        subjectIdentityDigest: oldMain.identity_digest, rollbackEpoch: persisted.lease.rollback_epoch, generation: 0, subjectKind: "MAIN", handoffId: null })
      const targetDigest = requestDigest(mainBindingValue(authority, ctx, targetEpoch))

      const occurredAt = now(), targetLeaseVersion = persisted.lease.lease_version + 1, newMainBindingId = makeId()
      const leaseExpiresAt = new Date(Date.parse(occurredAt) + ROLLBACK_LEASE_DURATION_MS).toISOString()
      const writerFence = { schema_version: version, mode: "ROLLING_BACK", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: persisted.lease.rollback_epoch, observed_lease_version: persisted.lease.lease_version, observed_lease_status: "ACTIVE" }
      const casValue = { kind: "rebind_main_cas_v1", version: 1, writer_fence_v1: writerFence,
        old_main_authority_v1: { main_binding_id: oldMain.main_binding_id, binding_epoch: oldMain.binding_epoch, identity_digest: oldMain.identity_digest },
        target_main_binding_epoch: targetEpoch, target_main_identity_digest: targetDigest, termination_pairing_digest: pairing.pairing_digest, target_lease_version: targetLeaseVersion }
      const cas_digest = requestDigest(casValue)

      db.run("UPDATE ct_main_binding SET binding_status='RETIRED',ended_at=? WHERE main_binding_id=?", [occurredAt, oldMain.main_binding_id])
      db.run(`INSERT INTO ct_main_binding(main_binding_id,anchor_id,anchor_epoch,config_digest,host_process_instance,plugin_instance,root_session_id,mcp_process_instance,pid_start_marker,binding_epoch,main_session_id,binding_status,identity_digest,created_at,ended_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,'ACTIVE',?,?,NULL)`, [newMainBindingId, authority.anchor.anchor_id, 1, authority.anchor.config_digest, ...mainIdentityFields.map((field) => ctx[field]), targetEpoch, ctx.root_session_id, targetDigest, occurredAt])
      if (db.run("UPDATE ct_rollback_lease SET owner_main_binding_id=?,lease_version=?,lease_expires_at=? WHERE id=1 AND lease_status='ACTIVE' AND rollback_epoch=? AND lease_version=?",
        [newMainBindingId, targetLeaseVersion, leaseExpiresAt, persisted.lease.rollback_epoch, persisted.lease.lease_version]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      const rebindId = makeId()
      const rebindRow = { rollback_epoch: persisted.lease.rollback_epoch, old_main_binding_id: oldMain.main_binding_id, old_main_binding_epoch: oldMain.binding_epoch, old_main_identity_digest: oldMain.identity_digest,
        new_main_binding_id: newMainBindingId, new_main_binding_epoch: targetEpoch, new_main_identity_digest: targetDigest, termination_pairing_digest: pairing.pairing_digest,
        lease_version_before: persisted.lease.lease_version, lease_version_after: targetLeaseVersion, lease_expires_at: leaseExpiresAt, request_identity: request.request_identity, request_digest, cas_digest, occurred_at: occurredAt }
      db.run(`INSERT INTO ct_main_rebind(rebind_id,rollback_epoch,old_main_binding_id,old_main_binding_epoch,old_main_identity_digest,new_main_binding_id,new_main_binding_epoch,new_main_identity_digest,
        termination_pairing_digest,lease_version_before,lease_version_after,lease_expires_at,request_identity,request_digest,cas_digest,rebind_digest,occurred_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [rebindId, persisted.lease.rollback_epoch, oldMain.main_binding_id, oldMain.binding_epoch, oldMain.identity_digest, newMainBindingId, targetEpoch, targetDigest,
          pairing.pairing_digest, persisted.lease.lease_version, targetLeaseVersion, leaseExpiresAt, request.request_identity, request_digest, cas_digest, requestDigest(mainRebindValue(rebindRow)), occurredAt])

      const publicResponse = { main_binding_id: newMainBindingId, binding_epoch: targetEpoch, rollback_epoch: persisted.lease.rollback_epoch, lease_version: targetLeaseVersion, lease_expires_at: leaseExpiresAt, replayed: false }
      const envelope = { kind: "rebind_main_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest, rebind_id: rebindId, termination_pairing_digest: pairing.pairing_digest } }
      db.run("INSERT INTO ct_idempotency VALUES ('rebindMain',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), occurredAt])
      validateSchema3Persistence(db, authority)
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

const finishRollbackKeys = ["expected_binding_epoch", "expected_lease_version", "expected_rollback_epoch", "request_identity"]
const assertFinishRollbackRequest = (request) => {
  if (!request || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).some((key) => forbiddenCtxKeys.has(key)) ||
      JSON.stringify(Object.keys(request).sort()) !== JSON.stringify(finishRollbackKeys) || !uuid.test(request.request_identity ?? "") ||
      !safeEpoch(request.expected_rollback_epoch) || request.expected_rollback_epoch === 0 || !safeEpoch(request.expected_lease_version) || request.expected_lease_version === 0 ||
      !safeEpoch(request.expected_binding_epoch) || request.expected_binding_epoch === 0) throw ctError("CT_PAYLOAD_INVALID")
}

export const continuationFinishRollback = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      const version = inspectSchema(db)
      if (version !== 5) throw ctError("CT_SCHEMA_INVALID")
      const state = continuationState(db, authority, version)
      validateSchema4CommitEvidence(db, authority); validateSchema5CommitEvidence(db, authority)
      const persisted = validateSchema3Persistence(db, authority)
      validateSchema4Persistence(db, authority)
      assertFinishRollbackRequest(request)
      // Scope key uses only the caller's own declared rollback epoch (stable
      // across the ROLLING_BACK->OFF transition this call itself performs),
      // so a genuine replay stays reachable after mode has already moved to OFF.
      const request_digest = requestDigest(request), scopeKey = `rollback:${request.expected_rollback_epoch}:finish`
      const byIdentity = db.query("SELECT * FROM ct_idempotency WHERE operation='finishRollback' AND request_identity=?").get(request.request_identity)
      const byScope = db.query("SELECT * FROM ct_idempotency WHERE operation='finishRollback' AND scope_key=?").get(scopeKey)
      if (byIdentity || byScope) {
        if (!byIdentity || !byScope || byIdentity.scope_key !== byScope.scope_key || byIdentity.request_identity !== byScope.request_identity ||
            byIdentity.request_digest !== request_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        let envelope
        try { envelope = JSON.parse(byIdentity.response_json) } catch { throw ctError("CT_SCHEMA_INVALID") }
        if (envelope?.kind !== "finish_rollback_response_envelope_v1" || !envelope.public_response) throw ctError("CT_SCHEMA_INVALID")
        return { ...envelope.public_response, replayed: true }
      }
      if (state.mode === "OFF") throw ctError("CT_CONTINUATION_OFF")
      if (state.mode === "ON") throw ctError("CT_FENCE_MISMATCH")
      if (persisted.lease.lease_status !== "ACTIVE") throw ctError("CT_SCHEMA_INVALID")
      if (request.expected_rollback_epoch !== persisted.lease.rollback_epoch) throw ctError("CT_ROLLBACK_IN_PROGRESS")
      if (request.expected_lease_version !== persisted.lease.lease_version) throw ctError("CT_FENCE_MISMATCH")
      const ctx = ctxFactory(), main = recoveryMainAuthority(persisted, state)
      assertMainGate(ctx, authority, main)
      if (request.expected_binding_epoch !== main.binding_epoch) throw ctError("CT_FENCE_MISMATCH")

      const observedAt = now()
      const { value: quiescenceValue, digest: quiescenceDigest, frozenInventory } = deriveQuiescenceSnapshot(db, {
        snapshotKind: "ROLLBACK_FINISH", rollbackEpoch: persisted.lease.rollback_epoch, leaseVersion: persisted.lease.lease_version,
        owner: { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }, observedAt,
      })
      if (quiescenceValue.live_counts.claims !== 0 || quiescenceValue.live_counts.deliveries !== 0 || quiescenceValue.live_counts.workers !== 0 ||
          quiescenceValue.pending_counts.work !== 0 || quiescenceValue.pending_counts.attestation !== 0) throw ctError("CT_NOT_QUIESCENT")

      const targetLeaseVersion = persisted.lease.lease_version + 1
      const writerFence = { schema_version: version, mode: "ROLLING_BACK", anchor_id: authority.anchor.anchor_id, config_digest: authority.anchor.config_digest,
        observed_rollback_epoch: persisted.lease.rollback_epoch, observed_lease_version: persisted.lease.lease_version, observed_lease_status: "ACTIVE" }
      const mainAuthority = { main_binding_id: main.main_binding_id, binding_epoch: main.binding_epoch, identity_digest: main.identity_digest }
      const casValue = { kind: "finish_rollback_cas_v1", version: 1, writer_fence_v1: writerFence, main_authority_v1: mainAuthority,
        rollback_epoch: persisted.lease.rollback_epoch, target_lease_version: targetLeaseVersion, quiescence_digest: quiescenceDigest }
      const cas_digest = requestDigest(casValue)

      if (db.run("UPDATE ct_rollback_epoch SET epoch_state='FINISHED',finish_lease_version=?,finish_quiescence_digest=?,finished_at=? WHERE rollback_epoch=? AND epoch_state='OPEN'",
        [targetLeaseVersion, quiescenceDigest, observedAt, persisted.lease.rollback_epoch]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      db.run(`INSERT INTO ct_quiescence_snapshot(snapshot_id,snapshot_kind,rollback_epoch,lease_version,owner_main_binding_id,owner_main_binding_epoch,owner_main_identity_digest,
        live_claims,live_deliveries,live_workers,pending_work,pending_attestation,frozen_inventory_json,frozen_inventory_digest,polling_witness,quiescence_json,quiescence_digest,observed_at)
        VALUES (?,'ROLLBACK_FINISH',?,?,?,?,?,0,0,0,0,0,?,?,'UNAVAILABLE_BEFORE_P7',?,?,?)`,
        [makeId(), persisted.lease.rollback_epoch, persisted.lease.lease_version, main.main_binding_id, main.binding_epoch, main.identity_digest,
          jcs(frozenInventory), quiescenceValue.frozen_inventory_digest, jcs(quiescenceValue), quiescenceDigest, observedAt])
      if (db.run("UPDATE ct_rollback_lease SET lease_status='NONE',owner_main_binding_id=NULL,lease_expires_at=NULL,lease_version=? WHERE id=1 AND lease_status='ACTIVE' AND rollback_epoch=? AND lease_version=?",
        [targetLeaseVersion, persisted.lease.rollback_epoch, persisted.lease.lease_version]).changes !== 1) throw ctError("CT_SCHEMA_INVALID")
      if (db.run("UPDATE ct_continuation_state SET mode='OFF' WHERE id=1 AND mode='ROLLING_BACK'").changes !== 1) throw ctError("CT_FENCE_MISMATCH")

      const publicResponse = { mode: "OFF", rollback_epoch: persisted.lease.rollback_epoch, quiescence_digest: quiescenceDigest, replayed: false }
      const envelope = { kind: "finish_rollback_response_envelope_v1", version: 1, public_response: publicResponse,
        evidence: { request, request_digest, scope_key: scopeKey, cas_input: casValue, cas_digest } }
      db.run("INSERT INTO ct_idempotency VALUES ('finishRollback',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(envelope), observedAt])
      return publicResponse
    }).immediate()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SCHEMA_INVALID", error)
  }
}

export const createContinuationDispatcher = ({ cwd = process.cwd(), trustedMetadata, processIdentity, processObserver }) => {
  if (!trustedMetadata?.snapshot || !processIdentity?.snapshot) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  const stableProcess = { value: null }
  return (operation, request) => {
    if (!["bootstrapMain", "activate", "status", "register", "receive", "create", "validate", "publish", "claim", "ack", "attestCompletion", "complete", "reject", "revise", "recordTerminationReceipt", "recover", "beginRollback", "rebindMain", "finishRollback"].includes(operation)) throw ctError("CT_PAYLOAD_INVALID")
    if (operation === "status") assertStatusRequest(request)
    const handle = continuationHandle(cwd, operation === "receive" && request !== undefined && (typeof request !== "object" || request === null || Object.getPrototypeOf(request) !== Object.prototype || Object.keys(request).length > 0))
    const ctx = createCtxFactory({ trustedMetadata, processIdentity, cwd: handle.cwd, authority: handle.authority }, stableProcess)
    try {
      if (operation === "bootstrapMain") return continuationBootstrapMain(handle, ctx, request)
      if (operation === "activate") return continuationActivate(handle, ctx, request)
      if (operation === "status") return continuationStatus(handle)
      if (operation === "create") return continuationCreate(handle, ctx, request)
      if (operation === "validate") return continuationValidate(handle, ctx, request)
      if (operation === "publish") return continuationPublish(handle, ctx, request)
      if (operation === "claim") return continuationClaim(handle, ctx, request)
      if (operation === "ack") return continuationAck(handle, ctx, request)
      if (operation === "attestCompletion") return continuationAttestCompletion(handle, ctx, request)
      if (operation === "complete") return continuationComplete(handle, ctx, request)
      if (operation === "reject") return continuationReject(handle, ctx, request)
      if (operation === "revise") return continuationRevise(handle, ctx, request)
      if (operation === "recordTerminationReceipt") return continuationRecordTerminationReceipt(handle, ctx, request, processObserver)
      if (operation === "recover") return continuationRecover(handle, ctx, request)
      if (operation === "beginRollback") return continuationBeginRollback(handle, ctx, request)
      if (operation === "rebindMain") return continuationRebindMain(handle, ctx, request)
      if (operation === "finishRollback") return continuationFinishRollback(handle, ctx, request)
      return operation === "register" ? continuationRegister(handle, ctx, request) : continuationReceive(handle, ctx)
    } finally { handle.db.close() }
  }
}

export const assertClaimantBinding = (row, authority) => {
  if (!row || !isBase64url32(row.binding_id) || !safeEpoch(row.binding_epoch) || row.binding_epoch === 0 || !["ACTIVE", "RETIRED", "MULTIPLEXED"].includes(row.binding_status) ||
      !Number.isSafeInteger(row.effective_uid) || row.effective_uid < 0 || row.canonical_repo !== authority.anchor.context.canonical_repo || row.git_common_dir !== authority.anchor.context.git_common_dir ||
      ![row.canonical_repo, row.git_common_dir, row.worktree].every(absolutePath) || !opaque(row.branch, 255) ||
      ![row.host_process_instance, row.plugin_instance, row.root_session_id].every((value) => opaque(value)) || !isBase64url32(row.mcp_process_instance) || !opaque(row.pid_start_marker, 128) ||
      !/^sha256:[0-9a-f]{64}$/.test(row.identity_digest) || !rfc3339Milliseconds.test(row.created_at) ||
      (row.binding_status === "ACTIVE" ? row.ended_at !== null : !rfc3339Milliseconds.test(row.ended_at ?? ""))) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  if (row.identity_digest !== requestDigest(tuple(row))) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
  return row
}
const scopeBindings = (db, ctx, authority) => db.query(`SELECT * FROM ct_claimant_binding
  WHERE effective_uid=? AND canonical_repo=? AND git_common_dir=? AND plugin_instance=? ORDER BY binding_epoch`).all(ctx.effective_uid, ctx.canonical_repo, ctx.git_common_dir, ctx.plugin_instance).map((row) => assertClaimantBinding(row, authority))
const throwStored = (response) => { if (response.error) throw ctError(response.error); return { ...response, replayed: true } }

export const continuationRegister = (handle, ctxFactory, request) => {
  const { db, authority } = handle
  try {
    const result = db.transaction(() => {
      const lease = gateContinuation(handle)
      assertRegisterRequest(request)
      const ctx = ctxFactory()
      const pluginScopeDigest = requestDigest(scope(ctx))
      const target = tuple(ctx, request.expected_binding_epoch + 1)
      const request_digest = requestDigest(request)
      const cas_digest = requestDigest({ plugin_scope_digest: pluginScopeDigest, ctx_identity_digest: requestDigest(tuple(ctx)), target_identity_digest: requestDigest(target), expected_binding_epoch: request.expected_binding_epoch, expected_binding_state: request.expected_binding_state, mode: "ON", observed_rollback_epoch: lease.rollback_epoch, observed_lease_version: lease.lease_version, observed_lease_status: "NONE" })
      const scopeKey = `claimant:${pluginScopeDigest}:epoch:${target.binding_epoch}`
      const committed = db.query("SELECT * FROM ct_idempotency WHERE operation='register' AND request_identity=?").all(request.request_identity)
      if (committed.length) {
        if (committed.length !== 1 || committed[0].scope_key !== scopeKey || committed[0].request_digest !== request_digest || committed[0].cas_digest !== cas_digest) throw ctError("CT_IDEMPOTENCY_CONFLICT")
        return throwStored(JSON.parse(committed[0].response_json))
      }
      const bindings = scopeBindings(db, ctx, authority)
      if (bindings.some(({ binding_status }) => binding_status === "MULTIPLEXED")) throw ctError("CT_SESSION_MULTIPLEXED")
      if (bindings.length === 0) {
        if (ctx.binding_epoch !== 0 || request.expected_binding_epoch !== 0 || request.expected_binding_state !== "ABSENT") throw ctError("CT_FENCE_MISMATCH")
        return insertActive(db, target, request, request_digest, cas_digest, scopeKey)
      }
      const active = bindings.filter(({ binding_status }) => binding_status === "ACTIVE")
      if (active.length !== 1) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      const incumbent = active[0]
      if (ctx.binding_epoch !== incumbent.binding_epoch || request.expected_binding_epoch !== incumbent.binding_epoch || request.expected_binding_state !== "ACTIVE") throw ctError("CT_FENCE_MISMATCH")
      if (equalFields(incumbent, ctx, sameRootFields)) {
        if (incumbent.mcp_process_instance === ctx.mcp_process_instance || incumbent.pid_start_marker === ctx.pid_start_marker) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
        db.run("UPDATE ct_claimant_binding SET binding_status='RETIRED',ended_at=? WHERE binding_id=?", [now(), incumbent.binding_id])
        return insertActive(db, target, request, request_digest, cas_digest, scopeKey)
      }
      return insertConflict(db, incumbent, target, request, request_digest, cas_digest, scopeKey, pluginScopeDigest)
    }).immediate()
    if (result?.error) throw ctError(result.error)
    return result
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SESSION_ISOLATION_UNPROVEN", error)
  }
}
const insertBinding = (db, target, status, endedAt = null, bindingId = makeId()) => {
  const values = [bindingId, ...bindingFields.map((field) => target[field]), status, requestDigest(target), now(), endedAt]
  db.run(`INSERT INTO ct_claimant_binding(binding_id,${bindingFields.join(",")},binding_status,identity_digest,created_at,ended_at) VALUES (${values.map(() => "?").join(",")})`, values)
  return bindingId
}
const storeRegister = (db, scopeKey, request, request_digest, cas_digest, response) => db.run("INSERT INTO ct_idempotency VALUES ('register',?,?,?,?,?,?)", [scopeKey, request.request_identity, request_digest, cas_digest, jcs(response), now()])
const insertActive = (db, target, request, request_digest, cas_digest, scopeKey) => {
  const response = { binding_id: insertBinding(db, target, "ACTIVE"), binding_epoch: target.binding_epoch, binding_status: "ACTIVE", replayed: false }
  storeRegister(db, scopeKey, request, request_digest, cas_digest, response)
  return response
}
const insertConflict = (db, incumbent, target, request, request_digest, cas_digest, scopeKey, pluginScopeDigest) => {
  const detected = now(), attemptedId = makeId(), conflictId = makeId()
  db.run("UPDATE ct_claimant_binding SET binding_status='MULTIPLEXED',ended_at=? WHERE binding_id=?", [detected, incumbent.binding_id])
  insertBinding(db, target, "MULTIPLEXED", detected, attemptedId)
  const conflict = { plugin_scope_digest: pluginScopeDigest, incumbent_binding_id: incumbent.binding_id, attempted_binding_id: attemptedId, incumbent_identity_digest: incumbent.identity_digest, attempted_identity_digest: requestDigest(target), request_identity: request.request_identity, request_digest, cas_digest }
  db.run(`INSERT INTO ct_claimant_conflict(conflict_id,${Object.keys(conflict).join(",")},conflict_digest,detected_at) VALUES (${Array(Object.keys(conflict).length + 3).fill("?").join(",")})`, [conflictId, ...Object.values(conflict), requestDigest(conflict), detected])
  storeRegister(db, scopeKey, request, request_digest, cas_digest, { error: "CT_SESSION_MULTIPLEXED" })
  return { error: "CT_SESSION_MULTIPLEXED" }
}

export const continuationReceive = (handle, ctxFactory) => {
  const { db, authority } = handle
  try {
    return db.transaction(() => {
      gateContinuation(handle)
      if (handle.payloadInvalid) throw ctError("CT_PAYLOAD_INVALID")
      const ctx = ctxFactory(), pluginScopeDigest = requestDigest(scope(ctx))
      if (db.query("SELECT 1 FROM ct_claimant_conflict WHERE plugin_scope_digest=? LIMIT 1").get(pluginScopeDigest)) throw ctError("CT_SESSION_MULTIPLEXED")
      const bindings = scopeBindings(db, ctx, authority)
      if (bindings.some(({ binding_status }) => binding_status === "MULTIPLEXED")) throw ctError("CT_SESSION_MULTIPLEXED")
      const active = bindings.filter(({ binding_status }) => binding_status === "ACTIVE")
      if (active.length !== 1) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")
      if (active[0].binding_epoch !== ctx.binding_epoch) throw ctError("CT_FENCE_MISMATCH")
      if (!equalFields(active[0], ctx, bindingFields)) throw ctError("CT_SESSION_ISOLATION_UNPROVEN")

      // Deterministic non-consuming peek. Schema 2/3 never created the
      // delivery/handoff/claim tables at all, so they have no eligible
      // delivery by construction. On schema 4, gateContinuation already ran
      // the full R1 validateSchema4Persistence over every ct_delivery/
      // ct_handoff/ct_claim row in this same read transaction, so a malformed
      // candidate already threw CT_SCHEMA_INVALID above — this query only
      // selects among rows already proven coherent. Eligible pairs share this
      // Ctx's schema-4 repository/common-dir fingerprints, agree on
      // handoff_id and current generation, carry no claim row, and are
      // PENDING with the matching handoff/snapshot state for their purpose; a
      // simultaneous claim may commit before or after this snapshot, which is
      // safe because only claim consumes and rechecks under a writer lock.
      if (![4, 5].includes(inspectSchema(db))) return { delivery: null }
      const repositoryFingerprint = requestDigest({ kind: "canonical_repo_v1", path: authority.anchor.context.canonical_repo })
      const gitCommonDirFingerprint = requestDigest({ kind: "git_common_dir_v1", path: authority.anchor.context.git_common_dir })
      const delivery = db.query(`SELECT d.delivery_id AS delivery_id, h.id AS id, h.state AS state, d.generation AS generation, d.purpose AS purpose
        FROM ct_delivery d JOIN ct_handoff h ON h.id = d.handoff_id LEFT JOIN ct_claim c ON c.delivery_id = d.delivery_id
        WHERE d.delivery_state = 'PENDING' AND c.claim_id IS NULL AND d.generation = h.generation
          AND h.repository_fingerprint = ? AND h.git_common_dir_fingerprint = ?
          AND ((d.purpose = 'WORK' AND h.state = 'PUBLISHED' AND d.handoff_state_snapshot = 'PUBLISHED')
            OR (d.purpose = 'ATTESTATION_REDELIVERY' AND h.state = 'COMPLETION_ATTESTED' AND d.handoff_state_snapshot = 'COMPLETION_ATTESTED'))
        ORDER BY d.created_at ASC, d.delivery_id ASC LIMIT 1`).get(repositoryFingerprint, gitCommonDirFingerprint)
      return { delivery: delivery ?? null }
    })()
  } catch (error) {
    if (error.code?.startsWith("CT_")) throw error
    if (busy(error)) throw ctError("CT_BUSY", error)
    throw ctError("CT_SESSION_ISOLATION_UNPROVEN", error)
  }
}

/** Repo-scoped paths and this session's identity, derived from a directory. */
export const locate = (cwd) => {
  const commonDir = git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])
  const worktree = git(cwd, ["rev-parse", "--show-toplevel"])
  let branch = ""
  try {
    branch = git(cwd, ["branch", "--show-current"])
  } catch {
    // detached HEAD is not our problem here
  }
  return {
    root: join(commonDir, "control-tower"),
    // Identity is the worktree PATH, never the branch: jornada scripts recycle
    // a worktree across branches, so the branch is not stable between sessions.
    name: basename(worktree),
    worktree,
    branch,
  }
}

export const isActive = ({ place }) => existsSync(join(place.root, "ACTIVE"))

export const assertActive = (handle) => {
  if (!isActive(handle)) throw new Error(INACTIVE_ERROR)
}

// Guarded operations and `torre off` serialize through the same SQLite writer
// lock. The second check runs after BEGIN IMMEDIATE, so removing ACTIVE can
// never race between a stale check and the operation's commit.
const activeWrite = ({ db, place }, operation) => {
  assertActive({ place })
  return db.transaction(() => {
    assertActive({ place })
    return operation()
  }).immediate()
}

export const open = (cwd) => {
  const place = locate(cwd)
  const dbPath = join(place.root, "tower.db")

  // A guarded call against a fresh, disarmed repository must not initialize
  // tower state merely so it can be rejected. Read-only/recovery operations
  // understand this empty handle and remain available while off.
  if (!existsSync(dbPath) && !isActive({ place })) return { db: null, place }

  mkdirSync(place.root, { recursive: true })

  const db = new Database(dbPath)
  // WAL lets the orchestrator read while an agent writes, instead of one
  // blocking the other; busy_timeout makes concurrent writers wait their turn
  // rather than failing outright.
  db.run("PRAGMA journal_mode = WAL")
  db.run("PRAGMA busy_timeout = 5000")
  db.run(`
    CREATE TABLE IF NOT EXISTS agent (
      name       TEXT PRIMARY KEY,
      role       TEXT NOT NULL,
      worktree   TEXT NOT NULL,
      branch     TEXT,
      state      TEXT NOT NULL,
      task       TEXT,
      note       TEXT,
      pr_url     TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS message (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient   TEXT NOT NULL,
      sender      TEXT NOT NULL,
      text        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      consumed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS message_pending
      ON message (recipient, id) WHERE consumed_at IS NULL;
    CREATE TABLE IF NOT EXISTS lock (
      name        TEXT PRIMARY KEY,
      holder      TEXT,
      acquired_at TEXT
    );
  `)
  return { db, place }
}

export const register = ({ db, place }, role) => {
  activeWrite({ db, place }, () => {
    db.run(
      `INSERT INTO agent (name, role, worktree, branch, state, updated_at)
       VALUES (?, ?, ?, ?, 'PLANNED', ?)
       ON CONFLICT(name) DO UPDATE SET
         role = excluded.role,
         worktree = excluded.worktree,
         branch = excluded.branch,
         updated_at = excluded.updated_at`,
      [place.name, role, place.worktree, place.branch, now()],
    )
  })
  return status({ db, place })
}

export const setState = ({ db, place }, { state, task, note, prUrl }) => {
  assertActive({ place })
  if (!STATES.includes(state)) {
    throw new Error(`unknown state "${state}" — one of: ${STATES.join(", ")}`)
  }
  const changed = activeWrite({ db, place }, () =>
    db.run(
      `UPDATE agent SET
         state = ?,
         task = COALESCE(?, task),
         note = COALESCE(?, note),
         pr_url = COALESCE(?, pr_url),
         updated_at = ?
       WHERE name = ?`,
      [state, task ?? null, note ?? null, prUrl ?? null, now(), place.name],
    ),
  )
  if (changed.changes === 0) throw new Error(`"${place.name}" is not registered — call tower_register first`)
  trace(
    place.root,
    place.name,
    `→ ${state}${note ? ` · ${note}` : ""}`,
    NEEDS_HUMAN.includes(state) ? "TE NECESITA: " : "",
  )
  return status({ db, place })
}

export const send = ({ db, place }, { to, text }) => {
  activeWrite({ db, place }, () => {
    const known = db.query("SELECT 1 FROM agent WHERE name = ?").get(to)
    // Refusing unknown recipients turns a typo into an error instead of a
    // message that is queued forever and silently never read.
    if (!known) {
      trace(place.root, place.name, `no existe el destinatario "${to}"`, "TE NECESITA: ")
      throw new Error(`no agent named "${to}" is registered`)
    }
    db.run(
      "INSERT INTO message (recipient, sender, text, created_at) VALUES (?, ?, ?, ?)",
      [to, place.name, text, now()],
    )
  })
  trace(place.root, place.name, `→ ${to}: ${text.split("\n")[0].slice(0, 90)}`)
  return { queued_for: to }
}

/** Atomically claim the oldest unread message. Returns null when the inbox is empty. */
export const receive = ({ db, place }) => {
  return activeWrite({ db, place }, () => {
    const next = db
      .query(
        `SELECT id, sender, text, created_at FROM message
         WHERE recipient = ? AND consumed_at IS NULL
         ORDER BY id LIMIT 1`,
      )
      .get(place.name)
    if (!next) return null
    db.run("UPDATE message SET consumed_at = ? WHERE id = ?", [now(), next.id])
    return next
  })
}

/**
 * Take a named lock. The whole check-and-take is one transaction — this is the
 * entire reason the store is SQLite. Returns {granted, holder}.
 */
export const acquire = ({ db, place }, name) => {
  assertActive({ place })
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  const result = activeWrite({ db, place }, () => {
    // An unregistered session has no row in `agent`, so it never appears in
    // tower_status. Letting it hold a lock would name a holder nobody can see,
    // leaving `torre unlock` as the only way out. Observers read; they do not hold.
    const registered = db.query("SELECT 1 FROM agent WHERE name = ?").get(place.name)
    if (!registered) throw new Error(`"${place.name}" is not registered — call tower_register first`)
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    if (row?.holder && row.holder !== place.name) return { granted: false, holder: row.holder }
    db.run(
      `INSERT INTO lock (name, holder, acquired_at) VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET holder = excluded.holder, acquired_at = excluded.acquired_at`,
      [name, place.name, now()],
    )
    return { granted: true, holder: place.name }
  })
  trace(
    place.root,
    place.name,
    result.granted ? `tomó el lock ${name}` : `esperando ${name}, lo tiene ${result.holder}`,
  )
  return result
}

export const release = ({ db, place }, name) => {
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (!db) return { released: false, reason: "nobody holds it" }
  const give = db.transaction(() => {
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    // Only the holder may release, so a confused agent cannot hand another
    // agent's token to someone else.
    if (!row?.holder) return { released: false, reason: "nobody holds it" }
    if (row.holder !== place.name) return { released: false, reason: `held by ${row.holder}` }
    db.run("UPDATE lock SET holder = NULL, acquired_at = NULL WHERE name = ?", [name])
    return { released: true }
  })
  const result = give.immediate()
  if (result.released) trace(place.root, place.name, `soltó el lock ${name}`)
  else trace(place.root, place.name, `no pudo soltar ${name}: ${result.reason}`, "TE NECESITA: ")
  return result
}

/**
 * Hand a lock to another agent without ever letting go of it.
 *
 * The Tower reserves delivery, fixes the order, and passes the token to the unit
 * whose turn it is. Releasing so that agent can acquire would leave the lock free
 * for the moment in between — an open window in the one operation this whole
 * store exists to serialize. Transferring closes it.
 *
 * It also keeps `holder` naming whoever is actually delivering, so `tower_status`
 * and `torre unlock` point at the session that would need rescuing, instead of at
 * the orchestrator that merely granted the turn.
 *
 * Only the holder may transfer, exactly as with release.
 */
export const transfer = ({ db, place }, name, to) => {
  assertActive({ place })
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (to === place.name) throw new Error(`"${to}" already holds ${name}`)
  const result = activeWrite({ db, place }, () => {
    // An unregistered target would strand the token on a name no session can
    // release, leaving `torre unlock` as the only way out. Refuse the typo.
    if (!db.query("SELECT 1 FROM agent WHERE name = ?").get(to)) {
      return { transferred: false, reason: `"${to}" is not registered` }
    }
    const row = db.query("SELECT holder FROM lock WHERE name = ?").get(name)
    if (!row?.holder) return { transferred: false, reason: "nobody holds it" }
    if (row.holder !== place.name) return { transferred: false, reason: `held by ${row.holder}` }
    db.run("UPDATE lock SET holder = ?, acquired_at = ? WHERE name = ?", [to, now(), name])
    return { transferred: true, holder: to }
  })
  if (result.transferred) trace(place.root, place.name, `pasó el lock ${name} a ${to}`)
  else trace(place.root, place.name, `no pudo pasar ${name} a ${to}: ${result.reason}`, "TE NECESITA: ")
  return result
}

/**
 * Human override: drop a lock regardless of who holds it.
 *
 * Deliberately NOT exposed as an MCP tool. Agents must never be able to take a
 * token from each other — that is the whole guarantee. But a session that dies
 * holding one would otherwise block delivery forever, with `torre reset` (which
 * destroys state, queue and locks) as the only escape. This is the small door,
 * and only a person standing at a terminal can open it.
 */
export const forceRelease = ({ db, place }, name) => {
  if (!LOCKS.includes(name)) throw new Error(`unknown lock "${name}" — one of: ${LOCKS.join(", ")}`)
  if (!db) return { released: false, reason: "nobody holds it" }
  const row = db.query("SELECT holder, acquired_at FROM lock WHERE name = ?").get(name)
  if (!row?.holder) return { released: false, reason: "nobody holds it" }
  db.run("UPDATE lock SET holder = NULL, acquired_at = NULL WHERE name = ?", [name])
  trace(place.root, "humano", `liberó ${name} a la fuerza (lo tenía ${row.holder})`, "TE NECESITA: ")
  return { released: true, was: row.holder, since: row.acquired_at }
}

/**
 * Remove ACTIVE only after every guarded writer that started first has
 * committed. New guarded writers either see ACTIVE missing before they begin or
 * recheck it after acquiring the writer lock and abort.
 */
export const deactivate = ({ db, place }) => {
  const activePath = join(place.root, "ACTIVE")
  if (!db) {
    rmSync(activePath, { force: true })
    return { active: false }
  }

  const stop = db.transaction(() => {
    rmSync(activePath, { force: true })
    return { active: false }
  })
  const deadline = Date.now() + 5000
  let waitingLogged = false

  // Disable SQLite's own opaque wait so we can bound it explicitly and leave
  // ACTIVE intact if an in-flight operation never finishes.
  db.run("PRAGMA busy_timeout = 0")
  try {
    while (true) {
      try {
        return stop.immediate()
      } catch (error) {
        const busy = error?.code === "SQLITE_BUSY" || error?.message?.includes("database is locked")
        if (!busy) throw error
        if (!waitingLogged) {
          waitingLogged = true
          trace(place.root, "humano", "torre off waiting for an in-flight guarded operation")
        }
        if (Date.now() >= deadline) {
          throw new Error("torre off timed out waiting for an in-flight guarded operation")
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
      }
    }
  } finally {
    db.run("PRAGMA busy_timeout = 5000")
  }
}

/**
 * The whole truth in one call. The orchestrator is meant to read this instead
 * of remembering — that is what keeps its context flat across a long session
 * and makes compaction harmless.
 */
export const status = ({ db, place }) => ({
  active: isActive({ place }),
  you: place.name,
  agents: db
    ? db
        .query(
          `SELECT a.name, a.role, a.branch, a.state, a.task, a.note, a.pr_url,
                  (SELECT COUNT(*) FROM message m
                   WHERE m.recipient = a.name AND m.consumed_at IS NULL) AS pending
           FROM agent a ORDER BY a.role DESC, a.name`,
        )
        .all()
    : [],
  locks: db
    ? db.query("SELECT name, holder, acquired_at FROM lock WHERE holder IS NOT NULL").all()
    : [],
})
