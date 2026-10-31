/**
 * WorthIt AI - Multi-Source Customer Review Pipeline
 *
 * Implements a pluggable ReviewSource adapter interface:
 * 1. YouTube Data API v3 (env YOUTUBE_API_KEY)
 * 2. Tavily Search (env TAVILY_API_KEY) targeting Reddit, Team-BHP, TechEnclave, GSMArena, NotebookCheck
 * 3. User-supplied pasted text ("user-supplied sample")
 *
 * All comments are filtered (model tokens, duplicates, min 20 chars), capped at ~300 comments.
 * All comment text is treated as untrusted user data.
 */

import { ReviewSourceStat, ReviewQuote } from '../types';

export interface RawReviewComment {
  id: string;
  source: 'youtube' | 'tavily' | 'user-supplied';
  sourceName: string;
  sourceUrl: string;
  text: string;
  author?: string;
  publishedAt?: string;
}

export interface ReviewSourceResult {
  sourceId: string;
  sourceName: string;
  status: 'ok' | 'no_key' | 'quota' | 'error' | 'no_results' | 'skipped';
  comments: RawReviewComment[];
  totalFetched: number;
  totalFiltered: number;
  callsMade: number;
  message?: string;
  urlsConsulted: { title: string; url: string }[];
  durationMs: number;
}

export interface ReviewSourceAdapter {
  readonly id: string;
  readonly name: string;
  fetchReviews(
    productName: string,
    brand: string,
    category: string,
    variant?: string
  ): Promise<ReviewSourceResult>;
}

// In-memory 24-hour cache for external API responses to cap quota usage
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}
const YOUTUBE_CACHE = new Map<string, CacheEntry<ReviewSourceResult>>();
const TAVILY_CACHE = new Map<string, CacheEntry<ReviewSourceResult>>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Allowed discussion forum domains for Tavily review search (NO Amazon, NO Flipkart)
export const FORUM_SEARCH_DOMAINS = [
  'reddit.com',
  'team-bhp.com',
  'techenclave.com',
  'notebookcheck.net',
  'gsmarena.com',
];

/**
 * 1. YouTube Data API v3 Adapter
 * Env var: YOUTUBE_API_KEY
 * Search "<brand> <model> review", fetch up to 100 comments from top 3 videos
 */
export class YouTubeReviewAdapter implements ReviewSourceAdapter {
  readonly id = 'youtube';
  readonly name = 'YouTube Public Comments';

  async fetchReviews(
    productName: string,
    brand: string,
    _category: string,
    _variant?: string
  ): Promise<ReviewSourceResult> {
    const startTime = Date.now();
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        sourceId: this.id,
        sourceName: this.name,
        status: 'no_key',
        comments: [],
        totalFetched: 0,
        totalFiltered: 0,
        callsMade: 0,
        message: 'YouTube API key (YOUTUBE_API_KEY) not configured. Skipped.',
        urlsConsulted: [],
        durationMs: Date.now() - startTime,
      };
    }

    // Check 24-hr cache
    const cacheKey = `${brand.toLowerCase()}-${productName.toLowerCase()}`.replace(/[^a-z0-9]/g, '-');
    const cached = YOUTUBE_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    let callsMade = 0;
    const comments: RawReviewComment[] = [];
    const urlsConsulted: { title: string; url: string }[] = [];

    try {
      // 1. Search for top 3 videos (prefer recent & Indian channels)
      const searchQuery = `${brand} ${productName} review India`;
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        searchQuery
      )}&type=video&regionCode=IN&maxResults=3&key=${apiKey.trim()}`;

      callsMade++;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const errorText = await searchRes.text();
        const isQuota = searchRes.status === 403 && errorText.includes('quota');
        return {
          sourceId: this.id,
          sourceName: this.name,
          status: isQuota ? 'quota' : 'error',
          comments: [],
          totalFetched: 0,
          totalFiltered: 0,
          callsMade,
          message: isQuota
            ? 'YouTube Data API daily quota limit reached.'
            : `YouTube search error (${searchRes.status}): ${errorText.slice(0, 100)}`,
          urlsConsulted: [],
          durationMs: Date.now() - startTime,
        };
      }

      const searchData = await searchRes.json();
      const videoItems = searchData.items || [];

      if (videoItems.length === 0) {
        return {
          sourceId: this.id,
          sourceName: this.name,
          status: 'no_results',
          comments: [],
          totalFetched: 0,
          totalFiltered: 0,
          callsMade,
          message: 'No YouTube review videos found for this model.',
          urlsConsulted: [],
          durationMs: Date.now() - startTime,
        };
      }

      // 2. Fetch up to 100 top-level comments per video (max 3 calls)
      for (const vItem of videoItems.slice(0, 3)) {
        const videoId = vItem.id?.videoId;
        if (!videoId) continue;
        const videoTitle = vItem.snippet?.title || `${brand} ${productName} Review`;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        urlsConsulted.push({ title: videoTitle, url: videoUrl });

        try {
          callsMade++;
          const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&textFormat=plainText&key=${apiKey.trim()}`;
          const commRes = await fetch(commentsUrl);

          if (!commRes.ok) {
            // Comments might be disabled on this video
            continue;
          }

          const commData = await commRes.json();
          const items = commData.items || [];

          for (const item of items) {
            const topComm = item.snippet?.topLevelComment?.snippet;
            const text = (topComm?.textOriginal || topComm?.textDisplay || '').trim();
            if (text.length >= 20) {
              comments.push({
                id: `yt-${item.id}`,
                source: 'youtube',
                sourceName: `YouTube: ${videoTitle.slice(0, 45)}...`,
                sourceUrl: videoUrl,
                text,
                author: topComm?.authorDisplayName,
                publishedAt: topComm?.publishedAt,
              });
            }
          }
        } catch {
          // Continue to next video if one comment thread fails
        }
      }

      const result: ReviewSourceResult = {
        sourceId: this.id,
        sourceName: this.name,
        status: comments.length > 0 ? 'ok' : 'no_results',
        comments,
        totalFetched: comments.length,
        totalFiltered: 0,
        callsMade,
        urlsConsulted,
        durationMs: Date.now() - startTime,
      };

      YOUTUBE_CACHE.set(cacheKey, { data: result, cachedAt: Date.now() });
      return result;
    } catch (err: any) {
      return {
        sourceId: this.id,
        sourceName: this.name,
        status: 'error',
        comments: [],
        totalFetched: 0,
        totalFiltered: 0,
        callsMade,
        message: err.message || 'YouTube comment fetch failed',
        urlsConsulted,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

/**
 * 2. Tavily Forum Search Adapter
 * Env var: TAVILY_API_KEY
 * Searches reddit.com, team-bhp.com, techenclave.com, notebookcheck.net, gsmarena.com
 * Extracts user review paragraphs and forum posts.
 */
export class TavilyForumReviewAdapter implements ReviewSourceAdapter {
  readonly id = 'tavily';
  readonly name = 'Forums (Reddit, Team-BHP, TechEnclave, GSMArena)';

  async fetchReviews(
    productName: string,
    brand: string,
    _category: string,
    _variant?: string
  ): Promise<ReviewSourceResult> {
    const startTime = Date.now();
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        sourceId: this.id,
        sourceName: this.name,
        status: 'no_key',
        comments: [],
        totalFetched: 0,
        totalFiltered: 0,
        callsMade: 0,
        message: 'Tavily API key not configured. Skipped.',
        urlsConsulted: [],
        durationMs: Date.now() - startTime,
      };
    }

    const cacheKey = `tavily-reviews-${brand.toLowerCase()}-${productName.toLowerCase()}`.replace(
      /[^a-z0-9]/g,
      '-'
    );
    const cached = TAVILY_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    let callsMade = 0;
    const comments: RawReviewComment[] = [];
    const urlsConsulted: { title: string; url: string }[] = [];

    try {
      callsMade++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);

      // Search forums for real owner reviews, defects, and discussions
      const cleanName = productName.toLowerCase().startsWith(brand.toLowerCase())
        ? productName
        : `${brand} ${productName}`;
      const query = `"${cleanName}" review issues defects`;

      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          api_key: apiKey.trim(),
          query,
          search_depth: 'advanced',
          include_raw_content: true,
          include_answer: false,
          max_results: 4,
          include_domains: FORUM_SEARCH_DOMAINS,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const errorText = await resp.text();
        return {
          sourceId: this.id,
          sourceName: this.name,
          status: resp.status === 429 ? 'quota' : 'error',
          comments: [],
          totalFetched: 0,
          totalFiltered: 0,
          callsMade,
          message: `Tavily forum search failed (${resp.status}): ${errorText.slice(0, 100)}`,
          urlsConsulted: [],
          durationMs: Date.now() - startTime,
        };
      }

      const data = await resp.json();
      const results = data.results || [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const pageUrl = r.url || '';
        const pageTitle = r.title || 'Discussion Thread';
        urlsConsulted.push({ title: pageTitle, url: pageUrl });

        // Identify forum domain
        let domainLabel = 'Discussion Forum';
        if (pageUrl.includes('reddit.com')) domainLabel = 'Reddit';
        else if (pageUrl.includes('team-bhp.com')) domainLabel = 'Team-BHP';
        else if (pageUrl.includes('techenclave.com')) domainLabel = 'TechEnclave';
        else if (pageUrl.includes('gsmarena.com')) domainLabel = 'GSMArena User Opinions';
        else if (pageUrl.includes('notebookcheck.net')) domainLabel = 'NotebookCheck';

        // Extract individual review / comment chunks from raw content or snippets
        const contentPool = [r.raw_content || '', r.content || ''].join('\n\n');
        const chunks = splitIntoCommentChunks(contentPool, pageUrl);

        for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
          const chunk = chunks[cIdx].trim();
          if (chunk.length >= 25 && chunk.length <= 1500) {
            comments.push({
              id: `tavily-${i}-${cIdx}`,
              source: 'tavily',
              sourceName: `${domainLabel}: ${pageTitle.slice(0, 40)}`,
              sourceUrl: pageUrl,
              text: chunk,
            });
          }
        }
      }

      const result: ReviewSourceResult = {
        sourceId: this.id,
        sourceName: this.name,
        status: comments.length > 0 ? 'ok' : 'no_results',
        comments,
        totalFetched: comments.length,
        totalFiltered: 0,
        callsMade,
        urlsConsulted,
        durationMs: Date.now() - startTime,
      };

      TAVILY_CACHE.set(cacheKey, { data: result, cachedAt: Date.now() });
      return result;
    } catch (err: any) {
      return {
        sourceId: this.id,
        sourceName: this.name,
        status: 'error',
        comments: [],
        totalFetched: 0,
        totalFiltered: 0,
        callsMade,
        message: err.message || 'Tavily forum search error',
        urlsConsulted,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

/**
 * 3. User-Pasted Reviews Adapter
 * Treats input as "user-supplied sample"
 */
export class UserPastedReviewAdapter implements ReviewSourceAdapter {
  readonly id = 'user-supplied';
  readonly name = 'User-Supplied Sample';
  private text: string;

  constructor(text: string) {
    this.text = text;
  }

  async fetchReviews(
    _productName: string,
    _brand: string,
    _category: string
  ): Promise<ReviewSourceResult> {
    const startTime = Date.now();
    const chunks = splitIntoCommentChunks(this.text);
    const comments: RawReviewComment[] = chunks
      .filter((c) => c.trim().length >= 20)
      .map((c, i) => ({
        id: `user-pasted-${i}`,
        source: 'user-supplied',
        sourceName: 'User-Supplied Review Text',
        sourceUrl: '',
        text: c.trim(),
      }));

    return {
      sourceId: this.id,
      sourceName: this.name,
      status: comments.length > 0 ? 'ok' : 'no_results',
      comments,
      totalFetched: comments.length,
      totalFiltered: 0,
      callsMade: 0,
      urlsConsulted: [],
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract clean hostname / domain from URL (Requirement 5)
 */
export function extractDomainFromUrl(url: string): string {
  if (!url) return 'Unknown domain';
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'forums';
  }
}

/**
 * Split page text on real comment or post boundaries (Requirement 2).
 * Excludes article headers, navigation menus, editorial staff prose, and ads.
 */
export function splitIntoCommentChunks(text: string, pageUrl: string = ''): string[] {
  if (!text) return [];

  const lowerUrl = pageUrl.toLowerCase();
  const isGsmArena = lowerUrl.includes('gsmarena.com');
  const isReddit = lowerUrl.includes('reddit.com');
  const isTeamBhp = lowerUrl.includes('team-bhp.com');
  const isTechEnclave = lowerUrl.includes('techenclave.com');
  const isNotebookCheck = lowerUrl.includes('notebookcheck.net');

  // Strip obvious web boilerplate, script, CSS, and navigation markup
  let cleanedText = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');

  // If GSMArena editorial review (e.g. -review-2670p7.php without -reviews-),
  // only extract if there is an opinions block; do NOT treat editorial staff paragraphs as user comments
  if (isGsmArena && lowerUrl.includes('-review-') && !lowerUrl.includes('-reviews-')) {
    const opinionsIdx = cleanedText.toLowerCase().indexOf('user opinions and reviews');
    if (opinionsIdx !== -1) {
      cleanedText = cleanedText.slice(opinionsIdx);
    } else {
      // Pure editorial staff review without user comments - reject article prose
      return [];
    }
  }

  // Filter out boilerplate lines
  const boilerplateRegex = /(?:cookie policy|all rights reserved|privacy policy|terms of service|login or register|jump to content|sign up|log in|subscribe to our newsletter|advertisement|sponsored|table of contents|view full discussion|reddit rules|leave a reply|share on facebook|share on twitter)/i;

  let rawBlocks: string[] = [];

  if (isReddit) {
    // Reddit comment separation: split on user comment signatures or markdown headers
    rawBlocks = cleanedText.split(
      /\n+(?=(?:Comment by\s+|u\/[\w-]+\s+|level\s+\d+\s+|\[–\]\s*[\w-]+|(?:\*{1,2}[\w-]+\*{1,2}\s+\d+\s+(?:points|ago))))|\n{2,}(?=[A-Z][a-z0-9])/
    );
  } else if (isGsmArena) {
    // GSMArena user opinions separation: split by user author lines, Rating, or timestamps
    rawBlocks = cleanedText.split(
      /\n+(?=(?:Rating:\s*\d|Anonymous,\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|[\w.-]+,\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\bRating\b|\bAnonymous\b))/
    );
  } else if (isTeamBhp || isTechEnclave) {
    // Forum posts separation: split by Quote or timestamp headers
    rawBlocks = cleanedText.split(
      /\n+(?=(?:Quote:\s*Originally Posted by|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4},\s+\d{1,2}:\d{2}|Senior Member|Newbie|BHPian))/
    );
  } else {
    // General forum paragraph breaks
    rawBlocks = cleanedText.split(/\n{2,}|\r\n{2,}|\n(?=[*•\-\d]+\. )|\n(?=>)|---+|===+/);
  }

  const validComments: string[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.replace(/\s+/g, ' ').trim();

    // Minimum 25 characters, maximum 1500 characters
    if (trimmed.length < 25 || trimmed.length > 1500) continue;

    // Discard blocks matching site boilerplate or navigation
    if (boilerplateRegex.test(trimmed)) continue;

    // Discard spec tables / key value headers (e.g. "Dimensions: 162.3 x 79 x 8.6 mm Weight: 232 g")
    if (
      /^(?:dimensions|weight|display size|chipset|battery capacity|internal storage|camera resolution):/i.test(
        trimmed
      )
    ) {
      continue;
    }

    // Require natural conversational language or user opinion voice
    // (Must contain some punctuation or natural pronouns or common opinion verbs)
    const hasConversationalSignals =
      /\b(i|my|mine|me|we|our|you|he|she|they|it's|its|device|phone|laptop|unit|issue|problem|screen|battery|update|bought|bought it|tested|using|months|weeks|days|camera|service|support|defect|bad|good|terrible|awesome|slow|hot|fan|warm|cracked|stuck|line|throttl|noise)\b/i.test(
        trimmed
      );

    if (hasConversationalSignals) {
      validComments.push(trimmed);
    }
  }

  return validComments;
}

/**
 * Extract distinctive tokens for the product and identify conflicting variants/generations (Requirement 6).
 */
export function extractDistinctiveTokens(productName: string, brand: string): {
  brandTokens: string[];
  modelTokens: string[];
  distinctiveTokens: string[];
  conflictingTokens: string[];
  conflictingVariants: string[];
} {
  const clean = productName.toLowerCase();
  const brandLower = brand.toLowerCase();

  const stopWords = new Set([
    'laptop',
    'smartphone',
    'phone',
    'edition',
    'series',
    '5g',
    '4g',
    'lte',
    'inch',
    'display',
    'ram',
    'storage',
    'ssd',
    'black',
    'white',
    'grey',
    'silver',
    'blue',
    'green',
    'gold',
    'unified',
    'memory',
    'intel',
    'amd',
    'ryzen',
    'core',
  ]);

  const rawTokens = clean
    .replace(/[(),/\\-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !stopWords.has(t));

  const brandTokens = brandLower.split(/\s+/).filter(Boolean);
  const modelTokens = rawTokens.filter((t) => !brandTokens.includes(t));

  const distinctiveTokens: string[] = [];
  for (const t of modelTokens) {
    if (/\d/.test(t) || t.length >= 3) {
      distinctiveTokens.push(t);
    }
  }

  // Generation phrases
  const genMatch = clean.match(/gen\s*(\d+)/i);
  if (genMatch) {
    distinctiveTokens.push(`gen ${genMatch[1]}`, `gen${genMatch[1]}`);
  }

  const conflictingTokens: string[] = [];
  const conflictingVariants: string[] = [];

  // 1. Samsung Galaxy S24 Ultra vs S24 base / S24+ / older Ultra
  if (clean.includes('s24') && clean.includes('ultra')) {
    distinctiveTokens.push('s24 ultra', 's24u', 's24 ultra');
    conflictingVariants.push(
      'base s24',
      'regular s24',
      'standard s24',
      'vanilla s24',
      's24 plus',
      's24+',
      's23 ultra',
      's22 ultra',
      's23 base',
      's23+'
    );
  } else if (clean.includes('s24') && !clean.includes('ultra')) {
    conflictingVariants.push('s24 ultra', 's24u', 's23');
  }

  // 2. OnePlus 12R vs OnePlus 12 flagship / 11R
  if (clean.includes('12r')) {
    distinctiveTokens.push('12r', 'oneplus 12r', 'op12r');
    conflictingVariants.push(
      'oneplus 12 base',
      'regular oneplus 12',
      'standard oneplus 12',
      'op12 base',
      'oneplus 11r',
      'oneplus 11',
      '10r'
    );
  }

  // 3. Lenovo ThinkPad E14 Gen 5 vs Gen 4 / Gen 3 / E15 / T14
  if (clean.includes('e14')) {
    conflictingTokens.push('e15', 'e16', 't14', 'l14', 't15');
    if (genMatch && genMatch[1] === '5') {
      conflictingVariants.push('gen 4', 'gen 3', 'gen 2', 'gen 1', 'gen 6');
    }
  }

  // 4. ASUS Zenbook 14 OLED UX3405 vs UM3402 / Vivobook
  if (clean.includes('zenbook') && (clean.includes('ux3405') || clean.includes('14 oled'))) {
    distinctiveTokens.push('ux3405', 'zenbook 14');
    conflictingVariants.push('ux3402', 'um3402', 'vivobook 14', 'vivobook 15', 'zenbook 15', 'zenbook duo');
  }

  // 5. Apple MacBook Air M3 vs M1 / M2 / Pro
  if (clean.includes('macbook air') && clean.includes('m3')) {
    distinctiveTokens.push('m3');
    conflictingVariants.push('m1', 'm2', 'macbook pro', 'm3 pro', 'm3 max');
  }

  return {
    brandTokens,
    modelTokens,
    distinctiveTokens: distinctiveTokens.length > 0 ? distinctiveTokens : modelTokens,
    conflictingTokens,
    conflictingVariants,
  };
}

/**
 * 3. Filtering & Deduplication Logic (Requirements 1, 3, 6)
 * - Keep only comments that mention the model or distinctive tokens
 * - Reject conflicting models, generations, and variants (log counts)
 * - Remove duplicates and comments under 20 characters
 * - Cap at about 300 comments
 */
export function filterAndDeduplicateComments(
  comments: RawReviewComment[],
  productName: string,
  brand: string
): {
  accepted: RawReviewComment[];
  totalFetched: number;
  totalRejected: number;
  rejectionBreakdown: {
    notMatchingModel: number;
    variantMismatch: number;
    otherGeneration: number;
    tooShort: number;
    duplicate: number;
  };
} {
  const {
    brandTokens,
    distinctiveTokens,
    conflictingTokens,
    conflictingVariants,
  } = extractDistinctiveTokens(productName, brand);

  const seenNormalized = new Set<string>();
  const accepted: RawReviewComment[] = [];

  const rejectionBreakdown = {
    notMatchingModel: 0,
    variantMismatch: 0,
    otherGeneration: 0,
    tooShort: 0,
    duplicate: 0,
  };

  const isUserSuppliedSample = (comm: RawReviewComment) => comm.source === 'user-supplied';

  for (const comm of comments) {
    const rawText = comm.text.trim();

    // 1. Minimum 20 characters
    if (rawText.length < 20) {
      rejectionBreakdown.tooShort++;
      continue;
    }

    // 2. Deduplication check (normalized text)
    const normalized = rawText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 160);

    if (seenNormalized.has(normalized)) {
      rejectionBreakdown.duplicate++;
      continue;
    }

    const isUserSupplied = isUserSuppliedSample(comm);
    const textLower = rawText.toLowerCase();

    // 3. Variant Mismatch Filter (Requirement 6)
    // Check if comment specifies a different variant or generation without mentioning our target
    let isVariantMismatch = false;
    for (const vConflict of conflictingVariants) {
      if (textLower.includes(vConflict)) {
        // If it mentions a conflicting variant (e.g. "base s24" or "gen 4"),
        // only keep if it ALSO explicitly names the target distinctive token (e.g. "s24 ultra" or "gen 5")
        const mentionsTarget = distinctiveTokens.some((tok) => textLower.includes(tok));
        if (!mentionsTarget && !isUserSupplied) {
          isVariantMismatch = true;
          break;
        }
      }
    }

    if (isVariantMismatch) {
      rejectionBreakdown.variantMismatch++;
      continue;
    }

    // 4. Conflicting Model/Lineage Check
    let hasConflict = false;
    for (const conflict of conflictingTokens) {
      if (textLower.includes(conflict)) {
        const mentionsTarget = distinctiveTokens.some((tok) => textLower.includes(tok));
        if (!mentionsTarget && !isUserSupplied) {
          hasConflict = true;
          break;
        }
      }
    }

    if (hasConflict) {
      rejectionBreakdown.otherGeneration++;
      continue;
    }

    // 5. Token relevance: must mention brand OR distinctive token
    const sourceTitleLower = comm.sourceName.toLowerCase();
    const matchesInText =
      distinctiveTokens.some((tok) => textLower.includes(tok)) ||
      brandTokens.some((tok) => textLower.includes(tok));
    const matchesInContext =
      distinctiveTokens.some((tok) => sourceTitleLower.includes(tok)) ||
      brandTokens.some((tok) => sourceTitleLower.includes(tok));

    if (!matchesInText && !matchesInContext && !isUserSupplied) {
      rejectionBreakdown.notMatchingModel++;
      continue;
    }

    seenNormalized.add(normalized);
    accepted.push(comm);

    // Hard cap at 300 comments
    if (accepted.length >= 300) {
      break;
    }
  }

  const totalRejected =
    rejectionBreakdown.notMatchingModel +
    rejectionBreakdown.variantMismatch +
    rejectionBreakdown.otherGeneration +
    rejectionBreakdown.tooShort +
    rejectionBreakdown.duplicate;

  return {
    accepted,
    totalFetched: comments.length,
    totalRejected,
    rejectionBreakdown,
  };
}

/**
 * 4. Verbatim Quote Verification (Requirement 4)
 * Keep a quote only if it appears verbatim in the comment and is under 15 words.
 */
export function verifyAndCleanQuote(
  candidateQuote: string,
  commentText: string
): string | null {
  if (!candidateQuote || !commentText) return null;

  const cleanCand = candidateQuote
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim();

  if (!cleanCand) return null;

  const wordCount = cleanCand.split(/\s+/).filter(Boolean).length;
  if (wordCount > 15 || wordCount < 2) {
    return null;
  }

  const lowerQuote = cleanCand.toLowerCase();
  const lowerText = commentText.toLowerCase();

  const matchIdx = lowerText.indexOf(lowerQuote);
  if (matchIdx !== -1) {
    return commentText.slice(matchIdx, matchIdx + cleanCand.length).trim();
  }

  return null;
}

/**
 * Quote-Theme Consistency Validation (Requirement 4)
 * Validates that an issue category is genuinely supported by its quote.
 * Re-aligns categories if the concrete defect is fan noise rather than throttling,
 * or drops the pairing if there is zero semantic relationship.
 */
export function validateAndAlignQuoteCategory(
  category: string,
  quote: string
): { valid: boolean; alignedCategory: string; reason?: string } {
  if (!quote || !category) {
    return { valid: false, alignedCategory: category, reason: 'Missing quote or category' };
  }

  const qLower = quote.toLowerCase();
  const cLower = category.toLowerCase();

  // 1. Fan Noise vs Thermal Throttling / Overheating
  const hasFanTokens = /\b(fan|fans|loud|noise|whine|whining|hum|spin|spinning|rpm|blow)\b/i.test(qLower);
  const hasHeatTokens = /\b(throttl|thermal|overheat|hot|heat|burn|celsius|degree|warm|temperature|slowdown|stutter)\b/i.test(qLower);

  if (hasFanTokens && !hasHeatTokens && (cLower.includes('throttl') || cLower.includes('thermal') || cLower.includes('overheat'))) {
    // Quote is about fan noise, NOT thermal throttling!
    return {
      valid: true,
      alignedCategory: 'Aggressive fan noise under light loads',
    };
  }

  // 2. Display / Screen defects
  const isDisplayCat = cLower.includes('display') || cLower.includes('screen') || cLower.includes('amoled') || cLower.includes('oled') || cLower.includes('line');
  const hasDisplayTokens = /\b(screen|display|panel|oled|amoled|line|green line|bleed|grain|grainy|flicker|tint|color|pixel|brightness|dim)\b/i.test(qLower);
  if (isDisplayCat) {
    if (qLower.includes('green') && qLower.includes('line')) {
      return { valid: true, alignedCategory: 'Green vertical line on AMOLED display' };
    }
    if (qLower.includes('grain') || qLower.includes('grainy')) {
      return { valid: true, alignedCategory: 'Display grain texture at low brightness' };
    }
    if (!hasDisplayTokens) {
      return { valid: false, alignedCategory: category, reason: 'Quote lacks display terminology' };
    }
    return { valid: true, alignedCategory: category };
  }

  // 3. Battery & Power
  const isBatteryCat = cLower.includes('battery') || cLower.includes('drain') || cLower.includes('charging');
  const hasBatteryTokens = /\b(battery|drain|sot|screen on time|mah|discharg|hours of battery|charge|charging|charger|watt|plug)\b/i.test(qLower);
  if (isBatteryCat) {
    if (!hasBatteryTokens) {
      return { valid: false, alignedCategory: category, reason: 'Quote lacks battery terminology' };
    }
    return { valid: true, alignedCategory: category };
  }

  // 4. Camera & Optics
  const isCameraCat = cLower.includes('camera') || cLower.includes('photo') || cLower.includes('lens');
  const hasCameraTokens = /\b(camera|photo|raw|lens|sensor|shutter|blur|blurry|focus|zoom|megapixels|night mode)\b/i.test(qLower);
  if (isCameraCat) {
    if (!hasCameraTokens) {
      return { valid: false, alignedCategory: category, reason: 'Quote lacks camera terminology' };
    }
    return { valid: true, alignedCategory: category };
  }

  // 5. Chassis / Hinge Build
  const isBuildCat = cLower.includes('hinge') || cLower.includes('chassis') || cLower.includes('build') || cLower.includes('creak');
  const hasBuildTokens = /\b(hinge|crack|creak|wobble|bend|loose|chassis|body|lid|paint|peel|scratch|gap|stiff)\b/i.test(qLower);
  if (isBuildCat) {
    if (qLower.includes('hinge')) {
      return { valid: true, alignedCategory: 'Hinge cracking / stiffness' };
    }
    if (!hasBuildTokens) {
      return { valid: false, alignedCategory: category, reason: 'Quote lacks build terminology' };
    }
    return { valid: true, alignedCategory: category };
  }

  // 6. Connectivity (Wi-Fi / Bluetooth)
  const isConnCat = cLower.includes('wifi') || cLower.includes('wi-fi') || cLower.includes('bluetooth') || cLower.includes('network');
  const hasConnTokens = /\b(wifi|wi-fi|bluetooth|disconnect|drop|network|signal|reconnect|modem|slow)\b/i.test(qLower);
  if (isConnCat) {
    if (!hasConnTokens) {
      return { valid: false, alignedCategory: category, reason: 'Quote lacks connectivity terminology' };
    }
    return { valid: true, alignedCategory: category };
  }

  // 7. General hardware validation
  // Quote must describe a defect or problem
  const hasProblemSignal = /\b(issue|problem|defect|bad|fail|broken|crack|stuck|terrible|slow|bug|glitch|lag|error|poor|delay|worst)\b/i.test(qLower);
  if (!hasProblemSignal && !hasFanTokens && !hasHeatTokens && !hasBatteryTokens && !hasDisplayTokens && !hasCameraTokens && !hasBuildTokens && !hasConnTokens) {
    return { valid: false, alignedCategory: category, reason: 'Quote does not report a concrete hardware issue' };
  }

  return { valid: true, alignedCategory: category };
}

