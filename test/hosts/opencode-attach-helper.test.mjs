import { expect, test } from "bun:test"

import { createOpenCodeAttachHelper } from "../../hosts/opencode-attach-helper.mjs"

const target = { backend_url: "http://127.0.0.1:4096", root_session_id: `ses_${"a".repeat(26)}`, worktree: "/work/a" }

test("redeems inside the private helper and never returns or passes a credential ref", () => {
  const calls = [], secret = "s".repeat(32)
  const helper = createOpenCodeAttachHelper({ channel: { take: (worktree) => { calls.push(["take", worktree]); return { ...target, secret } } }, attach: (input) => { calls.push(["attach", input]); return { status: 0 } } })
  expect(helper.run({ worktree: target.worktree })).toEqual({ status: 0 })
  expect(calls).toEqual([["take", "/work/a"], ["attach", { ...target, secret }]])
  expect(String(helper.run)).not.toMatch(/credential_ref|OPENCODE_SERVER_PASSWORD/)
})

test("rejects caller targets and propagates lifecycle rejection before attach", () => {
  let attached = false
  const helper = createOpenCodeAttachHelper({ channel: { take: () => { throw Object.assign(new Error("revoked"), { code: "CT_CREDENTIAL_REJECTED" }) } }, attach: () => { attached = true } })
  expect(() => helper.run({ worktree: "/work/a", credential_ref: "foreign" })).toThrow("Attach helper accepts only its worktree")
  expect(() => helper.run({ worktree: "/work/a" })).toThrow("revoked")
  expect(attached).toBe(false)
})
