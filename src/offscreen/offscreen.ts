// src/offscreen/offscreen.ts
// Coordinates audio capturing, keyword spotting, and speech recognition inside the offscreen document

import { RuntimeMessage } from '../shared/types';
import { sendRuntimeMessage } from '../shared/messaging';
import { AudioCapture } from './audio/audioCapture';
import { KWSEngine } from './wakeword/kwsEngine';
import { ASREngine } from './speech/asrEngine';

const audioCapture = new AudioCapture();
const kwsEngine = new KWSEngine();
const asrEngine = new ASREngine();

// Initialize KWS on load
kwsEngine.initialize().then(() => {
  kwsEngine.setCallbacks(
    // On wake word detected:
    () => {
      sendRuntimeMessage({
        target: 'background',
        type: 'WAKE_WORD_DETECTED'
      });
      // Pause wake detection and start command listening
      kwsEngine.stopDetection();
      startCommandListening();
    },
    // On KWS state change:
    (state) => {
      sendRuntimeMessage({
        target: 'background',
        type: 'STATUS_UPDATE',
        payload: state
      });
    }
  );
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (message.target && message.target !== 'offscreen') return false;

  switch (message.type) {
    case 'OFFSCREEN_INIT_AUDIO':
      startAudioPipeline().then((ok) => sendResponse({ success: ok }));
      break;

    case 'START_LISTENING':
      kwsEngine.startDetection();
      sendResponse({ success: true });
      break;

    case 'STOP_LISTENING':
      kwsEngine.stopDetection();
      asrEngine.stop();
      audioCapture.stop();
      sendResponse({ success: true });
      break;

    case 'START_PTT':
      kwsEngine.stopDetection();
      startCommandListening();
      sendResponse({ success: true });
      break;

    case 'STOP_PTT':
      asrEngine.stop();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

async function startAudioPipeline(): Promise<boolean> {
  const ok = await audioCapture.start({
    onAudioData: (pcm16, rms) => {
      kwsEngine.processAudio(pcm16, rms);
    },
    onError: (err) => {
      kwsEngine.updateMicState(false, false);
      sendRuntimeMessage({
        target: 'background',
        type: 'OFFSCREEN_AUDIO_ERROR',
        payload: { error: err.message }
      });
    }
  });

  if (ok) {
    kwsEngine.updateMicState(true, true);
    kwsEngine.startDetection();
    sendRuntimeMessage({
      target: 'background',
      type: 'OFFSCREEN_AUDIO_STARTED'
    });
  }

  return ok;
}

function startCommandListening(): void {
  asrEngine.start({
    language: 'en-US',
    onResult: (result) => {
      sendRuntimeMessage({
        target: 'background',
        type: 'COMMAND_TRANSCRIPT',
        payload: result
      });
    },
    onEnd: () => {
      // Resume wake word detection once command completes
      kwsEngine.startDetection();
    },
    onError: () => {
      kwsEngine.startDetection();
    }
  });
}

