import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import {
  SUPPLY_CHAIN_ROLES,
  SupplyChainRole,
  useAuth,
} from '../context/AuthContext';
import { computeSmartSellingDecision } from '../data/mandiData';

export type LoginPortalTrack = 'farmer' | 'partner';

interface LoginPageProps {
  initialPortal?: LoginPortalTrack;
  onReturnToPlatform: (targetAnchor?: string) => void;
  onOpenQuickModal: () => void;
}

const REGION_CLUSTERS = [
  'Andhra Pradesh — Anantapur / Guntur',
  'Karnataka — Kolar / Kalaburagi',
  'Maharashtra — Nashik / Pune',
  'Madhya Pradesh — Indore / Sehore',
  'Punjab & Haryana — Grain Belt',
  'Gujarat & Rajasthan — West Corridor',
];

export const LoginPage: React.FC<LoginPageProps> = ({
  initialPortal = 'farmer',
  onReturnToPlatform,
  onOpenQuickModal,
}) => {
  const {
    user,
    isAdmin,
    profile,
    cloudWatchlistIds,
    cloudFieldQuotes,
    cloudSubscriptions,
    savedComparisons,
    procurementOrders,
    authError,
    signInWithGoogle,
    signOutUser,
    updateUserProfile,
    clearAuthError,
  } = useAuth();

  const [portalTrack, setPortalTrack] = useState<LoginPortalTrack>(initialPortal);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<SupplyChainRole>(
    initialPortal === 'partner'
      ? 'Commodity Buyer / Processor'
      : 'FPO / Farmer Collective'
  );
  const [selectedCluster, setSelectedCluster] = useState<string>(REGION_CLUSTERS[0]);
  const [applyPrefsOnLogin, setApplyPrefsOnLogin] = useState<boolean>(true);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    setPortalTrack(initialPortal);
    if (!user) {
      setSelectedRole(
        initialPortal === 'partner'
          ? 'Commodity Buyer / Processor'
          : 'FPO / Farmer Collective'
      );
    }
  }, [initialPortal, user]);

  useEffect(() => {
    if (profile) {
      setOrganizationName(profile.displayName);
      setSelectedRole(profile.supplyChainRole);
      setSelectedCluster(profile.regionCluster);
    }
  }, [profile]);

  const sampleDecision = useMemo(
    () => computeSmartSellingDecision('Anantapur, Andhra Pradesh', 'Tomato', 20),
    []
  );

  const handlePortalSwitch = (nextTrack: LoginPortalTrack) => {
    setPortalTrack(nextTrack);
    clearAuthError();
    setLocalError('');
    if (!user) {
      setSelectedRole(
        nextTrack === 'partner'
          ? 'Commodity Buyer / Processor'
          : 'FPO / Farmer Collective'
      );
    }
  };

  const handleGooglePortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setLocalError('');
    clearAuthError();

    const ok = await signInWithGoogle({
      displayName: organizationName.trim() || undefined,
      supplyChainRole: selectedRole,
      regionCluster: selectedCluster,
      applyToExisting: applyPrefsOnLogin,
    });

    setIsBusy(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleUpdateWorkspaceProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSaveSuccess(false);

    if (!organizationName.trim()) {
      setLocalError('Enter your farm, FPO, or enterprise name.');
      return;
    }

    setIsBusy(true);
    try {
      await updateUserProfile({
        displayName: organizationName.trim(),
        supplyChainRole: selectedRole,
        regionCluster: selectedCluster,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to update workspace profile.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    await signOutUser();
    setIsBusy(false);
  };

  return (
    <section
      aria-labelledby="login-portal-heading"
      className="min-h-[calc(100vh-3.5rem)] bg-[#F7F7F2] flex flex-col justify-between"
    >
      <div className="max-w-7xl w-full mx-auto px-6 py-8 lg:py-12 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column: AgriTech Market Intelligence Showcase */}
          <div className="lg:col-span-6 bg-[#0F2F1E] text-white rounded-2xl border border-[#1E4D33] p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => onReturnToPlatform()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A7F3D0] hover:text-white transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Live Market Dashboard</span>
                </button>
                <span className="text-xs text-white/70 whitespace-nowrap">
                  MandILens Cloud Access
                </span>
              </div>

              {/* Clean Unboxed Metadata Strip (Zero Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#4ADE80] mb-3 tracking-[0.01em]">
                <span>
                  {portalTrack === 'farmer'
                    ? 'Farmer & FPO Grower Portal'
                    : 'Buyer, Fleet & Market Admin Portal'}
                </span>
                <span aria-hidden="true" className="text-white/40">
                  •
                </span>
                <span className="text-white/80 font-medium">
                  Zero-Trust Firestore Cloud Sync
                </span>
              </div>

              <h1
                id="login-portal-heading"
                className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white text-balance leading-[1.15]"
              >
                {portalTrack === 'farmer'
                  ? 'Turn Live Mandi Prices Into Higher Net Farmgate Profit.'
                  : 'Verified APMC Clearing & Multi-Corridor Dispatch Desk.'}
              </h1>

              <p className="mt-3 text-sm sm:text-base text-[#D1FAE5]/85 leading-relaxed max-w-xl tracking-[0.01em]">
                {portalTrack === 'farmer'
                  ? 'Sign in to sync your saved mandi watchlists, lock 3-market profit comparisons across devices, and receive 07:30 AM regional clearing sheets.'
                  : 'Authenticate your procurement desk, cold-chain fleet, or APMC administrator account to publish verified field auction quotes and track interstate dispatches.'}
              </p>

              {/* Live Smart Selling Snapshot inside Showcase */}
              <div className="mt-7 bg-[#16422B]/80 border border-[#276343] rounded-xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/12 text-xs">
                  <span className="font-semibold text-white">
                    Live Decision Snapshot · Anantapur Tomato (20 Qtl)
                  </span>
                  <span className="font-mono tabular-nums text-[#86EFAC]">
                    AI Confidence: {sampleDecision.aiConfidencePct}%
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-white/70">Best Market</p>
                    <p className="mt-0.5 font-display text-sm sm:text-base font-bold text-white">
                      {sampleDecision.bestMarketCode}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-[#A7F3D0]">
                      ₹{sampleDecision.bestSellingPricePerQtl.toLocaleString('en-IN')}/qtl
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-white/70">Est. Net Profit</p>
                    <p className="mt-0.5 font-mono tabular-nums text-sm sm:text-base font-bold text-white">
                      ₹{sampleDecision.estimatedNetProfit.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-white/65">After freight &amp; cess</p>
                  </div>

                  <div className="bg-[#FEF7E6] text-[#92400E] rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-semibold">Extra Gain</span>
                      <TrendingUp className="w-3 h-3 text-[#D97706] shrink-0" />
                    </div>
                    <p className="mt-0.5 font-mono tabular-nums text-sm sm:text-base font-bold text-[#92400E]">
                      +₹{sampleDecision.potentialExtraEarnings.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attributable FPO Proof Statement */}
            <figure className="mt-8 pt-6 border-t border-white/12">
              <blockquote className="text-xs sm:text-sm text-white/85 leading-relaxed tracking-[0.01em]">
                “Before MandILens, our collective dispatched tomatoes to the closest yard by habit.
                Comparing freight, cess, and shrinkage across three mandis lifted member net
                realization by ₹380 per quintal across 42 harvest lots.”
              </blockquote>
              <figcaption className="mt-2.5 text-xs text-[#A7F3D0]">
                <strong className="font-semibold text-white">Ramesh Naidu</strong> · Secretary,
                Rayalaseema Rythu FPO, Anantapur
              </figcaption>
            </figure>
          </div>

          {/* Right Column: Dedicated Login & Workspace Configuration Card */}
          <div className="lg:col-span-6 bg-white border border-[#E2E4DD] rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            {!user ? (
              <div>
                {/* Segmented Portal Track Switcher */}
                <div
                  role="group"
                  aria-label="Select MandILens login portal"
                  className="grid grid-cols-2 gap-1 p-1 bg-[#EFEFE8] rounded-xl mb-6"
                >
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('farmer')}
                    className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap truncate ${
                      portalTrack === 'farmer'
                        ? 'bg-[#0F2F1E] text-white'
                        : 'text-[#4A524D] hover:text-[#161A18]'
                    }`}
                  >
                    Farmer &amp; FPO Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('partner')}
                    className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap truncate ${
                      portalTrack === 'partner'
                        ? 'bg-[#0F2F1E] text-white'
                        : 'text-[#4A524D] hover:text-[#161A18]'
                    }`}
                  >
                    Buyer, Fleet &amp; Admin
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D] mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {portalTrack === 'farmer'
                        ? 'Grower & Collective Workspace Access'
                        : 'Supply Chain Partner & APMC Admin Access'}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#161A18]">
                    {portalTrack === 'farmer'
                      ? 'Sign in to Farmer Intelligence'
                      : 'Sign in to Partner & Dispatch Desk'}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#4A524D]">
                    Configure your default market corridor below, then authenticate securely with
                    Google to sync your private cloud workspace.
                  </p>
                </div>

                <form onSubmit={handleGooglePortalLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-org-name"
                      className="block text-xs font-semibold text-[#161A18] mb-1.5"
                    >
                      {portalTrack === 'farmer'
                        ? 'Farm / FPO Collective Name (Optional)'
                        : 'Enterprise / Cold-Chain / APMC Desk Name (Optional)'}
                    </label>
                    <input
                      id="login-org-name"
                      type="text"
                      maxLength={80}
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder={
                        portalTrack === 'farmer'
                          ? 'e.g. Sri Venkateswara Rythu FPO'
                          : 'e.g. Deccan Fresh Procurement Desk'
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] placeholder:text-[#8A928C] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="login-role-select"
                        className="block text-xs font-semibold text-[#161A18] mb-1.5"
                      >
                        Supply Chain Role
                      </label>
                      <select
                        id="login-role-select"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as SupplyChainRole)}
                        className="w-full px-3 py-2.5 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                      >
                        {SUPPLY_CHAIN_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="login-cluster-select"
                        className="block text-xs font-semibold text-[#161A18] mb-1.5"
                      >
                        Primary Market Corridor
                      </label>
                      <select
                        id="login-cluster-select"
                        value={selectedCluster}
                        onChange={(e) => setSelectedCluster(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                      >
                        {REGION_CLUSTERS.map((cluster) => (
                          <option key={cluster} value={cluster}>
                            {cluster}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyPrefsOnLogin}
                      onChange={(e) => setApplyPrefsOnLogin(e.target.checked)}
                      className="mt-0.5 rounded border-[#D5D9D2] accent-[#0F2F1E]"
                    />
                    <span className="text-xs text-[#4A524D] leading-relaxed">
                      Sync selected role and market corridor to my MandILens cloud profile upon
                      authentication
                    </span>
                  </label>

                  {(authError || localError) && (
                    <p
                      className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-2.5"
                      role="alert"
                    >
                      {authError || localError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 text-sm font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] disabled:opacity-60 transition-colors duration-150 whitespace-nowrap"
                  >
                    {/* Crisp 4-Color Google G Emblem */}
                    <svg
                      className="w-4 h-4 shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#EA4335"
                        d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.04-4.38 3.04-7.49 0-.72-.06-1.41-.19-2.08H12z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.98-3.45.98-2.65 0-4.9-1.79-5.7-4.2H2.89v2.64A9.99 9.99 0 0 0 12 22z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M6.3 13.75A5.98 5.98 0 0 1 5.98 12c0-.61.11-1.2.32-1.75V7.61H2.89A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.08 4.49l3.22-2.74z"
                      />
                      <path
                        fill="#4285F4"
                        d="M12 6.05c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 3.01 14.74 2 12 2A9.99 9.99 0 0 0 2.89 7.61l3.41 2.64c.8-2.41 3.05-4.2 5.7-4.2z"
                      />
                    </svg>
                    <span>
                      {isBusy
                        ? 'Authenticating with Google...'
                        : portalTrack === 'farmer'
                        ? 'Continue with Google · Farmer Portal'
                        : 'Continue with Google · Partner Portal'}
                    </span>
                  </button>
                </form>

                {/* Feature Access Summary */}
                <dl className="mt-6 pt-5 border-t border-[#E2E4DD] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <dt className="font-semibold text-[#161A18]">Isolated PII Vault</dt>
                    <dd className="text-[#4A524D] mt-0.5">
                      Email restricted strictly to account owner
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#161A18]">
                      {portalTrack === 'farmer' ? 'Locked Comparisons' : 'Gate Quote Logging'}
                    </dt>
                    <dd className="text-[#4A524D] mt-0.5">
                      {portalTrack === 'farmer'
                        ? 'Save & lock 3-mandi profit scenarios'
                        : 'Publish verified APMC clearing lots'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#161A18]">
                      {portalTrack === 'farmer' ? '07:30 AM Digests' : 'Dispatch Ledger'}
                    </dt>
                    <dd className="text-[#4A524D] mt-0.5">
                      {portalTrack === 'farmer'
                        ? 'Daily corridor alerts & parity sheets'
                        : 'Track planned & settled truck loads'}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              /* Authenticated Session Workspace View */
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E2E4DD]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>
                        {isAdmin
                          ? 'Authenticated · Verified Market Administrator'
                          : 'Authenticated · Google Verified Supply Chain Session'}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-[#161A18] mt-1 truncate">
                      {profile?.displayName || user.displayName || 'MandILens Member'}
                    </h2>
                    <p className="text-xs text-[#4A524D] truncate mt-0.5">
                      {user.email} · {profile?.supplyChainRole || selectedRole}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#161A18] bg-[#EFEFE8] rounded-xl hover:bg-[#E2E4DD] transition-colors whitespace-nowrap shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Live Cloud Sync Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                  <div className="p-3 bg-[#FAFBF8] border border-[#E2E4DD] rounded-xl">
                    <p className="text-[11px] text-[#4A524D]">Saved Watchlist</p>
                    <p className="mt-1 font-mono tabular-nums text-xl font-bold text-[#161A18]">
                      {cloudWatchlistIds.length}
                    </p>
                  </div>
                  <div className="p-3 bg-[#FAFBF8] border border-[#E2E4DD] rounded-xl">
                    <p className="text-[11px] text-[#4A524D]">Comparisons</p>
                    <p className="mt-1 font-mono tabular-nums text-xl font-bold text-[#161A18]">
                      {savedComparisons.length}
                    </p>
                  </div>
                  <div className="p-3 bg-[#FAFBF8] border border-[#E2E4DD] rounded-xl">
                    <p className="text-[11px] text-[#4A524D]">Dispatches</p>
                    <p className="mt-1 font-mono tabular-nums text-xl font-bold text-[#161A18]">
                      {procurementOrders.length}
                    </p>
                  </div>
                  <div className="p-3 bg-[#FAFBF8] border border-[#E2E4DD] rounded-xl">
                    <p className="text-[11px] text-[#4A524D]">Quotes &amp; Alerts</p>
                    <p className="mt-1 font-mono tabular-nums text-xl font-bold text-[#15803D]">
                      {cloudFieldQuotes.length + cloudSubscriptions.length}
                    </p>
                  </div>
                </div>

                {/* Workspace Settings Form */}
                <form onSubmit={handleUpdateWorkspaceProfile} className="space-y-4">
                  <div>
                    <label
                      htmlFor="active-org-name"
                      className="block text-xs font-semibold text-[#161A18] mb-1.5"
                    >
                      Packhouse / Farm / Enterprise Name
                    </label>
                    <input
                      id="active-org-name"
                      type="text"
                      maxLength={80}
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="active-role-select"
                        className="block text-xs font-semibold text-[#161A18] mb-1.5"
                      >
                        Active Supply Chain Role
                      </label>
                      <select
                        id="active-role-select"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as SupplyChainRole)}
                        className="w-full px-3 py-2.5 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                      >
                        {SUPPLY_CHAIN_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="active-cluster-select"
                        className="block text-xs font-semibold text-[#161A18] mb-1.5"
                      >
                        Default Market Corridor
                      </label>
                      <select
                        id="active-cluster-select"
                        value={selectedCluster}
                        onChange={(e) => setSelectedCluster(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                      >
                        {REGION_CLUSTERS.map((cluster) => (
                          <option key={cluster} value={cluster}>
                            {cluster}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(localError || authError) && (
                    <p className="text-xs font-semibold text-[#DC2626]" role="alert">
                      {localError || authError}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {saveSuccess ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Workspace synced to Firestore</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#6E7771]">
                        Changes apply immediately across your cloud ledger
                      </span>
                    )}

                    <button
                      type="submit"
                      disabled={isBusy}
                      className="px-4 py-2 text-xs font-semibold text-[#0F2F1E] bg-[#EFEFE8] rounded-xl hover:bg-[#E2E4DD] disabled:opacity-60 transition-colors whitespace-nowrap"
                    >
                      Save Workspace Profile
                    </button>
                  </div>
                </form>

                {/* Launch Platform Primary CTA */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onReturnToPlatform('dashboard')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] transition-colors whitespace-nowrap"
                  >
                    <span>Open Smart Selling Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReturnToPlatform('price-dashboard')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#161A18] bg-white border border-[#D5D9D2] rounded-xl hover:bg-[#EFEFE8] transition-colors whitespace-nowrap"
                  >
                    <span>Open Price Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Escape Hatch & Secondary Login Option */}
            <div className="mt-8 pt-4 border-t border-[#E2E4DD] flex flex-wrap items-center justify-between gap-3 text-xs text-[#4A524D]">
              <button
                type="button"
                onClick={() => onReturnToPlatform('price-dashboard')}
                className="font-semibold text-[#161A18] hover:text-[#15803D] hover:underline underline-offset-4 whitespace-nowrap"
              >
                Explore Live Market Prices Without Login →
              </button>

              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    onReturnToPlatform();
                    onOpenQuickModal();
                  }}
                  className="text-[#4A524D] hover:text-[#0F2F1E] underline underline-offset-4 whitespace-nowrap"
                >
                  Switch to Quick Overlay Sign-In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
