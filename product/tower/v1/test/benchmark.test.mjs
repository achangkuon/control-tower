import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runBenchmark, createCapture, main } from "../benchmark.mjs";

async function fake(mode, fn) {
  const root = mkdtempSync(join(tmpdir(), "tower-bench-test-"));
  const bin = join(root, "bin"); mkdirSync(bin);
  const script = `#!${process.execPath}
import { existsSync, readFileSync } from 'node:fs';
const adopted = existsSync('.agents/skills/control-tower/SKILL.md');
if (process.argv.includes('--version')) { console.log(${JSON.stringify(mode)} === 'version' && adopted ? 'fake-2' : 'fake-1'); process.exit(0); }
const host = process.argv[1].endsWith('/pi') ? 'pi' : 'claude';
const config = host === 'pi' ? JSON.parse(readFileSync(process.env.PI_CODING_AGENT_DIR + '/models.json')).providers.capture : null;
if (config?.api === 'anthropic-messages' && config.apiKey !== 'ANTHROPIC_API_KEY') throw Error('persisted key');
const base = config ? config.baseUrl.replace(/\\/v1$/, '') : process.env.ANTHROPIC_BASE_URL;
const path = ${JSON.stringify(mode)} === 'unexpected' ? '/wrong' : host === 'pi' && config.api === 'openai-completions' ? '/v1/chat/completions' : '/v1/messages?beta=true';
const body = { system: 'hé' + (adopted ? ' adopted' : ''), tools: [{name:'read'}], messages:[{role:'user', content:process.argv[process.argv.indexOf('-p')+1]}] };
if (${JSON.stringify(mode)} !== 'none') {
  await fetch(base + path, {method:'POST', body:JSON.stringify(body), headers:{'x-api-key':'fake-secret'}});
  await fetch(base + path, {method:'POST', body:JSON.stringify({...body, system:'retry ignored'})});
}
`;
  for (const host of ["pi", "claude"]) writeFileSync(join(bin, host), script, { mode: 0o755 });
  try { await fn({ env: { PATH: `${bin}:${process.env.PATH}` }, root }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

test("paired clean fixtures, isolated environment, first inference bytes and retries", async () => {
  await fake("normal", async ({ env }) => {
    const observations = [];
    const spawn = async (cmd, options) => {
      expect(options.env.HOME).not.toBe(process.env.HOME);
      expect(options.env).not.toHaveProperty("SECRET_SENTINEL");
      const git = (...args) => spawnSync("git", args, { cwd: options.cwd, env: options.env }).stdout.toString().trim();
      expect(git("status", "--porcelain")).toBe("");
      expect(git("rev-list", "--count", "HEAD")).toBe("2");
      expect(git("log", "--format=%s")).toBe("prepare arm\nseed");
      observations.push(options.cwd);
      const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
      return { code: await proc.exited, stdout: await new Response(proc.stdout).text() };
    };
    const report = await runBenchmark({ env: { ...env, SECRET_SENTINEL: "never forwarded" }, spawn });
    for (const host of ["pi", "claude"]) {
      const result = report.hosts[host];
      expect(result.status).toBe("measured");
      expect(result.version).toBe("fake-1");
      expect(result.nonAdopter.systemTextBytes).toBe(3);
      expect(result.adopter.systemTextBytes).toBe(11);
      expect(result.delta.requestBodyBytes).toBe(8);
      expect(result.nonAdopter.firstUserMessageBytes).toBe(Buffer.byteLength("What does this project do?"));
      expect(result.nonAdopter.toolSchemaBytes).toBe(Buffer.byteLength(JSON.stringify([{ name: "read" }])));
      expect(result.behavior.status).toBe("not_measured");
    }
    for (const path of observations) expect(existsSync(path)).toBe(false);
  });
});

for (const mode of ["none", "unexpected", "version"]) test(`blocked ${mode} contains no byte figures`, async () => {
  await fake(mode, async ({ env }) => {
    const result = (await runBenchmark({ env, hosts: ["pi"] })).hosts.pi;
    expect(result.status).toBe("blocked");
    expect(result.reason).toMatch(/request|version/);
    expect(JSON.stringify(result)).not.toContain("Bytes");
  });
});

test("missing binary blocks without proxy measurements", async () => {
  const result = (await runBenchmark({ hosts: ["pi"], binaries: { pi: "/nonexistent/tower-benchmark-pi" } })).hosts.pi;
  expect(result.status).toBe("blocked");
  expect(result.reason).toContain("binary");
  expect(result).not.toHaveProperty("delta");
});

test("explicit real mode requires key, capture-only ignores inherited keys", async () => {
  await expect(runBenchmark({ realModel: true, env: { PATH: process.env.PATH } })).rejects.toThrow("ANTHROPIC_API_KEY");
  await fake("normal", async ({ env }) => {
    const report = await runBenchmark({ prompt: "do-not-forward", env: { ...env, ANTHROPIC_API_KEY: "do-not-forward" } });
    expect(report.prompt).toBe("[REDACTED]");
    expect(JSON.stringify(report)).not.toContain("do-not-forward");
    expect(report.hosts.pi.behavior.status).toBe("not_measured");
  });
});

test("recording proxy forwards only to fake upstream, redacts and detects executed tools, not listings", async () => {
  let received;
  const upstream = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(req) {
    received = { key: req.headers.get("x-api-key"), body: await req.text() };
    return Response.json({ content: [{ type: "tool_use", name: "Read", input: { file_path: ".agents/skills/control-tower/SKILL.md" } }] });
  } });
  const capture = createCapture({ host: "pi", realModel: true, key: "fake-secret", upstream: upstream.url.origin });
  try {
    const body = JSON.stringify({ system: "listing: control-tower", tools: [], messages: [{role:"user",content:"question"}] });
    await fetch(capture.url + "/v1/messages", { method: "POST", body, headers: { Authorization: "Bearer fake-secret", "x-api-key": "fake-secret" } });
    expect(received.body).toBe(body);
    expect(received.key).toBe("fake-secret");
    expect(JSON.stringify(capture.records)).not.toContain("fake-secret");
    expect(capture.signals()).toEqual(["control-tower skill read"]);
    expect(capture.measure().requestBodyBytes).toBe(Buffer.byteLength(body));
  } finally { capture.stop(); upstream.stop(true); }
});

test("real-model paired hosts use recording anthropic route without persisting keys", async () => {
  const upstream = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(req) {
    expect(new URL(req.url).pathname).toBe("/v1/messages");
    return Response.json({ content: [{ type: "tool_use", name: "Skill", input: { skill: "control-tower" } }] });
  } });
  try {
    await fake("normal", async ({ env }) => {
      const report = await runBenchmark({ realModel: true, env: { ...env, ANTHROPIC_API_KEY: "fake-secret" }, upstream: upstream.url.origin });
      for (const host of ["pi", "claude"]) {
        expect(report.hosts[host].status).toBe("measured");
        expect(report.hosts[host].behavior).toEqual({status:"accidental_selection", signals:["control-tower invocation"]});
      }
      expect(JSON.stringify(report)).not.toContain("fake-secret");
    });
  } finally { upstream.stop(true); }
});

test("SSE partial tool arguments detect Radar and ordinary listings do not", async () => {
  const upstream = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch() {
    return new Response('data: {"type":"content_block_start","content_block":{"type":"tool_use","name":"Bash","input":{}}}\n\ndata: {"type":"content_block_delta","delta":{"partial_json":"{\\"command\\":\\"bun .control-tower/radar/run\\"}"}}\n\n');
  } });
  const capture = createCapture({ host: "claude", realModel: true, upstream: upstream.url.origin });
  try {
    await fetch(capture.url + "/v1/messages", { method: "POST", body: JSON.stringify({system:"control-tower radar", tools:[], messages:[{role:"user",content:"ordinary"}]}) });
    expect(capture.signals()).toContain("radar execution");
  } finally { capture.stop(); upstream.stop(true); }
});

test("tool schema listings never count as invocation and later unexpected requests block", async () => {
  const capture = createCapture({ host: "pi" });
  try {
    await fetch(capture.url + "/v1/chat/completions", { method: "POST", body: JSON.stringify({
      messages: [{ role: "user", content: "ordinary" }], tools: [{type:"function", function:{name:"control-tower"}}]
    }) });
    expect(capture.signals()).toEqual([]);
    await fetch(capture.url + "/unknown", {method:"POST", body:"{}"});
    expect(() => capture.measure()).toThrow("ambiguous");
  } finally { capture.stop(); }
});

test("closed CLI failures use stderr and exit 1", async () => {
  for (const args of [["--wat"], ["--hosts", "other"], ["--real-model", "--real-model"], ["--prompt"], ["--hosts", "pi,pi"]]) {
    let out = "", err = "";
    expect(await main(args, { stdout: {write:s => out += s}, stderr: {write:s => err += s}, env: {} })).toBe(1);
    expect(out).toBe(""); expect(err).toStartWith("Invalid Tower benchmark CLI:");
  }
});
