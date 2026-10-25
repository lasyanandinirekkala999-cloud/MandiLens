import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  Bookmark,
  Check,
  Download,
  Plus,
  Scale,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CropCategory, MandiLotRecord } from '../data/mandiData';
import { useAuth } from '../context/AuthContext';

interface MandiBoardProps {
  records: MandiLotRecord[];
  externalSearchQuery: string;
  savedIds: string[];
  comparedIds: string[];
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
  onJumpToCompare: () => void;
  onAddFieldQuote: (newRecord: MandiLotRecord) => void;
  onSelectCorridor: (corridorId: string) => void;
  onOpenAuth: () => void;
}

type SortField = 'modalPrice' | 'change24hPct' | 'arrivalsQtl';
type PriceUnit = 'qtl' | 'kg' | 'tonne';
type TrendFilter = 'all' | 'rising' | 'softening';

const CATEGORIES: Array<'All' | CropCategory> = [
  'All',
  'Cereals & Pulses',
  'Vegetables',
  'Oilseeds & Spices',
];

export const MandiBoard: React.FC<MandiBoardProps> = ({
  records,
  externalSearchQuery,
  savedIds,
  comparedIds,
  onToggleSave,
  onToggleCompare,
  onClearCompare,
  onJumpToCompare,
  onAddFieldQuote,
  onSelectCorridor,
  onOpenAuth,
}) => {
  const { user, addCloudFieldQuote } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | CropCategory>('All');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('qtl');
  const [savedOnly, setSavedOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('modalPrice');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string>(records[0]?.id ?? '');
  const [activeChartIdx, setActiveChartIdx] = useState<number>(6);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Sync external search query from Hero quick search
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Inline Field Quote Form State
  const [quoteCommodity, setQuoteCommodity] = useState('Onion');
  const [quoteVariety, setQuoteVariety] = useState('Red Graded FAQ');
  const [quoteCategory, setQuoteCategory] = useState<CropCategory>('Vegetables');
  const [quoteMandi, setQuoteMandi] = useState('');
  const [quoteDistrict, setQuoteDistrict] = useState('');
  const [quoteState, setQuoteState] = useState('Maharashtra');
  const [quoteModal, setQuoteModal] = useState('2340');
  const [quoteArrivals, setQuoteArrivals] = useState('8400');
  const [quoteError, setQuoteError] = useState('');

  const unitLabel = priceUnit === 'qtl' ? 'qtl' : priceUnit === 'kg' ? 'kg' : 'MT';

  const formatUnitPrice = (pricePerQtl: number): string => {
    if (priceUnit === 'kg') {
      return `₹${(pricePerQtl / 100).toFixed(2)}`;
    }
    if (priceUnit === 'tonne') {
      return `₹${Math.round(pricePerQtl * 10).toLocaleString('en-IN')}`;
    }
    return `₹${Math.round(pricePerQtl).toLocaleString('en-IN')}`;
  };

  const availableStates = useMemo(() => {
    const states = Array.from(new Set(records.map((r) => r.state))).sort();
    return ['All States', ...states];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records
      .filter((r) => {
        if (selectedCategory !== 'All' && r.category !== selectedCategory) return false;
        if (selectedState !== 'All States' && r.state !== selectedState) return false;
        if (trendFilter === 'rising' && r.change24hPct < 0) return false;
        if (trendFilter === 'softening' && r.change24hPct >= 0) return false;
        if (savedOnly && !savedIds.includes(r.id)) return false;
        if (!q) return true;
        return (
          r.commodity.toLowerCase().includes(q) ||
          r.variety.toLowerCase().includes(q) ||
          r.mandi.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.state.toLowerCase().includes(q) ||
          r.grade.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const diff = a[sortField] - b[sortField];
        return sortAsc ? diff : -diff;
      });
  }, [
    records,
    searchQuery,
    selectedCategory,
    selectedState,
    trendFilter,
    savedOnly,
    savedIds,
    sortField,
    sortAsc,
  ]);

  // Dynamic Dashboard Summary Metrics for Filtered Results
  const dashboardStats = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        count: 0,
        avgModal: 0,
        highestRecord: null as MandiLotRecord | null,
        totalArrivals: 0,
      };
    }
    const sumModal = filteredRecords.reduce((acc, r) => acc + r.modalPrice, 0);
    const totalArrivals = filteredRecords.reduce((acc, r) => acc + r.arrivalsQtl, 0);
    const highestRecord = filteredRecords.reduce(
      (best, curr) => (curr.modalPrice > best.modalPrice ? curr : best),
      filteredRecords[0]
    );
    return {
      count: filteredRecords.length,
      avgModal: sumModal / filteredRecords.length,
      highestRecord,
      totalArrivals,
    };
  }, [filteredRecords]);

  const selectedRecord = useMemo(() => {
    return (
      filteredRecords.find((r) => r.id === selectedLotId) ||
      filteredRecords[0] ||
      records[0]
    );
  }, [filteredRecords, selectedLotId, records]);

  const comparedRecords = useMemo(
    () => records.filter((r) => comparedIds.includes(r.id)),
    [records, comparedIds]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedState('All States');
    setTrendFilter('all');
    setSavedOnly(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'Commodity',
      'Variety',
      'Category',
      'Mandi',
      'District',
      'State',
      'Grade',
      'Min Price (INR/qtl)',
      'Modal Price (INR/qtl)',
      'Max Price (INR/qtl)',
      '24h Change (%)',
      'Daily Arrivals (qtl)',
    ];
    const rows = filteredRecords.map((r) => [
      `"${r.commodity}"`,
      `"${r.variety}"`,
      `"${r.category}"`,
      `"${r.mandi}"`,
      `"${r.district}"`,
      `"${r.state}"`,
      `"${r.grade}"`,
      r.minPrice,
      r.modalPrice,
      r.maxPrice,
      r.change24hPct,
      r.arrivalsQtl,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mandilens_rates_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const modalNum = Number(quoteModal);
    const arrivalsNum = Number(quoteArrivals);

    if (quoteMandi.trim().length < 2 || quoteDistrict.trim().length < 2) {
      setQuoteError('Enter both Mandi Yard name and District (minimum 2 characters).');
      return;
    }
    if (!Number.isFinite(modalNum) || modalNum < 200 || modalNum > 50000) {
      setQuoteError('Enter a realistic modal price between ₹200 and ₹50,000 per quintal.');
      return;
    }
    if (!Number.isFinite(arrivalsNum) || arrivalsNum < 10) {
      setQuoteError('Enter arrival volume of at least 10 quintals.');
      return;
    }

    const minP = Math.round(modalNum * 0.91);
    const maxP = Math.round(modalNum * 1.09);

    if (user) {
      setIsSubmittingQuote(true);
      try {
        const created = await addCloudFieldQuote({
          commodity: quoteCommodity.trim() || 'Onion',
          variety: quoteVariety.trim() || 'Standard FAQ',
          category: quoteCategory,
          mandi: quoteMandi.trim(),
          district: quoteDistrict.trim(),
          state: quoteState,
          grade: 'FPO Verified Lot',
          modalPrice: modalNum,
          minPrice: minP,
          maxPrice: maxP,
          arrivalsQtl: arrivalsNum,
        });
        setSelectedLotId(created.id);
        setQuoteMandi('');
        setQuoteDistrict('');
        setQuoteError('');
        setShowQuoteForm(false);
      } catch (err) {
        setQuoteError(err instanceof Error ? err.message : 'Unable to save quote to cloud.');
      } finally {
        setIsSubmittingQuote(false);
      }
      return;
    }

    const farmgate = Math.round(modalNum * 0.88);
    const grading = Math.round(modalNum * 0.035);
    const localFreight = Math.round(modalNum * 0.05);
    const cess = modalNum - farmgate - grading - localFreight;
    const interstate = Math.round(modalNum * 0.11);

    const newRecord: MandiLotRecord = {
      id: `lot-custom-${Date.now()}`,
      apmcCode: `${quoteState.slice(0, 2).toUpperCase()}-LOC-${String(Date.now()).slice(-4)}`,
      commodity: quoteCommodity.trim() || 'Commodity',
      variety: quoteVariety.trim() || 'Standard FAQ',
      category: quoteCategory,
      mandi: quoteMandi.trim(),
      district: quoteDistrict.trim(),
      state: quoteState,
      grade: 'FPO Verified Lot',
      moistureSpec: 'Field Checked',
      minPrice: minP,
      maxPrice: maxP,
      modalPrice: modalNum,
      change24hPct: 1.4,
      arrivalsQtl: arrivalsNum,
      defaultDistanceKm: 40,
      mandiFeePct: 1.0,
      hamaliPerQtl: 25,
      updatedAgo: 'Just logged (session)',
      corridorId:
        quoteCategory === 'Vegetables'
          ? 'corridor-onion-nashik'
          : quoteCategory === 'Cereals & Pulses'
          ? 'corridor-wheat-mp'
          : 'corridor-soybean-malwa',
      history7d: [
        { day: '18 Oct', modal: Math.round(modalNum * 0.95), arrivals: Math.round(arrivalsNum * 1.12) },
        { day: '19 Oct', modal: Math.round(modalNum * 0.96), arrivals: Math.round(arrivalsNum * 1.08) },
        { day: '20 Oct', modal: Math.round(modalNum * 0.97), arrivals: Math.round(arrivalsNum * 1.05) },
        { day: '21 Oct', modal: Math.round(modalNum * 0.96), arrivals: Math.round(arrivalsNum * 1.06) },
        { day: '22 Oct', modal: Math.round(modalNum * 0.98), arrivals: Math.round(arrivalsNum * 1.03) },
        { day: '23 Oct', modal: Math.round(modalNum * 0.99), arrivals: Math.round(arrivalsNum * 1.01) },
        { day: '24 Oct', modal: modalNum, arrivals: arrivalsNum },
      ],
      supplyChain: {
        farmgateNet: farmgate,
        gradingPackaging: grading,
        localFreight,
        mandiCessCommission: cess,
        modalAuctionPrice: modalNum,
        interstateLogistics: interstate,
        terminalLandedPrice: modalNum + interstate,
      },
    };

    onAddFieldQuote(newRecord);
    setSelectedLotId(newRecord.id);
    setQuoteMandi('');
    setQuoteDistrict('');
    setQuoteError('');
    setShowQuoteForm(false);
  };

  // Chart scaling for selectedRecord
  const chartPoints = selectedRecord?.history7d ?? [];
  const minChartModal = Math.min(...chartPoints.map((d) => d.modal)) * 0.97;
  const maxChartModal = Math.max(...chartPoints.map((d) => d.modal)) * 1.02;
  const maxChartArrivals = Math.max(...chartPoints.map((d) => d.arrivals), 1);

  return (
    <section id="price-dashboard" className="py-12 lg:py-16 border-b border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Heading & Primary Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
              <span>Live Wholesale Clearing Feed</span>
              <span aria-hidden="true">·</span>
              <span>Select up to 3 markets to compare net payouts</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Searchable Mandi Price Dashboard
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl">
              Search by crop, variety, APMC yard, district, or state. Inspect 7-day arrival trends
              or add any market directly to the comparison calculator below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Unit Switcher */}
            <div
              role="group"
              aria-label="Select price unit"
              className="inline-flex items-center gap-0.5 p-1 bg-slate-200/80 rounded-lg"
            >
              {(
                [
                  { id: 'qtl', label: '₹ / Quintal' },
                  { id: 'kg', label: '₹ / Kg' },
                  { id: 'tonne', label: '₹ / Tonne' },
                ] as const
              ).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setPriceUnit(u.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    priceUnit === u.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowQuoteForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showQuoteForm ? 'Close Form' : 'Log Field Quote'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Optional Log Field Quote Form */}
        {showQuoteForm && (
          <form
            onSubmit={handleQuoteSubmit}
            className="mb-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
          >
            <div className="mb-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Submit FPO / Gate Auction Observation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add a local yard quote to compare alongside indexed APMC markets in the dashboard
                and calculator.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Commodity</label>
                <input
                  type="text"
                  value={quoteCommodity}
                  onChange={(e) => setQuoteCommodity(e.target.value)}
                  placeholder="e.g. Onion"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={quoteCategory}
                  onChange={(e) => setQuoteCategory(e.target.value as CropCategory)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                >
                  <option value="Vegetables">Vegetables</option>
                  <option value="Cereals & Pulses">Cereals &amp; Pulses</option>
                  <option value="Oilseeds & Spices">Oilseeds &amp; Spices</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mandi Yard</label>
                <input
                  type="text"
                  value={quoteMandi}
                  onChange={(e) => setQuoteMandi(e.target.value)}
                  placeholder="e.g. Yeola APMC"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  District &amp; State
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quoteDistrict}
                    onChange={(e) => setQuoteDistrict(e.target.value)}
                    placeholder="District"
                    className="w-1/2 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                  />
                  <select
                    value={quoteState}
                    onChange={(e) => setQuoteState(e.target.value)}
                    className="w-1/2 px-2 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                  >
                    <option value="Maharashtra">MH</option>
                    <option value="Madhya Pradesh">MP</option>
                    <option value="Karnataka">KA</option>
                    <option value="Punjab">PB</option>
                    <option value="Haryana">HR</option>
                    <option value="Gujarat">GJ</option>
                    <option value="Rajasthan">RJ</option>
                    <option value="Telangana">TG</option>
                    <option value="Andhra Pradesh">AP</option>
                    <option value="Uttar Pradesh">UP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Modal (₹/qtl)
                </label>
                <input
                  type="number"
                  value={quoteModal}
                  onChange={(e) => setQuoteModal(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Arrivals (qtl)
                </label>
                <input
                  type="number"
                  value={quoteArrivals}
                  onChange={(e) => setQuoteArrivals(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                />
              </div>
            </div>

            {quoteError && (
              <p className="mt-3 text-xs font-medium text-red-700" role="alert">
                {quoteError}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {user ? (
                <span className="text-xs text-green-800 font-medium">
                  Signed in: quote will be saved permanently to your MandiLens cloud account.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-xs font-semibold text-green-800 hover:underline"
                >
                  Sign in with Google to sync quotes permanently across devices
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuoteForm(false);
                    setQuoteError('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {isSubmittingQuote
                    ? 'Saving to Cloud...'
                    : user
                    ? 'Save Quote to Cloud'
                    : 'Save Quote to Session'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Prominent Search & Multi-Facet Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4">
            {/* Primary Search Input + Dropdown Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search commodity, variety, mandi yard, district, or state..."
                  aria-label="Search commodity, variety, mandi yard, district, or state"
                  className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-green-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="lg:col-span-3 relative">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  aria-label="Filter by state"
                  className="w-full pl-8 pr-7 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-green-800"
                >
                  {availableStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3 flex items-center gap-2">
                <select
                  value={trendFilter}
                  onChange={(e) => setTrendFilter(e.target.value as TrendFilter)}
                  aria-label="Filter by 24h price trend"
                  className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-green-800"
                >
                  <option value="all">All 24h Trends</option>
                  <option value="rising">Rising Rates (+)</option>
                  <option value="softening">Softening Rates (−)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSavedOnly((prev) => !prev)}
                  aria-pressed={savedOnly}
                  className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    savedOnly
                      ? 'bg-green-800 text-white border-green-800'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved ({savedIds.length})</span>
                </button>
              </div>
            </div>

            {/* Category Tabs + Active Filter Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Filter commodities by category"
                className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
              >
                {CATEGORIES.map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      role="tab"
                      aria-selected={active}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {category === 'All' ? 'All Commodities' : category}
                    </button>
                  );
                })}
              </div>

              {(searchQuery ||
                selectedCategory !== 'All' ||
                selectedState !== 'All States' ||
                trendFilter !== 'all' ||
                savedOnly) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-green-800 hover:underline whitespace-nowrap"
                >
                  Clear Active Filters
                </button>
              )}
            </div>
          </div>

          {/* Live Filtered KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/70">
            <div className="px-5 py-3.5">
              <p className="text-xs text-slate-500">Matching Markets</p>
              <p className="mt-0.5 font-mono tabular-nums text-base sm:text-lg font-semibold text-slate-900">
                {dashboardStats.count} of {records.length} Yards
              </p>
            </div>
            <div className="px-5 py-3.5">
              <p className="text-xs text-slate-500">Average Modal Rate</p>
              <p className="mt-0.5 font-mono tabular-nums text-base sm:text-lg font-semibold text-slate-900">
                {dashboardStats.count > 0
                  ? `${formatUnitPrice(dashboardStats.avgModal)} / ${unitLabel}`
                  : '—'}
              </p>
            </div>
            <div className="px-5 py-3.5">
              <p className="text-xs text-slate-500">Highest Clearing Market</p>
              <p className="mt-0.5 font-mono tabular-nums text-base sm:text-lg font-semibold text-green-800 truncate">
                {dashboardStats.highestRecord
                  ? `${formatUnitPrice(dashboardStats.highestRecord.modalPrice)} · ${
                      dashboardStats.highestRecord.mandi
                    }`
                  : '—'}
              </p>
            </div>
            <div className="px-5 py-3.5">
              <p className="text-xs text-slate-500">Filtered Gate Arrivals</p>
              <p className="mt-0.5 font-mono tabular-nums text-base sm:text-lg font-semibold text-slate-900">
                {dashboardStats.totalArrivals.toLocaleString('en-IN')} qtl
              </p>
            </div>
          </div>

          {/* Active Comparison Selection Tray */}
          {comparedRecords.length > 0 && (
            <div className="px-5 py-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <Scale className="w-4 h-4 text-green-400 shrink-0" />
                <span className="font-semibold">
                  Comparing {comparedRecords.length}/3 Markets:
                </span>
                <span className="text-slate-300">
                  {comparedRecords.map((r) => `${r.mandi} (${r.commodity})`).join(' · ')}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClearCompare}
                  className="text-xs text-slate-300 hover:text-white whitespace-nowrap"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={onJumpToCompare}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-green-700 hover:bg-green-600 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  Compare Net Payouts Below
                </button>
              </div>
            </div>
          )}

          {/* High-Density Data Table */}
          {filteredRecords.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <p className="font-display text-lg font-semibold text-slate-900">
                No mandi auction lots match your search
              </p>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                Clear the active search term, state filter, or watchlist toggle to view all
                indexed wholesale markets.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors whitespace-nowrap"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 pl-5 pr-3 whitespace-nowrap">Commodity &amp; Grade</th>
                    <th className="py-3 px-3 whitespace-nowrap">APMC Mandi Yard</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">
                      Min – Max (/{unitLabel})
                    </th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort('modalPrice')}
                        className="inline-flex items-center justify-end gap-1 hover:text-slate-900 whitespace-nowrap ml-auto"
                      >
                        <span>Modal Rate</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort('change24hPct')}
                        className="inline-flex items-center justify-end gap-1 hover:text-slate-900 whitespace-nowrap ml-auto"
                      >
                        <span>24h Shift</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort('arrivalsQtl')}
                        className="inline-flex items-center justify-end gap-1 hover:text-slate-900 whitespace-nowrap ml-auto"
                      >
                        <span>Gate Arrivals</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredRecords.map((row) => {
                    const isSelected = selectedRecord?.id === row.id;
                    const isSaved = savedIds.includes(row.id);
                    const isCompared = comparedIds.includes(row.id);
                    const isPositive = row.change24hPct >= 0;

                    return (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setSelectedLotId(row.id);
                          setActiveChartIdx(row.history7d.length - 1);
                        }}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isSelected ? 'bg-green-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="font-semibold text-slate-900">{row.commodity}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span>{row.variety}</span>
                            <span aria-hidden="true">·</span>
                            <span>{row.grade}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-slate-800">{row.mandi}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span>
                              {row.district}, {row.state}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{row.updatedAgo}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                          {formatUnitPrice(row.minPrice)} – {formatUnitPrice(row.maxPrice)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {formatUnitPrice(row.modalPrice)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-end gap-0.5 text-xs font-semibold ${
                              isPositive ? 'text-green-800' : 'text-red-700'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>
                              {isPositive ? '+' : ''}
                              {row.change24hPct.toFixed(1)}% {isPositive ? 'Firm' : 'Soft'}
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {row.arrivalsQtl.toLocaleString('en-IN')} qtl
                        </td>
                        <td
                          className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onToggleCompare(row.id)}
                              aria-pressed={isCompared}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                                isCompared
                                  ? 'bg-green-800 text-white border-green-800'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {isCompared && <Check className="w-3 h-3" />}
                              <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onToggleSave(row.id)}
                              aria-label={
                                isSaved
                                  ? `Remove ${row.commodity} at ${row.mandi} from watchlist`
                                  : `Save ${row.commodity} at ${row.mandi} to watchlist`
                              }
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                isSaved
                                  ? 'text-green-800 bg-green-100/80'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Lot Inspector: 7-Day Trend + Farm-to-Terminal Supply Chain Waterfall */}
          {selectedRecord && filteredRecords.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 p-6 lg:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Selected Market Inspector</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedRecord.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedRecord.moistureSpec}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 mt-1">
                    {selectedRecord.commodity} ({selectedRecord.variety}) — {selectedRecord.mandi}
                  </h3>
                </div>

                <a
                  href="#comparison-calculator"
                  onClick={() => onSelectCorridor(selectedRecord.corridorId)}
                  className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Load Corridor in Comparison Calculator
                </a>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                {/* Left: 7-Day Price & Arrival Interactive Chart */}
                <div className="lg:col-span-6">
                  <div className="flex items-baseline justify-between gap-4 mb-4">
                    <div>
                      <h4 className="font-display text-sm font-semibold text-slate-900">
                        7-Day Modal Price &amp; Arrival Pressure
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select any trading session to inspect daily volume vs. clearing rate
                      </p>
                    </div>
                    {chartPoints[activeChartIdx] && (
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-xs text-slate-500">
                          {chartPoints[activeChartIdx].day}:{' '}
                        </span>
                        <span className="text-sm font-semibold text-green-800">
                          {formatUnitPrice(chartPoints[activeChartIdx].modal)}/{unitLabel}
                        </span>
                        <span className="text-xs text-slate-500">
                          {' '}
                          · {chartPoints[activeChartIdx].arrivals.toLocaleString('en-IN')} qtl
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Interactive 7-Day Column + Trend Breakdown */}
                  <div className="pt-4 pb-2">
                    <div className="grid grid-cols-7 gap-2 items-end h-40 border-b border-slate-200 pb-3">
                      {chartPoints.map((pt, idx) => {
                        const heightPct =
                          maxChartModal > minChartModal
                            ? 28 +
                              ((pt.modal - minChartModal) / (maxChartModal - minChartModal)) * 72
                            : 65;
                        const arrivalRatio = Math.round((pt.arrivals / maxChartArrivals) * 100);
                        const isFocused = idx === activeChartIdx;

                        return (
                          <button
                            key={pt.day}
                            type="button"
                            onMouseEnter={() => setActiveChartIdx(idx)}
                            onClick={() => setActiveChartIdx(idx)}
                            className="group flex flex-col items-center justify-end h-full focus:outline-none"
                            aria-label={`${pt.day}: Modal rate ${formatUnitPrice(pt.modal)} per ${unitLabel}, arrivals ${pt.arrivals} quintals`}
                          >
                            <span
                              className={`font-mono tabular-nums text-[11px] mb-1.5 transition-colors ${
                                isFocused
                                  ? 'font-semibold text-slate-900'
                                  : 'text-slate-500 group-hover:text-slate-800'
                              }`}
                            >
                              {formatUnitPrice(pt.modal)}
                            </span>
                            <div className="w-full max-w-[38px] flex flex-col justify-end h-full">
                              <div
                                style={{ height: `${Math.min(100, Math.max(22, heightPct))}%` }}
                                className={`w-full rounded-t-md transition-colors duration-150 ${
                                  isFocused
                                    ? 'bg-green-800'
                                    : 'bg-slate-300 group-hover:bg-slate-400'
                                }`}
                              />
                            </div>
                            <span className="mt-2 font-mono tabular-nums text-[10px] text-slate-400">
                              {arrivalRatio}% vol
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-7 gap-2 pt-2 text-center">
                      {chartPoints.map((pt, idx) => (
                        <span
                          key={pt.day}
                          className={`text-[11px] font-mono tabular-nums ${
                            idx === activeChartIdx ? 'font-semibold text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          {pt.day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Supply Chain Price Spread Breakdown */}
                <div className="lg:col-span-6 lg:border-l lg:border-slate-200 lg:pl-10">
                  <div className="mb-4">
                    <h4 className="font-display text-sm font-semibold text-slate-900">
                      Farmgate-to-Terminal Supply Chain Breakdown
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Transparent cost build-up per {unitLabel} from farmer realization to destination buyer
                    </p>
                  </div>

                  <dl className="divide-y divide-slate-200 text-sm">
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <dt className="text-slate-700 font-medium">
                        Net Farmgate Realization (Farmer Share:{' '}
                        <span className="font-mono tabular-nums font-semibold text-green-800">
                          {Math.round(
                            (selectedRecord.supplyChain.farmgateNet /
                              selectedRecord.supplyChain.terminalLandedPrice) *
                              100
                          )}
                          %
                        </span>
                        )
                      </dt>
                      <dd className="font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatUnitPrice(selectedRecord.supplyChain.farmgateNet)} / {unitLabel}
                      </dd>
                    </div>

                    <div className="py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
                      <dt className="text-slate-600">Grading, Bagging &amp; Packhouse Labor</dt>
                      <dd className="font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        + {formatUnitPrice(selectedRecord.supplyChain.gradingPackaging)} / {unitLabel}
                      </dd>
                    </div>

                    <div className="py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
                      <dt className="text-slate-600">Village-to-Mandi Tractor / LCV Freight</dt>
                      <dd className="font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        + {formatUnitPrice(selectedRecord.supplyChain.localFreight)} / {unitLabel}
                      </dd>
                    </div>

                    <div className="py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
                      <dt className="text-slate-600">APMC Market Cess, Weighment &amp; Hamali</dt>
                      <dd className="font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        + {formatUnitPrice(selectedRecord.supplyChain.mandiCessCommission)} / {unitLabel}
                      </dd>
                    </div>

                    <div className="py-2.5 flex items-center justify-between gap-4 bg-white px-2 -mx-2 rounded">
                      <dt className="font-semibold text-slate-900">Cleared APMC Modal Auction Rate</dt>
                      <dd className="font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatUnitPrice(selectedRecord.supplyChain.modalAuctionPrice)} / {unitLabel}
                      </dd>
                    </div>

                    <div className="py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm">
                      <dt className="text-slate-600">
                        Line-Haul Dispatch &amp; Transit Shrinkage Allowance
                      </dt>
                      <dd className="font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        + {formatUnitPrice(selectedRecord.supplyChain.interstateLogistics)} / {unitLabel}
                      </dd>
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-4">
                      <dt className="font-semibold text-slate-900">
                        Destination Wholesale Landed Cost
                      </dt>
                      <dd className="font-mono tabular-nums font-bold text-green-800 whitespace-nowrap">
                        {formatUnitPrice(selectedRecord.supplyChain.terminalLandedPrice)} / {unitLabel}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
