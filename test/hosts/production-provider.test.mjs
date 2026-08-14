import { expect, test } from "bun:test"

import { createProductionProvider } from "../../hosts/production-provider.mjs"

test("production provider rejects an unpackaged module before accepting caller launch authority", () => {
  expect(() => createProductionProvider({
    cwd: "/attacker", environment: { HERDR_ENV: "1", PATH: "/attacker" },
    recordPath: "/attacker/record.json", herdrBin: "/attacker/herdr", opencodeBin: "/attacker/opencode",
  })).toThrow("Main launch store is unavailable")
})

test("production provider exposes no caller supplied executable or environment configuration", () => {
  expect(createProductionProvider.length).toBe(0)
})
