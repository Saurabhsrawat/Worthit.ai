import React, { useState, useMemo } from 'react';
import { Product, UserPreferences } from '../types';
import { calculateWorthItScore } from '../lib/scoring';
import { calculateOwnershipCost, getDefaultOwnershipInputs } from '../lib/ownershipCost';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import { DataCompletenessMeter } from '../components/common/DataCompletenessMeter';
import { SEED_PRODUCTS } from '../data/seed';
import { getCachedProducts } from '../services/research';
import {
  Scale,
  X,
  Plus,
  SlidersHorizontal,
  ArrowRight,
  Bookmark,
  Sparkles,
  History,
  RotateCcw,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';

interface ComparisonPageProps {
  comparedProducts: Product[];
  currentProduct?: Product;
  savedProducts?: Product[];
  onRemoveProduct: (productId: string) => void;
  onClearAll: () => void;
  onAddProduct: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  userPreferences?: UserPreferences;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({
  comparedProducts,
  currentProduct,
  savedProducts = [],
  onRemoveProduct,
  onClearAll,
  onAddProduct,
  onSelectProduct,
  userPreferences,
}) => {
  // Dimension slider weights for live re-ranking
  const [weights, setWeights] = useState({
    performance: 3,
    battery: 3,
    repairability: 3,
    costValue: 4,
  });

  const [activeAddTab, setActiveAddTab] = useState<'current' | 'saved' | 'recent' | 'seed'>('current');

  // Compute live scores and ranking for each compared product
  const rankedProducts = useMemo(() => {
    return comparedProducts.map((p) => {
      const tempPrefs: UserPreferences = {
        category: p.category,
        intendedUse: userPreferences?.intendedUse || [],
        maxBudgetInInr: userPreferences?.maxBudgetInInr,
        expectedOwnershipYears: userPreferences?.expectedOwnershipYears || 3,
        importanceWeights: {
          performance: weights.performance,
          batteryLife: weights.battery,
          portability: 3,
          repairability: weights.repairability,
        },
        essentialRequirements: '',
      };

      const scoreResult = calculateWorthItScore(p, tempPrefs);
      const priceVal = p.priceInInr?.value || 0;
      const tco = calculateOwnershipCost(
        getDefaultOwnershipInputs(p.category, priceVal, p.priceInInr?.evidenceType || 'unknown', 3)
      );

      return {
        product: p,
        scoreResult,
        tco,
      };
    }).sort((a, b) => (b.scoreResult.overallScore || 0) - (a.scoreResult.overallScore || 0));
  }, [comparedProducts, weights, userPreferences]);

  // Determine standout badges
  const getStandoutBadge = (idx: number, item: typeof rankedProducts[0]) => {
    if (idx === 0 && (item.scoreResult.overallScore || 0) > 0) {
      return { text: 'Highest Weighted Match', color: 'bg-teal-100 text-teal-800 border-teal-300' };
    }
    const lowestCost = Math.min(...rankedProducts.map((r) => r.tco.totalCostOfOwnership));
    if (item.tco.totalCostOfOwnership === lowestCost && item.tco.totalCostOfOwnership > 0) {
      return { text: 'Lowest 3-Year TCO', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    return null;
  };

  // Pools of candidates to add
  const isCompared = (id: string) => comparedProducts.some((p) => p.id === id);

  // 1. Current product
  const canAddCurrent = currentProduct && !isCompared(currentProduct.id);

  // 2. Saved products
  const availableSaved = savedProducts.filter((p) => !isCompared(p.id));

  // 3. Recently researched / cached products
  const cachedProducts = useMemo(() => {
    try {
      return getCachedProducts().filter((p) => !isCompared(p.id));
    } catch {
      return [];
    }
  }, [comparedProducts]);

  // 4. Quick-start seed list
  const availableSeed = SEED_PRODUCTS.filter((p) => !isCompared(p.id));

  const isTrayFull = comparedProducts.length >= 4;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Multi-Device Evaluation
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Side-by-Side Trade-off Comparison
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Compare 2 to 4 devices with live weight adjustments. There is no universal winner; ranking reflects your personal trade-offs.
        </p>
      </div>

      {/* 1. Comparison Tray (ALWAYS SHOWN at top) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Comparison Tray</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                  {comparedProducts.length} of 4 selected
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {comparedProducts.length === 0
                  ? 'No devices staged yet. Add devices below to compare.'
                  : comparedProducts.length === 1
                  ? 'Add at least 1 more device to unlock side-by-side matrices.'
                  : 'Adjust priorities below or click (X) on any device to swap.'}
              </p>
            </div>
          </div>

          {comparedProducts.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {/* Product Chips / Cards in Tray */}
        {comparedProducts.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-2">
            <Scale className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-700">Tray is empty (0 of 4 selected)</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Select products from your current research, saved shortlist, or recent searches below to begin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {comparedProducts.map((p, idx) => {
              const priceText = p.priceInInr?.value
                ? `₹${p.priceInInr.value.toLocaleString('en-IN')}`
                : 'Price unverified';

              const isLive = p.provenance?.liveFetched === true;
              const isDemo = p.isDemonstrationData === true;

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 relative group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Slot {idx + 1} of 4
                      </span>
                      {/* Visible Remove Button at ALL counts 1 to 4 */}
                      <button
                        onClick={() => onRemoveProduct(p.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={`Remove ${p.name} from comparison`}
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs font-bold text-slate-900 line-clamp-1" title={p.name}>
                      {p.name}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                      <span>{p.brand}</span>
                      {p.selectedVariant && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{p.selectedVariant}</span>
                        </>
                      )}
                    </div>

                    <div className="text-xs font-semibold font-mono text-teal-800">
                      {priceText}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                        Live Research
                      </span>
                    ) : isDemo ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                        Demonstration data
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        Catalog item
                      </span>
                    )}

                    <button
                      onClick={() => onSelectProduct(p)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-teal-800 flex items-center gap-0.5"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. When fewer than 2 products in comparison: Prompt to add more */}
      {comparedProducts.length < 2 && (
        <div className="bg-teal-50/70 p-6 rounded-2xl border border-teal-200 text-center space-y-3">
          <Scale className="w-10 h-10 text-teal-700 mx-auto" />
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              {comparedProducts.length === 0
                ? 'Add at Least 2 Products to Start Comparing'
                : 'Add at Least 1 More Product to Unlock Comparison'}
            </h3>
            <p className="text-xs text-slate-600">
              You currently have <strong className="text-slate-900">{comparedProducts.length} of 4</strong> products in your comparison tray. Add from your current research, saved shortlist, or quick-start options below.
            </p>
          </div>
        </div>
      )}

      {/* 3. Add Products Section (Hidden ONLY when tray is full 4/4) */}
      {!isTrayFull && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-700" />
              <h3 className="text-sm font-bold text-slate-900">Add Products to Comparison</h3>
              <span className="text-xs text-slate-400">({4 - comparedProducts.length} slots remaining)</span>
            </div>

            {/* Sources Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              {canAddCurrent && (
                <button
                  onClick={() => setActiveAddTab('current')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeAddTab === 'current' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Current Device
                </button>
              )}
              <button
                onClick={() => setActiveAddTab('saved')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  activeAddTab === 'saved' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>Shortlist ({availableSaved.length})</span>
              </button>
              <button
                onClick={() => setActiveAddTab('recent')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  activeAddTab === 'recent' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3 h-3" />
                <span>Recent ({cachedProducts.length})</span>
              </button>
              <button
                onClick={() => setActiveAddTab('seed')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  activeAddTab === 'seed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Quick-Start ({availableSeed.length})</span>
              </button>
            </div>
          </div>

          {/* Current Researched Product Option */}
          {activeAddTab === 'current' && canAddCurrent && currentProduct && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded uppercase">
                  Currently Viewing in Dashboard
                </span>
                <div className="text-sm font-bold text-slate-900 mt-1">{currentProduct.name}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {currentProduct.brand} • {currentProduct.category} {currentProduct.selectedVariant ? `• ${currentProduct.selectedVariant}` : ''}
                </div>
              </div>
              <button
                onClick={() => onAddProduct(currentProduct)}
                className="px-3.5 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Comparison</span>
              </button>
            </div>
          )}

          {/* Saved Shortlist Products */}
          {activeAddTab === 'saved' && (
            <div>
              {availableSaved.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No uncompared items in your saved shortlist.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableSaved.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">{p.brand} • {p.category}</div>
                      </div>
                      <button
                        onClick={() => onAddProduct(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Previously Researched / Cached Products */}
          {activeAddTab === 'recent' && (
            <div>
              {cachedProducts.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No previously researched products found in local cache.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cachedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">{p.brand} • {p.category}</div>
                      </div>
                      <button
                        onClick={() => onAddProduct(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick-Start Seed Catalog Products */}
          {activeAddTab === 'seed' && (
            <div>
              {availableSeed.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  All quick-start catalog devices have already been added.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableSeed.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">{p.brand} • {p.category}</div>
                      </div>
                      <button
                        onClick={() => onAddProduct(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. When 2 or more products are compared: Full side-by-side matrices */}
      {comparedProducts.length >= 2 && (
        <div className="space-y-6">
          {/* Interactive Live Reweighting Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <SlidersHorizontal className="w-4 h-4 text-teal-700" />
                <span>Interactive Live Re-ranking Sliders</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Adjust priorities to shift scores live
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Performance</span>
                  <span className="font-mono font-semibold text-teal-800">{weights.performance}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={weights.performance}
                  onChange={(e) => setWeights({ ...weights, performance: parseInt(e.target.value, 10) })}
                  className="w-full accent-teal-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Battery Life</span>
                  <span className="font-mono font-semibold text-teal-800">{weights.battery}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={weights.battery}
                  onChange={(e) => setWeights({ ...weights, battery: parseInt(e.target.value, 10) })}
                  className="w-full accent-teal-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Repairability</span>
                  <span className="font-mono font-semibold text-teal-800">{weights.repairability}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={weights.repairability}
                  onChange={(e) => setWeights({ ...weights, repairability: parseInt(e.target.value, 10) })}
                  className="w-full accent-teal-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Cost & Budget</span>
                  <span className="font-mono font-semibold text-teal-800">{weights.costValue}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={weights.costValue}
                  onChange={(e) => setWeights({ ...weights, costValue: parseInt(e.target.value, 10) })}
                  className="w-full accent-teal-700"
                />
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="py-4 px-4 w-44 text-slate-500 font-semibold uppercase tracking-wider">
                    Product / Metric
                  </th>
                  {rankedProducts.map(({ product, scoreResult, tco }, idx) => {
                    const standout = getStandoutBadge(idx, { product, scoreResult, tco });
                    return (
                      <th key={product.id} className="py-4 px-4 align-top w-64 border-l border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] text-slate-500 block">
                              Rank #{idx + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-900 block mt-0.5">
                              {product.name}
                            </span>
                          </div>
                          <button
                            onClick={() => onRemoveProduct(product.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-200 transition-colors"
                            title={`Remove ${product.name} from comparison`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {standout && (
                          <span className={`mt-2 inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${standout.color}`}>
                            {standout.text}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* WorthIt Score */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    WorthIt Score
                  </td>
                  {rankedProducts.map(({ product, scoreResult }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-teal-800 font-mono tabular-nums">
                          {scoreResult.overallScore ?? '—'}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">/100</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {scoreResult.activeDimensionCount} of 5 active dimensions
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Purchase Price */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Observed Retail Price
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100">
                      {product.priceInInr?.value ? (
                        <div>
                          <div className="font-bold font-mono tabular-nums text-slate-900 text-sm">
                            ₹{product.priceInInr.value.toLocaleString('en-IN')}
                          </div>
                          <EvidenceBadge type={product.priceInInr.evidenceType} size="sm" />
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-400 italic">Not verified</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 3-Year Ownership Cost */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    3-Year Ownership (TCO)
                  </td>
                  {rankedProducts.map(({ product, tco }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100">
                      <div className="font-bold font-mono tabular-nums text-slate-900 text-sm">
                        ₹{tco.totalCostOfOwnership.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums block">
                        ~₹{tco.monthlyEquivalent.toLocaleString('en-IN')}/mo
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Key Specs */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Processor / Chipset
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100 text-slate-700">
                      {product.specs.processor?.value ? String(product.specs.processor.value) : '—'}
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    RAM & Storage
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100 text-slate-700">
                      <div>{product.specs.ram?.value || '—'}</div>
                      <div className="text-slate-500">{product.specs.storage?.value || '—'}</div>
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Display & Screen
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100 text-slate-700">
                      {product.specs.display?.value ? String(product.specs.display.value) : '—'}
                    </td>
                  ))}
                </tr>

                {/* Battery & Charging */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Battery Capacity
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100 text-slate-700">
                      {product.specs.batteryCapacity?.value ? String(product.specs.batteryCapacity.value) : '—'}
                    </td>
                  ))}
                </tr>

                {/* Software OS Updates */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Software OS Updates
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100">
                      <span className="font-semibold text-slate-900 font-mono tabular-nums">
                        {product.warranty.softwareUpdatePolicyYears?.value
                          ? `${product.warranty.softwareUpdatePolicyYears.value} Years`
                          : 'Not verified'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Repairability Index */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Repairability Index
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100">
                      <span className="font-semibold font-mono tabular-nums text-slate-900">
                        {product.repairability.scoreOutOfTen?.value ?? '—'}/10
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {product.repairability.batteryReplaceable?.value ? 'Battery replaceable' : 'Glued battery'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Data Completeness */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Data Completeness
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-3 px-4 border-l border-slate-100">
                      <DataCompletenessMeter score={product.dataCompleteness} size="sm" />
                    </td>
                  ))}
                </tr>

                {/* Action Row */}
                <tr>
                  <td className="py-4 px-4 font-semibold text-slate-900">
                    Deep Dive
                  </td>
                  {rankedProducts.map(({ product }) => (
                    <td key={product.id} className="py-4 px-4 border-l border-slate-100">
                      <button
                        onClick={() => onSelectProduct(product)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Open Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Key Trade-offs Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-700" />
              <span>Key Trade-Off Synthesis</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {rankedProducts.map(({ product, scoreResult }) => (
                <div key={product.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900">
                    {product.name}
                  </div>
                  <div>
                    <strong className="text-emerald-800">Primary Strength: </strong>
                    <span className="text-slate-700">{scoreResult.strengths[0] || 'Solid balanced performance across standard workloads.'}</span>
                  </div>
                  <div>
                    <strong className="text-amber-800">Primary Compromise: </strong>
                    <span className="text-slate-700">{scoreResult.tradeoffs[0] || 'Check retailer policy for local warranty and repairs.'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
