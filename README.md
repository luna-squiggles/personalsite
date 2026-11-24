# lunamustfa.com

Plain HTML, CSS and JS. Netlify publishes the repo root on every push to `main`.

## Cloth tuner

`tune.js` is a panel for adjusting the cloth background: the weave (type, threads, width, spacing, irregularity, noise and so on), the colours, and how strongly each texture layer is blended in. It's switched off on the live site. To use it, preview locally and add `?tune`:

```sh
python3 -m http.server 8765
# then open http://localhost:8765/?tune
```

Changes show live and stick in that browser. "Copy settings" copies them as JSON; paste them into `DEFAULTS` in `cloth.js` to make them the real thing.
