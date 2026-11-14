# VORDI — Voice-Operated Browser Control Extension

> **Free-First | Local-First | Manifest V3**  
> Complete hands-free browser control powered by wake-word detection ("Hey VORDI"), rule-based NLU, and DOM automation.

---

## 1. Project Overview

VORDI is an advanced voice-operated Chrome Extension built on modern Manifest V3 standards. It enables users to control browser tabs, search the web, interact with web pages, fill forms, and control media playback using voice commands and wake-word activation.

### The Voice Workflow

```text
User: "Hey VORDI"
  │
  ▼
Wake-Word Engine: "I'm listening."
  │
  ▼
User: "Open YouTube"
  │
  ▼
NLU Engine: Parses intent (OPEN_URL -> https://www.youtube.com)
  │
  ▼
Action Dispatcher: Opens tab in Chrome
  │
  ▼
HUD & TTS: "Opening YouTube."
```

---

## 2. Architecture & Tech Stack

- **Extension Framework:** Chrome Extension Manifest V3
- **Language:** TypeScript 5.3 & Node.js 24
- **UI Framework:** Preact 10 (futuristic dark theme, live diagnostics)
- **Bundler:** Webpack 5 with TypeScript & CSS Loaders
- **Audio Pipeline:** Chrome Offscreen Documents API, Web Audio API, 16kHz linear resampler
- **Wake-Word Engine:** Local Keyword Spotting (KWS) architecture with Sherpa-ONNX WebAssembly integration and documented fallbacks
- **Speech-to-Text:** Local chunked ASR engine with silence detection and voice endpointing
- **NLU:** Rule-based regex compiler with named capture groups and confidence scoring
- **Testing:** Vitest 1.6 unit test suite

---

## 3. Directory Structure

```text
VORDI/
├── public/
│   ├── manifest.json            # Manifest V3 configuration
│   └── icons/                   # Extension icons (16, 48, 128)
├── src/
│   ├── background/
│   │   ├── serviceWorker.ts     # Main orchestrator & message router
│   │   ├── actions/
│   │   │   └── actionDispatcher.ts # 16 supported browser intents
│   │   └── nlu/
│   │       ├── normalizer.ts    # Transcript cleaning & filler removal
│   │       ├── patternCompiler.ts # Regex template compiler
│   │       └── intentClassifier.ts # Intent & entity classifier
│   ├── offscreen/
│   │   ├── offscreen.html       # Offscreen audio host document
│   │   ├── offscreen.ts         # Audio coordinator
│   │   ├── audio/
│   │   │   ├── audioCapture.ts  # getUserMedia & Web Audio pipeline
│   │   │   └── audioResampler.ts # 16kHz PCM linear resampler
│   │   ├── wakeword/
│   │   │   └── kwsEngine.ts     # Keyword spotting engine
│   │   └── speech/
│   │       └── asrEngine.ts     # Speech-to-text with endpointing
│   ├── content/
│   │   ├── content.ts           # Content script message receiver
│   │   ├── dom/
│   │   │   ├── elementMatcher.ts # Accessible name & text discovery
│   │   │   ├── formController.ts # React/Vue controlled form inputs
│   │   │   ├── pageScroller.ts  # Smooth window scrolling
│   │   │   └── mediaController.ts # Video & audio control
│   │   └── hud/
│   │       └── hudOverlay.ts    # Shadow DOM floating feedback card
│   ├── popup/
│   │   ├── index.html           # Popup HTML template
│   │   ├── main.tsx             # Preact entry point
│   │   ├── App.tsx              # Main UI component
│   │   ├── components/          # StatusOrb, Controls, Diagnostics
│   │   └── styles/popup.css     # Futuristic dark theme styles
│   └── shared/
│       ├── types/               # TypeScript interfaces & intents
│       ├── constants/           # Keywords, thresholds & mappings
│       └── messaging/           # Typed runtime & tab messaging
├── models/                      # Directory for local ONNX/WASM weights
├── tests/                       # Vitest unit test suite
├── dist/                        # Compiled production extension
├── webpack.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. Supported Browser Commands (16 Intents)

| Intent | Example Spoken Phrases | Action Executed |
| :--- | :--- | :--- |
| **OPEN_URL** | "Open YouTube", "Go to github.com" | Navigates or opens designated URL |
| **WEB_SEARCH** | "Search for artificial intelligence", "Google quantum computing" | Performs Google search in new tab |
| **YOUTUBE_SEARCH** | "Search YouTube for lofi hip hop" | Searches YouTube directly |
| **NEW_TAB** | "New tab", "Open a new tab" | Creates a new blank tab |
| **CLOSE_TAB** | "Close tab", "Close this tab" | Closes the current active tab |
| **NEXT_TAB** | "Next tab", "Switch to next tab" | Switches to next tab in window |
| **PREVIOUS_TAB** | "Previous tab", "Prev tab" | Switches to previous tab |
| **SCROLL_DOWN** | "Scroll down", "Page down" | Smoothly scrolls page down 450px |
| **SCROLL_UP** | "Scroll up", "Page up" | Smoothly scrolls page up 450px |
| **CLICK_ELEMENT** | "Click submit", "Click Sign In" | Matches and clicks accessible button/link |
| **FILL_INPUT** | "Type hello world into search box" | Fills React/Vue controlled inputs |
| **PLAY_MEDIA** | "Play video", "Resume" | Plays active HTML5 media on page |
| **PAUSE_MEDIA** | "Pause video", "Stop media" | Pauses HTML5 media on page |
| **GO_BACK** | "Go back", "Back" | Navigates browser history back |
| **GO_FORWARD** | "Go forward", "Forward" | Navigates browser history forward |
| **RELOAD_PAGE** | "Reload page", "Refresh" | Reloads the active tab |

---

## 5. Local Wake-Word & Model Download Setup

VORDI prioritizes **local-first** keyword spotting using [Sherpa-ONNX](https://github.com/k2-fsa/sherpa-onnx) WebAssembly.

### State Distinctions
The engine explicitly distinguishes and reports:
1. `micPermissionGranted`: Browser microphone permission state
2. `micStreamActive`: 16kHz live audio stream state
3. `kwsEngineReady`: KWS engine initialization state
4. `kwsModelLoaded`: Presence of binary model weights
5. `keywordConfigured`: "Hey VORDI" target phrase
6. `wakeDetectionActive`: Real-time listening loop state

### Model Setup
To add pre-trained Sherpa-ONNX model files:
1. Run `node scripts/download_models.js` for instructions.
2. Download the Sherpa-ONNX WebAssembly pre-built model assets from the official repository:
   - `kws.onnx`
   - `tokens.txt`
   - `keywords.txt`
3. Place them in the `models/` directory.
4. Run `npm run build`. Webpack automatically packages the models into `dist/models/`.

### Fallback Modes
- **Mode A (Genuine KWS):** Runs local keyword spotting on 16kHz PCM audio frames.
- **Mode B (Continuous STT Fallback):** If local binary weights are pending, continuously captures audio chunks and triggers on the target phrase.
- **Mode C (Push-to-Talk):** Direct microphone button activation without requiring wake-word detection.

---

## 6. Installation & Build Instructions

### Prerequisites
- Node.js 20 or later
- npm or pnpm
- Google Chrome (Manifest V3 compatible)

### Steps

```bash
# 1. Clone repository and install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Type check
npm run typecheck

# 4. Compile production build
npm run build
```

The compiled extension is generated inside `dist/`.

---

## 7. Loading in Google Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** via the toggle switch in the top right.
3. Click the **Load unpacked** button.
4. Select the `dist/` directory inside `d:\VORDI\dist`.
5. Pin VORDI to your Chrome toolbar.
6. Click the VORDI icon to open the popup, and click **Start Listening** or **Push-to-Talk**.

---

## 8. Definition of Done & Verification Status

### 1. Fully Implemented and Tested
- [x] TypeScript & Webpack 5 production build pipeline
- [x] Manifest V3 architecture with valid service worker and offscreen documents
- [x] Preact popup UI with interactive orb, breathing animations, and live diagnostics
- [x] Pattern Compiler with regex compilation and named capture group extraction
- [x] Rule-based NLU Engine with multi-pass filler stripping and normalizer
- [x] Action Dispatcher supporting all 16 browser intents with parameter validation
- [x] Content script with DOM controller (accessible name matching, React/Vue form support, scrolling, media control)
- [x] Floating HUD overlay isolated inside Shadow DOM
- [x] Web Audio API 16kHz PCM resampler and RMS energy monitor
- [x] Push-to-Talk fallback and text command execution tester
- [x] 20/20 Vitest unit tests passing

### 2. Implemented but Requiring Model Setup
- [x] Sherpa-ONNX KWS integration hook and model loader (falls back gracefully to continuous/PTT mode when model weights are not pre-downloaded)

### 3. Partially Implemented / Optional
- [ ] Multi-lingual speech synthesis voices (uses browser default English voice)

### 4. Not Implemented / Out of Scope
- Paid cloud transcription APIs (intentionally avoided per strict free-first / local-first requirements)
