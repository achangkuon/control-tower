type InputSource = "interactive" | "rpc" | "extension";
type StreamingBehavior = "steer" | "followUp" | undefined;

export interface TowerInputEvent {
  readonly text: string; readonly images?: readonly unknown[];
  readonly source: InputSource; readonly streamingBehavior?: StreamingBehavior;
}

export interface ApprovedTowerContext {
  readonly skillLocation: string; readonly skillBase: string;
  readonly skillBody: string; readonly enrollment: "approved";
}

export type TowerEnrollmentResult =
  | Readonly<{ enrollment: "ordinary" }>
  | Readonly<{ enrollment: "unsafe"; reason: "unsafe" | "corrupt" | "ambiguous" }>
  | ApprovedTowerContext;

type InputResult =
  | Readonly<{ action: "continue" | "handled" }>
  | Readonly<{ action: "transform"; text: string }>;
type RouterContext = {
  isIdle(): boolean;
  ui: { notify(message: string, level: "error"): void };
};
type PiApi = {
  on(event: "input", handler: ReturnType<typeof createTowerSessionRouter>): void;
};
export type TowerEnrollmentResolver = (pi: PiApi) => TowerEnrollmentResult;

function evidence(code: string, reason: string) {
  return Object.freeze({ code, kind: "tower-input-rejected", reason, modelTurn: false });
}

export const TOWER_INPUT_ERRORS = Object.freeze({
  INVALID: evidence("CT_PI_TOWER_INPUT_INVALID", "Tower-shaped input is outside the closed grammar"),
  ENROLLMENT: evidence("CT_PI_TOWER_ENROLLMENT_UNSAFE", "Tower enrollment evidence is unsafe"),
  IMAGES: evidence("CT_PI_TOWER_INPUT_IMAGES", "Tower session intent must contain text only"),
  NOT_IDLE: evidence("CT_PI_TOWER_INPUT_NOT_IDLE", "Tower session intent is accepted only while idle"),
  SOURCE: evidence("CT_PI_TOWER_INPUT_SOURCE", "Tower session intent requires interactive or RPC input"),
});

const CONTINUE = Object.freeze({ action: "continue" } as const);
const HANDLED = Object.freeze({ action: "handled" } as const);
const PHRASES = [
  "empezamos la sesión",
  "continuemos con la implementación",
  "start session",
  "resume implementation",
] as const;
const EXACT = new RegExp(
  `^(${PHRASES.join("|")})(?:[.!…])?(?:\\s*(?::|—)\\s*(.+))?$`,
  "iu",
);
const KICKOFF = /^\/skill:session-kickoff(?:\s+(.+))?$/u;
const TOWER_SHAPED = /empezamos la sesi[oó]n|continuemos con la implementaci[oó]n|start session|resume implementation|\/skill:session-kickoff/iu;

function normalize(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function reject(ctx: RouterContext, error: object): InputResult {
  ctx.ui.notify(JSON.stringify(error), "error");
  return HANDLED;
}

export function createTowerSessionRouter(input: TowerEnrollmentResult) {
  if (!input || !["ordinary", "unsafe", "approved"].includes(input.enrollment)) {
    throw new Error("CT_PI_TOWER_CONTEXT_INVALID");
  }
  if (
    input.enrollment === "approved" &&
    (!input.skillLocation || !input.skillBase || !input.skillBody)
  ) {
    throw new Error("CT_PI_TOWER_CONTEXT_INVALID");
  }
  const approved = input.enrollment === "approved"
    ? Object.freeze({
        skillLocation: input.skillLocation,
        skillBase: input.skillBase,
        skillBody: input.skillBody,
      })
    : null;

  return async (event: TowerInputEvent, ctx: RouterContext): Promise<InputResult> => {
    const normalized = normalize(event.text);
    const match = normalized.match(EXACT);
    const kickoff = normalized.match(KICKOFF);
    const towerShaped = Boolean(match || kickoff || TOWER_SHAPED.test(normalized));
    if (!towerShaped || input.enrollment === "ordinary") return CONTINUE;
    if (input.enrollment === "unsafe") {
      return reject(ctx, TOWER_INPUT_ERRORS.ENROLLMENT);
    }
    if (event.source !== "interactive" && event.source !== "rpc") {
      return reject(ctx, TOWER_INPUT_ERRORS.SOURCE);
    }
    if (event.images?.length) return reject(ctx, TOWER_INPUT_ERRORS.IMAGES);
    if (event.streamingBehavior !== undefined || !ctx.isIdle()) {
      return reject(ctx, TOWER_INPUT_ERRORS.NOT_IDLE);
    }
    if (!match && !kickoff) return reject(ctx, TOWER_INPUT_ERRORS.INVALID);

    const intent = match ? match[1].toLocaleLowerCase("und") : "session-kickoff";
    const explicitSessionOrTopic = normalize((match?.[2] ?? kickoff?.[1]) || "") || null;
    const sessionContext = { intent, explicitSessionOrTopic, originalIntent: event.text };
    const text = [
      `<skill name="torre-control" location="${approved.skillLocation}">`,
      `References are relative to ${approved.skillBase}.`,
      "",
      approved.skillBody,
      "</skill>",
      "",
      `<tower-session-context>${JSON.stringify(sessionContext)}</tower-session-context>`,
    ].join("\n");
    return Object.freeze({ action: "transform", text });
  };
}

const ORDINARY_ENROLLMENT = Object.freeze({ enrollment: "ordinary" } as const);

export function createTowerSessionExtension(
  resolveEnrollment: TowerEnrollmentResolver = () => ORDINARY_ENROLLMENT,
) {
  return (pi: PiApi): void => {
    const enrollment = resolveEnrollment(pi);
    pi.on("input", createTowerSessionRouter(enrollment));
  };
}

const towerSessionRouter = createTowerSessionExtension();
export default towerSessionRouter;
