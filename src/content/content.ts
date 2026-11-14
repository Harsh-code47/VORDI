// src/content/content.ts
// Content script entry point: listens for background commands and manages page DOM

import { RuntimeMessage, ActionResult } from '../shared/types';
import { findClickableElement } from './dom/elementMatcher';
import { fillInput } from './dom/formController';
import { scrollPage } from './dom/pageScroller';
import { controlMedia } from './dom/mediaController';
import { HudOverlay } from './hud/hudOverlay';

const hud = new HudOverlay();

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (message.target && message.target !== 'content') return false;

  handleAction(message)
    .then((result) => sendResponse(result))
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true; // Keep message channel open for async response
});

async function handleAction(message: RuntimeMessage): Promise<ActionResult> {
  const payload = message.payload as Record<string, any> || {};

  switch (message.type) {
    case 'DOM_CLICK': {
      const targetName = payload.target as string;
      const el = findClickableElement(targetName);
      if (!el) {
        hud.show(`Click "${targetName}"`, 'Element not found on page', true);
        return { success: false, error: `Could not find element matching "${targetName}"` };
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      el.click();

      hud.show(`Click "${targetName}"`, 'Element clicked');
      return { success: true, message: `Clicked "${targetName}"` };
    }

    case 'DOM_INPUT': {
      const { target, value } = payload;
      const res = fillInput(target, value);
      hud.show(`Type "${value}"`, res.message, !res.success);
      return res;
    }

    case 'DOM_SCROLL': {
      const { direction, amount } = payload;
      const res = scrollPage(direction, amount);
      hud.show(`Scroll ${direction}`, res.message);
      return res;
    }

    case 'DOM_MEDIA': {
      const { action } = payload;
      const res = controlMedia(action);
      hud.show(`Media ${action}`, res.message, !res.success);
      return res;
    }

    case 'HUD_UPDATE': {
      const { command, feedback, isError } = payload;
      hud.show(command, feedback, isError);
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown content action: ${message.type}` };
  }
}

