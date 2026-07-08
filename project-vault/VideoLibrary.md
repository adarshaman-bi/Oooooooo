# VideoLibrary 📚

The playlists explorer and channel detail viewer.

- **Path**: `src/components/VideoLibrary.tsx`
- **Related Notes**: [[BiovisedPlayer]], [[youtubeService]], [[Welcome]]

---

## 🎨 Layout Responsibilities

1. **Course Browsing**: Displays curated playlists categorised by subject (`Physics`, `Chemistry`, `Mathematics`, `Biology`) and exam types.
2. **Channel Integration**: Connects to monitered YouTube channels via `/api/youtube/channel/:id` endpoint.
3. **Player Hookup**: When a user selects a video card, it maps local YouTube video items on-the-fly to the global `Lecture` format required by [[BiovisedPlayer]]:
   - `id: video.videoId`
   - `title: video.title`
   - `videoUrl: video.videoUrl || youtubeUrl`
   - `thumbnailUrl: youtubeThumbnail`
