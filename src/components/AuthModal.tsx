import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  SUPPLY_CHAIN_ROLES,
  SupplyChainRole,
  useAuth,
} from '../context/AuthContext';
import {
  maskContactString,
  maskEmailAddress,
  normalizeAndValidateEmail,
} from '../utils/emailSecurity';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToFullLoginPage?: () => void;
}

const REGION_CLUSTERS = [
  'Andhra Pradesh — Anantapur / Guntur',
  'Karnataka — Kolar / Kalaburagi',
  'Maharashtra — Nashik / Pune',
  'Madhya Pradesh — Indore / Sehore',
  'Punjab & Haryana — Grain Belt',
  'Gujarat & Rajasthan — West Corridor',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSwitchToFullLoginPage,
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
    signOutUser,
    updateUserProfile,
    deleteCloudFieldQuote,
    deleteCloudSubscription,
    clearAuthError,
  } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<SupplyChainRole>('FPO / Farmer Collective');
  const [regionCluster, setRegionCluster] = useState(REGION_CLUSTERS[0]);

  const [quickEmailMode, setQuickEmailMode] = useState<'signin' | 'signup'>('signin');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPassword, setQuickPassword] = useState('');
  const [revealEmail, setRevealEmail] = useState(false);

  const [isBusy, setIsBusy] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setRole(profile.supplyChainRole);
      setRegionCluster(profile.regionCluster);
    }
  }, [profile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async (hint?: string) => {
    setIsBusy(true);
    setLocalError('');
    clearAuthError();
    const ok = await signInWithGoogle({
      loginHint: hint || (quickEmail.includes('@') ? quickEmail.trim() : undefined),
      sessionMode: sessionSecurityMode,
    });
    setIsBusy(false);
    if (ok) {
      setQuickPassword('');
    }
  };

  const handleQuickEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();
    const check = normalizeAndValidateEmail(quickEmail);
    if (!check.valid) {
      setLocalError(check.error || 'Enter a valid email ID.');
      return;
    }

    setIsBusy(true);
    const ok =
      quickEmailMode === 'signup'
        ? await registerWithEmail({
            email: check.normalizedEmail,
            password: quickPassword,
            sessionMode: sessionSecurityMode,
          })
        : await signInWithEmail({
            email: check.normalizedEmail,
            password: quickPassword,
            sessionMode: sessionSecurityMode,
          });
    setIsBusy(false);
    if (ok) {
      setQuickPassword('');
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSaveSuccess(false);

    if (!displayName.trim()) {
      setLocalError('Display name is required.');
      return;
    }

    setIsBusy(true);
    try {
      await updateUserProfile({
        displayName,
        supplyChainRole: role,
        regionCluster,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    setRevealEmail(false);
    await signOutUser();
    setIsBusy(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#161A18]/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mandilens-auth-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-[#E2E4DD] rounded-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E4DD] flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#15803D]">
              {user ? 'MandILens Protected Account Vault' : 'Universal Email & Google Access'}
            </p>
            <h2
              id="mandilens-auth-title"
              className="font-display text-lg font-bold text-[#161A18] mt-0.5"
            >
              {user ? 'Farmer Profile & PII Privacy Controls' : 'Sign in to MandILens'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#4A524D] hover:text-[#161A18] hover:bg-[#EFEFE8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!user ? (
            <div>
              <p className="text-sm text-[#4A524D] leading-relaxed">
                Sign in with any personal, FPO, or enterprise email ID. Email addresses are
                redacted on shared screens and isolated inside your owner-only{' '}
                <span className="font-mono text-xs">/private/info</span> vault.
              </p>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleGoogleSignIn()}
                className="mt-4 w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <LogIn className="w-4 h-4 text-[#4ADE80]" />
                <span>
                  {isBusy ? 'Connecting Securely...' : 'Continue with Any Google / Workspace Email'}
                </span>
              </button>

              <div className="my-4 flex items-center gap-3 text-xs text-[#6E7771]">
                <div className="h-px flex-1 bg-[#E2E4DD]" />
                <span>or Email ID &amp; Password</span>
                <div className="h-px flex-1 bg-[#E2E4DD]" />
              </div>

              <form onSubmit={handleQuickEmailSubmit} className="space-y-3" noValidate>
                <div className="inline-flex items-center gap-1 p-1 bg-[#EFEFE8] rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickEmailMode('signin');
                      clearAuthError();
                      setLocalError('');
                    }}
                    className={`px-2.5 py-1 font-semibold rounded-md ${
                      quickEmailMode === 'signin' ? 'bg-white text-[#161A18]' : 'text-[#4A524D]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickEmailMode('signup');
                      clearAuthError();
                      setLocalError('');
                    }}
                    className={`px-2.5 py-1 font-semibold rounded-md ${
                      quickEmailMode === 'signup' ? 'bg-white text-[#161A18]' : 'text-[#4A524D]'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    autoComplete="email"
                    maxLength={160}
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    placeholder="Email ID (any domain)"
                    aria-label="Email address"
                    className="w-full px-3 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                  />
                  <input
                    type="password"
                    autoComplete={quickEmailMode === 'signup' ? 'new-password' : 'current-password'}
                    maxLength={128}
                    value={quickPassword}
                    onChange={(e) => setQuickPassword(e.target.value)}
                    placeholder={quickEmailMode === 'signup' ? 'Password (8+ chars)' : 'Password'}
                    aria-label="Password"
                    className="w-full px-3 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                  />
                </div>

                {emailProviderUnavailableFor && (
                  <div className="p-3 bg-[#FEF7E6] border border-[#F3D999] rounded-xl space-y-2">
                    <p className="text-xs text-[#78350F]">
                      Continue immediately with{' '}
                      <strong className="font-semibold">{emailProviderUnavailableFor}</strong> via
                      verified Google OAuth:
                    </p>
                    <button
                      type="button"
                      onClick={() => handleGoogleSignIn(emailProviderUnavailableFor)}
                      className="w-full py-2 text-xs font-semibold text-white bg-[#0F2F1E] rounded-lg hover:bg-[#16422B]"
                    >
                      Continue with {emailProviderUnavailableFor} →
                    </button>
                  </div>
                )}

                {(authError || localError) && (
                  <p className="text-xs font-semibold text-[#DC2626]" role="alert">
                    {authError || localError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full py-2.5 text-xs font-semibold text-[#0F2F1E] bg-[#EFEFE8] border border-[#D5D9D2] rounded-xl hover:bg-[#E2E4DD] transition-colors"
                >
                  {quickEmailMode === 'signup'
                    ? 'Create Protected Email Account'
                    : 'Sign In with Email ID'}
                </button>
              </form>

              {onSwitchToFullLoginPage && (
                <div className="mt-4 pt-3.5 border-t border-[#E2E4DD] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToFullLoginPage();
                    }}
                    className="text-xs font-semibold text-[#15803D] hover:text-[#0F2F1E] hover:underline underline-offset-4 whitespace-nowrap"
                  >
                    Open Full-Screen Farmer &amp; Partner Login Page →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Signed-In Identity Summary with Masked Email Protection */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E2E4DD]">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isAdmin
                        ? 'Verified · Market Administrator'
                        : isEmailVerified
                        ? 'Verified · Isolated PII Vault'
                        : 'Protected Session · Verify Email for Cloud Writes'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-mono tabular-nums font-semibold text-[#161A18] truncate">
                      {revealEmail ? user.email : maskEmailAddress(user.email)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setRevealEmail((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] hover:underline shrink-0"
                    >
                      {revealEmail ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Mask</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Reveal</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A524D] mt-1 font-mono tabular-nums">
                    <span>{cloudWatchlistIds.length} Watchlist</span>
                    <span aria-hidden="true">·</span>
                    <span>{savedComparisons.length} Comparisons</span>
                    <span aria-hidden="true">·</span>
                    <span>{procurementOrders.length} Dispatches</span>
                    <span aria-hidden="true">·</span>
                    <span>{cloudSubscriptions.length} Digests</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#161A18] bg-[#EFEFE8] rounded-xl hover:bg-[#E2E4DD] transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Session Security Toggle */}
              <div className="p-3 bg-[#FAFBF8] border border-[#E2E4DD] rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#161A18]">
                  <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
                  <span>
                    {sessionSecurityMode === 'shared_session_only'
                      ? 'Shared Kiosk Session (Auto-Purge)'
                      : 'Personal Device Session'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSessionSecurityPreference(
                      sessionSecurityMode === 'shared_session_only'
                        ? 'personal_persistent'
                        : 'shared_session_only'
                    )
                  }
                  className="text-xs font-semibold text-[#15803D] hover:underline whitespace-nowrap"
                >
                  Switch Mode
                </button>
              </div>

              {/* Editable Supply Chain Profile Form */}
              <form onSubmit={handleProfileSave} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold text-[#161A18] mb-1"
                  >
                    Member / Packhouse Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="profile-role"
                      className="block text-xs font-semibold text-[#161A18] mb-1"
                    >
                      Supply Chain Role
                    </label>
                    <select
                      id="profile-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as SupplyChainRole)}
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
                      htmlFor="profile-cluster"
                      className="block text-xs font-semibold text-[#161A18] mb-1"
                    >
                      Default Market Cluster
                    </label>
                    <select
                      id="profile-cluster"
                      value={regionCluster}
                      onChange={(e) => setRegionCluster(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAFBF8] border border-[#D5D9D2] rounded-xl text-[#161A18] focus:outline-none focus:bg-white focus:border-[#0F2F1E]"
                    >
                      {REGION_CLUSTERS.map((c) => (
                        <option key={c} value={c}>
                          {c}
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

                <div className="flex items-center justify-between gap-3 pt-1">
                  {saveSuccess ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Profile saved</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#6E7771]">
                      Zero email PII stored on public profile
                    </span>
                  )}

                  <div className="flex items-center gap-3 shrink-0">
                    {onSwitchToFullLoginPage && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSwitchToFullLoginPage();
                        }}
                        className="text-xs font-semibold text-[#15803D] hover:underline underline-offset-4 whitespace-nowrap"
                      >
                        Full Portal
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </form>

              {/* Cloud-Synced Field Quotes Management */}
              {cloudFieldQuotes.length > 0 && (
                <div className="pt-4 border-t border-[#E2E4DD]">
                  <h3 className="text-xs font-semibold text-[#161A18] mb-2">
                    Your Logged Field Quotes ({cloudFieldQuotes.length})
                  </h3>
                  <ul className="divide-y divide-[#E2E4DD] text-xs">
                    {cloudFieldQuotes.map((q) => (
                      <li key={q.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-[#161A18]">{q.commodity}</span>
                          <span className="text-[#4A524D]">
                            {' '}
                            · {q.mandi} ·{' '}
                            <span className="font-mono tabular-nums">
                              ₹{q.modalPrice.toLocaleString('en-IN')}/qtl
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteCloudFieldQuote(q.id)}
                          aria-label={`Delete field quote for ${q.commodity} at ${q.mandi}`}
                          className="p-1.5 text-[#6E7771] hover:text-[#DC2626] rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cloud-Synced Alert Subscriptions Management (With Masked Contact PII) */}
              {cloudSubscriptions.length > 0 && (
                <div className="pt-4 border-t border-[#E2E4DD]">
                  <h3 className="text-xs font-semibold text-[#161A18] mb-2">
                    Active Daily Price Digests ({cloudSubscriptions.length})
                  </h3>
                  <ul className="divide-y divide-[#E2E4DD] text-xs">
                    {cloudSubscriptions.map((sub) => (
                      <li key={sub.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-[#161A18]">
                            {sub.commodityGroup}
                          </span>
                          <span className="text-[#4A524D]">
                            {' '}
                            · {maskContactString(sub.contact)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteCloudSubscription(sub.id)}
                          aria-label={`Cancel digest for ${sub.commodityGroup}`}
                          className="p-1.5 text-[#6E7771] hover:text-[#DC2626] rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
