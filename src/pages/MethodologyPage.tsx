import React from 'react';
import { EvidenceBadge } from '../components/common/EvidenceBadge';
import {
  ShieldCheck,
  Scale,
  AlertTriangle,
  HelpCircle,
  FileCode,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Layers,
  Sparkles,
  Search,
  Wrench,
  Database,
} from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Scientific Transparency & Integrity
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Methodology, Sources & Known Limitations
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          How WorthIt AI computes scores, separates verified evidence from estimates, and avoids automated bias in the Indian market.
        </p>
      </div>

      {/* 1. Core Principle & The 4 Information Classes */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-700" />
          <span>1. The Four Information Classes</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Most tech review websites flatten all data into a single rating. WorthIt AI enforces strict typographic and semantic separation everywhere in the UI:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <EvidenceBadge type="verified" size="md" />
            <h3 className="text-xs font-bold text-slate-900">Verified Facts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Specs, warranty terms, and software commitments documented directly from manufacturer official whitepapers, specsheets, or regulatory filings, with a citation link and retrieval timestamp.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <EvidenceBadge type="estimate" size="md" />
            <h3 className="text-xs font-bold text-slate-900">Estimates & Assumptions</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Derived figures such as electricity costs based on average Indian residential tariffs (~₹7.5/kWh), estimated battery service pricing, or benchmark power draws.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <EvidenceBadge type="user-provided" size="md" />
            <h3 className="text-xs font-bold text-slate-900">User-Provided Data</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Observed retailer prices, custom daily usage hours, or specific workflow requirements input directly by the consumer.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <EvidenceBadge type="unknown" size="md" />
            <h3 className="text-xs font-bold text-slate-900">Unknown / Missing Data</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If an official policy or part cost cannot be proven with a source, it is marked as "Unknown". We never fabricate values or substitute generic placeholders silently.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Free Search + Fetch + Extract Research Pipeline */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-700" />
          <span>2. Free Search + Fetch + Extract Research Pipeline</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          WorthIt AI operates completely on free-tier APIs without requiring paid Gemini search-grounding billing. To evaluate any laptop or smartphone sold in India, it executes a modular three-stage pipeline:
        </p>

        <div className="space-y-3">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center text-xs">1</span>
              <span>Search Adapter (Server-Side)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a product and variant are confirmed, the server executes at most two targeted search queries: (1) <code>"&lt;product&gt; &lt;variant&gt; specifications India"</code> and (2) <code>"&lt;product&gt; price India buy"</code>. The queries are handled by a pluggable <code>SearchProvider</code> (Tavily free tier, Google Custom Search Engine, or a graceful NoSearch fallback). Results are cached server-side for 24 hours with in-flight deduplication to avoid redundant network traffic.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center text-xs">2</span>
              <span>Authoritative Webpage Fetching & Jina Reader Hydration</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The engine ranks candidate URLs, prioritizing official manufacturer portals (Apple India, Samsung India, Lenovo India, Asus India, Xiaomi India), GSMArena, NotebookCheck, and authorized retail listings (Amazon.in, Flipkart, Croma). Pages are fetched server-side with an 8-second timeout and 1MB size limit. If direct HTML is JavaScript-heavy or thin, it falls back to <code>r.jina.ai</code> for clean Markdown rendering. Full page text is never stored beyond the request lifecycle.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center text-xs">3</span>
              <span>Ungrounded Gemini Extraction & The Transparent Claim Filter</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              A single ungrounded Gemini call (no tools, JSON schema only) parses the fetched text in a merged extraction for specifications, pricing, and warranty policies. The Claim Filter enforces strict provenance:
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
              <li><strong>Zero-Hallucination Match:</strong> An extracted value is kept only if it appears directly in the fetched webpage text (normalized string/number matching).</li>
              <li><strong>Indicative Pricing:</strong> Retail prices are kept only when explicitly tied to an authorized seller name in the fetched text. If absent, the price is marked "Price not found" with a manual user input field.</li>
              <li><strong>Evidence Status:</strong> Fields from reputable domains (manufacturer, GSMArena, NotebookCheck, iFixit, Amazon, Flipkart) are marked <code>verified</code>; others are marked <code>reported by web sources</code> with exact URL citations.</li>
              <li><strong>Three-Tier Fallback Order:</strong> Tier 1 (fetched authoritative pages) &rarr; Tier 2 (AI-recalled specs for missing core specs only, marked <code>unverified</code>, never for price or warranty) &rarr; Tier 3 (user review/edit form).</li>
              <li><strong>Independent Circuit Breakers:</strong> Search provider rate limits and Gemini quotas have separate cooldown monitors with real-time countdown diagnostics visible via <code>?debug=1</code>.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. Discrepancy & Conflict Resolution */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>3. Source Discrepancies & Conflict Handling</span>
        </h2>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            In consumer electronics, manufacturer sites and e-commerce portals often disagree — for example, whether a phone has 1 year or 2 years of warranty in India, or whether RAM is 8GB or 16GB for a specific SKU.
          </p>
          <p>
            <strong>Our Conflict Rule:</strong> When two verified sources disagree, WorthIt AI flags the conflict prominently in a dedicated banner, citing Claim A and Claim B with their respective source links. We never silently pick one or average them together.
          </p>
        </div>
      </section>

      {/* 4. External Free API Adapters & Extensibility */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-teal-700" />
          <span>4. Pluggable Data Source Adapters</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          All data retrieval is abstracted through the <code>ProductDataSourceAdapter</code> interface:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-teal-700" />
              <span>iFixit Public API Adapter</span>
            </div>
            <p className="text-slate-600">
              Queries iFixit’s public teardown and repair API to attach step-by-step repair guides, battery replacement difficulty, and teardown scores.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-teal-700" />
              <span>Wikipedia / Wikidata Adapter</span>
            </div>
            <p className="text-slate-600">
              Retrieves canonical release years, hardware generations, and neutral device summaries from Wikipedia’s open search API.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-teal-700" />
              <span>Gemini Grounded Adapter</span>
            </div>
            <p className="text-slate-600">
              Live Google Search grounding across authorized Indian retail and brand portals (Amazon.in, Flipkart, Croma, Reliance Digital, Apple, Samsung, Lenovo).
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-700" />
              <span>Paid Price Provider Slot</span>
            </div>
            <p className="text-slate-600">
              Architectural slot for commercial retail feeds (Keepa, SerpApi) that automatically activates when a server-side environment key is supplied.
            </p>
          </div>
        </div>
      </section>

      {/* 5. The Transparent Scoring Formula */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Scale className="w-5 h-5 text-teal-700" />
          <span>5. The Transparent Scoring Formula</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          The WorthIt Score (0–100) is evaluated entirely in deterministic, pure TypeScript. The LLM is <strong>never</strong> allowed to hallucinate or generate arbitrary overall scores.
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Provisional Design Weights (Baseline)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 px-3">Dimension</th>
                  <th className="py-2 px-3">Default Weight</th>
                  <th className="py-2 px-3">Evaluation Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    Suitability for Intended Use
                  </td>
                  <td className="py-2.5 px-3 font-mono">30%</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Matches CPU architecture, memory tier, battery hours, and display against user's selected workload (coding, gaming, college, daily).
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    Price Relative to Budget Ceiling
                  </td>
                  <td className="py-2.5 px-3 font-mono">20%</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Rewards staying safely within budget; penalizes exceeding budget limit; adjusts if price is user-observed.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    3-Year Ownership Cost Efficiency
                  </td>
                  <td className="py-2.5 px-3 font-mono">20%</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Compares monthly equivalent cost against typical category benchmarks, factoring in power efficiency and expected maintenance.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    Repairability & Software Longevity
                  </td>
                  <td className="py-2.5 px-3 font-mono">15%</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Evaluates official serviceability index (0–10), battery replaceability, upgradable RAM/SSD, and published years of OS updates.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    Reported Hardware Issue Risk
                  </td>
                  <td className="py-2.5 px-3 font-mono">15%</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Penalizes recurring hardware failure signals (motherboard, green line display, hinges) documented in Indian owner discourse.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. Coverage Scope & Known Limitations */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>6. Coverage Scope, What is & Isn't Covered, and Caveats</span>
        </h2>
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-2">
              <h3 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>What Is Covered</span>
              </h3>
              <ul className="space-y-1.5 text-slate-700 list-disc pl-4">
                <li><strong>All Modern Laptops & Smartphones in India:</strong> Any model sold through official or authorized Indian channels (Apple India, Samsung, Asus, Lenovo, Xiaomi/Redmi, HP, Dell, OnePlus, Motorola, Nothing, iQOO, Realme, Acer).</li>
                <li><strong>9 Core Technical Fields:</strong> Processor/SoC model, RAM configuration, storage drive type/size, display specs, battery capacity/endurance, weight, OS/software update lifespan, warranty duration in India, and live market price quotes in INR.</li>
                <li><strong>Three-Tier Spec Fallback Architecture:</strong> Tier 1: Real-time grounded Google Search and direct server-side page scraping. Tier 2: AI parametric spec recall (strictly marked unverified and never used for price, warranty, or repair scores). Tier 3: Direct User Confirm & Edit form with 'User-provided' provenance tags.</li>
                <li><strong>Absolute Hardware Capability Thresholds:</strong> Spec performance ratings (CPU tier, RAM, display, battery) evaluate absolute technical competence independently of price presence, eliminating misleading "price unverified" spec downgrades.</li>
                <li><strong>Variant Disambiguation:</strong> Multi-tier RAM/storage options are identified and selected prior to research so specs are never cross-pollinated.</li>
                <li><strong>24-Hour Verified Cache:</strong> Results are cached for 24 hours to prevent unnecessary quota depletion while allowing one-click manual re-verification.</li>
                <li><strong>Telemetry & Claim Auditing:</strong> The Research Debug panel transparently logs grounding chunks, raw text length, kept fields, and dropped fields with reasons.</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 space-y-2">
              <h3 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>What Isn't Covered (Known Limitations)</span>
              </h3>
              <ul className="space-y-1.5 text-slate-700 list-disc pl-4">
                <li><strong>Zero Fabricated Fallbacks:</strong> When live research fails due to network outage or search quota, WorthIt AI returns an honest 'Unavailable' state with a cooldown timer. It never fabricates placeholder prices (e.g. ₹45,000) or fake warranty periods.</li>
                <li><strong>Unannounced / Prototype Hardware:</strong> Products without commercial retail listings or official Indian distribution channels cannot be verified.</li>
                <li><strong>Bulk Scraping:</strong> WorthIt AI does not crawl retailer HTML in bulk. Pages fetched server-side are strictly limited to the top 3 grounding references with 8s timeouts and 1MB size caps.</li>
                <li><strong>Real-Time Flash Sale Stock:</strong> E-commerce prices fluctuate minute-by-minute with temporary bank coupons. Displayed prices are indicative market quotes with exact timestamp of retrieval.</li>
                <li><strong>Statistical Failure Rates:</strong> Forum mentions (e.g. Reddit r/IndianGaming) highlight reported defect patterns, not statistically sampled failure rates.</li>
              </ul>
            </div>
          </div>

          <p className="pt-2 text-slate-500 italic">
            • <strong>No Silent Extrapolation:</strong> If any specification or Indian warranty clause cannot be verified through official documentation or reputable portals, it is marked as Unknown and score confidence is lowered accordingly.
          </p>
        </div>
      </section>

      {/* 7. Personal Review Engine & Reference Ranges */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-700" />
          <span>7. Personal Review Engine & Design Thresholds</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          The "Your Personal Review" feature at the top of each report delivers tailored, transparent advice that adapts directly to the buyer's workload, budget ceiling, and longevity horizon:
        </p>

        <div className="space-y-3 text-xs text-slate-600">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">Deterministic Spec Analysis (Pure TypeScript)</h3>
            <p className="leading-relaxed">
              Every key specification (CPU tier, RAM capacity, NVMe storage speed, display panel/refresh, battery Wh/mAh, charging speed, weight, camera optics, dedicated GPU, durability, and OS update years) is evaluated strictly against codified design thresholds in <code>lib/referenceRanges.ts</code> relative to the product's Indian price band. If a spec is undocumented, it returns <strong>Unknown</strong> and lowers confidence without guessing.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">Workload Relevance & Ranking</h3>
            <p className="leading-relaxed">
              Strengths and weaknesses are ranked using <code>(Spec Rating × User Workload Relevance)</code>. For instance, an integrated graphics chip is rated acceptable for programming but ranks as a critical weakness for 3D gaming. A change in user profile immediately updates the scorecard and strengths ranking.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">Strict Gemini Boundary & Post-Validation</h3>
            <p className="leading-relaxed">
              Prose generation uses a single ungrounded Gemini call passed <em>only</em> precomputed facts. Post-validation checks that every number and spec name in the prose exists in the input, and strictly prohibits the words "unreliable" and "guaranteed". If validation fails or quota is exhausted, prose is cleanly withheld while all objective scorecards and lists remain active.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
