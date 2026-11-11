// permission/permission.js
// Handles user gesture to grant permanent microphone access to the extension origin

const grantBtn = document.getElementById('grant-btn');
const statusMsg = document.getElementById('status-msg');

async function checkCurrentPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    setSuccess();
  } catch (err) {
    // Permission not yet granted
    console.log('Permission not granted yet:', err.message);
  }
}

function setSuccess() {
  statusMsg.className = 'status success';
  statusMsg.textContent = '✓ Microphone permission granted! VORDI is ready.';
  grantBtn.textContent = '✓ Permission Active';
  grantBtn.style.background = '#10b981';
  grantBtn.disabled = true;

  chrome.storage.local.set({ micPermissionGranted: true });
  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(() => {});

  setTimeout(() => {
    window.close();
  }, 1800);
}

grantBtn.addEventListener('click', async () => {
  statusMsg.className = 'status';
  statusMsg.textContent = 'Requesting permission...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    setSuccess();
  } catch (err) {
    console.error('Permission request failed:', err);
    statusMsg.className = 'status error';
    statusMsg.textContent = 'Permission denied. Please click the lock icon in your address bar and allow Microphone.';
  }
});

checkCurrentPermission();
