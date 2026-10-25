import React, { useState } from 'react';
import {
  AlertTriangle,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Sparkles,
  Truck,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  SMART_CROPS,
  SMART_LOCATIONS,
  SmartCropId,
  SmartDecisionResult,
  SmartLocationId,
} from '../data/mandiData';
import { useAuth } from '../context/AuthContext';

interface SmartDecisionOverviewProps {
  location: SmartLocationId;
  crop: SmartCropId;
  quantityQtl: number;
  decision: SmartDecisionResult;
  onChangeLocation: (loc: SmartLocationId) => void;
  onChangeCrop: (crop: SmartCropId) => void;
  onChangeQuantity: (qty: number) => void;
  onOpenAuth: () => void;
  onAskAdvisor: (question?: string) => void;
}

export const SmartDecisionOverview: React.FC<SmartDecisionOverviewProps> = ({
  location,
  crop,
  quantityQtl,
  decision,
  onChangeLocation,
  onChangeCrop,
  onChangeQuantity,
  onOpenAuth,
  onAskAdvisor,
}) => {
  const { user, profile, saveComparisonScenario, createProcurementOrder } = useAuth();
  const [whyExpanded, setWhyExpanded] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const localBaseline =
    decision.evaluatedMandis.find((m) => m.isLocalBaseline) ||
    decision.evaluatedMandis[1] ||
    decision.evaluatedMandis[0];

  const handleSaveDecision = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const mA = decision.evaluatedMandis[0];
    const mB = decision.evaluatedMandis[1] || mA;
    const mC = decision.evaluatedMandis[2] || mB;

    setIsSaving(true);
    setFeedbackMsg('');
    try {
      await saveComparisonScenario({
        title: `${decision.crop} · ${decision.location.split(',')[0]} (${decision.quantityQtl} Qtl)`,
        commodity: decision.crop,
        compareCount: 3,
        lotQtl: decision.quantityQtl,
        packagingPerQtl: 50,
        freightPerKmQtl: 4.5,
        shrinkagePer100Km: 1.4,
        marketAName: `${mA.displayName} (${mA.yardSubtitle.split('·')[0].trim()})`,
        marketAPriceQtl: mA.sellingPricePerQtl,
        marketADistanceKm: mA.distanceKm,
        marketBName: `${mB.displayName} (${mB.yardSubtitle.split('·')[0].trim()})`,
        marketBPriceQtl: mB.sellingPricePerQtl,
        marketBDistanceKm: mB.distanceKm,
        marketCName: `${mC.displayName} (${mC.yardSubtitle.split('·')[0].trim()})`,
        marketCPriceQtl: mC.sellingPricePerQtl,
        marketCDistanceKm: mC.distanceKm,
        bestMarketName: decision.bestMarketCode,
        bestNetPerQtl: Math.round(decision.estimatedNetProfit / decision.quantityQtl),
        bestNetTotalInr: decision.estimatedNetProfit,
      });
      setFeedbackMsg('Smart selling decision saved to your Firestore account.');
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Unable to save decision.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDispatchLot = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setIsDispatching(true);
    setFeedbackMsg('');
    try {
      await createProcurementOrder({
        organization: profile?.displayName || user.displayName || 'MandILens Farmer',
        commodity: decision.crop,
        originCluster: decision.location,
        destinationMandi: `${decision.bestMarketCode} — ${decision.bestMarketSubtitle.split('·')[0].trim()}`,
        quantityQtl: decision.quantityQtl,
        expectedNetPerQtl: Math.max(
          50,
          Math.round(decision.estimatedNetProfit / decision.quantityQtl)
        ),
      });
      setFeedbackMsg(`Planned ${decision.quantityQtl} Qtl dispatch to ${decision.bestMarketCode} logged.`);
      document.getElementById('reports')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Unable to create dispatch record.');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <section id="dashboard" className="py-10 lg:py-14 bg-[#F7F7F2] border-b border-[#E2E4DD]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Dashboard Overview Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#4A524D] mb-1.5">
              <span>Main Decision Dashboard</span>
              <span aria-hidden="true">·</span>
              <span>Net Profit Ranked Across Regional Mandis</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#161A18]">
              Smart Selling Decision Overview
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#4A524D]">
            <span className="font-mono tabular-nums">
              Active Lot: <strong className="text-[#161A18]">{quantityQtl} Quintals</strong> ·{' '}
              <strong className="text-[#161A18]">{crop}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <a
              href="#price-dashboard"
              className="font-semibold text-[#0F2F1E] hover:underline underline-offset-4 whitespace-nowrap"
            >
              Price Dashboard →
            </a>
            <a
              href="#comparison-calculator"
              className="font-semibold text-[#15803D] hover:underline underline-offset-4 whitespace-nowrap"
            >
              Comparison Calculator →
            </a>
          </div>
        </div>

        {/* Location / Crop / Quantity Selector Bar */}
        <div className="bg-white border border-[#E2E4DD] rounded-2xl p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Location Selector */}
            <div className="md:col-span-5">
              <label
                htmlFor="smart-location-select"
                className="block text-xs font-semibold text-[#4A524D] mb-1.5"
              >
                Location
              </label>
              <select
                id="smart-location-select"
                value={location}
                onChange={(e) => onChangeLocation(e.target.value as SmartLocationId)}
                className="w-full px-3.5 py-2.5 text-sm font-semibold bg-[#F7F7F2] border border-[#D5D8D0] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
              >
                {SMART_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Crop Selector */}
            <div className="md:col-span-4">
              <label
                htmlFor="smart-crop-select"
                className="block text-xs font-semibold text-[#4A524D] mb-1.5"
              >
                Crop
              </label>
              <select
                id="smart-crop-select"
                value={crop}
                onChange={(e) => onChangeCrop(e.target.value as SmartCropId)}
                className="w-full px-3.5 py-2.5 text-sm font-semibold bg-[#F7F7F2] border border-[#D5D8D0] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
              >
                {SMART_CROPS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Selector (Quintals) */}
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="smart-qty-input"
                  className="text-xs font-semibold text-[#4A524D]"
                >
                  Quantity
                </label>
                <span className="text-xs font-mono tabular-nums text-[#4A524D]">
                  {quantityQtl} Quintals
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Decrease quantity by 5 quintals"
                  onClick={() => onChangeQuantity(Math.max(5, quantityQtl - 5))}
                  className="inline-flex items-center justify-center w-10 h-10 bg-[#F7F7F2] border border-[#D5D8D0] rounded-xl text-[#161A18] hover:bg-[#EFEFE8] transition-colors shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    id="smart-qty-input"
                    type="number"
                    min={1}
                    max={2000}
                    value={quantityQtl}
                    onChange={(e) =>
                      onChangeQuantity(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))
                    }
                    className="w-full px-3 py-2.5 pr-16 text-sm font-mono tabular-nums font-semibold bg-[#F7F7F2] border border-[#D5D8D0] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4A524D] pointer-events-none">
                    Quintals
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Increase quantity by 5 quintals"
                  onClick={() => onChangeQuantity(Math.min(2000, quantityQtl + 5))}
                  className="inline-flex items-center justify-center w-10 h-10 bg-[#F7F7F2] border border-[#D5D8D0] rounded-xl text-[#161A18] hover:bg-[#EFEFE8] transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TOP 4 KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Best Selling Price */}
          <div className="bg-white border border-[#E2E4DD] rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-xs font-semibold text-[#4A524D]">Best Selling Price</p>
            <p className="mt-2 font-mono tabular-nums text-2xl sm:text-[26px] font-bold text-[#161A18]">
              ₹{decision.bestSellingPricePerQtl.toLocaleString('en-IN')}{' '}
              <span className="text-sm font-medium text-[#4A524D]">/ quintal</span>
            </p>
            <p className="mt-2 text-xs text-[#4A524D]">
              Verified modal clearing rate at {decision.bestMarketCode}
            </p>
          </div>

          {/* Card 2: Estimated Net Profit */}
          <div className="bg-white border border-[#E2E4DD] rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-xs font-semibold text-[#4A524D]">Estimated Net Profit</p>
            <p className="mt-2 font-mono tabular-nums text-2xl sm:text-[26px] font-bold text-[#0F2F1E]">
              ₹{decision.estimatedNetProfit.toLocaleString('en-IN')}
            </p>
            <p className="mt-2 text-xs text-[#4A524D] font-mono tabular-nums">
              ₹{Math.round(decision.estimatedNetProfit / decision.quantityQtl).toLocaleString('en-IN')} / qtl net after all costs
            </p>
          </div>

          {/* Card 3: Best Market */}
          <div className="bg-white border border-[#E2E4DD] rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-xs font-semibold text-[#4A524D]">Best Market</p>
            <p className="mt-2 font-display text-2xl sm:text-[26px] font-bold text-[#161A18]">
              {decision.bestMarketCode}
            </p>
            <p className="mt-2 text-xs text-[#4A524D] truncate">{decision.bestMarketSubtitle}</p>
          </div>

          {/* Card 4: Potential Extra Earnings — Visually Stands Out as Key AI Insight */}
          <div className="bg-[#FEF7E6] border border-[#F59E0B]/55 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#92400E]">Potential Extra Earnings</p>
              <Sparkles className="w-4 h-4 text-[#D97706] shrink-0" aria-hidden="true" />
            </div>
            <p className="mt-2 font-mono tabular-nums text-2xl sm:text-[28px] font-bold text-[#B45309]">
              +₹{decision.potentialExtraEarnings.toLocaleString('en-IN')}
            </p>
            <p className="mt-2 text-xs font-medium text-[#92400E] font-mono tabular-nums">
              +₹{decision.extraPerQtl.toLocaleString('en-IN')}/qtl vs local {localBaseline.displayName}
            </p>
          </div>
        </div>

        {/* AI RECOMMENDATION CARD — VISUAL CENTERPIECE */}
        <div className="bg-[#0F2F1E] text-white rounded-2xl border border-[#1E4D33] overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-9 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Decision Narrative */}
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#86EFAC] tracking-[0.01em]">
                <span>AI Recommendation</span>
                <span aria-hidden="true">•</span>
                <span>
                  {decision.crop} ({decision.quantityQtl} Quintals) from {decision.location}
                </span>
              </div>

              <h3 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                “{decision.recommendationHeadline}”
              </h3>

              <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl">
                {decision.recommendationSummary}
              </p>

              {/* Centerpiece Action Controls */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-expanded={whyExpanded}
                  onClick={() => setWhyExpanded((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0F2F1E] bg-[#4ADE80] rounded-xl hover:bg-[#86EFAC] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span>{whyExpanded ? 'Hide Decision Breakdown' : 'View Why →'}</span>
                  {whyExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onAskAdvisor(
                      `Why is ${decision.bestMarketCode} the best market for my ${decision.quantityQtl} quintals of ${decision.crop} from ${decision.location}, and when should I arrive at the gate?`
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 transition-colors duration-150 whitespace-nowrap shrink-0"
                >
                  <span>Ask AI Advisor</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveDecision}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white/90 hover:text-white border border-white/15 rounded-xl hover:bg-white/10 disabled:opacity-60 transition-colors duration-150 whitespace-nowrap shrink-0"
                >
                  <BookmarkCheck className="w-4 h-4 text-[#86EFAC]" />
                  <span>{isSaving ? 'Saving...' : 'Save Decision'}</span>
                </button>

                <button
                  type="button"
                  disabled={isDispatching}
                  onClick={handleDispatchLot}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white/90 hover:text-white border border-white/15 rounded-xl hover:bg-white/10 disabled:opacity-60 transition-colors duration-150 whitespace-nowrap shrink-0"
                >
                  <Truck className="w-4 h-4 text-[#FBBF24]" />
                  <span>{isDispatching ? 'Booking...' : 'Log Dispatch'}</span>
                </button>
              </div>

              {feedbackMsg && (
                <p className="mt-3 text-xs font-medium text-[#86EFAC]" role="status">
                  {feedbackMsg}
                </p>
              )}
            </div>

            {/* Right Glassmorphic Confidence & Optimal Gate Window Box */}
            <div className="lg:col-span-4 bg-white/[0.07] backdrop-blur-sm border border-white/14 rounded-xl p-5 space-y-4">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-white/80">AI Confidence</span>
                  <span className="font-mono tabular-nums text-2xl font-bold text-[#4ADE80]">
                    {decision.aiConfidencePct}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full bg-white/15 rounded-sm overflow-hidden">
                  <div
                    style={{ width: `${decision.aiConfidencePct}%` }}
                    className="h-full bg-[#4ADE80]"
                  />
                </div>
                <p className="mt-2 text-xs text-white/70">
                  Calibrated on live gate arrivals, diesel backhaul rates &amp; 7-day price variance
                </p>
              </div>

              <div className="pt-3.5 border-t border-white/12">
                <p className="text-[11px] font-semibold text-[#FDE68A]">
                  Recommended Gate Arrival Window
                </p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-white">
                  {decision.optimalWindow.gateWindow}
                </p>
              </div>
            </div>
          </div>

          {/* EXPANDABLE "VIEW WHY →" EXPLAINABILITY PANEL */}
          {whyExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white text-[#161A18] border-t border-[#E2E4DD] p-6 sm:p-8 space-y-8"
            >
              {/* 1. Transparent Net Profit Waterfall Table (Mandi A vs Mandi B vs Mandi C) */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
                  <div>
                    <h4 className="font-display text-lg font-bold text-[#161A18]">
                      Why {decision.bestMarketCode} Wins: Full Net Profit Waterfall ({decision.quantityQtl} Quintals)
                    </h4>
                    <p className="text-xs sm:text-sm text-[#4A524D] mt-0.5">
                      Every deduction is subtracted before ranking so high gross prices never hide
                      expensive transport or spoilage losses.
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-[#4A524D]">
                    Formula: Gross − Transport − Market Fees − Price Variation
                  </span>
                </div>

                <div className="overflow-x-auto border border-[#E2E4DD] rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E4DD] bg-[#F7F7F2] text-xs font-semibold text-[#4A524D]">
                        <th className="py-3 pl-4 pr-3 whitespace-nowrap">Evaluated Market</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Selling Rate</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Gross Revenue</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Transport Cost</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Market Fees</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">
                          Expected Variation
                        </th>
                        <th className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                          Estimated Net Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E4DD] text-sm">
                      {decision.evaluatedMandis.map((m) => {
                        const isBest = m.displayName === decision.bestMarketCode;
                        const deltaVsLocal =
                          m.estimatedNetProfit - localBaseline.estimatedNetProfit;

                        return (
                          <tr
                            key={m.code}
                            className={isBest ? 'bg-[#F0FDF4]' : 'bg-white hover:bg-[#F7F7F2]/60'}
                          >
                            <td className="py-3.5 pl-4 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#161A18]">
                                  {m.displayName}
                                </span>
                                {isBest && (
                                  <span className="text-xs font-semibold text-[#15803D]">
                                    · Recommended
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#4A524D] mt-0.5">
                                {m.yardSubtitle} · {m.travelTimeHrs}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-[#161A18] whitespace-nowrap">
                              ₹{m.sellingPricePerQtl.toLocaleString('en-IN')}/qtl
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#161A18] whitespace-nowrap">
                              ₹{m.grossRevenueTotal.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#DC2626] whitespace-nowrap">
                              −₹{m.transportTotal.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#DC2626] whitespace-nowrap">
                              −₹{m.marketFeeTotal.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#DC2626] whitespace-nowrap">
                              −₹{m.priceVariationTotal.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 pl-3 pr-4 text-right font-mono tabular-nums whitespace-nowrap">
                              <div
                                className={`text-base font-bold ${
                                  isBest ? 'text-[#15803D]' : 'text-[#161A18]'
                                }`}
                              >
                                ₹{m.estimatedNetProfit.toLocaleString('en-IN')}
                              </div>
                              <div className="text-xs text-[#4A524D]">
                                {deltaVsLocal > 0
                                  ? `+₹${deltaVsLocal.toLocaleString('en-IN')} vs local`
                                  : m.isLocalBaseline
                                  ? 'Local baseline'
                                  : `−₹${Math.abs(deltaVsLocal).toLocaleString('en-IN')} vs local`}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Three Key AI Decision Drivers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {decision.whyReasons.map((reason) => (
                  <div
                    key={reason.step}
                    className="p-4 rounded-xl bg-[#F7F7F2] border border-[#E2E4DD] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-[#15803D] mb-1.5">
                        <span>{reason.step}. Decision Driver</span>
                        <span className="font-mono tabular-nums">{reason.metricHighlight}</span>
                      </div>
                      <h5 className="font-display text-sm font-bold text-[#161A18]">
                        {reason.title}
                      </h5>
                      <p className="mt-1.5 text-xs sm:text-sm text-[#4A524D] leading-relaxed">
                        {reason.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. Genuine Perishability / Deduction Risk Warning (Red strictly for warnings) */}
              {decision.riskWarning.hasWarning && (
                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3">
                  <AlertTriangle
                    className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#991B1B]">
                      {decision.riskWarning.title}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-[#7F1D1D] leading-relaxed">
                      {decision.riskWarning.message}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};
