// Cross stitches scattered over the cloth. Each motif is a short run of
// stitches in one thread colour, on an 18px stitch grid, kept clear of the
// text column. Each stitch pulls the cloth a little (creases out from its
// holes). Click a stitch to unpick it: the top leg pulls out through its hole,
// then the bottom one, and the cloth relaxes. The photo is sewn down with a
// running stitch.
(function () {
    const CELL = 18;
    const INSET = 2;
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

    function makeLayer(extra) {
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'stitches' + extra);
        svg.setAttribute('aria-hidden', 'true');
        return svg;
    }
    const back = makeLayer('');
    const front = makeLayer(' stitches--front');
    document.body.prepend(back);
    document.body.append(front);

    const f = (n) => n.toFixed(1);

    // Creases running out from each of the stitch's four holes, a dark fold
    // with a lit ridge beside it, and a slight dip under the cross.
    function pucker(x, y, rand) {
        const cx = x + CELL / 2, cy = y + CELL / 2;
        let creases = '', ridges = '';
        for (const [hx, hy] of [[x + INSET, y + INSET], [x + CELL - INSET, y + INSET], [x + INSET, y + CELL - INSET], [x + CELL - INSET, y + CELL - INSET]]) {
            const angle = Math.atan2(hy - cy, hx - cx) + (rand() - 0.5) * 0.7;
            const length = CELL * (0.45 + rand() * 0.4);
            const ex = hx + Math.cos(angle) * length, ey = hy + Math.sin(angle) * length;
            const nx = -Math.sin(angle) * 1.3, ny = Math.cos(angle) * 1.3;
            creases += `M${f(hx)} ${f(hy)}L${f(ex)} ${f(ey)}`;
            ridges += `M${f(hx + nx)} ${f(hy + ny)}L${f(ex + nx * 0.6)} ${f(ey + ny * 0.6)}`;
        }
        return `<g class="pucker" filter="url(#pucker)">` +
            `<ellipse cx="${cx}" cy="${cy}" rx="${CELL * 0.5}" ry="${CELL * 0.5}" fill="#5e5043" fill-opacity="0.12"/>` +
            `<path class="ridge" d="${ridges}"/><path class="crease" d="${creases}"/></g>`;
    }

    function stitch(c, r, colour) {
        const x = c * CELL, y = r * CELL;
        const rand = rng(c * 7919 + r * 104729 + seed);
        const a = x + INSET, b = x + CELL - INSET, top = y + INSET, bottom = y + CELL - INSET;
        // "/" goes down first, then "\" crosses over it, as stitched by hand.
        return `<g class="x" data-key="${c},${r}">` +
            `<rect x="${x - 3}" y="${y - 3}" width="${CELL + 6}" height="${CELL + 6}"/>` +
            pucker(x, y, rand) +
            `<g class="thread" filter="url(#thread)">` +
            `<path stroke="${colour}" stroke-dasharray="${LEG} ${LEG}" d="M${a} ${bottom}L${b} ${top}"/>` +
            `<path stroke="${colour}" stroke-dasharray="${LEG} ${LEG}" d="M${a} ${top}L${b} ${bottom}"/>` +
            `</g></g>`;
    }

    // A running stitch round the photo, sewn by hand: each stitch a slightly
    // different length and angle, and the line drifting a little in and out.
    function runningStitch(rand) {
        const photo = document.querySelector('.photo');
        if (!photo) return '';
        const r = photo.getBoundingClientRect();
        const i = 12;
        const x0 = r.left + window.scrollX + i, y0 = r.top + window.scrollY + i;
        const x1 = r.right + window.scrollX - i, y1 = r.bottom + window.scrollY - i;
        const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
        const colour = THREADS[Math.floor(rand() * THREADS.length)];
        let d = '';
        for (let k = 0; k < 4; k++) {
            const [ax, ay] = corners[k], [bx, by] = corners[k + 1];
            const span = Math.hypot(bx - ax, by - ay);
            const ux = (bx - ax) / span, uy = (by - ay) / span; // along the side
            const nx = -uy, ny = ux; // across it
            let t = 2 + rand() * 4, drift = 0;
            while (t < span - 4) {
                const len = Math.min(8 + rand() * 5, span - 2 - t);
                drift = Math.max(-2, Math.min(2, drift + (rand() - 0.5) * 1.2));
                const w0 = drift + (rand() - 0.5) * 1.2, w1 = drift + (rand() - 0.5) * 1.2;
                d += `M${f(ax + ux * t + nx * w0)} ${f(ay + uy * t + ny * w0)}` +
                    `L${f(ax + ux * (t + len) + nx * w1)} ${f(ay + uy * (t + len) + ny * w1)}`;
                t += len + 5 + rand() * 4;
            }
        }
        return `<g class="thread" filter="url(#thread)"><path stroke="${colour}" d="${d}"/></g>`;
    }

    function setSize(svg, W, H) {
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    }

    function draw() {
        const rand = rng(seed); // same pattern on every redraw
        const W = document.body.clientWidth;
        const H = Math.max(document.body.scrollHeight, window.innerHeight);
        const cols = Math.floor(W / CELL);
        const rows = Math.floor(H / CELL);

        const box = document.querySelector('.container').getBoundingClientRect();
        const pad = CELL * 1.5;
        const top = box.top + window.scrollY - pad, bottom = box.bottom + window.scrollY + pad;
        const left = box.left - pad, right = box.right + pad;
        const blocked = (c, r) => {
            const x = c * CELL, y = r * CELL;
            return x + CELL > left && x < right && y + CELL > top && y < bottom;
        };

        // start motifs only where there's room, so a narrow screen still gets some
        const free = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) if (!blocked(c, r)) free.push([c, r]);
        }
        if (!free.length) return;

        const taken = new Set();
        const motifs = Math.max(4, Math.round((free.length * CELL * CELL) / 110000));
        const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1]];
        let svg = '';

        for (let m = 0; m < motifs; m++) {
            let [c, r] = free[Math.floor(rand() * free.length)];
            const colour = THREADS[Math.floor(rand() * THREADS.length)];
            const length = 1 + Math.floor(rand() ** 2 * 4);
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

        setSize(back, W, H);
        setSize(front, W, H);
        back.innerHTML = svg;
        front.innerHTML = runningStitch(rand);
    }

    // Pull a leg out through its hole: the thread runs back along itself.
    function pull(path, delay) {
        return path.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: LEG }], {
            duration: 240, delay, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards',
        }).finished;
    }

    back.addEventListener('click', (e) => {
        const x = e.target.closest('.x');
        if (!x || x.dataset.unpicking) return;
        x.dataset.unpicking = '1';
        unpicked.add(x.dataset.key);
        if (calm.matches || !x.animate) {
            x.remove();
            return;
        }
        const [under, over] = x.querySelectorAll('.thread path');
        const pucker = x.querySelector('.pucker');
        pull(over, 0)
            .then(() => {
                // the cloth relaxes as the last leg comes out
                pucker.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
                return pull(under, 40);
            })
            .then(() => new Promise((done) => setTimeout(done, 300)))
            .then(() => x.remove());
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
