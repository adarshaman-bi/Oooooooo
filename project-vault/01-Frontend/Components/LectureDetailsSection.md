# LectureDetailsSection 🧱

- **File Path**: `src/components/LectureDetailsSection.tsx`
- **Type**: Component
- **Status**: Stable (Visual Overhaul Complete)
- **Relations**: [[Vault-MOC]], [[Full-File-Inventory]]

---

## 📋 Purpose
A highly refined, visually dense watch details component built to match the Unacademy layout. Features 2-line maximum title wrap with direct alignment to the video player, baseline-aligned channel metadata card (with avatar, name, verified check, and subscriber count), slim Trust Score ring with overlapping check badge and sentence-case caption, inline 5-button action toolbar, blue-bordered 35% height-reduced ratings card, and relocated conditionally-rendered description block.

---

## 🔌 Key Exports / Props
- `Props`:
  - `lecture: LectureLike`
  - `currentUserId: string | null`
  - `onSelectRecommended?: (lecture: LectureLike) => void`
  - `onSelectLecture?: (lecture: LectureLike) => void`

---

## 🔗 Dependency Map
- **Imports**: [[types]], [[dbService]], [[motion]], [[supabaseClient]], [[ReviewsAndRatingsScreen]], `Pencil`
- **Imported By**: [[App]], [[VideoLibrary]]

---

## 🎨 Visual Overhaul Details (Unacademy Spec v2)
* **Title Block**: Spacing of 12px below the player; font size 20px, weight 700, line-height 1.2, line-clamp-2.
* **Metadata**: Spacing of 8px below title; font size 14px, `#9CA3AF` gray, single line.
* **Channel Row**: Spacing of 14px below metadata; 44px avatar circle; channel name 16px bold white; verified check badge 4px to the right; subscribers 13px gray with 2px top margin; 48px trust score ring (stroke 3px) with centered percentage and overlapping tick badge; 36px blue follow button with 20px padding.
* **Action Pills**: Spacing of 12px below channel; 5 inline pill buttons (Like, Save, Add to playlist, Watch later, Share) with height 36px, fully rounded, 14px padding, 8px spacing gap.
* **Review Card**: Spacing of 14px below actions; 1px blue border; py-3 px-3.5 padding; left column rating numeral (28px bold) + star and count; 1px vertical divider; right column "Add review" label + Pencil icon, interactive stars, and comment input field.
* **Description Relocation**: Spacing of 12px below card; conditionally rendered plain text (14px gray, line-clamp-2) with "See more" toggle.
* **Recommended Lessons**: Spacing of 16px below description; preceded by the only 1px low-opacity horizontal divider line.
