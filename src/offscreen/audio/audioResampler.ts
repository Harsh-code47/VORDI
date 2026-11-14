// src/offscreen/audio/audioResampler.ts
// Resamples audio frames from native AudioContext sample rate (e.g. 44.1kHz / 48kHz) to 16kHz mono PCM

export class AudioResampler {
  public static resampleTo16kHz(audioData: Float32Array, inputSampleRate: number): Int16Array {
    if (inputSampleRate === 16000) {
      return this.floatToInt16(audioData);
    }

    const ratio = inputSampleRate / 16000;
    const outputLength = Math.round(audioData.length / ratio);
    const result = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * ratio;
      const lower = Math.floor(sourceIndex);
      const upper = Math.min(lower + 1, audioData.length - 1);
      const weight = sourceIndex - lower;

      // Linear interpolation
      const interpolated = audioData[lower] * (1 - weight) + audioData[upper] * weight;
      // Clamp between -1.0 and 1.0
      const clamped = Math.max(-1, Math.min(1, interpolated));
      result[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    return result;
  }

  public static floatToInt16(floatData: Float32Array): Int16Array {
    const pcm = new Int16Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
      const s = Math.max(-1, Math.min(1, floatData[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  }
}

