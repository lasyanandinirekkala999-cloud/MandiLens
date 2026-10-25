# MandiLens Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Gate**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Split-Collection Isolation**: User email addresses are never stored in `/users/{userId}`; they are strictly isolated inside `/users/{userId}/private/info` and readable only by `request.auth.uid == userId` when parent `/users/{userId}` exists and belongs to `request.auth.uid`.
4. **Master Gate Relational Sync**: Every single-document operation (`get`, `create`, `update`, `delete`) on `/users/{userId}/private/{docId}`, `/users/{userId}/watchlist/{lotId}`, and `/users/{userId}/subscriptions/{subscriptionId}` verifies parent ownership via `get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`.
5. **Global Consistency on Top-Level Writes**: Creating a `/fieldQuotes/{quoteId}` document requires `exists(/databases/$(database)/documents/users/$(incoming().ownerId))` so orphaned quotes cannot exist without an active user profile.
6. **Query Enforcer (No Blanket Reads)**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid` without invoking `get()` or `exists()`.
7. **Temporal & Identity Immutability**: `createdAt` and `updatedAt` must equal `request.time` on write; `uid`, `ownerId`, and `createdAt` can never mutate on update.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection (`users/{uid}`)**: Valid `UserProfile` payload plus extra `"isAdmin": true` ghost key -> `PERMISSION_DENIED`.
2. **Unverified Email Write (`users/{uid}`)**: Authenticated user with `email_verified: false` attempting `create` -> `PERMISSION_DENIED`.
3. **Identity Spoofing (`fieldQuotes/{quoteId}`)**: User `alice_1` sets `ownerId: "bob_2"` on quote creation -> `PERMISSION_DENIED`.
4. **Cross-User PII Read (`users/bob_2/private/info`)**: Authenticated `alice_1` attempts `get` on Bob's isolated PII document -> `PERMISSION_DENIED`.
5. **ID Poisoning (`users/{userId}/watchlist/{junkId}`)**: Document ID containing spaces/slashes or >128 chars -> `PERMISSION_DENIED`.
6. **Client Timestamp Forgery (`users/{uid}`)**: `createdAt` set to a past/future timestamp instead of `request.time` -> `PERMISSION_DENIED`.
7. **Orphaned Subcollection Write (`users/alice_1/watchlist/lot-1`)**: Writing a watchlist item when parent `/users/alice_1` profile does not exist -> `PERMISSION_DENIED`.
8. **Orphaned FieldQuote Write (`fieldQuotes/quote-1`)**: Creating a quote when `/users/alice_1` profile has not been initialized -> `PERMISSION_DENIED`.
9. **Immutable Field Tampering (`users/alice_1`)**: Updating `displayName` while mutating `createdAt` or `uid` -> `PERMISSION_DENIED`.
10. **Value Poisoning on Update (`users/alice_1`)**: Updating whitelisted key `supplyChainRole` with an unapproved role string `"SuperAdmin"` or 500-char string -> `PERMISSION_DENIED`.
11. **Unauthorized Blanket List Scraping (`fieldQuotes`)**: Unfiltered collection list query across all users' `fieldQuotes` -> `PERMISSION_DENIED`.
12. **Out-of-Bounds Numeric Quote (`fieldQuotes/quote-2`)**: Submitting negative `modalPrice: -500` or `minPrice > maxPrice` -> `PERMISSION_DENIED`.
