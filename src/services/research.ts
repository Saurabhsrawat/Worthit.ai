/**
 * WorthIt AI - Live Research Pipeline Client
 * Coordinates multi-topic grounded research, local storage caching,
 * external API enrichment, and pasted retail listing text analysis.
 */

import { Product, ProductCategory } from '../types';
import { calculateDataCompleteness } from '../lib/scoring';
import { ifixitAdapter, wikipediaAdapter } from './adapters';

const CACHE_KEY = 'worthit_cached_products';

/**
 * Retrieves all locally cached products from localStorage
 */
export function getCachedProducts(): Product[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load cached products:', err);
    return [];
  }
}

/**
 * Finds a specific cached product by id or fuzzy name match
 */
export function getCachedProduct(idOrName: string): Product | null {
  const list = getCachedProducts();
  const lower = idOrName.toLowerCase().trim();
  const direct = list.find((p) => p.id === idOrName);
  if (direct) return direct;
  return list.find((p) => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())) || null;
}

/**
 * Saves or updates a product in the local cache
 */
export function saveCachedProduct(product: Product): void {
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
 * Fetches a product via the live grounded research pipeline.
 * If cached and !forceRefresh, returns the cached version instantly.
 * Otherwise runs multi-topic search grounding, enriches with iFixit/Wikipedia,
 * computes completeness, and caches with retrievedAt timestamp.
 */
export async function fetchLiveProduct(
  productName: string,
  category: ProductCategory,
  forceRefresh = false,
  onProgress?: (progress: ResearchProgress) => void
): Promise<Product> {
  const normalizedName = productName.trim();

  // 1. Check local cache first unless forceRefresh is true
  if (!forceRefresh) {
    const cached = getCachedProduct(normalizedName);
    if (cached) {
      onProgress?.({ step: 'cache', message: 'Loaded from local cache with timestamp' });
      return cached;
    }
  }

  onProgress?.({
    step: 'specs',
    message: `Executing 2-step grounded research across Indian sources for ${normalizedName}...`,
  });

  // 2. Call server-side full research endpoint
  const response = await fetch('/api/research/full', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productName: normalizedName, category }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Live research failed with status ${response.status}`);
  }

  const payload = await response.json();
  let liveProduct: Product = payload.product;

  onProgress?.({
    step: 'enrichment',
    message: 'Consulting free public APIs (iFixit & Wikipedia)...',
  });

  // 3. Query iFixit & Wikipedia for additional verification
  try {
    const [ifixitRes, wikiRes] = await Promise.allSettled([
      ifixitAdapter.fetchRepairDetails(normalizedName),
      wikipediaAdapter.fetchContext(normalizedName),
    ]);

    if (ifixitRes.status === 'fulfilled' && ifixitRes.value.available) {
      if (ifixitRes.value.teardownUrl && !liveProduct.repairability.iFixitGuideUrl) {
        liveProduct.repairability.iFixitGuideUrl = ifixitRes.value.teardownUrl;
      }
      if (ifixitRes.value.notes && !liveProduct.repairability.notes?.value) {
        liveProduct.repairability.notes = {
          value: ifixitRes.value.notes,
          evidenceType: 'verified',
          source: 'iFixit Public Teardown API',
          sourceUrl: ifixitRes.value.teardownUrl,
          date: new Date().toISOString().split('T')[0],
        };
      }
    }

    if (wikiRes.status === 'fulfilled' && wikiRes.value.available && wikiRes.value.pageUrl) {
      if (!liveProduct.sourceLinks) liveProduct.sourceLinks = [];
      const hasWiki = liveProduct.sourceLinks.some((s) => s.url === wikiRes.value.pageUrl);
      if (!hasWiki) {
        liveProduct.sourceLinks.push({
          title: `Wikipedia: ${wikiRes.value.title || normalizedName}`,
          url: wikiRes.value.pageUrl,
          date: new Date().toISOString().split('T')[0],
        });
      }
    }
  } catch (err) {
    console.warn('Enrichment step warning:', err);
  }

  // 4. Calculate evidence completeness
  liveProduct.dataCompleteness = calculateDataCompleteness(liveProduct);
  liveProduct.isLiveFetched = true;
  liveProduct.retrievedAt = new Date().toISOString();

  // 5. Store in local cache
  saveCachedProduct(liveProduct);

  onProgress?.({
    step: 'complete',
    message: 'Research complete. Product profile updated.',
  });

  return liveProduct;
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
