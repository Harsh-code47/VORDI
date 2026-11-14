import { ExtensionSettings, EngineStatus } from '../types';

export const TARGET_WAKE_WORD = 'hey vordi';
export const WAKE_WORD_ALIASES = [
  'hey vordi',
  'hey wordy',
  'hey vordee',
  'hey boardy',
  'vordi'
];

export const MIN_CONFIDENCE_THRESHOLD = 0.85;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  language: 'en-US',
  wakeWordSensitivity: 0.75,
  ttsFeedback: true,
  listeningMode: 'wake_word',
  hudVisible: true
};

export const INITIAL_ENGINE_STATUS: EngineStatus = {
  micGranted: false,
  audioStreamActive: false,
  kwsEngineReady: false,
  kwsModelLoaded: false,
  keywordConfigured: 'Hey VORDI',
  wakeDetectionActive: false,
  asrEngineReady: false,
  lastCommand: '',
  lastAction: '',
  currentLanguage: 'en-US'
};

export const COMMON_URL_MAP: Record<string, string> = {
  'youtube': 'https://www.youtube.com',
  'google': 'https://www.google.com',
  'github': 'https://www.github.com',
  'reddit': 'https://www.reddit.com',
  'twitter': 'https://www.twitter.com',
  'x': 'https://www.x.com',
  'wikipedia': 'https://www.wikipedia.org',
  'amazon': 'https://www.amazon.com',
  'netflix': 'https://www.netflix.com',
  'chatgpt': 'https://chat.openai.com',
  'gemini': 'https://gemini.google.com'
};

