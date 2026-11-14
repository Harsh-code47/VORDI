export type IntentType =
  | 'OPEN_URL'
  | 'WEB_SEARCH'
  | 'YOUTUBE_SEARCH'
  | 'NEW_TAB'
  | 'CLOSE_TAB'
  | 'NEXT_TAB'
  | 'PREVIOUS_TAB'
  | 'SCROLL_UP'
  | 'SCROLL_DOWN'
  | 'CLICK_ELEMENT'
  | 'FILL_INPUT'
  | 'PLAY_MEDIA'
  | 'PAUSE_MEDIA'
  | 'GO_BACK'
  | 'GO_FORWARD'
  | 'RELOAD_PAGE';

export interface CommandEntities {
  url?: string;
  query?: string;
  element?: string;
  text?: string;
  amount?: string;
  [key: string]: string | undefined;
}

export interface NLUResult {
  intent: IntentType | null;
  entities: CommandEntities;
  confidence: number;
  rawTranscript: string;
  normalizedTranscript: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

export type AssistantState =
  | 'idle'
  | 'initializing'
  | 'mic_required'
  | 'waiting_wake_word'
  | 'wake_detected'
  | 'listening_command'
  | 'processing'
  | 'executing'
  | 'completed'
  | 'error'
  | 'ptt_active';

export interface EngineStatus {
  micGranted: boolean;
  audioStreamActive: boolean;
  kwsEngineReady: boolean;
  kwsModelLoaded: boolean;
  keywordConfigured: string;
  wakeDetectionActive: boolean;
  asrEngineReady: boolean;
  lastCommand: string;
  lastAction: string;
  currentLanguage: string;
}

export interface ExtensionSettings {
  language: string;
  wakeWordSensitivity: number;
  ttsFeedback: boolean;
  listeningMode: 'wake_word' | 'push_to_talk' | 'hybrid';
  hudVisible: boolean;
}

// ── Messaging Definitions ──────────────────────────────────────────────────
export type MessageType =
  | 'GET_STATUS'
  | 'STATUS_UPDATE'
  | 'START_LISTENING'
  | 'STOP_LISTENING'
  | 'START_PTT'
  | 'STOP_PTT'
  | 'EXECUTE_TEXT_COMMAND'
  | 'OFFSCREEN_INIT_AUDIO'
  | 'OFFSCREEN_AUDIO_STARTED'
  | 'OFFSCREEN_AUDIO_ERROR'
  | 'WAKE_WORD_DETECTED'
  | 'COMMAND_TRANSCRIPT'
  | 'HUD_UPDATE'
  | 'DOM_CLICK'
  | 'DOM_INPUT'
  | 'DOM_SCROLL'
  | 'DOM_MEDIA';

export interface RuntimeMessage<T = unknown> {
  target?: 'background' | 'offscreen' | 'content' | 'popup';
  type: MessageType;
  payload?: T;
}

