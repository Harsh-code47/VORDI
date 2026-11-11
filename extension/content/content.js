// content/content.js — VORDI content script with HUD and voice interaction

(function () {
  'use strict';

  // Prevent double injection
  if (window.__vordiInjected) return;
  window.__vordiInjected = true;

  // ── Shadow DOM HUD ──────────────────────────────────────────────────────────
  const HUD_STYLES = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    #vordi-hud {
      --bg: rgba(10, 10, 20, 0.92);
      --border: rgba(99, 102, 241, 0.6);
      --accent: #6366f1;
      --accent-green: #22c55e;
      --accent-yellow: #eab308;
      --accent-red: #ef4444;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --radius: 14px;
      --shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--border);

      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 290px;
      background: var(--bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      padding: 12px 14px;
      z-index: 2147483647;
      pointer-events: auto;
      transition: transform 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s ease;
      user-select: none;
    }

    #vordi-hud.hud-top-left    { bottom: auto; right: auto; top: 20px; left: 20px; }
    #vordi-hud.hud-top-right   { bottom: auto; top: 20px; }
    #vordi-hud.hud-bottom-left { right: auto; left: 20px; }

    #vordi-hud.hidden { opacity: 0; transform: translateY(10px) scale(0.97); pointer-events: none; }

    .hud-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .hud-logo {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.05em;
    }

    .hud-mic-btn {
      background: rgba(99, 102, 241, 0.25);
      border: 1px solid rgba(99, 102, 241, 0.5);
      color: #fff;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
      margin-left: auto;
      outline: none;
      padding: 0;
    }

    .hud-mic-btn:hover {
      background: var(--accent);
      transform: scale(1.1);
    }

    .hud-mic-btn.listening {
      background: var(--accent-green);
      border-color: var(--accent-green);
      animation: pulse 1s infinite;
      box-shadow: 0 0 10px var(--accent-green);
    }

    .hud-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-red);
      transition: background 0.4s ease;
      box-shadow: 0 0 6px currentColor;
    }

    .hud-status-dot.standby  { background: var(--accent-yellow); }
    .hud-status-dot.active   { background: var(--accent-green); animation: pulse 1s infinite; }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.85); }
    }

    .hud-status-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .hud-divider {
      height: 1px;
      background: rgba(255,255,255,0.08);
      margin: 8px 0;
    }

    .hud-transcript {
      font-size: 12px;
      color: var(--text-muted);
      min-height: 18px;
      font-style: italic;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hud-transcript.interim { color: #93c5fd; }
    .hud-transcript.final   { color: var(--text); font-style: normal; }

    .hud-command {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hud-command span {
      color: var(--accent);
      font-weight: 600;
    }

    .hud-hint {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }

    /* Notification flash */
    .hud-flash {
      position: absolute;
      inset: 0;
      border-radius: var(--radius);
      background: var(--accent);
      opacity: 0;
      pointer-events: none;
      animation: flash 0.4s ease;
    }
    @keyframes flash {
      0% { opacity: 0.2; }
      100% { opacity: 0; }
    }
  `;

  // Create shadow host
  const host = document.createElement('div');
  host.id = 'vordi-hud-host';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // Style element
  const styleEl = document.createElement('style');
  styleEl.textContent = HUD_STYLES;
  shadow.appendChild(styleEl);

  // HUD element
  const hud = document.createElement('div');
  hud.id = 'vordi-hud';
  hud.innerHTML = `
    <div class="hud-header">
      <span class="hud-logo">◎ VORDI</span>
      <button class="hud-mic-btn" id="v-mic-btn" title="Tap to Speak (or Alt+V)">🎤</button>
      <span class="hud-status-dot" id="v-dot"></span>
    </div>
    <div class="hud-status-label" id="v-status">Sleeping</div>
    <div class="hud-divider"></div>
    <div class="hud-transcript" id="v-transcript">Say "Hey VORDI" or tap 🎤</div>
    <div class="hud-command" id="v-command"></div>
    <div class="hud-hint">Press Alt+V to speak</div>
  `;
  shadow.appendChild(hud);

  const dot = shadow.getElementById('v-dot');
  const micBtn = shadow.getElementById('v-mic-btn');
  const statusLabel = shadow.getElementById('v-status');
  const transcriptEl = shadow.getElementById('v-transcript');
  const commandEl = shadow.getElementById('v-command');

  // Retrieve settings
  chrome.storage.local.get('settings', (data) => {
    const s = data.settings || {};
    if (s.hudVisible === false) hud.classList.add('hidden');
    if (s.hudPosition === 'top-right') hud.classList.add('hud-top-right');
    else if (s.hudPosition === 'top-left') hud.classList.add('hud-top-left');
    else if (s.hudPosition === 'bottom-left') hud.classList.add('hud-bottom-left');

    if (s.enabled !== false) {
      setHUDState('standby', 'Say "Hey VORDI" or tap 🎤');
      setTimeout(startWakeWordListener, 1200);
    }
  });

  function setHUDState(state, message) {
    dot.className = 'hud-status-dot';
    if (state === 'standby') {
      dot.classList.add('standby');
      statusLabel.textContent = 'Standby';
    } else if (state === 'active') {
      dot.classList.add('active');
      statusLabel.textContent = 'Active';
    } else {
      statusLabel.textContent = 'Sleeping';
    }
    if (message) {
      transcriptEl.textContent = message;
      transcriptEl.className = 'hud-transcript';
    }
    flashHUD();
  }

  function flashHUD() {
    const f = document.createElement('div');
    f.className = 'hud-flash';
    hud.appendChild(f);
    setTimeout(() => f.remove(), 500);
  }

  // ── Speech Recognition & Wake Word on Web Pages ─────────────────────────────
  const WAKE_PHRASES = ['hey vordi', 'hey wordy', 'hey vordee', 'hey boardy', 'vordi'];
  let wakeRecognizer = null;
  let isWakeListening = false;
  let commandRecognizer = null;
  let isCommandListening = false;

  function startWakeWordListener() {
    if (isWakeListening || isCommandListening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    try {
      wakeRecognizer = new SR();
      wakeRecognizer.continuous = true;
      wakeRecognizer.interimResults = true;
      wakeRecognizer.lang = 'en-US';

      wakeRecognizer.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const text = e.results[i][0].transcript.toLowerCase();
          for (const phrase of WAKE_PHRASES) {
            if (text.includes(phrase)) {
              console.log('[VORDI Content] Wake word detected:', text);
              const idx = text.indexOf(phrase) + phrase.length;
              const remainder = text.slice(idx).trim();

              stopWakeRecognizer();

              if (remainder.length > 2) {
                // Command was spoken together, e.g. "Hey VORDI new tab"
                setHUDState('active', `"${remainder}"`);
                chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: remainder });
                setTimeout(startWakeWordListener, 2000);
              } else {
                // Wake word alone, arm command listener
                triggerCommandListen();
              }
              return;
            }
          }
        }
      };

      wakeRecognizer.onerror = (e) => {
        isWakeListening = false;
        if (e.error !== 'not-allowed') {
          setTimeout(startWakeWordListener, 2500);
        }
      };

      wakeRecognizer.onend = () => {
        isWakeListening = false;
        if (!isCommandListening) {
          setTimeout(startWakeWordListener, 1000);
        }
      };

      wakeRecognizer.start();
      isWakeListening = true;
      setHUDState('standby', 'Say "Hey VORDI" or tap 🎤');
    } catch (_) {}
  }

  function stopWakeRecognizer() {
    if (wakeRecognizer) {
      try { wakeRecognizer.abort(); } catch (_) {}
      wakeRecognizer = null;
    }
    isWakeListening = false;
  }

  function triggerCommandListen() {
    stopWakeRecognizer();
    if (isCommandListening) {
      if (commandRecognizer) {
        try { commandRecognizer.stop(); } catch (_) {}
      }
      isCommandListening = false;
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    commandRecognizer = new SR();
    commandRecognizer.continuous = false;
    commandRecognizer.interimResults = true;
    commandRecognizer.lang = 'en-US';

    let finalCommand = '';
    let latestSpoken = '';

    commandRecognizer.onstart = () => {
      isCommandListening = true;
      micBtn.classList.add('listening');
      setHUDState('active', 'Listening… Speak now!');
    };

    commandRecognizer.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalCommand += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      latestSpoken = (finalCommand || interim).trim();
      if (latestSpoken) transcriptEl.textContent = `"${latestSpoken}"`;
    };

    commandRecognizer.onerror = (e) => {
      isCommandListening = false;
      micBtn.classList.remove('listening');
      setHUDState('standby', e.error === 'not-allowed' ? 'Mic access blocked' : `Mic error: ${e.error}`);
      setTimeout(startWakeWordListener, 2000);
    };

    commandRecognizer.onend = () => {
      isCommandListening = false;
      micBtn.classList.remove('listening');
      const cmd = (finalCommand || latestSpoken).trim();
      if (cmd) {
        setHUDState('active', `Running: "${cmd}"`);
        chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: cmd });
        setTimeout(startWakeWordListener, 2000);
      } else {
        setHUDState('standby', 'Say "Hey VORDI" or tap 🎤');
        setTimeout(startWakeWordListener, 1000);
      }
    };

    try {
      commandRecognizer.start();
    } catch (err) {
      console.warn('Could not start command recognition:', err);
      setTimeout(startWakeWordListener, 2000);
    }
  }

  // Click mic button on HUD
  micBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerCommandListen();
  });

  // Hotkey: Alt+V
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault();
      triggerCommandListen();
    }
  });

  // ── Message listener from background ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return;

    switch (message.type) {
      case 'START_PAGE_LISTEN':
        triggerCommandListen();
        sendResponse({ ok: true });
        break;

      case 'HUD_STATE':
        setHUDState(message.state, message.message);
        break;

      case 'HUD_TRANSCRIPT':
        transcriptEl.textContent = message.transcript;
        transcriptEl.className = 'hud-transcript ' + (message.isFinal ? 'final' : 'interim');
        break;

      case 'HUD_COMMAND':
        commandEl.innerHTML = `Last: <span>${escapeHtml(message.command)}</span>`;
        break;

      // ── DOM actions ────────────────────────────────────────────────────
      case 'SCROLL_UP':
        window.scrollBy({ top: -(message.entities?.pixels || 300), behavior: 'smooth' });
        sendResponse({ success: true, ttsText: 'Scrolled up' });
        break;

      case 'SCROLL_DOWN':
        window.scrollBy({ top: message.entities?.pixels || 300, behavior: 'smooth' });
        sendResponse({ success: true, ttsText: 'Scrolled down' });
        break;

      case 'SCROLL_TOP':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        sendResponse({ success: true, ttsText: 'Top of page' });
        break;

      case 'SCROLL_BOTTOM':
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        sendResponse({ success: true, ttsText: 'Bottom of page' });
        break;

      case 'CLICK_ELEMENT': {
        const clicked = clickElement(message.entities?.elementText || '');
        sendResponse({ success: clicked, ttsText: clicked ? 'Clicked' : 'Element not found' });
        break;
      }

      case 'TYPE_TEXT': {
        const typed = typeText(message.entities?.inputText || '');
        sendResponse({ success: typed, ttsText: typed ? 'Typed' : 'No input focused' });
        break;
      }

      case 'SUBMIT_FORM': {
        const submitted = submitForm();
        sendResponse({ success: submitted, ttsText: submitted ? 'Submitted' : 'No form found' });
        break;
      }

      case 'SELECT_TEXT':
        document.execCommand('selectAll');
        sendResponse({ success: true, ttsText: 'All selected' });
        break;

      case 'COPY':
        document.execCommand('copy');
        sendResponse({ success: true, ttsText: 'Copied' });
        break;

      case 'PASTE':
        document.execCommand('paste');
        sendResponse({ success: true, ttsText: 'Pasted' });
        break;

      case 'CUT':
        document.execCommand('cut');
        sendResponse({ success: true, ttsText: 'Cut' });
        break;

      case 'PLAY_PAUSE': {
        const media = getMedia();
        if (media) {
          media.paused ? media.play() : media.pause();
          sendResponse({ success: true, ttsText: media.paused ? 'Paused' : 'Playing' });
        } else {
          sendResponse({ success: false, ttsText: 'No media found' });
        }
        break;
      }

      case 'VOLUME_UP': {
        const m = getMedia();
        if (m) { m.volume = Math.min(1, m.volume + 0.1); sendResponse({ success: true, ttsText: 'Volume up' }); }
        else sendResponse({ success: false, ttsText: 'No media' });
        break;
      }

      case 'VOLUME_DOWN': {
        const m = getMedia();
        if (m) { m.volume = Math.max(0, m.volume - 0.1); sendResponse({ success: true, ttsText: 'Volume down' }); }
        else sendResponse({ success: false, ttsText: 'No media' });
        break;
      }

      case 'SET_VOLUME': {
        const m = getMedia();
        if (m && message.entities?.volumeLevel !== undefined) {
          m.volume = message.entities.volumeLevel;
          sendResponse({ success: true, ttsText: `Volume set to ${Math.round(m.volume * 100)} percent` });
        } else {
          sendResponse({ success: false, ttsText: 'No media or volume level' });
        }
        break;
      }

      case 'SEEK_FORWARD': {
        const m = getMedia();
        if (m) { m.currentTime += (message.entities?.seekSeconds || 10); sendResponse({ success: true, ttsText: 'Skipped forward' }); }
        else sendResponse({ success: false, ttsText: 'No media' });
        break;
      }

      case 'SEEK_BACKWARD': {
        const m = getMedia();
        if (m) { m.currentTime = Math.max(0, m.currentTime - (message.entities?.seekSeconds || 10)); sendResponse({ success: true, ttsText: 'Rewound' }); }
        else sendResponse({ success: false, ttsText: 'No media' });
        break;
      }

      case 'TOGGLE_FULLSCREEN': {
        const m = getMedia();
        if (m) {
          document.fullscreenElement ? document.exitFullscreen() : m.requestFullscreen?.();
          sendResponse({ success: true });
        } else {
          document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
          sendResponse({ success: true });
        }
        break;
      }

      case 'TOGGLE_PIP': {
        const v = document.querySelector('video');
        if (v) {
          document.pictureInPictureElement ? document.exitPictureInPicture() : v.requestPictureInPicture?.();
          sendResponse({ success: true, ttsText: 'Picture in picture' });
        } else {
          sendResponse({ success: false, ttsText: 'No video for picture in picture' });
        }
        break;
      }

      case 'TOGGLE_CAPTIONS': {
        const v = document.querySelector('video');
        if (v?.textTracks?.length) {
          const track = v.textTracks[0];
          track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
          sendResponse({ success: true, ttsText: 'Captions toggled' });
        } else {
          sendResponse({ success: false, ttsText: 'No captions found' });
        }
        break;
      }

      case 'READ_PAGE': {
        const title = document.title;
        const meta = document.querySelector('meta[name="description"]')?.content || '';
        const h1 = document.querySelector('h1')?.innerText || '';
        const text = `This page is titled ${title}. ${h1 ? 'Heading: ' + h1 : ''}. ${meta}`;
        sendResponse({ success: true, ttsText: text });
        break;
      }

      case 'READ_SELECTION': {
        const sel = window.getSelection().toString().trim();
        sendResponse({ success: !!sel, ttsText: sel || 'No text selected' });
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
    return true; // Keep sendResponse open
  });

  // ── Helper functions for DOM interaction ──────────────────────────────────
  function getMedia() {
    return document.querySelector('video') || document.querySelector('audio') || null;
  }

  function clickElement(text) {
    if (!text) return false;
    const lower = text.toLowerCase().trim();

    const candidates = Array.from(
      document.querySelectorAll(
        'button, a, input[type="button"], input[type="submit"], [role="button"], [role="link"], label, [onclick]'
      )
    );

    // Exact text match first
    let match = candidates.find((el) => {
      const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').toLowerCase().trim();
      return t === lower;
    });

    // Substring match second
    if (!match) {
      match = candidates.find((el) => {
        const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').toLowerCase();
        return t.includes(lower);
      });
    }

    if (match) {
      match.focus();
      match.click();
      return true;
    }
    return false;
  }

  function typeText(text) {
    if (!text) return false;

    let target = document.activeElement;
    if (
      !target ||
      (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable)
    ) {
      target = document.querySelector('input:not([type="hidden"]), textarea, [contenteditable="true"]');
    }
    if (!target) return false;

    if (target.isContentEditable) {
      target.textContent += text;
    } else {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(target, (target.value || '') + text);
      } else {
        target.value += text;
      }
    }
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function submitForm() {
    const focused = document.activeElement;
    const form = focused?.closest('form') || document.querySelector('form');
    if (!form) return false;
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.click(); return true; }
    form.submit();
    return true;
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
