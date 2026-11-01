/**
 * Universal scroll-to-top utility.
 * Guarantees that navigating between bottom navigation tabs or modules
 * resets the viewport cleanly to the very top of the newly active screen.
 */
export function scrollToTop(instant: boolean = true): void {
  if (typeof window === 'undefined') return;

  const resetAll = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: instant ? 'instant' : 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    const mainEl = document.getElementById('main-scroll-container');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }

    const scrollContainers = document.querySelectorAll<HTMLElement>(
      'main, #main-scroll-container, [data-scroll-container], [data-pull-container], .overflow-y-auto'
    );
    scrollContainers.forEach((el) => {
      el.scrollTop = 0;
    });
  };

  // 1. Immediate reset
  resetAll();

  // 2. Next animation frame (catches React state application)
  requestAnimationFrame(() => {
    resetAll();
  });

  // 3. Short timeout (catches asynchronous component DOM mounts)
  setTimeout(() => {
    resetAll();
  }, 40);
}
