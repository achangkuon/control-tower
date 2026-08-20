#!/usr/bin/env bun
import { execFileSync } from "node:child_process"
import { relative, resolve } from "node:path"

import { radiografia, runSuite } from "./radiografia/cli.mjs"

const args = process.argv.slice(2)
const has = (flag) => args.includes(flag)

if (has("--help")) {
  console.log(`uso: bun scripts/radiografia.mjs [--with-tests] [--check]

  (sin flags)    mide el repo y regenera radiografia.html
  --with-tests   corre la suite primero y registra su resultado (lento, ~1 min)
  --check        no escribe nada; sale 1 si el informe quedó desactualizado

El informe es un artefacto de build: no se commitea. El juicio escrito vive en
openspec/plans/radiografia.md y es lo único que se edita a mano.`)
  process.exit(0)
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim()
const result = radiografia({ root, check: has("--check"), suite: has("--with-tests") ? runSuite : null })

if (has("--check")) {
  console.log(result.stale
    ? `radiografía DESACTUALIZADA — corré: bun scripts/radiografia.mjs`
    : "radiografía al día")
  process.exit(result.stale ? 1 : 0)
}

const m = result.measurements
const suite = m.tests ? `${m.tests.pass} pass / ${m.tests.fail} fail${m.tests.at_head ? "" : " (de otro commit)"}` : "sin medir"
console.log(`radiografía → ${relative(resolve(root), result.path)}`)
console.log(`  ${m.git.short}${m.git.clean ? "" : " · árbol sucio"} · ${m.global.sessions_closed}/${m.global.sessions_total} Sesiones · ${m.code.installed_pct}% instalado · suite: ${suite}`)
if (result.recorded) console.log("  resultado de la suite registrado para este commit")
