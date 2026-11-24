// Cross stitches scattered over the cloth. Each motif is a short straight run
// of stitches (maybe with one turn) in one thread colour, on an 18px stitch
// grid, kept clear of the text column and well apart from other motifs. Each
// motif pulls the cloth in a little around it. Click a stitch to unpick it:
// the top leg pulls out through its hole, then the bottom one, and once a
// motif's last stitch is out the cloth relaxes. The photo is sewn down with a
// yellow running stitch.
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
    // The cross stitches are sewn into the cloth layer, so they stay with it
    // when the page overscrolls; the photo's running stitch moves with the page.
    const back = makeLayer('');
    const front = makeLayer(' stitches--front');
    document.querySelector('.cloth > div').append(back);
    document.body.append(front);

    // The same textures as the cloth's CSS background, as SVG patterns, so the
    // pinched patch under each stitch lines up with the cloth around it.
    const weave = window.CLOTH_WEAVE || { url: 'texture/weave.svg', size: 416 };
    const PATTERNS = '<defs>' + [
        ['weave', weave.size, weave.url], ['slub', 730], ['mottle', 1130], ['fibre', 240],
    ].map(([name, size, url = `texture/${name}.svg`]) =>
        `<pattern id="cloth-${name}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">` +
        `<image href="${url}" width="${size}" height="${size}"/></pattern>`).join('') +
        '<radialGradient id="cloth-dip"><stop offset="0" stop-color="#5e5043" stop-opacity="0.09"/>' +
        '<stop offset="1" stop-color="#5e5043" stop-opacity="0"/></radialGradient></defs>';

    const f = (n) => n.toFixed(1);

    // A displacement map for pulling cloth in towards a point, drawn once: red
    // and green carry how far to reach out in x and y (most at mid-radius,
    // none at the middle or the edge) and alpha fades the patch out at its rim.
    const PINCH_MAP = (() => {
        const n = 64, canvas = document.createElement('canvas');
        canvas.width = canvas.height = n;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(n, n);
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                const dx = (i + 0.5) / n * 2 - 1, dy = (j + 0.5) / n * 2 - 1;
                const d = Math.min(1, Math.hypot(dx, dy));
                const g = (1 - d * d) * (1 - d); // strongest a little way out, none at the rim
                const k = (i + j * n) * 4;
                img.data[k] = Math.round((0.5 + 0.5 * dx * g) * 255);
                img.data[k + 1] = Math.round((0.5 + 0.5 * dy * g) * 255);
                img.data[k + 2] = 128;
                img.data[k + 3] = Math.round(Math.min(1, (1 - d) * 2.2) * 255);
            }
        }
        ctx.putImageData(img, 0, 0);
        return canvas.toDataURL();
    })();

    // The cloth round a motif, drawn again from the same textures and pulled
    // in towards it, as if the thread were drawing it tight, with a slight dip.
    // One per motif, drawn under all the thread, so it never smudges a stitch.
    function pucker(cells, m, oy) {
        const cs = cells.map(([c]) => c), rs = cells.map(([, r]) => r);
        const margin = CELL * 0.8;
        const x0 = Math.min(...cs) * CELL - margin, x1 = (Math.max(...cs) + 1) * CELL + margin;
        const y0 = Math.min(...rs) * CELL + oy - margin, y1 = (Math.max(...rs) + 1) * CELL + oy + margin;
        const area = `x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"`;
        const id = 'pinch-' + m;
        return `<g class="pucker" data-motif="${m}">` +
            `<filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" ${area} color-interpolation-filters="sRGB">` +
            `<feImage href="${PINCH_MAP}" ${area} preserveAspectRatio="none" result="map"/>` +
            `<feDisplacementMap in="SourceGraphic" in2="map" scale="44" xChannelSelector="R" yChannelSelector="G" result="pulled"/>` +
            `<feComposite in="pulled" in2="map" operator="in"/></filter>` +
            `<g filter="url(#${id})">` +
            `<rect ${area} fill="#FBF7F2"/>` +
            `<rect ${area} fill="url(#cloth-weave)"/>` +
            `<rect ${area} fill="url(#cloth-slub)"/>` +
            `<rect ${area} fill="url(#cloth-mottle)"/>` +
            `<rect ${area} fill="url(#cloth-fibre)"/></g>` +
            `<ellipse cx="${(x0 + x1) / 2}" cy="${(y0 + y1) / 2}" rx="${(x1 - x0) / 2 - margin * 0.3}" ry="${(y1 - y0) / 2 - margin * 0.3}" fill="url(#cloth-dip)"/></g>`;
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
        const colour = '#FFD166'; // always the yellow thread
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
        // where the top of the page sits in the cloth layer (a screen down)
        const cloth = document.querySelector('.cloth');
        // (rounded to the weave's thread pitch, so stitches sit on its threads)
        const pitch = (window.CLOTH_WEAVE && window.CLOTH_WEAVE.pitch) || 1;
        const oy = Math.round(-cloth.getBoundingClientRect().top / pitch) * pitch;
        const clothH = cloth.firstElementChild.offsetHeight;
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

        for (let tries = 0; motifs.length < wanted && tries < wanted * 30; tries++) {
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

        let puckers = '', threads = '';
        motifs.forEach(({ cells, colour }, m) => {
            const left = cells.filter(([c, r]) => !unpicked.has(c + ',' + r));
            if (!left.length) return;
            puckers += pucker(cells, m, oy);
            for (const [c, r] of left) threads += stitch(c, r, colour, oy, m);
        });
        const svg = puckers + threads;

        setSize(back, W, clothH);
        setSize(front, W, H);
        back.innerHTML = PATTERNS + svg;
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
            if (!back.querySelector(`.x[data-motif="${x.dataset.motif}"]`)) back.querySelector(`.pucker[data-motif="${x.dataset.motif}"]`)?.remove();
            return;
        }
        const [under, over] = x.querySelectorAll('.thread path');
        const m = x.dataset.motif;
        // the cloth relaxes once the motif's last stitch is coming out
        const last = !back.querySelector(`.x[data-motif="${m}"]:not([data-unpicking])`);
        const pucker = last && back.querySelector(`.pucker[data-motif="${m}"]`);
        pull(over, 0)
            .then(() => {
                if (pucker) pucker.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
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
