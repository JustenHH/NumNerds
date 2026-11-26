# Security Specification — Numlock Nerds Firestore Rules

## 1. Data Invariants
1. **PII Isolation**: `/users/{userId}` stores private email addresses and is strictly readable/writable only by `request.auth.uid == userId`. Public guildmate identities live in `/members/{userId}` without email or phone numbers.
2. **Ownership Integrity**: Characters (`ownerId`), Events (`creatorId`), Signups (`userId`), Materials (`creatorId`), and Loot (`loggerId`) must bind to `request.auth.uid` on creation and remain immutable on update.
3. **Referential Signup Integrity**: A signup under `/events/{eventId}/signups/{signupId}` can only be created or updated if the parent `/events/{eventId}` exists with `status in ['open', 'locked']` AND the referenced `/characters/{characterId}` exists and belongs to `request.auth.uid`.
4. **Terminal State Locking**: Once an event reaches `status == 'completed'` or `status == 'cancelled'`, non-admin updates are strictly rejected.
5. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must equal `request.time`.
6. **Invite-Only Guild Admission**: Only Admins or verified users with an existing `/members/{uid}` document can read or write `/members`, `/characters`, `/events`, `/signups`, `/materials`, or `/loot`. Non-admins can only create `/members/{uid}` atomically alongside `/redemptions/{uid}` and a valid `/invites/{code}` or `/emailInvites/{emailHash}`.

## 2. Dirty Dozen Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: Anonymous client attempts `get` on `/characters/char_1`.
2. **Unverified Email Write**: Signed-in user with `email_verified: false` attempts to create a character.
3. **Uninvited Google Account**: Signed-in user without `/members/{uid}` attempts to read `/characters` or create `/members/{uid}` directly without a valid invite batch.
4. **Cross-User PII Leak**: User B attempts `get` on `/users/userA` or `/emailInvites/{hashA}` to read User A's email.
5. **Identity Spoofing on Create**: User B attempts to create `/characters/char_spoof` with `ownerId: "userA"`.
6. **Ghost Field / Shadow Write**: User A attempts to create `/characters/char_1` with extra key `isAdmin: true`.
7. **ID Poisoning**: User A attempts `create` on `/characters/invalid$id!with*spaces` or a >128 char ID.
8. **Owner Mutability Exploit**: User A attempts `update` on `/characters/char_1` changing `ownerId` to `"userB"`.
9. **Unauthorized Character Update**: User B attempts `update` on User A's character `/characters/char_1`.
10. **Sign Up With Someone Else's Character**: User B creates a signup referencing User A's `characterId`.
11. **Sign Up to Completed Event**: User A attempts to create a signup under an event with `status: "completed"`.
12. **Blanket List / Invite Scrape**: Uninvited user queries `/invites` or `/emailInvites`, or queries `/characters` without matching `guildId == 'numlock-nerds'`.
