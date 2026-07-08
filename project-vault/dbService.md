# dbService 🗄️

The frontend database client service that encapsulates all REST queries, mutations, and database logic communicating with Supabase.

- **Path**: `src/services/dbService.ts`
- **Related Notes**: [[Supabase Schema]], [[youtubeService]], [[AuthContext]]

---

## 🛠️ Main Responsibilities

1. **Watch Progress Tracking**: Updates watch state progress records (`trackWatchProgress`) inside `watch_history` to save lecture resume positions.
2. **Teacher Social Mapping**: Manages follows and unfollows (`toggleFollow`, `fetchFollowingList`) by inserting/deleting profiles in `teacher_followers`.
3. **Likes & Favorites**: Stores references of liked videos and watch-later playlists to build personal profiles.
4. **Interactive Reviews**: Allows logged-in students to submit star ratings and descriptions (`submitReview`, `fetchReviews`) for lectures.
5. **Onboarding Updates**: Updates the user profile preferences (`onboardingCompleted`, `preferredSubjects`) upon wizard completion.
