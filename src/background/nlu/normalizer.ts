// src/background/nlu/normalizer.ts
// Cleans, normalizes, and strips filler words from spoken transcripts

const FILLER_PHRASES = [
  /^please\s+/i,
  /\s+please$/i,
  /^can you\s+/i,
  /^could you\s+/i,
  /^would you\s+/i,
  /^i want to\s+/i,
  /^i'd like to\s+/i,
  /^hey vordi\s+/i,
  /^vordi\s+/i,
  /\b(um|uh|er|ah|like|kind of)\b/gi
];

export function normalizeTranscript(text: string): string {
  if (!text) return '';
  let cleaned = text.trim().toLowerCase();

  // Strip common punctuation (except dots in domains or query terms)
  cleaned = cleaned.replace(/[?!,;:]/g, '');

  let previous = '';
  // Repeat until all layered fillers are cleanly stripped (e.g. "hey vordi please open...")
  while (previous !== cleaned) {
    previous = cleaned;
    for (const filler of FILLER_PHRASES) {
      cleaned = cleaned.replace(filler, ' ');
    }
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }

  return cleaned;
}
