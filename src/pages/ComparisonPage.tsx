import React, { useState, useMemo } from 'react';
import { Product, UserPreferences, DimensionScore } from '../types';
import { calculateWorthItScore } from '../lib/scoring';
import { calculateOwnershipCost, getDefaultOwnershipInputs } from '../lib/ownershipCost';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import { DataCompletenessMeter } from '../components/common/DataCompletenessMeter';
import { SEED_PRODUCTS, DEMO_SHOWCASE_PRODUCT } from '../data/seed';
import {
  Scale,
  X,
  Plus,
  SlidersHorizontal,
  Award,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface ComparisonPageProps {
  comparedProducts: Product[];
  onRemoveProduct: (productId: string) => void;
  onAddProduct: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  userPreferences?: UserPreferences;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({
  comparedProducts,
  onRemoveProduct,
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

  const allAvailable = [DEMO_SHOWCASE_PRODUCT, ...SEED_PRODUCTS];
  const candidatePool = allAvailable.filter(
    (p) => !comparedProducts.some((cp) => cp.id === p.id)
  );

  // Compute live scores and ranking for each compared product
  const rankedProducts = useMemo(() => {
    return comparedProducts.map((p) => {
      // Create temporary prefs reflecting the comparison sliders
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
    // Check lowest cost
    const lowestCost = Math.min(...rankedProducts.map((r) => r.tco.totalCostOfOwnership));
    if (item.tco.totalCostOfOwnership === lowestCost && item.tco.totalCostOfOwnership > 0) {
      return { text: 'Lowest 3-Year TCO', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    return null;
  };

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

      {/* Live Reweighting Bar */}
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

      {/* When fewer than 2 products in comparison */}
      {comparedProducts.length < 2 && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-4">
          <Scale className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              Add at Least 2 Products to Compare
            </h3>
            <p className="text-xs text-slate-500">
              You currently have {comparedProducts.length} product in the comparison tray. Select from the candidate suggestions below:
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {candidatePool.slice(0, 6).map((cand) => {
              const displayName = cand.name.toLowerCase().startsWith(cand.brand.toLowerCase())
                ? cand.name.split('(')[0].trim()
                : `${cand.brand} ${cand.name.split('(')[0].trim()}`;
              return (
                <button
                  key={cand.id}
                  onClick={() => onAddProduct(cand)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-700" />
                  <span>+ {displayName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Grid */}
      {comparedProducts.length >= 2 && (
        <div className="space-y-6">
          {/* Quick Add Bar if space available (< 4) */}
          {comparedProducts.length < 4 && candidatePool.length > 0 && (
            <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
              <span className="font-medium text-slate-500 whitespace-nowrap">
                Add another to compare:
              </span>
              {candidatePool.slice(0, 4).map((cand) => {
                const displayName = cand.name.toLowerCase().startsWith(cand.brand.toLowerCase())
                  ? cand.name.split('(')[0].trim()
                  : `${cand.brand} ${cand.name.split('(')[0].trim()}`;
                return (
                  <button
                    key={cand.id}
                    onClick={() => onAddProduct(cand)}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap text-xs font-medium"
                  >
                    + {displayName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Side-by-Side Cards Table */}
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
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                            title="Remove from comparison"
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

                {/* Warranty & Software Support */}
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
              {rankedProducts.map(({ product, scoreResult }, idx) => (
                <div key={product.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900">
                    {product.name}
                  </div>
                  <div>
                    <strong className="text-emerald-800">Primary Strength: </strong>
                    <span className="text-slate-700">{scoreResult.strengths[0] || 'Standard commercial performance.'}</span>
                  </div>
                  <div>
                    <strong className="text-amber-800">Primary Compromise: </strong>
                    <span className="text-slate-700">{scoreResult.tradeoffs[0] || 'Check specific return terms.'}</span>
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
