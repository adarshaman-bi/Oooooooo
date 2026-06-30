# Walkthrough — YouTube Data API v3 Multi-Stage Ingestion Pipeline

## Summary

Implemented the full multi-stage YouTube ingestion pipeline, fixing database schema mismatches, eliminating broken production routing, and wiring deep video statistics through the entire stack.

---

## Changes Made

### 1. Backend Ingestion Pipeline — [youtubeService.ts](file:///C:/Users/abhii/Downloads/biovised/src/services/youtubeService.ts)

**Complete rewrite.** The old service tried to read/write from non-existent `youtube_videos_cache` Supabase tables, causing silent database failures on every single request.

| Feature | Before | After |
|---------|--------|-------|
| Database target | `youtube_videos_cache` (doesn't exist) | `public.videos` (active production table) |
| Playlist expansion | Single flat API call | Paginated `/v3/playlistItems` (up to 200 videos) |
| Video statistics | Not fetched | Batch `/v3/videos?part=statistics,contentDetails` in chunks of 50 |
| Duration parsing | Not supported | ISO 8601 parser (`PT14M3S` → `14:03`, `PT1H15M` → `1h 15m`) |
| Caching (in-memory) | None | 15-minute TTL in-memory cache |
| Caching (database) | Broken writes | 24-hour TTL check against `updated_at` timestamps |
| Fallback behavior | Hard crash | Graceful stale-data fallback when API key is missing/quota exceeded |

---

### 2. Route Endpoints — [youtube.ts](file:///C:/Users/abhii/Downloads/biovised/src/routes/youtube.ts)

- **`/channel/:channelId`**: Now syncs fetched channel metadata (name, avatar, subscriber count) to `public.channels` table via upsert after every API retrieval.
- **`/lectures/:playlistId`**: Response payload now includes `viewCount` and `duration` fields alongside existing video data.

### 3. Lecture Route — [lectureRoutes.ts](file:///C:/Users/abhii/Downloads/biovised/src/routes/lectureRoutes.ts)

- Extended response mapping to pass `viewCount` and `duration` through to the frontend.

---

### 4. Production Routing Fixes

#### [TeacherProfileDetail.tsx](file:///C:/Users/abhii/Downloads/biovised/src/components/TeacherProfileDetail.tsx)
- **Line 351**: `http://localhost:3001/api/youtube/channel/...` → `/api/youtube/channel/...`
- **Line 398**: `http://localhost:3001/api/youtube/lectures/...` → `/api/youtube/lectures/...`

#### [ChannelProfile.tsx](file:///C:/Users/abhii/Downloads/biovised/src/components/ChannelProfile.tsx)
- **Lines 120-122**: Removed conditional `window.location.hostname === 'localhost'` routing → always `/api/youtube`
- **Lines 149-151**: Same fix for the lectures fetch call

> [!IMPORTANT]
> All four `localhost:3001` references across the codebase have been eliminated. Zero remaining.

---

### 5. Thumbnail Fallback & Stats UI — [LecturesGrid.tsx](file:///C:/Users/abhii/Downloads/biovised/src/components/LecturesGrid.tsx)

- Replaced raw `<img>` tags with `<YoutubeThumbnailImg>` component for automatic cascading fallback: `maxresdefault.jpg` → `hqdefault.jpg`
- Extended `Lecture` interface with `viewCount?: number` and `duration?: string`
- Added duration badge overlay (bottom-right of thumbnail, with Clock icon)
- Added view count display (with Eye icon, formatted as K/M)
- Added `formatViewCount()` helper for human-readable counts

---

## Verification Results

### TypeScript Strict Compilation
```
✅ tsc --noEmit → 0 errors
```

### Production Build
```
✅ vite build → 2,237 modules transformed
   dist/index.html                     0.61 kB
   dist/assets/index-BC_mOw2t.css    172.72 kB
   dist/assets/index-0hnfNIuY.js   1,513.23 kB
   Built in 18.78s
```

> [!NOTE]
> Vite emits advisory warnings about large chunk sizes and mixed dynamic/static imports for `dbService.ts`. These are pre-existing optimization suggestions, not errors from our changes.

---

## Files Modified

| File | Change Type |
|------|------------|
| `src/services/youtubeService.ts` | **Full rewrite** — multi-stage ingestion engine |
| `src/routes/youtube.ts` | Channel DB sync + deep stats in lectures response |
| `src/routes/lectureRoutes.ts` | Pass viewCount/duration to frontend |
| `src/components/TeacherProfileDetail.tsx` | Remove localhost:3001 references |
| `src/components/ChannelProfile.tsx` | Remove localhost:3001 references |
| `src/components/LecturesGrid.tsx` | YoutubeThumbnailImg + stats UI badges |
