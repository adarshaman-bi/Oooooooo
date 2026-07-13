# ReviewsAndRatingsScreen 🧱

- **File Path**: `src/components/ReviewsAndRatingsScreen.tsx`
- **Type**: Component
- **Status**: Stable
- **Relations**: [[Vault-MOC]], [[Full-File-Inventory]]

---

## 📋 Purpose
A full-screen view for managing ratings, filtering reviews, displaying reviewer trust scores, rendering Reddit-style threaded comments with connecting guides, and providing review submission composer capabilities.

---

## 🔌 Key Exports / Props
- `ReviewsAndRatingsScreenProps`:
  - `lectureId: string`
  - `lectureTitle: string`
  - `currentUserId: string | null`
  - `currentUserProfile: any` (optional, falls back to internal fetch)
  - `onClose: () => void`

---

## 🔗 Dependency Map
- **Imports**: [[types]], [[AuthContext]], [[dbService]], [[motion]], [[supabaseClient]]
- **Imported By**: [[LectureDetailsSection]]
