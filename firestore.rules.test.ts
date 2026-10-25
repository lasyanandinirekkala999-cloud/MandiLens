import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    const aliceUnverified = testEnv.authenticatedContext('alice_unverified', {
      email: 'spoof@fpo.org',
      email_verified: false,
    });
    const bobVerified = testEnv.authenticatedContext('bob_2', {
      email: 'bob@fpo.org',
      email_verified: true,
    });

    const aliceDb = aliceVerified.firestore();
    const bobDb = bobVerified.firestore();
    const unverifiedDb = aliceUnverified.firestore();

    // Seed Bob's legitimate profile & private doc via rules-disabled setup for read isolation test
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

    // 2. Unverified Email Write
    await assertFails(
      setDoc(doc(unverifiedDb, 'users', 'alice_unverified'), {
        uid: 'alice_unverified',
        displayName: 'Spoof User',
        supplyChainRole: 'Independent Grower',
        regionCluster: 'Maharashtra — Nashik / Pune',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 7. Orphaned Subcollection Write (before parent /users/alice_1 exists)
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice_1', 'watchlist', 'lot-lasalgaon-onion'), {
        ownerId: 'alice_1',
        lotId: 'lot-lasalgaon-onion',
        createdAt: serverTimestamp(),
      })
    );

    // 8. Orphaned FieldQuote Write (before parent /users/alice_1 exists)
    await assertFails(
      setDoc(doc(aliceDb, 'fieldQuotes', 'quote_orphan_1'), {
        ownerId: 'alice_1',
        commodity: 'Onion',
        variety: 'Red FAQ',
        category: 'Vegetables',
        mandi: 'Yeola APMC',
        district: 'Nashik',
        state: 'Maharashtra',
        grade: 'FAQ',
        modalPrice: 2200,
        minPrice: 2000,
        maxPrice: 2400,
        arrivalsQtl: 5000,
        createdAt: serverTimestamp(),
      })
    );

    // 6. Client Timestamp Forgery
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice_1'), {
        uid: 'alice_1',
        displayName: 'Alice FPO',
        supplyChainRole: 'FPO / Farmer Collective',
        regionCluster: 'Maharashtra — Nashik / Pune',
        createdAt: new Date('2020-01-01T00:00:00Z'),
        updatedAt: serverTimestamp(),
      })
    );

    // Valid Baseline Create for Alice so remaining update/spoof tests can execute
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

    // 3. Identity Spoofing on fieldQuotes
    await assertFails(
      setDoc(doc(aliceDb, 'fieldQuotes', 'quote_spoof_1'), {
        ownerId: 'bob_2',
        commodity: 'Onion',
        variety: 'Red FAQ',
        category: 'Vegetables',
        mandi: 'Yeola APMC',
        district: 'Nashik',
        state: 'Maharashtra',
        grade: 'FAQ',
        modalPrice: 2200,
        minPrice: 2000,
        maxPrice: 2400,
        arrivalsQtl: 5000,
        createdAt: serverTimestamp(),
      })
    );

    // 4. Cross-User PII Read
    await assertFails(getDoc(doc(aliceDb, 'users', 'bob_2', 'private', 'info')));

    // 5. ID Poisoning (>128 chars)
    const poisonedId = 'x'.repeat(140);
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice_1', 'watchlist', poisonedId), {
        ownerId: 'alice_1',
        lotId: 'lot-lasalgaon-onion',
        createdAt: serverTimestamp(),
      })
    );

    // 9. Immutable Field Tampering (mutating createdAt during update)
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice_1'), {
        displayName: 'Alice Updated',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 10. Value Poisoning on Update (invalid enum role)
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice_1'), {
        supplyChainRole: 'RootSuperAdmin',
        updatedAt: serverTimestamp(),
      })
    );

    // 11. Unauthorized Blanket List Scraping across fieldQuotes
    await assertFails(getDocs(collection(bobDb, 'fieldQuotes')));

    // 12. Out-of-Bounds Numeric Quote (negative modalPrice)
    await assertFails(
      setDoc(doc(aliceDb, 'fieldQuotes', 'quote_invalid_num'), {
        ownerId: 'alice_1',
        commodity: 'Onion',
        variety: 'Red FAQ',
        category: 'Vegetables',
        mandi: 'Yeola APMC',
        district: 'Nashik',
        state: 'Maharashtra',
        grade: 'FAQ',
        modalPrice: -500,
        minPrice: 2000,
        maxPrice: 2400,
        arrivalsQtl: 5000,
        createdAt: serverTimestamp(),
      })
    );
  } finally {
    await testEnv.cleanup();
  }
}
