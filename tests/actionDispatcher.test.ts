import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionDispatcher } from '../src/background/actions/actionDispatcher';

describe('ActionDispatcher validation', () => {
  let dispatcher: ActionDispatcher;

  beforeEach(() => {
    dispatcher = new ActionDispatcher();
    // Mock chrome APIs
    (globalThis as any).chrome = {
      tabs: {
        create: vi.fn().mockResolvedValue({ id: 101 }),
        query: vi.fn().mockResolvedValue([{ id: 101, url: 'https://example.com', active: true }]),
        remove: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        reload: vi.fn().mockResolvedValue(undefined)
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue(undefined)
      }
    };
  });

  it('validates missing url on OPEN_URL', async () => {
    const res = await dispatcher.dispatch('OPEN_URL', {});
    expect(res.success).toBe(false);
    expect(res.error).toContain('Destination URL is required');
  });

  it('validates missing query on WEB_SEARCH', async () => {
    const res = await dispatcher.dispatch('WEB_SEARCH', {});
    expect(res.success).toBe(false);
    expect(res.error).toContain('Search query is required');
  });

  it('creates Google search tab on valid query', async () => {
    const res = await dispatcher.dispatch('WEB_SEARCH', { query: 'vitest' });
    expect(res.success).toBe(true);
    expect(globalThis.chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://www.google.com/search?q=vitest'
    });
  });

  it('formats shortcuts like "youtube" to https://www.youtube.com', async () => {
    const res = await dispatcher.dispatch('OPEN_URL', { url: 'youtube' });
    expect(res.success).toBe(true);
    expect(globalThis.chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://www.youtube.com'
    });
  });

  it('handles NEW_TAB successfully', async () => {
    const res = await dispatcher.dispatch('NEW_TAB', {});
    expect(res.success).toBe(true);
    expect(globalThis.chrome.tabs.create).toHaveBeenCalledWith({});
  });
});

