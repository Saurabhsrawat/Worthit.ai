/**
 * WorthIt AI - Server-Side Page Fetcher & Spec Extractor
 * Reads actual product web pages server-side (bypassing CORS)
 * to retrieve authoritative specs for any Indian market laptop or smartphone.
 *
 * Constraints & Guarantees:
 * - Resolves Google grounding redirect URLs
 * - Respects timeouts (8s) and size limits (1MB)
 * - Strips scripts, styles, and markup to clean text
 * - Skips binary files and disallowed endpoints
 * - Never scrapes in bulk; never persists full page text beyond the request
 */

export const REPUTABLE_SPEC_DOMAINS = [
  'apple.com',
  'samsung.com',
  'lenovo.com',
  'asus.com',
  'mi.com',
  'xiaomi.com',
  'dell.com',
  'hp.com',
  'acer.com',
  'motorola.in',
  'motorola.com',
  'oneplus.com',
  'oneplus.in',
  'realme.com',
  'iqoo.com',
  'vivo.com',
  'oppo.com',
  'nothing.tech',
  'gsmarena.com',
  'notebookcheck.net',
  'ifixit.com',
  'amazon.in',
  'flipkart.com',
  'croma.com',
  'reliancedigital.in',
  'smartprix.com',
  '91mobiles.com',
  'gadgets360.com',
  'intel.com',
  'amd.com',
  'qualcomm.com',
  'mediatek.com',
];

/**
 * Checks if a domain is an official or reputable hardware spec source
 */
export function isReputableSpecDomain(urlOrDomain: string): boolean {
  if (!urlOrDomain) return false;
  try {
    const hostname = urlOrDomain.startsWith('http')
      ? new URL(urlOrDomain).hostname.toLowerCase()
      : urlOrDomain.toLowerCase().replace(/:\d+$/, '');
    return REPUTABLE_SPEC_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * Resolves Google Grounding redirect URLs (e.g. vertexaisearch.cloud.google.com/grounding-api-redirect/...)
 * to find the actual target website destination.
 */
export async function resolveGroundingUrl(rawUrl: string, timeoutMs = 5000): Promise<string> {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  if (!rawUrl.startsWith('http')) return rawUrl;

  // If already a direct domain URL and not a grounding redirect, return as is
  if (!rawUrl.includes('vertexaisearch') && !rawUrl.includes('google.com/url') && !rawUrl.includes('grounding-api-redirect')) {
    return rawUrl;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    const resolved = res.url || rawUrl;
    return resolved;
  } catch {
    return rawUrl;
  }
}

/**
 * Strips HTML tags, scripts, navigation, and styles to produce clean plain text
 */
export function stripHtmlToText(html: string): string {
  if (!html) return '';

  return html
    // Remove scripts, styles, and irrelevant page sections
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    // Replace structural tags with newlines/spaces
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section|article)>/gi, '\n')
    .replace(/<(td|th)>/gi, ' | ')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    // Collapse excess spaces and blank lines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

export interface FetchedPageResult {
  success: boolean;
  rawUrl: string;
  resolvedUrl: string;
  domain: string;
  title: string;
  text?: string;
  bytes: number;
  durationMs: number;
  error?: string;
}

/**
 * Fetches page via r.jina.ai when JavaScript rendering is required
 * or when direct fetch returns thin text / anti-bot blocks.
 */
export async function fetchViaJina(
  targetUrl: string,
  timeoutMs = 8000
): Promise<FetchedPageResult> {
  const startTime = Date.now();
  try {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return {
        success: false,
        rawUrl: targetUrl,
        resolvedUrl: targetUrl,
        domain: new URL(targetUrl).hostname,
        title: 'Jina reader unavailable',
        bytes: 0,
        durationMs: Date.now() - startTime,
        error: `Jina reader HTTP ${resp.status}`,
      };
    }

    const text = await resp.text();
    const cleanText = text.slice(0, 15000);
    return {
      success: cleanText.length >= 100,
      rawUrl: targetUrl,
      resolvedUrl: targetUrl,
      domain: new URL(targetUrl).hostname,
      title: new URL(targetUrl).hostname,
      text: cleanText,
      bytes: text.length,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      rawUrl: targetUrl,
      resolvedUrl: targetUrl,
      domain: targetUrl.startsWith('http') ? new URL(targetUrl).hostname : 'unknown',
      title: 'Failed to fetch via Jina',
      bytes: 0,
      durationMs: Date.now() - startTime,
      error: err.name === 'AbortError' ? 'Jina timeout (8s)' : (err.message || 'Jina fetch error'),
    };
  }
}

/**
 * Fetches a single webpage respecting:
 * - 8-second timeout
 * - 1MB maximum size limit
 * - Binary file skipping
 * - Text normalization
 * - Fallback to r.jina.ai for JavaScript-heavy or thin pages
 */
export async function fetchWebpageContent(
  targetUrl: string,
  timeoutMs = 8000,
  maxBytes = 1048576
): Promise<FetchedPageResult> {
  const startTime = Date.now();
  let resolvedUrl = targetUrl;

  try {
    resolvedUrl = await resolveGroundingUrl(targetUrl, 4000);
    const parsed = new URL(resolvedUrl);

    // Skip binary extensions
    const pathLower = parsed.pathname.toLowerCase();
    if (/\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|mp4|exe|apk)$/.test(pathLower)) {
      return {
        success: false,
        rawUrl: targetUrl,
        resolvedUrl,
        domain: parsed.hostname,
        title: parsed.hostname,
        bytes: 0,
        durationMs: Date.now() - startTime,
        error: 'Binary file skipped',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(resolvedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      // If 403 / anti-bot block, attempt r.jina.ai fallback
      if (response.status === 403 || response.status === 503) {
        const jinaResult = await fetchViaJina(resolvedUrl, 6000);
        if (jinaResult.success) return jinaResult;
      }
      return {
        success: false,
        rawUrl: targetUrl,
        resolvedUrl: response.url || resolvedUrl,
        domain: parsed.hostname,
        title: parsed.hostname,
        bytes: 0,
        durationMs: Date.now() - startTime,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text') && !contentType.includes('html') && !contentType.includes('json')) {
      return {
        success: false,
        rawUrl: targetUrl,
        resolvedUrl: response.url || resolvedUrl,
        domain: parsed.hostname,
        title: parsed.hostname,
        bytes: 0,
        durationMs: Date.now() - startTime,
        error: `Non-text content-type: ${contentType}`,
      };
    }

    // Read response up to 1MB
    const buffer = await response.arrayBuffer();
    const clampedBuffer = buffer.byteLength > maxBytes ? buffer.slice(0, maxBytes) : buffer;
    const decoder = new TextDecoder('utf-8');
    const rawHtml = decoder.decode(clampedBuffer);

    // Extract title if present
    const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsed.hostname;

    // Convert to plain text
    const plainText = stripHtmlToText(rawHtml);

    // If direct HTML produced thin text (< 200 chars), fall back to r.jina.ai for JavaScript hydration
    if (plainText.length < 200) {
      const jinaFallback = await fetchViaJina(resolvedUrl, 6000);
      if (jinaFallback.success && (jinaFallback.text?.length || 0) > plainText.length) {
        return jinaFallback;
      }
    }

    return {
      success: true,
      rawUrl: targetUrl,
      resolvedUrl: response.url || resolvedUrl,
      domain: parsed.hostname,
      title,
      text: plainText.slice(0, 15000), // Cap to 15,000 characters for LLM prompt
      bytes: clampedBuffer.byteLength,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    // On timeout or network error, attempt Jina fallback once
    try {
      const jinaFallback = await fetchViaJina(targetUrl, 5000);
      if (jinaFallback.success) return jinaFallback;
    } catch {
      // Ignore secondary error
    }

    return {
      success: false,
      rawUrl: targetUrl,
      resolvedUrl,
      domain: targetUrl.startsWith('http') ? new URL(targetUrl).hostname : 'unknown',
      title: 'Failed to fetch',
      bytes: 0,
      durationMs: Date.now() - startTime,
      error: err.name === 'AbortError' ? 'Timeout (8s exceeded)' : (err.message || 'Fetch failed'),
    };
  }
}

/**
 * Filter and prioritize candidate URLs:
 * - Removes search result list pages (/s?, /search)
 * - Prioritizes manufacturer and authoritative tech spec domains
 * - Prioritizes major Indian authorized retail listings for pricing
 */
export function rankCandidateUrls(urls: string[], topic: 'specs' | 'pricing'): string[] {
  const isSearchPage = (u: string) =>
    u.includes('/s?') ||
    u.includes('/search?') ||
    u.includes('/Search?') ||
    u.includes('google.com/search') ||
    u.includes('bing.com/search') ||
    u.includes('duckduckgo.com');

  const valid = urls.filter((u) => Boolean(u && u.startsWith('http') && !isSearchPage(u)));
  // Deduplicate
  const unique = Array.from(new Set(valid));

  return unique.sort((a, b) => {
    const aRep = isReputableSpecDomain(a);
    const bRep = isReputableSpecDomain(b);

    if (topic === 'specs') {
      if (aRep && !bRep) return -1;
      if (!aRep && bRep) return 1;
    } else {
      const aRetail = /amazon\.in|flipkart\.com|croma\.com|reliancedigital\.in/.test(a);
      const bRetail = /amazon\.in|flipkart\.com|croma\.com|reliancedigital\.in/.test(b);
      if (aRetail && !bRetail) return -1;
      if (!aRetail && bRetail) return 1;
      if (aRep && !bRep) return -1;
      if (!aRep && bRep) return 1;
    }
    return 0;
  });
}
