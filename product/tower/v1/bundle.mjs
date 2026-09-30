import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, parse, resolve, sep } from "node:path";

export const BUNDLE_SCHEMA = "tower.v1.bundle/1";

const radarRoot = "agent-workflows/tools/radar";
const skillRoot = "product/tower/v1/skills/control-tower";
const radarNames = ["go.mod", "go.sum", ...[
  "archivar", "avance", "check", "encargo", "etapa", "faltan", "git", "ledger", "main",
  "partition", "plan", "render", "roadmap", "safety", "sesion", "snapshot", "state",
].map((name) => `${name}.go`)];
const skillNames = ["SKILL.md", "references/adoption.md", "references/authority-and-questions.md"];
export const BUNDLE_MEMBERS = Object.freeze([
  ...radarNames.map((name) => Object.freeze({ source: `${radarRoot}/${name}`, destination: `radar/${name}` })),
  ...skillNames.map((name) => Object.freeze({ source: `${skillRoot}/${name}`, destination: `skills/control-tower/${name}` })),
]);

function relativePath(path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("\\") ||
      path.split("/").some((part) => !part || part === "." || part === ".." || part.includes("\0")) ||
      /^[A-Za-z]:/.test(path)) throw new Error(`Invalid bundle path: ${path}`);
  return path;
}

// Check every component, including the root's parents; stat follows links and is not sufficient here.
function safeEntry(path, directory) {
  const absolute = resolve(path);
  let current = parse(absolute).root;
  for (const part of absolute.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !(directory ? stat.isDirectory() : current === absolute ? stat.isFile() : stat.isDirectory())) {
      throw new Error(`Unsafe bundle entry: ${current}`);
    }
  }
  return absolute;
}

function directory(root, path, names) {
  const absolute = safeEntry(join(root, relativePath(path)), true);
  const entries = readdirSync(absolute);
  if (entries.length !== names.length || entries.some((entry) => !names.includes(entry))) {
    throw new Error(`Unexpected bundle entries: ${path}`);
  }
  return absolute;
}

function validateSourceTree(root) {
  safeEntry(root, true);
  const radar = safeEntry(join(root, radarRoot), true);
  const entries = readdirSync(radar);
  for (const name of radarNames) {
    if (!entries.includes(name)) throw new Error(`Missing Radar member: ${name}`);
  }
  for (const name of entries) {
    if (radarNames.includes(name)) {
      safeEntry(join(radar, name), false);
    } else if (name === "testdata") {
      safeEntry(join(radar, name), true);
    } else if (["README.md", "borrador-control-tower.yaml", "radar"].includes(name) || name.endsWith("_test.go")) {
      safeEntry(join(radar, name), false);
    } else {
      throw new Error(`Unexpected Radar member: ${name}`);
    }
  }
  directory(root, skillRoot, ["SKILL.md", "references"]);
  directory(root, `${skillRoot}/references`, ["adoption.md", "authority-and-questions.md"]);
  for (const name of skillNames) safeEntry(join(root, skillRoot, name), false);
}

function validateManifest(manifest) {
  if (manifest?.schema !== BUNDLE_SCHEMA || Object.keys(manifest).sort().join() !== "members,schema" ||
      !Array.isArray(manifest.members) || manifest.members.length !== BUNDLE_MEMBERS.length) {
    throw new Error("Bundle schema or membership drift");
  }
  const sources = new Set();
  const destinations = new Set();
  for (const member of manifest.members) {
    if (!member || typeof member !== "object" ||
        Object.keys(member).sort().join() !== "byteLength,bytes,destination,encoding,sha256,source") {
      throw new Error("Malformed bundle member");
    }
    const source = relativePath(member.source);
    const destination = relativePath(member.destination);
    if (sources.has(source) || destinations.has(destination)) throw new Error("Duplicate bundle path");
    sources.add(source);
    destinations.add(destination);
    if (!BUNDLE_MEMBERS.some((canonical) => canonical.source === source && canonical.destination === destination) ||
        member.encoding !== "base64" || !Number.isSafeInteger(member.byteLength) || member.byteLength < 0 ||
        typeof member.bytes !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(member.bytes) ||
        !/^[a-f0-9]{64}$/.test(member.sha256)) throw new Error("Malformed bundle member");
    const bytes = Buffer.from(member.bytes, "base64");
    if (bytes.length !== member.byteLength || bytes.toString("base64") !== member.bytes ||
        createHash("sha256").update(bytes).digest("hex") !== member.sha256) {
      throw new Error(`Bundle byte/digest divergence: ${source}`);
    }
  }
}

/** Read and validate only the canonical source tree. No destination is created. */
export function validateBundle(sourceRoot) {
  validateSourceTree(sourceRoot);
  const members = BUNDLE_MEMBERS.map(({ source, destination }) => {
    const bytes = readFileSync(safeEntry(join(sourceRoot, source), false));
    return Object.freeze({ source, destination, sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.toString("base64"), encoding: "base64", byteLength: bytes.length });
  });
  const result = Object.freeze({ schema: BUNDLE_SCHEMA, members: Object.freeze(members) });
  validateManifest(result);
  return result;
}

/** Compare an existing destination to the validated in-memory canonical bytes. */
export function validateDestination(destinationRoot, manifest) {
  validateManifest(manifest);
  const root = safeEntry(destinationRoot, true);
  const top = readdirSync(root);
  if (top.length !== 2 || !top.includes("radar") || !top.includes("skills")) {
    throw new Error("Unexpected bundle entries: destination root");
  }
  directory(root, "radar", radarNames);
  directory(root, "skills", ["control-tower"]);
  directory(root, "skills/control-tower", ["SKILL.md", "references"]);
  directory(root, "skills/control-tower/references", ["adoption.md", "authority-and-questions.md"]);
  for (const member of manifest.members) {
    const actual = readFileSync(safeEntry(join(destinationRoot, member.destination), false));
    if (!actual.equals(Buffer.from(member.bytes, "base64")) ||
        createHash("sha256").update(actual).digest("hex") !== member.sha256) {
      throw new Error(`Destination byte/digest divergence: ${member.destination}`);
    }
  }
  return true;
}
