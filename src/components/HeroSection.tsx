import React, { useMemo, useState } from 'react';
import { ArrowRight, Calculator, Search } from 'lucide-react';
import {
  computeSmartSellingDecision,
  SmartCropId,
  SmartLocationId,
} from '../data/mandiData';

interface HeroSectionProps {
  onApplyPreset: (location: SmartLocationId, crop: SmartCropId, quantityQtl: number) => void;
  onQuickSearch: (query: string) => void;
}

interface PreviewPreset {
  id: string;
  label: string;
  location: SmartLocationId;
  crop: SmartCropId;
  quantityQtl: number;
}

const PREVIEW_PRESETS: PreviewPreset[] = [
  {
    id: 'tomato-atp',
    label: 'Tomato · 20 Qtl',
    location: 'Anantapur, Andhra Pradesh',
    crop: 'Tomato',
    quantityQtl: 20,
  },
  {
    id: 'groundnut-atp',
    label: 'Groundnut · 35 Qtl',
    location: 'Anantapur, Andhra Pradesh',
    crop: 'Groundnut',
    quantityQtl: 35,
  },
  {
    id: 'onion-nsk',
    label: 'Onion · 50 Qtl',
    location: 'Nashik, Maharashtra',
    crop: 'Onion',
    quantityQtl: 50,
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onApplyPreset,
  onQuickSearch,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PREVIEW_PRESETS[0].id);
  const [heroSearch, setHeroSearch] = useState<string>('');

  const activePreset = useMemo(
    () => PREVIEW_PRESETS.find((p) => p.id === selectedPresetId) || PREVIEW_PRESETS[0],
    [selectedPresetId]
  );

  const previewDecision = useMemo(
    () =>
      computeSmartSellingDecision(
        activePreset.location,
        activePreset.crop,
        activePreset.quantityQtl
      ),
    [activePreset]
  );

  const maxPreviewNet = Math.max(
    ...previewDecision.evaluatedMandis.map((m) => m.estimatedNetProfit),
    1
  );

  const handleCheckBestOption = () => {
    onApplyPreset(
      activePreset.location,
      activePreset.crop,
      activePreset.quantityQtl
    );
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickSearch(heroSearch);
    document.getElementById('price-dashboard')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-[#F7F7F2] border-b border-[#E2E4DD] no-print">
      <div className="max-w-7xl mx-auto px-6 pt-9 pb-11 lg:pt-14 lg:pb-14">
        {/* 2-Column Balanced Split with items-stretch */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Proposition, Instant Price Search, CTAs & Trust Strip */}
          <div className="lg:col-span-6 flex flex-col justify-between py-1">
            <div>
              {/* Trust Strip: Clean unboxed typography with dot separators (Zero Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-[13px] font-semibold text-[#15803D] mb-4">
                <span>AI-Powered</span>
                <span aria-hidden="true" className="text-[#8A928C]">
                  •
                </span>
                <span>Real-Time Market Intelligence</span>
                <span aria-hidden="true" className="text-[#8A928C]">
                  •
                </span>
                <span>Profit Optimization</span>
              </div>

              <h1 className="font-display text-[clamp(2.5rem,4.4vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[#161A18] max-w-xl">
                Sell Smarter. Earn More.
              </h1>

              <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#3F4742] max-w-[54ch]">
                AI-powered market intelligence that helps farmers find the most profitable place to
                sell their produce.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCheckBestOption}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F1E]"
                >
                  <span>Check Best Selling Option →</span>
                </button>

                <a
                  href="#comparison-calculator"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#161A18] bg-white border border-[#D5D8D0] rounded-xl hover:bg-[#EFEFE8] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F1E]"
                >
                  <Calculator className="w-4 h-4 text-[#15803D]" />
                  <span>Comparison Calculator</span>
                </a>
              </div>

              {/* Instant Jumpstart into Searchable Price Dashboard */}
              <form onSubmit={handleHeroSearchSubmit} className="mt-6 max-w-xl">
                <label htmlFor="hero-price-search" className="sr-only">
                  Search crop, mandi yard, district, or state in the Price Dashboard
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#7A827C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="hero-price-search"
                      type="search"
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                      placeholder="Search Tomato, Onion, Wheat, Anantapur, Lasalgaon..."
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#D5D8D0] rounded-xl text-[#161A18] placeholder:text-[#7A827C] focus:outline-none focus:border-[#0F2F1E]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0F2F1E] bg-[#EFEFE8] border border-[#D5D8D0] rounded-xl hover:bg-[#E2E4DD] transition-colors duration-150 whitespace-nowrap shrink-0"
                  >
                    Search Price Dashboard
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Commodity Lookup + Core Thesis */}
            <div className="mt-7 pt-5 border-t border-[#E2E4DD] space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A524D]">
                <span>Quick lookup:</span>
                {['Tomato', 'Groundnut', 'Onion', 'Wheat', 'Soybean', 'Red Chilli'].map(
                  (cropItem, idx) => (
                    <React.Fragment key={cropItem}>
                      {idx > 0 && <span aria-hidden="true">·</span>}
                      <button
                        type="button"
                        onClick={() => {
                          setHeroSearch(cropItem);
                          onQuickSearch(cropItem);
                          document
                            .getElementById('price-dashboard')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="font-semibold text-[#161A18] hover:text-[#15803D] hover:underline underline-offset-2 whitespace-nowrap"
                      >
                        {cropItem}
                      </button>
                    </React.Fragment>
                  )
                )}
              </div>
              <p className="text-xs font-medium text-[#16422B]">
                “We don&apos;t just show market prices. We tell farmers where they should sell and
                why.”
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Farmer-Market Decision Dashboard Preview */}
          <div className="lg:col-span-6 flex">
            <div className="w-full bg-[#0F2F1E] text-white rounded-2xl border border-[#1E4D33] p-5 sm:p-6 flex flex-col justify-between">
              <div>
                {/* Preview Top Header + Interactive Crop Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/12">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#A7F3D0] tracking-[0.01em]">
                      <span>Smart Selling Preview</span>
                      <span aria-hidden="true">·</span>
                      <span>{previewDecision.location}</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-white mt-0.5 tracking-[0.01em]">
                      {previewDecision.recommendationHeadline}
                    </h2>
                  </div>

                  {/* Interactive Segmented Lot Switcher */}
                  <div
                    role="group"
                    aria-label="Preview farmer lot"
                    className="inline-flex items-center gap-1 p-1 bg-white/10 rounded-lg self-start sm:self-auto"
                  >
                    {PREVIEW_PRESETS.map((preset) => {
                      const active = preset.id === activePreset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPresetId(preset.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-white text-[#0F2F1E]'
                              : 'text-white/75 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subtle Glassmorphism Highlight Strip inside Dark Surface */}
                <div className="mt-4 bg-white/[0.07] backdrop-blur-sm border border-white/12 rounded-xl p-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] text-white/70">Estimated Net Profit</p>
                    <p className="mt-0.5 font-mono tabular-nums text-lg sm:text-xl font-bold text-white">
                      ₹{previewDecision.estimatedNetProfit.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#FDE68A]">Extra Earnings</p>
                    <p className="mt-0.5 font-mono tabular-nums text-lg sm:text-xl font-bold text-[#FBBF24]">
                      +₹{previewDecision.potentialExtraEarnings.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/70">AI Confidence</p>
                    <p className="mt-0.5 font-mono tabular-nums text-lg sm:text-xl font-bold text-[#4ADE80]">
                      {previewDecision.aiConfidencePct}%
                    </p>
                  </div>
                </div>

                {/* Live 3-Market Net Profit Comparison Rows */}
                <div className="mt-4 space-y-2.5">
                  {previewDecision.evaluatedMandis.map((m) => {
                    const isBest = m.displayName === previewDecision.bestMarketCode;
                    const barPct = Math.max(
                      25,
                      Math.round((m.estimatedNetProfit / maxPreviewNet) * 100)
                    );

                    return (
                      <div
                        key={m.code}
                        className={`p-3 rounded-xl border transition-colors ${
                          isBest
                            ? 'bg-white/[0.1] border-[#4ADE80]/45'
                            : 'bg-white/[0.03] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="font-semibold text-white">{m.displayName}</span>
                            <span className="text-white/65"> · {m.yardSubtitle}</span>
                          </div>
                          <div className="font-mono tabular-nums font-semibold text-right shrink-0">
                            <span className={isBest ? 'text-[#4ADE80]' : 'text-white/85'}>
                              ₹{m.estimatedNetProfit.toLocaleString('en-IN')} net
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 h-1.5 w-full bg-white/10 rounded-sm overflow-hidden">
                          <div
                            style={{ width: `${barPct}%` }}
                            className={`h-full transition-opacity duration-150 ${
                              isBest ? 'bg-[#22C55E]' : 'bg-white/35'
                            }`}
                          />
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/65 font-mono tabular-nums">
                          <span>Rate: ₹{m.sellingPricePerQtl.toLocaleString('en-IN')}/qtl</span>
                          <span>
                            Costs: −₹
                            {(
                              m.transportTotal +
                              m.marketFeeTotal +
                              m.priceVariationTotal
                            ).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview Footer Action */}
              <div className="mt-4 pt-3.5 border-t border-white/12 flex items-center justify-between gap-3 text-xs">
                <a
                  href="#price-dashboard"
                  className="text-white/75 hover:text-white underline underline-offset-4 whitespace-nowrap"
                >
                  Explore Searchable Price Dashboard
                </a>
                <button
                  type="button"
                  onClick={handleCheckBestOption}
                  className="inline-flex items-center gap-1 font-semibold text-[#4ADE80] hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Inspect Decision</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Quantitative Benchmark Strip Below Hero Split */}
        <div className="mt-10 pt-7 border-t border-[#E2E4DD] grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div>
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#0F2F1E]">
              284 APMC Yards
            </p>
            <p className="mt-0.5 text-xs text-[#4A524D]">
              Searchable wholesale clearing rates indexed across 9 states
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#0F2F1E]">
              2–3 Market Calc
            </p>
            <p className="mt-0.5 text-xs text-[#4A524D]">
              Side-by-side comparison calculator for freight, cess &amp; shrinkage
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#0F2F1E]">
              +19% – 24%
            </p>
            <p className="mt-0.5 text-xs text-[#4A524D]">
              Typical net profit uplift vs. unverified local sub-yard selling
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-bold text-[#0F2F1E]">
              &lt; 15 Seconds
            </p>
            <p className="mt-0.5 text-xs text-[#4A524D]">
              From crop &amp; quantity selection to ranked selling decision
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
