# youtubeUtils ⚙️

- **File Path**: `src/utils/youtubeUtils.ts`
- **Type**: Service / Utility
- **Status**: Stable
- **Relations**: [[Vault-MOC]], [[Full-File-Inventory]]

---

## 📋 Purpose
Extracts a clean 11-character YouTube Video ID from a URL, embed path, or raw ID.

---

## 🛠️ Main Functions / Methods
- `extractYoutubeId`
- `getYoutubeThumbnail`
- `getYoutubeEmbedUrl`
- `formatCount`
- `formatViews`
- `formatSubscribers`
- `parseDurationToSeconds`
- `mapVideoRow`
- `parseISO8601Duration`
- `normalizeYoutubeVideoResource`
- `getDurationInSeconds`
- `isAcademicContent`

---

## 🔗 Dependency Map
- **Imports**: [[types]]
- **Imported By**: [[ingest_five_channels]], [[ingest_single_playlist]], [[runPilotIngestion]], [[ChannelProfile]], [[HomeDashboard]], [[LectureCard]], [[LectureDetailView]], [[VideoLibrary]]
