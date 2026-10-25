import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import * as fs from 'fs';

/**
 * Security Rules Verification Suite covering all 12 "Dirty Dozen" payloads
 * documented in security_spec.md.
 */
export async function runDirtyDozenSecurityTests() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'demo-mandilens-security',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    const aliceVerified = testEnv.authenticatedContext('alice_1', {
      email: 'alice@fpo.org',
      email_verified: true,
    });
    const spoofedAdmin = testEnv.authenticatedContext('spoof_admin', {
      email: 'nagireddyrekkala999@gmail.com',
      email_verified: false,
    });
    const bobVerified = testEnv.authenticatedContext('bob_2', {
      email: 'bob@fpo.org',
      email_verified: true,
    });

    const aliceDb = aliceVerified.firestore();
    const bobDb = bobVerified.firestore();
    const spoofDb = spoofedAdmin.firestore();

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'users', 'bob_2'), {
        uid: 'bob_2',
        displayName: 'Bob Grower',
        supplyChainRole: 'Independent Grower',
        regionCluster: 'Maharashtra — Nashik / Pune',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'users', 'bob_2', 'private', 'info'), {
        ownerId: 'bob_2',
        email: 'bob@fpo.org',
        updatedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'procurementOrders', 'order_settled_1'), {
        ownerId: 'bob_2',
        organization: 'Bob Farm',
        commodity: 'Onion',
        originCluster: 'Nashik',
        destinationMandi: 'Lasalgaon APMC',
        quantityQtl: 60,
        expectedNetPerQtl: 2150,
        dispatchStatus: 'settled',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // 1. Shadow Field Injection
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice_1'), {
        uid: 'alice_1',
        displayName: 'Alice FPO',
        supplyChainRole: 'FPO / Farmer Collective',
        regionCluster: 'Maharashtra — Nashik / Pune',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isAdmin: true,
      })
    );

    // 2. Admin Email Spoofing (email_verified: false)
    await assertFails(
      setDoc(doc(spoofDb, 'mandiLots', 'lot-spoof-1'), {
        lotId: 'lot-spoof-1',
        authorId: 'spoof_admin',
        commodity: 'Onion',
        variety: 'Red FAQ',
        category: 'Vegetables',
        mandi: 'Lasalgaon APMC',
        district: 'Nashik',
        state: 'Maharashtra',
        grade: 'FAQ',
        moistureSpec: 'Dry',
        minPrice: 1900,
        maxPrice: 2500,
        modalPrice: 2200,
        change24hPct: 1.5,
        arrivalsQtl: 12000,
        defaultDistanceKm: 38,
        mandiFeePct: 1.0,
        hamaliPerQtl: 26,
        status: 'published',
        verificationTier: 'official_apmc',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 3. Privilege Escalation into /admins
    await assertFails(
      setDoc(doc(aliceDb, 'admins', 'alice_1'), {
        uid: 'alice_1',
        grantedBy: 'alice_1',
        createdAt: serverTimestamp(),
      })
    );

    // 4. Cross-User PII Read
    await assertFails(getDoc(doc(aliceDb, 'users', 'bob_2', 'private', 'info')));

    // 7. Orphaned Subcollection Write before /users/alice_1 exists
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice_1', 'watchlist', 'lot-lasalgaon-onion'), {
        ownerId: 'alice_1',
        lotId: 'lot-lasalgaon-onion',
        createdAt: serverTimestamp(),
      })
    );

    // Create legitimate baseline profile for Alice
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice_1'), {
        uid: 'alice_1',
        displayName: 'Alice FPO',
        supplyChainRole: 'FPO / Farmer Collective',
        regionCluster: 'Maharashtra — Nashik / Pune',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 5. ID Poisoning (>128 chars)
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice_1', 'watchlist', 'z'.repeat(140)), {
        ownerId: 'alice_1',
        lotId: 'lot-lasalgaon-onion',
        createdAt: serverTimestamp(),
      })
    );

    // 6. Client Timestamp Forgery on procurementOrders
    await assertFails(
      setDoc(doc(aliceDb, 'procurementOrders', 'order_forged_time'), {
        ownerId: 'alice_1',
        organization: 'Alice FPO',
        commodity: 'Onion',
        originCluster: 'Nashik',
        destinationMandi: 'Lasalgaon APMC',
        quantityQtl: 50,
        expectedNetPerQtl: 2100,
        dispatchStatus: 'planned',
        createdAt: new Date('2021-01-01T00:00:00Z'),
        updatedAt: serverTimestamp(),
      })
    );

    // 8. Tier Spoofing on /mandiLots (non-admin setting official_apmc)
    await assertFails(
      setDoc(doc(aliceDb, 'mandiLots', 'lot-tier-spoof'), {
        lotId: 'lot-tier-spoof',
        authorId: 'alice_1',
        commodity: 'Onion',
        variety: 'Red FAQ',
        category: 'Vegetables',
        mandi: 'Lasalgaon APMC',
        district: 'Nashik',
        state: 'Maharashtra',
        grade: 'FAQ',
        moistureSpec: 'Dry',
        minPrice: 1900,
        maxPrice: 2500,
        modalPrice: 2200,
        change24hPct: 1.5,
        arrivalsQtl: 12000,
        defaultDistanceKm: 38,
        mandiFeePct: 1.0,
        hamaliPerQtl: 26,
        status: 'published',
        verificationTier: 'official_apmc',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 9. Terminal State Bypass on settled procurementOrder
    await assertFails(
      updateDoc(doc(bobDb, 'procurementOrders', 'order_settled_1'), {
        dispatchStatus: 'in_transit',
        updatedAt: serverTimestamp(),
      })
    );

    // 10. State Shortcutting (planned -> settled directly)
    await assertSucceeds(
      setDoc(doc(aliceDb, 'procurementOrders', 'order_alice_1'), {
        ownerId: 'alice_1',
        organization: 'Alice FPO',
        commodity: 'Wheat',
        originCluster: 'Sehore',
        destinationMandi: 'Sehore APMC',
        quantityQtl: 80,
        expectedNetPerQtl: 3050,
        dispatchStatus: 'planned',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb, 'procurementOrders', 'order_alice_1'), {
        dispatchStatus: 'settled',
        updatedAt: serverTimestamp(),
      })
    );

    // 11. Unauthorized Blanket List Scraping across procurementOrders
    await assertFails(getDocs(collection(aliceDb, 'procurementOrders')));

    // 12. Locked Comparison Tampering
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice_1', 'savedComparisons', 'comp_1'), {
        ownerId: 'alice_1',
        title: 'Nashik Onion Arbitrage',
        commodity: 'Onion',
        compareCount: 2,
        lotQtl: 60,
        packagingPerQtl: 45,
        freightPerKmQtl: 1.45,
        shrinkagePer100Km: 0.9,
        marketAName: 'Chandwad Yard',
        marketAPriceQtl: 2110,
        marketADistanceKm: 14,
        marketBName: 'Lasalgaon APMC',
        marketBPriceQtl: 2280,
        marketBDistanceKm: 38,
        marketCName: 'N/A',
        marketCPriceQtl: 0,
        marketCDistanceKm: 0,
        bestMarketName: 'Lasalgaon APMC',
        bestNetPerQtl: 2145,
        bestNetTotalInr: 128700,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users', 'alice_1', 'savedComparisons', 'comp_1'), {
        status: 'locked',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      deleteDoc(doc(aliceDb, 'users', 'alice_1', 'savedComparisons', 'comp_1'))
    );
  } finally {
    await testEnv.cleanup();
  }
}
