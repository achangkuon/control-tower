import { afterEach, describe, expect, test } from "bun:test";
import { createApp } from "../../dashboard/app.mjs";
import { parseServerConfig, startDashboardServer } from "../../dashboard/server.mjs";

const SENTINEL = "PROTECTED_FIXTURE_SENTINEL";
const HASH = "$argon2id$v=19$m=65536,t=2,p=1$c2FsdHNhbHRzYWx0$c29tZWhhc2hzb21laGFzaA";
const servers = [];
afterEach(() => { while (servers.length) servers.pop().stop(true); });

const env = (overrides = {}) => ({
  DASHBOARD_HOST: "127.0.0.1", DASHBOARD_PORT: "0",
  DASHBOARD_AUTH_USERNAME: "maintainer", DASHBOARD_AUTH_PASSWORD_HASH: HASH,
  DASHBOARD_AUTH_REVISION: "r1", DASHBOARD_SESSION_SECRET: Buffer.alloc(32, 7).toString("base64url"),
  DASHBOARD_AUTH_DISABLED: "false", ...overrides,
});
const launch = (overrides = {}, options = {}) => {
  const counts = { factory: 0, handler: 0 }, sourceCounts = { factory: 0, load: 0 };
  const contentFactory = options.factory ?? (() => () => new Response("placeholder"));
  const protectedContentFactory = options.sourceFactory ? undefined : () => {
    counts.factory++; const handler = contentFactory();
    return (...args) => { counts.handler++; return handler(...args); };
  };
  const sourceFactory = options.sourceFactory && (() => {
    sourceCounts.factory++; const source = options.sourceFactory();
    return { load: (...args) => { sourceCounts.load++; return source.load(...args); } };
  });
  const server = startDashboardServer({ env: env(overrides), authDependencies: {
    now: () => 1_700_000_000_000, randomBytes: () => Buffer.alloc(16, 9),
    verifyPassword: async (password, hash) => password === "correct" && hash === overrides.DASHBOARD_AUTH_PASSWORD_HASH,
  }, protectedContentFactory, sourceFactory });
  servers.push(server);
  const origin = `http://${server.hostname}:${server.port}`;
  return { counts, sourceCounts, origin, server, request: (path, init = {}) => fetch(origin + path, { redirect: "manual", ...init }) };
};
const login = (h, body = "username=maintainer&password=correct", headers = {}) => h.request("/auth/login", {
  method: "POST", headers: { Origin: h.origin, "Content-Type": "application/x-www-form-urlencoded", ...headers }, body,
});
const cookieFrom = (response) => response.headers.get("set-cookie")?.split(";", 1)[0];
const safe = async (response) => {
  const body = await response.text();
  expect(body).not.toContain(SENTINEL);
  expect(body).not.toContain("correct");
  expect(body).not.toContain("Error:");
  return body;
};

describe("guarded dashboard HTTP surface", () => {
  test("route and health allowlists return 404 or 405 without protected construction", async () => {
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH });
    for (const path of ["/login", "/assets/dashboard.js", "/assets/styles.css", "/healthz"]) {
      const response = await h.request(path); expect(response.status).toBe(200); await safe(response);
    }
    expect(await (await h.request("/healthz")).text()).toBe("ok\n");
    for (const [path, method, status] of [["/missing?secret=query", "GET", 404], ["/missing", "POST", 404], ["/login", "PUT", 405], ["/", "POST", 405], ["/dashboard/content", "DELETE", 405], ["/auth/login", "GET", 405], ["/assets/dashboard.js", "POST", 405], ["/assets/styles.css", "POST", 405], ["/healthz", "POST", 405]]) {
      const response = await h.request(path, { method }); expect(response.status).toBe(status); await safe(response);
    }
    expect(h.counts).toEqual({ factory: 0, handler: 0 });
  });

  test("auth guard redirects shell, rejects content, and issues a secure cookie", async () => {
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH });
    const shell = await h.request("/"); expect(shell.status).toBe(302); expect(shell.headers.get("location")).toBe("/login"); await safe(shell);
    const content = await h.request("/dashboard/content"); expect(content.status).toBe(401); expect(await safe(content)).toBe("Unauthorized\n");
    const failed = await login(h, "username=wrong&password=wrong"); expect(failed.status).toBe(401); expect(await safe(failed)).toContain("Authentication failed");
    expect(h.counts).toEqual({ factory: 0, handler: 0 });
    const valid = await login(h); expect(valid.status).toBe(303); expect(valid.headers.get("location")).toBe("/");
    expect(valid.headers.get("set-cookie")).toContain("Secure; HttpOnly; SameSite=Strict; Path=/");
    const cookie = cookieFrom(valid);
    const authenticated = await h.request("/", { headers: { Cookie: cookie } }); expect(authenticated.status).toBe(200); await safe(authenticated);
    expect(h.counts).toEqual({ factory: 0, handler: 0 });
  });

  test("auth input rejects malformed, duplicate, oversized, and cross-origin forms generically", async () => {
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH });
    const attempts = [
      login(h, "username=maintainer&username=x&password=correct"), login(h, "username=maintainer&password=correct&extra=x"),
      login(h, `username=maintainer&password=${"x".repeat(1100)}`), login(h, "username=maintainer"),
      login(h, "username=maintainer&password=correct", { Origin: "https://example.invalid" }),
      h.request("/auth/login", { method: "POST", headers: { Origin: h.origin, "Content-Type": "application/json" }, body: "{}" }),
      login(h, new Uint8Array([255])), login(h, "username=maintainer&password=%ZZ"),
    ];
    for (const pending of attempts) { const response = await pending; expect(response.status).toBe(401); expect(await safe(response)).toContain("Authentication failed"); }
    expect(h.counts).toEqual({ factory: 0, handler: 0 });
  });

  test("streaming login input is cancelled at the byte limit before authentication", async () => {
    let produced = 0, cancelled = false, authCalls = 0;
    const body = new ReadableStream({ pull(controller) { produced++; controller.enqueue(new Uint8Array(300)); if (produced === 20) controller.close(); }, cancel() { cancelled = true; } });
    const app = createApp({ auth: { authenticate() { authCalls++; }, verifySession() { return { ok: false }; } }, protectedContentFactory: () => () => new Response() });
    const request = new Request("http://127.0.0.1/auth/login", { method: "POST", headers: { Origin: "http://127.0.0.1", "Content-Type": "application/x-www-form-urlencoded" }, body, duplex: "half" });
    expect(request.headers.has("content-length")).toBeFalse(); expect((await app(request)).status).toBe(401);
    expect(cancelled).toBeTrue(); expect(produced).toBeLessThan(20); expect(authCalls).toBe(0);
  });

  test("forwarded DNS hostname length excludes a validated port and rejects overflow before auth", async () => {
    const boundaryHost = [63, 63, 63, 61].map((length) => "a".repeat(length)).join(".");
    const overlongHost = [63, 63, 63, 63].map((length) => "a".repeat(length)).join(".");
    let authCalls = 0;
    const app = createApp({ auth: { async authenticate() { authCalls++; return { ok: true, cookie: "dashboard_session=x" }; }, verifySession() { return { ok: false }; } }, protectedContentFactory: () => () => new Response() });
    const submit = (hostname) => app(new Request("http://127.0.0.1/auth/login", { method: "POST", headers: { Origin: `https://${hostname}`, "X-Forwarded-Proto": "https", "X-Forwarded-Host": `${hostname}:443`, "Content-Type": "application/x-www-form-urlencoded" }, body: "username=maintainer&password=correct" }));
    expect(boundaryHost.length).toBe(253); expect((await submit(boundaryHost)).status).toBe(303); expect(authCalls).toBe(1);
    expect(overlongHost.length).toBe(255); const rejected = await submit(overlongHost); expect(rejected.status).toBe(401); expect(await safe(rejected)).toContain("Authentication failed"); expect(authCalls).toBe(1);
  });

  test("trusted proxy origin succeeds while malformed forwarding fails generically", async () => {
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH });
    const proxy = { Origin: "https://dashboard.example", "X-Forwarded-Proto": "https", "X-Forwarded-Host": "dashboard.example" };
    expect((await login(h, undefined, proxy)).status).toBe(303);
    expect((await login(h, undefined, { ...proxy, "X-Forwarded-Host": "dashboard.example:443" })).status).toBe(303);
    for (const headers of [
      { ...proxy, "X-Forwarded-Proto": "https,http" }, { ...proxy, "X-Forwarded-Proto": "ftp" },
      { ...proxy, "X-Forwarded-Host": "dashboard.example,evil.example" },
      { ...proxy, Origin: "https://127.0.0.1", "X-Forwarded-Host": "2130706433" },
      { ...proxy, Origin: "https://127.0.0.1", "X-Forwarded-Host": "127.1" },
      { ...proxy, Origin: "https://127.0.0.1", "X-Forwarded-Host": "0x7f000001" },
    ]) {
      const response = await login(h, undefined, headers); expect(response.status).toBe(401); expect(await safe(response)).toContain("Authentication failed");
    }
    expect(h.counts).toEqual({ factory: 0, handler: 0 });
  });

  test("header policy protects every response and protected responses are non-cacheable", async () => {
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH });
    const loginResponse = await login(h); const cookie = cookieFrom(loginResponse);
    for (const [path, init] of [["/login", {}], ["/dashboard/content", { headers: { Cookie: cookie } }]]) {
      const response = await h.request(path, init);
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("permissions-policy")).toContain("camera=()");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
      if (path.includes("content")) { expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("vary")).toBe("Cookie"); }
    }
    expect(h.counts).toEqual({ factory: 1, handler: 1 });
  });

  test("auth rotation, disabled and malformed sessions stop before protected dependencies", async () => {
    const old = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }); const priorCookie = cookieFrom(await login(old));
    const rotated = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH, DASHBOARD_AUTH_REVISION: "r2", DASHBOARD_SESSION_SECRET: Buffer.alloc(32, 8).toString("base64url") });
    for (const cookie of [priorCookie, "dashboard_session=malformed"]) { const response = await rotated.request("/dashboard/content", { headers: { Cookie: cookie } }); expect(response.status).toBe(401); await safe(response); }
    expect((await login(rotated)).status).toBe(303);
    const disabled = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH, DASHBOARD_AUTH_DISABLED: "true" });
    expect((await login(disabled)).status).toBe(401); expect((await disabled.request("/", { headers: { Cookie: priorCookie } })).status).toBe(302);
    expect(rotated.counts).toEqual({ factory: 0, handler: 0 }); expect(disabled.counts).toEqual({ factory: 0, handler: 0 });
  });

  test("server architecture uses Bun.serve on stoppable ephemeral loopback only", async () => {
    const source = await Bun.file(new URL("../../dashboard/server.mjs", import.meta.url)).text();
    expect(source).toContain("Bun.serve");
    for (const residue of ["node:http", "node:stream", "node:net", "createServer", "PassThrough", "Readable.toWeb", "rawPath", "__invalid_raw_path"]) expect(source).not.toContain(residue);
    expect(parseServerConfig({ DASHBOARD_PORT: "0" })).toEqual({ hostname: "127.0.0.1", port: 0 });
    expect(parseServerConfig({ DASHBOARD_HOST: "::1", DASHBOARD_PORT: "65535" })).toEqual({ hostname: "::1", port: 65535 });
    for (const candidate of [{ DASHBOARD_HOST: "0.0.0.0" }, { DASHBOARD_HOST: "localhost" }, { DASHBOARD_PORT: "-1" }, { DASHBOARD_PORT: "65536" }]) expect(() => parseServerConfig(candidate)).toThrow("Invalid dashboard server configuration");
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH });
    expect(h.server.hostname).toBe("127.0.0.1"); expect(h.server.port).toBeGreaterThan(0); expect(typeof h.server.stop).toBe("function");
    expect((await h.request("/healthz")).status).toBe(200);
    servers.pop().stop(true);
  });

  test("loading shell defers source construction until authenticated content resolution", async () => {
    const record = { projectName: "Alpha", agentName: "architect", state: "ready", taskTitle: "Map source", branchName: "feature/source" };
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, { sourceFactory: () => ({ async load() { return [record]; } }) });
    const cookie = cookieFrom(await login(h)); const shell = await h.request("/", { headers: { Cookie: cookie } }); const shellBody = await shell.text();
    expect(shellBody).toContain('id="dashboard-content"'); expect(shellBody).toContain('aria-busy="true"'); expect(shellBody).toContain("Loading dashboard");
    for (const value of Object.values(record)) expect(shellBody).not.toContain(value);
    expect(h.sourceCounts).toEqual({ factory: 0, load: 0 });
    expect(await (await h.request("/dashboard/content", { headers: { Cookie: cookie } })).text()).toContain('data-view="populated"');
    expect(h.sourceCounts).toEqual({ factory: 1, load: 1 });
  });

  test("populated source replacement groups records and strips prohibited extras", async () => {
    const records = [
      { projectName: "Alpha", agentName: "architect", state: "ready", taskTitle: "Map source", branchName: "feature/source", secret: "PROHIBITED_EXTRA_SENTINEL" },
      { projectName: "Beta", agentName: "tester", state: "checking", taskTitle: "Test source", branchName: "feature/tests", timestamp: "PROHIBITED_TIME" },
      { projectName: "Alpha", agentName: "writer", state: "working", taskTitle: "Document source", branchName: "feature/docs" },
    ];
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, { sourceFactory: () => ({ async load() { return records; } }) });
    const cookie = cookieFrom(await login(h)); const response = await h.request("/dashboard/content", { headers: { Cookie: cookie } }); const body = await response.text();
    expect(response.status).toBe(200); expect(body).toContain('data-view="populated"');
    for (const value of ["Alpha", "Beta", "architect", "tester", "writer", "feature/source"]) expect(body).toContain(value);
    expect(body.match(/class="project-group"/g)).toHaveLength(2); expect(body).not.toContain("PROHIBITED_EXTRA_SENTINEL"); expect(body).not.toContain("PROHIBITED_TIME");
  });

  test("empty and delayed sources remain distinct while resolution is pending", async () => {
    let release; const gate = new Promise((resolve) => { release = resolve; });
    const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, { sourceFactory: () => ({ load: () => gate }) });
    const cookie = cookieFrom(await login(h)); let settled = false;
    const pending = h.request("/dashboard/content", { headers: { Cookie: cookie } }).then((response) => { settled = true; return response; });
    await Bun.sleep(10); expect(h.sourceCounts).toEqual({ factory: 1, load: 1 }); expect(settled).toBeFalse();
    release([]); const body = await (await pending).text(); expect(body).toContain('data-view="empty"'); expect(body).not.toContain('data-view="populated"');
  });

  test("invalid and throwing sources render generic unavailable content without leakage", async () => {
    const cases = [() => ({ async load() { return [{ projectName: "BROKEN_SENTINEL" }]; } }), () => ({ async load() { throw new Error("SOURCE_STACK_SENTINEL"); } })];
    for (const sourceFactory of cases) {
      const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, { sourceFactory }); const cookie = cookieFrom(await login(h));
      const response = await h.request("/dashboard/content", { headers: { Cookie: cookie } }); const body = await response.text();
      expect(response.status).toBe(200); expect(body).toContain('data-view="unavailable"'); expect(body).not.toContain('data-view="empty"');
      for (const leak of ["BROKEN_SENTINEL", "SOURCE_STACK_SENTINEL", "Error:", "transport", "persistence", "freshness", "lifecycle", "P4"]) expect(body).not.toContain(leak);
    }
  });

  test("guarded handler and factory errors are generic and non-disclosing", async () => {
    const cases = [[() => { throw new Error(`${SENTINEL} factory`); }, { factory: 1, handler: 0 }], [() => () => { throw new Error(`${SENTINEL} handler`); }, { factory: 1, handler: 1 }],
      [() => (request) => new Response(`${SENTINEL}\nError: stack\ndashboard_session=cookie-leak\n${new URL(request.url).searchParams.get("secret")}`, { status: 500, headers: { "X-Upstream-Leak": SENTINEL } }), { factory: 1, handler: 1 }]];
    for (const [factory, counts] of cases) {
      const h = launch({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, { factory }); const cookie = cookieFrom(await login(h));
      const response = await h.request("/dashboard/content?secret=query-leak", { headers: { Cookie: cookie } }); expect(response.status).toBe(500); expect(await safe(response)).toBe("Unavailable\n");
      expect(response.headers.get("x-upstream-leak")).toBeNull(); expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("vary")).toBe("Cookie"); expect(h.counts).toEqual(counts);
    }
  });
});
