import { createApp } from "./app.mjs";
import { createAuth, parseAuthConfig } from "./auth.mjs";
import { renderDashboardContent } from "./render.mjs";
import { createMockDashboardSource } from "./sources/mock-source.mjs";
import { buildDashboardViewModel } from "./view-model.mjs";

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
  const sourceFactory = options.sourceFactory ?? createMockDashboardSource;
  const buildViewModel = options.buildViewModel ?? buildDashboardViewModel;
  const renderContent = options.renderContent ?? renderDashboardContent;
  const protectedContentFactory = options.protectedContentFactory ?? (() => async () => {
    try {
      const source = sourceFactory();
      if (!source || typeof source.load !== "function") throw new TypeError("Invalid dashboard source");
      return new Response(renderContent(buildViewModel(await source.load())), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    } catch {
      return new Response('<section class="dashboard-unavailable" data-view="unavailable"><h2>Dashboard unavailable</h2><p>Dashboard content cannot be shown.</p></section>', { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  });
  const fetch = createApp({ auth, protectedContentFactory });
  return Bun.serve({ hostname, port, fetch });
}

if (import.meta.main) startDashboardServer();
