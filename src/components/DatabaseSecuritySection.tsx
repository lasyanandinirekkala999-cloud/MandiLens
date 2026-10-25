import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Lock,
  LogIn,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
} from 'lucide-react';
import { DispatchOrderStatus, useAuth } from '../context/AuthContext';
import { maskEmailAddress } from '../utils/emailSecurity';

interface DatabaseSecuritySectionProps {
  onOpenAuth: () => void;
}

type LedgerFilter = 'all' | DispatchOrderStatus;

export const DatabaseSecuritySection: React.FC<DatabaseSecuritySectionProps> = ({
  onOpenAuth,
}) => {
  const {
    user,
    isAdmin,
    isEmailVerified,
    profile,
    publishedMandiLots,
    cloudWatchlistIds,
    cloudSubscriptions,
    savedComparisons,
    procurementOrders,
    seedOfficialMandiLots,
    createProcurementOrder,
    advanceProcurementOrderStatus,
    deleteProcurementOrder,
  } = useAuth();

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [commodity, setCommodity] = useState('Tomato (Grade A Crate)');
  const [originCluster, setOriginCluster] = useState('Anantapur, Andhra Pradesh');
  const [destinationMandi, setDestinationMandi] = useState('Mandi A — Hindupur Highway APMC');
  const [quantityQtl, setQuantityQtl] = useState('20');
  const [expectedNetPerQtl, setExpectedNetPerQtl] = useState('2160');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedFeedback, setSeedFeedback] = useState('');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (ledgerFilter === 'all') return procurementOrders;
    return procurementOrders.filter((o) => o.dispatchStatus === ledgerFilter);
  }, [procurementOrders, ledgerFilter]);

  const handleSeedMandiLots = async () => {
    setIsSeeding(true);
    setSeedFeedback('');
    try {
      const count = await seedOfficialMandiLots();
      setSeedFeedback(`Synced ${count} verified APMC market lots to Firestore.`);
    } catch (err) {
      setSeedFeedback(err instanceof Error ? err.message : 'Unable to sync APMC records.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    const qty = Number(quantityQtl);
    const net = Number(expectedNetPerQtl);

    if (commodity.trim().length < 2 || originCluster.trim().length < 2 || destinationMandi.trim().length < 2) {
      setFormError('Commodity, origin cluster, and destination mandi are required.');
      return;
    }
    if (!Number.isFinite(qty) || qty < 1 || qty > 50000) {
      setFormError('Enter a valid dispatch quantity between 1 and 50,000 quintals.');
      return;
    }
    if (!Number.isFinite(net) || net < 50 || net > 100000) {
      setFormError('Enter an expected net realization between ₹50 and ₹100,000 per quintal.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      await createProcurementOrder({
        organization: profile?.displayName || user.displayName || 'MandiLens Member',
        commodity: commodity.trim(),
        originCluster: originCluster.trim(),
        destinationMandi: destinationMandi.trim(),
        quantityQtl: qty,
        expectedNetPerQtl: net,
      });
      setShowOrderForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to record dispatch order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStatus = async (orderId: string, nextStatus: DispatchOrderStatus) => {
    setBusyOrderId(orderId);
    try {
      await advanceProcurementOrderStatus(orderId, nextStatus);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      await deleteProcurementOrder(orderId);
    } finally {
      setBusyOrderId(null);
    }
  };

  const lockedComparisonCount = savedComparisons.filter((c) => c.status === 'locked').length;
  const settledOrderCount = procurementOrders.filter((o) => o.dispatchStatus === 'settled').length;

  return (
    <section
      id="database-security"
      className="py-12 lg:py-16 bg-white border-b border-[#E2E4DD] no-print"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Heading & Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-2">
              <span>Cloud Firestore Persistence</span>
              <span aria-hidden="true">·</span>
              <span>Attribute-Based Access Control &amp; PII Isolation</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Supply Chain Dispatch Ledger &amp; Database Security
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl">
              Track farmgate-to-mandi truck dispatches in Firestore with sequential state locking,
              sync official APMC clearing sheets, and inspect the security rules protecting every
              market record.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAdmin && (
              <button
                type="button"
                disabled={isSeeding}
                onClick={handleSeedMandiLots}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                <span>
                  {isSeeding ? 'Syncing APMC Lots...' : 'Sync Official APMC Lots'}
                </span>
              </button>
            )}

            {user ? (
              <button
                type="button"
                onClick={() => setShowOrderForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showOrderForm ? 'Close Dispatch Form' : 'New Dispatch Order'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Access Ledger</span>
              </button>
            )}
          </div>
        </div>

        {seedFeedback && (
          <p className="mb-4 text-xs font-medium text-green-800" role="status">
            {seedFeedback}
          </p>
        )}

        {/* Single-Elevation Container: Live Database Telemetry + Dispatch Ledger */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-10">
          {/* 4-Column Firestore Collection Inventory Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/70">
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Shared Market Lots</span>
              </div>
              <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900">
                {publishedMandiLots.length} Cloud Lots
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Collection: <span className="font-mono">/mandiLots</span>
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Dispatch Ledger</span>
              </div>
              <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900">
                {user ? `${procurementOrders.length} Orders` : 'Owner Scoped'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {user ? `${settledOrderCount} settled & locked` : 'Sign in to view orders'}
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Saved Comparisons</span>
              </div>
              <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900">
                {user ? `${savedComparisons.length} Scenarios` : 'Owner Scoped'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {user ? `${lockedComparisonCount} decision-locked` : 'Subcollection isolated'}
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-green-800 shrink-0" />
                <span>Account &amp; PII Vault</span>
              </div>
              <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-green-800">
                {user
                  ? `${cloudWatchlistIds.length + cloudSubscriptions.length} Synced Items`
                  : 'Split-Collection'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {user
                  ? isAdmin
                    ? `${maskEmailAddress(user.email)} · Verified Admin`
                    : isEmailVerified
                    ? `${maskEmailAddress(user.email)} · PII Vault`
                    : `${maskEmailAddress(user.email)} · Verify Email`
                  : 'Email isolated in /private/info'}
              </p>
            </div>
          </div>

          {/* Inline Create Dispatch Order Form */}
          {showOrderForm && user && (
            <form
              onSubmit={handleCreateOrder}
              className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/50"
            >
              <div className="mb-4">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Log Planned Supply Chain Dispatch
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creates an owner-scoped document in <span className="font-mono">/procurementOrders</span>{' '}
                  initialized in the <span className="font-mono">planned</span> state with server
                  timestamp verification.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Commodity &amp; Grade
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    placeholder="e.g. Onion FAQ 55mm+"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Origin Cluster
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={originCluster}
                    onChange={(e) => setOriginCluster(e.target.value)}
                    placeholder="e.g. Niphad Packhouse, MH"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Destination Mandi
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={destinationMandi}
                    onChange={(e) => setDestinationMandi(e.target.value)}
                    placeholder="e.g. Vashi Terminal APMC"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lot Volume (qtl)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    value={quantityQtl}
                    onChange={(e) => setQuantityQtl(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Expected Net (₹/qtl)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100000}
                    value={expectedNetPerQtl}
                    onChange={(e) => setExpectedNetPerQtl(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-800"
                  />
                </div>
              </div>

              {formError && (
                <p className="mt-3 text-xs font-medium text-red-700" role="alert">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOrderForm(false);
                    setFormError('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {isSubmitting ? 'Saving Dispatch...' : 'Save Planned Dispatch'}
                </button>
              </div>
            </form>
          )}

          {/* Filter Toolbar */}
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Procurement &amp; Truck Dispatch Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Sequential state workflow: Planned → In Transit → Settled (Terminal Lock)
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Filter dispatch orders by status"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {(
                [
                  { id: 'all', label: 'All Orders' },
                  { id: 'planned', label: 'Planned' },
                  { id: 'in_transit', label: 'In Transit' },
                  { id: 'settled', label: 'Settled' },
                ] as const
              ).map((tab) => {
                const active = ledgerFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setLedgerFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ledger Table / Empty States */}
          {!user ? (
            <div className="py-12 px-6 text-center">
              <p className="font-display text-base font-semibold text-slate-900">
                Sign in to manage your private dispatch and settlement ledger
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Firestore security rules isolate <span className="font-mono">/procurementOrders</span>{' '}
                strictly to each verified member&apos;s UID with zero cross-tenant query access.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In with Google</span>
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <p className="font-display text-base font-semibold text-slate-900">
                No dispatch orders recorded in this view
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Log a planned truck dispatch above or create one directly from the Mandi Comparison
                Calculator verdict bar.
              </p>
              <button
                type="button"
                onClick={() => setShowOrderForm(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Dispatch Order</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 pl-5 pr-3 whitespace-nowrap">Commodity &amp; Organization</th>
                    <th className="py-3 px-3 whitespace-nowrap">Supply Chain Corridor</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Lot Volume</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Expected Net / qtl</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Est. Net Payout</th>
                    <th className="py-3 px-3 whitespace-nowrap">Workflow Status</th>
                    <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">State Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredOrders.map((order) => {
                    const estTotal = Math.round(order.quantityQtl * order.expectedNetPerQtl);
                    const isBusy = busyOrderId === order.id;

                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="font-semibold text-slate-900">{order.commodity}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{order.organization}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-800">
                            <span>{order.originCluster}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-900">
                              {order.destinationMandi}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {order.quantityQtl.toLocaleString('en-IN')} qtl
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                          ₹{order.expectedNetPerQtl.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          ₹{estTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {order.dispatchStatus === 'settled' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-800">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Settled · Locked</span>
                            </span>
                          ) : order.dispatchStatus === 'in_transit' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                              <Truck className="w-3.5 h-3.5 shrink-0" />
                              <span>In Transit</span>
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-600">
                              Planned Dispatch
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {order.dispatchStatus === 'planned' && (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleAdvanceStatus(order.id, 'in_transit')}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                  Mark In Transit
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDeleteOrder(order.id)}
                                  aria-label={`Cancel planned order for ${order.commodity}`}
                                  className="p-1.5 text-slate-400 hover:text-red-700 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {order.dispatchStatus === 'in_transit' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAdvanceStatus(order.id, 'settled')}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-green-800 rounded-md hover:bg-green-900 disabled:opacity-50 transition-colors whitespace-nowrap"
                              >
                                Mark Settled
                              </button>
                            )}

                            {order.dispatchStatus === 'settled' && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Lock className="w-3 h-3" />
                                <span>Immutable</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Enforced Security Controls Specification Grid */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-display text-base font-bold text-slate-900">
              Active Firestore Security Architecture
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Server-enforced database rules protecting user accounts, market rates, and supply
              chain settlement records
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="p-6">
              <h4 className="font-display text-sm font-semibold text-slate-900">
                01. Verified Identity &amp; Role Registry
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every database write requires Google authentication with{' '}
                <span className="font-mono text-xs text-slate-800">email_verified == true</span>.
                Official APMC rate seeding is restricted to verified administrators in{' '}
                <span className="font-mono text-xs text-slate-800">/admins</span>.
              </p>
            </div>

            <div className="p-6">
              <h4 className="font-display text-sm font-semibold text-slate-900">
                02. Split-Collection PII Isolation
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Personal email addresses are isolated in{' '}
                <span className="font-mono text-xs text-slate-800">/users/&#123;uid&#125;/private/info</span>{' '}
                and completely omitted from the supply chain preference document, preventing
                accidental PII exposure.
              </p>
            </div>

            <div className="p-6 border-t lg:border-t-0 border-slate-200">
              <h4 className="font-display text-sm font-semibold text-slate-900">
                03. Terminal State &amp; Schema Guards
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Strict field allowlists (<span className="font-mono text-xs text-slate-800">hasOnly</span>),
                string length caps, server timestamp checks (<span className="font-mono text-xs text-slate-800">request.time</span>),
                and terminal locks protect settled dispatches and locked arbitrage comparisons.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
