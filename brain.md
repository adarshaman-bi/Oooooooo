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
2. **Aggressive Quality Gates**: Only content that is highly structured and educational is admitted.
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
  [ React SPA Client ] <== SWR Cache (5 min TTL)
     │         │
     │ Auth    │ HTTP REST API
     ▼         ▼
[Supabase] <─── [Express Node Server (server.ts)]
 (DB/Auth)      │
                ├───> [YouTube Data API v3] (Playlist/Video Hydration)
                └───> [InMemorySearchIndex] (Token Auto-Suggest Cache)
```

### Prose Description & Tradeoffs
The system utilizes a decoupled architecture with a monolithic backend and static frontend:
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
| `@google/adk` | `^1.3.0` | AI Studio deployment framework | System environment locked |

---

## Section 4 — Folder Responsibilities

* **`src/components/`**
  * **Purpose**: Modular React UI view items and components.
  * **Key files**: `LectureCard.tsx` (lecture items), `MicModal.tsx` (voice input sheet), `SearchView.tsx` (autocomplete cards), `ChannelProfile.tsx` (branded page).
  * **Imports from**: `src/types.ts`, `src/config/constants.ts`, `src/utils/`
  * **Imported by**: `src/App.tsx`
  * **Rules**: Components should not call inline database fetches. All data loading goes through SWR or global service endpoints.
* **`src/routes/`**
  * **Purpose**: Express controllers driving the REST endpoints.
  * **Key files**: `youtube.ts` (channel profiles, live checks), `lectureRoutes.ts` (teacher playlists).
  * **Imports from**: `src/services/`, `src/utils/`
  * **Imported by**: `server.ts`
* **`src/services/`**
  * **Purpose**: Database interface clients, API integrations, search indexing.
  * **Key files**: `dbService.ts` (queries/mutators), `youtubeService.ts` (live checks), `recommendationEngine.ts` (scoring).
  * **Imports from**: `src/utils/`, `src/types.ts`
  * **Imported by**: Express route controllers, script runners.

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
  * `rating`: `NUMERIC(3, 2) DEFAULT 4.5`
  * `accuracy`: `INTEGER DEFAULT 90`
  * `video_count`: `INTEGER DEFAULT 0`
  * `followers_count`: `INTEGER DEFAULT 0`
  * `bio`: `TEXT`
  * `is_verified`: `BOOLEAN DEFAULT TRUE`
  * `subjects`: `JSONB`
  * `exams`: `JSONB`
  * `features`: `JSONB`
* **Relationships**:
  * Referenced by `playlists.teacher_id` and `videos.teacher_id`.

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

---

## Section 6 — Authentication & Authorization

### 6.1 Auth Provider
Powered by **Supabase Auth (GoTrue)**. The main authentication method used is Email/Password login, alongside support for Google OAuth.

### 6.2 User Roles
Roles are stored directly in the `public.profiles.role` column.
* **User Roles**: `'user'` (standard student), `'teacher'` (educator privileges), `'admin'` (moderation dashboard access).

### 6.3 Protected Routes
Client-side views are auth-gated in `App.tsx`:
* `/admin` (Moderator/Admin Dashboard): Requires `user.role === 'admin'`.
* Reviews submission interface: Gated to authenticated users only.

### 6.4 Database Security (RLS)
Supabase PostgreSQL Row Level Security (RLS) restricts access:
* `profiles`: Users can read/write only their own row (`auth.uid() = uid`).
* `reviews`: Insert allowed for authenticated users. Updates/Deletes restricted to owner or admin.
* `teachers`, `playlists`, `videos`: Public read access enabled, writes restricted to `admin` role or service role connection.

### 6.5 Token Lifecycle
Supabase JWTs are managed by the `@supabase/supabase-js` SDK, stored in `localStorage` under `sb-jicyzdfzcffhjqehvcpk-auth-token`, and refreshed automatically via token exchange.

---

## Section 7 — Routing

| Route Path | Component | Auth Required | Role Required | Notes |
|---|---|---|---|---|
| `/` | `HomeDashboard` | No | — | Displays Syllabus/One-Shot tabs |
| `/explore` | `VideoLibrary` | No | — | Grid of lectures, playlists, categories |
| `/search` | `SearchView` | No | — | Autocomplete and results view |
| `/test-series` | `TestSeriesDirectory`| No | — | Premium directory |
| `/auth/callback`| `AuthCallback` | No | — | OAuth callback receiver |
| `/admin` | `ModeratorDashboard` | Yes | `admin` | Administrator and curation console |

---

## Section 8 — State Management

### 8.1 Global State
* **Auth Context**: Configured in `src/context/AuthContext.tsx`. Tracks `user`, `profile`, and `session` states.
* **Player Context**: Configured in `src/context/PlayerContext.tsx`. Tracks full-screen overlay playback, active video details, speed, volume, and watch history.
* **Search Context**: Configured in `src/context/SearchContext.tsx`. Tracks global search queries and debounced suggestion list changes.

### 8.2 Data Fetching & Caching (SWR)
Client data utilizes SWR caching with custom options (TTL: 5 mins, deduplication enabled):
* `SWR_KEYS.PLAYLISTS` -> Maps to `/api/youtube/playlists` (database active records).
* `SWR_KEYS.CHANNELS` -> Maps to `/api/youtube/channels` (monitored active channels).

---

## Section 9 — API & External Integrations

### 9.1 YouTube Data API v3
* **Endpoints called**:
  * `playlists.list`: Fetches playlists belonging to channel.
  * `playlistItems.list`: Paginates videos inside playlists.
  * `videos.list`: Hydrates duration, views, and likes metadata.
* **Caching**: EXPRESS server acts as a proxy caches results or serves straight from Supabase if rows exist.
* **API Key Storage**: Kept server-side in `YOUTUBE_API_KEY` (secret).

### 9.2 YouTube IFrame Player API
* **Initialization**: Injected via script load within `VideoLibrary.tsx`.
* **Controls intercept**: Intercepts play, pause, progress rate, volume, and fullscreen commands.
* **Anti-distraction enforcement**: Blocks overlays, annotations (`iv_load_policy: 3`), related recommendations (`rel: 0`), and loops custom progress events.

### 9.3 Web Audio API
* **Frequency Analysis**: Uses `AnalyserNode` and `AudioContext` inside `MicModal.tsx` to read mic stream amplitude, animating peach-colored visualizer bars in real-time.

---

## Section 10 — Business Logic & Algorithms

### Rule: Trust Score Calculation
* **Location**: `src/services/dbService.ts` -> `fetchTrustScore(entityId)`
* **Inputs**: `isVerified` (boolean), `hasBioOrDesc` (boolean), `hasAvatarOrLogo` (boolean), `hasOfficialLinks` (boolean), `reviews` (Array of user reviews), `avgRating` (average review stars).
* **Formula**:
  1. Profile Completeness: `(hasBioOrDesc ? 1 : 0) + (hasAvatarOrLogo ? 1 : 0) + 1` (Max: 3)
  2. Verified Credentials: `isVerified ? 14 : 4` (Max: 14)
  3. Official Links: `hasOfficialLinks ? 2 : 0` (Max: 2)
  4. Review Reliability: `min(40, 10 + reviews.length * 3)` (Max: 40)
  5. Content Consistency: `1` (Max: 1)
  6. Community Engagement: `min(40, floor(avgRating * 8))` (Max: 40)
  7. **Total Score**: `profileCompleteness + verifiedCredentials + officialLinksScore + reviewReliability + contentConsistency + communityEngagement` (Capped at 100).
* **Output**: `number` (0–100).

### Rule: YouTube Ingestion Filtering (Anti-Junk Curation)
* **Location**: `scripts/ingest_five_channels.ts`
* **Filters**:
  * Duration Check: Skips any video under 20 minutes (`duration_seconds < 1200`).
  * Keyword Denylist Check: Checks titles against denylist keywords (e.g. `cocomelon`, `cartoon`, `rhyme`, `kids song`, `baby`, `lullaby`, `strategy`, `news`).

---

## Section 11 — Design System

### 11.1 Color Palette
* **Backgrounds**: Slate Black (`#000000`, `#08080A`, `#0E0E0F`)
* **Accents**: Turmeric Yellow (`#D97706`), Glowing Orange (`#EA580C`), Peach-Red (`#FBB093`)
* **Text**: Pure White (`#FFFFFF`), Soft Zinc (`#A1A1AA`), Charcoal Gray (`#52525B`)

### 11.2 Typography
* Headers: `Bebas Neue`
* Interface Text: `Urbanist`, `Inter`
* Code & Analytics: `JetBrains Mono`

### 11.3 Icon System
* Uses `lucide-react` icons (imported dynamically or destructured at module level).

---

## Section 12 — Coding Standards & Conventions

* **Strict TypeScript**: No `any` type overrides allowed unless casting is local or bypassing database mapping definitions (`tsc --noEmit` validation).
* **Vite HMR constraint**: File watch triggers are configured via `DISABLE_HMR` to prevent workspace flicker in browser containers.
* **Component Structures**:
  1. Props interface definition.
  2. State variables and SWR hooks.
  3. Custom user action event handlers.
  4. Render markup using semantic HTML.

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

---

## Section 14 — Known Issues & Technical Debt

| Severity | Location | Issue | Impact | Suggested Fix |
|---|---|---|---|---|
| **MEDIUM** | `VideoLibrary.tsx:787` | Cast `vid as any` required for teacherId | Circumvents TypeScript compiler checks | Update `YouTubeVideo` interface definition in `types.ts` |
| **LOW** | `.gitignore` | Has markdown fences on lines 1 & 32 | Code fences are technically parsed as paths | Clean up markdown formatting |

---

## Section 15 — Common Commands

* **Start Dev Server**: `npm run dev`
* **Build Project**: `npm run build`
* **Run TypeScript Compiler Validation**: `npm run lint` (`tsc --noEmit`)
* **Bulk Ingest 5 Channels**: `npx tsx scripts/ingest_five_channels.ts`
* **Validate Catalog Integrity**: `npx tsx scripts/clean_and_validate.ts`

---

## Section 16 — Environment Variables

| Variable | Required | Public (VITE_) or Secret | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | Secret | Gemini API requests |
| `APP_URL` | Yes | Secret | Deployment endpoint url |
| `YOUTUBE_API_KEY` | Yes | Secret | YouTube Data API integrations |
| `SUPABASE_URL` | Yes | Secret | Supabase host |
| `SUPABASE_SERVICE_ROLE_KEY`| Yes | Secret | Supabase admin bypass key |
| `VITE_SUPABASE_URL` | Yes | Public | Client connection endpoint |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public | Client query key |

---

## Section 17 — Performance Considerations
* **SWR Deduplication**: Configured with `dedupingInterval: 5 * 60 * 1000` to prevent redundant HTTP queries on switch actions.
* **DB-First Caching**: Bypasses YouTube network fetches entirely when records exist in Supabase.

---

## Section 18 — Security
* **Service Key Separation**: The database-modifying admin key (`SUPABASE_SERVICE_ROLE_KEY`) is stored strictly server-side.
* **PostgreSQL RLS Policies**: Database schemas are secured to ensure users can only modify their own profiles and reviews.

---

## Section 19 — Deployment
* **Client App**: Vite build outputs static assets to `dist/`, deployable via Vercel or CDN.
* **Node Server**: Express API server running on port 3001.

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
[METRICS LOG]
  - Playlists: 73 Active, Videos: 670 Active, Junk Leaked: 0.
========================================================================
```
