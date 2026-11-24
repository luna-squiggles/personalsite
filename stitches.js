// Cross stitches scattered over the aida cloth background. Each motif is a
// short run of stitches in one thread colour, sat on the cloth's 12px grid
// and kept clear of the text column.
(function () {
    const CELL = 12;
    const THREADS = ['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#073B4C'];
    const NS = 'http://www.w3.org/2000/svg';
    const seed = Math.floor(Math.random() * 2 ** 31);

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
        const byThread = THREADS.map(() => []);
        const motifs = Math.round((W * H) / 26000);
        const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1]];

        for (let m = 0; m < motifs; m++) {
            let c = Math.floor(rand() * cols), r = Math.floor(rand() * rows);
            const thread = Math.floor(rand() * THREADS.length);
            const length = 1 + Math.floor(rand() ** 2 * 6);
            for (let i = 0; i < length; i++) {
                const key = c + ',' + r;
                if (c >= 0 && r >= 0 && c < cols && r < rows && !blocked(c, r) && !taken.has(key)) {
                    taken.add(key);
                    byThread[thread].push([c, r]);
                }
                const [dc, dr] = steps[Math.floor(rand() * steps.length)];
                c += dc; r += dr;
            }
        }

        // "/" goes down first, then "\" crosses over it, as stitched by hand.
        const inset = 1.1;
        const under = ([c, r]) => {
            const x = c * CELL, y = r * CELL;
            return `M${x + inset} ${y + CELL - inset}L${x + CELL - inset} ${y + inset}`;
        };
        const over = ([c, r]) => {
            const x = c * CELL, y = r * CELL;
            return `M${x + inset} ${y + inset}L${x + CELL - inset} ${y + CELL - inset}`;
        };

        const all = byThread.flat();
        let svg = '';
        for (const leg of [under, over]) {
            svg += `<path class="shadow" d="${all.map(leg).join('')}"/>`;
            byThread.forEach((cells, i) => {
                if (cells.length) svg += `<path class="thread" stroke="${THREADS[i]}" d="${cells.map(leg).join('')}"/>`;
            });
            svg += `<path class="sheen" d="${all.map(leg).join('')}"/>`;
        }

        layer.setAttribute('width', W);
        layer.setAttribute('height', H);
        layer.setAttribute('viewBox', `0 0 ${W} ${H}`);
        layer.innerHTML = svg;
    }

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
