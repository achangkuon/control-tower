# Remotion notes (gentle-video, Pipeline B)

Remotion renders videos from React components. Works with any model: the model
writes the components, the render is a local command. Node >= 18 required.

## Minimal scaffold

```bash
mkdir my-video && cd my-video
npm init -y
npm i react react-dom remotion @remotion/cli
mkdir src
```

`src/index.ts`:

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
```

`src/Root.tsx`:

```tsx
import { Composition } from "remotion";
import { MyVideo, myVideoSchema } from "./MyVideo";

export const RemotionRoot = () => (
  <Composition
    id="MyVideo"
    component={MyVideo}
    durationInFrames={30 * 60}   // 60 s at 30 fps
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ title: "Weekly recap", total: 1234 }}
  />
);
```

## Data-driven rendering

Declare props with zod (`z.object()` from `remotion`), then re-render with new
data — this is what makes repeatable clips (weekly metrics, product promos):

```bash
npx remotion render src/index.ts MyVideo out.mp4 \
  --props='{"title":"Resumen semana 42","total":1820}'
```

Read per-frame values with `useCurrentFrame()` and `interpolate()`; use the
`<Sequence>` component to time sections; `<Audio src={staticFile("music.mp3")} />`
for sound; `<Video src={staticFile("demo.mp4")} />` to embed real screen footage
inside an animated framing.

## Useful commands

```bash
npx remotion studio        # preview in the browser while iterating
npx remotion render ...    # final MP4 (h264 + aac by default)
```

## Conventions

- Component copy in the conversation language; identifiers and comments in English.
- Keep brand colors in a single `theme.ts` exported as constants, agreed with the user first.
- Verify exports with `ffprobe` and sampled frames, same as Pipeline A.
