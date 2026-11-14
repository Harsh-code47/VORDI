// sidepanel/sidepanel.js
// Continuous hands-free voice assistant with real audio level sensitivity and "Hey VORDI" wake-word detection

// Apply saved theme immediately
const savedTheme = localStorage.getItem('vordi-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

document.addEventListener('DOMContentLoaded', async () => {
  // Theme toggle
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const html = document.documentElement;
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('vordi-theme', next);
    });
  }

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

  // ── State ───────────────────────────────────────────────────────────────────
  let wakeEnabled     = true;
  let recognition     = null;
  let isListening     = false;
  let isExecuting     = false;
  let restartTimer    = null;

  // Real Audio Meter variables
  let audioCtx        = null;
  let analyser        = null;
  let micStream       = null;
  let sourceNode      = null;
  let meterAnimId     = null;

  // ── Load language from settings ─────────────────────────────────────────────
  let currentLanguage = 'en-US';
  try {
    const stored = await chrome.storage.local.get('settings');
    if (stored.settings?.language) currentLanguage = stored.settings.language;
  } catch (_) {}

  // ── Wake phrase variants ────────────────────────────────────────────────────
  const WAKE_PHRASES = ['hey vordi', 'hey wordy', 'hey vordee', 'hey boardy', 'vordi'];

  // ── REAL Live Audio Sensitivity Meter (Web Audio API) ───────────────────────
  async function startRealAudioMeter() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      if (!micStream || !micStream.active) {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        chrome.storage.local.set({ micPermissionGranted: true });
      }

      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      if (!sourceNode && micStream) {
        sourceNode = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        sourceNode.connect(analyser);
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function updateMeter() {
        if (!analyser || !meterFill) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;

        // Real-time voice sensitivity calibration:
        // Ambient room noise is typically avg <= 4.
        // Normal speech produces avg values between 12 and 85.
        let pct = 0;
        if (avg > 4) {
          pct = Math.min(100, Math.round(((avg - 4) / 60) * 100));
        }

        meterFill.style.width = `${pct}%`;
        meterAnimId = requestAnimationFrame(updateMeter);
      }

      cancelAnimationFrame(meterAnimId);
      updateMeter();
    } catch (err) {
      console.log('[VORDI SidePanel] Real Audio Meter notice:', err.message);
    }
  }

  function stopRealAudioMeter() {
    if (meterAnimId) {
      cancelAnimationFrame(meterAnimId);
      meterAnimId = null;
    }
    if (meterFill) {
      meterFill.style.width = '0%';
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch (_) {}
      sourceNode = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      try { audioCtx.close(); } catch (_) {}
      audioCtx = null;
    }
    analyser = null;
  }

  // ── Check Microphone Permission ─────────────────────────────────────────────
  async function hasMicrophonePermission() {
    try {
      if (navigator.permissions?.query) {
        const queryStatus = await navigator.permissions.query({ name: 'microphone' });
        if (queryStatus.state === 'granted') {
          chrome.storage.local.set({ micPermissionGranted: true });
          return true;
        }
      }
    } catch (_) {}

    const data = await chrome.storage.local.get('micPermissionGranted');
    return Boolean(data.micPermissionGranted);
  }

  function openPermissionTab() {
    statusTitle.textContent = 'Microphone Access Required';
    statusDesc.textContent  = 'Please click "Allow" on the permission page to enable voice control';
    chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
  }

  // ── Speech Recognition Engine ───────────────────────────────────────────────
  function startVoiceEngine() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      statusTitle.textContent = 'Speech Recognition Not Supported';
      statusDesc.textContent  = 'Please use Google Chrome browser.';
      return;
    }

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
      const rec = new SR();
      recognition = rec;
      rec.continuous     = true;
      rec.interimResults = true;
      rec.lang           = currentLanguage;

      rec.onstart = () => {
        isListening = true;
        setOrbState('listening');
        statusTitle.textContent = 'Listening... Speak your command!';
        statusDesc.textContent  = 'Say e.g. "open new tab", "scroll down", or "Hey VORDI"';
        if (transcriptBody.textContent === 'Awaiting your voice...') {
          transcriptBody.textContent = 'Listening for speech...';
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
        if (heard) {
          transcriptBody.textContent = `"${heard}"`;
          statusTitle.textContent     = `Hearing: "${heard}"`;
        }

        // Process final speech recognition result
        if (final.trim().length > 0) {
          handleRecognizedSpeech(final.trim());
        }
      };

      rec.onerror = (event) => {
        const err = event?.error || 'unknown';

        if (err === 'no-speech') {
          statusDesc.textContent = 'Speak a command (e.g. "new tab", "scroll down")...';
          return;
        }

        if (err === 'aborted') {
          return;
        }

        if (err === 'not-allowed') {
          isListening = false;
          setOrbState('idle');
          statusTitle.textContent = 'Microphone Access Required';
          statusDesc.textContent  = 'Click the microphone button to grant access';
          openPermissionTab();
          return;
        }

        if (err === 'audio-capture') {
          statusDesc.textContent = 'No microphone device found — check connections';
          return;
        }

        console.log('[VORDI SidePanel] Recognition notice:', err);
      };

      rec.onend = () => {
        isListening = false;

        // Auto-restart if wake-word mode is active and not currently executing
        if (wakeEnabled && !isExecuting) {
          restartTimer = setTimeout(() => {
            if (wakeEnabled && !isListening) {
              startVoiceEngine();
            }
          }, 350);
        } else if (!wakeEnabled) {
          setOrbState('idle');
          stopRealAudioMeter();
        }
      };

      rec.start();
    } catch (err) {
      console.log('[VORDI SidePanel] Speech start notice:', err.message);
      if (err.name === 'NotAllowedError') {
        openPermissionTab();
      }
    }
  }

  function stopVoiceEngine() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
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
    isListening = false;
    setOrbState('idle');
    stopRealAudioMeter();
  }

  // ── Speech Processing & Command Dispatch ────────────────────────────────────
  function handleRecognizedSpeech(rawText) {
    if (!rawText || !rawText.trim() || isExecuting) return;
    const lower = rawText.toLowerCase().trim();

    let commandToRun = rawText.trim();

    // Check if starts with or contains wake phrase
    for (const phrase of WAKE_PHRASES) {
      if (lower.includes(phrase)) {
        const idx = lower.indexOf(phrase) + phrase.length;
        const remainder = rawText.slice(idx).replace(/^[,.\s]+/, '').trim();
        if (remainder.length > 1) {
          // Combined inline command: "Hey VORDI, new tab"
          commandToRun = remainder;
          break;
        } else {
          // Spoke wake word alone: "Hey VORDI"
          statusTitle.textContent    = 'Yes? I am listening!';
          statusDesc.textContent     = 'Speak your command now...';
          transcriptBody.textContent = 'Wake word recognized! Speak command...';
          return;
        }
      }
    }

    commandToRun = commandToRun.replace(/^[,\s.!]+/, '').trim();
    if (commandToRun.length > 1) {
      isExecuting = true;
      executeCommand(commandToRun);
      setTimeout(() => {
        isExecuting = false;
      }, 1800);
    }
  }

  // ── Orb State Helper ────────────────────────────────────────────────────────
  function setOrbState(state) {
    if (state === 'listening') {
      orb.classList.add('listening');
    } else {
      orb.classList.remove('listening');
    }
  }

  // ── Orb Button: Tap to Speak ────────────────────────────────────────────────
  micTriggerBtn.addEventListener('click', async () => {
    // If currently listening in one-shot mode, toggle off
    if (isListening && !wakeEnabled) {
      stopVoiceEngine();
      statusTitle.textContent = 'Ready';
      statusDesc.textContent  = 'Tap the microphone to give a command';
      return;
    }

    // Direct user click provides immediate user gesture
    statusTitle.textContent = 'Activating microphone...';
    await startRealAudioMeter();
    startVoiceEngine();
  });

  // ── Wake Word Toggle Button ──────────────────────────────────────────────────
  btnToggleWake.addEventListener('click', async () => {
    wakeEnabled = !wakeEnabled;

    if (wakeEnabled) {
      btnToggleWake.classList.add('active');
      btnToggleWake.querySelector('.wake-label').textContent = 'Wake Word: ON';
      statusTitle.textContent = 'Listening for "Hey VORDI"';
      statusDesc.textContent  = 'Say "Hey VORDI" or speak any browser command';
      await startRealAudioMeter();
      startVoiceEngine();
    } else {
      btnToggleWake.classList.remove('active');
      btnToggleWake.querySelector('.wake-label').textContent = 'Wake Word: OFF';
      statusTitle.textContent = 'Wake Word Paused';
      statusDesc.textContent  = 'Tap the microphone button to speak a command.';
      stopVoiceEngine();
    }
  });

  // ── Execute Command via Service Worker ───────────────────────────────────────
  function executeCommand(text) {
    if (!text || !text.trim()) return;
    const clean = text.trim();

    statusTitle.textContent    = `Running: "${clean}"`;
    statusDesc.textContent     = 'Executing command in active tab...';
    transcriptBody.textContent = `"${clean}"`;

    chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: clean }, () => {
      if (chrome.runtime.lastError) {
        console.log('[VORDI SidePanel] EXECUTE_COMMAND:', chrome.runtime.lastError.message);
      }

      setTimeout(() => {
        loadHistory();
        statusTitle.textContent = `Executed: "${clean}"`;
        statusDesc.textContent  = wakeEnabled ? 'Listening for "Hey VORDI"...' : 'Ready — tap mic to speak';
        setTimeout(() => {
          if (wakeEnabled) {
            statusTitle.textContent = 'Listening for "Hey VORDI"';
            statusDesc.textContent  = 'Say "Hey VORDI" or tap the microphone above';
          } else if (!isListening) {
            statusTitle.textContent = 'Ready';
            statusDesc.textContent  = 'Tap the microphone to speak a command';
          }
        }, 2200);
      }, 350);
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

  // ── Audio & Microphone Diagnostics ──────────────────────────────────────────
  btnRunDiag.addEventListener('click', async () => {
    diagResults.style.display = 'block';
    diagResults.innerHTML = '<strong>Running audio & microphone diagnostics...</strong><br>';

    try {
      const stream    = await navigator.mediaDevices.getUserMedia({ audio: true });
      const trackName = stream.getAudioTracks()[0]?.label || 'Default Microphone';
      stream.getTracks().forEach((t) => t.stop());
      diagResults.innerHTML += `<b>Microphone Hardware:</b> Detected ("${trackName}")<br>`;
      diagResults.innerHTML += `<b>Permission Status:</b> Granted<br>`;
      chrome.storage.local.set({ micPermissionGranted: true });
    } catch (err) {
      diagResults.innerHTML += `<b>Microphone Permission:</b> Not yet allowed (${err.message})<br>`;
      diagResults.innerHTML += `<button id="diag-grant-btn" style="margin-top:6px;padding:5px 10px;cursor:pointer;background:var(--accent);color:white;border:none;border-radius:4px;font-size:11px;font-weight:600;">Click to Grant Microphone Access</button><br>`;
      setTimeout(() => {
        const dBtn = document.getElementById('diag-grant-btn');
        if (dBtn) dBtn.addEventListener('click', openPermissionTab);
      }, 100);
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    diagResults.innerHTML += SR
      ? `<b>Web Speech API:</b> Available in current browser<br>`
      : `<b>Web Speech API:</b> Not supported — please use Google Chrome<br>`;

    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (resp) => {
      if (chrome.runtime.lastError) {
        diagResults.innerHTML += `<b>Service Worker:</b> Connecting...<br>`;
      } else if (resp) {
        diagResults.innerHTML += `<b>Service Worker:</b> Active (state: ${resp.state})<br>`;
      }
      diagResults.innerHTML += `<br><b>Diagnostics completed.</b> Speak "new tab" or tap the microphone above.`;
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

  // ── Auto-start when permission is already granted ───────────────────────────
  loadHistory();
  const hasPerm = await hasMicrophonePermission();
  if (hasPerm && wakeEnabled) {
    await startRealAudioMeter();
    startVoiceEngine();
  } else {
    statusTitle.textContent = 'Ready — Tap Mic to Speak';
    statusDesc.textContent  = 'Click the microphone button to activate voice control';
  }
});
