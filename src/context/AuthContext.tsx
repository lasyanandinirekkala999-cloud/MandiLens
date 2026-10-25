import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  CropCategory,
  INITIAL_MANDI_RECORDS,
  MandiLotRecord,
} from '../data/mandiData';

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
export const BOOTSTRAPPED_ADMIN_EMAIL = 'nagireddyrekkala999@gmail.com';

export const SUPPLY_CHAIN_ROLES = [
  'FPO / Farmer Collective',
  'Independent Grower',
  'Commodity Buyer / Processor',
  'Cold Chain & Transport Fleet',
] as const;

export type SupplyChainRole = (typeof SUPPLY_CHAIN_ROLES)[number];

export interface UserProfileData {
  uid: string;
  displayName: string;
  supplyChainRole: SupplyChainRole;
  regionCluster: string;
}

export interface CloudAlertSubscription {
  id: string;
  ownerId: string;
  organization: string;
  supplyChainRole: SupplyChainRole;
  commodityGroup: string;
  regionCluster: string;
  contact: string;
}

export interface CloudSavedComparison {
  id: string;
  ownerId: string;
  title: string;
  commodity: string;
  compareCount: 2 | 3;
  lotQtl: number;
  packagingPerQtl: number;
  freightPerKmQtl: number;
  shrinkagePer100Km: number;
  marketAName: string;
  marketAPriceQtl: number;
  marketADistanceKm: number;
  marketBName: string;
  marketBPriceQtl: number;
  marketBDistanceKm: number;
  marketCName: string;
  marketCPriceQtl: number;
  marketCDistanceKm: number;
  bestMarketName: string;
  bestNetPerQtl: number;
  bestNetTotalInr: number;
  status: 'active' | 'locked';
}

export type DispatchOrderStatus = 'planned' | 'in_transit' | 'settled';

export interface CloudProcurementOrder {
  id: string;
  ownerId: string;
  organization: string;
  commodity: string;
  originCluster: string;
  destinationMandi: string;
  quantityQtl: number;
  expectedNetPerQtl: number;
  dispatchStatus: DispatchOrderStatus;
}

export interface NewFieldQuoteInput {
  commodity: string;
  variety: string;
  category: CropCategory;
  mandi: string;
  district: string;
  state: string;
  grade: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  arrivalsQtl: number;
}

export interface SaveComparisonInput {
  title: string;
  commodity: string;
  compareCount: 2 | 3;
  lotQtl: number;
  packagingPerQtl: number;
  freightPerKmQtl: number;
  shrinkagePer100Km: number;
  marketAName: string;
  marketAPriceQtl: number;
  marketADistanceKm: number;
  marketBName: string;
  marketBPriceQtl: number;
  marketBDistanceKm: number;
  marketCName: string;
  marketCPriceQtl: number;
  marketCDistanceKm: number;
  bestMarketName: string;
  bestNetPerQtl: number;
  bestNetTotalInr: number;
}

export interface NewProcurementOrderInput {
  organization: string;
  commodity: string;
  originCluster: string;
  destinationMandi: string;
  quantityQtl: number;
  expectedNetPerQtl: number;
}

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  profile: UserProfileData | null;
  publishedMandiLots: MandiLotRecord[];
  cloudWatchlistIds: string[];
  cloudFieldQuotes: MandiLotRecord[];
  cloudSubscriptions: CloudAlertSubscription[];
  savedComparisons: CloudSavedComparison[];
  procurementOrders: CloudProcurementOrder[];
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (updates: {
    displayName: string;
    supplyChainRole: SupplyChainRole;
    regionCluster: string;
  }) => Promise<void>;
  toggleCloudWatchlist: (lotId: string) => Promise<void>;
  addCloudFieldQuote: (input: NewFieldQuoteInput) => Promise<MandiLotRecord>;
  deleteCloudFieldQuote: (quoteId: string) => Promise<void>;
  seedOfficialMandiLots: () => Promise<number>;
  saveComparisonScenario: (input: SaveComparisonInput) => Promise<void>;
  lockComparisonScenario: (comparisonId: string) => Promise<void>;
  deleteComparisonScenario: (comparisonId: string) => Promise<void>;
  createProcurementOrder: (input: NewProcurementOrderInput) => Promise<void>;
  advanceProcurementOrderStatus: (
    orderId: string,
    nextStatus: DispatchOrderStatus
  ) => Promise<void>;
  deleteProcurementOrder: (orderId: string) => Promise<void>;
  addCloudSubscription: (input: {
    organization: string;
    supplyChainRole: SupplyChainRole;
    commodityGroup: string;
    regionCluster: string;
    contact: string;
  }) => Promise<void>;
  deleteCloudSubscription: (subId: string) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return cleaned || `id-${Date.now()}`;
}

function buildMandiRecordFromCloudDoc(
  id: string,
  raw: Record<string, unknown>,
  updatedLabel: string
): MandiLotRecord {
  const modal = Math.max(100, Number(raw.modalPrice) || 2000);
  const arrivals = Math.max(1, Number(raw.arrivalsQtl) || 1000);
  const cat: CropCategory =
    raw.category === 'Cereals & Pulses' ||
    raw.category === 'Vegetables' ||
    raw.category === 'Oilseeds & Spices'
      ? raw.category
      : 'Vegetables';

  const farmgate = Math.round(modal * 0.88);
  const grading = Math.round(modal * 0.035);
  const localFreight = Math.round(modal * 0.05);
  const cess = Math.max(25, modal - farmgate - grading - localFreight);
  const interstate = Math.round(modal * 0.11);
  const stateCode = String(raw.state || 'IN')
    .slice(0, 2)
    .toUpperCase();

  return {
    id,
    apmcCode: `${stateCode}-DB-${id.slice(-4).toUpperCase()}`,
    commodity: String(raw.commodity || 'Commodity'),
    variety: String(raw.variety || 'Standard FAQ'),
    category: cat,
    mandi: String(raw.mandi || 'Local Yard'),
    district: String(raw.district || ''),
    state: String(raw.state || ''),
    grade: String(raw.grade || 'FPO Verified Lot'),
    moistureSpec: String(raw.moistureSpec || 'Cloud Verified'),
    minPrice: Number(raw.minPrice) || Math.round(modal * 0.91),
    maxPrice: Number(raw.maxPrice) || Math.round(modal * 1.09),
    modalPrice: modal,
    change24hPct: Number.isFinite(Number(raw.change24hPct))
      ? Number(raw.change24hPct)
      : 1.4,
    arrivalsQtl: arrivals,
    defaultDistanceKm: Number.isFinite(Number(raw.defaultDistanceKm))
      ? Number(raw.defaultDistanceKm)
      : 40,
    mandiFeePct: Number.isFinite(Number(raw.mandiFeePct))
      ? Number(raw.mandiFeePct)
      : 1.0,
    hamaliPerQtl: Number.isFinite(Number(raw.hamaliPerQtl))
      ? Number(raw.hamaliPerQtl)
      : 25,
    updatedAgo: updatedLabel,
    corridorId:
      cat === 'Vegetables'
        ? 'corridor-onion-nashik'
        : cat === 'Cereals & Pulses'
        ? 'corridor-wheat-mp'
        : 'corridor-soybean-malwa',
    history7d: [
      { day: '18 Oct', modal: Math.round(modal * 0.95), arrivals: Math.round(arrivals * 1.12) },
      { day: '19 Oct', modal: Math.round(modal * 0.96), arrivals: Math.round(arrivals * 1.08) },
      { day: '20 Oct', modal: Math.round(modal * 0.97), arrivals: Math.round(arrivals * 1.05) },
      { day: '21 Oct', modal: Math.round(modal * 0.96), arrivals: Math.round(arrivals * 1.06) },
      { day: '22 Oct', modal: Math.round(modal * 0.98), arrivals: Math.round(arrivals * 1.03) },
      { day: '23 Oct', modal: Math.round(modal * 0.99), arrivals: Math.round(arrivals * 1.01) },
      { day: '24 Oct', modal, arrivals },
    ],
    supplyChain: {
      farmgateNet: farmgate,
      gradingPackaging: grading,
      localFreight,
      mandiCessCommission: cess,
      modalAuctionPrice: modal,
      interstateLogistics: interstate,
      terminalLandedPrice: modal + interstate,
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [publishedMandiLots, setPublishedMandiLots] = useState<MandiLotRecord[]>([]);
  const [cloudWatchlistIds, setCloudWatchlistIds] = useState<string[]>([]);
  const [cloudFieldQuotes, setCloudFieldQuotes] = useState<MandiLotRecord[]>([]);
  const [cloudSubscriptions, setCloudSubscriptions] = useState<CloudAlertSubscription[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<CloudSavedComparison[]>([]);
  const [procurementOrders, setProcurementOrders] = useState<CloudProcurementOrder[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  // Monitor Firebase Auth state, verify admin registry, and bootstrap non-PII profile + isolated PII doc
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);

      if (!currentUser) {
        setProfile(null);
        setProfileReady(false);
        setIsAdmin(false);
        setCloudWatchlistIds([]);
        setCloudFieldQuotes([]);
        setCloudSubscriptions([]);
        setSavedComparisons([]);
        setProcurementOrders([]);
        setAuthReady(true);
        return;
      }

      const userPath = `users/${currentUser.uid}`;
      const privatePath = `users/${currentUser.uid}/private/info`;
      const adminPath = `admins/${currentUser.uid}`;

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        let snap;
        try {
          snap = await getDoc(userRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userPath);
        }

        if (!snap.exists()) {
          const initialDisplayName = (
            currentUser.displayName?.trim() ||
            currentUser.email?.split('@')[0] ||
            'MandiLens Member'
          ).slice(0, 80);

          const defaultProfile: UserProfileData = {
            uid: currentUser.uid,
            displayName: initialDisplayName,
            supplyChainRole: 'FPO / Farmer Collective',
            regionCluster: 'Maharashtra — Nashik / Pune',
          };

          try {
            await setDoc(userRef, {
              ...defaultProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, userPath);
          }

          setProfile(defaultProfile);
        } else {
          const data = snap.data();
          setProfile({
            uid: String(data.uid || currentUser.uid),
            displayName: String(data.displayName || 'MandiLens Member'),
            supplyChainRole: SUPPLY_CHAIN_ROLES.includes(data.supplyChainRole)
              ? data.supplyChainRole
              : 'FPO / Farmer Collective',
            regionCluster: String(data.regionCluster || 'Maharashtra — Nashik / Pune'),
          });
        }

        // Sync isolated private email record if verified email exists
        if (currentUser.email && currentUser.emailVerified) {
          const privRef = doc(db, 'users', currentUser.uid, 'private', 'info');
          let privSnap;
          try {
            privSnap = await getDoc(privRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, privatePath);
          }

          const safeEmail = currentUser.email.slice(0, 160);
          if (!privSnap.exists()) {
            try {
              await setDoc(privRef, {
                ownerId: currentUser.uid,
                email: safeEmail,
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, privatePath);
            }
          }
        }

        // Check trusted admin status (bootstrapped verified email OR /admins/{uid} doc)
        let adminFlag = Boolean(
          currentUser.emailVerified && currentUser.email === BOOTSTRAPPED_ADMIN_EMAIL
        );
        if (!adminFlag && currentUser.emailVerified) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
            adminFlag = adminSnap.exists();
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, adminPath);
          }
        }
        setIsAdmin(adminFlag);
        setProfileReady(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Quota exceeded')) {
          setAuthError('Daily Firestore quota exceeded. Quota resets tomorrow.');
        } else {
          setAuthError('Unable to initialize cloud profile.');
        }
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Attach shared published /mandiLots listener once auth state is initialized
  useEffect(() => {
    if (!authReady) return;

    const lotsPath = 'mandiLots';
    const publishedLotsQuery = query(
      collection(db, 'mandiLots'),
      where('status', '==', 'published')
    );

    const unsubMandiLots = onSnapshot(
      publishedLotsQuery,
      (snapshot) => {
        const records: MandiLotRecord[] = snapshot.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          const tier =
            raw.verificationTier === 'official_apmc'
              ? 'Official APMC · Cloud DB'
              : 'FPO Verified · Cloud DB';
          return buildMandiRecordFromCloudDoc(d.id, raw, tier);
        });
        setPublishedMandiLots(records);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, lotsPath);
        } catch (wrapped) {
          console.error(wrapped);
        }
      }
    );

    return () => unsubMandiLots();
  }, [authReady]);

  // Attach user-scoped real-time Firestore listeners ONLY once user is authenticated and parent profile exists
  useEffect(() => {
    if (!authReady || !user || !profileReady) {
      return;
    }

    const watchlistPath = `users/${user.uid}/watchlist`;
    const watchlistQuery = query(
      collection(db, 'users', user.uid, 'watchlist'),
      where('ownerId', '==', user.uid)
    );

    const unsubWatchlist = onSnapshot(
      watchlistQuery,
      (snapshot) => {
        const ids = snapshot.docs.map((d) => String(d.data().lotId || d.id));
        setCloudWatchlistIds(ids);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, watchlistPath);
        } catch (wrapped) {
          console.error(wrapped);
        }
      }
    );

    const subsPath = `users/${user.uid}/subscriptions`;
    const subsQuery = query(
      collection(db, 'users', user.uid, 'subscriptions'),
      where('ownerId', '==', user.uid)
    );

    const unsubSubscriptions = onSnapshot(
      subsQuery,
      (snapshot) => {
        const items: CloudAlertSubscription[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ownerId: String(raw.ownerId || user.uid),
            organization: String(raw.organization || ''),
            supplyChainRole: SUPPLY_CHAIN_ROLES.includes(raw.supplyChainRole)
              ? raw.supplyChainRole
              : 'FPO / Farmer Collective',
            commodityGroup: String(raw.commodityGroup || ''),
            regionCluster: String(raw.regionCluster || ''),
            contact: String(raw.contact || ''),
          };
        });
        setCloudSubscriptions(items);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, subsPath);
        } catch (wrapped) {
          console.error(wrapped);
        }
      }
    );

    const comparisonsPath = `users/${user.uid}/savedComparisons`;
    const comparisonsQuery = query(
      collection(db, 'users', user.uid, 'savedComparisons'),
      where('ownerId', '==', user.uid)
    );

    const unsubComparisons = onSnapshot(
      comparisonsQuery,
      (snapshot) => {
        const items: CloudSavedComparison[] = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ownerId: String(raw.ownerId || user.uid),
            title: String(raw.title || 'Saved Comparison'),
            commodity: String(raw.commodity || 'Commodity'),
            compareCount: raw.compareCount === 2 ? 2 : 3,
            lotQtl: Number(raw.lotQtl) || 60,
            packagingPerQtl: Number(raw.packagingPerQtl) || 40,
            freightPerKmQtl: Number(raw.freightPerKmQtl) || 1.4,
            shrinkagePer100Km: Number(raw.shrinkagePer100Km) || 0.8,
            marketAName: String(raw.marketAName || 'Market A'),
            marketAPriceQtl: Number(raw.marketAPriceQtl) || 2000,
            marketADistanceKm: Number(raw.marketADistanceKm) || 20,
            marketBName: String(raw.marketBName || 'Market B'),
            marketBPriceQtl: Number(raw.marketBPriceQtl) || 2100,
            marketBDistanceKm: Number(raw.marketBDistanceKm) || 45,
            marketCName: String(raw.marketCName || 'Market C'),
            marketCPriceQtl: Number(raw.marketCPriceQtl) || 2300,
            marketCDistanceKm: Number(raw.marketCDistanceKm) || 120,
            bestMarketName: String(raw.bestMarketName || 'Market B'),
            bestNetPerQtl: Number(raw.bestNetPerQtl) || 2000,
            bestNetTotalInr: Number(raw.bestNetTotalInr) || 120000,
            status: raw.status === 'locked' ? 'locked' : 'active',
          };
        });
        setSavedComparisons(items);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, comparisonsPath);
        } catch (wrapped) {
          console.error(wrapped);
        }
      }
    );

    const ordersPath = 'procurementOrders';
    const ordersQuery = query(
      collection(db, 'procurementOrders'),
      where('ownerId', '==', user.uid)
    );

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const items: CloudProcurementOrder[] = snapshot.docs.map((d) => {
          const raw = d.data();
          const st: DispatchOrderStatus =
            raw.dispatchStatus === 'in_transit' || raw.dispatchStatus === 'settled'
              ? raw.dispatchStatus
              : 'planned';
          return {
            id: d.id,
            ownerId: String(raw.ownerId || user.uid),
            organization: String(raw.organization || ''),
            commodity: String(raw.commodity || ''),
            originCluster: String(raw.originCluster || ''),
            destinationMandi: String(raw.destinationMandi || ''),
            quantityQtl: Number(raw.quantityQtl) || 50,
            expectedNetPerQtl: Number(raw.expectedNetPerQtl) || 2000,
            dispatchStatus: st,
          };
        });
        setProcurementOrders(items);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, ordersPath);
        } catch (wrapped) {
          console.error(wrapped);
        }
      }
    );

    const quotesPath = 'fieldQuotes';
    const quotesQuery = query(
      collection(db, 'fieldQuotes'),
      where('ownerId', '==', user.uid)
    );

    const unsubQuotes = onSnapshot(
      quotesQuery,
      (snapshot) => {
        const records: MandiLotRecord[] = snapshot.docs.map((d) =>
          buildMandiRecordFromCloudDoc(
            d.id,
            d.data() as Record<string, unknown>,
            'Synced to account'
          )
        );
        setCloudFieldQuotes(records);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, quotesPath);
        } catch (wrapped) {
          console.error(wrapped);
        }
      }
    );

    return () => {
      unsubWatchlist();
      unsubSubscriptions();
      unsubComparisons();
      unsubOrders();
      unsubQuotes();
    };
  }, [authReady, user, profileReady]);

  const signInWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing authentication.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
      }
      return false;
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
  };

  const updateUserProfile = async (updates: {
    displayName: string;
    supplyChainRole: SupplyChainRole;
    regionCluster: string;
  }) => {
    if (!user) return;
    const safeName = updates.displayName.trim().slice(0, 80);
    const safeCluster = updates.regionCluster.trim().slice(0, 80);
    if (safeName.length < 1 || safeCluster.length < 2) {
      throw new Error('Display name and market cluster are required.');
    }
    if (!SUPPLY_CHAIN_ROLES.includes(updates.supplyChainRole)) {
      throw new Error('Invalid supply chain role selected.');
    }

    const userPath = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: safeName,
        supplyChainRole: updates.supplyChainRole,
        regionCluster: safeCluster,
        updatedAt: serverTimestamp(),
      });
      setProfile({
        uid: user.uid,
        displayName: safeName,
        supplyChainRole: updates.supplyChainRole,
        regionCluster: safeCluster,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userPath);
    }
  };

  const toggleCloudWatchlist = async (lotId: string) => {
    if (!user) return;
    const safeLotId = sanitizeId(lotId);
    if (!VALID_ID_REGEX.test(safeLotId)) return;

    const itemPath = `users/${user.uid}/watchlist/${safeLotId}`;
    const itemRef = doc(db, 'users', user.uid, 'watchlist', safeLotId);

    if (cloudWatchlistIds.includes(safeLotId)) {
      try {
        await deleteDoc(itemRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, itemPath);
      }
    } else {
      try {
        await setDoc(itemRef, {
          ownerId: user.uid,
          lotId: safeLotId,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, itemPath);
      }
    }
  };

  // Publishes verified FPO field observation into shared /mandiLots database AND owner /fieldQuotes log
  const addCloudFieldQuote = async (input: NewFieldQuoteInput): Promise<MandiLotRecord> => {
    if (!user) {
      throw new Error('Authentication required.');
    }

    const lotId = `fpo-lot-${Date.now()}`;
    const lotPath = `mandiLots/${lotId}`;
    const quotePath = `fieldQuotes/${lotId}`;

    const modalPrice = Math.min(50000, Math.max(200, Math.round(input.modalPrice)));
    const minPrice = Math.min(modalPrice, Math.max(100, Math.round(input.minPrice)));
    const maxPrice = Math.min(60000, Math.max(modalPrice, Math.round(input.maxPrice)));
    const arrivalsQtl = Math.min(1000000, Math.max(10, Math.round(input.arrivalsQtl)));

    const safeCommodity = (input.commodity.trim() || 'Onion').slice(0, 60);
    const safeVariety = (input.variety.trim() || 'Standard FAQ').slice(0, 80);
    const safeMandi = input.mandi.trim().slice(0, 80);
    const safeDistrict = input.district.trim().slice(0, 60);
    const safeState = input.state.trim().slice(0, 50);
    const safeGrade = (input.grade.trim() || 'FPO Verified Lot').slice(0, 50);

    const mandiLotPayload = {
      lotId,
      authorId: user.uid,
      commodity: safeCommodity,
      variety: safeVariety,
      category: input.category,
      mandi: safeMandi,
      district: safeDistrict,
      state: safeState,
      grade: safeGrade,
      moistureSpec: 'FPO Gate Checked',
      minPrice,
      maxPrice,
      modalPrice,
      change24hPct: 1.4,
      arrivalsQtl,
      defaultDistanceKm: 40,
      mandiFeePct: 1.0,
      hamaliPerQtl: 25,
      status: 'published' as const,
      verificationTier: 'fpo_verified' as const,
    };

    try {
      await setDoc(doc(db, 'mandiLots', lotId), {
        ...mandiLotPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, lotPath);
    }

    try {
      await setDoc(doc(db, 'fieldQuotes', lotId), {
        ownerId: user.uid,
        commodity: safeCommodity,
        variety: safeVariety,
        category: input.category,
        mandi: safeMandi,
        district: safeDistrict,
        state: safeState,
        grade: safeGrade,
        modalPrice,
        minPrice,
        maxPrice,
        arrivalsQtl,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, quotePath);
    }

    return buildMandiRecordFromCloudDoc(
      lotId,
      mandiLotPayload as unknown as Record<string, unknown>,
      'FPO Verified · Cloud DB'
    );
  };

  const deleteCloudFieldQuote = async (quoteId: string) => {
    if (!user) return;
    const safeId = sanitizeId(quoteId);
    const quotePath = `fieldQuotes/${safeId}`;
    try {
      await deleteDoc(doc(db, 'fieldQuotes', safeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, quotePath);
    }

    if (safeId.startsWith('fpo-lot-')) {
      const lotPath = `mandiLots/${safeId}`;
      try {
        await deleteDoc(doc(db, 'mandiLots', safeId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, lotPath);
      }
    }
  };

  // Admin action: Syncs reference APMC market rates into /mandiLots as official_apmc documents
  const seedOfficialMandiLots = async (): Promise<number> => {
    if (!user || !isAdmin) {
      throw new Error('Market administrator privileges required to sync official APMC records.');
    }

    let syncedCount = 0;
    for (const rec of INITIAL_MANDI_RECORDS) {
      const lotId = sanitizeId(rec.id);
      const lotPath = `mandiLots/${lotId}`;
      const lotRef = doc(db, 'mandiLots', lotId);

      let existingSnap;
      try {
        existingSnap = await getDoc(lotRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, lotPath);
      }

      if (!existingSnap.exists()) {
        try {
          await setDoc(lotRef, {
            lotId,
            authorId: user.uid,
            commodity: rec.commodity.slice(0, 60),
            variety: rec.variety.slice(0, 80),
            category: rec.category,
            mandi: rec.mandi.slice(0, 80),
            district: rec.district.slice(0, 60),
            state: rec.state.slice(0, 50),
            grade: rec.grade.slice(0, 50),
            moistureSpec: rec.moistureSpec.slice(0, 50),
            minPrice: rec.minPrice,
            maxPrice: rec.maxPrice,
            modalPrice: rec.modalPrice,
            change24hPct: rec.change24hPct,
            arrivalsQtl: rec.arrivalsQtl,
            defaultDistanceKm: rec.defaultDistanceKm,
            mandiFeePct: rec.mandiFeePct,
            hamaliPerQtl: rec.hamaliPerQtl,
            status: 'published',
            verificationTier: 'official_apmc',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          syncedCount += 1;
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, lotPath);
        }
      } else {
        try {
          await updateDoc(lotRef, {
            minPrice: rec.minPrice,
            maxPrice: rec.maxPrice,
            modalPrice: rec.modalPrice,
            change24hPct: rec.change24hPct,
            arrivalsQtl: rec.arrivalsQtl,
            updatedAt: serverTimestamp(),
          });
          syncedCount += 1;
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, lotPath);
        }
      }
    }

    return syncedCount;
  };

  const saveComparisonScenario = async (input: SaveComparisonInput) => {
    if (!user) {
      throw new Error('Authentication required.');
    }

    const compId = `cmp-${Date.now()}`;
    const compPath = `users/${user.uid}/savedComparisons/${compId}`;

    const safeTitle = (input.title.trim() || 'Mandi Arbitrage Scenario').slice(0, 100);
    const safeCommodity = (input.commodity.trim() || 'Commodity').slice(0, 80);

    try {
      await setDoc(doc(db, 'users', user.uid, 'savedComparisons', compId), {
        ownerId: user.uid,
        title: safeTitle.length >= 2 ? safeTitle : 'Mandi Scenario',
        commodity: safeCommodity.length >= 2 ? safeCommodity : 'Commodity',
        compareCount: input.compareCount === 2 ? 2 : 3,
        lotQtl: Math.min(10000, Math.max(1, Math.round(input.lotQtl))),
        packagingPerQtl: Math.min(2000, Math.max(0, Number(input.packagingPerQtl) || 0)),
        freightPerKmQtl: Math.min(50, Math.max(0, Number(input.freightPerKmQtl) || 0)),
        shrinkagePer100Km: Math.min(25, Math.max(0, Number(input.shrinkagePer100Km) || 0)),
        marketAName: (input.marketAName.trim() || 'Market A').slice(0, 80),
        marketAPriceQtl: Math.min(100000, Math.max(0, Math.round(input.marketAPriceQtl))),
        marketADistanceKm: Math.min(5000, Math.max(0, Math.round(input.marketADistanceKm))),
        marketBName: (input.marketBName.trim() || 'Market B').slice(0, 80),
        marketBPriceQtl: Math.min(100000, Math.max(0, Math.round(input.marketBPriceQtl))),
        marketBDistanceKm: Math.min(5000, Math.max(0, Math.round(input.marketBDistanceKm))),
        marketCName: (input.marketCName.trim() || 'Market C').slice(0, 80),
        marketCPriceQtl: Math.min(100000, Math.max(0, Math.round(input.marketCPriceQtl))),
        marketCDistanceKm: Math.min(5000, Math.max(0, Math.round(input.marketCDistanceKm))),
        bestMarketName: (input.bestMarketName.trim() || 'Best Market').slice(0, 80),
        bestNetPerQtl: Math.round(input.bestNetPerQtl),
        bestNetTotalInr: Math.round(input.bestNetTotalInr),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, compPath);
    }
  };

  const lockComparisonScenario = async (comparisonId: string) => {
    if (!user) return;
    const safeId = sanitizeId(comparisonId);
    const compPath = `users/${user.uid}/savedComparisons/${safeId}`;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'savedComparisons', safeId), {
        status: 'locked',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, compPath);
    }
  };

  const deleteComparisonScenario = async (comparisonId: string) => {
    if (!user) return;
    const safeId = sanitizeId(comparisonId);
    const compPath = `users/${user.uid}/savedComparisons/${safeId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedComparisons', safeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, compPath);
    }
  };

  const createProcurementOrder = async (input: NewProcurementOrderInput) => {
    if (!user) {
      throw new Error('Authentication required.');
    }

    const orderId = `ord-${Date.now()}`;
    const orderPath = `procurementOrders/${orderId}`;

    const safeOrg = (input.organization.trim() || profile?.displayName || 'FPO Collective').slice(
      0,
      100
    );
    const safeCommodity = (input.commodity.trim() || 'Onion').slice(0, 60);
    const safeOrigin = (input.originCluster.trim() || 'Farmgate Cluster').slice(0, 80);
    const safeDest = (input.destinationMandi.trim() || 'APMC Yard').slice(0, 80);

    try {
      await setDoc(doc(db, 'procurementOrders', orderId), {
        ownerId: user.uid,
        organization: safeOrg.length >= 2 ? safeOrg : 'FPO Member',
        commodity: safeCommodity.length >= 2 ? safeCommodity : 'Crop',
        originCluster: safeOrigin.length >= 2 ? safeOrigin : 'Local Cluster',
        destinationMandi: safeDest.length >= 2 ? safeDest : 'APMC Mandi',
        quantityQtl: Math.min(50000, Math.max(1, Math.round(input.quantityQtl))),
        expectedNetPerQtl: Math.min(100000, Math.max(50, Math.round(input.expectedNetPerQtl))),
        dispatchStatus: 'planned',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, orderPath);
    }
  };

  const advanceProcurementOrderStatus = async (
    orderId: string,
    nextStatus: DispatchOrderStatus
  ) => {
    if (!user) return;
    const safeId = sanitizeId(orderId);
    const orderPath = `procurementOrders/${safeId}`;

    try {
      await updateDoc(doc(db, 'procurementOrders', safeId), {
        dispatchStatus: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, orderPath);
    }
  };

  const deleteProcurementOrder = async (orderId: string) => {
    if (!user) return;
    const safeId = sanitizeId(orderId);
    const orderPath = `procurementOrders/${safeId}`;
    try {
      await deleteDoc(doc(db, 'procurementOrders', safeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, orderPath);
    }
  };

  const addCloudSubscription = async (input: {
    organization: string;
    supplyChainRole: SupplyChainRole;
    commodityGroup: string;
    regionCluster: string;
    contact: string;
  }) => {
    if (!user) return;
    const subId = `sub-${Date.now()}`;
    const subPath = `users/${user.uid}/subscriptions/${subId}`;

    try {
      await setDoc(doc(db, 'users', user.uid, 'subscriptions', subId), {
        ownerId: user.uid,
        organization: input.organization.trim().slice(0, 100),
        supplyChainRole: input.supplyChainRole,
        commodityGroup: input.commodityGroup.trim().slice(0, 80),
        regionCluster: input.regionCluster.trim().slice(0, 80),
        contact: input.contact.trim().slice(0, 160),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, subPath);
    }
  };

  const deleteCloudSubscription = async (subId: string) => {
    if (!user) return;
    const safeId = sanitizeId(subId);
    const subPath = `users/${user.uid}/subscriptions/${safeId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'subscriptions', safeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, subPath);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        profile,
        publishedMandiLots,
        cloudWatchlistIds,
        cloudFieldQuotes,
        cloudSubscriptions,
        savedComparisons,
        procurementOrders,
        authError,
        signInWithGoogle,
        signOutUser,
        updateUserProfile,
        toggleCloudWatchlist,
        addCloudFieldQuote,
        deleteCloudFieldQuote,
        seedOfficialMandiLots,
        saveComparisonScenario,
        lockComparisonScenario,
        deleteComparisonScenario,
        createProcurementOrder,
        advanceProcurementOrderStatus,
        deleteProcurementOrder,
        addCloudSubscription,
        deleteCloudSubscription,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
