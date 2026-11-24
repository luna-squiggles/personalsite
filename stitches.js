// Cross stitches scattered over the cloth background. Each motif is a short
// run of stitches in one thread colour, sat on a 12px stitch grid and kept
// clear of the text column. Click a stitch to unpick it: the top leg pulls
// out through its hole, then the bottom one.
(function () {
    const CELL = 12;
    const INSET = 1.1;
    const LEG = Math.SQRT2 * (CELL - 2 * INSET);
    const THREADS = ['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#073B4C'];
    const NS = 'http://www.w3.org/2000/svg';
    const seed = Math.floor(Math.random() * 2 ** 31);
    const unpicked = new Set(); // survives redraws on resize
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    function rng(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const layer = document.createElementNS(NS, 'svg');
    layer.setAttribute('class', 'stitches');
    layer.setAttribute('aria-hidden', 'true');
    document.body.prepend(layer);

    // One leg of the cross: a shadow, the thread, and a dashed sheen for the twist.
    function leg(d, colour) {
        return `<g class="leg">` +
            `<path class="shadow" d="${d}" stroke-dasharray="${LEG} ${LEG}"/>` +
            `<path class="thread" stroke="${colour}" d="${d}" stroke-dasharray="${LEG} ${LEG}"/>` +
            `<path class="sheen" d="${d}"/></g>`;
    }

    function stitch(c, r, colour) {
        const x = c * CELL, y = r * CELL;
        const a = x + INSET, b = x + CELL - INSET, top = y + INSET, bottom = y + CELL - INSET;
        // "/" goes down first, then "\" crosses over it, as stitched by hand.
        return `<g class="x" data-key="${c},${r}">` +
            `<rect x="${x - 2}" y="${y - 2}" width="${CELL + 4}" height="${CELL + 4}"/>` +
            leg(`M${a} ${bottom}L${b} ${top}`, colour) +
            leg(`M${a} ${top}L${b} ${bottom}`, colour) +
            `</g>`;
    }

    function draw() {
        const rand = rng(seed); // same pattern on every redraw
        const W = document.body.clientWidth;
        const H = Math.max(document.body.scrollHeight, window.innerHeight);
        const cols = Math.floor(W / CELL);
        const rows = Math.floor(H / CELL);

        const box = document.querySelector('.container').getBoundingClientRect();
        const pad = CELL * 2;
        const top = box.top + window.scrollY - pad, bottom = box.bottom + window.scrollY + pad;
        const left = box.left - pad, right = box.right + pad;
        const blocked = (c, r) => {
            const x = c * CELL, y = r * CELL;
            return x + CELL > left && x < right && y + CELL > top && y < bottom;
        };

        const taken = new Set();
        const motifs = Math.round((W * H) / 26000);
        const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1]];
        let svg = '';

        for (let m = 0; m < motifs; m++) {
            let c = Math.floor(rand() * cols), r = Math.floor(rand() * rows);
            const colour = THREADS[Math.floor(rand() * THREADS.length)];
            const length = 1 + Math.floor(rand() ** 2 * 6);
            for (let i = 0; i < length; i++) {
                const key = c + ',' + r;
                if (c >= 0 && r >= 0 && c < cols && r < rows && !blocked(c, r) && !taken.has(key)) {
                    taken.add(key);
                    if (!unpicked.has(key)) svg += stitch(c, r, colour);
                }
                const [dc, dr] = steps[Math.floor(rand() * steps.length)];
                c += dc; r += dr;
            }
        }

        layer.setAttribute('width', W);
        layer.setAttribute('height', H);
        layer.setAttribute('viewBox', `0 0 ${W} ${H}`);
        layer.innerHTML = svg;
    }

    // Pull a leg out through its hole: the thread runs back along itself and
    // the sheen goes with it.
    function pull(legEl, delay) {
        const opts = { duration: 220, delay, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards' };
        const runs = [...legEl.querySelectorAll('.shadow, .thread')].map((p) =>
            p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: LEG }], opts).finished);
        legEl.querySelector('.sheen').animate([{ opacity: 1 }, { opacity: 0 }], { ...opts, duration: 120 });
        return Promise.all(runs);
    }

    layer.addEventListener('click', (e) => {
        const x = e.target.closest('.x');
        if (!x || x.dataset.unpicking) return;
        x.dataset.unpicking = '1';
        unpicked.add(x.dataset.key);
        if (calm.matches || !x.animate) {
            x.remove();
            return;
        }
        const [under, over] = x.querySelectorAll('.leg');
        pull(over, 0).then(() => pull(under, 40)).then(() => x.remove());
    });

    let pending;
    const redraw = () => {
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(draw);
    };

    draw();
    document.fonts && document.fonts.ready.then(redraw);
    window.addEventListener('load', redraw);
    window.addEventListener('resize', redraw);
})();
