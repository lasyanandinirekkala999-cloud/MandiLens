import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Truck } from 'lucide-react';
import { ARBITRAGE_CORRIDORS, CandidateMandiOption } from '../data/mandiData';

interface ArbitrageCalculatorProps {
  selectedCorridorId: string;
  onCorridorChange: (corridorId: string) => void;
}

export const ArbitrageCalculator: React.FC<ArbitrageCalculatorProps> = ({
  selectedCorridorId,
  onCorridorChange,
}) => {
  const activeCorridor = useMemo(() => {
    return (
      ARBITRAGE_CORRIDORS.find((c) => c.id === selectedCorridorId) ||
      ARBITRAGE_CORRIDORS[0]
    );
  }, [selectedCorridorId]);

  const [lotQtl, setLotQtl] = useState<number>(activeCorridor.defaultLotQtl);
  const [freightPerKmQtl, setFreightPerKmQtl] = useState<number>(
    activeCorridor.defaultFreightPerKmQtl
  );
  const [shrinkagePer100Km, setShrinkagePer100Km] = useState<number>(
    activeCorridor.defaultShrinkagePctPer100Km
  );
  const [customMandis, setCustomMandis] = useState<CandidateMandiOption[]>(
    activeCorridor.mandis
  );

  useEffect(() => {
    setLotQtl(activeCorridor.defaultLotQtl);
    setFreightPerKmQtl(activeCorridor.defaultFreightPerKmQtl);
    setShrinkagePer100Km(activeCorridor.defaultShrinkagePctPer100Km);
    setCustomMandis(activeCorridor.mandis);
  }, [activeCorridor]);

  const handleReset = () => {
    setLotQtl(activeCorridor.defaultLotQtl);
    setFreightPerKmQtl(activeCorridor.defaultFreightPerKmQtl);
    setShrinkagePer100Km(activeCorridor.defaultShrinkagePctPer100Km);
    setCustomMandis(activeCorridor.mandis);
  };

  const updateMandiField = (
    id: string,
    field: 'distanceKm' | 'modalPriceQtl',
    value: number
  ) => {
    setCustomMandis((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: Math.max(0, value) } : m))
    );
  };

  const vehicleGuidance = useMemo(() => {
    if (lotQtl <= 20) return '1.5T Mini Pickup (Bolero / Ace)';
    if (lotQtl <= 50) return '3.5T Light Commercial Vehicle (Eicher / 407)';
    if (lotQtl <= 110) return '9T 6-Tyre Standard Mandi Truck';
    return '16T Multi-Axle Line-Haul Carrier';
  }, [lotQtl]);

  const evaluations = useMemo(() => {
    return customMandis.map((m) => {
      const shrinkagePct = (m.distanceKm / 100) * shrinkagePer100Km;
      const salableWeightQtl = lotQtl * Math.max(0, 1 - shrinkagePct / 100);
      const grossValue = salableWeightQtl * m.modalPriceQtl;
      const shrinkageLossInr = (lotQtl - salableWeightQtl) * m.modalPriceQtl;
      const freightCost = m.distanceKm * freightPerKmQtl * lotQtl;
      const mandiFeeInr = grossValue * (m.mandiFeePct / 100);
      const hamaliInr = m.hamaliPerQtl * lotQtl;
      const netTotalInr = grossValue - freightCost - mandiFeeInr - hamaliInr;
      const netPerQtl = lotQtl > 0 ? netTotalInr / lotQtl : 0;

      return {
        ...m,
        shrinkagePct,
        shrinkageLossInr,
        freightCost,
        mandiAndHamaliInr: mandiFeeInr + hamaliInr,
        grossValue,
        netTotalInr,
        netPerQtl,
      };
    });
  }, [customMandis, lotQtl, freightPerKmQtl, shrinkagePer100Km]);

  const bestOption = useMemo(() => {
    return evaluations.reduce(
      (best, curr) => (curr.netTotalInr > best.netTotalInr ? curr : best),
      evaluations[0]
    );
  }, [evaluations]);

  const localBaseline = evaluations[0];
  const netAdvantageTotal = bestOption
    ? Math.round(bestOption.netTotalInr - (localBaseline?.netTotalInr ?? 0))
    : 0;

  return (
    <section id="calculator" className="py-14 lg:py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
              <span>Dispatch Decision Engine</span>
              <span aria-hidden="true">·</span>
              <span>Freight, Cess &amp; Moisture Shrinkage Adjusted</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Net Farmgate Realization &amp; Mandi Arbitrage Calculator
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
              Test whether dispatching to a higher-priced regional terminal beats selling at your
              local taluka yard once diesel freight, APMC fees, unloading labor, and transit weight
              loss are deducted.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Corridor Defaults</span>
          </button>
        </div>

        {/* Controls Strip */}
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label
                htmlFor="corridor-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Commodity Dispatch Corridor
              </label>
              <select
                id="corridor-select"
                value={activeCorridor.id}
                onChange={(e) => onCorridorChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-green-800"
              >
                {ARBITRAGE_CORRIDORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">Origin: {activeCorridor.originCluster}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="lot-qtl" className="text-xs font-semibold text-slate-700">
                  Harvest Lot Volume
                </label>
                <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                  {lotQtl} qtl ({(lotQtl / 10).toFixed(1)} MT)
                </span>
              </div>
              <input
                id="lot-qtl"
                type="range"
                min={10}
                max={220}
                step={5}
                value={lotQtl}
                onChange={(e) => setLotQtl(Number(e.target.value))}
                className="w-full accent-green-800 cursor-pointer"
              />
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{vehicleGuidance}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="freight-rate" className="text-xs font-semibold text-slate-700">
                  Road Freight Rate
                </label>
                <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                  ₹{freightPerKmQtl.toFixed(2)} / km / qtl
                </span>
              </div>
              <input
                id="freight-rate"
                type="range"
                min={0.7}
                max={3.0}
                step={0.05}
                value={freightPerKmQtl}
                onChange={(e) => setFreightPerKmQtl(Number(e.target.value))}
                className="w-full accent-green-800 cursor-pointer"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Adjust for backhaul availability or diesel surge
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="shrinkage-rate" className="text-xs font-semibold text-slate-700">
                  Transit Moisture / Weight Loss
                </label>
                <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                  {shrinkagePer100Km.toFixed(2)}% / 100 km
                </span>
              </div>
              <input
                id="shrinkage-rate"
                type="range"
                min={0.0}
                max={3.0}
                step={0.05}
                value={shrinkagePer100Km}
                onChange={(e) => setShrinkagePer100Km(Number(e.target.value))}
                className="w-full accent-green-800 cursor-pointer"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Higher for un-precooled vegetables; lower for dry grains
              </p>
            </div>
          </div>
        </div>

        {/* 3-Column Mandi Comparison Matrix (Single-Elevation Hairline Grid) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white">
            {evaluations.map((option) => {
              const isOptimal = bestOption?.id === option.id;

              return (
                <div
                  key={option.id}
                  className={`p-6 flex flex-col justify-between ${
                    isOptimal ? 'bg-green-50/40' : 'bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                      <span>{option.tierLabel}</span>
                      {isOptimal ? (
                        <span className="font-semibold text-green-800">
                          Recommended Optimal Net Payout
                        </span>
                      ) : (
                        <span>Alternative Route</span>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-bold text-slate-900">{option.name}</h3>

                    {/* Editable Distance and Expected Modal Rate */}
                    <div className="mt-4 grid grid-cols-2 gap-3 pb-4 border-b border-slate-200">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          One-Way Distance (km)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={1500}
                          value={option.distanceKm}
                          onChange={(e) =>
                            updateMandiField(option.id, 'distanceKm', Number(e.target.value))
                          }
                          className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-green-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Modal Rate (₹/qtl)
                        </label>
                        <input
                          type="number"
                          min={100}
                          max={50000}
                          value={option.modalPriceQtl}
                          onChange={(e) =>
                            updateMandiField(option.id, 'modalPriceQtl', Number(e.target.value))
                          }
                          className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-green-800"
                        />
                      </div>
                    </div>

                    {/* Line-Item Cost Deductions */}
                    <dl className="mt-4 space-y-2.5 text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-600">Gross Lot Value ({lotQtl} qtl)</dt>
                        <dd className="font-mono tabular-nums font-medium text-slate-900">
                          ₹{Math.round(option.modalPriceQtl * lotQtl).toLocaleString('en-IN')}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-600">
                          Road Freight ({option.distanceKm} km)
                        </dt>
                        <dd className="font-mono tabular-nums text-red-700">
                          − ₹{Math.round(option.freightCost).toLocaleString('en-IN')}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-600">
                          Mandi Cess ({option.mandiFeePct}%) &amp; Hamali
                        </dt>
                        <dd className="font-mono tabular-nums text-red-700">
                          − ₹{Math.round(option.mandiAndHamaliInr).toLocaleString('en-IN')}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-600">
                          Transit Loss ({option.shrinkagePct.toFixed(2)}%)
                        </dt>
                        <dd className="font-mono tabular-nums text-red-700">
                          − ₹{Math.round(option.shrinkageLossInr).toLocaleString('en-IN')}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Net Realization Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600">
                        Net Farmgate Realization
                      </span>
                      <span
                        className={`font-mono tabular-nums text-xl font-bold ${
                          isOptimal ? 'text-green-800' : 'text-slate-900'
                        }`}
                      >
                        ₹{Math.round(option.netPerQtl).toLocaleString('en-IN')} / qtl
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>Total Net Payout ({lotQtl} qtl)</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        ₹{Math.round(option.netTotalInr).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Dispatch Recommendation Strip */}
          {bestOption && (
            <div className="border-t border-slate-200 bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-slate-200 tracking-[0.01em]">
                Optimal Dispatch Decision:{' '}
                <strong className="font-semibold text-white">{bestOption.name}</strong> yields{' '}
                <span className="font-mono tabular-nums font-semibold text-green-400">
                  ₹{Math.round(bestOption.netPerQtl).toLocaleString('en-IN')}/qtl
                </span>{' '}
                after all transport and market deductions
                {netAdvantageTotal > 0
                  ? ` — adding ₹${netAdvantageTotal.toLocaleString('en-IN')} net earnings on this ${lotQtl} qtl truckload versus local sale.`
                  : ' — local yard sale preserves highest margin by avoiding long-haul freight leakage.'}
              </p>
              <a
                href="#alerts"
                className="text-xs font-semibold text-green-300 hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                Automate Daily Route Alerts
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
