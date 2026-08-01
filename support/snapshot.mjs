import { createHash } from "node:crypto"

const fail = (code, message, cause) => { throw Object.assign(new Error(message, { cause }), { code }) }
const digest = (value) => createHash("sha256").update(value).digest("hex")
const fixedQueries = Object.freeze({
  schema: "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger','view') AND name NOT LIKE 'sqlite_%' ORDER BY type,name",
  agents: "SELECT name,role,worktree,branch,state,task,note,pr_url,updated_at FROM agent ORDER BY name",
  locks: "SELECT name,holder,acquired_at FROM lock ORDER BY name",
})
const expectedSchema = new Map([
  ["agent", "CREATE TABLE agent(name TEXT PRIMARY KEY,role TEXT NOT NULL,worktree TEXT NOT NULL,branch TEXT,state TEXT NOT NULL,task TEXT,note TEXT,pr_url TEXT,updated_at TEXT NOT NULL)"],
  ["lock", "CREATE TABLE lock(name TEXT PRIMARY KEY,holder TEXT,acquired_at TEXT)"],
])
const knownObject = (name) => ["agent", "lock", "message", "message_pending"].includes(name) || name.startsWith("ct_")
const normalizeSql = (sql) => sql.replace(/\s+/g, " ").replace(/\s*([(),])\s*/g, "$1").trim()
const matchesExpectedTable = (schema, name, sql) => schema.some((row) =>
  row.type === "table" && row.name === name && row.tbl_name === name && normalizeSql(row.sql) === sql)
const validSchema = (schema) => schema.every(({ name }) => knownObject(name))
  && [...expectedSchema].every(([name, sql]) => matchesExpectedTable(schema, name, sql))

export const captureSupportSnapshot = (manifest, ports) => {
  let db
  try {
    try { db = ports.openDatabase(manifest.db_path, { readonly: true, create: false }) }
    catch (error) { fail("CT_SUPPORT_DB_UNAVAILABLE", "Support database is unavailable", error) }
    db.exec("PRAGMA query_only=ON")
    const queryOnly = db.query("PRAGMA query_only").get()
    if (queryOnly?.query_only !== 1) fail("CT_SUPPORT_DB_READONLY_REQUIRED", "SQLite query_only is not active")
    db.exec("BEGIN DEFERRED TRANSACTION")
    let schema, agents, locks
    try {
      schema = db.query(fixedQueries.schema).all()
      if (!validSchema(schema))
        fail("CT_SUPPORT_DB_SCHEMA_INVALID", "Unknown Support database schema")
      agents = db.query(fixedQueries.agents).all()
      locks = db.query(fixedQueries.locks).all()
      db.exec("COMMIT")
    } catch (error) {
      try { db.exec("ROLLBACK") } catch {}
      throw error
    }
    const evidence = JSON.stringify({ schema, agents, locks })
    const sources = [...manifest.documents].map(([path, body]) => ({ path, sha256: digest(body) }))
    sources.push({ path: manifest.db_path, sha256: digest(evidence) })
    sources.sort((a, b) => a.path.localeCompare(b.path))
    return Object.freeze({ sources: Object.freeze(sources), documents: manifest.documents,
      agents: Object.freeze(agents), locks: Object.freeze(locks) })
  } catch (error) {
    if (error?.code?.startsWith("CT_SUPPORT_")) throw error
    fail("CT_SUPPORT_DB_INVALID", "Support snapshot failed", error)
  } finally { try { db?.close() } catch {} }
}
