import React, { useState } from 'react';
import { UserPreferences, ProductCategory, Product } from '../types';
import {
  SlidersHorizontal,
  ArrowRight,
  IndianRupee,
  Calendar,
  Check,
  Sparkles,
} from 'lucide-react';

interface PreferencesPageProps {
  product?: Product;
  productCategory?: ProductCategory;
  preferences?: UserPreferences;
  initialPreferences?: UserPreferences;
  onSavePreferences: (prefs: UserPreferences) => void;
  onSkip: () => void;
}

export const PreferencesPage: React.FC<PreferencesPageProps> = ({
  product,
  productCategory,
  preferences,
  initialPreferences,
  onSavePreferences,
  onSkip,
}) => {
  const cat = product?.category || productCategory || 'laptop';
  const isLaptop = cat === 'laptop';
  const activePrefs = preferences || initialPreferences;

  const defaultUses = isLaptop
    ? ['programming', 'college work', 'gaming', 'design', 'office', 'everyday']
    : ['photography', 'battery', 'gaming', 'software support', 'durability'];

  const [selectedUses, setSelectedUses] = useState<string[]>(
    activePrefs?.intendedUse || []
  );
  const [budget, setBudget] = useState<string>(
    activePrefs?.maxBudgetInInr ? String(activePrefs.maxBudgetInInr) : ''
  );
  const [years, setYears] = useState<number>(
    activePrefs?.expectedOwnershipYears || 3
  );
  const [weights, setWeights] = useState({
    batteryLife: activePrefs?.importanceWeights?.batteryLife || 3,
    performance: activePrefs?.importanceWeights?.performance || 4,
    portability: activePrefs?.importanceWeights?.portability || 3,
    repairability: activePrefs?.importanceWeights?.repairability || 3,
  });
  const [essentialRequirements, setEssentialRequirements] = useState(
    activePrefs?.essentialRequirements || ''
  );

  const toggleUse = (use: string) => {
    setSelectedUses((prev) =>
      prev.includes(use) ? prev.filter((u) => u !== use) : [...prev, use]
    );
  };

  const handleSliderChange = (key: keyof typeof weights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    const numBudget = budget ? parseInt(budget.replace(/[^0-9]/g, ''), 10) : undefined;
    const prefs: UserPreferences = {
      category: product.category,
      intendedUse: selectedUses,
      maxBudgetInInr: numBudget && numBudget > 0 ? numBudget : undefined,
      expectedOwnershipYears: years,
      importanceWeights: weights,
      essentialRequirements: essentialRequirements.trim(),
    };
    onSavePreferences(prefs);
  };

  const budgetPresets = isLaptop
    ? [50000, 75000, 100000, 130000, 160000]
    : [20000, 35000, 50000, 70000, 100000];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Step 2 of 3 · Personal Alignment
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Tailor Your Evaluation Criteria
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evaluating: <span className="font-semibold text-slate-800">{product.name}</span>. All questions are skippable.
          </p>
        </div>
        <button
          onClick={onSkip}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 underline transition-colors"
        >
          Skip & View Report
        </button>
      </div>

      <div className="space-y-6">
        {/* 1. Intended Use */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <label className="block text-sm font-semibold text-slate-900">
            1. What will you primarily use this {isLaptop ? 'laptop' : 'phone'} for?
          </label>
          <p className="text-xs text-slate-500">
            Select all applicable workloads to evaluate memory, thermal headroom, and processor fit.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {defaultUses.map((use) => {
              const active = selectedUses.includes(use);
              return (
                <button
                  key={use}
                  type="button"
                  onClick={() => toggleUse(use)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium capitalize transition-all border flex items-center gap-1.5 ${
                    active
                      ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                  <span>{use}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Maximum Budget */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <label htmlFor="budget-input" className="block text-sm font-semibold text-slate-900">
            2. Maximum Budget (in Indian Rupees ₹)
          </label>
          <p className="text-xs text-slate-500">
            We will check if the product fits comfortably within your limit or incurs stretching.
          </p>
          <div className="relative max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
              ₹
            </span>
            <input
              id="budget-input"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={isLaptop ? 'e.g. 85000' : 'e.g. 40000'}
              className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pt-1">
            <span>Quick presets:</span>
            {budgetPresets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBudget(String(p))}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono tabular-nums text-[11px]"
              >
                ₹{p.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Expected Ownership Timeline */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <label className="block text-sm font-semibold text-slate-900">
            3. Expected Ownership Duration
          </label>
          <p className="text-xs text-slate-500">
            Used to calculate true cost of ownership (electricity, battery replacement, maintenance).
          </p>
          <div className="flex items-center gap-3">
            {[2, 3, 4, 5].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  years === y
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {y} Years
              </button>
            ))}
          </div>
        </div>

        {/* 4. Importance Weights (1-5 Sliders) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              4. Feature Priorities (1 = Lowest, 5 = Highest)
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              These weights dynamically calibrate the transparent WorthIt scoring dimensions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Battery Life & Endurance</span>
                <span className="font-mono font-semibold text-teal-800">{weights.batteryLife}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={weights.batteryLife}
                onChange={(e) => handleSliderChange('batteryLife', parseInt(e.target.value, 10))}
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Performance & Speed</span>
                <span className="font-mono font-semibold text-teal-800">{weights.performance}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={weights.performance}
                onChange={(e) => handleSliderChange('performance', parseInt(e.target.value, 10))}
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Portability & Weight</span>
                <span className="font-mono font-semibold text-teal-800">{weights.portability}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={weights.portability}
                onChange={(e) => handleSliderChange('portability', parseInt(e.target.value, 10))}
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Repairability & Spare Parts</span>
                <span className="font-mono font-semibold text-teal-800">{weights.repairability}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={weights.repairability}
                onChange={(e) => handleSliderChange('repairability', parseInt(e.target.value, 10))}
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 5. Essential Requirements (Free text) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <label htmlFor="essential-reqs-textarea" className="block text-sm font-semibold text-slate-900">
            5. Essential Deal-breakers or Requirements (Optional)
          </label>
          <p className="text-xs text-slate-500">
            e.g. "Must be silent and fanless", "Must have expandable RAM slot", "Must have official IP68 rating", "Must have MagSafe/Fast charging".
          </p>
          <textarea
            id="essential-reqs-textarea"
            rows={2}
            value={essentialRequirements}
            onChange={(e) => setEssentialRequirements(e.target.value)}
            placeholder="Type any specific requirement..."
            className="w-full text-sm rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Skip Preferences
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-teal-300" />
          <span>Generate Intelligence Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
