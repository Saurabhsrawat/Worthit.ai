import React, { useState, useEffect } from 'react';
import { Product, ProductSpecs, UserPreferences, WorthItScoreResult, UserFeedbackReport, PriceQuote, ConflictingEvidence, GroundedSource } from '../types';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import { DataCompletenessMeter } from '../components/common/DataCompletenessMeter';
import { FeedbackModal } from '../components/common/FeedbackModal';
import { SpecEditModal } from '../components/common/SpecEditModal';
import { PersonalReview } from '../components/PersonalReview';
import { ResearchDebugPanel } from '../components/ResearchDebugPanel';
import { calculateOwnershipCost, getDefaultOwnershipInputs } from '../lib/ownershipCost';
import {
  Bookmark,
  BookmarkCheck,
  Scale,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Edit2,
  RefreshCw,
  IndianRupee,
  ShieldCheck,
  Wrench,
  Cpu,
  Battery,
  HardDrive,
  Monitor,
  Flame,
  ArrowRight,
  Store,
  Clock,
  Layers,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface DashboardPageProps {
  product: Product;
  scoreResult: WorthItScoreResult;
  preferences?: UserPreferences;
  onUpdatePreferences?: (prefs: UserPreferences) => void;
  isSaved: boolean;
  isCompared: boolean;
  compareCount?: number;
  onToggleSave: () => void;
  onToggleCompare: () => void;
  onNavigateToCompare?: () => void;
  onUpdateUserPrice: (priceInr: number) => void;
  onNavigateToReviews: () => void;
  onNavigateToCost: () => void;
  onNavigateToPreferences: () => void;
  onSubmitFeedback: (report: UserFeedbackReport) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  onUpdateSpecs?: (specs: ProductSpecs) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  product,
  scoreResult,
  preferences,
  onUpdatePreferences,
  isSaved,
  isCompared,
  compareCount = 0,
  onToggleSave,
  onToggleCompare,
  onNavigateToCompare,
  onUpdateUserPrice,
  onNavigateToReviews,
  onNavigateToCost,
  onNavigateToPreferences,
  onSubmitFeedback,
  onRefreshData,
  isRefreshing = false,
  onUpdateSpecs,
}) => {
  const [userPriceInput, setUserPriceInput] = useState('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [specEditOpen, setSpecEditOpen] = useState(false);
  const [thumbFeedback, setThumbFeedback] = useState<'up' | 'down' | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(product.provenance?.retryAfterSeconds || 0);

  const [repairData, setRepairData] = useState<any>(product.repairability);
  const [isRepairLoading, setIsRepairLoading] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualBattery, setManualBattery] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const [manualNotes, setManualNotes] = useState('');

  // Sync repairData when product changes
  useEffect(() => {
    setRepairData(product.repairability);
  }, [product.id, product.repairability]);

  const handleFetchRepairability = async (force: boolean = true) => {
    if (isRepairLoading) return;
    setIsRepairLoading(true);
    setRepairError(null);
    try {
      const res = await fetch('/api/research/repairability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (data.repairability) {
        setRepairData(data.repairability);
        product.repairability = {
          ...product.repairability,
          ...data.repairability,
        };
        if (data.debugInfo) {
          if (!(product as any).researchDebug) {
            (product as any).researchDebug = {};
          }
          (product as any).researchDebug.repairability = data.debugInfo;
        }
      } else if (data.error) {
        setRepairError(data.error);
      }
    } catch (err: any) {
      setRepairError(err.message || 'Failed to fetch repairability data');
    } finally {
      setIsRepairLoading(false);
    }
  };

  const handleSaveManualRepairability = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...repairData,
      batteryReplaceable: manualBattery !== 'unknown' ? {
        value: manualBattery === 'yes',
        evidenceType: 'user-provided',
        source: 'User contribution',
        sourceUrl: '',
        retrievedAt: new Date().toISOString(),
      } : repairData?.batteryReplaceable,
      notes: manualNotes.trim() ? {
        value: manualNotes.trim(),
        evidenceType: 'user-provided',
        source: 'User contribution',
        sourceUrl: '',
        retrievedAt: new Date().toISOString(),
      } : repairData?.notes,
    };
    setRepairData(updated);
    product.repairability = {
      ...product.repairability,
      ...updated,
    };
    setIsManualModalOpen(false);
  };

  useEffect(() => {
    if (product.provenance?.retryAfterSeconds) {
      setRetryCountdown(product.provenance.retryAfterSeconds);
    }
  }, [product.provenance?.retryAfterSeconds]);

  useEffect(() => {
    if (retryCountdown <= 0) return;
    const interval = setInterval(() => {
      setRetryCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [retryCountdown]);

  const priceVal = product.priceInInr?.value;
  const priceType = product.priceInInr?.evidenceType || 'unknown';

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(userPriceInput.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(val) && val > 0) {
      onUpdateUserPrice(val);
      setIsEditingPrice(false);
    }
  };

  // Ownership cost quick calculation
  const tcoInputs = getDefaultOwnershipInputs(
    product.category,
    priceVal || 0,
    priceType,
    preferences?.expectedOwnershipYears || 3
  );
  const tcoResult = calculateOwnershipCost(tcoInputs);

  // Dimension chart data
  const chartData = scoreResult.dimensions.map((d) => ({
    name: d.name.replace(' & Support Evidence', '').replace(' for Intended Use', '').replace(' Relative to Budget', ''),
    score: d.active ? d.score : 0,
    active: d.active,
    weight: Math.round(d.weight * 100),
    coverage: d.evidenceCoverage,
  }));

  const formattedRetrievedDate = product.retrievedAt
    ? new Date(product.retrievedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : product.lastUpdated;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Provenance Banners */}
      {product.isDemonstrationData ? (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Demonstration data, verify before relying on it:</strong> This product profile is pre-seeded for demonstration. Click <em>Refresh live data</em> to execute fresh grounded research across Indian retailers.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                disabled={isRefreshing}
                className="px-2.5 py-1 text-xs font-semibold bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg transition-colors flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh live data'}</span>
              </button>
            )}
            <button
              onClick={() => setFeedbackOpen(true)}
              className="text-amber-800 underline hover:text-amber-950 font-medium whitespace-nowrap"
            >
              Report correction
            </button>
          </div>
        </div>
      ) : product.provenance?.reason === 'no_search_key' ? (
        <div className="bg-blue-50/90 border-2 border-blue-300 rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3 text-xs text-blue-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold">
                Add a free Tavily key to enable live research:
              </span>
              <span className="text-blue-800 ml-1">
                Configure TAVILY_API_KEY in your environment to fetch live web pages and retail prices from Indian stores. Displaying AI-recalled hardware specs and absolute reference ratings.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSpecEditOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-300 transition-colors"
            >
              Confirm / Edit Specs
            </button>
          </div>
        </div>
      ) : product.provenance?.status === 'unavailable' ? (
        <div className="bg-rose-50/90 border-2 border-rose-300 rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3 text-xs text-rose-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">
                Live research unavailable, retry in {retryCountdown > 0 ? `${retryCountdown}s` : 'a few moments'}.
              </span>
              <span className="text-rose-800 ml-1">
                {product.provenance?.reason === 'quota'
                  ? 'Grounded search quota cooldown is active. Displaying local hardware analysis or unverified AI spec recall.'
                  : 'Search providers returned no verified documents or encountered an error. You can manually enter or confirm specs.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSpecEditOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg border border-rose-300 transition-colors"
            >
              Confirm / Edit Specs
            </button>
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                disabled={isRefreshing || retryCountdown > 0}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      ) : product.provenance?.status === 'partial' ? (
        <div className="bg-sky-50/90 border-2 border-sky-300 rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3 text-xs text-sky-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <span className="font-bold">Partial live data:</span>
              <span className="text-sky-800 ml-1">
                Verified core specifications from {product.provenance?.groundingChunkCount || 0} grounded sources. Some secondary sections (such as warranty policies or repair teardowns) could not be verified without guessing.
              </span>
            </div>
          </div>
          <button
            onClick={() => setSpecEditOpen(true)}
            className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-sky-100 text-sky-900 rounded-lg border border-sky-300 transition-colors shrink-0"
          >
            Review Specs
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Live data:</span>
              <span className="text-emerald-800 ml-1">
                Full research verified with {product.provenance?.groundingChunkCount || product.sourcesConsultedCount || product.sourcesConsulted?.length || 0} real-time grounded sources across Indian retailers and official spec sheets.
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
            Live Verified
          </span>
        </div>
      )}

      {/* Conflicting Evidence Banner (if any discrepancies detected) */}
      {product.conflictingSources && product.conflictingSources.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Source Discrepancies Flagged in India</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            Different verified sources report conflicting information for this product variant in India. Rather than guessing, WorthIt AI transparently presents both claims:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {product.conflictingSources.map((conflict, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-xl border border-amber-200 text-xs space-y-2">
                <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] text-amber-900">
                  Field: {conflict.field}
                </div>
                <div className="space-y-1">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="font-medium text-slate-800">Claim A: </span>
                    <span>{conflict.claimA.claim}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Source: {conflict.claimA.source}
                      {conflict.claimA.sourceUrl && (
                        <a
                          href={conflict.claimA.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-700 underline ml-1 inline-flex items-center"
                        >
                          link <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="font-medium text-slate-800">Claim B: </span>
                    <span>{conflict.claimB.claim}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Source: {conflict.claimB.source}
                      {conflict.claimB.sourceUrl && (
                        <a
                          href={conflict.claimB.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-700 underline ml-1 inline-flex items-center"
                        >
                          link <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {conflict.explanation && (
                  <p className="text-[11px] text-slate-600 italic">
                    Note: {conflict.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header Block: Product Identity & Score Lockup */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{product.brand}</span>
              <span>·</span>
              <span className="capitalize">{product.category}</span>
              <span>·</span>
              <span>Released {product.releaseYear}</span>
              <span>·</span>
              <span className="font-mono tabular-nums flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Retrieved: {formattedRetrievedDate}
              </span>
              {product.isLiveFetched && (
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                  Live Grounded Data
                </span>
              )}
              {product.selectedVariant && (
                <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-teal-600" />
                  Variant: {product.selectedVariant}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {product.name}
            </h1>

            {/* Per-Section States (Requirement 6) */}
            {product.sectionStatuses && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-400 font-semibold mr-1">Section States:</span>
                {Object.entries(product.sectionStatuses).map(([sec, info]) => {
                  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (info.state === 'loaded') badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (info.state === 'partial') badgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
                  if (info.state === 'failed') badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                  if (info.state === 'quota-cooldown') badgeClass = 'bg-amber-50 text-amber-900 border-amber-300';
                  return (
                    <span
                      key={sec}
                      className={`px-2 py-0.5 rounded border capitalize font-mono ${badgeClass}`}
                      title={info.reason || ''}
                    >
                      {sec}: {info.state === 'quota-cooldown' ? 'Quota cooldown' : info.state}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Price display or user-price input */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {priceVal && priceVal > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
                    ₹{priceVal.toLocaleString('en-IN')}
                  </span>
                  <EvidenceBadge
                    type={priceType}
                    source={product.priceInInr?.source}
                    sourceUrl={product.priceInInr?.sourceUrl}
                    date={product.priceInInr?.date}
                  />
                  <button
                    onClick={() => {
                      setUserPriceInput(String(priceVal));
                      setIsEditingPrice(!isEditingPrice);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-700 p-1 rounded"
                    title="Change or set observed retail price"
                    aria-label="Edit observed price"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceBadge type="unknown" />
                  <span className="text-xs text-slate-500">
                    Retail price not verified in seed data.
                  </span>
                  <button
                    onClick={() => setIsEditingPrice(!isEditingPrice)}
                    className="text-xs font-semibold text-teal-800 hover:text-teal-900 underline"
                  >
                    Enter your observed price
                  </button>
                </div>
              )}

              {/* Price Editor Form */}
              {isEditingPrice && (
                <form onSubmit={handlePriceSubmit} className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={userPriceInput}
                      onChange={(e) => setUserPriceInput(e.target.value)}
                      placeholder="e.g. 59999"
                      className="text-xs pl-6 pr-2 py-1.5 rounded-lg border border-slate-300 font-mono tabular-nums w-32 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPrice(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 px-2"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100 disabled:opacity-50"
                  title="Run live grounded search pipeline to update specs, prices, and issues"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Refreshing via Gemini...' : 'Refresh data'}</span>
                </button>
              )}

              <button
                onClick={onToggleSave}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                  isSaved
                    ? 'bg-teal-50 border-teal-300 text-teal-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-teal-700" /> : <Bookmark className="w-3.5 h-3.5" />}
                <span>{isSaved ? 'Saved in Shortlist' : 'Save to Shortlist'}</span>
              </button>

              <button
                onClick={isCompared && onNavigateToCompare ? onNavigateToCompare : onToggleCompare}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                  isCompared
                    ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title={isCompared ? 'View in Side-by-Side Comparison' : 'Add device to comparison tray'}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>
                  {isCompared
                    ? `In comparison (${compareCount}/4), view`
                    : compareCount >= 4
                    ? 'Comparison full (4/4)'
                    : `Add to comparison (${compareCount}/4)`}
                </span>
              </button>

              <button
                onClick={onNavigateToPreferences}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                Adjust Workload Criteria
              </button>
            </div>
          </div>

          {/* WorthIt Score Showcase Widget */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 shrink-0 lg:w-80 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  WorthIt Score
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Provisional Weights
                </span>
              </div>

              {scoreResult.isInsufficientEvidence ? (
                <div className="pt-3 space-y-1">
                  <div className="text-base font-bold text-amber-800">
                    Insufficient Evidence
                  </div>
                  <p className="text-xs text-slate-500">
                    Too few verified parameters are available to generate a responsible rating without arbitrary guessing.
                  </p>
                </div>
              ) : (
                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-teal-900 font-mono tabular-nums">
                      {scoreResult.overallScore}
                    </span>
                    <span className="text-base font-semibold text-slate-400">/100</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 font-medium">
                    Score based on {scoreResult.activeDimensionCount} of {scoreResult.totalDimensionCount} measurable dimensions.
                  </div>
                </div>
              )}
            </div>

            <DataCompletenessMeter score={product.dataCompleteness} />
          </div>
        </div>

        {/* Multi-Seller Indian Price Quotes Table */}
        {product.priceQuotes && product.priceQuotes.length > 0 && (
          <div className="pt-6 border-b border-slate-100 pb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-teal-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Current Indian Retail Price Quotes
                </h2>
              </div>
              <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                Indicative, verify on the seller's site
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Seller / Platform</th>
                    <th className="py-2.5 px-3 font-mono">Price (INR)</th>
                    <th className="py-2.5 px-3">Status / Notes</th>
                    <th className="py-2.5 px-3">Retrieved</th>
                    <th className="py-2.5 px-3 text-right">Source Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.priceQuotes.map((quote, qIdx) => (
                    <tr key={qIdx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {quote.seller}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 tabular-nums">
                        ₹{quote.priceInr.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {quote.notes || 'Current online listing'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono tabular-nums text-[11px]">
                        {quote.retrievedAt ? quote.retrievedAt.split('T')[0] : product.lastUpdated}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {quote.sourceUrl ? (
                          <a
                            href={quote.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1 hover:underline"
                          >
                            <span>Verify</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No link</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * Indicative, verify on the seller's site. Prices in India fluctuate based on bank offers, exchange bonuses, and seasonal sales.
            </p>
          </div>
        )}

        {/* Plain Language Recommendation Explanation with Anti-Slop Discipline */}
        <div className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Plain-Language Decision Explanation
            </h2>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>Was this helpful?</span>
              <button
                onClick={() => setThumbFeedback(thumbFeedback === 'up' ? null : 'up')}
                className={`p-1 rounded hover:bg-slate-100 ${thumbFeedback === 'up' ? 'text-teal-700 font-bold' : ''}`}
                aria-label="Thumbs up"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setThumbFeedback(thumbFeedback === 'down' ? null : 'down')}
                className={`p-1 rounded hover:bg-slate-100 ${thumbFeedback === 'down' ? 'text-red-700 font-bold' : ''}`}
                aria-label="Thumbs down"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed space-y-2">
            <p>{scoreResult.verdictSummary}</p>
            <p className="text-xs text-slate-500 italic pt-1">
              Reminder: A lower score does not signify that a device is unreliable or broken; it often reflects a misalignment with your specific budget ceiling, shorter software support cycles, or soldered non-upgradable hardware.
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible Research Debug & Claim Audit Panel (Requirement 1: Visible in dev mode or via ?debug=1) */}
      <ResearchDebugPanel product={product} />

      {/* Your Personal Review (Headline verdict, written review, strong points, watch-outs, scorecard, suitedness) */}
      <PersonalReview
        product={product}
        preferences={preferences}
        userPrice={priceVal || undefined}
        onUpdatePreferences={(updated) => {
          if (onUpdatePreferences) {
            onUpdatePreferences(updated);
          }
        }}
        onOpenFeedback={() => setFeedbackOpen(true)}
        onSubmitFeedback={onSubmitFeedback}
      />

      {/* Grid: Strengths, Tradeoffs & Reported Issue Signals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Demonstrated Strengths</span>
          </div>
          <ul className="text-xs text-slate-700 space-y-2">
            {scoreResult.strengths.map((s, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Reported Issue Signals */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
              <Flame className="w-4 h-4 text-amber-600" />
              <span>Reported Issue Signals</span>
            </div>
            <button
              onClick={onNavigateToReviews}
              className="text-[11px] text-teal-800 hover:underline font-semibold"
            >
              Analyze Reviews →
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Reported experiences from customer forums and owner discourse in India.
          </p>
          <ul className="text-xs text-slate-700 space-y-2">
            {scoreResult.issueSignals.map((sig, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trade-offs & Limitations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 text-sm font-bold">
            <Scale className="w-4 h-4 text-slate-600" />
            <span>Key Trade-offs</span>
          </div>
          <ul className="text-xs text-slate-700 space-y-2">
            {scoreResult.tradeoffs.map((t, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Transparent Score Dimension Breakdown (Chart + Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Transparent Score Breakdown
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Provisional design weights calibrate live with your preference sliders. Dimensions without reliable evidence are excluded and weights renormalized.
          </p>
        </div>

        {/* Recharts Bar Chart of Dimensions */}
        <div className="h-60 w-full pt-2">
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
                        <div>Score: {data.score}/100</div>
                        <div>Weight: {data.weight}%</div>
                        <div>Coverage: {data.coverage}%</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.active ? '#0f766e' : '#cbd5e1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table representation with anti-slop clarity */}
        <div className="overflow-x-auto border-t border-slate-100 pt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2 px-3">Evaluation Dimension</th>
                <th className="py-2 px-3 font-mono">Weight</th>
                <th className="py-2 px-3 font-mono">Score</th>
                <th className="py-2 px-3">Evidence Completeness</th>
                <th className="py-2 px-3">Rationale & Missing Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scoreResult.dimensions.map((dim, idx) => (
                <tr key={idx} className={dim.active ? '' : 'bg-slate-50/60 opacity-70'}>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {dim.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                    {Math.round(dim.weight * 100)}%
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-slate-900">
                    {dim.active ? `${dim.score}/100` : 'Excluded'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono tabular-nums text-slate-600 font-medium">
                      {dim.evidenceCoverage}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {dim.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verified Specs, Warranty & Repairability Evidence Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardware Specifications with Evidence Badges */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-700" />
              <span>Hardware Specification Evidence</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSpecEditOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg border border-teal-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Edit2 className="w-3 h-3 text-teal-700" />
                <span>Edit / Confirm Specs</span>
              </button>
              <span className="text-xs text-slate-500 font-mono hidden sm:inline">Indian Variant</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Processor */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">Processor / SoC</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">
                  {product.specs.processor?.value || 'Unknown / not verified'}
                </span>
                <EvidenceBadge
                  type={product.specs.processor?.evidenceType || 'unknown'}
                  source={product.specs.processor?.source}
                  sourceUrl={product.specs.processor?.sourceUrl}
                />
              </div>
            </div>

            {/* RAM */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">RAM Configuration</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">
                  {product.specs.ram?.value || 'Unknown / not verified'}
                </span>
                <EvidenceBadge
                  type={product.specs.ram?.evidenceType || 'unknown'}
                  source={product.specs.ram?.source}
                />
              </div>
            </div>

            {/* Storage */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">Internal Storage</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">
                  {product.specs.storage?.value || 'Unknown / not verified'}
                </span>
                <EvidenceBadge
                  type={product.specs.storage?.evidenceType || 'unknown'}
                  source={product.specs.storage?.source}
                />
              </div>
            </div>

            {/* Display */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">Display Panel</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">
                  {product.specs.display?.value || 'Unknown / not verified'}
                </span>
                <EvidenceBadge
                  type={product.specs.display?.evidenceType || 'unknown'}
                  source={product.specs.display?.source}
                />
              </div>
            </div>

            {/* Battery Life */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">Real-World Battery Life</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">
                  {product.specs.batteryLifeHours?.value
                    ? `~${product.specs.batteryLifeHours.value} Hours`
                    : product.specs.batteryCapacity?.value || 'Unknown / not verified'}
                </span>
                <EvidenceBadge
                  type={product.specs.batteryLifeHours?.evidenceType || 'unknown'}
                  source={product.specs.batteryLifeHours?.source}
                />
              </div>
            </div>

            {/* Weight */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">Chassis Weight</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">
                  {product.specs.weightKg?.value
                    ? `${product.specs.weightKg.value} kg`
                    : 'Unknown / not verified'}
                </span>
                <EvidenceBadge
                  type={product.specs.weightKg?.evidenceType || 'unknown'}
                  source={product.specs.weightKg?.source}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Warranty, Repairability & TCO Summary Card */}
        <div className="space-y-6">
          {/* Warranty & Software Support */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Warranty & Software Commitments</span>
              </h2>
              <EvidenceBadge type={product.warranty.standardWarrantyMonths?.evidenceType || 'verified'} />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Standard Indian Warranty</span>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span>
                    {product.warranty.standardWarrantyMonths?.value
                      ? `${product.warranty.standardWarrantyMonths.value} Months (Official)`
                      : 'Unknown / not verified'}
                  </span>
                  <EvidenceBadge
                    type={product.warranty.standardWarrantyMonths?.evidenceType || 'unknown'}
                    source={product.warranty.standardWarrantyMonths?.source}
                    sourceUrl={product.warranty.standardWarrantyMonths?.sourceUrl}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Published OS Support</span>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span>
                    {product.warranty.softwareUpdatePolicyYears?.value
                      ? `${product.warranty.softwareUpdatePolicyYears.value} Years Guaranteed`
                      : 'Unknown / not verified'}
                  </span>
                  <EvidenceBadge
                    type={product.warranty.softwareUpdatePolicyYears?.evidenceType || 'unknown'}
                    source={product.warranty.softwareUpdatePolicyYears?.source}
                    sourceUrl={product.warranty.softwareUpdatePolicyYears?.sourceUrl}
                  />
                </div>
              </div>

              {product.warranty.serviceCenterNetworkInIndia?.value && (
                <div className="pt-2 text-slate-600 border-t border-slate-50">
                  <span className="font-semibold text-slate-800">Service Network: </span>
                  {product.warranty.serviceCenterNetworkInIndia.value}
                </div>
              )}
            </div>
          </div>

          {/* Sourced Repairability & Serviceability Card */}
          {(() => {
            const isSourced = (field: any) => {
              if (!field || field.value === null || field.value === undefined) return false;
              if (field.evidenceType === 'unknown') return false;
              return Boolean(field.sourceUrl || field.evidenceType === 'user-provided' || field.evidenceType === 'third_party_database' || field.evidenceType === 'primary_source');
            };

            const hasScore = isSourced(repairData?.scoreOutOfTen);
            const hasEu = isSourced(repairData?.euEnergyLabelClass);
            const hasBattery = isSourced(repairData?.batteryReplaceable);
            const hasParts = isSourced(repairData?.officialSparePartsInIndia) || isSourced(repairData?.sparePartsStatement);
            const hasService = isSourced(repairData?.serviceCenterInfoIndia);
            const hasNotes = isSourced(repairData?.notes);

            const hasAnySourcedFact = hasScore || hasEu || hasBattery || hasParts || hasService || hasNotes;

            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-teal-700" />
                    <span>Repairability & Serviceability</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    {hasAnySourcedFact ? (
                      <EvidenceBadge
                        type={
                          repairData?.scoreOutOfTen?.evidenceType ||
                          repairData?.euEnergyLabelClass?.evidenceType ||
                          repairData?.batteryReplaceable?.evidenceType ||
                          'web-reported'
                        }
                      />
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Excluded from score
                      </span>
                    )}
                  </div>
                </div>

                {!hasAnySourcedFact ? (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-amber-900">
                          Searched iFixit, EU energy label, manufacturer pages: not found
                        </div>
                        <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                          No official repairability index, teardown guide, or published spare parts catalog was verified for this exact variant. In accordance with WorthIt AI's zero-guess policy, this dimension is omitted rather than estimated.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    {/* Score / EU Class Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {hasScore && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                          <div className="text-slate-500 flex items-center justify-between">
                            <span>iFixit Teardown Score</span>
                            <EvidenceBadge
                              type={repairData.scoreOutOfTen.evidenceType || 'web-reported'}
                              sourceUrl={repairData.scoreOutOfTen.sourceUrl}
                            />
                          </div>
                          <div className="text-xl font-bold text-teal-900 font-mono tabular-nums">
                            {repairData.scoreOutOfTen.value}/10
                          </div>
                          {repairData.scoreOutOfTen.sourceUrl && (
                            <a
                              href={repairData.scoreOutOfTen.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-medium pt-0.5"
                            >
                              <span>Inspect iFixit teardown report</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {hasEu && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                          <div className="text-slate-500 flex items-center justify-between">
                            <span>EU Repairability Class</span>
                            <EvidenceBadge
                              type={repairData.euEnergyLabelClass.evidenceType || 'web-reported'}
                              sourceUrl={repairData.euEnergyLabelClass.sourceUrl}
                            />
                          </div>
                          <div className="text-xl font-bold text-teal-900 font-mono">
                            Class {repairData.euEnergyLabelClass.value}
                          </div>
                          <p className="text-[10px] text-amber-800 font-medium">
                            EU rating, may differ for the Indian variant
                          </p>
                          {repairData.euEnergyLabelClass.sourceUrl && (
                            <a
                              href={repairData.euEnergyLabelClass.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-medium"
                            >
                              <span>Official EU registry documentation</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Battery Replaceability */}
                      {hasBattery && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                          <div className="text-slate-500 flex items-center justify-between">
                            <span>Battery User-Replaceable</span>
                            <EvidenceBadge
                              type={repairData.batteryReplaceable.evidenceType || 'web-reported'}
                              sourceUrl={repairData.batteryReplaceable.sourceUrl}
                            />
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1">
                            {repairData.batteryReplaceable.value ? 'Yes (Modular / Screws)' : 'Difficult / Glued'}
                          </div>
                          {repairData.batteryReplaceable.sourceUrl && (
                            <a
                              href={repairData.batteryReplaceable.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-medium"
                            >
                              <span>Source reference</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Hardware Disassembly Notes */}
                    {hasNotes && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                        <div className="text-slate-500 flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Internal Hardware & Disassembly Notes</span>
                          <EvidenceBadge
                            type={repairData.notes.evidenceType || 'web-reported'}
                            sourceUrl={repairData.notes.sourceUrl}
                          />
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                          {repairData.notes.value}
                        </p>
                        {repairData.notes.sourceUrl && (
                          <a
                            href={repairData.notes.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-teal-700 hover:underline inline-flex items-center gap-1 font-medium pt-1"
                          >
                            <span>Verify source ({repairData.notes.sourceUrl.slice(0, 45)}...)</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Spare parts & India Service */}
                    {(hasParts || hasService) && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                        {hasParts && (
                          <div>
                            <span className="font-semibold text-slate-800">Spare Parts in India: </span>
                            <span className="text-slate-700">
                              {repairData.sparePartsStatement?.value ||
                                (repairData.officialSparePartsInIndia?.value ? 'Official spare parts available' : 'Third-party parts only')}
                            </span>
                            {repairData.sparePartsStatement?.sourceUrl && (
                              <a
                                href={repairData.sparePartsStatement.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-teal-700 hover:underline inline-flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                        {hasService && (
                          <div>
                            <span className="font-semibold text-slate-800">Support & Service Network: </span>
                            <span className="text-slate-700">{repairData.serviceCenterInfoIndia.value}</span>
                            {repairData.serviceCenterInfoIndia.sourceUrl && (
                              <a
                                href={repairData.serviceCenterInfoIndia.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-teal-700 hover:underline inline-flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {repairError && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {repairError}
                  </div>
                )}

                {/* Action buttons: Try Again & Manual Entry */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => void handleFetchRepairability(true)}
                    disabled={isRepairLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRepairLoading ? 'animate-spin' : ''}`} />
                    <span>{isRepairLoading ? 'Researching iFixit & Portals...' : 'Try Again / Refresh'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualBattery(
                        repairData?.batteryReplaceable?.value === true
                          ? 'yes'
                          : repairData?.batteryReplaceable?.value === false
                          ? 'no'
                          : 'unknown'
                      );
                      setManualNotes(repairData?.notes?.value || '');
                      setIsManualModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-teal-700" />
                    <span>Add Manual Repair Info</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Ownership Cost Teaser Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-teal-400 font-semibold">
                  3-Year True Ownership Cost
                </span>
                <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">
                  ₹{tcoResult.totalCostOfOwnership.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400">Monthly Eq.</span>
                <div className="text-base font-bold font-mono tabular-nums text-teal-300">
                  ~₹{tcoResult.monthlyEquivalent.toLocaleString('en-IN')}/mo
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Includes initial purchase, projected Indian electricity draw (~₹7.5/kWh), and maintenance.
            </p>

            <button
              onClick={onNavigateToCost}
              className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Customize Ownership Calculator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Clickable Grounded Source Chips & Audit Trail */}
      {((product.sourcesConsulted && product.sourcesConsulted.length > 0) || (product.sourceLinks && product.sourceLinks.length > 0)) && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-700" />
                <span>Verified Source Citations & Grounding Chunks</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real web sources consulted for this report. Click any link to inspect primary documentation.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Hermetic retrieval: {formattedRetrievedDate}
            </span>
          </div>

          {/* Clickable Source Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {(product.sourcesConsulted || []).map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 hover:border-teal-500 hover:text-teal-900 transition-colors shadow-2xs group"
              >
                {src.topic && (
                  <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-800">
                    {src.topic}
                  </span>
                )}
                <span className="font-medium max-w-[200px] truncate">{src.title}</span>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-teal-700 shrink-0" />
              </a>
            ))}

            {(!product.sourcesConsulted || product.sourcesConsulted.length === 0) &&
              (product.sourceLinks || []).map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 hover:border-teal-500 hover:text-teal-900 transition-colors shadow-2xs group"
                >
                  <span className="font-medium max-w-[240px] truncate">{src.title}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-teal-700 shrink-0" />
                </a>
              ))}
          </div>
        </div>
      )}

      {/* Report Inaccurate Data Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 underline flex items-center gap-1"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Report incorrect match or misleading result for this product</span>
        </button>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        productId={product.id}
        productName={product.name}
        onSubmit={onSubmitFeedback}
      />

      {/* Tier 3 Spec Confirmation/Edit Modal */}
      <SpecEditModal
        product={product}
        isOpen={specEditOpen}
        onClose={() => setSpecEditOpen(false)}
        onSave={(updatedSpecs) => {
          if (onUpdateSpecs) {
            onUpdateSpecs(updatedSpecs);
          }
        }}
      />

      {/* Manual Repair Info Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-teal-700" />
                <span>Contribute Repair & Service Info</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualRepairability} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Battery User-Replaceability
                </label>
                <select
                  value={manualBattery}
                  onChange={(e) => setManualBattery(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-600"
                >
                  <option value="unknown">Unknown / Not observed</option>
                  <option value="yes">Yes — Modular / Standard Screws</option>
                  <option value="no">No — Glued / Non-modular</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Disassembly, RAM/Storage or Repair Notes
                </label>
                <textarea
                  rows={3}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Battery uses pull tabs. 1 SO-DIMM RAM slot open, SSD easily swappable."
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:border-teal-600 resize-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Will be recorded with a "User-provided" provenance badge.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold bg-teal-700 hover:bg-teal-800 text-white transition-colors shadow-2xs"
                >
                  Save Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
