# BioVised Security Audit & Fixes — 2026-07-09

Context: full scan of `C:\onion.so` against `brain.md`, vault, `security_spec.md`, and OWASP notes.

## Executive summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | Fixed in code (+ SQL migration) |
| High | 4 | Fixed |
| Medium | 4 | Fixed / mitigated |
| Low / residual | 3 | Documented (ops follow-up) |

---

## Critical findings (fixed)

### 1. Privilege escalation via signup role
- **Issue**: `signUpEmail` / `createUserProfile` accepted client `role` (AuthModal offered teacher/institute). RLS `profiles_insert_own` only checked `auth.uid() = uid`, so any user could insert `role: 'admin'`.
- **Fix**:
  - Force `role: 'user'` in `AuthContext` + `dbService.createUserProfile`
  - Insert-only if profile missing (never upsert overwrite of admin)
  - Removed "Join As" role selector from `AuthModal`
  - Migration `supabase/migrations/005_role_immutability.sql` (RLS + trigger)

### 2. Auth session wiped after login
- **Issue**: `handleAuthUser` always called `setSupabaseUser(null)` after setting the user → session lost for API Bearer tokens / guest detection.
- **Fix**: Only clear `supabaseUser` on logout / null session.

---

## High findings (fixed)

### 3. Overly permissive CORS
- **Issue**: Any `*.vercel.app` and `*.run.app` origin accepted with credentials.
- **Fix**: Shared `isAllowedOrigin()` — localhost, biovise production, `biovise*.vercel.app` previews, `ALLOWED_ORIGINS` env only.

### 4. Service-role / API key client fallbacks
- **Issue**: `youtubeService.ts` fell back to `VITE_SUPABASE_SERVICE_ROLE_KEY` / `VITE_YOUTUBE_API_KEY` (could leak if ever set in Vite env).
- **Fix**: Server-only `process.env` secrets; no VITE service-role fallback.

### 5. YouTube proxy ID injection / quota abuse
- **Issue**: Unvalidated `videoId` / `channelId` / `playlistId` passed into upstream URLs.
- **Fix**: Format validators on public YouTube proxy routes + lecture routes.

### 6. Error message disclosure
- **Issue**: Many handlers returned raw `err.message` (schema/DB leaks).
- **Fix**: All those 500s use `sanitizeError()`.

---

## Medium findings (fixed / mitigated)

| Issue | Fix |
|-------|-----|
| `/api/health` leaked memory + NODE_ENV | Public health returns status/timestamp/version only |
| Rate limit trusted first `X-Forwarded-For` | Use `req.ip` + `app.set('trust proxy', 1)` |
| Search unbounded query length | Max 200 chars on suggestions/global |
| Mic blocked by Permissions-Policy | `microphone=(self)` for MicModal |

---

## Residual / ops (not fully auto-fixable)

1. **Apply SQL migration** on Supabase: run `005_role_immutability.sql` in SQL Editor.
2. **Admin roles**: grant only via dashboard/service role (`UPDATE profiles SET role='admin' WHERE email=...`).
3. **Review ratings**: client still sets `trustImpact` in UI payloads — ensure RLS/triggers ignore that column if present; prefer server-side scoring later.
4. **npm audit**: run when PowerShell execution policy allows (`npm audit`).
5. **Teacher/institute product roles**: if needed later, use server approval workflow — never open signup.

---

## Files changed

- `src/context/AuthContext.tsx`
- `src/services/dbService.ts`
- `src/components/AuthModal.tsx`
- `src/services/youtubeService.ts`
- `src/middleware/security.ts`
- `src/middleware/rateLimiter.ts`
- `src/routes/youtube.ts`
- `src/routes/lectureRoutes.ts`
- `src/test/security.test.ts`
- `server.ts`
- `supabase/migrations/005_role_immutability.sql`
- `.env.example`
- `security/SECURITY_AUDIT_FIXES_2026-07-09.md` (this file)

---

## Verification checklist

- [ ] Sign up as student → `profiles.role` is `user`
- [ ] Manually try insert `role: 'admin'` via Supabase client → rejected / forced to user (after migration)
- [ ] After login, `supabaseUser` remains set (Bearer works for admin APIs)
- [ ] `curl -H "Origin: https://evil.vercel.app"` → no ACAO
- [ ] Invalid `videoId=http://169.254.169.254` → 400
- [ ] `npm test` / vitest security suite green
