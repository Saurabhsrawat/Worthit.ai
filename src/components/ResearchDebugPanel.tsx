import React, { useState } from 'react';
import { Product, TopicDebugInfo } from '../types';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Globe,
  Filter,
  FileText,
} from 'lucide-react';

interface ResearchDebugPanelProps {
  product: Product;
  forceVisible?: boolean;
}

export const ResearchDebugPanel: React.FC<ResearchDebugPanelProps> = ({
  product,
  forceVisible = false,
}) => {
  // Check if ?debug=1 in URL or dev mode
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isDebugUrl = urlParams.get('debug') === '1' || urlParams.get('debug') === 'true';
  const isDevMode = import.meta.env.DEV;

  const [isOpen, setIsOpen] = useState(isDebugUrl);
  const [activeTopic, setActiveTopic] = useState<string>('specs');
  const [searchHealth, setSearchHealth] = useState<{
    provider?: string;
    isTavilySet?: boolean;
    status: 'ok' | 'error' | 'unconfigured' | 'loading' | 'idle';
    resultCount?: number;
    latencyMs?: number;
    sampleUrls?: string[];
    message?: string;
    errorMessage?: string;
  }>({ status: 'idle' });

  // Load search health status on expand or mount
  React.useEffect(() => {
    if (isOpen && searchHealth.status === 'idle') {
      runSearchHealthCheck();
    }
  }, [isOpen]);

  const runSearchHealthCheck = async () => {
    setSearchHealth((prev) => ({ ...prev, status: 'loading' }));
    try {
      const res = await fetch('/api/health/search');
      const data = await res.json();
      setSearchHealth(data);
    } catch (e: any) {
      setSearchHealth({
        status: 'error',
        isTavilySet: false,
        message: 'Could not reach /api/health/search',
        errorMessage: e.message,
      });
    }
  };

  if (!forceVisible && !isDebugUrl && !isDevMode) {
    return null;
  }

  const researchDebug = product.researchDebug || {};
  const sectionStatuses = product.sectionStatuses || {};
  const topics = ['specs', 'pricing', 'warranty', 'repairability', 'issues'];

  const getStatusBadge = (status?: string, httpStatus?: number) => {
    switch (status) {
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            OK ({httpStatus || 200})
          </span>
        );
      case 'quota':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            QUOTA COOLDOWN (429)
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            ERROR ({httpStatus || 500})
          </span>
        );
      case 'no_search_key':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300">
            <AlertTriangle className="w-3 h-3 text-blue-600" />
            NO SEARCH KEY (Add Tavily Key)
          </span>
        );
      case 'empty':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3 h-3 text-slate-500" />
            EMPTY / UNCONFIGURED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
            NOT CALLED
          </span>
        );
    }
  };

  const currentTopicDebug: TopicDebugInfo | undefined = researchDebug[activeTopic];

  return (
    <div className="border border-slate-700 bg-slate-900 text-slate-100 rounded-xl overflow-hidden shadow-lg my-6 print:hidden">
      {/* Header Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-950 flex items-center justify-between hover:bg-slate-900/80 transition-colors border-b border-slate-800 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono text-xs font-bold tracking-wide uppercase text-emerald-400">
            Research Debug & Claim Audit Panel
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            {Object.keys(researchDebug).length} topics logged
          </span>
          {product.selectedVariant && (
            <span className="text-[11px] font-mono text-teal-300 bg-teal-950/60 border border-teal-800/80 px-2 py-0.5 rounded">
              Variant: {product.selectedVariant}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{isOpen ? 'Collapse Diagnostics' : 'Expand Diagnostics (?debug=1)'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Search Health Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-200">Search Engine Health (GET /api/health/search):</span>
                {searchHealth.status === 'loading' && (
                  <span className="text-amber-400 text-[11px] animate-pulse">Checking Tavily...</span>
                )}
                {searchHealth.status === 'ok' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    HEALTHY ({searchHealth.resultCount} test results in {searchHealth.latencyMs}ms)
                  </span>
                )}
                {searchHealth.status === 'unconfigured' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    TAVILY KEY NOT CONFIGURED
                  </span>
                )}
                {searchHealth.status === 'error' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    ERROR: {searchHealth.errorMessage || searchHealth.message}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Key status: <strong className={searchHealth.isTavilySet ? 'text-emerald-400' : 'text-amber-400'}>{searchHealth.isTavilySet ? 'Set in environment (hidden)' : 'Not Set'}</strong> • {searchHealth.message || 'Connecting to search health service...'}
              </div>
              {searchHealth.sampleUrls && searchHealth.sampleUrls.length > 0 && (
                <div className="text-[10px] text-cyan-300 truncate max-w-xl">
                  Sample URL: {searchHealth.sampleUrls[0]}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={runSearchHealthCheck}
              disabled={searchHealth.status === 'loading'}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors border border-slate-700 shrink-0 self-start sm:self-auto"
            >
              {searchHealth.status === 'loading' ? 'Checking...' : 'Re-test Search'}
            </button>
          </div>

          {/* Section State Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-3 border-b border-slate-800">
            {topics.map((t) => {
              const debug = researchDebug[t];
              const sec = sectionStatuses[t];
              const isSelected = activeTopic === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTopic(t)}
                  className={`p-2 rounded-lg text-left transition-all border ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[11px] font-mono font-bold uppercase text-slate-300">
                    {t}
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(debug?.status, debug?.httpStatus)}
                  </div>
                  {sec?.reason && (
                    <div className="text-[10px] text-amber-400 truncate mt-1">
                      {sec.reason}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Topic Inspection */}
          {currentTopicDebug ? (
            <div className="space-y-4">
              {/* Search Provider & Queries Info */}
              {(currentTopicDebug.searchProvider || product.provenance?.searchProvider || (currentTopicDebug.searchQueries && currentTopicDebug.searchQueries.length > 0)) && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      Free Search Adapter:
                      <span className="text-cyan-300 font-bold ml-1">
                        {currentTopicDebug.searchProvider || product.provenance?.searchProvider || 'Search Pipeline'}
                      </span>
                    </span>
                    {currentTopicDebug.pagesFetched && currentTopicDebug.pagesFetched.length > 0 && (
                      <span className="text-emerald-400 text-[11px]">
                        {currentTopicDebug.pagesFetched.length} web pages fetched server-side
                      </span>
                    )}
                  </div>
                  {currentTopicDebug.searchQueries && currentTopicDebug.searchQueries.length > 0 && (
                    <div className="text-[11px] text-slate-300">
                      <span className="text-slate-500">Search Queries:</span>{' '}
                      {currentTopicDebug.searchQueries.map((q, i) => (
                        <span key={i} className="inline-block bg-slate-900 border border-slate-800 px-2 py-0.5 rounded mr-1.5 text-cyan-200">
                          "{q}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Metric Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Globe className="w-3 h-3 text-blue-400" /> Grounding Chunks
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {currentTopicDebug.groundingChunksCount}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Supports: {currentTopicDebug.groundingSupportsCount}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <FileText className="w-3 h-3 text-amber-400" /> Step A Text
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {currentTopicDebug.stepATextLength.toLocaleString()} <span className="text-xs font-normal text-slate-400">chars</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Duration: {currentTopicDebug.durationMs}ms
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-teal-400" /> Step B Extraction
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {currentTopicDebug.stepBFieldsExtracted} <span className="text-xs font-normal text-slate-400">fields</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Retries: {currentTopicDebug.retryCount}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Filter className="w-3 h-3 text-emerald-400" /> Claim Filter
                  </div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {currentTopicDebug.fieldsKept.length} <span className="text-xs font-normal text-slate-400">kept</span> / {currentTopicDebug.fieldsDropped.length} <span className="text-xs font-normal text-slate-400">dropped</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {currentTopicDebug.fieldsDropped.length === 0 ? 'Zero dropped' : 'Audited'}
                  </div>
                </div>
              </div>

              {/* Direct Server-Side Page Fetching Log (for specs) */}
              {currentTopicDebug.directPageFetch && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono space-y-2">
                  <div className="text-slate-300 font-bold flex items-center justify-between">
                    <span>Direct Server-Side Page Fetching (Bypassing CORS, 8s timeout, 1MB limit):</span>
                    <span className="text-emerald-400">
                      {currentTopicDebug.directPageFetch.specsExtractedCount} specs extracted directly
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div>
                      <strong>Attempted:</strong> {currentTopicDebug.directPageFetch.urlsAttempted.join(', ') || 'None'}
                    </div>
                    <div>
                      <strong>Fetched:</strong> {currentTopicDebug.directPageFetch.urlsFetched.join(', ') || 'None'}
                    </div>
                  </div>
                  {currentTopicDebug.directPageFetch.log?.length > 0 && (
                    <div className="bg-slate-900 p-2 rounded text-[11px] text-slate-300 max-h-24 overflow-y-auto space-y-0.5">
                      {currentTopicDebug.directPageFetch.log.map((entry, idx) => (
                        <div key={idx}>› {entry}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fields Kept Table */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fields Kept by Claim Filter ({currentTopicDebug.fieldsKept.length})</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Field</th>
                        <th className="py-2 px-3">Value</th>
                        <th className="py-2 px-3">Evidence Status</th>
                        <th className="py-2 px-3">Attributed Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {currentTopicDebug.fieldsKept.map((f, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-semibold text-teal-300">{f.field}</td>
                          <td className="py-2 px-3 text-slate-100 max-w-xs truncate">{String(f.value)}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                f.status === 'verified'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}
                            >
                              {f.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-xs">
                            {f.sourceUrl ? (
                              <a
                                href={f.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-400 hover:underline"
                              >
                                {f.sourceTitle || f.sourceUrl}
                              </a>
                            ) : (
                              f.sourceTitle || 'Section Grounding Sources'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fields Dropped Table */}
              {currentTopicDebug.fieldsDropped.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Fields Dropped by Claim Filter ({currentTopicDebug.fieldsDropped.length})</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Field</th>
                          <th className="py-2 px-3">Candidate Value</th>
                          <th className="py-2 px-3">Reason for Drop</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-rose-200">
                        {currentTopicDebug.fieldsDropped.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 font-semibold text-rose-400">{d.field}</td>
                            <td className="py-2 px-3 text-slate-300 max-w-xs truncate">{String(d.value)}</td>
                            <td className="py-2 px-3 text-amber-300 text-[11px]">{d.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-center text-xs font-mono text-slate-400">
              No live research debug telemetry recorded for topic "{activeTopic}".
            </div>
          )}
        </div>
      )}
    </div>
  );
};
