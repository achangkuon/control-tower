#!/usr/bin/env bun
// Adopts the report in a repository: writes its config, seeds the judgment file, installs
// the delivery hook and ignores the generated output. Idempotent — never overwrites a
// judgment that already exists, because that file holds hand-written work.
import { execFileSync } from "node:child_process"
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"

const HOOKS_DIR = ".githooks"

const seedJudgment = (project) => `---
verified_against: pendiente
verified_at: sin verificar
standfirst: Estado de ${project}. Las cifras se miden solas contra el código; el juicio de abajo todavía no lo escribió nadie.
---

{{instrumentos}}

## Este informe todavía no tiene juicio escrito

Las cifras de arriba y las tablas de abajo **ya son reales**: salen medidas del índice
maestro y del repositorio en cada entrega. Lo que falta es la capa que ningún script
puede derivar — qué significa cada número, qué está en riesgo, y qué decisión es del
maintainer.

Para escribirla, editá este archivo siguiendo las convenciones de
\`agent-workflows/radiografia/README.md\`, y actualizá \`verified_against\` al commit
contra el que la verificaste.

## Avance por Plan

Un Plan agrupa Sesiones; una Sesión es una entrega verificable. El porcentaje cuenta
Sesiones cerradas sobre Sesiones enumeradas. **Un Plan sin fracción \`(n/m S)\` aparece
como "sin medir"**: un porcentaje sin denominador no se puede auditar.

{{avance}}

## La cola de ejecución

{{cola}}
`

export function bootstrap(root, config) {
  const written = []
  const project = config.project ?? basename(root)

  const configPath = join(root, "radiografia.json")
  if (!existsSync(configPath)) {
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
    written.push("radiografia.json")
  }

  const judgmentPath = join(root, config.judgment ?? "openspec/plans/radiografia.md")
  if (!existsSync(judgmentPath)) {
    mkdirSync(dirname(judgmentPath), { recursive: true })
    writeFileSync(judgmentPath, seedJudgment(project))
    written.push(config.judgment ?? "openspec/plans/radiografia.md")
  }

  const hookDir = join(root, HOOKS_DIR)
  mkdirSync(hookDir, { recursive: true })
  const hook = join(hookDir, "pre-push")
  if (!existsSync(hook)) {
    copyFileSync(join(import.meta.dir, "hooks/pre-push"), hook)
    chmodSync(hook, 0o755)
    written.push(`${HOOKS_DIR}/pre-push`)
  }
  execFileSync("git", ["-C", root, "config", "core.hooksPath", HOOKS_DIR])

  const ignorePath = join(root, ".gitignore")
  const body = existsSync(ignorePath) ? readFileSync(ignorePath, "utf8") : ""
  const lines = body.split("\n").map((line) => line.trim())
  const generated = [config.out ?? "radiografia.html", config.cache ?? ".radiografia-cache.json"]
  const missing = generated.filter((name) => !lines.includes(`/${name}`) && !lines.includes(name))
  if (missing.length) {
    const block = `${body && !body.endsWith("\n") ? "\n" : ""}# Generado por la radiografía — no se commitea\n${missing.map((name) => `/${name}`).join("\n")}\n`
    writeFileSync(ignorePath, `${body}${block}`)
    written.push(".gitignore")
  }

  return { project, written, hooksPath: HOOKS_DIR }
}
