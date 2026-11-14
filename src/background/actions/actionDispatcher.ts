// src/background/actions/actionDispatcher.ts
// Executes browser actions corresponding to parsed voice intents

import { IntentType, CommandEntities, ActionResult } from '../../shared/types';
import { COMMON_URL_MAP } from '../../shared/constants';
import { sendTabMessage } from '../../shared/messaging';

export class ActionDispatcher {
  /**
   * Main dispatch entry point.
   */
  public async dispatch(intent: IntentType, entities: CommandEntities): Promise<ActionResult> {
    try {
      switch (intent) {
        case 'OPEN_URL':
          return await this.openUrl(entities.url);

        case 'WEB_SEARCH':
          return await this.webSearch(entities.query);

        case 'YOUTUBE_SEARCH':
          return await this.youtubeSearch(entities.query);

        case 'NEW_TAB':
          return await this.newTab();

        case 'CLOSE_TAB':
          return await this.closeTab();

        case 'NEXT_TAB':
          return await this.switchTab(1);

        case 'PREVIOUS_TAB':
          return await this.switchTab(-1);

        case 'SCROLL_UP':
          return await this.sendContentAction('DOM_SCROLL', { direction: 'up', amount: 400 });

        case 'SCROLL_DOWN':
          return await this.sendContentAction('DOM_SCROLL', { direction: 'down', amount: 400 });

        case 'CLICK_ELEMENT':
          return await this.sendContentAction('DOM_CLICK', { target: entities.element });

        case 'FILL_INPUT':
          return await this.sendContentAction('DOM_INPUT', {
            target: entities.element,
            value: entities.text
          });

        case 'PLAY_MEDIA':
          return await this.sendContentAction('DOM_MEDIA', { action: 'play' });

        case 'PAUSE_MEDIA':
          return await this.sendContentAction('DOM_MEDIA', { action: 'pause' });

        case 'GO_BACK':
          return await this.navigateHistory(-1);

        case 'GO_FORWARD':
          return await this.navigateHistory(1);

        case 'RELOAD_PAGE':
          return await this.reloadPage();

        default:
          return { success: false, error: `Unhandled intent: ${intent}` };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  // ── Tab & Navigation Actions ───────────────────────────────────────────────

  private async openUrl(rawUrl?: string): Promise<ActionResult> {
    if (!rawUrl) return { success: false, error: 'Destination URL is required' };

    let targetUrl = rawUrl.trim();
    if (COMMON_URL_MAP[targetUrl.toLowerCase()]) {
      targetUrl = COMMON_URL_MAP[targetUrl.toLowerCase()];
    } else if (!/^https?:\/\//i.test(targetUrl)) {
      if (/^[a-z0-9-]+(\.[a-z]{2,})+/i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      } else {
        // Fallback to Google Search if input is not a recognized domain
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
      }
    }

    const tab = await chrome.tabs.create({ url: targetUrl });
    return {
      success: true,
      message: `Navigating to ${targetUrl}`,
      data: { tabId: tab.id }
    };
  }

  private async webSearch(query?: string): Promise<ActionResult> {
    if (!query) return { success: false, error: 'Search query is required' };
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const tab = await chrome.tabs.create({ url: searchUrl });
    return {
      success: true,
      message: `Searching Google for "${query}"`,
      data: { tabId: tab.id }
    };
  }

  private async youtubeSearch(query?: string): Promise<ActionResult> {
    if (!query) return { success: false, error: 'YouTube search query is required' };
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const tab = await chrome.tabs.create({ url: searchUrl });
    return {
      success: true,
      message: `Searching YouTube for "${query}"`,
      data: { tabId: tab.id }
    };
  }

  private async newTab(): Promise<ActionResult> {
    const tab = await chrome.tabs.create({});
    return { success: true, message: 'Opened new tab', data: { tabId: tab.id } };
  }

  private async closeTab(): Promise<ActionResult> {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || activeTab.id === undefined) {
      return { success: false, error: 'No active tab to close' };
    }
    await chrome.tabs.remove(activeTab.id);
    return { success: true, message: 'Closed active tab' };
  }

  private async switchTab(direction: 1 | -1): Promise<ActionResult> {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    if (tabs.length <= 1) return { success: true, message: 'Only one tab open' };

    const activeIndex = tabs.findIndex((t) => t.active);
    if (activeIndex === -1) return { success: false, error: 'Active tab index not found' };

    let targetIndex = activeIndex + direction;
    if (targetIndex >= tabs.length) targetIndex = 0;
    if (targetIndex < 0) targetIndex = tabs.length - 1;

    const targetTab = tabs[targetIndex];
    if (targetTab && targetTab.id !== undefined) {
      await chrome.tabs.update(targetTab.id, { active: true });
      return { success: true, message: `Switched to tab ${targetIndex + 1}` };
    }

    return { success: false, error: 'Could not switch tab' };
  }

  private async navigateHistory(delta: number): Promise<ActionResult> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) return { success: false, error: 'No active tab' };

    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot navigate history on browser system pages' };
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (d: number) => { window.history.go(d); },
      args: [delta]
    });

    return { success: true, message: delta < 0 ? 'Navigated back' : 'Navigated forward' };
  }

  private async reloadPage(): Promise<ActionResult> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) return { success: false, error: 'No active tab' };
    await chrome.tabs.reload(tab.id);
    return { success: true, message: 'Page reloaded' };
  }

  // ── Content Script DOM Actions ─────────────────────────────────────────────

  private async sendContentAction(
    type: 'DOM_CLICK' | 'DOM_INPUT' | 'DOM_SCROLL' | 'DOM_MEDIA',
    payload: unknown
  ): Promise<ActionResult> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) {
      return { success: false, error: 'No active webpage tab found' };
    }

    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot interact with browser system pages' };
    }

    const response = await sendTabMessage<unknown, ActionResult>(tab.id, {
      target: 'content',
      type,
      payload
    });

    if (response) {
      return response;
    }

    return {
      success: false,
      error: 'Content script did not respond. Try refreshing the active webpage.'
    };
  }
}

