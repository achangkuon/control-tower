import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export const CONFIG_FILE = "radiografia.json"

// Defaults describe a plain openspec project with no installable payload. Control Tower
// is the only project that ships one, so payload measurement is opt-in rather than
// assumed — otherwise every other project would report a meaningless 0% shipped.
const DEFAULTS = Object.freeze({
  title: "Radiografía del producto",
  masterIndex: "openspec/plans/master-index.md",
  judgment: "openspec/plans/radiografia.md",
  out: "radiografia.html",
  cache: ".radiografia-cache.json",
  windowHours: 24,
  code: Object.freeze({
    extensions: [".mjs", ".js"],
    exclude: ["test", "tests", "node_modules", "openspec", "scripts", "docs"],
    testDirs: ["test", "tests"],
    docDirs: ["openspec"],
    extraProductFiles: [],
  }),
  tests: null,
  payload: null,
})

const merge = (base, override) => {
  if (!override || typeof override !== "object") return base
  const out = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === null) { out[key] = null; continue }
    out[key] = base[key] && typeof base[key] === "object" && !Array.isArray(base[key]) && typeof value === "object" && !Array.isArray(value)
      ? merge(base[key], value)
      : value
  }
  return out
}

export function loadConfig(root) {
  const path = join(root, CONFIG_FILE)
  if (!existsSync(path)) return Object.freeze(merge(DEFAULTS, {}))
  let parsed
  try { parsed = JSON.parse(readFileSync(path, "utf8")) } catch (error) {
    throw Object.assign(new Error(`CT_RADIOGRAFIA_BAD_CONFIG: ${CONFIG_FILE} is not valid JSON — ${error.message}`), { code: "CT_RADIOGRAFIA_BAD_CONFIG" })
  }
  return Object.freeze(merge(DEFAULTS, parsed))
}

export const defaults = () => merge(DEFAULTS, {})
