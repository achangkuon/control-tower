import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import {
  AUTH_FAILURE,
  createAuth,
  parseAuthConfig,
} from "../../dashboard/auth.mjs";

const HASH = "$argon2id$v=19$m=65536,t=2,p=1$c2FsdHNhbHRzYWx0$c29tZWhhc2hzb21laGFzaA";
const HASH_2 = "$argon2id$v=19$m=65536,t=2,p=1$bmV3c2FsdG5ld3NhbHQ$bmV3aGFzaG5ld2hhc2gxMg";
const encodedArgon2Part = (size, byte) => Buffer.alloc(size, byte).toString("base64").replace(/=+$/, "");
const argon2Hash = ({ memory = 65_536, iterations = 2, parallelism = 1 } = {}) =>
  `$argon2id$v=19$m=${memory},t=${iterations},p=${parallelism}$${encodedArgon2Part(16, 1)}$${encodedArgon2Part(32, 2)}`;
const SECRET = Buffer.alloc(32, 7).toString("base64url");
const env = (overrides = {}) => ({
  DASHBOARD_AUTH_USERNAME: "maintainer",
  DASHBOARD_AUTH_PASSWORD_HASH: HASH,
  DASHBOARD_AUTH_REVISION: "revision-1",
  DASHBOARD_SESSION_SECRET: SECRET,
  DASHBOARD_AUTH_DISABLED: "false",
  ...overrides,
});

const harness = (overrides = {}, now = 1_700_000_000_000) => {
  const calls = [];
  const auth = createAuth(parseAuthConfig(env(overrides)), {
    now: () => now,
    randomBytes: () => Buffer.alloc(16, 9),
    verifyPassword: async (password, hash) => {
      calls.push({ password, hash });
      return password === "correct" && hash === overrides.DASHBOARD_AUTH_PASSWORD_HASH;
    },
  });
  return { auth, calls };
};

describe("dashboard authentication primitives", () => {
  test("strictly rejects missing or insecure external configuration", () => {
    for (const key of [
      "DASHBOARD_AUTH_USERNAME",
      "DASHBOARD_AUTH_PASSWORD_HASH",
      "DASHBOARD_AUTH_REVISION",
      "DASHBOARD_SESSION_SECRET",
      "DASHBOARD_AUTH_DISABLED",
    ]) {
      const candidate = env();
      delete candidate[key];
      expect(() => parseAuthConfig(candidate)).toThrow("Invalid dashboard authentication configuration");
    }
    for (const username of ["", " ", 7, null, {}])
      expect(() => parseAuthConfig(env({ DASHBOARD_AUTH_USERNAME: username }))).toThrow("Invalid dashboard authentication configuration");
    expect(() => parseAuthConfig(env({ DASHBOARD_AUTH_PASSWORD_HASH: "plaintext" }))).toThrow();
    expect(() => parseAuthConfig(env({ DASHBOARD_AUTH_PASSWORD_HASH: "$argon2id$v=19$m=1,t=1,p=1$A$A" }))).toThrow();
    expect(() => parseAuthConfig(env({ DASHBOARD_SESSION_SECRET: Buffer.alloc(31).toString("base64url") }))).toThrow();
    expect(() => parseAuthConfig({ ...env(), DASHBOARD_AUTH_PASSWORD: "plaintext" })).toThrow();
  });

  test("rejects correctly encoded Argon2id hashes below interactive strength minimums", () => {
    expect(() => parseAuthConfig(env({ DASHBOARD_AUTH_PASSWORD_HASH: argon2Hash({ memory: 1 }) }))).toThrow(
      "Invalid dashboard authentication configuration",
    );
    expect(() => parseAuthConfig(env({ DASHBOARD_AUTH_PASSWORD_HASH: argon2Hash({ iterations: 1 }) }))).toThrow(
      "Invalid dashboard authentication configuration",
    );
    expect(parseAuthConfig(env({ DASHBOARD_AUTH_PASSWORD_HASH: argon2Hash() })).passwordHash).toBe(argon2Hash());
  });

  test("requires parsed configuration even when verification is injected", () => {
    const arbitrary = {
      username: "maintainer",
      passwordHash: "plaintext",
      revision: "revision-1",
      secret: Buffer.alloc(1),
      disabled: false,
    };
    expect(() => createAuth(arbitrary, { verifyPassword: async () => true })).toThrow(
      "Invalid dashboard authentication configuration",
    );
  });

  test("isolates private validated configuration from public secret mutation", async () => {
    const config = parseAuthConfig(env({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }));
    const originalSecret = Buffer.from(config.secret);
    config.secret.fill(0);
    const auth = createAuth(config, {
      now: () => 1_700_000_000_000,
      randomBytes: () => Buffer.alloc(16, 3),
      verifyPassword: async (password, hash) => password === "correct" && hash === HASH,
    });
    const login = await auth.authenticate("maintainer", "correct");
    const [body, signature] = login.token.split(".");
    expect(signature).toBe(createHmac("sha256", originalSecret).update(body).digest("base64url"));
    expect(auth.verifySession(login.token)).toEqual({ ok: true });
  });

  test("returns one generic result and performs dummy verification for a wrong username", async () => {
    const { auth, calls } = harness({ DASHBOARD_AUTH_PASSWORD_HASH: HASH });
    expect(await auth.authenticate("maintainer", "correct")).toMatchObject({ ok: true });
    expect(await auth.authenticate("wrong", "submitted-secret")).toEqual(AUTH_FAILURE);
    expect(await auth.authenticate("maintainer", "wrong")).toEqual(AUTH_FAILURE);
    expect(await auth.authenticate(null, { password: "leak" })).toEqual(AUTH_FAILURE);
    expect(calls[1].hash).not.toBe(HASH);
    expect(calls[1].hash.startsWith("$argon2id$")).toBe(true);
    expect(JSON.stringify(AUTH_FAILURE)).not.toContain("wrong");
    expect(JSON.stringify(AUTH_FAILURE)).not.toContain("submitted-secret");
  });

  test("issues a minimal secure signed session and rejects invalid sessions", async () => {
    const { auth } = harness({ DASHBOARD_AUTH_PASSWORD_HASH: HASH });
    const login = await auth.authenticate("maintainer", "correct", { maxAgeSeconds: 3600 });
    expect(login.cookie).toContain("Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600");
    const [body] = login.token.split(".");
    expect(Object.keys(JSON.parse(Buffer.from(body, "base64url"))).sort()).toEqual(["e", "n", "r", "v"]);
    expect(auth.verifySession(login.token)).toEqual({ ok: true });
    expect(auth.verifySession(`${login.token}x`)).toEqual(AUTH_FAILURE);
    expect(auth.verifySession("malformed")).toEqual(AUTH_FAILURE);
  });

  test("fails closed for expiry, excessive lifetime, revision mismatch, and disabled auth", async () => {
    const now = 1_700_000_000_000;
    const { auth } = harness({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, now);
    const login = await auth.authenticate("maintainer", "correct", { maxAgeSeconds: 60 });
    const later = harness({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, now + 60_000).auth;
    expect(later.verifySession(login.token)).toEqual(AUTH_FAILURE);
    expect(() => auth.issueSession(28_801)).toThrow("Invalid session lifetime");
    expect(harness({ DASHBOARD_AUTH_PASSWORD_HASH: HASH, DASHBOARD_AUTH_REVISION: "revision-2" }, now).auth.verifySession(login.token)).toEqual(AUTH_FAILURE);
    const disabled = harness({ DASHBOARD_AUTH_PASSWORD_HASH: HASH, DASHBOARD_AUTH_DISABLED: "true" }, now).auth;
    expect(await disabled.authenticate("maintainer", "correct")).toEqual(AUTH_FAILURE);
    expect(disabled.verifySession(login.token)).toEqual(AUTH_FAILURE);
  });

  test("rotation invalidates the prior password and cookie while the replacement succeeds", async () => {
    const now = 1_700_000_000_000;
    const makeAuth = (config, acceptedPassword) => createAuth(parseAuthConfig(config), {
      now: () => now,
      randomBytes: () => Buffer.alloc(16, 4),
      verifyPassword: async (password, hash) => password === acceptedPassword && hash === config.DASHBOARD_AUTH_PASSWORD_HASH,
    });
    const oldAuth = makeAuth(env({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }), "old-password");
    const oldLogin = await oldAuth.authenticate("maintainer", "old-password");
    const rotated = makeAuth(env({
      DASHBOARD_AUTH_PASSWORD_HASH: HASH_2,
      DASHBOARD_AUTH_REVISION: "revision-2",
      DASHBOARD_SESSION_SECRET: Buffer.alloc(32, 8).toString("base64url"),
    }), "new-password");
    expect(await rotated.authenticate("maintainer", "old-password")).toEqual(AUTH_FAILURE);
    expect(rotated.verifySession(oldLogin.token)).toEqual(AUTH_FAILURE);
    expect(await rotated.authenticate("maintainer", "new-password")).toMatchObject({ ok: true });
  });

  test("rejects malformed encodings and signature lengths without throwing", async () => {
    const now = 1_700_000_000_000;
    const { auth } = harness({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, now);
    const { token } = await auth.authenticate("maintainer", "correct", { maxAgeSeconds: 60 });
    const [body] = token.split(".");
    expect(auth.verifySession(`${body}.AA`)).toEqual(AUTH_FAILURE);
    expect(auth.verifySession(`${body}=.AA`)).toEqual(AUTH_FAILURE);
    const excessive = { ...JSON.parse(Buffer.from(body, "base64url")), e: Math.floor(now / 1000) + 28_801 };
    const excessiveBody = Buffer.from(JSON.stringify(excessive)).toString("base64url");
    const excessiveSignature = createHmac("sha256", Buffer.from(SECRET, "base64url")).update(excessiveBody).digest("base64url");
    expect(auth.verifySession(`${excessiveBody}.${excessiveSignature}`)).toEqual(AUTH_FAILURE);
    expect(harness({ DASHBOARD_AUTH_PASSWORD_HASH: HASH }, now + 59_000).auth.verifySession(token)).toEqual({ ok: true });
    for (const revision of [" revision", "revision/2", "", "x".repeat(65)]) {
      expect(() => parseAuthConfig(env({ DASHBOARD_AUTH_REVISION: revision }))).toThrow();
    }
  });

  test("accepts a Bun-generated Argon2id hash and safely performs dummy work", async () => {
    const passwordHash = await Bun.password.hash("correct", {
      algorithm: "argon2id", memoryCost: 65_536, timeCost: 2,
    });
    const config = parseAuthConfig(env({ DASHBOARD_AUTH_PASSWORD_HASH: passwordHash }));
    const auth = createAuth(config, { now: () => 1_700_000_000_000, randomBytes: () => Buffer.alloc(16) });
    expect(await auth.authenticate("maintainer", "correct")).toMatchObject({ ok: true });
    expect(await auth.authenticate("wrong", "submitted-secret")).toEqual(AUTH_FAILURE);
  });
});
