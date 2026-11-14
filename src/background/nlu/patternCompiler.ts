// src/background/nlu/patternCompiler.ts
// Compiles template patterns into regular expressions with named capture groups
// Evaluates intent-to-pattern mapping, entity extraction, and confidence scoring

import { IntentType, CommandEntities } from '../../shared/types';

export interface CompiledPattern {
  intent: IntentType;
  regex: RegExp;
  template: string;
  baseConfidence: number;
}

export class PatternCompiler {
  private compiledPatterns: CompiledPattern[] = [];

  constructor() {
    this.registerDefaultPatterns();
  }

  /**
   * Compiles a human-readable template into a RegExp with named capture groups.
   * Example: "open {url}" -> /^open (?<url>.+?)$/i
   */
  public compile(template: string, intent: IntentType, baseConfidence = 1.0): CompiledPattern {
    const escaped = template
      .trim()
      .replace(/[.+*?^$()[\]{}|\\]/g, (match) => (match === '{' || match === '}' ? match : `\\${match}`));

    // Replace {entity} with named capture group (?<entity>.+?)
    const regexString = '^' + escaped.replace(/\{([a-zA-Z0-9_]+)\}/g, '(?<$1>.+?)') + '$';
    const regex = new RegExp(regexString, 'i');

    return {
      intent,
      regex,
      template,
      baseConfidence
    };
  }

  public register(template: string, intent: IntentType, baseConfidence = 1.0): void {
    this.compiledPatterns.push(this.compile(template, intent, baseConfidence));
  }

  /**
   * Matches a normalized transcript against compiled patterns.
   * Returns intent, extracted entities, and confidence score.
   */
  public match(text: string): { intent: IntentType; entities: CommandEntities; confidence: number } | null {
    if (!text) return null;

    let bestMatch: { intent: IntentType; entities: CommandEntities; confidence: number } | null = null;
    let highestConfidence = 0;

    for (const pattern of this.compiledPatterns) {
      const match = pattern.regex.exec(text);
      if (match) {
        const entities: CommandEntities = {};
        if (match.groups) {
          for (const [key, value] of Object.entries(match.groups)) {
            if (value !== undefined) {
              entities[key] = value.trim();
            }
          }
        }

        // Exact pattern match starts with base confidence (default 0.95 - 1.0)
        let confidence = pattern.baseConfidence;

        // Minor entity penalty if entity captured is suspiciously empty or single character
        for (const val of Object.values(entities)) {
          if (val && val.length < 2) {
            confidence -= 0.1;
          }
        }

        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = {
            intent: pattern.intent,
            entities,
            confidence
          };
        }
      }
    }

    return bestMatch;
  }

  private registerDefaultPatterns(): void {
    // 1. OPEN_URL
    this.register('open {url}', 'OPEN_URL', 0.98);
    this.register('go to {url}', 'OPEN_URL', 0.98);
    this.register('navigate to {url}', 'OPEN_URL', 0.98);
    this.register('launch {url}', 'OPEN_URL', 0.95);
    this.register('visit {url}', 'OPEN_URL', 0.95);

    // 2. WEB_SEARCH
    this.register('search for {query}', 'WEB_SEARCH', 0.98);
    this.register('google {query}', 'WEB_SEARCH', 0.98);
    this.register('search google for {query}', 'WEB_SEARCH', 0.98);
    this.register('search {query}', 'WEB_SEARCH', 0.92);
    this.register('look up {query}', 'WEB_SEARCH', 0.94);

    // 3. YOUTUBE_SEARCH
    this.register('search youtube for {query}', 'YOUTUBE_SEARCH', 0.99);
    this.register('youtube search {query}', 'YOUTUBE_SEARCH', 0.98);
    this.register('find {query} on youtube', 'YOUTUBE_SEARCH', 0.98);
    this.register('play {query} on youtube', 'YOUTUBE_SEARCH', 0.95);

    // 4. NEW_TAB
    this.register('new tab', 'NEW_TAB', 1.0);
    this.register('open new tab', 'NEW_TAB', 1.0);
    this.register('create new tab', 'NEW_TAB', 0.98);
    this.register('open a new tab', 'NEW_TAB', 0.98);

    // 5. CLOSE_TAB
    this.register('close tab', 'CLOSE_TAB', 1.0);
    this.register('close this tab', 'CLOSE_TAB', 1.0);
    this.register('close current tab', 'CLOSE_TAB', 0.98);
    this.register('shut tab', 'CLOSE_TAB', 0.95);

    // 6. NEXT_TAB
    this.register('next tab', 'NEXT_TAB', 1.0);
    this.register('switch to next tab', 'NEXT_TAB', 0.98);
    this.register('go to next tab', 'NEXT_TAB', 0.98);

    // 7. PREVIOUS_TAB
    this.register('previous tab', 'PREVIOUS_TAB', 1.0);
    this.register('prev tab', 'PREVIOUS_TAB', 0.98);
    this.register('switch to previous tab', 'PREVIOUS_TAB', 0.98);
    this.register('last tab', 'PREVIOUS_TAB', 0.92);

    // 8. SCROLL_UP
    this.register('scroll up', 'SCROLL_UP', 1.0);
    this.register('scroll page up', 'SCROLL_UP', 0.98);
    this.register('page up', 'SCROLL_UP', 0.95);

    // 9. SCROLL_DOWN
    this.register('scroll down', 'SCROLL_DOWN', 1.0);
    this.register('scroll page down', 'SCROLL_DOWN', 0.98);
    this.register('page down', 'SCROLL_DOWN', 0.95);

    // 10. CLICK_ELEMENT
    this.register('click {element}', 'CLICK_ELEMENT', 0.96);
    this.register('click on {element}', 'CLICK_ELEMENT', 0.96);
    this.register('press {element}', 'CLICK_ELEMENT', 0.94);
    this.register('select {element}', 'CLICK_ELEMENT', 0.92);
    this.register('tap on {element}', 'CLICK_ELEMENT', 0.92);

    // 11. FILL_INPUT
    this.register('type {text} into {element}', 'FILL_INPUT', 0.98);
    this.register('type {text} in {element}', 'FILL_INPUT', 0.98);
    this.register('enter {text} in {element}', 'FILL_INPUT', 0.96);
    this.register('fill {element} with {text}', 'FILL_INPUT', 0.96);

    // 12. PLAY_MEDIA
    this.register('play media', 'PLAY_MEDIA', 1.0);
    this.register('play video', 'PLAY_MEDIA', 1.0);
    this.register('resume', 'PLAY_MEDIA', 0.98);
    this.register('resume video', 'PLAY_MEDIA', 0.98);
    this.register('play', 'PLAY_MEDIA', 0.95);

    // 13. PAUSE_MEDIA
    this.register('pause media', 'PAUSE_MEDIA', 1.0);
    this.register('pause video', 'PAUSE_MEDIA', 1.0);
    this.register('stop video', 'PAUSE_MEDIA', 0.95);
    this.register('pause', 'PAUSE_MEDIA', 0.95);

    // 14. GO_BACK
    this.register('go back', 'GO_BACK', 1.0);
    this.register('back', 'GO_BACK', 0.95);
    this.register('navigate back', 'GO_BACK', 0.98);

    // 15. GO_FORWARD
    this.register('go forward', 'GO_FORWARD', 1.0);
    this.register('forward', 'GO_FORWARD', 0.95);
    this.register('navigate forward', 'GO_FORWARD', 0.98);

    // 16. RELOAD_PAGE
    this.register('reload', 'RELOAD_PAGE', 1.0);
    this.register('reload page', 'RELOAD_PAGE', 1.0);
    this.register('refresh', 'RELOAD_PAGE', 1.0);
    this.register('refresh page', 'RELOAD_PAGE', 1.0);
  }
}

