---
name: navegador-rea
description: "Trigger: abre el navegador, abrí el navegador para iniciar sesión, recorrer esta app con mi cuenta, navegador para scrapear con REA, sesión de navegador persistente. Walk an app with the owner's logged-in account in ego-browser (visible, persistent sessions), Playwright over CDP as fallback, for REA walkthroughs (Stockeado-style). Not for headless scraping of public pages."
license: Apache-2.0
metadata:
  author: emili
  version: "2.0"
---

## Activation Contract

Load this skill when the user asks to open a browser to walk through an app with his own account (REA-style), or to keep an interactive browser session alive across several scripted steps. Do NOT use it for plain public-page scrapes (use `scrapear-landing-rea`), and do NOT use it to bypass logins. Pages behind a login are walked only with the owner's account and his explicit authorization. Standing REA rule: understand structure and functions; never copy third-party code, text or brand.

## Hard Rules

- **Browser: ego-browser first.** Run `ego-browser skill` once per session and follow it. It ends with the owner's profile map: pick the profile that fits the app (default `Profile 1`, business). Fall back to Playwright (recipe below) only if `ego-browser` is missing or fails.
- One task space per walkthrough (`taskSpace("<site> walkthrough", { profileId })`). Reuse it by name or id in later rounds: spaces, tabs and sessions persist, JavaScript variables do not.
- The owner watches: give every click a short `label`. Batch several actions in one script and end with a snapshot.
- Never ask for credentials in chat. If the site shows a login, stop: the owner logs in inside the agent's ego space and tells you to continue.
- Store evidence next to the investigation (`<folder>/capturas/`, `<folder>/textos/`), never only in /tmp. ego scripts run on Windows: write with UNC paths (`\\wsl.localhost\Ubuntu\home\...`).

## Recipe (ego)

```bash
ego-browser nodejs <<'EOF'
const task = await taskSpace("stockeado walkthrough", { profileId: "Profile 1" });
const p = task.page("p1");
await p.goto("https://<site>/");
await p.click("text=Inventario", { label: "Abrir Inventario" });
await p.waitForTimeout(3500);                       // SPAs: networkidle rarely settles
await p.screenshot({ path: "\\\\wsl.localhost\\Ubuntu\\home\\emili\\<folder>\\capturas\\inventario.png" });
console.log(await p.evaluate(() => document.body.innerText.slice(0, 4000)));
console.log(await p.snapshot());
EOF
```

- Save long text dumps with `node:fs/promises` `writeFile` to a UNC path instead of printing them.
- `page.evaluate()` times out after 15 s: keep each call small.
- If `taskSpace(name, { profileId })` says the space already exists, call `taskSpace(name)`; the space keeps its original profile.

## Gotchas learned the hard way

- SPA with its own offline guard (e.g. Stockeado's «Sin conexión»): `p.reload()`, never a new space.
- Buttons are not always `<button>`: use `text=…`, `loc=role:button[name='…']`, or refs from the snapshot (`@12`).
- Close dialogs with `await p.keyboard.press("Escape")` between steps, so one open modal does not break the next selector.
- Full-page screenshots fail on long pages in ego 0.6 beta: take one viewport screenshot per section while scrolling.

## Fallback: Playwright over CDP (only when ego is unavailable)

```bash
export DISPLAY=:0                                    # WSLg: Chrome dies without it
google-chrome --remote-debugging-port=9333 --user-data-dir="$PWD/profile" \
  --window-size=1520,960 --no-first-run --no-default-browser-check \
  "https://<site>/login" > chrome.log 2>&1 &          # background job; never kill it at the end
until curl -s --max-time 2 http://localhost:9333/json/version | grep -q Browser; do sleep 1; done
```

```javascript
const { chromium } = require('playwright');          // NODE_PATH=$(npm root -g)
const b = await chromium.connectOverCDP('http://localhost:9333');
const p = b.contexts()[0].pages().find(x => x.url().includes('<site>'));
```

Only `google-chrome` exists (`chromium-browser` does not). If port 9333 answers, reconnect instead of relaunching; a killed node script closes only the CDP connection.
