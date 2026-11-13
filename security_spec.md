# Security Specification for Firestore Rules

## Data Invariants
- A Pilgrim must have a unique `nationalId` as their document ID.
- `registrationReference` must be generated at creation and remain immutable.
- `createdAt` timestamps are immutable for all entities.
- Only 'مدير عام (Master Admin)' can manage other admin users and global campaign settings.
- Pilgrims can only view their own record via the portal using a combination of `registrationReference` and `nationalId`.
- Public can read `packages` and `announcements`.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a pilgrim with a different UID in metadata (if UIDs were used, here we use nationalId).
2. **State Shortcutting**: Attempt to create a pilgrim with status 'مكتمل الدفع' (Paid) directly.
3. **Immutable Field Violation**: Attempt to update `createdAt` on a package.
4. **Shadow Field Injection**: Attempt to add `isAdmin: true` to a pilgrim document.
5. **PII Leak**: Attempt to `list` all pilgrims as an unauthenticated user.
6. **Privilege Escalation**: Attempt to create an `AdminUser` document as a regular user.
7. **Resource Poisoning**: Attempt to write a 1MB string into an announcement title.
8. **Orphaned Write**: Attempt to create an activity log without a valid `adminId`.
9. **Unauthorized Modification**: Attempt to change another admin's password (pin).
10. **Schema Bypass**: Attempt to create a package without a `price`.
11. **Cross-Tenant Access**: Attempt to read a pilgrim's record using only their ID but wrong reference.
12. **System Field Tampering**: Attempt to manually update the `updatedAt` server timestamp field with a client value.

## Test Suite Plan
A test suite will be implemented using `@firebase/rules-unit-testing` (simulated logic) to ensure all above payloads are rejected.
