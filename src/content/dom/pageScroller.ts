// src/content/dom/pageScroller.ts
// Handles smooth page scrolling

export function scrollPage(direction: 'up' | 'down', amount = 450): { success: boolean; message: string } {
  const delta = direction === 'up' ? -amount : amount;

  window.scrollBy({
    top: delta,
    left: 0,
    behavior: 'smooth'
  });

  return {
    success: true,
    message: `Scrolled ${direction}`
  };
}

