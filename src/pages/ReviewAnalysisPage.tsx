import React, { useState, useEffect } from 'react';
import { Product, ReviewDataset, AspectSentiment, ReportedIssue, ReviewSourceStat } from '../types';
import { analyzePastedReviews } from '../services/gemini';
import { analyzeListingText } from '../services/research';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import {
  MessageSquareText,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Flame,
  CheckCircle2,
  FileText,
  Quote,
  ExternalLink,
  Layers,
  ShoppingBag,
  Youtube,
  Globe,
  Filter,
  Check,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface ReviewAnalysisPageProps {
  product: Product;
  onUpdateReviewData: (newData: ReviewDataset) => void;
  onUpdateProductData?: (updatedProduct: Partial<Product>) => void;
}

export const ReviewAnalysisPage: React.FC<ReviewAnalysisPageProps> = ({
  product,
  onUpdateReviewData,
  onUpdateProductData,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'reviews' | 'listing'>('reviews');
  const [pastedReviewText, setPastedReviewText] = useState('');
  const [pastedListingText, setPastedListingText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [listingSuccess, setListingSuccess] = useState<string | null>(null);

  const reviewData = product.reviewData;
  const hasReviews = Boolean(reviewData && reviewData.reviewCount > 0);

  // Lazy execution: Trigger review analysis when user opens Review Analysis if not yet run
  useEffect(() => {
    if (!product.reviewData || product.reviewData.reviewCount === 0) {
      handleFetchLiveReviews();
    }
  }, [product.id]);

  const handleFetchLiveReviews = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await fetch('/api/analyze-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          brand: product.brand,
          category: product.category,
          variant: product.selectedVariant,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Review analysis unavailable');
      }

      const data: ReviewDataset = await res.json();
      onUpdateReviewData(data);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Review analysis unavailable');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzePasteReviews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedReviewText.trim()) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    setListingSuccess(null);
    try {
      const result = await analyzePastedReviews(
        pastedReviewText.trim(),
        product.name,
        product.category
      );
      onUpdateReviewData(result);
      setPastedReviewText('');
    } catch (err: any) {
      setAnalyzeError(err.message || 'Review analysis unavailable');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzePasteListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedListingText.trim()) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    setListingSuccess(null);
    try {
      const result = await analyzeListingText(
        pastedListingText.trim(),
        product.name,
        product.category
      );

      if (result) {
        setListingSuccess(
          `Extracted listing intelligence: Seller ${result.seller || 'Identified'}, observed price ₹${
            result.priceInr ? result.priceInr.toLocaleString('en-IN') : 'unspecified'
          }.`
        );
        if (onUpdateProductData) {
          const updates: Partial<Product> = {};
          if (result.priceInr) {
            updates.priceInInr = {
              value: result.priceInr,
              evidenceType: 'verified',
              source: result.seller || 'Pasted Retailer Listing',
              date: new Date().toISOString().split('T')[0],
              notes: 'Extracted from user pasted store page',
            };
          }
          if (result.warrantyMonths) {
            updates.warranty = {
              ...product.warranty,
              standardWarrantyMonths: {
                value: result.warrantyMonths,
                evidenceType: 'verified',
                source: result.seller || 'Retailer Listing Policy',
                date: new Date().toISOString().split('T')[0],
              },
            };
          }
          onUpdateProductData(updates);
        }
      }
      setPastedListingText('');
    } catch (err: any) {
      setAnalyzeError(err.message || 'Failed to extract listing data.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Recharts data format: Aspect, Positive%, Neutral%, Negative%
  const chartData =
    reviewData && reviewData.aspects
      ? reviewData.aspects.map((asp) => ({
          name: asp.aspect,
          Positive: asp.positivePercentage,
          Neutral: asp.neutralPercentage,
          Negative: asp.negativePercentage,
          mentions: asp.totalMentions,
        }))
      : [];

  const sourcesList = reviewData?.sourcesConsultedList || [];
  const sourceStats = reviewData?.sourceStats || [];

  // Active source names for mandatory wording
  const activeSourceNames = sourceStats
    .filter((s) => s.commentsAnalyzed > 0)
    .map((s) => s.sourceName.split(':')[0].trim());

  const activeSourcesString =
    activeSourceNames.length > 0
      ? activeSourceNames.join(', ')
      : 'YouTube, Reddit, Team-BHP, TechEnclave, GSMArena';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Owner Discourse & Experience Analysis
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Customer Review & Issue Intelligence: {product.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Multi-source extraction across YouTube discussions and Indian community tech forums.
          </p>
        </div>

        <button
          onClick={handleFetchLiveReviews}
          disabled={analyzing}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100 flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${analyzing ? 'animate-spin' : ''}`} />
          <span>{analyzing ? 'Analyzing public comments & forum posts...' : 'Refresh review pipeline'}</span>
        </button>
      </div>

      {/* Mandatory Caveat Banner (Requirement 5) */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-semibold text-amber-900">
            Mandatory Rigor Standard:
          </strong>{' '}
          {reviewData?.summaryNotice ||
            `${reviewData?.reviewCount || 0} comments and forum posts analysed from [${activeSourcesString}]. This is a sample of public commenters, not all owners. Mentions are reported experiences, not defect rates.`}
        </div>
      </div>

      {/* Per-Source Pipeline Progress & Status Badges (Requirement 7) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-teal-700" />
            <span>Public Discussion Data Sources</span>
          </div>
          {analyzing && (
            <span className="text-xs text-teal-700 font-mono flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Fetching and classifying...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* YouTube Status Card */}
          {(() => {
            const yt = sourceStats.find((s) => s.sourceId === 'youtube');
            const isNoKey = yt?.status === 'no_key' || !yt;
            return (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-600" />
                    <span>YouTube Comments</span>
                  </span>
                  {isNoKey ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                      Skipped (No Key)
                    </span>
                  ) : yt?.status === 'ok' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active ({yt.commentsAnalyzed} analyzed)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900">
                      {yt?.status || 'Idle'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {isNoKey
                    ? 'YOUTUBE_API_KEY not configured in environment. Pipeline skips YouTube without errors.'
                    : yt?.message || `${yt?.commentsFetched || 0} fetched, ${yt?.commentsRejected || 0} filtered`}
                </p>
              </div>
            );
          })()}

          {/* Forums Status Card */}
          {(() => {
            const tav = sourceStats.find((s) => s.sourceId === 'tavily');
            return (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>Tech Forums & Reddit</span>
                  </span>
                  {tav?.status === 'ok' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active ({tav.commentsAnalyzed} analyzed)
                    </span>
                  ) : tav?.status === 'no_key' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                      No Key
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                      {tav?.status || 'Ready'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Reddit, Team-BHP, TechEnclave, GSMArena ({tav?.commentsFetched || 0} fetched).
                </p>
              </div>
            );
          })()}

          {/* Filtering Summary Card */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-teal-600" />
                <span>Token & Variant Filter</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">
                {reviewData?.totalCommentsRejected || 0} Rejected
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {reviewData?.rejectionBreakdown && (reviewData.rejectionBreakdown as any).variantMismatch > 0
                ? `${(reviewData.rejectionBreakdown as any).variantMismatch} conflicting variants/gens rejected, ${reviewData.rejectionBreakdown.duplicate} duplicates removed.`
                : 'Enforces distinctive model tokens, rejects other generations/variants, and deduplicates.'}
            </p>
          </div>
        </div>
      </div>

      {/* Error state if analysis fails or API key missing */}
      {analyzeError && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-900">Review analysis unavailable</h3>
            <p className="text-xs text-rose-700 mt-1">{analyzeError}</p>
          </div>
          <button
            onClick={handleFetchLiveReviews}
            className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry review pipeline</span>
          </button>
        </div>
      )}

      {/* Reviews Summary Header if Present */}
      {hasReviews && reviewData ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <EvidenceBadge
                  type={reviewData.sampleType === 'licensed' ? 'verified' : 'user-provided'}
                  source={reviewData.source}
                />
                <span className="text-xs text-slate-500">
                  {reviewData.dateRange}
                </span>
              </div>
              <div className="text-base font-bold text-slate-900">
                <span className="font-mono tabular-nums">{reviewData.reviewCount} public comments and forum posts analyzed</span>
                {sourcesList.length > 0 && (
                  <span className="text-slate-500 font-normal text-xs ml-2">
                    across {sourcesList.length} verified discussion URLs
                  </span>
                )}
              </div>

              {/* List of consulted source URLs */}
              {sourcesList.length > 0 && (
                <div className="pt-1 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-teal-700" />
                    <span>Discussion URLs Consulted ({sourcesList.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {sourcesList.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-[11px] text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors"
                      >
                        <span className="truncate max-w-xs">{src.title}</span>
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-700 hover:text-teal-900 ml-0.5"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const element = document.getElementById('paste-input-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-teal-800 hover:text-teal-900 border border-teal-200 bg-teal-50/60 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto shrink-0"
            >
              + Add User-Pasted Sample
            </button>
          </div>

          {/* Sentiment by Aspect Chart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Aspect Sentiment Breakdown (%)
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Positive / Neutral / Negative Public Mentions
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={140} stroke="#64748b" fontSize={11} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-lg space-y-1">
                              <div className="font-bold">{data.name}</div>
                              <div className="text-emerald-400">Positive: {data.Positive}%</div>
                              <div className="text-slate-300">Neutral: {data.Neutral}%</div>
                              <div className="text-red-400">Negative: {data.Negative}%</div>
                              <div className="text-slate-400 pt-1 border-t border-slate-700">
                                Total mentions: {data.mentions}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Positive" fill="#059669" stackId="a" />
                    <Bar dataKey="Neutral" fill="#94a3b8" stackId="a" />
                    <Bar dataKey="Negative" fill="#dc2626" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No aspect mentions extracted from this sample.</p>
            )}
          </div>

          {/* Specific Reported Defect & Hardware Issue Themes */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>Reported Hardware Defect & Experience Themes</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Experiences documented across public forums and user discussions in India.
                </p>
              </div>
            </div>

            {reviewData.reportedIssues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewData.reportedIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-xs text-slate-900">
                          {issue.category}
                        </span>
                        {/* Requirement 5: Repeated theme badge only if 3+ comments across 2+ sources */}
                        {issue.isRepeatedTheme && (
                          <div className="inline-block mt-0.5 ml-2 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-semibold">
                            Repeated Theme (3+ comments across {issue.distinctSourcesCount || 2}+ sources)
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          issue.frequency === 'High'
                            ? 'bg-red-100 text-red-800'
                            : issue.frequency === 'Moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {issue.mentionCount} Mentions ({issue.frequency})
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {issue.description}
                    </p>

                    {/* Sources Mentioning this Issue */}
                    {issue.sourcesMentioning && issue.sourcesMentioning.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Sources reporting this:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {issue.sourcesMentioning.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700"
                            >
                              <span className="truncate max-w-xs">{src.title}</span>
                              {src.url && (
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-700 hover:text-teal-900"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verified verbatim quotes with source links */}
                    {issue.verifiedQuotes && issue.verifiedQuotes.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {issue.verifiedQuotes.map((vq, qIdx) => (
                          <div
                            key={qIdx}
                            className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1"
                          >
                            <div className="flex items-start gap-1.5">
                              <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                              <span>"{vq.quote}"</span>
                            </div>
                            {vq.sourceUrl && (
                              <div className="text-[10px] text-slate-400 text-right">
                                <a
                                  href={vq.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-700 hover:text-teal-900 inline-flex items-center gap-0.5 underline"
                                >
                                  <span>{vq.sourceTitle || 'View Discussion'}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : issue.sampleQuotes && issue.sampleQuotes.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {issue.sampleQuotes.map((quote, qIdx) => (
                          <div
                            key={qIdx}
                            className="text-xs text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200/80 flex items-start gap-1.5"
                          >
                            <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>"{quote}"</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {issue.statusOrFix && (
                      <div className="text-[11px] text-teal-800 bg-teal-50 p-2 rounded border border-teal-200">
                        <strong>Brand policy / resolution:</strong> {issue.statusOrFix}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No recurring hardware issues reported in this comment sample.</p>
            )}
          </div>
        </div>
      ) : !analyzing && !analyzeError ? (
        /* Empty / Initial State */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <MessageSquareText className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-bold text-slate-900">
              No Public Review Dataset Attached
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              In accordance with our strict transparency policy, WorthIt AI does not synthesize fake reviews.
            </p>
          </div>
          <button
            onClick={handleFetchLiveReviews}
            className="px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Search & Analyze Public Reviews Now</span>
          </button>
        </div>
      ) : null}

      {/* Paste & Analyze User Section with Two Options (Preserved for Custom User Input) */}
      <div id="paste-input-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
        {/* Tab Selectors */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setActiveInputTab('reviews');
              setAnalyzeError(null);
            }}
            className={`py-2 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeInputTab === 'reviews'
                ? 'border-teal-700 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-700" />
            <span>Option A: Paste Customer Reviews / Forum Discussions</span>
          </button>
          <button
            onClick={() => {
              setActiveInputTab('listing');
              setAnalyzeError(null);
            }}
            className={`py-2 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeInputTab === 'listing'
                ? 'border-teal-700 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-teal-700" />
            <span>Option B: Paste Retailer Product Listing Text</span>
          </button>
        </div>

        {/* Tab 1: Customer Reviews */}
        {activeInputTab === 'reviews' && (
          <form onSubmit={handleAnalyzePasteReviews} className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-slate-500">
                Paste customer review snippets or forum discussions for {product.name}. Labelled as "user-supplied sample". Gemini classifies aspects, sentiment percentages, and issue themes objectively without inventing facts.
              </p>
            </div>

            <textarea
              required
              rows={5}
              value={pastedReviewText}
              onChange={(e) => setPastedReviewText(e.target.value)}
              placeholder={`Paste customer reviews for ${product.name} here...\n\nExample:\n"The battery easily gives 12-14 hours. Keyboard is wonderful. But 8GB RAM gets saturated fast when running Docker. Service center in Bengaluru took 2 weeks to replace a cracked hinge."`}
              className="w-full text-xs font-mono rounded-xl border border-slate-300 p-3.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600 placeholder:text-slate-400"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Input treated as untrusted text. No HTML rendered.
              </span>
              <button
                type="submit"
                disabled={analyzing || !pastedReviewText.trim()}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{analyzing ? 'Classifying...' : 'Classify User Reviews'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Retailer Listing Text */}
        {activeInputTab === 'listing' && (
          <form onSubmit={handleAnalyzePasteListing} className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-slate-500">
                Paste text copied directly from an Indian retail store page (e.g. Amazon.in, Flipkart, Croma, Brand portal).
              </p>
            </div>

            <textarea
              required
              rows={5}
              value={pastedListingText}
              onChange={(e) => setPastedListingText(e.target.value)}
              placeholder="Paste raw webpage text copied from product listing..."
              className="w-full text-xs font-mono rounded-xl border border-slate-300 p-3.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600 placeholder:text-slate-400"
            />

            {listingSuccess && (
              <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{listingSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Zero HTML scraping. Only user-pasted text parsed.
              </span>
              <button
                type="submit"
                disabled={analyzing || !pastedListingText.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{analyzing ? 'Extracting...' : 'Extract Specs & Pricing'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
