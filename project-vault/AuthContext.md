# AuthContext 🔑

Manages user sessions, authentication hooks, and local preferences syncing.

- **Path**: `src/context/AuthContext.tsx`
- **Related Notes**: [[AuthModal]], [[Supabase Schema]], [[dbService]]

---

## ⚡ Global Exports

- `user`: Currently active UserProfile session.
- `isGuest`: Boolean indicating if the session is a simulated guest session.
- `loading`: Boolean state indicating if auth is initializing.
- `enableGuestMode`: Function that sets up `localStorage` entries mapping a temporary guest session under `uid = 'guest'`.
- `updatePreferences`: Syncs exam type, year, and subject changes.

---

## 👥 Guest Session Simulation
If no Supabase session is detected, `AuthContext` falls back to checking `localStorage` for a guest session. The guest profile defaults to:
- **uid**: `'guest'`
- **email**: `'guest@biovised.org'`
- **displayName**: `'Guest Candidate'`
- **role**: `'student'`
- Onboarding is completed once a guest chooses their initial exam focus (`JEE` or `NEET`).
