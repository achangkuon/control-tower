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

function fromCommand(command) {
  const tokens = directWords(command?.trim())
  if (!tokens?.length) return null
  const executable = tokens[0]
  const name = executable.split("/").at(-1)
  if (name === "radar" && RADAR_COMMANDS.has(tokens[1])) return notice(name, tokens[1])
  if (name === "jornada.sh" && executable.includes("/") &&
      (tokens.length === 1 || JORNADA_FLAGS.has(tokens[1]))) return notice(name, tokens[1])
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
