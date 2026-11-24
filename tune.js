// A panel of controls for the cloth, for local previews only: index.html
// loads it on localhost with ?tune (see README.md). It holds the weave
// generator (after texturize.app's fabric generator) that made
// texture/weave.webp, and restyles the cloth layers live. Changes are kept
// in this browser; "Copy settings" puts them on the clipboard. To make them
// real: bake a new weave.webp from the panel ("Download weave") and copy the
// numbers into the .cloth-layer rules in style.css.
(function () {
    // what the live site uses now
    const DEFAULTS = {
        paper: '#fffcf5',
        seed: 1, weave: 'twill', threads: 51, threadWidth: 7, threadSpacing: 2,
        irregularity: 0.6, noise: 0.5, round: 0.12, uneven: 0.05, gapShade: 0.8,
        warp: '#ffffff', weft: '#fbf5ec', scale: 0.5,
        weaveOpacity: 0.22, weaveBlend: 'darken',
        slubOpacity: 0.33, slubBlend: 'color-burn',
        mottleOpacity: 0.36, mottleBlend: 'multiply',
        fibreOpacity: 0.35, fibreBlend: 'multiply',
    };
    const REPEATS = { plain: 2, twill: 3, satin: 5 };
    const WEAVE_KEYS = ['seed', 'weave', 'threads', 'threadWidth', 'threadSpacing', 'irregularity', 'noise', 'round', 'uneven', 'gapShade', 'warp', 'weft'];
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('clothTune') || '{}'); } catch (e) { saved = {}; }
    const settings = Object.assign({}, DEFAULTS, saved);

    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

    function weaveTile(s) {
        let seed = Math.max(1, Math.round(s.seed));
        const rand = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
        const repeat = REPEATS[s.weave] || 2;
        const count = Math.max(repeat, Math.ceil(s.threads / repeat) * repeat);
        const width = Math.max(1, Math.round(s.threadWidth));
        const cell = width + Math.max(0, Math.round(s.threadSpacing));
        const TILE = count * cell;
        const wanderBy = s.irregularity * 2.5;
        const grain = s.noise * 0.12;
        const WARP = rgb(s.warp), WEFT = rgb(s.weft);

        const wander = () => {
            const k1 = 1 + Math.floor(rand() * 3), k2 = 3 + Math.floor(rand() * 4);
            const p1 = rand() * 6.283, p2 = rand() * 6.283;
            return (t) => wanderBy * (Math.sin(6.283 * k1 * t / TILE + p1) + 0.5 * Math.sin(6.283 * k2 * t / TILE + p2));
        };
        const tone = () => {
            const base = (rand() * 2 - 1) * s.uneven;
            const k1 = 2 + Math.floor(rand() * 5), k2 = 7 + Math.floor(rand() * 9);
            const p1 = rand() * 6.283, p2 = rand() * 6.283;
            return (t) => 1 + base + s.uneven * (0.6 * Math.sin(6.283 * k1 * t / TILE + p1) + 0.4 * Math.sin(6.283 * k2 * t / TILE + p2));
        };
        const warpWander = Array.from({ length: count }, wander);
        const weftWander = Array.from({ length: count }, wander);
        const warpTone = Array.from({ length: count }, tone);
        const weftTone = Array.from({ length: count }, tone);

        const wrap = (n) => ((n % TILE) + TILE) % TILE;
        const across = (offset) => Math.abs(offset - width / 2) / (width / 2);

        // lay each thread along its own wandering path
        const N = TILE * TILE;
        const warpAt = new Int16Array(N).fill(-1), warpShade = new Float32Array(N);
        const weftAt = new Int16Array(N).fill(-1), weftShade = new Float32Array(N);
        for (let i = 0; i < count; i++) {
            for (let t = 0; t < TILE; t++) {
                const warpLeft = i * cell + warpWander[i](t);
                const weftTop = i * cell + weftWander[i](t);
                const warpT = warpTone[i](t), weftT = weftTone[i](t);
                for (let o = 0; o <= width; o++) {
                    const x = Math.floor(warpLeft) + o, offWarp = x + 0.5 - warpLeft;
                    if (offWarp >= 0 && offWarp < width) {
                        const k = wrap(x) + t * TILE;
                        warpAt[k] = i; warpShade[k] = warpT * (1 - s.round * across(offWarp) ** 2);
                    }
                    const y = Math.floor(weftTop) + o, offWeft = y + 0.5 - weftTop;
                    if (offWeft >= 0 && offWeft < width) {
                        const k = t + wrap(y) * TILE;
                        weftAt[k] = i; weftShade[k] = weftT * (1 - s.round * across(offWeft) ** 2);
                    }
                }
            }
        }

        const weftUp = (i, j) => s.weave === 'satin' ? (i * 2 + j) % 5 === 0
            : s.weave === 'twill' ? (i + j) % 3 === 0
                : (i + j) % 2 === 1;
        const gap = WARP.map((v, k) => (v + WEFT[k]) / 2 * s.gapShade);

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = TILE;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(TILE, TILE);
        for (let k = 0; k < N; k++) {
            const i = warpAt[k], j = weftAt[k];
            let colour, shade = 1;
            if (i >= 0 && j >= 0) {
                const warpOnTop = !weftUp(i, j);
                colour = warpOnTop ? WARP : WEFT;
                shade = warpOnTop ? warpShade[k] : weftShade[k];
            } else if (i >= 0) {
                colour = WARP; shade = warpShade[k];
            } else if (j >= 0) {
                colour = WEFT; shade = weftShade[k];
            } else {
                colour = gap;
            }
            shade *= 1 + (rand() * 2 - 1) * grain;
            img.data[k * 4] = colour[0] * shade;
            img.data[k * 4 + 1] = colour[1] * shade;
            img.data[k * 4 + 2] = colour[2] * shade;
            img.data[k * 4 + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        return { url: canvas.toDataURL(), tile: TILE, pitch: cell };
    }


    const cloth = document.querySelector('.cloth');
    const layers = {};
    for (const name of ['weave', 'slub', 'mottle', 'fibre']) layers[name] = cloth.querySelector('.cloth-layer--' + name);
    let lastWeave = '', weaveUrl = '';
    function apply(changes) {
        Object.assign(settings, changes || {});
        const key = JSON.stringify(WEAVE_KEYS.map((k) => settings[k]));
        if (key !== lastWeave) {
            lastWeave = key;
            const t = weaveTile(settings);
            weaveUrl = t.url;
            layers.weave.dataset.tile = t.tile;
        }
        const size = layers.weave.dataset.tile * settings.scale;
        layers.weave.style.backgroundImage = `url("${weaveUrl}")`;
        layers.weave.style.backgroundSize = `${size}px ${size}px`;
        for (const name of Object.keys(layers)) {
            layers[name].style.opacity = settings[name + 'Opacity'];
            layers[name].style.mixBlendMode = settings[name + 'Blend'];
        }
        cloth.style.backgroundColor = settings.paper;
    }
    const C = { settings, defaults: DEFAULTS, apply, weaveUrl: () => weaveUrl };
    const BLENDS = ['normal', 'multiply', 'soft-light', 'overlay', 'darken', 'color-burn', 'luminosity', 'screen'];
    const CONTROLS = [
        ['Ground'],
        ['paper', 'colour'],
        ['Weave'],
        ['weave', 'choice', ['plain', 'twill', 'satin']],
        ['seed', 'seed'],
        ['threads', 'range', 10, 120, 1, 'threads across the tile'],
        ['threadWidth', 'range', 1, 16, 1, 'thread width'],
        ['threadSpacing', 'range', 0, 8, 1, 'thread spacing'],
        ['scale', 'range', 0.2, 1.5, 0.05, 'size on screen'],
        ['irregularity', 'range', 0, 1, 0.01],
        ['noise', 'range', 0, 1, 0.01, 'texture noise'],
        ['round', 'range', 0, 0.4, 0.01, 'thread rounding'],
        ['uneven', 'range', 0, 0.15, 0.005, 'thread unevenness'],
        ['gapShade', 'range', 0.3, 1, 0.01, 'gap brightness'],
        ['warp', 'colour', null, null, null, 'warp colour'],
        ['weft', 'colour', null, null, null, 'weft colour'],
        ['Layers'],
        ['weaveOpacity', 'range', 0, 1, 0.01, 'weave strength'],
        ['weaveBlend', 'blend', null, null, null, 'weave blend'],
        ['slubOpacity', 'range', 0, 1, 0.01, 'slub strength'],
        ['slubBlend', 'blend', null, null, null, 'slub blend'],
        ['mottleOpacity', 'range', 0, 1, 0.01, 'blotch strength'],
        ['mottleBlend', 'blend', null, null, null, 'blotch blend'],
        ['fibreOpacity', 'range', 0, 1, 0.01, 'fibre strength'],
        ['fibreBlend', 'blend', null, null, null, 'fibre blend'],
    ];

    const style = document.createElement('style');
    style.textContent = `
        .tune { position: fixed; z-index: 10; right: 12px; top: 12px; bottom: 12px; width: 300px;
            display: flex; flex-direction: column; background: #fffdf9; color: #323031;
            border: 1px solid rgba(50,48,49,.18); border-radius: 10px; box-shadow: 0 8px 30px rgba(50,48,49,.14);
            font: 12px/1.35 "IBM Plex Mono", ui-monospace, monospace; pointer-events: auto; }
        .tune[data-closed] { bottom: auto; }
        .tune[data-closed] .tune-body, .tune[data-closed] .tune-foot { display: none; }
        .tune-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; cursor: pointer; user-select: none; }
        .tune-head b { font-weight: 600; }
        .tune-body { overflow: auto; padding: 0 12px 8px; flex: 1; }
        .tune h4 { margin: 14px 0 6px; font-size: 12px; font-weight: 600; }
        .tune label { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; margin: 0 0 8px; align-items: center; }
        .tune label output { font-variant-numeric: tabular-nums; }
        .tune input[type=range] { grid-column: 1 / -1; width: 100%; accent-color: #323031; margin: 0; }
        .tune select, .tune input[type=number] { font: inherit; padding: 2px 4px; }
        .tune input[type=color] { width: 40px; height: 22px; padding: 0; border: 1px solid rgba(50,48,49,.3); background: none; }
        .tune-seed { display: flex; gap: 6px; }
        .tune-seed input { width: 70px; }
        .tune-foot { display: flex; gap: 6px; padding: 10px 12px; border-top: 1px solid rgba(50,48,49,.12); }
        .tune button { font: inherit; padding: 5px 9px; border: 1px solid rgba(50,48,49,.3); border-radius: 6px; background: #fff; color: inherit; cursor: pointer; }
        .tune button:hover { background: #f3eee6; }
        @media (max-width: 600px) { .tune { left: 8px; right: 8px; width: auto; top: auto; max-height: 55svh; } }
    `;
    document.head.append(style);

    const panel = document.createElement('div');
    panel.className = 'tune';
    panel.innerHTML = '<div class="tune-head"><b>Cloth</b><span>hide</span></div><div class="tune-body"></div>' +
        '<div class="tune-foot"><button data-act="copy">Copy settings</button><button data-act="download">Download weave</button><button data-act="reset">Reset</button></div>';
    const body = panel.querySelector('.tune-body');

    const fmt = (v) => (typeof v === 'number' ? +v.toFixed(3) : v);
    const save = () => {
        try { localStorage.setItem('clothTune', JSON.stringify(C.settings)); } catch (e) { /* private mode */ }
    };

    // weave changes regenerate the tile, so give them a moment to settle
    let timer;
    function change(key, value) {
        if (WEAVE_KEYS.includes(key)) {
            C.settings[key] = value;
            clearTimeout(timer);
            timer = setTimeout(() => { C.apply(); save(); }, 120);
        } else {
            C.apply({ [key]: value });
            save();
        }
    }

    const inputs = {};
    for (const [key, type, a, b, step, name] of CONTROLS) {
        if (!type) {
            const h = document.createElement('h4');
            h.textContent = key;
            body.append(h);
            continue;
        }
        const label = document.createElement('label');
        const title = document.createElement('span');
        title.textContent = name || key;
        label.append(title);
        let input;
        if (type === 'range') {
            const out = document.createElement('output');
            input = Object.assign(document.createElement('input'), { type: 'range', min: a, max: b, step });
            input.value = C.settings[key];
            out.textContent = fmt(C.settings[key]);
            input.addEventListener('input', () => { out.textContent = fmt(+input.value); change(key, +input.value); });
            input._out = out;
            label.append(out, input);
        } else if (type === 'colour') {
            input = Object.assign(document.createElement('input'), { type: 'color', value: C.settings[key] });
            input.addEventListener('input', () => change(key, input.value));
            label.append(input);
        } else if (type === 'choice' || type === 'blend') {
            input = document.createElement('select');
            for (const o of (type === 'blend' ? BLENDS : a)) input.append(new Option(o, o));
            input.value = C.settings[key];
            input.addEventListener('change', () => change(key, input.value));
            label.append(input);
        } else if (type === 'seed') {
            const wrap = document.createElement('span');
            wrap.className = 'tune-seed';
            input = Object.assign(document.createElement('input'), { type: 'number', min: 1, value: C.settings[key] });
            input.addEventListener('change', () => change(key, Math.max(1, +input.value || 1)));
            const dice = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Randomise' });
            dice.addEventListener('click', (e) => {
                e.preventDefault();
                input.value = 1 + Math.floor(Math.random() * 9999);
                change(key, +input.value);
            });
            wrap.append(input, dice);
            label.append(wrap);
        }
        inputs[key] = input;
        body.append(label);
    }

    panel.querySelector('.tune-head').addEventListener('click', () => {
        const closed = panel.toggleAttribute('data-closed');
        panel.querySelector('.tune-head span').textContent = closed ? 'show' : 'hide';
    });

    panel.querySelector('.tune-foot').addEventListener('click', async (e) => {
        const act = e.target.dataset.act;
        if (act === 'copy') {
            const text = JSON.stringify(C.settings, null, 2);
            try {
                await navigator.clipboard.writeText(text);
                e.target.textContent = 'Copied';
            } catch (err) {
                window.prompt('Copy these settings:', text);
            }
            setTimeout(() => { e.target.textContent = 'Copy settings'; }, 1500);
        } else if (act === 'download') {
            const a = Object.assign(document.createElement('a'), { href: C.weaveUrl(), download: 'weave.png' });
            a.click();
        } else if (act === 'reset') {
            Object.assign(C.settings, C.defaults);
            try { localStorage.removeItem('clothTune'); } catch (err) { /* ignore */ }
            for (const [key, input] of Object.entries(inputs)) {
                input.value = C.settings[key];
                if (input._out) input._out.textContent = fmt(C.settings[key]);
            }
            C.apply();
        }
    });

    document.body.append(panel);
    apply();
})();
