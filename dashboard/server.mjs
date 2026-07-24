import { createApp } from "./app.mjs";
import { createAuth, parseAuthConfig } from "./auth.mjs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);

export function parseServerConfig(env) {
  const hostname = env.DASHBOARD_HOST ?? "127.0.0.1";
  const rawPort = env.DASHBOARD_PORT ?? "3000";
  if (!LOOPBACK_HOSTS.has(hostname) || !/^\d{1,5}$/.test(rawPort)) throw new Error("Invalid dashboard server configuration");
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error("Invalid dashboard server configuration");
  return { hostname, port };
}

export function startDashboardServer(options = {}) {
  const env = options.env ?? Bun.env;
  const { hostname, port } = parseServerConfig(env);
  const auth = options.auth ?? createAuth(parseAuthConfig(env), options.authDependencies);
  const protectedContentFactory = options.protectedContentFactory ?? (() => () => new Response("Unavailable\n", { status: 503 }));
  const fetch = createApp({ auth, protectedContentFactory });
  return Bun.serve({ hostname, port, fetch });
}

if (import.meta.main) startDashboardServer();
