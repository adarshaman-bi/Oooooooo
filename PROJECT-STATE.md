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

### July 14, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/LectureDetailsSection.tsx](file:///c:/onion.so/src/components/LectureDetailsSection.tsx)
  - [walkthrough.md](file:///c:/onion.so/walkthrough.md)
- **Change**: Replaced the Watch Details UI layout with the custom mockup design:
  1. Full teardown and rewrite of the title block, metadata, channel row, action pills, description, and recommended list.
  2. Applied a 30% scale-down (`0.3x` reduction) to the inline Ratings & Reviews card (smaller padding, margins, text sizes, and icon widths).
  3. Integrated interactive heart sprays (emojis floating up from click coordinates) and action button scale pop animations.
  4. Dynamically bound all custom mockup elements to the Supabase hooks, queries, and event handlers.
  5. Cleaned up dead helper sub-components from the file.
- **Why**: Bring the watch details layout to verbatim mockup alignment, adding tactile micro-interactions and animations.

### July 13, 2026
- **Tool**: Antigravity (Ponytail style)
- **Files Touched**:
  - [src/components/LectureDetailsSection.tsx](file:///c:/onion.so/src/components/LectureDetailsSection.tsx)
  - [project-vault/01-Frontend/Components/LectureDetailsSection.md](file:///c:/onion.so/project-vault/01-Frontend/Components/LectureDetailsSection.md)
- **Change**: Replaced the Watch Details layout block to establish strict Unacademy visual parity (v2 spec):
  1. Permanent removal of the Title "Show More" / "Show Less" toggle block, clamping title to 2 lines (`text-[20px] font-bold leading-[1.2]`).
  2. Spacing alignment: player to title (12px), title to metadata (8px), metadata to channel (14px), channel to actions (12px), actions to review card (14px), review card to description (12px), description to recommendations (16px).
  3. Relocated description paragraph + "See more" toggle to sit below the review card, with zero space occupied when empty.
  4. Redesigned action pills row containing 5 inline horizontally aligned pills (Like, Save, Add to playlist, Watch later, Share) with height 36px, fully rounded, and 8px gaps.
  5. Overhauled Review Card featuring a 1px blue border, Left column rating (28px) + reviews count, vertical divider, Right column "Add review" + Pencil icon, interactive stars, and comment input.
  6. Rebuilt Channel Row: avatar 44px, verified badge 4px next to name, subscribers below name (2px gap), trust score ring 48px with centered percentage + overlapping tick check badge.
  7. Deleted all horizontal dividing lines except the one directly above Recommended Lessons.
- **Why**: Replicate the exact visual hierarchy, proportions, and density of the Unacademy reference mock.

### July 11, 2026 (Part 3)
- **Tool**: Antigravity (Ponytail style)
- **Files Touched**:
  - [src/App.tsx](file:///c:/onion.so/src/App.tsx)
  - [src/components/ProfileDashboard.tsx](file:///c:/onion.so/src/components/ProfileDashboard.tsx)
- **Change**: (1) Wrapped App.tsx core filters (`filteredTeachers`, `filteredLectures`, `filteredPlaylists`, `filteredBatches`, `filteredInstitutes`, `filteredTestSeries`) in React `useMemo` hooks. (2) Memoized static teachers filter `filteredStaticTeachers` and optimized the $O(N)$ lookup (`teachers.find()`) inside the mapping loop into an $O(1)$ Map lookup to resolve $O(N^2)$ computations on scroll/render updates. (3) Wrapped `TeacherCard` in `React.memo` and memoized the card-level `videos` filter. (4) Introduced `isLoading` state tracker in `ProfileDashboard` with a concurrent fetch promise tracker, rendering custom card/avatar skeletons during database load to prevent layout snap. (5) Fixed layout shifts (CLS) on Profile page watchlist by wrapping raw `<img>` cards in aspect-video fixed height containers.
- **Why**: EliminateDropped scroll frames, layout blocking tasks, and Cumulative Layout Shift during main thread rendering cycles.

### July 11, 2026 (Part 2)
- **Tool**: Antigravity (Ponytail style)
- **Files Touched**:
  - [src/components/HorizontalRow.tsx](file:///c:/onion.so/src/components/HorizontalRow.tsx)
- **Change**: (1) Added a global keyboard event listener triggered when a row is hovered, allowing users to scroll horizontal rows left/right using arrow keys instantly on PC without needing to focus them. (2) Increased the z-index of left/right navigation arrow buttons from `z-50` to `z-[60]`.
- **Why**: Resolve arrow key horizontal navigation not working on desktop/PC layout, and prevent the scroll arrow buttons from disappearing underneath cards during hover transitions (since hovered cards have `zIndex: 50`).

### July 11, 2026
- **Tool**: Antigravity (Ponytail style)
- **Files Touched**:
  - [src/App.tsx](file:///c:/onion.so/src/App.tsx)
  - [src/components/HomeDashboard.tsx](file:///c:/onion.so/src/components/HomeDashboard.tsx)
- **Change**: (1) Implemented mobile-only scroll-direction-based show/hide behavior for the header and footer (bottom nav). Wrapped `Header` and `Footer` in transition containers linked to a requestAnimationFrame-throttled scroll event listener and client touchmove tracker. (2) Reduced initial splash screen timeout from 500ms to 150ms. (3) Loaded `HomeDashboard` channels and playlists from `localStorage` on initial mount to enable instantaneous rendering. (4) Redesigned the loading skeleton inside `HomeDashboard` to be rich and multi-row (incorporating educators, playlists, and batches skeletons) to eliminate visual layout snapping. (5) Simplified playlist metadata aggregation by resolving teacher names synchronously from SWR's cache rather than launching nested async queries on render.
- **Why**: Improve perceived speed and eliminate blank loading states, while maximizing mobile reading space via gesture-driven nav slide overlays.

### July 10, 2026
- **Tool**: Antigravity (Ponytail style)
- **Files Touched**:
  - [src/components/VideoLibrary.tsx](file:///c:/onion.so/src/components/VideoLibrary.tsx)
- **Change**: Refactored the `selectedVideo` layout rendering inside the `VideoLibrary` playlists tab. When a video is selected, it returns the `BiovisedPlayer` early inside a plain full-width container (`w-full min-h-screen`) instead of nesting it within the padded `max-w-7xl mx-auto px-4 py-6` container.
- **Why**: Prevent container horizontal margins (`px-4`) and vertical padding (`py-6`) from leaking onto the mobile player rendering, matching premium OTT experiences.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Executed visual layout and toggle sync fixes: (1) Standardized the auto-hide controls sleep timer to exactly 3 seconds (`3000ms`) to match YouTube's native timing; (2) removed `max-h-64 overflow-y-auto` from the `SubMenu` options container to eliminate nested mobile scrolling contexts, letting settings panels scroll smoothly inside a single accelerated container; (3) completely removed the double-tap chevron forward/backward visual indicators (`SeekFlash` component and JSX); (4) disabled `onPointerMove` wake events on touch devices (`isTouchDevice ? undefined : wakeControls`); and (5) unified the screen tap zone handler so tapping when controls are hidden shows them, and tapping when controls are visible hides them (preventing single-tap blinking races).
- **Why**: Prevent nested touch-scroll locking, resolve controls blinking/flashing on mobile tap-to-reveal gestures, sync hide timeouts, and eliminate double-tap visual overlays.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Removed custom platform video player title overlay text and subject metadata: (1) deleted the custom title label rendering inside the header bar, and (2) lightened the header background gradient to `from-black/25 to-transparent` to allow YouTube's native title overlay to show through clearly.
- **Why**: Clean up duplicate visual titles by yielding overlay precedence to YouTube's native title rendering, while keeping Back and Lock controls intact.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Configured custom player stacking precedence over YouTube's native title overlay: (1) explicitly set the underlying iframe wrapper container to `z-0` to force correct browser painting priority, and (2) shifted the custom top bar background gradient to start with a solid opaque black (`from-black via-black/70`) at the very top.
- **Why**: Prevent YouTube's native title text from showing through the translucent top bar gradient when active, ensuring only the custom platform video player title is visible.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Made the custom player top bar `paddingTop` conditional based on device presence: (1) uses standard compact margins (`1rem` / `max(1rem, env(safe-area-inset-top))`) on mobile touch devices, and (2) retains the larger anti-collision spacing offset (`3.25rem` / `max(3.25rem, env(safe-area-inset-top))`) strictly on desktop devices.
- **Why**: Prevent the title bar overlay from pushing down too low inside compact mobile screens, keeping it from colliding with the centered play button while retaining YouTube overlap defenses on desktop.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Patched 5 target issues based on visual bug list: (1) Resolved controls wake/sleep race condition by unifying zone tap and locked overlay checks to hide immediately if open (clearing timer) or call `wakeControls()`; (2) fixed seek progress bar dragging by removing vertical dampening to ensure 1:1 cursor tracking and refactored the pointermove/pointerup `useEffect` dependencies using a ref snapshot (`dragTimeRef`) to prevent jank; (3) thickened volume/brightness overlays to `w-2 h-28`, set icon size to `size={20}`, and lowered divisor to `140` to increase drag sensitivity; (4) added a `5s` timeout grace period to fall back to a static quality levels array (`FALLBACK_QUALITIES`) if YouTube's API fails to report available qualities; and (5) expanded top bar title width with `flex-1 min-w-0` and increased Lock button spacing to `pl-3`.
- **Why**: Fix touch-drag dropouts, prevent settings resolution hangs, eliminate title bar overlap crowding, and ensure tap overlay transitions never race with auto-hide intervals.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Executed Final UX Polish Pass: (1) Relocated Previous/Next buttons beside Play/Pause directly below the progress bar and cleaned up the mobile duplicate footer; (2) added hardware-accelerated momentum scroll parameters to Speed and Quality settings dropdowns to prevent lag/stutter; (3) added `3.25rem` top padding to the title bar overlay to prevent overlapping with native YouTube iframe title elements; (4) unified tap zone control auto-hiding to trigger a consistent 2.5s fade countdown across playing and paused states; (5) rebuilt seek dragging to bind pointer capture directly to `barRef` and map raw horizontal positions 1:1, allowing smooth, continuous scrubbing; (6) streamlined volume/brightness sliders to `1px` thin premium tracks with moon/sun icon sizing; and (7) accelerated seek double-tap indicators to flash instantly (350ms total).
- **Why**: Solidify visual constraints, enhance drag accuracy, resolve title collisions, and bring overlay HUD layouts in line with premium native OTT players.

### July 8, 2026
- **Tool**: Antigravity
- **Files Touched**:
  - [src/components/BiovisedPlayer.tsx](file:///c:/onion.so/src/components/BiovisedPlayer.tsx)
- **Change**: Executed UX Polish Pass refinements: (1) Added autoplay trigger in YouTube `onReady` handler to automatically play loaded videos; (2) added auto-closing logic on speed/quality selection and descending display order for playback speed levels in the settings menu; (3) enabled real-time seek tracking updates inside progress bar drag `onMove` to align with YouTube scrubbing; (4) added inline quick speed toggle next to settings to cycle play rate instantly without sheets; (5) shrank volume and brightness overlay sliders with moon/sun icon toggles depending on levels; and (6) bound left/right tap zone reveals to auto-hide timers directly.
- **Why**: Boost responsiveness, streamline layout density, speed up playback starts, and match modern YouTube overlay design language.

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
