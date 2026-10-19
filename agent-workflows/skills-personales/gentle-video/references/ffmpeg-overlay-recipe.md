# ffmpeg overlay recipe (gentle-video, Pipeline A)

Composite branded caption overlays and glow highlights over screen footage.
Assumes footage is 1920x1080 or 1280x720, 30 fps. All commands verified on Linux with ffmpeg 6+.

## 1. Overlay HTML pattern

One HTML page sized exactly to the video frame. Static captions render to PNG;
animated ones (glow, slide-in) record to alpha WebM or render frame-by-frame.

```html
<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
  .caption {
    position: absolute; left: 120px; bottom: 120px;
    max-width: 720px; padding: 28px 36px;
    background: rgba(12, 8, 12, .88);
    border-left: 6px solid var(--accent, #F095C8);
    border-radius: 0 18px 18px 0;
    font-family: "Inter", system-ui, sans-serif; color: #F6EFF3;
  }
  .caption .kicker {
    font-family: "JetBrains Mono", monospace; font-size: 22px;
    letter-spacing: .18em; text-transform: uppercase;
    color: var(--accent, #F095C8); margin-bottom: 10px;
  }
  .caption .headline { font-size: 44px; font-weight: 800; line-height: 1.15; }
  .glow {  /* soft highlight over the app zone the viewer must watch */
    position: absolute; border-radius: 24px; pointer-events: none;
    box-shadow: 0 0 60px 18px var(--accent, #F095C8);
    border: 2px solid var(--accent, #F095C8); opacity: .8;
  }
</style></head>
<body>
  <div class="glow" style="left: 980px; top: 200px; width: 520px; height: 340px;"></div>
  <div class="caption">
    <div class="kicker">PROFILES</div>
    <div class="headline">Pick which model each profile uses.</div>
  </div>
</body></html>
```

- Static caption → screenshot at exact frame size:
  `npx playwright screenshot --viewport-size=1920,1080 --omit-background overlay.html cap1.png`
  (omit-background keeps alpha; install browsers once with `npx playwright install chromium`).
- Animated overlay → record the page or render frames to alpha WebM:
  `ffmpeg -framerate 30 -i frame_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p overlay.webm`

## 2. Static PNG overlays, one per segment

```bash
ffmpeg -i footage.mp4 -i cap1.png -i cap2.png -i music.m4a -filter_complex \
"[0:v][1:v]overlay=0:0:enable='between(t,2,12)'[v1]; \
 [v1][2:v]overlay=0:0:enable='between(t,12,25)'[v2]" \
-map "[v2]" -map 2:a -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
-shortest out.mp4
```

- Positioning: when the overlay PNG is exactly the video size, use `overlay=0:0`.
  For a smaller card PNG, position with `overlay=x=120:y=H-h-120` (bottom-left).
- Audio: `-map 0:a` keeps the recording's own audio; `-map 2:a` takes music from
  input 2 instead. Duck music under narration with `volume=0.35` on its input.

## 3. Alpha WebM overlay (animated glow / slide-in)

```bash
ffmpeg -i footage.mp4 -i overlay.webm -filter_complex \
"[0:v][1:v]overlay=0:0:shortest=1[v]" \
-map "[v]" -map 0:a -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p out.mp4
```

## 4. Verify the export (always)

```bash
ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,width,height,r_frame_rate out.mp4
ffmpeg -y -v error -i out.mp4 -vf "fps=1/15,scale=640:-1" frame_%02d.jpg
```

Show 3-4 sampled frames to the user before declaring the video done.

## 5. Gotchas

- `-pix_fmt yuv420p` is mandatory: players and social platforms reject yuv444.
- `shortest=1` / `-shortest` avoids a frozen last frame when overlay or audio runs long.
- Normalize footage first if sources differ: `ffmpeg -i in.mov -vf scale=1920:1080,fps=30 -c:v libx264 -crf 18 norm.mp4`.
- Extract narration/music requirement up front; never ship a silent social clip by default.
