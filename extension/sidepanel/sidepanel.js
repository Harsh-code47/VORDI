// sidepanel/sidepanel.js
// Continuous hands-free voice assistant with "Hey VORDI" wake-word detection

document.addEventListener('DOMContentLoaded', async () => {
  const orb            = document.getElementById('orb');
  const micTriggerBtn  = document.getElementById('mic-trigger-btn');
  const btnToggleWake  = document.getElementById('btn-toggle-wake');
  const statusTitle    = document.getElementById('status-title');
  const statusDesc     = document.getElementById('status-desc');
  const transcriptBody = document.getElementById('transcript-body');
  const meterFill      = document.getElementById('meter-fill');
  const directCmdForm  = document.getElementById('direct-cmd-form');
  const cmdInput       = document.getElementById('cmd-input');
  const quickChips     = document.querySelectorAll('.quick-chip');
  const btnRunDiag     = document.getElementById('btn-run-diag');
  const diagResults    = document.getElementById('diag-results');
  const historyList    = document.getElementById('history-list');

  // ── Theme toggle ────────────────────────────────────────────────────────────
  // (Theme is applied by inline script in HTML before JS loads to prevent flash.
  //  The btn-theme listener is wired there too — nothing extra needed here.)

  // ── State ───────────────────────────────────────────────────────────────────
  let wakeEnabled     = true;
  let recognition     = null;
  let isListening     = false;
  let isCommandActive = false;
  let restartTimer    = null;   // debounce restart loop
  let audioContext    = null;
  let analyser        = null;
  let animFrameId     = null;

  // ── Load language from settings ─────────────────────────────────────────────
  let currentLanguage = 'en-US';
  try {
    const stored = await chrome.storage.local.get('settings');
    if (stored.settings?.language) currentLanguage = stored.settings.language;
  } catch (_) {}

  // ── Wake phrase variants (typo-tolerant) ────────────────────────────────────
  const WAKE_PHRASES = ['hey vordi', 'hey wordy', 'hey vordee', 'hey boardy', 'vordi'];

  // ── Audio Level Meter ───────────────────────────────────────────────────────
  async function initAudioMeter() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext  = new (window.AudioContext || window.webkitAudioContext)();
      const source  = audioContext.createMediaStreamSource(stream);
      analyser      = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray    = new Uint8Array(bufferLength);

      function tick() {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const pct = Math.min(100, Math.round((sum / bufferLength / 128) * 100));
        meterFill.style.width = `${pct}%`;
        animFrameId = requestAnimationFrame(tick);
      }
      tick();
    } catch (err) {
      console.warn('[VORDI SidePanel] Audio meter:', err.message);
    }
  }

  // ── Continuous recognition loop ──────────────────────────────────────────────
  function startRecognitionLoop() {
    if (!wakeEnabled) return;

    // Clear any pending restart
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      statusTitle.textContent = 'Speech Recognition Not Supported';
      statusDesc.textContent  = 'Please use Google Chrome.';
      return;
    }

    // Tear down old instance
    if (recognition) {
      try {
        recognition.onstart  = null;
        recognition.onresult = null;
        recognition.onerror  = null;
        recognition.onend    = null;
        recognition.abort();
      } catch (_) {}
      recognition = null;
    }

    try {
      const rec    = new SR();
      recognition  = rec;
      rec.continuous     = true;
      rec.interimResults = true;
      rec.lang           = currentLanguage;

      rec.onstart = () => {
        isListening = true;
        setOrbState(isCommandActive ? 'listening' : 'idle');
        if (!isCommandActive) {
          statusTitle.textContent = 'Listening for "Hey VORDI"';
          statusDesc.textContent  = 'Say "Hey VORDI" followed by a command';
        }
      };

      rec.onresult = (event) => {
        let interim = '';
        let final   = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) final   += res[0].transcript;
          else             interim += res[0].transcript;
        }

        const heard = (final || interim).trim();
        if (heard) transcriptBody.textContent = `"${heard}"`;

        const lower = heard.toLowerCase();

        // Check for wake word
        for (const phrase of WAKE_PHRASES) {
          if (lower.includes(phrase)) {
            const idx       = lower.indexOf(phrase) + phrase.length;
            const remainder = heard.slice(idx).replace(/^[,.\s]+/, '').trim();

            if (remainder.length > 1) {
              // Inline command: "Hey VORDI, new tab"
              executeCommand(remainder);
            } else {
              // Wake word alone — arm command mode
              isCommandActive = true;
              setOrbState('listening');
              statusTitle.textContent = 'Listening for your command';
              statusDesc.textContent  = 'Speak now: "new tab", "scroll down", etc.';
            }
            return;
          }
        }

        // If armed and speech is long enough, treat as command
        if (isCommandActive && heard.length > 2 && final) {
          isCommandActive = false;
          executeCommand(heard);
        }
      };

      rec.onerror = (event) => {
        console.warn('[VORDI SidePanel] Speech error:', event.error);
        isListening = false;

        if (event.error === 'not-allowed') {
          wakeEnabled = false;
          setOrbState('idle');
          statusTitle.textContent = 'Microphone Blocked';
          statusDesc.textContent  = 'Allow microphone access in Chrome settings.';
        } else if (event.error === 'aborted') {
          // Intentional abort (e.g. we called recognition.abort()) — ignore
        } else if (event.error === 'no-speech') {
          // Normal timeout — onend will restart the loop
        } else {
          statusDesc.textContent = `Recognition error: ${event.error}`;
        }
      };

      rec.onend = () => {
        isListening     = false;
        isCommandActive = false;
        setOrbState('idle');

        if (wakeEnabled) {
          // Small delay to avoid rapid restart loops
          restartTimer = setTimeout(startRecognitionLoop, 350);
        }
      };

      rec.start();
    } catch (err) {
      console.warn('[VORDI SidePanel] Recognition start failed:', err);
      if (wakeEnabled) {
        restartTimer = setTimeout(startRecognitionLoop, 1200);
      }
    }
  }

  function stopRecognitionLoop() {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
    if (recognition) {
      try {
        recognition.onstart  = null;
        recognition.onresult = null;
        recognition.onerror  = null;
        recognition.onend    = null;   // prevent auto-restart inside onend
        recognition.stop();
      } catch (_) {}
      recognition = null;
    }
    isListening     = false;
    isCommandActive = false;
    setOrbState('idle');
  }

  // ── Orb visual state helper ──────────────────────────────────────────────────
  function setOrbState(state) {
    if (state === 'listening') {
      orb.classList.add('listening');
    } else {
      orb.classList.remove('listening');
    }
  }

  // ── Orb button: manual one-shot command ─────────────────────────────────────
  micTriggerBtn.addEventListener('click', () => {
    if (!wakeEnabled) {
      // Wake word is off — do a fresh one-shot listen
      oneShortListen();
      return;
    }

    // Wake word is on and loop is running: arm command mode immediately
    isCommandActive = true;
    setOrbState('listening');
    statusTitle.textContent = 'Listening for your command';
    statusDesc.textContent  = 'Speak now...';
    transcriptBody.textContent = 'Listening...';

    // Safety: auto-disarm after 7 s if nothing heard
    setTimeout(() => {
      if (isCommandActive) {
        isCommandActive = false;
        if (!isListening) setOrbState('idle');
        statusTitle.textContent = 'Listening for "Hey VORDI"';
        statusDesc.textContent  = 'Say "Hey VORDI" or tap the mic icon';
      }
    }, 7000);
  });

  // One-shot listen when wake word loop is off
  function oneShortListen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // Don't stack a second instance
    if (isListening) return;

    setOrbState('listening');
    statusTitle.textContent    = 'Listening for your command';
    statusDesc.textContent     = 'Speak now...';
    transcriptBody.textContent = 'Listening...';

    const rec = new SR();
    rec.lang           = currentLanguage;
    rec.continuous     = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let heard = '';

    rec.onstart = () => { isListening = true; };

    rec.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const r = event.results[i];
        if (r.isFinal) final   += r[0].transcript;
        else           interim += r[0].transcript;
      }
      heard = (final || interim).trim();
      transcriptBody.textContent = `"${heard}"`;
    };

    rec.onerror = (event) => {
      isListening = false;
      setOrbState('idle');
      if (event.error === 'not-allowed') {
        statusTitle.textContent = 'Microphone Blocked';
        statusDesc.textContent  = 'Allow microphone access in Chrome settings.';
      } else {
        statusTitle.textContent = 'Wake Word Paused';
        statusDesc.textContent  = 'Tap the mic icon to speak a command.';
      }
    };

    rec.onend = () => {
      isListening = false;
      setOrbState('idle');
      if (heard.trim().length > 1) {
        executeCommand(heard.trim());
      } else {
        statusTitle.textContent = 'Wake Word Paused';
        statusDesc.textContent  = 'Tap the mic icon to speak a command.';
      }
    };

    try { rec.start(); } catch (e) {
      isListening = false;
      setOrbState('idle');
      console.warn('[VORDI SidePanel] oneShortListen start error:', e);
    }
  }

  // ── Wake Word toggle button ──────────────────────────────────────────────────
  btnToggleWake.addEventListener('click', () => {
    wakeEnabled = !wakeEnabled;

    if (wakeEnabled) {
      btnToggleWake.classList.add('active');
      btnToggleWake.querySelector('.wake-label').textContent = 'Wake Word: ON';
      statusTitle.textContent = 'Listening for "Hey VORDI"';
      statusDesc.textContent  = 'Say "Hey VORDI" followed by a command';
      startRecognitionLoop();
    } else {
      btnToggleWake.classList.remove('active');
      btnToggleWake.querySelector('.wake-label').textContent = 'Wake Word: OFF';
      statusTitle.textContent = 'Wake Word Paused';
      statusDesc.textContent  = 'Tap the mic icon to speak a command manually.';
      stopRecognitionLoop();
    }
  });

  // ── Execute command via service worker ───────────────────────────────────────
  function executeCommand(text) {
    if (!text || !text.trim()) return;
    const clean = text.trim();

    statusTitle.textContent    = `Executing: "${clean}"`;
    statusDesc.textContent     = 'Processing command...';
    transcriptBody.textContent = `"${clean}"`;

    chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: clean }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[VORDI SidePanel] EXECUTE_COMMAND error:', chrome.runtime.lastError.message);
        statusTitle.textContent = 'Error — service worker unavailable';
        statusDesc.textContent  = 'Try reloading the extension.';
        return;
      }

      setTimeout(() => {
        loadHistory();
        statusTitle.textContent = 'Command executed';
        statusDesc.textContent  = 'Listening for "Hey VORDI"';
        setTimeout(() => {
          if (!isCommandActive) {
            statusTitle.textContent = 'Listening for "Hey VORDI"';
            statusDesc.textContent  = 'Say "Hey VORDI" anytime while browsing';
          }
        }, 1500);
      }, 400);
    });
  }

  // ── Direct Command Form ──────────────────────────────────────────────────────
  directCmdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = cmdInput.value.trim();
    if (val) {
      executeCommand(val);
      cmdInput.value = '';
    }
  });

  // ── Quick Chips ──────────────────────────────────────────────────────────────
  quickChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      if (cmd) executeCommand(cmd);
    });
  });

  // ── Diagnostics ──────────────────────────────────────────────────────────────
  btnRunDiag.addEventListener('click', async () => {
    diagResults.style.display = 'block';
    diagResults.innerHTML = '<strong>Running diagnostics...</strong><br>';

    // Mic test
    try {
      const stream    = await navigator.mediaDevices.getUserMedia({ audio: true });
      const trackName = stream.getAudioTracks()[0]?.label || 'Default Microphone';
      stream.getTracks().forEach((t) => t.stop());
      diagResults.innerHTML += `<b>Microphone:</b> OK — "${trackName}"<br>`;
      diagResults.innerHTML += `<b>Permission:</b> Granted<br>`;
    } catch (err) {
      diagResults.innerHTML += `<b>Microphone:</b> FAILED — ${err.message}<br>`;
    }

    // Speech API test
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    diagResults.innerHTML += SR
      ? `<b>Web Speech API:</b> Supported<br>`
      : `<b>Web Speech API:</b> NOT supported — use Chrome<br>`;

    // Service worker ping
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (resp) => {
      if (chrome.runtime.lastError) {
        diagResults.innerHTML += `<b>Service Worker:</b> Unresponsive — ${chrome.runtime.lastError.message}<br>`;
      } else if (resp) {
        diagResults.innerHTML += `<b>Service Worker:</b> Active (state: ${resp.state})<br>`;
      } else {
        diagResults.innerHTML += `<b>Service Worker:</b> No response<br>`;
      }
      diagResults.innerHTML += `<br><b>All tests complete.</b> Say "Hey VORDI, new tab" to test.`;
    });
  });

  // ── History ──────────────────────────────────────────────────────────────────
  function loadHistory() {
    chrome.storage.local.get('commandHistory', (data) => {
      if (chrome.runtime.lastError) return;
      const history = data.commandHistory || [];
      if (history.length === 0) {
        historyList.innerHTML = '<li class="history-empty">No commands executed yet</li>';
        return;
      }
      historyList.innerHTML = '';
      history.slice(0, 8).forEach((item) => {
        const li   = document.createElement('li');
        li.className = 'history-item';
        const time = new Date(item.timestamp).toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit'
        });
        li.innerHTML = `
          <span class="history-cmd">"${escapeHtml(item.transcript)}"</span>
          <span class="history-time">${time}</span>
        `;
        li.addEventListener('click', () => executeCommand(item.transcript));
        historyList.appendChild(li);
      });
    });
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  await initAudioMeter();
  startRecognitionLoop();
  loadHistory();
});
