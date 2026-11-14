// src/offscreen/audio/audioCapture.ts
// Microphone capture and Web Audio API pipeline with 16kHz resampling and energy monitoring

import { AudioResampler } from './audioResampler';

export interface AudioCaptureConfig {
  sampleRate?: number;
  frameSize?: number;
  onAudioData?: (pcm16: Int16Array, rmsEnergy: number) => void;
  onError?: (err: Error) => void;
}

export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isCapturing = false;

  public async start(config: AudioCaptureConfig): Promise<boolean> {
    if (this.isCapturing) return true;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('navigator.mediaDevices.getUserMedia is not supported in this context');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const inputSampleRate = this.audioContext.sampleRate;
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

      // ScriptProcessor buffer of 4096 gives ~85ms chunks at 48kHz
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isCapturing) return;

        const inputBuffer = e.inputBuffer.getChannelData(0);

        // Compute RMS energy
        let sumSquares = 0;
        for (let i = 0; i < inputBuffer.length; i++) {
          sumSquares += inputBuffer[i] * inputBuffer[i];
        }
        const rms = Math.sqrt(sumSquares / inputBuffer.length);

        // Resample to 16kHz PCM
        const pcm16 = AudioResampler.resampleTo16kHz(inputBuffer, inputSampleRate);

        if (config.onAudioData) {
          config.onAudioData(pcm16, rms);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isCapturing = true;
      return true;
    } catch (err: unknown) {
      this.stop();
      const error = err instanceof Error ? err : new Error(String(err));
      config.onError?.(error);
      return false;
    }
  }

  public stop(): void {
    this.isCapturing = false;

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  public isActive(): boolean {
    return this.isCapturing && this.stream !== null && this.stream.active;
  }
}

