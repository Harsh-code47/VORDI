// src/content/dom/elementMatcher.ts
// Robust DOM element matching by accessible name, aria-label, text content, and role

export function findClickableElement(targetText: string): HTMLElement | null {
  if (!targetText) return null;
  const query = targetText.trim().toLowerCase();

  // 1. Check buttons, links, inputs with matching accessible name or text
  const selectors = [
    'button',
    'a[href]',
    'input[type="button"]',
    'input[type="submit"]',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="tab"]'
  ];

  const elements = Array.from(document.querySelectorAll<HTMLElement>(selectors.join(',')));

  // Pass 1: Exact aria-label, aria-description, or innerText match
  for (const el of elements) {
    if (!isVisible(el)) continue;
    const label = (el.getAttribute('aria-label') || '').toLowerCase().trim();
    const title = (el.getAttribute('title') || '').toLowerCase().trim();
    const text = (el.innerText || el.textContent || '').toLowerCase().trim();

    if (label === query || title === query || text === query) {
      return el;
    }
  }

  // Pass 2: Substring inclusion match
  for (const el of elements) {
    if (!isVisible(el)) continue;
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    const title = (el.getAttribute('title') || '').toLowerCase();
    const text = (el.innerText || el.textContent || '').toLowerCase();

    if (label.includes(query) || title.includes(query) || text.includes(query)) {
      return el;
    }
  }

  // Pass 3: Broader search among any element with matching visible text
  const allElements = Array.from(document.querySelectorAll<HTMLElement>('p, span, h1, h2, h3, h4, li, div'));
  for (const el of allElements) {
    if (!isVisible(el)) continue;
    // Only target leaf-like elements
    if (el.children.length === 0) {
      const text = (el.innerText || el.textContent || '').toLowerCase().trim();
      if (text === query || text.includes(query)) {
        // Return closest clickable ancestor if present
        const clickable = el.closest<HTMLElement>('button, a, [role="button"]');
        return clickable || el;
      }
    }
  }

  return null;
}

export function findInputElement(targetName?: string): HTMLInputElement | HTMLTextAreaElement | null {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea'
    )
  ).filter(isVisible);

  if (inputs.length === 0) return null;

  // If no target specified, return currently focused or the first prominent text input
  if (!targetName) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      return active as HTMLInputElement | HTMLTextAreaElement;
    }
    return inputs[0];
  }

  const query = targetName.toLowerCase().trim();

  // Match by placeholder, name, id, or associated label
  for (const input of inputs) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

    if (placeholder.includes(query) || name.includes(query) || id.includes(query) || ariaLabel.includes(query)) {
      return input;
    }

    // Check <label for="id">
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label && (label.textContent || '').toLowerCase().includes(query)) {
        return input;
      }
    }
  }

  return inputs[0];
}

function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

