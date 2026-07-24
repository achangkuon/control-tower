const BODY_LIMIT = 1024;
const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
};
const ROUTES = new Map([
  ["/login", "GET"], ["/auth/login", "POST"], ["/", "GET"],
  ["/dashboard/content", "GET"], ["/assets/dashboard.js", "GET"],
  ["/assets/styles.css", "GET"], ["/healthz", "GET"],
]);
const LOGIN_FORM = (failed = false) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/assets/styles.css"><title>Dashboard login</title></head><body><main><h1>Dashboard login</h1>${failed ? '<p role="alert">Authentication failed</p>' : ""}<form method="post" action="/auth/login"><label>Username <input name="username" autocomplete="username" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label><button>Sign in</button></form></main></body></html>`;
const SHELL = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/assets/styles.css"><title>Observation dashboard</title></head><body><main><h1>Observation dashboard</h1><div id="dashboard-content" aria-busy="true"><p>Loading dashboard…</p></div></main><script type="module" src="/assets/dashboard.js"></script></body></html>`;

const secured = (response, protectedRoute = false) => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (protectedRoute) { headers.set("Cache-Control", "no-store"); headers.set("Vary", "Cookie"); }
  return new Response(response.body, { status: response.status, headers });
};
const reply = (body, status = 200, headers = {}, protectedRoute = false) => secured(new Response(body, { status, headers }), protectedRoute);
const html = (body, status = 200, protectedRoute = false) => reply(body, status, { "Content-Type": "text/html; charset=utf-8" }, protectedRoute);
const tokenFrom = (request) => request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("dashboard_session="))?.slice(18);
const isAuthenticated = (auth, request) => {
  try { return auth.verifySession(tokenFrom(request))?.ok === true; } catch { return false; }
};
const invalidLogin = () => html(LOGIN_FORM(true), 401);
const externalOrigin = (request) => {
  const proto = request.headers.get("x-forwarded-proto"), host = request.headers.get("x-forwarded-host");
  if (proto === null && host === null) return new URL(request.url).origin;
  // Safe because the service is loopback-only and Caddy is the sole public listener.
  if (proto !== "https" || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?::\d{1,5})?$/i.test(host ?? "")) return null;
  const forwardedHostname = host.replace(/:\d{1,5}$/, "");
  if (forwardedHostname.length > 253 || !/[a-z]/i.test(forwardedHostname)) return null;
  try {
    const external = new URL(`${proto}://${host}`);
    return external.hostname.toLowerCase() === forwardedHostname.toLowerCase() ? external.origin : null;
  } catch { return null; }
};
const limitedBody = async (request) => {
  const reader = request.body?.getReader(); if (!reader) return new Uint8Array();
  const chunks = []; let total = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > BODY_LIMIT) { await reader.cancel(); return null; } chunks.push(value); }
  } catch { try { await reader.cancel(); } catch {} return null; }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
};

async function parseLogin(request) {
  if (request.headers.get("origin") !== externalOrigin(request)) return null;
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/x-www-form-urlencoded") return null;
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > BODY_LIMIT)) { try { await request.body?.cancel(); } catch {} return null; }
  const bytes = await limitedBody(request); if (!bytes) return null;
  const body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  try { decodeURIComponent(body.replaceAll("+", " ")); } catch { return null; }
  const form = new URLSearchParams(body);
  if ([...form.keys()].sort().join(",") !== "password,username" || form.getAll("username").length !== 1 || form.getAll("password").length !== 1) return null;
  return { username: form.get("username"), password: form.get("password") };
}

export function createApp({ auth, protectedContentFactory }) {
  if (!auth || typeof protectedContentFactory !== "function") throw new Error("Invalid dashboard dependencies");
  return async (request) => {
    const path = new URL(request.url).pathname;
    const method = ROUTES.get(path);
    if (!method) return reply("Not found\n", 404);
    if (request.method !== method) return reply("Method not allowed\n", 405, { Allow: method });
    if (path === "/healthz") return reply("ok\n", 200, { "Content-Type": "text/plain; charset=utf-8" });
    if (path === "/login") return html(LOGIN_FORM());
    if (path === "/assets/dashboard.js") return reply(await Bun.file(new URL("./public/dashboard.js", import.meta.url)).text(), 200, { "Content-Type": "text/javascript; charset=utf-8" });
    if (path === "/assets/styles.css") return reply(await Bun.file(new URL("./public/styles.css", import.meta.url)).text(), 200, { "Content-Type": "text/css; charset=utf-8" });
    if (path === "/auth/login") {
      try {
        const input = await parseLogin(request);
        if (!input) return invalidLogin();
        const result = await auth.authenticate(input.username, input.password);
        if (!result?.ok) return invalidLogin();
        return reply("", 303, { Location: "/", "Set-Cookie": result.cookie });
      } catch { return invalidLogin(); }
    }
    const authenticated = isAuthenticated(auth, request);
    if (!authenticated && path === "/") return reply("", 302, { Location: "/login" }, true);
    if (!authenticated) return reply("Unauthorized\n", 401, { "Content-Type": "text/plain; charset=utf-8" }, true);
    if (path === "/") return html(SHELL, 200, true);
    try {
      const handler = protectedContentFactory();
      if (typeof handler !== "function") throw new Error("Invalid protected handler");
      const response = await handler(request);
      if (!(response instanceof Response)) throw new Error("Invalid protected response");
      if (response.status >= 500) { try { await response.body?.cancel(); } catch {} return reply("Unavailable\n", 500, { "Content-Type": "text/plain; charset=utf-8" }, true); }
      return secured(response, true);
    } catch { return reply("Unavailable\n", 500, { "Content-Type": "text/plain; charset=utf-8" }, true); }
  };
}
