import { execFileSync, spawnSync } from "node:child_process"
import { delimiter } from "node:path"
import { fileURLToPath } from "node:url"

export const gitRoutingVariables = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_PREFIX",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_QUARANTINE_PATH",
]

const gitProxyDirectory = fileURLToPath(new URL("./bin", import.meta.url))

const isolatedGitEnvironment = (environment) => {
  const isolated = { ...environment, CT_GIT_PROXY_DIR: gitProxyDirectory }
  for (const name of gitRoutingVariables) delete isolated[name]
  return isolated
}

const pathEntries = (process.env.PATH ?? "").split(delimiter)
if (!pathEntries.includes(gitProxyDirectory)) {
  process.env.PATH = [gitProxyDirectory, ...pathEntries].join(delimiter)
}
process.env.CT_GIT_PROXY_DIR = gitProxyDirectory

export const git = (cwd, args, options = {}) => {
  const { result = false, ...processOptions } = options
  const launch = result ? spawnSync : execFileSync
  return launch("git", args, {
    ...processOptions,
    cwd,
    env: isolatedGitEnvironment(processOptions.env ?? process.env),
  })
}
