import { describe, expect, test } from "bun:test"

import { buildDashboardViewModel } from "../../dashboard/view-model.mjs"

const candidate = (overrides = {}) => ({
  projectName: "Control Tower",
  agentName: "architect",
  state: "reviewing",
  taskTitle: "Protect the projection boundary",
  branchName: "feature/dashboard",
  ...overrides,
})

describe("five-field dashboard view model", () => {
  test("groups agents by project into fresh allowlisted objects", () => {
    const first = candidate()
    const second = candidate({ agentName: "tester", state: "ready" })

    const view = buildDashboardViewModel([first, second])

    expect(view).toEqual({
      kind: "populated",
      projects: [{
        projectName: "Control Tower",
        agents: [
          { agentName: "architect", state: "reviewing", taskTitle: "Protect the projection boundary", branchName: "feature/dashboard" },
          { agentName: "tester", state: "ready", taskTitle: "Protect the projection boundary", branchName: "feature/dashboard" },
        ],
      }],
    })
    expect(view.projects[0]).not.toBe(first)
    expect(view.projects[0].agents[0]).not.toBe(first)
  })

  test("drops prohibited and unexpected source properties", () => {
    const source = candidate({
      filePath: "/secret/path", lineCount: 42, testResult: "PROHIBITED_TEST",
      sourceCode: "PROHIBITED_SOURCE", diff: "PROHIBITED_DIFF", secret: "PROHIBITED_SECRET",
      id: "PROHIBITED_ID", timestamp: "PROHIBITED_TIME", nested: { token: "PROHIBITED_NESTED" },
    })

    const serialized = JSON.stringify(buildDashboardViewModel([source]))

    for (const sentinel of ["/secret/path", "PROHIBITED_TEST", "PROHIBITED_SOURCE", "PROHIBITED_DIFF", "PROHIBITED_SECRET", "PROHIBITED_ID", "PROHIBITED_TIME", "PROHIBITED_NESTED"])
      expect(serialized).not.toContain(sentinel)
    expect(Object.keys(source)).toHaveLength(14)
  })

  test("returns an explicit empty view and rejects invalid candidates as a whole", () => {
    expect(buildDashboardViewModel([])).toEqual({ kind: "empty" })

    for (const invalid of [
      candidate({ agentName: 7 }),
      candidate({ taskTitle: undefined }),
      { projectName: "Control Tower", agentName: "architect", state: "ready", taskTitle: "Missing branch" },
    ]) {
      expect(() => buildDashboardViewModel([candidate(), invalid])).toThrow(TypeError)
    }
  })

  test("groups repeated projects without adjacency and ignores inherited extras", () => {
    const inherited = Object.assign(Object.create({ secret: "INHERITED_SECRET" }),
      candidate({ projectName: "Control Tower", agentName: "second" }))
    const view = buildDashboardViewModel([
      candidate({ projectName: "Control Tower", agentName: "first" }),
      candidate({ projectName: "Website", agentName: "designer" }),
      inherited,
    ])

    const controlTower = view.projects.find(({ projectName }) => projectName === "Control Tower")
    const website = view.projects.find(({ projectName }) => projectName === "Website")
    expect(controlTower.agents.map(({ agentName }) => agentName)).toEqual(["first", "second"])
    expect(website.agents.map(({ agentName }) => agentName)).toEqual(["designer"])
    expect(JSON.stringify(view)).not.toContain("INHERITED_SECRET")
  })
})
