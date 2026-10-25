import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
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
import {
  maskEmailAddress,
  normalizeAndValidateEmail,
  SessionSecurityMode,
  validatePasswordStrength,
} from '../utils/emailSecurity';

export type LoginPortalTrack = 'farmer' | 'partner';
type EmailFormMode = 'signin' | 'signup';

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
    isEmailVerified,
    sessionSecurityMode,
    emailProviderUnavailableFor,
    profile,
    cloudWatchlistIds,
    cloudFieldQuotes,
    cloudSubscriptions,
    savedComparisons,
    procurementOrders,
    authError,
    setSessionSecurityPreference,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    sendVerificationEmailToUser,
    refreshVerificationState,
    signOutUser,
    updateUserProfile,
    clearAuthError,
  } = useAuth();

  const [portalTrack, setPortalTrack] = useState<LoginPortalTrack>(initialPortal);
  const [emailMode, setEmailMode] = useState<EmailFormMode>('signin');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [revealSignedInEmail, setRevealSignedInEmail] = useState<boolean>(false);

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
  const [statusMessage, setStatusMessage] = useState<string>('');
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

  const passwordStrength = useMemo(
    () => validatePasswordStrength(passwordInput),
    [passwordInput]
  );

  const handlePortalSwitch = (nextTrack: LoginPortalTrack) => {
    setPortalTrack(nextTrack);
    clearAuthError();
    setLocalError('');
    setStatusMessage('');
    if (!user) {
      setSelectedRole(
        nextTrack === 'partner'
          ? 'Commodity Buyer / Processor'
          : 'FPO / Farmer Collective'
      );
    }
  };

  const handleGooglePortalLogin = async (hintEmail?: string) => {
    setIsBusy(true);
    setLocalError('');
    setStatusMessage('');
    clearAuthError();

    const cleanHint = hintEmail?.trim() || emailInput.trim();
    const ok = await signInWithGoogle({
      displayName: organizationName.trim() || undefined,
      supplyChainRole: selectedRole,
      regionCluster: selectedCluster,
      applyToExisting: applyPrefsOnLogin,
      loginHint: cleanHint.includes('@') ? cleanHint : undefined,
      sessionMode: sessionSecurityMode,
    });

    setIsBusy(false);
    if (ok) {
      setPasswordInput('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleEmailFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setStatusMessage('');
    clearAuthError();

    const check = normalizeAndValidateEmail(emailInput);
    if (!check.valid) {
      setLocalError(check.error || 'Enter a valid email address.');
      return;
    }

    setIsBusy(true);
    const payload = {
      email: check.normalizedEmail,
      password: passwordInput,
      displayName: organizationName.trim() || undefined,
      supplyChainRole: selectedRole,
      regionCluster: selectedCluster,
      applyToExisting: applyPrefsOnLogin,
      sessionMode: sessionSecurityMode,
    };

    const ok =
      emailMode === 'signup'
        ? await registerWithEmail(payload)
        : await signInWithEmail(payload);

    setIsBusy(false);
    if (ok) {
      setPasswordInput('');
      setStatusMessage(
        emailMode === 'signup'
          ? 'Account created securely. A verification link has been sent to your email.'
          : 'Authenticated securely.'
      );
    }
  };

  const handlePasswordReset = async () => {
    setLocalError('');
    setStatusMessage('');
    clearAuthError();
    const check = normalizeAndValidateEmail(emailInput);
    if (!check.valid) {
      setLocalError('Enter your registered email ID above first to receive a reset link.');
      return;
    }
    setIsBusy(true);
    const sent = await sendPasswordReset(check.normalizedEmail);
    setIsBusy(false);
    if (sent) {
      setStatusMessage(
        `Password reset instructions sent to ${maskEmailAddress(check.normalizedEmail)}.`
      );
    }
  };

  const handleSendVerification = async () => {
    setIsBusy(true);
    setLocalError('');
    const sent = await sendVerificationEmailToUser();
    setIsBusy(false);
    if (sent) {
      setStatusMessage('Verification link sent. Open your email inbox and click Verify.');
    }
  };

  const handleRefreshVerification = async () => {
    setIsBusy(true);
    setLocalError('');
    const nowVerified = await refreshVerificationState();
    setIsBusy(false);
    if (nowVerified) {
      setStatusMessage('Email verified and synced with Cloud Firestore vault.');
    } else {
      setStatusMessage(
        'Email verification is still pending. Click the link in your inbox, then refresh.'
      );
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
    setRevealSignedInEmail(false);
    await signOutUser();
    setIsBusy(false);
  };

  const handleSessionModeToggle = async (mode: SessionSecurityMode) => {
    await setSessionSecurityPreference(mode);
  };

  return (
    <section
      aria-labelledby="login-portal-heading"
      className="min-h-[calc(100vh-3.5rem)] bg-[#F7F7F2] flex flex-col justify-between"
    >
      <div className="max-w-7xl w-full mx-auto px-6 py-8 lg:py-11 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column: AgriTech Intelligence & Email Privacy Architecture */}
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
                  Open to All Email IDs
                </span>
              </div>

              {/* Clean Unboxed Metadata Strip */}
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
                  Isolated PII Email Vault
                </span>
              </div>

              <h1
                id="login-portal-heading"
                className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white text-balance leading-[1.15]"
              >
                {portalTrack === 'farmer'
                  ? 'Universal Farmer Access With Protected Email Privacy.'
                  : 'Verified APMC Clearing & Multi-Corridor Dispatch Desk.'}
              </h1>

              <p className="mt-3 text-sm sm:text-base text-[#D1FAE5]/85 leading-relaxed max-w-xl tracking-[0.01em]">
                Sign in with any personal, FPO, or enterprise email ID. Your email address is
                masked across shared screens and isolated inside an owner-only Firestore vault that
                blocks cross-user reads and directory scraping.
              </p>

              {/* Live Smart Selling Snapshot */}
              <div className="mt-6 bg-[#16422B]/80 border border-[#276343] rounded-xl p-4 sm:p-5">
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

              {/* 3-Layer Mail User Security Guarantee */}
              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-white/12 text-xs">
                <div>
                  <dt className="font-semibold text-white">01. Split PII Vault</dt>
                  <dd className="mt-1 text-white/75 leading-relaxed">
                    Emails live strictly in <span className="font-mono">/private/info</span> — never
                    on public quotes or dispatches.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">02. Masked Display</dt>
                  <dd className="mt-1 text-white/75 leading-relaxed">
                    Mail IDs render redacted (<span className="font-mono">na••••99@</span>) by
                    default on shared packhouse screens.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">03. Kiosk Session Lock</dt>
                  <dd className="mt-1 text-white/75 leading-relaxed">
                    Shared-device mode purges auth tokens automatically as soon as the tab closes.
                  </dd>
                </div>
              </dl>
            </div>

            {/* Attributable FPO Proof Statement */}
            <figure className="mt-6 pt-5 border-t border-white/12">
              <blockquote className="text-xs sm:text-sm text-white/85 leading-relaxed tracking-[0.01em]">
                “Twenty-eight FPO field coordinators log in from shared mandi kiosks every morning.
                Each member&apos;s email and saved comparisons stay completely private while net
                realization rose ₹380 per quintal.”
              </blockquote>
              <figcaption className="mt-2 text-xs text-[#A7F3D0]">
                <strong className="font-semibold text-white">Ramesh Naidu</strong> · Secretary,
                Rayalaseema Rythu FPO, Anantapur
              </figcaption>
            </figure>
          </div>

          {/* Right Column: Universal Email & Google Login Card */}
          <div className="lg:col-span-6 bg-white border border-[#E2E4DD] rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            {!user ? (
              <div>
                {/* Segmented Portal Track Switcher */}
                <div
                  role="group"
                  aria-label="Select MandILens login portal"
                  className="grid grid-cols-2 gap-1 p-1 bg-[#EFEFE8] rounded-xl mb-5"
                >
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('farmer')}
                    className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap truncate ${
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
                    className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap truncate ${
                      portalTrack === 'partner'
                        ? 'bg-[#0F2F1E] text-white'
                        : 'text-[#4A524D] hover:text-[#161A18]'
                    }`}
                  >
                    Buyer, Fleet &amp; Admin
                  </button>
                </div>

                <div className="mb-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D] mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>All Personal, FPO &amp; Workspace Email IDs Supported</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#161A18]">
                    {emailMode === 'signup'
                      ? 'Create Protected Email Account'
                      : portalTrack === 'farmer'
                      ? 'Sign in to Farmer Intelligence'
                      : 'Sign in to Partner & Dispatch Desk'}
                  </h2>
                </div>

                {/* Instant Universal Google / Workspace OAuth Button */}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleGooglePortalLogin()}
                  className="w-full inline-flex items-center justify-center gap-3 px-5 py-3 text-sm font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] disabled:opacity-60 transition-colors duration-150 whitespace-nowrap"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                      ? 'Connecting Securely...'
                      : 'Continue with Any Google / Workspace Email'}
                  </span>
                </button>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3 text-xs text-[#6E7771]">
                  <div className="h-px flex-1 bg-[#E2E4DD]" />
                  <span>or use direct Email ID &amp; Password</span>
                  <div className="h-px flex-1 bg-[#E2E4DD]" />
                </div>

                {/* Email Mode Switcher: Sign In vs Create Email Account */}
                <div className="flex items-center justify-between gap-2 mb-3.5 text-xs">
                  <div
                    role="group"
                    aria-label="Email authentication mode"
                    className="inline-flex items-center gap-1 p-1 bg-[#EFEFE8] rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode('signin');
                        clearAuthError();
                        setLocalError('');
                      }}
                      className={`px-3 py-1 font-semibold rounded-md transition-colors whitespace-nowrap ${
                        emailMode === 'signin'
                          ? 'bg-white text-[#161A18]'
                          : 'text-[#4A524D] hover:text-[#161A18]'
                      }`}
                    >
                      Sign In with Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode('signup');
                        clearAuthError();
                        setLocalError('');
                      }}
                      className={`px-3 py-1 font-semibold rounded-md transition-colors whitespace-nowrap ${
                        emailMode === 'signup'
                          ? 'bg-white text-[#161A18]'
                          : 'text-[#4A524D] hover:text-[#161A18]'
                      }`}
                    >
                      Create Email Account
                    </button>
                  </div>

                  {emailMode === 'signin' && (
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="font-semibold text-[#15803D] hover:underline underline-offset-4 whitespace-nowrap"
                    >
                      Reset Password
                    </button>
                  )}
                </div>

                {/* Direct Email ID & Password Form */}
                <form onSubmit={handleEmailFormSubmit} className="space-y-3.5" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="login-email-id"
                        className="block text-xs font-semibold text-[#161A18] mb-1"
                      >
                        Email ID (Any Domain)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#7A827C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="login-email-id"
                          type="email"
                          autoComplete="email"
                          maxLength={160}
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="farmer@example.com"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] placeholder:text-[#8A928C] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="login-password"
                          className="text-xs font-semibold text-[#161A18]"
                        >
                          Password
                        </label>
                        {emailMode === 'signup' && passwordInput.length > 0 && (
                          <span
                            className={`text-[11px] font-semibold ${
                              passwordStrength.valid ? 'text-[#15803D]' : 'text-[#B45309]'
                            }`}
                          >
                            {passwordStrength.label}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#7A827C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={
                            emailMode === 'signup' ? 'new-password' : 'current-password'
                          }
                          maxLength={128}
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder={emailMode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                          className="w-full pl-9 pr-9 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] placeholder:text-[#8A928C] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6E7771] hover:text-[#161A18]"
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pre-Sign-In Corridor & Role Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label
                        htmlFor="login-org-name"
                        className="block text-[11px] font-semibold text-[#4A524D] mb-1"
                      >
                        Name / FPO (Optional)
                      </label>
                      <input
                        id="login-org-name"
                        type="text"
                        maxLength={80}
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g. Rythu FPO"
                        className="w-full px-3 py-2 text-xs bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] placeholder:text-[#8A928C] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="login-role-select"
                        className="block text-[11px] font-semibold text-[#4A524D] mb-1"
                      >
                        Supply Chain Role
                      </label>
                      <select
                        id="login-role-select"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as SupplyChainRole)}
                        className="w-full px-2.5 py-2 text-xs bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
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
                        className="block text-[11px] font-semibold text-[#4A524D] mb-1"
                      >
                        Market Corridor
                      </label>
                      <select
                        id="login-cluster-select"
                        value={selectedCluster}
                        onChange={(e) => setSelectedCluster(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                      >
                        {REGION_CLUSTERS.map((cluster) => (
                          <option key={cluster} value={cluster}>
                            {cluster}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Session Security Mode Selector (Protects Mail Users on Shared Devices) */}
                  <div className="p-3 bg-[#FAFBF8] border border-[#E2E4DD] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <p className="text-xs font-semibold text-[#161A18]">
                        Mail Session Protection
                      </p>
                      <p className="text-[11px] text-[#4A524D]">
                        {sessionSecurityMode === 'shared_session_only'
                          ? 'Shared Kiosk Mode: Clears login token immediately when tab closes'
                          : 'Trusted Personal Device: Keeps encrypted session active'}
                      </p>
                    </div>
                    <div
                      role="group"
                      aria-label="Session device security mode"
                      className="inline-flex items-center gap-1 p-0.5 bg-[#EFEFE8] rounded-lg self-start sm:self-auto shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => handleSessionModeToggle('personal_persistent')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                          sessionSecurityMode === 'personal_persistent'
                            ? 'bg-white text-[#161A18]'
                            : 'text-[#4A524D]'
                        }`}
                      >
                        Personal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSessionModeToggle('shared_session_only')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                          sessionSecurityMode === 'shared_session_only'
                            ? 'bg-[#0F2F1E] text-white'
                            : 'text-[#4A524D]'
                        }`}
                      >
                        Shared Kiosk
                      </button>
                    </div>
                  </div>

                  {/* Graceful Seamless Bridge if Native Password Provider Needs Console Activation */}
                  {emailProviderUnavailableFor && (
                    <div
                      role="status"
                      className="p-3.5 bg-[#FEF7E6] border border-[#F3D999] rounded-xl space-y-2.5"
                    >
                      <p className="text-xs font-semibold text-[#92400E]">
                        Instant Sign-In Ready for{' '}
                        <span className="font-mono">
                          {maskEmailAddress(emailProviderUnavailableFor)}
                        </span>
                      </p>
                      <p className="text-xs text-[#78350F] leading-relaxed">
                        Password-based login is currently turned off in your Firebase project
                        settings, so your password was never transmitted. Click below to sign in
                        immediately with <strong className="font-semibold">{emailProviderUnavailableFor}</strong>{' '}
                        via Google&apos;s verified OAuth flow, or enable Email/Password in Firebase
                        Console → Authentication → Sign-in method.
                      </p>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleGooglePortalLogin(emailProviderUnavailableFor)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F2F1E] rounded-lg hover:bg-[#16422B] transition-colors whitespace-nowrap"
                      >
                        <span>
                          Continue Securely with {emailProviderUnavailableFor} →
                        </span>
                      </button>
                    </div>
                  )}

                  {(authError || localError) && (
                    <p
                      className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-2.5"
                      role="alert"
                    >
                      {authError || localError}
                    </p>
                  )}

                  {statusMessage && (
                    <p
                      className="text-xs font-semibold text-[#15803D] bg-[#F2F9F4] border border-[#BBF7D0] rounded-xl px-3.5 py-2.5"
                      role="status"
                    >
                      {statusMessage}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyPrefsOnLogin}
                        onChange={(e) => setApplyPrefsOnLogin(e.target.checked)}
                        className="rounded border-[#D5D9D2] accent-[#0F2F1E]"
                      />
                      <span className="text-xs text-[#4A524D]">
                        Sync role &amp; corridor on login
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isBusy}
                      className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#0F2F1E] bg-[#EFEFE8] border border-[#D5D9D2] rounded-xl hover:bg-[#E2E4DD] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                    >
                      {isBusy
                        ? 'Processing...'
                        : emailMode === 'signup'
                        ? 'Create Email Account →'
                        : 'Sign In with Email →'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Authenticated Session Workspace View with Masked Email Privacy Controls */
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E2E4DD]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>
                        {isAdmin
                          ? 'Verified Market Administrator · Isolated PII Vault'
                          : isEmailVerified
                          ? 'Verified Email Identity · Isolated PII Vault'
                          : 'Protected Session Active · Email Verification Pending'}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-[#161A18] mt-1 truncate">
                      {profile?.displayName || user.displayName || 'MandILens Member'}
                    </h2>

                    {/* Redacted / Masked Email Row with Owner Reveal Toggle */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#4A524D]">
                      <span className="font-mono tabular-nums text-[#161A18] font-medium">
                        {revealSignedInEmail ? user.email : maskEmailAddress(user.email)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRevealSignedInEmail((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] hover:underline whitespace-nowrap"
                      >
                        {revealSignedInEmail ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Mask Email</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Reveal Email</span>
                          </>
                        )}
                      </button>
                      <span aria-hidden="true">·</span>
                      <span>
                        {sessionSecurityMode === 'shared_session_only'
                          ? 'Shared Kiosk Session'
                          : 'Personal Device Session'}
                      </span>
                    </div>
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

                {/* Unverified Email Guidance Banner (Zero Error Experience) */}
                {!isEmailVerified && (
                  <div className="p-3.5 bg-[#FEF7E6] border border-[#F3D999] rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-[#92400E]">
                      Verify your email ID to unlock Cloud Firestore database writes
                    </p>
                    <p className="text-xs text-[#78350F] leading-relaxed">
                      Your dashboard session is active with zero restrictions on market intelligence.
                      To protect database integrity, Firestore rules require verified email ownership
                      before persisting cloud records.
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={handleSendVerification}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F2F1E] rounded-lg hover:bg-[#16422B] whitespace-nowrap"
                      >
                        Send Verification Link
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={handleRefreshVerification}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#161A18] bg-white border border-[#D5D9D2] rounded-lg hover:bg-[#EFEFE8] whitespace-nowrap"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>I&apos;ve Verified — Sync Cloud Vault</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Cloud Sync Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    <p className="text-[11px] text-[#4A524D]">PII Vault State</p>
                    <p className="mt-1 font-display text-sm font-bold text-[#15803D]">
                      {isEmailVerified ? 'Isolated & Locked' : 'Local Shield'}
                    </p>
                  </div>
                </div>

                {/* Workspace Settings Form */}
                <form onSubmit={handleUpdateWorkspaceProfile} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="active-org-name"
                      className="block text-xs font-semibold text-[#161A18] mb-1"
                    >
                      Packhouse / Farm / Enterprise Name (Non-PII Display Label)
                    </label>
                    <input
                      id="active-org-name"
                      type="text"
                      maxLength={80}
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="active-role-select"
                        className="block text-xs font-semibold text-[#161A18] mb-1"
                      >
                        Active Supply Chain Role
                      </label>
                      <select
                        id="active-role-select"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as SupplyChainRole)}
                        className="w-full px-3 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
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
                        className="block text-xs font-semibold text-[#161A18] mb-1"
                      >
                        Default Market Corridor
                      </label>
                      <select
                        id="active-cluster-select"
                        value={selectedCluster}
                        onChange={(e) => setSelectedCluster(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
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

                  {statusMessage && (
                    <p className="text-xs font-semibold text-[#15803D]" role="status">
                      {statusMessage}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                    {saveSuccess ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Workspace preferences saved</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#6E7771]">
                        Email PII is never stored in your workspace profile document
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
                <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="mt-6 pt-4 border-t border-[#E2E4DD] flex flex-wrap items-center justify-between gap-3 text-xs text-[#4A524D]">
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
