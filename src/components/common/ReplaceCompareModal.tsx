import React from 'react';
import { Product } from '../../types';
import { X, Scale, ArrowRightLeft, AlertCircle } from 'lucide-react';

interface ReplaceCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingProduct: Product | null;
  currentComparedProducts: Product[];
  onReplace: (targetProductId: string, incomingProduct: Product) => void;
}

export const ReplaceCompareModal: React.FC<ReplaceCompareModalProps> = ({
  isOpen,
  onClose,
  incomingProduct,
  currentComparedProducts,
  onReplace,
}) => {
  if (!isOpen || !incomingProduct) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Comparison is full (4 of 4)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Remove one to add another
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span>You want to add </span>
              <strong className="font-semibold text-slate-900">{incomingProduct.name}</strong>
              {incomingProduct.selectedVariant && (
                <span className="text-amber-800"> ({incomingProduct.selectedVariant})</span>
              )}
              <span>. Select which existing product to swap out:</span>
            </div>
          </div>

          <div className="space-y-2">
            {currentComparedProducts.map((p, idx) => {
              const priceStr = p.priceInInr?.value
                ? `₹${p.priceInInr.value.toLocaleString('en-IN')}`
                : 'Price unverified';

              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-slate-50/60 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <span>Slot {idx + 1}</span>
                      <span>•</span>
                      <span>{p.brand}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-700">{priceStr}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {p.name}
                    </div>
                    {p.selectedVariant && (
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {p.selectedVariant}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onReplace(p.id, incomingProduct)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Replace</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
