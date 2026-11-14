import { h } from 'preact';
import { EngineStatus } from '../../shared/types';

interface EngineStatusCardProps {
  status: EngineStatus;
}

export function EngineStatusCard({ status }: EngineStatusCardProps) {
  return (
    <div class="status-card">
      <div class="card-title">
        <span>Engine Diagnostics</span>
        <span style={{ fontSize: '10px', color: '#64748b' }}>Local First</span>
      </div>

      <div class="status-row">
        <span>Microphone Permission:</span>
        <span class="status-indicator">
          <span class={`dot ${status.micGranted ? 'green' : 'amber'}`} />
          {status.micGranted ? 'Granted' : 'Pending / Required'}
        </span>
      </div>

      <div class="status-row">
        <span>Audio Stream:</span>
        <span class="status-indicator">
          <span class={`dot ${status.audioStreamActive ? 'green' : ''}`} />
          {status.audioStreamActive ? '16kHz Live' : 'Inactive'}
        </span>
      </div>

      <div class="status-row">
        <span>Wake-Word Engine:</span>
        <span class="status-indicator">
          <span class={`dot ${status.kwsEngineReady ? 'green' : 'cyan'}`} />
          {status.kwsEngineReady ? 'Initialized' : 'Ready on Listen'}
        </span>
      </div>

      <div class="status-row">
        <span>KWS Model:</span>
        <span class="status-indicator">
          <span class={`dot ${status.kwsModelLoaded ? 'green' : 'amber'}`} />
          {status.kwsModelLoaded ? 'Sherpa-ONNX Loaded' : 'Fallback Mode'}
        </span>
      </div>

      <div class="status-row">
        <span>Target Keyword:</span>
        <span class="status-indicator" style={{ color: '#06b6d4', fontWeight: 600 }}>
          "{status.keywordConfigured || 'Hey VORDI'}"
        </span>
      </div>

      <div class="status-row">
        <span>Speech-to-Text:</span>
        <span class="status-indicator">
          <span class="dot green" />
          {status.asrEngineReady ? 'Local STT' : 'Continuous Stream'}
        </span>
      </div>
    </div>
  );
}

