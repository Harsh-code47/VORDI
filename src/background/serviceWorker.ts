// src/background/serviceWorker.ts
// Manifest V3 Background Service Worker: Orchestrates NLU, Actions, Audio Offscreen, and Messaging

import {
  RuntimeMessage,
  AssistantState,
  EngineStatus,
  ExtensionSettings
} from '../shared/types';
import {
  DEFAULT_SETTINGS,
  INITIAL_ENGINE_STATUS
} from '../shared/constants';
import { IntentClassifier } from './nlu/intentClassifier';
import { ActionDispatcher } from './actions/actionDispatcher';
import { sendRuntimeMessage, sendTabMessage } from '../shared/messaging';

const nlu = new IntentClassifier();
const dispatcher = new ActionDispatcher();

let currentState: AssistantState = 'idle';
let engineStatus: EngineStatus = { ...INITIAL_ENGINE_STATUS };
let settings: ExtensionSettings = { ...DEFAULT_SETTINGS };

// Load settings on startup
chrome.storage.local.get(['vordi_settings'], (data) => {
  if (data.vordi_settings) {
    settings = { ...DEFAULT_SETTINGS, ...data.vordi_settings };
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ vordi_settings: settings });
});

// ── Message Routing ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (message.target && message.target !== 'background') return false;

  handleMessage(message, sender)
    .then((res) => sendResponse(res))
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true; // Keep message channel open for async response
});

async function handleMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender): Promise<any> {
  const payload = message.payload as Record<string, any> || {};

  switch (message.type) {
    case 'GET_STATUS':
      return {
        state: currentState,
        engineStatus,
        settings
      };

    case 'START_LISTENING':
      await ensureOffscreenDocument();
      await sendRuntimeMessage({ target: 'offscreen', type: 'OFFSCREEN_INIT_AUDIO' });
      setState('waiting_wake_word');
      return { success: true };

    case 'STOP_LISTENING':
      await sendRuntimeMessage({ target: 'offscreen', type: 'STOP_LISTENING' });
      setState('idle');
      return { success: true };

    case 'START_PTT':
      await ensureOffscreenDocument();
      setState('ptt_active');
      await sendRuntimeMessage({ target: 'offscreen', type: 'START_PTT' });
      return { success: true };

    case 'STOP_PTT':
      await sendRuntimeMessage({ target: 'offscreen', type: 'STOP_PTT' });
      setState('idle');
      return { success: true };

    case 'OFFSCREEN_AUDIO_STARTED':
      engineStatus.audioStreamActive = true;
      engineStatus.micGranted = true;
      engineStatus.wakeDetectionActive = true;
      setState('waiting_wake_word');
      broadcastStatus();
      return { success: true };

    case 'OFFSCREEN_AUDIO_ERROR':
      engineStatus.audioStreamActive = false;
      setState('error');
      broadcastStatus();
      return { success: true };

    case 'WAKE_WORD_DETECTED':
      setState('wake_detected');
      speakFeedback("I'm listening.");
      updateActiveTabHud('Hey VORDI', 'Wake word detected. Listening...');
      setTimeout(() => {
        setState('listening_command');
      }, 500);
      return { success: true };

    case 'COMMAND_TRANSCRIPT': {
      const { transcript, isFinal } = payload;
      if (!transcript) return { success: false };

      engineStatus.lastCommand = transcript;

      if (!isFinal) {
        setState('listening_command');
        updateActiveTabHud(`"${transcript}"`, 'Hearing speech...');
        return { success: true };
      }

      // Process final command
      setState('processing');
      updateActiveTabHud(`"${transcript}"`, 'Processing intent...');

      const nluResult = nlu.parse(transcript);

      if (!nluResult.intent) {
        setState('idle');
        speakFeedback("I couldn't understand that command.");
        updateActiveTabHud(`"${transcript}"`, 'Unrecognized command', true);
        return { success: false, error: 'Unrecognized intent' };
      }

      setState('executing');
      const actionResult = await dispatcher.dispatch(nluResult.intent, nluResult.entities);

      engineStatus.lastAction = actionResult.message || nluResult.intent;

      if (actionResult.success) {
        setState('completed');
        speakFeedback(actionResult.message || 'Done.');
        updateActiveTabHud(`"${transcript}"`, actionResult.message || 'Executed');
      } else {
        setState('error');
        speakFeedback("Command failed.");
        updateActiveTabHud(`"${transcript}"`, actionResult.error || 'Execution failed', true);
      }

      setTimeout(() => {
        setState(engineStatus.wakeDetectionActive ? 'waiting_wake_word' : 'idle');
      }, 1800);

      return actionResult;
    }

    case 'EXECUTE_TEXT_COMMAND': {
      const text = payload.text as string;
      const nluResult = nlu.parse(text);
      if (!nluResult.intent) {
        return { success: false, error: 'Could not understand command' };
      }
      return await dispatcher.dispatch(nluResult.intent, nluResult.entities);
    }

    default:
      return { success: false, error: `Unknown background message type: ${message.type}` };
  }
}

// ── Offscreen Lifecycle ──────────────────────────────────────────────────────

async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Capture microphone audio for local keyword spotting and speech recognition'
  });
}

// ── Voice & HUD Feedback ─────────────────────────────────────────────────────

function speakFeedback(text: string): void {
  if (!settings.ttsFeedback) return;
  try {
    if (chrome.tts?.speak) {
      chrome.tts.stop();
      chrome.tts.speak(text, { rate: 1.05, pitch: 1.0 });
    }
  } catch {}
}

async function updateActiveTabHud(command: string, feedback: string, isError = false): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await sendTabMessage(tab.id, {
        target: 'content',
        type: 'HUD_UPDATE',
        payload: { command, feedback, isError }
      });
    }
  } catch {}
}

function setState(newState: AssistantState): void {
  currentState = newState;
  broadcastStatus();
}

function broadcastStatus(): void {
  sendRuntimeMessage({
    target: 'popup',
    type: 'STATUS_UPDATE',
    payload: { state: currentState, engineStatus, settings }
  }).catch(() => {});
}

