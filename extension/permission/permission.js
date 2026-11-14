// permission/permission.js
// Handles user gesture to grant permanent microphone access to the extension origin

// Apply saved theme
const savedTheme = localStorage.getItem('vordi-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const grantBtn = document.getElementById('grant-btn');
const statusMsg = document.getElementById('status-msg');

async function checkCurrentPermission() {
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'microphone' });
      if (status.state === 'granted') {
        setSuccess();
        return;
      }
      status.onchange = () => {
        if (status.state === 'granted') setSuccess();
      };
    }
  } catch (err) {
    console.log('[VORDI Permission] Query notice:', err.message);
  }
}

function setSuccess() {
  statusMsg.className = 'status success';
  statusMsg.textContent = 'Microphone permission granted. VORDI voice control is ready.';
  grantBtn.textContent = 'Permission Active';
  grantBtn.style.background = 'var(--green, #3fb950)';
  grantBtn.disabled = true;

  chrome.storage.local.set({ micPermissionGranted: true }, () => {
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(() => {});
  });

  setTimeout(() => {
    window.close();
  }, 1400);
}

grantBtn.addEventListener('click', async () => {
  statusMsg.className = 'status';
  statusMsg.textContent = 'Requesting browser microphone access...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    setSuccess();
  } catch (err) {
    console.error('[VORDI Permission] Request failed:', err);
    statusMsg.className = 'status error';
    statusMsg.textContent = 'Permission denied or dismissed. Please click the camera/mic icon in the browser address bar to allow.';
  }
});

checkCurrentPermission();
