# LectureDetailsSection 🧱

- **File Path**: `src/components/LectureDetailsSection.tsx`
- **Type**: Component
- **Status**: Stable
- **Relations**: [[Vault-MOC]], [[Full-File-Inventory]]

---

## 📋 Purpose
A unified layout details component housing the expandable/truncating title, channel metadata (avatar, follow state), horizontal action options (Like, Save, Watch Later, and Share), inline average ratings card with transition route, expandable video description, and recommended video items list.

---

## 🔌 Key Exports / Props
- `Props`:
  - `lecture: LectureLike`
  - `currentUserId: string | null`
  - `onSelectRecommended?: (lecture: LectureLike) => void`
  - `onSelectLecture?: (lecture: LectureLike) => void`

---

## 🔗 Dependency Map
- **Imports**: [[types]], [[dbService]], [[motion]], [[supabaseClient]], [[ReviewsAndRatingsScreen]]
- **Imported By**: [[App]], [[VideoLibrary]]
