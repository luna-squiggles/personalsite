// Slide the fixed cloth layer with the scroll so it moves with the page. It's
// fixed (rather than part of the page) so it can run past the window's edges
// and fill the overscroll. Its inner layer is as tall as the page plus a
// screen either side.
(function () {
    const inner = document.querySelector('.cloth > div');
    let pending = 0;

    function place() {
        pending = 0;
        inner.style.transform = `translate3d(0, ${-window.scrollY}px, 0)`;
    }

    function size() {
        inner.style.height = `${document.documentElement.scrollHeight + 2 * window.innerHeight}px`;
        place();
    }

    window.addEventListener('scroll', () => {
        if (!pending) pending = requestAnimationFrame(place);
    }, { passive: true });
    window.addEventListener('resize', size);
    window.addEventListener('load', size);
    size();
})();
