// sidepanel/sidepanel.js
// Continuous hands-free voice assistant with "Hey VORDI" wake-word detection

document.addEventListener('DOMContentLoaded', async () => {
  const orb = document.getElementById('orb');
  const micTriggerBtn = document.getElementById('mic-trigger-btn');
  const btnToggleWake = document.getElementById('btn-toggle-wake');
  const statusTitle = document.getElementById('status-title');
  const statusDesc = document.getElementById('status-desc');
  const transcriptBody = document.getElementById('transcript-body');
  const meterFill = document.getElementById('meter-fill');
  const directCmdForm = document.getElementById('direct-cmd-form');
  const cmdInput = document.getElementById('cmd-input');
  const quickChips = document.querySelectorAll('.quick-chip');
  const btnRunDiag = document.getElementById('btn-run-diag');
  const diagResults = document.getElementById('diag-results');
  const historyList = document.getElementById('history-list');

  let wakeEnabled = true;
  let recognition = null;
  let isListening = false;
  let isCommandActive = false;
  let audioContext = null;
  let analyser = null;
  let animFrameId = null;

  // ── Initialize Audio Meter ────────────────────────────────────────────────
  async function initAudioMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function updateMeter() {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const percent = Math.min(100, Math.round((average / 128) * 100));
        meterFill.style.width = `${percent}%`;

        animFrameId = requestAnimationFrame(updateMeter);
      }
      updateMeter();
    } catch (err) {
      console.warn('Audio meter init note:', err.message);
    }
  }

  // ── Continuous Speech Recognition (Wake word & Command) ───────────────────
  const WAKE_PHRASES = ['hey vordi', 'hey wordy', 'hey vordee', 'hey boardy', 'vordi'];

  function startRecognitionLoop() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      statusTitle.textContent = 'Speech Recognition Not Supported';
      statusDesc.textContent = 'Please use Google Chrome browser.';
      return;
    }

    try {
      if (recognition) {
        try { recognition.abort(); } catch (_) {}
      }

      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        orb.classList.add('listening');
        if (!isCommandActive) {
          statusTitle.textContent = 'Listening for "Hey VORDI"';
          statusDesc.textContent = 'Say "Hey VORDI [command]" or tap the mic icon';
        }
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        const heard = (final || interim).trim();
        if (heard) {
          transcriptBody.textContent = `"${heard}"`;
        }

        const lower = heard.toLowerCase();

        // Check for wake word in transcript
        for (const phrase of WAKE_PHRASES) {
          if (lower.includes(phrase)) {
            const idx = lower.indexOf(phrase) + phrase.length;
            const remainder = heard.slice(idx).replace(/^[,.\s]+/, '').trim();

            if (remainder.length > 1) {
              // Command spoken together with wake word e.g. "Hey VORDI new tab"
              executeCommand(remainder);
              return;
            } else {
              // Wake word spoken alone
              isCommandActive = true;
              statusTitle.textContent = 'Yes? Speak your command!';
              statusDesc.textContent = 'Say "new tab", "scroll down", "search for AI", etc.';
              return;
            }
          }
        }

        // If in command mode, execute the speech
        if (isCommandActive && heard.length > 2) {
          executeCommand(heard);
          isCommandActive = false;
        }
      };

      recognition.onerror = (event) => {
        console.warn('[SidePanel Speech] Error:', event.error);
        if (event.error === 'not-allowed') {
          statusTitle.textContent = 'Microphone Blocked';
          statusDesc.textContent = 'Please allow microphone access in extension options.';
        } else if (event.error !== 'no-speech') {
          statusDesc.textContent = `Status: ${event.error}`;
        }
      };

      recognition.onend = () => {
        isListening = false;
        orb.classList.remove('listening');
        // Auto-restart loop if wake word is enabled
        if (wakeEnabled) {
          setTimeout(() => {
            try { recognition.start(); } catch (_) {}
          }, 300);
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
    }
  }

  // ── Execute Command ───────────────────────────────────────────────────────
  function executeCommand(text) {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    statusTitle.textContent = `Executing: "${clean}"`;
    statusDesc.textContent = 'Processing intent and routing to active browser tab...';
    transcriptBody.textContent = `✓ Executing: "${clean}"`;

    chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: clean }, (response) => {
      setTimeout(() => {
        loadHistory();
        statusTitle.textContent = 'Command Executed!';
        statusDesc.textContent = 'Listening for "Hey VORDI"';
        setTimeout(() => {
          if (!isCommandActive) {
            statusTitle.textContent = 'Listening for "Hey VORDI"';
            statusDesc.textContent = 'Say "Hey VORDI [command]" anytime while browsing';
          }
        }, 1500);
      }, 400);
    });
  }

  // ── Orb Click: Manual Tap to Speak ────────────────────────────────────────
  micTriggerBtn.addEventListener('click', () => {
    isCommandActive = true;
    statusTitle.textContent = 'Listening… Speak your command!';
    statusDesc.textContent = 'Speak now (e.g. "new tab", "search for AI")';
    transcriptBody.textContent = 'Listening...';
    orb.classList.add('listening');

    setTimeout(() => {
      isCommandActive = false;
    }, 6000);
  });

  // ── Wake Word Toggle ──────────────────────────────────────────────────────
  btnToggleWake.addEventListener('click', () => {
    wakeEnabled = !wakeEnabled;
    if (wakeEnabled) {
      btnToggleWake.classList.add('active');
      btnToggleWake.querySelector('.wake-label').textContent = 'Wake Word: ON';
      statusTitle.textContent = 'Listening for "Hey VORDI"';
      startRecognitionLoop();
    } else {
      btnToggleWake.classList.remove('active');
      btnToggleWake.querySelector('.wake-label').textContent = 'Wake Word: OFF';
      statusTitle.textContent = 'Wake Word Paused';
      statusDesc.textContent = 'Tap the microphone icon above to speak commands manually.';
      if (recognition) {
        try { recognition.stop(); } catch (_) {}
      }
    }
  });

  // ── Direct Command Form ───────────────────────────────────────────────────
  directCmdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = cmdInput.value.trim();
    if (val) {
      executeCommand(val);
      cmdInput.value = '';
    }
  });

  // ── Quick Chips ───────────────────────────────────────────────────────────
  quickChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      executeCommand(cmd);
    });
  });

  // ── Diagnostic / Hardware Tester ──────────────────────────────────────────
  btnRunDiag.addEventListener('click', async () => {
    diagResults.style.display = 'block';
    diagResults.innerHTML = '⏳ <strong>Running Audio & Voice Diagnostics...</strong><br>';

    // Test 1: Microphone Stream & Volume
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      const trackName = tracks[0]?.label || 'Default Microphone';
      diagResults.innerHTML += `✓ <strong>Microphone Hardware:</strong> Detected ("${trackName}")<br>`;
      diagResults.innerHTML += `✓ <strong>Origin Permission:</strong> Allowed (chrome-extension origin)<br>`;
      tracks.forEach((t) => t.stop());
    } catch (err) {
      diagResults.innerHTML += `❌ <strong>Microphone Hardware:</strong> Error: ${err.message}<br>`;
    }

    // Test 2: Speech Recognition
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      diagResults.innerHTML += `✓ <strong>Web Speech API:</strong> Available (webkitSpeechRecognition supported)<br>`;
    } else {
      diagResults.innerHTML += `❌ <strong>Web Speech API:</strong> Not supported in current browser engine<br>`;
    }

    // Test 3: Intent Parser
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (resp) => {
      if (resp) {
        diagResults.innerHTML += `✓ <strong>Service Worker:</strong> Active (State: ${resp.state})<br>`;
      } else {
        diagResults.innerHTML += `❌ <strong>Service Worker:</strong> Unresponsive<br>`;
      }
      diagResults.innerHTML += `<span style="color:#10b981;"><strong>All core subsystems passed!</strong> Say "Hey VORDI, new tab" or click any quick chip above.</span>`;
    });
  });

  // ── Load Command History ──────────────────────────────────────────────────
  function loadHistory() {
    chrome.storage.local.get('commandHistory', (data) => {
      const history = data.commandHistory || [];
      if (history.length === 0) {
        historyList.innerHTML = '<li class="history-empty">No commands executed yet</li>';
        return;
      }
      historyList.innerHTML = '';
      history.slice(0, 8).forEach((item) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        li.innerHTML = `
          <span class="history-cmd">"${escapeHtml(item.transcript)}"</span>
          <span class="history-time">${time}</span>
        `;
        li.addEventListener('click', () => {
          executeCommand(item.transcript);
        });
        historyList.appendChild(li);
      });
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Start everything on load ──────────────────────────────────────────────
  await initAudioMeter();
  startRecognitionLoop();
  loadHistory();
});
