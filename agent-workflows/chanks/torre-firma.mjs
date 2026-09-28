// Visible identity only. This is not an admission decision or evidence of completion.
const notice = (tool, subcommand = "") => `🗼 Torre · ${tool}${subcommand ? ` ${subcommand}` : ""}`

const RADAR_COMMANDS = new Set(["help", "check", "archivar", "status", "sesion", "etapa", "faltan", "roadmap", "zonas", "render"])
const JORNADA_FLAGS = new Set(["--sin-fetch", "--ejecutar", "--reciclar", "--nueva-rama", "--borrar-rama-vieja", "--mergear-pr"])

// Only a single direct shell command can be classified from tool-call input. A compound,
// pipeline, substitution, or comment needs an actual-child witness that this adapter lacks.
function directWords(command) {
  if (typeof command !== "string") return null
  const tokens = []
  let word = ""
  let quote = null
  let started = false
  const flush = () => {
    if (started) tokens.push(word)
    word = ""
    started = false
  }
  for (let i = 0; i < command.length; i++) {
    const char = command[i]
    if (char === "\\" && i + 1 < command.length && quote !== "'") {
      word += command[++i]
      started = true
    } else if (quote) {
      if (char === quote) quote = null
      else word += char
    } else if (char === "'" || char === '"') {
      quote = char
      started = true
    } else if (char === "#" && !started) {
      return null
    } else if (/[;&|<>(){}\n\r`]/.test(char) || (char === "$" && command[i + 1] === "(")) {
      return null
    } else if (/\s/.test(char)) {
      flush()
    } else {
      word += char
      started = true
    }
  }
  if (quote) return null
  flush()
  return tokens
}

// One structured witness is shared by the live request renderer and result-bound stage logic.
// A stage ID is admitted only when it is the explicit argument of an isolated direct call.
export function radarDirecto(command) {
  const tokens = directWords(command?.trim())
  if (!tokens?.length || tokens[0].split("/").at(-1) !== "radar" || !RADAR_COMMANDS.has(tokens[1])) return null
  const rest = tokens.slice(3)
  const sessionId = tokens[1] === "etapa" && /^S[1-9]\d*(?:\.\d+)?$/.test(tokens[2] ?? "") &&
    (rest.length === 0 || (rest.length === 2 && rest[0] === "-C" && !!rest[1])) ? tokens[2] : null
  return { subcommand: tokens[1], sessionId }
}

function fromCommand(command) {
  const radar = radarDirecto(command)
  if (radar) return notice("radar", radar.subcommand)
  const tokens = directWords(command?.trim())
  if (!tokens?.length) return null
  const executable = tokens[0]
  if (executable.split("/").at(-1) === "jornada.sh" && executable.includes("/") &&
      (tokens.length === 1 || JORNADA_FLAGS.has(tokens[1]))) return notice("jornada.sh", tokens[1])
  return null
}

/** Return only the notice belonging to a directly witnessed Tower tool call; never gate it. */
export function firmaHerramienta(event) {
  const { toolName, input } = event ?? {}
  if (toolName === "bash") return fromCommand(input?.command)
  if (toolName !== "write" && toolName !== "edit") return null
  const path = input?.path
  if (typeof path !== "string" || !/(?:^|\/)openspec\/plan\.yaml$/.test(path)) return null
  return notice("plan.yaml", toolName)
}
