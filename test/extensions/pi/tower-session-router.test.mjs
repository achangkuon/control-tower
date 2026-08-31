import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import towerSessionRouter, {
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

describe("Pi Tower session router", () => {
  test("declares a closed capability contract with a tested-only Pi baseline", async () => {
    const manifestUrl = new URL("../../../extensions/pi/package.json", import.meta.url);
    const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

    expect(manifest.controlTowerCompatibility).toEqual({
      contract: "pi-input-extension-capabilities/v1",
      testedBaseline: { piVersion: "0.84.4" },
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

    const ordinary = "  explain session storage exactly  ";
    expect(await route(event(ordinary), ctx)).toEqual({ action: "continue" });
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
});
