// popup/popup.js
// Direct speech recognition & UI management in popup

document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enable-toggle');
  const statusBar = document.getElementById('status-bar');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const micBtn = document.getElementById('mic-btn');
  const micLabel = document.getElementById('mic-label');
  const liveTranscript = document.getElementById('live-transcript');
  const permissionBanner = document.getElementById('permission-banner');
  const grantPermLink = document.getElementById('grant-perm-link');
  const recentList = document.getElementById('recent-list');
  const openOptions = document.getElementById('open-options');
  const openHelp = document.getElementById('open-help');
  const hintChips = document.querySelectorAll('.hint-chip');

  let activeRecognition = null;
  let isListening = false;
  let currentLanguage = 'en-US';

  // Check microphone permission
  checkMicPermission();

  // Load current settings & state
  const stored = await chrome.storage.local.get(['settings', 'commandHistory']);
  const settings = stored.settings || {};
  if (settings.language) currentLanguage = settings.language;
  enableToggle.checked = settings.enabled !== false;

  updateStatus(enableToggle.checked ? 'standby' : 'sleeping', enableToggle.checked);
  renderHistory(stored.commandHistory || []);

  // Listen for permission banner click
  grantPermLink.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
  });

  // Toggle switch
  enableToggle.addEventListener('change', () => {
    const isEnabled = enableToggle.checked;
    chrome.runtime.sendMessage({ type: 'SET_ENABLED', enabled: isEnabled });
    updateStatus(isEnabled ? 'standby' : 'sleeping', isEnabled);
  });

  // Tap to Speak button
  micBtn.addEventListener('click', async () => {
    if (isListening) {
      stopLocalRecognition();
      return;
    }

    if (!enableToggle.checked) {
      enableToggle.checked = true;
      chrome.runtime.sendMessage({ type: 'SET_ENABLED', enabled: true });
    }

    startLocalRecognition();
  });

  // Direct Web Speech API in popup
  function startLocalRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      statusText.textContent = 'Speech recognition not supported in browser';
      return;
    }

    try {
      if (activeRecognition) {
        try { activeRecognition.abort(); } catch (_) {}
      }

      activeRecognition = new SR();
      activeRecognition.lang = currentLanguage;
      activeRecognition.continuous = false;
      activeRecognition.interimResults = true;
      activeRecognition.maxAlternatives = 1;

      let finalCapturedText = '';

      activeRecognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        micLabel.textContent = 'Listening… Speak!';
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Listening to your voice…';
        liveTranscript.style.display = 'block';
        liveTranscript.textContent = 'Say a command (e.g. "new tab", "search for AI")...';
      };

      activeRecognition.onresult = (event) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalCapturedText += res[0].transcript;
          } else {
            interimText += res[0].transcript;
          }
        }

        const displayText = finalCapturedText || interimText;
        if (displayText) {
          liveTranscript.textContent = `"${displayText}"`;
          statusText.textContent = `Hearing: "${displayText}"`;
        }
      };

      activeRecognition.onerror = (event) => {
        console.warn('Speech recognition error in popup:', event.error);
        isListening = false;
        micBtn.classList.remove('listening');
        micLabel.textContent = 'Tap to Speak';

        if (event.error === 'not-allowed') {
          permissionBanner.style.display = 'flex';
          statusText.textContent = 'Mic blocked. Click Enable Mic!';
          chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
        } else if (event.error === 'no-speech') {
          statusText.textContent = 'No voice heard. Tap again!';
        } else {
          statusText.textContent = `Mic error: ${event.error}`;
        }
      };

      activeRecognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        micLabel.textContent = 'Tap to Speak';

        const commandToRun = finalCapturedText.trim();
        if (commandToRun) {
          statusText.textContent = `Executing: "${commandToRun}"...`;
          liveTranscript.textContent = `Executing: "${commandToRun}"`;

          chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: commandToRun }, () => {
            setTimeout(() => {
              loadHistory();
              liveTranscript.style.display = 'none';
              statusText.textContent = 'Command executed!';
              setTimeout(() => {
                updateStatus('standby', enableToggle.checked);
              }, 1500);
            }, 300);
          });
        } else {
          setTimeout(() => {
            liveTranscript.style.display = 'none';
            updateStatus('standby', enableToggle.checked);
          }, 1200);
        }
      };

      activeRecognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      statusText.textContent = 'Failed to start mic. Please check permissions.';
      permissionBanner.style.display = 'flex';
    }
  }

  function stopLocalRecognition() {
    if (activeRecognition) {
      try { activeRecognition.stop(); } catch (_) {}
      activeRecognition = null;
    }
    isListening = false;
    micBtn.classList.remove('listening');
    micLabel.textContent = 'Tap to Speak';
    updateStatus('standby', enableToggle.checked);
  }

  async function checkMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      permissionBanner.style.display = 'none';
      chrome.storage.local.set({ micPermissionGranted: true });
    } catch (err) {
      permissionBanner.style.display = 'flex';
    }
  }

  function updateStatus(state, isEnabled) {
    statusDot.className = 'status-dot';
    if (!isEnabled) {
      statusDot.classList.add('disabled');
      statusText.textContent = 'Disabled';
      return;
    }
    if (state === 'active') {
      statusDot.classList.add('active');
      statusText.textContent = 'Listening for command…';
    } else {
      statusDot.classList.add('standby');
      statusText.textContent = 'Listening for "Hey VORDI"';
    }
  }

  // Quick chips
  hintChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.textContent.trim().replace('…', '');
      statusText.textContent = `Running: "${cmd}"...`;
      chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: cmd }, () => {
        setTimeout(loadHistory, 400);
      });
    });
  });

  // History
  function loadHistory() {
    chrome.storage.local.get('commandHistory', (data) => {
      renderHistory(data.commandHistory || []);
    });
  }

  function renderHistory(history) {
    if (!history || history.length === 0) {
      recentList.innerHTML = '<li class="recent-empty">No commands yet</li>';
      return;
    }
    recentList.innerHTML = '';
    history.slice(0, 5).forEach((item) => {
      const li = document.createElement('li');
      li.className = 'recent-item';
      const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      li.innerHTML = `
        <span class="cmd-text">"${escapeHtml(item.transcript)}"</span>
        <span class="cmd-time">${time}</span>
      `;
      li.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: item.transcript }, () => {
          setTimeout(loadHistory, 400);
        });
      });
      recentList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Links
  if (openOptions) {
    openOptions.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  if (openHelp) {
    openHelp.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#commands') });
    });
  }
});
