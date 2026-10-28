/**
 * WorthIt AI - Search Provider Adapter (Server-Side Only)
 * Provides free web search without requiring Gemini Google Search grounding.
 *
 * Supported providers:
 * 1. TavilyProvider (via TAVILY_API_KEY - free tier available at https://tavily.com)
 * 2. GoogleCSEProvider (via GOOGLE_CSE_KEY + GOOGLE_CSE_CX - 100 free queries/day)
 * 3. NoSearchProvider (graceful zero-fabricated-data fallback when no keys configured)
 *
 * All keys stay strictly in server-side environment variables.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
  rawContent?: string;
}

export interface SearchProvider {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string, maxResults?: number, customDomains?: string[]): Promise<SearchResult[]>;
}

let searchCircuitBreakerUntil = 0;
let searchCircuitBreakerReason = '';

export function isSearchCircuitBreakerActive(): { active: boolean; remainingSeconds: number; reason: string } {
  const remainingMs = searchCircuitBreakerUntil - Date.now();
  if (remainingMs > 0) {
    return {
      active: true,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      reason: searchCircuitBreakerReason || 'Search rate-limit active',
    };
  }
  return { active: false, remainingSeconds: 0, reason: '' };
}

export function tripSearchCircuitBreaker(cooldownSeconds = 60, reason = 'Rate limit encountered'): void {
  searchCircuitBreakerUntil = Date.now() + cooldownSeconds * 1000;
  searchCircuitBreakerReason = reason;
}

export const REPUTABLE_SEARCH_DOMAINS = [
  'apple.com',
  'samsung.com',
  'lenovo.com',
  'asus.com',
  'acer.com',
  'dell.com',
  'hp.com',
  'mi.com',
  'realme.com',
  'oneplus.in',
  'oneplus.com',
  'nothing.tech',
  'motorola.in',
  'gsmarena.com',
  'notebookcheck.net',
  'ifixit.com',
  'smartprix.com',
  '91mobiles.com',
  'amazon.in',
  'flipkart.com',
];

export class TavilyProvider implements SearchProvider {
  readonly name = 'TavilySearch';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async search(query: string, maxResults = 5, customDomains?: string[]): Promise<SearchResult[]> {
    const cb = isSearchCircuitBreakerActive();
    if (cb.active) {
      throw new Error(`Search provider rate-limited (${cb.reason}, retry in ${cb.remainingSeconds}s)`);
    }

    const domains = customDomains && customDomains.length > 0 ? customDomains : REPUTABLE_SEARCH_DOMAINS;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      // Current Tavily API: Authorization: Bearer <API_KEY>, search_depth: advanced, include_raw_content: true
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey.trim()}`,
        },
        body: JSON.stringify({
          api_key: this.apiKey.trim(),
          query,
          search_depth: 'advanced',
          include_raw_content: true,
          include_answer: false,
          max_results: maxResults,
          include_domains: domains,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        if (resp.status === 429) {
          tripSearchCircuitBreaker(60, 'Tavily monthly / minute rate limit');
          throw new Error('Tavily API quota limit reached (429)');
        }
        const errText = await resp.text();
        throw new Error(`Tavily search failed: HTTP ${resp.status} - ${errText.slice(0, 150)}`);
      }

      const json = await resp.json();
      let results: SearchResult[] = (json.results || []).map((r: any) => {
        let domain = '';
        try {
          domain = new URL(r.url).hostname.replace(/^www\./, '');
        } catch {
          domain = '';
        }
        return {
          title: r.title || domain || 'Web Search Result',
          url: r.url,
          snippet: r.content || '',
          domain,
          rawContent: r.raw_content || r.content || '',
        };
      });

      // If strict domain filtering yielded 0 results, retry once without domain filter to avoid dead-ends
      if (results.length === 0 && domains.length > 0) {
        const fallbackCtrl = new AbortController();
        const fallbackTimer = setTimeout(() => fallbackCtrl.abort(), 8000);
        const fbResp = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey.trim()}`,
          },
          body: JSON.stringify({
            api_key: this.apiKey.trim(),
            query,
            search_depth: 'advanced',
            include_raw_content: true,
            include_answer: false,
            max_results: maxResults,
          }),
          signal: fallbackCtrl.signal,
        });
        clearTimeout(fallbackTimer);
        if (fbResp.ok) {
          const fbJson = await fbResp.json();
          results = (fbJson.results || []).map((r: any) => {
            let domain = '';
            try {
              domain = new URL(r.url).hostname.replace(/^www\./, '');
            } catch {
              domain = '';
            }
            return {
              title: r.title || domain || 'Web Search Result',
              url: r.url,
              snippet: r.content || '',
              domain,
              rawContent: r.raw_content || r.content || '',
            };
          });
        }
      }

      return results;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Tavily search timed out (10s limit)');
      }
      if (err.message?.includes('429')) {
        tripSearchCircuitBreaker(60, 'Tavily 429');
      }
      throw err;
    }
  }
}

export class GoogleCSEProvider implements SearchProvider {
  readonly name = 'GoogleCustomSearch';
  private apiKey: string;
  private cx: string;

  constructor(apiKey: string, cx: string) {
    this.apiKey = apiKey;
    this.cx = cx;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && this.cx && this.cx.trim().length > 0);
  }

  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    const cb = isSearchCircuitBreakerActive();
    if (cb.active) {
      throw new Error(`Search provider rate-limited (${cb.reason}, retry in ${cb.remainingSeconds}s)`);
    }

    try {
      const num = Math.min(10, Math.max(1, maxResults));
      const targetUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
        this.apiKey
      )}&cx=${encodeURIComponent(this.cx)}&q=${encodeURIComponent(query)}&num=${num}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (!resp.ok) {
        if (resp.status === 429) {
          tripSearchCircuitBreaker(120, 'Google Custom Search daily quota limit');
          throw new Error('Google CSE quota limit reached (429)');
        }
        const errText = await resp.text();
        throw new Error(`Google CSE failed: HTTP ${resp.status} - ${errText.slice(0, 150)}`);
      }

      const json = await resp.json();
      const results: SearchResult[] = (json.items || []).map((item: any) => {
        let domain = '';
        try {
          domain = new URL(item.link).hostname;
        } catch {
          domain = '';
        }
        return {
          title: item.title || domain || 'Web Search Result',
          url: item.link,
          snippet: item.snippet || '',
          domain,
        };
      });

      return results;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Google CSE search timed out (8s limit)');
      }
      if (err.message?.includes('429')) {
        tripSearchCircuitBreaker(120, 'Google CSE 429');
      }
      throw err;
    }
  }
}

export class NoSearchProvider implements SearchProvider {
  readonly name = 'NoSearchProvider';

  isAvailable(): boolean {
    return false;
  }

  async search(_query: string, _maxResults = 5): Promise<SearchResult[]> {
    // Graceful no-search return - no hardcoded or fabricated data
    return [];
  }
}

/**
 * Returns active search provider instance according to configured env variables.
 * Preference: Tavily -> Google CSE -> NoSearch
 */
export function getSearchProvider(): SearchProvider {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey && tavilyKey.length > 5 && !tavilyKey.includes('MY_TAVILY')) {
    return new TavilyProvider(tavilyKey);
  }

  const cseKey = process.env.GOOGLE_CSE_KEY?.trim();
  const cseCx = process.env.GOOGLE_CSE_CX?.trim();
  if (cseKey && cseCx && cseKey.length > 5 && !cseKey.includes('MY_GOOGLE')) {
    return new GoogleCSEProvider(cseKey, cseCx);
  }

  return new NoSearchProvider();
}
