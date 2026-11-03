# README animation

The header animation uses a fictional repository and sample summary. It is not a live recording or an AI quality benchmark.

## Rebuild

Requirements: Node.js 22+, FFmpeg, FFprobe and a compatible browser. These are development requirements only; the extension does not need them.

From this directory:

```sh
npm ci --ignore-scripts
npm run lint
npm run render
```

The GIF is 960 × 480, 12 fps, 9 seconds, looping silently. Edit `index.html` to change the copy, layout or animation timeline. Output is written to `../assets/repolens.gif`.
