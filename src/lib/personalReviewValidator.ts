/**
 * WorthIt AI - Personal Review Post-Validation Engine
 * Validates un-grounded Gemini review prose to enforce strict trust boundaries:
 * 1. Prohibits forbidden words ("unreliable", "guaranteed").
 * 2. Enforces word count bounds (75 to 275 words).
 * 3. Verifies that every number mentioned in the prose exists in the input facts.
 * If validation fails, prose is cleanly discarded and labeled "AI-written summary unavailable".
 */

export interface ReviewValidationResult {
  isValid: boolean;
  reason?: string;
}

export function validatePersonalReviewText(
  prose: string | null | undefined,
  inputPayload: any
): ReviewValidationResult {
  if (!prose || typeof prose !== 'string') {
    return { isValid: false, reason: 'Empty prose' };
  }

  const lowerProse = prose.toLowerCase();

  // 1. Prohibit forbidden words
  if (lowerProse.includes('unreliable')) {
    return { isValid: false, reason: 'Prohibited word "unreliable" detected' };
  }
  if (lowerProse.includes('guaranteed')) {
    return { isValid: false, reason: 'Prohibited word "guaranteed" detected' };
  }

  // 2. Enforce word count bounds
  const words = prose.trim().split(/\s+/).filter(Boolean);
  if (words.length < 75 || words.length > 275) {
    return { isValid: false, reason: `Word count outside bounds (${words.length} words)` };
  }

  // 3. Strict fact check on numbers (including numbers followed by units like 120Hz, 45W, 5500mAh)
  const inputStr = JSON.stringify(inputPayload).toLowerCase();
  const numbersInProse = prose.match(/\d+(?:,\d+)*(?:\.\d+)?/g) || [];

  for (const rawNum of numbersInProse) {
    const cleanNum = rawNum.replace(/,/g, '');
    const numVal = parseFloat(cleanNum);

    // Allow small integers 1-5 when used as rankings, steps, or standard counts
    if (numVal >= 1 && numVal <= 5 && Number.isInteger(numVal)) {
      continue;
    }

    // Check if the number appears anywhere in the input payload facts
    if (!inputStr.includes(cleanNum.toLowerCase())) {
      const currentYear = new Date().getFullYear();
      if (cleanNum === String(currentYear) || cleanNum === String(currentYear - 1)) {
        continue;
      }
      return {
        isValid: false,
        reason: `Unverified number ${rawNum} detected in text that was not in input facts`,
      };
    }
  }

  return { isValid: true };
}
