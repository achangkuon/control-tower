import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

import { canonicalize } from "../../contracts/canonicalize.mjs"
import { preflightLegacyImport } from "../../registry/legacy-import.mjs"

const hint = (id = "legacy") => ({ id, name: `secret-${id}`, root: `/legacy/${id}`, kind: "hermes" })
const entry = (project_id = "alpha", overrides = {}) => ({
  project_id, aliases: [project_id], canonical_root: `/projects/${project_id}`,
  git_common_dir: `/projects/${project_id}/.git`, expected_remote: `git@example.invalid:${project_id}.git`,
  main_branch: "master", main_session: `${project_id}-main`, manifest_path: "openspec/plans/manifest.yaml",
  roadmap_path: "openspec/plans/master-index.md", main_store_path: `/state/${project_id}`,
  allowed_hosts: ["opencode"], registry_entry_revision: 1, ...overrides,
})
const verified = (value = entry()) => ({ status: "verified", entry: value })
const document = (projects = [entry("current")]) => ({
  schema: "project-registry", schema_version: 1, registry_revision: 1, projects,
})
const run = (records, deriveFacts = () => verified(), registryReader) =>
  preflightLegacyImport(records, { deriveFacts, registryReader })
const codes = (result) => result.issues.map(({ code }) => code)
const assertDeepFrozen = (value) => {
  expect(Object.isFrozen(value)).toBe(true)
  if (value && typeof value === "object") for (const child of Object.values(value)) assertDeepFrozen(child)
}

describe("legacy import request and authority gates", () => {
  test("rejects malformed requests and exact record shapes with safe metadata", () => {
    expect(run(null)).toEqual({ ok: false, items: [],
      issues: [{ code: "INVALID_REQUEST", index: null, field: "records", kind: "request" }],
      registry: { status: "not-requested", revision: null }, evidence: { authoritative_writes: 0, registry_operation: "none" } })
    for (const record of [{}, { ...hint(), extra: "no" }, { ...hint(), id: 1 }, Object.create(null)]) {
      const result = run([record])
      expect(result.items[0]).toEqual({ index: 0, status: "rejected", candidate: null, canonical: null })
      expect(result.issues).toEqual([{ code: "MALFORMED_RECORD", index: 0, field: "record", kind: "record" }])
    }
  })

  test("keeps the first same-id record eligible and rejects later duplicates in input order", () => {
    const seen = []
    const result = run([hint("same"), hint("other"), { ...hint("same"), name: "changed" }], (value, context) => {
      seen.push([value, context]); return verified(entry(value.id))
    })
    expect(result.items.map(({ index, status }) => [index, status])).toEqual([[0, "ready"], [1, "ready"], [2, "rejected"]])
    expect(codes(result)).toEqual(["DUPLICATE_ID"])
    expect(seen.map(([, context]) => context.index)).toEqual([0, 1])
    expect(Object.isFrozen(seen[0][0])).toBe(true)
    expect(result.items[0].candidate.project_id).toBe("same")
    expect(JSON.stringify(result)).not.toContain("changed")
  })
})

describe("authoritative derivation and contract", () => {
  test("maps invalid, thrown, incomplete, and contract-rejected derivation in closed order", () => {
    const outcomes = [
      { status: "invalid" },
      () => { throw new Error("credential-secret", { cause: new Error("cause-secret") }) },
      { status: "incomplete", missing: ["main_branch", "project_id"], unverifiable: ["aliases"] },
      verified({ ...entry("bad"), canonical_root: "relative" }),
    ]
    const result = run(outcomes.map((_, index) => hint(`h${index}`)), (_hint, { index }) => {
      const outcome = outcomes[index]; return typeof outcome === "function" ? outcome() : outcome
    })
    expect(codes(result)).toEqual(["DERIVATION_INVALID", "DERIVATION_FAILED", "INCOMPLETE_FACTS", "INCOMPLETE_FACTS", "INCOMPLETE_FACTS", "CONTRACT_REJECTED"])
    expect(result.issues.slice(2, 5).map(({ index, field, kind }) => [index, field, kind])).toEqual([
      [2, "project_id", "missing"], [2, "main_branch", "missing"], [2, "aliases", "unverifiable"],
    ])
    expect(result.items.every(({ candidate, canonical }) => candidate === null && canonical === null)).toBe(true)
    expect(JSON.stringify(result)).not.toMatch(/credential-secret|cause-secret|\/legacy\/|secret-h/)
  })

  test("accepts only a complete validated authoritative entry and returns its exact canonical form", () => {
    const authoritative = entry("verified", { canonical_root: "/lexical/../accepted", extensions: { "legacy/source": "authority" } })
    const result = run([hint("untrusted")], () => verified(authoritative))
    expect(result.ok).toBe(true)
    expect(result.items[0]).toEqual({ index: 0, status: "ready", candidate: authoritative,
      canonical: canonicalize(authoritative) })
    expect(result.items[0].candidate.project_id).toBe("verified")
    expect(result.items[0].candidate.canonical_root).toBe("/lexical/../accepted")
  })

  test("treats malformed derivation envelopes and incomplete field metadata as DERIVATION_INVALID", () => {
    for (const outcome of [null, {}, { status: "verified" }, { status: "unknown" },
      { status: "incomplete", missing: ["not-a-field"], unverifiable: [] },
      { status: "incomplete", missing: [], unverifiable: [] }]) {
      expect(codes(run([hint()], () => outcome))).toEqual(["DERIVATION_INVALID"])
    }
  })

  test("orders incomplete diagnostics by input, then missing before unverifiable and schema field order", () => {
    const result = run([hint("first"), hint("second")], (_hint, { index }) => index === 0
      ? { status: "incomplete", missing: ["roadmap_path", "project_id"], unverifiable: ["aliases"] }
      : { status: "incomplete", missing: ["canonical_root"], unverifiable: [] })
    expect(result.issues.map(({ index, field, kind }) => [index, field, kind])).toEqual([
      [0, "project_id", "missing"], [0, "roadmap_path", "missing"], [0, "aliases", "unverifiable"],
      [1, "canonical_root", "missing"],
    ])
  })
})

describe("read-only current registry comparison", () => {
  test("distinguishes no read, empty, valid, failed, and invalid loads and never saves", () => {
    expect(run([hint()]).registry).toEqual({ status: "not-requested", revision: null })
    let loads = 0, saves = 0
    const empty = run([hint()], undefined, { load: () => { loads += 1; return null }, save: () => { saves += 1 } })
    expect(empty.registry).toEqual({ status: "empty", revision: null })
    const loaded = run([hint()], undefined, { load: () => { loads += 1; return document() }, save: () => { saves += 1 } })
    expect(loaded.registry).toEqual({ status: "loaded", revision: 1 })
    expect(loads).toBe(2); expect(saves).toBe(0)
    const failed = run([hint()], undefined, { load: () => { throw new Error("reader-secret") } })
    expect(failed.registry).toEqual({ status: "failed", revision: null })
    expect(codes(failed)).toEqual(["REGISTRY_READ_FAILED"])
    expect(failed.items[0].status).toBe("rejected")
    const invalid = run([hint()], undefined, { load: () => ({ secret: "registry-secret" }) })
    expect(invalid.registry).toEqual({ status: "invalid", revision: null })
    expect(codes(invalid)).toEqual(["REGISTRY_INVALID"])
    expect(JSON.stringify([failed, invalid])).not.toMatch(/reader-secret|registry-secret/)
  })

  test("maps every load throw to REGISTRY_READ_FAILED regardless of contract-like codes", () => {
    for (const code of ["CT_SCHEMA_INVALID", "CT_MANIFEST_INVALID", undefined]) {
      const result = run([hint()], undefined, { load: () => { throw { code, secret: "hidden" } } })
      expect([result.registry, codes(result)]).toEqual([{ status: "failed", revision: null }, ["REGISTRY_READ_FAILED"]])
    }
  })

  test("reports all same-class conflicts in fixed field order", () => {
    const candidate = entry("taken", { aliases: ["alias"], canonical_root: "/taken/root",
      git_common_dir: "/taken/git", main_store_path: "/taken/store" })
    const current = entry("taken", { aliases: ["alias"], canonical_root: "/taken/root",
      git_common_dir: "/taken/git", main_store_path: "/taken/store" })
    const result = run([hint()], () => verified(candidate), { load: () => document([current]) })
    expect(codes(result)).toEqual(["PROJECT_ID_CONFLICT", "ALIAS_CONFLICT", "CANONICAL_ROOT_CONFLICT", "GIT_COMMON_DIR_CONFLICT", "MAIN_STORE_PATH_CONFLICT"])
    expect(result.issues.map(({ field }) => field)).toEqual(["project_id", "aliases", "canonical_root", "git_common_dir", "main_store_path"])
    expect(result.items[0]).toEqual({ index: 0, status: "conflict", candidate: null, canonical: null })
  })

  test("does not infer cross-class conflicts", () => {
    const candidate = entry("candidate", { aliases: ["candidate-alias"], canonical_root: "/candidate/root",
      git_common_dir: "/candidate/git", main_store_path: "/candidate/store" })
    const current = entry("current", { aliases: ["other"], canonical_root: candidate.git_common_dir,
      git_common_dir: candidate.main_store_path, main_store_path: candidate.canonical_root })
    current.aliases = [candidate.project_id]
    const result = run([hint()], () => verified(candidate), { load: () => document([current]) })
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
    expect(result.items[0].status).toBe("ready")
  })
})

test("orders issue classes globally and results are deterministic and deeply frozen", () => {
  const records = [hint("contract"), hint("duplicate"), hint("duplicate"), {}, hint("derive"), hint("incomplete")]
  const derive = (value) => value.id === "contract" ? verified({ ...entry(), canonical_root: "bad" })
    : value.id === "derive" ? { status: "invalid" }
      : value.id === "incomplete" ? { status: "incomplete", missing: ["project_id"], unverifiable: [] }
        : verified(entry(value.id))
  const reader = { load: () => ({ invalid: true }) }
  const first = run(records, derive, reader), second = run(records, derive, reader)
  expect(codes(first)).toEqual(["MALFORMED_RECORD", "DUPLICATE_ID", "DERIVATION_INVALID", "INCOMPLETE_FACTS", "CONTRACT_REJECTED", "REGISTRY_INVALID"])
  expect(first).toEqual(second)
  assertDeepFrozen(first)
})

test("preserves input index before code rank within the derivation issue class", () => {
  const result = run([hint("failed"), hint("invalid")], (_hint, { index }) => {
    if (index === 0) throw new Error("failed"); return { status: "invalid" }
  })
  expect(codes(result)).toEqual(["DERIVATION_FAILED", "DERIVATION_INVALID"])
})

test("stays private and isolated from stores, filesystem mutators, runtime, Git, ACTIVE, and P8", async () => {
  const source = readFileSync(new URL("../../registry/legacy-import.mjs", import.meta.url), "utf8")
  expect([...source.matchAll(/^import .* from "([^"]+)"$/gm)].map((match) => match[1])).toEqual([
    "../contracts/canonicalize.mjs", "../contracts/validate.mjs",
  ])
  expect(source).not.toMatch(/registry\/store|node:fs|core\.mjs|tower\.db|ACTIVE|child_process|node:sqlite|p8|hermes|layout|support/i)
  const publicRegistry = await import("../../registry/index.mjs")
  expect(Object.keys(publicRegistry).sort()).toEqual(["createProjectRegistryStore", "resolveProjectRegistryPath"])
  const calls = []
  const result = run([hint()], () => { calls.push("derive"); return verified() }, { load: () => { calls.push("load"); return null }, save: () => { calls.push("save") } })
  expect(calls).toEqual(["derive", "load"])
  expect(result.evidence).toEqual({ authoritative_writes: 0, registry_operation: "load" })
})
