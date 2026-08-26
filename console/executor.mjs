const successful = (validation) => validation?.ok === true && Object.isFrozen(validation)
const result = (command, value) => Object.freeze({ ok: true, command, result: value })
const directive = (command) => Object.freeze({
  to: command.target_agent,
  text: JSON.stringify(command),
})

export const createConsoleExecutor = ({ send, readStatus } = {}) => {
  if (typeof send !== "function" || typeof readStatus !== "function") {
    throw new TypeError("Console executor ports are required")
  }

  return Object.freeze({
    execute(validation) {
      if (!successful(validation)) return validation
      const { command } = validation
      if (!command || !Object.isFrozen(command)) throw new TypeError("Validated command is required")
      if (command.verb === "CV_STATUS") return result(command, readStatus())
      if (typeof command.target_agent !== "string" || command.target_agent.length === 0) {
        throw new TypeError("Validated target agent is required")
      }
      return result(command, send(directive(command)))
    },
  })
}
