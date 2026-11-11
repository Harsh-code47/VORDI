// popup/popup.js
// Handles direct speech recognition, quick command testing, and side panel launch

document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enable-toggle');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const micBtn = document.getElementById('mic-btn');
  const micLabel = document.getElementById('mic-label');
  const liveTranscript = document.getElementById('live-transcript');
  const permissionBanner = document.getElementById('permission-banner');
  const grantPermLink = document.getElementById('grant-perm-link');
  const recentList = document.getElementById('recent-list');
  const popupCmdForm = document.getElementById('popup-cmd-form');
  const popupCmdInput = document.getElementById('popup-cmd-input');
  const openSidepanel = document.getElementById('open-sidepanel');
  const openOptions = document.getElementById('open-options');
  const openHelp = document.getElementById('open-help');
  const hintChips = document.querySelectorAll('.hint-chip');

  let activeRecognition = null;
  let isListening = false;
  let currentLanguage = 'en-US';
  let latestHeardText = '';

  // Check microphone permission
  checkMicPermission();

  // Load existing settings
  const stored = await chrome.storage.local.get(['settings', 'commandHistory']);
  const settings = stored.settings || {};
  if (settings.language) currentLanguage = settings.language;
  enableToggle.checked = settings.enabled !== false;

  updateStatus(enableToggle.checked ? 'standby' : 'sleeping', enableToggle.checked);
  renderHistory(stored.commandHistory || []);

  const btnOpenHub = document.getElementById('btn-open-hub');
  if (btnOpenHub) {
    btnOpenHub.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('hub/hub.html') });
    });
  }

  // Permission Banner click
  if (grantPermLink) {
    grantPermLink.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
    });
  }

  // Toggle switch
  enableToggle.addEventListener('change', () => {
    const isEnabled = enableToggle.checked;
    chrome.runtime.sendMessage({ type: 'SET_ENABLED', enabled: isEnabled });
    updateStatus(isEnabled ? 'standby' : 'sleeping', isEnabled);
  });

  // Tap to Speak button
  micBtn.addEventListener('click', () => {
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

  // ── Speech Recognition ─────────────────────────────────────────────────────
  function startLocalRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      statusText.textContent = 'SpeechRecognition not supported in browser';
      return;
    }

    try {
      if (activeRecognition) {
        try {
          activeRecognition.onstart = null;
          activeRecognition.onresult = null;
          activeRecognition.onerror = null;
          activeRecognition.onend = null;
          activeRecognition.abort();
        } catch (_) {}
        activeRecognition = null;
      }

      activeRecognition = new SR();
      activeRecognition.lang = currentLanguage;
      activeRecognition.continuous = false;
      activeRecognition.interimResults = true;
      activeRecognition.maxAlternatives = 1;

      latestHeardText = '';

      activeRecognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        micLabel.textContent = 'Listening… Speak!';
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Listening to your voice…';
        liveTranscript.style.display = 'block';
        liveTranscript.textContent = 'Speak now (e.g. "new tab", "scroll down")...';
      };

      activeRecognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript;
          } else {
            interimText += res[0].transcript;
          }
        }

        const displayText = finalText || interimText;
        if (displayText) {
          latestHeardText = displayText.trim();
          liveTranscript.textContent = `"${latestHeardText}"`;
          statusText.textContent = `Hearing: "${latestHeardText}"`;
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

        const commandToRun = latestHeardText.trim();
        if (commandToRun) {
          executeCommand(commandToRun);
        } else {
          setTimeout(() => {
            liveTranscript.style.display = 'none';
            updateStatus('standby', enableToggle.checked);
          }, 1000);
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

  function executeCommand(cmd) {
    if (!cmd) return;
    statusText.textContent = `Executing: "${cmd}"...`;
    liveTranscript.style.display = 'block';
    liveTranscript.textContent = `Executing: "${cmd}"`;

    chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: cmd }, () => {
      setTimeout(() => {
        loadHistory();
        liveTranscript.textContent = `✓ Executed: "${cmd}"`;
        statusText.textContent = 'Command executed!';
        setTimeout(() => {
          liveTranscript.style.display = 'none';
          updateStatus('standby', enableToggle.checked);
        }, 1500);
      }, 300);
    });
  }

  // ── Quick Command Form ─────────────────────────────────────────────────────
  popupCmdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = popupCmdInput.value.trim();
    if (val) {
      executeCommand(val);
      popupCmdInput.value = '';
    }
  });

  // ── Quick chips ───────────────────────────────────────────────────────────
  hintChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd || chip.textContent.trim().replace('…', '');
      executeCommand(cmd);
    });
  });

  // ── Open Side Panel ───────────────────────────────────────────────────────
  if (openSidepanel) {
    openSidepanel.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.windowId && chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        } else {
          chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
        }
      } catch (_) {
        chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
      }
    });
  }

  async function checkMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      permissionBanner.style.display = 'none';
      chrome.storage.local.set({ micPermissionGranted: true });
    } catch (_) {
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
      statusText.textContent = 'Ready (Say "Hey VORDI")';
    }
  }

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
        executeCommand(item.transcript);
      });
      recentList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

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
