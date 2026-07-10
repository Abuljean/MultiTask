# TaskApp → Native App: Full Build Roadmap

**Goal:** A cross-platform native app (iOS + Android, with desktop possible later) that works **offline-first**, syncs to your existing Supabase database, and has **deep OS integration** (home screen widgets, calendar/reminders, share-sheet). Your existing web app stays as-is and shares the same Supabase database.

**Chosen architecture (decided):**
- **Framework:** React Native via **Expo** (managed workflow + config plugins)
- **Backend:** **Direct-to-Supabase** with Row Level Security (no Java server in the data path)
- **Offline:** Local-first with a sync engine

> A note on honesty up front: this is a months-long, evenings-and-weekends project, and it's a real step up from web development. That's the point — you'll come out understanding mobile dev, offline sync, database security, and native platform code. Widgets are the single hardest piece and come last. Don't rush to them.

---

## The big picture (how the pieces fit)

```
┌─────────────────────────────────────────────┐
│  Your React Native app (Expo)               │
│                                             │
│  UI (React components)                      │
│      ↕                                      │
│  Local SQLite database  ← reads/writes here │
│      ↕  (sync engine, when online)          │
└──────────────┼──────────────────────────────┘
               ↕
┌──────────────┼──────────────────────────────┐
│  Supabase                                   │
│   - Postgres database (shared with web app) │
│   - Auth (login, tokens, verification)      │
│   - Row Level Security (per-user access)    │
└─────────────────────────────────────────────┘
               ↕
┌─────────────────────────────────────────────┐
│  Your existing Vaadin web app (unchanged)   │
└─────────────────────────────────────────────┘
```

The key mental shift from your web app: **the app reads and writes a local database first**, and a sync engine reconciles that with Supabase in the background. Network is a background concern, not a prerequisite. That's what makes offline work.

---

## What you need before you start (prerequisites)

**Hardware / accounts:**
- **You can build this on Windows** — see the "Developing on Windows (no Mac)" section below. You do *not* need to own a Mac to start, and most of the project never needs one. The one real gap is iOS widget development (Stage 4). Android needs no Mac ever.
- **Apple Developer account** ($99/year) — required to put an app on a real iPhone and the App Store, and required for some entitlements (App Groups) that widgets need.
- **Google Play Developer account** ($25 one-time) — for Android distribution.
- A **physical phone** (iOS and/or Android) for testing — widgets and deep integration can't be fully tested in simulators, and on Windows a real iPhone replaces the (Mac-only) iOS simulator.

**Software:**
- Node.js (LTS version), npm
- Expo CLI (installed per-project, not global, in modern Expo)
- Android Studio (any OS, for the Android emulator) — Xcode is Mac-only and only needed for local iOS work
- A code editor (VS Code is the standard for React Native)

---

## Developing on Windows (no Mac)

You can do roughly **80–90% of this project on Windows.** Here's the honest breakdown of what works, what's worked-around, and the one real gap.

**Works natively on Windows (no Mac needed):**
- All code writing (JS/TypeScript, VS Code)
- The entire Android side — Android Studio, emulator, builds, even Android widgets (Kotlin runs on Windows)
- Day-to-day testing on a **real iPhone** via Expo Go / a dev build (scan QR, app loads on your phone)
- **Building the iOS app** via **EAS Build** — Expo compiles iOS in the cloud on Apple machines, hands you back an installable app. This is the key workaround that makes iOS-from-Windows viable.
- **Submitting to the App Store** via **EAS Submit** (cloud-based, no Mac-only Transporter needed)

**Worked around (mild annoyance):**
- *iOS Simulator* is macOS-only. **Workaround:** test on a real iPhone, which you'll do anyway for deep-integration features. Slightly less convenient than a simulator; entirely workable.

**The one genuine gap — iOS widgets (Stage 4):**
- iOS widgets are written in **Swift** and really want **Xcode's widget preview canvas** (macOS-only) to iterate without pain. Building a widget you can't preview, by pushing a full cloud build for every visual tweak, is slow.
- **Options when you reach this stage (months away):**
  1. **Borrow Mac access occasionally** — you don't need to own one, just have access during the widget stretch (a friend's/school's/library Mac for a few sessions).
  2. **Rent a cloud Mac** (MacinCloud, MacStadium, AWS EC2 Mac) by the hour/month, only during the widget stage.
  3. **Do Android widgets first/only** on Windows (Kotlin + Android Studio), and batch the iOS widget for whenever you get Mac access.
  4. **Buy a cheap used Mac Mini** if this becomes a serious long-term hobby — the "real" solution, but unnecessary to start.

**Bottom line:** start on Windows now; don't let the Mac question block you. By the time you reach Stage 4 widgets you'll know if the project has legs, and can decide then. Don't buy a Mac for a project you haven't started.



**Skills to pick up along the way (in rough order):**
1. JavaScript/TypeScript fundamentals (you're partway there from web work)
2. React (components, hooks, state) — the foundation of React Native
3. React Native specifics (its components differ from web HTML)
4. SQL / Row Level Security (you know SQL; RLS is the new bit)
5. A little Swift + Kotlin — **only** for the widget stage

---

## Stage 0 — Learn the foundations (before touching TaskApp)

Don't start by rebuilding TaskApp. Start by getting comfortable, or you'll fight the framework and your app at the same time.

**0.1 — React (if you're not solid on it yet).** Build one or two tiny React web apps first. Understand components, `useState`, `useEffect`, props, and lists. This transfers directly to React Native.

**0.2 — React Native basics.** Do Expo's official tutorial (a small app, start to finish). You'll learn that React Native uses `<View>` instead of `<div>`, `<Text>` instead of `<p>`, `StyleSheet` instead of CSS, and Flexbox for layout (similar to web, slightly different defaults).

**0.3 — Spin up a throwaway Expo project** and run it on your real phone via the Expo Go app (scan a QR code, app loads instantly). This proves your environment works before you commit to the real build.

**Milestone:** you can create an Expo app, run it on your phone, and modify a screen with live reload. Don't move on until this feels routine.

---

## Stage 1 — Secure the database with Row Level Security

This is the foundation of the "direct-to-Supabase" model: **the database itself enforces that users only touch their own data.** Do this before the app can read/write anything, so you're never running insecurely.

**1.1 — Understand the auth shift.** Your web app currently does auth in Java. In this model, **Supabase Auth** handles login, tokens, and email verification. Each logged-in user gets an ID available in SQL as `auth.uid()`. You'll likely migrate to Supabase Auth for the native app (the web app can keep its own auth, or also migrate later — decide that separately).

**1.2 — Make sure each table has a `user_id` column** that matches the Supabase Auth user ID (a UUID). Your current tables key users differently (your Java `ApplicationUser`), so there's a migration consideration here — plan how existing rows map to Supabase Auth user IDs. **This is the trickiest data-migration question; think it through before running anything.**

**1.3 — Turn on RLS and write the policies.** For each table (starting with `tasks`):

```sql
-- Lock the table: nothing allowed until a policy grants it
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can read only their own tasks
CREATE POLICY "read own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert tasks only as themselves
CREATE POLICY "insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update only their own tasks
CREATE POLICY "update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete only their own tasks
CREATE POLICY "delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);
```

**1.4 — Test the wall.** In the Supabase SQL editor, impersonate a user and confirm you can only see their rows. **Never write a policy with `USING (true)`** unless you truly mean "everyone" — that's the one catastrophic mistake.

**1.5 — Confirm you use the ANON (public) key in the app, never the service_role key.** The anon key is safe in client code *because* RLS protects the data. The service_role key bypasses RLS and must never ship in an app.

**Milestone:** RLS is on, policies are tested, and you've confirmed the app will use the anon key. The database is safe to talk to directly.

---

## Stage 2 — Build the core React Native app (online-only first)

Build the app talking to Supabase directly **online-only** first. Add offline in Stage 3. Doing both at once is how people get lost.

**2.1 — Create the real project:**
```
npx create-expo-app taskapp-native
```
Modern Expo uses **Continuous Native Generation (CNG)** — no `ios/`/`android/` folders to manage; they're generated from config. This is what lets you add native features (widgets) later via config plugins without manual Xcode wrangling.

**2.2 — Add Supabase:**
```
npx expo install @supabase/supabase-js
```
Set up the Supabase client with your project URL and **anon key**. Wire up Supabase Auth (login/signup screens).

**2.3 — Rebuild your task UI in React Native.** This is the bulk of the work. Your Vaadin Flow UI does **not** transfer — you rebuild the screens as React Native components: the task list, the create/edit form, the calendar view, settings. Recommended libraries:
- **Navigation:** Expo Router (file-based routing, built in)
- **State/data fetching:** TanStack Query is the common choice
- **Lists:** FlashList (fast scrolling for long task lists)

**2.4 — Reconnect your business logic.** Logic that lived in Java now lives in the app or as Postgres functions:
- Urgency / overdue / "is it past due" → compute in JS in the app (you have the logic already, just port it)
- Timezone handling → port your wall-clock approach to JS
- Priority sorting → port the comparators
- Email verification, password reset → **Supabase Auth gives these for free** (big win — you may delete a lot of your Java verification code)

**Milestone:** the app, online, can log in and do full task CRUD against Supabase, with RLS keeping users separate. It's a real app at this point — just not offline yet.

---

## Stage 3 — Make it offline-first (the sync engine)

Now the payoff feature. The app reads/writes a **local SQLite database**, and a sync engine keeps it in step with Supabase. You have two realistic options; pick one.

### Option A — PowerSync (managed, recommended for less pain)
- **What it is:** a service that syncs Supabase Postgres ↔ local SQLite automatically. Reads/writes hit local SQLite; writes queue and upload when online.
- **Pros:** batteries-included, integrates with Supabase Auth, handles the hard sync mechanics, "sync rules" mirror your RLS. Least DIY sync code.
- **Cons:** another service to configure; a free tier exists but it's a third party; some Postgres WAL config needed for hobby projects.
- **Best if:** you want offline to *just work* and not hand-build sync.

### Option B — WatermelonDB (open-source, more DIY, more learning)
- **What it is:** an observable SQLite-based local database for React Native with a sync protocol you wire to Supabase yourself (via RPC + Realtime).
- **Pros:** free, open-source, no extra service, very educational, great for reactive UIs.
- **Cons:** **you build and maintain the sync backend functions yourself** (push/pull, timestamp conversion), and you maintain the schema in two places (local + Supabase). More work, more to keep in sync.
- **Best if:** you want to learn how sync actually works and don't mind the extra plumbing.

**Conflict resolution:** both default to "last write wins" (the most recent edit to a row wins). That's fine for a personal task app. Only reach for CRDTs if you later add real-time collaboration — you almost certainly won't need to.

**Note:** offline sync libraries use native modules, so from here you need an **Expo dev build** (via EAS Build), not Expo Go. This is a normal step up; Expo documents it.

**Milestone:** turn on airplane mode, create/edit/complete tasks, turn it back on, and watch them sync to Supabase (and appear in your web app). That's true offline-first.

---

## Stage 4 — Deep OS integration (your three features)

Each of these is its own mini-project. They're independent — do them in any order, one at a time. **Two of the three are plugin-based and moderate; widgets are the hard one.**

### 4.1 — Calendar / Reminders integration (moderate)
- Use `expo-calendar` to read/write the device calendar and reminders.
- Use case: "add this task's due date to my phone calendar," or surface device reminders.
- Mostly JavaScript + a permissions prompt. Well-documented. Start here — it's the gentlest of the three.

### 4.2 — Share-sheet (moderate)
- Two directions: **sharing *from* your app** (easy, `expo-sharing`) and **receiving shares *into* your app** (e.g. share text from another app → create a task). Receiving is the more involved one; it needs share-extension config.
- Plugin-based with some native config. Moderate.

### 4.3 — Home screen widgets (HARD — save for last)
Be clear-eyed: **widgets require native code regardless of framework.** The widget UI itself is written in **Swift (iOS, via WidgetKit/SwiftUI)** and the Android equivalent. Expo's config-plugin system (and the official **`expo-widgets`** module, plus community plugins like `react-native-widget-extension` and `react-native-android-widget`) handles the *plumbing* — generating the widget target, wiring App Groups — so you don't hand-edit Xcode projects. But you still write the widget's appearance in native code.

**How data gets to the widget:** your RN app writes the data (e.g. "next 3 tasks") into a shared container (an **App Group** on iOS), and the native widget reads from it. So the flow is: app → shared storage → widget reads + renders.

**Realistic expectation:** this stage alone can take as long as a chunk of the rest of the app, because it's your first contact with Swift/Kotlin and platform-specific concepts (timelines, App Groups, widget refresh budgets). Budget patience. It's also genuinely the most impressive result, so it's a satisfying capstone.

**Milestone:** a real TaskApp widget on your home screen showing your next due tasks, updating as you change them in the app.

---

## Stage 5 — Polish, build, and ship

**5.1 — App icons and splash screen** (Expo config).

**5.2 — Real device testing** across a few iOS and Android devices/versions. Widgets and integrations especially need real-device testing.

**5.3 — Build for production with EAS Build** (Expo's cloud build service — compiles iOS even without a Mac, handles signing, which is otherwise notoriously fiddly).

**5.4 — App Store + Play Store submission.** Each has review processes, metadata, screenshots, privacy declarations. Expo has guides; Apple review is stricter and slower than Google's. Budget a couple of weeks of back-and-forth for first submission.

**5.5 — Over-the-air updates** with EAS Update — push JS changes without a full app-store resubmission (native changes still need a rebuild).

**Milestone:** TaskApp installable from the app stores, working offline, with widgets and integrations.

---

## Honest timeline & effort (solo, learning as you go)

These are rough, evenings-and-weekends estimates — not promises. Your pace depends heavily on how comfortable you get with React.

| Stage | What | Rough effort |
|---|---|---|
| 0 | Learn React + React Native foundations | 2–4 weeks |
| 1 | RLS + auth migration | 1–2 weeks |
| 2 | Core app (online-only) | 4–8 weeks |
| 3 | Offline sync | 2–4 weeks |
| 4 | Calendar + share-sheet | 1–2 weeks each |
| 4 | **Widgets** | 2–4 weeks (the hard one) |
| 5 | Polish + ship | 2–4 weeks |

**Total: several months** of part-time work. That's normal for an app of this ambition built solo while learning. The web app you already built is a real asset here — your data model, business logic, and Supabase database all carry over; you're rebuilding the *client*, not starting from zero.

---

## Decisions still to make (don't need to answer now)

1. **Auth migration:** does the web app also move to Supabase Auth, or keep its Java auth while native uses Supabase Auth? (Two auth systems on one database is workable but adds complexity.)
2. **User ID migration:** how existing rows map from your Java `ApplicationUser` IDs to Supabase Auth UUIDs. The single most important data question — plan before migrating.
3. **PowerSync vs WatermelonDB** for sync (Stage 3). Lean PowerSync for less pain, WatermelonDB for more learning + no extra service.
4. **Keep the web app long-term, or eventually retire it** once native covers your needs.

---

## The very first concrete step

When you're ready to begin: **Stage 0.2 — do Expo's official tutorial end to end on your own machine, and get a throwaway app running on your real phone.** Everything else builds on being comfortable there. Don't touch TaskApp's real rebuild until creating and running an Expo app feels routine.

Good luck — this is an ambitious, genuinely educational project, and you're starting from a much stronger position than most because the backend and data model already exist and work.
