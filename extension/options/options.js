// options/options.js
// Handles configuration persistence, UI tabs, macro management, and history reset

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const toast = document.getElementById('toast');

  // Form controls
  const settingEnabled = document.getElementById('setting-enabled');
  const settingLanguage = document.getElementById('setting-language');
  const settingAudioFeedback = document.getElementById('setting-audio-feedback');
  const settingTtsSpeed = document.getElementById('setting-tts-speed');
  const ttsSpeedValue = document.getElementById('tts-speed-value');
  const settingSensitivity = document.getElementById('setting-sensitivity');
  const sensitivityValue = document.getElementById('sensitivity-value');
  const settingAutoSleep = document.getElementById('setting-auto-sleep');
  const settingHudVisible = document.getElementById('setting-hud-visible');
  const settingHudPosition = document.getElementById('setting-hud-position');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnCreateMacro = document.getElementById('btn-create-macro');
  const macrosList = document.getElementById('macros-list');
  const btnRequestMic = document.getElementById('btn-request-mic');
  const micStatusDesc = document.getElementById('mic-status-desc');
  const btnOpenHubOptions = document.getElementById('btn-open-hub-options');

  if (btnOpenHubOptions) {
    btnOpenHubOptions.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('hub/hub.html') });
    });
  }

  // Check and display mic permission status
  async function checkMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      btnRequestMic.textContent = 'Mic Enabled';
      btnRequestMic.style.background = 'var(--green, #3fb950)';
      btnRequestMic.disabled = true;
      micStatusDesc.textContent = 'Microphone access is active and working.';
      chrome.storage.local.set({ micPermissionGranted: true });
    } catch (_) {
      btnRequestMic.textContent = 'Enable Microphone';
      btnRequestMic.style.background = '';
      btnRequestMic.disabled = false;
      micStatusDesc.textContent = 'Click to allow microphone access.';
    }
  }

  if (btnRequestMic) {
    btnRequestMic.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        showToast('Microphone access granted!');
        checkMic();
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(() => {});
      } catch (err) {
        showToast('Permission dismissed or blocked');
      }
    });
    checkMic();
  }

  // Tab switching
  function switchTab(tabId) {
    navItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });
    tabPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });
  }

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.dataset.tab;
      switchTab(tabId);
      window.location.hash = tabId;
    });
  });

  // Check URL hash for direct tab navigation
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(`tab-${hash}`)) {
    switchTab(hash);
  }

  // Load existing settings & macros
  const data = await chrome.storage.local.get(['settings', 'vordi_macros', 'macros']);
  const settings = data.settings || {};
  const initialMacros = data.vordi_macros || data.macros || {};

  if (settings.enabled !== undefined) settingEnabled.checked = settings.enabled;
  if (settings.language) settingLanguage.value = settings.language;
  if (settings.audioFeedback !== undefined) settingAudioFeedback.checked = settings.audioFeedback;
  if (settings.ttsSpeed) {
    settingTtsSpeed.value = settings.ttsSpeed;
    ttsSpeedValue.textContent = `${settings.ttsSpeed}x`;
  }
  if (settings.wakeWordSensitivity) {
    settingSensitivity.value = settings.wakeWordSensitivity;
    sensitivityValue.textContent = Number(settings.wakeWordSensitivity).toFixed(2);
  }
  if (settings.autoSleepTimeout) settingAutoSleep.value = settings.autoSleepTimeout;
  if (settings.hudVisible !== undefined) settingHudVisible.checked = settings.hudVisible;
  if (settings.hudPosition) settingHudPosition.value = settings.hudPosition;

  // Sliders input listeners
  settingTtsSpeed.addEventListener('input', () => {
    ttsSpeedValue.textContent = `${settingTtsSpeed.value}x`;
    saveSettings();
  });

  settingSensitivity.addEventListener('input', () => {
    sensitivityValue.textContent = Number(settingSensitivity.value).toFixed(2);
    saveSettings();
  });

  // Change listeners
  [
    settingEnabled,
    settingLanguage,
    settingAudioFeedback,
    settingAutoSleep,
    settingHudVisible,
    settingHudPosition
  ].forEach((ctrl) => {
    ctrl.addEventListener('change', saveSettings);
  });

  async function saveSettings() {
    const updated = {
      enabled: settingEnabled.checked,
      language: settingLanguage.value,
      audioFeedback: settingAudioFeedback.checked,
      ttsSpeed: parseFloat(settingTtsSpeed.value),
      wakeWordSensitivity: parseFloat(settingSensitivity.value),
      autoSleepTimeout: parseInt(settingAutoSleep.value, 10),
      hudVisible: settingHudVisible.checked,
      hudPosition: settingHudPosition.value
    };

    await chrome.storage.local.set({ settings: updated });
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(() => {});
    showToast('Settings saved');
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Clear history
  btnClearHistory.addEventListener('click', async () => {
    await chrome.storage.local.set({ commandHistory: [] });
    showToast('Command history cleared');
  });

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Macros UI
  function renderMacros(macros = {}) {
    macrosList.innerHTML = '';
    const keys = Object.keys(macros);
    if (keys.length === 0) {
      macrosList.innerHTML = '<li class="macro-empty">No macros saved yet. Say <em>"Hey VORDI, record macro [name]"</em> or add one above.</li>';
      return;
    }

    keys.forEach((name) => {
      const item = macros[name] || {};
      const actions = Array.isArray(item) ? item : (item.actions || []);
      const count = actions.length;
      const li = document.createElement('li');
      li.className = 'macro-item';
      li.innerHTML = `
        <div>
          <div class="macro-name">${escapeHtml(name)}</div>
          <div class="macro-steps">${count} action${count === 1 ? '' : 's'} recorded</div>
        </div>
        <button class="btn btn-secondary delete-macro-btn" data-name="${escapeHtml(name)}">Delete</button>
      `;
      macrosList.appendChild(li);
    });

    document.querySelectorAll('.delete-macro-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        const currentData = await chrome.storage.local.get(['vordi_macros', 'macros']);
        const m = currentData.vordi_macros || currentData.macros || {};
        delete m[name];
        delete m[name.toLowerCase()];
        await chrome.storage.local.set({ vordi_macros: m });
        renderMacros(m);
        showToast(`Macro "${name}" deleted`);
      });
    });
  }

  renderMacros(initialMacros);

  // Create macro manually
  btnCreateMacro.addEventListener('click', async () => {
    const name = prompt('Enter a name for the new macro (e.g. "morning routine"):');
    if (!name || !name.trim()) return;

    const key = name.trim().toLowerCase();
    const currentData = await chrome.storage.local.get(['vordi_macros', 'macros']);
    const m = currentData.vordi_macros || currentData.macros || {};
    m[key] = {
      name: key,
      actions: [
        { intent: 'OPEN_TAB', entities: {} },
        { intent: 'NAVIGATE', entities: { url: 'https://news.ycombinator.com' } }
      ],
      createdAt: Date.now()
    };
    await chrome.storage.local.set({ vordi_macros: m });
    renderMacros(m);
    showToast(`Macro "${name}" created with sample actions`);
  });
});
