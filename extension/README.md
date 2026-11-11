# 🎙️ VORDI — Voice Browser Extension (v1.0.0)

> Control your entire web browser hands-free with voice commands and the wake word **"Hey VORDI"**.

---

## 🚀 Key Features

- **Wake Word Detection:** Activates automatically when you say **"Hey VORDI"** on any webpage.
- **Direct Tap to Speak:** Tap the microphone button in the popup or on the floating HUD overlay to speak immediately.
- **Global Hotkey (`Alt+V`):** Press **Alt + V** from anywhere in Chrome to trigger voice commands instantly.
- **Tab Management:** Open, close, switch, reload, mute, pin, and duplicate tabs hands-free.
- **Natural Web Navigation:** Go to websites or perform searches (*"search for quantum computing"*).
- **DOM & Page Control:** Click buttons, follow links, type into inputs, submit forms, and scroll.
- **Media Playback:** Play/pause videos, seek forward/back, adjust volume, and toggle fullscreen/PiP.
- **Voice Macros:** Record and replay automated multi-step browser tasks.
- **Shadow DOM HUD:** Floating on-screen heads-up display showing live transcription and status.

---

## 🛠️ Installation & First-Time Setup

1. **Open Extensions Page:**
   - In Google Chrome, Microsoft Edge, or Brave, navigate to:
     ```
     chrome://extensions/
     ```
2. **Enable Developer Mode:**
   - Turn on the **Developer mode** toggle in the top-right corner.
3. **Reload or Load Unpacked:**
   - If already loaded: Click the **Reload** (circular arrow) icon on the VORDI card.
   - If first time: Click **Load unpacked** and select the folder:
     ```
     D:\VORDI\extension
     ```
4. **Grant Microphone Permission (Required Once):**
   - Click the VORDI extension icon in your browser toolbar.
   - If prompted with **"⚠️ Mic permission needed"**, click **Enable Mic**.
   - Or open `chrome-extension://<id>/permission/permission.html` and click **"Allow Microphone Access"**.
   - Chrome will show the native prompt: **"Allow VORDI to use your microphone: [Allow]"**. Click **Allow**.

---

## 🗣️ How to Use VORDI

### Method 1: Wake Word ("Hey VORDI")
While browsing on any webpage, simply speak out loud:
> *"Hey VORDI, new tab"*
> *"Hey VORDI, scroll down"*
> *"Hey VORDI, search for latest tech news"*

The HUD in the corner will glow green, display your command, and execute it!

### Method 2: Tap to Speak (Popup & HUD)
- **In Toolbar Popup:** Click the VORDI toolbar icon and tap **"Tap to Speak"**. The button pulses and transcribes your voice in real time!
- **On Web Pages:** Click the **🎤** icon right on the floating HUD in the bottom-right corner of any page.

### Method 3: Instant Keyboard Shortcut (`Alt+V`)
Press **`Alt + V`** on any page to immediately start listening for your voice command without clicking anything!

---

## 📋 Voice Command Cheat Sheet

### 🗂️ Tab Management
- *"new tab"* / *"open tab"*
- *"close tab"* / *"close this tab"*
- *"switch to tab 2"* / *"switch to YouTube"*
- *"duplicate tab"*
- *"mute tab"* / *"unmute tab"*
- *"pin tab"* / *"unpin tab"*
- *"reload page"* / *"refresh"*

### 🌐 Navigation & Search
- *"go to wikipedia.org"* / *"open github.com"*
- *"search for artificial intelligence"*
- *"go back"* / *"go forward"*
- *"bookmark this page"*
- *"open bookmarks"* / *"open history"*

### 🖱️ Webpage Interaction
- *"scroll down"* / *"scroll up"*
- *"scroll to top"* / *"scroll to bottom"*
- *"click Login"* / *"click Submit"*
- *"type hello world"*
- *"submit form"*
- *"zoom in"* / *"zoom out"* / *"reset zoom"*
- *"read page"*

### 🎬 Media Playback
- *"play"* / *"pause"*
- *"skip 30 seconds"* / *"rewind 15 seconds"*
- *"volume up"* / *"volume down"*
- *"fullscreen"*
- *"picture in picture"*

### ⚡ Voice Macros & System
- *"record macro morning routine"*
- *"stop recording"*
- *"run macro morning routine"*
- *"sleep VORDI"* / *"stop listening"*
- *"help"*

---

## 🔒 Privacy & Permissions

- **Zero Cloud Audio Storage:** VORDI uses your browser's native speech recognition pipeline. No audio stream is stored on external servers.
- **Local Storage:** Macros, preferences, and recent command transcripts stay inside your browser's local sandbox (`chrome.storage.local`).
