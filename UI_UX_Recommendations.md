# UI/UX Design Recommendations Document

**Project:** Biovised Application (Mobile & PC)
**Role:** Product Design & UX Strategy
**Date:** October 26, 2023
**Objective:** Address specific usability feedback, enhance visual fidelity, and streamline user flows for Teacher and Profile sections.

---

## 1. Theme System & Global Navigation

### 1.1 Theme Application Feedback
*   **Problem:** Clicking the theme icon triggers no visible change; users lack confirmation that the action succeeded.
*   **Recommendation:**
    *   **Interaction Logic:** Verify the event listener on the theme toggle ensures immediate state propagation to the CSS variables.
    *   **Visual Feedback:** Implement a micro-interaction upon clicking the theme icon.
        *   **Animation:** A subtle `scale-up` (1.0 → 1.2 → 1.0) on the icon itself over `200ms`.
        *   **Toast Notification:** Display a transient, non-intrusive toast message: *"Theme Updated"* positioned at the bottom-center of the viewport, fading out after `2s`.
    *   **Transition:** Ensure all color transitions use a `ease-in-out` curve with a duration of `300ms` to prevent jarring flashes.

### 1.2 Footer Navigation Indicators
*   **Problem:** The active state indicator (small dot) clutters the footer when a page is selected.
*   **Recommendation:**
    *   **Removal:** Completely remove the dot element from the DOM or set `display: none` for active states.
    *   **Active State Styling:** Rely exclusively on typography and color weight to denote the active tab.
        *   **Inactive:** Text Color `[SECONDARY_TEXT_COLOR]`, Font Weight `400`.
        *   **Active:** Text Color `[PRIMARY_BRAND_COLOR]`, Font Weight `600` (Semi-Bold).
    *   **Hover State (PC):** Add a subtle background highlight `[HOVER_BACKGROUND_COLOR]` with `8px` border-radius on hover, removing the need for persistent indicators.

### 1.3 Global Header Simplification
*   **Problem:** Section headers (Back Icon + Title + Subtext) create unnecessary visual noise and consume vertical space.
*   **Recommendation:**
    *   **Removal:** Eliminate the dedicated header bar component from all sub-views (Teacher Profiles, Settings, etc.).
    *   **Navigation Pattern:**
        *   **Mobile:** Rely entirely on the native OS "Swipe Back" gesture.
        *   **PC:** If a back control is strictly necessary for discoverability, use a floating, transparent button in the top-left corner containing only a `[CHEVRON_LEFT_ICON]` without accompanying text.
    *   **Context:** Ensure the content immediately below clearly indicates the current context (e.g., the Teacher Name is the first H1 element of the body).

---

## 2. Voice Interaction & Notifications

### 2.1 Mic Button Workflow
*   **Problem:** Tapping the mic button forces a disruptive full-page navigation to a search/voice interface.
*   **Recommendation:**
    *   **Interaction Model:** Shift from "Page Navigation" to "Contextual Overlay."
    *   **UI Component:** Implement a **Bottom Sheet Modal** (Mobile) or a **Centered Floating Card** (PC).
        *   **Visuals:** The modal should contain the `[MICROPHONE_ICON]` in the center, surrounded by a dynamic voice waveform animation using `[BRAND_ACCENT_COLOR]`.
        *   **Content:** Display search results or notification text *within* this overlay.
    *   **Empty State:** If no voice input is detected or no notifications exist, display a concise message: *"No new notifications"* centered in the modal, rather than rendering an empty list container.
    *   **Dismissal:** Tapping outside the modal or swiping down (mobile) closes the interaction instantly.

---

## 3. Teacher Profile Experience (PC & Mobile)

### 3.1 Loading States (Skeleton Screens)
*   **Problem:** Users face a blank screen or spinner while teacher profile data loads.
*   **Recommendation:**
    *   **Implementation:** Replace spinners with a **Skeleton Layout** that mirrors the final content structure.
    *   **Components:**
        *   **Avatar:** Circular placeholder `[SKELETON_GRAY_LIGHT]` (approx. `120x120px`).
        *   **Text Lines:** Rectangular pulses for Name (width `60%`), Title (width `40%`), and Bio (3 lines of varying lengths).
        *   **Cards:** Rounded rectangles for the "Playcard" and "Experience" sections.
    *   **Animation:** Apply a subtle shimmer effect moving left-to-right over `1.5s` infinite loop.

### 3.2 Profile Entry Animation (PC Only)
*   **Problem:** Accessing a teacher profile on PC feels abrupt and lacks polish.
*   **Recommendation:**
    *   **Trigger:** When a user clicks a teacher card on the dashboard.
    *   **Animation Sequence:**
        1.  **Fade In:** Opacity `0` → `1` over `300ms`.
        2.  **Scale Up:** Transform `scale(0.95)` → `scale(1.0)` over `300ms` with `cubic-bezier(0.16, 1, 0.3, 1)` easing.
    *   **Effect:** This creates a sense of depth and focus, guiding the user into the detailed view.

### 3.3 Teacher Playcard Interactions
*   **Problem:** The playcard section restricts scrolling direction, limiting content exploration.
*   **Recommendation:**
    *   **Dual-Axis Scrolling:**
        *   **Horizontal (X-Axis):** Enable swipe/scroll to navigate between *different* playcards (e.g., Course A, Course B). Use a snap-scroll behavior to align cards centrally.
        *   **Vertical (Y-Axis):** Allow standard vertical scroll *within* the active playcard if the content height exceeds the card container.
    *   **Conflict Resolution:** Implement touch-event handling where horizontal swipes take precedence initially; once a threshold is met, lock to horizontal. If the user pauses or taps, vertical scrolling within the card becomes active.

### 3.4 Playcard Data Visualization
*   **Problem:** The graph within the playcard uses a blue color that clashes with the new design language.
*   **Recommendation:**
    *   **Color Palette Update:**
        *   **Primary Data Line/Area:** Replace Blue with `[LIGHT_GREEN_HEX_CODE]` (e.g., `#4ADE80`).
        *   **Gradient Fill:** Fade from `[LIGHT_GREEN_HEX_CODE]` at 40% opacity to transparent white (`#FFFFFF`) at the bottom.
        *   **Grid Lines/Axis:** Use pure White `[#FFFFFF]` at 20% opacity for contrast against the card background.
    *   **Contrast Check:** Ensure the green meets WCAG AA standards against the card's background color.

---

## 4. Mobile Profile Architecture (Instagram-Inspired)

### 4.1 Profile Picture (PFP) Interaction
*   **Problem:** Users cannot inspect the profile picture in detail.
*   **Recommendation:**
    *   **Gesture:** On tap, open a **Full-Screen Lightbox**.
    *   **Functionality:**
        *   Image fills the viewport (`object-fit: contain`).
        *   Background dims to black (`#000000` at 90% opacity).
        *   Enable pinch-to-zoom and pan gestures.
        *   Tap again or swipe down to close.

### 4.2 Metrics Layout (Followers/Videos)
*   **Problem:** Follower and video counts are fragmented vertically.
*   **Recommendation:**
    *   **Layout:** Align all metrics into a single **Horizontal Flex Row** directly below the bio/about section.
    *   **Structure:** `[Total Videos] • [Followers] • [Rating]`
    *   **Styling:** Bold numbers (`Font-Weight: 700`) with lighter labels (`Font-Size: 12px`, `Color: [SECONDARY_TEXT]`) underneath or beside them, separated by subtle dividers or spacing.

### 4.3 Experience Section (LinkedIn Style)
*   **Problem:** The experience timeline lacks professional structure.
*   **Recommendation:**
    *   **Format:** Vertical timeline list.
    *   **Card Structure per Entry:**
        *   **Header:** Job Title (Bold) + Company Name.
        *   **Sub-header:** Date Range (e.g., "Jan 2020 – Present") aligned right or below in secondary text.
        *   **Body:** Concise bullet points or short paragraph describing achievements.
        *   **Visual:** A thin vertical line connecting entries to visualize continuity.

### 4.4 Live Sessions Consolidation
*   **Problem:** Live sessions are scattered or hard to scan.
*   **Recommendation:**
    *   **Layout:** Horizontal Scroll Container (Carousel).
    *   **Card Design:** Each session is a compact card showing:
        *   Thumbnail Image.
        *   "LIVE" badge in `[RED_ACCENT_COLOR]`.
        *   Start Time and Topic Title.
    *   **Goal:** Allow users to quickly swipe through upcoming or active sessions without leaving the profile flow.

### 4.5 "About" Section (Wikipedia Style)
*   **Problem:** Teacher information is unstructured and difficult to parse.
*   **Recommendation:**
    *   **Structure:** Create a unified **"About"** module resembling a structured summary.
    *   **Sections:**
        *   **Intro:** A 2-sentence high-level summary.
        *   **Key Stats Grid:** 2x2 grid for Qualifications, Years Exp, Students Taught, Languages.
        *   **Background:** Collapsible accordion for detailed education and certification history.
    *   **Typography:** Use clear hierarchy (H2 for section titles, Body for details) with ample whitespace (`24px` padding) to mimic a clean encyclopedia entry.

---

## 5. Implementation Notes for Engineering
*   **Icons:** Replace all hardcoded SVGs with the designated `[ICON_NAME]` components from the design system library.
*   **Colors:** Ensure all hex codes referenced (e.g., `[LIGHT_GREEN_HEX_CODE]`) are added to the global Tailwind/MUI theme configuration file before implementation.
*   **Responsiveness:** All "Mobile" recommendations must gracefully degrade or adapt to a tablet view if the breakpoint falls between mobile and desktop definitions.
