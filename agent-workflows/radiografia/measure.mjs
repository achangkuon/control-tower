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

// The wire contract with Radar. An unrecognised schema stops the report: guessing
// at fields is how a reader starts disagreeing with the plan it claims to show.
export const SNAPSHOT_SCHEMA = "radar.snapshot/v1"

// Progress is computed once, by the tool that owns the plan vocabulary, and read
// here. The engine deliberately cannot derive a state, close a Sesión, or total a
// Zona — every number below arrives already decided.
export function readPlanSnapshot(root, config) {
  const plan = join(root, config.plan)
  if (!existsSync(plan)) fail("CT_RADIOGRAFIA_NO_PLAN", `missing ${config.plan}`)

  const [program, ...leading] = config.radar.command
  let raw
  try {
    raw = execFileSync(program, [...leading, "status", "--json", "-f", plan, "-C", root], {
      cwd: join(root, config.radar.cwd ?? "."),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (error) {
    const detail = (error.stderr || error.message || "").toString().trim()
    fail("CT_RADIOGRAFIA_RADAR_FAILED", `${config.radar.command.join(" ")} status --json — ${detail}`)
  }

  let snapshot
  try { snapshot = JSON.parse(raw) } catch (error) {
    fail("CT_RADIOGRAFIA_RADAR_BAD_JSON", `${config.radar.command.join(" ")} did not emit JSON — ${error.message}`)
  }
  if (snapshot?.schema !== SNAPSHOT_SCHEMA) {
    fail("CT_RADIOGRAFIA_RADAR_SCHEMA", `expected ${SNAPSHOT_SCHEMA}, got ${snapshot?.schema ?? "no schema"}`)
  }
  return Object.freeze(snapshot)
}

// A Zona with nothing enumerated has no auditable percentage: 0% reads as "not
// started" and 100% as "done", and neither is a claim the plan makes. Surfacing
// the absence keeps planning debt visible instead of dressed as progress.
const zonaRow = (zona) => Object.freeze({
  id: zona.id,
  nombre: zona.nombre,
  cerradas: zona.total ? zona.cerradas : null,
  total: zona.total || null,
  pct: zona.total ? Math.round((zona.cerradas / zona.total) * 100) : null,
  unmeasured_reason: zona.total ? null : "sin Sesiones enumeradas",
  cola: Object.freeze((zona.cola ?? []).map((entry) => Object.freeze({ ...entry }))),
})

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
  const snapshot = readPlanSnapshot(root, config)

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

  const zonas = Object.freeze(snapshot.zonas.map(zonaRow))
  // A Zona with no enumerated Sesión can never be closed, so counting it in the
  // denominator would depress the figure forever. It is unmeasured, not open.
  const medidas = zonas.filter((zona) => zona.total !== null)

  return Object.freeze({
    measured_at: new Date().toISOString(),
    source: Object.freeze({
      project: config.project ?? basename(root),
      title: config.title,
      plan: config.plan,
      producto: snapshot.producto,
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
    zonas,
    asientos: Object.freeze([...snapshot.asientos]),
    territorio_pendiente: snapshot.territorio_pendiente,
    global: Object.freeze({
      zonas_cerradas: medidas.filter((zona) => zona.cerradas === zona.total).length,
      zonas_total: medidas.length,
      sesiones_cerradas: snapshot.avance.cerradas,
      sesiones_total: snapshot.avance.total,
    }),
    tests: readTestCache(root, git_.head, config.cache),
  })
}
