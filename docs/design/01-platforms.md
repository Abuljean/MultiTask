# Platforms — iOS, Android, Desktop, Web

> How to make each platform feel native without shattering visual consistency. When two platforms disagree, this file names the winner. Consulted by Claude Code whenever a decision is platform-specific.

## The overarching rule
**Shared identity, native interactions.** Colors, typography, spacing, and the status-color system stay identical across platforms — that's the brand. Navigation patterns, gestures, back behavior, and platform primitives adopt each platform's conventions (Jakob's Law: users expect your app to work like other apps on their device). Do not build one cross-platform behavior and force it everywhere — that's the fastest way to make the app feel wrong on every platform.

Authoritative references (consult these when in doubt, don't just guess):
- **iOS** — Apple Human Interface Guidelines (`developer.apple.com/design/human-interface-guidelines`)
- **Android** — Material Design 3 (`m3.material.io`)
- **Desktop (macOS)** — HIG macOS section
- **Desktop (Windows)** — Microsoft Fluent (`fluent2.microsoft.design`)
- **Web** — USWDS and GOV.UK for accessibility baseline; your own component library for style

## iOS conventions (required)

- **Navigation:** large title on the top-level screen (task list, Today), collapses to a compact title on scroll. Back-swipe from the left edge always works on pushed screens. Use `react-native-screens` + native stack navigator so these come for free.
- **Tab bar:** bottom tab bar with SF Symbols (Today / Calendar / Widgets or similar 3–5 tabs). Selected tab uses the accent color; unselected uses secondary text color.
- **Modals:** sheets with a grabber handle, dismissible by swipe-down. Use `presentationStyle="pageSheet"` (or React Native's `Modal` with equivalent styling). Full-screen modals only for immersive tasks.
- **Icons:** SF Symbols. Do not mix in emoji or ad-hoc icons on iOS.
- **Haptics:** `expo-haptics` — light impact on tap, medium on completion, notification-success on task completion. Restraint: never haptic for scrolling, hovering, or focus.
- **Typography:** SF Pro (system font, no import needed). Use dynamic type sizes and respect the user's OS-level text size preference.
- **Safe areas:** always use `useSafeAreaInsets()` — never hardcode padding for notches or home indicators.
- **Widgets & lock-screen widgets:** built with WidgetKit in Swift (Mac access required; see roadmap Stage 4). Widget design carries the app's status-color language.

## Android conventions (required)

- **Navigation:** Material 3 patterns. Bottom navigation bar for 3–5 top-level destinations (same tabs as iOS, mirrored). Support the system back gesture and hardware back button — every screen must handle back cleanly.
- **Top app bar:** M3 top app bar with the screen title. Scroll behavior collapses it on long content.
- **FAB (floating action button):** the quick-add "+" is a Material FAB, bottom-right (or bottom-center on M3 designs). This is Android's expected pattern for a primary create action — don't invent something else.
- **Modals:** bottom sheets for quick actions (quick-add, share). Full-screen dialogs for anything with multiple fields.
- **Icons:** Material Symbols. Mirror the iOS icon set semantically (same concept → same icon), just from the Android library.
- **Haptics:** subtle. Android's default haptic feedback is more restrained than iOS; match that.
- **Typography:** Roboto (system) or the chosen brand font (see `03-layout-type-color.md`). Respect font-scale accessibility settings.
- **Widgets:** built with Kotlin + Jetpack Glance / RemoteViews. All the same status logic as iOS widgets.

## Desktop conventions (required)

The desktop app is a first-class platform — the developer plans daily use with launch-on-startup. Assume mouse + keyboard + larger screen.

- **Layout:** two- or three-pane layout when the window is wide enough: sidebar (categories/subjects/filters) | task list | detail panel. Collapse to single-pane below a breakpoint (~768px effective width).
- **Keyboard shortcuts (implement these, not optional):**
  - `Cmd/Ctrl+N` — new task (quick-add)
  - `Cmd/Ctrl+K` — command palette / search
  - `Cmd/Ctrl+Enter` — save form
  - `Esc` — close modal / deselect
  - `E` — edit selected task
  - `Space` — toggle complete on selected task
  - `Del` — delete selected task (with undo toast)
  - `J`/`K` or arrow keys — move selection down/up in the list
  - `1`/`2`/`3` — set priority tier on selected task
- **Right-click context menu** on tasks: Edit, Complete, Set priority, Change date, Delete.
- **Multi-select** with Shift-click (range) and Cmd/Ctrl-click (toggle). Enables bulk actions ("delete all completed" gets a shortcut too).
- **Window chrome:** on macOS, respect the traffic-light buttons and native title bar. On Windows, follow Fluent's window conventions.
- **Launch-on-startup:** implemented per platform (macOS Login Items, Windows Startup folder / registry). Off by default; setting in Preferences.

## Web conventions (for the eventual re-skin)

- **Responsive breakpoints:** single-column mobile up to ~640px; two-pane tablet from 640–1024px; full three-pane desktop above 1024px.
- **Keyboard shortcuts:** the same set as desktop, where the browser permits (avoid conflicts with browser shortcuts).
- **URLs are navigation:** every top-level view has a URL (`/today`, `/calendar/2026-05`, `/task/:id`). Deep links work. Browser back/forward work.
- **PWA:** installable, with proper icon and manifest. Offline-first via service worker — the same offline story as native, on web.
- **No web-specific tricks that don't translate.** Hover-only affordances are supplemented with focus / tap equivalents.

## Conflict resolution (when platforms disagree)

Rules for resolving cross-platform conflicts, in priority order:

1. **Accessibility wins.** If one platform's convention is more accessible (e.g. larger tap targets, better focus states), that behavior applies everywhere.
2. **Platform expectation wins for navigation and gestures.** iOS keeps left-edge back-swipe; Android keeps system back. Do not force iOS users onto Android's model or vice versa.
3. **The status-color system wins for visual identity.** Ongoing/urgent/overdue colors and semantics are identical on every surface, regardless of platform conventions.
4. **The stricter density wins for information.** If desktop shows five columns of task detail and mobile shows two, both are correct — but the mobile choice is *what to omit*, not *how to reformat*. Same components, fewer of them.
5. **When in genuine doubt**, propose the two options to the developer with a one-line tradeoff, don't silently pick.

## Anti-patterns (do NOT do these)

- ❌ Building a single "cross-platform" navigation abstraction that behaves the same on iOS and Android. Users notice immediately and it feels wrong on both.
- ❌ Using a hamburger menu on the top-level view when a tab bar / bottom nav is the platform norm.
- ❌ Emoji as functional icons (looks amateur, breaks in system dark modes, no accessibility).
- ❌ Web-style hover-reveal interactions on mobile (there is no hover).
- ❌ Rebuilding platform primitives (date pickers, share sheets, action sheets) yourself when the native ones exist. `@react-native-community/datetimepicker` and expo's share API are there for a reason.
