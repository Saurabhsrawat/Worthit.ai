/**
 * WorthIt AI - Live Research Pipeline Client
 * Coordinates spec-first progressive research, 24-hour local storage caching,
 * external API enrichment, and pasted retail listing text analysis.
 */

import { Product, ProductCategory, SectionStatusInfo, TopicDebugInfo } from '../types';
import { calculateDataCompleteness } from '../lib/scoring';
import { ifixitAdapter, wikipediaAdapter } from './adapters';

const CACHE_KEY = 'v3-live-worthit_cached_products';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24-hour cache retention

// Clear old cache keys on module evaluation
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const oldKeys = ['worthit_cached_products', 'worthit_v2_cached_products', 'cached_products'];
    for (const k of oldKeys) {
      localStorage.removeItem(k);
    }
  }
} catch {
  // Ignore in SSR / testing environments
}

/**
 * Retrieves all locally cached products from localStorage.
 * Strictly ignores any cached product that lacks provenance.liveFetched === true.
 */
export function getCachedProducts(): Product[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed: Product[] = JSON.parse(raw);
    // Ignore any cached product that lacks provenance.liveFetched === true
    return (parsed || []).filter((p) => p && p.provenance?.liveFetched === true);
  } catch (err) {
    console.warn('Failed to load cached products:', err);
    return [];
  }
}

/**
 * Finds a specific cached product by id or fuzzy name match.
 * Enforces 24-hour cache expiry and liveFetched === true.
 */
export function getCachedProduct(idOrName: string, variant?: string): Product | null {
  const list = getCachedProducts();
  const lower = idOrName.toLowerCase().trim();
  const candidate =
    list.find((p) => p.id === idOrName && (!variant || p.selectedVariant === variant)) ||
    list.find(
      (p) =>
        (p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())) &&
        (!variant || p.selectedVariant === variant)
    ) ||
    null;

  if (!candidate || candidate.provenance?.liveFetched !== true) return null;

  // Enforce 24-hour TTL
  if (candidate.retrievedAt) {
    const age = Date.now() - new Date(candidate.retrievedAt).getTime();
    if (age > CACHE_TTL_MS) {
      return null; // Expired, trigger re-fetch
    }
  }

  return candidate;
}

/**
 * Saves or updates a product in the local cache.
 * Only saves if provenance.liveFetched === true.
 */
export function saveCachedProduct(product: Product): void {
  if (!product || product.provenance?.liveFetched !== true) {
    return;
  }
  try {
    const list = getCachedProducts();
    const updated = [product, ...list.filter((p) => p.id !== product.id)].slice(0, 50); // Store up to 50 items
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save product in local cache:', err);
  }
}

export interface ResearchProgress {
  step: 'cache' | 'specs' | 'pricing' | 'warranty' | 'repairability' | 'issues' | 'enrichment' | 'complete';
  message: string;
}

/**
 * SPEC-FIRST PROGRESSIVE PIPELINE:
 * 1. Specs are fetched FIRST and immediately provided to onPartialUpdate so the scorecard,
 *    fit engine, and Personal Review render instantly.
 * 2. Next, prices and warranty/update policies are fetched.
 * 3. Lazily, repairability and customer issues are fetched.
 * 4. External adapters (iFixit, Wikipedia) enrich the record.
 * 5. Full product is cached for 24 hours.
 */
export async function fetchLiveProductProgressive(
  productName: string,
  category: ProductCategory,
  variant?: string,
  forceRefresh = false,
  onPartialUpdate?: (product: Product) => void,
  onProgress?: (progress: ResearchProgress) => void
): Promise<Product> {
  const normalizedName = productName.trim();

  // 1. Check 24-hour local cache first unless forceRefresh is true
  if (!forceRefresh) {
    const cached = getCachedProduct(normalizedName, variant);
    if (cached) {
      onProgress?.({ step: 'cache', message: 'Loaded from 24-hour local cache' });
      onPartialUpdate?.(cached);
      return cached;
    }
  }

  // --- STEP 1: SPEC-FIRST RESEARCH CALL ---
  onProgress?.({
    step: 'specs',
    message: `Extracting hardware specifications for ${normalizedName} ${variant ? `(${variant})` : ''}...`,
  });

  const specsResponse = await fetch('/api/research/specs-first', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productName: normalizedName, category, variant }),
  });

  if (!specsResponse.ok) {
    throw new Error(`Specs research failed with status ${specsResponse.status}`);
  }

  const specsPayload = await specsResponse.json();
  let currentProduct: Product = specsPayload.product;

  // Immediately render specs!
  onPartialUpdate?.(currentProduct);

  // --- STEP 2: PRICING & WARRANTY ---
  const remainingTopics = [
    { topic: 'pricing', step: 'pricing' as const, label: 'Indian market retail pricing' },
    { topic: 'warranty', step: 'warranty' as const, label: 'Warranty & software update commitments' },
    { topic: 'repairability', step: 'repairability' as const, label: 'Repairability & teardown data' },
    { topic: 'issues', step: 'issues' as const, label: 'Reported buyer issues and recurring flaws' },
  ];

  for (const item of remainingTopics) {
    onProgress?.({
      step: item.step,
      message: `Researching ${item.label}...`,
    });

    try {
      const topicRes = await fetch('/api/research/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: normalizedName, category, topic: item.topic, variant }),
      });

      if (topicRes.ok) {
        const topicPayload = await topicRes.json();
        const { data, sources, debugInfo } = topicPayload;

        // Merge topic data into currentProduct
        if (!currentProduct.researchDebug) currentProduct.researchDebug = {};
        if (debugInfo) currentProduct.researchDebug[item.topic] = debugInfo;

        if (!currentProduct.sectionStatuses) currentProduct.sectionStatuses = {};
        currentProduct.sectionStatuses[item.topic] = {
          state: debugInfo?.status === 'ok' ? 'loaded' : debugInfo?.status === 'quota' ? 'quota-cooldown' : 'partial',
          updatedAt: new Date().toISOString(),
          reason: debugInfo?.errorMessage,
        };

        if (item.topic === 'pricing' && data) {
          const primaryPrice = data.representativePriceInr || data.priceQuotes?.[0]?.priceInr || currentProduct.priceInInr.value;
          currentProduct.priceInInr = {
            value: primaryPrice,
            evidenceType: primaryPrice ? 'verified' : 'unknown',
            source: data.primarySeller || 'Indicative Retail Listing',
            sourceUrl: data.primarySourceUrl || data.priceQuotes?.[0]?.sourceUrl,
            date: new Date().toISOString().split('T')[0],
          };
          currentProduct.priceQuotes = data.priceQuotes || [];
          if (data.conflicts && data.conflicts.length > 0) {
            currentProduct.conflictingSources = [...(currentProduct.conflictingSources || []), ...data.conflicts];
          }
        }

        if (item.topic === 'warranty' && data) {
          if (data.standardWarrantyMonths?.value) {
            currentProduct.warranty.standardWarrantyMonths = {
              value: data.standardWarrantyMonths.value,
              evidenceType: data.standardWarrantyMonths.status === 'verified' ? 'verified' : 'estimate',
              source: data.standardWarrantyMonths.sourceTitle || 'Official Warranty Policy',
              sourceUrl: data.standardWarrantyMonths.sourceUrl,
            };
          }
          if (data.softwareUpdatePolicyYears?.value) {
            currentProduct.warranty.softwareUpdatePolicyYears = {
              value: data.softwareUpdatePolicyYears.value,
              evidenceType: data.softwareUpdatePolicyYears.status === 'verified' ? 'verified' : 'estimate',
              source: data.softwareUpdatePolicyYears.sourceTitle || 'Manufacturer Update Commitment',
              sourceUrl: data.softwareUpdatePolicyYears.sourceUrl,
            };
          }
        }

        if (item.topic === 'repairability' && data) {
          if (data.scoreOutOfTen?.value) {
            currentProduct.repairability.scoreOutOfTen = {
              value: data.scoreOutOfTen.value,
              evidenceType: 'verified',
              source: 'iFixit / Hardware Teardown',
              sourceUrl: data.scoreOutOfTen.sourceUrl,
            };
          }
          if (data.batteryReplaceable?.value !== undefined) {
            currentProduct.repairability.batteryReplaceable = {
              value: data.batteryReplaceable.value,
              evidenceType: 'estimate',
            };
          }
          if (data.ramUpgradable?.value !== undefined) {
            currentProduct.repairability.ramUpgradable = {
              value: data.ramUpgradable.value,
              evidenceType: 'estimate',
            };
          }
          if (data.storageUpgradable?.value !== undefined) {
            currentProduct.repairability.storageUpgradable = {
              value: data.storageUpgradable.value,
              evidenceType: 'estimate',
            };
          }
        }

        if (item.topic === 'issues' && data?.reportedIssues) {
          currentProduct.reviewData = {
            reviewCount: data.sourcesConsultedCount || data.sourcesConsultedList?.length || 12,
            dateRange: 'Recent purchaser & forum discussions',
            source: `Based on ${data.sourcesConsultedCount || data.sourcesConsultedList?.length || 'multiple'} sources consulted in India`,
            sampleType: 'licensed',
            aspects: data.aspects || [],
            reportedIssues: data.reportedIssues || [],
            sourcesConsultedList: data.sourcesConsultedList || sources || [],
            sourcesConsultedCount: data.sourcesConsultedCount || sources?.length || 0,
          };
        }

        // Add unique sources
        if (sources && sources.length > 0) {
          const currentMap = new Map((currentProduct.sourcesConsulted || []).map((s) => [s.url, s]));
          for (const s of sources) {
            if (s.url && !currentMap.has(s.url)) {
              currentMap.set(s.url, {
                title: s.title || s.url,
                url: s.url,
                topic: item.topic as any,
                retrievedAt: new Date().toISOString(),
              });
            }
          }
          currentProduct.sourcesConsulted = Array.from(currentMap.values());
          currentProduct.sourcesConsultedCount = currentProduct.sourcesConsulted.length;
        }

        currentProduct.dataCompleteness = calculateDataCompleteness(currentProduct);
        onPartialUpdate?.({ ...currentProduct });
      }
    } catch (topicErr) {
      console.warn(`Topic ${item.topic} failed:`, topicErr);
      if (!currentProduct.sectionStatuses) currentProduct.sectionStatuses = {};
      currentProduct.sectionStatuses[item.topic] = {
        state: 'failed',
        updatedAt: new Date().toISOString(),
        reason: (topicErr as any)?.message || 'Failed to fetch topic',
      };
    }
  }

  // --- STEP 3: EXTERNAL ENRICHMENT ---
  onProgress?.({
    step: 'enrichment',
    message: 'Consulting free public APIs (iFixit & Wikipedia)...',
  });

  try {
    const [ifixitRes, wikiRes] = await Promise.allSettled([
      ifixitAdapter.fetchRepairDetails(normalizedName),
      wikipediaAdapter.fetchContext(normalizedName),
    ]);

    if (ifixitRes.status === 'fulfilled' && ifixitRes.value.available) {
      if (ifixitRes.value.teardownUrl && !currentProduct.repairability.iFixitGuideUrl) {
        currentProduct.repairability.iFixitGuideUrl = ifixitRes.value.teardownUrl;
      }
      if (ifixitRes.value.notes && !currentProduct.repairability.notes?.value) {
        currentProduct.repairability.notes = {
          value: ifixitRes.value.notes,
          evidenceType: 'verified',
          source: 'iFixit Public Teardown API',
          sourceUrl: ifixitRes.value.teardownUrl,
          date: new Date().toISOString().split('T')[0],
        };
      }
    }

    if (wikiRes.status === 'fulfilled' && wikiRes.value.available && wikiRes.value.pageUrl) {
      if (!currentProduct.sourceLinks) currentProduct.sourceLinks = [];
      const hasWiki = currentProduct.sourceLinks.some((s) => s.url === wikiRes.value.pageUrl);
      if (!hasWiki) {
        currentProduct.sourceLinks.push({
          title: `Wikipedia: ${wikiRes.value.title || normalizedName}`,
          url: wikiRes.value.pageUrl,
          date: new Date().toISOString().split('T')[0],
        });
      }
    }
  } catch (err) {
    console.warn('Enrichment step warning:', err);
  }

  // Finalize product & cache
  currentProduct.dataCompleteness = calculateDataCompleteness(currentProduct);
  currentProduct.isLiveFetched = true;
  currentProduct.retrievedAt = new Date().toISOString();
  saveCachedProduct(currentProduct);

  onProgress?.({
    step: 'complete',
    message: 'Research complete. Product profile updated.',
  });
  onPartialUpdate?.(currentProduct);

  return currentProduct;
}

/**
 * Backwards-compatible wrapper
 */
export async function fetchLiveProduct(
  productName: string,
  category: ProductCategory,
  forceRefresh = false,
  onProgress?: (progress: ResearchProgress) => void,
  variant?: string
): Promise<Product> {
  return fetchLiveProductProgressive(
    productName,
    category,
    variant,
    forceRefresh,
    undefined,
    onProgress
  );
}

/**
 * Analyzes pasted retail listing text (e.g. from Amazon.in or Flipkart)
 */
export async function analyzeListingText(
  listingText: string,
  productName?: string,
  category?: ProductCategory
): Promise<any> {
  const response = await fetch('/api/analyze-listing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingText, productName, category }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to analyze listing text.');
  }

  return response.json();
}
