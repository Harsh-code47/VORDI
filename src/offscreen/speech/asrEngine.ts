// src/offscreen/speech/asrEngine.ts
// Local and browser-assisted speech-to-text pipeline with endpointing and silence detection

export interface ASRResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface ASREngineConfig {
  language?: string;
  silenceTimeoutMs?: number;
  maxDurationMs?: number;
  onResult?: (result: ASRResult) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export class ASREngine {
  private recognition: any = null;
  private isListening = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private config: ASREngineConfig = {};

  public start(config: ASREngineConfig): boolean {
    this.stop();
    this.config = config;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      config.onError?.('SpeechRecognition API not available in this context');
      return false;
    }

    try {
      this.recognition = new SR();
      this.recognition.lang = config.language || 'en-US';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      const silenceTimeout = config.silenceTimeoutMs || 3500;
      const maxDuration = config.maxDurationMs || 9000;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.resetSilenceTimer(silenceTimeout);

        this.maxDurationTimer = setTimeout(() => {
          this.stop();
        }, maxDuration);
      };

      this.recognition.onresult = (event: any) => {
        this.resetSilenceTimer(silenceTimeout);

        let interim = '';
        let final = '';
        let confidence = 0.9;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
            if (item[0].confidence) confidence = item[0].confidence;
          } else {
            interim += item[0].transcript;
          }
        }

        const text = (final || interim).trim();
        if (text && config.onResult) {
          config.onResult({
            transcript: text,
            isFinal: Boolean(final),
            confidence
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        const err = event?.error || 'unknown';
        // 'no-speech' or 'aborted' are benign lifecycle events
        if (err !== 'no-speech' && err !== 'aborted') {
          config.onError?.(err);
        }
      };

      this.recognition.onend = () => {
        this.cleanup();
        config.onEnd?.();
      };

      this.recognition.start();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      config.onError?.(msg);
      this.cleanup();
      return false;
    }
  }

  public stop(): void {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.cleanup();
  }

  private resetSilenceTimer(ms: number): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.stop();
    }, ms);
  }

  private cleanup(): void {
    this.isListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

