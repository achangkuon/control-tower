#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initProject } from "./adoption.mjs";

const DEFAULT_PROMPT = "What does this project do?";
const bytes = (text) => Buffer.byteLength(text, "utf8");
const definition = {
  requestBodyBytes: "Raw bytes of FIRST qualifying POST; retries ignored; not token counts.",
  systemTextBytes: "UTF-8 text strings in system (Anthropic) or system/developer messages (OpenAI), concatenated without separators.",
  toolSchemaBytes: "UTF-8 JSON.stringify(tools ?? []); decoded and reserialized, not a raw-body slice.",
  firstUserMessageBytes: "UTF-8 text strings in first user content, concatenated without separators; non-text blocks excluded.",
};
const text = (value) => typeof value === "string" ? value : Array.isArray(value) ?
  value.filter((item) => item.type === "text" || item.type === "input_text").map((item) => item.text ?? "").join("") : "";

function toolSignals(stream) {
  const signals = new Set();
  const inspect = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.type === "tool_use" || value.type === "function" || value.function) {
      const call = value.function ?? value;
      const name = call.name ?? "", input = JSON.stringify(call.input ?? call.arguments ?? {});
      if (/control[-_]tower/i.test(name) || (/skill/i.test(name) && /control-tower/i.test(input))) signals.add("control-tower invocation");
      if (/read|bash|exec|shell/i.test(name) && /(?:\.agents|\.claude)[/\\]+skills[/\\]+control-tower/i.test(input)) signals.add("control-tower skill read");
      if (/bash|exec|shell/i.test(name) && /(?:\.control-tower[/\\]+radar|\bradar\b)/i.test(input)) signals.add("radar execution");
    }
    // Tool definitions and system listings describe availability, not execution.
    for (const [field, child] of Object.entries(value)) if (!["tools", "system"].includes(field) && child && typeof child === "object") inspect(child);
  };
  for (const source of stream) {
    try { inspect(JSON.parse(source)); } catch {
      let tool, partial = "";
      for (const line of source.split("\n")) {
        if (!line.startsWith("data:")) continue;
        try {
          const event = JSON.parse(line.slice(5)); inspect(event);
          if (event.type === "content_block_start") { tool = event.content_block; partial = ""; }
          if (event.delta?.partial_json) {
            partial += event.delta.partial_json;
            try { inspect({ ...tool, input: JSON.parse(partial) }); } catch { /* incomplete SSE input */ }
          }
        } catch { /* non-JSON SSE markers */ }
      }
    }
  }
  return [...signals].sort();
}

/** In-memory boundary only. No headers containing credentials or raw bodies enter the report.
 * Real Pi uses anthropic-messages, models.json apiKey references ANTHROPIC_API_KEY (not its value).
 */
export function createCapture({ host, realModel = false, key = "", upstream = "https://api.anthropic.com" }) {
  const records = [], stream = []; let first, ambiguous = false, proxyFailed = false;
  const path = host === "pi" && !realModel ? "/v1/chat/completions" : "/v1/messages";
  const scrub = (s) => key ? s.split(key).join("[REDACTED]") : s;
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(req) {
    const url = new URL(req.url);
    if (host === "claude" && req.method === "HEAD" && url.pathname === "/api/hello") return new Response(null, { status: 200 });
    const raw = Buffer.from(await req.arrayBuffer());
    records.push({ method: req.method, path: url.pathname, headers: Object.fromEntries([...req.headers].map(([k, v]) =>
      [k, /authorization|api-key/i.test(k) ? "[REDACTED]" : scrub(v)])), body: scrub(raw.toString()) });
    if (req.method !== "POST" || url.pathname !== path) {
      ambiguous = true; return Response.json({ error: "unexpected capture path" }, { status: 400 });
    }
    first ??= raw;
    stream.push(raw.toString());
    if (!realModel) return Response.json({ error: { type: "invalid_request_error", message: "capture only" } }, { status: 400 });
    try {
      const headers = new Headers(req.headers); headers.delete("host"); headers.delete("content-length");
      const response = await fetch(`${upstream}${url.pathname}${url.search}`, { method: "POST", headers, body: raw, redirect: "error", signal: AbortSignal.timeout(30000) });
      const body = await response.text(); stream.push(body);
      if (!response.ok) proxyFailed = true;
      return new Response(body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    } catch { proxyFailed = true; return Response.json({ error: "upstream failed" }, { status: 502 }); }
  } });
  return { url: server.url.origin, records, stop: () => server.stop(true), signals: () => toolSignals(stream),
    measure() {
      if (ambiguous) throw new Error("ambiguous request path");
      if (!first) throw new Error("no qualifying inference request");
      if (proxyFailed) throw new Error("upstream request failed");
      let decoded;
      try { decoded = JSON.parse(first.toString()); } catch { throw new Error("invalid request JSON"); }
      if (!Array.isArray(decoded.messages) || !decoded.messages.some((m) => m.role === "user")) throw new Error("unsupported request shape");
      return { requestBodyBytes: first.length,
        systemTextBytes: bytes(text(decoded.system) + decoded.messages.filter((m) => ["system", "developer"].includes(m.role)).map((m) => text(m.content)).join("")),
        toolSchemaBytes: bytes(JSON.stringify(decoded.tools ?? [])),
        firstUserMessageBytes: bytes(text(decoded.messages.find((m) => m.role === "user").content)) };
    } };
}

async function spawnHost(cmd, options) {
  const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => proc.kill(), 45000);
  try {
    const [code, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    return { code, stdout };
  } finally { clearTimeout(timer); }
}

function fixture(root, adopted, env) {
  mkdirSync(root);
  const git = (...args) => {
    const result = spawnSync("git", ["-c", "user.name=Benchmark", "-c", "user.email=benchmark@example.invalid", ...args], { cwd: root, env });
    if (result.status !== 0) throw new Error("fixture git failed");
  };
  writeFileSync(join(root, "README.md"), "# Fixture\nA disposable benchmark project.\n");
  git("init", "-q"); git("add", "."); git("commit", "-qm", "seed");
  if (adopted) initProject({ projectRoot: root, trustResolution: "trusted" });
  // Claude injects status: both arms MUST be clean with equal commit counts/messages.
  // The second commit is empty only in the non-adopter; all adoption output is committed.
  git("add", "."); git("commit", "--allow-empty", "-qm", "prepare arm");
}

/** Independent host results are a seam for B2's later Radar contrast, not a static-size proxy. */
export async function runBenchmark({ hosts = ["pi", "claude"], realModel = false, prompt = DEFAULT_PROMPT,
  env = process.env, binaries = {}, spawn = spawnHost, upstream } = {}) {
  if (!Array.isArray(hosts) || !hosts.length || new Set(hosts).size !== hosts.length || hosts.some((h) => !["pi", "claude"].includes(h))) throw new Error("invalid hosts");
  if (typeof prompt !== "string" || !prompt || typeof realModel !== "boolean") throw new Error("invalid options");
  if (realModel && !env.ANTHROPIC_API_KEY) throw new Error("--real-model requires ANTHROPIC_API_KEY in environment");
  const report = { schema: "tower.v1.benchmark/1", mode: realModel ? "real-model" : "capture-only", prompt, definition, hosts: {} };
  const base = mkdtempSync(join(tmpdir(), "tower-benchmark-"));
  try {
    for (const host of hosts) {
      let reason = "host execution failed";
      try {
        const binary = binaries[host] ?? Bun.which(host, { PATH: env.PATH ?? "" });
        if (!binary) throw new Error("host binary missing");
        const arms = [], versions = [], signals = [];
        for (const adopted of [false, true]) {
          // Equal-length paths avoid injecting path-length differences into the measured delta.
          const arm = join(base, `${host}-${adopted ? "adopted" : "control"}`); mkdirSync(arm);
          const home = join(arm, "home"), cfg = join(arm, "cfg"), temp = join(arm, "tmp");
          for (const dir of [home, cfg, temp]) mkdirSync(dir);
          const isolated = { PATH: env.PATH ?? "", HOME: home, TMPDIR: temp, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" };
          const cwd = join(arm, "project"); fixture(cwd, adopted, isolated);
          const capture = createCapture({ host, realModel, key: realModel ? env.ANTHROPIC_API_KEY : "", upstream });
          try {
            let args;
            if (host === "claude") {
              Object.assign(isolated, { CLAUDE_CONFIG_DIR: cfg, ANTHROPIC_BASE_URL: capture.url, ANTHROPIC_API_KEY: realModel ? env.ANTHROPIC_API_KEY : "dummy", DISABLE_TELEMETRY: "1", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" });
              args = ["-p", prompt, "--output-format", "json"];
            } else {
              Object.assign(isolated, { PI_CODING_AGENT_DIR: cfg, PI_OFFLINE: "1", ...(realModel ? { ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY } : {}) });
              writeFileSync(join(cfg, "models.json"), JSON.stringify({ providers: { capture: { baseUrl: `${capture.url}/v1`, api: realModel ? "anthropic-messages" : "openai-completions", apiKey: realModel ? "ANTHROPIC_API_KEY" : "dummy", models: [{ id: realModel ? "claude-sonnet-4-20250514" : "capture-model" }] } } }));
              args = ["--offline", "--no-extensions", "--no-session", "--approve", "--provider", "capture", "--model", realModel ? "claude-sonnet-4-20250514" : "capture-model", "-p", prompt];
            }
            reason = "host binary missing or version unavailable";
            const version = await spawn([binary, "--version"], { cwd, env: isolated });
            if (version.code !== 0 || !version.stdout.trim()) throw new Error(reason);
            versions.push(version.stdout.trim());
            reason = "host execution failed";
            const outcome = await spawn([binary, ...args], { cwd, env: isolated });
            arms.push(capture.measure()); signals.push(...capture.signals());
            if (realModel && outcome.code !== 0) throw new Error("real-model response incomplete");
          } finally { capture.stop(); }
        }
        if (versions[0] !== versions[1]) throw new Error("host versions differ between arms");
        report.hosts[host] = { status: "measured", version: versions[0], nonAdopter: arms[0], adopter: arms[1],
          delta: Object.fromEntries(Object.keys(arms[0]).map((k) => [k, arms[1][k] - arms[0][k]])),
          behavior: realModel ? { status: signals.length ? "accidental_selection" : "not_detected", signals: [...new Set(signals)].sort() } :
            { status: "not_measured", reason: "Capture-only stops before model output; request listings cannot prove selection or execution." } };
      } catch (error) {
        const known = /^(?:host |no qualifying |ambiguous |invalid request |unsupported request |upstream request |real-model response |fixture git )/.test(error.message);
        report.hosts[host] = { status: "blocked", reason: known ? error.message : reason };
      }
    }
  } finally { rmSync(base, { recursive: true, force: true }); }
  // Also guard operator-supplied prompts and host diagnostics against credential echo.
  return JSON.parse(JSON.stringify(report, (_field, value) => typeof value === "string" && env.ANTHROPIC_API_KEY ?
    value.split(env.ANTHROPIC_API_KEY).join("[REDACTED]") : value));
}

export async function main(argv, { stdout = process.stdout, stderr = process.stderr, ...options } = {}) {
  try {
    const parsed = {}, seen = new Set();
    for (let i = 0; i < argv.length; i++) {
      const flag = argv[i];
      if (!["--hosts", "--real-model", "--prompt"].includes(flag) || seen.has(flag)) throw new Error("invalid or duplicate flag");
      seen.add(flag);
      if (flag === "--real-model") { parsed.realModel = true; continue; }
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error("missing flag value");
      if (flag === "--hosts") parsed.hosts = value.split(","); else parsed.prompt = value;
    }
    const report = await runBenchmark({ ...options, ...parsed }); stdout.write(`${JSON.stringify(report)}\n`);
    if (Object.values(report.hosts).some((result) => result.status === "blocked")) { stderr.write("Invalid Tower benchmark CLI: host blocked; see report\n"); return 1; }
    return 0;
  } catch { stderr.write("Invalid Tower benchmark CLI: invalid options or unavailable required key\n"); return 1; }
}
if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
