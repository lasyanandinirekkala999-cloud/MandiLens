import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Truck } from 'lucide-react';
import {
  ARBITRAGE_CORRIDORS,
  CandidateMandiOption,
  MandiLotRecord,
} from '../data/mandiData';

interface ArbitrageCalculatorProps {
  allRecords: MandiLotRecord[];
  comparedLotIds: string[];
  selectedCorridorId: string;
  onCorridorChange: (corridorId: string) => void;
}

export const ArbitrageCalculator: React.FC<ArbitrageCalculatorProps> = ({
  allRecords,
  comparedLotIds,
  selectedCorridorId,
  onCorridorChange,
}) => {
  const activeCorridor = useMemo(() => {
    return (
      ARBITRAGE_CORRIDORS.find((c) => c.id === selectedCorridorId) ||
      ARBITRAGE_CORRIDORS[0]
    );
  }, [selectedCorridorId]);

  const [compareCount, setCompareCount] = useState<2 | 3>(3);
  const [lotQtl, setLotQtl] = useState<number>(activeCorridor.defaultLotQtl);
  const [packagingPerQtl, setPackagingPerQtl] = useState<number>(
    activeCorridor.defaultPackagingPerQtl
  );
  const [freightPerKmQtl, setFreightPerKmQtl] = useState<number>(
    activeCorridor.defaultFreightPerKmQtl
  );
  const [shrinkagePer100Km, setShrinkagePer100Km] = useState<number>(
    activeCorridor.defaultShrinkagePctPer100Km
  );
  const [slots, setSlots] = useState<CandidateMandiOption[]>(activeCorridor.mandis);

  // Sync when corridor preset changes
  useEffect(() => {
    setLotQtl(activeCorridor.defaultLotQtl);
    setPackagingPerQtl(activeCorridor.defaultPackagingPerQtl);
    setFreightPerKmQtl(activeCorridor.defaultFreightPerKmQtl);
    setShrinkagePer100Km(activeCorridor.defaultShrinkagePctPer100Km);
    setSlots(activeCorridor.mandis);
  }, [activeCorridor]);

  // Sync when user selects markets via "Compare" buttons in the Searchable Price Dashboard
  useEffect(() => {
    if (comparedLotIds.length >= 2) {
      const matched = comparedLotIds
        .map((id) => allRecords.find((r) => r.id === id))
        .filter((r): r is MandiLotRecord => Boolean(r));

      if (matched.length >= 2) {
        setCompareCount(matched.length === 2 ? 2 : 3);
        setSlots((prev) => {
          const updated = [...prev];
          matched.slice(0, 3).forEach((rec, idx) => {
            updated[idx] = {
              id: `slot-${idx}-${rec.id}`,
              name: rec.mandi,
              commodityLabel: `${rec.commodity} (${rec.grade})`,
              tierLabel: `Market ${String.fromCharCode(65 + idx)} · ${rec.district}, ${rec.state}`,
              distanceKm: rec.defaultDistanceKm,
              modalPriceQtl: rec.modalPrice,
              mandiFeePct: rec.mandiFeePct,
              hamaliPerQtl: rec.hamaliPerQtl,
            };
          });
          return updated;
        });
      }
    }
  }, [comparedLotIds, allRecords]);

  const handleReset = () => {
    setCompareCount(3);
    setLotQtl(activeCorridor.defaultLotQtl);
    setPackagingPerQtl(activeCorridor.defaultPackagingPerQtl);
    setFreightPerKmQtl(activeCorridor.defaultFreightPerKmQtl);
    setShrinkagePer100Km(activeCorridor.defaultShrinkagePctPer100Km);
    setSlots(activeCorridor.mandis);
  };

  const handleSelectDashboardMarketForSlot = (slotIdx: number, recordId: string) => {
    if (!recordId) return;
    const found = allRecords.find((r) => r.id === recordId);
    if (!found) return;
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === slotIdx
          ? {
              ...slot,
              name: found.mandi,
              commodityLabel: `${found.commodity} (${found.grade})`,
              tierLabel: `Market ${String.fromCharCode(65 + idx)} · ${found.district}, ${found.state}`,
              distanceKm: found.defaultDistanceKm,
              modalPriceQtl: found.modalPrice,
              mandiFeePct: found.mandiFeePct,
              hamaliPerQtl: found.hamaliPerQtl,
            }
          : slot
      )
    );
  };

  const updateSlotField = (
    slotIdx: number,
    field: 'name' | 'distanceKm' | 'modalPriceQtl' | 'mandiFeePct' | 'hamaliPerQtl',
    value: string | number
  ) => {
    setSlots((prev) =>
      prev.map((slot, idx) => {
        if (idx !== slotIdx) return slot;
        if (field === 'name') {
          return { ...slot, name: String(value) };
        }
        return { ...slot, [field]: Math.max(0, Number(value) || 0) };
      })
    );
  };

  const vehicleGuidance = useMemo(() => {
    if (lotQtl <= 20) return '1.5T Mini Pickup (Bolero / Ace)';
    if (lotQtl <= 50) return '3.5T Light Commercial Vehicle (Eicher / 407)';
    if (lotQtl <= 110) return '9T 6-Tyre Standard Mandi Truck';
    return '16T Multi-Axle Line-Haul Carrier';
  }, [lotQtl]);

  const visibleSlots = useMemo(
    () => slots.slice(0, compareCount),
    [slots, compareCount]
  );

  const evaluations = useMemo(() => {
    return visibleSlots.map((m) => {
      const safeLot = Math.max(1, lotQtl);
      const grossHeadline = safeLot * m.modalPriceQtl;
      const shrinkagePct = (m.distanceKm / 100) * shrinkagePer100Km;
      const salableWeightQtl = safeLot * Math.max(0, 1 - shrinkagePct / 100);
      const realizedAuctionGross = salableWeightQtl * m.modalPriceQtl;
      const shrinkageLossInr = (safeLot - salableWeightQtl) * m.modalPriceQtl;
      const freightCost = m.distanceKm * freightPerKmQtl * safeLot;
      const mandiFeeInr = realizedAuctionGross * (m.mandiFeePct / 100);
      const hamaliInr = m.hamaliPerQtl * safeLot;
      const packagingInr = packagingPerQtl * safeLot;
      const totalSupplyChainDeductions =
        freightCost + mandiFeeInr + hamaliInr + packagingInr + shrinkageLossInr;
      const netTotalInr = grossHeadline - totalSupplyChainDeductions;
      const netPerQtl = netTotalInr / safeLot;
      const farmerSharePct =
        grossHeadline > 0
          ? Math.max(0, Math.min(100, (netTotalInr / grossHeadline) * 100))
          : 0;

      return {
        ...m,
        shrinkagePct,
        shrinkageLossInr,
        freightCost,
        mandiAndHamaliInr: mandiFeeInr + hamaliInr,
        packagingInr,
        totalSupplyChainDeductions,
        grossHeadline,
        netTotalInr,
        netPerQtl,
        farmerSharePct,
      };
    });
  }, [visibleSlots, lotQtl, packagingPerQtl, freightPerKmQtl, shrinkagePer100Km]);

  const sortedByNet = useMemo(
    () => [...evaluations].sort((a, b) => b.netTotalInr - a.netTotalInr),
    [evaluations]
  );

  const bestOption = sortedByNet[0];
  const runnerUpOption = sortedByNet[1];
  const advantageOverRunnerUp =
    bestOption && runnerUpOption
      ? Math.round(bestOption.netTotalInr - runnerUpOption.netTotalInr)
      : 0;

  return (
    <section
      id="comparison-calculator"
      className="py-12 lg:py-16 bg-white border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Header & Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
              <span>Interactive Net Profit Simulator</span>
              <span aria-hidden="true">·</span>
              <span>Freight, Cess, Packaging &amp; Shrinkage Adjusted</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Mandi Price &amp; Supply Chain Comparison Calculator
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl">
              Compare any 2 or 3 wholesale markets side-by-side. Load live mandis from the
              dashboard above or enter custom rates, distances, and market commissions to see
              which yard delivers the highest net farmgate payout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
            <div
              role="group"
              aria-label="Number of markets to compare"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              <button
                type="button"
                onClick={() => setCompareCount(2)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  compareCount === 2
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compare 2 Markets
              </button>
              <button
                type="button"
                onClick={() => setCompareCount(3)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  compareCount === 3
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compare 3 Markets
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Shared Lot & Supply Chain Inputs */}
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2">
              <label
                htmlFor="corridor-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Quick Supply Chain Corridor Preset
              </label>
              <select
                id="corridor-select"
                value={activeCorridor.id}
                onChange={(e) => onCorridorChange(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-green-800"
              >
                {ARBITRAGE_CORRIDORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Suggested Fleet: {vehicleGuidance}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="lot-qtl-input" className="text-xs font-semibold text-slate-700">
                  Lot Quantity (qtl)
                </label>
                <span className="font-mono tabular-nums text-xs text-slate-500">
                  {(lotQtl / 10).toFixed(1)} MT
                </span>
              </div>
              <input
                id="lot-qtl-input"
                type="number"
                min={5}
                max={500}
                value={lotQtl}
                onChange={(e) => setLotQtl(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-green-800"
              />
              <input
                type="range"
                min={10}
                max={220}
                step={5}
                value={Math.min(220, lotQtl)}
                onChange={(e) => setLotQtl(Number(e.target.value))}
                aria-label="Adjust lot quantity slider"
                className="w-full mt-2 accent-green-800 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="freight-rate" className="text-xs font-semibold text-slate-700">
                  Freight Rate
                </label>
                <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                  ₹{freightPerKmQtl.toFixed(2)}/km/qtl
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
                className="w-full mt-1 accent-green-800 cursor-pointer"
              />
              <div className="mt-2 flex items-center justify-between">
                <label htmlFor="pack-cost" className="text-[11px] text-slate-600">
                  Bagging/Crate (₹/qtl):
                </label>
                <input
                  id="pack-cost"
                  type="number"
                  min={0}
                  max={500}
                  value={packagingPerQtl}
                  onChange={(e) => setPackagingPerQtl(Math.max(0, Number(e.target.value) || 0))}
                  className="w-16 px-2 py-0.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded text-right"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="shrinkage-rate" className="text-xs font-semibold text-slate-700">
                  Transit Shrinkage
                </label>
                <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                  {shrinkagePer100Km.toFixed(2)}% / 100km
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
                className="w-full mt-1 accent-green-800 cursor-pointer"
              />
              <p className="mt-2 text-[11px] text-slate-500">
                Moisture &amp; handling weight loss in transit
              </p>
            </div>
          </div>
        </div>

        {/* Side-by-Side Mandi Comparison Matrix */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div
            className={`grid grid-cols-1 ${
              compareCount === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
            } divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white`}
          >
            {evaluations.map((option, idx) => {
              const isOptimal = bestOption?.id === option.id;

              return (
                <div
                  key={option.id}
                  className={`p-6 flex flex-col justify-between ${
                    isOptimal ? 'bg-green-50/40' : 'bg-white'
                  }`}
                >
                  <div>
                    {/* Slot Header */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                      <span>{option.tierLabel}</span>
                      {isOptimal ? (
                        <span className="font-semibold text-green-800">
                          Best Net Farmgate Payout
                        </span>
                      ) : (
                        <span>Comparison Option</span>
                      )}
                    </div>

                    {/* Load from Live Dashboard Dropdown */}
                    <div className="mb-3">
                      <label className="sr-only">
                        Select live market from dashboard for slot {idx + 1}
                      </label>
                      <select
                        value=""
                        onChange={(e) =>
                          handleSelectDashboardMarketForSlot(idx, e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-600 hover:border-slate-300 focus:outline-none focus:border-green-800"
                      >
                        <option value="">
                          Switch market from Price Dashboard ({allRecords.length} yards)...
                        </option>
                        {allRecords.map((rec) => (
                          <option key={rec.id} value={rec.id}>
                            {rec.mandi} — {rec.commodity} (₹{rec.modalPrice}/qtl)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Editable Market Name */}
                    <input
                      type="text"
                      value={option.name}
                      onChange={(e) => updateSlotField(idx, 'name', e.target.value)}
                      aria-label={`Market ${idx + 1} name`}
                      className="w-full font-display text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-green-800 focus:outline-none pb-0.5"
                    />
                    <p className="text-xs text-slate-500 mt-0.5">{option.commodityLabel}</p>

                    {/* Editable Price, Distance, Cess & Hamali */}
                    <div className="mt-4 grid grid-cols-2 gap-3 pb-4 border-b border-slate-200">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Modal Price (₹/qtl)
                        </label>
                        <input
                          type="number"
                          min={100}
                          max={50000}
                          value={option.modalPriceQtl}
                          onChange={(e) =>
                            updateSlotField(idx, 'modalPriceQtl', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-green-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Distance (km)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={2500}
                          value={option.distanceKm}
                          onChange={(e) =>
                            updateSlotField(idx, 'distanceKm', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-green-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Mandi Cess (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={option.mandiFeePct}
                          onChange={(e) =>
                            updateSlotField(idx, 'mandiFeePct', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-green-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Hamali / Unload (₹/qtl)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={300}
                          value={option.hamaliPerQtl}
                          onChange={(e) =>
                            updateSlotField(idx, 'hamaliPerQtl', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-green-800"
                        />
                      </div>
                    </div>

                    {/* Line-Item Deductions */}
                    <dl className="mt-4 space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-600">Gross Lot Value ({lotQtl} qtl)</dt>
                        <dd className="font-mono tabular-nums font-medium text-slate-900">
                          ₹{Math.round(option.grossHeadline).toLocaleString('en-IN')}
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
                          Cess ({option.mandiFeePct}%) &amp; Hamali
                        </dt>
                        <dd className="font-mono tabular-nums text-red-700">
                          − ₹{Math.round(option.mandiAndHamaliInr).toLocaleString('en-IN')}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-600">
                          Grading &amp; Shrinkage ({option.shrinkagePct.toFixed(1)}%)
                        </dt>
                        <dd className="font-mono tabular-nums text-red-700">
                          − ₹
                          {Math.round(
                            option.packagingInr + option.shrinkageLossInr
                          ).toLocaleString('en-IN')}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Net Realization & Farmer Share Composition Bar */}
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span>
                          Farmer Net Share:{' '}
                          <strong className="font-mono tabular-nums text-slate-800">
                            {option.farmerSharePct.toFixed(1)}%
                          </strong>
                        </span>
                        <span className="font-mono tabular-nums">
                          Deductions: {(100 - option.farmerSharePct).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-sm overflow-hidden flex">
                        <div
                          style={{ width: `${option.farmerSharePct}%` }}
                          className={isOptimal ? 'bg-green-700' : 'bg-slate-600'}
                        />
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600">
                        Net Realization / qtl
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
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
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
                Comparison Verdict:{' '}
                <strong className="font-semibold text-white">{bestOption.name}</strong> delivers
                the highest net payout at{' '}
                <span className="font-mono tabular-nums font-semibold text-green-400">
                  ₹{Math.round(bestOption.netPerQtl).toLocaleString('en-IN')}/qtl
                </span>{' '}
                (Total{' '}
                <span className="font-mono tabular-nums font-semibold text-white">
                  ₹{Math.round(bestOption.netTotalInr).toLocaleString('en-IN')}
                </span>
                )
                {runnerUpOption && advantageOverRunnerUp > 0
                  ? ` — earning +₹${advantageOverRunnerUp.toLocaleString('en-IN')} more than ${runnerUpOption.name} on this ${lotQtl} qtl lot.`
                  : '.'}
              </p>
              <a
                href="#alerts"
                className="text-xs font-semibold text-green-300 hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                Subscribe to Route Alerts
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
