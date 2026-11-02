# README animation

An illustrated explanation of RepoLens, rendered by [Hyperframes](https://github.com/heygen-com/hyperframes). The fictional repository and sample summary are illustrative, not a recording or an AI quality benchmark.

Requirements: Node.js 22+, FFmpeg, FFprobe and Chromium. The extension itself needs none of these tools. From this directory:

```sh
npm ci --ignore-scripts
npm run lint
npm run render
```

The GIF is 960 × 480, 12 fps, 9 seconds, looping silently. Edit `index.html` to change the copy, layout or paused GSAP timeline. Hyperframes is a development dependency only. Set `HYPERFRAMES_NO_TELEMETRY=1` to disable CLI telemetry. Supply existing executables with `HYPERFRAMES_BROWSER_PATH`, `HYPERFRAMES_FFMPEG_PATH` and `HYPERFRAMES_FFPROBE_PATH` if needed. A FFprobe binary is included through the documentation-only `ffprobe-static` dependency; get its path with `node -p "require('ffprobe-static').path"`. The `undici` override fixes advisories in the upstream dependency.
