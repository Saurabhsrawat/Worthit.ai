/**
 * WorthIt AI - Data Source Adapters
 * Extensible interface architecture to decouple data sources:
 * - SeedDataAdapter (Local quick-start demonstration catalog)
 * - GeminiGroundedAdapter (Live grounded search across India web)
 * - IFixitAdapter (iFixit public API for teardown scores and repair guides)
 * - WikipediaAdapter (Wikidata / Wikipedia API for release years and generations)
 * - PaidPriceProviderAdapter (Extensible slot for Keepa/SerpApi/retailer feeds)
 */

import { Product, ProductCategory, CandidateProductMatch, RepairabilityInfo } from '../../types';
import { SEED_PRODUCTS, DEMO_SHOWCASE_PRODUCT } from '../../data/seed';

export interface ProductDataSourceAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  searchCandidates(query: string, category?: ProductCategory): Promise<CandidateProductMatch[]>;
  getProductById(id: string): Promise<Product | null>;
  fetchGroundedSpecs?(productName: string, category: ProductCategory): Promise<Partial<Product>>;
}

/**
 * 1. SeedDataAdapter
 * Accesses local curated quick-start catalog of real laptops & smartphones
 */
export class SeedDataAdapter implements ProductDataSourceAdapter {
  name = 'SeedDataAdapter (Quick-Start Examples)';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async searchCandidates(query: string, category?: ProductCategory): Promise<CandidateProductMatch[]> {
    const q = query.toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);
    const all = [DEMO_SHOWCASE_PRODUCT, ...SEED_PRODUCTS];

    const filtered = all.filter((p) => {
      if (category && p.category !== category) return false;
      if (tokens.length === 0) return true;
      const haystack = `${p.name} ${p.brand} ${p.category} ${p.releaseYear}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });

    return filtered.map((p) => {
      const matchScore = q && p.name.toLowerCase().includes(q) ? 0.95 : 0.8;
      const keyAttributes: string[] = [];
      if (p.specs.processor?.value) keyAttributes.push(`CPU: ${p.specs.processor.value}`);
      if (p.specs.ram?.value) keyAttributes.push(`RAM: ${p.specs.ram.value}`);
      if (p.specs.storage?.value) keyAttributes.push(`Storage: ${p.specs.storage.value}`);
      if (p.specs.display?.value) keyAttributes.push(`Display: ${p.specs.display.value}`);

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        releaseYear: p.releaseYear,
        matchConfidence: matchScore,
        keyAttributes,
        needsConfirmationList: [
          'Verify exact RAM and storage variant at purchase',
          'Price must be confirmed on Indian retailer site',
        ],
        sourceInputType: 'search',
      };
    });
  }

  async getProductById(id: string): Promise<Product | null> {
    if (id === DEMO_SHOWCASE_PRODUCT.id) return JSON.parse(JSON.stringify(DEMO_SHOWCASE_PRODUCT));
    const match = SEED_PRODUCTS.find((p) => p.id === id);
    return match ? JSON.parse(JSON.stringify(match)) : null;
  }
}

/**
 * 2. GeminiGroundedAdapter
 * Performs live Google Search grounded candidate matching and multi-topic research
 * for any laptop or smartphone sold in India.
 */
export class GeminiGroundedAdapter implements ProductDataSourceAdapter {
  name = 'GeminiGroundedAdapter (Live Google Search Grounded)';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/external/paid-price');
      return res.status !== 404;
    } catch {
      return false;
    }
  }

  async searchCandidates(query: string, category?: ProductCategory): Promise<CandidateProductMatch[]> {
    try {
      const res = await fetch('/api/research/search-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, category }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
          return data.candidates;
        }
      }
    } catch (e) {
      console.warn('Live search-candidates failed, falling back to local seed adapter', e);
    }

    const seedAdapter = new SeedDataAdapter();
    return seedAdapter.searchCandidates(query, category);
  }

  async getProductById(id: string): Promise<Product | null> {
    // 1. Check local seed catalog first for quick example products
    const seedAdapter = new SeedDataAdapter();
    const seed = await seedAdapter.getProductById(id);
    if (seed) return seed;

    // 2. Check localStorage cache
    try {
      const cachedRaw = localStorage.getItem('worthit_cached_products');
      if (cachedRaw) {
        const cachedList: Product[] = JSON.parse(cachedRaw);
        const hit = cachedList.find((p) => p.id === id);
        if (hit) return hit;
      }
    } catch (e) {
      console.warn('Could not read cached products', e);
    }

    return null;
  }
}

/**
 * 3. IFixitAdapter
 * Public API adapter for iFixit repair guides, device teardowns, and repairability information
 */
export class IFixitAdapter implements ProductDataSourceAdapter {
  name = 'IFixitAdapter (iFixit Public Teardown & Repair API)';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/external/ifixit?query=macbook');
      return res.ok;
    } catch {
      return false;
    }
  }

  async searchCandidates(query: string, category?: ProductCategory): Promise<CandidateProductMatch[]> {
    try {
      const res = await fetch(`/api/external/ifixit?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const payload = await res.json();
        const results = payload.data?.results || [];
        return results.slice(0, 5).map((item: any, idx: number) => ({
          id: `ifixit-${item.product_id || idx}`,
          name: item.title || item.display_title || query,
          brand: item.category || 'Unknown',
          category: category || (item.title?.toLowerCase().includes('phone') ? 'smartphone' : 'laptop'),
          releaseYear: new Date().getFullYear(),
          matchConfidence: 0.75,
          keyAttributes: [`iFixit Guide Category: ${item.category || 'Electronics'}`],
          needsConfirmationList: ['Review teardown guide for specific repair steps'],
          sourceInputType: 'search' as const,
        }));
      }
    } catch (e) {
      console.warn('iFixit search error', e);
    }
    return [];
  }

  async getProductById(): Promise<Product | null> {
    return null;
  }

  async fetchRepairDetails(productName: string): Promise<{
    available: boolean;
    guidesCount: number;
    teardownUrl?: string;
    notes?: string;
  }> {
    try {
      const res = await fetch(`/api/external/ifixit?query=${encodeURIComponent(productName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.available && json.data?.results?.length > 0) {
          const top = json.data.results[0];
          return {
            available: true,
            guidesCount: json.data.results.length,
            teardownUrl: top.url || `https://www.ifixit.com/Device/${encodeURIComponent(top.title || productName)}`,
            notes: `iFixit indexes ${json.data.results.length} teardown/repair guides for this device line.`,
          };
        }
      }
    } catch (e) {
      console.warn('iFixit fetch error', e);
    }
    return { available: false, guidesCount: 0 };
  }
}

/**
 * 4. WikipediaAdapter
 * Free public API adapter for Wikipedia / Wikidata to retrieve canonical release dates,
 * device generation, and neutral background context.
 */
export class WikipediaAdapter implements ProductDataSourceAdapter {
  name = 'WikipediaAdapter (Wikipedia / Wikidata Public API)';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/external/wikipedia?query=laptop');
      return res.ok;
    } catch {
      return false;
    }
  }

  async searchCandidates(query: string, category?: ProductCategory): Promise<CandidateProductMatch[]> {
    try {
      const res = await fetch(`/api/external/wikipedia?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const payload = await res.json();
        const searchResults = payload.data?.query?.search || [];
        return searchResults.slice(0, 3).map((item: any, idx: number) => ({
          id: `wiki-${item.pageid || idx}`,
          name: item.title,
          brand: item.title.split(' ')[0] || 'Unknown',
          category: category || (item.title.toLowerCase().includes('phone') ? 'smartphone' : 'laptop'),
          releaseYear: new Date().getFullYear(),
          matchConfidence: 0.7,
          keyAttributes: [`Wikipedia: ${item.snippet?.replace(/<\/?[^>]+(>|$)/g, '').slice(0, 80)}...`],
          needsConfirmationList: ['Confirm commercial retail variant in India'],
          sourceInputType: 'search' as const,
        }));
      }
    } catch (e) {
      console.warn('Wikipedia search error', e);
    }
    return [];
  }

  async getProductById(): Promise<Product | null> {
    return null;
  }

  async fetchContext(productName: string): Promise<{
    available: boolean;
    title?: string;
    snippet?: string;
    pageUrl?: string;
  }> {
    try {
      const res = await fetch(`/api/external/wikipedia?query=${encodeURIComponent(productName)}`);
      if (res.ok) {
        const json = await res.json();
        const results = json.data?.query?.search;
        if (results && results.length > 0) {
          const top = results[0];
          return {
            available: true,
            title: top.title,
            snippet: top.snippet ? top.snippet.replace(/<\/?[^>]+(>|$)/g, '') : undefined,
            pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(top.title.replace(/ /g, '_'))}`,
          };
        }
      }
    } catch (e) {
      console.warn('Wikipedia fetch error', e);
    }
    return { available: false };
  }
}

/**
 * 5. PaidPriceProviderAdapter
 * Extensible slot for commercial real-time retail feeds (e.g. Keepa, SerpApi, Croma/Reliance feeds).
 * Dynamically activates only when server has PAID_PRICE_API_KEY environment variable.
 */
export class PaidPriceProviderAdapter implements ProductDataSourceAdapter {
  name = 'PaidPriceProvider (Keepa / Retailer Feed Slot)';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/external/paid-price');
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.active);
      }
    } catch {
      return false;
    }
    return false;
  }

  async searchCandidates(): Promise<CandidateProductMatch[]> {
    return [];
  }

  async getProductById(): Promise<Product | null> {
    return null;
  }
}

// Default export instances
export const primaryAdapter = new GeminiGroundedAdapter();
export const seedAdapter = new SeedDataAdapter();
export const ifixitAdapter = new IFixitAdapter();
export const wikipediaAdapter = new WikipediaAdapter();
export const paidPriceAdapter = new PaidPriceProviderAdapter();

export const allAdapters: ProductDataSourceAdapter[] = [
  primaryAdapter,
  seedAdapter,
  ifixitAdapter,
  wikipediaAdapter,
  paidPriceAdapter,
];
