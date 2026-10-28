import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductCategory, UserPreferences, CandidateProductMatch, ReviewDataset, UserFeedbackReport } from './types';
import { DEMO_SHOWCASE_PRODUCT, SEED_PRODUCTS } from './data/seed';
import { calculateWorthItScore, calculateDataCompleteness } from './lib/scoring';
import { useLocalStorage } from './hooks/useLocalStorage';
import { primaryAdapter, seedAdapter } from './services/adapters';
import { identifyProductFromImage, identifyProductFromUrl } from './services/gemini';
import { fetchLiveProduct, fetchLiveProductProgressive, saveCachedProduct, getCachedProduct } from './services/research';
import { Navbar, ActivePage } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { IdentifyPage } from './pages/IdentifyPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewAnalysisPage } from './pages/ReviewAnalysisPage';
import { CostCalculatorPage } from './pages/CostCalculatorPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { SavedProductsPage, PastReportRecord } from './pages/SavedProductsPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('landing');

  // Stored state in localStorage
  const [savedProducts, setSavedProducts] = useLocalStorage<Product[]>('worthit_saved_products', [DEMO_SHOWCASE_PRODUCT]);
  const [comparedProductIds, setComparedProductIds] = useLocalStorage<string[]>('worthit_compared_ids', [
    DEMO_SHOWCASE_PRODUCT.id,
    'seed-thinkpad-e14-gen5',
  ]);
  const [userPreferences, setUserPreferences] = useLocalStorage<UserPreferences>('worthit_preferences', {
    category: 'laptop',
    intendedUse: ['programming', 'everyday'],
    maxBudgetInInr: 135000,
    expectedOwnershipYears: 3,
    importanceWeights: { batteryLife: 4, performance: 4, portability: 3, repairability: 3 },
    essentialRequirements: '',
  });
  const [pastReports, setPastReports] = useLocalStorage<PastReportRecord[]>('worthit_past_reports', [
    {
      id: 'report-demo',
      product: DEMO_SHOWCASE_PRODUCT,
      score: 84,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [feedbackList, setFeedbackList] = useLocalStorage<UserFeedbackReport[]>('worthit_feedback', []);

  // Active product being evaluated
  const [currentProduct, setCurrentProduct] = useState<Product>(DEMO_SHOWCASE_PRODUCT);

  // Identification flow state
  const [identifyLoading, setIdentifyLoading] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateProductMatch[]>([]);
  const [sourceInputType, setSourceInputType] = useState<'photo' | 'url' | 'search'>('search');
  const [queryOrUrlText, setQueryOrUrlText] = useState('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(undefined);
  const [identifiedDetails, setIdentifiedDetails] = useState<any>(undefined);
  const [needsConfirmationList, setNeedsConfirmationList] = useState<string[]>([]);

  // Live Research Pipeline State
  const [isLiveResearching, setIsLiveResearching] = useState(false);
  const [researchProgressMsg, setResearchProgressMsg] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute active score dynamically
  const scoreResult = useMemo(() => {
    return calculateWorthItScore(currentProduct, userPreferences);
  }, [currentProduct, userPreferences]);

  // Scroll to top on navigation change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activePage]);

  // Sync evaluated product into past reports whenever it changes
  useEffect(() => {
    if (!currentProduct) return;
    setPastReports((prev) => {
      const filtered = prev.filter((r) => r.product.id !== currentProduct.id);
      return [
        {
          id: `report-${currentProduct.id}-${Date.now()}`,
          product: currentProduct,
          score: scoreResult.overallScore,
          timestamp: new Date().toISOString(),
        },
        ...filtered,
      ].slice(0, 20); // Keep last 20 reports
    });
  }, [currentProduct.id, scoreResult.overallScore]);

  // Handlers for starting evaluation flows
  const handleStartSearch = async (query: string, category: ProductCategory = 'laptop') => {
    setSourceInputType('search');
    setQueryOrUrlText(query);
    setPhotoPreviewUrl(undefined);
    setIdentifyLoading(true);
    setIdentifyError(null);
    setActivePage('identify');

    try {
      const matches = await primaryAdapter.searchCandidates(query, category);
      setCandidates(matches);
      if (matches.length === 0) {
        setIdentifyError(`No matching products found in India catalog for "${query}". Try searching by brand (e.g. Apple, Lenovo, Samsung, Redmi, ASUS).`);
      }
    } catch (err: any) {
      setIdentifyError(err.message || 'Search failed. Falling back to local catalog.');
      const fallback = await seedAdapter.searchCandidates(query, category);
      setCandidates(fallback);
    } finally {
      setIdentifyLoading(false);
    }
  };

  const handleStartPhoto = async (file: File) => {
    setSourceInputType('photo');
    setQueryOrUrlText(file.name);
    setIdentifyLoading(true);
    setIdentifyError(null);
    setActivePage('identify');

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(previewUrl);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const res = await identifyProductFromImage(base64String, file.type);
          setCandidates(res.candidates);
          setIdentifiedDetails(res.identifiedDetails);
          setNeedsConfirmationList(res.needsConfirmationList);
        } catch (err: any) {
          setIdentifyError(err.message || 'Image analysis encountered an error. You can pick candidate manually below.');
          const fallback = await seedAdapter.searchCandidates('', 'laptop');
          setCandidates(fallback.slice(0, 4));
        } finally {
          setIdentifyLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIdentifyError('Failed to read image file.');
      setIdentifyLoading(false);
    }
  };

  const handleStartUrl = async (url: string, category: ProductCategory) => {
    setSourceInputType('url');
    setQueryOrUrlText(url);
    setPhotoPreviewUrl(undefined);
    setIdentifyLoading(true);
    setIdentifyError(null);
    setActivePage('identify');

    try {
      const res = await identifyProductFromUrl(url, category);
      setCandidates(res.candidates);
    } catch (err: any) {
      setIdentifyError(err.message || 'URL identification failed. You may search for the model name manually.');
      const fallback = await seedAdapter.searchCandidates(url, category);
      setCandidates(fallback);
    } finally {
      setIdentifyLoading(false);
    }
  };

  // Human Confirmation of Product Match with Variant Support
  const handleConfirmCandidate = async (candidate: CandidateProductMatch, variant?: string) => {
    // 1. Check 24-hour local storage cache (enforces v3-live and liveFetched === true)
    const cached = getCachedProduct(candidate.name, variant);
    if (cached && cached.provenance?.liveFetched) {
      setCurrentProduct(cached);
      setActivePage('preferences');
      return;
    }

    // 2. Always run live research pipeline for all products (seeded and non-seeded)
    setIsLiveResearching(true);
    setResearchProgressMsg(`Researching live specifications and pricing for ${candidate.name} ${variant ? `(${variant})` : ''}...`);

    try {
      const liveProduct = await fetchLiveProductProgressive(
        candidate.name,
        candidate.category,
        variant,
        false,
        (partialProduct) => {
          setCurrentProduct(partialProduct);
        },
        (progress) => setResearchProgressMsg(progress.message)
      );
      setCurrentProduct(liveProduct);
      setActivePage('preferences');
    } catch (err: any) {
      console.warn('Live research failed, checking seed catalogue fallback', err);
      // Emergency fallback: use seed specs only if live research fails, and strictly marked as demonstration
      const seed = await seedAdapter.getProductById(candidate.id);
      if (seed) {
        // Enforce all specs marked as demonstration, never verified
        const demoSpecs: any = {};
        for (const [k, v] of Object.entries(seed.specs || {})) {
          if (v && v.value) {
            demoSpecs[k] = {
              value: v.value,
              evidenceType: 'seed-demo',
              source: 'Demonstration catalog, verify before relying on it',
              notes: 'Demonstration data, confirm exact spec with retailer',
            };
          }
        }
        const fallbackSeedProduct: Product = {
          ...seed,
          selectedVariant: variant || (seed.category === 'smartphone' ? '8GB RAM / 128GB' : '16GB RAM / 512GB SSD'),
          isDemonstrationData: true,
          isLiveFetched: false,
          specs: demoSpecs,
          priceInInr: { value: null, evidenceType: 'unknown', notes: 'Price not verified' },
          warranty: {},
          repairability: {},
          provenance: {
            liveFetched: false,
            groundingChunkCount: 0,
            retrievedAt: new Date().toISOString(),
            status: 'unavailable',
            reason: 'error',
            retryAfterSeconds: 60,
          },
        };
        setCurrentProduct(fallbackSeedProduct);
        setActivePage('preferences');
        return;
      }

      const fallbackShell: Product = {
        id: candidate.id,
        name: candidate.name,
        brand: candidate.brand,
        category: candidate.category,
        releaseYear: candidate.releaseYear,
        isDemonstrationData: false,
        isLiveFetched: false,
        selectedVariant: variant,
        retrievedAt: new Date().toISOString(),
        priceInInr: { value: null, evidenceType: 'unknown' },
        specs: {},
        warranty: {},
        repairability: {},
        dataCompleteness: 0,
        lastUpdated: new Date().toISOString().split('T')[0],
        provenance: {
          liveFetched: false,
          groundingChunkCount: 0,
          retrievedAt: new Date().toISOString(),
          status: 'unavailable',
          reason: 'error',
          retryAfterSeconds: 60,
        },
      };
      setCurrentProduct(fallbackShell);
      setActivePage('preferences');
    } finally {
      setIsLiveResearching(false);
    }
  };

  // Refresh live data for current product (forces fresh 2-step research)
  const handleRefreshData = async () => {
    if (!currentProduct || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const updated = await fetchLiveProductProgressive(
        currentProduct.name,
        currentProduct.category,
        currentProduct.selectedVariant,
        true, // force refresh
        (partialProduct) => {
          setCurrentProduct(partialProduct);
        },
        () => {}
      );
      setCurrentProduct(updated);

      // Also update in savedProducts list if saved
      setSavedProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } catch (err) {
      console.warn('Failed to refresh data', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSavePreferences = (prefs: UserPreferences) => {
    setUserPreferences(prefs);
    setActivePage('dashboard');
  };

  // Toggle Shortlist
  const isCurrentProductSaved = savedProducts.some((p) => p.id === currentProduct.id);
  const handleToggleSave = () => {
    if (isCurrentProductSaved) {
      setSavedProducts((prev) => prev.filter((p) => p.id !== currentProduct.id));
    } else {
      setSavedProducts((prev) => [currentProduct, ...prev]);
    }
  };

  // Toggle Compare
  const isCurrentProductCompared = comparedProductIds.includes(currentProduct.id);
  const handleToggleCompare = () => {
    if (isCurrentProductCompared) {
      setComparedProductIds((prev) => prev.filter((id) => id !== currentProduct.id));
    } else {
      setComparedProductIds((prev) => [...prev, currentProduct.id].slice(0, 4));
    }
  };

  // Update user price
  const handleUpdateUserPrice = (priceInr: number) => {
    const updated: Product = {
      ...currentProduct,
      priceInInr: {
        value: priceInr,
        evidenceType: 'user-provided',
        source: 'User-provided observation',
        date: new Date().toISOString().split('T')[0],
      },
    };
    updated.dataCompleteness = calculateDataCompleteness(updated);
    setCurrentProduct(updated);
    saveCachedProduct(updated);

    // Update in saved list if present
    setSavedProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  // Update hardware specs (Tier 3 spec fallback)
  const handleUpdateSpecs = (updatedSpecs: Product['specs']) => {
    const updated: Product = {
      ...currentProduct,
      specs: updatedSpecs,
    };
    updated.dataCompleteness = calculateDataCompleteness(updated);
    setCurrentProduct(updated);
    saveCachedProduct(updated);
    setSavedProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  // Update review data
  const handleUpdateReviewData = (reviewData: ReviewDataset) => {
    const updated: Product = {
      ...currentProduct,
      reviewData,
    };
    updated.dataCompleteness = calculateDataCompleteness(updated);
    setCurrentProduct(updated);
    saveCachedProduct(updated);

    // Update in saved list
    setSavedProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  // Update partial product data (e.g. from pasted listing analysis)
  const handleUpdateProductData = (updates: Partial<Product>) => {
    const updated: Product = {
      ...currentProduct,
      ...updates,
    };
    updated.dataCompleteness = calculateDataCompleteness(updated);
    setCurrentProduct(updated);
    saveCachedProduct(updated);

    setSavedProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const handleSubmitFeedback = (report: UserFeedbackReport) => {
    setFeedbackList((prev) => [report, ...prev]);
  };

  // Resolved list of compared products
  const comparedProducts = useMemo(() => {
    return comparedProductIds
      .map((id) => {
        if (id === currentProduct.id) return currentProduct;
        const saved = savedProducts.find((p) => p.id === id);
        if (saved) return saved;
        const seed = SEED_PRODUCTS.find((p) => p.id === id);
        return seed || null;
      })
      .filter((p): p is Product => p !== null);
  }, [comparedProductIds, currentProduct, savedProducts]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        savedCount={savedProducts.length}
        compareCount={comparedProductIds.length}
      />

      {/* Live Research Pipeline Modal / Overlay */}
      {isLiveResearching && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-700" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>2-Step Grounded Research</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Researching Live across Indian Sources
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {researchProgressMsg || 'Querying official Indian specs, seller price quotes, warranty commitments, and owner defect themes...'}
              </p>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
              Grounding via Google Search · iFixit API · Wikipedia API
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {activePage === 'landing' && (
          <LandingPage
            onStartSearch={handleStartSearch}
            onStartPhoto={handleStartPhoto}
            onStartUrl={handleStartUrl}
            onSelectProduct={(p) => {
              setCurrentProduct(p);
              setActivePage('dashboard');
            }}
          />
        )}

        {activePage === 'identify' && (
          <IdentifyPage
            loading={identifyLoading}
            error={identifyError}
            sourceInputType={sourceInputType}
            queryOrUrlText={queryOrUrlText}
            photoUrl={photoPreviewUrl}
            identifiedDetails={identifiedDetails}
            candidates={candidates}
            needsConfirmationList={needsConfirmationList}
            onConfirmCandidate={handleConfirmCandidate}
            onRetry={() => {
              if (sourceInputType === 'search') void handleStartSearch(queryOrUrlText);
            }}
            onManualSearch={(q: string) => { void handleStartSearch(q); }}
          />
        )}

        {activePage === 'preferences' && (
          <PreferencesPage
            product={currentProduct}
            preferences={userPreferences}
            productCategory={currentProduct?.category || 'laptop'}
            onSavePreferences={handleSavePreferences}
            onSkip={() => setActivePage('dashboard')}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardPage
            product={currentProduct}
            scoreResult={scoreResult}
            preferences={userPreferences}
            onUpdatePreferences={handleSavePreferences}
            isSaved={isCurrentProductSaved}
            isCompared={isCurrentProductCompared}
            onToggleSave={handleToggleSave}
            onToggleCompare={handleToggleCompare}
            onUpdateUserPrice={handleUpdateUserPrice}
            onNavigateToReviews={() => setActivePage('reviews')}
            onNavigateToCost={() => setActivePage('cost')}
            onNavigateToPreferences={() => setActivePage('preferences')}
            onSubmitFeedback={handleSubmitFeedback}
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
            onUpdateSpecs={handleUpdateSpecs}
          />
        )}

        {activePage === 'reviews' && (
          <ReviewAnalysisPage
            product={currentProduct}
            onUpdateReviewData={handleUpdateReviewData}
            onUpdateProductData={handleUpdateProductData}
          />
        )}

        {activePage === 'cost' && (
          <CostCalculatorPage
            product={currentProduct}
            onUpdatePurchasePrice={handleUpdateUserPrice}
          />
        )}

        {activePage === 'compare' && (
          <ComparisonPage
            comparedProducts={comparedProducts}
            onRemoveProduct={(id) =>
              setComparedProductIds((prev) => prev.filter((pId) => pId !== id))
            }
            onAddProduct={(p) =>
              setComparedProductIds((prev) => [...prev, p.id].slice(0, 4))
            }
            onSelectProduct={(p) => {
              setCurrentProduct(p);
              setActivePage('dashboard');
            }}
            userPreferences={userPreferences}
          />
        )}

        {activePage === 'saved' && (
          <SavedProductsPage
            savedProducts={savedProducts}
            pastReports={pastReports}
            comparedProductIds={comparedProductIds}
            onSelectProduct={(p) => {
              setCurrentProduct(p);
              setActivePage('dashboard');
            }}
            onRemoveSaved={(id) =>
              setSavedProducts((prev) => prev.filter((p) => p.id !== id))
            }
            onClearSaved={() => setSavedProducts([])}
            onClearHistory={() => setPastReports([])}
            onToggleCompare={(p) => {
              if (comparedProductIds.includes(p.id)) {
                setComparedProductIds((prev) => prev.filter((id) => id !== p.id));
              } else {
                setComparedProductIds((prev) => [...prev, p.id].slice(0, 4));
              }
            }}
            onNavigateToCompare={() => setActivePage('compare')}
          />
        )}

        {activePage === 'methodology' && <MethodologyPage />}
      </main>

      {/* Footer conforming strictly to Anti-Slop constitution */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">WorthIt AI</span>
            <span>·</span>
            <span>Evidence-based consumer decision intelligence for India</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActivePage('methodology')}
              className="hover:text-slate-900 transition-colors"
            >
              Methodology & Sources
            </button>
            <span>·</span>
            <span>Live Grounded Research</span>
            <span>·</span>
            <span className="font-mono tabular-nums">2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
