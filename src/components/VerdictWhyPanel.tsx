import React, { useState } from 'react';
import {
  VerdictResult,
  RequirementItem,
  RequirementStatus,
  AlternativeProduct,
} from '../types';
import { EvidenceBadge } from './common/EvidenceBadge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingDown,
  Info,
  Scale,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface VerdictWhyPanelProps {
  verdict: VerdictResult;
  onOpenMissingSpecs?: () => void;
  onOpenPreferences?: () => void;
}

export const VerdictWhyPanel: React.FC<VerdictWhyPanelProps> = ({
  verdict,
  onOpenMissingSpecs,
  onOpenPreferences,
}) => {
  const [filterStatus, setFilterStatus] = useState<RequirementStatus | 'all'>('all');
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(true);

  const {
    outcome,
    title,
    confidence,
    confidenceLabel,
    fit,
    budgetAnalysis,
    decisiveReasons,
    whatWouldMakeItWorthIt,
    whatWeCouldntCheck,
    alternatives,
  } = verdict;

  // Outcome styling
  const outcomeConfig = {
    worth_it: {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-950',
      badgeBg: 'bg-emerald-600 text-white',
      icon: CheckCircle2,
      subtitle: 'Meets your key workload needs within your budget parameters.',
    },
    worth_it_with_caveats: {
      bg: 'bg-amber-50 border-amber-300 text-amber-950',
      badgeBg: 'bg-amber-600 text-white',
      icon: AlertTriangle,
      subtitle: 'Viable option, but has specific trade-offs or a minor budget stretch.',
    },
    not_worth_it: {
      bg: 'bg-rose-50 border-rose-300 text-rose-950',
      badgeBg: 'bg-rose-600 text-white',
      icon: XCircle,
      subtitle: 'Does not fit your workload requirements or offers poor value for your budget.',
    },
    cant_tell_yet: {
      bg: 'bg-slate-100 border-slate-300 text-slate-900',
      badgeBg: 'bg-slate-700 text-white',
      icon: HelpCircle,
      subtitle: 'Core specifications are missing from verified manufacturer feeds.',
    },
  }[outcome];

  const ConfidenceBadge = () => {
    const color =
      confidence === 'High'
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
        : confidence === 'Medium'
        ? 'bg-blue-100 text-blue-800 border-blue-300'
        : 'bg-amber-100 text-amber-800 border-amber-300';
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${color} inline-flex items-center gap-1`}
        title={confidenceLabel}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {confidence} Confidence
      </span>
    );
  };

  const filteredRequirements = fit.requirements.filter((r) =>
    filterStatus === 'all' ? true : r.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* 1. Main Verdict Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border-2 shadow-xs transition-all ${outcomeConfig.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${outcomeConfig.badgeBg}`}>
                {title}
              </span>
              <ConfidenceBadge />
              <span className="text-xs text-slate-600 font-medium">
                {confidenceLabel}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {title}
            </h2>
            <p className="text-sm opacity-90 max-w-2xl">
              {outcomeConfig.subtitle}
            </p>
          </div>

          {/* Quick Fit Summary Pills */}
          <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 shrink-0 flex items-center gap-4 text-xs font-semibold text-slate-700">
            <div className="text-center">
              <div className="text-emerald-700 font-bold text-base font-mono">{fit.meetsCount}</div>
              <div className="text-[11px] text-slate-500">Meets</div>
            </div>
            <div className="w-px h-7 bg-slate-200" />
            <div className="text-center">
              <div className="text-amber-700 font-bold text-base font-mono">{fit.borderlineCount}</div>
              <div className="text-[11px] text-slate-500">Borderline</div>
            </div>
            <div className="w-px h-7 bg-slate-200" />
            <div className="text-center">
              <div className="text-rose-700 font-bold text-base font-mono">{fit.failsCount}</div>
              <div className="text-[11px] text-slate-500">Fails</div>
            </div>
            {fit.unknownCount > 0 && (
              <>
                <div className="w-px h-7 bg-slate-200" />
                <div className="text-center">
                  <div className="text-slate-500 font-bold text-base font-mono">{fit.unknownCount}</div>
                  <div className="text-[11px] text-slate-500">Unknown</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* If Missing Specs Detected */}
        {outcome === 'cant_tell_yet' && onOpenMissingSpecs && (
          <div className="mt-5 p-4 bg-white rounded-xl border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                Missing core parameters: <strong>{fit.missingCoreSpecs.join(', ')}</strong>. Supply them to evaluate fit.
              </span>
            </div>
            <button
              onClick={onOpenMissingSpecs}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shrink-0"
            >
              Add specs manually
            </button>
          </div>
        )}
      </div>

      {/* 2. "Why This Is / Isn't Worth It For You" (Ranked Decisive Reasons) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-700" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Why this is / isn't worth it for you
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Tied to verified specs and budget
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Ranked decisive reasons computed purely in code from your workload profile and Indian market prices:
        </p>

        <div className="space-y-2.5 pt-1">
          {decisiveReasons.map((reason, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3 text-xs text-slate-800 leading-relaxed hover:bg-slate-50 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="font-medium">{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Requirements Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-700" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Workload Requirements Checklist
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Every condition is evaluated in code against explicit thresholds with attached source citations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMissingSpecs && (
              <button
                onClick={onOpenMissingSpecs}
                className="text-xs font-semibold text-teal-800 hover:text-teal-900 underline px-2 py-1"
              >
                + Add / edit specs manually
              </button>
            )}
            <button
              onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              aria-label="Toggle checklist view"
            >
              {isChecklistExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Filter pills */}
        {isChecklistExpanded && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 pb-2">
            {(['all', 'meets', 'borderline', 'fails', 'unknown'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filterStatus === s
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? `All (${fit.requirements.length})` : `${s} (${fit.requirements.filter((r) => r.status === s).length})`}
              </button>
            ))}
          </div>
        )}

        {/* Requirements Table */}
        {isChecklistExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Requirement</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Threshold</th>
                  <th className="py-2.5 px-3">Actual Value</th>
                  <th className="py-2.5 px-3">Evaluation Reason</th>
                  <th className="py-2.5 px-3 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequirements.map((req) => {
                  const statusBadge = {
                    meets: <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold text-[11px] inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Meets</span>,
                    borderline: <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold text-[11px] inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Borderline</span>,
                    fails: <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-semibold text-[11px] inline-flex items-center gap-1"><XCircle className="w-3 h-3" /> Fails</span>,
                    unknown: <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px] inline-flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Unknown</span>,
                  }[req.status];

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{req.label}</div>
                        {req.useCase && (
                          <div className="text-[11px] text-slate-400">{req.useCase}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{statusBadge}</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{req.threshold}</td>
                      <td className="py-3 px-3">
                        {req.actualValue ? (
                          <span className="font-semibold text-slate-900 font-mono text-[11px]">
                            {String(req.actualValue)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unverified</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs">{req.reason}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <EvidenceBadge
                          type={req.evidenceType}
                          source={req.source}
                          sourceUrl={req.sourceUrl}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. "What Would Make It Worth It" & "What We Couldn't Check" Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What would make it worth it */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-teal-800 text-sm font-bold">
            <TrendingDown className="w-4 h-4 text-teal-700" />
            <span>What would make it worth it</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Concrete changes, price targets, or alternative variants that turn this into a confident buy:
          </p>
          <ul className="text-xs text-slate-700 space-y-2.5 pt-1">
            {whatWouldMakeItWorthIt.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-teal-50/40 p-2.5 rounded-lg border border-teal-100">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What we couldn't check */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>What we couldn't check (and how it impacts confidence)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Missing data points that prevent a 100% complete evaluation:
          </p>
          <ul className="text-xs text-slate-700 space-y-2.5 pt-1">
            {whatWeCouldntCheck.map((item, idx) => (
              <li key={idx} className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/80 space-y-1">
                <div className="font-semibold text-slate-900">{item.item}</div>
                <div className="text-[11px] text-slate-500">{item.impactOnConfidence}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5. Alternatives Comparison (Market Value Check) */}
      {alternatives.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-700" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Comparable Alternatives in India
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Same use case & price bracket
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {alternatives.map((alt, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-snug">
                    {alt.name}
                  </div>
                  <div className="text-sm font-bold font-mono text-teal-900 mt-1">
                    ₹{alt.priceInr ? alt.priceInr.toLocaleString('en-IN') : 'Check price'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {alt.keySpecs}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 italic leading-relaxed">
                    "{alt.comparisonReason}"
                  </p>
                </div>

                {alt.url && (
                  <a
                    href={alt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center gap-1 hover:underline pt-2 border-t border-slate-200/60"
                  >
                    <span>Check on retailer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
