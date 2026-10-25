import React, { useState } from 'react';
import { Calculator, Search } from 'lucide-react';
import { ResilientImage } from './ResilientImage';
import heroMandiAuctionImg from '../assets/images/hero_mandi_auction_1792858424611.jpg';

interface HeroSectionProps {
  onQuickSearch: (query: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onQuickSearch }) => {
  const [heroInput, setHeroInput] = useState('');

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickSearch(heroInput);
    const dashboardEl = document.getElementById('price-dashboard');
    if (dashboardEl) {
      dashboardEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-10 lg:pt-12 lg:pb-12">
        {/* 2-Column Balanced Split with items-stretch */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Narrative & Instant Search Column */}
          <div className="lg:col-span-6 flex flex-col justify-between py-1">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-3">
                <span>Agritech &amp; Supply Chain Intelligence</span>
                <span aria-hidden="true">·</span>
                <span>284 Regulated APMC Yards</span>
              </div>

              <h1 className="font-display text-[clamp(2.25rem,3.8vw,3.35rem)] font-bold leading-[1.08] tracking-tight text-slate-900 max-w-xl">
                Transparent mandi rates and net payout comparison before dispatch.
              </h1>

              <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 max-w-[60ch]">
                Search verified wholesale clearing prices across regional APMC mandis and calculate
                exact net farmgate profit after road freight, market cess, unloading labor, and
                transit shrinkage.
              </p>

              {/* Direct Search Jumpstart into Price Dashboard */}
              <form onSubmit={handleHeroSearchSubmit} className="mt-6 max-w-lg">
                <label htmlFor="hero-mandi-search" className="sr-only">
                  Search crop, mandi, or state in Price Dashboard
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="hero-mandi-search"
                      type="search"
                      value={heroInput}
                      onChange={(e) => setHeroInput(e.target.value)}
                      placeholder="Search Onion, Wheat, Lasalgaon, Indore..."
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-green-800"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors duration-150 whitespace-nowrap shrink-0"
                  >
                    Search Prices
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Quick lookup:</span>
                {['Onion', 'Wheat', 'Soybean', 'Tomato', 'Red Chilli'].map((crop, idx) => (
                  <React.Fragment key={crop}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <button
                      type="button"
                      onClick={() => {
                        setHeroInput(crop);
                        onQuickSearch(crop);
                        document
                          .getElementById('price-dashboard')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="font-medium text-slate-700 hover:text-green-800 hover:underline underline-offset-2 whitespace-nowrap"
                    >
                      {crop}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <a
                href="#comparison-calculator"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-900 hover:text-green-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Calculator className="w-4 h-4 text-green-800" />
                <span>Open Comparison Calculator</span>
              </a>
            </div>
          </div>

          {/* Right Media Column */}
          <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-slate-200 min-h-[280px] sm:min-h-[330px]">
            <ResilientImage
              src={heroMandiAuctionImg}
              alt="Farmer and market quality inspector measuring grain moisture with a handheld digital meter inside an organized Indian wholesale mandi shed"
              fallbackTitle="APMC Morning Lot Grading & Moisture Verification"
              className="w-full h-full lg:h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 p-5 text-white">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                <span>Morning Auction Parity</span>
                <span aria-hidden="true">·</span>
                <span>Moisture &amp; Grade Verified</span>
              </div>
              <p className="mt-1 text-sm font-medium text-white max-w-lg">
                Compare wholesale clearing prices alongside freight and moisture deductions before
                committing a truckload.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Quantitative Benchmark Strip Below Hero Split */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div>
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-semibold text-slate-900">
              284 Mandis
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Regulated APMC &amp; e-NAM yards indexed across 9 states
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-semibold text-slate-900">
              +₹185 / qtl
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Median net farmgate gain via freight-adjusted mandi comparison
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-semibold text-slate-900">
              2.2% – 3.8%
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Supply chain commission &amp; dual-handling leakage made visible
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-semibold text-slate-900">
              &lt; 35 Mins
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Median delay from morning open-outcry auction close to dashboard
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
