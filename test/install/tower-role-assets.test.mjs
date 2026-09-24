import { afterEach, describe, expect, test } from "bun:test"
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { parse } from "yaml"
import { ASSET_CONTRACTS, GENERIC_COPY, PROFILE_FRONTMATTER_KEYS, SKILL_FRONTMATTER_KEYS, SKILL_SECTIONS, VENDOR_LEAKAGE } from "./tower-role-assets.contract.mjs"

const repoRoot = resolve(import.meta.dir, "../..")
const roots = []
const ASSET_PATHS = Object.keys(ASSET_CONTRACTS).sort()
const PROFILE_PATHS = ASSET_PATHS.filter((path) => ASSET_CONTRACTS[path].kind === "profile")
const SKILL_PATHS = ASSET_PATHS.filter((path) => ASSET_CONTRACTS[path].kind === "skill")

const fail = (code, detail = "") => {
  throw new Error(`${code}${detail ? `: ${detail}` : ""}`)
}

const assertPlainMapping = (value) => {
  if (value === null || Array.isArray(value) || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    fail("CT_TOWER_ROLE_ASSET_FRONTMATTER_INVALID")
  }
}

const readAsset = (root, path) => {
  let current = root
  for (const segment of path.split("/")) {
    current = join(current, segment)
    if (lstatSync(current).isSymbolicLink()) fail("CT_TOWER_ROLE_ASSET_SYMLINK", path)
  }
  return Bun.file(current).text()
}

const validateAssets = async (root) => {
  const parents = Map.groupBy(ASSET_PATHS, dirname)
  const inventory = []
  for (const [parent, paths] of parents) {
    try {
      inventory.push(...readdirSync(join(root, parent)).map((name) => `${parent}/${name}`))
    } catch {}
    const actual = inventory.filter((path) => dirname(path) === parent)
    const missing = paths.filter((path) => !actual.includes(path))
    const extra = actual.filter((path) => !paths.includes(path))
    if (missing.length || extra.length) fail("CT_TOWER_ROLE_ASSET_MANIFEST_DRIFT", JSON.stringify({ missing, extra }))
  }

  for (const path of ASSET_PATHS) {
    const source = await readAsset(root, path)
    if (VENDOR_LEAKAGE.test(source)) fail("CT_TOWER_ROLE_ASSET_VENDOR_LEAKAGE", path)
    if (GENERIC_COPY.test(source)) fail("CT_TOWER_ROLE_ASSET_GENERIC_COPY", path)
    const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*?)\n?$/)
    if (!match) fail("CT_TOWER_ROLE_ASSET_FRONTMATTER_INVALID", path)
    const expected = ASSET_CONTRACTS[path]
    let frontmatter
    try {
      frontmatter = parse(match[1])
      assertPlainMapping(frontmatter)
    } catch (error) {
      if (error.message.startsWith("CT_")) throw error
      fail("CT_TOWER_ROLE_ASSET_FRONTMATTER_INVALID", path)
    }

    if (expected.kind === "profile") {
      assertPlainMapping(frontmatter.capabilities)
      if (JSON.stringify(Object.keys(frontmatter)) !== JSON.stringify(PROFILE_FRONTMATTER_KEYS)
        || typeof frontmatter.name !== "string"
        || typeof frontmatter.role !== "string"
        || typeof frontmatter.permanent !== "boolean"
        || !(typeof frontmatter.skill === "string" || frontmatter.skill === null)
        || JSON.stringify(Object.keys(frontmatter.capabilities)) !== JSON.stringify(["required", "omitted"])
        || !Array.isArray(frontmatter.capabilities.required)
        || !Array.isArray(frontmatter.capabilities.omitted)
        || !frontmatter.capabilities.required.every((item) => typeof item === "string")
        || !frontmatter.capabilities.omitted.every((item) => typeof item === "string")) {
        fail("CT_TOWER_ROLE_ASSET_FRONTMATTER_INVALID", path)
      }
      const { capabilities, ...identity } = frontmatter
      const { capabilities: expectedCapabilities, ...expectedIdentity } = expected.frontmatter
      if (JSON.stringify(identity) !== JSON.stringify(expectedIdentity) || match[2] !== expected.body) fail("CT_TOWER_ROLE_ASSET_PROFILE_DRIFT", path)
      if (JSON.stringify(capabilities) !== JSON.stringify(expectedCapabilities)) fail("CT_TOWER_ROLE_ASSET_CAPABILITY_DRIFT", path)
      continue
    }

    assertPlainMapping(frontmatter.metadata)
    const rawStyle = `name: ${expected.frontmatter.name}\ndescription: ${JSON.stringify(expected.frontmatter.description)}\nlicense: Apache-2.0\nmetadata:\n  author: gentleman-programming\n  version: ${JSON.stringify(expected.frontmatter.metadata.version)}`
    if (match[1] !== rawStyle
      || JSON.stringify(Object.keys(frontmatter)) !== JSON.stringify(SKILL_FRONTMATTER_KEYS)
      || JSON.stringify(frontmatter) !== JSON.stringify(expected.frontmatter)) {
      fail("CT_TOWER_ROLE_ASSET_FRONTMATTER_INVALID", path)
    }
    const headings = [...match[2].matchAll(/^## (.+)$/gm)].map((heading) => heading[1])
    if (JSON.stringify(headings) !== JSON.stringify(SKILL_SECTIONS)) fail("CT_TOWER_ROLE_ASSET_PROFILE_DRIFT", path)
    const references = [...match[2].matchAll(/^- `([^`]+)`$/gm)].map((reference) => reference[1])
    if (JSON.stringify(references) !== JSON.stringify(expected.references)
      || expected.references.some((reference) => !resolve(dirname(join(root, path)), reference).startsWith(root))) {
      fail("CT_TOWER_ROLE_ASSET_REFERENCE_DRIFT", path)
    }
    const tokens = match[2].trim().split(/\s+/).length
    if (tokens < 180 || tokens > 500 || !expected.markers.every((marker) => marker.test(match[2]))) {
      fail("CT_TOWER_ROLE_ASSET_PROFILE_DRIFT", path)
    }
  }
}

const renderProfile = ({ frontmatter, body }) => `---\n${Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n${body}\n`
const renderSkill = (contract) => {
  let fixtureBody = contract.fixtureText
  const filler = " Preserve this explicit role contract with observable evidence and fail-closed behavior."
  while (fixtureBody.trim().split(/\s+/).length < 180) fixtureBody += filler
  return `---\nname: ${contract.frontmatter.name}\ndescription: ${JSON.stringify(contract.frontmatter.description)}\nlicense: Apache-2.0\nmetadata:\n  author: gentleman-programming\n  version: ${JSON.stringify(contract.frontmatter.metadata.version)}\n---\n${SKILL_SECTIONS.map((section) => `## ${section}\n\n${section === "References" ? contract.references.map((reference) => `- \`${reference}\``).join("\n") : section === "Activation Contract" ? fixtureBody.trim() : "Apply the declared contract."}`).join("\n\n")}\n`
}
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "ct-tower-role-assets-"))
  roots.push(root)
  for (const [path, contract] of Object.entries(ASSET_CONTRACTS)) {
    const target = join(root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, contract.kind === "profile" ? renderProfile(contract) : renderSkill(contract))
  }
  return root
}
const mutate = (root, path, mutation) => {
  const contract = structuredClone(ASSET_CONTRACTS[path])
  mutation(contract)
  writeFileSync(join(root, path), contract.kind === "profile" ? renderProfile(contract) : renderSkill(contract))
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

describe("Tower role asset author-time contracts", () => {
  test("keeps exactly the six canonical Tower role assets", async () => {
    await validateAssets(repoRoot)
  })

  test("resolves the delivery policy reference from its product source path", () => {
    const skillPath = "product/tower/skills/torre-control-entregas/SKILL.md"
    const reference = ASSET_CONTRACTS[skillPath].references[0]
    const target = resolve(dirname(join(repoRoot, skillPath)), reference)

    expect(target).toBe(join(repoRoot, "AGENTS.md"))
    expect(lstatSync(target).isFile()).toBe(true)
  })

  test("rejects missing or extra profiles and skills", async () => {
    for (const path of [PROFILE_PATHS[0], SKILL_PATHS[0]]) {
      const missingRoot = fixture()
      rmSync(join(missingRoot, path))
      await expect(validateAssets(missingRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_MANIFEST_DRIFT")
    }
    for (const path of ["product/tower/profiles/planner.md", `${dirname(SKILL_PATHS[0])}/extra.md`]) {
      const extraRoot = fixture()
      writeFileSync(join(extraRoot, path), "forbidden\n")
      await expect(validateAssets(extraRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_MANIFEST_DRIFT")
    }
  })

  test("rejects profile and skill frontmatter or section drift", async () => {
    const identityRoot = fixture()
    mutate(identityRoot, PROFILE_PATHS[1], (contract) => { contract.frontmatter.role = "implementer" })
    await expect(validateAssets(identityRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_PROFILE_DRIFT")

    const capabilityRoot = fixture()
    mutate(capabilityRoot, PROFILE_PATHS[2], (contract) => { contract.frontmatter.capabilities.required = ["write"] })
    await expect(validateAssets(capabilityRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_CAPABILITY_DRIFT")

    const nameRoot = fixture()
    mutate(nameRoot, SKILL_PATHS[0], (contract) => { contract.frontmatter.name = "wrong-skill" })
    await expect(validateAssets(nameRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_FRONTMATTER_INVALID")

    const frontmatterRoot = fixture()
    mutate(frontmatterRoot, SKILL_PATHS[1], (contract) => { contract.frontmatter.description += " Wrong." })
    await expect(validateAssets(frontmatterRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_FRONTMATTER_INVALID")

    const sectionRoot = fixture()
    const skillPath = SKILL_PATHS[1]
    const source = await readAsset(sectionRoot, skillPath)
    writeFileSync(join(sectionRoot, skillPath), source.replace("## Activation Contract", "## Temporary").replace("## Hard Rules", "## Activation Contract").replace("## Temporary", "## Hard Rules"))
    await expect(validateAssets(sectionRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_PROFILE_DRIFT")

    const overBudgetRoot = fixture()
    mutate(overBudgetRoot, SKILL_PATHS[0], (contract) => { contract.fixtureText += " role".repeat(501) })
    await expect(validateAssets(overBudgetRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_PROFILE_DRIFT")
  })

  test("rejects noncanonical references, copied generic content, vendor leakage, and symlinks", async () => {
    for (const reference of ["../outside.md", "https://example.com/main.md"]) {
      const referenceRoot = fixture()
      mutate(referenceRoot, SKILL_PATHS[0], (contract) => { contract.references = [reference] })
      await expect(validateAssets(referenceRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_REFERENCE_DRIFT")
    }

    const genericRoot = fixture()
    mutate(genericRoot, SKILL_PATHS[1], (contract) => { contract.fixtureText += " Strict TDD" })
    await expect(validateAssets(genericRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_GENERIC_COPY")

    const leakageRoot = fixture()
    mutate(leakageRoot, SKILL_PATHS[0], (contract) => { contract.fixtureText += " Claude" })
    await expect(validateAssets(leakageRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_VENDOR_LEAKAGE")

    const symlinkRoot = fixture()
    rmSync(join(symlinkRoot, SKILL_PATHS[1]))
    symlinkSync(join(symlinkRoot, SKILL_PATHS[0]), join(symlinkRoot, SKILL_PATHS[1]))
    await expect(validateAssets(symlinkRoot)).rejects.toThrow("CT_TOWER_ROLE_ASSET_SYMLINK")
  })
})
