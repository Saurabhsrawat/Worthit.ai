import React, { useState } from 'react';
import { Product, WorthItScoreResult } from '../types';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import { DataCompletenessMeter } from '../components/common/DataCompletenessMeter';
import {
  Bookmark,
  Trash2,
  Scale,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export interface PastReportRecord {
  id: string;
  product: Product;
  score: number | null;
  timestamp: string;
}

interface SavedProductsPageProps {
  savedProducts: Product[];
  pastReports: PastReportRecord[];
  comparedProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onRemoveSaved: (productId: string) => void;
  onClearSaved: () => void;
  onClearHistory: () => void;
  onToggleCompare: (product: Product) => void;
  onNavigateToCompare: () => void;
}

export const SavedProductsPage: React.FC<SavedProductsPageProps> = ({
  savedProducts,
  pastReports,
  comparedProducts,
  onSelectProduct,
  onRemoveSaved,
  onClearSaved,
  onClearHistory,
  onToggleCompare,
  onNavigateToCompare,
}) => {
  const [activeTab, setActiveTab] = useState<'shortlist' | 'history'>('shortlist');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Local Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Saved Products & Past Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Persisted securely in your browser's localStorage. No server tracking or external accounts required.
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('shortlist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'shortlist'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shortlist ({savedProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past Reports ({pastReports.length})
          </button>
        </div>
      </div>

      {/* Comparison Drawer Teaser if items in comparison */}
      {comparedProducts.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-teal-900 font-semibold">
            <Scale className="w-4 h-4 text-teal-700" />
            <span>You have {comparedProducts.length} items staged in your comparison tray.</span>
          </div>
          <button
            onClick={onNavigateToCompare}
            className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Open Side-by-Side Comparison</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Shortlist Tab Content */}
      {activeTab === 'shortlist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Shortlisted Devices ({savedProducts.length})
            </h2>
            {savedProducts.length > 0 && (
              <button
                onClick={onClearSaved}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Shortlist</span>
              </button>
            )}
          </div>

          {savedProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Your Shortlist is Empty</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Save laptops or phones to compare prices, verify seller terms, and calculate collective ownership costs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedProducts.map((p) => {
                const isCompared = comparedProducts.some((cp) => cp.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {p.brand} · {p.category === 'laptop' ? 'Laptop' : 'Smartphone'}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5 line-clamp-2">
                            {p.name}
                          </h3>
                        </div>
                        <button
                          onClick={() => onRemoveSaved(p.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Remove from shortlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.priceInInr?.value ? (
                          <span className="font-bold font-mono tabular-nums text-slate-900 text-sm">
                            ₹{p.priceInInr.value.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Price not verified</span>
                        )}
                        <EvidenceBadge type={p.priceInInr?.evidenceType || 'unknown'} size="sm" />
                      </div>

                      <DataCompletenessMeter score={p.dataCompleteness} size="sm" />
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onToggleCompare(p)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                          isCompared
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>{isCompared ? 'In Compare' : '+ Compare'}</span>
                      </button>

                      <button
                        onClick={() => onSelectProduct(p)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <span>View Report</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Past Evaluated Intelligence Reports ({pastReports.length})
            </h2>
            {pastReports.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {pastReports.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No Past Reports Logged</h3>
              <p className="text-xs text-slate-500">
                Reports you generate or adjust will automatically appear here for rapid recall.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100">
                {pastReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{report.product.brand}</span>
                        <span>·</span>
                        <span className="capitalize">{report.product.category}</span>
                        <span>·</span>
                        <span className="font-mono">{new Date(report.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {report.product.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4">
                      {report.score !== null ? (
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">WorthIt Score</span>
                          <span className="text-lg font-bold font-mono tabular-nums text-teal-800">{report.score}/100</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 italic">Insufficient Data</span>
                      )}

                      <button
                        onClick={() => onSelectProduct(report.product)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <span>Reopen</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
