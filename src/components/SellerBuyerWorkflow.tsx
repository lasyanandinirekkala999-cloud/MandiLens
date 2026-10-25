import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Handshake } from 'lucide-react';
import {
  DealWorkflowStage,
  MandiLotRecord,
  TradeDealRecord,
} from '../data/mandiData';

interface SellerBuyerWorkflowProps {
  records: MandiLotRecord[];
  deals: TradeDealRecord[];
  onCreateDeal: (deal: TradeDealRecord) => void;
  onAdvanceDealStage: (dealId: string) => void;
}

type WorkflowPerspective = 'dual' | 'seller' | 'buyer';

const STAGES: DealWorkflowStage[] = [
  'Assay Posted',
  'Parity Matched',
  'Moisture Verified',
  'Dispatch Cleared',
];

export const SellerBuyerWorkflow: React.FC<SellerBuyerWorkflowProps> = ({
  records,
  deals,
  onCreateDeal,
  onAdvanceDealStage,
}) => {
  const [perspective, setPerspective] = useState<WorkflowPerspective>('dual');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    records[0]?.id ?? ''
  );
  const [quantityQtl, setQuantityQtl] = useState<number>(100);
  const [moisturePct, setMoisturePct] = useState<number>(11.4);
  const [sellerSharePct, setSellerSharePct] = useState<number>(55);
  const [sellerName, setSellerName] = useState('Sahyadri Producer Collective FPO');
  const [buyerName, setBuyerName] = useState('Western Agro Processing & Retail');
  const [formError, setFormError] = useState('');

  const benchmarkLot = useMemo(() => {
    return records.find((r) => r.id === selectedRecordId) || records[0];
  }, [records, selectedRecordId]);

  // Calculate Direct Farmgate-to-Buyer Parity Economics
  const parityMath = useMemo(() => {
    if (!benchmarkLot) {
      return {
        mandiModal: 0,
        traditionalSellerNet: 0,
        traditionalBuyerGateCost: 0,
        eliminatedLeakagePerQtl: 0,
        sellerBonusPerQtl: 0,
        buyerSavingsPerQtl: 0,
        directParityPriceQtl: 0,
        totalLotValueInr: 0,
        totalSavingsPoolInr: 0,
      };
    }

    const mandiModal = benchmarkLot.modalPrice;
    // If Seller goes through traditional mandi, they net farmgateNet after local transport, cess, and hamali
    const traditionalSellerNet = benchmarkLot.supplyChain.farmgateNet;
    // If Buyer buys via mandi commission agent + double unloading/re-bagging, ex-mandi gate cost exceeds modal by ~4.5%
    const dualHandlingAndBrokerage = Math.round(
      mandiModal * 0.045 + benchmarkLot.hamaliPerQtl
    );
    const traditionalBuyerGateCost = mandiModal + dualHandlingAndBrokerage;

    // Direct FPO packhouse pickup eliminates village-to-mandi shuttle + mandi cess + double unloading
    const avoidedMandiShuttleAndCess =
      benchmarkLot.supplyChain.localFreight +
      benchmarkLot.supplyChain.mandiCessCommission;
    const eliminatedLeakagePerQtl = Math.max(
      80,
      Math.round((avoidedMandiShuttleAndCess + dualHandlingAndBrokerage) * 0.68)
    );

    const sellerBonusPerQtl = Math.round(
      eliminatedLeakagePerQtl * (sellerSharePct / 100)
    );
    const buyerSavingsPerQtl = eliminatedLeakagePerQtl - sellerBonusPerQtl;
    const directParityPriceQtl = traditionalSellerNet + benchmarkLot.supplyChain.gradingPackaging + sellerBonusPerQtl;

    const safeQty = Math.max(10, quantityQtl);
    return {
      mandiModal,
      traditionalSellerNet,
      traditionalBuyerGateCost,
      eliminatedLeakagePerQtl,
      sellerBonusPerQtl,
      buyerSavingsPerQtl,
      directParityPriceQtl,
      totalLotValueInr: directParityPriceQtl * safeQty,
      totalSavingsPoolInr: eliminatedLeakagePerQtl * safeQty,
    };
  }, [benchmarkLot, sellerSharePct, quantityQtl]);

  const handleLockTermSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!benchmarkLot) return;
    if (!sellerName.trim() || !buyerName.trim()) {
      setFormError('Enter both Seller (FPO/Grower) and Buyer organization names.');
      return;
    }
    if (quantityQtl < 10 || quantityQtl > 2000) {
      setFormError('Enter a trade lot volume between 10 and 2,000 quintals.');
      return;
    }

    const newDeal: TradeDealRecord = {
      id: `deal-${Date.now()}`,
      referenceCode: `ML-LOT-${Math.floor(4100 + Math.random() * 899)}`,
      commodity: benchmarkLot.commodity,
      variety: `${benchmarkLot.variety} (${benchmarkLot.grade})`,
      benchmarkMandi: benchmarkLot.mandi,
      sellerName: sellerName.trim(),
      buyerName: buyerName.trim(),
      quantityQtl,
      moisturePct,
      mandiModalQtl: parityMath.mandiModal,
      agreedParityPriceQtl: parityMath.directParityPriceQtl,
      sellerBonusPerQtl: parityMath.sellerBonusPerQtl,
      buyerSavingsPerQtl: parityMath.buyerSavingsPerQtl,
      stage: 'Assay Posted',
      createdAt: 'Just locked',
    };

    onCreateDeal(newDeal);
    setFormError('');
  };

  return (
    <section
      id="trade-workflow"
      className="py-12 lg:py-16 bg-slate-50 border-b border-slate-200 no-print"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Header & Role Perspective Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
              <span>Disintermediated Trade Desk</span>
              <span aria-hidden="true">·</span>
              <span>APMC Modal-Anchored Direct Procurement</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Seller &amp; Buyer Direct Parity Workflow
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl">
              Bypassing physical double-unloading and dual mandi commissions frees up ₹140–₹380 per
              quintal. Anchor direct FPO-to-buyer contracts to live APMC modal rates and split the
              saved supply chain margin transparently.
            </p>
          </div>

          <div
            role="group"
            aria-label="Select workflow role view"
            className="inline-flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg self-start lg:self-auto shrink-0"
          >
            {(
              [
                { id: 'dual', label: 'Dual Parity Split' },
                { id: 'seller', label: 'Seller (FPO) Lens' },
                { id: 'buyer', label: 'Buyer (Mill) Lens' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPerspective(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  perspective === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Interactive Deal Negotiator + Live 4-Stage Fulfillment Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: APMC-Indexed Parity Term Builder */}
          <form
            onSubmit={handleLockTermSheet}
            className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  1. Structure Assay-Linked Parity Lot
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a live benchmark APMC lot and calibrate the direct pickup savings split
                </p>
              </div>
              <Handshake className="w-5 h-5 text-green-800 shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="wf-benchmark"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Benchmark APMC Commodity &amp; Clearing Rate
                </label>
                <select
                  id="wf-benchmark"
                  value={benchmarkLot?.id ?? ''}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-green-800"
                >
                  {records.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.commodity} ({rec.variety}) · {rec.mandi} — Modal ₹{rec.modalPrice}/qtl
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="wf-seller"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Seller (FPO / Grower Group)
                </label>
                <input
                  id="wf-seller"
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-green-800"
                />
              </div>

              <div>
                <label
                  htmlFor="wf-buyer"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Buyer (Processor / Retail Chain)
                </label>
                <input
                  id="wf-buyer"
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-green-800"
                />
              </div>

              <div>
                <label
                  htmlFor="wf-qty"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Verified Lot Volume (Quintals)
                </label>
                <input
                  id="wf-qty"
                  type="number"
                  min={10}
                  max={2000}
                  step={5}
                  value={quantityQtl}
                  onChange={(e) => setQuantityQtl(Math.max(10, Number(e.target.value) || 10))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-green-800"
                />
              </div>

              <div>
                <label
                  htmlFor="wf-moisture"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Packhouse Moisture Assay (% H2O)
                </label>
                <input
                  id="wf-moisture"
                  type="number"
                  min={5}
                  max={22}
                  step={0.1}
                  value={moisturePct}
                  onChange={(e) => setMoisturePct(Number(e.target.value) || 11.0)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-green-800"
                />
              </div>
            </div>

            {/* Interactive Middleman Savings Split Slider */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  Saved Dual-Handling Pool: ₹{parityMath.eliminatedLeakagePerQtl}/qtl (₹
                  {parityMath.totalSavingsPoolInr.toLocaleString('en-IN')} total)
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  {sellerSharePct}% Seller · {100 - sellerSharePct}% Buyer
                </span>
              </div>

              <input
                type="range"
                min={20}
                max={80}
                step={5}
                value={sellerSharePct}
                onChange={(e) => setSellerSharePct(Number(e.target.value))}
                aria-label="Adjust savings split between FPO seller and institutional buyer"
                className="w-full accent-green-800 cursor-pointer"
              />

              {/* Perspective-Aware Parity Readout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border border-slate-200 rounded-lg bg-slate-50">
                <div
                  className={`p-3.5 ${
                    perspective === 'seller' ? 'bg-green-50/70' : ''
                  }`}
                >
                  <p className="text-[11px] text-slate-500">FPO Seller Net Bonus</p>
                  <p className="mt-0.5 font-mono tabular-nums text-base font-bold text-green-800">
                    +₹{parityMath.sellerBonusPerQtl} / qtl
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                    vs. ₹{parityMath.traditionalSellerNet} mandi net
                  </p>
                </div>

                <div className="p-3.5 bg-white">
                  <p className="text-[11px] text-slate-500">Agreed Ex-Packhouse Rate</p>
                  <p className="mt-0.5 font-mono tabular-nums text-base font-bold text-slate-900">
                    ₹{parityMath.directParityPriceQtl.toLocaleString('en-IN')} / qtl
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                    Lot: ₹{parityMath.totalLotValueInr.toLocaleString('en-IN')}
                  </p>
                </div>

                <div
                  className={`p-3.5 ${
                    perspective === 'buyer' ? 'bg-green-50/70' : ''
                  }`}
                >
                  <p className="text-[11px] text-slate-500">Buyer Procurement Saving</p>
                  <p className="mt-0.5 font-mono tabular-nums text-base font-bold text-green-800">
                    −₹{parityMath.buyerSavingsPerQtl} / qtl
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                    vs. ₹{parityMath.traditionalBuyerGateCost} agent cost
                  </p>
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-xs font-medium text-red-700" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="w-full px-5 py-3 text-sm font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors duration-150 whitespace-nowrap"
            >
              Lock Parity Term Sheet &amp; Send to Pipeline
            </button>
          </form>

          {/* Right: Active 4-Stage Fulfillment Workflow Ledger */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  2. Active Seller–Buyer Settlement Pipeline
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track assay verification, parity matching, and gate dispatch clearance ({deals.length}{' '}
                  active lots)
                </p>
              </div>
              <a
                href="#intelligence-report"
                className="text-xs font-semibold text-green-800 hover:underline whitespace-nowrap shrink-0"
              >
                View in Export Dossier
              </a>
            </div>

            <div className="divide-y divide-slate-200">
              {deals.map((deal) => {
                const currentStageIdx = STAGES.indexOf(deal.stage);
                const isComplete = deal.stage === 'Dispatch Cleared';

                return (
                  <div key={deal.id} className="p-5 sm:p-6 space-y-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                          <span className="font-semibold text-slate-800">
                            {deal.referenceCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{deal.quantityQtl} qtl</span>
                          <span aria-hidden="true">·</span>
                          <span>{deal.moisturePct.toFixed(1)}% H2O</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans">{deal.createdAt}</span>
                        </div>
                        <h4 className="font-display text-base font-bold text-slate-900 mt-1">
                          {deal.commodity} — {deal.variety}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {perspective === 'buyer' ? (
                            <>
                              <strong>Buyer:</strong> {deal.buyerName} ← <strong>FPO:</strong>{' '}
                              {deal.sellerName}
                            </>
                          ) : (
                            <>
                              <strong>Seller:</strong> {deal.sellerName} → <strong>Buyer:</strong>{' '}
                              {deal.buyerName}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="text-right font-mono tabular-nums">
                        <p className="text-sm font-bold text-slate-900">
                          ₹{deal.agreedParityPriceQtl.toLocaleString('en-IN')} / qtl
                        </p>
                        <p className="text-[11px] text-green-800 font-semibold">
                          Seller +₹{deal.sellerBonusPerQtl} · Buyer −₹{deal.buyerSavingsPerQtl}
                        </p>
                      </div>
                    </div>

                    {/* 4-Step Unboxed Stage Progress Bar */}
                    <div className="pt-1">
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {STAGES.map((st, idx) => (
                          <div
                            key={st}
                            className={`h-1.5 rounded-xs ${
                              idx <= currentStageIdx ? 'bg-green-700' : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-slate-700">
                          Stage {currentStageIdx + 1}/4: <strong>{deal.stage}</strong> (Ref:{' '}
                          {deal.benchmarkMandi})
                        </span>

                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-800 whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Escrow &amp; Gate Pass Issued</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAdvanceDealStage(deal.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Advance to {STAGES[currentStageIdx + 1]}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
