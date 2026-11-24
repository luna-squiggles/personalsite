// The cloth.
//
// 1. The weave is generated here, on the spot, the way texturize.app's fabric
//    generator describes doing it: a grid of vertical warp threads and
//    horizontal weft threads, a whole number of them across the tile (rounded
//    up to a multiple of 5, so the satin weave repeats cleanly). Each thread
//    cell holds a warp strip down its left side and a weft strip along its
//    top; the rest is a gap, which shows a darker mix of both colours. Where
//    they cross, satin puts the weft on top at one crossing in five, in a
//    scattered step, so the face is mostly smooth warp. Threads are
//    shaded darker toward their edges so they read as round, wobble sideways a
//    little, and get a fine grain. The tile is drawn at twice the size it's
//    shown, so it's crisp on a retina screen, and set as --weave for the CSS.
//
// 2. The cloth is a fixed layer (so it can run past the window's edges and
//    fill the overscroll) that slides with the scroll so it moves with the
//    page. Where CSS scroll-linked animations exist the browser slides it, in
//    step with the page; otherwise it's moved here on each scroll.
(function () {
    // Starting from texturize.app's settings (seed 1, satin, irregularity
    // 0.44, texture noise 0.4) with our own colours. Threads are sized to suit
    // the cross stitches: each thread and its gap is 4.5px on screen, four
    // threads to every 18px stitch. Kept soft: pale gaps, gentle rounding, and
    // each thread a touch lighter or darker than the next and uneven along
    // its length, like real cotton. The tile is drawn at twice the size it's
    // shown.
    const SEED = 1;
    const WIDTH = 7; // thread thickness, in tile pixels
    const SPACING = 2; // gap beside each thread
    const REPEAT = 5; // satin
    const COUNT = 50; // threads across the tile, a multiple of REPEAT
    const TILE = COUNT * (WIDTH + SPACING); // 450 tile pixels, shown at 225
    const WARP = [253, 248, 239]; // vertical threads, warm cream
    const WEFT = [250, 244, 233]; // horizontal threads, a shade deeper
    const IRREGULARITY = 0.6 * 2.5; // sideways wander, in tile pixels
    const GRAIN = 0.5 * 0.12; // fine brightness grain
    const ROUND = 0.07; // how much darker a thread gets toward its edges
    const UNEVEN = 0.035; // how much threads vary in shade, between and along

    function weave() {
        let seed = SEED;
        const rand = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };

        const count = COUNT;
        const cell = WIDTH + SPACING;

        // each thread's sideways wander: two slow waves that fit the tile exactly
        const wander = () => {
            const k1 = 1 + Math.floor(rand() * 3), k2 = 3 + Math.floor(rand() * 4);
            const p1 = rand() * 6.283, p2 = rand() * 6.283;
            return (t) => IRREGULARITY * (Math.sin(6.283 * k1 * t / TILE + p1) + 0.5 * Math.sin(6.283 * k2 * t / TILE + p2));
        };
        const warpWander = Array.from({ length: count }, wander);
        const weftWander = Array.from({ length: count }, wander);

        // each thread's own shade, drifting slowly along it (slubs and dye)
        const tone = () => {
            const base = (rand() * 2 - 1) * UNEVEN;
            const k1 = 2 + Math.floor(rand() * 5), k2 = 7 + Math.floor(rand() * 9);
            const p1 = rand() * 6.283, p2 = rand() * 6.283;
            return (t) => 1 + base + UNEVEN * (0.6 * Math.sin(6.283 * k1 * t / TILE + p1) + 0.4 * Math.sin(6.283 * k2 * t / TILE + p2));
        };
        const warpTone = Array.from({ length: count }, tone);
        const weftTone = Array.from({ length: count }, tone);

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = TILE;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(TILE, TILE);
        // the gaps: a darker, warm mix of both colours (kept warm so the cloth
        // doesn't go grey)
        const gap = WARP.map((v, k) => (v + WEFT[k]) / 2 * [0.965, 0.955, 0.935][k]);
        const wrap = (n) => ((n % TILE) + TILE) % TILE;
        // how far across a thread a point is (0 at its middle, 1 at its edge)
        const across = (offset) => Math.abs(offset - WIDTH / 2) / (WIDTH / 2);

        // Lay each thread down along its own wandering path, noting for every
        // pixel which warp and which weft thread covers it and how it's shaded
        // there (its tone, darker toward its edges).
        const N = TILE * TILE;
        const warpAt = new Int16Array(N).fill(-1), warpShade = new Float32Array(N);
        const weftAt = new Int16Array(N).fill(-1), weftShade = new Float32Array(N);
        for (let i = 0; i < count; i++) {
            for (let t = 0; t < TILE; t++) {
                const warpLeft = i * cell + warpWander[i](t);
                const weftTop = i * cell + weftWander[i](t);
                const warpT = warpTone[i](t), weftT = weftTone[i](t);
                for (let o = 0; o <= WIDTH; o++) {
                    const x = Math.floor(warpLeft) + o, offWarp = x + 0.5 - warpLeft;
                    if (offWarp >= 0 && offWarp < WIDTH) {
                        const k = wrap(x) + t * TILE;
                        warpAt[k] = i; warpShade[k] = warpT * (1 - ROUND * across(offWarp) ** 2);
                    }
                    const y = Math.floor(weftTop) + o, offWeft = y + 0.5 - weftTop;
                    if (offWeft >= 0 && offWeft < WIDTH) {
                        const k = t + wrap(y) * TILE;
                        weftAt[k] = i; weftShade[k] = weftT * (1 - ROUND * across(offWeft) ** 2);
                    }
                }
            }
        }

        for (let k = 0; k < N; k++) {
            const i = warpAt[k], j = weftAt[k];
            let colour, shade = 1;
            if (i >= 0 && j >= 0) {
                const warpOnTop = (i * 2 + j) % REPEAT !== 0; // satin: weft up 1 in 5
                colour = warpOnTop ? WARP : WEFT;
                shade = warpOnTop ? warpShade[k] : weftShade[k];
            } else if (i >= 0) {
                colour = WARP;
                shade = warpShade[k];
            } else if (j >= 0) {
                colour = WEFT;
                shade = weftShade[k];
            } else {
                colour = gap;
            }
            shade *= 1 + (rand() * 2 - 1) * GRAIN;
            img.data[k * 4] = colour[0] * shade;
            img.data[k * 4 + 1] = colour[1] * shade;
            img.data[k * 4 + 2] = colour[2] * shade;
            img.data[k * 4 + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        return canvas.toDataURL();
    }

    try {
        const url = weave();
        window.CLOTH_WEAVE = { url, size: TILE / 2, pitch: (WIDTH + SPACING) / 2 };
        document.documentElement.style.setProperty('--weave', `url("${url}")`);
        document.documentElement.style.setProperty('--weave-size', `${TILE / 2}px`);
    } catch (e) {
        // no canvas: the CSS falls back to texture/weave.svg
    }

    const inner = document.querySelector('.cloth > div');
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
})();
