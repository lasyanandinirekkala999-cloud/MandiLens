/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MandiBoard } from './components/MandiBoard';
import { ArbitrageCalculator } from './components/ArbitrageCalculator';
import { SupplyChainSection } from './components/SupplyChainSection';
import { AlertSubscription } from './components/AlertSubscription';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  ARBITRAGE_CORRIDORS,
  INITIAL_MANDI_RECORDS,
  MandiLotRecord,
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6">
            <h1 className="font-display text-lg font-bold text-slate-900">
              Unable to complete data request
            </h1>
            <p className="mt-2 text-xs text-slate-600 break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900"
            >
              Reload MandiLens
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MandiLensShell() {
  const {
    user,
    cloudWatchlistIds,
    cloudFieldQuotes,
    toggleCloudWatchlist,
  } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);

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
        : ['lot-lasalgaon-onion', 'lot-indore-soybean'];
    } catch {
      return ['lot-lasalgaon-onion', 'lot-indore-soybean'];
    }
  });

  const [externalSearchQuery, setExternalSearchQuery] = useState<string>('');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    ARBITRAGE_CORRIDORS[0].id
  );

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

  // Merge cloud-persisted quotes (when signed in) + session quotes + indexed APMC records
  const activeSavedIds = user ? cloudWatchlistIds : localSavedIds;
  const allRecords = [
    ...(user ? cloudFieldQuotes : []),
    ...localCustomRecords,
    ...INITIAL_MANDI_RECORDS,
  ];

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />
      <main className="flex-1">
        <HeroSection
          onQuickSearch={(q) => setExternalSearchQuery(q)}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
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
          onCorridorChange={(corridorId) => {
            setComparedIds([]);
            setSelectedCorridorId(corridorId);
          }}
        />
        <SupplyChainSection />
        <AlertSubscription onOpenAuth={() => setAuthModalOpen(true)} />
      </main>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
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
