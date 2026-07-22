import { existsSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import * as tower from "../../core.mjs"

const [cwd, recipient, signals] = process.argv.slice(2)
const handle = tower.open(cwd)
const database = handle.db
let paused = false

const db = new Proxy(database, {
  get(target, property) {
    if (property === "run") {
      return (sql, ...params) => {
        if (!paused && String(sql).startsWith("INSERT INTO message")) {
          paused = true
          writeFileSync(join(signals, "operation-paused"), "")
          while (!existsSync(join(signals, "allow-operation"))) {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
          }
        }
        return target.run(sql, ...params)
      }
    }

    const value = Reflect.get(target, property, target)
    return typeof value === "function" ? value.bind(target) : value
  },
})

try {
  tower.send({ ...handle, db }, { to: recipient, text: "interleaved message" })
  writeFileSync(join(signals, "operation-returned"), "")
} finally {
  database.close()
}
