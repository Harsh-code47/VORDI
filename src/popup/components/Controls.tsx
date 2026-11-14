import { h } from 'preact';
import { AssistantState } from '../../shared/types';

interface ControlsProps {
  state: AssistantState;
  onStartListening: () => void;
  onStopListening: () => void;
  onStartPTT: () => void;
  onStopPTT: () => void;
}

export function Controls({
  state,
  onStartListening,
  onStopListening,
  onStartPTT,
  onStopPTT
}: ControlsProps) {
  const isListening = ['waiting_wake_word', 'wake_detected', 'listening_command', 'processing', 'executing'].includes(state);
  const isPTT = state === 'ptt_active';

  return (
    <div class="controls-grid">
      {!isListening ? (
        <button class="btn btn-primary" onClick={onStartListening}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Start Listening
        </button>
      ) : (
        <button class="btn btn-danger" onClick={onStopListening}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
          Stop Listening
        </button>
      )}

      <button
        class={`btn btn-ptt ${isPTT ? 'active' : ''}`}
        onClick={isPTT ? onStopPTT : onStartPTT}
        title="Direct voice input without wake word"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        {isPTT ? 'Listening (Tap to End)' : 'Push-to-Talk'}
      </button>
    </div>
  );
}

