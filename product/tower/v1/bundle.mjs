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
// Explicit vendored dependency membership; never discover release files by traversal.
const radarVendorNames = [
  "vendor/modules.txt",
  ...["LICENSE", "NOTICE", "README.md", "apic.go", "decode.go", "emitterc.go", "encode.go", "parserc.go",
    "readerc.go", "resolve.go", "scannerc.go", "sorter.go", "writerc.go", "yaml.go", "yamlh.go", "yamlprivateh.go"]
    .map(name => `vendor/gopkg.in/yaml.v3/${name}`),
];
const skillNames = ["SKILL.md", "references/adoption.md", "references/authority-and-questions.md"];
const workflowRoot = "agent-workflows/skills";
// Reviewed, bytewise-sorted V1 membership. Adding a file requires an explicit
// release review; traversal below detects drift but never discovers members.
const workflowNames = [
  "_shared/plan-naming-convention.md",
  "analisis-por-tramos/SKILL.md",
  "analisis-por-tramos/references/estructura.md",
  "analisis-por-tramos/references/medios.md",
  "chanks-0-explicalo-simple/SKILL.md",
  "chanks-0-explicalo-simple/references/formato.md",
  "chanks-0-mensajes-visibles/SKILL.md",
  "chanks-0-session-context-loader/SKILL.md",
  "chanks-0-skill-composer/SKILL.md",
  "chanks-1-adopcion/SKILL.md",
  "chanks-1-adopcion/references/errores-conocidos.md",
  "chanks-1-autoridad/SKILL.md",
  "chanks-1-brain-dump/SKILL.md",
  "chanks-1-cierre-de-decisiones/SKILL.md",
  "chanks-1-cierre-de-decisiones/assets/resolution-entry.md",
  "chanks-1-cierre-de-decisiones/references/decision-extraction.md",
  "chanks-1-descubrimiento/SKILL.md",
  "chanks-1-feature/SKILL.md",
  "chanks-1-heredado/SKILL.md",
  "chanks-1-heredado/references/ubicacion-y-cruces.md",
  "chanks-1-prd/SKILL.md",
  "chanks-1-project-kickoff/SKILL.md",
  "chanks-1-requirements/SKILL.md",
  "chanks-1-rfc/SKILL.md",
  "chanks-1-terreno/SKILL.md",
  "chanks-2-planificador-granular/SKILL.md",
  "chanks-2-planificador-granular/references/juicio-de-ruta.md",
  "chanks-3-paralelo/SKILL.md",
  "chanks-4-puente/SKILL.md",
  "chanks-4-puente/references/session-readiness.md",
  "chanks-4-puente/scripts/prepare_new_change.py",
  "chanks-5-politica-de-entrega/SKILL.md",
  "chanks-5-session-doc/SKILL.md",
  "chanks-5-session-doc/assets/session-doc.schema.json",
  "chanks-5-session-doc/references/notion-closure.md",
  "skill-orchestrator/SKILL.md",
  "skill-orchestrator/references/ejemplar.md",
];
// Maintainer's personal Notion IDs: optional in the checkout, never read/shipped.
const excludedWorkflow = "chanks-5-session-doc/assets/project-notion-map.json";
export const BUNDLE_MEMBERS = Object.freeze([
  ...[...radarNames, ...radarVendorNames].map((name) => Object.freeze({ source: `${radarRoot}/${name}`, destination: `radar/${name}` })),
  ...skillNames.map((name) => Object.freeze({ source: `${skillRoot}/${name}`, destination: `skills/control-tower/${name}` })),
  ...workflowNames.map((name) => Object.freeze({ source: `${workflowRoot}/${name}`, destination: `skills/${name}` })),
  ...["global-pointer.md", "project-agents.md"].map((name) => Object.freeze({
    source: `product/tower/v1/instructions/${name}`, destination: `instructions/${name}` })),
  Object.freeze({ source: "agent-workflows/chanks/torre-firma.mjs", destination: "signatures/torre-firma.mjs" }),
  ...["chanks-etapa.sh", "torre-firma.sh"].map((name) => Object.freeze({
    source: `agent-workflows/tools/hooks/${name}`, destination: `signatures/${name}` })),
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

// Walk only reviewed directories. Exact files and their ancestor directories
// are admitted; even an empty unlisted directory or a symlink is rejected.
function closedTree(root, path, names, excluded = []) {
  const absolute = safeEntry(join(root, path), true);
  const required = new Set(names.map((name) => name.split("/")[0]));
  const entries = readdirSync(absolute);
  for (const name of required) {
    if (!entries.includes(name)) throw new Error(`Missing bundle entry: ${path}/${name}`);
  }
  for (const entry of entries) {
    if (names.includes(entry) || excluded.includes(entry)) {
      safeEntry(join(absolute, entry), false);
    } else if (required.has(entry)) {
      const prefix = `${entry}/`;
      closedTree(root, join(path, entry), names.filter(name => name.startsWith(prefix)).map(name => name.slice(prefix.length)),
        excluded.filter(name => name.startsWith(prefix)).map(name => name.slice(prefix.length)));
    } else {
      throw new Error(`Unexpected bundle entry: ${path}/${entry}`);
    }
  }
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
    } else if (name === "vendor") {
      closedTree(root, `${radarRoot}/vendor`, radarVendorNames.map(path => path.slice("vendor/".length)));
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
  for (const name of new Set(workflowNames.map(name => name.split("/")[0]))) {
    // _shared is a multi-version canon; only its named file belongs to V1.
    if (name === "_shared") continue;
    const prefix = `${name}/`;
    closedTree(root, `${workflowRoot}/${name}`, workflowNames.filter(path => path.startsWith(prefix)).map(path => path.slice(prefix.length)),
      excludedWorkflow.startsWith(prefix) ? [excludedWorkflow.slice(prefix.length)] : []);
  }
  for (const { source } of BUNDLE_MEMBERS) safeEntry(join(root, source), false);
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
  closedTree(root, "", BUNDLE_MEMBERS.map(({ destination }) => destination));
  for (const member of manifest.members) {
    const actual = readFileSync(safeEntry(join(destinationRoot, member.destination), false));
    if (!actual.equals(Buffer.from(member.bytes, "base64")) ||
        createHash("sha256").update(actual).digest("hex") !== member.sha256) {
      throw new Error(`Destination byte/digest divergence: ${member.destination}`);
    }
  }
  return true;
}
