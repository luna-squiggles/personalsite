// Selecting text draws a scratchy highlighter stroke behind it instead of the
// browser's flat selection colour. The strokes are yellow, multiplied onto
// the page, and pushed through the #marker filter (in index.html), which
// roughens the ends and streaks them like a drying marker.
(function () {
    const NS = 'http://www.w3.org/2000/svg';
    const layer = document.createElementNS(NS, 'svg');
    layer.setAttribute('class', 'marker');
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);

    // A wobble that stays put for a given line, so a stroke doesn't jitter
    // while the selection is being dragged out.
    const wobble = (n) => {
        const x = Math.sin(n * 12.9898) * 43758.5453;
        return (x - Math.floor(x)) * 2 - 1;
    };

    function lines(range) {
        const out = [];
        for (const r of range.getClientRects()) {
            if (r.width < 1 || r.height > 80) continue; // skip empties and the photo
            const top = r.top + window.scrollY;
            const line = out.find((l) => Math.abs(l.top - top) < 6 && r.left <= l.right + 2 && r.right >= l.left - 2);
            if (line) {
                line.left = Math.min(line.left, r.left);
                line.right = Math.max(line.right, r.right);
                line.top = Math.min(line.top, top);
                line.bottom = Math.max(line.bottom, r.bottom + window.scrollY);
            } else {
                out.push({ left: r.left, right: r.right, top, bottom: r.bottom + window.scrollY });
            }
        }
        return out;
    }

    function draw() {
        const sel = document.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            layer.innerHTML = '';
            return;
        }
        let paths = '';
        for (let i = 0; i < sel.rangeCount; i++) {
            for (const l of lines(sel.getRangeAt(i))) {
                const h = l.bottom - l.top;
                const seed = Math.round(l.top);
                const x0 = l.left - 3, x1 = l.right + 3;
                const y0 = l.top + h * 0.12, y1 = l.bottom - h * 0.06;
                const t = 1.5; // how far the corners drift, in px
                paths += `<path d="M${x0 + wobble(seed) * t} ${y0 + wobble(seed + 1) * t}` +
                    `L${x1 + wobble(seed + 2) * t} ${y0 + wobble(seed + 3) * t}` +
                    `L${x1 + wobble(seed + 4) * t} ${y1 + wobble(seed + 5) * t}` +
                    `L${x0 + wobble(seed + 6) * t} ${y1 + wobble(seed + 7) * t}Z"/>`;
            }
        }
        const W = document.body.clientWidth;
        const H = Math.max(document.body.scrollHeight, window.innerHeight);
        layer.setAttribute('width', W);
        layer.setAttribute('height', H);
        layer.setAttribute('viewBox', `0 0 ${W} ${H}`);
        layer.innerHTML = `<g filter="url(#marker)">${paths}</g>`;
    }

    let pending;
    const redraw = () => {
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(draw);
    };
    document.addEventListener('selectionchange', redraw);
    window.addEventListener('resize', redraw);
})();
