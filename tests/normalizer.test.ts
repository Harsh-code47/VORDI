import { describe, it, expect } from 'vitest';
import { normalizeTranscript } from '../src/background/nlu/normalizer';

describe('normalizer', () => {
  it('strips polite filler phrases', () => {
    expect(normalizeTranscript('please open youtube')).toBe('open youtube');
    expect(normalizeTranscript('open youtube please')).toBe('open youtube');
    expect(normalizeTranscript('can you open youtube')).toBe('open youtube');
    expect(normalizeTranscript('could you search for AI')).toBe('search for ai');
  });

  it('strips speech disfluencies (um, uh, er)', () => {
    expect(normalizeTranscript('um open uh google er please')).toBe('open google');
  });

  it('strips wake word prefix if included in command transcript', () => {
    expect(normalizeTranscript('hey vordi open youtube')).toBe('open youtube');
    expect(normalizeTranscript('vordi scroll down')).toBe('scroll down');
  });

  it('trims punctuation and extra whitespace', () => {
    expect(normalizeTranscript('  Search for   artificial intelligence?!  ')).toBe('search for artificial intelligence');
  });
});

