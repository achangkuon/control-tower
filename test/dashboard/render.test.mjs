import { describe, expect, test } from "bun:test"

import { renderDashboardContent } from "../../dashboard/render.mjs"

const populatedView = {
  kind: "populated",
  projects: [{
    projectName: "Control Tower",
    agents: [{
      agentName: "architect",
      state: "reviewing",
      taskTitle: "Protect the projection boundary",
      branchName: "feature/dashboard",
    }],
  }],
}

describe("safe dashboard renderer", () => {
  test("renders semantic project groups and readable five-field records", () => {
    const html = renderDashboardContent(populatedView)

    expect(html).toContain('<section class="project-group"')
    expect(html).toContain("<h2")
    expect(html).toContain("Control Tower")
    for (const label of ["Agent", "State", "Task", "Branch"])
      expect(html).toContain(`<dt>${label}</dt>`)
    for (const value of ["architect", "reviewing", "Protect the projection boundary", "feature/dashboard"])
      expect(html).toContain(value)
    expect(html).toContain('class="state-marker" aria-hidden="true"')
    expect(html).toContain('class="state-text">reviewing</span>')
  })

  test("renders explicit populated and empty views while ignoring structural extras", () => {
    const populated = renderDashboardContent({ ...populatedView, secret: "PROHIBITED_VIEW" })
    const empty = renderDashboardContent({ kind: "empty" })

    expect(populated).toContain('data-view="populated"')
    expect(populated).not.toContain("PROHIBITED_VIEW")
    expect(empty).toContain('data-view="empty"')
    expect(empty).toContain("No dashboard records are available")
  })

  test("escapes every permitted value before creating HTML", () => {
    const dangerous = `<script data-x="'&">alert(1)</script>`
    const html = renderDashboardContent({
      kind: "populated",
      projects: [{
        projectName: dangerous,
        agents: [{ agentName: dangerous, state: dangerous, taskTitle: dangerous, branchName: dangerous }],
      }],
    })

    expect(html).not.toContain("<script")
    expect(html).not.toContain("</script>")
    expect(html.match(/&lt;script data-x=&quot;&#39;&amp;&quot;&gt;/g)).toHaveLength(5)
    expect(html.match(/&lt;\/script&gt;/g)).toHaveLength(5)
  })

  test("renders replacement canonical input with Unicode and long escaped values", () => {
    const longBranch = `feature/${"safe-".repeat(30)}終`
    const html = renderDashboardContent({
      kind: "populated",
      projects: [{
        projectName: "Proyecto & Δ",
        agents: [{
          agentName: "agente <二>", state: "en revisión ✓",
          taskTitle: "Handle ‘quotes’ & replacement input", branchName: longBranch,
        }],
      }],
    })

    expect(html).toContain("Proyecto &amp; Δ")
    expect(html).toContain("agente &lt;二&gt;")
    expect(html).toContain("en revisión ✓")
    expect(html).toContain("Handle ‘quotes’ &amp; replacement input")
    expect(html).toContain(longBranch)
    expect(html).not.toContain("mock")
  })

  test("keeps the semantic five-field hierarchy readable without color alone", () => {
    const html = renderDashboardContent(populatedView)
    const orderedTokens = [
      "Control Tower", "<dt>Agent</dt>", "architect", "<dt>State</dt>",
      "reviewing", "<dt>Task</dt>", "Protect the projection boundary",
      "<dt>Branch</dt>", "feature/dashboard",
    ]
    let previous = -1
    for (const token of orderedTokens) {
      const current = html.indexOf(token)
      expect(current).toBeGreaterThan(previous)
      previous = current
    }

    expect(html).toContain('aria-labelledby="project-0"')
    expect(html).toContain('class="state-marker" aria-hidden="true"')
    expect(html).toContain('class="state-text">reviewing</span>')
    expect(html.match(/<dt>(Agent|State|Task|Branch)<\/dt>/g)).toHaveLength(4)
  })

  test("contains no operational fields, desktop modules, or action controls", () => {
    const html = renderDashboardContent(populatedView)
    for (const prohibited of [
      "Project count", "Timestamp", "File path", "Line count", "Test result",
      "Source code", "Diff", "Secret", "Metrics", "Activity feed", "Search",
      "Navigation rail", "Timeline", "Voice control", "Command", "Approval",
    ]) expect(html).not.toContain(prohibited)
    expect(html).not.toMatch(/<(?:button|form|input|select|textarea|nav)\b/i)
  })

  test("preserves project boundaries and long values across varied states", () => {
    const long = `unbroken-${"x".repeat(180)}`
    const html = renderDashboardContent({ kind: "populated", projects: [
      { projectName: "Alpha", agents: [
        { agentName: "one", state: "ready", taskTitle: long, branchName: long },
        { agentName: "two", state: "blocked", taskTitle: "Second task", branchName: "feature/two" },
      ] },
      { projectName: "Beta", agents: [
        { agentName: "three", state: "reviewing", taskTitle: "Third task", branchName: "feature/three" },
      ] },
    ] })

    expect(html.match(/class="project-group"/g)).toHaveLength(2)
    expect(html.match(/class="agent-record"/g)).toHaveLength(3)
    expect(html.match(/class="state-text"/g)).toHaveLength(3)
    expect(html.match(new RegExp(long, "g"))).toHaveLength(2)
  })
})
