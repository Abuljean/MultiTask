# OS-integration findings (overnight 2026-07-16/17)

Working notes from the widget/quick-action/calendar session, so the next
session starts warm. What actually shipped is in
`docs/OVERNIGHT-REPORT-os-integration.md`; this file is the research residue.

## @bacons/apple-targets (the widget tooling)

- Version installed: ^4.0.7. Requires Expo SDK 53+, CocoaPods 1.16.2, Xcode 16
  on the build host (EAS images satisfy this).
- Target lives in `targets/widgets/` — `expo-target.config.js` (type
  `widget`), `Info.plist` (only NSExtensionPointIdentifier =
  `com.apple.widgetkit-extension`), Swift files at the target root (the
  plugin globs them). `bundleIdentifier: '.widgets'` = appended to the main
  app id → `com.abuljean.multitask.widgets`.
- Codesigning of extra targets is "theoretically handled entirely by EAS
  Build" per the README; the plugin injects the target entitlements. The
  Apple **Team ID is 942W32N3DA** (extracted from the previous build's
  embedded.mobileprovision — `ios.appleTeamId` in app.json now carries it;
  the plugin needs it to set DEVELOPMENT_TEAM on the target).
- App Group `group.com.abuljean.multitask` is declared BOTH in
  `ios.entitlements` (main app) and the target config. EAS regenerates
  provisioning profiles with the App Group capability on the next build —
  if the iOS build fails on provisioning, the fix is usually re-running
  credentials sync (eas build asks) rather than code.
- `ExtensionStorage` (JS) proxies `UserDefaults(suiteName:)`:
  `set/get/remove` + static `reloadWidget()` / `reloadControls()`. It's a
  native module — a build without it CRASHES on import, hence the guarded
  gateway (`lib/widgets/system.ts`).

## Data bridge design (as built)

- JS writes `widget.snapshot` (JSON string) into the App Group on every task
  change (debounced) + app-background. Builder is pure and tested
  (`lib/widgets/snapshot-data.ts`): today's open tasks + all overdue,
  overdue first, next-task fallback, ready-to-render labels — Swift decodes
  and renders, zero logic.
- Widget check-off: `CompleteTaskIntent` (AppIntent, iOS 17) appends the task
  id to `widget.pendingCompletions` ([Int] in the App Group) and reloads
  timelines; the app drains the queue on foreground through
  `useSetTaskCompleted` (optimistic path). True from-widget DB writes
  (App Intent → PowerSync in the extension process) are v2 — would need the
  extension to open its own PowerSync/SQLite handle; do NOT share the app's
  db file across processes casually.

## App Intents / Siri (NOT implemented — next session)

- The same AppIntents framework used for the widget button is the substrate
  for Siri phrases ("add a task"): an `AppShortcutsProvider` in the WIDGET
  target (or a dedicated app-intents extension) with `AppShortcut(intent:…,
  phrases: […])`. Intent schemas (WWDC26 natural-language actions) layer on
  top — worth verifying Xcode 16 SDK support on EAS images when built.
- Task CREATION via Siri needs the intent to write somewhere the app reads:
  same App Group queue pattern works (`widget.pendingCreations`), consumed on
  next foreground; instant creation without opening the app needs the v2
  extension-side DB story.
- Spotlight indexing (CoreSpotlight) is an APP-side feature (no extension
  needed): index task titles with `CSSearchableItem`, deep-link attribute =
  `multitask:///task/{id}`. Cheap win for a future JS+small-module session —
  no Expo config plugin exists in the ecosystem that covers it well; likely a
  ~40-line local Expo Module.
- Control Center control (iOS 18 ControlWidget): same widget extension can
  host it — add a `ControlWidget` struct; bundle with the next widget
  iteration.

## expo-quick-actions

- SDK-54 pairing is **6.0.0 exactly** (6.0.2 targets SDK 56 — the README has
  a version table; `npx expo install` does NOT know this package).
- The package throws at JS **import time** when the native module is missing
  (requireNativeModule at module scope) — the gateway
  (`lib/quick-actions/system.ts`) dynamic-imports even the router wiring.
  Never add a static import of it anywhere.
- Static iOS action via the config plugin (`iosActions`); Android gets its
  shortcuts from the runtime `setItems` call (same gateway).

## expo-calendar

- SDK 54 version ~15.0.8 via `npx expo install`. iOS 17 split permissions:
  we ship `NSCalendarsFullAccessUsageDescription` (infoPlist) + the config
  plugin's `calendarPermission` (legacy key). Android permissions come from
  the plugin (READ/WRITE_CALENDAR).
- `createCalendarAsync` on iOS needs a `source` — we use the default
  calendar's source (iCloud when present → cross-device sync of the events),
  local-account fallback. On Android: `isLocalAccount` + `ownerAccount:
  'personal'` + `accessLevel: OWNER`.
- The reconciler is a true upsert keyed on the `multitask:{id}` notes marker;
  sweep window ±1 year so events whose tasks moved beyond the 90-day plan
  window still get cleaned up.

## Verification infrastructure notes

- Android emulator: AVD `audit` (memory note `android-emulator-on-machine`
  has the full recipe). The OLD installed APK lacks tonight's native modules
  — WP1 calendar E2E needs the NEW APK (build d583253f… finished green;
  download link in the report).
- iOS: no local verification possible on Windows — EAS compile green is the
  scaffold's acceptance bar; on-device iteration (widget visuals, lock-screen
  families, permission prompts) is the developer's morning task.
