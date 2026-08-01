import { lstatSync, realpathSync } from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const invalid = (message, cause) => fail("CT_SUPPORT_ROADMAP_INVALID", message, cause)
const within = (root, path) => path === root || (!relative(root, path).startsWith(`..${sep}`) && relative(root, path) !== ".." && !isAbsolute(relative(root, path)))
const regular = (path) => { const value = lstatSync(path); return value.isFile() && !value.isSymbolicLink() }
const noSymlinkComponents = (root, path) => {
  let cursor = root
  for (const part of relative(root, path).split(sep)) {
    if (!part) continue
    cursor = join(cursor, part)
    if (lstatSync(cursor).isSymbolicLink()) return false
  }
  return true
}
const safeFile = (root, path, expectedName) => {
  if (!within(root, path) || basename(path) !== expectedName || !noSymlinkComponents(root, path) || !regular(path)) invalid("Unsafe Support source path")
  const canonical = realpathSync(path)
  if (canonical !== path || !within(root, canonical)) invalid("Ambiguous Support source path")
  return canonical
}
const relativeSource = (root, value, expectedName) => {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || isAbsolute(value)) invalid("Invalid relative Support source")
  return safeFile(root, resolve(root, value), expectedName)
}
const roadmapRows = (body) => {
  const lines = body.split(/\r?\n/), tables = []
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!/^\|.*\|$/.test(lines[index]) || !/^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[index + 1])) continue
    const rows = []
    for (let row = index + 2; row < lines.length && /^\|.*\|$/.test(lines[row]); row += 1) rows.push(lines[row])
    tables.push({ header: lines[index], rows }); index += rows.length + 1
  }
  const candidates = tables.filter(({ header }) => header.split("|").slice(1, -1).map((cell) => cell.trim()).includes("Ref"))
  if (candidates.length !== 1) invalid("Roadmap Ref table is ambiguous")
  const [{ header, rows }] = candidates, headers = header.split("|").slice(1, -1).map((cell) => cell.trim())
  const refIndex = headers.indexOf("Ref")
  if (refIndex < 0 || headers.filter((header) => header === "Ref").length !== 1) invalid("Roadmap Ref column is ambiguous")
  return { refIndex, rows: rows.filter((line) => /^\|\s*P\d+\s*\|/.test(line)) }
}
const captureText = (ports, path, label) => {
  let body
  try { body = ports.readText(path) } catch (error) { invalid(`${label} is unreadable`, error) }
  if (typeof body !== "string") invalid(`${label} is unreadable`)
  return body
}

export const resolveSupportManifest = (entry, ports) => {
  try {
    if (!entry || typeof entry.canonical_root !== "string" || !isAbsolute(entry.canonical_root)) invalid("Invalid canonical root")
    const rootStats = lstatSync(entry.canonical_root)
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) invalid("Invalid canonical root")
    const root = realpathSync(entry.canonical_root)
    if (root !== entry.canonical_root) invalid("Ambiguous canonical root")
    const roadmap = relativeSource(root, entry.roadmap_path, "master-index.md")
    const parent = dirname(roadmap), parentStats = lstatSync(parent)
    if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) invalid("Invalid roadmap parent")
    const manifestPath = relativeSource(root, entry.manifest_path, basename(entry.manifest_path ?? ""))
    const documents = new Map([[manifestPath, captureText(ports, manifestPath, "Manifest")]])
    const body = captureText(ports, roadmap, "Roadmap")
    documents.set(roadmap, body)
    const { refIndex, rows } = roadmapRows(body)
    if (rows.length === 0) invalid("Roadmap Ref table is invalid")
    const seen = new Set(), plans = []
    for (const row of rows) {
      const cells = row.split("|").slice(1, -1).map((cell) => cell.trim())
      const id = cells[0]?.match(/^P(\d+)$/)?.[1], number = Number(id)
      if (!id || !Number.isSafeInteger(number) || seen.has(number)) invalid("Duplicate or ambiguous Plan row")
      seen.add(number)
      const links = [...(cells[refIndex] ?? "").matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
        .map((match) => ({ text: match[1], target: match[2] })).filter(({ text }) => text === "STATUS")
      if (links.length !== 1) invalid("Plan row requires one exact STATUS Ref")
      const target = links[0].target
      if (target !== `plan-${number}/STATUS.md` || isAbsolute(target) || target.includes("\0")) invalid("STATUS Ref does not match Plan ID")
      const path = safeFile(root, resolve(parent, target), "STATUS.md")
      documents.set(path, captureText(ports, path, "STATUS"))
      plans.push({ id: `P${number}`, number, path })
    }
    plans.sort((a, b) => a.number - b.number)
    const git = ports.inspectGit(root)
    const dbPath = safeDatabasePath(root, entry.git_common_dir)
    return Object.freeze({ project_id: entry.project_id, registry_entry_revision: entry.registry_entry_revision,
      root, manifest_path: manifestPath, roadmap_path: roadmap, plans: Object.freeze(plans), documents,
      git: Object.freeze({ ...git }), db_path: dbPath })
  } catch (error) {
    if (error?.code?.startsWith("CT_SUPPORT_")) throw error
    invalid("Support manifest resolution failed", error)
  }
}

const safeDatabasePath = (root, gitCommonDir) => {
  if (typeof gitCommonDir !== "string" || !isAbsolute(gitCommonDir) || !within(root, gitCommonDir)) invalid("Invalid Git common directory")
  const gitStats = lstatSync(gitCommonDir)
  if (!gitStats.isDirectory() || gitStats.isSymbolicLink() || realpathSync(gitCommonDir) !== gitCommonDir) invalid("Unsafe Git common directory")
  const path = join(gitCommonDir, "control-tower", "tower.db")
  if (!within(root, path)) invalid("Database escapes project")
  return path
}
