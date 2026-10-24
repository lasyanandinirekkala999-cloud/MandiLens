/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MandiBoard } from './components/MandiBoard';
import { ArbitrageCalculator } from './components/ArbitrageCalculator';
import { SupplyChainSection } from './components/SupplyChainSection';
import { AlertSubscription } from './components/AlertSubscription';
import {
  ARBITRAGE_CORRIDORS,
  INITIAL_MANDI_RECORDS,
  MandiLotRecord,
} from './data/mandiData';

const WATCHLIST_STORAGE_KEY = 'mandilens_saved_watchlist_v1';
const CUSTOM_LOTS_STORAGE_KEY = 'mandilens_custom_lots_v1';

export default function App() {
  const [customRecords, setCustomRecords] = useState<MandiLotRecord[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_LOTS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MandiLotRecord[]) : [];
    } catch {
      return [];
    }
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return raw
        ? (JSON.parse(raw) as string[])
        : ['lot-lasalgaon-onion', 'lot-indore-soybean'];
    } catch {
      return ['lot-lasalgaon-onion', 'lot-indore-soybean'];
    }
  });

  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    ARBITRAGE_CORRIDORS[0].id
  );

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // Ignore storage quota errors in restricted frames
    }
  }, [savedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_LOTS_STORAGE_KEY, JSON.stringify(customRecords));
    } catch {
      // Ignore storage quota errors in restricted frames
    }
  }, [customRecords]);

  const allRecords = [...customRecords, ...INITIAL_MANDI_RECORDS];

  const handleToggleSave = (id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddFieldQuote = (newRecord: MandiLotRecord) => {
    setCustomRecords((prev) => [newRecord, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <MandiBoard
          records={allRecords}
          savedIds={savedIds}
          onToggleSave={handleToggleSave}
          onAddFieldQuote={handleAddFieldQuote}
          onSelectCorridor={(corridorId) => setSelectedCorridorId(corridorId)}
        />
        <ArbitrageCalculator
          selectedCorridorId={selectedCorridorId}
          onCorridorChange={setSelectedCorridorId}
        />
        <SupplyChainSection />
        <AlertSubscription />
      </main>
    </div>
  );
}
