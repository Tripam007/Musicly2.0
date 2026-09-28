/**
 * WakeWordManager - Local "Hey Musicly" Wake Word Detector
 * 
 * Strict Gatekeeper: The assistant will respond ONLY when "Hey Musicly" is detected.
 * Rejects arbitrary speech, background noise, and partial phrases like "Hey", "Musicly", "Hey Google".
 */

export class WakeWordManager {
  constructor(options = {}) {
    this.wakePhrase = (options.wakePhrase || 'Hey Musicly').toLowerCase();
    this.onWakeWord = options.onWakeWord || null;
    this.cooldownMs = options.cooldownMs || 800;
    this.lastDetectedTime = 0;
    this.isLocked = false;

    // Regex patterns for "Hey Musicly" with common phonetic and transcription variants
    this.wakeWordRegex = /\b(?:hey|hay|a|ok)\s+(?:musicly|musically|music\s*ly|music\s*lee|misicly)\b/i;

    // Words that should NOT match if standing alone
    this.falsePositiveRegexes = [
      /^musicly\b/i,
      /^musically\b/i,
      /^hey\b/i,
      /\bhey\s+google\b/i,
      /\bhey\s+siri\b/i,
      /\bhey\s+alexa\b/i,
      /\bmusicly\s+is\b/i,
      /\bi\s+like\s+musicly\b/i
    ];
  }

  /**
   * Resets cooldown and state locks
   */
  reset() {
    this.lastDetectedTime = 0;
    this.isLocked = false;
  }

  setLocked(locked) {
    this.isLocked = locked;
  }

  /**
   * Tests speech transcript against the "Hey Musicly" wake word filter.
   * 
   * @param {string} text - Raw speech transcript
   * @param {number} now - timestamp (performance.now())
   * @returns {{ detected: boolean, confidence: number, commandTail: string, matchSnippet: string }}
   */
  processTranscript(text, customNow = null) {
    if (!text || typeof text !== 'string') {
      return { detected: false, confidence: 0, commandTail: '', matchSnippet: '' };
    }

    const now = customNow !== null 
      ? customNow 
      : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

    // Cooldown check (only if a detection previously occurred)
    if (this.isLocked || (this.lastDetectedTime > 0 && (now - this.lastDetectedTime < this.cooldownMs))) {
      return { detected: false, confidence: 0, commandTail: '', matchSnippet: '' };
    }

    const clean = text.trim();

    // Check false positive patterns first
    // E.g. "I like Musicly", "Musicly is...", "Hey Google", solitary "Musicly"
    for (const fpRegex of this.falsePositiveRegexes) {
      if (fpRegex.test(clean) && !this.wakeWordRegex.test(clean)) {
        return { detected: false, confidence: 0, commandTail: '', matchSnippet: '' };
      }
    }

    const match = this.wakeWordRegex.exec(clean);
    if (!match) {
      return { detected: false, confidence: 0, commandTail: '', matchSnippet: '' };
    }

    // Wake word detected! Extract any command spoken in the same breath
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    const commandTail = clean.substring(matchEnd).replace(/^[,.\s]+/, '').trim();

    // High confidence for exact match
    const isExact = match[0].toLowerCase() === 'hey musicly';
    const confidence = isExact ? 0.98 : 0.91;

    this.lastDetectedTime = now;

    const payload = {
      detected: true,
      confidence,
      commandTail,
      tailCommand: commandTail,
      matchSnippet: match[0]
    };

    if (typeof this.onWakeWord === 'function') {
      try {
        this.onWakeWord(payload);
      } catch (err) {
        console.warn('[WakeWordManager] onWakeWord handler error:', err);
      }
    }

    return payload;
  }
}
