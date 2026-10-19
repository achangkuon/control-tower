---
name: gentle-video
description: "Trigger: hacer un video, video de producto, demo en video, clip para redes, video con Remotion, rótulos sobre grabación de pantalla. Produce videos via OBS+ffmpeg screen-capture pipeline or programmatic Remotion render, any model."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load when the user asks to produce or replicate a video: product demos with screen recordings, animated explainers, repeatable social clips, or videos like the Gentle Dot features clip (screen footage + branded caption overlays + music).

## Hard Rules

- Nothing is model-provider-tied: deliverables are source files (HTML, React, ffmpeg commands) any model can write and any machine can render.
- NEVER fabricate screen footage. Real-app demos use recordings the user provides (OBS or similar). Ask for them before planning the edit; list anything missing as pending.
- Palette follows the gentle-deck rule: recommend from conversation context, propose 2-3 options, wait for confirmation.
- Caption overlays reuse the deck's visual language: mono uppercase kicker + bold headline + accent bar.
- Verify every export with `ffprobe` (duration, resolution, codec) and sampled frames. Never trust the render command alone.

## Decision Gates

| Video type | Pipeline |
|-----------|----------|
| Real app demo, footage already recorded | A: OBS footage + HTML overlays + ffmpeg |
| Real app demo, app runs in a browser (Expo web, web app) | A: scripted Playwright session capture — owner logs in once in a controlled window, the script films the tour (`references/app-session-capture.md`) |
| Animated explainer, branded social clip, data-driven repeatable video | B: Remotion project |
| Mixed: real footage inside animated framing | B, embedding the footage file in the Remotion timeline |

| Delivery target | Format |
|-----------------|--------|
| YouTube / desktop | 1920x1080 or 1280x720, 30 fps, h264 + aac, yuv420p |
| Reels / TikTok / Shorts | 1080x1920 vertical, same codecs |

## Execution Steps — Pipeline A (footage + overlays)

1. Confirm footage files, target format, and duration budget (aim under ~3 min for social). If the app runs in a browser and no footage exists, capture it yourself via `references/app-session-capture.md` (owner logs in once in a controlled window; credentials never cross the chat).
2. Storyboard: per segment — timestamp range, caption kicker + headline, highlight zone (the app area the viewer must watch).
3. Generate overlay HTML sized to the video frame (lower-third cards, animated glow); follow `references/ffmpeg-overlay-recipe.md`. For a Remotion composition, embed the footage and put glow/captions as components on top.
4. Render overlays (headless Chromium PNG/WebM or an OBS scene) and composite with ffmpeg `overlay`; mux audio; encode h264.
5. Verify with `ffprobe` and frames sampled across the WHOLE video (never only the first seconds); show the user 4+ sample frames.

## Execution Steps — Pipeline B (Remotion)

1. Scaffold minimal Remotion (see `references/remotion-notes.md`); components' copy in the conversation language, identifiers in English.
2. Feed dynamic content via JSON props (metrics, names, dates) so re-rendering regenerates the video with fresh data.
3. Render with `npx remotion render`, then verify exactly as Pipeline A step 5.

## Output Contract

- Final MP4 path plus an `ffprobe` summary; the storyboard file; overlay or project sources.
- Missing footage, audio, or brand assets listed as pending — never invented or replaced by placeholders without saying so.

## References

- `references/ffmpeg-overlay-recipe.md` — exact ffmpeg commands, overlay HTML pattern, verification steps.
- `references/app-session-capture.md` — scripted capture of a real app session with Playwright (persistent login, recording, storyboard, pitfalls).
- `references/remotion-notes.md` — minimal project layout and data-driven rendering.
