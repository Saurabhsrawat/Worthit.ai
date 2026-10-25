import React, { useState } from 'react';
import { Product, ReviewDataset, AspectSentiment, ReportedIssue } from '../types';
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
  const hasReviews = reviewData && reviewData.reviewCount > 0;

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
      setAnalyzeError(err.message || 'Failed to classify review sample.');
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
          `Extracted listing intelligence: Seller ${result.seller || 'Identified'}, observed price ₹${result.priceInr ? result.priceInr.toLocaleString('en-IN') : 'unspecified'}.`
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
  const chartData = hasReviews
    ? reviewData.aspects.map((asp) => ({
        name: asp.aspect,
        Positive: asp.positivePercentage,
        Neutral: asp.neutralPercentage,
        Negative: asp.negativePercentage,
        mentions: asp.totalMentions,
      }))
    : [];

  const sourcesCount = reviewData?.sourcesConsultedCount || reviewData?.sourcesConsultedList?.length || 0;
  const sourcesList = reviewData?.sourcesConsultedList || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Owner Discourse & Experience Analysis
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Review & Issue Intelligence: {product.name}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Evidence-based extraction of reported user experiences in India. We do not claim to have read all reviews.
        </p>
      </div>

      {/* Mandatory Caveat Banner */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-semibold text-amber-900">
            Mandatory Rigor Standard:
          </strong>{' '}
          Review mentions are reported user experiences, not statistical defect rates. We never state "15% of owners experience hardware issues." Online discussions inherently skew toward problems. Treat these as signals to inspect during your replacement window.
        </div>
      </div>

      {/* Reviews Summary Header if Present */}
      {hasReviews ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <EvidenceBadge
                  type={reviewData.sampleType === 'licensed' ? 'verified' : 'ai-interpretation'}
                  source={reviewData.source}
                />
                <span className="text-xs text-slate-500">
                  {reviewData.dateRange}
                </span>
              </div>
              <div className="text-base font-bold text-slate-900">
                {sourcesCount > 0 ? (
                  <span>Based on {sourcesCount} sources consulted in India</span>
                ) : (
                  <span className="font-mono tabular-nums">{reviewData.reviewCount} customer reviews analyzed</span>
                )}
              </div>

              {/* List of consulted sources */}
              {sourcesList.length > 0 && (
                <div className="pt-1 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-teal-700" />
                    <span>Sources Consulted ({sourcesList.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sourcesList.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-[11px] text-slate-800 border border-slate-200"
                      >
                        <span>{src.title}</span>
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
              + Analyze Additional Text
            </button>
          </div>

          {/* Sentiment by Aspect Chart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Aspect Sentiment Breakdown (%)
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Positive / Neutral / Negative Mentions
              </span>
            </div>

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
          </div>

          {/* Specific Reported Defect & Hardware Issue Themes */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>Reported Hardware Defect & Failure Themes</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recurring issues documented across forum posts, Reddit, and user reviews in India.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewData.reportedIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      {issue.category}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        issue.frequency === 'High'
                          ? 'bg-red-100 text-red-800'
                          : issue.frequency === 'Moderate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {issue.frequency} Signal
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
                            <span>{src.title}</span>
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

                  {issue.sampleQuotes && issue.sampleQuotes.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {issue.sampleQuotes.map((quote, qIdx) => (
                        <div key={qIdx} className="text-xs text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200/80 flex items-start gap-1.5">
                          <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span>"{quote}"</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {issue.statusOrFix && (
                    <div className="text-[11px] text-teal-800 bg-teal-50 p-2 rounded border border-teal-200">
                      <strong>Brand policy / resolution:</strong> {issue.statusOrFix}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <MessageSquareText className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-bold text-slate-900">
              No Permitted Review Dataset Attached
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              In accordance with our strict transparency policy, WorthIt AI does not synthesize fake reviews.
            </p>
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl max-w-lg mx-auto border border-slate-200">
            <strong>How to analyze:</strong> You can paste review snippets from public forums or paste the text of a product page listing below. Gemini will classify aspects, sentiment, and quotes objectively.
          </div>
        </div>
      )}

      {/* Paste & Analyze User Section with Two Options */}
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
                Paste customer review snippets or forum discussions for {product.name}. Gemini classifies aspects, sentiment percentages, and issue themes objectively without inventing facts.
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

            {analyzeError && (
              <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{analyzeError}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Input treated as untrusted text. No HTML rendered.
              </span>
              <button
                type="submit"
                disabled={analyzing || !pastedReviewText.trim()}
                className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Classifying Aspects via Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                    <span>Analyze Review Sample</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Listing Text Analysis */}
        {activeInputTab === 'listing' && (
          <form onSubmit={handleAnalyzePasteListing} className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-slate-500">
                Copy and paste the plain text of an Indian e-commerce listing (Amazon.in, Flipkart, Croma, Reliance Digital). Gemini will extract specs, seller details, warranty policy, and observed retail price without scraping.
              </p>
            </div>

            <textarea
              required
              rows={5}
              value={pastedListingText}
              onChange={(e) => setPastedListingText(e.target.value)}
              placeholder={`Paste product listing text (e.g. from Amazon.in or Flipkart page) here...\n\nExample:\n"ASUS Vivobook 15 (2024), AMD Ryzen 5 7530U, 15.6-inch FHD, 16GB RAM/512GB SSD, Windows 11. Sold by Appario Retail. ₹45,990 incl. taxes. 1 Year Onsite Warranty."`}
              className="w-full text-xs font-mono rounded-xl border border-slate-300 p-3.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600 placeholder:text-slate-400"
            />

            {analyzeError && (
              <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{analyzeError}</span>
              </div>
            )}

            {listingSuccess && (
              <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{listingSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Pasted listing extracted as structured facts and user observation.
              </span>
              <button
                type="submit"
                disabled={analyzing || !pastedListingText.trim()}
                className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing Listing via Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                    <span>Extract Listing Intelligence</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
