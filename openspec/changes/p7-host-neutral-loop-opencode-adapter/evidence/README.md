# Reproduce the OpenCode 1.18.7 runtime evidence

This directory records the credential-free OpenCode `1.18.7` runtime boundary used by P7 reconciliation. The JSON file is the canonical deterministic record. It contains every legacy SDK call, payload, stable alias, event shape, HTTP result, and evidence classification needed to compare a rerun.

## Safety boundary

- Use a unique child of `/tmp/opencode`.
- Give the process isolated HOME and XDG config, data, and cache roots.
- Start OpenCode with an empty credential environment through `env -i`.
- Enable only the controlled `fixture-invalid/missing-model` model.
- Do not copy user config, credentials, sessions, databases, or caches.
- Do not call Control Tower APIs or a model provider.
- Always install a cleanup trap before starting the server.

## Pinned inputs

| Input | Required value |
|---|---|
| OpenCode | `1.18.7` |
| OpenCode binary SHA-256 | `5a0ffa7a5504bdde023a0c59cfa009654c52186d135b3b762f28e032ca2833b5` |
| `opencode-ai` integrity | `sha512-/C4Bc+mHbTK+GvhiZ83rguwVSNBs1sCzooQ3CCOz7G8SBYqbsXajlm0OtZ7RaMEUWxHWeMvOnGi4RC4OpAnC/g==` |
| `@opencode-ai/plugin` | `1.18.7` |
| Plugin integrity | `sha512-kXm5hqur5JiF/xJPaQYkuNn7vSl4ya09YgL/pIvIrggWCLFsfo1gXqNbONRcGW7m5Ih2k6kgMXFyjB9or1+dEg==` |
| `@opencode-ai/sdk` | `1.18.7` |
| SDK integrity | `sha512-5txVELvCxzC3O/MYnRKdTvBN3TqQjE3PaEks3kDRA/moWzMSUhdm15xCth/Mz/NPYyGTn2u4IdScdV9vLTfLRg==` |

Stop before capture if any pin differs.

## 1. Create isolated state

Verify the approved parent before creating a child:

```bash
ls -ld /tmp/opencode
```

Create the root and install the cleanup trap before starting any process:

```bash
ROOT="$(mktemp -d /tmp/opencode/p7-opencode-1.18.7.XXXXXX)"
SERVER_PID=""

cleanup() {
  if test -n "$SERVER_PID"; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$ROOT"
}

trap cleanup EXIT INT TERM

mkdir -p \
  "$ROOT/home" \
  "$ROOT/config" \
  "$ROOT/data" \
  "$ROOT/cache" \
  "$ROOT/workspace/.opencode/plugins" \
  "$ROOT/fixture"
```

The capture process receives only these environment names:

```text
PATH
HOME
XDG_CONFIG_HOME
XDG_DATA_HOME
XDG_CACHE_HOME
OPENCODE_CONFIG_DIR
OPENCODE_DISABLE_AUTOUPDATE
OPENCODE_DISABLE_SHARE
BUN_INSTALL_CACHE_DIR
P7_CAPTURE_LOG
```

## 2. Verify the binary and packages

The successful capture used the installed binary resolved from `opencode`:

```bash
BIN="$(readlink -f "$(command -v opencode)")"
test "$("$BIN" --version)" = "1.18.7"
test "$(sha256sum "$BIN" | cut -d' ' -f1)" = \
  "5a0ffa7a5504bdde023a0c59cfa009654c52186d135b3b762f28e032ca2833b5"
```

Install only the exact fixture packages inside the temporary root:

```bash
(
  cd "$ROOT/fixture"

  env -i \
    PATH="$PATH" \
    HOME="$ROOT/home" \
    XDG_CONFIG_HOME="$ROOT/config" \
    XDG_DATA_HOME="$ROOT/data" \
    XDG_CACHE_HOME="$ROOT/cache" \
    npm_config_cache="$ROOT/cache/npm" \
    npm init -y

  env -i \
    PATH="$PATH" \
    HOME="$ROOT/home" \
    XDG_CONFIG_HOME="$ROOT/config" \
    XDG_DATA_HOME="$ROOT/data" \
    XDG_CACHE_HOME="$ROOT/cache" \
    npm_config_cache="$ROOT/cache/npm" \
    npm install --ignore-scripts --save-exact \
      @opencode-ai/sdk@1.18.7 \
      @opencode-ai/plugin@1.18.7
)
```

npm 9.2.0 does not honor `npm init --prefix` as a safe output-directory selector, so the subshell changes its working directory explicitly.

Verify the resulting lockfile integrities against the JSON evidence before continuing. OpenCode may also bootstrap `@opencode-ai/plugin@1.18.7` into the isolated `OPENCODE_CONFIG_DIR` during the first workspace request. That isolated bootstrap can delay the first request; it must not resolve another version.

## 3. Configure the invalid model

Write this exact workspace configuration to `$ROOT/workspace/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "autoupdate": false,
  "share": "disabled",
  "model": "fixture-invalid/missing-model",
  "enabled_providers": ["fixture-invalid"],
  "formatter": false,
  "lsp": false
}
```

This model is intentionally absent. `promptAsync` can therefore prove admission and asynchronous failure without credentials or provider traffic.

## 4. Install the append-only hook

Write the following plugin to `$ROOT/workspace/.opencode/plugins/capture.js`. The output is append-only JSONL. The `tokens` usage object is not a credential and must not be redacted.

```js
import { appendFileSync } from "node:fs"

let receipt = 0
const log = process.env.P7_CAPTURE_LOG
const now = () => process.hrtime.bigint().toString()
const append = (entry) => appendFileSync(
  log,
  `${JSON.stringify({ ...entry, monotonicNs: now() })}\n`,
  { flag: "a" },
)

function redact(value, key = "") {
  if (/authorization|cookie|secret|password|api.?key|access.?token|refresh.?token|bearer/i.test(key)) {
    return "[REDACTED]"
  }
  if (Array.isArray(value)) return value.map((item) => redact(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey)]),
    )
  }
  return value
}

export const P7CapturePlugin = async ({ client, directory }) => {
  append({ phase: "plugin-loaded", directory })
  return {
    event: async (input) => {
      const current = ++receipt
      const event = input.event
      const sessionID = event?.properties?.info?.id ?? event?.properties?.sessionID
      append({
        phase: "hook-start",
        receipt: current,
        eventID: event?.id,
        sessionID,
        input: redact(input),
      })

      if (event?.type === "session.deleted" && sessionID) {
        const get = await client.session.get({
          path: { id: sessionID },
          query: { directory },
        })
        append({
          phase: "delete-callback-get",
          receipt: current,
          sessionID,
          status: get.response.status,
          hasData: get.data !== undefined,
          hasError: get.error !== undefined,
        })
      }

      if (event?.type === "session.created" && event.properties.info.title === "F-delay") {
        await new Promise((resolve) => setTimeout(resolve, 180))
      }

      append({
        phase: "hook-end",
        receipt: current,
        eventType: event?.type,
        sessionID,
      })
    },
  }
}
```

## 5. Start the isolated server

Select a free localhost port by binding `127.0.0.1:0`, reading the assigned port, closing that selector socket, and using the returned integer as `PORT`.

Start the server with the exact flags recorded in the JSON evidence:

```bash
env -i \
  PATH="$PATH" \
  HOME="$ROOT/home" \
  XDG_CONFIG_HOME="$ROOT/config" \
  XDG_DATA_HOME="$ROOT/data" \
  XDG_CACHE_HOME="$ROOT/cache" \
  OPENCODE_CONFIG_DIR="$ROOT/config/opencode" \
  OPENCODE_DISABLE_AUTOUPDATE=true \
  OPENCODE_DISABLE_SHARE=true \
  BUN_INSTALL_CACHE_DIR="$ROOT/cache/bun-install" \
  P7_CAPTURE_LOG="$ROOT/capture.jsonl" \
  "$BIN" serve \
    --hostname 127.0.0.1 \
    --port "$PORT" \
    --print-logs \
    --log-level DEBUG \
    >"$ROOT/server.log" 2>&1 &

SERVER_PID="$!"
```

Wait for a TCP connection to `127.0.0.1:$PORT` before running the driver. Do not probe `/` as a readiness endpoint.

## 6. Run the exact legacy SDK calls

Create the client through the default legacy export. Do not import `@opencode-ai/sdk/v2` and do not replace the SDK fetch implementation:

```js
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({ baseUrl })
```

Execute `legacy_sdk_calls` from `opencode-1.18.7-runtime-fixture.json` in object order. Resolve each stable session alias from the preceding create response. The setup calls for the recursive deletion tree are exact:

```js
const deleteRoot = await client.session.create({
  query: { directory },
  body: { title: "D-root" },
  throwOnError: true,
})

const deleteChildOne = await client.session.create({
  query: { directory },
  body: { title: "D-child-one", parentID: deleteRoot.data.id },
  throwOnError: true,
})

const deleteChildTwo = await client.session.create({
  query: { directory },
  body: { title: "D-child-two", parentID: deleteRoot.data.id },
  throwOnError: true,
})

const deleteGrandchild = await client.session.create({
  query: { directory },
  body: { title: "D-grandchild", parentID: deleteChildTwo.data.id },
  throwOnError: true,
})
```

After creating `E-root`, execute the exact `prompt_async` call from the JSON. Wait five seconds, execute `status_after_async_window`, then execute `abort_after_async_window`.

For scenario F, issue these two creates concurrently:

```js
await Promise.all([
  client.session.create({
    query: { directory },
    body: { title: "F-delay" },
    throwOnError: true,
  }),
  client.session.create({
    query: { directory },
    body: { title: "F-fast" },
    throwOnError: true,
  }),
])
```

## 7. Compare the deterministic evidence

Normalize dynamic IDs by title and relationship:

```text
A-root        S01
B-child       S02
C-missing     S03
C-object      S04
D-root        S05
D-child-one   S06
D-child-two   S07
D-grandchild  S08
E-root        S09
F-delay       S10
F-fast        S11
```

Alias the prompt user message as `M01`, its text part as `P01`, and event IDs by receipt as `EV01` through `EV26`. Remove timestamps, slugs, concrete paths, ports, and generated IDs before comparison.

The rerun passes only when all of these match the JSON:

- Scenario A-F outcomes.
- HTTP statuses and SDK result shapes.
- Receipt type/order and parent relationships.
- Event payload field shapes.
- Recursive deletion callback GET results.
- Intentional delayed-hook ordering.
- Absence of a retry event.
- Absence of provider traffic and credentials.

Do not treat absent retry or a successful provider turn as fixture failure. Those facts are explicitly classified as source-only/unproven and unexercised.

## 8. Prove cleanup

Terminate and wait for the server before removing the fixture root:

```bash
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

ss -ltnp "sport = :$PORT"
cleanup
test ! -e "$ROOT"
```

The `ss` command must show no listener row. The final `test` must succeed. The shell trap remains installed so interruption follows the same cleanup path.

## Expected result

The expected normalized result is `scenario_outcomes`, `receipt_sequence`, `event_payload_shapes`, `hook_ordering`, and `observed_http_and_result_behavior` in the JSON evidence. Retry remains source-only/unproven. A successful provider turn remains unexercised. No evidence reference or precursor commit identity is assigned in this artifact set.
