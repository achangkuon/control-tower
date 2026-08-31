import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import towerSessionRouter, {
  createTowerEnrollmentResolver,
  createTowerSessionExtension,
  createTowerSessionRouter,
  TOWER_INPUT_ERRORS,
} from "../../../extensions/pi/tower-session-router.ts";

const approved = Object.freeze({
  skillLocation: "/validated/skills/torre-control/SKILL.md",
  skillBase: "/validated/skills/torre-control",
  skillBody: "Captured validated Tower bytes.",
  enrollment: "approved",
});

function event(text, overrides = {}) {
  return {
    text,
    images: [],
    source: "interactive",
    streamingBehavior: undefined,
    ...overrides,
  };
}

function harness() {
  const notifications = [];
  const route = createTowerSessionRouter(approved);
  const ctx = {
    isIdle: () => true,
    ui: { notify: (message, level) => notifications.push({ message, level }) },
  };
  return { notifications, route, ctx };
}

function expanded(context) {
  return [
    '<skill name="torre-control" location="/validated/skills/torre-control/SKILL.md">',
    "References are relative to /validated/skills/torre-control.",
    "",
    "Captured validated Tower bytes.",
    "</skill>",
    "",
    `<tower-session-context>${JSON.stringify(context)}</tower-session-context>`,
  ].join("\n");
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function activationFixture(overrides = {}) {
  const packageUrl = new URL("../../../extensions/pi/package.json", import.meta.url);
  const manifest = JSON.parse(await readFile(packageUrl, "utf8"));
  const compatibility = structuredClone(manifest.controlTowerCompatibility);
  if (overrides.capabilities) compatibility.requiredCapabilities = overrides.capabilities(compatibility.requiredCapabilities);
  if (overrides.transforms) compatibility.reviewedTransforms = overrides.transforms(compatibility.reviewedTransforms);
  manifest.controlTowerCompatibility = compatibility;
  const manifestBytes = JSON.stringify(manifest);
  const skillBytes = "Captured immutable Tower skill bytes.";
  const identity = {
    root: { realpath: "/physical/repo", device: "1", inode: "2" },
    gitCommonDir: { realpath: "/physical/repo/.git", device: "1", inode: "3" },
  };
  const manifestSource = overrides.manifestSource ?? "/payload/package.json";
  const skillBase = overrides.skillBase ?? "/payload/skills/torre-control";
  const evidence = {
    schema: "control-tower-pi-activation/v1", repo: identity,
    payload: { root: "/payload", manifestPath: "/payload/package.json" },
    capabilityFingerprint: overrides.fingerprint ?? digest(JSON.stringify(compatibility)),
    requiredCapabilities: compatibility.requiredCapabilities,
    reviewedTransforms: compatibility.reviewedTransforms,
    snapshot: {
      manifest: { sourcePath: manifestSource, capturedPath: "/snapshot/package.json", sha256: overrides.manifestDigest ?? digest(manifestBytes) },
      skill: { sourcePath: `${skillBase}/SKILL.md`, base: skillBase, capturedPath: "/snapshot/SKILL.md", sha256: overrides.skillDigest ?? digest(skillBytes) },
    },
  };
  const readers = (local = {}) => {
    let drift = false;
    const candidates = Object.hasOwn(local, "candidates")
      ? local.candidates : (local.duplicate ? [evidence, structuredClone(evidence)] : [evidence]);
    return {
      payloadRoot: "/payload", manifestPath: "/payload/package.json",
      currentRepo: () => local.identity ?? identity,
      readActivationEvidence: () => candidates,
      readBytes: (path) => {
        const value = path.endsWith("package.json") ? manifestBytes : skillBytes;
        return drift && (path === manifestSource || path === `${skillBase}/SKILL.md`) ? `${value}x` : value;
      },
      sha256: digest, drift: () => { drift = true; }, piVersion: local.piVersion,
    };
  };
  return { evidence, readers, skillBytes, identity };
}

describe("Pi Tower session router", () => {
  test("declares a closed capability contract with a tested-only Pi baseline", async () => {
    const manifestUrl = new URL("../../../extensions/pi/package.json", import.meta.url);
    const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

    expect(manifest.controlTowerCompatibility).toEqual({
      contract: "pi-input-extension-capabilities/v1",
      testedBaseline: { piVersion: "0.84.4" },
      activationEvidence: {
        schema: "control-tower-pi-activation/v1",
        path: "./control-tower-activation.json",
          exactBinding: ["repo.root.realpath+device+inode", "repo.gitCommonDir.realpath+device+inode"],
        immutableSnapshot: ["manifest", "skill"],
      },
      requiredCapabilities: [
        "extension.default-export.factory-arity-1",
        "events.input.registration.pi-on-input",
        "events.input.shape.text-images-source-streamingBehavior",
        "events.input.result.continue-transform-handled",
        "ui.local-notification",
        "transforms.reviewed-inventory-and-order",
      ],
      reviewedTransforms: [
        { order: 1, id: "tower-session-router", entrypoint: "./tower-session-router.ts" },
      ],
    });
    expect(manifest.pi).toEqual({ extensions: ["./tower-session-router.ts"] });
    expect(manifest).not.toHaveProperty("engines");
    expect(manifest).not.toHaveProperty("dependencies");
    expect(manifest).not.toHaveProperty("peerDependencies");
    expect(JSON.stringify(manifest.controlTowerCompatibility)).not.toMatch(
      /(?:min(?:imum)?Version|max(?:imum)?Version|versionRange|semver|accept(?:ed|s)?Version)/iu,
    );
  });

  test.each([
    ["empezamos la sesión", "empezamos la sesión"],
    ["continuemos con la implementación", "continuemos con la implementación"],
    ["start session", "start session"],
    ["resume implementation", "resume implementation"],
    ["resume implementation: S9.6 interceptor", "resume implementation"],
    ["  START\tSESSION!  ", "start session"],
    ["empezamos la sesio\u0301n —  S9.6   interceptor ", "empezamos la sesión"],
  ])("transforms the closed normalized form %s", async (input, intent) => {
    const { route, ctx, notifications } = harness();
    const explicit = /[:—]/u.test(input) ? "S9.6 interceptor" : null;

    expect(await route(event(input), ctx)).toEqual({
      action: "transform",
      text: expanded({ intent, explicitSessionOrTopic: explicit, originalIntent: input }),
    });
    expect(notifications).toEqual([]);
  });

  test("rewrites explicit session-kickoff without routing through a literal skill command", async () => {
    const { route, ctx } = harness();
    const input = "/skill:session-kickoff   S9.6  interceptor";
    const result = await route(event(input, { source: "rpc" }), ctx);

    expect(result).toEqual({
      action: "transform",
      text: expanded({
        intent: "session-kickoff",
        explicitSessionOrTopic: "S9.6 interceptor",
        originalIntent: input,
      }),
    });
    const routeBlock = result.text.split("<tower-session-context>")[0];
    expect(routeBlock).not.toContain("/skill:torre-control");
    expect(routeBlock).not.toContain("/skill:session-kickoff");
  });

  test.each([
    "do not start session",
    "start session?",
    '"start session"',
    "The phrase start session is descriptive",
    "please start session now",
    "example: `resume implementation`",
  ])("handles Tower-shaped invalid input without a model turn: %s", async (input) => {
    const { route, ctx, notifications } = harness();

    expect(await route(event(input), ctx)).toEqual({ action: "handled" });
    expect(notifications).toEqual([
      { message: JSON.stringify(TOWER_INPUT_ERRORS.INVALID), level: "error" },
    ]);
  });

  test.each([
    "begin session",
    "explicá la implementación del parser",
    "la sesión anterior terminó",
    "podemos empezar mañana",
  ])("leaves unrelated uses of broad keywords unchanged: %s", async (input) => {
    const { route, ctx, notifications } = harness();

    expect(await route(event(input), ctx)).toEqual({ action: "continue" });
    expect(notifications).toEqual([]);
  });

  test.each([
    [event("start session", { images: [{ type: "image" }] }), "IMAGES"],
    [event("start session", { streamingBehavior: "followUp" }), "NOT_IDLE"],
    [event("start session", { source: "extension" }), "SOURCE"],
  ])("fails closed for ineligible Tower input %#", async (input, errorKey) => {
    const { route, ctx, notifications } = harness();

    expect(await route(input, ctx)).toEqual({ action: "handled" });
    expect(notifications).toEqual([
      { message: JSON.stringify(TOWER_INPUT_ERRORS[errorKey]), level: "error" },
    ]);
  });

  test("uses ctx idle state and leaves ordinary input byte-identical", async () => {
    const { route, ctx, notifications } = harness();
    ctx.isIdle = () => false;
    expect(await route(event("start session"), ctx)).toEqual({ action: "handled" });
    expect(notifications.at(-1)).toEqual({
      message: JSON.stringify(TOWER_INPUT_ERRORS.NOT_IDLE),
      level: "error",
    });

    expect(await route(event("  explain session storage exactly  "), ctx)).toEqual({ action: "continue" });
  });

  test("handler failures remain handled when notification or idle checks throw", async () => {
    const { route } = harness();
    const throwingNotify = { isIdle: () => true, ui: { notify: () => { throw new Error("ui"); } } };
    expect(await route(event("start session?"), throwingNotify)).toEqual({ action: "handled" });
    const throwingIdle = { isIdle: () => { throw new Error("idle"); }, ui: { notify: () => { throw new Error("ui"); } } };
    expect(await route(event("start session"), throwingIdle)).toEqual({ action: "handled" });
  });

  test("the one-argument default extension factory registers and safely continues", async () => {
    let registered;
    const pi = {
      on: (name, handler) => {
        expect(name).toBe("input");
        registered = handler;
      },
    };

    expect(() => towerSessionRouter(pi)).not.toThrow();
    expect(typeof registered).toBe("function");
    const ctx = { isIdle: () => true, ui: { notify: () => {} } };
    expect(await registered(event("start session"), ctx)).toEqual({ action: "continue" });
  });

  test("explicit enrollment results distinguish ordinary from unsafe Tower evidence", async () => {
    const ctx = { isIdle: () => true, ui: { notify: () => {} } };
    const ordinary = createTowerSessionRouter({ enrollment: "ordinary" });
    expect(await ordinary(event("start session"), ctx)).toEqual({ action: "continue" });

    for (const reason of ["unsafe", "corrupt", "ambiguous"]) {
      const notifications = [];
      const unsafe = createTowerSessionRouter({ enrollment: "unsafe", reason });
      const unsafeCtx = {
        isIdle: () => true,
        ui: { notify: (message, level) => notifications.push({ message, level }) },
      };
      expect(await unsafe(event("start session"), unsafeCtx)).toEqual({ action: "handled" });
      expect(notifications).toEqual([
        { message: JSON.stringify(TOWER_INPUT_ERRORS.ENROLLMENT), level: "error" },
      ]);
    }
  });

  test("allows M9.6.2 to inject enrollment without changing routing grammar", async () => {
    let registered;
    const extension = createTowerSessionExtension(() => approved);
    extension({ on: (_name, handler) => { registered = handler; } });
    const ctx = { isIdle: () => true, ui: { notify: () => {} } };

    expect(await registered(event("start session"), ctx)).toEqual({
      action: "transform",
      text: expanded({
        intent: "start session",
        explicitSessionOrTopic: null,
        originalIntent: "start session",
      }),
    });
  });

  test("captures approved bytes once and rejects mutable context", () => {
    expect(() =>
      createTowerSessionRouter({ ...approved, enrollment: "unapproved" }),
    ).toThrow("CT_PI_TOWER_CONTEXT_INVALID");
  });

  test("admits one exact repo/worktree snapshot and ignores Pi versions", async () => {
    const fixture = await activationFixture();
    for (const piVersion of ["0.84.4", "999.0.0"]) {
      const enrollment = createTowerEnrollmentResolver(fixture.readers({ piVersion }))();
      expect(enrollment).toMatchObject({ enrollment: "approved", skillLocation: fixture.evidence.snapshot.skill.sourcePath,
        skillBase: "/payload/skills/torre-control", skillBody: fixture.skillBytes });
      expect(enrollment.sourceIsCurrent()).toBe(true);
    }
    const other = structuredClone(fixture.identity); other.root.inode = "99";
    expect(createTowerEnrollmentResolver(fixture.readers({ identity: other }))()).toEqual({ enrollment: "ordinary" });
    expect(createTowerEnrollmentResolver(fixture.readers({ identity: { root: "/repo", gitCommonDir: "/repo/.git" } }))()).toEqual({ enrollment: "ordinary" });
    const alias = structuredClone(fixture.evidence); alias.repo = { root: "/repo", gitCommonDir: "/repo/.git" };
    expect(createTowerEnrollmentResolver(fixture.readers({ candidates: [alias] }))()).toEqual({ enrollment: "unsafe", reason: "corrupt" });
    expect(createTowerEnrollmentResolver(fixture.readers({ candidates: [] }))()).toEqual({ enrollment: "ordinary" });
    const absent = fixture.readers({ candidates: null });
    let repoCaptured = false;
    absent.currentRepo = () => { repoCaptured = true; return fixture.identity; };
    expect(createTowerEnrollmentResolver(absent)()).toEqual({ enrollment: "ordinary" });
    expect(repoCaptured).toBe(false);
  });

  test.each([
    ["unsafe evidence container", { candidates: "bad" }, "corrupt"],
    ["ambiguous exact bindings", { duplicate: true }, "ambiguous"],
    ["manifest digest mismatch", { manifestDigest: "0".repeat(64) }, "corrupt"],
    ["skill digest mismatch", { skillDigest: "0".repeat(64) }, "corrupt"],
    ["manifest provenance mismatch", { manifestSource: "/other/package.json" }, "unsafe"],
    ["skill provenance mismatch", { skillBase: "/other" }, "unsafe"],
    ["missing capability", { capabilities: (values) => values.slice(1) }, "unsafe"],
    ["unknown capability", { capabilities: (values) => [...values, "unknown"] }, "unsafe"],
    ["missing transform", { transforms: () => [] }, "unsafe"],
    ["duplicate transform", { transforms: (values) => [...values, values[0]] }, "unsafe"],
    ["unknown transform", { transforms: () => [{ order: 1, id: "other", entrypoint: "./x" }] }, "unsafe"],
    ["unordered transform", { transforms: (values) => [{ ...values[0], order: 2 }] }, "unsafe"],
    ["capability fingerprint mismatch", { fingerprint: "0".repeat(64) }, "corrupt"],
  ])("fails closed for %s", async (_name, overrides, reason) => {
    const fixture = await activationFixture(overrides);
    expect(createTowerEnrollmentResolver(fixture.readers(overrides))()).toEqual({ enrollment: "unsafe", reason });
  });

  test("post-capture source drift is rejected at Tower route time", async () => {
    const fixture = await activationFixture();
    const readers = fixture.readers();
    const route = createTowerSessionRouter(createTowerEnrollmentResolver(readers)());
    readers.drift();
    const notifications = [];
    expect(await route(event("start session"), { isIdle: () => true, ui: { notify: (...args) => notifications.push(args) } })).toEqual({ action: "handled" });
    expect(notifications).toHaveLength(1);
  });

  test("same snapshot converges and failures avoid transform/model paths", async () => {
    const fixture = await activationFixture();
    const resolver = createTowerEnrollmentResolver(fixture.readers());
    expect(resolver()).toEqual(resolver());
    for (const enrollment of [{ enrollment: "ordinary" }, { enrollment: "unsafe", reason: "corrupt" }]) {
      let registered;
      let modelTurns = 0;
      createTowerSessionExtension(() => enrollment)({ on: (_event, handler) => { registered = handler; } });
      const notifications = [];
      const result = await registered(event("start session"), {
        isIdle: () => true, ui: { notify: (...args) => notifications.push(args) },
        model: { transform: () => modelTurns++ },
      });
      expect(result.action).toBe(enrollment.enrollment === "ordinary" ? "continue" : "handled");
      expect(modelTurns).toBe(0);
      expect(notifications.length).toBe(enrollment.enrollment === "ordinary" ? 0 : 1);
    }
  });

  test("checks factory, pi.on, event, source, UI and result capability seams", async () => {
    expect(createTowerSessionExtension(() => approved).length).toBe(1);
    expect(() => createTowerSessionExtension(() => approved)({})).toThrow("CT_PI_ON_INVALID");
    let unsafeRoute;
    expect(() => createTowerSessionExtension(() => { throw new Error("resolver"); })({ on: (_event, handler) => { unsafeRoute = handler; } })).not.toThrow();
    expect(await unsafeRoute(event("start session"), { isIdle: () => true, ui: { notify: () => {} } })).toEqual({ action: "handled" });
    const { route, ctx, notifications } = harness();
    for (const bad of [
      { text: 1, source: "interactive" },
      { text: "start session", source: "other" },
      { text: "start session", source: "interactive", images: "bad" },
    ]) expect(await route(bad, ctx)).toEqual({ action: "handled" });
    expect(notifications).toHaveLength(3);
    expect(await route(event("start session"), { isIdle: () => true, ui: {} })).toEqual({ action: "handled" });
  });
});
