import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dir, "../..")
const readYaml = (path) => Bun.YAML.parse(readFileSync(resolve(root, path), "utf8"))
const digest = (path) => `sha256:${createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex")}`

const catalog = () => readYaml("openspec/plans/manifest.yaml")
const productMap = () => readYaml("openspec/plans/product-version-map.yaml")
const v1 = () => readYaml("openspec/plans/installable-v1/revisions/1/manifest.yaml")
const v2 = () => readYaml("openspec/plans/autonomous-v2/revisions/1/manifest.yaml")

const isDeniedExecutablePath = (path, mode, policy) => {
  const name = path.split("/").at(-1)
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : ""
  return mode === "executable" && (
    policy.denied_exact.includes(name) || policy.denied_extensions.includes(extension)
  )
}

const isSafeGitSelection = ({ args, cwd, repositoryRoot }, policy) =>
  !args.includes("-C") &&
  args.every((arg) => !arg.startsWith("../") && !arg.includes("/../")) &&
  cwd === repositoryRoot &&
  policy.require_argument_array === true &&
  policy.require_canonical_cwd === true

const ownershipConflicts = (claims) => {
  const owners = new Map()
  const conflicts = []
  for (const claim of claims) {
    for (const path of claim.paths) {
      const existing = owners.get(path)
      if (existing && existing.owner !== claim.owner && existing.checkpoint !== claim.checkpoint) {
        conflicts.push(path)
      } else {
        owners.set(path, claim)
      }
    }
  }
  return conflicts
}

describe("provenance threat boundaries", () => {
  test.each([
    "requirements.txt",
    "CMakeLists.txt",
    "guide.md",
    "guide.mdx",
    "README.sh",
  ])("rejects documentation-like executable path %s", (path) => {
    expect(isDeniedExecutablePath(path, "executable", v1().executable_path_policy)).toBe(true)
  })

  test("allows a declared runtime entry point without weakening documentation denials", () => {
    const manifest = v1()
    expect(isDeniedExecutablePath("bin/torre", "executable", manifest.executable_path_policy)).toBe(false)
    expect(manifest.executable_path_policy.allowed_exact).toContain("bin/torre")
  })

  test.each([
    { args: ["-C", "/tmp/other", "status"], cwd: "/repo", repositoryRoot: "/repo" },
    { args: ["status", "../other"], cwd: "/repo", repositoryRoot: "/repo" },
    { args: ["status"], cwd: "/other", repositoryRoot: "/repo" },
  ])("rejects unsafe Git repository selection %#", (selection) => {
    expect(isSafeGitSelection(selection, v1().git_selection_policy)).toBe(false)
  })

  test("accepts argument-array Git at the canonical repository root", () => {
    expect(isSafeGitSelection(
      { args: ["status", "--short"], cwd: "/repo", repositoryRoot: "/repo" },
      v1().git_selection_policy,
    )).toBe(true)
  })
})

describe("raw-byte ArtifactRefs", () => {
  test("matches every historical input digest against repository bytes", () => {
    const refs = Object.values(v2().artifact_refs)
    expect(refs.length).toBeGreaterThan(2)
    for (const ref of refs) {
      expect(ref.digest_mode).toBe("raw-bytes")
      expect(ref.content_digest).toBe(digest(ref.repo_relative_path))
      expect(ref.source_commit).toMatch(/^[0-9a-f]{40}$/)
    }
  })

  test("detects a digest mismatch before a canonical pointer can advance", () => {
    const ref = v2().artifact_refs.prd
    expect(ref.content_digest).not.toBe(digest("openspec/rfc/sdd-tower-implementation-v1.md"))
    expect(productMap().publication.requires_digest_validation).toBe(true)
  })

  test("uses explicit normalized relationship arrays", () => {
    for (const manifest of [v1(), v2()]) {
      expect(manifest.relationships).toEqual({
        preserves: expect.any(Array),
        supersedes: expect.any(Array),
        migrates: expect.any(Array),
      })
    }
  })
})

describe("canonical publication and rollback", () => {
  test("catalog, product map, and revision manifests resolve the same active revisions", () => {
    const plans = new Map(catalog().plans.map((plan) => [plan.plan_id, plan]))
    const products = productMap().products
    expect(plans.get("installable-control-tower-v1").active_revision).toBe(products.installable_v1.active_revision)
    expect(plans.get("autonomous-control-tower-v2").active_revision).toBe(products.autonomous_v2.active_revision)
    expect(products.installable_v1.active_revision).toBe(v1().artifact_revision)
    expect(products.autonomous_v2.active_revision).toBe(v2().artifact_revision)
    expect(v2().dependencies.required_release_refs).toContain(v1().artifact_id)
    expect(products.installable_v1.release_lane).toBe("installable-v1")
    expect(products.autonomous_v2.release_lane).toBe("autonomous-v2")
  })

  test("records an atomically checkable pointer and non-destructive rollback", () => {
    const publication = productMap().publication
    expect(publication.atomic_pointer.strategy).toBe("validate-temp-fsync-rename")
    expect(publication.atomic_pointer.pointer_revision).toBeGreaterThan(0)
    expect(publication.rollback.restore_pointer_revision).toBeLessThan(publication.atomic_pointer.pointer_revision)
    expect(publication.rollback.retain_failed_revision).toBe(true)
    expect(publication.rollback.delete_historical_artifacts).toBe(false)
  })

  test("detects conflicting shared-file ownership without a common checkpoint", () => {
    const claims = productMap().ownership.claims
    const conflicting = {
      owner: "autonomous-v2",
      checkpoint: "v2-uncoordinated",
      paths: ["openspec/plans/manifest.yaml"],
    }
    expect(ownershipConflicts([...claims, conflicting])).toEqual(["openspec/plans/manifest.yaml"])
    expect(ownershipConflicts(claims)).toEqual([])
  })

  test("serializes V1 canonical ownership against the Autonomous V2 lane", () => {
    const ownership = productMap().ownership
    expect(ownership.serialized_with).toBe("autonomous-v2")
    expect(ownership.active_owner).toBe("installable-v1-provenance")
    expect(ownership.integration_checkpoint).toBe("v1-provenance-published")
  })
})
