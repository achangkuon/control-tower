import Ajv2020 from "ajv/dist/2020.js"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const schemaDirectory = join(dirname(fileURLToPath(import.meta.url)), "../../schemas")
const schemaFiles = Object.freeze({
  identity: "host-runtime-identity-v1.schema.json",
  worktree: "host-runtime-worktree-v1.schema.json",
  process: "host-runtime-process-v1.schema.json",
  incarnation: "host-runtime-incarnation-v1.schema.json",
  binding: "host-runtime-binding-v1.schema.json",
})
const ajv = new Ajv2020({ allErrors: true, strict: true, coerceTypes: false, removeAdditional: false, useDefaults: false })
const validators = Object.fromEntries(Object.entries(schemaFiles).map(([name, file]) => {
  const schema = JSON.parse(readFileSync(join(schemaDirectory, file), "utf8"))
  return [name, ajv.compile(schema)]
}))

export const hostRuntimeSchemaNames = Object.freeze(Object.keys(schemaFiles))
export const validateHostRuntimeIdentity = validators.identity
export const validateHostRuntimeWorktree = validators.worktree
export const validateHostRuntimeProcess = validators.process
export const validateHostRuntimeIncarnation = validators.incarnation
export const validateHostRuntimeBinding = validators.binding
