import { digestArtifact } from "./canonicalize.mjs"
import { failContract } from "./errors.mjs"
import { validate } from "./validate.mjs"

const identity = ({ candidate_revision: _candidateRevision, ...value }) => value

export const candidateRevision = (candidate) => digestArtifact(identity(candidate), "rfc8785-jcs")

export const freezeCandidate = (candidate) => {
  const revision = candidateRevision(candidate)
  if (candidate.candidate_revision !== undefined && candidate.candidate_revision !== revision) {
    failContract("CT_SCHEMA_INVALID", "Candidate revision does not match its frozen identity")
  }
  return validate("candidateRevision", { ...identity(candidate), candidate_revision: revision })
}

export const isCurrentCandidate = (candidate, identity) => candidate.candidate_revision === candidateRevision(identity)

export const successorCandidate = (candidate, nextIdentity) => {
  if (isCurrentCandidate(candidate, nextIdentity)) failContract("CT_SCHEMA_INVALID", "Successor must change frozen candidate identity")
  return freezeCandidate({ ...nextIdentity, predecessor_revision: candidate.candidate_revision })
}
