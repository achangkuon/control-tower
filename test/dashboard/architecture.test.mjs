import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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

describe("dashboard deployment examples", () => {
  test("hash script reads operator input from stdin and emits only a usable Argon2id hash", async () => {
    const script = fileURLToPath(new URL("../../dashboard/scripts/hash-password.mjs", import.meta.url));
    const workingDirectory = mkdtempSync(join(tmpdir(), "dashboard-hash-test-"));
    const password = "operator-only input 42!";

    try {
      const child = Bun.spawn([process.execPath, script], {
        cwd: workingDirectory,
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      });
      child.stdin.write(`${password}\n`);
      child.stdin.end();
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      const hash = stdout.trim();

      expect(exitCode).toBe(0);
      expect(hash).toMatch(/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$/);
      expect(await Bun.password.verify(password, hash)).toBeTrue();
      expect(`${stdout}${stderr}`).not.toContain(password);
      expect(stderr).toBe("");
      expect(readdirSync(workingDirectory)).toEqual([]);
      expect(await read("../../dashboard/scripts/hash-password.mjs")).not.toMatch(/Bun\.write|writeFile|appendFile|createWriteStream/);
    } finally {
      rmSync(workingDirectory, { recursive: true, force: true });
    }
  });

  test("systemd example isolates a loopback Bun service from Control Tower state", async () => {
    const service = await read("../../dashboard/deploy/control-tower-dashboard.service");

    for (const contract of [
      /^User=control-tower-dashboard$/m,
      /^Group=control-tower-dashboard$/m,
      /^EnvironmentFile=\/etc\/control-tower-dashboard\/dashboard\.env$/m,
      /^WorkingDirectory=\/opt\/control-tower-dashboard\/current$/m,
      /^ExecStart=\/usr\/bin\/bun \/opt\/control-tower-dashboard\/current\/server\.mjs$/m,
      /^Restart=on-failure$/m,
      /^NoNewPrivileges=true$/m,
      /^PrivateTmp=true$/m,
      /^ProtectHome=true$/m,
      /^ProtectSystem=strict$/m,
      /^IPAddressDeny=any$/m,
      /^IPAddressAllow=localhost$/m,
    ]) expect(service).toMatch(contract);
    for (const inaccessible of ["/var/lib/control-tower", "/run/control-tower", "/srv/control-tower", "/root/.ssh"]) {
      expect(service).toMatch(new RegExp(`^InaccessiblePaths=-?${inaccessible.replaceAll("/", "\\/")}$`, "m"));
    }
    expect(service).not.toMatch(/(?:ReadWritePaths|BindPaths|BindReadOnlyPaths)=/);
  });

  test("Caddy example owns HTTPS and proxies only to the loopback listener", async () => {
    const caddy = await read("../../dashboard/deploy/Caddyfile.example");

    expect(caddy).toMatch(/^https:\/\/dashboard\.example\.invalid\s*\{/m);
    expect(caddy).toMatch(/^\s*reverse_proxy 127\.0\.0\.1:\d+$/m);
    expect(caddy).not.toMatch(/reverse_proxy\s+(?:0\.0\.0\.0|\[?::\]?|https?:\/\/)/);
    expect(caddy).not.toMatch(/basic_auth|DASHBOARD_AUTH|password|secret|cookie|mock|fixture/i);
  });

  test("environment example lists configuration names without usable values", async () => {
    const environment = await read("../../dashboard/deploy/dashboard.env.example");
    const names = [
      "DASHBOARD_AUTH_USERNAME",
      "DASHBOARD_AUTH_PASSWORD_HASH",
      "DASHBOARD_AUTH_REVISION",
      "DASHBOARD_SESSION_SECRET",
      "DASHBOARD_AUTH_DISABLED",
      "DASHBOARD_HOST",
      "DASHBOARD_PORT",
    ];

    for (const name of names) expect(environment).toMatch(new RegExp(`^${name}=$`, "m"));
    expect(environment).not.toMatch(/^DASHBOARD_AUTH_PASSWORD=/m);
    expect(environment.split("\n").filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line)).every((line) => line.endsWith("="))).toBeTrue();
    expect(environment).not.toMatch(/\$argon2(?:id)?\$|dashboard_session=|example\.(?:com|org|net)|BEGIN [A-Z ]+KEY/i);
  });

  test("deploy guide defines immutable rollout smoke checks and symlink-only rollback", async () => {
    const guide = await read("../../dashboard/deploy/README.md");

    for (const contract of [
      "/opt/control-tower-dashboard/releases/<release-id>/dashboard/",
      "/opt/control-tower-dashboard/current",
      "/etc/control-tower-dashboard/dashboard.env",
      "root:root",
      "0600",
      "/healthz",
      "/dashboard/content",
      "explicit future user approval",
      "atomic",
      "previous release",
      "unchanged dashboard URL",
    ]) expect(guide).toContain(contract);
    for (const smoke of [
      /unauthenticated.*\/.*redirect.*\/login/i,
      /unauthenticated.*\/dashboard\/content.*401/i,
      /invalid login.*generic.*no protected/i,
      /authenticated.*loading.*(?:populated|empty)/i,
      /old credential.*old cookie.*fail/i,
    ]) expect(guide).toMatch(smoke);
    for (const excludedRecovery of [
      "data migration", "projection replay", "queue repair", "protocol downgrade", "Tower database action", "P4-P6 recovery",
    ]) expect(guide).toContain(excludedRecovery);
    expect(guide).toMatch(/credential revocation.*independent/i);
    expect(guide).toMatch(/copy only the self-contained `dashboard\/` directory/i);
  });

  test("hash script rejects command-line secrets without echoing them", async () => {
    const script = fileURLToPath(new URL("../../dashboard/scripts/hash-password.mjs", import.meta.url));
    const secret = "must-not-appear";
    const child = Bun.spawn([process.execPath, script, secret], { stdout: "pipe", stderr: "pipe" });
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
    ]);

    expect(exitCode).not.toBe(0);
    expect(stdout).toBe("");
    expect(stderr).toContain("standard input");
    expect(stderr).not.toContain(secret);
  });

  test("deploy contract rejects a public Bun bind or release-local environment file", async () => {
    const [environment, service, guide] = await Promise.all([
      read("../../dashboard/deploy/dashboard.env.example"),
      read("../../dashboard/deploy/control-tower-dashboard.service"),
      read("../../dashboard/deploy/README.md"),
    ]);
    const violations = (environmentFixture, serviceFixture) => {
      const host = /^DASHBOARD_HOST=(.*)$/m.exec(environmentFixture)?.[1];
      const environmentFile = /^EnvironmentFile=(.*)$/m.exec(serviceFixture)?.[1] ?? "";
      return [
        host && !["127.0.0.1", "::1"].includes(host) ? "public Bun bind" : null,
        /\/releases\/[^/]+\/dashboard\//.test(environmentFile) ? "environment file inside release" : null,
      ].filter(Boolean);
    };

    expect(violations(environment, service)).toEqual([]);
    expect(violations(environment.replace("DASHBOARD_HOST=", "DASHBOARD_HOST=0.0.0.0"), service)).toEqual(["public Bun bind"]);
    expect(violations(environment, service.replace(
      "/etc/control-tower-dashboard/dashboard.env",
      "/opt/control-tower-dashboard/releases/r1/dashboard/dashboard.env",
    ))).toEqual(["environment file inside release"]);
    expect(guide).toMatch(/Every real-host smoke check, service restart, public route or certificate change, credential rotation, rollout, and rollback is blocked/i);
  });
});
