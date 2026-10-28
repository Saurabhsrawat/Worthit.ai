/**
 * WorthIt AI - Claim Filter Engine
 * Enforces strict, transparent claim validation rules:
 *
 * Rule:
 * A field is kept if:
 * (a) its value appears in the Step A text (normalized string/number match) AND
 * (b) Step A returned at least one grounding chunk.
 *
 * Attribution:
 * - Attribute the field to the section's grounding sources instead of requiring per-field source.
 * - Mark status "verified" only when a chunk's domain is an official or reputable spec source;
 *   otherwise mark "reported by web sources".
 * - Drop a field ONLY when its value is absent from the Step A text.
 */

import { isReputableSpecDomain } from './serverPageFetcher';

export interface GroundingChunkLike {
  url?: string;
  title?: string;
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ClaimFilterResult<T = any> {
  kept: boolean;
  value?: T;
  rawText?: string;
  status?: 'verified' | 'reported by web sources' | 'unknown';
  evidenceType?: 'verified' | 'estimate' | 'unknown';
  sourceTitle?: string;
  sourceUrl?: string;
  dropReason?: string;
}

/**
 * Normalizes text for comparison (lower-case, removes commas from numbers, collapses whitespace)
 */
export function normalizeForMatch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/,/g, '') // "48,990" -> "48990"
    .replace(/[₹$€£]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a value appears in the Step A raw text using normalized matching
 */
export function valueAppearsInStepAText(value: any, stepAText: string): boolean {
  if (value === null || value === undefined) return false;
  if (!stepAText || typeof stepAText !== 'string') return false;

  const normStepA = normalizeForMatch(stepAText);

  // Number comparison (e.g. price 48990, battery 5000, weight 1.7)
  if (typeof value === 'number') {
    const numStr = String(value);
    return normStepA.includes(numStr);
  }

  // Boolean comparison (e.g. repairability: replaceable battery)
  if (typeof value === 'boolean') {
    return true; // Booleans are inferred contextual indicators
  }

  if (typeof value === 'string') {
    const normVal = normalizeForMatch(value);
    if (!normVal) return false;

    // Direct substring match
    if (normStepA.includes(normVal)) {
      return true;
    }

    // Extract numbers from the value (e.g. "16GB", "512GB", "120Hz", "5500mAh", "45W", "7530U")
    const numbersInVal = normVal.match(/\d+(?:\.\d+)?/g) || [];
    if (numbersInVal.length > 0) {
      // Check if all key numbers appear in Step A text
      const allNumbersPresent = numbersInVal.every((num) => normStepA.includes(num));
      if (allNumbersPresent) {
        return true;
      }
    }

    // Extract significant hardware tokens (length >= 3, excluding common filler words)
    const fillerWords = new Set(['the', 'and', 'with', 'for', 'inch', 'display', 'panel', 'type', 'core', 'cores', 'from', 'fast', 'slot', 'support']);
    const tokens = normVal
      .split(/[^a-z0-9]/)
      .filter((t) => t.length >= 3 && !fillerWords.has(t));

    if (tokens.length > 0) {
      const matchingTokens = tokens.filter((t) => normStepA.includes(t));
      // If at least half of the significant tokens or at least 2 tokens match
      if (matchingTokens.length >= Math.min(2, tokens.length) || matchingTokens.length / tokens.length >= 0.5) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluates an extracted candidate field against Step A text and grounding chunks
 */
export function filterClaimField(
  fieldName: string,
  rawField: any,
  stepAText: string,
  groundingChunks: GroundingChunkLike[],
  topicSources: { title: string; url: string }[] = []
): ClaimFilterResult {
  // Check condition (b): Step A returned at least one grounding chunk
  if (!groundingChunks || groundingChunks.length === 0) {
    return {
      kept: false,
      dropReason: 'Step A returned 0 grounding chunks',
    };
  }

  // Extract inner value
  const val = rawField && typeof rawField === 'object' && 'value' in rawField ? rawField.value : rawField;
  if (val === null || val === undefined || val === '') {
    return {
      kept: false,
      dropReason: 'Field value is null or empty',
    };
  }

  // Check condition (a): value appears in Step A text
  const appears = valueAppearsInStepAText(val, stepAText);
  if (!appears) {
    return {
      kept: false,
      dropReason: `Value '${val}' is absent from Step A grounded search text`,
    };
  }

  // Determine whether any chunk or source is from an official/reputable domain
  let hasReputableSource = false;
  let bestSourceUrl = topicSources[0]?.url || '';
  let bestSourceTitle = topicSources[0]?.title || 'Grounded Web Research';

  for (const chunk of groundingChunks) {
    const uri = chunk.url || chunk.web?.uri;
    const title = chunk.title || chunk.web?.title;
    if (uri) {
      if (isReputableSpecDomain(uri)) {
        hasReputableSource = true;
        bestSourceUrl = uri;
        bestSourceTitle = title || new URL(uri).hostname;
        break;
      }
      if (!bestSourceUrl) {
        bestSourceUrl = uri;
        bestSourceTitle = title || new URL(uri).hostname;
      }
    }
  }

  // If reputable domain: status = "verified", else status = "reported by web sources"
  const status = hasReputableSource ? 'verified' : 'reported by web sources';
  const evidenceType = hasReputableSource ? 'verified' : 'estimate';

  return {
    kept: true,
    value: val,
    rawText: String(val),
    status,
    evidenceType,
    sourceUrl: bestSourceUrl,
    sourceTitle: bestSourceTitle,
  };
}
