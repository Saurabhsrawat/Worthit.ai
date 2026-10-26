import React, { useState } from 'react';
import { Product, ProductSpecs } from '../types';
import { X, Check, FileText, AlertCircle } from 'lucide-react';

interface MissingSpecsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSaveSpecs: (updatedSpecs: ProductSpecs) => void;
}

export const MissingSpecsModal: React.FC<MissingSpecsModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaveSpecs,
}) => {
  const [ram, setRam] = useState(product.specs.ram?.value || '');
  const [storage, setStorage] = useState(product.specs.storage?.value || '');
  const [processor, setProcessor] = useState(product.specs.processor?.value || '');
  const [display, setDisplay] = useState(product.specs.display?.value || '');
  const [battery, setBattery] = useState(product.specs.batteryCapacity?.value || '');
  const [camera, setCamera] = useState(product.specs.camera?.value || '');
  const [pastedSpecText, setPastedSpecText] = useState('');
  const [activeTab, setActiveTab] = useState<'form' | 'paste'>('form');

  if (!isOpen) return null;

  const handleParsePastedText = () => {
    if (!pastedSpecText.trim()) return;
    const text = pastedSpecText.toLowerCase();

    // RAM extraction
    const ramMatch = text.match(/(\d+\s*(?:gb|mb)\s*(?:ddr\d|lpddr\d[x]?|unified|ram)?)/i);
    if (ramMatch && !ram) setRam(ramMatch[1].toUpperCase());

    // Storage extraction
    const ssdMatch = text.match(/(\d+\s*(?:gb|tb)\s*(?:nvme|pcie|ssd|ufs\s*\d\.\d)?)/i);
    if (ssdMatch && !storage) setStorage(ssdMatch[1].toUpperCase() + ' SSD');

    // Processor extraction
    const procMatch = text.match(/(core\s*i[3579]|ryzen\s*[3579]|snapdragon\s*\w+|dimensity\s*\w+|apple\s*m\d)/i);
    if (procMatch && !processor) setProcessor(procMatch[0]);

    // Display extraction
    const dispMatch = text.match(/(\d+(\.\d+)?-inch.*?(fhd|qhd|uhd|oled|amoled|120hz|90hz|144hz|ips))/i);
    if (dispMatch && !display) setDisplay(dispMatch[0]);

    // Battery extraction
    const battMatch = text.match(/(\d{4,5}\s*mah|\d{2,3}\s*wh)/i);
    if (battMatch && !battery) setBattery(battMatch[0]);

    setActiveTab('form');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ProductSpecs = {
      ...product.specs,
      processor: processor.trim()
        ? {
            value: processor.trim(),
            evidenceType: 'user-provided',
            source: 'Manually supplied by user',
          }
        : product.specs.processor,
      ram: ram.trim()
        ? {
            value: ram.trim(),
            evidenceType: 'user-provided',
            source: 'Manually supplied by user',
          }
        : product.specs.ram,
      storage: storage.trim()
        ? {
            value: storage.trim(),
            evidenceType: 'user-provided',
            source: 'Manually supplied by user',
          }
        : product.specs.storage,
      display: display.trim()
        ? {
            value: display.trim(),
            evidenceType: 'user-provided',
            source: 'Manually supplied by user',
          }
        : product.specs.display,
      batteryCapacity: battery.trim()
        ? {
            value: battery.trim(),
            evidenceType: 'user-provided',
            source: 'Manually supplied by user',
          }
        : product.specs.batteryCapacity,
      camera: camera.trim()
        ? {
            value: camera.trim(),
            evidenceType: 'user-provided',
            source: 'Manually supplied by user',
          }
        : product.specs.camera,
    };

    onSaveSpecs(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Supply Specifications Manually
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Entries will be tagged as <strong>user-provided</strong> and recalculate your Worth-It verdict instantly.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'form'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Form Fields
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Product Spec Sheet</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'paste' ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Paste raw text from manufacturer spec pages (e.g. from ASUS, Apple, Xiaomi, or Lenovo product pages). We'll auto-extract RAM, CPU, SSD, and display.
                </span>
              </div>
              <textarea
                value={pastedSpecText}
                onChange={(e) => setPastedSpecText(e.target.value)}
                rows={8}
                placeholder="Paste product specification text here..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-mono"
              />
              <button
                type="button"
                onClick={handleParsePastedText}
                className="w-full py-2 bg-teal-800 text-white rounded-xl text-xs font-semibold hover:bg-teal-900"
              >
                Auto-Fill Fields From Pasted Text
              </button>
            </div>
          ) : (
            <form id="spec-form" onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Processor / Chipset
                </label>
                <input
                  type="text"
                  value={processor}
                  onChange={(e) => setProcessor(e.target.value)}
                  placeholder="e.g. Intel Core i5-13420H / Snapdragon 7s Gen 2"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RAM Capacity
                  </label>
                  <input
                    type="text"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    placeholder="e.g. 16GB DDR4 / 8GB LPDDR5X"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Storage Type & Size
                  </label>
                  <input
                    type="text"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    placeholder="e.g. 512GB PCIe NVMe SSD"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display (Resolution / Refresh Rate / Panel)
                </label>
                <input
                  type="text"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  placeholder="e.g. 15.6-inch FHD (1920x1080) 120Hz IPS"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Battery Capacity
                  </label>
                  <input
                    type="text"
                    value={battery}
                    onChange={(e) => setBattery(e.target.value)}
                    placeholder="e.g. 5000 mAh or 54 Wh"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Camera / OIS (for phone)
                  </label>
                  <input
                    type="text"
                    value={camera}
                    onChange={(e) => setCamera(e.target.value)}
                    placeholder="e.g. 50MP Sony IMX890 with OIS"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="spec-form"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Specs & Recalculate Fit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
