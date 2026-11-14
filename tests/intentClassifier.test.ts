import { describe, it, expect } from 'vitest';
import { IntentClassifier } from '../src/background/nlu/intentClassifier';

describe('IntentClassifier', () => {
  const classifier = new IntentClassifier();

  it('classifies spoken navigation commands', () => {
    const res = classifier.parse('Hey VORDI please open YouTube');
    expect(res.intent).toBe('OPEN_URL');
    expect(res.entities.url).toBe('https://www.youtube.com');
    expect(res.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('classifies web search intents', () => {
    const res = classifier.parse('search for quantum computing');
    expect(res.intent).toBe('WEB_SEARCH');
    expect(res.entities.query).toBe('quantum computing');
  });

  it('classifies YouTube specific search', () => {
    const res = classifier.parse('search youtube for lofi hip hop');
    expect(res.intent).toBe('YOUTUBE_SEARCH');
    expect(res.entities.query).toBe('lofi hip hop');
  });

  it('handles single domain shortcut words', () => {
    const res = classifier.parse('youtube');
    expect(res.intent).toBe('OPEN_URL');
    expect(res.entities.url).toBe('https://www.youtube.com');
  });

  it('handles direct dot com navigation', () => {
    const res = classifier.parse('github.com');
    expect(res.intent).toBe('OPEN_URL');
    expect(res.entities.url).toBe('https://github.com');
  });

  it('returns low confidence / null intent for ambiguous input', () => {
    const res = classifier.parse('the weather is sunny today');
    expect(res.intent).toBeNull();
    expect(res.confidence).toBeLessThan(0.85);
  });
});

