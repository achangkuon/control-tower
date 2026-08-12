import { describe, expect, test } from "bun:test"

export const defineHostAdapterConformance = ({ host, createFixture }) => {
  const scenario = (id, name, exercise, expected) => test(`${id}@${host} ${name}`, () => {
    const fixture = createFixture()
    exercise(fixture.actions)
    expect(fixture.observe()).toEqual(expected)
  })

  describe(`${host} host lifecycle conformance`, () => {
    scenario("CT-R5-S1", "child deletion preserves polling", ({ settleRoot, createChild, deleteChild }) => {
      settleRoot()
      createChild()
      deleteChild()
    }, ["bind-root", "settle-root"])

    scenario("CT-R5-S2", "matching root deletion stops polling", ({ deleteRoot }) => {
      deleteRoot()
    }, ["bind-root", "delete-root"])

    scenario("CT-R5-S3", "child creation is an idle no-op", ({ settleRoot, createChild }) => {
      settleRoot()
      createChild()
    }, ["bind-root", "settle-root"])

    scenario("CT-R5-S4", "child idle is ignored", ({ createChild, idleChild }) => {
      createChild()
      idleChild()
    }, ["bind-root"])

    scenario("CT-R5-S5", "plugin disposal invalidates synchronously", ({ dispose }) => {
      dispose()
    }, ["bind-root", "dispose-plugin"])
  })
}
