import React, { useState } from 'react';
import { Product, OwnershipCostInputs, EvidenceType } from '../types';
import { calculateOwnershipCost, getDefaultOwnershipInputs } from '../lib/ownershipCost';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import {
  IndianRupee,
  Zap,
  Battery,
  Wrench,
  ShoppingBag,
  Clock,
  HelpCircle,
  AlertCircle,
  RotateCcw,
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

interface CostCalculatorPageProps {
  product: Product;
  onUpdatePurchasePrice: (priceInr: number) => void;
}

export const CostCalculatorPage: React.FC<CostCalculatorPageProps> = ({
  product,
  onUpdatePurchasePrice,
}) => {
  const currentPrice = product.priceInInr?.value || 0;
  const currentPriceType: EvidenceType = product.priceInInr?.evidenceType || 'unknown';

  const [inputs, setInputs] = useState<OwnershipCostInputs>(() =>
    getDefaultOwnershipInputs(product.category, currentPrice, currentPriceType, 3)
  );

  const result = calculateOwnershipCost(inputs);

  const handlePriceChange = (val: number) => {
    setInputs((prev) => ({
      ...prev,
      purchasePriceInr: Math.max(0, val),
      purchasePriceType: 'user-provided',
    }));
    onUpdatePurchasePrice(Math.max(0, val));
  };

  const handleReset = () => {
    setInputs(getDefaultOwnershipInputs(product.category, currentPrice, currentPriceType, 3));
  };

  // Stacked chart data
  const stackedData = [
    {
      name: `${inputs.years}-Year Cost Breakdown`,
      'Purchase Price': result.purchasePrice,
      'Electricity (Energy)': result.totalElectricityCost,
      'Battery Service': result.maintenanceCost,
      'Contingency Repair': result.repairScenarioCost,
      'Accessories & Protection': result.accessoriesCost,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Financial Transparency Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Total Cost of Ownership (TCO) Calculator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing long-term financial commitment for: <span className="font-semibold text-slate-800">{product.name}</span>
          </p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 self-start sm:self-auto py-1 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Assumptions</span>
        </button>
      </div>

      {/* Critical Principle Warning */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-amber-900">
            Ownership Principle:
          </strong>{' '}
          Never treat a potential repair scenario as certain spend. Repairs are optional risk contingencies. Electricity estimates rely on Indian state DISCOM residential tariff averages (~₹7.5/kWh).
        </div>
      </div>

      {/* High-Level Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Total Projected Ownership</span>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            ₹{result.totalCostOfOwnership.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">
            Over {inputs.years} years ({inputs.years * 12} calendar months).
          </p>
        </div>

        <div className="bg-teal-900 text-white p-6 rounded-2xl shadow-xs space-y-1">
          <span className="text-xs text-teal-200 font-medium">Monthly Equivalent Expense</span>
          <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
            ₹{result.monthlyEquivalent.toLocaleString('en-IN')}
            <span className="text-sm font-normal text-teal-300">/mo</span>
          </div>
          <p className="text-[11px] text-teal-200">
            Effective monthly cost of operating and owning this device.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Projected Electricity Drain</span>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            ₹{result.totalElectricityCost.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
            {result.annualElectricityKwh} kWh/yr @ ₹{inputs.electricityTariffInr.toFixed(2)}/kWh.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Interactive Inputs & Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Customizable Cost Parameters
          </h2>

          {/* 1. Purchase Price */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="cost-purchase-price" className="font-semibold text-slate-700">Purchase Price (₹)</label>
              <EvidenceBadge type={inputs.purchasePriceType} size="sm" />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                ₹
              </span>
              <input
                id="cost-purchase-price"
                type="number"
                value={inputs.purchasePriceInr || ''}
                onChange={(e) => handlePriceChange(parseInt(e.target.value || '0', 10))}
                className="w-full pl-8 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* 2. Ownership Duration */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Ownership Horizon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setInputs((p) => ({ ...p, years: y }))}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    inputs.years === y
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {y} Years
                </button>
              ))}
            </div>
          </div>

          {/* 3. Daily Usage Hours & Power Draw */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="cost-daily-hours" className="font-semibold text-slate-700">Usage / Day</label>
                <span className="font-mono text-teal-800">{inputs.dailyUsageHours} hrs</span>
              </div>
              <input
                id="cost-daily-hours"
                type="range"
                min={1}
                max={16}
                value={inputs.dailyUsageHours}
                onChange={(e) => setInputs((p) => ({ ...p, dailyUsageHours: parseInt(e.target.value, 10) }))}
                className="w-full accent-teal-700"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label htmlFor="cost-power-draw" className="font-semibold text-slate-700">Avg Draw (W)</label>
                <span className="font-mono text-teal-800">{inputs.powerDrawWatts} W</span>
              </div>
              <input
                id="cost-power-draw"
                type="number"
                value={inputs.powerDrawWatts}
                onChange={(e) => setInputs((p) => ({ ...p, powerDrawWatts: parseInt(e.target.value || '0', 10) }))}
                className="w-full text-xs font-mono tabular-nums p-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* 4. Electricity Tariff in India */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="cost-electricity-tariff" className="font-semibold text-slate-700">Indian Electricity Tariff (₹/kWh)</label>
              <span className="text-[11px] text-slate-500">Avg urban tariff</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                ₹
              </span>
              <input
                id="cost-electricity-tariff"
                type="number"
                step="0.5"
                value={inputs.electricityTariffInr}
                onChange={(e) => setInputs((p) => ({ ...p, electricityTariffInr: parseFloat(e.target.value || '0') }))}
                className="w-full pl-7 pr-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* 5. Optional Scenarios (Battery & Repair & Accessories) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700">
              Optional Scenarios & Contingencies
            </div>

            {/* Battery Replacement */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs">
                <div className="font-semibold text-slate-900">Battery Replacement (Yr 2-3)</div>
                <div className="text-slate-500 font-mono tabular-nums">Est. ₹{inputs.estimatedBatteryCostInr.toLocaleString('en-IN')}</div>
              </div>
              <input
                type="checkbox"
                checked={inputs.batteryReplacementIncluded}
                onChange={(e) => setInputs((p) => ({ ...p, batteryReplacementIncluded: e.target.checked }))}
                className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
              />
            </div>

            {/* Repair Scenario */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs">
                <div className="font-semibold text-slate-900">Out-of-Warranty Repair Contingency</div>
                <div className="text-slate-500 font-mono tabular-nums">Est. ₹{inputs.estimatedRepairCostInr.toLocaleString('en-IN')} (Hypothetical)</div>
              </div>
              <input
                type="checkbox"
                checked={inputs.repairScenarioIncluded}
                onChange={(e) => setInputs((p) => ({ ...p, repairScenarioIncluded: e.target.checked }))}
                className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
              />
            </div>

            {/* Accessories */}
            <div className="space-y-1">
              <label htmlFor="cost-accessories" className="block text-xs text-slate-700">Accessories, Bag & Screen Protector (₹)</label>
              <input
                id="cost-accessories"
                type="number"
                value={inputs.accessoriesCostInr}
                onChange={(e) => setInputs((p) => ({ ...p, accessoriesCostInr: parseInt(e.target.value || '0', 10) }))}
                className="w-full text-xs font-mono tabular-nums p-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Breakdown Visuals & Scenarios (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stacked Recharts Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Stacked Cost Component Visualization
            </h2>
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString('en-IN')}`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Purchase Price" stackId="cost" fill="#0f766e" />
                  <Bar dataKey="Electricity (Energy)" stackId="cost" fill="#f59e0b" />
                  <Bar dataKey="Battery Service" stackId="cost" fill="#06b6d4" />
                  <Bar dataKey="Contingency Repair" stackId="cost" fill="#ef4444" />
                  <Bar dataKey="Accessories & Protection" stackId="cost" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Three Scenarios: Low, Typical, High */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Range Projections (Low · Typical · High)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Low Scenario
                </span>
                <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                  ₹{result.scenarios.low.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Modest 3.5h/day usage, low tariff, zero repairs, no accessories.
                </p>
              </div>

              <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-teal-800">
                  Typical Scenario
                </span>
                <div className="text-lg font-bold text-teal-950 font-mono tabular-nums">
                  ₹{result.scenarios.typical.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-teal-700 leading-tight">
                  Based on your current customized parameters.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  High Contingency
                </span>
                <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                  ₹{result.scenarios.high.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Heavy 9h/day load, battery refresh, repair contingency included.
                </p>
              </div>
            </div>
          </div>

          {/* Assumptions Audit Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Assumption Transparency Audit
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2 px-3">Parameter</th>
                    <th className="py-2 px-3">Assumed Value</th>
                    <th className="py-2 px-3">Status Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.assumptions.map((ass, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-medium text-slate-800">{ass.label}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-700">{ass.value}</td>
                      <td className="py-2 px-3">
                        <EvidenceBadge type={ass.type} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
