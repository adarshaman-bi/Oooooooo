# Implementation Plan - Unacademy UI 10/10 Visual Parity Redesign (v2)

This plan outlines the visual and structural alignment of the Watch Details section with the Unacademy reference UI (v2 specifications). It details structural corrections, spacing scales, updated component states, and awaits the user's magic word to proceed.

## Proposed Changes

### 0. Structural Corrections
We will perform the following structural modifications inside [`LectureDetailsSection.tsx`](file:///c:/onion.so/src/components/LectureDetailsSection.tsx):
1. **Remove Title Expand**: Permanently delete the "Show More" / "Show Less" toggle block under the title. Let the title wrap naturally up to 2 lines via CSS `line-clamp-2`.
2. **Action Buttons Horizontal Row**: Rebuild the button layout to use horizontal/inline alignment (icon left, 6px gap, label right) instead of stacked. All 5 buttons will have a unified height of 36px.
3. **Playlist Action Button**: Add a 5th button `"Add to playlist"` (with a `ListPlus` icon) inserted between `"Save"` and `"Watch later"`. Clicking it will show a toast `"Added to Playlist"` (or trigger dynamic playlist addition if pre-existing).
4. **Description Relocation**: Ensure the description and its "See more ⌄" toggle are positioned cleanly below the review card.
5. **Review Card Interactive Input**: Add a comment input field inside the right column of the review card with the placeholder `"Share your thoughts about this video..."`. It will span the full width of the column, using an 8px border-radius, vertical padding, and will trigger the existing `ReviewsAndRatingsScreen` composer modal when clicked (retaining existing rating and review APIs).
6. **Pencil Icon for Reviews**: Replace `"Add Review >"` chevron with a modern Pencil edit icon positioned directly next to the `"Add review"` label.
7. **Trust Score Tick overlapping badge**: Rebuild the Trust Score indicator to feature percentage text centered inside the ring (e.g. `92%`), with a small white circular tick badge (`12px`/`14px`) overlapping the bottom-right edge of the ring.
8. **Divider Line Removals**: Delete the `<div className="border-t border-white/5 mt-4 mb-4" />` horizontal rule between the action row and the review card, as well as any other intermediate horizontal lines in the details section (retaining only the divider directly above "Recommended Lessons").

---

### 1. Spacing Scale & Layout Constraints
We will replace all arbitrary margins and vertical gaps with the strict spacing system specified in the v2 guidelines:
* **Video Player to Title**: `mt-3` (12px)
* **Title to Metadata**: `mt-2` (8px)
* **Metadata to Channel Section**: `mt-[14px]` (14px)
* **Channel Section to Actions Bar**: `mt-3` (12px max)
* **Actions Bar to Review Card**: `mt-[14px]` (14px)
* **Review Card to Description**: `mt-3` (12px)
* **Description to Recommended Lessons**: `mt-4` (16px max)
* **Horizontal Padding**: Uniform 16px (`px-4`) on the root container and all inner blocks.
* **Remove Divider Lines**: Remove any dividers between metadata and channel, or channel and actions. Keep only the subtle, low-opacity 1px divider directly above "Recommended Lessons".

---

### 2. Title Block
* **Typography**: Size `20px`, line-height `1.2`, weight `700`, rendering full title up to 2 lines without mid-word truncation.
* **Separators**: Truncate at `|` separator if truncation is required.

---

### 3. Metadata Row
* **Typography**: Size `14px`, color `#9CA3AF` (gray), single-line height.
* **Format**: Joint string `Subject • ExamType`.

---

### 4. Channel Row Rebuild
Rebuild the channel row inside `LectureDetailsSection.tsx` with center vertical alignment:
* **Avatar**: `44px` perfect circle (`w-[44px] h-[44px] rounded-full`).
* **Name & Subscribers Stack**:
  * **Channel Name**: `text-[16px]` bold, white.
  * **Verified Badge**: Placed directly next to name (4px gap, size `14px`) aligned to the baseline.
  * **Subscribers**: `text-[13px] text-white/50 mt-[2px]`.
* **Trust Score Indicator**:
  * **Diameter**: `48px` (`w-12 h-12`).
  * **Stroke**: `3px`.
  * **Percentage**: Centered bold `text-[13px]`.
  * **Overlapping Tick Badge**: `w-3.5 h-3.5 bg-white rounded-full border border-neutral-950 absolute bottom-[1px] right-[1px] flex items-center justify-center shadow-sm z-10` with a green check tick inside.
  * **Label**: `"Trust Score"` below the circle, `mt-1` (4px), font `11px` gray, sentence case.
* **Follow Button**: Blue pill, `36px` height, horizontal padding `20px`, font `14px` semibold, `rounded-full` (9999px).

---

### 5. Action Buttons Row
* **Toolbar structure**: Inline flex row, scrollable horizontally with no wrapping (`overflow-x-auto no-scrollbar`).
* **Buttons**: 5 pills (Like, Save, Add to playlist, Watch later, Share) styled identically:
  * **Height**: `36px`.
  * **Border**: `1px` low-opacity neutral gray.
  * **Background**: Transparent/very dark.
  * **Padding**: `px-[14px]`.
  * **Icon/Label**: Inline with `6px` gap, label font `13px` medium weight.

---

### 6. Review Card Redesign
* **Border**: `1px solid` low-opacity accent-blue (`border-[#3B82F6]/25`).
* **Radius**: `12px`.
* **Padding**: `py-3 px-3.5`.
* **Layout**: Two columns:
  * **Left Column**: rating numeral (`28px` bold) + gold star, with `({reviews.length} reviews)` count below (`13px` gray).
  * **Vertical Divider**: `1px` width, full height, `12px` margin (`mx-3 w-px bg-white/10 self-stretch`).
  * **Right Column**:
    * Row 1: `"Add review"` label (`14px` medium) + Lucide Pencil icon (`14px` or `16px`) aligned right of the label.
    * Row 2: 5-star interactive stars component (`mt-1`).
    * Row 3: comment input field (`mt-2`), placeholder `"Share your thoughts about this video..."`, background `bg-zinc-800/40`, `8px` corner radius, `8px` vertical padding.

---

### 7. Description
* **Condition**: Render only if description exists.
* **Format**: Plain text, `14px` gray, line-clamp to ~2-3 lines.
* **Toggle**: `"See more ⌄"` link directly below, `mt-1` (4px gap), `13px` brighter gray, with small chevron-down icon.

---

## Regression Guard (Mandatory)
During implementation, preserve every improvement that has already been achieved.
Do not regress previously refined areas while improving another section.
Each iteration should be cumulative.
Before modifying any component:
* Verify that the change does not negatively affect spacing elsewhere.
* Preserve typography hierarchy.
* Preserve horizontal alignment.
* Preserve vertical rhythm.
* Preserve interaction behavior.
* Preserve responsiveness.
* Preserve accessibility.
* Preserve existing animations unless they directly conflict with the reference.

If a refinement introduces a new visual inconsistency, continue iterating until both the old and new sections satisfy the acceptance criteria simultaneously.
The implementation is complete only when all sections meet the target together—not when individual sections look correct in isolation.

### Continuous Refinement Loop
For every visual change:
1. Implement the refinement.
2. Compare against the reference.
3. Compare against the previous implementation.
4. Check that no regressions have appeared.
5. Repeat until no obvious differences remain.

Never stop after the first visually acceptable result. The goal is visual convergence, not simply completing the checklist.

### Definition of Done
The redesign is complete only when:
* The UI feels immediately familiar to someone accustomed to the Unacademy interface.
* The overall layout, spacing, proportions, density, hierarchy, and polish closely match the reference.
* No component draws unnecessary attention because of inconsistent spacing, sizing, alignment, or visual weight.
* A side-by-side comparison reveals only minor branding differences rather than structural or compositional differences.

## Verification Plan

### Automated Tests
* Run `npm run build` to verify clean compilation with no TypeScript or build issues.

### Manual Verification
* Visual side-by-side inspection against the Unacademy UI mock to verify identical proportions, baselines, and vertical rhythm.
