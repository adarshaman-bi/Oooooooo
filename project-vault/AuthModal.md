# AuthModal 🔑

The central modal dialog managing user identity, onboarding, and auth sessions.

- **Path**: `src/components/AuthModal.tsx`
- **Related Notes**: [[AuthContext]], [[Supabase Schema]], [[Welcome]]

---

## 🔒 Security Features

1. **OAuth Sign-In**: Integrated with Google OAuth Secure Sign-In using unified redirect URL helpers in `security.ts` (prevents "deployment not found" errors).
2. **Brute Force Lockout**: Client-side lockout checks that block sign-in attempts for 60 seconds after 3 sequential failures.
3. **Guest Session Flow**:
   - Allows users to experience the application as a guest reader without signing up.
   - Restored to render the **Continue as Guest** button unconditionally, skipping restrictive environment checks.
   - Selecting guest mode calls `enableGuestMode()` and maps local storage preferences under `uid = 'guest'`.

---

## 🎨 Interactive States
- **Sign In**: Default username/email password entry.
- **Sign Up**: Account creation gate (with role selector: student, moderator, educator).
- **Forgot Password**: Password recovery link flow.
