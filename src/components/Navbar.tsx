import React from 'react';
import { Bookmark, ShieldCheck, Sparkles, Scale, IndianRupee, MessageSquareText } from 'lucide-react';

export type ActivePage =
  | 'landing'
  | 'identify'
  | 'preferences'
  | 'dashboard'
  | 'reviews'
  | 'cost'
  | 'compare'
  | 'saved'
  | 'methodology';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  savedCount: number;
  compareCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  savedCount,
  compareCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onNavigate('landing')}
          className="text-left flex items-center gap-2 shrink-0 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg p-1"
          aria-label="WorthIt AI Home"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-teal-800 transition-colors">
            W
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            WorthIt<span className="text-teal-700 font-extrabold">.ai</span>
          </span>
        </button>

        {/* Zone 2: Navigation Links (1-2 word labels, single-line, unboxed) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('landing')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'landing'
                ? 'text-teal-800 bg-teal-50/80 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Research
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'dashboard'
                ? 'text-teal-800 bg-teal-50/80 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => onNavigate('reviews')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
              activePage === 'reviews'
                ? 'text-teal-800 bg-teal-50/80 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            Reviews
          </button>

          <button
            onClick={() => onNavigate('cost')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
              activePage === 'cost'
                ? 'text-teal-800 bg-teal-50/80 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            Ownership Cost
          </button>

          <button
            onClick={() => onNavigate('compare')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
              activePage === 'compare'
                ? 'text-teal-800 bg-teal-50/80 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Compare
            {compareCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-semibold">
                {compareCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('saved')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
              activePage === 'saved'
                ? 'text-teal-800 bg-teal-50/80 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Saved
            {savedCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-semibold">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('methodology')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
              activePage === 'methodology'
                ? 'text-teal-800 bg-teal-50/80 font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Methodology
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('landing')}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-98 transition-all shadow-xs whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Evaluate</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden border-t border-slate-100 bg-slate-50/90 px-3 py-1.5 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        <button
          onClick={() => onNavigate('landing')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
            activePage === 'landing' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600'
          }`}
        >
          Research
        </button>
        <button
          onClick={() => onNavigate('dashboard')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
            activePage === 'dashboard' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('reviews')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
            activePage === 'reviews' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600'
          }`}
        >
          Reviews
        </button>
        <button
          onClick={() => onNavigate('cost')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
            activePage === 'cost' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600'
          }`}
        >
          Ownership Cost
        </button>
        <button
          onClick={() => onNavigate('compare')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
            activePage === 'compare' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600'
          }`}
        >
          Compare {compareCount > 0 ? `(${compareCount})` : ''}
        </button>
        <button
          onClick={() => onNavigate('saved')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
            activePage === 'saved' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600'
          }`}
        >
          Saved {savedCount > 0 ? `(${savedCount})` : ''}
        </button>
        <button
          onClick={() => onNavigate('methodology')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
            activePage === 'methodology' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600'
          }`}
        >
          Methodology
        </button>
      </div>
    </header>
  );
};
