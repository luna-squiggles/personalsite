// A highlighter squeak-and-scratch while you select text. It's made on the
// spot with Web Audio: rough, grainy noise through a band-pass, swelled
// each time the selection grows and let fall away when it stops.
(function () {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    let ctx, gain, band, squeak;
    let lastLength = 0;

    function setUp() {
        ctx = new Ctx();

        // two seconds of scratchy noise: white noise whose loudness wobbles
        // quickly and drops out now and then, like a felt tip on paper fibre
        const length = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let env = 0.6, target = 0.6;
        for (let i = 0; i < length; i++) {
            if (i % 90 === 0) target = Math.random() < 0.12 ? 0.15 : 0.5 + Math.random() * 0.5;
            env += (target - env) * 0.02;
            data[i] = (Math.random() * 2 - 1) * env;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 2800;
        band.Q.value = 0.8;

        // a narrow, quieter band on top for the squeak of the nib
        squeak = ctx.createBiquadFilter();
        squeak.type = 'bandpass';
        squeak.frequency.value = 4200;
        squeak.Q.value = 9;
        const squeakLevel = ctx.createGain();
        squeakLevel.gain.value = 0.5;

        const low = ctx.createBiquadFilter();
        low.type = 'highpass';
        low.frequency.value = 900;

        gain = ctx.createGain();
        gain.gain.value = 0;

        noise.connect(band).connect(low);
        noise.connect(squeak).connect(squeakLevel).connect(low);
        low.connect(gain).connect(ctx.destination);
        noise.start();
    }

    // Browsers only allow sound after a tap or click, so wake it up then.
    function wake() {
        if (!ctx) setUp();
        if (ctx.state === 'suspended') ctx.resume();
    }
    document.addEventListener('pointerdown', wake, { passive: true });
    document.addEventListener('keydown', wake);

    // One short stroke of the pen, louder the more the selection grew.
    function stroke(grew) {
        const now = ctx.currentTime;
        const level = Math.min(0.32, 0.12 + grew * 0.03);
        band.frequency.setTargetAtTime(2300 + Math.random() * 1300, now, 0.02);
        squeak.frequency.setTargetAtTime(3800 + Math.random() * 900, now, 0.03);
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(level, now, 0.012);
        gain.gain.setTargetAtTime(0, now + 0.07, 0.045);
    }

    document.addEventListener('selectionchange', () => {
        const sel = document.getSelection();
        const length = sel ? sel.toString().length : 0;
        const grew = Math.abs(length - lastLength);
        lastLength = length;
        if (!ctx || ctx.state !== 'running' || !length || !grew) return;
        stroke(grew);
    });
})();
