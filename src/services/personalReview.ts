/**
 * WorthIt AI - Personal Review Service
 * Manages local spec analysis, profile hashing, caching in localStorage,
 * and calling the ungrounded Gemini endpoint for prose generation.
 */

import { Product, UserPreferences, VerdictResult, PersonalReviewData } from '../types';
import { analyzeProductSpecs } from '../lib/specAnalysis';
import { evaluateVerdict } from '../lib/verdict';

const REVIEW_CACHE_PREFIX = 'worthit_personal_review_';

/**
 * Creates a deterministic profile hash from user preferences, product variant, and price.
 */
export function createProfileHash(profile?: UserPreferences, productPrice?: number, variantId?: string): string {
  if (!profile) return `default_${productPrice || 0}_${variantId || 'base'}`;
  const uses = [...(profile.intendedUse || [])].sort().join(',');
  const weights = profile.importanceWeights || { performance: 3, batteryLife: 3, portability: 3, repairability: 3 };
  const rawKey = [
    uses,
    profile.maxBudgetInInr || 'nobudget',
    profile.expectedOwnershipYears || 3,
    weights.performance,
    weights.batteryLife,
    weights.portability,
    weights.repairability,
    (profile.essentialRequirements || '').trim().toLowerCase(),
    productPrice || 0,
    variantId || 'base',
  ].join('::');

  // Simple string hash
  let hash = 0;
  for (let i = 0; i < rawKey.length; i++) {
    hash = (hash << 5) - hash + rawKey.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

/**
 * Retrieves cached personal review from localStorage if available
 */
export function getCachedPersonalReview(productId: string, profileHash: string): PersonalReviewData | null {
  try {
    const raw = localStorage.getItem(`${REVIEW_CACHE_PREFIX}${productId}_${profileHash}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse cached personal review:', e);
    return null;
  }
}

/**
 * Saves personal review in localStorage
 */
export function saveCachedPersonalReview(data: PersonalReviewData): void {
  try {
    localStorage.setItem(
      `${REVIEW_CACHE_PREFIX}${data.productId}_${data.profileHash}`,
      JSON.stringify(data)
    );
  } catch (e) {
    console.warn('Failed to save personal review cache:', e);
  }
}

/**
 * Generates or retrieves Personal Review:
 * 1. Executes pure TypeScript specAnalysis locally (zero API calls)
 * 2. Checks local cache for previously generated prose matching this profile hash
 * 3. If cache miss, requests un-grounded, fact-bounded Gemini call (/api/personal-review)
 * 4. Falls back gracefully without blocking verdict or scorecard if quota limit is reached.
 */
export async function getOrGeneratePersonalReview(
  product: Product,
  profile?: UserPreferences,
  userPrice?: number,
  forceRegenerate = false
): Promise<PersonalReviewData> {
  const price = userPrice || product.priceInInr?.value || 0;
  const profileHash = createProfileHash(profile, price, product.id);

  // 1. Run local pure-TS spec analysis (deterministic, zero latency)
  const analysis = analyzeProductSpecs(product, profile, price);
  const verdict = evaluateVerdict(product, profile, undefined, [], price);

  // 2. Check local cache unless forceRegenerate is true
  if (!forceRegenerate) {
    const cached = getCachedPersonalReview(product.id, profileHash);
    if (cached) {
      // Re-attach latest local analysis and verdict to guarantee synced state
      return {
        ...cached,
        analysis,
        verdict,
      };
    }
  }

  // 3. Prepare strict input facts for Gemini (ONLY computed objects)
  const topPriorities: string[] = [];
  if (profile?.importanceWeights) {
    if (profile.importanceWeights.performance >= 4) topPriorities.push('High Computing Performance');
    if (profile.importanceWeights.batteryLife >= 4) topPriorities.push('All-day Battery Endurance');
    if (profile.importanceWeights.portability >= 4) topPriorities.push('Lightweight Portability');
    if (profile.importanceWeights.repairability >= 4) topPriorities.push('Easy Repairability & Longevity');
  }

  const payload = {
    productName: product.name,
    category: product.category,
    priceInr: price > 0 ? price : undefined,
    userProfile: {
      useCases: profile?.intendedUse || ['Everyday multitasking & general productivity'],
      maxBudgetInInr: profile?.maxBudgetInInr,
      expectedOwnershipYears: profile?.expectedOwnershipYears || 3,
      topPriorities: topPriorities.length > 0 ? topPriorities : ['Balanced everyday performance'],
      essentialRequirements: profile?.essentialRequirements || undefined,
    },
    verdict: {
      outcome: verdict.outcome,
      title: verdict.title,
      confidence: verdict.confidence,
      worthItScore: verdict.worthItScore,
      withinBudget: verdict.budgetAnalysis.withinBudget,
      deltaInr: verdict.budgetAnalysis.deltaInr,
    },
    ratedSpecs: analysis.ratedSpecs.map((s) => ({
      specKey: s.specKey,
      specName: s.specName,
      rawText: s.rawText,
      rating: s.rating,
      comparisonNote: s.comparisonNote,
      relevance: s.relevance,
    })),
    strengths: analysis.strengths.map((s) => ({
      specFact: s.specFact,
      whyItMatters: s.whyItMatters,
    })),
    weaknesses: analysis.weaknesses.map((s) => ({
      specFact: s.specFact,
      whyItMatters: s.whyItMatters,
    })),
    standouts: analysis.standouts.map((s) => ({
      specName: s.specName,
      value: s.value,
    })),
    tradeoffs: analysis.tradeoffs,
    unverifiableSpecs: analysis.unverifiableSpecs,
  };

  let writtenReview: string | null = null;
  let actionableTip: string | null = null;
  let reviewStatus: 'verified' | 'ai-generated' | 'failed-validation' | 'quota-fallback' = 'quota-fallback';

  try {
    const res = await fetch('/api/personal-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      writtenReview = data.prose || null;
      actionableTip = data.actionableTip || null;
      reviewStatus = data.reviewStatus || (writtenReview ? 'ai-generated' : 'quota-fallback');
    }
  } catch (err) {
    console.warn('Personal review request note:', err);
    reviewStatus = 'quota-fallback';
  }

  // Combine prose and actionable tip into full personalized prose if tip is present
  const fullProse = writtenReview
    ? actionableTip && !writtenReview.includes(actionableTip)
      ? `${writtenReview} Actionable Tip: ${actionableTip}`
      : writtenReview
    : null;

  const reviewData: PersonalReviewData = {
    productId: product.id,
    profileHash,
    verdict,
    analysis,
    writtenReview: fullProse,
    reviewStatus,
    generatedAt: new Date().toISOString(),
  };

  // Cache in localStorage
  saveCachedPersonalReview(reviewData);

  return reviewData;
}
