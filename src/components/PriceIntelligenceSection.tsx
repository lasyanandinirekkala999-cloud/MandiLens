import React, { useEffect, useState } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { SmartDecisionResult } from '../data/mandiData';

interface PriceIntelligenceSectionProps {
  decision: SmartDecisionResult;
}

export const PriceIntelligenceSection: React.FC<PriceIntelligenceSectionProps> = ({
  decision,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(6); // Defaults to 'Today'

  useEffect(() => {
    setSelectedIdx(6);
  }, [decision.location, decision.crop]);

  const series = decision.priceSeries;
  const activePoint = series[selectedIdx] || series[6] || series[0];

  const minBand = Math.min(...series.map((p) => p.lowBand)) * 0.96;
  const maxBand = Math.max(...series.map((p) => p.highBand)) * 1.03;
  const maxArrivals = Math.max(...series.map((p) => p.arrivalsQtl), 1);

  const sellNowWins =
    decision.optimalWindow.sellNowNet >= decision.optimalWindow.hold48hProjectedNet;
  const timingDelta = Math.abs(
    decision.optimalWindow.sellNowNet - decision.optimalWindow.hold48hProjectedNet
  );

  return (
    <section
      id="price-intelligence"
      className="py-12 lg:py-16 bg-white border-b border-[#E2E4DD] no-print"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#4A524D] mb-2">
              <span>Price Intelligence &amp; Timing Forecast</span>
              <span aria-hidden="true">·</span>
              <span>
                {decision.crop} at {decision.bestMarketCode} ({decision.bestMarketSubtitle.split('·')[0].trim()})
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#161A18]">
              7-Day Clearing Trend &amp; 72-Hour Expected Price Range
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-[#4A524D] max-w-2xl">
              Inspect historical auction closes alongside AI-projected 72-hour price bands and
              spoilage-adjusted Sell Today vs. Hold 48h net profit outcomes.
            </p>
          </div>

          <div className="text-xs font-mono tabular-nums text-[#4A524D] shrink-0">
            Selected Session: <strong className="text-[#0F2F1E]">{activePoint.label}</strong> ·{' '}
            <strong className="text-[#15803D]">
              ₹{activePoint.modalPrice.toLocaleString('en-IN')}/qtl
            </strong>
          </div>
        </div>

        {/* Main 12-Col Split: Left Chart (7 cols) + Right Sell Now vs Hold Analysis (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Interactive Historical + Forecast Chart */}
          <div className="lg:col-span-7 bg-[#F7F7F2] border border-[#E2E4DD] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E4DD]">
                <div>
                  <h3 className="font-display text-base font-bold text-[#161A18]">
                    Modal Price Trajectory &amp; Expected Variation Band
                  </h3>
                  <p className="text-xs text-[#4A524D] mt-0.5">
                    Click any day or forecast bar to inspect expected min–max clearing range
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#4A524D]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#0F2F1E] inline-block rounded-xs" />
                    <span>Actual Clearing</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#D97706] inline-block rounded-xs" />
                    <span>72h AI Forecast</span>
                  </span>
                </div>
              </div>

              {/* Selected Point Readout Strip */}
              <div className="mt-4 grid grid-cols-3 gap-4 py-3 px-4 bg-white border border-[#E2E4DD] rounded-xl font-mono tabular-nums">
                <div>
                  <p className="font-sans text-[11px] text-[#4A524D]">
                    {activePoint.kind === 'forecast' ? 'Projected Modal' : 'Cleared Modal'}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-[#161A18]">
                    ₹{activePoint.modalPrice.toLocaleString('en-IN')}/qtl
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[11px] text-[#4A524D]">Expected Range</p>
                  <p className="text-xs sm:text-sm font-semibold text-[#161A18] mt-0.5">
                    ₹{activePoint.lowBand.toLocaleString('en-IN')} – ₹
                    {activePoint.highBand.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[11px] text-[#4A524D]">Gate Arrivals</p>
                  <p className="text-xs sm:text-sm font-semibold text-[#161A18] mt-0.5">
                    {activePoint.arrivalsQtl.toLocaleString('en-IN')} qtl
                  </p>
                </div>
              </div>

              {/* 10-Column Interactive Bar & Range Chart */}
              <div className="mt-6 pt-2">
                <div className="grid grid-cols-10 gap-1.5 sm:gap-2 items-end h-44 border-b border-[#D5D8D0] pb-3">
                  {series.map((pt, idx) => {
                    const span = Math.max(1, maxBand - minBand);
                    const heightPct = Math.max(
                      24,
                      Math.min(100, 22 + ((pt.modalPrice - minBand) / span) * 76)
                    );
                    const isSelected = idx === selectedIdx;
                    const isForecast = pt.kind === 'forecast';
                    const isToday = pt.kind === 'today';

                    return (
                      <button
                        key={pt.label}
                        type="button"
                        onClick={() => setSelectedIdx(idx)}
                        aria-label={`${pt.label}: ₹${pt.modalPrice} per quintal`}
                        className="group h-full flex flex-col justify-end items-center focus:outline-none"
                      >
                        <span
                          className={`mb-1.5 font-mono tabular-nums text-[10px] font-semibold transition-opacity ${
                            isSelected
                              ? 'opacity-100 text-[#161A18]'
                              : 'opacity-0 group-hover:opacity-100 text-[#4A524D]'
                          }`}
                        >
                          ₹{pt.modalPrice}
                        </span>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[28px] rounded-t-md transition-opacity duration-150 ${
                            isForecast
                              ? isSelected
                                ? 'bg-[#D97706]'
                                : 'bg-[#F59E0B]/70 group-hover:bg-[#D97706]'
                              : isToday
                              ? 'bg-[#16A34A]'
                              : isSelected
                              ? 'bg-[#0F2F1E]'
                              : 'bg-[#0F2F1E]/65 group-hover:bg-[#0F2F1E]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* X-Axis Labels + Arrival Density Mini-Bars */}
                <div className="mt-2 grid grid-cols-10 gap-1.5 sm:gap-2 text-center">
                  {series.map((pt, idx) => {
                    const arrivalWidth = Math.round((pt.arrivalsQtl / maxArrivals) * 100);
                    return (
                      <div key={pt.label} className="space-y-1">
                        <div className="h-1 w-full bg-[#E2E4DD] rounded-xs overflow-hidden">
                          <div
                            style={{ width: `${arrivalWidth}%` }}
                            className="h-full bg-[#6B7280]"
                          />
                        </div>
                        <p
                          className={`text-[10px] truncate ${
                            idx === selectedIdx
                              ? 'font-bold text-[#0F2F1E]'
                              : 'text-[#4A524D]'
                          }`}
                        >
                          {pt.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E4DD] flex items-center justify-between text-xs text-[#4A524D]">
              <span>Lower gray strip shows daily inward gate arrival pressure</span>
              <span className="font-mono tabular-nums">
                Today: ₹{decision.bestSellingPricePerQtl.toLocaleString('en-IN')}/qtl
              </span>
            </div>
          </div>

          {/* Right: Sell Today vs Hold 48 Hours Timing Intelligence */}
          <div className="lg:col-span-5 bg-[#F7F7F2] border border-[#E2E4DD] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D] mb-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Harvest Timing &amp; Storage Economics</span>
              </div>

              <h3 className="font-display text-xl font-bold text-[#161A18]">
                {decision.optimalWindow.verdictLabel}
              </h3>

              <p className="mt-2 text-xs sm:text-sm text-[#4A524D] leading-relaxed">
                {decision.optimalWindow.verdictNote}
              </p>

              {/* Side-by-Side Comparison Rows */}
              <div className="mt-5 space-y-3">
                <div
                  className={`p-4 rounded-xl border ${
                    sellNowWins
                      ? 'bg-white border-[#16A34A]'
                      : 'bg-white border-[#E2E4DD]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#4A524D]">
                        Option 1 · Dispatch Today to {decision.bestMarketCode}
                      </p>
                      <p className="text-xs text-[#15803D] font-medium mt-0.5">
                        {decision.optimalWindow.gateWindow}
                      </p>
                    </div>
                    <p className="font-mono tabular-nums text-lg font-bold text-[#0F2F1E]">
                      ₹{decision.optimalWindow.sellNowNet.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    !sellNowWins
                      ? 'bg-white border-[#16A34A]'
                      : 'bg-white border-[#E2E4DD]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#4A524D]">
                        Option 2 · Hold 48 Hours &amp; Sell Later
                      </p>
                      <p className="text-xs text-[#4A524D] mt-0.5">
                        Includes projected rate shift &amp; storage weight loss
                      </p>
                    </div>
                    <p className="font-mono tabular-nums text-lg font-bold text-[#161A18]">
                      ₹{decision.optimalWindow.hold48hProjectedNet.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2E4DD] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0F2F1E]">
                <TrendingUp className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>
                  Timing Net Advantage:{' '}
                  <span className="font-mono tabular-nums">
                    +₹{timingDelta.toLocaleString('en-IN')}
                  </span>
                </span>
              </div>
              <a
                href="#markets"
                className="text-xs font-semibold text-[#15803D] hover:underline underline-offset-4 whitespace-nowrap"
              >
                Compare All Markets →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
