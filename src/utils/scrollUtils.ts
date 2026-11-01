/**
 * Universal scroll-to-top utility.
 * Guarantees that navigating between bottom navigation tabs or modules
 * resets the viewport cleanly to the very top of the newly active screen.
 */
export function scrollToTop(instant: boolean = true): void {
  if (typeof window === 'undefined') return;

  const behavior = instant ? 'instant' : 'smooth';

  // 1. Reset standard window / document scroll
  try {
    window.scrollTo({ top: 0, left: 0, behavior: behavior as ScrollBehavior });
  } catch {
    window.scrollTo(0, 0);
  }
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

  // 2. Reset any scrollable main containers
  const scrollContainers = document.querySelectorAll<HTMLElement>(
    'main, #main-scroll-container, [data-scroll-container], .overflow-y-auto'
  );
  scrollContainers.forEach((el) => {
    el.scrollTop = 0;
  });

  // 3. Fallback requestAnimationFrame to handle asynchronous DOM re-renders
  requestAnimationFrame(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
    scrollContainers.forEach((el) => {
      el.scrollTop = 0;
    });
  });
}

