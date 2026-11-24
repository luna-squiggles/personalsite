# lunamustfa.com

Plain HTML, CSS and JS. Netlify publishes the repo root on every push to `main`.

## Cloth tuner

`tune.js` is a panel for adjusting the cloth background: the weave (type, threads, width, spacing, irregularity, noise and so on), the colours, and how strongly each texture layer is blended in. It's switched off on the live site. To use it, preview locally and add `?tune`:

```sh
python3 -m http.server 8765
# then open http://localhost:8765/?tune
```

Changes show live and stick in that browser. The live site doesn't generate anything: it uses a baked weave tile (`texture/weave.webp`) and fixed layer settings in `style.css` (the `.cloth-layer` rules). To make new settings real, use "Download weave" (convert it to WebP and replace `texture/weave.webp`), and copy the strengths and blend modes from "Copy settings" into those CSS rules. Also update `DEFAULTS` at the top of `tune.js` so the panel starts from what's live.
