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
    const TILE = 512; // pixels in the tile; shown at half that
    // texturize.app's settings: seed 1, thread width 2, spacing 1, satin,
    // irregularity 0.44, texture noise 0.4 (our own colours)
    const SEED = 1;
    const WIDTH = 2; // thread thickness, in tile pixels
    const SPACING = 1; // gap beside each thread
    const REPEAT = 5; // satin
    const WARP = [253, 248, 239]; // vertical threads, warm cream
    const WEFT = [249, 242, 230]; // horizontal threads, a shade deeper
    const IRREGULARITY = 0.44 * 2.5; // up to about 2.5px of wander at 1.0
    const GRAIN = 0.4 * 0.12; // up to about 12% brightness grain at 1.0

    function weave() {
        let seed = SEED;
        const rand = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };

        let count = Math.round(TILE / (WIDTH + SPACING));
        count = Math.ceil(count / REPEAT) * REPEAT; // a whole number of weave repeats
        const cell = TILE / count;

        // each thread's sideways wander: two slow waves that fit the tile exactly
        const wander = () => {
            const k1 = 1 + Math.floor(rand() * 3), k2 = 3 + Math.floor(rand() * 4);
            const p1 = rand() * 6.283, p2 = rand() * 6.283;
            return (t) => IRREGULARITY * (Math.sin(6.283 * k1 * t / TILE + p1) + 0.5 * Math.sin(6.283 * k2 * t / TILE + p2));
        };
        const warpWander = Array.from({ length: count }, wander);
        const weftWander = Array.from({ length: count }, wander);

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = TILE;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(TILE, TILE);
        // the gaps: a darker, warm mix of both colours (kept warm so the cloth
        // doesn't go grey)
        const gap = WARP.map((v, k) => (v + WEFT[k]) / 2 * [0.93, 0.91, 0.87][k]);
        const wrap = (n) => ((n % TILE) + TILE) % TILE;
        // how far across a thread a point is (0 at its middle, 1 at its edge)
        const across = (offset) => Math.abs(offset - WIDTH / 2) / (WIDTH / 2);

        for (let y = 0; y < TILE; y++) {
            for (let x = 0; x < TILE; x++) {
                const i0 = Math.floor(x / cell), j0 = Math.floor(y / cell);
                const wx = wrap(x - warpWander[i0](y)), wy = wrap(y - weftWander[j0](x));
                const i = Math.floor(wx / cell), j = Math.floor(wy / cell);
                const inWarp = wx - i * cell < WIDTH, inWeft = wy - j * cell < WIDTH;

                let colour, shade = 1;
                if (inWarp && inWeft) {
                    const warpOnTop = (i * 2 + j) % REPEAT !== 0; // satin: weft up 1 in 5
                    colour = warpOnTop ? WARP : WEFT;
                    shade = 1 - 0.15 * across(warpOnTop ? wx - i * cell : wy - j * cell) ** 2;
                } else if (inWarp) {
                    colour = WARP;
                    shade = 1 - 0.15 * across(wx - i * cell) ** 2;
                } else if (inWeft) {
                    colour = WEFT;
                    shade = 1 - 0.15 * across(wy - j * cell) ** 2;
                } else {
                    colour = gap;
                }
                shade *= 1 + (rand() * 2 - 1) * GRAIN;
                const k = (x + y * TILE) * 4;
                img.data[k] = colour[0] * shade;
                img.data[k + 1] = colour[1] * shade;
                img.data[k + 2] = colour[2] * shade;
                img.data[k + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        return canvas.toDataURL();
    }

    try {
        const url = weave();
        window.CLOTH_WEAVE = { url, size: TILE / 2 };
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
