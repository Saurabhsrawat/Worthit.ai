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

      {/* 2. Live 2-Step Grounded Research Pipeline */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-700" />
          <span>2. Live 2-Step Grounded Research Pipeline</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          WorthIt AI does not rely on static training-data memory. To research any laptop or smartphone sold in India, it executes a rigorous two-step grounded pipeline:
        </p>

        <div className="space-y-3">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center text-xs">A</span>
              <span>Step A: Grounded Information Gathering with Google Search</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gemini queries live web sources across 5 focused topics: (1) Official Indian variant specifications, (2) Current Indian price quotes (Amazon.in, Flipkart, Croma, Reliance Digital), (3) Manufacturer warranty terms & software update commitments, (4) Repairability scores & spare parts, and (5) Customer-reported defect themes. The engine captures raw text and exact <code>groundingMetadata.groundingChunks</code> (actual URLs and titles).
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center text-xs">B</span>
              <span>Step B: Strict JSON Schema Normalization (No Hallucination)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The collected grounded text and source list are passed into a parser run without search tools, constrained by a strict JSON schema. The model is forbidden from inventing facts not present in Step A. If a field was not supported in the search results, it must return <code>null</code> with status <code>"unknown"</code>. Real source URLs are attached to each confirmed claim.
            </p>
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

      {/* 6. Review Rigor & Known Limitations */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span>6. Known Limitations & Caveats</span>
        </h2>
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            • <strong>Review Mentions ≠ Defect Rates:</strong> Online review discourse is inherently self-selecting; consumers who encounter bugs post far more frequently than satisfied owners. We report reported themes, never statistical failure rates.
          </p>
          <p>
            • <strong>No Silent Extrapolation:</strong> If a specification or Indian warranty policy is absent from official documentation, our completeness meter drops and the missing field is highlighted in yellow as Unknown.
          </p>
          <p>
            • <strong>Price Volatility:</strong> Indian e-commerce prices fluctuate constantly during flash sales and credit card bank discount campaigns. Prices displayed are indicative snapshots with date of retrieval.
          </p>
        </div>
      </section>
    </div>
  );
};
