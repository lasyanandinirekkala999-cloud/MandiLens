import React, { useState } from 'react';
import { Check, Copy, Database, Download, PlusCircle } from 'lucide-react';
import {
  DATASET_SCENARIOS,
  DatasetScenarioId,
  MandiLotRecord,
} from '../data/mandiData';

interface SampleDatasetBarProps {
  activeScenarioId: DatasetScenarioId;
  onSelectScenario: (id: DatasetScenarioId) => void;
  records: MandiLotRecord[];
  sampleBatchInjected: boolean;
  onInjectSampleBatch: () => void;
}

export const SampleDatasetBar: React.FC<SampleDatasetBarProps> = ({
  activeScenarioId,
  onSelectScenario,
  records,
  sampleBatchInjected,
  onInjectSampleBatch,
}) => {
  const [inspectOpen, setInspectOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const activeScenario =
    DATASET_SCENARIOS.find((s) => s.id === activeScenarioId) || DATASET_SCENARIOS[0];

  const sampleJsonPreview = JSON.stringify(
    records.slice(0, 2).map((r) => ({
      apmc_code: r.apmcCode,
      commodity: r.commodity,
      variety: r.variety,
      mandi: r.mandi,
      state: r.state,
      assay_spec: r.moistureSpec,
      min_inr_qtl: r.minPrice,
      modal_inr_qtl: r.modalPrice,
      max_inr_qtl: r.maxPrice,
      gate_arrivals_qtl: r.arrivalsQtl,
      farmgate_net_inr_qtl: r.supplyChain.farmgateNet,
      terminal_landed_inr_qtl: r.supplyChain.terminalLandedPrice,
    })),
    null,
    2
  );

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(sampleJsonPreview);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // Clipboard fallback ignored in restricted frames
    }
  };

  const handleDownloadFullDatasetJson = () => {
    const payload = {
      dataset_name: `MandiLens_${activeScenario.id}`,
      scenario: activeScenario.name,
      generated_at: new Date().toISOString(),
      total_lots: records.length,
      records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mandilens_sample_dataset_${activeScenario.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">Sample Market Dataset Simulator</span>
            <span aria-hidden="true">·</span>
            <span>{activeScenario.seasonTag}</span>
            <span aria-hidden="true">·</span>
            <span>{activeScenario.arrivalNote}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
            {activeScenario.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Switch sample market dataset scenario"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            {DATASET_SCENARIOS.map((sc) => {
              const active = sc.id === activeScenarioId;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => onSelectScenario(sc.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-green-800 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {sc.id === 'kharif-baseline'
                    ? 'Kharif Baseline'
                    : sc.id === 'rabi-glut'
                    ? 'Rabi Glut Shock'
                    : 'Monsoon Crunch'}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setInspectOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-green-800" />
            <span>{inspectOpen ? 'Hide Dataset Schema' : 'Inspect Raw Dataset'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Raw Sample Dataset & Batch Ingestion Panel */}
      {inspectOpen && (
        <div className="border-t border-slate-200 bg-slate-900 text-slate-100 p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div>
                <p className="text-xs text-green-400 font-mono tabular-nums">
                  AGMARKNET / e-NAM Standardized Parity Feed ({records.length} Active Yards)
                </p>
                <h3 className="font-display text-base font-semibold text-white mt-1">
                  Sample Dataset Schema &amp; Live Batch Loader
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                  Each market lot combines open-outcry clearing rates (`min`, `modal`, `max`) with
                  moisture assay tolerances and farmgate-to-terminal freight build-ups. Switch
                  seasonal regimes above or inject an extra regional FPO batch to test live search
                  and arbitrage recalculation.
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <dt className="text-slate-400">Freight Multiplier</dt>
                  <dd className="font-mono tabular-nums font-semibold text-white mt-0.5">
                    {activeScenario.freightMultiplier.toFixed(2)}x Baseline
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Shrinkage Factor</dt>
                  <dd className="font-mono tabular-nums font-semibold text-white mt-0.5">
                    {activeScenario.shrinkageMultiplier.toFixed(2)}x Transit Loss
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onInjectSampleBatch}
                  disabled={sampleBatchInjected}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>
                    {sampleBatchInjected
                      ? 'Regional Batch Loaded (+3 Yards)'
                      : 'Inject +3 Sample Regional Lots'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFullDatasetJson}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON Dataset</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">sample_apmc_lots_preview.json</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Schema</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-[11px] leading-relaxed font-mono tabular-nums text-slate-300 overflow-x-auto max-h-56">
                {sampleJsonPreview}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
