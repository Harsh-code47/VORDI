import { describe, it, expect } from 'vitest';
import { PatternCompiler } from '../src/background/nlu/patternCompiler';

describe('PatternCompiler', () => {
  const compiler = new PatternCompiler();

  it('compiles templates with named capture groups', () => {
    const compiled = compiler.compile('go to {url}', 'OPEN_URL');
    expect(compiled.intent).toBe('OPEN_URL');
    expect(compiled.regex.test('go to youtube.com')).toBe(true);
  });

  it('extracts single entity accurately', () => {
    const match = compiler.match('search for artificial intelligence');
    expect(match).not.toBeNull();
    expect(match?.intent).toBe('WEB_SEARCH');
    expect(match?.entities.query).toBe('artificial intelligence');
    expect(match?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('extracts multiple entities accurately for form filling', () => {
    const match = compiler.match('type hello world into search box');
    expect(match).not.toBeNull();
    expect(match?.intent).toBe('FILL_INPUT');
    expect(match?.entities.text).toBe('hello world');
    expect(match?.entities.element).toBe('search box');
  });

  it('matches exact static commands without entities', () => {
    const nextTab = compiler.match('next tab');
    expect(nextTab?.intent).toBe('NEXT_TAB');

    const scrollDown = compiler.match('scroll down');
    expect(scrollDown?.intent).toBe('SCROLL_DOWN');

    const reload = compiler.match('reload page');
    expect(reload?.intent).toBe('RELOAD_PAGE');
  });

  it('returns null on completely unrecognized phrases', () => {
    const match = compiler.match('make me a sandwich');
    expect(match).toBeNull();
  });
});

