const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

const readCandidate = (candidate) => {
  if (candidate === null || typeof candidate !== "object")
    throw new TypeError("Dashboard candidates must be objects")
  for (const field of ["projectName", "agentName", "state", "taskTitle", "branchName"])
    if (!hasOwn(candidate, field)) throw new TypeError(`Dashboard candidate is missing ${field}`)

  const { projectName, agentName, state, taskTitle, branchName } = candidate
  for (const [field, value] of Object.entries({ projectName, agentName, state, taskTitle, branchName }))
    if (typeof value !== "string") throw new TypeError(`Dashboard candidate field ${field} must be a string`)

  return { projectName, agentName, state, taskTitle, branchName }
}

export const buildDashboardViewModel = (candidates) => {
  if (!Array.isArray(candidates))
    throw new TypeError("Dashboard candidates must be an array")
  if (candidates.length === 0) return { kind: "empty" }

  const projects = new Map()
  for (const candidate of candidates) {
    const { projectName, agentName, state, taskTitle, branchName } = readCandidate(candidate)
    let project = projects.get(projectName)
    if (!project) {
      project = { projectName, agents: [] }
      projects.set(projectName, project)
    }
    project.agents.push({ agentName, state, taskTitle, branchName })
  }

  return { kind: "populated", projects: [...projects.values()] }
}
