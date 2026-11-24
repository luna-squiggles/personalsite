// The sound of a highlighter while you select text, made on the spot with
// Web Audio. A felt tip on paper is mostly a soft, grainy hiss whose
// loudness and brightness follow how fast the pen moves, with a faint
// squeak riding on top. Here the pointer's speed while you drag out a
// selection drives both. Keyboard and double-click selections get one
// short stroke.
(function () {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    let ctx, hiss, hissBand, squeak, squeakTone, squeakBand;
    let down = false, last = null, speed = 0, quiet = 0, lastLength = 0;

    function setUp() {
        ctx = new Ctx();

        // two seconds of grainy noise: white noise whose loudness wobbles
        // quickly, like the felt catching on paper fibres
        const length = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let env = 0.7, target = 0.7;
        for (let i = 0; i < length; i++) {
            if (i % 60 === 0) target = 0.45 + Math.random() * 0.55;
            env += (target - env) * 0.05;
            data[i] = (Math.random() * 2 - 1) * env;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const air = ctx.createBiquadFilter();
        air.type = 'highpass';
        air.frequency.value = 1400;
        hissBand = ctx.createBiquadFilter();
        hissBand.type = 'bandpass';
        hissBand.frequency.value = 3200;
        hissBand.Q.value = 0.6;
        hiss = ctx.createGain();
        hiss.gain.value = 0;

        // the squeak: a soft tone a little above 1kHz, its pitch following
        // the pen's speed, wobbling slightly, through a narrow band
        squeakTone = ctx.createOscillator();
        squeakTone.type = 'triangle';
        squeakTone.frequency.value = 1100;
        const wobble = ctx.createOscillator();
        wobble.frequency.value = 9;
        const wobbleDepth = ctx.createGain();
        wobbleDepth.gain.value = 25;
        wobble.connect(wobbleDepth).connect(squeakTone.frequency);
        squeakBand = ctx.createBiquadFilter();
        squeakBand.type = 'bandpass';
        squeakBand.frequency.value = 2200;
        squeakBand.Q.value = 4;
        squeak = ctx.createGain();
        squeak.gain.value = 0;

        const soften = ctx.createBiquadFilter();
        soften.type = 'lowpass';
        soften.frequency.value = 7500;

        noise.connect(air).connect(hissBand).connect(hiss).connect(soften);
        squeakTone.connect(squeakBand).connect(squeak).connect(soften);
        soften.connect(ctx.destination);
        noise.start();
        squeakTone.start();
        wobble.start();
    }

    // Set the pen's loudness from 0 to 1, and its speed for the brightness.
    function pen(level, fast) {
        if (!ctx || ctx.state !== 'running') return;
        const now = ctx.currentTime;
        const glide = level > 0 ? 0.02 : 0.06;
        hiss.gain.setTargetAtTime(level * 0.22, now, glide);
        squeak.gain.setTargetAtTime(level * 0.035, now, glide);
        hissBand.frequency.setTargetAtTime(2600 + fast * 1800, now, 0.05);
        squeakTone.frequency.setTargetAtTime(950 + fast * 500, now, 0.05);
        squeakBand.frequency.setTargetAtTime(1900 + fast * 1000, now, 0.05);
    }

    // One short stroke, for selections made without dragging.
    function stroke() {
        pen(0.8, 0.6);
        clearTimeout(quiet);
        quiet = setTimeout(() => pen(0, 0), 110);
    }

    function selecting() {
        const sel = document.getSelection();
        return sel && !sel.isCollapsed;
    }

    // Browsers only allow sound after a tap, click or key press.
    function wake() {
        if (!ctx) setUp();
        if (ctx.state === 'suspended') ctx.resume();
    }

    document.addEventListener('pointerdown', (e) => {
        wake();
        down = e.button === 0;
        last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        speed = 0;
    }, { passive: true });

    document.addEventListener('pointermove', (e) => {
        if (!down || !last) return;
        const dt = Math.max(1, e.timeStamp - last.t);
        const v = Math.hypot(e.clientX - last.x, e.clientY - last.y) / dt; // px per ms
        last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        speed += (v - speed) * 0.35;
        if (!selecting()) return;
        const fast = Math.min(1, speed / 1.6);
        pen(Math.min(1, 0.25 + fast), fast);
        // fall quiet if the pointer stops while still held down
        clearTimeout(quiet);
        quiet = setTimeout(() => pen(0, 0), 70);
    }, { passive: true });

    const lift = () => {
        down = false;
        last = null;
        pen(0, 0);
    };
    document.addEventListener('pointerup', lift);
    document.addEventListener('pointercancel', lift);

    document.addEventListener('keydown', wake);

    // keyboard (shift + arrows) and double- or triple-click selections
    document.addEventListener('selectionchange', () => {
        const sel = document.getSelection();
        const length = sel ? sel.toString().length : 0;
        const grew = length > lastLength;
        lastLength = length;
        if (grew && (!down || speed < 0.05)) stroke();
    });
})();
