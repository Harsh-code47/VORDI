// background/service-worker.js
// VORDI background service worker — Manifest V3

import { parseIntent } from '../lib/nlu.js';
import { executeIntent } from '../lib/executor.js';
import { speak } from '../lib/tts.js';

const OFFSCREEN_URL = 'offscreen/offscreen.html';
const KEEP_ALIVE_ALARM = 'vordi-keep-alive';

let _enabled = true;
let _state = 'standby'; // 'standby' | 'wake-listening' | 'command-listening' | 'sleeping'
let _offscreenReady = false;

// ── Default settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  enabled: true,
  language: 'en-US',
  audioFeedback: true,
  ttsSpeed: 1.1,
  ttsVoiceName: '',
  hudVisible: true,
  hudPosition: 'bottom-right',
  hudTheme: 'dark',
  wakeWordSensitivity: 0.7,
  offlineMode: false
};

// ── Install / startup ─────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
  }

  // Inject content scripts into all already open web tabs
  injectIntoExistingTabs();

  await setupOffscreen();
  startKeepAlive();
});

chrome.runtime.onStartup.addListener(async () => {
  injectIntoExistingTabs();
  await setupOffscreen();
  startKeepAlive();
});

async function injectIntoExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && /^https?:\/\//i.test(tab.url)) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        }).catch(() => {});
      }
    }
  } catch (_) {}
}

// ── Keyboard shortcut command listener ───────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-listen') {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.windowId && chrome.sidePanel?.open) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (_) {
        chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
      }
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
    }
  }
});

// ── Keep-alive alarm ─────────────────────────────────────────────────────────
function startKeepAlive() {
  chrome.alarms.create(KEEP_ALIVE_ALARM, { periodInMinutes: 0.4 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEP_ALIVE_ALARM) {
    ensureOffscreen();
  }
});

// ── Offscreen document management ─────────────────────────────────────────────
async function setupOffscreen() {
  const data = await chrome.storage.local.get(['settings', 'micPermissionGranted']);
  const settings = data.settings || DEFAULT_SETTINGS;
  _enabled = settings.enabled !== false;

  if (!_enabled) return;

  await ensureOffscreen();
  if (_offscreenReady && data.micPermissionGranted) {
    await startWakeWordInOffscreen(settings.language || 'en-US');
  }
}

async function ensureOffscreen() {
  try {
    const existing = await chrome.offscreen.hasDocument?.();
    if (existing) return;
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(OFFSCREEN_URL),
      reasons: ['USER_MEDIA'],
      justification: 'Wake word detection requires microphone access via Web Speech API'
    });
  } catch (err) {
    if (!err.message?.includes('already')) {
      console.warn('[VORDI SW] Offscreen create notice:', err.message);
    }
  }
}

async function startWakeWordInOffscreen(language = 'en-US') {
  try {
    await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'START_WAKE_WORD',
      language
    });
    _state = 'wake-listening';
    broadcastState();
  } catch (err) {
    console.warn('[VORDI SW] Could not start wake word:', err.message);
  }
}

async function stopWakeWordInOffscreen() {
  try {
    await chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_WAKE_WORD' });
  } catch (_) {}
}

// ── Message routing ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  // From offscreen document
  if (message.source === 'offscreen') {
    handleOffscreenMessage(message);
    return;
  }

  // If directed to offscreen, do not intercept
  if (message.target === 'offscreen') {
    return;
  }

  // From popup / options / content scripts
  handleUIMessage(message, sender, sendResponse);
  return true; // Keep async
});

function handleOffscreenMessage(message) {
  switch (message.type) {
    case 'OFFSCREEN_READY':
      _offscreenReady = true;
      chrome.storage.local.get(['settings', 'micPermissionGranted'], (data) => {
        const settings = data.settings || DEFAULT_SETTINGS;
        if (settings.enabled !== false && data.micPermissionGranted) {
          startWakeWordInOffscreen(settings.language || 'en-US');
        }
      });
      break;

    case 'WAKE_WORD_DETECTED':
      _state = 'command-listening';
      broadcastState();
      speak('Listening');
      broadcastToContentScripts({ type: 'HUD_STATE', state: 'active', message: 'Listening...' });
      break;

    case 'COMMAND_LISTEN_START':
      _state = 'command-listening';
      broadcastState();
      broadcastToContentScripts({ type: 'HUD_STATE', state: 'active', message: 'Speak your command...' });
      break;

    case 'TRANSCRIPT': {
      const { transcript, isFinal } = message;
      broadcastToContentScripts({ type: 'HUD_TRANSCRIPT', transcript, isFinal });
      if (isFinal && transcript) {
        processTranscript(transcript);
      }
      break;
    }

    case 'COMMAND_LISTEN_END':
      _state = 'wake-listening';
      broadcastState();
      broadcastToContentScripts({ type: 'HUD_STATE', state: 'standby', message: 'Say "Hey VORDI"' });
      break;

    case 'COMMAND_ERROR':
      _state = 'wake-listening';
      broadcastState();
      broadcastToContentScripts({ type: 'HUD_STATE', state: 'standby', message: 'Say "Hey VORDI"' });
      break;
  }
}

async function handleUIMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'GET_STATE':
      sendResponse({ state: _state, enabled: _enabled });
      break;

    case 'TRIGGER_VOICE_ASSISTANT': {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.windowId && chrome.sidePanel?.open) {
        try {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        } catch (_) {
          chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
        }
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
      }
      sendResponse({ ok: true });
      break;
    }

    case 'MANUAL_TRIGGER': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tab.id, { type: 'START_PAGE_LISTEN' }).catch(() => {});
      }
      sendResponse({ ok: true });
      break;
    }

    case 'EXECUTE_COMMAND': {
      const { transcript } = message;
      await processTranscript(transcript);
      sendResponse({ ok: true });
      break;
    }

    case 'SET_ENABLED': {
      _enabled = message.enabled;
      // Merge into the full settings object — do NOT use dot-notation key
      const { settings: existingSettings = {} } = await chrome.storage.local.get('settings');
      await chrome.storage.local.set({
        settings: Object.assign({}, existingSettings, { enabled: _enabled })
      });
      if (_enabled) {
        await ensureOffscreen();
        await startWakeWordInOffscreen();
      } else {
        await stopWakeWordInOffscreen();
        _state = 'sleeping';
        broadcastState();
      }
      sendResponse({ ok: true });
      break;
    }

    case 'SETTINGS_UPDATED': {
      const data = await chrome.storage.local.get(['settings', 'micPermissionGranted']);
      const settings = data.settings || DEFAULT_SETTINGS;
      _enabled = settings.enabled !== false;
      if (_enabled && data.micPermissionGranted) {
        await ensureOffscreen();
        await startWakeWordInOffscreen(settings.language || 'en-US');
      }
      sendResponse({ ok: true });
      break;
    }

    case 'GET_HISTORY': {
      const data = await chrome.storage.local.get('commandHistory');
      sendResponse({ history: data.commandHistory || [] });
      break;
    }

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// ── Core NLU → executor pipeline ─────────────────────────────────────────────
async function processTranscript(transcript) {
  if (!transcript) return;
  console.log('[VORDI SW] Processing:', transcript);

  const { intent, entities, confidence } = parseIntent(transcript);
  broadcastToContentScripts({ type: 'HUD_COMMAND', command: transcript });

  if (!intent || confidence < 0.3) {
    speak("I didn't catch that. Try again.");
    broadcastToContentScripts({ type: 'HUD_STATE', state: 'standby', message: 'Command not recognized' });
    return;
  }

  // Save to history
  saveCommandHistory(transcript, intent);

  // Find active tab reliably across windows
  let tab = null;
  const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTabs && activeTabs.length > 0) {
    tab = activeTabs[0];
  } else {
    const curTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = curTabs?.[0] || null;
  }
  if (!tab) {
    const anyActive = await chrome.tabs.query({ active: true });
    tab = anyActive?.[0] || null;
  }

  const result = await executeIntent(intent, entities, tab?.id);

  // Handle sleep command
  if (result?.action === 'sleep') {
    _state = 'sleeping';
    broadcastState();
    broadcastToContentScripts({ type: 'HUD_STATE', state: 'sleeping', message: 'Sleeping — Say "Hey VORDI"' });
    await stopWakeWordInOffscreen();
    chrome.alarms.create('vordi-auto-wake', { delayInMinutes: 60 });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'vordi-auto-wake') {
    chrome.storage.local.get(['settings', 'micPermissionGranted'], (data) => {
      const settings = data.settings || DEFAULT_SETTINGS;
      if (settings.enabled !== false && data.micPermissionGranted) {
        ensureOffscreen().then(() => startWakeWordInOffscreen(settings.language));
      }
    });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
async function broadcastToContentScripts(message) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    }
  } catch (_) {}
}

function broadcastState() {
  chrome.runtime.sendMessage({ type: 'STATE_CHANGE', state: _state }).catch(() => {});
}

async function saveCommandHistory(transcript, intent) {
  const data = await chrome.storage.local.get('commandHistory');
  const history = data.commandHistory || [];
  history.unshift({ transcript, intent, timestamp: Date.now() });
  if (history.length > 50) history.length = 50;
  await chrome.storage.local.set({ commandHistory: history });
}
