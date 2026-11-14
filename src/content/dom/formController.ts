// src/content/dom/formController.ts
// Handles safe form field typing, with React & Vue controlled input support

import { findInputElement } from './elementMatcher';

export function fillInput(target?: string, value?: string): { success: boolean; message?: string } {
  if (!value) {
    return { success: false, message: 'No text provided to type' };
  }

  const el = findInputElement(target);
  if (!el) {
    return { success: false, message: target ? `Input field "${target}" not found` : 'No input field found on page' };
  }

  try {
    el.focus();

    // Support for React 16+ and Vue 3 controlled inputs
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    if (valueSetter) {
      valueSetter.call(el, value);
    } else {
      el.value = value;
    }

    // Dispatch standard synthetic events
    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    return {
      success: true,
      message: `Typed "${value}" into ${el.placeholder || el.name || 'field'}`
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Failed to fill input: ${msg}` };
  }
}

