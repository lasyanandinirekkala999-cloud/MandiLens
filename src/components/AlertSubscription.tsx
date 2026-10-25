import React, { useEffect, useState } from 'react';
import { CheckCircle2, LogIn } from 'lucide-react';
import { SupplyChainRole, useAuth } from '../context/AuthContext';
import { maskContactString } from '../utils/emailSecurity';
import { LoginPortalTrack } from './LoginPage';

interface AlertSubscriptionProps {
  onOpenAuth: () => void;
  onOpenLoginPortal: (track: LoginPortalTrack) => void;
}

export const AlertSubscription: React.FC<AlertSubscriptionProps> = ({
  onOpenAuth,
  onOpenLoginPortal,
}) => {
  const { user, profile, addCloudSubscription } = useAuth();
  const [role, setRole] = useState<SupplyChainRole>('FPO / Farmer Collective');
  const [commodity, setCommodity] = useState('Tomato, Onion & Horticulture');
  const [region, setRegion] = useState('Andhra Pradesh — Anantapur / Guntur');
  const [contact, setContact] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill defaults from authenticated profile when signed in
  useEffect(() => {
    if (profile) {
      setRole(profile.supplyChainRole);
      setRegion(profile.regionCluster);
      if (!organization) {
        setOrganization(profile.displayName);
      }
    }
    if (user?.email && !contact) {
      setContact(user.email);
    }
  }, [profile, user]);

  const validateContact = (val: string) => {
    const trimmed = val.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+91[\s-]?)?[6-9]\d{9}$/;
    return emailRegex.test(trimmed) || phoneRegex.test(trimmed.replace(/\s+/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (organization.trim().length < 2) {
      setError('Enter your FPO, farm, or company name (at least 2 characters).');
      return;
    }
    if (!validateContact(contact)) {
      setError('Enter a valid 10-digit Indian mobile number or work email address.');
      return;
    }

    setError('');
    if (user) {
      setIsSaving(true);
      try {
        await addCloudSubscription({
          organization: organization.trim(),
          supplyChainRole: role,
          commodityGroup: commodity,
          regionCluster: region,
          contact: contact.trim(),
        });
        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save alert digest.');
      } finally {
        setIsSaving(false);
      }
    } else {
      setSubmitted(true);
    }
  };

  return (
    <>
      <section id="alerts" className="py-14 lg:py-20 bg-[#F7F7F2] border-b border-[#E2E4DD] no-print">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white border border-[#E2E4DD] rounded-2xl p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D] mb-2">
                <span>07:30 AM Morning Dispatch Brief</span>
                <span aria-hidden="true" className="text-[#8A928C]">·</span>
                <span className="text-[#4A524D] font-medium">Zero Broker Spam</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#161A18]">
                Receive verified mandi clearing sheets and freight spreads daily
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#4A524D] leading-relaxed">
                Subscribe your FPO packhouse or procurement desk to morning gate arrival alerts,
                modal auction closes, and interstate freight rate updates tailored to your crop
                corridor.
              </p>

              <dl className="mt-6 pt-6 border-t border-[#E2E4DD] grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <dt className="font-semibold text-[#161A18]">Morning Gate Bulletin</dt>
                  <dd className="text-[#4A524D] mt-0.5">
                    Inward truck tallies before first open-outcry bid
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#161A18]">Closing Parity Sheet</dt>
                  <dd className="text-[#4A524D] mt-0.5">
                    Grade-wise modal rates &amp; net farmgate spreads
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-6">
              {submitted ? (
                <div className="p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2.5 text-green-800 font-semibold text-base">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>
                      {user
                        ? 'Corridor Price Digest Synced to Account'
                        : 'Corridor Price Digest Activated'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                    Daily auction sheets for <strong className="text-slate-900">{commodity}</strong>{' '}
                    in <strong className="text-slate-900">{region}</strong> will be delivered to{' '}
                    <span className="font-mono tabular-nums font-medium text-slate-900">
                      {maskContactString(contact)}
                    </span>{' '}
                    (masked for privacy) starting at 07:30 AM IST tomorrow.
                  </p>
                  <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span>Organization: {organization}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                      }}
                      className="font-semibold text-green-800 hover:underline whitespace-nowrap"
                    >
                      Register Another Corridor
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="sub-role"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Supply Chain Role
                      </label>
                      <select
                        id="sub-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as SupplyChainRole)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-green-800"
                      >
                        <option value="FPO / Farmer Collective">FPO / Farmer Collective</option>
                        <option value="Independent Grower">Independent Grower</option>
                        <option value="Commodity Buyer / Processor">
                          Commodity Buyer / Processor
                        </option>
                        <option value="Cold Chain & Transport Fleet">
                          Cold Chain &amp; Transport Fleet
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="sub-crop"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Primary Commodity Group
                      </label>
                      <select
                        id="sub-crop"
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-green-800"
                      >
                        <option value="Tomato, Onion & Horticulture">
                          Tomato, Onion &amp; Horticulture
                        </option>
                        <option value="Wheat & Milling Cereals">Wheat &amp; Milling Cereals</option>
                        <option value="Soybean & Oilseeds">Soybean &amp; Oilseeds</option>
                        <option value="Tur, Chana & Pulses">Tur, Chana &amp; Pulses</option>
                        <option value="Turmeric, Chilli & Spices">
                          Turmeric, Chilli &amp; Spices
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="sub-org"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        FPO / Farm / Enterprise Name
                      </label>
                      <input
                        id="sub-org"
                        type="text"
                        maxLength={100}
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g. Sahyadri Krishi FPO"
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-green-800"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="sub-region"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Primary Market Cluster
                      </label>
                      <select
                        id="sub-region"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-green-800"
                      >
                        <option value="Andhra Pradesh — Anantapur / Guntur">
                          Andhra Pradesh — Anantapur / Guntur
                        </option>
                        <option value="Maharashtra — Nashik / Pune">
                          Maharashtra — Nashik / Pune
                        </option>
                        <option value="Madhya Pradesh — Indore / Sehore">
                          Madhya Pradesh — Indore / Sehore
                        </option>
                        <option value="Karnataka — Kolar / Kalaburagi">
                          Karnataka — Kolar / Kalaburagi
                        </option>
                        <option value="Punjab & Haryana — Grain Belt">
                          Punjab &amp; Haryana — Grain Belt
                        </option>
                        <option value="Gujarat & Rajasthan — West Corridor">
                          Gujarat &amp; Rajasthan — West Corridor
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="sub-contact"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Mobile Number (10-digit) or Work Email
                    </label>
                    <input
                      id="sub-contact"
                      type="text"
                      maxLength={160}
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="e.g. 9823012345 or procurement@fpo.org"
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-green-800"
                    />
                  </div>

                  {error && (
                    <p className="text-xs font-medium text-red-700" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 text-sm font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] disabled:opacity-60 transition-colors duration-150 whitespace-nowrap"
                    >
                      {isSaving ? 'Saving Digest...' : 'Subscribe to Daily Mandi Sheet'}
                    </button>

                    {!user && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onOpenLoginPortal('farmer')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#161A18] hover:text-[#15803D] whitespace-nowrap"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Farmer Login Page</span>
                        </button>
                        <span aria-hidden="true" className="text-[#8A928C] text-xs">
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={onOpenAuth}
                          className="text-xs font-medium text-[#4A524D] hover:text-[#0F2F1E] whitespace-nowrap"
                        >
                          Quick Sign-In
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white py-10 no-print">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <a
              href="#"
              className="font-display text-lg font-bold tracking-tight text-[#0F2F1E] whitespace-nowrap"
            >
              Mand<span className="text-[#16A34A]">I</span>Lens
            </a>
            <p className="mt-1 text-xs text-[#4A524D] max-w-md">
              From Market Price to Smart Selling Decision — AI-powered agricultural market
              intelligence helping farmers maximize net profit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#4A524D]">
            <a href="#dashboard" className="hover:text-[#0F2F1E] whitespace-nowrap">
              Smart Decision
            </a>
            <a href="#price-dashboard" className="hover:text-[#0F2F1E] whitespace-nowrap">
              Price Dashboard
            </a>
            <a href="#comparison-calculator" className="hover:text-[#0F2F1E] whitespace-nowrap">
              Comparison Calculator
            </a>
            <a href="#price-intelligence" className="hover:text-[#0F2F1E] whitespace-nowrap">
              Price Intelligence
            </a>
            <a href="#ai-advisor" className="hover:text-[#0F2F1E] whitespace-nowrap">
              AI Advisor
            </a>
            <a href="#reports" className="hover:text-[#0F2F1E] whitespace-nowrap">
              Reports
            </a>
            <button
              type="button"
              onClick={() => onOpenLoginPortal('farmer')}
              className="hover:text-[#0F2F1E] cursor-pointer whitespace-nowrap"
            >
              Farmer Login
            </button>
            <button
              type="button"
              onClick={() => onOpenLoginPortal('partner')}
              className="hover:text-[#0F2F1E] cursor-pointer whitespace-nowrap"
            >
              Partner Login
            </button>
            <span className="text-[#8A928C] whitespace-nowrap">
              © {new Date().getFullYear()} MandILens AgriTech
            </span>
          </div>
        </div>
      </footer>
    </>
  );
};
