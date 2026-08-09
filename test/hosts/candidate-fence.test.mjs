import { afterEach, describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import * as nodeFs from "node:fs"
import { basename, dirname, join } from "node:path"
import { tmpdir } from "node:os"

import { canonicalize } from "../../contracts/canonicalize.mjs"
import * as fenceModule from "../../hosts/candidate-fence.mjs"

const roots = []
afterEach(() => { for (const root of roots.splice(0)) nodeFs.rmSync(root, { force: true, recursive: true }) })

const capture = (operation) => {
  try { return { value: operation(), code: null, message: null } }
  catch (cause) { return { value: null, code: cause?.code, message: cause?.message } }
}
const sha = (letter) => `sha256:${letter.repeat(64)}`
const candidate = (hostId, overrides = {}) => ({
  project_id: "project-a",
  candidate_revision: sha(hostId.at(-1)),
  host_id: hostId,
  base_sha: hostId.at(-1).repeat(40),
  runtime_binding_ref: `bindings/${hostId}-runtime.json`,
  role_binding_ref: `bindings/${hostId}-role.json`,
  assignment_ref: `assignments/${hostId}.json`,
  work_ref: `work/${hostId}.json`,
  ...overrides,
})
const predecessor = (value, hostEpoch = 1, overrides = {}) => ({
  host_id: value.host_id,
  host_epoch: hostEpoch,
  base_sha: value.base_sha,
  runtime_binding_ref: value.runtime_binding_ref,
  role_binding_ref: value.role_binding_ref,
  assignment_ref: value.assignment_ref,
  ...overrides,
})
const terminationProof = (value, overrides = {}) => ({
  schema: "recovery-proof",
  schema_version: 1,
  proof_id: `proof-${value.host_id}`,
  project_id: value.project_id,
  old_claim_ref: `claims/${value.host_id}.json`,
  old_delivery_ref: `deliveries/${value.host_id}.json`,
  old_assignment_ref: value.assignment_ref,
  generation: 1,
  disposition: "NOT_STARTED",
  termination_pairing_ref: `termination/${value.host_id}.json`,
  effect_readback: {},
  repository_root: "/repository",
  workspace_path: `/worktrees/${value.host_id}`,
  base_sha: value.base_sha,
  mode: "safe",
  runtime_binding_ref: value.runtime_binding_ref,
  role_binding_ref: value.role_binding_ref,
  ...overrides,
})
const decision = (oldHost, nextHost, overrides = {}) => ({
  schema: "candidate-fence-decision",
  schema_version: 1,
  status: "APPROVED",
  decision_ref: `decision-${oldHost.host_id}-${nextHost.host_id}`,
  project_id: oldHost.project_id,
  predecessor_host_id: oldHost.host_id,
  predecessor_host_epoch: 1,
  candidate_revision: nextHost.candidate_revision,
  candidate_host_id: nextHost.host_id,
  base_sha: nextHost.base_sha,
  runtime_binding_ref: nextHost.runtime_binding_ref,
  role_binding_ref: nextHost.role_binding_ref,
  assignment_ref: nextHost.assignment_ref,
  expires_at: "2999-01-01T00:00:00.000Z",
  ...overrides,
})
const eventNames = (root) => nodeFs.readdirSync(root).filter((name) => /^\d{20}-[a-f0-9]{64}\.json$/.test(name)).sort()
const lockPath = (root) => join(root, ".candidate-fence.lock")
const viewPath = (root) => join(root, "candidate-fence.view.json")
const eventPath = (root, epoch) => join(root, eventNames(root).find((name) => Number(name.slice(0, 20)) === epoch))
const eventBytes = (event) => Buffer.from(`${canonicalize(event)}\n`)
const digestBytes = (bytes) => createHash("sha256").update(bytes).digest("hex")
const writeCanonicalEvent = (root, event) => {
  const bytes = eventBytes(event)
  const path = join(root, `${String(event.host_epoch).padStart(20, "0")}-${digestBytes(bytes)}.json`)
  nodeFs.writeFileSync(path, bytes, { mode: 0o600 })
  nodeFs.chmodSync(path, 0o600)
  return path
}

const fixture = (options = {}) => {
  const root = options.root ?? nodeFs.mkdtempSync(join(tmpdir(), "ct-host-fence-"))
  if (!options.root) roots.push(root)
  const proofs = options.proofs ?? new Map()
  const decisions = options.decisions ?? new Map()
  const resolveTerminationProof = options.resolveTerminationProof ?? ((reference) => proofs.get(reference))
  const authorizeMaintainerDecision = options.authorizeMaintainerDecision ?? ((reference) => decisions.get(reference))
  const store = fenceModule.createCandidateFenceStore({
    rootPath: root,
    ledgerPath: join(root, ".candidate-fence"),
    resolveTerminationProof,
    authorizeMaintainerDecision,
    fs: options.fs,
    lockTimeoutMs: options.lockTimeoutMs,
  })
  return { root, store, proofs, decisions, resolveTerminationProof, authorizeMaintainerDecision }
}
const admitInitial = (store, value = candidate("host-a")) => store.admit({ candidate: value, expectedRevision: 0 })
const admitNext = (store, oldHost, nextHost, reference = `proof-${oldHost.host_id}`, expectedRevision = 1) => store.admit({
  candidate: nextHost,
  predecessor: predecessor(oldHost, expectedRevision),
  terminationProofRef: reference,
  expectedRevision,
})
const authorize = (fixtureValue, oldHost, nextHost, reference = `decision-${oldHost.host_id}-${nextHost.host_id}`, overrides = {}) => {
  fixtureValue.decisions.set(reference, decision(oldHost, nextHost, { decision_ref: reference, ...overrides }))
  return reference
}

const injectedFs = (stage) => {
  const eventDescriptors = new Set()
  const fs = { ...nodeFs }
  fs.openSync = (path, flags, mode) => {
    if (stage === "before-create" && typeof path === "string" && /^\d{20}-[a-f0-9]{64}\.json$/.test(basename(path))) {
      throw Object.assign(new Error("before create"), { code: "EIO" })
    }
    const descriptor = nodeFs.openSync(path, flags, mode)
    if (typeof path === "string" && /^\d{20}-[a-f0-9]{64}\.json$/.test(basename(path))) eventDescriptors.add(descriptor)
    return descriptor
  }
  fs.writeFileSync = (target, bytes, options) => {
    const result = nodeFs.writeFileSync(target, bytes, options)
    if (stage === "write" && eventDescriptors.has(target)) throw Object.assign(new Error("write ambiguous"), { code: "EIO" })
    return result
  }
  fs.fsyncSync = (descriptor) => {
    const result = nodeFs.fsyncSync(descriptor)
    if (stage === "file-fsync" && eventDescriptors.has(descriptor)) throw Object.assign(new Error("file fsync ambiguous"), { code: "EIO" })
    if (stage === "directory-fsync" && !eventDescriptors.has(descriptor) && nodeFs.fstatSync(descriptor).isDirectory()) {
      throw Object.assign(new Error("directory fsync ambiguous"), { code: "EIO" })
    }
    return result
  }
  fs.closeSync = (descriptor) => {
    const event = eventDescriptors.has(descriptor)
    const result = nodeFs.closeSync(descriptor)
    if (event) eventDescriptors.delete(descriptor)
    if (stage === "close" && event) throw Object.assign(new Error("close ambiguous"), { code: "EIO" })
    return result
  }
  return fs
}

describe("single-host candidate fence", () => {
  test("keeps one public export and publishes immutable canonical epoch files", () => {
    expect(Object.keys(fenceModule)).toEqual(["createCandidateFenceStore"])
    const context = fixture()
    const first = candidate("host-a")

    expect(context.store.read()).toBeNull()
    const view = admitInitial(context.store, first)

    expect(view).toMatchObject({ schema: "candidate-fence-journal", schema_version: 1, project_id: "project-a", revision: 1 })
    expect(view.events).toHaveLength(1)
    expect(view.events[0]).toMatchObject({ event: "HOST_ADMITTED", exclusivity: "VERIFIED", host_epoch: 1, previous_event_digest: null, candidate: first })
    expect(Object.isFrozen(view.events[0].candidate)).toBeTrue()
    expect(eventNames(context.root)).toHaveLength(1)
    const name = eventNames(context.root)[0]
    const bytes = nodeFs.readFileSync(join(context.root, name))
    expect(name).toBe(`00000000000000000001-${digestBytes(bytes)}.json`)
    expect(bytes).toEqual(eventBytes(JSON.parse(bytes.toString("utf8"))))
    expect(nodeFs.statSync(join(context.root, name)).mode & 0o777).toBe(0o600)
    expect(nodeFs.existsSync(join(context.root, ".candidate-fence"))).toBeFalse()
  })

  test("requires a pre-existing trusted 0700 root with no symlink component and both constructor ports", () => {
    const container = nodeFs.mkdtempSync(join(tmpdir(), "ct-host-root-")); roots.push(container)
    const missing = join(container, "missing")
    expect(capture(() => fenceModule.createCandidateFenceStore({ rootPath: missing, resolveTerminationProof() {}, authorizeMaintainerDecision() {} })).code).toBe("CT_FENCE_UNSAFE")
    expect(nodeFs.existsSync(missing)).toBeFalse()

    const unsafe = join(container, "unsafe"); nodeFs.mkdirSync(unsafe, { mode: 0o755 }); nodeFs.chmodSync(unsafe, 0o755)
    expect(capture(() => fenceModule.createCandidateFenceStore({ rootPath: unsafe, resolveTerminationProof() {}, authorizeMaintainerDecision() {} })).code).toBe("CT_FENCE_UNSAFE")
    expect(nodeFs.statSync(unsafe).mode & 0o777).toBe(0o755)

    const trusted = join(container, "trusted"); nodeFs.mkdirSync(trusted, { mode: 0o700 })
    const linked = join(container, "linked"); nodeFs.symlinkSync(trusted, linked)
    expect(capture(() => fenceModule.createCandidateFenceStore({ rootPath: linked, resolveTerminationProof() {}, authorizeMaintainerDecision() {} })).code).toBe("CT_FENCE_UNSAFE")
    expect(nodeFs.readdirSync(trusted)).toEqual([])

    expect(capture(() => fenceModule.createCandidateFenceStore({ rootPath: trusted, authorizeMaintainerDecision() {} })).code).toBe("CT_FENCE_PORT_REQUIRED")
    expect(capture(() => fenceModule.createCandidateFenceStore({ rootPath: trusted, resolveTerminationProof() {} })).code).toBe("CT_FENCE_PORT_REQUIRED")
  })

  test("rejects caller-fabricated proof, actor, resolver, and authority inputs without journal mutation", () => {
    const context = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(context.store, oldHost)
    const before = eventNames(context.root)
    const forbidden = [
      { terminationProof: terminationProof(oldHost) },
      { actor: "MAINTAINER" },
      { resolveTerminationProof() { return terminationProof(oldHost) } },
      { authority: { status: "APPROVED" } },
    ]

    for (const extra of forbidden) {
      expect(capture(() => context.store.admit({
        candidate: nextHost,
        predecessor: predecessor(oldHost),
        terminationProofRef: "proof-host-a",
        expectedRevision: 1,
        ...extra,
      })).code).toBe("CT_FENCE_INVALID")
      expect(eventNames(context.root)).toEqual(before)
    }
    expect(nodeFs.existsSync(lockPath(context.root))).toBeFalse()
  })

  test("resolves proof only through the constructor port and recomputes every exact binding", () => {
    const driftCases = [
      ["project", { project_id: "project-z" }, "CT_STOP_PROOF_INVALID"],
      ["assignment", { old_assignment_ref: "assignments/other.json" }, "CT_STOP_PROOF_INVALID"],
      ["base", { base_sha: "c".repeat(40) }, "CT_BASE_DRIFT"],
      ["runtime", { runtime_binding_ref: "bindings/other-runtime.json" }, "CT_RUNTIME_DRIFT"],
      ["role", { role_binding_ref: "bindings/other-role.json" }, "CT_ROLE_DRIFT"],
    ]
    for (const [_label, proofOverride, code] of driftCases) {
      const context = fixture()
      const oldHost = candidate("host-a"), nextHost = candidate("host-b")
      admitInitial(context.store, oldHost)
      context.proofs.set("proof-ref", terminationProof(oldHost, { proof_id: "proof-ref", ...proofOverride }))
      expect(capture(() => admitNext(context.store, oldHost, nextHost, "proof-ref")).code).toBe(code)
      expect(eventNames(context.root)).toHaveLength(1)
    }

    for (const resolver of [() => undefined, () => ({ status: "AMBIGUOUS" }), () => { throw new Error("offline") }]) {
      const context = fixture({ resolveTerminationProof: resolver })
      const oldHost = candidate("host-a"), nextHost = candidate("host-b")
      admitInitial(context.store, oldHost)
      expect(["CT_STOP_PROOF_REQUIRED", "CT_STOP_PROOF_INVALID"]).toContain(capture(() => admitNext(context.store, oldHost, nextHost, "proof-ref")).code)
      expect(eventNames(context.root)).toHaveLength(1)
    }

    const context = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(context.store, oldHost)
    context.proofs.set("proof-ref", terminationProof(oldHost, { proof_id: "proof-ref" }))
    const admitted = admitNext(context.store, oldHost, nextHost, "proof-ref")
    expect(admitted.events.map(({ host_epoch }) => host_epoch)).toEqual([1, 2])
    expect(admitted.events[1]).toMatchObject({ event: "HOST_ADMITTED", termination_proof_ref: "proof-ref", previous_event_digest: `sha256:${eventNames(context.root)[0].slice(21, 85)}` })
  })

  test("forces takeover only through an exact current human decision and freezes displaced work", () => {
    const context = fixture()
    const oldHost = candidate("host-a"), nextHost = candidate("host-b")
    admitInitial(context.store, oldHost)
    const reference = authorize(context, oldHost, nextHost)

    const takeover = context.store.forceTakeover({ candidate: nextHost, predecessor: predecessor(oldHost), maintainerDecisionRef: reference, expectedRevision: 1 })

    expect(takeover.events[1]).toMatchObject({
      event: "TAKEOVER_FORCED", exclusivity: "BROKEN", host_epoch: 2,
      maintainer_decision_ref: reference,
      frozen_work: { state: "FROZEN", candidate_revision: oldHost.candidate_revision, base_sha: oldHost.base_sha, work_ref: oldHost.work_ref },
    })
    expect(capture(() => context.store.assertBaseUsable({ projectId: "project-a", baseSha: oldHost.base_sha })).code).toBe("CT_FROZEN_WORK_UNRESOLVED")

    for (const authorizeMaintainerDecision of [() => undefined, () => ({ status: "AMBIGUOUS" }), () => { throw new Error("offline") }]) {
      const attempt = fixture({ authorizeMaintainerDecision })
      admitInitial(attempt.store, oldHost)
      expect(capture(() => attempt.store.forceTakeover({ candidate: nextHost, predecessor: predecessor(oldHost), maintainerDecisionRef: "decision-unknown", expectedRevision: 1 })).code).toBe("CT_MAINTAINER_REQUIRED")
      expect(eventNames(attempt.root)).toHaveLength(1)
    }

    for (const override of [
      { status: "DECLINED" }, { project_id: "project-z" }, { predecessor_host_id: "host-z" },
      { predecessor_host_epoch: 2 }, { candidate_revision: sha("z") }, { candidate_host_id: "host-z" },
      { base_sha: "z".repeat(40) }, { runtime_binding_ref: "bindings/z.json" },
      { role_binding_ref: "bindings/z.json" }, { assignment_ref: "assignments/z.json" },
      { expires_at: "2000-01-01T00:00:00.000Z" },
    ]) {
      const attempt = fixture()
      admitInitial(attempt.store, oldHost)
      const badRef = authorize(attempt, oldHost, nextHost, "decision-bad", override)
      expect(["CT_MAINTAINER_REQUIRED", "CT_MAINTAINER_DECISION_INVALID", "CT_BASE_DRIFT", "CT_RUNTIME_DRIFT", "CT_ROLE_DRIFT", "CT_OWNERSHIP_UNCERTAIN"])
        .toContain(capture(() => attempt.store.forceTakeover({ candidate: nextHost, predecessor: predecessor(oldHost), maintainerDecisionRef: badRef, expectedRevision: 1 })).code)
      expect(eventNames(attempt.root)).toHaveLength(1)
    }
  })

  test("ignores a rolled-back view cache and never reuses an epoch", () => {
    const context = fixture()
    const first = candidate("host-a"), second = candidate("host-b"), third = candidate("host-c")
    const prefix = admitInitial(context.store, first)
    context.proofs.set("proof-a", terminationProof(first, { proof_id: "proof-a" }))
    admitNext(context.store, first, second, "proof-a")
    nodeFs.writeFileSync(viewPath(context.root), `${canonicalize(prefix)}\n`, { mode: 0o600 })
    nodeFs.chmodSync(viewPath(context.root), 0o600)
    context.proofs.set("proof-b", terminationProof(second, { proof_id: "proof-b" }))

    expect(context.store.read().revision).toBe(2)
    const thirdView = admitNext(context.store, second, third, "proof-b", 2)

    expect(thirdView.events.map(({ host_epoch }) => host_epoch)).toEqual([1, 2, 3])
    expect(eventNames(context.root).map((name) => Number(name.slice(0, 20)))).toEqual([1, 2, 3])
  })

  test("fails closed on gap, duplicate epoch, byte tampering, and predecessor digest tampering", () => {
    const buildTwo = () => {
      const context = fixture()
      const first = candidate("host-a"), second = candidate("host-b")
      admitInitial(context.store, first)
      context.proofs.set("proof-a", terminationProof(first, { proof_id: "proof-a" }))
      admitNext(context.store, first, second, "proof-a")
      return context
    }

    const gap = buildTwo(); nodeFs.rmSync(eventPath(gap.root, 1))
    expect(capture(() => gap.store.read()).code).toBe("CT_FENCE_GAP")

    const duplicate = buildTwo()
    const duplicateEvent = JSON.parse(nodeFs.readFileSync(eventPath(duplicate.root, 2), "utf8")); duplicateEvent.termination_proof_ref = "proof-duplicate"
    writeCanonicalEvent(duplicate.root, duplicateEvent)
    expect(capture(() => duplicate.store.read()).code).toBe("CT_FENCE_DUPLICATE_EPOCH")

    const bytesTampered = buildTwo(); nodeFs.appendFileSync(eventPath(bytesTampered.root, 2), " ")
    expect(capture(() => bytesTampered.store.read()).code).toBe("CT_FENCE_TAMPERED")

    const chainTampered = buildTwo()
    const path = eventPath(chainTampered.root, 2), changed = JSON.parse(nodeFs.readFileSync(path, "utf8")); changed.previous_event_digest = `sha256:${"f".repeat(64)}`
    nodeFs.rmSync(path); writeCanonicalEvent(chainTampered.root, changed)
    expect(capture(() => chainTampered.store.read()).code).toBe("CT_FENCE_TAMPERED")

    const canonicalTamper = buildTwo()
    const candidatePath = eventPath(canonicalTamper.root, 2), candidateChanged = JSON.parse(nodeFs.readFileSync(candidatePath, "utf8")); candidateChanged.candidate.host_id = "!invalid"
    nodeFs.rmSync(candidatePath); writeCanonicalEvent(canonicalTamper.root, candidateChanged)
    expect(capture(() => canonicalTamper.store.read()).code).toBe("CT_FENCE_TAMPERED")
  })

  test("rejects event and lock symlinks or hardlinks and never deletes an unsafe lock", () => {
    const symlinkEvent = fixture(); admitInitial(symlinkEvent.store)
    const original = eventPath(symlinkEvent.root, 1), target = join(dirname(symlinkEvent.root), `${basename(symlinkEvent.root)}-event`)
    roots.push(target); nodeFs.renameSync(original, target); nodeFs.symlinkSync(target, original)
    expect(capture(() => symlinkEvent.store.read()).code).toBe("CT_FENCE_UNSAFE")

    const hardlinkEvent = fixture(); admitInitial(hardlinkEvent.store)
    const external = join(dirname(hardlinkEvent.root), `${basename(hardlinkEvent.root)}-hardlink`); roots.push(external)
    nodeFs.linkSync(eventPath(hardlinkEvent.root, 1), external)
    expect(capture(() => hardlinkEvent.store.read()).code).toBe("CT_FENCE_UNSAFE")

    const modeEvent = fixture(); admitInitial(modeEvent.store)
    nodeFs.chmodSync(eventPath(modeEvent.root, 1), 0o644)
    expect(capture(() => modeEvent.store.read()).code).toBe("CT_FENCE_UNSAFE")

    for (const kind of ["symlink", "hardlink", "mode"]) {
      const context = fixture()
      const externalLock = join(dirname(context.root), `${basename(context.root)}-${kind}-lock`); roots.push(externalLock)
      nodeFs.writeFileSync(externalLock, "held\n", { mode: 0o600 }); nodeFs.chmodSync(externalLock, 0o600)
      if (kind === "symlink") nodeFs.symlinkSync(externalLock, lockPath(context.root))
      else if (kind === "hardlink") nodeFs.linkSync(externalLock, lockPath(context.root))
      else { nodeFs.writeFileSync(lockPath(context.root), "held\n", { mode: 0o644 }); nodeFs.chmodSync(lockPath(context.root), 0o644) }
      expect(capture(() => admitInitial(context.store)).code).toBe("CT_FENCE_UNSAFE")
      expect(nodeFs.existsSync(lockPath(context.root))).toBeTrue()
      expect(nodeFs.readFileSync(externalLock, "utf8")).toBe("held\n")
    }
  })

  test("serializes two real processes with one epoch winner and cleans the owner lock", async () => {
    const context = fixture()
    const worker = String.raw`
      import { createCandidateFenceStore } from "./hosts/candidate-fence.mjs";
      const [rootPath, hostId, ready] = process.argv.slice(1);
      await Bun.write(ready, "ready\n");
      const store = createCandidateFenceStore({ rootPath, ledgerPath: rootPath+"/.candidate-fence", lockTimeoutMs:15000, resolveTerminationProof(){}, authorizeMaintainerDecision(){} });
      try { console.log(JSON.stringify(store.admit({ candidate:{ project_id:"project-a", candidate_revision:"sha256:"+hostId.at(-1).repeat(64), host_id:hostId, base_sha:hostId.at(-1).repeat(40), runtime_binding_ref:"bindings/"+hostId+"-runtime.json", role_binding_ref:"bindings/"+hostId+"-role.json", assignment_ref:"assignments/"+hostId+".json", work_ref:"work/"+hostId+".json" }, expectedRevision:0 }))); }
      catch (error) { console.log(JSON.stringify({code:error.code})); process.exitCode=2; }
    `
    const readyA = join(dirname(context.root), `${basename(context.root)}-ready-a`)
    const readyB = join(dirname(context.root), `${basename(context.root)}-ready-b`)
    roots.push(readyA, readyB)
    const spawn = (host, ready) => Bun.spawn([process.execPath, "-e", worker, context.root, host, ready], { cwd: join(import.meta.dir, "../.."), env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" }, stdout: "pipe", stderr: "pipe" })
    nodeFs.writeFileSync(lockPath(context.root), "held\n", { mode: 0o600 }); nodeFs.chmodSync(lockPath(context.root), 0o600)
    const first = spawn("host-a", readyA), second = spawn("host-b", readyB)
    const readyDeadline = Date.now() + 2_000
    while (!nodeFs.existsSync(readyA) || !nodeFs.existsSync(readyB)) {
      if (first.exitCode !== null || second.exitCode !== null || Date.now() >= readyDeadline) {
        const diagnostics = first.exitCode !== null
          ? await new Response(first.stderr).text()
          : second.exitCode !== null
            ? await new Response(second.stderr).text()
            : "ready timeout"
        throw new Error(`Concurrent writers failed to reach barrier: ${first.exitCode}/${second.exitCode}: ${diagnostics}`)
      }
      await Bun.sleep(2)
    }
    nodeFs.rmSync(lockPath(context.root))
    const exits = await Promise.all([first.exited, second.exited])
    const outputs = await Promise.all([new Response(first.stdout).json(), new Response(second.stdout).json()])

    expect(exits.sort()).toEqual([0, 2])
    expect(outputs.filter((value) => value.revision === 1)).toHaveLength(1)
    expect(outputs.filter((value) => value.code === "CT_CAS_MISMATCH")).toHaveLength(1)
    expect(context.store.read().revision).toBe(1)
    expect(eventNames(context.root)).toHaveLength(1)
    expect(nodeFs.existsSync(lockPath(context.root))).toBeFalse()
  }, 15_000)

  test("times out on a safe foreign lock without deleting it or publishing bytes", () => {
    const context = fixture({ lockTimeoutMs: 5 })
    nodeFs.writeFileSync(lockPath(context.root), "held\n", { mode: 0o600 }); nodeFs.chmodSync(lockPath(context.root), 0o600)

    expect(capture(() => admitInitial(context.store)).code).toBe("CT_FENCE_BUSY")

    expect(nodeFs.readFileSync(lockPath(context.root), "utf8")).toBe("held\n")
    expect(eventNames(context.root)).toEqual([])
  })

  test("a failure before final create leaves no journal bytes or owned residue", () => {
    const context = fixture({ fs: injectedFs("before-create") })

    expect(capture(() => admitInitial(context.store)).code).toBe("CT_FENCE_WRITE_FAILED")

    expect(eventNames(context.root)).toEqual([])
    expect(nodeFs.existsSync(lockPath(context.root))).toBeFalse()
  })

  for (const stage of ["write", "file-fsync", "close", "directory-fsync"]) {
    test(`post-create ${stage} ambiguity burns the epoch and requires exact readback`, () => {
      const writer = fixture({ fs: injectedFs(stage) })

      expect(capture(() => admitInitial(writer.store)).code).toBe("CT_FENCE_DURABILITY_UNKNOWN")
      expect(eventNames(writer.root)).toHaveLength(1)
      expect(nodeFs.existsSync(lockPath(writer.root))).toBeFalse()

      const reader = fixture({ root: writer.root })
      const readback = reader.store.read()
      expect(readback).toMatchObject({ revision: 1, events: [{ host_epoch: 1, event: "HOST_ADMITTED" }] })
      expect(capture(() => admitInitial(reader.store, candidate("host-b"))).code).toBe("CT_CAS_MISMATCH")
      expect(eventNames(writer.root)).toHaveLength(1)
    })
  }
})
