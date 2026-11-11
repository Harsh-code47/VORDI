// offscreen/offscreen.js
// Runs inside the offscreen document — has access to Web Speech API & microphone.

import { startWakeWordDetection, stopWakeWordDetection } from '../lib/wake-word.js';
import { startListening, stopListening } from '../lib/asr.js';

let _state = 'sleeping'; // 'sleeping' | 'wake-listening' | 'command-listening'
let _language = 'en-US';

function sendToBackground(msg) {
  chrome.runtime.sendMessage({ source: 'offscreen', ...msg });
}

// ── Message handler from background ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  switch (message.type) {
    case 'START_WAKE_WORD':
      _language = message.language || 'en-US';
      _state = 'wake-listening';
      startWakeWordDetection(onWakeWordDetected, _language);
      sendResponse({ ok: true });
      break;

    case 'STOP_WAKE_WORD':
      stopWakeWordDetection();
      _state = 'sleeping';
      sendResponse({ ok: true });
      break;

    case 'START_COMMAND_LISTEN':
      _language = message.language || _language;
      _state = 'command-listening';
      stopWakeWordDetection(); // pause wake word during command capture
      listenForCommand();
      sendResponse({ ok: true });
      break;

    case 'STOP_COMMAND_LISTEN':
      stopListening();
      _state = 'wake-listening';
      startWakeWordDetection(onWakeWordDetected, _language);
      sendResponse({ ok: true });
      break;

    case 'GET_STATE':
      sendResponse({ state: _state });
      break;
  }
  return true; // Keep message channel open for async sendResponse
});

function onWakeWordDetected() {
  sendToBackground({ type: 'WAKE_WORD_DETECTED' });
  _state = 'command-listening';
  stopWakeWordDetection();
  setTimeout(() => listenForCommand(), 200);
}

function listenForCommand() {
  sendToBackground({ type: 'COMMAND_LISTEN_START' });

  startListening(
    _language,
    (transcript, isFinal) => {
      sendToBackground({ type: 'TRANSCRIPT', transcript, isFinal });
    },
    () => {
      // Recognition ended
      sendToBackground({ type: 'COMMAND_LISTEN_END' });
      // Resume wake word detection
      if (_state === 'command-listening') {
        _state = 'wake-listening';
        setTimeout(() => startWakeWordDetection(onWakeWordDetected, _language), 500);
      }
    },
    (error) => {
      sendToBackground({ type: 'COMMAND_ERROR', error });
      _state = 'sleeping';
      console.warn('[Offscreen ASR] Error encountered, paused:', error);
    }
  );
}

// Signal ready
sendToBackground({ type: 'OFFSCREEN_READY' });
