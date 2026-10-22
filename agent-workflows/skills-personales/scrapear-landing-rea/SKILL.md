---
name: scrapear-landing-rea
description: "Trigger: escrapea esta landing con REA, captura esta página para estudio, analizá este sitio para armar una landing, estructura de esta página de venta, referencia visual de una landing. Capture and analyze a public landing page in ego-browser (Playwright as fallback) with REA (structure, information architecture, design system) to build our own landing — never copying brand, texts or code."
license: Apache-2.0
metadata:
  author: emili
  version: "2.0"
---

## Activation Contract

Load this skill when the owner asks to scrape/analyze a **public** landing or
sales page with REA as reference to build our own. Do NOT use it for apps
behind login (use `navegador-rea` with his account instead). REA rules are
standing: understand structure and functions; NEVER copy brand, texts, code,
images or mascot. Pages behind login only with the owner's account and his
explicit authorization.

## Hard Rules

- **Browser: ego-browser first** (visible: the owner watches the capture). Run `ego-browser skill` once per session. Public pages need no specific profile: use the default. Fall back to headless Playwright (recipe below) only if `ego-browser` is missing or fails, or when one single full-page image is required.
- Work inside the investigation's target folder (`referencia-<nombre>/{capturas,textos}/`), never /tmp, so the material survives. ego scripts run on Windows: write with UNC paths (`\\wsl.localhost\Ubuntu\home\...`).
- The deliverable is an **analysis doc**, not a clone: structure, order, function and a measured design system, always in our own words.

## Recipe (ego)

```bash
ego-browser nodejs <<'EOF'
const OUT = "\\\\wsl.localhost\\Ubuntu\\home\\emili\\<folder>\\referencia-<nombre>";
const { writeFile, mkdir } = await import("node:fs/promises");
await mkdir(OUT + "\\capturas", { recursive: true }); await mkdir(OUT + "\\textos", { recursive: true });
const task = await taskSpace("landing <nombre>");
const p = task.page("p1");
await p.goto("<URL>");
await p.waitForTimeout(6000);
// 1. Progressive scroll with one screenshot per section (ego 0.6 cannot take full-page shots of long pages).
const h = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0, i = 0; y < h; y += 800, i++) {
  await p.mouse.wheel(0, i ? 800 : 0, { label: "Bajar por la landing" });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}\\capturas\\desktop-${String(i).padStart(2, "0")}.png` });
}
await writeFile(OUT + "\\textos\\landing.txt", await p.evaluate(() => document.body.innerText));
// 2. Structure: headings in order, nav, CTAs, top computed colors, fonts (keep each evaluate < 15 s).
const r = await p.evaluate(() => { /* secs=[h1..h3 in order]; nav=header a; ctas=buttons/links <45 chars;
  colores = counted computed color/backgroundColor/backgroundImage; fuentes = unique families */ });
await writeFile(OUT + "\\textos\\estructura.json", JSON.stringify(r, null, 2));
// 3. Mobile pass: emulate 390x844, repeat the scroll + screenshots, then restore.
await p.cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await p.reload(); await p.waitForTimeout(4000);
/* same loop, files mobile-NN.png */
await p.cdp("Emulation.clearDeviceMetricsOverride", {});
console.log(await p.snapshot());
EOF
```

## Fallback: headless Playwright

Use it when ego is unavailable, or when a single full-page image is needed (`NODE_PATH=$(npm root -g)`):

```javascript
const { chromium } = require('playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('<URL>', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(6000);
const h = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += 700) { await p.evaluate(yy => window.scrollTo(0, yy), y); await p.waitForTimeout(350); }
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1500);
await p.screenshot({ path: 'capturas/landing-full-desktop.png', fullPage: true });
// Mobile: a new page with viewport 390x844, same scroll, fullPage screenshot.
await b.close();
```

## Analysis doc (estructura-landing-rea.md) — required sections

1. **Arquitectura de información**: table of blocks IN ORDER, each with its
   retorical function (what fear it kills or what it sells) — read the
   headings + `landing.txt`, not only the DOM.
2. **Patrones transversales**: CTA count and placement, voice/person, use of
   numbers, how the product handles its own limits, who the «enemy» is.
3. **Sistema de diseño medido**: top computed colors (background, text,
   accent), fonts, component shapes — measured, not guessed.
4. **Esqueleto propio**: the same architecture translated block by block to
   OUR product, own words, with a final list of what is missing to write the
   real content (product definition, ICP, differentiators).

## Gotchas

- `networkidle` never fires on marketing pages: use `domcontentloaded` + waits.
- Without the progressive scroll, full-page screenshots come back half-empty.
- Landing texts live in JS-rendered sections: `body.innerText` after the
  scroll beats `fetch_content` for completeness; use both (fetch first for a
  readable base, the scrape for structure).
- Report what the page does NOT show (menus never opened, links to app
  behind login) — same discipline as the webinar captures.
