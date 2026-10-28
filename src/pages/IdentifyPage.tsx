import React, { useState } from 'react';
import { CandidateProductMatch, ProductCategory, Product } from '../types';
import { SEED_PRODUCTS, DEMO_SHOWCASE_PRODUCT } from '../data/seed';
import {
  CheckCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldAlert,
  Edit3,
  Layers,
} from 'lucide-react';

interface IdentifyPageProps {
  candidates: CandidateProductMatch[];
  loading: boolean;
  error: string | null;
  sourceInputType: 'photo' | 'url' | 'search';
  queryOrUrlText?: string;
  photoUrl?: string;
  identifiedDetails?: {
    category: ProductCategory;
    brand: string;
    model: string;
    generation?: string;
    visibleText?: string;
  };
  needsConfirmationList?: string[];
  onConfirmCandidate: (candidate: CandidateProductMatch, variant?: string) => void;
  onRetry: () => void;
  onManualSearch: (query: string) => void;
}

export const IdentifyPage: React.FC<IdentifyPageProps> = ({
  candidates,
  loading,
  error,
  sourceInputType,
  queryOrUrlText,
  photoUrl,
  identifiedDetails,
  needsConfirmationList = [],
  onConfirmCandidate,
  onRetry,
  onManualSearch,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    candidates[0]?.id || null
  );
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [customVariant, setCustomVariant] = useState<string>('');
  const [manualQuery, setManualQuery] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    onManualSearch(manualQuery.trim());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner explaining principle */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Confirmation Required:</strong> WorthIt AI never continues silently with an uncertain hardware identity. Review the candidates below and confirm the exact configuration before computing scores or ownership projections.
        </div>
      </div>

      {/* Input Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Step 1 of 3 · Hardware Identification
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Confirm Your Product
          </h1>
          {sourceInputType === 'url' && queryOrUrlText && (
            <p className="text-xs text-slate-500 mt-1 font-mono truncate max-w-xl">
              Source URL: {queryOrUrlText}
            </p>
          )}
          {sourceInputType === 'search' && queryOrUrlText && (
            <p className="text-xs text-slate-500 mt-1">
              Search term: <span className="font-semibold text-slate-800">"{queryOrUrlText}"</span>
            </p>
          )}
        </div>

        <button
          onClick={() => setIsManualOverride(!isManualOverride)}
          className="text-xs font-medium text-teal-800 hover:text-teal-900 flex items-center gap-1.5 self-start sm:self-auto py-1.5 px-3 rounded-lg border border-teal-200 bg-teal-50/50 hover:bg-teal-50 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isManualOverride ? 'Close Search' : 'Not listed? Search manually'}</span>
        </button>
      </div>

      {/* Manual Search Form if toggled */}
      {isManualOverride && (
        <form onSubmit={handleManualSearchSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <label htmlFor="manual-identify-input" className="block text-xs font-semibold text-slate-700">
            Type exact model or brand name in India
          </label>
          <div className="flex gap-2">
            <input
              id="manual-identify-input"
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="e.g. Samsung Galaxy S24 Ultra, Lenovo ThinkPad E14..."
              className="flex-1 text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 bg-slate-200 rounded-xl"></div>
            <div className="h-44 bg-slate-200 rounded-xl"></div>
          </div>
          <div className="text-center text-xs text-slate-500 pt-2 flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700" />
            Analyzing input tokens and retrieving candidate models...
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-sm font-semibold text-red-900">Identification Encountered an Issue</h3>
          <p className="text-xs text-red-700 max-w-md mx-auto">{error}</p>
          <div className="pt-2">
            <button
              onClick={onRetry}
              className="px-4 py-2 text-xs font-semibold bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Analysis</span>
            </button>
          </div>
        </div>
      )}

      {/* Results when loaded */}
      {!loading && !error && candidates.length > 0 && (
        <div className="space-y-6">
          {/* Photo Preview & Identified Details if Photo */}
          {sourceInputType === 'photo' && photoUrl && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-start">
              <img
                src={photoUrl}
                alt="Uploaded hardware"
                className="w-24 h-24 object-cover rounded-lg border border-slate-300 shrink-0"
              />
              <div className="text-xs space-y-1.5 flex-1">
                <div className="font-semibold text-slate-800">Visual Markers Detected:</div>
                {identifiedDetails?.visibleText && (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-700">Identifying text:</span> "{identifiedDetails.visibleText}"
                  </p>
                )}
                {identifiedDetails?.brand && (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-700">Inferred:</span> {identifiedDetails.brand} {identifiedDetails.model} {identifiedDetails.generation ? `(${identifiedDetails.generation})` : ''}
                  </p>
                )}
                <p className="text-slate-500 italic">
                  Note: A single photo cannot confirm internal RAM or storage. Select your exact candidate below.
                </p>
              </div>
            </div>
          )}

          {/* Candidate Product Cards */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Candidate Models ({candidates.length} Detected)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                const matchPct = Math.round(cand.matchConfidence * 100);

                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidateId(cand.id)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/20 ring-2 ring-teal-600/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <span>{cand.brand} · {cand.category === 'laptop' ? 'Laptop' : 'Smartphone'} · {cand.releaseYear}</span>
                            {cand.isAiSuggested && (
                              <span className="bg-purple-100 text-purple-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-purple-200">
                                AI suggestions, confirm the exact model
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5">
                            {cand.name}
                          </h3>
                        </div>
                        <span
                          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
                            cand.isAiSuggested
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : matchPct >= 80
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {cand.isAiSuggested ? 'AI Suggested' : `${matchPct}% match`}
                        </span>
                      </div>

                      {/* Key Attributes */}
                      <ul className="text-xs text-slate-600 space-y-1 pt-1">
                        {cand.keyAttributes.map((attr, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                            <span>{attr}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        {isSelected ? '✓ Selected candidate' : 'Click to select'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidateId(cand.id);
                          const activeVar = selectedVariant || customVariant || cand.variants?.[0];
                          onConfirmCandidate(cand, activeVar);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                          isSelected
                            ? 'bg-teal-700 text-white hover:bg-teal-800'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>Confirm & Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Variant Selection (Requirement 5: Identify the Variant) */}
          {selectedCandidate && (
            <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-teal-700" />
                <span>Step 2: Choose Exact Hardware Variant</span>
              </div>
              <p className="text-xs text-teal-900/90 leading-relaxed">
                Indian models often ship in several RAM/storage tiers with differing retail prices. Choose your intended configuration so specs and pricing are researched for that exact variant:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {(selectedCandidate.variants || [
                  selectedCandidate.category === 'smartphone' ? '8GB RAM / 128GB Storage' : '16GB RAM / 512GB SSD',
                  selectedCandidate.category === 'smartphone' ? '12GB RAM / 256GB Storage' : '16GB RAM / 1TB SSD',
                ]).map((v, idx) => {
                  const isVarSelected = (selectedVariant || selectedCandidate.variants?.[0] || '16GB RAM / 512GB SSD') === v && !customVariant;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedVariant(v);
                        setCustomVariant('');
                      }}
                      className={`px-3.5 py-2.5 rounded-lg text-xs font-medium text-left border transition-all ${
                        isVarSelected
                          ? 'bg-teal-800 text-white border-teal-800 shadow-sm ring-2 ring-teal-600/30 font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Or enter custom configuration (e.g. 16GB RAM / 512GB SSD / Intel Core i5)..."
                  value={customVariant}
                  onChange={(e) => {
                    setCustomVariant(e.target.value);
                    setSelectedVariant(e.target.value);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
            </div>
          )}

          {/* Needs Confirmation Checklist */}
          {selectedCandidate && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-amber-700" />
                <span>Attributes Requiring Manual Verification</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Before relying on evaluation scores, verify these parameters against your retail invoice or checkout cart:
              </p>
              <ul className="text-xs text-amber-950 space-y-1.5 list-disc pl-5">
                {(selectedCandidate.needsConfirmationList || []).length > 0 ? (
                  selectedCandidate.needsConfirmationList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))
                ) : (
                  <>
                    <li>Confirm exact RAM capacity (e.g. 8GB vs 16GB) on the retailer listing.</li>
                    <li>Confirm internal storage drive tier (e.g. 256GB vs 512GB SSD).</li>
                    <li>Confirm that the retailer provides an official manufacturer warranty in India.</li>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* Final Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => {
                const activeVar = selectedVariant || customVariant || selectedCandidate?.variants?.[0];
                onConfirmCandidate(selectedCandidate, activeVar);
              }}
              disabled={!selectedCandidate}
              className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              <span>
                Confirm "{selectedCandidate?.name}" {selectedVariant ? `(${selectedVariant})` : ''} & Set Preferences
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
