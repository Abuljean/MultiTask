# Multiplatform Plan — iPad, Android, Apple Watch, Desktop, Web

> Developer decisions captured 2026-07-11 (verbatim intent, refined into build guidance). This is the reference for every platform beyond the iPhone. Read together with `01-platforms.md` (conventions) and `07-apple-hig-reference.md` (per-platform HIG). **All platforms share one Supabase backend and sync through PowerSync — "different devices, all synced, updating when possible" is the architectural invariant.**

## Build order (after Stage 3 sync is verified on iPhone)

1. **iPad** (cheapest: same codebase, layout work)
2. **Android phone** (same codebase; test pass + platform polish)
3. **Desktop (Windows + macOS)** (new shell, big interaction changes)
4. **Web** (the replacement for the old Vaadin site; shares the desktop design)
5. **Apple Watch** (Swift; needs Mac access; after widgets exist, since both are WidgetKit-adjacent)
6. Widgets remain the capstone of phone work per the roadmap and slot in before/alongside Watch.

---

## iPad

**Developer intent:** "more or less the same characteristics as the iPhone, but everything scaled properly."

- Same app, same navigation, same gestures. NOT a stretched phone layout:
  - ≥ ~700pt width: task list becomes **two-pane** (list left, tapped task's edit form docked right instead of a bottom sheet). Calendar gets wider day cells and can show month + day page side by side.
  - Quick-add stays a sheet but max-width ~520pt, centered.
  - Respect `01-platforms.md` iPad guidance: size classes, Split View/multitasking-safe layouts, pointer hover states (trackpad), keyboard shortcuts (same set as desktop below).
- Tab bar may render as a sidebar on wide layouts (expo-router/native tabs handle this; don't hand-roll).
- Effort: layout-only. All logic, sync, and components carry over.

## Android

**Developer intent:** "pretty much the same with the same characteristics; widgets etc. if possible, otherwise not at all."

- The entire codebase already runs on Android (Expo). Work = a real test pass + platform polish:
  - Material icons already mapped (`icon-symbol.tsx`); verify every screen.
  - System back must exit sheets/routes correctly (transparentModal routes: verify hardware back pops them; add `BackHandler` handling where missing).
  - The iOS-only `Alert.prompt` flows in Settings need Android equivalents (small input dialogs — build a tiny prompt sheet component).
  - Search-bar overscroll reveal doesn't exist on Android (no negative offset): magnifier button is already the path; consider SwipeRefresh conflicts.
  - Notifications: channel already configured; test scheduling.
- **Android widgets: POSSIBLE and planned** (Kotlin + Jetpack Glance, buildable entirely on Windows). Same content rules as iOS widgets (today's tasks, overdue first). Build them in the same phase as iOS widgets.
- Dev build for Android needs no paid account (EAS or local); can even precede the iOS widget work.

## Apple Watch

**Developer intent:** a small task manager — NO task creation, NO search. Completion + deletion of tasks; view dailies; view tasks; calendar reduced to essentially a day view. Usability over gesture-cleverness. Controls left to the builder.

**Builder decisions (following watchOS HIG — glanceable, 2–10 second sessions):**
- **Technology:** native Swift/SwiftUI watch app target (added via config plugin / Xcode target). Data via the **PowerSync Swift SDK** with the same sync rules — the watch is a first-class synced client, works offline, no phone-relay protocol needed. Auth: session handoff from the phone once (WatchConnectivity) or Sign-in on phone → token share.
- **Structure (vertical pages or a short root list):**
  1. **Today** (root): dailies as large check rows + today's due tasks, overdue first. This is 90% of watch usage.
  2. **Tasks**: upcoming list, next 7 days.
  3. **Day view**: today's schedule (events + tasks in time order). No month grid — cells would be unusable at watch size (developer suspected as much; confirmed).
- **Controls:**
  - **Digital Crown scrolls all lists** (with haptic detents) — the primary navigation.
  - **Tap a task = complete/uncomplete** (whole row is the target; large rows ≥ 44pt, generous type). This is the highest-frequency action, so it gets the cheapest gesture.
  - **Long-press = delete** (into the same trash as everywhere else; a brief "Deleted — tap to undo" state on the row replaces the toast).
  - **Swipe-to-complete intentionally NOT used on watch** — at watch sizes swipes misfire and fight the Crown; per developer's "prioritize usability," taps win.
  - Side button / gestures: system defaults, no custom bindings.
- **Complications + Smart Stack widget**: next task title + overdue count — often the only "app" people use on watch; ship with the app.
- Status colors carry over (the sacred four); text = SF Compact, mono accent dropped (too small to matter).

## Desktop — Windows + macOS ("Mac and pc: the same app")

**Developer decisions:**
- **Task creation is a WINDOW, not a bottom sheet** — a centered modal window/dialog with ALL fields visible at once (no collapsed Details section on desktop).
- **Hover replaces swipe:** hovering the LEFT or RIGHT edge zone of a task card reveals the action (check / trash / undo icons) and the card slides aside to expose it — the same visual language as the mobile trail, driven by hover. **Clicking the revealed action commits it** (to completed/trash/active, same rules as mobile, same undo toasts).
- **Fill the big screen:** navigation menu docks to the **right side** (developer preference — note: this is a deliberate deviation from the typical left sidebar; revisit after first build if it fights muscle memory), content scales up but "not too large" — density stays a feature.
- Keyboard shortcuts: the full set already specified in `01-platforms.md` (Cmd/Ctrl+N quick-add window, Space complete, Del delete, J/K navigation, / search, 1/2/3 priority...). Right-click context menus on cards. Multi-select with Shift/Ctrl-click.
- **Launch-on-startup** setting (handoff MUST): implement per-OS (Login Items / registry Run key), off by default.
- **Technology decision:** build desktop from the **web export wrapped in Tauri** (small, fast, auto-update-friendly) rather than react-native-windows/macos (heavy, separate native trees). One codebase: React Native components already run on web via react-native-web; PowerSync has a web SDK (wa-sqlite) so offline + sync work identically. Electron is fallback if Tauri fights RN-web.
- Sync-state indicator (docs/design/02) becomes visible chrome on desktop (top-right dot).

## Web

**Developer decision:** the old Vaadin site's design is retired; the web version = the same app as desktop (minus launch-on-startup), optional for people who prefer a browser.

- Same Tauri-less web build, deployed (e.g. Vercel/Netlify) at the existing domain eventually.
- URLs per `01-platforms.md` (`/today`, `/calendar/2026-05`, `/task/:id`), PWA installable, offline via PowerSync web.
- The Vaadin app keeps running until this replaces it (phasing rule in CLAUDE.md stands). Migration note: web users sign in with Supabase Auth accounts (same as native); the old Java auth retires with the old site.

## Cross-platform invariants (do not fork these)

- One design system: tokens, status colors, type scale, motion vocabulary — identical everywhere; only PRESENTATION adapts.
- One sync layer: PowerSync everywhere (RN, web/desktop, Swift watch). No bespoke sync paths.
- Title + due date always visible; one primary action per screen; undo over confirmation; reduced-motion respected — on every platform.
- Style packs (docs/design/09) apply cross-platform: a pack ships assets for all surfaces it customizes; platforms ignore sections they don't render.
