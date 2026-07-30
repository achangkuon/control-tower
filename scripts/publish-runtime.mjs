#!/usr/bin/env bun
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { storeVersion } from "../install/version-store.mjs"

const [version, destination] = process.argv.slice(2)
if (!version || !destination) throw new Error("usage: publish-runtime.mjs <version> <data-root>")
const root = resolve(import.meta.dir, "..")
const paths = ["bin/torre", "install/version-store.mjs", "install/active-pointer.mjs", "install/lifecycle.mjs"]
console.log(JSON.stringify(storeVersion(resolve(destination), version,
  Object.fromEntries(paths.map((path) => [path, readFileSync(resolve(root, path))])))))
