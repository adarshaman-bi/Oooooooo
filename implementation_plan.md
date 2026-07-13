# Implementation Plan - Unacademy UI 10/10 Visual Parity Redesign

This plan outlines the visual redesign of the Watch Details section to achieve a 10/10 visual parity match with the Unacademy reference UI. It structures the page into a unified, continuous surface with a strict spacing system, rebuilt channel row, action toolbar, and condensed reviews card.

## Proposed Changes

### 1. Fallback Description Removal
We will remove the default fallback string `'Verified YouTube Academic Video lecture.'` from all components and ensure that empty descriptions do not render any container or reserve vertical spacing.

* **Files to Modify**:
  * [`src/components/LecturesGrid.tsx`](file:///c:/onion.so/src/components/LecturesGrid.tsx)
  * [`src/components/VideoLibrary.tsx`](file:///c:/onion.so/src/components/VideoLibrary.tsx)
* **Changes**:
  * Update description fallback to empty string `""`.
  * Ensure the description wrapper in `LectureDetailsSection.tsx` only mounts if `lecture.description` is non-empty.

---

### 2. Spacing Scale & Layout Constraints
We will replace all arbitrary margins and vertical gaps with a strict spacing system:
* **Video Player to Title**: `mt-3` (12px)
* **Title to Metadata**: `mt-[6px]` (6px)
* **Metadata to Channel Section**: `mt-3` (12px)
* **Channel Section to Actions Bar**: `mt-4` (16px)
* **Actions Bar to Review Card**: `mt-4` (16px)
* **Review Card to Description**: `mt-3` (12px)
* **Description to Recommended Lessons**: `mt-4` (16px)
* **Horizontal Padding**: Uniform 16px (`px-4`) on the root container and all details divisions.

---

### 3. Rebuilding the Channel Row
Rebuild the channel row inside `LectureDetailsSection.tsx` as a single, baseline-aligned flex layout containing four items:

* **Avatar**: 48px circle (`w-12 h-12 rounded-full`).
* **Name & Subscribers**: Stacked on the right of the avatar with `ml-3`.
  * **Channel Name**: `text-[18px] font-bold text-white truncate flex items-center gap-[6px]`.
  * **Verified Badge**: Placed directly next to the name with `ml-1.5` (6px gap) and aligned perfectly with the baseline of the text.
  * **Subscribers Count**: `text-[13px] text-white/50 mt-0.5`.
* **Trust Score Indicator**: Centered flex block vertically aligned with the Follow button:
  * **Circle**: 44px (`w-11 h-11`).
  * **Thin ring**: `strokeWidth="2.5"` around a centered `text-[12px]` bold number.
  * **Label**: "Trust Score" (`text-[8px] uppercase tracking-wider text-white/45 font-bold mt-1`).
* **Follow Button**:
  * **Height**: 42px (`h-[42px]`).
  * **Styling**: Proportional padding (`px-4`), rounded-full, and blue fill (`bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[12px] font-bold`).

---

### 4. Action Buttons Redesign
Overhaul action buttons to feel like one uniform, connected row.

* **Height**: 40px (`h-[40px]`).
* **Border Radius**: `rounded-xl`.
* **Padding**: `px-4`.
* **Icon Size**: 15px.
* **Layout**: Centered text and icons (`flex items-center justify-center gap-1.5`).
* **Divider**: Thin, low-opacity line `border-t border-white/5 mt-4 mb-4` after the action row.

---

### 5. Review Card Redesign
Overhaul the review card to reduce its height by roughly 35%, ensuring all content is vertically centered:

* **Container**: `py-2.5 px-3.5 rounded-xl border border-white/10 bg-zinc-900/30 flex items-center justify-between mt-4`.
* **Left Column**:
  * Rating: `flex items-center gap-1 text-xl font-bold` (e.g. `4.9` with a gold star).
  * Review count: `text-[10px] text-white/40 mt-0.5` (e.g. `18.7K Reviews`).
* **Center Divider**: Vertical rule `w-px h-10 bg-white/10 self-center mx-2`.
* **Right Column**:
  * Header: `"Add Review"` with a tiny chevron (`text-[12px] text-white/80 font-bold`).
  * Interactive Stars: `InteractiveStars` with size 18.

---

### 6. Typography System
Establish strict font sizes:
* **Title**: `text-2xl md:text-3xl font-bold leading-[1.2] line-clamp-2` (Largest)
* **Channel Name**: `text-[18px] font-bold` (Second)
* **Metadata**: `text-[13px] text-white/40 font-medium` (Third)
* **Subscribers**: `text-[12px] text-white/50` (Fourth)
* **Description**: `text-[14px] text-white/60 leading-[1.6]` (Body)
* **Trust Score Label**: `text-[8px] font-bold text-white/45 uppercase` (Smallest)

## Final Visual Acceptance Criteria (Mandatory)
Treat the provided Unacademy screenshot as the single source of truth. The goal is not to merely apply the listed values, but to reproduce the same visual hierarchy, density, rhythm, and polish as closely as possible.
The measurements in this plan are starting points. If a small adjustment of about 2–4px produces a visibly closer match to the reference, prefer the visual result over the exact number. Do not stop after the first pass. Compare the rendered page side by side with the reference at 100% zoom and keep refining until the differences are subtle at a glance.
The final screen should feel compact, premium, and intentionally designed. The entire details section should be visibly more compressed than the current version, without hurting readability. Every section should feel attached to the next, with no oversized gaps or disconnected blocks.
The title block, metadata, channel row, action toolbar, review card, description, and recommended lessons heading must all align to the same left grid and share the same visual language. No secondary element should compete with the title. The trust score must remain secondary. The review card must stay slim. The buttons must feel unified and compact. The verified badge must sit naturally beside the channel name. The description must only appear when real content exists and must reserve no space when empty.
Visual parity is the priority. If something looks closer to the reference even when it deviates slightly from a listed value, choose the version that looks better. The implementation is complete only when the final rendered UI feels nearly indistinguishable from the reference in spacing, proportions, hierarchy, and overall polish while preserving the app’s branding and functionality.

## Verification Plan

### Automated Tests
* Run `npm run build` to verify clean compilation with no TypeScript or build issues.

### Manual Verification
* Visual side-by-side inspection against the Unacademy UI mock to verify identical proportions, baselines, and vertical rhythm.
