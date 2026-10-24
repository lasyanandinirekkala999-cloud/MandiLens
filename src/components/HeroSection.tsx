import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ResilientImage } from './ResilientImage';
import heroMandiAuctionImg from '../assets/images/hero_mandi_auction_1792858424611.jpg';

export const HeroSection: React.FC = () => {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-12 lg:pt-14 lg:pb-16">
        {/* 2-Column Balanced Split with items-stretch */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Narrative Column */}
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                <span>APMC Auction Parity</span>
                <span aria-hidden="true">·</span>
                <span>FPO Supply Chain Routing</span>
                <span aria-hidden="true">·</span>
                <span>Pan-India Coverage</span>
              </div>

              <h1 className="font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-slate-900 max-w-xl">
                Transparent mandi prices and net farmgate payout before dispatch.
              </h1>

              <p className="mt-5 text-base leading-relaxed text-slate-600 max-w-[62ch]">
                A higher wholesale rate at a distant mandi often masks freight, mandi cess,
                unloading charges, and transit moisture loss. MandiLens standardizes daily
                grade-wise APMC auction sheets alongside real transport deductions so farmers,
                FPOs, and commodity buyers transact on verified net margins.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-5">
              <a
                href="#mandi-rates"
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800"
              >
                Explore Mandi Rates
              </a>
              <a
                href="#calculator"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-green-800 transition-colors duration-150 whitespace-nowrap shrink-0 py-2"
              >
                <span>Compare Net Freight Arbitrage</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right Media Column */}
          <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-slate-200 min-h-[300px] sm:min-h-[360px]">
            <ResilientImage
              src={heroMandiAuctionImg}
              alt="Farmer and market quality inspector measuring grain moisture with a handheld digital meter inside an organized Indian wholesale mandi shed"
              fallbackTitle="APMC Morning Lot Grading & Moisture Verification"
              className="w-full h-full lg:h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 text-white">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                <span>Morning Auction Lot Verification</span>
                <span aria-hidden="true">·</span>
                <span>Moisture & Grade Indexing</span>
              </div>
              <p className="mt-1 text-sm sm:text-base font-medium text-white max-w-lg">
                Standardized moisture testing at farmgate packhouses prevents arbitrary
                quality deductions of ₹120–₹240 per quintal at auction yards.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Quantitative Benchmark Strip Below Hero Split */}
        <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900">
              284 Mandis
            </p>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Regulated APMC & e-NAM yards indexed across 9 agricultural states
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900">
              +₹185 / qtl
            </p>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Median net farmgate gain via freight-adjusted mandi routing (FY25–26)
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900">
              18 Crops
            </p>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Grains, pulses, oilseeds, spices, and perishable crate horticulture
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900">
              &lt; 35 Mins
            </p>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Median delay from morning open-outcry auction close to published sheet
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
