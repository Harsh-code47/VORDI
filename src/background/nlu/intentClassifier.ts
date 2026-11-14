// src/background/nlu/intentClassifier.ts
// Classifies user intent from spoken speech and extracts command parameters

import { NLUResult } from '../../shared/types';
import { MIN_CONFIDENCE_THRESHOLD, COMMON_URL_MAP } from '../../shared/constants';
import { normalizeTranscript } from './normalizer';
import { PatternCompiler } from './patternCompiler';

export class IntentClassifier {
  private compiler: PatternCompiler;

  constructor() {
    this.compiler = new PatternCompiler();
  }

  public parse(rawTranscript: string): NLUResult {
    const normalized = normalizeTranscript(rawTranscript);

    if (!normalized) {
      return {
        intent: null,
        entities: {},
        confidence: 0,
        rawTranscript,
        normalizedTranscript: ''
      };
    }

    // 1. Direct Pattern Matching via PatternCompiler
    const match = this.compiler.match(normalized);
    if (match && match.confidence >= MIN_CONFIDENCE_THRESHOLD) {
      // Normalize URL entity if present
      if (match.entities.url) {
        match.entities.url = this.resolveUrlShortcut(match.entities.url);
      }

      return {
        intent: match.intent,
        entities: match.entities,
        confidence: match.confidence,
        rawTranscript,
        normalizedTranscript: normalized
      };
    }

    // 2. Direct single-word or shortcut heuristics
    // e.g. "youtube", "google" -> OPEN_URL
    if (COMMON_URL_MAP[normalized]) {
      return {
        intent: 'OPEN_URL',
        entities: { url: COMMON_URL_MAP[normalized] },
        confidence: 0.95,
        rawTranscript,
        normalizedTranscript: normalized
      };
    }

    // e.g. "youtube.com", "github.com", "cnn.com"
    if (/^[a-z0-9-]+(\.[a-z]{2,})+/i.test(normalized)) {
      return {
        intent: 'OPEN_URL',
        entities: { url: `https://${normalized}` },
        confidence: 0.92,
        rawTranscript,
        normalizedTranscript: normalized
      };
    }

    // 3. Fallback: low confidence or unknown intent
    return {
      intent: match ? match.intent : null,
      entities: match ? match.entities : {},
      confidence: match ? match.confidence : 0.3,
      rawTranscript,
      normalizedTranscript: normalized
    };
  }

  private resolveUrlShortcut(rawUrl: string): string {
    const key = rawUrl.trim().toLowerCase();
    if (COMMON_URL_MAP[key]) {
      return COMMON_URL_MAP[key];
    }
    if (/^https?:\/\//i.test(key)) {
      return key;
    }
    if (/^[a-z0-9-]+(\.[a-z]{2,})+/i.test(key)) {
      return `https://${key}`;
    }
    // If not a URL, return Google search or the cleaned word
    return key;
  }
}

