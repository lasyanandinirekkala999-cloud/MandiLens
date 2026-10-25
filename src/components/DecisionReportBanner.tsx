import React from 'react';
import { Download, Printer } from 'lucide-react';
import { SmartDecisionResult } from '../data/mandiData';

interface DecisionReportBannerProps {
  decision: SmartDecisionResult;
}

export const DecisionReportBanner: React.FC<DecisionReportBannerProps> = ({
  decision,
}) => {
  const handleDownloadDecisionCsv = () => {
    const headers = [
      'Origin Location',
      'Crop',
      'Quantity (Quintals)',
      'Market',
      'Yard Detail',
      'Distance (km)',
      'Selling Price (INR/qtl)',
      'Gross Revenue (INR)',
      'Transport Cost (INR)',
      'Market Fees (INR)',
      'Expected Price Variation (INR)',
      'Estimated Net Profit (INR)',
    ];

    const rows = decision.evaluatedMandis.map((m) => [
      `"${decision.location}"`,
      `"${decision.crop}"`,
      decision.quantityQtl,
      `"${m.displayName}"`,
      `"${m.yardSubtitle}"`,
      m.distanceKm,
      m.sellingPricePerQtl,
      m.grossRevenueTotal,
      m.transportTotal,
      m.marketFeeTotal,
      m.priceVariationTotal,
      m.estimatedNetProfit,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mandilens_smart_decision_${decision.crop.toLowerCase()}_${decision.quantityQtl}qtl.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="reports"
      className="pt-12 lg:pt-16 pb-8 bg-[#F7F7F2] border-b border-[#E2E4DD]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div
          id="printable-dossier"
          className="bg-white border border-[#E2E4DD] rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E2E4DD]">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#4A524D] mb-1.5">
                <span>Smart Selling Decision Slip</span>
                <span aria-hidden="true">·</span>
                <span>Ready for FPO / Packhouse Dispatch</span>
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#161A18]">
                {decision.recommendationHeadline} — ₹
                {decision.estimatedNetProfit.toLocaleString('en-IN')} Net Profit
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#4A524D]">
                Origin: {decision.location} · Crop: {decision.crop} · Lot: {decision.quantityQtl}{' '}
                Quintals · Extra Earnings: +₹
                {decision.potentialExtraEarnings.toLocaleString('en-IN')} ({decision.aiConfidencePct}
                % AI Confidence)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 no-print">
              <button
                type="button"
                onClick={handleDownloadDecisionCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#161A18] bg-[#F7F7F2] border border-[#D5D8D0] rounded-xl hover:bg-[#EFEFE8] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Export Decision CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Print Selling Slip</span>
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums text-xs sm:text-sm">
            <div>
              <span className="font-sans text-xs text-[#4A524D] block">Best Selling Price</span>
              <strong className="text-base text-[#161A18]">
                ₹{decision.bestSellingPricePerQtl.toLocaleString('en-IN')} / qtl
              </strong>
            </div>
            <div>
              <span className="font-sans text-xs text-[#4A524D] block">Estimated Net Profit</span>
              <strong className="text-base text-[#0F2F1E]">
                ₹{decision.estimatedNetProfit.toLocaleString('en-IN')}
              </strong>
            </div>
            <div>
              <span className="font-sans text-xs text-[#4A524D] block">Recommended Yard</span>
              <strong className="font-sans text-base text-[#161A18]">
                {decision.bestMarketCode}
              </strong>
            </div>
            <div>
              <span className="font-sans text-xs text-[#92400E] block">
                Potential Extra Earnings
              </span>
              <strong className="text-base text-[#B45309]">
                +₹{decision.potentialExtraEarnings.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
