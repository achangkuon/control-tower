const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;")

const assertString = (value, field) => {
  if (typeof value !== "string") throw new TypeError(`Dashboard view field ${field} must be a string`)
}

const validatePopulatedView = (view) => {
  if (!Array.isArray(view.projects) || view.projects.length === 0)
    throw new TypeError("A populated dashboard view requires projects")
  for (const project of view.projects) {
    assertString(project?.projectName, "projectName")
    if (!Array.isArray(project.agents) || project.agents.length === 0)
      throw new TypeError("A dashboard project requires agents")
    for (const agent of project.agents) {
      for (const field of ["agentName", "state", "taskTitle", "branchName"])
        assertString(agent?.[field], field)
    }
  }
}

const renderAgent = (agent) => `    <li class="agent-record">
      <dl>
        <div><dt>Agent</dt><dd>${escapeHtml(agent.agentName)}</dd></div>
        <div><dt>State</dt><dd><span class="state-marker" aria-hidden="true"></span><span class="state-text">${escapeHtml(agent.state)}</span></dd></div>
        <div><dt>Task</dt><dd>${escapeHtml(agent.taskTitle)}</dd></div>
        <div><dt>Branch</dt><dd>${escapeHtml(agent.branchName)}</dd></div>
      </dl>
    </li>`

export const renderDashboardContent = (view) => {
  if (view?.kind === "empty")
    return `<section class="dashboard-empty" data-view="empty"><h2>No observations</h2><p>No dashboard records are available.</p></section>`
  if (view?.kind !== "populated") throw new TypeError("Unknown dashboard view")

  validatePopulatedView(view)
  const projects = view.projects.map((project, index) => {
    const headingId = `project-${index}`
    return `<section class="project-group" aria-labelledby="${headingId}">
  <h2 id="${headingId}">${escapeHtml(project.projectName)}</h2>
  <ul class="agent-list">
${project.agents.map(renderAgent).join("\n")}
  </ul>
</section>`
  }).join("\n")

  return `<div class="dashboard-content" data-view="populated">\n${projects}\n</div>`
}
