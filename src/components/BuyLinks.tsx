import React from 'react';
import { Product, PriceQuote } from '../types';
import { ExternalLink, ShoppingCart, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BuyLinksProps {
  product: Product;
}

interface RetailerEntry {
  retailerName: string;
  isDirect: boolean;
  url: string;
  priceInr?: number;
  retrievedDate?: string;
  notes?: string;
}

export const BuyLinks: React.FC<BuyLinksProps> = ({ product }) => {
  const q = encodeURIComponent(product.name);

  // Standard major Indian retailers
  const standardRetailers = [
    {
      name: 'Amazon India',
      domain: 'amazon.in',
      searchUrl: `https://www.amazon.in/s?k=${q}`,
    },
    {
      name: 'Flipkart',
      domain: 'flipkart.com',
      searchUrl: `https://www.flipkart.com/search?q=${q}`,
    },
    {
      name: 'Croma',
      domain: 'croma.com',
      searchUrl: `https://www.croma.com/searchB?q=${q}`,
    },
    {
      name: 'Reliance Digital',
      domain: 'reliancedigital.in',
      searchUrl: `https://www.reliancedigital.in/search?q=${q}`,
    },
    {
      name: `${product.brand} Official Store`,
      domain: product.brand.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
      searchUrl: `https://www.google.com/search?q=${q}+official+store+india`,
    },
  ];

  const directQuotes = product.priceQuotes || [];

  // Combine direct quotes with fallback search links
  const tableEntries: RetailerEntry[] = standardRetailers.map((sr) => {
    // Check if there is a direct grounded quote for this retailer
    const matchedQuote = directQuotes.find(
      (dq) =>
        dq.seller.toLowerCase().includes(sr.name.toLowerCase().split(' ')[0]) ||
        (dq.sourceUrl && dq.sourceUrl.includes(sr.domain))
    );

    if (matchedQuote && matchedQuote.sourceUrl) {
      return {
        retailerName: matchedQuote.seller || sr.name,
        isDirect: true,
        url: matchedQuote.sourceUrl,
        priceInr: matchedQuote.priceInr,
        retrievedDate: matchedQuote.retrievedAt
          ? matchedQuote.retrievedAt.split('T')[0]
          : product.lastUpdated,
        notes: matchedQuote.notes || 'Verified listing URL from grounded search',
      };
    }

    return {
      retailerName: sr.name,
      isDirect: false,
      url: sr.searchUrl,
      notes: 'Search link, not a verified product page',
    };
  });

  // Also include any other quotes found in directQuotes that weren't in standardRetailers
  for (const dq of directQuotes) {
    if (
      dq.sourceUrl &&
      !tableEntries.some((e) => e.url === dq.sourceUrl || e.retailerName.toLowerCase() === dq.seller.toLowerCase())
    ) {
      tableEntries.push({
        retailerName: dq.seller,
        isDirect: true,
        url: dq.sourceUrl,
        priceInr: dq.priceInr,
        retrievedDate: dq.retrievedAt ? dq.retrievedAt.split('T')[0] : product.lastUpdated,
        notes: dq.notes || 'Discovered during grounded market research',
      });
    }
  }

  // Variant notice (RAM, Storage, Color)
  const variantParts: string[] = [];
  if (product.specs.ram?.value) variantParts.push(product.specs.ram.value);
  if (product.specs.storage?.value) variantParts.push(product.specs.storage.value);
  const variantString = variantParts.length > 0 ? variantParts.join(' / ') : 'Standard Indian retail configuration';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-teal-700" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Retailer Purchase & Search Links
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Direct product URLs appear only when verified in grounded search. Fallbacks are explicit search queries.
          </p>
        </div>

        <span className="text-[11px] bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium border border-slate-200 self-start sm:self-auto">
          Indicative, verify on the seller's site
        </span>
      </div>

      {/* Variant Alert Notice */}
      <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Target Variant: </span>
          <span>{product.name} ({variantString}). </span>
          <span className="text-amber-800">
            Please ensure you select this exact RAM/storage configuration on the seller's website, as pricing and performance vary significantly between tiers.
          </span>
        </div>
      </div>

      {/* Retailers Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Retailer / Platform</th>
              <th className="py-2.5 px-3">Link Type</th>
              <th className="py-2.5 px-3 font-mono">Indicative Price</th>
              <th className="py-2.5 px-3">Retrieved</th>
              <th className="py-2.5 px-3">Status / Notes</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableEntries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-3 font-semibold text-slate-900">
                  {entry.retailerName}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  {entry.isDirect ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium text-[11px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Product Page
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-medium text-[11px] inline-flex items-center gap-1">
                      <Search className="w-3 h-3 text-slate-400" />
                      Search Link
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900 tabular-nums">
                  {entry.priceInr ? (
                    <span>₹{entry.priceInr.toLocaleString('en-IN')}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic font-sans">Check on seller</span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                  {entry.retrievedDate || 'Current'}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {entry.notes}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                      entry.isDirect
                        ? 'bg-teal-900 text-white hover:bg-teal-800'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{entry.isDirect ? 'View Product' : 'Search Store'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500 italic">
        * Every price is indicative; verify final checkout price on the seller's site including bank promotions, coupon codes, and shipping fees.
      </p>
    </div>
  );
};
