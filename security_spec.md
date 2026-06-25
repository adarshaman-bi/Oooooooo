# Biovised Firestore Security Specification (Phase 0 TDD Specs)

This specification details the security invariants and protection mechanisms for the Biovised JEE/NEET educational portal, implementing rigid Attribute-Based Access Control (ABAC) and a zero-trust model.

## 1. Core Data Invariants

1. **Identity Isolation (Split-Collection Protection)**:
   - A student can only view and mutate their own private assets (`users/{userId}`, `/users/{userId}/watchHistory`, `/users/{userId}/watchLater`, `/users/{userId}/likedVideos`, `/users/{userId}/following`, `/users/{userId}/notifications`).
   - Standard users cannot view other standard users' private metadata (isolation of private PII).
   
2. **Access Control (Immutability & Safety)**:
   - Roles (`role`: 'user', 'teacher', 'institute', 'moderator', 'admin') are strictly system-assigned. No user can register as an admin or self-escalate their role.
   - Core identifiers (`userId`, `id`, `createdAt`) are unchangeable once written.
   
3. **Verified Educators & Reviews Integration**:
   - Only validated, signed-in users can publish reviews on educators/institutes.
   - Any review comment or rating must strictly have an author UID matching the authenticated requester.
   - Ratings must be bounded between `1` and `5`.

4. **Moderation Queue**:
   - Standard guests or students can submit reports to the global moderation collection (`/reports`), but only users with administrative or moderator status logged in DB can fetch/resolve them.

---

## 2. The "Dirty Dozen" Malicious Payloads

The ruleset is explicitly audited and designed to return `PERMISSION_DENIED` for these 12 attacks:

1. **The Privilege Escalation Attack**:
   - Payload modifying `role` from `"user"` to `"admin"` in `/users/{userId}`.
2. **The Identity Spoofing (Owner Hijacking) write**:
   - Authenticated student `user_abc` attempting to create a watchHistory entry with `userId` = `"user_def"`.
3. **The Orphaned Resource Attack**:
   - Creating a `Playlist` referencing a non-existent teacher id or database path.
4. **The Ghost Field (Shadow Update) Attack**:
   - Standard user update to teacher page appending a `isVerified: true` flag.
5. **The Value Poisoning Attack**:
   - Sending a floating trust score rating of `150.5` or non-numeric ratings in teacher update payloads.
6. **The Denial-of-Wallet (Resource Exhaustion) ID Attack**:
   - Creating a history document with an ID string length of 1.5KB to waste bandwidth and space.
7. **The Retro Temp Tampering Attack**:
   - Manually sending a student update with a customized future `createdAt` value instead of the server timestamp.
8. **The PII Blanket Query Scraping Attack**:
   - Standard authenticated student querying the overall list of global `/users` collection without filtering to their specific UID.
9. **The Terminus Outcome Locking Bypass**:
   - Attempting to update a report with a `"resolved"` status back to `"pending"` after a moderator has already locked the resolution.
10. **The Spam Review Flood (Negative Ratings)**:
    - Review with rating negative `-5` submitted to damage a competitor's trust score.
11. **The Guest Mutation Attempt**:
    - Unauthenticated guest user attempting to bookmark a lecture into `watchLater`.
12. **The Remote Moderation Deletion**:
    - Standard user attempting to delete a pending abuse/spam report from `/reports`.

---

## 3. Test Invariants

All test payloads mentioned above must be evaluated sequentially against the security rules, ensuring:
- `auth != null`
- Identity matches (`userId == request.auth.uid`)
- Strong verification boundaries.
