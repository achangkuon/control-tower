import { createHash } from "node:crypto";
import { BUNDLE_MEMBERS } from "./bundle.mjs";
import { acquireVerifiedRelease } from "./release.mjs";

const RELEASE_SCHEMA = "tower.v1.release/1";
const MEMBER_LIMIT = 1024 * 1024;
const AGGREGATE_LIMIT = 8 * MEMBER_LIMIT;
const ENCODED_LIMIT = 4 * Math.ceil(MEMBER_LIMIT / 3);
const RELEASE_PATHS = new Set([
  ...BUNDLE_MEMBERS.map(({ source }) => source),
  ...["adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli"]
    .map((name) => `product/tower/v1/${name}.mjs`),
]);

// Six keys and five string values per member, plus two envelope keys/schema.
// Scale the structural bound with the closed roster, not a fixed old file count.
const STRING_LIMIT = RELEASE_PATHS.size * 11 + 3;

// Wire format: {schema, members:[{path,type:"file",encoding:"base64",byteLength,sha256,bytes}]}.
// Only canonical source-layout paths are admitted; this is not a general extractor.
function exactKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join() === keys;
}

// Nonrecursive preflight bounds containers/scalars before JSON.parse allocates them.
// It also catches duplicate (including escaped) keys that JSON.parse would discard.
// JSON.parse remains the syntax authority; this scan never repairs malformed input.
function parseEnvelope(text) {
  const whitespace = (char) => " \t\r\n".includes(char);
  const stack = [];
  let objects = 0;
  let arrays = 0;
  let strings = 0;
  let scalarCharacters = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      const start = index++;
      while (index < text.length && text[index] !== '"') {
        if (text[index] === "\\") index++;
        index++;
      }
      if (index >= text.length || ++strings > STRING_LIMIT) throw new Error("Invalid release JSON strings");
      let next = index + 1;
      while (next < text.length && whitespace(text[next])) next++;
      if (text[next] === ":") {
        const parent = stack.at(-1);
        if (!parent || parent.kind !== "{" || index - start > 64) throw new Error("Invalid release JSON key");
        const key = JSON.parse(text.slice(start, index + 1));
        if (parent.keys.has(key)) throw new Error("Duplicate release JSON key");
        parent.keys.add(key);
      }
    } else if (char === "{" || char === "[") {
      if (stack.length >= 3 || (char === "{" ? ++objects > RELEASE_PATHS.size + 1 : ++arrays > 1)) {
        throw new Error("Release JSON structure limit exceeded");
      }
      stack.push({ kind: char, keys: new Set() });
    } else if (char === "}" || char === "]") {
      if (stack.pop()?.kind !== (char === "}" ? "{" : "[")) throw new Error("Invalid release JSON structure");
    } else if (!whitespace(char) && ++scalarCharacters > 4096) {
      throw new Error("Release JSON scalar limit exceeded");
    }
  }
  if (stack.length) throw new Error("Invalid release JSON structure");
  return JSON.parse(text);
}

function validateMembers(envelope) {
  if (!exactKeys(envelope, "members,schema") || envelope.schema !== RELEASE_SCHEMA ||
      !Array.isArray(envelope.members) || envelope.members.length !== RELEASE_PATHS.size) {
    throw new Error("Invalid global release schema or membership");
  }
  const seen = new Set();
  let aggregate = 0;
  // Check the complete manifest before any member Buffer.from(base64) allocation.
  for (const member of envelope.members) {
    if (!exactKeys(member, "byteLength,bytes,encoding,path,sha256,type") ||
        typeof member.path !== "string" || !RELEASE_PATHS.has(member.path) || seen.has(member.path) ||
        member.type !== "file" || member.encoding !== "base64" ||
        typeof member.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(member.sha256)) {
      throw new Error("Invalid global release member");
    }
    seen.add(member.path);
    if (!Number.isSafeInteger(member.byteLength) || member.byteLength < 0 || member.byteLength > MEMBER_LIMIT ||
        typeof member.bytes !== "string" || member.bytes.length > ENCODED_LIMIT ||
        member.bytes.length !== 4 * Math.ceil(member.byteLength / 3)) {
      throw new Error("Release member size or length limit exceeded");
    }
    const padding = member.bytes.endsWith("==") ? 2 : member.bytes.endsWith("=") ? 1 : 0;
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(member.bytes) ||
        member.bytes.length / 4 * 3 - padding !== member.byteLength) {
      throw new Error("Invalid release base64 encoding or decoded length");
    }
    aggregate += member.byteLength;
    if (aggregate > AGGREGATE_LIMIT) throw new Error("Release aggregate byte limit exceeded");
  }
  return envelope.members.map((member) => {
    const bytes = Buffer.from(member.bytes, "base64");
    if (bytes.toString("base64") !== member.bytes ||
        createHash("sha256").update(bytes).digest("hex") !== member.sha256) {
      throw new Error("Release member encoding or SHA-256 divergence");
    }
    return Object.freeze({ path: member.path, type: "file", byteLength: bytes.length, sha256: member.sha256, bytes });
  });
}

/** Internal intake only: no filesystem writes, evaluation, imports or activation of release code.
 * Metadata is frozen; returned Buffers remain mutable and are isolated from runner-owned bytes.
 * Bounds: existing 16 MiB acquisition, 1 MiB/file, 8 MiB aggregate decoded bytes.
 */
export function bootstrapVerifiedRelease(options) {
  const bytes = acquireVerifiedRelease(options);
  let envelope;
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    envelope = parseEnvelope(text);
  } catch {
    throw new Error("Invalid release UTF8 or bounded JSON envelope");
  }
  const members = Object.freeze(validateMembers(envelope));
  return Object.freeze({ bytes, manifest: Object.freeze({ schema: RELEASE_SCHEMA, members }) });
}
