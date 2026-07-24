import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const CONFIG_ERROR = "Invalid dashboard authentication configuration";
const MAX_SESSION_SECONDS = 8 * 60 * 60;
const MIN_ARGON2_MEMORY_KIB = 19 * 1024;
const MIN_ARGON2_ITERATIONS = 2;
const MIN_ARGON2_PARALLELISM = 1;
const DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=2,p=1$ZHVtbXlzYWx0MTIzNDU2$eHh4eHh4eHh4eHh4eHh4eA";
const validatedConfigs = new WeakMap();

export const AUTH_FAILURE = Object.freeze({ ok: false, error: "Authentication failed" });

const invalidConfig = () => {
  throw new Error(CONFIG_ERROR);
};

const requiredString = (env, key, pattern) => {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || !pattern.test(value)) {
    invalidConfig();
  }
  return value;
};

const decodeCanonical = (value) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const decoded = Buffer.from(value, "base64url");
  return decoded.toString("base64url") === value ? decoded : null;
};

const isArgon2idHash = (value) => {
  const match = /^\$argon2id\$v=19\$m=([1-9]\d*),t=([1-9]\d*),p=([1-9]\d*)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(value);
  if (!match) return false;
  const [, memory, iterations, parallelism, salt, hash] = match;
  if (
    Number(memory) < MIN_ARGON2_MEMORY_KIB
    || Number(iterations) < MIN_ARGON2_ITERATIONS
    || Number(parallelism) < MIN_ARGON2_PARALLELISM
  ) return false;
  const decodePart = (part) => {
    const bytes = Buffer.from(part, "base64");
    return bytes.toString("base64").replace(/=+$/, "") === part ? bytes : null;
  };
  return decodePart(salt)?.length >= 8 && decodePart(hash)?.length >= 16;
};

export function parseAuthConfig(env) {
  if (!env || typeof env !== "object" || Object.hasOwn(env, "DASHBOARD_AUTH_PASSWORD")) invalidConfig();
  const username = requiredString(env, "DASHBOARD_AUTH_USERNAME", /^[^\u0000-\u001f\u007f]{1,128}$/);
  const passwordHash = env.DASHBOARD_AUTH_PASSWORD_HASH;
  if (typeof passwordHash !== "string" || !isArgon2idHash(passwordHash)) invalidConfig();
  const revision = requiredString(env, "DASHBOARD_AUTH_REVISION", /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);
  const secret = decodeCanonical(env.DASHBOARD_SESSION_SECRET);
  if (!secret || secret.length < 32) invalidConfig();
  const disabledValue = env.DASHBOARD_AUTH_DISABLED;
  if (disabledValue !== "true" && disabledValue !== "false") invalidConfig();
  const privateConfig = Object.freeze({
    username,
    passwordHash,
    revision,
    secret: Buffer.from(secret),
    disabled: disabledValue === "true",
  });
  const publicConfig = Object.freeze({ ...privateConfig, secret: Buffer.from(secret) });
  validatedConfigs.set(publicConfig, privateConfig);
  return publicConfig;
}

const digest = (value) => createHash("sha256").update(value).digest();
const sameDigest = (left, right) => timingSafeEqual(digest(left), right);
const sign = (secret, body) => createHmac("sha256", secret).update(body).digest();

export function createAuth(config, dependencies = {}) {
  config = validatedConfigs.get(config);
  if (!config) invalidConfig();
  const now = dependencies.now ?? Date.now;
  const randomBytes = dependencies.randomBytes ?? ((size) => crypto.getRandomValues(new Uint8Array(size)));
  const verifyPassword = dependencies.verifyPassword ?? ((password, hash) => Bun.password.verify(password, hash));
  const usernameDigest = digest(config.username);

  const issueSession = (maxAgeSeconds = 3600) => {
    if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds <= 0 || maxAgeSeconds > MAX_SESSION_SECONDS) {
      throw new Error("Invalid session lifetime");
    }
    const nonce = Buffer.from(randomBytes(16));
    if (nonce.length !== 16) throw new Error("Invalid session nonce");
    const payload = { v: 1, r: config.revision, e: Math.floor(now() / 1000) + maxAgeSeconds, n: nonce.toString("base64url") };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `${body}.${sign(config.secret, body).toString("base64url")}`;
    return {
      token,
      cookie: `dashboard_session=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`,
    };
  };

  const authenticate = async (submittedUsername, submittedPassword, options = {}) => {
    if (config.disabled) return AUTH_FAILURE;
    const username = typeof submittedUsername === "string" ? submittedUsername : "";
    const password = typeof submittedPassword === "string" ? submittedPassword : "";
    const usernameMatches = sameDigest(username, usernameDigest);
    try {
      const passwordMatches = await verifyPassword(password, usernameMatches ? config.passwordHash : DUMMY_PASSWORD_HASH);
      if (!usernameMatches || !passwordMatches || typeof submittedPassword !== "string") return AUTH_FAILURE;
      return { ok: true, ...issueSession(options.maxAgeSeconds) };
    } catch {
      return AUTH_FAILURE;
    }
  };

  const verifySession = (token) => {
    if (config.disabled || typeof token !== "string") return AUTH_FAILURE;
    try {
      const parts = token.split(".");
      if (parts.length !== 2) return AUTH_FAILURE;
      const [body, encodedSignature] = parts;
      const signature = decodeCanonical(encodedSignature);
      const expected = sign(config.secret, body);
      if (!signature || signature.length !== expected.length || !timingSafeEqual(signature, expected)) return AUTH_FAILURE;
      const encodedPayload = decodeCanonical(body);
      if (!encodedPayload) return AUTH_FAILURE;
      const payload = JSON.parse(encodedPayload.toString("utf8"));
      if (!payload || Object.keys(payload).sort().join(",") !== "e,n,r,v") return AUTH_FAILURE;
      const nowSeconds = Math.floor(now() / 1000);
      if (payload.v !== 1 || payload.r !== config.revision || !Number.isInteger(payload.e)) return AUTH_FAILURE;
      if (payload.e <= nowSeconds || payload.e - nowSeconds > MAX_SESSION_SECONDS) return AUTH_FAILURE;
      const nonce = decodeCanonical(payload.n);
      if (!nonce || nonce.length !== 16) return AUTH_FAILURE;
      return { ok: true };
    } catch {
      return AUTH_FAILURE;
    }
  };

  return Object.freeze({ authenticate, issueSession, verifySession });
}
