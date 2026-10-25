/**
 * WorthIt AI - Gemini AI Service Client
 * Calls server-side proxy routes (/api/*) to invoke Gemini models securely.
 * Handles rate limits, network errors, and returns structured schemas.
 */

import { CandidateProductMatch, ProductCategory, ReviewDataset, Product, WorthItScoreResult, UserPreferences } from '../types';

export interface ImageIdentificationResponse {
  candidates: CandidateProductMatch[];
  identifiedDetails: {
    category: ProductCategory;
    brand: string;
    model: string;
    generation?: string;
    visibleText?: string;
  };
  needsConfirmationList: string[];
}

export async function identifyProductFromImage(
  base64Data: string,
  mimeType: string
): Promise<ImageIdentificationResponse> {
  const response = await fetch('/api/identify-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64Data, mimeType }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to identify product from image.');
  }

  return response.json();
}

export async function identifyProductFromUrl(
  url: string,
  category?: ProductCategory
): Promise<{ candidates: CandidateProductMatch[]; explanation: string }> {
  const response = await fetch('/api/identify-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, category }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to identify product from URL slug.');
  }

  return response.json();
}

export async function analyzePastedReviews(
  reviewText: string,
  productName: string,
  category: ProductCategory
): Promise<ReviewDataset> {
  const response = await fetch('/api/analyze-reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewText, productName, category }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Review classification service failed.');
  }

  return response.json();
}

export async function generatePlainLanguageExplanation(
  product: Product,
  scoreResult: WorthItScoreResult,
  preferences?: UserPreferences
): Promise<string> {
  try {
    const response = await fetch('/api/explain-recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, scoreResult, preferences }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.explanation) return data.explanation;
    }
  } catch (err) {
    console.warn('Could not generate server explanation, using pure rule explanation', err);
  }

  return scoreResult.verdictSummary;
}
