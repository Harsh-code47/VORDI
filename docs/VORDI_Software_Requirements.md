# VORDI — Complete Software & Support Requirements

> [!IMPORTANT]
> This document lists every software tool, library, API, platform, and service required to **develop, build, test, and ship** the VORDI browser extension.

---

## Quick Legend

| Symbol | Meaning |
|---|---|
| ✅ Free | Completely free / open-source |
| 💰 Paid | Requires payment or subscription |
| 🔑 API Key | Free tier available, key required |
| ⭐ Required | Must-have for core functionality |
| 🔵 Optional | Enhances features; fallback exists |
| 🟡 Dev Only | Only needed during development |

---

## 1. 🖥️ Development Environment

### 1.1 Core Runtime & Package Management

| Software | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **Node.js** | ≥ 20.x LTS | ✅ Free ⭐ | JavaScript runtime for build tools | [nodejs.org](https://nodejs.org) |
| **npm** | ≥ 10.x | ✅ Free ⭐ | Package manager (bundled with Node) | Comes with Node.js |
| **pnpm** | ≥ 9.x | ✅ Free 🔵 | Faster alternative to npm | `npm i -g pnpm` |

### 1.2 Language & Type System

| Software | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **TypeScript** | ≥ 5.4 | ✅ Free ⭐ | Typed JavaScript for all source files | `npm i -D typescript` |
| **ts-node** | ≥ 10.x | ✅ Free 🟡 | Run TS scripts without compiling | `npm i -D ts-node` |

### 1.3 Build Tools

| Software | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **Webpack 5** | ≥ 5.90 | ✅ Free ⭐ | Bundle multiple extension entry points (MV3 compliant) | `npm i -D webpack webpack-cli` |
| **webpack-dev-server** | ≥ 5.x | ✅ Free 🟡 | Hot-reload during popup UI development | `npm i -D webpack-dev-server` |
| **ts-loader** | ≥ 9.x | ✅ Free ⭐ | Transpile TypeScript in Webpack pipeline | `npm i -D ts-loader` |
| **css-loader** | ≥ 7.x | ✅ Free ⭐ | Bundle CSS modules | `npm i -D css-loader style-loader` |
| **copy-webpack-plugin** | ≥ 12.x | ✅ Free ⭐ | Copy manifest.json, icons, assets to dist | `npm i -D copy-webpack-plugin` |
| **wasm-pack** | ≥ 0.12 | ✅ Free 🔵 | Compile Rust WASM (if using local whisper.cpp bindings) | [rustwasm.github.io](https://rustwasm.github.io) |

### 1.4 Code Quality

| Software | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **ESLint** | ≥ 9.x | ✅ Free ⭐ | JavaScript/TypeScript linting | `npm i -D eslint @typescript-eslint/parser` |
| **Prettier** | ≥ 3.x | ✅ Free ⭐ | Opinionated code formatter | `npm i -D prettier` |
| **eslint-config-prettier** | latest | ✅ Free 🟡 | Disable ESLint rules that conflict with Prettier | `npm i -D eslint-config-prettier` |
| **Husky** | ≥ 9.x | ✅ Free 🟡 | Git hooks (pre-commit lint + test) | `npm i -D husky` |
| **lint-staged** | latest | ✅ Free 🟡 | Run linters only on staged files | `npm i -D lint-staged` |

---

## 2. 📦 Core Extension Libraries (Runtime)

### 2.1 UI Framework

| Library | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **Preact** | ≥ 10.x | ✅ Free ⭐ | Lightweight React-compatible UI (~3KB) for popup | `npm i preact` |
| **preact/compat** | bundled | ✅ Free 🔵 | Use React ecosystem libraries with Preact | Included with Preact |
| **htm** | ≥ 3.x | ✅ Free 🔵 | JSX alternative (tagged template literals) | `npm i htm` |

### 2.2 Fuzzy String Matching (NLU / DOM Element Finding)

| Library | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **fuse.js** | ≥ 7.x | ✅ Free ⭐ | Fuzzy text search for element label matching | `npm i fuse.js` |
| **fastest-levenshtein** | ≥ 1.x | ✅ Free ⭐ | Edit distance for transcript entity extraction | `npm i fastest-levenshtein` |

### 2.3 Utility Libraries

| Library | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **uuid** | ≥ 10.x | ✅ Free ⭐ | Generate correlation IDs for message bus | `npm i uuid` |
| **zod** | ≥ 3.x | ✅ Free ⭐ | Runtime schema validation for messages, settings | `npm i zod` |
| **mitt** | ≥ 3.x | ✅ Free 🔵 | Tiny event emitter for internal pub/sub | `npm i mitt` |
| **idb** | ≥ 8.x | ✅ Free 🔵 | IndexedDB wrapper (for large macro storage fallback) | `npm i idb` |

### 2.4 Wake Word Detection

| Library | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **@picovoice/porcupine-web** | ≥ 3.x | 🔑 API Key ⭐ | Wake word detection engine (WASM, offline) | `npm i @picovoice/porcupine-web` |
| **@tensorflow/tfjs** | ≥ 4.x | ✅ Free 🔵 | Fallback: run custom TF.js wake word model offline | `npm i @tensorflow/tfjs` |

### 2.5 ASR (Speech-to-Text)

| Library / Service | Tier | Purpose | Install / Setup |
|---|---|---|---|
| **Web Speech API** | ✅ Free ⭐ | Built-in browser ASR, zero install | Native browser API — no install |
| **openai** (npm package) | 🔑 API Key 🔵 | Official OpenAI SDK for Whisper API calls | `npm i openai` |
| **@google-cloud/speech** | 🔑 API Key 🔵 | Google Cloud STT client SDK | `npm i @google-cloud/speech` |
| **whisper.cpp** (WASM build) | ✅ Free 🔵 | Local offline ASR — compile to WASM | [github.com/ggerganov/whisper.cpp](https://github.com/ggerganov/whisper.cpp) |
| **@xenova/transformers** | ✅ Free 🔵 | Run Whisper model locally in browser via ONNX | `npm i @xenova/transformers` |

### 2.6 NLU / LLM Integration

| Library / Service | Tier | Purpose | Install / Setup |
|---|---|---|---|
| **@google/generative-ai** | 🔑 API Key 🔵 | Gemini API SDK for LLM-based intent parsing | `npm i @google/generative-ai` |
| **openai** (npm package) | 🔑 API Key 🔵 | GPT-4o / GPT-4o-mini for complex NLU | `npm i openai` (same as ASR) |
| **Custom Regex Engine** | ✅ Free ⭐ | Rule-based intent matching — no library needed | Built-in JS `RegExp` |

### 2.7 Text-to-Speech (TTS)

| Library / Service | Tier | Purpose | Install |
|---|---|---|---|
| **Web SpeechSynthesis API** | ✅ Free ⭐ | Built-in browser TTS — zero install | Native browser API — no install |
| **@google-cloud/text-to-speech** | 🔑 API Key 🔵 | Higher-quality cloud TTS voices (optional upgrade) | `npm i @google-cloud/text-to-speech` |

---

## 3. 🌐 Browser Platform & Extension APIs

### 3.1 Chrome Extension APIs Used

| API | Purpose | Permission Required |
|---|---|---|
| `chrome.tabs` | Tab CRUD, navigation, zoom | `tabs` |
| `chrome.windows` | Window management | `tabs` |
| `chrome.bookmarks` | Read/write bookmarks | `bookmarks` |
| `chrome.history` | Query browsing history | `history` |
| `chrome.storage` | Persist settings, macros | `storage` |
| `chrome.scripting` | Inject content scripts | `scripting` |
| `chrome.runtime` | Message bus between components | (implicit) |
| `chrome.tts` | Native browser TTS | `tts` |
| `chrome.action` | Extension toolbar icon, badge | (implicit) |
| **Web Audio API** | Microphone stream, AudioWorklet | `microphone` (user prompt) |
| **Web Speech API** | SpeechRecognition (ASR) | `microphone` (user prompt) |
| **WebCrypto API** | AES-256-GCM encryption for API keys | (implicit) |
| **IndexedDB** | Large macro / transcript storage | (implicit) |

### 3.2 Browser Type Definitions (Dev Only)

| Package | Tier | Purpose | Install |
|---|---|---|---|
| **@types/chrome** | ✅ Free 🟡 | TypeScript types for Chrome Extension APIs | `npm i -D @types/chrome` |
| **webextension-polyfill** | ✅ Free 🔵 | Firefox compatibility shim over Chrome APIs | `npm i webextension-polyfill` |
| **@types/webextension-polyfill** | ✅ Free 🟡 | TS types for the polyfill | `npm i -D @types/webextension-polyfill` |

---

## 4. 🧪 Testing Tools

| Tool | Version | Tier | Purpose | Install |
|---|---|---|---|---|
| **Vitest** | ≥ 1.x | ✅ Free 🟡 | Fast unit test runner (Jest-compatible) | `npm i -D vitest` |
| **jsdom** | ≥ 24.x | ✅ Free 🟡 | Simulated DOM environment for content script tests | `npm i -D jsdom` |
| **@vitest/coverage-v8** | ≥ 1.x | ✅ Free 🟡 | Code coverage reporting | `npm i -D @vitest/coverage-v8` |
| **sinon** | ≥ 17.x | ✅ Free 🟡 | Stubs/mocks for Chrome API calls in tests | `npm i -D sinon` |
| **sinon-chrome** | ≥ 3.x | ✅ Free 🟡 | Pre-built Chrome API mocks for Sinon | `npm i -D sinon-chrome` |
| **Playwright** | ≥ 1.44 | ✅ Free 🟡 | End-to-end browser testing with extension loaded | `npm i -D playwright` |
| **@playwright/test** | ≥ 1.44 | ✅ Free 🟡 | Playwright test runner for E2E | `npm i -D @playwright/test` |

---

## 5. 🔧 Development Tools & IDE

### 5.1 Code Editor

| Tool | Tier | Purpose |
|---|---|---|
| **Visual Studio Code** | ✅ Free ⭐ | Primary IDE |
| **Cursor / Windsurf** | ✅/💰 Free/Paid 🔵 | AI-assisted coding alternative |

### 5.2 VS Code Extensions (Recommended)

| Extension ID | Purpose |
|---|---|
| `dbaeumer.vscode-eslint` | ESLint inline warnings |
| `esbenp.prettier-vscode` | Auto-format on save |
| `ms-vscode.vscode-typescript-next` | Latest TS language server |
| `bradlc.vscode-tailwindcss` | CSS autocomplete (if using Tailwind) |
| `orta.vscode-jest` | Vitest/Jest inline test runner |
| `pflannery.vscode-versionlens` | Show outdated package versions |

### 5.3 Browser Developer Tools

| Tool | Tier | Purpose |
|---|---|---|
| **Chrome DevTools** | ✅ Free ⭐ | Debug extension background worker, content scripts |
| **Chrome Extension reloader** | ✅ Free 🟡 | Auto-reload extension on file change |
| **Firefox Developer Edition** | ✅ Free 🔵 | Firefox extension debugging via `about:debugging` |
| **Extension source viewer** | ✅ Free 🟡 | Inspect other extensions for reference |

### 5.4 API Testing

| Tool | Tier | Purpose |
|---|---|---|
| **Postman** | ✅ Free 🟡 | Test cloud ASR/NLU REST API calls manually |
| **Insomnia** | ✅ Free 🟡 | Alternative REST client |
| **curl** | ✅ Free 🟡 | Command-line API testing |

---

## 6. ☁️ Cloud Services & APIs

### 6.1 ASR (Speech-to-Text) Services

| Service | Free Tier | Paid Plan | Sign-up |
|---|---|---|---|
| **Google Cloud Speech-to-Text** | 60 min/month free | \$0.006/15s after | [cloud.google.com](https://cloud.google.com/speech-to-text) |
| **OpenAI Whisper API** | None (pay-as-you-go) | \$0.006/min | [platform.openai.com](https://platform.openai.com) |
| **Azure Speech Services** | 5 hr/month free | \$1/hr after | [azure.microsoft.com](https://azure.microsoft.com/en-us/services/cognitive-services/speech-to-text/) |
| **Deepgram** | \$200 free credit | \$0.0043/min | [deepgram.com](https://deepgram.com) |

> [!TIP]
> For development and testing, **Web Speech API** (free, built-in) is sufficient. Cloud ASR only matters for production offline-fallback scenarios.

### 6.2 NLU / LLM Services

| Service | Free Tier | Paid Plan | Sign-up |
|---|---|---|---|
| **Google Gemini API** (1.5 Flash) | 15 req/min free | \$0.075/1M tokens | [aistudio.google.com](https://aistudio.google.com) |
| **OpenAI GPT-4o-mini** | None | \$0.15/1M input tokens | [platform.openai.com](https://platform.openai.com) |
| **Anthropic Claude Haiku** | None | \$0.25/1M tokens | [anthropic.com](https://anthropic.com) |
| **Ollama (local)** | ✅ Free | — | [ollama.com](https://ollama.com) |

> [!TIP]
> **Gemini 1.5 Flash** is the recommended default — generous free tier, fast inference, and low cost. Perfect for the LLM fallback NLU tier.

### 6.3 Wake Word Service

| Service | Free Tier | Paid Plan | Sign-up |
|---|---|---|---|
| **Picovoice Porcupine** | 3 wake words free | \$0.001/hour after | [picovoice.ai](https://picovoice.ai) |
| **Snowboy** (deprecated) | — | — | Not recommended |
| **Custom TF.js model** | ✅ Free | — | Train with TensorFlow |

---

## 7. 🗄️ Version Control & Collaboration

| Tool | Tier | Purpose |
|---|---|---|
| **Git** | ✅ Free ⭐ | Source control | 
| **GitHub / GitLab** | ✅ Free ⭐ | Remote repository + Issues + PRs |
| **GitHub Actions** | ✅ Free (2000 min/mo) | CI/CD pipeline for lint, test, build |
| **Conventional Commits** | ✅ Free 🟡 | Commit message standard for changelog generation |
| **commitlint** | ✅ Free 🟡 | Enforce commit message format | 

---

## 8. 📦 CI/CD & Release Pipeline

| Tool | Tier | Purpose | Setup |
|---|---|---|---|
| **GitHub Actions** | ✅ Free ⭐ | Automated lint → test → build → package | `.github/workflows/ci.yml` |
| **semantic-release** | ✅ Free 🟡 | Automated versioning + changelog + GitHub release | `npm i -D semantic-release` |
| **web-ext** | ✅ Free ⭐ | Mozilla's official CLI — lint, build, sign Firefox ext | `npm i -D web-ext` |
| **crx3** / **chrome-extension-deploy** | ✅ Free 🟡 | Package Chrome extension as .crx for self-hosting | `npm i -D crx3` |
| **zip-webpack-plugin** | ✅ Free ⭐ | Auto-zip dist folder for store submission | `npm i -D zip-webpack-plugin` |

---

## 9. 🏪 Browser Store Accounts

| Store | Cost | Purpose | Sign-up |
|---|---|---|---|
| **Chrome Web Store Developer Account** | 💰 One-time \$5 | Publish to Chrome, Edge, Brave | [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) |
| **Mozilla Add-ons Developer Account** | ✅ Free | Publish to Firefox | [addons.mozilla.org/developers](https://addons.mozilla.org/en-US/developers/) |
| **Microsoft Partner Center** | ✅ Free | Publish to Edge Add-ons store | [partner.microsoft.com](https://partner.microsoft.com) |

---

## 10. 🔐 Security & Certificate Tools

| Tool | Tier | Purpose |
|---|---|---|
| **WebCrypto API** | ✅ Free ⭐ | Built-in browser AES-256-GCM for API key encryption |
| **dotenv** | ✅ Free 🟡 | Manage local env variables during development | `npm i -D dotenv` |
| **npm audit** | ✅ Free 🟡 | Scan dependencies for known vulnerabilities | Built-in npm command |
| **Snyk** | ✅/💰 Free tier | Continuous dependency vulnerability scanning | [snyk.io](https://snyk.io) |

---

## 11. 🎨 Design & Asset Tools

| Tool | Tier | Purpose |
|---|---|---|
| **Figma** | ✅ Free (starter) | Design popup UI, HUD overlay, onboarding wizard wireframes |
| **Inkscape / Illustrator** | ✅/💰 Free/Paid | Create SVG extension icons |
| **SVGR** | ✅ Free | Convert SVG icons to React/Preact components | `npm i -D @svgr/webpack` |
| **sharp** | ✅ Free | Resize and optimize PNG icons for all required sizes | `npm i -D sharp` |

---

## 12. 📊 Monitoring & Analytics (Post-Launch)

| Tool | Tier | Purpose |
|---|---|---|
| **Sentry** | ✅ Free (5K events/mo) | Error tracking in production extension |
| **Mixpanel / PostHog** | ✅/💰 Free tier | Anonymous usage analytics (opt-in only) |
| **LogRocket** | 💰 Paid | Session replay for debugging user-reported issues |

> [!CAUTION]
> Any analytics or error tracking must be **opt-in only** and clearly disclosed in the privacy policy, per Chrome Web Store policies.

---

## Summary Table

| Category | # Tools | Must-Have | Optional |
|---|---|---|---|
| Dev Environment | 7 | 5 | 2 |
| Core Libraries | 18 | 8 | 10 |
| Browser APIs | 12 | 10 | 2 |
| Testing Tools | 7 | 0 (dev only) | 7 |
| IDE & Dev Tools | 12 | 1 (VSCode) | 11 |
| Cloud Services | 11 | 0 (all optional) | 11 |
| Version Control / CI | 6 | 3 | 3 |
| Store Accounts | 3 | 1 (Chrome) | 2 |
| Security Tools | 4 | 1 (WebCrypto) | 3 |
| Design Tools | 4 | 1 (Figma) | 3 |
| Monitoring | 3 | 0 | 3 |
| **Total** | **87** | **~29** | **~58** |

---

## Minimum Viable Setup (Get Started in 10 Minutes)

```bash
# 1. Install Node.js 20 LTS from https://nodejs.org

# 2. Clone/init project
mkdir vordi && cd vordi
npm init -y

# 3. Install core dependencies
npm i preact fuse.js fastest-levenshtein uuid zod mitt

# 4. Install dev dependencies
npm i -D typescript webpack webpack-cli ts-loader copy-webpack-plugin \
         css-loader style-loader \
         eslint prettier @typescript-eslint/parser \
         @types/chrome webextension-polyfill \
         vitest jsdom sinon sinon-chrome \
         web-ext zip-webpack-plugin

# 5. Wake word SDK
npm i @picovoice/porcupine-web

# 6. LLM for NLU (pick one)
npm i @google/generative-ai   # Gemini (recommended)
# or
npm i openai                  # OpenAI

# 7. Ready to build!
```

> [!NOTE]
> **Total estimated cost to launch VORDI:**
> - Development: **\$0** (all free tools)
> - Chrome Web Store: **\$5** one-time
> - Picovoice Porcupine: **\$0** (free tier covers 3 wake words)
> - Cloud ASR/NLU: **~\$0–\$10/month** depending on user base size
> - Gemini API: **\$0** on free tier (15 req/min)
>
> **MVP can be built and shipped for under \$10 total.**
