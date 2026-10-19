# App session capture (gentle-video, Pipeline A)

Film a real app session by scripting it with Playwright — for apps that run in a
browser (Expo web, React Native web, plain web apps). Produces authentic footage
("the app being used") without a real phone or OBS.

## 1. Session: the owner logs in ONCE, credentials never cross the chat

```js
import { chromium } from "playwright";
const ctx = await chromium.launchPersistentContext("<project>/.app-profile", {
  headless: false, // headed: a window opens on the owner's desktop
  viewport: { width: 420, height: 900 },
});
await ctx.pages()[0].goto("http://localhost:8092", { waitUntil: "domcontentloaded" });
// owner logs in inside this window; on close, the session persists in the profile dir
```

- WSLg gotcha: background jobs do NOT inherit `DISPLAY` — pass `DISPLAY=:0`
  explicitly (socket at `/tmp/.X11-unix/X0`).
- After login, stop the headed browser before recording; reuse the SAME profile
  dir in headless mode. Verify the session survived with a screenshot first.
- Never echo credentials into the chat; offer a local `.env.local` file as the
  alternative path.

## 2. Storyboard before filming

Tour every screen once, screenshot each tab, and design the segment list from
the real content (titles, prices, states). Choose per segment: timestamp range,
caption kicker + headline, and the highlight zone.

## 3. Record the tour

```js
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  viewport: { width: 420, height: 900 },
  recordVideo: { dir: outDir, size: { width: 420, height: 900 } },
});
```

- Only navigate, scroll, and view. NEVER press buttons that mutate data
  (accept, pay, publish) without explicit owner authorization for that take.
- Close the context to flush the video (webm).
- `recordVideo` captures the viewport: what you storyboard is what you get.

## 4. Verify footage, then compose

- `ffprobe` the webm for duration; sample frames ACROSS the whole clip —
  loading spinners are normal app behavior, decide per segment whether to keep.
- webm → mp4 before embedding in Remotion (`-c:v libx264 -pix_fmt yuv420p`);
  use `<OffthreadVideo src={staticFile(...)}>`.
- Derive segment boundaries from the recording script's own timing; document
  them as constants in the composition.

## 5. Pitfalls (each cost a debug round once)

- `interpolate(input, inputRange, outputRange)` needs ARRAY ranges — scalars
  throw `TypeError: arr is not iterable` at render time.
- Segment-selection math: pass the value in the unit the function expects and
  TEST it across the whole timeline — a double division by fps froze captions
  on segment 1 while the footage moved on. Caught only by sampling frames at
  several timestamps, never by the first frame.
- Expo web does not forward `console.log` to the terminal (only warn/error):
  capture the browser console in the probe script itself.
- Supabase-hosted projects: fake email domains are rejected (400) and auth
  emails are rate-limited (429, resets hourly) — prefer existing accounts.
- Verify every export with `ffprobe` + distributed sample frames, and show the
  owner 4+ frames before declaring done.
