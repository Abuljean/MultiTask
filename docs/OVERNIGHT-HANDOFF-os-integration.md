# OVERNIGHT HANDOFF — Deep OS-Integration Phase

**Written 2026-07-16 for an autonomous overnight Claude Code session.**
Read `CLAUDE.md` (repo root) FIRST — it is the source of truth for project
state, decisions, and invariants. This document scopes ONE phase: the deep
OS-integration work that Stage 3 (offline sync, verified on-phone 2026-07-15)
unlocked. Everything here assumes that context.

---

## 0. Ground rules (non-negotiable)

1. **Branch discipline:** create `overnight/os-integration` off the latest
   commit of `ui/auth-design-pass` (or off `main` if that branch has been
   merged by the time you start — check `git log`). ALL overnight work goes on
   that one branch. Do NOT push to `main`. Do NOT merge anything. Morning
   review gates the merge (this pattern worked for the audit branch).
2. **Commit per completed slice** with a passing `npm run typecheck` + `npm
   test` before every commit. Never commit red.
3. **Git commit messages: NO double quotes** (PowerShell 5.1 mangles them —
   memory + CLAUDE.md). Use single quotes or here-strings.
4. **Never round-trip source files through PowerShell Get-Content/Set-Content**
   (UTF-8 mojibake). Use the Edit/Write tools.
5. **The developer is asleep.** Anything requiring their body (phone installs,
   Apple 2FA, Supabase dashboard clicks, App Store operations) is OUT. Write
   SQL as numbered `supabase/NN-*.sql` files for them to run — never execute
   SQL against prod yourself.
6. **Do not touch:** Supabase Auth settings (Confirm email stays ON — security
   invariant), `.env`, EAS secrets, the style-pack registry's curation model
   (NO import UI, ever), Expo SDK version, Expo Go on the phone, the deployed
   Vaadin site, Render config.
7. **Do not change** the hand-tuned motion values (`components/swipeable-row*`,
   docs/design/05), the wall-clock date discipline (`lib/tasks/dates.ts` — no
   `toISOString` on due dates), or the dual-mode sync branching
   (`lib/sync/system.ts` pattern). The audit verified these; keep them exact.
8. **RN `<Modal>` is banned** for anything animated (new-arch Reanimated
   no-op) — transparentModal routes only (see `app/quick-add.tsx`;
   `components/input-prompt.tsx` is the one sanctioned static exception).
9. **Web verification = full real-pointer sequence** (hover BEFORE click —
   memory note; two bugs shipped from shortcut clicks). Android verification =
   the emulator (see §5). No console errors tolerated in any verified state.
10. If a work package turns out deeper than specced, **finish and verify fewer
    packages rather than half-do many.** Leave a written stopping-point note.

---

## 1. Where the project stands tonight

- **Stage 3 COMPLETE:** offline-first sync (PowerSync) verified on the
  developer's iPhone dev build — airplane-mode create/complete/edit synced to
  the website both directions. Sync dot: blue = live, red ring = offline.
- **The overnight audit is merged** (94 tests green, 13 suites). Sign-in/up
  design pass done on `ui/auth-design-pass` (auth-form components + validated
  form logic).
- **The phone runs a DEV BUILD** (expo-dev-client) installed 2026-07-15. It
  contains ONLY the native modules in `package.json` as of that build. This is
  the central constraint of your session — see §2.
- **Windows machine.** iOS compiles happen on EAS cloud (works from here,
  credentials are stored — `eas whoami` → abuljean). iOS **installs** need the
  developer. Android has NO physical device — use the local emulator (§5).
- App identity: name **Multitask Manager**, slug `multitask`, bundle/package
  `com.abuljean.multitask`, EAS project `b411fb6a-7315-4b0d-a1f9-daa6a1daacdf`,
  owner `abuljean`, scheme `multitask`.

## 2. THE constraint: new native modules vs. the installed build

Adding any native module (expo-calendar, expo-quick-actions, widget targets…)
means the JS bundle will reference native code **the phone's current build
does not contain**. Handle it exactly like `lib/sync/system.ts` handles
PowerSync:

- **Guard every new native capability behind a lazy `require`/dynamic
  `import()` in ONE gateway file** (e.g. `lib/device-calendar/system.ts`),
  with a capability check that fails soft (feature reports "unavailable"
  instead of crashing). The app must keep RUNNING — tonight's JS changes will
  hot-reload into the developer's EXISTING build tomorrow, and the guarded
  features simply stay dormant until they install the NEW build.
- Config-plugin-only changes (app.json plugins, Info.plist strings) are
  harmless to the running build — they only take effect in the next EAS build.
- **End of session: kick off compile-verification builds** (non-interactive):
  `npx eas build --platform android --profile development --non-interactive --no-wait`
  `npx eas build --platform ios --profile development --non-interactive --no-wait`
  Then poll `npx eas build:list --limit 2 --json --non-interactive` until both
  terminate. A red build = fix and re-kick. The morning checklist (§7) has the
  developer install the green ones.

## 3. Work packages, in priority order

> For every package: verify the library's SDK-54 compatibility against its
> CURRENT docs before installing (`npx expo install <pkg>` pins compatible
> versions). The ecosystem moves fast — do not trust memory.

### WP1 — Device calendar integration (handoff MUST-HAVE)
Tasks appear in the phone's native calendar. Package: **expo-calendar**.

- `lib/device-calendar/system.ts` — the guarded gateway (§2 pattern).
- `lib/device-calendar/sync.ts` — reconcile engine, mirroring
  `lib/notifications.ts`'s cancel-and-reschedule philosophy: an app-owned
  calendar named "Multitask" (create if missing, remember its id in
  AsyncStorage); upsert one event per task with a due date (not completed,
  not deleted, next 90 days); event title = task title, start = due wall-clock
  time, 30-min duration, notes carry a `multitask:{task_id}` marker so ONLY
  our events are ever touched; completed/deleted tasks remove their event.
  Debounced hook `hooks/use-calendar-sync.ts` next to the notification one,
  mounted in the tabs layout, gated by a **Settings toggle** ("Add tasks to my
  calendar", default OFF, stored in auth metadata `calendar_sync_enabled`).
- Permissions: app.json `ios.infoPlist.NSCalendarsFullAccessUsageDescription`
  (iOS 17+ key; include the legacy `NSCalendarsUsageDescription` too) +
  expo-calendar config plugin handles Android `READ/WRITE_CALENDAR`.
- Settings UI: new row under Notifications; when the toggle flips OFF, remove
  all `multitask:` events (leave nothing orphaned).
- **Verify on the Android emulator end-to-end** (Google Calendar app is on the
  AVD): toggle on → grant → events appear; complete a task → event gone;
  toggle off → all events gone. Unit-test the pure planning logic (which tasks
  → which event windows) in jest.

### WP2 — Home-screen Quick Actions + notification actions (speed wins)
- **Quick Actions:** package **expo-quick-actions** (config plugin + JS API).
  One static action: "Quick add" (icon: plus) → deep-link `multitask:///quick-add`
  (router handles the route already; wire via the package's router helper or
  a listener in `app/_layout.tsx`). Android long-press shortcuts come free
  from the same package. Guard per §2.
- **Notification action buttons:** expo-notifications categories — add a
  "Complete" action to the due-soon/urgent notifications
  (`lib/notifications.ts`: set category on schedule; handle the response in
  `hooks/use-notification-navigation.ts` — action `complete` → call the same
  mutation path `use-task-actions` uses, works cold-start too). No new native
  module needed (expo-notifications is already in the build) — this one is
  fully live for the developer TOMORROW without a new install.
- Verify: notification actions on the Android emulator (schedule a 10s test
  through the existing sync path by creating a near-due task); quick action
  presence in the new APK build.

### WP3 — iOS Widgets scaffold (home + lock screen) — compile-verified only
The capstone. Tonight's goal is a BUILDING scaffold, not pixel-perfection —
the developer iterates on-device later.

- Tooling: **@bacons/apple-targets** (Evan Bacon's config plugin for native
  Apple extension targets from CNG). Verify its current README against SDK 54.
  Target: `widgets` (WidgetKit, Swift). App Group: `group.com.abuljean.multitask`
  (declare in the plugin config + main app entitlements; EAS handles the
  provisioning — confirm in build logs).
- **Data bridge:** the app writes a JSON snapshot (today's tasks: id, title,
  due time, status; overdue first — the handoff's widget content rule) to the
  App Group container on every task change + app background. Write it from a
  small hook next to the sync bridge. Use the plugin's `ExtensionStorage`
  helper if present; otherwise a 20-line Expo Module (Swift) that proxies
  `UserDefaults(suiteName:)`. Guard per §2.
- **Widget (Swift):** timeline provider reading the snapshot; families:
  `systemSmall`, `systemMedium`, `accessoryRectangular` (lock screen),
  `accessoryCircular` (count). Static design per docs/design tokens (dark +
  light). Tap → deep link to the task (`multitask:///task/{id}`). Follow
  docs/design/02's widget spec section if present; otherwise: title + due
  time, overdue first, at-a-glance calm.
- **Interactive check-off** (WWDC26 shortlist): an AppIntent in the widget
  that appends the task id to a `pendingCompletions` array in the App Group
  store; the APP consumes that queue on foreground (through the normal
  mutation path). True from-widget DB writes are explicitly v2.
- **Control Center control + Siri App Intents + Spotlight indexing: SKIP
  implementation tonight** unless WP1–3 are done and green — but leave a
  `docs/os-integration-notes.md` with your findings (exact APIs, the
  @bacons/apple-targets target types available, what the SDK-54 story is for
  App Intents from Expo) so the next session starts warm.
- Verify: `npx eas build --platform ios --profile development --non-interactive`
  compiles green with the widget target. That is the acceptance bar. (No
  simulator on Windows; no device access overnight.)

### WP4 — Small fully-verifiable JS wins (fill remaining time, any order)
From the audit's deferred list (`REVIEW-REPORT.md` §Deferred — read it):
- **#13 midnight rollover:** an AppState-resume + minute-tick that re-derives
  "today" on Daily/calendar/list groupings after date change.
- **#14 dropped-op surfacing:** `getDroppedOpCount()` exists in the connector
  — surface a caption in Settings ("n changes couldn't sync and were
  skipped") + a one-time toast when the count grows. Keep it calm, factual.
- **#3 SheetShell extraction:** one shared sheet shell for the 5 transparent
  routes with the 220/280/260 timings as named motion tokens + reduced-motion
  + web-centered-dialog behavior in one place. Pure refactor: zero visual
  change (verify by before/after screenshots on web).
- **#4 shared Chip component** (three geometries today — unify to doc 02).
- Each one: own commit, tests where logic exists, web + emulator spot-check.

## 4. Explicitly OUT of scope tonight
Marketplace/payments; style-pack authoring; web redesign; Vaadin retirement;
iPad/Watch/desktop (docs/design/08 phases); accent-color decision; app icon
(developer is creating it); anything touching real user data or prod SQL
execution; SecureStore token migration (needs on-device verification);
Android Glance widgets (Android-polish phase).

## 5. Verification matrix

| Surface | How |
|---|---|
| Types/logic | `npm run typecheck`, `npm test` (must stay green; add tests for new pure logic) |
| Web | `npx expo start --web --offline --port 8095` → browser-pane checks, real-pointer sequences, zero console errors |
| Android native modules | Local emulator — AVD **`audit`** exists (see memory note `android-emulator-on-machine`): boot recipe, `eas build -p android --profile development --local`? NO — cloud-build the APK, `adb install`, screencap verification |
| iOS native modules | EAS cloud compile green = acceptance; on-device = developer, morning |
| Data layer | jest + the dual-mode parity rule (every new data op branches on `syncDb()` if it touches synced tables — calendar/widget snapshot DON'T; they read the query cache only) |

## 6. End-of-session obligations
1. Kick off both EAS builds (§2) and record outcomes.
2. Update `CLAUDE.md` current-state with what shipped/deferred + decisions.
3. Write `docs/OVERNIGHT-REPORT-os-integration.md`: what was done (per WP),
   what was verified where, what failed and why, exact morning steps, open
   questions for the developer (keep judgment calls OUT of code — list them).
4. Push the branch (`git push -u origin overnight/os-integration`). Do not
   merge, do not touch main, do not deploy.

## 7. Morning checklist (for the developer — the report should repeat this)
1. Read `docs/OVERNIGHT-REPORT-os-integration.md`.
2. Install the new dev builds: expo.dev → builds → latest iOS (phone) +
   Android APK (emulator auto-covered).
3. iOS: expect the calendar permission prompt on first toggle; check the
   Multitask calendar appears in the Calendar app; long-press the app icon →
   Quick add; add the widget to home + lock screen.
4. Review the branch diff; merge when satisfied (website auto-deploys from
   main — the widget/calendar code is native-guarded and web-safe, but eyeball
   the web bundle boots before merging: the report must include this check).
5. Decide the deferred judgment calls listed in the report.

## 8. Reference index
- `CLAUDE.md` — everything. Read top to bottom first.
- `REVIEW-REPORT.md` — the audit's fixed/deferred lists (§Deferred feeds WP4).
- `docs/TaskApp-Master-Handoff.md` + `docs/TaskApp-Native-Roadmap.md` — the
  product spec (widget content rules, calendar MUST, voice ambitions).
- `docs/design/02` (components incl. widget/sync-dot specs), `05` (motion —
  final values, do not touch), `06` (anti-generic), `07` (HIG), `08`
  (multiplatform phases — for what NOT to pull forward).
- `lib/sync/system.ts` — THE guard pattern to copy for new native modules.
- `lib/notifications.ts` — THE reconcile pattern to copy for calendar sync.
- Memory notes: PowerShell quoting, Edit-tool rule, real-pointer verification,
  Android emulator recipe, RN Modal ban, CodeRabbit-via-WSL (do NOT run
  CodeRabbit overnight — it wedged WSL once; leave review to the human loop).
