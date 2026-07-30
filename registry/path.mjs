import { isAbsolute, join } from "node:path"

const pathError = () => { throw Object.assign(new Error("Project registry root must be absolute"), { code: "CT_REGISTRY_PATH_INVALID" }) }

export const resolveProjectRegistryPath = ({ env = process.env } = {}) => {
  const override = env?.XDG_CONFIG_HOME
  const root = typeof override === "string" && override.length > 0
    ? override
    : typeof env?.HOME === "string" && env.HOME.length > 0
      ? join(env.HOME, ".config")
      : pathError()
  if (!isAbsolute(root) || root.includes("\0")) pathError()
  return join(root, "control-tower", "projects.yaml")
}
