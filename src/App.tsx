/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SmartDecisionOverview } from './components/SmartDecisionOverview';
import { MandiBoard } from './components/MandiBoard';
import { ArbitrageCalculator } from './components/ArbitrageCalculator';
import { PriceIntelligenceSection } from './components/PriceIntelligenceSection';
import { AiAdvisorSection } from './components/AiAdvisorSection';
import { DecisionReportBanner } from './components/DecisionReportBanner';
import { DatabaseSecuritySection } from './components/DatabaseSecuritySection';
import { AlertSubscription } from './components/AlertSubscription';
import { AuthModal } from './components/AuthModal';
import { LoginPage, LoginPortalTrack } from './components/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  ARBITRAGE_CORRIDORS,
  computeSmartSellingDecision,
  INITIAL_MANDI_RECORDS,
  MandiLotRecord,
  SmartCropId,
  SmartLocationId,
} from './data/mandiData';

const WATCHLIST_STORAGE_KEY = 'mandilens_saved_watchlist_v1';
const CUSTOM_LOTS_STORAGE_KEY = 'mandilens_custom_lots_v1';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unexpected application error.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F7F2] p-6">
          <div className="max-w-md w-full bg-white border border-[#E2E4DD] rounded-2xl p-6">
            <h1 className="font-display text-lg font-bold text-[#161A18]">
              Unable to complete data request
            </h1>
            <p className="mt-2 text-xs text-[#4A524D] break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#0F2F1E] rounded-lg hover:bg-[#16422B]"
            >
              Reload MandILens
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function resolveInitialLoginState(): {
  view: 'platform' | 'login';
  track: LoginPortalTrack;
} {
  if (typeof window === 'undefined') {
    return { view: 'platform', track: 'farmer' };
  }
  const hash = window.location.hash.toLowerCase();
  if (hash === '#partner-login') {
    return { view: 'login', track: 'partner' };
  }
  if (hash === '#login' || hash === '#farmer-login') {
    return { view: 'login', track: 'farmer' };
  }
  return { view: 'platform', track: 'farmer' };
}

function MandiLensShell() {
  const {
    user,
    publishedMandiLots,
    cloudWatchlistIds,
    cloudFieldQuotes,
    toggleCloudWatchlist,
  } = useAuth();

  const initialRoute = useMemo(() => resolveInitialLoginState(), []);
  const [activeView, setActiveView] = useState<'platform' | 'login'>(initialRoute.view);
  const [loginPortalTrack, setLoginPortalTrack] = useState<LoginPortalTrack>(
    initialRoute.track
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Sync browser hash navigation (#login, #partner-login) with dedicated Login Page
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#partner-login') {
        setLoginPortalTrack('partner');
        setActiveView('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (hash === '#login' || hash === '#farmer-login') {
        setLoginPortalTrack('farmer');
        setActiveView('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (hash.startsWith('#') && hash.length > 1) {
        setActiveView('platform');
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleOpenLoginPage = (track: LoginPortalTrack = 'farmer') => {
    setLoginPortalTrack(track);
    setActiveView('login');
    const nextHash = track === 'partner' ? '#partner-login' : '#login';
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnToPlatform = (targetSectionId?: string) => {
    setActiveView('platform');
    if (targetSectionId) {
      window.history.pushState(null, '', `#${targetSectionId}`);
      requestAnimationFrame(() => {
        setTimeout(() => {
          document
            .getElementById(targetSectionId)
            ?.scrollIntoView({ behavior: 'smooth' });
        }, 40);
      });
    } else {
      window.history.pushState(null, '', window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Core Smart Selling Decision State (Defaults to Anantapur, Andhra Pradesh | Tomato | 20 Quintals)
  const [location, setLocation] = useState<SmartLocationId>('Anantapur, Andhra Pradesh');
  const [crop, setCrop] = useState<SmartCropId>('Tomato');
  const [quantityQtl, setQuantityQtl] = useState<number>(20);
  const [advisorPromptRequest, setAdvisorPromptRequest] = useState<{
    id: number;
    question: string;
  } | null>(null);

  const decision = useMemo(
    () => computeSmartSellingDecision(location, crop, quantityQtl),
    [location, crop, quantityQtl]
  );

  const [localCustomRecords, setLocalCustomRecords] = useState<MandiLotRecord[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_LOTS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MandiLotRecord[]) : [];
    } catch {
      return [];
    }
  });

  const [localSavedIds, setLocalSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return raw
        ? (JSON.parse(raw) as string[])
        : ['lot-anantapur-mandi-a-tomato', 'lot-lasalgaon-onion'];
    } catch {
      return ['lot-anantapur-mandi-a-tomato', 'lot-lasalgaon-onion'];
    }
  });

  const [externalSearchQuery, setExternalSearchQuery] = useState<string>('');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    ARBITRAGE_CORRIDORS[0].id
  );

  // Sync comparison corridor when Smart Decision crop changes
  useEffect(() => {
    setSelectedCorridorId(decision.corridorId);
  }, [decision.corridorId]);

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(localSavedIds));
    } catch {
      // Ignore storage quota errors in restricted frames
    }
  }, [localSavedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_LOTS_STORAGE_KEY, JSON.stringify(localCustomRecords));
    } catch {
      // Ignore storage quota errors in restricted frames
    }
  }, [localCustomRecords]);

  // Deduplicate and merge shared Firestore /mandiLots + owner field quotes + local quotes + reference APMC records
  const activeSavedIds = user ? cloudWatchlistIds : localSavedIds;
  const allRecords = useMemo(() => {
    const seen = new Set<string>();
    const combined: MandiLotRecord[] = [];
    const sources = [
      ...publishedMandiLots,
      ...(user ? cloudFieldQuotes : []),
      ...localCustomRecords,
      ...INITIAL_MANDI_RECORDS,
    ];

    for (const item of sources) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
    return combined;
  }, [publishedMandiLots, user, cloudFieldQuotes, localCustomRecords]);

  const handleToggleSave = (id: string) => {
    if (user) {
      void toggleCloudWatchlist(id);
      return;
    }
    setLocalSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleCompare = (id: string) => {
    setComparedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleJumpToCompare = () => {
    document
      .getElementById('comparison-calculator')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddFieldQuote = (newRecord: MandiLotRecord) => {
    setLocalCustomRecords((prev) => [newRecord, ...prev]);
  };

  const handleApplyHeroPreset = (
    nextLocation: SmartLocationId,
    nextCrop: SmartCropId,
    nextQty: number
  ) => {
    setLocation(nextLocation);
    setCrop(nextCrop);
    setQuantityQtl(nextQty);
    setExternalSearchQuery('');
  };

  const handleAskAdvisorFromDashboard = (question?: string) => {
    const q =
      question ||
      `Why should I sell my ${quantityQtl} quintals of ${crop} at ${decision.bestMarketCode} today?`;
    setAdvisorPromptRequest({ id: Date.now(), question: q });
    document.getElementById('ai-advisor')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F2] text-[#161A18]">
      <Navbar
        isLoginView={activeView === 'login'}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenLoginPage={handleOpenLoginPage}
        onNavigateSection={handleReturnToPlatform}
      />

      {activeView === 'login' ? (
        <main className="flex-1">
          <LoginPage
            initialPortal={loginPortalTrack}
            onReturnToPlatform={handleReturnToPlatform}
            onOpenQuickModal={() => setAuthModalOpen(true)}
          />
        </main>
      ) : (
        <main className="flex-1">
          {/* Landing Hero with Instant Mandi Price Search & Smart Selling Decision Preview */}
          <HeroSection
            onApplyPreset={handleApplyHeroPreset}
            onQuickSearch={(query) => setExternalSearchQuery(query)}
            onOpenLoginPortal={handleOpenLoginPage}
          />

          {/* Main Dashboard (#dashboard): Selector, Top 4 KPI Cards, AI Recommendation Centerpiece & View Why Waterfall */}
          <SmartDecisionOverview
            location={location}
            crop={crop}
            quantityQtl={quantityQtl}
            decision={decision}
            onChangeLocation={setLocation}
            onChangeCrop={setCrop}
            onChangeQuantity={setQuantityQtl}
            onOpenAuth={() => setAuthModalOpen(true)}
            onAskAdvisor={handleAskAdvisorFromDashboard}
          />

          {/* Searchable Price Dashboard (#price-dashboard) + Mandi Comparison Calculator (#comparison-calculator) */}
          <MandiBoard
            records={allRecords}
            externalSearchQuery={externalSearchQuery}
            savedIds={activeSavedIds}
            comparedIds={comparedIds}
            onToggleSave={handleToggleSave}
            onToggleCompare={handleToggleCompare}
            onClearCompare={() => setComparedIds([])}
            onJumpToCompare={handleJumpToCompare}
            onAddFieldQuote={handleAddFieldQuote}
            onSelectCorridor={(corridorId) => {
              setComparedIds([]);
              setSelectedCorridorId(corridorId);
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
          <ArbitrageCalculator
            allRecords={allRecords}
            comparedLotIds={comparedIds}
            selectedCorridorId={selectedCorridorId}
            externalLotQtl={quantityQtl}
            onCorridorChange={(corridorId) => {
              setComparedIds([]);
              setSelectedCorridorId(corridorId);
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
          />

          {/* Price Intelligence (#price-intelligence): 7-Day Clearing + 72h Forecast & Sell Today vs Hold 48h */}
          <PriceIntelligenceSection decision={decision} />

          {/* AI Advisor (#ai-advisor): Server-Side Gemini 3.8 Flash Selling Economist */}
          <AiAdvisorSection
            decision={decision}
            externalPromptRequest={advisorPromptRequest}
          />

          {/* Reports & Dispatch Ledger (#reports): Printable Slip, CSV Export, Firestore Ledger & Daily Alerts */}
          <DecisionReportBanner decision={decision} />
          <DatabaseSecuritySection onOpenAuth={() => setAuthModalOpen(true)} />
          <AlertSubscription
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenLoginPortal={handleOpenLoginPage}
          />
        </main>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSwitchToFullLoginPage={() => handleOpenLoginPage('farmer')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <MandiLensShell />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
