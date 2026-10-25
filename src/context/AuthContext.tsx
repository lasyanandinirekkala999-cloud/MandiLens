import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseAuthProfile,
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
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  CropCategory,
  INITIAL_MANDI_RECORDS,
  MandiLotRecord,
} from '../data/mandiData';
import {
  deriveSafeDisplayName,
  normalizeAndValidateEmail,
  SessionSecurityMode,
  validatePasswordStrength,
} from '../utils/emailSecurity';

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
export const BOOTSTRAPPED_ADMIN_EMAIL = 'nagireddyrekkala999@gmail.com';
const LOCAL_UNVERIFIED_PROFILE_PREFIX = 'mandilens_protected_profile_v1_';
const SESSION_MODE_STORAGE_KEY = 'mandilens_session_security_mode_v1';

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

export interface SignInOnboardingOptions {
  displayName?: string;
  supplyChainRole?: SupplyChainRole;
  regionCluster?: string;
  applyToExisting?: boolean;
  loginHint?: string;
  sessionMode?: SessionSecurityMode;
}

export interface EmailAuthInput {
  email: string;
  password: string;
  displayName?: string;
  supplyChainRole?: SupplyChainRole;
  regionCluster?: string;
  applyToExisting?: boolean;
  sessionMode?: SessionSecurityMode;
}

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  sessionSecurityMode: SessionSecurityMode;
  emailProviderUnavailableFor: string | null;
  profile: UserProfileData | null;
  publishedMandiLots: MandiLotRecord[];
  cloudWatchlistIds: string[];
  cloudFieldQuotes: MandiLotRecord[];
  cloudSubscriptions: CloudAlertSubscription[];
  savedComparisons: CloudSavedComparison[];
  procurementOrders: CloudProcurementOrder[];
  authError: string | null;
  setSessionSecurityPreference: (mode: SessionSecurityMode) => Promise<void>;
  signInWithGoogle: (options?: SignInOnboardingOptions) => Promise<boolean>;
  signInWithEmail: (input: EmailAuthInput) => Promise<boolean>;
  registerWithEmail: (input: EmailAuthInput) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  sendVerificationEmailToUser: () => Promise<boolean>;
  refreshVerificationState: () => Promise<boolean>;
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

function readLocalFallbackProfile(uid: string): UserProfileData | null {
  try {
    const raw = sessionStorage.getItem(`${LOCAL_UNVERIFIED_PROFILE_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfileData>;
    if (!parsed.displayName) return null;
    return {
      uid,
      displayName: String(parsed.displayName).slice(0, 80),
      supplyChainRole: SUPPLY_CHAIN_ROLES.includes(parsed.supplyChainRole as SupplyChainRole)
        ? (parsed.supplyChainRole as SupplyChainRole)
        : 'FPO / Farmer Collective',
      regionCluster: String(
        parsed.regionCluster || 'Andhra Pradesh — Anantapur / Guntur'
      ).slice(0, 80),
    };
  } catch {
    return null;
  }
}

function writeLocalFallbackProfile(profileData: UserProfileData): void {
  try {
    // Never store email or PII in fallback storage — strictly non-PII workspace prefs
    sessionStorage.setItem(
      `${LOCAL_UNVERIFIED_PROFILE_PREFIX}${profileData.uid}`,
      JSON.stringify({
        uid: profileData.uid,
        displayName: profileData.displayName,
        supplyChainRole: profileData.supplyChainRole,
        regionCluster: profileData.regionCluster,
      })
    );
  } catch {
    // Ignore storage restrictions
  }
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
  const apmcCode = `${String(raw.state || 'IN')
    .slice(0, 2)
    .toUpperCase()}-APMC-${id.slice(-3).toUpperCase()}`;

  return {
    id,
    apmcCode,
    commodity: String(raw.commodity || 'Commodity'),
    variety: String(raw.variety || 'Standard FAQ'),
    category: cat,
    mandi: String(raw.mandi || 'APMC Yard'),
    district: String(raw.district || 'District'),
    state: String(raw.state || 'State'),
    grade: String(raw.grade || 'FAQ Grade'),
    moistureSpec: String(raw.moistureSpec || 'Gate Checked'),
    minPrice: Math.min(modal, Number(raw.minPrice) || Math.round(modal * 0.9)),
    maxPrice: Math.max(modal, Number(raw.maxPrice) || Math.round(modal * 1.08)),
    modalPrice: modal,
    change24hPct: Number.isFinite(Number(raw.change24hPct))
      ? Number(raw.change24hPct)
      : 1.2,
    arrivalsQtl: arrivals,
    defaultDistanceKm: Number.isFinite(Number(raw.defaultDistanceKm))
      ? Number(raw.defaultDistanceKm)
      : 42,
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
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sessionSecurityMode, setSessionSecurityMode] = useState<SessionSecurityMode>(() => {
    try {
      const saved = localStorage.getItem(SESSION_MODE_STORAGE_KEY);
      return saved === 'shared_session_only'
        ? 'shared_session_only'
        : 'personal_persistent';
    } catch {
      return 'personal_persistent';
    }
  });
  const [emailProviderUnavailableFor, setEmailProviderUnavailableFor] = useState<string | null>(
    null
  );
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [publishedMandiLots, setPublishedMandiLots] = useState<MandiLotRecord[]>([]);
  const [cloudWatchlistIds, setCloudWatchlistIds] = useState<string[]>([]);
  const [cloudFieldQuotes, setCloudFieldQuotes] = useState<MandiLotRecord[]>([]);
  const [cloudSubscriptions, setCloudSubscriptions] = useState<CloudAlertSubscription[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<CloudSavedComparison[]>([]);
  const [procurementOrders, setProcurementOrders] = useState<CloudProcurementOrder[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const pendingOnboardingRef = useRef<SignInOnboardingOptions | null>(null);

  const initializeUserSession = async (currentUser: User) => {
    const verified = Boolean(currentUser.emailVerified);
    setIsEmailVerified(verified);

    const pending = pendingOnboardingRef.current;
    pendingOnboardingRef.current = null;

    const fallbackDisplayName = deriveSafeDisplayName(
      pending?.displayName,
      currentUser.displayName,
      currentUser.email
    );
    const fallbackRole: SupplyChainRole =
      pending?.supplyChainRole && SUPPLY_CHAIN_ROLES.includes(pending.supplyChainRole)
        ? pending.supplyChainRole
        : 'FPO / Farmer Collective';
    const fallbackCluster = (
      pending?.regionCluster?.trim() || 'Andhra Pradesh — Anantapur / Guntur'
    ).slice(0, 80);

    // If user signed in with an unverified email/password account, Firestore rules
    // intentionally require email_verified == true for cloud writes.
    // We initialize a clean, error-free protected session until email verification completes.
    if (!verified) {
      const existingLocal = readLocalFallbackProfile(currentUser.uid);
      const sessionProfile: UserProfileData = existingLocal
        ? {
            uid: currentUser.uid,
            displayName: pending?.displayName?.trim()
              ? fallbackDisplayName
              : existingLocal.displayName,
            supplyChainRole: pending?.supplyChainRole
              ? fallbackRole
              : existingLocal.supplyChainRole,
            regionCluster: pending?.regionCluster?.trim()
              ? fallbackCluster
              : existingLocal.regionCluster,
          }
        : {
            uid: currentUser.uid,
            displayName: fallbackDisplayName,
            supplyChainRole: fallbackRole,
            regionCluster: fallbackCluster,
          };

      writeLocalFallbackProfile(sessionProfile);
      setProfile(sessionProfile);
      setIsAdmin(false);
      setProfileReady(false);
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
        const defaultProfile: UserProfileData = {
          uid: currentUser.uid,
          displayName: fallbackDisplayName,
          supplyChainRole: fallbackRole,
          regionCluster: fallbackCluster.length >= 2
            ? fallbackCluster
            : 'Andhra Pradesh — Anantapur / Guntur',
        };

        // Atomic creation of non-PII /users/{uid} + isolated PII /users/{uid}/private/info
        const batch = writeBatch(db);
        batch.set(userRef, {
          ...defaultProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (currentUser.email && currentUser.email.length >= 3) {
          const privRef = doc(db, 'users', currentUser.uid, 'private', 'info');
          batch.set(privRef, {
            ownerId: currentUser.uid,
            email: currentUser.email.slice(0, 160),
            updatedAt: serverTimestamp(),
          });
        }

        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, userPath);
        }

        setProfile(defaultProfile);
      } else {
        const data = snap.data();
        const existingProfile: UserProfileData = {
          uid: String(data.uid || currentUser.uid),
          displayName: deriveSafeDisplayName(
            String(data.displayName || ''),
            currentUser.displayName,
            currentUser.email
          ),
          supplyChainRole: SUPPLY_CHAIN_ROLES.includes(data.supplyChainRole)
            ? data.supplyChainRole
            : 'FPO / Farmer Collective',
          regionCluster:
            String(data.regionCluster || '').trim().length >= 2
              ? String(data.regionCluster).slice(0, 80)
              : 'Andhra Pradesh — Anantapur / Guntur',
        };

        if (pending?.applyToExisting) {
          const nextDisplayName = pending.displayName?.trim()
            ? deriveSafeDisplayName(
                pending.displayName,
                existingProfile.displayName,
                currentUser.email
              )
            : existingProfile.displayName;
          const nextRole: SupplyChainRole =
            pending.supplyChainRole && SUPPLY_CHAIN_ROLES.includes(pending.supplyChainRole)
              ? pending.supplyChainRole
              : existingProfile.supplyChainRole;
          const nextCluster =
            pending.regionCluster && pending.regionCluster.trim().length >= 2
              ? pending.regionCluster.trim().slice(0, 80)
              : existingProfile.regionCluster;

          const hasChanged =
            nextDisplayName !== existingProfile.displayName ||
            nextRole !== existingProfile.supplyChainRole ||
            nextCluster !== existingProfile.regionCluster;

          if (hasChanged) {
            try {
              await updateDoc(userRef, {
                displayName: nextDisplayName,
                supplyChainRole: nextRole,
                regionCluster: nextCluster,
                updatedAt: serverTimestamp(),
              });
              setProfile({
                uid: existingProfile.uid,
                displayName: nextDisplayName,
                supplyChainRole: nextRole,
                regionCluster: nextCluster,
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, userPath);
            }
          } else {
            setProfile(existingProfile);
          }
        } else {
          setProfile(existingProfile);
        }

        // Ensure isolated private email vault record exists for existing verified user
        if (currentUser.email && currentUser.email.length >= 3) {
          const privRef = doc(db, 'users', currentUser.uid, 'private', 'info');
          try {
            const privSnap = await getDoc(privRef);
            if (!privSnap.exists()) {
              await setDoc(privRef, {
                ownerId: currentUser.uid,
                email: currentUser.email.slice(0, 160),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (privErr) {
            // Non-blocking log if private vault is already synced
            try {
              handleFirestoreError(privErr, OperationType.WRITE, privatePath);
            } catch (wrapped) {
              console.error(wrapped);
            }
          }
        }
      }

      // Check trusted admin status safely so non-admin email IDs never fail initialization
      let adminFlag = Boolean(
        currentUser.emailVerified &&
          currentUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
      );
      if (!adminFlag && currentUser.emailVerified) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
          adminFlag = adminSnap.exists();
        } catch {
          adminFlag = false;
        }
      }

      setIsAdmin(adminFlag);
      setProfileReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Quota exceeded')) {
        setAuthError('Daily Firestore quota exceeded. Quota resets tomorrow.');
      } else {
        // Fallback to local non-PII session profile so the user never hits a dead-end login screen
        setProfile({
          uid: currentUser.uid,
          displayName: fallbackDisplayName,
          supplyChainRole: fallbackRole,
          regionCluster: fallbackCluster,
        });
        setProfileReady(false);
      }
    } finally {
      setAuthReady(true);
    }
  };

  // Monitor Firebase Auth state for all email & Google accounts
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);
      setEmailProviderUnavailableFor(null);

      if (!currentUser) {
        setProfile(null);
        setProfileReady(false);
        setIsAdmin(false);
        setIsEmailVerified(false);
        setCloudWatchlistIds([]);
        setCloudFieldQuotes([]);
        setCloudSubscriptions([]);
        setSavedComparisons([]);
        setProcurementOrders([]);
        setAuthReady(true);
        return;
      }

      await initializeUserSession(currentUser);
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

  // Attach user-scoped real-time Firestore listeners ONLY once verified parent profile exists
  useEffect(() => {
    if (!authReady || !user || !profileReady || !isEmailVerified) {
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
            title: String(raw.title || 'Mandi Comparison'),
            commodity: String(raw.commodity || 'Commodity'),
            compareCount: raw.compareCount === 2 ? 2 : 3,
            lotQtl: Number(raw.lotQtl) || 50,
            packagingPerQtl: Number(raw.packagingPerQtl) || 0,
            freightPerKmQtl: Number(raw.freightPerKmQtl) || 1.2,
            shrinkagePer100Km: Number(raw.shrinkagePer100Km) || 0.8,
            marketAName: String(raw.marketAName || 'Market A'),
            marketAPriceQtl: Number(raw.marketAPriceQtl) || 0,
            marketADistanceKm: Number(raw.marketADistanceKm) || 0,
            marketBName: String(raw.marketBName || 'Market B'),
            marketBPriceQtl: Number(raw.marketBPriceQtl) || 0,
            marketBDistanceKm: Number(raw.marketBDistanceKm) || 0,
            marketCName: String(raw.marketCName || 'Market C'),
            marketCPriceQtl: Number(raw.marketCPriceQtl) || 0,
            marketCDistanceKm: Number(raw.marketCDistanceKm) || 0,
            bestMarketName: String(raw.bestMarketName || 'Market A'),
            bestNetPerQtl: Number(raw.bestNetPerQtl) || 0,
            bestNetTotalInr: Number(raw.bestNetTotalInr) || 0,
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
  }, [authReady, user, profileReady, isEmailVerified]);

  const applyBrowserPersistence = async (mode: SessionSecurityMode) => {
    setSessionSecurityMode(mode);
    try {
      localStorage.setItem(SESSION_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage limits
    }
    try {
      await setPersistence(
        auth,
        mode === 'shared_session_only'
          ? browserSessionPersistence
          : browserLocalPersistence
      );
    } catch {
      // Continue safely if browser blocks persistence toggle in iframe
    }
  };

  const setSessionSecurityPreference = async (mode: SessionSecurityMode) => {
    await applyBrowserPersistence(mode);
  };

  const signInWithGoogle = async (
    options?: SignInOnboardingOptions
  ): Promise<boolean> => {
    setAuthError(null);
    setEmailProviderUnavailableFor(null);
    if (options?.sessionMode) {
      await applyBrowserPersistence(options.sessionMode);
    }
    pendingOnboardingRef.current = options || null;

    const provider = new GoogleAuthProvider();
    const customParams: Record<string, string> = {
      prompt: 'select_account',
    };
    if (options?.loginHint?.trim()) {
      customParams.login_hint = options.loginHint.trim();
    }
    provider.setCustomParameters(customParams);

    try {
      await signInWithPopup(auth, provider);
      return true;
    } catch (err) {
      pendingOnboardingRef.current = null;
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Sign-in window was closed before completing authentication.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'Browser blocked the sign-in popup. Allow popups for this site and click Continue again.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          'This preview domain is not yet allowlisted in Firebase Auth Authorized Domains.'
        );
      } else {
        setAuthError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
      }
      return false;
    }
  };

  const signInWithEmail = async (input: EmailAuthInput): Promise<boolean> => {
    setAuthError(null);
    setEmailProviderUnavailableFor(null);

    const emailCheck = normalizeAndValidateEmail(input.email);
    if (!emailCheck.valid) {
      setAuthError(emailCheck.error || 'Enter a valid email address.');
      return false;
    }
    if (!input.password || input.password.length < 6) {
      setAuthError('Enter your account password (minimum 6 characters).');
      return false;
    }

    if (input.sessionMode) {
      await applyBrowserPersistence(input.sessionMode);
    }

    pendingOnboardingRef.current = {
      displayName: input.displayName,
      supplyChainRole: input.supplyChainRole,
      regionCluster: input.regionCluster,
      applyToExisting: input.applyToExisting,
    };

    try {
      await signInWithEmailAndPassword(auth, emailCheck.normalizedEmail, input.password);
      return true;
    } catch (err) {
      pendingOnboardingRef.current = null;
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setEmailProviderUnavailableFor(emailCheck.normalizedEmail);
        return false;
      }
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setAuthError(
          'Incorrect email or password. If this is a new email ID, switch to Create Email Account.'
        );
      } else if (code === 'auth/too-many-requests') {
        setAuthError(
          'Too many failed attempts for this email ID. Wait a moment or reset your password.'
        );
      } else {
        setAuthError(err instanceof Error ? err.message : 'Unable to sign in with email.');
      }
      return false;
    }
  };

  const registerWithEmail = async (input: EmailAuthInput): Promise<boolean> => {
    setAuthError(null);
    setEmailProviderUnavailableFor(null);

    const emailCheck = normalizeAndValidateEmail(input.email);
    if (!emailCheck.valid) {
      setAuthError(emailCheck.error || 'Enter a valid email address.');
      return false;
    }

    const pwdCheck = validatePasswordStrength(input.password);
    if (!pwdCheck.valid) {
      setAuthError(pwdCheck.error || 'Choose a stronger password (at least 8 characters).');
      return false;
    }

    if (input.sessionMode) {
      await applyBrowserPersistence(input.sessionMode);
    }

    const safeName = deriveSafeDisplayName(input.displayName, null, emailCheck.normalizedEmail);
    pendingOnboardingRef.current = {
      displayName: safeName,
      supplyChainRole: input.supplyChainRole,
      regionCluster: input.regionCluster,
      applyToExisting: true,
    };

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        emailCheck.normalizedEmail,
        input.password
      );
      try {
        await updateFirebaseAuthProfile(cred.user, { displayName: safeName });
      } catch {
        // Ignore non-critical displayName update failure
      }
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Verification email can also be re-triggered manually
      }
      return true;
    } catch (err) {
      pendingOnboardingRef.current = null;
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setEmailProviderUnavailableFor(emailCheck.normalizedEmail);
        return false;
      }
      if (code === 'auth/email-already-in-use') {
        setAuthError(
          'An account with this email ID already exists. Sign in with your password or continue with Google.'
        );
      } else if (code === 'auth/weak-password') {
        setAuthError('Choose a stronger password (at least 8 characters).');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Unable to register email account.');
      }
      return false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setAuthError(null);
    const emailCheck = normalizeAndValidateEmail(email);
    if (!emailCheck.valid) {
      setAuthError(emailCheck.error || 'Enter your registered email address first.');
      return false;
    }
    try {
      await sendPasswordResetEmail(auth, emailCheck.normalizedEmail);
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setEmailProviderUnavailableFor(emailCheck.normalizedEmail);
        return false;
      }
      setAuthError(err instanceof Error ? err.message : 'Unable to send password reset email.');
      return false;
    }
  };

  const sendVerificationEmailToUser = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Wait a moment before requesting another verification email.'
      );
      return false;
    }
  };

  const refreshVerificationState = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setAuthError(null);
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      const refreshed = auth.currentUser;
      setUser(refreshed);
      if (refreshed.emailVerified) {
        await initializeUserSession(refreshed);
        return true;
      }
      return false;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to refresh verification state.');
      return false;
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    setEmailProviderUnavailableFor(null);
    await firebaseSignOut(auth);
  };

  const updateUserProfile = async (updates: {
    displayName: string;
    supplyChainRole: SupplyChainRole;
    regionCluster: string;
  }) => {
    if (!user) return;
    const safeName = deriveSafeDisplayName(updates.displayName, user.displayName, user.email);
    const safeCluster = updates.regionCluster.trim().slice(0, 80);
    if (safeName.length < 1 || safeCluster.length < 2) {
      throw new Error('Display name and market cluster are required.');
    }
    if (!SUPPLY_CHAIN_ROLES.includes(updates.supplyChainRole)) {
      throw new Error('Invalid supply chain role selected.');
    }

    const updatedProfile: UserProfileData = {
      uid: user.uid,
      displayName: safeName,
      supplyChainRole: updates.supplyChainRole,
      regionCluster: safeCluster,
    };

    if (!user.emailVerified || !profileReady) {
      writeLocalFallbackProfile(updatedProfile);
      setProfile(updatedProfile);
      return;
    }

    const userPath = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: safeName,
        supplyChainRole: updates.supplyChainRole,
        regionCluster: safeCluster,
        updatedAt: serverTimestamp(),
      });
      setProfile(updatedProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userPath);
    }
  };

  const toggleCloudWatchlist = async (lotId: string) => {
    if (!user || !user.emailVerified || !profileReady) return;
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
    if (!user.emailVerified) {
      throw new Error(
        'Verify your email address first (or sign in with Google) to publish shared APMC quotes.'
      );
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
    if (!user || !user.emailVerified) return;
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
    if (!user.emailVerified) {
      throw new Error(
        'Verify your email address first (or sign in with Google) to save comparisons to Cloud Firestore.'
      );
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
    if (!user || !user.emailVerified) return;
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
    if (!user || !user.emailVerified) return;
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
    if (!user.emailVerified) {
      throw new Error(
        'Verify your email address first (or sign in with Google) to record cloud dispatch orders.'
      );
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
    if (!user || !user.emailVerified) return;
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
    if (!user || !user.emailVerified) return;
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
    if (!user.emailVerified) {
      throw new Error(
        'Verify your email address first (or sign in with Google) to save cloud alert digests.'
      );
    }
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
    if (!user || !user.emailVerified) return;
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
        isEmailVerified,
        sessionSecurityMode,
        emailProviderUnavailableFor,
        profile,
        publishedMandiLots,
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
        clearAuthError: () => {
          setAuthError(null);
          setEmailProviderUnavailableFor(null);
        },
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
