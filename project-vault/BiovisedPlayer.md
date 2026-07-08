# BiovisedPlayer 🎥

The consolidated, single-file custom video playback engine for the entire BioVised application.

- **Path**: `src/components/BiovisedPlayer.tsx`
- **Related Notes**: [[PlayerContext]], [[dbService]], [[youtubeService]], [[VideoLibrary]], [[LecturesGrid]], [[TeacherProfileDetail]]

---

## 🚀 Key Features

1. **YouTube API Integration**: Loads the IFrame Player API dynamically and controls video state via JS parameters (disabling YouTube's native keybindings, advertising, and annotations).
2. **Double Title / Thumbnail Flash Cover**: Implements a solid black overlay that blocks YouTube's native thumbnail and top-bar headers before initial play. The overlay is permanently dismissed once the user clicks Play and the player fires its first `PLAYING` event (`hasStartedOnce`).
3. **Responsive Modes**:
   - **Inline 16:9**: Default embed mode in cards and lists.
   - **Landscape Fullscreen**: Toggles using browser `requestFullscreen` with device orientation locks (forced landscape on mobile).
   - **Vertical 9:16**: stacked portrait layout for mobile screens resembling the native YouTube mobile app.
4. **Precision Scrubbing**: Eases transition to mouse positions during drag, and supports vertical cursor drag offset (>40px) to engage fine 1/4 speed scrubbing with a timestamp tooltip.
5. **Keyboard Shortcuts**: Complete desktop set (Space/K to pause, arrows to seek/volume, F/T/C for Fullscreen/Theater/Captions, 0-9 to jump).

---

## 🔌 Props Interface

```typescript
interface BiovisedPlayerProps {
  lecture: Lecture;              // Main video metadata (id, title, url, etc.)
  onClose: () => void;           // Close/exit handler
  playlistLectures?: Lecture[];  // Array of lectures in current playlist for next/prev
  onSelectLecture?: (lecture: Lecture) => void;
}
```
For detail mapping of database models, see [[Supabase Schema]].
