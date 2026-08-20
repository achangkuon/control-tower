import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, extname, join, relative, sep } from "node:path"

const fail = (code, detail) => { throw Object.assign(new Error(`${code}: ${detail}`), { code }) }

const git = (root, ...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trimEnd()

const isCode = (config, rel) => config.code.extensions.includes(extname(rel))

// The inventory is what git tracks. An untracked scratch file is not the product, and a
// vendored dot-directory (.opencode, .codegraph) is tool configuration that ships with
// nothing. Walking the disk instead counted 953 files where the product has 70.
const trackedFiles = (root) => git(root, "ls-files", "-z").split("\0").filter(Boolean)
const topSegment = (rel) => rel.split(sep)[0]
const isProductPath = (config, rel) =>
  !topSegment(rel).startsWith(".") && !config.code.exclude.includes(topSegment(rel))

const lineCount = (path) => {
  const body = readFileSync(path, "utf8")
  if (body === "") return 0
  return body.endsWith("\n") ? body.split("\n").length - 1 : body.split("\n").length
}

const listUnder = (tracked, dirs, keep) =>
  tracked.filter((rel) => dirs.includes(topSegment(rel)) && keep(rel))

export function parsePlanTable(markdown) {
  const rows = markdown.split("\n").filter((line) => /^\|\s*P\d+\s*\|/.test(line))
  if (!rows.length) fail("CT_RADIOGRAFIA_NO_PLAN_TABLE", "master-index has no `| P<n> |` rows")
  return Object.freeze(rows.map((row) => {
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim())
    const [id, name, state, progress, , owner, remaining] = cells
    const fraction = progress.match(/(\d+)%\s*\((\d+)\s*\/\s*(\d+)\s*S\)/)
    // The standard derives the percentage from `Sesiones cerradas / Sesiones enumeradas`.
    // A bare `100%` has no denominator to audit, so it is unmeasured, not complete.
    const reason = fraction
      ? null
      : (progress.match(/\((.+)\)/)?.[1] ?? (/%/.test(progress) ? `${progress} sin fracción de Sesiones` : progress))
    // Some projects append a note to the state cell after an em dash; the state is the
    // vocabulary word, and the note is kept rather than mangled into it.
    const [stateWord, ...noteParts] = state.split(/\s+—\s+/)
    return Object.freeze({
      id,
      name,
      state: stateWord.replace(/[^\p{L}\s]/gu, "").trim(),
      state_note: noteParts.length ? noteParts.join(" — ").trim() : null,
      pct: fraction ? Number(fraction[1]) : null,
      closed: fraction ? Number(fraction[2]) : null,
      total: fraction ? Number(fraction[3]) : null,
      unmeasured_reason: reason,
      owner: owner ?? "",
      remaining: remaining ?? "",
    })
  }))
}

export function parseQueue(markdown) {
  const section = markdown.split(/^##\s.*Cola de ejecución.*$/m)[1]
  if (!section) return []
  const line = section.split("\n").find((candidate) => /`#\d+\s+S[\d.]+`/.test(candidate))
  if (!line) return []
  return [...line.matchAll(/`#(\d+)\s+(S[\d.]+)`/g)].map(([, pos, session]) => ({ pos: Number(pos), session }))
}

export function parseGlobalProgress(markdown) {
  // Written as `**Avance global**:` here and `**Avance global:**` in three other projects.
  const match = markdown.match(/Avance global:?\*{0,2}:?\s*(\d+)\/(\d+)\s*Planes cerrados[^·]*·[^:]*:\s*(\d+)\/(\d+)/)
  if (!match) fail("CT_RADIOGRAFIA_NO_GLOBAL_PROGRESS", "master-index has no `Avance global` line")
  return { plans_closed: Number(match[1]), plans_total: Number(match[2]), sessions_closed: Number(match[3]), sessions_total: Number(match[4]) }
}

export function readTestCache(root, head, cacheFile = ".radiografia-cache.json") {
  const path = join(root, cacheFile)
  if (!existsSync(path)) return null
  let cached
  try { cached = JSON.parse(readFileSync(path, "utf8")) } catch { return null }
  if (!cached || typeof cached !== "object" || typeof cached.pass !== "number") return null
  return Object.freeze({
    pass: cached.pass,
    fail: cached.fail ?? 0,
    expectations: cached.expectations ?? null,
    files: cached.files ?? null,
    measured_at: cached.measured_at ?? null,
    recorded_head: cached.head ?? null,
    at_head: cached.head === head,
  })
}

// Only Control Tower ships an installable payload; everywhere else this returns null so
// the shipped-share instruments are omitted rather than reported as a meaningless zero.
const payloadOf = (root, config) => {
  if (!config.payload) return null
  const manifest = join(root, config.payload.manifest)
  if (!existsSync(manifest)) return null
  const symbol = config.payload.symbol ?? "RUNTIME_PAYLOAD_FILES"
  const block = readFileSync(manifest, "utf8").match(new RegExp(`${symbol}\\s*=\\s*\\[([\\s\\S]*?)\\]`))
  if (!block) return null
  return [...block[1].matchAll(/"([^"]+)"/g)].map(([, path]) => path)
}

// Resolved against the importer's own directory: matching on file name alone would count a
// decoy in another directory as if the payload imported it.
const relativeImportsOf = (root, config, file) => {
  const path = join(root, file)
  if (!existsSync(path) || !isCode(config, file)) return []
  const body = readFileSync(path, "utf8")
  const specs = [...body.matchAll(/from\s+"(\.[^"]+)"/g), ...body.matchAll(/import\("(\.[^"]+)"\)/g)]
  return specs.map(([, spec]) => relative(root, join(root, dirname(file), spec)))
}

// The report and its suite cache are build artifacts. They are gitignored, but the check
// excludes them explicitly too: otherwise writing the report would make the next render
// call the tree dirty because of its own output.
export const generatedPaths = (config) => Object.freeze([config.out, config.cache])

// A judgment does not go stale because it was itself committed. Drift counts only commits
// that changed something other than the judgment file — otherwise the warning fires on
// every update and stops being read.
const measureJudgment = (root, sha, judgmentPath) => {
  if (!sha) return null
  let known = true
  try { execFileSync("git", ["-C", root, "cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" }) } catch { known = false }
  if (!known) return Object.freeze({ known: false, drifted: true, commits: null })
  const since = git(root, "rev-list", `${sha}..HEAD`, "--", ".", `:(exclude)${judgmentPath}`)
  const commits = since === "" ? 0 : since.split("\n").length
  return Object.freeze({ known: true, drifted: commits > 0, commits })
}

const measureGit = (root, windowHours, judgmentSha, judgmentPath, generated) => {
  const head = git(root, "rev-parse", "HEAD")
  const dirty = git(root, "status", "--porcelain").split("\n").filter(Boolean)
    .filter((entry) => !generated.includes(entry.slice(3).trim()))
  const clean = dirty.length === 0
  const since = new Date(Date.now() - windowHours * 3600_000).toISOString()
  const subjects = git(root, "log", `--since=${since}`, "--format=%s").split("\n").filter(Boolean)
  const docs = subjects.filter((subject) => /^docs\b/.test(subject)).length
  return Object.freeze({
    head,
    short: head.slice(0, 7),
    clean,
    recent: Object.freeze({ docs, code: subjects.length - docs, total: subjects.length, window_hours: windowHours }),
    judgment: measureJudgment(root, judgmentSha, judgmentPath),
  })
}

export function measureRepository(root, { config, judgmentSha = null } = {}) {
  const windowHours = config.windowHours
  const indexPath = join(root, config.masterIndex)
  if (!existsSync(indexPath)) fail("CT_RADIOGRAFIA_NO_MASTER_INDEX", `missing ${config.masterIndex}`)
  const index = readFileSync(indexPath, "utf8")

  const tracked = trackedFiles(root)
  const lines = (paths) => paths.reduce((total, rel) => total + lineCount(join(root, rel)), 0)

  const extras = config.code.extraProductFiles
  const productFiles = tracked.filter((rel) => isProductPath(config, rel) && (isCode(config, rel) || extras.includes(rel)))
  const productLines = lines(productFiles)

  const declared = payloadOf(root, config)
  const payload = declared ? declared.filter((rel) => existsSync(join(root, rel))) : null
  const shipping = payload === null ? null : (() => {
    const shipped = new Set(payload)
    const unshipped = productFiles.filter((rel) => !shipped.has(rel))
    const payloadImports = new Set(payload.flatMap((rel) => relativeImportsOf(root, config, rel)))
    const installedLines = lines(payload)
    return Object.freeze({
      installed_files: payload.length,
      installed_lines: installedLines,
      installed_pct: productLines ? Math.round((installedLines / productLines) * 100) : null,
      unshipped_files: unshipped.length,
      unshipped_imported_by_payload: unshipped.filter((rel) => payloadImports.has(rel)).length,
    })
  })()

  const testFiles = listUnder(tracked, config.code.testDirs, (rel) => isCode(config, rel))
  const docLines = lines(listUnder(tracked, config.code.docDirs, (rel) => rel.endsWith(".md")))

  const git_ = measureGit(root, windowHours, judgmentSha, config.judgment, generatedPaths(config))

  return Object.freeze({
    measured_at: new Date().toISOString(),
    source: Object.freeze({
      project: config.project ?? basename(root),
      title: config.title,
      masterIndex: config.masterIndex,
    }),
    git: git_,
    code: Object.freeze({
      product_files: productFiles.length,
      product_lines: productLines,
      shipping,
      test_files: testFiles.length,
      test_lines: lines(testFiles),
      doc_lines: docLines,
      doc_ratio: productLines ? Number((docLines / productLines).toFixed(2)) : null,
    }),
    plans: parsePlanTable(index),
    queue: Object.freeze(parseQueue(index)),
    global: Object.freeze(parseGlobalProgress(index)),
    tests: readTestCache(root, git_.head, config.cache),
  })
}
