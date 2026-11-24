// A panel of controls for the cloth, loaded only when the address has ?tune.
// Every change shows straight away and is kept in this browser (so a reload
// keeps it). "Copy settings" puts them on the clipboard to hand over.
(function () {
    const C = window.Cloth;
    if (!C) return;

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
    const WEAVE_KEYS = ['seed', 'weave', 'threads', 'threadWidth', 'threadSpacing', 'irregularity', 'noise', 'round', 'uneven', 'gapShade', 'warp', 'weft'];

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
        '<div class="tune-foot"><button data-act="copy">Copy settings</button><button data-act="reset">Reset</button></div>';
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
})();
