---
name: ego-verify
description: Verify what was just implemented by driving the real app with ego-browser while narrating every step live for the owner. Trigger: verify, verificá lo implementado, probá lo que hiciste, check en ego — and run it automatically after implementing any change that is visible or usable in an app. Produces a per-flow verdict report; does not accumulate screenshots.
metadata:
  author: gentleman-programming
  version: "1.0.0"
  date: "2026-10-22"
---

# ego-verify

Verify implemented work by using the app the way the owner would, in ego-browser, while the owner watches.

## Activation

- Explicit: the owner asks to verify or check what was implemented ("verificá", "verify", "probá lo que hiciste").
- Automatic: right after implementing any change that is visible or usable in an app — before reporting "done". The standing rule lives in the agent instruction block `chanks:ego-browser`.

## Hard rules

- Read the `ego-browser` skill first and follow it; it owns how ego is operated. This skill only defines the verification procedure.
- ego runs on Windows; the agents run in WSL. Launch it through the bridge: `ego-browser` (`~/.local/bin/ego-browser` → machine-setup/tools/ego-bridge). Never open `file:///home/...`: serve by HTTP or use `//wsl.localhost/Ubuntu/...` (`wslpath -w` converts paths).
- Narrate each step in chat as you perform it (one short line per action: what you open, what you click, what you expect). The owner watches the browser live.
- Do not accumulate screenshots; the deliverable is the report. Take one only if the owner asks or a bug needs visual evidence.
- If the owner takes control of a TaskSpace, stop; never retake control without their explicit request.
- Do not clear cookies, cache, or storage of the owner's profile.
- If nothing implemented is observable through the app (pure refactor, no user-visible behavior), say so and skip: no ritual verification.

## Procedure

1. **Scope.** Determine what changed (diff, feature doc, task list). List the user-visible flows affected. That list is the verification checklist.
2. **App running.** Ensure the app is reachable (dev server URL). Start it if needed and say so.
3. **Session.** Open the app in the existing ego TaskSpace session when possible. For account-gated flows, reuse the owner's logged-in session (see `navegador-rea` for logged-session walkthroughs).
4. **Walk.** For each flow: narrate the intent, perform it through the public interface (clicks, forms, navigation — not internal state), and observe the expected outcome from the task's spec or the owner's request.
5. **Failures.** When reality differs from expectation: name the flow, expected vs observed, and the likely area. Do not fix inside the verification pass unless the owner asks.
6. **Report.** One line per flow: ✅ or ❌ with expected vs seen. Then list failed or skipped checks and the next step. No screenshots unless evidence was needed.
