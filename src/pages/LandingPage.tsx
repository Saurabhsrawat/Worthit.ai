import React, { useState, useRef } from 'react';
import { ProductCategory, Product } from '../types';
import { DEMO_SHOWCASE_PRODUCT, SEED_PRODUCTS } from '../data/seed';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import { DataCompletenessMeter } from '../components/common/DataCompletenessMeter';
import {
  UploadCloud,
  Search,
  Link2,
  Laptop,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Scale,
  SlidersHorizontal,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onStartSearch: (query: string, category: ProductCategory) => void;
  onStartPhoto: (file: File) => void;
  onStartUrl: (url: string, category: ProductCategory) => void;
  onSelectProduct: (product: Product) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartSearch,
  onStartPhoto,
  onStartUrl,
  onSelectProduct,
}) => {
  const [category, setCategory] = useState<ProductCategory>('laptop');
  const [activeTab, setActiveTab] = useState<'search' | 'photo' | 'url'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError('Supported formats: JPG, PNG, or WebP only.');
      return;
    }

    // Validate size (max 5 MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError('File exceeds 5MB limit. Please upload an image under 5MB.');
      return;
    }

    onStartPhoto(file);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onStartSearch(searchQuery.trim(), category);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onStartUrl(urlInput.trim(), category);
  };

  const popularSuggestions = category === 'laptop'
    ? [
        'ASUS Vivobook 15 Ryzen 5',
        'MacBook Air M3',
        'Lenovo ThinkPad E14',
        'Acer Swift Go 14',
        'HP Pavilion Plus 14',
      ]
    : [
        'Redmi Note 14 Pro',
        'Samsung Galaxy S24 Ultra',
        'OnePlus 12R',
        'Pixel 8a',
        'Nothing Phone (2a)',
      ];

  const filteredQuickSeeds = SEED_PRODUCTS.filter((p) => p.category === category).slice(0, 4);

  return (
    <div className="space-y-16 py-8 md:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Live Data & Demonstration Banner */}
      <div className="bg-teal-50/90 border border-teal-200/90 rounded-xl p-3.5 flex items-start sm:items-center gap-3 text-xs text-teal-950">
        <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1">
          <strong className="font-semibold text-teal-900">Live Research Pipeline Active:</strong> Search for <em>any</em> laptop or smartphone sold in India. If not already cached, our 2-step grounded pipeline fetches official specs, indicative multi-seller prices (Amazon, Flipkart, Croma), warranty, and repairability live via Google Search.
        </div>
      </div>

      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
          Consumer Intelligence Engine · India
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight text-balance">
          Before You Buy, Know What You're Getting.
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
          We never just say "buy this." We separate verified facts from estimates, disclose missing data, quantify true 3-year ownership costs, and map real user defect patterns in India.
        </p>

        {/* Category Segmented Control */}
        <div className="pt-2 flex justify-center">
          <div className="inline-flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300">
            <button
              onClick={() => setCategory('laptop')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                category === 'laptop'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-4 h-4 text-teal-700" />
              Laptops & MacBooks
            </button>
            <button
              onClick={() => setCategory('smartphone')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                category === 'smartphone'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-teal-700" />
              Smartphones
            </button>
          </div>
        </div>
      </div>

      {/* 3 Equal Entry Methods */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'search'
                ? 'border-teal-700 text-teal-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="truncate">Search Any Model</span>
          </button>

          <button
            onClick={() => setActiveTab('photo')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'photo'
                ? 'border-teal-700 text-teal-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="truncate">Upload Photo</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'url'
                ? 'border-teal-700 text-teal-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="truncate">Paste Store URL</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 sm:p-8">
          {activeTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handleSearchSubmit} className="space-y-3">
                <label htmlFor="landing-search-input" className="block text-xs font-semibold text-slate-700">
                  Search Brand, Model Name, or Specification in India
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="landing-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      category === 'laptop'
                        ? 'e.g. ASUS Vivobook 15 Ryzen 5, MacBook Air M3, ThinkPad E14...'
                        : 'e.g. Redmi Note 14 Pro, Galaxy S24 Ultra, OnePlus 12R...'
                    }
                    className="w-full pl-11 pr-28 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>Research</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Popular Suggestions */}
              <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Try live queries:</span>
                {popularSuggestions.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => {
                      setSearchQuery(sug);
                      onStartSearch(sug, category);
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-200 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'photo' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-teal-50/30 transition-colors space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Click to select a photo of a laptop or phone
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports JPG, PNG, or WebP up to 5 MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {fileError && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <HelpCircle className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Browser transparency note:</strong> Browsers cannot scrape live Indian retail pages directly due to cross-origin security. WorthIt AI uses Gemini with Google Search grounding to identify the product candidate from the URL tokens and slugs, without claiming to have read the live HTML.
                </div>
              </div>

              <label htmlFor="landing-url-input" className="block text-xs font-semibold text-slate-700">
                Paste E-Commerce Product URL
              </label>
              <div className="relative">
                <Link2 className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="landing-url-input"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.amazon.in/dp/... or https://www.flipkart.com/..."
                  className="w-full pl-11 pr-28 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Quick-Start Examples (Seed Demonstration Catalog) */}
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-700" />
              <span>Quick-Start Examples</span>
            </h2>
            <p className="text-xs text-slate-500">
              Pre-loaded demonstration models for instant testing — or enter any live query in the search bar above.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200 self-start sm:self-auto">
            12 Seed Examples Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredQuickSeeds.map((seed) => (
            <div
              key={seed.id}
              onClick={() => onSelectProduct(seed)}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {seed.brand} · {seed.releaseYear}
                </div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">
                  {seed.name}
                </h3>
                <div className="text-xs font-mono font-bold text-teal-900 mt-1">
                  {seed.priceInInr.value ? `₹${seed.priceInInr.value.toLocaleString('en-IN')}` : 'Price not verified'}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-teal-700 font-semibold">
                <span>View Report</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works - 4 Steps */}
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            How WorthIt AI Works
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Built on transparency, verified evidence, and zero hand-waving.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 font-bold text-xs flex items-center justify-center">
              01
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Identify & Confirm</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We present candidate matches and require human confirmation. We never proceed silently on uncertain hardware identities.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 font-bold text-xs flex items-center justify-center">
              02
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Align Your Workload</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Define intended use (coding, gaming, college, battery), maximum budget in ₹, and prioritize longevity over vanity benchmarks.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 font-bold text-xs flex items-center justify-center">
              03
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Separate Fact & Estimate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every spec, warranty term, and price is labelled: Verified fact, Estimate, User-provided, AI interpretation, or Unknown.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 font-bold text-xs flex items-center justify-center">
              04
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Quantify True 3-Year TCO</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculate electricity power draw across Indian tariffs, repair scenarios, and accessories to evaluate real monthly costs.
            </p>
          </div>
        </div>
      </div>

      {/* Example Report Card Section */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Example Report Card
            </h2>
            <p className="text-xs text-slate-500">
              Explore how an evaluated product report looks before running your own research.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md border border-amber-300">
            Example – demonstration data
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="text-xs text-slate-500 font-medium">
                Apple · Laptop · Released 2024
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {DEMO_SHOWCASE_PRODUCT.name}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <EvidenceBadge
                  type="verified"
                  source="Apple India Store"
                  date="2026-03"
                  sourceUrl={DEMO_SHOWCASE_PRODUCT.sourceLinks?.[0]?.url}
                />
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-800">
                  ₹1,24,900
                </span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                  WorthIt Score
                </div>
                <div className="text-3xl font-extrabold text-teal-800 font-mono tabular-nums">
                  84<span className="text-sm font-normal text-slate-500">/100</span>
                </div>
              </div>
              <DataCompletenessMeter score={92} size="sm" className="w-28" />
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
              <div className="text-slate-500 font-medium">Intended Fit</div>
              <div className="font-semibold text-slate-900">High (Developer & Everyday)</div>
              <p className="text-slate-500 text-[11px]">Fanless chassis with 14hr+ real battery.</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
              <div className="text-slate-500 font-medium">Serviceability</div>
              <div className="font-semibold text-slate-900">Low (Soldered RAM/SSD)</div>
              <p className="text-slate-500 text-[11px]">Cannot be upgraded post-purchase.</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
              <div className="text-slate-500 font-medium">3-Year Ownership Est.</div>
              <div className="font-semibold text-slate-900 font-mono tabular-nums">~₹1,33,400</div>
              <p className="text-slate-500 text-[11px]">~₹3,705/month equivalent in India.</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Based on 5 active dimensions with verified source links.
            </span>
            <button
              onClick={() => onSelectProduct(DEMO_SHOWCASE_PRODUCT)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>View Full Intelligence Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
