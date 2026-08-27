import { failContract } from "../errors.mjs"
import {
  validateHostRuntimeBinding,
  validateHostRuntimeIdentity,
  validateHostRuntimeIncarnation,
  validateHostRuntimeProcess,
  validateHostRuntimeWorktree,
} from "./schema-registry.mjs"

const validators = [
  ["identity", validateHostRuntimeIdentity],
  ["worktree", validateHostRuntimeWorktree],
  ["process", validateHostRuntimeProcess],
  ["incarnation", validateHostRuntimeIncarnation],
  ["binding", validateHostRuntimeBinding],
]
const fail = (code, message, component, category) => failContract(code, message, [{ component, category }])

const matches = ([identity, worktree, process, incarnation, candidate], binding) =>
  identity.runtime_id === binding.runtime_id
  && worktree.worktree_id === binding.worktree_id
  && process.process_id === binding.process_id
  && incarnation.incarnation_id === binding.incarnation_id
  && candidate.binding_id === binding.binding_id
  && candidate.runtime_id === binding.runtime_id
  && candidate.worktree_id === binding.worktree_id
  && candidate.process_id === binding.process_id
  && candidate.incarnation_id === binding.incarnation_id
  && candidate.loopback_port === binding.loopback_port

export const resolveExactContext = (binding, resolveContexts) => {
  if (!validateHostRuntimeBinding(binding)) fail("CT_HOST_RUNTIME_SCHEMA_INVALID", "Binding schema is invalid", "binding", "schema")
  const candidates = resolveContexts(binding)
  if (!Array.isArray(candidates) || candidates.length === 0) fail("CT_HOST_RUNTIME_CONTEXT_MISSING", "Host-runtime context is missing", "context", "missing")

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length !== validators.length || candidate.some((value) => value === undefined)) {
      fail("CT_HOST_RUNTIME_CONTEXT_MISSING", "Host-runtime context is incomplete", "context", "missing")
    }
    for (let index = 0; index < validators.length; index += 1) {
      const [component, validate] = validators[index]
      if (!validate(candidate[index])) fail("CT_HOST_RUNTIME_SCHEMA_INVALID", "Context component schema is invalid", component, "schema")
    }
  }

  const complete = candidates.filter((candidate) => matches(candidate, binding))
  if (complete.length > 1) fail("CT_HOST_RUNTIME_CONTEXT_AMBIGUOUS", "Host-runtime context is ambiguous", "context", "ambiguous")
  if (complete.length === 0) fail("CT_HOST_RUNTIME_BINDING_CROSSED", "Host-runtime context is crossed", "context", "crossed")
  return complete[0]
}
