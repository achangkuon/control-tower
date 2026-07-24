import { describe, expect, test } from "bun:test";

const read = (path) => Bun.file(new URL(path, import.meta.url)).text();
const FIELDS = ["agentName", "branchName", "projectName", "state", "taskTitle"];

describe("dashboard source architecture", () => {
  test("fixture source exposes only presentation fields through async load", async () => {
    const { MOCK_DASHBOARD_RECORDS } = await import("../../dashboard/sources/mock-fixtures.mjs");
    const { createMockDashboardSource } = await import("../../dashboard/sources/mock-source.mjs");
    const pending = createMockDashboardSource().load();
    expect(pending).toBeInstanceOf(Promise);
    const records = await pending;
    expect(records).toEqual(MOCK_DASHBOARD_RECORDS);
    expect(records.length).toBeGreaterThan(1);
    for (const record of records) expect(Object.keys(record).sort()).toEqual(FIELDS);
  });

  test("renderer and public asset remain isolated from fixture values and source imports", async () => {
    const { MOCK_DASHBOARD_RECORDS } = await import("../../dashboard/sources/mock-fixtures.mjs");
    const [renderer, asset] = await Promise.all([read("../../dashboard/render.mjs"), read("../../dashboard/public/dashboard.js")]);
    for (const source of [renderer, asset]) {
      expect(source).not.toMatch(/mock-fixtures|mock-source|dashboard\/sources/);
      for (const value of Object.values(MOCK_DASHBOARD_RECORDS[0])) expect(source).not.toContain(value);
    }
  });

  test("source composition passes candidates through the canonical mapper before rendering", async () => {
    const server = await read("../../dashboard/server.mjs");
    expect(server).toContain("buildDashboardViewModel");
    expect(server).toContain("renderDashboardContent");
    expect(server).toContain("renderContent(buildViewModel(await source.load()))");
  });

  test("public asset fetches same-origin content and replaces only the loading region", async () => {
    const asset = await read("../../dashboard/public/dashboard.js");
    expect(asset).toContain('fetch("/dashboard/content"');
    expect(asset).toContain('credentials: "same-origin"');
    expect(asset).toContain('getElementById("dashboard-content")');
    expect(asset).toContain("replaceWith");
    expect(asset).toContain('data-view", "unavailable"');
  });
});
