import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const read = (path) => Bun.file(new URL(path, import.meta.url)).text();
const FIELDS = ["agentName", "branchName", "projectName", "state", "taskTitle"];
const DASHBOARD_ROOT = fileURLToPath(new URL("../../dashboard/", import.meta.url));
const filesUnder = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? filesUnder(path) : [path];
});

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

  test("CSS defines a mobile-first single-column visual and wrapping contract", async () => {
    const css = await read("../../dashboard/public/styles.css");
    for (const contract of [
      /box-sizing:\s*border-box/, /--page-bg:\s*#[0-9a-f]{6}/i,
      /--accent:\s*#[0-9a-f]{6}/i, /flex-direction:\s*column/,
      /width:\s*min\(100%,\s*\d+rem\)/, /overflow-wrap:\s*anywhere/,
      /min-height:\s*44px/, /prefers-reduced-motion:\s*reduce/,
    ]) expect(css).toMatch(contract);
    expect(css).not.toMatch(/grid-template-columns|<table|repeat\s*\(/i);
    expect(css).not.toMatch(/min-width:\s*(?:[4-9]\d\d|\d{4,})px/i);
  });

  test("every dashboard import stays inside the isolated dashboard root", async () => {
    const forbidden = /(?:^|\/)(?:core\.mjs|mcp\.mjs|bin|plugin|bot|telegram|autonomous-continuation-control-tower|p[4-6])(?:\/|$)/i;
    for (const file of filesUnder(DASHBOARD_ROOT).filter((path) => /\.(?:mjs|js)$/.test(path))) {
      const source = await Bun.file(file).text();
      for (const match of source.matchAll(/(?:from\s*|import\s*\()\s*["']([^"']+)/g)) {
        const specifier = match[1];
        expect(specifier).not.toMatch(forbidden);
        if (specifier.startsWith(".")) {
          const target = resolve(dirname(file), specifier);
          expect(relative(DASHBOARD_ROOT, target).startsWith("..")).toBeFalse();
        } else expect(specifier.startsWith("/")).toBeFalse();
      }
    }
  });

  test("the authentication exchange is the only POST and exposes no operational route", async () => {
    const app = await read("../../dashboard/app.mjs");
    const routes = [...app.matchAll(/\["(\/[^"?]*)",\s*"(GET|POST)"\]/g)]
      .map(([, path, method]) => ({ path, method }));
    expect(routes).toEqual([
      { path: "/login", method: "GET" }, { path: "/auth/login", method: "POST" },
      { path: "/", method: "GET" }, { path: "/dashboard/content", method: "GET" },
      { path: "/assets/dashboard.js", method: "GET" },
      { path: "/assets/styles.css", method: "GET" }, { path: "/healthz", method: "GET" },
    ]);
    expect(routes.filter(({ method }) => method === "POST")).toEqual([
      { path: "/auth/login", method: "POST" },
    ]);
    for (const route of routes) expect(route.path).not.toMatch(/action|approve|command|mutate|write/i);
  });
});
