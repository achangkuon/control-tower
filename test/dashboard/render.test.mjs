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
})
