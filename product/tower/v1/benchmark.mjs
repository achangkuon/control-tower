#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { initProject } from "./adoption.mjs";

const DEFAULT_PROMPT = "What does this project do?";
const DEFAULT_TIMEOUT_MS = 45000;
const bytes = (text) => Buffer.byteLength(text, "utf8");
const definition = {
  requestBodyBytes: "Raw bytes of FIRST qualifying POST; retries ignored; not token counts.",
  systemTextBytes: "UTF-8 text strings in system (Anthropic) or system/developer messages (OpenAI), concatenated without separators.",
  toolSchemaBytes: "UTF-8 JSON.stringify(tools ?? []); decoded and reserialized, not a raw-body slice.",
  firstUserMessageBytes: "UTF-8 text strings in first user content, concatenated without separators; non-text blocks excluded.",
};
const text = (value) => typeof value === "string" ? value : Array.isArray(value) ?
  value.filter((item) => item.type === "text" || item.type === "input_text").map((item) => item.text ?? "").join("") : "";

// Conservative shell segments: quoted mentions remain arguments, never new commands.
function runsRadar(input) {
  if (typeof input === "string") { try { input = JSON.parse(input); } catch { return false; } }
  if (typeof input?.command !== "string") return false;
  let segment = [], word = "", quote = "", detected = false;
  const flush = () => { if (word) segment.push(word); word = ""; };
  const end = () => {
    flush();
    detected ||= basename(segment[0] ?? "") === "radar" ||
      (basename(segment[0] ?? "") === "go" && segment[1] === "run" && /(?:^|\/)\.control-tower\/radar\/?$/.test(segment[2] ?? ""));
    segment = [];
  };
  const command = input.command;
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === "\\" && quote !== "'") { word += command[++i] ?? ""; continue; }
    if (quote) { if (char === quote) quote = ""; else word += char; continue; }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (char === ";" || char === "|" || char === "\n" || (char === "&" && command[i + 1] === "&")) {
      end();
      if (char === command[i + 1] && ["&", "|"].includes(char)) i++;
    } else if (/\s/.test(char)) flush();
    else word += char;
  }
  if (quote) return false; // Incomplete shell text cannot prove an execution.
  end();
  return detected;
}

function toolSignals(stream) {
  const signals = new Set();
  const inspect = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.type === "tool_use" || value.type === "function" || value.function) {
      const call = value.function ?? value;
      const name = call.name ?? "", input = JSON.stringify(call.input ?? call.arguments ?? {});
      if (/control[-_]tower/i.test(name) || (/skill/i.test(name) && /control-tower/i.test(input))) signals.add("control-tower invocation");
      if (/read|bash|exec|shell/i.test(name) && /(?:\.agents|\.claude)[/\\]+skills[/\\]+control-tower/i.test(input)) signals.add("control-tower skill read");
      if (/bash|exec|shell/i.test(name) && runsRadar(call.input ?? call.arguments)) signals.add("radar execution");
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

async function spawnHost(cmd, { timeoutMs, ...options }) {
  const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; proc.kill("SIGKILL"); }, timeoutMs);
  try {
    const [code, stdout, stderr] = await Promise.all([proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    if (timedOut) throw new Error(`host process timed out after ${timeoutMs}ms`);
    return { code, stdout, stderr };
  } finally { clearTimeout(timer); }
}

function fixture(root, adopted, env, timeoutMs, plan = null) {
  mkdirSync(root);
  const git = (...args) => {
    const result = spawnSync("git", ["-c", "user.name=Benchmark", "-c", "user.email=benchmark@example.invalid", ...args],
      { cwd: root, env, timeout: timeoutMs, killSignal: "SIGKILL" });
    if (result.error?.code === "ETIMEDOUT") throw new Error(`fixture git ${args[0]} timed out after ${timeoutMs}ms`);
    if (result.error || result.status !== 0) throw new Error(`fixture git ${args[0]} failed`);
  };
  writeFileSync(join(root, "README.md"), "# Fixture\nA disposable benchmark project.\n");
  git("init", "-q"); git("add", "."); git("commit", "-qm", "seed");
  if (adopted) initProject({ projectRoot: root, trustResolution: "trusted" });
  if (plan !== null) { mkdirSync(join(root, "openspec")); writeFileSync(join(root, "openspec/plan.yaml"), plan); }
  // Claude injects status: both arms MUST be clean with equal commit counts/messages.
  // The second commit is empty only in the non-adopter; all adoption output is committed.
  git("add", "."); git("commit", "--allow-empty", "-qm", "prepare arm");
}

const canonicalRadar = fileURLToPath(new URL("../../../agent-workflows/tools/radar", import.meta.url));
const radarCases = ["valid", "missing-plan", "schema-v2"];
const tail = (value) => String(value ?? "").slice(-2048);
const minimalPlan = (version) => `schema: plan\nschema_version: ${version}\nproducto: benchmark\ncimientos:\n  rutas: [README.md, openspec/, .control-tower/, .control-tower-adoption-v1/, .agents/, .claude/]\nsesiones: []\n`;

// Compare full streams before bounding report excerpts; never normalize semantic fields.
function compareRadar(name, flow, canonical, head) {
  const diff = [];
  for (const field of ["code", "stdout", "stderr"]) if (flow[field] !== canonical[field]) diff.push(`${field} differs`);
  if (head.before !== head.afterFlow || head.before !== head.afterCanonical) diff.push("fixture HEAD changed");
  if (name === "valid") {
    let left, right;
    try { left = JSON.parse(flow.stdout); right = JSON.parse(canonical.stdout); }
    catch { diff.push("valid case did not emit JSON on both sides"); }
    if (!isDeepStrictEqual(left, right)) diff.push("JSON differs (all semantic fields retained)");
    if (left?.schema !== "radar.snapshot/v1" || right?.schema !== "radar.snapshot/v1") diff.push("unexpected snapshot schema");
    if (left?.head !== right?.head || left?.head !== head.before) diff.push("snapshot HEAD mismatch");
    if (flow.code !== 0 || canonical.code !== 0) diff.push("valid case exited nonzero");
  } else if (flow.code === 0 || canonical.code === 0) diff.push("error case exited zero");
  const bounded = (outcome) => ({ code: outcome.code, stdout: tail(outcome.stdout), stderr: tail(outcome.stderr) });
  return { name, status: diff.length ? "different" : "equal", flow: bounded(flow), canonical: bounded(canonical), head,
    ...(diff.length ? { diff } : {}) };
}

/** Flow builds installed sources; canonical builds repository sources independently.
 * The operator module cache is reused offline; writable build caches remain disposable.
 * canonicalSource and spawn are test seams, not CLI overrides or fallback paths.
 */
export async function runRadarContrast({ env = process.env, spawn = spawnHost, timeoutMs = DEFAULT_TIMEOUT_MS,
  canonicalSource = canonicalRadar } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) throw new Error("invalid options");
  const result = { flow: { source: "<fixture>/.control-tower/radar", command: "go build; <flow-bin> status --json -C <fixture>" },
    canonical: { source: canonicalSource, command: "go build; <canonical-bin> status --json -C <fixture>" }, cases: [] };
  const blocked = (reason) => { result.cases = radarCases.map(name => ({ name, status: "blocked", reason })); return result; };
  const go = Bun.which("go", { PATH: env.PATH ?? "" });
  if (!go) return blocked("go missing");
  if (!existsSync(join(canonicalSource, "go.mod"))) return blocked("canonical source missing (no adopted-copy fallback)");
  const base = mkdtempSync(join(tmpdir(), "tower-radar-"));
  try {
    let resolved;
    try {
      resolved = await spawn([go, "env", "GOMODCACHE"], { cwd: canonicalSource, timeoutMs,
        env: { ...env, GOFLAGS: "-mod=readonly", GOPROXY: "off", GOTOOLCHAIN: "local" } });
    } catch (error) { return blocked(`GOMODCACHE resolution failed: ${tail(error.message)}`); }
    const moduleCache = resolved.stdout?.trim() ?? "";
    if (resolved.code !== 0 || !isAbsolute(moduleCache) || /[\r\n\0]/.test(moduleCache))
      return blocked(`GOMODCACHE resolution failed: ${tail(resolved.stderr) || "invalid absolute cache path"}`);
    const isolated = { PATH: env.PATH ?? "", HOME: join(base, "home"), TMPDIR: join(base, "tmp"),
      GOMODCACHE: moduleCache, GOCACHE: join(base, "go-cache"), GOPATH: join(base, "go-path"), GOFLAGS: "-mod=readonly", GOPROXY: "off",
      GOSUMDB: "off", GOTOOLCHAIN: "local", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" };
    for (const field of ["HOME", "TMPDIR", "GOCACHE", "GOPATH"]) mkdirSync(isolated[field]);
    const roots = radarCases.map(name => join(base, name));
    for (const [i, root] of roots.entries()) fixture(root, true, isolated, timeoutMs,
      i === 1 ? null : minimalPlan(i === 2 ? 2 : 3));
    const bins = [join(base, "flow-radar"), join(base, "canonical-radar")];
    const sources = [join(roots[0], ".control-tower/radar"), canonicalSource];
    for (const [i, source] of sources.entries()) {
      const build = await spawn([go, "build", "-o", bins[i], "."], { cwd: source, env: isolated, timeoutMs });
      if (build.code !== 0) return blocked(`${i ? "canonical" : "flow"} build failed: ${tail(build.stderr)}`);
    }
    const readHead = (cwd) => {
      const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd, env: isolated, timeout: timeoutMs, killSignal: "SIGKILL", encoding: "utf8" });
      if (git.error || git.status !== 0) throw new Error("fixture HEAD unavailable");
      return git.stdout.trim();
    };
    for (const [i, cwd] of roots.entries()) {
      try {
        const before = readHead(cwd);
        const options = { cwd, env: isolated, timeoutMs };
        const flow = await spawn([bins[0], "status", "--json", "-C", cwd], options);
        const afterFlow = readHead(cwd);
        const canonical = await spawn([bins[1], "status", "--json", "-C", cwd], options);
        const afterCanonical = readHead(cwd);
        result.cases.push(compareRadar(radarCases[i], flow, canonical, { before, afterFlow, afterCanonical }));
      } catch (error) { result.cases.push({ name: radarCases[i], status: "blocked", reason: tail(error.message) }); }
    }
    return result;
  } catch (error) { return blocked(`Radar setup/build blocked: ${tail(error.message)}`); }
  finally { rmSync(base, { recursive: true, force: true }); }
}

/** Independent host request captures and deterministic Radar contrast. */
export async function runBenchmark({ hosts = ["pi", "claude"], realModel = false, prompt = DEFAULT_PROMPT,
  env = process.env, binaries = {}, spawn = spawnHost, upstream, timeoutMs = DEFAULT_TIMEOUT_MS, radar = true } = {}) {
  if (!Array.isArray(hosts) || !hosts.length || new Set(hosts).size !== hosts.length || hosts.some((h) => !["pi", "claude"].includes(h))) throw new Error("invalid hosts");
  if (typeof prompt !== "string" || !prompt || typeof realModel !== "boolean" || typeof radar !== "boolean" ||
    !Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) throw new Error("invalid options");
  if (realModel && !env.ANTHROPIC_API_KEY) throw new Error("--real-model requires ANTHROPIC_API_KEY in environment");
  const report = { schema: "tower.v1.benchmark/1", mode: realModel ? "real-model" : "capture-only", prompt, definition, hosts: {},
    limits: ["Captures prove only the observed flow, not security, absence of side effects or lifecycle reversibility.",
      "Bytes are host request bytes for this host version/model/prompt/HEAD; not token counts or general savings.",
      "Behavior is not_measured without the real-model key."] };
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
          const cwd = join(arm, "project"); fixture(cwd, adopted, isolated, timeoutMs);
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
            const version = await spawn([binary, "--version"], { cwd, env: isolated, timeoutMs });
            if (version.code !== 0 || !version.stdout.trim()) throw new Error(`${reason}: ${tail(version.stderr)}`);
            versions.push(version.stdout.trim());
            reason = "host execution failed";
            const outcome = await spawn([binary, ...args], { cwd, env: isolated, timeoutMs });
            try { arms.push(capture.measure()); } catch (error) { throw new Error(`${error.message}: ${tail(outcome.stderr)}`); }
            signals.push(...capture.signals());
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
  report.radar = radar ? await runRadarContrast({ env, spawn, timeoutMs }) :
    { flow: { source: "<fixture>/.control-tower/radar" }, canonical: { source: canonicalRadar }, cases: radarCases.map(name => ({ name, status: "blocked", reason: "Radar disabled by caller" })) };
  // Also guard operator-supplied prompts and host diagnostics against credential echo.
  return JSON.parse(JSON.stringify(report, (_field, value) => typeof value === "string" && env.ANTHROPIC_API_KEY ?
    value.split(env.ANTHROPIC_API_KEY).join("[REDACTED]") : value));
}

export async function main(argv, { stdout = process.stdout, stderr = process.stderr, ...options } = {}) {
  try {
    const parsed = {}, seen = new Set();
    for (let i = 0; i < argv.length; i++) {
      const flag = argv[i];
      if (!["--hosts", "--real-model", "--prompt", "--radar"].includes(flag) || seen.has(flag)) throw new Error("invalid or duplicate flag");
      seen.add(flag);
      if (flag === "--real-model") { parsed.realModel = true; continue; }
      if (flag === "--radar") { parsed.radar = true; continue; }
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error("missing flag value");
      if (flag === "--hosts") parsed.hosts = value.split(","); else parsed.prompt = value;
    }
    const report = await runBenchmark({ ...options, ...parsed }); stdout.write(`${JSON.stringify(report)}\n`);
    if (Object.values(report.hosts).some((result) => result.status === "blocked") || report.radar.cases.some(c => c.status !== "equal")) {
      stderr.write("Invalid Tower benchmark CLI: host or Radar blocked/different; see report\n"); return 1;
    }
    return 0;
  } catch { stderr.write("Invalid Tower benchmark CLI: invalid options or unavailable required key\n"); return 1; }
}
if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
