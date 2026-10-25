import React, { useEffect, useState } from 'react';
import { CheckCircle2, LogIn, LogOut, Trash2, UserCheck, X } from 'lucide-react';
import {
  SUPPLY_CHAIN_ROLES,
  SupplyChainRole,
  useAuth,
} from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REGION_CLUSTERS = [
  'Maharashtra — Nashik / Pune',
  'Madhya Pradesh — Indore / Sehore',
  'Karnataka — Kolar / Kalaburagi',
  'Punjab & Haryana — Grain Belt',
  'Gujarat & Rajasthan — West Corridor',
  'Andhra Pradesh & Telangana — Spice Corridor',
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    profile,
    cloudWatchlistIds,
    cloudFieldQuotes,
    cloudSubscriptions,
    authError,
    signInWithGoogle,
    signOutUser,
    updateUserProfile,
    deleteCloudFieldQuote,
    deleteCloudSubscription,
    clearAuthError,
  } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<SupplyChainRole>('FPO / Farmer Collective');
  const [regionCluster, setRegionCluster] = useState(REGION_CLUSTERS[0]);
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

  const handleGoogleSignIn = async () => {
    setIsBusy(true);
    setLocalError('');
    clearAuthError();
    await signInWithGoogle();
    setIsBusy(false);
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
    await signOutUser();
    setIsBusy(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mandilens-auth-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {user ? 'Authenticated Member Workspace' : 'MandiLens Account Access'}
            </p>
            <h2
              id="mandilens-auth-title"
              className="font-display text-lg font-bold text-slate-900 mt-0.5"
            >
              {user ? 'Supply Chain Profile & Cloud Sync' : 'Sign in to MandiLens'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!user ? (
            <div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Authenticate with your Google account to persist APMC mandi watchlists across
                packhouse devices, publish verified field auction quotes, and manage daily
                07:30 AM corridor price digests.
              </p>

              <dl className="mt-5 divide-y divide-slate-100 border-y border-slate-200 text-xs sm:text-sm">
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-800">Cloud Mandi Watchlist</dt>
                  <dd className="text-slate-500">Real-time sync across devices</dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-800">Verified Field Quotes</dt>
                  <dd className="text-slate-500">Attributed gate auction logging</dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-800">Corridor Digest Management</dt>
                  <dd className="text-slate-500">Saved regional alert subscriptions</dd>
                </div>
              </dl>

              {(authError || localError) && (
                <p className="mt-4 text-xs font-medium text-red-700" role="alert">
                  {authError || localError}
                </p>
              )}

              <button
                type="button"
                disabled={isBusy}
                onClick={handleGoogleSignIn}
                className="mt-6 w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>{isBusy ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Signed-In Identity Summary */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-800">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Google Verified Session</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                    <span>{cloudWatchlistIds.length} Watchlist Lots</span>
                    <span aria-hidden="true">·</span>
                    <span>{cloudFieldQuotes.length} Field Quotes</span>
                    <span aria-hidden="true">·</span>
                    <span>{cloudSubscriptions.length} Alert Digests</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Editable Supply Chain Profile Form */}
              <form onSubmit={handleProfileSave} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Member / Packhouse Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-green-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="profile-role"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Supply Chain Role
                    </label>
                    <select
                      id="profile-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as SupplyChainRole)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-green-800"
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
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Default Market Cluster
                    </label>
                    <select
                      id="profile-cluster"
                      value={regionCluster}
                      onChange={(e) => setRegionCluster(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-green-800"
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
                  <p className="text-xs font-medium text-red-700" role="alert">
                    {localError || authError}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  {saveSuccess ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Profile synced to Firestore</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Synced privately to your MandiLens account
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>

              {/* Cloud-Synced Field Quotes Management */}
              {cloudFieldQuotes.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">
                    Your Logged Field Quotes ({cloudFieldQuotes.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 text-xs">
                    {cloudFieldQuotes.map((q) => (
                      <li key={q.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900">{q.commodity}</span>
                          <span className="text-slate-500">
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
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cloud-Synced Alert Subscriptions Management */}
              {cloudSubscriptions.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">
                    Active Daily Price Digests ({cloudSubscriptions.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 text-xs">
                    {cloudSubscriptions.map((sub) => (
                      <li key={sub.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-slate-900">
                            {sub.commodityGroup}
                          </span>
                          <span className="text-slate-500"> · {sub.regionCluster}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteCloudSubscription(sub.id)}
                          aria-label={`Cancel digest for ${sub.commodityGroup}`}
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded transition-colors shrink-0"
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
