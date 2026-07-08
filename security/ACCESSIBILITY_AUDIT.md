# Accessibility Audit — BIOVISED Beta

## Target: WCAG 2.2 AA

### Perceivable

| SC | Requirement | Status | Findings | Fix |
|----|-------------|--------|----------|-----|
| 1.1.1 | Non-text Content | ⚠️ Partial | Images have `alt` on user avatars; decorative icons lack `aria-hidden` | Add `aria-hidden="true"` to all `<LucideIcon />` components that are purely decorative |
| 1.2.2 | Captions (Prerecorded) | ✅ N/A | YouTube embeds handle their own captions | — |
| 1.3.1 | Info and Relationships | ⚠️ Partial | Headings use `<h3>`/`<p>` but some sections use `<div>` with class-based styling | Add semantic `<nav>`, `<main>`, `<section>` landmarks |
| 1.4.1 | Use of Color | ⚠️ Partial | Error states use red borders + icons; password strength uses color + text label | Verified dual-indicator pattern |
| 1.4.3 | Contrast (Minimum) | ⚠️ Partial | Dark theme: white (#FFF) on black (#000) = 21:1 ✅; zinc-400 (#A1A1AA) on zinc-950 (#09090B) = ~7:1 ✅; zinc-500 (#71717A) on zinc-950 = ~4.5:1 ✅ | Check all text variants against background |
| 1.4.4 | Resize Text | ❌ Not tested | Need to verify 200% zoom doesn't break layout | Manual zoom test |
| 1.4.10 | Reflow | ⚠️ Partial | Responsive layout with breakpoints; verify no horizontal scroll at 320px | Test at 320px viewport |
| 1.4.12 | Text Spacing | ❌ Not tested | Need to verify with custom spacing overrides | Test with WCAG Text Spacing bookmarklet |

### Operable

| SC | Requirement | Status | Findings | Fix |
|----|-------------|--------|----------|-----|
| 2.1.1 | Keyboard | ❌ Not verified | Modals may not trap focus; search results may not be arrow-navigable | Add focus trap to AuthModal; add arrow-key navigation to search results |
| 2.1.2 | No Keyboard Trap | ⚠️ Partial | No known traps; verify all modals can be closed with Escape | Escape handler exists (`App.tsx:954`) ✅ |
| 2.4.3 | Focus Order | ❌ Not verified | Tab order may not follow visual order in complex layouts | Audit tab order in Header, SearchView, Modals |
| 2.4.4 | Link Purpose (In Context) | ⚠️ Partial | Buttons lack descriptive `aria-label` in some places | Add `aria-label="View teacher profile"` to teacher cards |
| 2.4.7 | Focus Visible | ❌ Not verified | Custom focus styles may be missing | Add `focus-visible:ring-2` to all interactive elements |
| 2.5.3 | Label in Name | ⚠️ Partial | Icons buttons need accessible names | Add `aria-label` to Bell, Profile, Search icon buttons |

### Understandable

| SC | Requirement | Status | Findings | Fix |
|----|-------------|--------|----------|-----|
| 3.2.1 | On Focus | ✅ | No unexpected context changes on focus | Verified |
| 3.2.2 | On Input | ✅ | No automatic form submissions | Verified |
| 3.3.1 | Error Identification | ✅ | Inline errors shown below fields | AuthModal pattern ✅ |
| 3.3.2 | Labels or Instructions | ⚠️ Partial | Labels present on form fields; some select elements lack explicit `<label>` | Add `<label htmlFor>` on all form controls |
| 3.3.3 | Error Suggestion | ✅ | Inline validation provides suggestions | Password checklist, email format ✅ |

### Robust

| SC | Requirement | Status | Findings | Fix |
|----|-------------|--------|----------|-----|
| 4.1.2 | Name, Role, Value | ⚠️ Partial | Custom components (select, modal) need ARIA roles | Add `role="dialog"` on AuthModal, `role="combobox"` on search |
| 4.1.3 | Status Messages | ⚠️ Partial | Loading states use visual indicators but no `aria-live` | Add `aria-live="polite"` to search status area |

### Priority Fixes

| Priority | Issue | File | Fix |
|----------|-------|------|-----|
| P1 | AuthModal lacks focus trap | `AuthModal.tsx` | Add `useFocusTrap` hook — trap focus, restore on close |
| P1 | Icon buttons lack aria-labels | `Header.tsx` | Add `aria-label="Search"`, `aria-label="Notifications"`, `aria-label="Profile"` |
| P2 | No landmark regions | `App.tsx` | Wrap `<Header>` in `<header>`, main content in `<main>`, footer in `<footer>` |
| P2 | Search results not keyboard-navigable | `SearchView.tsx` | Add arrow-up/down handling, `aria-activedescendant` |
| P2 | No reduced-motion support | `App.tsx` | Add `prefers-reduced-motion` media query to disable animations |
| P2 | Focus indicators missing | Global | Add `*:focus-visible { outline: 2px solid white; outline-offset: 2px; }` to CSS |
| P2 | Loading states lack aria-live | `SearchView.tsx` | Add `aria-live="polite"` to result container |
| P2 | AuthModal lacks `role="dialog"` + `aria-modal` | `AuthModal.tsx` | Add `role="dialog" aria-modal="true" aria-label="Sign in"` |
