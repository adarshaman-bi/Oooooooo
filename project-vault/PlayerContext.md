# PlayerContext 🎧

Provides global control states for the active video player.

- **Path**: `src/context/PlayerContext.tsx`
- **Related Notes**: [[BiovisedPlayer]], [[VideoLibrary]], [[LecturesGrid]]

---

## 🚀 Context Variables

- `activeLecture`: The `Lecture` metadata object currently playing in the app. Setting this to a non-null object triggers the full-screen clean playback focus view in `App.tsx` or `TeacherPage.tsx`.
- `setActiveLecture`: Handler to set/clear the active video.
- `currentPlaylist`: Optional list of course lectures.
- `setCurrentPlaylist`: Handler to set active playlist courses.
