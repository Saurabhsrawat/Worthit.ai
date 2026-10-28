import React, { useState } from 'react';
import { Product, ProductSpecs, EvidenceField } from '../../types';
import { X, Check, Cpu, Sparkles } from 'lucide-react';

interface SpecEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSpecs: ProductSpecs) => void;
}

export const SpecEditModal: React.FC<SpecEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isLaptop = product.category === 'laptop';

  // Form state initialized from existing product specs
  const [processor, setProcessor] = useState(product.specs.processor?.value || '');
  const [ram, setRam] = useState(product.specs.ram?.value || '');
  const [storage, setStorage] = useState(product.specs.storage?.value || '');
  const [display, setDisplay] = useState(product.specs.display?.value || '');
  const [battery, setBattery] = useState(product.specs.battery?.value || product.specs.batteryCapacity?.value || '');
  const [weight, setWeight] = useState(product.specs.weight?.value || (product.specs.weightKg?.value ? `${product.specs.weightKg.value} kg` : ''));
  const [charging, setCharging] = useState(product.specs.chargingSpeed?.value || (product.specs.chargingSpeedWatts?.value ? `${product.specs.chargingSpeedWatts.value}W` : ''));
  const [extraSpec, setExtraSpec] = useState(
    isLaptop
      ? product.specs.gpu?.value || ''
      : product.specs.camera?.value || ''
  );
  const [durability, setDurability] = useState(product.specs.durability?.value || '');
  const [softwareUpdates, setSoftwareUpdates] = useState(product.specs.softwareUpdates?.value || '');

  const createFact = (val: string, oldFact?: EvidenceField<any>): EvidenceField<string> => {
    const trimmed = val.trim();
    if (!trimmed) {
      return {
        value: 'Unknown',
        evidenceType: 'unknown',
        source: 'Not provided',
      };
    }
    // If user changed it, or if it was unknown/ai-recalled, mark as user-provided
    const wasChanged = trimmed !== (oldFact?.value || '');
    return {
      value: trimmed,
      evidenceType: wasChanged || oldFact?.evidenceType === 'unknown' || oldFact?.evidenceType === 'ai-recalled'
        ? 'user-provided'
        : (oldFact?.evidenceType || 'user-provided'),
      source: wasChanged || oldFact?.evidenceType === 'unknown' || oldFact?.evidenceType === 'ai-recalled'
        ? 'User provided / confirmed'
        : (oldFact?.source || 'User confirmed'),
      sourceUrl: oldFact?.sourceUrl,
    };
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ProductSpecs = {
      ...product.specs,
      processor: createFact(processor, product.specs.processor),
      ram: createFact(ram, product.specs.ram),
      storage: createFact(storage, product.specs.storage),
      display: createFact(display, product.specs.display),
      battery: createFact(battery, product.specs.battery),
      weight: createFact(weight, product.specs.weight),
      chargingSpeed: createFact(charging, product.specs.chargingSpeed),
      durability: createFact(durability, product.specs.durability),
      softwareUpdates: createFact(softwareUpdates, product.specs.softwareUpdates),
    };

    if (isLaptop) {
      updated.gpu = createFact(extraSpec, product.specs.gpu);
    } else {
      updated.camera = createFact(extraSpec, product.specs.camera);
    }

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-150">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-800 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Confirm or Edit Hardware Specifications
              </h2>
              <p className="text-xs text-slate-500">
                Tier 3 Spec Fallback · Update your exact retail configuration (marks values as User-provided)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Processor */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Processor / Chipset
              </label>
              <input
                type="text"
                value={processor}
                onChange={(e) => setProcessor(e.target.value)}
                placeholder="e.g. Intel Core i5-1335U / Snapdragon 8s Gen 3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* RAM */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                RAM Size & Type
              </label>
              <input
                type="text"
                value={ram}
                onChange={(e) => setRam(e.target.value)}
                placeholder="e.g. 16GB LPDDR5 / 8GB RAM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* Storage */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Storage Size & Technology
              </label>
              <input
                type="text"
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                placeholder="e.g. 512GB PCIe 4.0 NVMe SSD / 256GB UFS 3.1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* Display */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Display (Resolution, Refresh, Panel)
              </label>
              <input
                type="text"
                value={display}
                onChange={(e) => setDisplay(e.target.value)}
                placeholder="e.g. 14-inch 2.8K 120Hz OLED / 6.78-inch 1.5K AMOLED"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* Battery */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Battery Capacity & Claimed Life
              </label>
              <input
                type="text"
                value={battery}
                onChange={(e) => setBattery(e.target.value)}
                placeholder="e.g. 5500 mAh / 65 Wh (up to 12 hours)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* Charging Speed */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Charging Speed
              </label>
              <input
                type="text"
                value={charging}
                onChange={(e) => setCharging(e.target.value)}
                placeholder="e.g. 100W SuperVOOC / 65W USB-C PD"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Weight
              </label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 1.38 kg / 207 g"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* GPU or Camera */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isLaptop ? 'Graphics (GPU)' : 'Camera Hardware'}
              </label>
              <input
                type="text"
                value={extraSpec}
                onChange={(e) => setExtraSpec(e.target.value)}
                placeholder={isLaptop ? "e.g. NVIDIA RTX 4050 6GB / Intel Iris Xe" : "e.g. 50MP Sony IMX890 OIS + 8MP UW"}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* Durability */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Build & IP Rating
              </label>
              <input
                type="text"
                value={durability}
                onChange={(e) => setDurability(e.target.value)}
                placeholder="e.g. IP68 water resistance, Gorilla Glass Victus 2, All-metal chassis"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            {/* Software Updates */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                OS & Software Support Years
              </label>
              <input
                type="text"
                value={softwareUpdates}
                onChange={(e) => setSoftwareUpdates(e.target.value)}
                placeholder="e.g. 4 Android OS updates + 5 years security patches"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span>
              Saving these specifications updates your score breakdown, spec scorecard, and personal review immediately without re-querying the web. Edited fields will be clearly tagged with a "User-provided" badge.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-teal-800 hover:bg-teal-900 text-white rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Specifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
