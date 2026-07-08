# PROJECT-STATE — BioVised Codebase State

This file is the single self-contained source-of-truth document for the **BIOVISED** project. It is designed to be read by all AI developer tools working on this codebase to prevent regression, memory misalignment, and repetition of past errors.

---

## 1. Current Architecture

### Tech Stack
- **Frontend Core**: React 19.0.1, TypeScript, Vite 6.2.3, React Router DOM 7.18.0
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Backend Core**: Node/Express server (compiled to CommonJS `dist/server.cjs` via `esbuild`)
- **Database & Auth**: Supabase REST APIs & PostgreSQL via `@supabase/supabase-js`
- **Key Utilities**: Sentry (monitoring), Motion (animations), Lucide React (icons), Playwright (E2E testing), Vitest (unit/integration testing)

### Key Modules
1. **Authentication Flow** (`AuthContext.tsx`, `AuthModal.tsx`):
   - Supports Email/Password login, Sign Up, and Google OAuth Secure Sign-In.
   - Includes client-side lockout (60s block after 3 failed attempts) and rate limiting middleware.
   - Provides a local guest session mapping to `uid = 'guest'` when clicking **Continue as Guest**.
2. **Unified Video Player** (`BiovisedPlayer.tsx`):
   - The *only* active playback component. Replaces all legacy inline `<iframe>` player layouts, custom progress trackers, and folders of sub-components (`gestures/`, `engine/`, `ui/`, `social/`, `perf/`).
   - Implements a solid black cover that remains visible until playback actually starts (`hasStartedOnce`), blocking YouTube's native title/thumbnail flash.
   - Features device-split behavior: mobile supports vertical edge-swipe gestures for volume/brightness; desktop supports hover volume sliders and a complete keyboard hotkey mapping (Space/K, arrows, J/L, T, F, numbers).
3. **Database Schema & Row Level Security (RLS)**:
   - Hardened via `supabase/migrations/004_rls_hardening.sql`.
   - **Key Tables**:
     - `public.profiles`: Stores student data, preferred subjects, and preferences. Users can read/write their own profiles; admins can access all.
     - `public.teachers`: Profiles for verified educators.
     - `public.playlists` & `public.videos`: Course organization and metadata.
     - `public.watch_history`: Tracks student playback progress (`progress_seconds`, `completed`).
     - `public.video_reviews` & `public.reviews`: Stores ratings/feedback.
     - `public.teacher_followers`: Synchronizes followed educators.
     - `public.monitored_channels` & `public.channels`: Tracks YouTube channels for sync.

---

## 2. Active Work
- **Status**: Stable
- **Focus**: Consolidation and State Standardization
- **Active Files**:
  - [PROJECT-STATE.md](file:///c:/onion.so/PROJECT-STATE.md) (this file)

---

## 3. Changelog (Reverse-Chronological)

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
  - [src/App.tsx](file:///c:/onion.so/src/App.tsx)
- **Change**: Applied visual and functional tweaks (Round 3 fixes): (1) Shrunk seek feedback badge to `w-12 h-12` with lower opacity (`bg-black/45`) and longer lifecycle duration (~800ms); (2) added `setActiveLecture(null)` and `setDetailModal(null)` to the Header logo click handler to ensure clicking it returns cleanly to home; (3) replaced settings wrapper `overflow-hidden` with `overflow-y-auto` and constrained max-height to prevent clipping on mobile; and (4) synchronized manual tap-to-reveal control toggles to use the standard auto-hide timers.
- **Why**: Resolve visual layout breaks on mobile settings, fix seek badge bulkiness, and ensure logo interactions always clear active video play state.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Applied five targeted fixes: (1) replaced arbitrary `z-[15]` with valid `z-20` z-indices to prevent YouTube title leaks, (2) filtered out fake resolutions in the Quality settings menu and added a loading detection placeholder, (3) set the minimum speed rate to 0.5x, (4) added animated Pop-in/out double-chevron circular badges for seek acknowledgment, (5) preconnected/preloaded the YouTube IFrame API script on component module import.
- **Why**: Enhance visual fidelity, fix resolution menu drift, speed up video load times, and align UX with strict design specifications.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/AuthModal.tsx](file:///c:/onion.so/src/components/AuthModal.tsx)
- **Change**: Restored guest login option unconditionally by removing the restrictive environment variable check (`VITE_ENABLE_GUEST_MODE`).
- **Why**: The login option was completely hidden when VITE_ENABLE_GUEST_MODE was not explicitly set to `'true'` in `.env`.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Unified the player into a single canonical file, fully removed the deprecated Report modal UI, implemented `hasStartedOnce` black-cover overlay to fix the YouTube title-flash bug, and added robust 3-stage URL parsing to resolve "no valid source" errors.
- **Why**: Codebase simplicity, fixing UI/audio overlaps, and handling all DB video URL formats.

### July 8, 2026
- **Author**: Adarsh Aman (Commit `09ce075`)
- **Files Touched**:
  - `.github/workflows/ci.yml`
- **Change**: Replaced trufflehog GitHub Action with direct CLI binary.
- **Why**: Fix CI setup failure due to unresolved version tags on trufflesecurity/trufflehog repo.

### July 8, 2026
- **Author**: Adarsh Aman (Commit `1c2f412`)
- **Files Touched**:
  - `.github/workflows/ci.yml`, `src/components/BiovisedPlayer.tsx`, `src/components/VideoLibrary.tsx`, `src/types.ts`, `tsconfig.json`
- **Change**: Resolved 19 TS compilation errors (Refs initialization, type safety additions) and added proper permissions block to CI.
- **Why**: Fix build failures and ensure CI type checks pass.

---

## 4. Known Mistakes / Do-Not-Repeat
1. **Cache conclusion bias**: Avoid concluding that a component rendering issue is a local browser cache issue when it is actually an additive JSX bug (rendering a new player next to a legacy block, leading to dual audio streams).
2. **YouTube native title/thumbnail flash**: YouTube paints its own thumbnail and header inside the iframe pixels before first play. Opacity and z-index on local elements cannot hide this because it is inside the iframe rendering boundary. **Always** keep a black overlay element on top until the state changes to `PLAYING` for the first time.
3. **Restricting Guest Mode via Env Checks**: Hiding guest login options using environmental variables without local fallback prevents proper guest onboarding in preview environments.
4. **YouTube URL parse failures**: DB urls can have multiple formats (embeds, watch links, bare video IDs). Using a simple path splitter fails on query parameters. Use a comprehensive parser that checks all URL patterns and falls back to `lecture.id` if it is a valid 11-char string.

---

## 5. Open Issues
- **None**: Working tree is clean and compiles successfully.
