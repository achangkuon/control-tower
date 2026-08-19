import { describe, expect, test } from "bun:test"

import { ROOT_AGENT, assertRootIdentity, canonicalRootSessionId, parseRootIdentity } from "../../hosts/root-identity.mjs"

const sessionId = `ses_${"a".repeat(26)}`
const session = Object.freeze({ agent: ROOT_AGENT, id: sessionId, parentID: null })
const code = (operation) => { try { operation() } catch (error) { return error.code }; return null }

describe("OpenCode primary root identity", () => {
  test("accepts only an explicitly parentless gentle-orchestrator session", () => {
    expect(parseRootIdentity(session)).toEqual({ agent: ROOT_AGENT, root_session_id: sessionId })
    expect(Object.isFrozen(parseRootIdentity(session))).toBe(true)
    expect(ROOT_AGENT).toBe("gentle-orchestrator")
  })

  test("rejects a child session as the root binding, however the parent is expressed", () => {
    for (const parentID of [sessionId, `ses_${"b".repeat(26)}`, "", "root", 0, false, {}]) {
      expect(code(() => parseRootIdentity({ ...session, parentID }))).toBe("CT_ROOT_IDENTITY_INVALID")
    }
  })

  test("requires parentID to be present and explicitly null, never merely absent", () => {
    expect(code(() => parseRootIdentity({ agent: ROOT_AGENT, id: sessionId }))).toBe("CT_ROOT_IDENTITY_INVALID")
    expect(code(() => parseRootIdentity({ ...session, parentID: undefined }))).toBe("CT_ROOT_IDENTITY_INVALID")
  })

  test("rejects a non-primary agent, including allowlisted children of the root", () => {
    for (const agent of ["build", "plan", "sdd-apply", "review-risk", "explore", "general", "opencode", "", null]) {
      expect(code(() => parseRootIdentity({ ...session, agent }))).toBe("CT_ROOT_IDENTITY_INVALID")
    }
  })

  test("rejects option-shaped, mis-sized and non-canonical session identifiers", () => {
    for (const id of ["--help", "-s", "root-a", sessionId.toUpperCase().replace("SES_", "Ses_"), `ses_${"a".repeat(25)}`, `ses_${"a".repeat(27)}`, `ses_${"a".repeat(25)}-`, `ses_${"a".repeat(25)}\u0000`, `ses_${"a".repeat(25)} `, ` ${sessionId}`, `${sessionId} `, "", null, 42]) {
      expect(code(() => parseRootIdentity({ ...session, id }))).toBe("CT_ROOT_IDENTITY_INVALID")
    }
  })

  test("rejects an ambiguous session shape rather than reading the fields it recognises", () => {
    for (const value of [null, undefined, "", sessionId, [], [session], { ...session, extra: true }, { ...session, terminal_id: "term_a1" }]) {
      expect(code(() => parseRootIdentity(value))).toBe("CT_ROOT_IDENTITY_INVALID")
    }
  })

  test("exposes a canonical identifier check that grants no authority by itself", () => {
    expect(canonicalRootSessionId(sessionId)).toBe(true)
    for (const id of ["--help", `ses_${"a".repeat(27)}`, "root-a", "", null]) expect(canonicalRootSessionId(id)).toBe(false)
  })

  test("accepts only its own minted identity, never a copy, clone or look-alike", () => {
    const identity = parseRootIdentity(session)
    expect(assertRootIdentity(identity)).toBe(identity)
    for (const forged of [{ agent: ROOT_AGENT, root_session_id: sessionId }, Object.freeze({ agent: ROOT_AGENT, root_session_id: sessionId }), { ...identity }, Object.freeze({ ...identity }), structuredClone({ agent: ROOT_AGENT, root_session_id: sessionId }), JSON.parse(JSON.stringify(identity)), Object.create(identity), sessionId, null, undefined, []]) {
      expect(code(() => assertRootIdentity(forged))).toBe("CT_ROOT_IDENTITY_INVALID")
    }
  })

  test("mints an identity that looks like a plain frozen record to every consumer", () => {
    const identity = parseRootIdentity(session)
    expect(Object.getPrototypeOf(identity)).toBe(Object.prototype)
    expect(Object.keys(identity).sort()).toEqual(["agent", "root_session_id"])
    expect(JSON.parse(JSON.stringify(identity))).toEqual({ agent: ROOT_AGENT, root_session_id: sessionId })
  })
})
