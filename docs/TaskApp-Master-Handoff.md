# TaskApp — Master Handoff & Context Document

**Purpose of this document:** a single, self-contained briefing that captures the entire TaskApp project — the existing web app, every important technical decision, the native-app plan, and the full feature & design wishlist. Upload or paste this at the start of any new chat (with any AI model) so the conversation has full context and can continue the work. No AI model retains memory between separate conversations, so **this document is how continuity is preserved** — keep it updated as the project evolves.

**A realistic note on how to use AI help here:** the most effective pattern is collaboration — you describe a piece, the AI writes it, you test it, you report what's wrong, you iterate. No model builds an entire app in one shot without this back-and-forth. Treat this document as a briefing for a *partner*, not an order form for a finished product. It should also be read critically: fill in missing crucial features with sensible native-appropriate defaults, and flag tradeoffs/decision points rather than guessing silently.

---

## PART 1 — What exists today: the web app

**TaskApp** is a personal task manager, currently a working, deployed web application.

**Stack:**
- Vaadin 25.1.2 (Flow, server-side UI) + Spring Boot 4.0.5 + Java 24
- Supabase Postgres database (`ddl-auto=update` for schema)
- Deployed on Render at `https://taskmanager-gcvv.onrender.com`
- Theme: **Aura layered over Lumo** — `@Theme(themeClass=Lumo.class)` + `@StyleSheet(Aura.STYLESHEET)`

**Package structure (`com.jry.*`):** entities in `backend.entities`, services in `backend.service`, UI in `base.ui.{views,components,layouts}`.

### Web app features (all working, deployed)
- **Task management:** create/edit/delete tasks via dialog HUDs; title, description, due date/time, category, subject, completion status, priority.
- **Calendar view** (FullCalendar v7): month grid, prev/Today/next navigation, all-day entries, click-to-edit, "No due date" section.
- **Categories & subjects:** data-driven (derived from actual tasks), color-coded, editable inline, "Uncategorized" always present, group-by-category.
- **Urgency system:** configurable threshold (hours before due = "urgent"); tasks show as Overdue / Urgent / Ongoing.
- **Priority feature:** optional per-task priority (1st/2nd/3rd, extensible), colored badge on cards, "Group by Priority," priority woven into sorting.
- **Settings page:** display name, email (with verify-then-apply change flow), password change, urgency threshold, timezone — all gated appropriately.
- **Email verification:** signup verification, secure email-change (verify new address before applying), re-auth (re-enter password) for sensitive changes. Uses Gmail SMTP.
- **Timezone handling:** per-user timezone (browser-detected at signup + Settings override); wall-clock storage for deadlines; zone-aware "now" for urgency/overdue; once-per-session mismatch banner.
- **PWA:** installable, with a graceful offline page (informational only — Flow can't run offline).
- **Auth:** Spring Security, session-based, sign-out in drawer.

### Key technical decisions & hard-won lessons (IMPORTANT for whoever continues)
- **Aura theme quirk:** `LumoUtility` CSS classes are silently inert under Aura; overrides need Aura-specific `::part()` selectors with `:not(vaadin-tooltip,vaadin-slider-bubble)` for specificity, and `--vaadin-radius-*` tokens.
- **Full restart required** (not hot-reload) after any entity/service/constructor change — hot-reload runs stale mixed code and causes confusing half-broken bugs. This bit us repeatedly.
- **Bleeding-edge Vaadin 25 APIs** must be verified against decompiled source, not memory or old docs (e.g. `ModalityMode` location, `setModality` vs deprecated `setModal`).
- **Supabase connection fix (critical):** must use the **transaction-mode pooler** (port 6543), NOT session mode (port 5432, capped at 15 clients → "EMAXCONNSESSION max clients reached"). Config: `DB_URL=jdbc:postgresql://...pooler.supabase.com:6543/postgres`, `DB_USER=postgres.[PROJECT_REF]` (project ref in username!), `prepareThreshold=0` (transaction mode can't do prepared statements), small HikariCP pool.
- **`APP_BASE_URL` env var** must be set on Render to the Render URL, or verification email links wrongly point to localhost.
- **Timezone is "light version":** deadlines stored as wall-clock `LocalDateTime` (don't shift when user changes zones); only "now" comparisons are zone-aware. This was a deliberate choice over full UTC migration — correct for a task app where "due Friday 11:59pm" should stay that everywhere.

---

## PART 2 — The plan: native multi-platform app

**Decided direction:** rebuild the *client* as a native app while keeping the Supabase database (shared with the web app).

- **Framework:** React Native via **Expo** (managed workflow + config plugins / CNG)
- **Backend model:** **direct-to-Supabase** with Row Level Security (no Java server in the data path); Supabase Auth handles login/tokens/verification
- **Offline:** local-first with a sync engine (PowerSync = managed/easier, or WatermelonDB = DIY/more learning)
- **Platforms:** iOS + Android (desktop possible later)
- **Developer is on Windows** — ~80–90% doable on Windows; EAS cloud builds handle iOS; real iPhone replaces the Mac-only simulator; **iOS widget development is the one place needing occasional Mac access.**

*(Full stage-by-stage plan, timeline, and Windows workflow are in the companion file `TaskApp-Native-Roadmap.md`.)*

**Two open migration questions to resolve before/early in the build:**
1. How existing rows map from Java `ApplicationUser` IDs → Supabase Auth UUIDs (the trickiest data-migration question).
2. Whether the web app also moves to Supabase Auth or keeps Java auth while native uses Supabase Auth.

---

## PART 3 — Features & design brief for the native app

**How to read this section:** items marked **[MUST]** are firm requirements. Items marked **[OPEN]** are left to the builder's design judgment — the developer explicitly wants the AI/designer to "go wild" and choose what's best there, guided by the constraints. Items marked **[DECISION]** are things the builder should decide sensibly and flag.

### Carried over from the web app
- All existing web features above should exist in the native app (task CRUD, categories/subjects, urgency, priority, calendar, settings, auth).
- **[MUST] Login required on BOTH mobile and PC/web versions** — no easy data leakage; every user's data stays private (backed by Supabase Auth + RLS).

### Notifications & reminders
- **[MUST]** Push notification when a task **becomes urgent** (crosses the urgency threshold).
- **[MUST]** Reminder notification **~1–2 hours before a deadline** (exact lead time ideally user-configurable).
- **[DECISION]** Notification settings/toggles live in Settings; builder to design the granularity.

### Settings & customization
- **[MUST]** More customization than the web app, including **dark mode**.
- **[MUST]** **Themes** (beyond just light/dark) — potentially multiple color themes.
- **[OPEN]** Exact theme options, palettes, and how they're presented — builder's choice.

### Calendar & scheduling
- **[MUST]** Tasks are added straight to the **phone's native calendar** (device calendar integration).
- **[MUST]** Ability to **import/upload external calendars** in **CSV** (or other usable calendar format) — these create **calendar events, NOT tasks**. (Complexity deliberately limited: no in-app event creation UI — user generates the CSV elsewhere, e.g. by asking another AI to make it, then imports.)
- **[MUST]** The calendar must **visually distinguish** between **tasks** and **imported CSV daily/calendar events**.
- **[MUST] Calendar visual model:** similar to the phone calendar, but the primary view shows **days-by-month** (30–31 day boxes in a month grid); **click into a day** to see that day's detail; **click out to see the year**. So: year → month → day drill navigation.

### Daily / recurring tasks (a distinct concept from dated tasks)
- **[MUST]** A separate **tab/view for "today"** — today's to-do list / events / tasks of the day.
- **[MUST]** Support **daily-refreshing recurring tasks** (e.g. "draw," "play violin," "exercise") that reset each day.
- **[MUST] Daily recurring tasks do NOT appear on the calendar** (they're a separate stream from dated tasks).
- **[MUST]** Option to show an **uploaded daily schedule** in this today view.

### Widgets (home screen)
- **[MUST]** Home screen widget showing **today's tasks**.
- **[MUST]** If there are no tasks today, show the **latest/next task by date** instead.
- **[MUST] Overdue tasks shown first** in the widget.
- **[MUST]** **Lock-screen widgets** too (customizable lock-screen info showing today's tasks, same overdue-first logic).

### Cross-platform sync & account linking
- **[MUST]** All **three apps — phone, PC, and website** — link via **one account** and **sync to each other**. (The website can be *recreated* to match the new native app's design.)
- **[MUST] Offline-first sync:** offline edits save to local memory, then upload once a connection returns. (This is the core offline-first architecture — PowerSync or WatermelonDB.)

### Desktop-specific
- **[MUST]** On computers, option for the app to **start up automatically when the computer turns on** (launch-on-boot setting).

### Voice control / Siri (ambitious — flag feasibility)
- **[WANT]** **Siri integration to create tasks by voice.** When Siri recognizes an intent like "create a task / add to the schedule" (or similar phrasings), it prompts for task name, time, category/subject/pill, and any other needed info, then creates the task.
- **[WANT]** Siri can also **create, delete, and edit** tasks by voice, and **mark tasks and daily to-do items complete** (and delete them).
- **[DECISION/FEASIBILITY]** This uses iOS **App Intents / SiriKit** (and Android's equivalent, App Actions / Google Assistant). It's genuinely advanced and platform-specific — builder should assess feasibility and scope realistically; a good first version might be "create a task by voice" before full edit/delete/complete. Note the free-form conversational flow described is harder than a fixed intent; the builder should design the most reliable achievable version.

### Task display (in the task manager itself)
- **[MUST]** For every task, **title and due date must ALWAYS be visible** — these are the most important.
- **[MUST]** Category/subject/priority **pills can be smaller / less prominent** (mobile screens are small) but must still be present in some form.

### Interactions & animations
- **[MUST/OPEN]** Task **completion and deletion should be animated** — can be completely revamped from the web version; builder has free rein on the animation style **as long as it works well on both mobile and PC**.
- **[OPEN]** All other interactions (swipe-to-complete, drag-to-reorder, pull-to-refresh, quick-add, gestures) — **builder's choice**; the developer noted the web app's animations are currently lacking and wants the AI to design good ones throughout.
- **[OPEN]** Overall screen designs and navigation flow — **builder's choice.**

### Mobile usability optimizations (PRIORITIZED — these determine whether the app feels convenient)
These are the friction-reducers that make or break daily use. Priority levels are the developer's own ranking:

1. **[MUST — top priority] Fast quick-add.** Adding a task must be near-instant and minimal. Required fields on quick-add: **title AND time only** (time is required because tasks otherwise can't be ordered/categorized by time). Category/subject/priority are optional and should NOT clutter the quick-add path — people add them if/when they want. One-tap access to quick-add from the main screen (and ideally from the widget/lock screen).
2. **[MUST — top priority] Swipe gestures.** Swipe-to-complete (with a satisfying animation) and swipe-to-delete. This is the core mobile interaction that makes daily use feel good. Must also remain easily usable on PC (e.g. equivalent click/hover controls).
3. **[HIGHLY RECOMMENDED] Fix the completed-tasks clearing problem.** Bulk "delete all completed" / quick-clear, and stop collapsing the completed group on every delete (see the web bug note below). Clearing done tasks is frequent; it must be painless.
4. **[MUST] Fast open, useful landing.** App opens near-instantly (offline-first local data helps) and lands on a useful screen — the Today view / task list, mirroring how the web app sends you straight to the task page. Don't dump the user on a busy or slow screen.
5. **[DECISION — date/time entry] Use a calendar picker for the date and a dropdown for the time** (developer's stated preference — easier than free typing). Natural-language/quick-chips are NOT required; the developer expects people who want extra structure will add it themselves.
6. **[NOTE] Optional fields stay optional and out of the way.** Beyond title+time, everything else (category/subject/priority) is opt-in, not presented as a hurdle on every add.

### Hard constraints (apply regardless of design taste)
- **[MUST] Must work fully offline** (local-first).
- **[MUST] Must not be too distracting** — it's a task manager first; visual flourish must not get in the way of the core job.
- **[MUST] Must be easily usable on both mobile and PC.**

### Anti-preferences
- No clutter / not too distracting.
- (Implied from web app: no ads.)

### Explicitly left to the builder ("go wild")
- **[OPEN]** Color palette, typography, spacing/layout, animation style, iconography, overall visual vibe.
- **[OPEN]** Screen designs and the overall app flow/navigation.
- The developer specifically wants the AI to choose what it thinks is best for these, guided only by the constraints above.

### Direction to whoever builds this (developer's explicit request)
- **Fill in any missing crucial features** the developer may have overlooked — whatever is most convenient and available on native and genuinely needed for a good task app. Flag them as additions.
- **Improve any inherited web-app design details** that can be better on native.
- **Known web-app UX bug to fix:** when you delete a task on the website, it reloads and **collapses the completed-tasks group**, making it tedious to delete them one by one. Add a **"delete all completed" / bulk quick-delete**, or another fast way to clear completed tasks, and avoid the collapse-on-every-delete behavior.
- The developer is open to the builder **redesigning the entire task manager** so the web and native apps share a consistent, improved look — potentially bringing the improved native design *back* to the web app.
- Where the developer listed features across earlier prompts, treat this document's Part 3 as the consolidated source of truth.

---

## PART 4 — Development tooling & repository workflow

**Recommended tool for building the native app: Claude Code** (not Cowork). Claude Code works inside a real codebase — runs terminal commands, does Git operations, installs packages/plugins, edits files across the project. Cowork is better for multi-step knowledge/document work; for a real software repo, Claude Code is the fit. (The underlying model — Opus, Fable, etc. — matters less than the tool: Claude Code is "the hands" that can touch the repo and run commands.)

**Developer has a GitHub account.** Uses Windows (Claude Code runs on Windows; if the plain-Windows experience is rough, WSL is the known-good fallback).

**Setup sequence (do when actually starting the build, after the Expo tutorial):**
1. Install Claude Code, sign in with the Claude account.
2. Create an **empty private repo on GitHub** (New repository → Private → optionally add a README). Copy its URL.
3. Create the Expo project locally (`npx create-expo-app`).
4. Open the project in Claude Code and ask it (plain language) to initialize Git, connect to the private GitHub repo URL, and push. It runs the git commands; developer approves.
5. Ongoing: Claude Code installs Expo plugins/packages (`npx expo install ...`), edits code, runs the app, and commits+pushes progress.

**Workflow rules:**
- **Commit often**, especially before big changes — every commit is a restore point when something breaks.
- **Secrets never go in the repo** — Supabase keys/credentials go in env files excluded via `.gitignore` (template in the bundle). Even private repos keep secrets out.
- Developer stays the driver — approves actions, tests results, makes decisions. Claude Code is a capable pair-programmer, not a hands-off builder.

---

## PART 5 — How to continue in a new chat

1. Upload/paste this document at the start of the new conversation.
2. If you have the web app's source files, upload the relevant ones when working on a specific piece (they live in the project and were previously in `/mnt/user-data/outputs/`).
3. Also upload `TaskApp-Native-Roadmap.md` for the stage-by-stage build plan.
4. Tell the AI which stage/piece you're working on. Work piece by piece: describe → AI writes → you test → report back → iterate.
5. Keep this document updated as decisions are made and features are added.

**Current status as of this document:** web app complete and deployed. Native app not yet started — developer is at Stage 0 (learning React Native via Expo's official tutorial on Windows). Next real milestone: comfortable creating/running an Expo app on a real phone, then Stage 1 (RLS + user-ID migration).
