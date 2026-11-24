// The cloth, built like plaintextprint.com's paper: a flat cream ground with
// the textures laid over it, each blended in at low strength, so the page
// reads as soft cloth rather than a loud, repeating pattern.
//
// Layers, bottom to top:
//   weave:  generated here, on the spot, the way texturize.app's fabric
//           generator describes it. A grid of vertical warp and horizontal
//           weft threads, a whole number of them across the tile (a multiple
//           of the weave's repeat, so it tiles). Each thread cell holds a warp
//           strip down its left and a weft strip along its top; the rest is a
//           gap, darker. Where they cross, the weave decides which is on top
//           (plain: checkerboard; twill: weft up 1 in 3 in a diagonal; satin:
//           weft up 1 in 5, scattered). Threads are shaded toward their edges
//           so they read as round, wander sideways a little, vary in shade
//           between and along themselves, and get a fine grain. Drawn light,
//           to be multiplied over the ground.
//   slub:   paler runs along the threads (texture/slub.svg)
//   mottle: soft blotches and specks (texture/mottle.svg)
//   fibre:  fine fibre specks (texture/fibre.svg)
// The noise tiles are different sizes, so the cloth doesn't visibly repeat.
//
// Add ?tune to the address for a panel of controls (tune.js). Settings made
// there are kept in this browser only and override the defaults below.
//
// The cloth is a fixed layer (so it can run past the window's edges and fill
// the overscroll) that slides with the scroll so it moves with the page.
(function () {
    const DEFAULTS = {
        paper: '#FBF7F2',
        // the weave
        seed: 1,
        weave: 'satin',
        threads: 50, // across the tile
        threadWidth: 7, // tile pixels
        threadSpacing: 2,
        irregularity: 0.6, // 0 to 1: sideways wander
        noise: 0.5, // 0 to 1: fine grain
        round: 0.12, // how much darker a thread gets toward its edges
        uneven: 0.05, // how much threads vary in shade
        gapShade: 0.8, // gap brightness, relative to the threads
        warp: '#ffffff',
        weft: '#fbf5ec',
        scale: 0.5, // screen pixels per tile pixel
        // how each layer is laid over the ground
        weaveOpacity: 0.32, weaveBlend: 'multiply',
        slubOpacity: 0.5, slubBlend: 'normal',
        mottleOpacity: 0.5, mottleBlend: 'multiply',
        fibreOpacity: 0.7, fibreBlend: 'multiply',
    };
    const WEAVE_KEYS = ['seed', 'weave', 'threads', 'threadWidth', 'threadSpacing', 'irregularity', 'noise', 'round', 'uneven', 'gapShade', 'warp', 'weft'];
    const REPEATS = { plain: 2, twill: 3, satin: 5 };
    const NOISE_TILES = { slub: 730, mottle: 1130, fibre: 240 };

    const tuning = /[?&]tune\b/.test(location.search);
    let saved = {};
    if (tuning) {
        try { saved = JSON.parse(localStorage.getItem('clothTune') || '{}'); } catch (e) { saved = {}; }
    }
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

    // the layers
    const inner = document.querySelector('.cloth > div');
    const layers = {};
    for (const name of ['weave', 'slub', 'mottle', 'fibre']) {
        const el = document.createElement('div');
        el.className = 'cloth-layer cloth-layer--' + name;
        inner.append(el);
        layers[name] = el;
    }
    for (const [name, size] of Object.entries(NOISE_TILES)) {
        layers[name].style.backgroundImage = `url("texture/${name}.svg")`;
        layers[name].style.backgroundSize = `${size}px ${size}px`;
    }

    let lastWeave = '';
    const weave = { url: 'texture/weave.svg', size: 416, pitch: 6 };

    // Apply settings (all of them, or just those that changed). Regenerates the
    // weave only when a weave setting changed, then tells the stitches.
    function apply(changes) {
        Object.assign(settings, changes || {});
        const key = JSON.stringify(WEAVE_KEYS.map((k) => settings[k]));
        if (key !== lastWeave) {
            lastWeave = key;
            try {
                const t = weaveTile(settings);
                weave.url = t.url;
                weave.tile = t.tile;
                weave.tilePitch = t.pitch;
            } catch (e) {
                weave.url = 'texture/weave.svg';
            }
        }
        weave.size = weave.tile ? weave.tile * settings.scale : 416;
        weave.pitch = weave.tile ? weave.tilePitch * settings.scale : 6;
        layers.weave.style.backgroundImage = `url("${weave.url}")`;
        layers.weave.style.backgroundSize = `${weave.size}px ${weave.size}px`;
        for (const name of ['weave', 'slub', 'mottle', 'fibre']) {
            layers[name].style.opacity = settings[name + 'Opacity'];
            layers[name].style.mixBlendMode = settings[name + 'Blend'];
        }
        inner.style.backgroundColor = settings.paper;
        document.documentElement.style.setProperty('--mainColour', settings.paper);
        window.CLOTH_WEAVE = { url: weave.url, size: weave.size, pitch: weave.pitch };
        window.dispatchEvent(new Event('clothchange'));
    }

    window.Cloth = { settings, defaults: DEFAULTS, apply, tuning };
    apply();

    // sliding with the scroll
    const linked = window.CSS && CSS.supports('animation-timeline: scroll()');
    let pending = 0;

    function place() {
        pending = 0;
        inner.style.transform = `translate3d(0, ${-window.scrollY}px, 0)`;
    }

    function size() {
        const page = document.documentElement.scrollHeight;
        inner.style.height = `${page + 2 * window.innerHeight}px`;
        inner.style.setProperty('--scroll-max', Math.max(0, page - window.innerHeight));
        if (!linked) place();
    }

    if (!linked) {
        window.addEventListener('scroll', () => {
            if (!pending) pending = requestAnimationFrame(place);
        }, { passive: true });
    }
    window.addEventListener('resize', size);
    window.addEventListener('load', size);
    size();

    if (tuning) {
        const script = document.createElement('script');
        script.src = 'tune.js';
        document.body.append(script);
    }
})();
