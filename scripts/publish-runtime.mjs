#!/usr/bin/env bun
import { resolve } from "node:path"

import { readRuntimePayload } from "../install/runtime-payload.mjs"
import { storeVersion } from "../install/version-store.mjs"

const [version, destination] = process.argv.slice(2)
if (!version || !destination) throw new Error("usage: publish-runtime.mjs <version> <data-root>")
const root = resolve(import.meta.dir, "..")
console.log(JSON.stringify(storeVersion(resolve(destination), version, readRuntimePayload(root, { strict: false }))))
