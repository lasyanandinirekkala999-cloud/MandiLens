import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookmarkCheck,
  CheckCircle2,
  Lock,
  RotateCcw,
  Trash2,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  ARBITRAGE_CORRIDORS,
  CandidateMandiOption,
  MandiLotRecord,
} from '../data/mandiData';
import { CloudSavedComparison, useAuth } from '../context/AuthContext';

interface ArbitrageCalculatorProps {
  allRecords: MandiLotRecord[];
  comparedLotIds: string[];
  selectedCorridorId: string;
  externalLotQtl?: number;
  onCorridorChange: (corridorId: string) => void;
  onOpenAuth: () => void;
}

export const ArbitrageCalculator: React.FC<ArbitrageCalculatorProps> = ({
  allRecords,
  comparedLotIds,
  selectedCorridorId,
  externalLotQtl,
  onCorridorChange,
  onOpenAuth,
}) => {
  const {
    user,
    profile,
    savedComparisons,
    saveComparisonScenario,
    lockComparisonScenario,
    deleteComparisonScenario,
    createProcurementOrder,
  } = useAuth();

  const activeCorridor = useMemo(() => {
    return (
      ARBITRAGE_CORRIDORS.find((c) => c.id === selectedCorridorId) ||
      ARBITRAGE_CORRIDORS[0]
    );
  }, [selectedCorridorId]);

  const [compareCount, setCompareCount] = useState<2 | 3>(3);
  const [lotQtl, setLotQtl] = useState<number>(
    externalLotQtl ?? activeCorridor.defaultLotQtl
  );
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

  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [isCreatingDispatch, setIsCreatingDispatch] = useState(false);
  const [statusNote, setStatusNote] = useState<string>('');
  const [busyScenarioId, setBusyScenarioId] = useState<string | null>(null);

  // Sync when corridor preset changes
  useEffect(() => {
    setPackagingPerQtl(activeCorridor.defaultPackagingPerQtl);
    setFreightPerKmQtl(activeCorridor.defaultFreightPerKmQtl);
    setShrinkagePer100Km(activeCorridor.defaultShrinkagePctPer100Km);
    setSlots(activeCorridor.mandis);
  }, [activeCorridor]);

  // Sync when farmer updates quantity in Smart Decision Overview
  useEffect(() => {
    if (typeof externalLotQtl === 'number' && externalLotQtl >= 1) {
      setLotQtl(externalLotQtl);
    }
  }, [externalLotQtl]);

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

  const handleCorridorSelect = (nextCorridorId: string) => {
    onCorridorChange(nextCorridorId);
    const nextCorridor = ARBITRAGE_CORRIDORS.find((c) => c.id === nextCorridorId);
    if (nextCorridor) {
      setLotQtl(nextCorridor.defaultLotQtl);
    }
  };

  const handleReset = () => {
    setCompareCount(3);
    setLotQtl(externalLotQtl ?? activeCorridor.defaultLotQtl);
    setPackagingPerQtl(activeCorridor.defaultPackagingPerQtl);
    setFreightPerKmQtl(activeCorridor.defaultFreightPerKmQtl);
    setShrinkagePer100Km(activeCorridor.defaultShrinkagePctPer100Km);
    setSlots(activeCorridor.mandis);
    setStatusNote('');
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

  const handleLoadSavedScenario = (item: CloudSavedComparison) => {
    setCompareCount(item.compareCount);
    setLotQtl(item.lotQtl);
    setPackagingPerQtl(item.packagingPerQtl);
    setFreightPerKmQtl(item.freightPerKmQtl);
    setShrinkagePer100Km(item.shrinkagePer100Km);
    setSlots([
      {
        id: `loaded-a-${item.id}`,
        name: item.marketAName,
        commodityLabel: item.commodity,
        tierLabel: 'Market A · Saved Scenario',
        distanceKm: item.marketADistanceKm,
        modalPriceQtl: item.marketAPriceQtl,
        mandiFeePct: 1.0,
        hamaliPerQtl: 25,
      },
      {
        id: `loaded-b-${item.id}`,
        name: item.marketBName,
        commodityLabel: item.commodity,
        tierLabel: 'Market B · Saved Scenario',
        distanceKm: item.marketBDistanceKm,
        modalPriceQtl: item.marketBPriceQtl,
        mandiFeePct: 1.0,
        hamaliPerQtl: 26,
      },
      {
        id: `loaded-c-${item.id}`,
        name: item.marketCName,
        commodityLabel: item.commodity,
        tierLabel: 'Market C · Saved Scenario',
        distanceKm: item.marketCDistanceKm,
        modalPriceQtl: item.marketCPriceQtl,
        mandiFeePct: 1.5,
        hamaliPerQtl: 35,
      },
    ]);
    setStatusNote(`Loaded saved scenario: ${item.title}`);
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
  const lowestOption = sortedByNet[sortedByNet.length - 1];

  const advantageOverRunnerUp =
    bestOption && runnerUpOption
      ? Math.max(0, Math.round(bestOption.netTotalInr - runnerUpOption.netTotalInr))
      : 0;

  const advantageOverLowest =
    bestOption && lowestOption
      ? Math.max(0, Math.round(bestOption.netTotalInr - lowestOption.netTotalInr))
      : 0;

  const maxGrossAcrossSlots = useMemo(
    () => Math.max(...evaluations.map((e) => e.grossHeadline), 1),
    [evaluations]
  );

  const handleSaveScenario = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!bestOption || slots.length < 2) return;

    const slotA = slots[0];
    const slotB = slots[1];
    const slotC = slots[2] || slots[1];
    const title = `${activeCorridor.commodity.split('(')[0].trim()} · ${slotA.name} vs ${slotB.name} (${lotQtl} qtl)`;

    setIsSavingScenario(true);
    setStatusNote('');
    try {
      await saveComparisonScenario({
        title,
        commodity: activeCorridor.commodity,
        compareCount,
        lotQtl,
        packagingPerQtl,
        freightPerKmQtl,
        shrinkagePer100Km,
        marketAName: slotA.name,
        marketAPriceQtl: slotA.modalPriceQtl,
        marketADistanceKm: slotA.distanceKm,
        marketBName: slotB.name,
        marketBPriceQtl: slotB.modalPriceQtl,
        marketBDistanceKm: slotB.distanceKm,
        marketCName: slotC.name,
        marketCPriceQtl: slotC.modalPriceQtl,
        marketCDistanceKm: slotC.distanceKm,
        bestMarketName: bestOption.name,
        bestNetPerQtl: bestOption.netPerQtl,
        bestNetTotalInr: bestOption.netTotalInr,
      });
      setStatusNote('Comparison scenario saved to your Firestore account.');
    } catch (err) {
      setStatusNote(err instanceof Error ? err.message : 'Unable to save comparison.');
    } finally {
      setIsSavingScenario(false);
    }
  };

  const handleLogDispatchFromBest = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!bestOption) return;

    setIsCreatingDispatch(true);
    setStatusNote('');
    try {
      await createProcurementOrder({
        organization: profile?.displayName || user.displayName || 'MandiLens Member',
        commodity: activeCorridor.commodity,
        originCluster: activeCorridor.originCluster,
        destinationMandi: bestOption.name,
        quantityQtl: lotQtl,
        expectedNetPerQtl: Math.max(50, Math.round(bestOption.netPerQtl)),
      });
      setStatusNote(`Planned dispatch to ${bestOption.name} added to Supply Chain Ledger.`);
      document
        .getElementById('reports')
        ?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setStatusNote(err instanceof Error ? err.message : 'Unable to log dispatch order.');
    } finally {
      setIsCreatingDispatch(false);
    }
  };

  const handleLockScenario = async (id: string) => {
    setBusyScenarioId(id);
    try {
      await lockComparisonScenario(id);
    } finally {
      setBusyScenarioId(null);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    setBusyScenarioId(id);
    try {
      await deleteComparisonScenario(id);
    } finally {
      setBusyScenarioId(null);
    }
  };

  return (
    <section
      id="comparison-calculator"
      className="py-12 lg:py-16 bg-[#F7F7F2] border-b border-[#E2E4DD] no-print"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header & Mode Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-7">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#15803D] mb-2">
              <span>Interactive Profit Simulator</span>
              <span aria-hidden="true" className="text-[#8A928C]">
                •
              </span>
              <span className="text-[#4A524D] font-medium">
                Road Freight, APMC Cess, Crate Packaging &amp; Transit Shrinkage
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#161A18]">
              Mandi Comparison Calculator
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-[#4A524D] max-w-2xl">
              Compare 2 or 3 wholesale markets side-by-side to uncover true farmgate take-home
              payout. Load live yards from the Searchable Price Dashboard or customize every rupee
              of transport and fee deductions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
            <div
              role="group"
              aria-label="Number of markets to compare"
              className="inline-flex items-center gap-1 p-1 bg-[#EFEFE8] rounded-xl"
            >
              <button
                type="button"
                onClick={() => setCompareCount(2)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  compareCount === 2
                    ? 'bg-[#0F2F1E] text-white'
                    : 'text-[#4A524D] hover:text-[#161A18]'
                }`}
              >
                Compare 2 Markets
              </button>
              <button
                type="button"
                onClick={() => setCompareCount(3)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  compareCount === 3
                    ? 'bg-[#0F2F1E] text-white'
                    : 'text-[#4A524D] hover:text-[#161A18]'
                }`}
              >
                Compare 3 Markets
              </button>
            </div>

            <button
              type="button"
              disabled={isSavingScenario}
              onClick={handleSaveScenario}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>{isSavingScenario ? 'Saving...' : 'Save Scenario'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#161A18] bg-white border border-[#D5D9D2] rounded-xl hover:bg-[#EFEFE8] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {statusNote && (
          <p className="mb-4 text-xs font-semibold text-[#15803D]" role="status">
            {statusNote}
          </p>
        )}

        {/* Single-Elevation Calculator Surface */}
        <div className="bg-white border border-[#E2E4DD] rounded-2xl overflow-hidden">
          {/* Band 1: Shared Lot & Logistics Assumptions */}
          <div className="p-5 sm:p-6 bg-[#FAFBF8] border-b border-[#E2E4DD]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-4">
                <label
                  htmlFor="corridor-select"
                  className="block text-xs font-semibold text-[#4A524D] mb-1.5"
                >
                  Supply Chain Corridor Preset
                </label>
                <select
                  id="corridor-select"
                  value={activeCorridor.id}
                  onChange={(e) => handleCorridorSelect(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-semibold bg-white border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:border-[#0F2F1E]"
                >
                  {ARBITRAGE_CORRIDORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#4A524D]">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <Truck className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                    <span className="truncate">{vehicleGuidance}</span>
                  </span>
                  <a
                    href="#price-dashboard"
                    className="inline-flex items-center gap-0.5 font-semibold text-[#0F2F1E] hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>Pick Yards</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="lot-qtl-input"
                    className="text-xs font-semibold text-[#4A524D]"
                  >
                    Harvest Quantity (Qtl)
                  </label>
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#161A18]">
                    {(lotQtl / 10).toFixed(1)} Tonnes
                  </span>
                </div>
                <input
                  id="lot-qtl-input"
                  type="number"
                  min={1}
                  max={500}
                  value={lotQtl}
                  onChange={(e) => setLotQtl(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums font-semibold bg-white border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:border-[#0F2F1E]"
                />
                <input
                  type="range"
                  min={5}
                  max={220}
                  step={5}
                  value={Math.min(220, lotQtl)}
                  onChange={(e) => setLotQtl(Number(e.target.value))}
                  aria-label="Adjust harvest quantity slider"
                  className="w-full mt-2 accent-[#0F2F1E] cursor-pointer"
                />
              </div>

              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="freight-rate"
                    className="text-xs font-semibold text-[#4A524D]"
                  >
                    Road Freight Rate
                  </label>
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#161A18]">
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
                  className="w-full mt-1 accent-[#0F2F1E] cursor-pointer"
                />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <label htmlFor="pack-cost" className="text-xs text-[#4A524D]">
                    Crate / Bagging (₹/qtl)
                  </label>
                  <input
                    id="pack-cost"
                    type="number"
                    min={0}
                    max={500}
                    value={packagingPerQtl}
                    onChange={(e) =>
                      setPackagingPerQtl(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-20 px-2.5 py-1 text-xs font-mono tabular-nums font-semibold bg-white border border-[#D5D9D2] rounded-lg text-right text-[#161A18] focus:outline-none focus:border-[#0F2F1E]"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="shrinkage-rate"
                    className="text-xs font-semibold text-[#4A524D]"
                  >
                    Transit Shrinkage
                  </label>
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#161A18]">
                    {shrinkagePer100Km.toFixed(2)}%
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
                  className="w-full mt-1 accent-[#0F2F1E] cursor-pointer"
                />
                <p className="mt-2.5 text-xs text-[#6E7771]">
                  Weight loss per 100 km haul
                </p>
              </div>
            </div>
          </div>

          {/* Band 2: Visual Net Profit vs. Supply Chain Deductions Bar Comparison + Extra Earnings Opportunity */}
          {bestOption && (
            <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#E2E4DD]">
              <div className="lg:col-span-8 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                  <h3 className="font-display text-sm font-bold text-[#161A18]">
                    Net Payout vs. Supply Chain Deductions ({lotQtl} Quintals)
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-[#4A524D]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]" aria-hidden="true" />
                      <span>Net Farmgate Profit</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]/75" aria-hidden="true" />
                      <span>Freight, Cess &amp; Shrinkage</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {evaluations.map((item) => {
                    const isOptimal = bestOption.id === item.id;
                    const netWidth = Math.max(
                      0,
                      Math.min(100, (Math.max(0, item.netTotalInr) / maxGrossAcrossSlots) * 100)
                    );
                    const deductionWidth = Math.max(
                      0,
                      Math.min(
                        100 - netWidth,
                        (Math.max(0, item.totalSupplyChainDeductions) / maxGrossAcrossSlots) * 100
                      )
                    );

                    return (
                      <div key={`bar-${item.id}`} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="font-semibold text-[#161A18] truncate">
                            {item.name}
                            {isOptimal ? (
                              <span className="ml-2 text-[#15803D] font-semibold">
                                · Best Market
                              </span>
                            ) : null}
                          </span>
                          <span className="font-mono tabular-nums text-[#4A524D] whitespace-nowrap shrink-0">
                            Net{' '}
                            <strong
                              className={
                                isOptimal ? 'text-[#15803D]' : 'text-[#161A18]'
                              }
                            >
                              ₹{Math.round(item.netTotalInr).toLocaleString('en-IN')}
                            </strong>{' '}
                            · Deductions{' '}
                            <span className="text-[#DC2626]">
                              −₹{Math.round(item.totalSupplyChainDeductions).toLocaleString('en-IN')}
                            </span>
                          </span>
                        </div>
                        <svg
                          viewBox="0 0 100 4"
                          preserveAspectRatio="none"
                          className="w-full h-2.5 rounded-sm overflow-hidden bg-[#EFEFE8] block"
                          role="img"
                          aria-label={`${item.name} net payout ₹${Math.round(item.netTotalInr)} and deductions ₹${Math.round(item.totalSupplyChainDeductions)}`}
                        >
                          <rect
                            x={0}
                            y={0}
                            width={netWidth}
                            height={4}
                            fill={isOptimal ? '#16A34A' : '#0F2F1E'}
                          />
                          <rect
                            x={netWidth}
                            y={0}
                            width={deductionWidth}
                            height={4}
                            fill="#DC2626"
                            fillOpacity={0.72}
                          />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Standout Amber Extra-Earnings Opportunity Panel */}
              <div className="lg:col-span-4 p-5 sm:p-6 bg-[#FEF7E6] border-t lg:border-t-0 lg:border-l border-[#F3D999] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#92400E]">
                    <span>Smart Arbitrage Gain</span>
                    <TrendingUp className="w-4 h-4 text-[#D97706] shrink-0" />
                  </div>
                  <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#92400E]">
                    +₹{advantageOverLowest.toLocaleString('en-IN')}
                  </p>
                  <p className="mt-1 text-xs text-[#78350F] leading-relaxed">
                    Potential extra earnings by selling at{' '}
                    <strong className="font-semibold text-[#161A18]">
                      {bestOption.name}
                    </strong>{' '}
                    instead of {lowestOption?.name || 'the lowest-paying yard'} after all transport
                    and mandi charges.
                  </p>
                </div>

                {runnerUpOption && (
                  <div className="mt-4 pt-3 border-t border-[#F3D999] flex items-center justify-between text-xs text-[#78350F]">
                    <span>Lead vs. Runner-Up ({runnerUpOption.name.split(' ')[0]})</span>
                    <span className="font-mono tabular-nums font-bold text-[#92400E]">
                      +₹{advantageOverRunnerUp.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Band 3: Side-by-Side Mandi Comparison Matrix */}
          <div
            className={`grid grid-cols-1 ${
              compareCount === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
            } divide-y lg:divide-y-0 lg:divide-x divide-[#E2E4DD] bg-white`}
          >
            {evaluations.map((option, idx) => {
              const isOptimal = bestOption?.id === option.id;
              const deltaVsBest = bestOption
                ? Math.round(option.netTotalInr - bestOption.netTotalInr)
                : 0;
              const shareWidth = Math.max(0, Math.min(100, option.farmerSharePct));

              return (
                <div
                  key={option.id}
                  className={`p-6 flex flex-col justify-between ${
                    isOptimal ? 'bg-[#F2F9F4]' : 'bg-white'
                  }`}
                >
                  <div>
                    {/* Slot Metadata Header (Unboxed Typography — Zero Pill Discipline) */}
                    <div className="flex items-center justify-between gap-2 text-xs text-[#4A524D] mb-2.5">
                      <span className="truncate">{option.tierLabel}</span>
                      {isOptimal ? (
                        <span className="font-semibold text-[#15803D] whitespace-nowrap shrink-0">
                          Best Net Profit
                        </span>
                      ) : (
                        <span className="text-[#6E7771] whitespace-nowrap shrink-0">
                          Option {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Load from Live Searchable Price Dashboard Dropdown */}
                    <div className="mb-3.5">
                      <label className="sr-only" htmlFor={`slot-select-${idx}`}>
                        Select live market from Price Dashboard for slot {idx + 1}
                      </label>
                      <select
                        id={`slot-select-${idx}`}
                        value=""
                        onChange={(e) =>
                          handleSelectDashboardMarketForSlot(idx, e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs font-medium bg-white border border-[#D5D9D2] rounded-xl text-[#161A18] hover:border-[#0F2F1E] focus:outline-none focus:border-[#0F2F1E]"
                      >
                        <option value="">
                          Load live yard from Price Dashboard ({allRecords.length} markets)...
                        </option>
                        {allRecords.map((rec) => (
                          <option key={rec.id} value={rec.id}>
                            {rec.mandi} — {rec.commodity} (₹{rec.modalPrice}/qtl ·{' '}
                            {rec.defaultDistanceKm} km)
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
                      className="w-full font-display text-lg font-bold text-[#161A18] bg-transparent border-b border-transparent hover:border-[#D5D9D2] focus:border-[#0F2F1E] focus:outline-none pb-0.5"
                    />
                    <p className="text-xs text-[#4A524D] mt-0.5">{option.commodityLabel}</p>

                    {/* Editable Price, Distance, Cess & Hamali */}
                    <div className="mt-4 grid grid-cols-2 gap-3 pb-4 border-b border-[#E2E4DD]">
                      <div>
                        <label
                          htmlFor={`modal-price-${idx}`}
                          className="block text-[11px] font-semibold text-[#4A524D] mb-1"
                        >
                          Modal Price (₹/qtl)
                        </label>
                        <input
                          id={`modal-price-${idx}`}
                          type="number"
                          min={100}
                          max={50000}
                          value={option.modalPriceQtl}
                          onChange={(e) =>
                            updateSlotField(idx, 'modalPriceQtl', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums font-semibold bg-white border border-[#D5D9D2] rounded-lg text-[#161A18] focus:outline-none focus:border-[#0F2F1E]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`distance-km-${idx}`}
                          className="block text-[11px] font-semibold text-[#4A524D] mb-1"
                        >
                          Distance (km)
                        </label>
                        <input
                          id={`distance-km-${idx}`}
                          type="number"
                          min={0}
                          max={2500}
                          value={option.distanceKm}
                          onChange={(e) =>
                            updateSlotField(idx, 'distanceKm', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums font-semibold bg-white border border-[#D5D9D2] rounded-lg text-[#161A18] focus:outline-none focus:border-[#0F2F1E]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`mandi-cess-${idx}`}
                          className="block text-[11px] font-semibold text-[#4A524D] mb-1"
                        >
                          Mandi Cess (%)
                        </label>
                        <input
                          id={`mandi-cess-${idx}`}
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={option.mandiFeePct}
                          onChange={(e) =>
                            updateSlotField(idx, 'mandiFeePct', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-medium bg-white border border-[#D5D9D2] rounded-lg text-[#161A18] focus:outline-none focus:border-[#0F2F1E]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`hamali-fee-${idx}`}
                          className="block text-[11px] font-semibold text-[#4A524D] mb-1"
                        >
                          Hamali / Unload (₹/qtl)
                        </label>
                        <input
                          id={`hamali-fee-${idx}`}
                          type="number"
                          min={0}
                          max={300}
                          value={option.hamaliPerQtl}
                          onChange={(e) =>
                            updateSlotField(idx, 'hamaliPerQtl', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-medium bg-white border border-[#D5D9D2] rounded-lg text-[#161A18] focus:outline-none focus:border-[#0F2F1E]"
                        />
                      </div>
                    </div>

                    {/* Line-Item Deductions Waterfall */}
                    <dl className="mt-4 space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="text-[#4A524D]">Gross Revenue ({lotQtl} qtl)</dt>
                        <dd className="font-mono tabular-nums font-semibold text-[#161A18]">
                          ₹{Math.round(option.grossHeadline).toLocaleString('en-IN')}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-[#4A524D]">
                          Road Freight ({option.distanceKm} km)
                        </dt>
                        <dd className="font-mono tabular-nums text-[#DC2626]">
                          − ₹{Math.round(option.freightCost).toLocaleString('en-IN')}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-[#4A524D]">
                          Cess ({option.mandiFeePct}%) &amp; Hamali
                        </dt>
                        <dd className="font-mono tabular-nums text-[#DC2626]">
                          − ₹{Math.round(option.mandiAndHamaliInr).toLocaleString('en-IN')}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-[#4A524D]">
                          Packaging &amp; Shrinkage ({option.shrinkagePct.toFixed(1)}%)
                        </dt>
                        <dd className="font-mono tabular-nums text-[#DC2626]">
                          − ₹
                          {Math.round(
                            option.packagingInr + option.shrinkageLossInr
                          ).toLocaleString('en-IN')}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Net Realization & Farmer Share Composition Bar */}
                  <div className="mt-6 pt-4 border-t border-[#E2E4DD]">
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] text-[#4A524D] mb-1">
                        <span>
                          Farmer Take-Home:{' '}
                          <strong className="font-mono tabular-nums text-[#161A18]">
                            {option.farmerSharePct.toFixed(1)}%
                          </strong>
                        </span>
                        <span className="font-mono tabular-nums">
                          Costs: {(100 - option.farmerSharePct).toFixed(1)}%
                        </span>
                      </div>
                      <svg
                        viewBox="0 0 100 3"
                        preserveAspectRatio="none"
                        className="h-2 w-full bg-[#E2E4DD] rounded-xs overflow-hidden block"
                        aria-hidden="true"
                      >
                        <rect
                          x={0}
                          y={0}
                          width={shareWidth}
                          height={3}
                          fill={isOptimal ? '#16A34A' : '#4A524D'}
                        />
                      </svg>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-[#4A524D]">
                        Net Realization / qtl
                      </span>
                      <span
                        className={`font-mono tabular-nums text-xl font-bold ${
                          isOptimal ? 'text-[#15803D]' : 'text-[#161A18]'
                        }`}
                      >
                        ₹{Math.round(option.netPerQtl).toLocaleString('en-IN')} / qtl
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-xs text-[#4A524D]">
                      <span>Estimated Net Profit ({lotQtl} qtl)</span>
                      <span className="font-mono tabular-nums font-bold text-[#161A18]">
                        ₹{Math.round(option.netTotalInr).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#E2E4DD]/80 flex items-center justify-between text-xs">
                      <span className="text-[#6E7771]">Spread vs. Best Market</span>
                      {isOptimal ? (
                        <span className="font-semibold text-[#15803D]">
                          Highest Net Payout
                        </span>
                      ) : (
                        <span className="font-mono tabular-nums font-semibold text-[#DC2626]">
                          −₹{Math.abs(deltaVsBest).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Band 4: Deep Forest Green Smart Verdict & Dispatch Strip */}
          {bestOption && (
            <div className="border-t border-[#E2E4DD] bg-[#0F2F1E] text-white px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-[#E2E8E4] tracking-[0.01em]">
                Smart Selling Verdict:{' '}
                <strong className="font-semibold text-white">{bestOption.name}</strong> delivers
                the highest net farmgate payout at{' '}
                <span className="font-mono tabular-nums font-semibold text-[#4ADE80]">
                  ₹{Math.round(bestOption.netPerQtl).toLocaleString('en-IN')}/qtl
                </span>{' '}
                (Net Profit{' '}
                <span className="font-mono tabular-nums font-semibold text-white">
                  ₹{Math.round(bestOption.netTotalInr).toLocaleString('en-IN')}
                </span>
                )
                {runnerUpOption && advantageOverRunnerUp > 0
                  ? ` — earning +₹${advantageOverRunnerUp.toLocaleString('en-IN')} more than ${runnerUpOption.name} on ${lotQtl} quintals.`
                  : '.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 shrink-0">
                <button
                  type="button"
                  disabled={isCreatingDispatch}
                  onClick={handleLogDispatchFromBest}
                  className="px-4 py-2 text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  {isCreatingDispatch
                    ? 'Logging Dispatch...'
                    : `Dispatch Lot to ${bestOption.name}`}
                </button>
                <a
                  href="#alerts"
                  className="text-xs font-semibold text-[#86EFAC] hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0"
                >
                  Subscribe to Route Alerts
                </a>
              </div>
            </div>
          )}

          {/* Band 5: Saved Firestore Comparison Scenarios Sub-Table */}
          {user && savedComparisons.length > 0 && (
            <div className="border-t border-[#E2E4DD] bg-[#FAFBF8]">
              <div className="px-6 py-3.5 border-b border-[#E2E4DD] flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-[#161A18]">
                    Saved Comparison Scenarios ({savedComparisons.length})
                  </h3>
                  <p className="text-xs text-[#4A524D]">
                    Synced to Firestore{' '}
                    <span className="font-mono">/users/&#123;uid&#125;/savedComparisons</span>{' '}
                    with immutable decision locking
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E4DD] text-xs font-semibold text-[#4A524D]">
                      <th className="py-2.5 pl-6 pr-3 whitespace-nowrap">Scenario</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Lot Volume</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Best Market</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Best Net Payout</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Record State</th>
                      <th className="py-2.5 pl-3 pr-6 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E4DD] text-xs sm:text-sm bg-white">
                    {savedComparisons.map((item) => {
                      const isBusy = busyScenarioId === item.id;
                      const isLocked = item.status === 'locked';

                      return (
                        <tr key={item.id} className="hover:bg-[#FAFBF8] transition-colors">
                          <td className="py-3 pl-6 pr-3 font-medium text-[#161A18]">
                            {item.title}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-[#4A524D] whitespace-nowrap">
                            {item.lotQtl} qtl
                          </td>
                          <td className="py-3 px-3 font-medium text-[#161A18] whitespace-nowrap">
                            {item.bestMarketName}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#15803D] whitespace-nowrap">
                            ₹{item.bestNetPerQtl.toLocaleString('en-IN')}/qtl · ₹
                            {item.bestNetTotalInr.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Decision Locked</span>
                              </span>
                            ) : (
                              <span className="text-xs text-[#6E7771]">Active Draft</span>
                            )}
                          </td>
                          <td className="py-3 pl-3 pr-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleLoadSavedScenario(item)}
                                className="px-2.5 py-1 text-xs font-semibold text-[#161A18] bg-[#EFEFE8] rounded-lg hover:bg-[#E2E4DD] transition-colors whitespace-nowrap"
                              >
                                Load
                              </button>
                              {!isLocked ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleLockScenario(item.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#161A18] bg-white border border-[#D5D9D2] rounded-lg hover:bg-[#EFEFE8] disabled:opacity-50 transition-colors whitespace-nowrap"
                                  >
                                    <Lock className="w-3 h-3" />
                                    <span>Lock</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleDeleteScenario(item.id)}
                                    aria-label={`Delete saved scenario ${item.title}`}
                                    className="p-1 text-[#6E7771] hover:text-[#DC2626] rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-[#8A928C]">Immutable</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
