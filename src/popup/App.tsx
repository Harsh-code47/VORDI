import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { AssistantState, EngineStatus } from '../shared/types';
import { INITIAL_ENGINE_STATUS } from '../shared/constants';
import { sendRuntimeMessage } from '../shared/messaging';
import { StatusOrb } from './components/StatusOrb';
import { EngineStatusCard } from './components/EngineStatusCard';
import { Controls } from './components/Controls';
import { QuickTester } from './components/QuickTester';

export function App() {
  const [state, setState] = useState<AssistantState>('idle');
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ ...INITIAL_ENGINE_STATUS });

  useEffect(() => {
    // 1. Fetch initial status from background service worker
    sendRuntimeMessage<undefined, { state: AssistantState; engineStatus: EngineStatus }>({
      target: 'background',
      type: 'GET_STATUS'
    }).then((res) => {
      if (res) {
        if (res.state) setState(res.state);
        if (res.engineStatus) setEngineStatus(res.engineStatus);
      }
    });

    // 2. Listen for status updates
    const listener = (msg: any) => {
      if (msg.type === 'STATUS_UPDATE' && msg.payload) {
        if (msg.payload.state) setState(msg.payload.state);
        if (msg.payload.engineStatus) setEngineStatus(msg.payload.engineStatus);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleStartListening = () => {
    sendRuntimeMessage({ target: 'background', type: 'START_LISTENING' });
  };

  const handleStopListening = () => {
    sendRuntimeMessage({ target: 'background', type: 'STOP_LISTENING' });
  };

  const handleStartPTT = () => {
    sendRuntimeMessage({ target: 'background', type: 'START_PTT' });
  };

  const handleStopPTT = () => {
    sendRuntimeMessage({ target: 'background', type: 'STOP_PTT' });
  };

  const handleToggle = () => {
    const isListening = ['waiting_wake_word', 'wake_detected', 'listening_command', 'processing', 'executing', 'ptt_active'].includes(state);
    if (isListening) {
      handleStopListening();
    } else {
      handleStartListening();
    }
  };

  const handleExecuteText = (text: string) => {
    sendRuntimeMessage({
      target: 'background',
      type: 'EXECUTE_TEXT_COMMAND',
      payload: { text }
    });
  };

  return (
    <div class="popup-container">
      {/* Header */}
      <header class="header">
        <div class="logo-group">
          <div class="logo-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="title-container">
            <h1>VORDI <span class="tag">v1.0</span></h1>
          </div>
        </div>
      </header>

      {/* Main Interactive Orb */}
      <StatusOrb state={state} onToggle={handleToggle} />

      {/* Primary Action Controls */}
      <Controls
        state={state}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        onStartPTT={handleStartPTT}
        onStopPTT={handleStopPTT}
      />

      {/* Activity Card */}
      <div class="activity-card">
        <div class="card-title">Activity Feed</div>
        <div class="last-cmd-text">
          {engineStatus.lastCommand ? `"${engineStatus.lastCommand}"` : 'No commands yet'}
        </div>
        <div class="last-action-text">
          {engineStatus.lastAction ? engineStatus.lastAction : 'Say "Hey VORDI" to begin'}
        </div>
      </div>

      {/* Quick Text Command Tester */}
      <QuickTester onExecuteText={handleExecuteText} />

      {/* Diagnostic & Model Status */}
      <EngineStatusCard status={engineStatus} />
    </div>
  );
}

