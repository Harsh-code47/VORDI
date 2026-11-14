// src/content/hud/hudOverlay.ts
// Floating on-page HUD overlay isolated inside a Shadow DOM

export class HudOverlay {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private statusEl: HTMLElement | null = null;
  private commandEl: HTMLElement | null = null;
  private feedbackEl: HTMLElement | null = null;
  private containerEl: HTMLElement | null = null;
  private autoHideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (document.getElementById('vordi-hud-host')) return;

    this.host = document.createElement('div');
    this.host.id = 'vordi-hud-host';
    this.host.style.position = 'fixed';
    this.host.style.bottom = '24px';
    this.host.style.right = '24px';
    this.host.style.zIndex = '2147483647';
    this.host.style.pointerEvents = 'none';

    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
      .hud-card {
        background: rgba(13, 17, 23, 0.94);
        border: 1px solid #30363d;
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        padding: 14px 18px;
        min-width: 260px;
        max-width: 360px;
        color: #e6edf3;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        backdrop-filter: blur(12px);
      }
      .hud-card.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .hud-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #2d8cf0;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #3fb950;
      }
      .status-dot.active {
        background: #2d8cf0;
        box-shadow: 0 0 10px #2d8cf0;
        animation: pulse 1.4s infinite;
      }
      .status-dot.error {
        background: #f85149;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.2); }
      }
      .btn-close {
        background: transparent;
        border: none;
        color: #8b949e;
        cursor: pointer;
        font-size: 14px;
        padding: 2px;
        line-height: 1;
      }
      .btn-close:hover { color: #e6edf3; }
      .hud-command {
        font-size: 13.5px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 4px;
        word-break: break-word;
      }
      .hud-feedback {
        font-size: 12px;
        color: #8b949e;
      }
      .hud-feedback.success { color: #3fb950; }
      .hud-feedback.error { color: #f85149; }
    `;

    this.containerEl = document.createElement('div');
    this.containerEl.className = 'hud-card';

    this.containerEl.innerHTML = `
      <div class="hud-header">
        <div class="hud-badge">
          <div class="status-dot" id="dot"></div>
          <span id="status-text">VORDI Active</span>
        </div>
        <button class="btn-close" id="btn-close" title="Close HUD">✕</button>
      </div>
      <div class="hud-command" id="cmd-text">Ready — say "Hey VORDI"</div>
      <div class="hud-feedback" id="feedback-text">Listening in background</div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.containerEl);

    document.documentElement.appendChild(this.host);

    this.statusEl = this.shadow.getElementById('status-text');
    this.commandEl = this.shadow.getElementById('cmd-text');
    this.feedbackEl = this.shadow.getElementById('feedback-text');
    const closeBtn = this.shadow.getElementById('btn-close');

    closeBtn?.addEventListener('click', () => {
      this.hide();
    });
  }

  public show(commandText: string, feedbackText?: string, isError = false): void {
    if (!this.containerEl) this.init();
    if (!this.containerEl) return;

    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
    }

    if (this.commandEl) this.commandEl.textContent = commandText;
    if (this.feedbackEl) {
      this.feedbackEl.textContent = feedbackText || '';
      this.feedbackEl.className = `hud-feedback ${isError ? 'error' : 'success'}`;
    }

    const dot = this.shadow?.getElementById('dot');
    if (dot) {
      dot.className = `status-dot ${isError ? 'error' : 'active'}`;
    }

    this.containerEl.classList.add('visible');

    // Auto-hide after 3.5 seconds
    this.autoHideTimer = setTimeout(() => {
      this.hide();
    }, 3500);
  }

  public hide(): void {
    if (this.containerEl) {
      this.containerEl.classList.remove('visible');
    }
  }
}

