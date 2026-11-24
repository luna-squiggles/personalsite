// The cloth is a fixed layer (so it can run past the window's edges and fill
// the overscroll) that slides with the scroll so it moves with the page. Its
// inner layer is as tall as the page plus a screen either side. Where CSS
// scroll-linked animations exist, the browser slides it, in step with the
// page; otherwise it's moved here on each scroll.
(function () {
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
