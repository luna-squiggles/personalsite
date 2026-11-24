// Cross stitches scattered over the cloth. Each motif is a short straight run
// of stitches (maybe with one turn) in one thread colour, on an 18px stitch
// grid, kept clear of the text column and well apart from other motifs. Each
// motif pulls the cloth in a little around it. Click a stitch to untie it:
// the thread comes loose and drops to hang from one hole (hover to nudge it;
// click it to pull it out). Once a motif's last cross is
// undone the cloth relaxes. The photo is sewn down with a yellow running
// stitch.
(function () {
    const CELL = 18;
    const INSET = 2;
    const LEG = Math.SQRT2 * (CELL - 2 * INSET);
    const THREADS = ['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#073B4C'];
    const NS = 'http://www.w3.org/2000/svg';
    const seed = Math.floor(Math.random() * 2 ** 31);
    const unpicked = new Set(); // pulled out altogether; survives redraws on resize
    const loose = new Map(); // untied and hanging: key -> colour
    let lastOy = 0;
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
    // The cross stitches are sewn into the cloth layer; the photo's running
    // stitch sits above the page.
    const back = makeLayer('');
    const front = makeLayer(' stitches--front');
    document.querySelector('.cloth').append(back);
    document.body.append(front);

    const DEFS = '<defs><radialGradient id="cloth-dip"><stop offset="0" stop-color="#5e5043" stop-opacity="0.08"/>' +
        '<stop offset="1" stop-color="#5e5043" stop-opacity="0"/></radialGradient></defs>';

    const f = (n) => n.toFixed(1);

    // A needle hole: a small, slightly ragged prick, never a perfect circle.
    // On the cloth it's dark with a light, raised edge; on the photo it's pale,
    // where the print's paper shows through. The raggedness comes from the
    // hole's position, so a hole always looks the same.
    function blob(x, y, r) {
        const n = 7;
        let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const next = () => { h = Math.sin(h * 1.618 + 0.7) * 43758.5453; return h - Math.floor(h); };
        const start = next() * 6.283;
        const pts = Array.from({ length: n }, (_, k) => {
            const a = start + (k / n) * 6.283, rr = r * (0.7 + next() * 0.6);
            return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * (0.8 + next() * 0.3)];
        });
        // a closed, smoothed outline through the jittered points
        const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        let d = `M${f(mid(pts[n - 1], pts[0])[0])} ${f(mid(pts[n - 1], pts[0])[1])}`;
        for (let k = 0; k < n; k++) {
            const m = mid(pts[k], pts[(k + 1) % n]);
            d += `Q${f(pts[k][0])} ${f(pts[k][1])} ${f(m[0])} ${f(m[1])}`;
        }
        return d + 'Z';
    }
    function hole(x, y, onPhoto) {
        return onPhoto
            ? `<path d="${blob(x, y, 1.15)}" fill="#fffaf0" fill-opacity="0.45"/>`
            : `<path d="${blob(x + 0.2, y + 0.6, 1.7)}" fill="#fff" fill-opacity="0.5"/>` +
              `<path d="${blob(x, y, 1.2)}" fill="#4a3f35" fill-opacity="0.32"/>`;
    }
    // the four holes a cross stitch leaves behind
    function crossHoles(c, r, oy) {
        const x = c * CELL, y = r * CELL + oy;
        const a = x + INSET, b = x + CELL - INSET, top = y + INSET, bottom = y + CELL - INSET;
        return `<g class="holes">${hole(a, top)}${hole(b, top)}${hole(a, bottom)}${hole(b, bottom)}</g>`;
    }

    // Where a motif draws the cloth tight: a faint dip under it. One plain
    // gradient per motif, drawn under all the thread.
    function pucker(cells, m, oy) {
        const cs = cells.map(([c]) => c), rs = cells.map(([, r]) => r);
        const margin = CELL * 0.6;
        const x0 = Math.min(...cs) * CELL - margin, x1 = (Math.max(...cs) + 1) * CELL + margin;
        const y0 = Math.min(...rs) * CELL + oy - margin, y1 = (Math.max(...rs) + 1) * CELL + oy + margin;
        return `<ellipse class="pucker" data-motif="${m}" cx="${(x0 + x1) / 2}" cy="${(y0 + y1) / 2}" ` +
            `rx="${(x1 - x0) / 2}" ry="${(y1 - y0) / 2}" fill="url(#cloth-dip)"/>`;
    }

    function stitch(c, r, colour, oy, m) {
        const x = c * CELL, y = r * CELL + oy;
        const a = x + INSET, b = x + CELL - INSET, top = y + INSET, bottom = y + CELL - INSET;
        // "/" goes down first, then "\" crosses over it, as stitched by hand.
        return `<g class="x" data-key="${c},${r}" data-motif="${m}">` +
            `<rect class="hit" x="${x - 3}" y="${y - 3}" width="${CELL + 6}" height="${CELL + 6}"/>` +
            `<g class="thread" filter="url(#thread)">` +
            `<path stroke="${colour}" stroke-dasharray="${LEG} ${LEG}" d="M${a} ${bottom}L${b} ${top}"/>` +
            `<path stroke="${colour}" stroke-dasharray="${LEG} ${LEG}" d="M${a} ${top}L${b} ${bottom}"/>` +
            `</g></g>`;
    }

    // ── Loose thread ────────────────────────────────────────────────────
    // An untied stitch is one length of thread still caught in the hole it
    // started from (the bottom-left one). It's a chain of points moved by
    // verlet integration: gravity pulls each down, links between neighbours
    // hold their length, and a little damping lets it come to rest.
    const LINKS = 16;
    const ROPE = LEG * 2.4; // both legs, plus the bit on the back

    // Which hole a stitch's thread stays caught in: one of its four corners,
    // fixed per stitch, so untied stitches don't all hang the same way.
    function holes(c, r, oy) {
        const x = c * CELL, y = r * CELL + oy;
        const a = x + INSET, b = x + CELL - INSET, top = y + INSET, bottom = y + CELL - INSET;
        const A = [a, bottom], B = [b, top], C = [a, top], D = [b, bottom];
        // the thread's route through the cross, starting from each corner
        const routes = [[A, B, C, D], [B, A, D, C], [C, D, A, B], [D, C, B, A]];
        const h = Math.sin(c * 91.17 + r * 47.53) * 43758.5453;
        return routes[Math.floor((h - Math.floor(h)) * 4)];
    }

    function ropeStart(c, r, oy) {
        // lay it along the path the thread took: one leg, across the back,
        // the other leg, then a little tail
        const route = holes(c, r, oy).map((p) => p.slice());
        const [p3, p4] = [route[2], route[3]];
        route.push([p4[0] + (p4[0] - p3[0]) * 0.3, p4[1] + (p4[1] - p3[1]) * 0.3]);
        const lengths = route.slice(1).map((p, k) => Math.hypot(p[0] - route[k][0], p[1] - route[k][1]));
        const total = lengths.reduce((m, n) => m + n, 0);
        const pts = [];
        for (let n = 0; n <= LINKS; n++) {
            let d = (n / LINKS) * total, k = 0;
            while (k < lengths.length - 1 && d > lengths[k]) { d -= lengths[k]; k++; }
            const t = lengths[k] ? d / lengths[k] : 0;
            pts.push([route[k][0] + (route[k + 1][0] - route[k][0]) * t, route[k][1] + (route[k + 1][1] - route[k][1]) * t]);
        }
        // which way this thread curls, and how much: fixed per stitch
        const h = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
        const curl = ((h - Math.floor(h)) < 0.5 ? -1 : 1) * (0.25 + (h - Math.floor(h)) * 0.25);
        return { pts, prev: pts.map((p) => p.slice()), curl };
    }

    function step(rope) {
        const { pts, prev, curl } = rope;
        const g = 0.22, damp = 0.9, seg = ROPE / LINKS;
        for (let n = 1; n < pts.length; n++) {
            const [x, y] = pts[n];
            pts[n][0] += (x - prev[n][0]) * damp;
            pts[n][1] += (y - prev[n][1]) * damp + g;
            prev[n][0] = x; prev[n][1] = y;
        }
        for (let it = 0; it < 12; it++) {
            for (let n = 0; n < pts.length - 1; n++) {
                const p = pts[n], q = pts[n + 1];
                const dx = q[0] - p[0], dy = q[1] - p[1];
                const d = Math.hypot(dx, dy) || 0.001;
                const k = (d - seg) / d;
                if (n === 0) { q[0] -= dx * k; q[1] -= dy * k; } // the first point is held by the hole
                else { p[0] += dx * k * 0.5; p[1] += dy * k * 0.5; q[0] -= dx * k * 0.5; q[1] -= dy * k * 0.5; }
            }
        }
        // thread has a little stiffness and a memory of being twisted, so it
        // hangs in a soft curve that curls at the end, not dead straight
        for (let n = 1; n < pts.length - 1; n++) {
            const a = pts[n - 1], b = pts[n + 1];
            const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
            const bend = curl * (0.4 + 2.2 * (n / LINKS) ** 3);
            const tx = (a[0] + b[0]) / 2 - (dy / d) * bend, ty = (a[1] + b[1]) / 2 + (dx / d) * bend;
            pts[n][0] += (tx - pts[n][0]) * 0.025;
            pts[n][1] += (ty - pts[n][1]) * 0.025;
        }
        let motion = 0;
        for (let n = 1; n < pts.length; n++) motion += Math.abs(pts[n][0] - prev[n][0]) + Math.abs(pts[n][1] - prev[n][1]);
        return motion;
    }

    // a smooth line through the chain
    function ropePath(pts) {
        let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
        for (let n = 1; n < pts.length - 1; n++) {
            const mx = (pts[n][0] + pts[n + 1][0]) / 2, my = (pts[n][1] + pts[n + 1][1]) / 2;
            d += `Q${f(pts[n][0])} ${f(pts[n][1])} ${f(mx)} ${f(my)}`;
        }
        const e = pts[pts.length - 1];
        return d + `L${f(e[0])} ${f(e[1])}`;
    }

    // (the invisible box widens the thread's filter area, which is sized from
    // its bounding box: a thread hanging straight down would otherwise have its
    // rough edges cut off flat)
    function looseMarkup(key, colour, d) {
        const [c, r] = key.split(',').map(Number);
        const [ax, ay] = holes(c, r, lastOy)[0];
        return `<g class="loose" data-key="${key}"><g class="thread" filter="url(#thread)">` +
            `<rect x="${ax - 24}" y="${ay - 12}" width="48" height="${ROPE + 24}" fill="none"/>` +
            `<path stroke="${colour}" d="${d}"/></g><path class="loose-hit" d="${d}"/></g>`;
    }

    // where an untied thread ends up once it has stopped swinging
    function settled(c, r, oy) {
        const rope = ropeStart(c, r, oy);
        for (let n = 0; n < 250; n++) step(rope);
        return ropePath(rope.pts);
    }

    // set a rope moving and keep drawing it until it comes to rest
    function swing(el, rope) {
        el._rope = rope;
        if (el._running) return;
        el._running = true;
        const paths = el.querySelectorAll('path');
        let still = 0;
        const frame = () => {
            if (!el.isConnected) { el._running = false; return; }
            const motion = step(rope);
            const d = ropePath(rope.pts);
            paths.forEach((p) => p.setAttribute('d', d));
            still = motion < 0.03 ? still + 1 : 0;
            if (still > 20) { el._running = false; return; }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }

    // A running stitch round the photo, sewn by hand: each stitch a slightly
    // different length and angle, and the line drifting a little in and out.
    // Click it to pull the whole thread out, stitch by stitch, from there.
    let photoUnpicked = false;
    function runningStitch(rand) {
        const photo = document.querySelector('.photo');
        if (!photo) return '';
        const r = photo.getBoundingClientRect();
        const i = 12;
        const x0 = r.left + window.scrollX + i, y0 = r.top + window.scrollY + i;
        const x1 = r.right + window.scrollX - i, y1 = r.bottom + window.scrollY - i;
        const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
        const colour = '#FFD166'; // always the yellow thread
        const stitches = [];
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
                stitches.push(`M${f(ax + ux * t + nx * w0)} ${f(ay + uy * t + ny * w0)}` +
                    `L${f(ax + ux * (t + len) + nx * w1)} ${f(ay + uy * (t + len) + ny * w1)}`);
                t += len + 5 + rand() * 4;
            }
        }
        // once pulled, only the holes the thread went through are left
        if (photoUnpicked) {
            return '<g class="holes">' + stitches.map((d) => {
                const [x0, y0, x1, y1] = d.slice(1).split('L').flatMap((pt) => pt.split(' ').map(Number));
                return hole(x0, y0, true) + hole(x1, y1, true);
            }).join('') + '</g>';
        }
        return `<g class="running"><g class="thread" filter="url(#thread)">` +
            stitches.map((d, n) => `<path data-n="${n}" stroke="${colour}" d="${d}"/>`).join('') +
            `</g><path class="running-hit" d="M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z"/></g>`;
    }

    // Pull the photo's thread out: starting from the stitch nearest the click,
    // each stitch in turn runs back through its hole, all the way round.
    function pullRunning(e) {
        const group = front.querySelector('.running');
        if (!group || group.dataset.going) return;
        group.dataset.going = '1';
        photoUnpicked = true;
        const paths = [...group.querySelectorAll('.thread path')];
        if (calm.matches || !paths[0].animate) { redraw(); return; }
        const pt = front.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const local = pt.matrixTransform(front.getScreenCTM().inverse());
        let start = 0, best = Infinity;
        paths.forEach((p, n) => {
            const m = p.getPointAtLength(p.getTotalLength() / 2);
            const d = Math.hypot(m.x - local.x, m.y - local.y);
            if (d < best) { best = d; start = n; }
        });
        const count = paths.length;
        const pricks = document.createElementNS(NS, 'g');
        pricks.setAttribute('class', 'holes');
        group.before(pricks);
        const runs = [];
        for (let k = 0; k < count; k++) {
            const p = paths[(start + k) % count];
            const length = p.getTotalLength();
            const ends = [p.getPointAtLength(0), p.getPointAtLength(length)];
            p.setAttribute('stroke-dasharray', `${length} ${length}`);
            runs.push(p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: length }], {
                duration: 140, delay: k * 14, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards',
            }).finished.then(() => pricks.insertAdjacentHTML('beforeend', ends.map((e) => hole(e.x, e.y, true)).join(''))));
        }
        Promise.all(runs).then(() => group.remove());
    }
    front.addEventListener('click', (e) => {
        const hanging = e.target.closest('.loose');
        if (hanging) { pullOut(hanging); return; }
        if (e.target.closest('.running')) pullRunning(e);
    });

    function setSize(svg, W, H) {
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    }

    function draw() {
        const rand = rng(seed); // same pattern on every redraw
        const W = document.body.clientWidth;
        const H = Math.max(document.body.scrollHeight, window.innerHeight);
        // the cloth is fixed to the window and the page doesn't scroll, so
        // stitch, page and cloth coordinates are all the same (and the 18px
        // stitch grid lands on the weave's 4.5px threads)
        const oy = 0;
        const clothH = H;
        const cols = Math.floor(W / CELL);
        const rows = Math.floor(H / CELL);

        // keep clear of the heading, the words and the photo (but not the gaps
        // between them)
        const pad = W < 600 ? CELL * 0.4 : CELL * 1.5; // tighter on phones, where margins are thin
        const boxes = [...document.querySelectorAll('.container header, .container p, .photo')].map((el) => {
            const b = el.getBoundingClientRect();
            return { top: b.top + window.scrollY - pad, bottom: b.bottom + window.scrollY + pad, left: b.left - pad, right: b.right + pad };
        });
        const blocked = (c, r) => {
            const x = c * CELL, y = r * CELL;
            return boxes.some((b) => x + CELL > b.left && x < b.right && y + CELL > b.top && y < b.bottom);
        };

        // start motifs only where there's room, so a narrow screen still gets some
        const free = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) if (!blocked(c, r)) free.push([c, r]);
        }

        // Motifs: a straight run of 1 to 4 stitches across, down or diagonal,
        // sometimes turning once. Every motif keeps at least GAP clear cells
        // between itself and any other, so their stitches and pulls never meet.
        const GAP = 3;
        const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
        const placed = [];
        const clear = (c, r) => placed.every(([pc, pr]) => Math.max(Math.abs(pc - c), Math.abs(pr - r)) > GAP);
        const fits = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !blocked(c, r) && clear(c, r);
        const wanted = Math.max(4, Math.round((free.length * CELL * CELL) / 110000));
        const motifs = [];

        for (let tries = 0; free.length && motifs.length < wanted && tries < wanted * 30; tries++) {
            let [c, r] = free[Math.floor(rand() * free.length)];
            let [dc, dr] = DIRECTIONS[Math.floor(rand() * DIRECTIONS.length)];
            const length = 1 + Math.floor(rand() ** 2 * 4);
            const turnAt = length > 2 && rand() < 0.3 ? 1 + Math.floor(rand() * (length - 1)) : -1;
            const colour = THREADS[Math.floor(rand() * THREADS.length)];
            const cells = [];
            for (let i = 0; i < length; i++) {
                if (i === turnAt) [dc, dr] = DIRECTIONS[(DIRECTIONS.findIndex(([a, b]) => a === dc && b === dr) + 1 + Math.floor(rand() * 3)) % 4];
                cells.push([c, r]);
                c += dc; r += dr;
            }
            if (!cells.every(([cc, rr]) => fits(cc, rr))) continue;
            placed.push(...cells);
            motifs.push({ cells, colour });
        }

        lastOy = oy;
        let puckers = '', threads = '', hanging = '', pricks = '';
        motifs.forEach(({ cells, colour }, m) => {
            const crosses = cells.filter(([c, r]) => !unpicked.has(c + ',' + r) && !loose.has(c + ',' + r));
            if (crosses.length) puckers += pucker(cells, m, oy);
            for (const [c, r] of crosses) threads += stitch(c, r, colour, oy, m);
            for (const [c, r] of cells) {
                const key = c + ',' + r;
                if (loose.has(key) || unpicked.has(key)) pricks += crossHoles(c, r, oy);
                if (loose.has(key)) hanging += looseMarkup(key, colour, settled(c, r, oy));
            }
        });
        const svg = puckers + pricks + threads;

        setSize(back, W, clothH);
        setSize(front, W, H);
        back.innerHTML = DEFS + svg;
        // loose threads hang in the front layer, over the photo if they're near it
        front.innerHTML = runningStitch(rand) + hanging;
    }

    // the cloth relaxes once a motif has no crosses left
    function relax(m, instantly) {
        if (back.querySelector(`.x[data-motif="${m}"]`)) return;
        const p = back.querySelector(`.pucker[data-motif="${m}"]`);
        if (!p) return;
        if (instantly || !p.animate) p.remove();
        else p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' }).finished.then(() => p.remove());
    }

    // Untie a cross: it becomes one loose thread that falls and swings.
    function untie(x) {
        const key = x.dataset.key, m = x.dataset.motif;
        const [c, r] = key.split(',').map(Number);
        const colour = x.querySelector('.thread path').getAttribute('stroke');
        loose.set(key, colour);
        x.remove();
        back.insertAdjacentHTML('beforeend', crossHoles(c, r, lastOy));
        relax(m, calm.matches);
        const rope = ropeStart(c, r, lastOy);
        const holder = document.createElementNS(NS, 'g');
        front.append(holder);
        holder.outerHTML = looseMarkup(key, colour, calm.matches ? settled(c, r, lastOy) : ropePath(rope.pts));
        const el = front.querySelector(`.loose[data-key="${key}"]`);
        if (!calm.matches) swing(el, rope);
    }

    // Pull a loose thread out through its hole: it runs back along itself.
    function pullOut(el) {
        if (el.dataset.going) return;
        el.dataset.going = '1';
        loose.delete(el.dataset.key);
        unpicked.add(el.dataset.key);
        const path = el.querySelector('.thread path');
        if (calm.matches || !path.animate) { el.remove(); return; }
        const length = path.getTotalLength();
        path.setAttribute('stroke-dasharray', `${length} ${length}`);
        path.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: length }], {
            duration: 380, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards',
        }).finished.then(() => el.remove());
    }

    back.addEventListener('click', (e) => {
        const x = e.target.closest('.x');
        if (x) untie(x);
    });

    // brushing past a loose thread pushes it the way the pointer is moving;
    // gravity and damping bring it back to hang
    let lastX = 0;
    window.addEventListener('pointermove', (e) => {
        const dx = e.movementX || e.clientX - lastX;
        lastX = e.clientX;
        const el = e.target.closest && e.target.closest('.loose');
        if (!el || el.dataset.going || calm.matches) return;
        const [c, r] = el.dataset.key.split(',').map(Number);
        const rope = el._rope || (() => {
            const fresh = ropeStart(c, r, lastOy);
            for (let n = 0; n < 250; n++) step(fresh);
            return fresh;
        })();
        const push = Math.max(-5, Math.min(5, (dx || (Math.random() - 0.5) * 3) * 0.5));
        rope.pts.forEach((p, n) => { rope.prev[n][0] = p[0] - push * (n / LINKS); });
        swing(el, rope);
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
