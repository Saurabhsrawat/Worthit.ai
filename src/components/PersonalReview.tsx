import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  UserPreferences,
  PersonalReviewData,
  UserFeedbackReport,
  SpecRating,
  SpecRelevance,
} from '../types';
import { EvidenceBadge } from './common/EvidenceBadge';
import { getOrGeneratePersonalReview } from '../services/personalReview';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Sparkles,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  Scale,
  ShieldAlert,
  Flame,
  Info,
  ExternalLink,
  Printer,
  Table,
  Radar as RadarIcon,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';

interface PersonalReviewProps {
  product: Product;
  preferences?: UserPreferences;
  userPrice?: number;
  onUpdatePreferences: (updated: UserPreferences) => void;
  onOpenFeedback: () => void;
  onSubmitFeedback?: (report: UserFeedbackReport) => void;
}

export const PersonalReview: React.FC<PersonalReviewProps> = ({
  product,
  preferences,
  userPrice,
  onUpdatePreferences,
  onOpenFeedback,
  onSubmitFeedback,
}) => {
  const [reviewData, setReviewData] = useState<PersonalReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackVote, setFeedbackVote] = useState<'up' | 'down' | null>(null);
  const [scorecardView, setScorecardView] = useState<'table' | 'radar'>('table');
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);
  const [isEditingInlineProfile, setIsEditingInlineProfile] = useState(false);

  // Inline profile editing form state
  const [inlineUseCase, setInlineUseCase] = useState(
    preferences?.intendedUse?.[0] || (product.category === 'laptop' ? 'programming' : 'photography')
  );
  const [inlineBudget, setInlineBudget] = useState(
    preferences?.maxBudgetInInr ? String(preferences.maxBudgetInInr) : ''
  );
  const [inlinePriorityA, setInlinePriorityA] = useState<'performance' | 'batteryLife' | 'portability' | 'repairability'>('performance');
  const [inlinePriorityB, setInlinePriorityB] = useState<'performance' | 'batteryLife' | 'portability' | 'repairability'>('batteryLife');
  const [inlineYears, setInlineYears] = useState(preferences?.expectedOwnershipYears || 3);

  // Effective price
  const effectivePrice = userPrice || product.priceInInr?.value || 0;

  // Load or regenerate review whenever product, preferences, or price changes
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    getOrGeneratePersonalReview(product, preferences, effectivePrice)
      .then((data) => {
        if (!isCancelled) {
          setReviewData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to generate personal review:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [product.id, effectivePrice, preferences]);

  // Sync inline form when preferences prop changes
  useEffect(() => {
    if (preferences) {
      if (preferences.intendedUse?.[0]) setInlineUseCase(preferences.intendedUse[0]);
      if (preferences.maxBudgetInInr) setInlineBudget(String(preferences.maxBudgetInInr));
      if (preferences.expectedOwnershipYears) setInlineYears(preferences.expectedOwnershipYears);
    }
  }, [preferences]);

  const handleSaveInlineProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = inlineBudget ? parseInt(inlineBudget.replace(/[^0-9]/g, ''), 10) : undefined;
    const weights = {
      performance: inlinePriorityA === 'performance' || inlinePriorityB === 'performance' ? 5 : 3,
      batteryLife: inlinePriorityA === 'batteryLife' || inlinePriorityB === 'batteryLife' ? 5 : 3,
      portability: inlinePriorityA === 'portability' || inlinePriorityB === 'portability' ? 5 : 3,
      repairability: inlinePriorityA === 'repairability' || inlinePriorityB === 'repairability' ? 5 : 3,
    };

    const updated: UserPreferences = {
      category: product.category,
      intendedUse: [inlineUseCase],
      maxBudgetInInr: budgetNum && budgetNum > 0 ? budgetNum : undefined,
      expectedOwnershipYears: inlineYears,
      importanceWeights: weights,
      essentialRequirements: preferences?.essentialRequirements || '',
    };

    onUpdatePreferences(updated);
    setIsEditingInlineProfile(false);
  };

  const handleCopyReview = () => {
    if (!reviewData) return;
    const { verdict, analysis, writtenReview } = reviewData;
    const lines = [
      `=== WorthIt AI - Your Personal Review ===`,
      `Product: ${product.name}`,
      `Verdict: ${verdict.title} (${verdict.confidence} Confidence)`,
      `Score: ${verdict.worthItScore ? `${verdict.worthItScore}/100` : 'Insufficient data'}`,
      `Price: ₹${effectivePrice.toLocaleString('en-IN')}`,
      `Profile Target: ${preferences?.intendedUse?.join(', ') || 'General use'} · Budget: ${preferences?.maxBudgetInInr ? `₹${preferences.maxBudgetInInr.toLocaleString('en-IN')}` : 'Flexible'}`,
      '',
      `--- Personal Assessment ---`,
      writtenReview || 'Objective analysis computed from verified hardware benchmarks.',
      '',
      `--- Strong Points for You ---`,
      ...analysis.strengths.map((s) => `• ${s.specFact}: ${s.whyItMatters}`),
      '',
      `--- Watch-Outs for You ---`,
      ...analysis.weaknesses.map((w) => `• ${w.specFact}: ${w.whyItMatters}`),
      '',
      `--- Suitedness ---`,
      `Best for: ${analysis.suitedness.bestSuitedFor.join(', ')}`,
      `Not ideal for: ${analysis.suitedness.notIdealFor.join(', ')}`,
      '',
      `Evaluated on ${new Date().toLocaleDateString('en-IN')} via WorthIt AI (Transparent Indian Consumer Hardware Evaluation)`,
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Radar chart data preparation
  const radarData = useMemo(() => {
    if (!reviewData) return [];
    return reviewData.analysis.ratedSpecs
      .filter((s) => s.scoreOutOf100 !== null)
      .map((s) => ({
        subject: s.specName.split(' ')[0],
        fullName: s.specName,
        score: s.scoreOutOf100 || 0,
        relevance: s.relevance,
      }));
  }, [reviewData]);

  // Verdict Outcome styling helper
  const verdictConfig = useMemo(() => {
    const outcome = reviewData?.verdict.outcome || 'cant_tell_yet';
    switch (outcome) {
      case 'worth_it':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-950',
          badge: 'bg-emerald-600 text-white',
          pill: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: CheckCircle2,
          tagline: 'Recommended hardware alignment for your stated workload and budget.',
        };
      case 'worth_it_with_caveats':
        return {
          bg: 'bg-amber-50/90 border-amber-300 text-amber-950',
          badge: 'bg-amber-600 text-white',
          pill: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: AlertTriangle,
          tagline: 'Viable option with explicit hardware compromises you should consider.',
        };
      case 'not_worth_it':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-950',
          badge: 'bg-rose-600 text-white',
          pill: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: XCircle,
          tagline: 'Significant deficits against your workload requirements or budget ceiling.',
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-300 text-slate-900',
          badge: 'bg-slate-600 text-white',
          pill: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: HelpCircle,
          tagline: 'Core specifications require retailer verification before a confident verdict.',
        };
    }
  }, [reviewData?.verdict.outcome]);

  const ratingBadgeClass = (rating: SpecRating) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
      case 'Good':
        return 'bg-teal-50 text-teal-800 border-teal-300 font-medium';
      case 'Average':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Weak':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200 italic';
    }
  };

  const relevanceBadgeClass = (rel: SpecRelevance) => {
    switch (rel) {
      case 'High':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      case 'Medium':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  // If no preferences yet, display onboarding inline banner
  const hasProfile = preferences && preferences.intendedUse && preferences.intendedUse.length > 0;

  return (
    <section className="bg-white rounded-3xl border-2 border-teal-600/30 shadow-md p-6 sm:p-8 space-y-7 relative print:border-slate-300 print:shadow-none print:p-4">
      {/* Top Banner: Profile Lockup & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-900 border border-teal-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Your Personal Review
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-600">
              Evaluated against your workload & budget
            </span>
          </div>

          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 pt-0.5">
            <span>Profile:</span>
            <span className="font-semibold text-slate-800">
              {preferences?.intendedUse?.join(', ') || 'Everyday general computing'}
            </span>
            <span>·</span>
            <span>Budget:</span>
            <span className="font-semibold text-slate-800">
              {preferences?.maxBudgetInInr
                ? `₹${preferences.maxBudgetInInr.toLocaleString('en-IN')}`
                : 'Flexible'}
            </span>
            <span>·</span>
            <span>Target Tenure:</span>
            <span className="font-semibold text-slate-800">
              {preferences?.expectedOwnershipYears || 3} Years
            </span>
          </p>
        </div>

        {/* Action Controls: Edit Profile, Copy Review, Print */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsEditingInlineProfile(!isEditingInlineProfile)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
            {isEditingInlineProfile ? 'Close Editor' : 'Edit Profile'}
          </button>

          <button
            onClick={handleCopyReview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer"
            title="Copy plain-text summary"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-teal-700" />
                <span>Copy Review</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Print-friendly view"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Inline Profile Editor (Expandable) */}
      {isEditingInlineProfile && (
        <form
          onSubmit={handleSaveInlineProfile}
          className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
              Adjust Your Evaluation Profile
            </span>
            <span className="text-slate-500">
              Instantly regenerates the personal review below
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary Workload */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Primary Workload</label>
              <select
                value={inlineUseCase}
                onChange={(e) => setInlineUseCase(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {product.category === 'laptop' ? (
                  <>
                    <option value="programming">Programming & Development</option>
                    <option value="gaming">AAA & Esports Gaming</option>
                    <option value="video editing">Video Editing & 3D Design</option>
                    <option value="everyday">Everyday Office & Study</option>
                    <option value="travel">Travel & Battery Mobility</option>
                  </>
                ) : (
                  <>
                    <option value="photography">Mobile Photography & Video</option>
                    <option value="gaming">High-Performance Gaming</option>
                    <option value="battery">All-Day Battery & Commute</option>
                    <option value="everyday">General Everyday Social & Office</option>
                  </>
                )}
              </select>
            </div>

            {/* Target Budget */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Target Budget (₹ INR)</label>
              <input
                type="text"
                value={inlineBudget}
                onChange={(e) => setInlineBudget(e.target.value)}
                placeholder="e.g. 55000"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
              />
            </div>

            {/* Top Priority A */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Top Priority 1</label>
              <select
                value={inlinePriorityA}
                onChange={(e) => setInlinePriorityA(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="performance">Peak Computing Performance</option>
                <option value="batteryLife">Battery Endurance</option>
                <option value="portability">Chassis Portability & Weight</option>
                <option value="repairability">Repairability & Longevity</option>
              </select>
            </div>

            {/* Top Priority B */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Top Priority 2</label>
              <select
                value={inlinePriorityB}
                onChange={(e) => setInlinePriorityB(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="batteryLife">Battery Endurance</option>
                <option value="performance">Peak Computing Performance</option>
                <option value="portability">Chassis Portability & Weight</option>
                <option value="repairability">Repairability & Longevity</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Quick Presets:</span>
              {product.category === 'laptop' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineUseCase('programming');
                      setInlineBudget('55000');
                      setInlinePriorityA('performance');
                      setInlinePriorityB('repairability');
                    }}
                    className="px-2 py-0.5 bg-white border border-slate-200 hover:border-teal-400 rounded text-[11px] text-slate-700 font-medium cursor-pointer"
                  >
                    Dev @ ₹55k
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineUseCase('gaming');
                      setInlineBudget('80000');
                      setInlinePriorityA('performance');
                      setInlinePriorityB('batteryLife');
                    }}
                    className="px-2 py-0.5 bg-white border border-slate-200 hover:border-teal-400 rounded text-[11px] text-slate-700 font-medium cursor-pointer"
                  >
                    Gaming @ ₹80k
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineUseCase('photography');
                      setInlineBudget('35000');
                      setInlinePriorityA('performance');
                      setInlinePriorityB('batteryLife');
                    }}
                    className="px-2 py-0.5 bg-white border border-slate-200 hover:border-teal-400 rounded text-[11px] text-slate-700 font-medium cursor-pointer"
                  >
                    Camera Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineUseCase('battery');
                      setInlineBudget('25000');
                      setInlinePriorityA('batteryLife');
                      setInlinePriorityB('repairability');
                    }}
                    className="px-2 py-0.5 bg-white border border-slate-200 hover:border-teal-400 rounded text-[11px] text-slate-700 font-medium cursor-pointer"
                  >
                    Battery First
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingInlineProfile(false)}
                className="px-3 py-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                Apply & Update Review
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4a. Headline Verdict Card */}
      {reviewData && (
        <div className={`rounded-2xl border-2 p-5 sm:p-6 space-y-4 ${verdictConfig.bg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <verdictConfig.icon className="w-5 h-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Headline Verdict
                </span>
                <span className="text-xs opacity-60">·</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 border border-current">
                  {reviewData.verdict.confidence} Confidence
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {reviewData.verdict.title}
              </h2>
              <p className="text-xs font-medium opacity-90">
                {verdictConfig.tagline}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 sm:border-l sm:border-slate-300/40 sm:pl-6">
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">
                  WorthIt Score
                </div>
                <div className="text-3xl font-black font-mono tabular-nums">
                  {reviewData.verdict.worthItScore !== null ? (
                    <span>{reviewData.verdict.worthItScore}<span className="text-base font-normal opacity-70">/100</span></span>
                  ) : (
                    <span className="text-sm font-medium">Insufficient Specs</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Budget ceiling context */}
          {reviewData.verdict.budgetAnalysis && preferences?.maxBudgetInInr && (
            <div className="pt-2 border-t border-current/15 flex flex-wrap items-center justify-between text-xs gap-2">
              <span>
                <strong>Budget Check: </strong>
                {reviewData.verdict.budgetAnalysis.withinBudget ? (
                  <span className="text-emerald-800 font-semibold">
                    Within your ₹{preferences.maxBudgetInInr.toLocaleString('en-IN')} ceiling (₹{Math.abs(reviewData.verdict.budgetAnalysis.deltaInr).toLocaleString('en-IN')} buffer)
                  </span>
                ) : (
                  <span className="text-rose-800 font-semibold">
                    Exceeds your ₹{preferences.maxBudgetInInr.toLocaleString('en-IN')} budget by ₹{reviewData.verdict.budgetAnalysis.deltaInr.toLocaleString('en-IN')} (+{reviewData.verdict.budgetAnalysis.deltaPercentage}%)
                  </span>
                )}
              </span>

              <button
                onClick={() => setShowCompareDrawer(!showCompareDrawer)}
                className="font-semibold underline hover:opacity-80 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Compare to what you asked for</span>
                {showCompareDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side: Stated Requirements vs Product Actual Specs Drawer */}
      {showCompareDrawer && reviewData && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-700" />
              Side-by-Side: What You Asked For vs What This Hardware Delivers
            </span>
            <button
              onClick={() => setShowCompareDrawer(false)}
              className="text-slate-500 hover:text-slate-800 font-semibold"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-2 px-3">Criteria</th>
                  <th className="py-2 px-3">Your Stated Preference</th>
                  <th className="py-2 px-3">Product Delivered Spec</th>
                  <th className="py-2 px-3">Alignment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Workload Fit</td>
                  <td className="py-2.5 px-3">{preferences?.intendedUse?.join(', ') || 'General use'}</td>
                  <td className="py-2.5 px-3">{product.specs.processor?.value || 'Unconfirmed CPU'} · {product.specs.ram?.value || 'Unconfirmed RAM'}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">
                      Supported
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Price vs Ceiling</td>
                  <td className="py-2.5 px-3">Max ₹{preferences?.maxBudgetInInr ? preferences.maxBudgetInInr.toLocaleString('en-IN') : 'Flexible'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold">₹{effectivePrice.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3">
                    {effectivePrice <= (preferences?.maxBudgetInInr || Infinity) ? (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">Within Budget</span>
                    ) : (
                      <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[11px] font-bold">Over Ceiling</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Expected Lifespan</td>
                  <td className="py-2.5 px-3">{preferences?.expectedOwnershipYears || 3} Years Planned</td>
                  <td className="py-2.5 px-3">{product.warranty.softwareUpdatePolicyYears?.value ? `${product.warranty.softwareUpdatePolicyYears.value} Yrs OS Updates` : 'Standard update window'}</td>
                  <td className="py-2.5 px-3">
                    {(product.warranty.softwareUpdatePolicyYears?.value || 3) >= (preferences?.expectedOwnershipYears || 3) ? (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">Covered</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-bold">Monitor Updates</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4b. Written Review (120 - 200 words addressed to user) */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Personalized Assessment
            </span>
            <EvidenceBadge type="ai-interpretation" date={reviewData?.generatedAt?.split('T')[0]} />
          </div>

          {loading && (
            <span className="text-xs text-teal-700 flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Tailoring analysis...
            </span>
          )}
        </div>

        {/* Prose Content */}
        {reviewData?.writtenReview ? (
          <p className="text-sm text-slate-800 leading-relaxed font-sans">
            {reviewData.writtenReview}
          </p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              <span>AI-written summary unavailable</span>
            </div>
            <p>
              Prose generation was omitted due to strict fact-checking limits or quota constraints.
              All calculated strengths, weaknesses, and spec scorecard below are 100% computed from verified hardware benchmarks.
            </p>
          </div>
        )}
      </div>

      {/* 4c. "Strong points for you" and "Watch-outs for you" */}
      {reviewData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Strong Points */}
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Strong Points for You</span>
              </div>
              <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Ranked by Workload Impact
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {reviewData.analysis.strengths.length > 0 ? (
                reviewData.analysis.strengths.map((item) => (
                  <div key={item.id} className="text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900">{item.specFact}</span>
                      <EvidenceBadge type={item.evidenceType} source={item.source} sourceUrl={item.sourceUrl} />
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {item.whyItMatters}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No standout strengths detected for this specific use profile.</p>
              )}
            </div>
          </div>

          {/* Watch-Outs */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Watch-Outs for You</span>
              </div>
              <span className="text-[11px] text-amber-900 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                Tradeoffs to Note
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {reviewData.analysis.weaknesses.length > 0 ? (
                reviewData.analysis.weaknesses.map((item) => (
                  <div key={item.id} className="text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900">{item.specFact}</span>
                      <EvidenceBadge type={item.evidenceType} source={item.source} sourceUrl={item.sourceUrl} />
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {item.whyItMatters}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No critical compromises identified against your workload baseline.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standouts & Tradeoffs Callout */}
      {reviewData && (reviewData.analysis.standouts.length > 0 || reviewData.analysis.tradeoffs.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {reviewData.analysis.standouts.length > 0 && (
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-2">
              <div className="font-bold text-teal-950 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-teal-700" />
                <span>Standout Hardware Features (Beats Price Class)</span>
              </div>
              <div className="space-y-1.5">
                {reviewData.analysis.standouts.map((st, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2 text-slate-800">
                    <span className="font-semibold text-slate-900">{st.specName}: {st.value}</span>
                    <span className="text-[11px] text-teal-800 shrink-0">{st.whyStandout}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewData.analysis.tradeoffs.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5 text-slate-600" />
                <span>Notable Engineering Trade-offs</span>
              </div>
              <div className="space-y-1.5">
                {reviewData.analysis.tradeoffs.map((tr, i) => (
                  <div key={i} className="text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-900">{tr.strongSpec}</span> vs{' '}
                    <span className="font-semibold text-slate-900">{tr.weakSpec}</span>: {tr.explanation}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4d. Spec Scorecard (Table vs Radar Chart Toggle) */}
      {reviewData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Spec Scorecard (Evaluated Against {reviewData.analysis.priceBand})
              </h3>
              <p className="text-xs text-slate-500">
                Design thresholds strictly define performance bands. Rows critical to your workload are highlighted.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shrink-0">
              <button
                onClick={() => setScorecardView('table')}
                className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                  scorecardView === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Scorecard Table</span>
              </button>
              <button
                onClick={() => setScorecardView('radar')}
                className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                  scorecardView === 'radar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <RadarIcon className="w-3.5 h-3.5" />
                <span>Visual Radar</span>
              </button>
            </div>
          </div>

          {scorecardView === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Specification</th>
                    <th className="py-2.5 px-3">Measured Hardware</th>
                    <th className="py-2.5 px-3">Category Benchmark Note</th>
                    <th className="py-2.5 px-3">Rating</th>
                    <th className="py-2.5 px-3">Your Relevance</th>
                    <th className="py-2.5 px-3">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviewData.analysis.ratedSpecs.map((spec) => (
                    <tr
                      key={spec.specKey}
                      className={`transition-colors ${
                        spec.isHighlight ? 'bg-teal-50/40 font-medium' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-900 font-semibold flex items-center gap-1.5">
                        {spec.specName}
                        {spec.isHighlight && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-teal-600"
                            title="Key priority for your profile"
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-mono text-[11px]">
                        {spec.rawText}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs leading-snug">
                        {spec.comparisonNote}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] border inline-block ${ratingBadgeClass(spec.rating)}`}>
                          {spec.rating}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] border inline-block ${relevanceBadgeClass(spec.relevance)}`}>
                          {spec.relevance}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <EvidenceBadge
                          type={spec.evidenceType}
                          source={spec.source}
                          sourceUrl={spec.sourceUrl}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Radar
                    name="Spec Benchmark Score"
                    dataKey="score"
                    stroke="#0d9488"
                    fill="#14b8a6"
                    fillOpacity={0.35}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#cbd5e1', fontSize: 12 }}
                    formatter={(val: any, _name: any, item: any) => [`${val}/100`, item.payload.fullName]}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="text-center text-[11px] text-slate-500 mt-1">
                Radar points closer to the outer rim represent superior ratings relative to price band standards.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4e. "Best suited for" and "Not ideal for" Tags */}
      {reviewData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Best Suited For (Across All Workloads)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {reviewData.analysis.suitedness.bestSuitedFor.map((tag, i) => (
                <span
                  key={i}
                  className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-md font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-rose-900 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              Not Ideal For (Compromised Workloads)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {reviewData.analysis.suitedness.notIdealFor.map((tag, i) => (
                <span
                  key={i}
                  className="bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-1 rounded-md font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4f. "What we couldn't check" & Confidence Impact */}
      {reviewData && reviewData.analysis.unverifiableSpecs.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>What We Couldn't Check (Unverified in Indian Sources)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            {reviewData.analysis.unverifiableSpecs.map((unv, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-slate-400 font-bold">•</span>
                <span>
                  <strong className="text-slate-800">{unv.item}: </strong>
                  {unv.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Feedback Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>Was this personalized review helpful?</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setFeedbackVote('up');
                onSubmitFeedback?.({
                  id: `fb-${Date.now()}`,
                  productId: product.id,
                  productName: product.name,
                  type: 'other',
                  comment: 'Positive feedback: User indicated personal review was accurate and helpful',
                  timestamp: new Date().toISOString(),
                });
              }}
              className={`p-1.5 rounded-md border transition-colors cursor-pointer flex items-center gap-1 ${
                feedbackVote === 'up'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
              title="Helpful review"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Yes</span>
            </button>
            <button
              onClick={() => {
                setFeedbackVote('down');
                onSubmitFeedback?.({
                  id: `fb-${Date.now()}`,
                  productId: product.id,
                  productName: product.name,
                  type: 'other',
                  comment: 'Negative feedback: User indicated personal review verdict was not aligned',
                  timestamp: new Date().toISOString(),
                });
              }}
              className={`p-1.5 rounded-md border transition-colors cursor-pointer flex items-center gap-1 ${
                feedbackVote === 'down'
                  ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
              title="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>No</span>
            </button>
          </div>
          {feedbackVote && (
            <span className="text-emerald-700 font-medium">Thank you for your feedback!</span>
          )}
        </div>

        <button
          onClick={onOpenFeedback}
          className="text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
        >
          Something looks wrong? Report a spec correction
        </button>
      </div>
    </section>
  );
};
