# 🧠 BioVised System Architecture & Knowledge Base (brain.md)

This document is the single source of truth for the BioVised repository. It provides complete context, configuration maps, data models, algorithm specifications, and operational rules to guide development and maintenance.

---

## Section 1 — Project Identity

### 1.1 Purpose
**BioVised** is a premium educational video curation and exam preparation directory specifically built for JEE and NEET candidates in India. It acts as an anti-distraction proxy layer over YouTube, pulling, validating, and curating academic lectures while systematically filtering out non-academic content (marketing/updates, strategy guides, clickbait) and general entertainment content (cartoons, nursery rhymes) to keep students focused.

### 1.2 Vision & Mission
To establish a curated, verified repository of top-tier Indian test prep curricula (primarily from Kota and major online channels), helping students prepare for competitive examinations without the addictive and distracting algorithms of mainstream social video feeds.

### 1.3 Target Users
* **Primary**: JEE/NEET aspirants seeking structured, long-form syllabus playlists (chapters, one-shots, PYQs) without recommended feeds.
* **Secondary**: Educators and administrators managing lecture assignments.
* **Excluded**: General video searchers, children seeking entertainment content, and short-form video consumers.

### 1.4 Core Philosophy (Anti-Distraction Covenant)
1. **Academic Purity**: Zero entertainment, zero gossip, zero clickbait.
2. **Aggressive Curation**: Only content that is highly structured and educational is admitted.
3. **No Algorithmic Trapdoors**: Displays content strictly categorized by curriculum subjects; no endless scroll or auto-generated user recommendation loops.

### 1.5 Product Principles
* **Verified Educator Focus**: Profiles and playlists must map to verified teachers/institutes.
* **Dual-Visibility Routing**: Standard syllabus playlists belong to "Syllabus", single-video marathons belong to "One-Shots", and individual lecture nodes belong to "Lectures".
* **Explainable Trust**: Every profile carries a calculated, multi-dimensional trust score based on explicit verifications and reviews.

### 1.6 Non-Goals
* BioVised will never support short-form videos (YouTube Shorts, Reels).
* BioVised will not implement social feeds, comments, or direct messaging between students.
* BioVised does not host direct video files; it acts exclusively as a secure proxy.

### 1.7 Current Status
* **Core Curation Engine**: Production-ready. Over 70 verified playlists and 670 educational lectures ingested, with junk filtering active.
* **Channel Profile UI**: Live. Connects cards to YouTube-branded channel overview modals.
* **MicModal Voice Input**: Live. Implemented using Web Speech & Audio frequencies.
* **Rich Suggestions Autocomplete**: Live. Debounced suggestions returning card representations of channels, playlists, and lectures.

---

## Section 2 — High-Level Architecture

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           1. CLIENT BROWSER                             │
│                                                                         │
│   [ React SPA (Vite) ] <====================> [ SWR Cache ]             │
│            │ (HTTP REST)                           ▲                    │
│            │                                       │ (Local Storage)    │
│            ▼                                       │                    │
│   [ Supabase Auth SDK ] <───(Session Token JWT)────┘                    │
└────────────┬────────────────────────────────────────────────────────────┘
             │                               
             │ (JWT Header / REST)           
             ▼                               
┌────────────────────────────────────────┐   ┌────────────────────────────┐
│          2. ORCHESTRATION SERVER       │   │     3. EXTERNAL APIS       │
│                                        │   │                            │
│    [ Express Server (server.ts) ] ├─> [ YouTube Data API v3 ]  │
│            │                           │   │  (Channel, Playlist, Video │
│            │ (Service Role DB queries) │   │   metadata JSON payloads)  │
│            ▼                           │   └────────────────────────────┘
│    [ InMemorySearchIndex ]             │
└────────────┬───────────────────────────┘
             │ (Postgres Query)
             ▼
┌────────────────────────────────────────┐
│           4. PERSISTENCE LAYER         │
│                                        │
│         [ Supabase PostgreSQL ]        │
│          (Database & Tables)           │
└────────────────────────────────────────┘
```

### Prose Description & Tradeoffs
The system utilizes a decoupled architecture with a monolithic backend and static frontend:
* **Stack Choice**: Chosen for rapid iteration and separation of concerns. Express handles metadata hydration and ingestion scripting; Supabase provides Auth and PostgreSQL databases, bypassing the need for a separate custom authentication backend.
* **Tradeoffs**: Upstream YouTube API requests consume quota rapidly. This is solved by using a local-DB-first caching pattern: the Express backend intercepts channel and lecture lookups and queries Supabase first. If matches exist, it serves them immediately, saving API quota.
* **Scalability**: Front-end state reads are optimized using SWR. The backend is stateless, enabling horizontal scale.

---

## Section 3 — Technology Stack

| Package | Version | Why it's here | Risk/Limitation |
|---|---|---|---|
| **Core Framework** | | | |
| `react` | `^19.0.1` | Main UI component library | React 19 migration risks with legacy libraries |
| `react-dom` | `^19.0.1` | React DOM renderer | Bound to React version |
| `express` | `^4.21.2` | Core backend server routing and integration proxy | Node-specific deployment required |
| **UI / Styling** | | | |
| `tailwindcss` | `^4.1.14` | Styling compiler | Coupled to build chain configurations |
| `autoprefixer` | `^10.4.21`| CSS vendor prefixer | Build pipeline dependency |
| `lucide-react` | `^0.546.0` | SVG Icon systems | Bundle size bloat if not tree-shaken |
| `motion` | `^12.23.24` | Animation utilities (Framer Motion) | High script initialization overhead |
| **Backend / Supabase** | | | |
| `@supabase/supabase-js` | `^2.108.2` | DB query client and Auth manager | Network latencies for direct client queries |
| **Routing** | | | |
| `react-router-dom` | `^7.18.0` | Client-side routing orchestrator | Strict navigation structure |
| **Data Fetching** | | | |
| `swr` | `^2.4.2` | Client-side HTTP query caching layer | Potential stale-state rendering if cache keys mismatch |
| `axios` | `^1.18.1` | Server-side HTTP integrations (YouTube/Supabase REST) | Error-handling overhead |
| **Utilities** | | | |
| `dotenv` | `^17.2.3` | Local environment variables manager | Only resolves before execution starts |
| `cors` | `^2.8.6` | Express cross-origin resource sharing | Configuration security risk |
| `ws` | `^8.21.0` | Node.js WebSocket client library | Resource consumption under high load |
| `@google/adk` | `^1.3.0` | AI Studio deployment framework | System environment locked |
| `@google/adk-devtools` | `^1.3.0` | AI Studio development tooling | Dev dependency only |
| `@google/genai` | `^2.4.0` | Google GenAI integration SDK | API key quota bound |
| **Dev Tools / Build** | | | |
| `typescript` | `~5.8.2` | Static type check language compiler | Build check time increases with codebase |
| `vite` | `^6.2.3` | Frontend bundle tool and dev server | Local config dependencies |
| `@tailwindcss/vite` | `^4.1.14` | Tailwind CSS integration for Vite | Bound to Vite version |
| `@vitejs/plugin-react` | `^5.0.4` | Vite React compiler plugin | Bound to Vite version |
| `esbuild` | `^0.25.0` | High-performance bundler for backend server compilation | CJS/ESM bundling constraints |
| `tsx` | `^4.21.0` | TypeScript execution runner for server.ts and scripts | Development execution only |
| `@types/*` | — | TypeScript type definitions forNode/React/Express/CORS | Checked only during compiler phase |

---

## Section 4 — Folder Responsibilities

* **`src/components/`**
  * **Purpose**: Modular React UI view items and components.
  * **Key files**: `LectureCard.tsx` (lecture items), `MicModal.tsx` (voice input sheet), `SearchView.tsx` (autocomplete cards), `ChannelProfile.tsx` (branded page), `skeletons/` (loading placeholders).
  * **Imports from**: `src/types.ts`, `src/config/constants.ts`, `src/utils/`
  * **Imported by**: `src/App.tsx`
  * **Rules**: Components should not call inline database fetches. All data loading goes through SWR or global service endpoints.
* **`src/config/`**
  * **Purpose**: Static configurations, teacher catalogs, seed data, and registered channels.
  * **Key files**: `youtubeChannels.json` (monitored handles/IDs), `constants.ts` (weights, default keys), `seedNewTeachers.ts` (seeding).
  * **Imports from**: `src/types.ts`
  * **Imported by**: Components, services, scripts.
  * **Rules**: `seedNewTeachers.ts` is placed here but acts as a backend script; this is a folder concern mismatch.
* **`src/context/`**
  * **Purpose**: React global state providers.
  * **Key files**: `AuthContext.tsx`, `PlayerContext.tsx`, `SearchContext.tsx`, `ThemeContext.tsx`.
  * **Imports from**: `src/utils/supabaseClient.ts`, `src/types.ts`
  * **Imported by**: `src/App.tsx`, frontend components.
  * **Rules**: Do not put non-global components state in contexts.
* **`src/data/`**
  * **Purpose**: Static data files.
  * **Key files**: `testSeriesData.ts` (mock directories metadata).
  * **Imports from**: None.
  * **Imported by**: Components.
  * **Rules**: Contains 60kb of static JSON data which should theoretically live in Supabase.
* **`src/pages/`**
  * **Purpose**: Client-side page-level route landing views.
  * **Key files**: `AuthCallback.tsx` (OAuth redirect catcher).
  * **Imports from**: `src/utils/supabaseClient.ts`
  * **Imported by**: `src/App.tsx`
  * **Rules**: Must remain lightweight and delegate complex logic to services.
* **`src/public/`**
  * **Purpose**: Client assets directory.
  * **Key files**: `google-auth.html` (Google login iframe receiver).
  * **Imports from**: None.
  * **Imported by**: Iframe wrappers.
* **`src/routes/`**
  * **Purpose**: Express controllers driving REST endpoints.
  * **Key files**: `youtube.ts` (channel profiles, live checks), `lectureRoutes.ts` (teacher playlists).
  * **Imports from**: `src/services/youtubeService.ts`, `src/utils/supabaseClient.ts` (admin config)
  * **Imported by**: `server.ts`
  * **Rules**: Routes must use `supabaseAdmin` to query database, enforcing backend checks.
* **`src/services/`**
  * **Purpose**: Database interface clients, API integrations, search indexing, personalization.
  * **Key files**: `dbService.ts` (queries/mutators), `youtubeService.ts` (live checks), `recommendationEngine.ts` (personalized curation).
  * **Imports from**: `src/utils/`, `src/types.ts`
  * **Imported by**: Express route controllers, script runners, App.tsx.
  * **Rules**: Always handle errors internally and return safe fallbacks.
* **`src/utils/`**
  * **Purpose**: Helper utilities, SWR caching config, Supabase client initialization.
  * **Key files**: `supabaseClient.ts`, `swrConfig.ts`, `youtubeUtils.ts` (API parsers).
  * **Imports from**: None.
  * **Imported by**: Everywhere.

---

## Section 5 — Database Design (PostgreSQL / Supabase)

The project does not use Firestore. The database structure is PostgreSQL on Supabase.

### Table: teachers
* **Path**: `public.teachers`
* **Fields**:
  * `id`: `VARCHAR(255) PRIMARY KEY` (YouTube Channel ID or custom identifier)
  * `name`: `VARCHAR(255) NOT NULL`
  * `subject`: `VARCHAR(255) NOT NULL`
  * `avatar`: `VARCHAR(1024)`
  * `rating`: `NUMERIC(3, 2) DEFAULT 4.5` (Fake rating default!)
  * `accuracy`: `INTEGER DEFAULT 90` (Fake accuracy default!)
  * `followers_count`: `INTEGER DEFAULT 0`
  * `bio`: `TEXT`
  * `is_verified`: `BOOLEAN DEFAULT TRUE` (Auto-verifies all inserted teachers!)
  * `subjects`: `JSONB`
  * `exams`: `JSONB`
  * `features`: `JSONB`
* **Security Rules**: Public select allowed (`Allow public read access for teachers`). Writes restricted.
* **Known Issues**:
  * `rating`, `accuracy`, and `is_verified` have fake defaults (`4.5`, `90`, `TRUE`).
  * No secondary indexes exist on this table.

### Table: playlists
* **Path**: `public.playlists`
* **Fields**:
  * `id`: `VARCHAR(255) PRIMARY KEY` (YouTube Playlist ID)
  * `title`: `VARCHAR(255) NOT NULL`
  * `category`: `VARCHAR(255) NOT NULL`
  * `thumbnail`: `VARCHAR(1024)`
  * `description`: `TEXT`
  * `teacher_id`: `VARCHAR(255) REFERENCES public.teachers(id)`
  * `lectures_count`: `INTEGER DEFAULT 0`
  * `exam_type`: `VARCHAR(100) DEFAULT 'Both'`
  * `is_active`: `BOOLEAN DEFAULT TRUE`
  * `cover_thumbnail_url`: `TEXT`
  * `channel_title`: `TEXT`
  * `channel_id`: `TEXT`
  * `channel_thumbnail_url`: `TEXT`
  * `content_type`: `TEXT DEFAULT 'playlist'`
  * `total_duration_seconds`: `INTEGER DEFAULT 0`
  * `subject_tags`: `JSONB`
  * `exam_tags`: `JSONB`
  * `last_synced_at`: `TIMESTAMPTZ`
* **Security Rules**: Public select allowed (`Allow public read access for playlists`).
* **Known Issues**: No secondary indexes exist on this table.

### Table: videos
* **Path**: `public.videos`
* **Fields**:
  * `id`: `VARCHAR(255) PRIMARY KEY` (YouTube Video ID)
  * `title`: `VARCHAR(255) NOT NULL`
  * `video_url`: `VARCHAR(1024) NOT NULL`
  * `duration`: `VARCHAR(50)`
  * `category`: `VARCHAR(255) DEFAULT 'lecture'`
  * `playlist_id`: `VARCHAR(255) REFERENCES public.playlists(id) ON DELETE CASCADE`
  * `views`: `INTEGER DEFAULT 0`
  * `thumbnail_url`: `VARCHAR(1024)`
  * `subject`: `VARCHAR(255)`
  * `exam_type`: `VARCHAR(100) DEFAULT 'Both'`
  * `content_type`: `VARCHAR(50) DEFAULT 'lecture'`
  * `teacher_id`: `VARCHAR(255)`
  * `teacher_name`: `VARCHAR(255)`
  * `institute_id`: `VARCHAR(255)`
  * `institute_name`: `VARCHAR(255)`
  * `likes_count`: `INTEGER DEFAULT 0`
  * `publish_date`: `TIMESTAMPTZ`
  * `is_active`: `BOOLEAN DEFAULT TRUE`
  * `position_in_playlist`: `INTEGER`
  * `duration_seconds`: `INTEGER DEFAULT 0`
  * `view_count`: `INTEGER DEFAULT 0`
  * `like_count`: `INTEGER DEFAULT 0`
  * `is_playable`: `BOOLEAN DEFAULT TRUE`
  * `embed_url`: `TEXT`
* **Security Rules**: Public select allowed (`Allow public read access for videos`).
* **Known Issues**:
  * Duplicate columns exist (`views` vs `view_count` and `likes_count` vs `like_count`).
  * No secondary indexes exist on this table.

### Table: profiles
* **Path**: `public.profiles`
* **Fields**:
  * `uid`: `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  * `email`: `VARCHAR(255) NOT NULL`
  * `display_name`: `VARCHAR(255)`
  * `role`: `VARCHAR(50) DEFAULT 'user'`
  * `exam_type`: `VARCHAR(100) DEFAULT 'NEET'`
  * `appearing_year`: `VARCHAR(50) DEFAULT '2026'`
  * `preferred_subjects`: `JSONB`
  * `watched_content`: `JSONB`
  * `saved_content`: `JSONB`
  * `hidden_content`: `JSONB`
  * `liked_content`: `JSONB`
  * `onboarding_completed`: `BOOLEAN DEFAULT FALSE`
  * `login_type`: `VARCHAR(50) DEFAULT 'email'`
* **Security Rules**: Public read allowed. Writes restricted to own profile:
  `CREATE POLICY "Allow individual write profile" ON public.profiles FOR ALL USING (auth.uid()::text = uid::text);`

### Table: reviews
* **Path**: `public.reviews`
* **Fields**:
  * `id`: `VARCHAR(255) PRIMARY KEY`
  * `entity_id`: `VARCHAR(255) NOT NULL`
  * `entity_type`: `VARCHAR(50) NOT NULL`
  * `user_id`: `UUID NOT NULL`
  * `user_display_name`: `VARCHAR(255)`
  * `rating`: `NUMERIC(3, 2) DEFAULT 5.0`
  * `comment`: `TEXT`
  * `is_flagged`: `BOOLEAN DEFAULT FALSE`
  * `features`: `JSONB`
* **Security Rules**: Public read allowed. Writes are NOT allowed for standard users in migrations (requires admin or service role key).

---

## Section 6 — Authentication & Authorization

### 6.1 Auth Provider
Powered by **Supabase Auth (GoTrue)**. Direct integrations are managed inside `src/context/AuthContext.tsx`. Users can sign in using:
1. **Email / Password**: Standard login.
2. **Google OAuth**: Triggered via `signInWithOAuth` redirecting through `google-auth.html` and `AuthCallback.tsx`.

### 6.2 User Roles
Roles are stored in `public.profiles.role` (`'user'`, `'teacher'`, `'admin'`). If undefined, defaults to `'user'`.

### 6.3 Protected Routes
Client-side views are auth-gated in `App.tsx`:
* `currentView === 'moderator'`: Gated to `user.email === 'adarshaman898@gmail.com'`.
* `currentView === 'admin-educators'`: Gated to `user.email === 'adarshaman898@gmail.com' || user.role === 'admin' || user.role === 'moderator'`.

### 6.4 Database Security (RLS)
PostgreSQL RLS is enabled for all 17 public tables. Read access is universally public (`Allow public read access`). Write access is restricted to:
* `profiles`: `auth.uid()::text = uid::text`
* Other tables: Denied to public client anon roles, requiring backend admin/service role client.

### 6.5 Storage Rules (Supabase Storage)
`UNKNOWN — Storage buckets and security policies are not defined in migrations or local project code.`

### 6.6 Token Lifecycle
Supabase JWT tokens are saved in `localStorage` under `sb-jicyzdfzcffhjqehvcpk-auth-token` (exposes Supabase Project Reference ID `jicyzdfzcffhjqehvcpk`). Auto-refreshes in the background via the Supabase SDK.

### 6.7 Session Expiry Behavior
If token refresh fails or the session expires mid-use, the client state is reset, `user` becomes `null`, and the app reverts to guest mode with guest states loaded from localStorage (`biovised_guest_uid`).

---

## Section 7 — Routing

Client-side routing is managed as an SPA in `App.tsx` (using `currentView` and `activeExploreTab` states):

### Client routes map:
| Route Path (SPA View) | Component | Auth Required | Role Required | Notes |
|---|---|---|---|---|
| `currentView === 'explore'` | `VideoLibrary` | No | — | Displays active tabs (home, teachers, playlists, batches, tests, institutes) |
| `currentView === 'search'` | `SearchView` | No | — | Search autocomplete and result list |
| `currentView === 'profile'` | `ProfileDashboard` | Yes | — | User profile settings |
| `currentView === 'notifications'` | `NotificationsDashboard` | Yes | — | Notifications list |
| `currentView === 'moderator'` | `ModeratorDashboard` | Yes | `admin` (by email) | Ingestion and review moderation dashboard |
| `currentView === 'admin-educators'` | `AdminEducators` | Yes | `admin`/`moderator` | Educators management dashboard |
| `currentView === 'teacher-detail'` | `TeacherProfileDetail` | No | — | Dynamic teacher page (requires `selectedTeacherId`) |
| `/auth/callback` | `AuthCallback` | No | — | OAuth callback landing path |

* **404 / Error Routing**: If `currentView` doesn't match any known view name, falls back to `explore` (home).
* **Direct URLs**: React Router is used to map paths like `/auth/callback` to the `AuthCallback` component.

---

## Section 8 — State Management

### 8.1 Global State Contexts
* **`AuthContext`**: Exposes `user`, `session`, `profile`, `isAdmin`, and `loading`.
* **`PlayerContext`**: Exposes `activeVideo`, `playlistContext`, `isPlaying`, `volume`, and `history`.
* **`SearchContext`**: Exposes `searchQuery`, `suggestions`, and `isSearching`.
* **`ThemeContext`**: Exposes `theme` (`'dark' | 'light'`) and `toggleTheme`.

### 8.2 Data Fetching & Caching (SWR)
Client data utilizes SWR caching with custom options:
* `SWR_KEYS.PLAYLISTS` -> Maps to `'active_playlists'` (active playlists with $\ge 1$ video).
* `SWR_KEYS.TEACHERS` -> Maps to `'active_teachers'`.
* `SWR_KEYS.CHANNELS` -> Maps to `'active_channels'`.
* `SWR_KEYS.VIDEOS` -> Maps to `'active_videos'`.

### 8.3 Cache Key Naming Convention
Uses prefix strings: `'active_playlists'`, `'active_teachers'`, `'active_channels'`, `'active_videos'`.

### 8.4 Optimistic Updates
`UNKNOWN — No optimistic update rollbacks found in frontend Supabase mutations. UI depends on SWR revalidation.`

### 8.5 Auth State Surfacing
`AuthContext` registers a `supabase.auth.onAuthStateChange` listener on mount to track session changes, dynamically loading the corresponding profile from `public.profiles` on login.

---

## Section 9 — API & External Integrations

### 9.1 YouTube Data API v3
* **Endpoints called**:
  * `https://www.googleapis.com/youtube/v3/channels`: Part `snippet,statistics,brandingSettings`. (Quota cost: 1 unit).
  * `https://www.googleapis.com/youtube/v3/playlists`: Part `snippet`. (Quota cost: 1 unit).
  * `https://www.googleapis.com/youtube/v3/search`: Event type `live` (Quota cost: 100 units).
* **Quota Limits**: Daily limit of 10,000 units. Backend mitigates this via in-memory Cache (`channelProfileCache`, TTL 5 mins) and local Supabase DB fallback lookups.
* **Error / Quota Handling**: If quota is exceeded, returns a 500 error status.
* **API Key Storage**: Stored server-side in `process.env.YOUTUBE_API_KEY`.

### 9.2 YouTube IFrame Player API
* **Player Initialization**: Loads IFrame API asynchronously from `https://www.youtube.com/iframe_api`.
* **Events**: Listens to `onReady`, `onStateChange`, and `onError`.
* **Anti-distraction controls**: intercept commands, hide annotations (`iv_load_policy: 3`), disable recommendations (`rel: 0`).

### 9.3 Supabase SDK Config
* Loaded in `src/utils/supabaseClient.ts` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Enables Supabase Realtime parameter `eventsPerSecond: 10`.

### 9.4 Other integrations
* **Razorpay**: `UNKNOWN — No Razorpay imports or configuration keys found in codebase.`
* **Error monitoring / Sentry**: `UNKNOWN — No error reporting libraries found.`

---

## Section 10 — Business Logic & Algorithms

### Rule: Trust Score Calculation
* **Location**: `src/services/dbService.ts` -> `fetchTrustScore(entityId)`
* **Inputs**: `isVerified`, `hasBioOrDesc`, `hasAvatarOrLogo`, `hasOfficialLinks`, `reviews` (Array), `avgRating`.
* **Formula**:
  $$\text{Profile Completeness} = (\text{hasBioOrDesc} ? 1 : 0) + (\text{hasAvatarOrLogo} ? 1 : 0) + 1 \quad \text{[Max: 3]}$$
  $$\text{Verified Credentials} = \text{isVerified} ? 14 : 4 \quad \text{[Max: 14]}$$
  $$\text{Official Links} = \text{hasOfficialLinks} ? 2 : 0 \quad \text{[Max: 2]}$$
  $$\text{Review Reliability} = \min(40, 10 + \text{reviews.length} \times 3) \quad \text{[Max: 40]}$$
  $$\text{Content Consistency} = 1 \quad \text{[Max: 1]}$$
  $$\text{Community Engagement} = \min(40, \lfloor\text{avgRating} \times 8\rfloor) \quad \text{[Max: 40]}$$
  $$\text{Total Score} = \text{Sum of all components} \quad \text{[Max: 100]}$$

### Rule: Personalized Recommendation Engine
* **Location**: `src/services/recommendationEngine.ts`
* **Algorithm**:
  * For Lectures (`personalizeLectures`): Filters out hidden IDs and non-exam-matching subjects (NEET hides Math, JEE hides Biology). Scores lectures using:
    * Stream match: $+150$ points.
    * Subject match: $+120$ points.
    * Target year match: $+200$ points.
    * Revision keywords (One-shot, pyq) for exam year (2026): $+100$ points.
    * Foundation keywords (concept, basic) for future years: $+80$ points.
    * Saved item: $+80$ points.
    * Liked item: $+90$ points.
    * Watched item: $+20$ points.
    Sorts final results by score descending.

### Rule: Autocomplete Search Scoring
* **Location**: `server.ts` -> `InMemorySearchIndex.getSuggestions`
* Matches input prefix against teachers, playlists, lectures, and institutes. Filters matches based on exam stream rules (NEET vs JEE checks). Returns suggestions as objects de-duplicated by `${type}_${id}`.

---

## Section 11 — Design System

### 11.1 Color Palette
* Base Backgrounds: Slate Black (`#000000`, `#08080A`, `#0E0E0F`)
* Accents: Turmeric Yellow (`#D97706`), Glowing Orange (`#EA580C`), Peach-Red (`#FBB093`)
* Text: Pure White (`#FFFFFF`), Soft Zinc (`#A1A1AA`), Charcoal Gray (`#52525B`)

### 11.2 Typography
* Headers: `Bebas Neue`
* Body/Interface: `Urbanist`, `Inter`
* Code/Mono: `JetBrains Mono`

### 11.3 Spacing Scale
* `UNKNOWN — No explicit global spacing scale configuration (such as base unit tailwind spacing configs) found in tailwind configs.`

### 11.4 Dark Mode Strategy
* Handled via class-based detection: `light-theme` class applied to HTML root toggles custom variables mapped in `src/index.css`.

### 11.5 Animation Tokens
* Mapped in `src/index.css`:
  * `.animate-slide-up`: slide up bottom sheet transition
  * `.animate-mic-pulse`: pulse mic ring animation

### 11.6 Component Standards
* Border Radius: `rounded-2xl` for sheets/cards, `rounded-full` for avatars.
* Shadow Depth: `shadow-2xl` for autocomplete dropdowns.

---

## Section 12 — Coding Standards & Conventions

* **File Naming**: React Components use PascalCase (`LectureCard.tsx`), utilities/services use camelCase (`dbService.ts`), types use `types.ts`.
* **TypeScript Rules**: Strict type safety. Avoid `any` except for bypass casting.
* **Vite HMR**: Disabled during agent edits via `DISABLE_HMR` to prevent workspace flickering.
* **Hook Patterns**: Custom Hooks are NOT centralized under `src/hooks`; instead, SWR fetchers are stored in `src/utils/swrConfig.ts` and loaded directly inside components.
* **Console.log policy**: Allowed in dev builds, warnings are printed on DB synchronization catchers.
* **Import Order**: React/Vite core -> Third-party packages -> Types -> Components -> Services -> Utils.

---

## Section 13 — AI Agent Operational Rules

### NEVER:
* Add fake ratings, dummy stars, or mock user credentials.
* Expose `SUPABASE_SERVICE_ROLE_KEY` to any client-side bundle or public endpoint.
* Change Tailwind theme configurations or spacing variables.
* Remove `is_active = true` requirements from active playlist queries.

### ALWAYS:
* Run `npx tsc --noEmit` to verify type safety before proposing changes.
* Use local-DB-first caching checks inside route controllers before initiating upstream YouTube API queries.
* Validate all catalog updates by executing the database integrity check:
  `npx tsx scripts/clean_and_validate.ts`

### WHEN IN DOUBT:
* Do less. A no-op is safer than a wrong change.
* Mark the uncertainty in a code comment and flag it in the task description.
* Ask before deleting anything.

---

## Section 14 — Known Issues & Technical Debt

| Severity | Location | Issue | Impact | Suggested Fix |
|---|---|---|---|---|
| **CRITICAL** | `supabase_migration.sql:7-17` | Fake ratings/accuracy defaults baked into database schema | New teacher inserts automatically populate fake ratings | Remove the default constraints in migrations |
| **CRITICAL** | `dbService.ts:774` | `teacher_followers` table does not exist | Follow actions attempt to write to non-existent table | Add migration to create table or remove write code |
| **HIGH** | `supabase_migration.sql:39-60` | Duplicate view and like columns in videos table | Causes data integrity divergence risks (`views` vs `view_count`) | Consolidate fields and migrate queries to a single column |
| **MEDIUM** | `youtube.ts:80` | Endpoint `/channels/live` queries non-existent `monitored_channels` table | API requests to live channel segments will 500 error | Create table `monitored_channels` or clean up dead endpoint |
| **MEDIUM** | `VideoLibrary.tsx:787` | Cast `vid as any` required for teacherId | Circumvents TypeScript compiler checks | Update `YouTubeVideo` interface definition in `types.ts` |
| **LOW** | `.gitignore` | Has markdown fences on lines 1 & 32 | Code fences are technically parsed as paths | Clean up markdown formatting |

---

## Section 15 — Common Commands

* **Start Dev Server**: `npm run dev`
* **Build Project**: `npm run build`
* **Run TypeScript Compiler Validation**: `npm run lint` (`tsc --noEmit`)
* **Bulk Ingest 5 Channels**: `npx tsx scripts/ingest_five_channels.ts`
* **Validate Catalog Integrity**: `npx tsx scripts/clean_and_validate.ts`
* **Supabase database push (migration)**: `supabase db push` ⚠ DESTRUCTIVE
* **Supabase generate TS types**: `supabase gen types typescript --project-id jicyzdfzcffhjqehvcpk > src/types/supabase.ts`

---

## Section 16 — Environment Variables

| Variable | Required | Public (VITE_) or Secret | Purpose | Example Value |
|---|---|---|---|---|
| `GEMINI_API_KEY` | Yes | Secret | Gemini API requests | `AIzaSyA...` |
| `APP_URL` | Yes | Secret | Deployment endpoint url | `https://biovised.com` |
| `YOUTUBE_API_KEY` | Yes | Secret | YouTube Data API integrations | `AIzaSyA...` |
| `SUPABASE_URL` | Yes | Secret | Supabase host | `https://jicyzdfzcffhjqehvcpk.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY`| Yes | Secret | Supabase admin bypass key | `sb_secret_hkw...` |
| `VITE_SUPABASE_URL` | Yes | Public | Client connection endpoint | `https://jicyzdfzcffhjqehvcpk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public | Client query key | `sb_publishable_jlD...` |

* **Exposure Risk**: VITE_ prefixed keys (`VITE_SUPABASE_ANON_KEY`) are intentionally public in the client bundle. `SUPABASE_SERVICE_ROLE_KEY` must never be prefixed with VITE_.

---

## Section 17 — Performance Considerations
* **SWR Deduplication**: Configured with `dedupingInterval: 5 * 60 * 1000` to prevent redundant HTTP queries on switch actions.
* **DB-First Caching**: Bypasses YouTube network fetches entirely when records exist in Supabase.
* **Bundle size**: `UNKNOWN — No explicit code-splitting (React.lazy) or chunk strategy config exists in vite.config.ts.`
* **N+1 queries**: Database schema has no indexes, causing N+1 queries on `videos` and `reviews` to perform full table scans on Supabase.

---

## Section 18 — Security
* **Service Key Separation**: The database-modifying admin key (`SUPABASE_SERVICE_ROLE_KEY`) is stored strictly server-side.
* **XSS/dangerouslySetInnerHTML**: `UNKNOWN — No audit was run for dangerouslySetInnerHTML. Standard React components render variables directly.`
* **CSP Headers**: `UNKNOWN — No Content Security Policies are defined in express server.ts or index.html.`

---

## Section 19 — Deployment
* **Client App**: Vite build outputs static assets to `dist/`, deployable via Vercel or CDN.
* **Node Server**: Express API server running on port 3001.
* **Rewrite Rules**: Prod server serves index.html for all non-static paths (`app.get('*', ...)`).

---

## Section 20 — Roadmap & Future Work
* **Phase 3 Trust Score Recalibration**: Dynamic, real-time recalculation of multi-dimensional scores based on verified academic certificates.
* **Direct Lecture Search**: Integration of search matches with the debounced autocomplete.

---

## Section 21 — AI_CONTEXT (Compressed Summary)

```
========================================================================
[PROJECT] BioVised - Curation & Caching Proxy for JEE/NEET prep videos.
[STACK] React 19 + Vite + Express + Supabase DB/Auth + YouTube Data API.
[GROUND TRUTH TABLES]
  - public.teachers (id, name, subject, avatar, features JSONB)
  - public.playlists (id, title, channel_title, content_type, is_active)
  - public.videos (id, title, playlist_id, duration_seconds, is_active)
  - public.profiles (uid, email, role, preferred_subjects, saved_content)
  - public.reviews (id, entity_id, rating, comment, is_flagged)
[CRITICAL BUSINESS RULES]
  - DB-first Caching: Serve /channel/:id & /lectures/:id from Supabase first.
  - Curation Gate: Videos must be >= 20 mins; exclude denylist keywords.
  - Trust Score: profileCompleteness(3) + verifiedCredentials(14) +
    officialLinksScore(2) + reviewReliability(40) + consistency(1) +
    communityEngagement(40).
[AI OPERATIONAL RULES]
  - Never bypass is_active = true on active playlist queries.
  - Always run tsc --noEmit (npm run lint) before completing tasks.
  - Keep service role key secret-side only.
[CRITICAL TECHNICAL DEBT]
  - Fake ratings/accuracy defaults baked into database schema (teachers).
  - dbService follow checks reference non-existent teacher_followers table.
  - Duplicate columns exist in videos table (views vs view_count).
========================================================================
```
