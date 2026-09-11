import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// S110: while Control Tower is under construction, the repository must not hand
// its own in-progress coordination skills to the agents building it. The Método
// — the chanks-* family and the Zonas canon — stays; the Maquinaria goes.
//
// This asserts the rule, not today's three paths: any repository-level host
// configuration that exposes a Tower-owned skill fails, whatever it is named.
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PI_SETTINGS = ".pi/settings.json";
const MACHINERY = /(^|\/)skills\/torre-control/;

async function readPiSettings() {
  try {
    return JSON.parse(await readFile(new URL(PI_SETTINGS, `file://${REPO_ROOT}`), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function exposedMachinery(value, trail = []) {
  if (typeof value === "string") {
    return MACHINERY.test(value) ? [{ path: trail.join("."), value }] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => exposedMachinery(item, [...trail, index]));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => exposedMachinery(item, [...trail, key]));
  }
  return [];
}

describe("repository host configuration", () => {
  test("exposes no Control Tower skill to a Pi host", async () => {
    const settings = await readPiSettings();
    if (settings === null) return; // An absent file exposes nothing.

    const exposed = exposedMachinery(settings);
    const detail = exposed.map((hit) => `${hit.path} -> ${hit.value}`).join("\n");
    expect(exposed.length, `.pi/settings.json still exposes Tower machinery:\n${detail}`).toBe(0);
  });

  test("keeps the file as a declared cimiento rather than deleting it", async () => {
    // The reservation in openspec/plan.yaml names this exact path, and radar
    // requires a Módulo path to resolve to a repository file. Emptying the key
    // is the change; removing the file would orphan the reservation.
    const settings = await readPiSettings();
    expect(settings).not.toBeNull();
  });
});
