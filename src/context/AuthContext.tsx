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
import { CropCategory, MandiLotRecord } from '../data/mandiData';

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
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

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  profile: UserProfileData | null;
  cloudWatchlistIds: string[];
  cloudFieldQuotes: MandiLotRecord[];
  cloudSubscriptions: CloudAlertSubscription[];
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [cloudWatchlistIds, setCloudWatchlistIds] = useState<string[]>([]);
  const [cloudFieldQuotes, setCloudFieldQuotes] = useState<MandiLotRecord[]>([]);
  const [cloudSubscriptions, setCloudSubscriptions] = useState<CloudAlertSubscription[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  // Monitor Firebase Auth state and bootstrap non-PII profile + isolated private email doc
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);

      if (!currentUser) {
        setProfile(null);
        setProfileReady(false);
        setCloudWatchlistIds([]);
        setCloudFieldQuotes([]);
        setCloudSubscriptions([]);
        setAuthReady(true);
        return;
      }

      const userPath = `users/${currentUser.uid}`;
      const privatePath = `users/${currentUser.uid}/private/info`;

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

  // Attach real-time Firestore listeners ONLY once user is authenticated and parent profile exists
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

    const quotesPath = 'fieldQuotes';
    const quotesQuery = query(
      collection(db, 'fieldQuotes'),
      where('ownerId', '==', user.uid)
    );

    const unsubQuotes = onSnapshot(
      quotesQuery,
      (snapshot) => {
        const records: MandiLotRecord[] = snapshot.docs.map((d) => {
          const raw = d.data();
          const modal = Number(raw.modalPrice) || 2000;
          const arrivals = Number(raw.arrivalsQtl) || 1000;
          const cat: CropCategory =
            raw.category === 'Cereals & Pulses' ||
            raw.category === 'Vegetables' ||
            raw.category === 'Oilseeds & Spices'
              ? raw.category
              : 'Vegetables';

          const farmgate = Math.round(modal * 0.88);
          const grading = Math.round(modal * 0.035);
          const localFreight = Math.round(modal * 0.05);
          const cess = modal - farmgate - grading - localFreight;
          const interstate = Math.round(modal * 0.11);

          return {
            id: d.id,
            commodity: String(raw.commodity || 'Commodity'),
            variety: String(raw.variety || 'Standard FAQ'),
            category: cat,
            mandi: String(raw.mandi || 'Local Yard'),
            district: String(raw.district || ''),
            state: String(raw.state || ''),
            grade: String(raw.grade || 'FPO Verified Lot'),
            moistureSpec: 'Cloud Verified',
            minPrice: Number(raw.minPrice) || Math.round(modal * 0.91),
            maxPrice: Number(raw.maxPrice) || Math.round(modal * 1.09),
            modalPrice: modal,
            change24hPct: 1.4,
            arrivalsQtl: arrivals,
            defaultDistanceKm: 40,
            mandiFeePct: 1.0,
            hamaliPerQtl: 25,
            updatedAgo: 'Synced to account',
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
        });
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

  const addCloudFieldQuote = async (input: NewFieldQuoteInput): Promise<MandiLotRecord> => {
    if (!user) {
      throw new Error('Authentication required.');
    }

    const quoteId = `quote-${Date.now()}`;
    const quotePath = `fieldQuotes/${quoteId}`;

    const payload = {
      ownerId: user.uid,
      commodity: input.commodity.trim().slice(0, 60),
      variety: input.variety.trim().slice(0, 80),
      category: input.category,
      mandi: input.mandi.trim().slice(0, 80),
      district: input.district.trim().slice(0, 60),
      state: input.state.trim().slice(0, 50),
      grade: input.grade.trim().slice(0, 50),
      modalPrice: Math.min(50000, Math.max(200, Math.round(input.modalPrice))),
      minPrice: Math.min(50000, Math.max(100, Math.round(input.minPrice))),
      maxPrice: Math.min(60000, Math.max(200, Math.round(input.maxPrice))),
      arrivalsQtl: Math.min(1000000, Math.max(10, Math.round(input.arrivalsQtl))),
    };

    try {
      await setDoc(doc(db, 'fieldQuotes', quoteId), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, quotePath);
    }

    const modal = payload.modalPrice;
    const arrivals = payload.arrivalsQtl;
    const farmgate = Math.round(modal * 0.88);
    const grading = Math.round(modal * 0.035);
    const localFreight = Math.round(modal * 0.05);
    const cess = modal - farmgate - grading - localFreight;
    const interstate = Math.round(modal * 0.11);

    return {
      id: quoteId,
      commodity: payload.commodity,
      variety: payload.variety,
      category: payload.category,
      mandi: payload.mandi,
      district: payload.district,
      state: payload.state,
      grade: payload.grade,
      moistureSpec: 'Cloud Verified',
      minPrice: payload.minPrice,
      maxPrice: payload.maxPrice,
      modalPrice: modal,
      change24hPct: 1.4,
      arrivalsQtl: arrivals,
      defaultDistanceKm: 40,
      mandiFeePct: 1.0,
      hamaliPerQtl: 25,
      updatedAgo: 'Synced to account',
      corridorId: 'corridor-onion-nashik',
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
        profile,
        cloudWatchlistIds,
        cloudFieldQuotes,
        cloudSubscriptions,
        authError,
        signInWithGoogle,
        signOutUser,
        updateUserProfile,
        toggleCloudWatchlist,
        addCloudFieldQuote,
        deleteCloudFieldQuote,
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
