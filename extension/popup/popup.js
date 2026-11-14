// popup/popup.js
// Handles direct speech recognition, quick command testing, and side panel launch

document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle   = document.getElementById('enable-toggle');
  const statusDot      = document.getElementById('status-dot');
  const statusText     = document.getElementById('status-text');
  const micBtn         = document.getElementById('mic-btn');
  const micLabel       = document.getElementById('mic-label');
  const liveTranscript = document.getElementById('live-transcript');
  const permissionBanner = document.getElementById('permission-banner');
  const grantPermLink  = document.getElementById('grant-perm-link');
  const recentList     = document.getElementById('recent-list');
  const popupCmdForm   = document.getElementById('popup-cmd-form');
  const popupCmdInput  = document.getElementById('popup-cmd-input');
  const openSidepanel  = document.getElementById('open-sidepanel');
  const openOptions    = document.getElementById('open-options');
  const openHelp       = document.getElementById('open-help');
  const hintChips      = document.querySelectorAll('.hint-chip');
  const btnTheme       = document.getElementById('btn-theme');

  let activeRecognition = null;
  let isListening       = false;
  let currentLanguage   = 'en-US';
  let latestHeardText   = '';

  // ── Theme toggle ────────────────────────────────────────────────────────────
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('vordi-theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('vordi-theme', next);
    });
  }

  // ── Load existing settings ──────────────────────────────────────────────────
  let stored = {};
  try {
    stored = await chrome.storage.local.get(['settings', 'commandHistory', 'micPermissionGranted']);
  } catch (e) {
    console.log('[VORDI Popup] storage.get notice:', e.message);
  }

  const settings = stored.settings || {};
  if (settings.language) currentLanguage = settings.language;

  enableToggle.checked = settings.enabled !== false;
  updateStatus(enableToggle.checked ? 'standby' : 'disabled', enableToggle.checked);
  renderHistory(stored.commandHistory || []);

  // ── Check microphone permission cleanly ─────────────────────────────────────
  async function checkPermissionGranted() {
    try {
      if (navigator.permissions?.query) {
        const queryStatus = await navigator.permissions.query({ name: 'microphone' });
        if (queryStatus.state === 'granted') {
          permissionBanner.style.display = 'none';
          chrome.storage.local.set({ micPermissionGranted: true });
          return true;
        }
      }
    } catch (_) {}

    const data = await chrome.storage.local.get('micPermissionGranted');
    if (data.micPermissionGranted) {
      permissionBanner.style.display = 'none';
      return true;
    }

    permissionBanner.style.display = 'flex';
    return false;
  }

  checkPermissionGranted();

  // ── Voice Hub launcher ──────────────────────────────────────────────────────
  const btnOpenHub = document.getElementById('btn-open-hub');
  if (btnOpenHub) {
    btnOpenHub.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('hub/hub.html') });
    });
  }

  // ── Permission banner button ────────────────────────────────────────────────
  if (grantPermLink) {
    grantPermLink.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
    });
  }

  // ── Enable/Disable toggle ───────────────────────────────────────────────────
  enableToggle.addEventListener('change', () => {
    const isEnabled = enableToggle.checked;

    chrome.storage.local.get('settings', (data) => {
      const s = Object.assign({}, data.settings || {}, { enabled: isEnabled });
      chrome.storage.local.set({ settings: s });
    });

    chrome.runtime.sendMessage({ type: 'SET_ENABLED', enabled: isEnabled }, () => {
      if (chrome.runtime.lastError) console.log('[VORDI Popup]', chrome.runtime.lastError.message);
    });

    if (!isEnabled && isListening) {
      stopLocalRecognition();
    }

    updateStatus(isEnabled ? 'standby' : 'disabled', isEnabled);
  });

  // ── Mic button: Tap to Speak ────────────────────────────────────────────────
  micBtn.addEventListener('click', async () => {
    if (isListening) {
      stopLocalRecognition();
      return;
    }

    // Auto-enable if toggled off
    if (!enableToggle.checked) {
      enableToggle.checked = true;
      chrome.storage.local.get('settings', (data) => {
        const s = Object.assign({}, data.settings || {}, { enabled: true });
        chrome.storage.local.set({ settings: s });
      });
      chrome.runtime.sendMessage({ type: 'SET_ENABLED', enabled: true }).catch(() => {});
    }

    // Check permission: if missing, open permission tab directly
    const granted = await checkPermissionGranted();
    if (!granted) {
      statusText.textContent = 'Opening microphone setup tab...';
      chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
      return;
    }

    startLocalRecognition();
  });

  // ── Speech Recognition ──────────────────────────────────────────────────────
  function startLocalRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      updateStatus('error', false);
      statusText.textContent = 'Speech recognition not supported in browser';
      return;
    }

    if (activeRecognition) {
      try {
        activeRecognition.onstart  = null;
        activeRecognition.onresult = null;
        activeRecognition.onerror  = null;
        activeRecognition.onend    = null;
        activeRecognition.abort();
      } catch (_) {}
      activeRecognition = null;
    }

    try {
      const rec = new SR();
      activeRecognition = rec;
      rec.lang            = currentLanguage;
      rec.continuous      = false;
      rec.interimResults  = true;
      rec.maxAlternatives = 1;
      latestHeardText     = '';

      rec.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        micLabel.textContent = 'Listening...';
        updateStatus('active', true);
        liveTranscript.style.display = 'block';
        liveTranscript.textContent   = 'Speak a command now...';
      };

      rec.onresult = (event) => {
        let interimText = '';
        let finalText   = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) finalText   += res[0].transcript;
          else             interimText += res[0].transcript;
        }

        const displayText = finalText || interimText;
        if (displayText) {
          latestHeardText            = displayText.trim();
          liveTranscript.textContent = `"${latestHeardText}"`;
          statusText.textContent     = `Hearing: "${latestHeardText}"`;
        }
      };

      rec.onerror = (event) => {
        const err = event?.error || 'unknown';
        isListening = false;
        micBtn.classList.remove('listening');
        micLabel.textContent = 'Tap to Speak';

        if (err === 'no-speech') {
          statusText.textContent = 'No voice heard — tap to try again';
          updateStatus('standby', enableToggle.checked);
        } else if (err === 'aborted') {
          updateStatus('standby', enableToggle.checked);
        } else if (err === 'not-allowed') {
          permissionBanner.style.display = 'flex';
          statusText.textContent = 'Microphone access needed';
          chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
        } else {
          console.log('[VORDI Popup] Speech event:', err);
          statusText.textContent = `Mic status: ${err}`;
          updateStatus('standby', enableToggle.checked);
        }

        setTimeout(() => { liveTranscript.style.display = 'none'; }, 1500);
      };

      rec.onend = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        micLabel.textContent = 'Tap to Speak';

        const commandToRun = latestHeardText.trim();
        latestHeardText = '';

        if (commandToRun) {
          executeCommand(commandToRun);
        } else {
          setTimeout(() => {
            liveTranscript.style.display = 'none';
            updateStatus('standby', enableToggle.checked);
          }, 800);
        }
      };

      rec.start();
    } catch (err) {
      console.log('[VORDI Popup] Start notice:', err.message);
      statusText.textContent = 'Starting microphone setup...';
      permissionBanner.style.display = 'flex';
      isListening = false;
      micBtn.classList.remove('listening');
      micLabel.textContent = 'Tap to Speak';
      chrome.tabs.create({ url: chrome.runtime.getURL('permission/permission.html') });
    }
  }

  function stopLocalRecognition() {
    if (activeRecognition) {
      try { activeRecognition.stop(); } catch (_) {}
      activeRecognition = null;
    }
    isListening     = false;
    latestHeardText = '';
    micBtn.classList.remove('listening');
    micLabel.textContent = 'Tap to Speak';
    liveTranscript.style.display = 'none';
    updateStatus('standby', enableToggle.checked);
  }

  // ── Execute command via service worker ──────────────────────────────────────
  function executeCommand(cmd) {
    if (!cmd) return;
    statusText.textContent       = `Running: "${cmd}"`;
    liveTranscript.style.display = 'block';
    liveTranscript.textContent   = `Running: "${cmd}"`;

    chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', transcript: cmd }, () => {
      if (chrome.runtime.lastError) {
        console.log('[VORDI Popup] EXECUTE_COMMAND:', chrome.runtime.lastError.message);
      }

      setTimeout(() => {
        loadHistory();
        liveTranscript.textContent = `Done: "${cmd}"`;
        statusText.textContent     = 'Command executed';
        setTimeout(() => {
          liveTranscript.style.display = 'none';
          updateStatus('standby', enableToggle.checked);
        }, 1500);
      }, 300);
    });
  }

  // ── Quick Command Form ──────────────────────────────────────────────────────
  popupCmdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = popupCmdInput.value.trim();
    if (val) {
      executeCommand(val);
      popupCmdInput.value = '';
    }
  });

  // ── Quick hint chips ────────────────────────────────────────────────────────
  hintChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd || chip.textContent.trim();
      executeCommand(cmd);
    });
  });

  // ── Open Side Panel ─────────────────────────────────────────────────────────
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

  // ── Open Options ────────────────────────────────────────────────────────────
  if (openOptions) {
    openOptions.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  // ── Open Help ───────────────────────────────────────────────────────────────
  if (openHelp) {
    openHelp.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') + '#commands' });
    });
  }

  // ── Status helper ───────────────────────────────────────────────────────────
  function updateStatus(state, isEnabled) {
    statusDot.className = 'status-dot';

    if (!isEnabled || state === 'disabled') {
      statusDot.classList.add('disabled');
      statusText.textContent = 'VORDI disabled';
      return;
    }

    switch (state) {
      case 'active':
        statusDot.classList.add('active');
        statusText.textContent = 'Listening for speech...';
        break;
      case 'standby':
      default:
        statusDot.classList.add('standby');
        statusText.textContent = 'Ready — say "Hey VORDI"';
    }
  }

  // ── History helpers ─────────────────────────────────────────────────────────
  function loadHistory() {
    chrome.storage.local.get('commandHistory', (data) => {
      if (chrome.runtime.lastError) return;
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
      const li   = document.createElement('li');
      const time = new Date(item.timestamp).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit'
      });
      li.innerHTML = `
        <span class="cmd-text">"${escapeHtml(item.transcript)}"</span>
        <span class="cmd-time">${time}</span>
      `;
      li.addEventListener('click', () => executeCommand(item.transcript));
      recentList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
});
