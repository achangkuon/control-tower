import Ajv2020 from "ajv/dist/2020.js"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const schemaDirectory = join(dirname(fileURLToPath(import.meta.url)), "../schemas")
const schemaFiles = Object.freeze({
  projectRegistry: "project-registry-v1.schema.json", artifactRef: "artifact-ref-v1.schema.json",
  planCatalog: "plan-catalog-v1.schema.json", planManifest: "plan-manifest-v1.schema.json",
  bindingDelta: "binding-delta-v1.schema.json", policyReport: "policy-report-v1.schema.json",
  jornada: "jornada-v1.schema.json", assignment: "assignment-v1.schema.json",
  authorization: "authorization-v1.schema.json", campaign: "campaign-v1.schema.json",
  candidateRevision: "candidate-revision-v1.schema.json", sessionPlanSnapshot: "session-plan-snapshot-v1.schema.json",
  reconciledCheckpoint: "reconciled-checkpoint-v1.schema.json", supportProposal: "support-proposal-v1.schema.json",
  policyReportV2: "policy-report-v2.schema.json", assignmentV2: "assignment-v2.schema.json",
  recoveryProof: "recovery-proof-v1.schema.json", deliveryPolicy: "delivery-policy-v1.schema.json",
  agentCapabilityRegistry: "agent-capability-registry-v1.schema.json",
})
const schemas = Object.fromEntries(Object.entries(schemaFiles).map(([name, file]) => [
  name, JSON.parse(readFileSync(join(schemaDirectory, file), "utf8")),
]))
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, removeAdditional: false, useDefaults: false, coerceTypes: false })
for (const schema of Object.values(schemas)) ajv.addSchema(schema)

export const schemaNames = Object.freeze(Object.keys(schemaFiles))
export const validatorFor = (name) => {
  const schema = schemas[name]
  if (!schema) return null
  return ajv.getSchema(schema.$id)
}
