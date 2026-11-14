import { h } from 'preact';
import { AssistantState } from '../../shared/types';

interface StatusOrbProps {
  state: AssistantState;
  onToggle: () => void;
}

export function StatusOrb({ state, onToggle }: StatusOrbProps) {
  const isActive = ['waiting_wake_word', 'wake_detected', 'listening_command', 'processing', 'executing', 'ptt_active'].includes(state);

  const getLabel = () => {
    switch (state) {
      case 'idle':
        return 'System Standby';
      case 'initializing':
        return 'Initializing Audio...';
      case 'mic_required':
        return 'Microphone Access Required';
      case 'waiting_wake_word':
        return 'Listening for "Hey VORDI"';
      case 'wake_detected':
        return 'Wake Word Detected!';
      case 'listening_command':
        return 'Listening for Command...';
      case 'processing':
        return 'Parsing Intent...';
      case 'executing':
        return 'Executing Browser Action...';
      case 'completed':
        return 'Command Completed';
      case 'error':
        return 'Action Error';
      case 'ptt_active':
        return 'Push-to-Talk Active';
      default:
        return 'VORDI Ready';
    }
  };

  const getSubtext = () => {
    switch (state) {
      case 'waiting_wake_word':
        return 'Say "Hey VORDI" or tap Push-to-Talk';
      case 'listening_command':
        return 'Speak your command (e.g. "Open YouTube")';
      case 'idle':
        return 'Tap orb or press Start Listening';
      default:
        return 'Hands-free voice browser controller';
    }
  };

  return (
    <div class="orb-section">
      <div
        class={`orb-container ${isActive ? 'active' : ''} ${state}`}
        onClick={onToggle}
        title="Toggle voice listening"
      >
        <div class="orb-ring" />
        <div class="orb-core">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
      </div>
      <div class="state-label">{getLabel()}</div>
      <div class="state-subtext">{getSubtext()}</div>
    </div>
  );
}

