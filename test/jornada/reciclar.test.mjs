import { afterEach, describe, expect, test } from "bun:test"
import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const roots = []
const script = resolve(import.meta.dir, "../../jornada.sh")
const unavailable = "CT_RECYCLE_UNAVAILABLE: --reciclar is unavailable; no recycling transport is authorized."
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

const invoke = (args) => {
  const root = mkdtempSync(join(tmpdir(), "ct-reciclar-")); roots.push(root)
  const bin = join(root, "bin"); Bun.spawnSync(["mkdir", "-p", bin])
  const sentinel = join(root, "command-invoked")
  for (const command of ["git", "gh", "grep", "wslpath", "tr", "sed", "wc", "basename"]) {
    const fake = join(bin, command)
    writeFileSync(fake, `#!/bin/sh\nprintf '%s\\n' '${command}' >> '${sentinel}'\nexit 97\n`)
    chmodSync(fake, 0o755)
  }
  const result = Bun.spawnSync(["/bin/bash", script, ...args], {
    cwd: root,
    env: { PATH: bin, HOME: root, JORNADA_TRUNK: "sentinel-trunk" },
    stdout: "pipe", stderr: "pipe",
  })
  return { result, root, sentinel }
}

describe("jornada --reciclar fail-closed interlock", () => {
  test("returns stable unavailable before nueva-rama validation and every command or filesystem effect", () => {
    for (const args of [["--reciclar", "/occupied"], ["--reciclar", "/occupied", "--nueva-rama", "feat/new"], ["--ejecutar", "--mergear-pr", "/other", "--reciclar", "/occupied"]]) {
      const { result, root } = invoke(args)
      expect(result.exitCode).toBe(69)
      expect(result.stdout.toString()).toBe("")
      expect(result.stderr.toString().trim()).toBe(unavailable)
      expect(readdirSync(root).sort()).toEqual(["bin"])
    }
  })

  test("treats bare or explicitly empty reciclar operands as requested without effects", () => {
    for (const args of [["--reciclar"], ["--reciclar", ""]]) {
      const { result, root, sentinel } = invoke(args)
      expect(result.exitCode).toBe(69)
      expect(result.stdout.toString()).toBe("")
      expect(result.stderr.toString().trim()).toBe(unavailable)
      expect(Bun.file(sentinel).size).toBe(0)
      expect(readdirSync(root).sort()).toEqual(["bin"])
    }
  })

  test("contains no reachable legacy recycler or successful recycle guidance", () => {
    const source = readFileSync(script, "utf8")
    expect(source).not.toContain('git -C "$RECICLAR" switch -c')
    expect(source).not.toContain('branch -D "$rama_vieja"')
    expect(source).not.toContain('./jornada.sh --reciclar "$path" --nueva-rama')
  })
})
