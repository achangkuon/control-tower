import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type InputSource = "interactive" | "rpc" | "extension";
type StreamingBehavior = "steer" | "followUp" | undefined;

export interface TowerInputEvent {
  readonly text: string; readonly images?: readonly unknown[];
  readonly source: InputSource; readonly streamingBehavior?: StreamingBehavior;
}

export interface ApprovedTowerContext {
  readonly skillLocation: string; readonly skillBase: string;
  readonly skillBody: string; readonly enrollment: "approved";
  readonly sourceIsCurrent?: () => boolean;
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
export type TowerEnrollmentResolver = (pi?: PiApi) => TowerEnrollmentResult;

type PhysicalPath = Readonly<{ realpath: string; device: string; inode: string }>;
type RepoIdentity = Readonly<{ root: PhysicalPath; gitCommonDir: PhysicalPath }>;
type ActivationReaders = Readonly<{
  readonly payloadRoot: string; readonly manifestPath: string;
  currentRepo(): RepoIdentity; readActivationEvidence(): unknown;
  readBytes(path: string): string; sha256(bytes: string): string;
}>;

const REQUIRED_CAPABILITIES = Object.freeze([
  "extension.default-export.factory-arity-1",
  "events.input.registration.pi-on-input",
  "events.input.shape.text-images-source-streamingBehavior",
  "events.input.result.continue-transform-handled",
  "ui.local-notification",
  "transforms.reviewed-inventory-and-order",
]);
const REVIEWED_TRANSFORMS = Object.freeze([
  Object.freeze({ order: 1, id: "tower-session-router", entrypoint: "./tower-session-router.ts" }),
]);
const ACTIVATION_FILE = "control-tower-activation.json";
const ACTIVATION_CONTRACT = Object.freeze({
  schema: "control-tower-pi-activation/v1", path: `./${ACTIVATION_FILE}`,
  exactBinding: ["repo.root.realpath+device+inode", "repo.gitCommonDir.realpath+device+inode"],
  immutableSnapshot: ["manifest", "skill"],
});
const ORDINARY_ENROLLMENT = Object.freeze({ enrollment: "ordinary" } as const);
const unsafe = (reason: "unsafe" | "corrupt" | "ambiguous"): TowerEnrollmentResult =>
  Object.freeze({ enrollment: "unsafe", reason });
const record = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const validSha = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);

const physical = (value: unknown): value is PhysicalPath => record(value) &&
  typeof value.realpath === "string" && typeof value.device === "string" && typeof value.inode === "string";
const repoIdentity = (value: unknown): value is RepoIdentity => record(value) && physical(value.root) && physical(value.gitCommonDir);
const samePhysical = (left: PhysicalPath, right: PhysicalPath) => left.realpath === right.realpath && left.device === right.device && left.inode === right.inode;
const beneath = (root: string, path: string) => {
  const rel = relative(root, path); return isAbsolute(root) && isAbsolute(path) && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel);
};

export function createTowerEnrollmentResolver(readers: ActivationReaders): TowerEnrollmentResolver {
  let cached: TowerEnrollmentResult | undefined;
  const resolveEnrollment = (): TowerEnrollmentResult => {
    let candidates: unknown;
    try { candidates = readers.readActivationEvidence(); } catch { return unsafe("corrupt"); }
    if (candidates === null || candidates === undefined) return ORDINARY_ENROLLMENT;
    if (!Array.isArray(candidates) || candidates.some((item) => !record(item) || !repoIdentity(item.repo))) return unsafe("corrupt");
    let repo: RepoIdentity;
    try { repo = readers.currentRepo(); } catch { return unsafe("corrupt"); }
    if (!repoIdentity(repo)) return ORDINARY_ENROLLMENT;
    const matches = candidates.filter((item) => repoIdentity(item.repo) && samePhysical(item.repo.root, repo.root) && samePhysical(item.repo.gitCommonDir, repo.gitCommonDir));
    if (!matches.length) return ORDINARY_ENROLLMENT;
    if (matches.length > 1) return unsafe("ambiguous");
    const candidate = matches[0], snapshot = candidate.snapshot;
    if (candidate.schema !== ACTIVATION_CONTRACT.schema || !record(snapshot) || !record(candidate.payload)) return unsafe("corrupt");
    const manifestRef = snapshot.manifest, skillRef = snapshot.skill;
    if (!record(manifestRef) || !record(skillRef) || candidate.payload.root !== readers.payloadRoot ||
      candidate.payload.manifestPath !== readers.manifestPath || manifestRef.sourcePath !== readers.manifestPath ||
      skillRef.sourcePath !== `${skillRef.base}/SKILL.md` || !beneath(readers.payloadRoot, skillRef.sourcePath) ||
      typeof manifestRef.capturedPath !== "string" || typeof skillRef.capturedPath !== "string" ||
      !validSha(manifestRef.sha256) || !validSha(skillRef.sha256)) return unsafe("unsafe");
    try {
      const manifestBytes = readers.readBytes(manifestRef.capturedPath);
      const skillBytes = readers.readBytes(skillRef.capturedPath);
      if (readers.sha256(manifestBytes) !== manifestRef.sha256 || readers.sha256(skillBytes) !== skillRef.sha256 ||
        readers.readBytes(manifestRef.sourcePath) !== manifestBytes || readers.readBytes(skillRef.sourcePath) !== skillBytes) return unsafe("corrupt");
      const compatibility = JSON.parse(manifestBytes).controlTowerCompatibility;
      if (!record(compatibility) || compatibility.contract !== "pi-input-extension-capabilities/v1" ||
        !same(compatibility.activationEvidence, ACTIVATION_CONTRACT) || !same(compatibility.requiredCapabilities, REQUIRED_CAPABILITIES) ||
        !same(compatibility.reviewedTransforms, REVIEWED_TRANSFORMS) || !same(candidate.requiredCapabilities, REQUIRED_CAPABILITIES) ||
        !same(candidate.reviewedTransforms, REVIEWED_TRANSFORMS)) return unsafe("unsafe");
      if (!validSha(candidate.capabilityFingerprint) || readers.sha256(JSON.stringify(compatibility)) !== candidate.capabilityFingerprint) return unsafe("corrupt");
      return Object.freeze({ enrollment: "approved", skillLocation: skillRef.sourcePath, skillBase: skillRef.base,
        skillBody: skillBytes, sourceIsCurrent: () => readers.sha256(readers.readBytes(manifestRef.sourcePath)) === manifestRef.sha256 &&
          readers.sha256(readers.readBytes(skillRef.sourcePath)) === skillRef.sha256 });
    } catch { return unsafe("corrupt"); }
  };
  return () => cached ?? (cached = resolveEnrollment());
}

const manifestPath = fileURLToPath(new URL("./package.json", import.meta.url));
const payloadRoot = dirname(manifestPath);
const identify = (path: string): PhysicalPath => { const realpath = realpathSync(path), stat = statSync(realpath); return { realpath, device: String(stat.dev), inode: String(stat.ino) }; };
const defaultReaders: ActivationReaders = {
  payloadRoot, manifestPath,
  readActivationEvidence: () => { try { return JSON.parse(readFileSync(resolve(payloadRoot, ACTIVATION_FILE), "utf8")); } catch (error: any) { if (error?.code === "ENOENT") return undefined; throw error; } },
  currentRepo: () => { const [root, common] = execFileSync("git", ["rev-parse", "--show-toplevel", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim().split("\n"); return { root: identify(root), gitCommonDir: identify(common) }; },
  readBytes: (path) => readFileSync(path, "utf8"), sha256: (bytes) => createHash("sha256").update(bytes).digest("hex"),
};

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

function reject(ctx: RouterContext | undefined, error: object): InputResult {
  try { if (typeof ctx?.ui?.notify === "function") ctx.ui.notify(JSON.stringify(error), "error"); } catch {}
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
        sourceIsCurrent: input.sourceIsCurrent ?? (() => true),
      })
    : null;

  return async (event: TowerInputEvent, ctx: RouterContext): Promise<InputResult> => {
    try {
    if (!event || typeof event.text !== "string" || !Array.isArray(event.images ?? []) ||
      !ctx || typeof ctx.isIdle !== "function" || typeof ctx.ui?.notify !== "function") {
      return reject(ctx, TOWER_INPUT_ERRORS.INVALID);
    }
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
    try {
      if (event.streamingBehavior !== undefined || !ctx.isIdle()) return reject(ctx, TOWER_INPUT_ERRORS.NOT_IDLE);
      if (!match && !kickoff) return reject(ctx, TOWER_INPUT_ERRORS.INVALID);
      if (!approved.sourceIsCurrent()) return reject(ctx, TOWER_INPUT_ERRORS.ENROLLMENT);
    } catch { return reject(ctx, TOWER_INPUT_ERRORS.INVALID); }

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
    } catch { return reject(ctx, TOWER_INPUT_ERRORS.INVALID); }
  };
}

export function createTowerSessionExtension(
  resolveEnrollment: TowerEnrollmentResolver = () => ORDINARY_ENROLLMENT,
) {
  return (pi: PiApi): void => {
    if (!pi || typeof pi.on !== "function") throw new Error("CT_PI_ON_INVALID");
    let router: ReturnType<typeof createTowerSessionRouter>;
    try { router = createTowerSessionRouter(resolveEnrollment(pi)); }
    catch { router = createTowerSessionRouter(unsafe("corrupt")); }
    pi.on("input", router);
  };
}

const towerSessionRouter = createTowerSessionExtension(createTowerEnrollmentResolver(defaultReaders));
export default towerSessionRouter;
