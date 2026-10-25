# MandiLens Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Gate**: Every write operation across all collections requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Bootstrapped & Registry RBAC (`isAdmin()`)**: Admin rights are granted exclusively when `isVerifiedUser()` holds AND either `request.auth.token.email == 'nagireddyrekkala999@gmail.com'` or `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`. Unverified spoofed emails are strictly denied.
4. **PII Split-Collection Isolation**: User email addresses are isolated in `/users/{userId}/private/info` and never stored in `/users/{userId}`.
5. **Master Gate Relational Sync**: Every single-document operation (`get`, `create`, `update`, `delete`) on `/users/{userId}/private/{docId}`, `/users/{userId}/watchlist/{lotId}`, `/users/{userId}/savedComparisons/{comparisonId}`, and `/users/{userId}/subscriptions/{subscriptionId}` verifies parent ownership via `get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`.
6. **Privilege Escalation Prevention on `/mandiLots/{lotId}`**: Standard verified users can only publish `verificationTier == 'fpo_verified'` lots with an existing `/users/{authorId}` profile; setting `verificationTier == 'official_apmc'` is strictly restricted to `isAdmin()`.
7. **Terminal State Locking**:
   - Once a `SavedComparisonDoc` reaches `status == 'locked'`, subsequent owner updates and deletes are rejected.
   - Once a `ProcurementLedgerDoc` reaches `dispatchStatus == 'settled'`, subsequent owner state transitions are rejected.
   - Once a `MandiLotDoc` reaches `status == 'archived'`, non-admin updates are rejected.
8. **Query Enforcer (Zero Blanket Reads & Zero `get()`/`exists()` in `allow list`)**: Every `allow list` block explicitly evaluates `existing()` (`existing().status == 'published'` or `existing().ownerId == request.auth.uid`) with zero database lookups inside `list`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection (`users/{uid}`)**: Valid `UserProfile` payload plus extra `"isAdmin": true` ghost key -> `PERMISSION_DENIED`.
2. **Admin Email Spoofing (`mandiLots/{lotId}`)**: Attacker with `email: 'nagireddyrekkala999@gmail.com'` and `email_verified: false` attempts to publish `verificationTier: 'official_apmc'` -> `PERMISSION_DENIED`.
3. **Privilege Escalation (`admins/{uid}`)**: Non-admin verified user attempts to create `/admins/attacker_1` -> `PERMISSION_DENIED`.
4. **Cross-User PII Read (`users/bob_2/private/info`)**: Authenticated `alice_1` attempts `get` on Bob's isolated PII document -> `PERMISSION_DENIED`.
5. **ID Poisoning (`users/{userId}/watchlist/{junkId}`)**: Document ID >128 characters or containing invalid symbols -> `PERMISSION_DENIED`.
6. **Client Timestamp Forgery (`procurementOrders/{orderId}`)**: `createdAt` set to a forged client timestamp rather than `request.time` -> `PERMISSION_DENIED`.
7. **Orphaned Subcollection Write (`users/alice_1/savedComparisons/comp-1`)**: Creating a saved comparison before parent `/users/alice_1` exists -> `PERMISSION_DENIED`.
8. **Tier Spoofing on `/mandiLots/{lotId}`**: Regular verified user `alice_1` attempts to create a lot with `verificationTier: 'official_apmc'` -> `PERMISSION_DENIED`.
9. **Terminal State Bypass (`procurementOrders/{orderId}`)**: Owner attempts to revert a `'settled'` procurement dispatch back to `'in_transit'` -> `PERMISSION_DENIED`.
10. **State Shortcutting (`procurementOrders/{orderId}`)**: Owner attempts to jump directly from `'planned'` to `'settled'` skipping `'in_transit'` -> `PERMISSION_DENIED`.
11. **Unauthorized Blanket List Scraping (`procurementOrders`)**: Unfiltered `list` query across all users' dispatch ledger records -> `PERMISSION_DENIED`.
12. **Locked Comparison Tampering (`users/alice_1/savedComparisons/comp-locked`)**: Owner attempts to delete or edit a comparison after locking (`status == 'locked'`) -> `PERMISSION_DENIED`.
