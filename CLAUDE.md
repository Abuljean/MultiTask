# CLAUDE.md — Multitask (native app)

This file gives Claude Code context at the start of every session. Keep it updated as the project progresses.

## What this project is
**Multitask** (name may still change) — a cross-platform task manager. A web version already exists and is deployed; this repo is the new **native app** (React Native + Expo) that will share data with the web app via Supabase. The web app will eventually be **redesigned to match** the improved native design, so what you build here is the reference design for the whole product, not just the mobile client.

- **Framework:** React Native via **Expo** (managed workflow / CNG). Currently pinned to **Expo SDK 54** (to match the installed Expo Go app during development).
- **Backend:** **direct-to-Supabase** with Row Level Security (no separate server in the data path). Supabase Auth handles login/tokens/verification.
- **Offline:** must be **offline-first** — local SQLite, syncs to Supabase when a connection returns (sync engine TBD: PowerSync vs WatermelonDB).
- **Platforms:** iOS + Android (primary), then desktop, then a re-skinned web. Developer is on **Windows** (iOS builds via EAS cloud; real iPhone used instead of the Mac-only simulator; iOS widgets will need occasional Mac access).

## Current state (update this as you go)
- **Project recreated on Expo SDK 54** (expo-router default template, at repo root) to match the Expo Go app on the developer's iPhone. The accidental SDK 57 root project and the nested duplicate `multitask/` folder were removed (2026-07-09). **Do not update Expo Go on the phone** — it supports one SDK at a time.
- Docs, design system, and web-app reference committed. `reference/config-and-infra/_env` contains live DB credentials — gitignored, must never be committed; rotating that DB password is recommended (coordinate with the Render env var).
- **Stage 1 (RLS) in progress.** SQL lives in `supabase/` (numbered files the developer runs in the Supabase SQL editor):
  - `00` (schema inspection) and `01` (enable RLS on `task`, `app_users`, `verification_tokens`) — **already run**; web app verified still working. The postgres role owns the tables so RLS doesn't apply to it — never use FORCE ROW LEVEL SECURITY.
  - `02` (adds `task.user_uuid` → auth.users, column defaults, nullable `user_id`, grants + 4 per-user policies, email-matching cross-fill trigger) — **run, verified (4 policies)**. Data API enabled.
  - `03` (re-runnable backfill linking old tasks to Supabase Auth signups by email) — run after signups.
- **Key schema facts (inspected live):** table is `task` (singular); `task_id` comes from `task_seq` (increment 50, Hibernate block allocator — a DB-default `nextval` coexists collision-free); `due_date` is wall-clock `timestamp without time zone`; 12 users / 19 tasks in prod. Supabase Data API currently disabled — enable it only after `02` is run.
- **Decisions made:** no formal account migration — everyone (incl. the developer) signs up fresh in Supabase Auth; old tasks auto-link by email via `03` + the insert trigger. The web app keeps Java auth untouched for the whole native build.
- **Supabase client + auth flow built (2026-07-09):** `lib/supabase.ts` (AsyncStorage session persistence, AppState token refresh), `hooks/use-auth.tsx` (AuthProvider/useAuth), bare-bones `app/sign-in.tsx` + `app/sign-up.tsx` (functional placeholders — real design pass comes later), `Stack.Protected` guards in `app/_layout.tsx`, temporary sign-out harness on the home tab. Config in `.env` (gitignored; template in `.env.example`). **Pending: on-phone test of sign-up/sign-in.**
- **Decision (2026-07-09): Supabase Auth "Confirm email" is OFF during the dev phase.** Confirm links redirect to the Site URL (localhost) and can't open the app under Expo Go (no custom link scheme there). Re-enable it — with `emailRedirectTo` + deep-link handling into the app — when the project moves to a development build (Stage 3 requires one anyway). Until then, signups take effect immediately.
- **Next milestone:** after auth verified on phone → developer signs up with their web-app email → run `supabase/03` to link old tasks → Step 4: online-only task data layer (TypeScript Task model, TanStack Query CRUD, urgency/overdue logic ported with tests, debug list screen). Offline sync engine (PowerSync vs WatermelonDB) deliberately deferred to Stage 3.

> **PHASING — read this, it prevents scope creep.** This project is built in distinct phases, NOT all at once:
> 1. **NOW: build the native app (this repo)** completely — it is the design source of truth for the whole product.
> 2. **LATER (separate phase): rebuild the web app in React** to match the native design. The existing web app is Vaadin Flow, which is design-restrictive; it will eventually be replaced with a React web app that reuses the native app's design system, components, and logic. This is intended and already planned — BUT it is a *later* phase.
> - **Do NOT attempt the web rebuild during the native build.** Doing both at once doubles scope and risks the project never shipping. The current Vaadin web app keeps running as-is (it works, it's deployed, it's the backend reference) until the native app is done. Only then does the web get its React redesign.

> **All knowledge/context files are ALREADY IN THIS PROJECT on disk — read them directly, they are not uploaded to you separately.** This `CLAUDE.md` is at the repo root. The full briefing and roadmap are in `docs/`. The design system is in `docs/design/`. The existing web app's source (data model + visual DNA to carry forward, NOT code to reuse) is in `reference/`. Open and read these files from the project as needed rather than asking the developer to paste them.

> **Keep this file current:** at the end of any meaningful work session, update this "Current state" section (and any decisions made) so the next session starts accurate. When a design or architecture decision is resolved, record it in the relevant file (`docs/design/*` for design, this file or the handoff for project decisions) so the choice persists across sessions.

## Existing web app (shared backend context)
- Stack: Vaadin 25 + Spring Boot 4 + Java 24, Supabase Postgres, deployed on Render (https://taskmanager-gcvv.onrender.com).
- Data model: tasks have title, description, due date (wall-clock LocalDateTime), category, subject, priority (Integer rank; null=none), completion. Users have email, password, enabled, urgency-threshold-hours, timezone.
- **Critical Supabase note:** must use the **transaction-mode pooler (port 6543)**, not session mode — session mode caps at 15 clients and fails with EMAXCONNSESSION.
- **Existing web visual DNA to carry forward:** status-driven card backgrounds (default white, ongoing green `#f0fdf4`, urgent orange `#fff7ed`, overdue red `#fef2f2`), colored category/subject pills, priority tier badges (1st/2nd/3rd), floating action button on each card, muted secondary text (`#666`/`#888`). This is the DNA to *elevate* on native, not throw away — the app should feel like the same product, refined.

## Key feature requirements for the native app (summary — full detail in the handoff doc)
- **Must-haves:** login on all platforms (Supabase Auth + RLS); notifications when a task becomes urgent and ~1–2h before deadline; dark mode + themes; tasks pushed to the phone's native calendar; CSV calendar import creating *events* (not tasks), visually distinct from tasks; a "Today" view with daily-refreshing recurring tasks (NOT shown on the calendar); home-screen AND lock-screen widgets showing today's tasks (overdue first, else next task by date); cross-device sync via one account; PC launch-on-startup.
- **Calendar view:** year → month (day boxes) → day drill-down.
- **Mobile usability (top priority):** fast quick-add requiring only **title + time** (other fields optional, out of the way); **swipe-to-complete** and **swipe-to-delete** with good animations; bulk "clear completed"; fast app open landing on the task/Today view; **calendar picker for date, dropdown for time**.
- **Always show** task title + due date; category/subject/priority pills can be small but present.
- **Voice (ambitious, scope realistically):** Siri/Assistant create/edit/delete/complete tasks. Start with "create a task by voice."
- **Animations:** completion/deletion animated; builder has design freedom, must work on mobile AND PC, must not be distracting (it's a task manager first).
- **Open to builder's judgment:** color palette, typography, layout, animation style, iconography, overall look, screen/nav design. Fill in missing crucial features sensibly and flag them.
- **Known web bug to fix (when web is revisited):** deleting a task collapses the completed group, making bulk-clearing tedious — add bulk delete / avoid the collapse.

---

## Design principles — READ BEFORE WRITING ANY UI CODE

These principles override defaults. The single biggest risk for this build is that it comes out looking like a generic AI-generated task app (rounded rectangles, purple/blue gradient hero, Inter everywhere, three-color palette with no opinions). Do not let that happen. When making a UI decision, consult the files in `docs/design/` — they exist to give you opinions on the things that would otherwise default to generic.

### The three-word design brief
**Calm, specific, tactile.** *Calm* because it's a task manager first — visuals must never fight the content. *Specific* because generic is the failure mode — every element should feel chosen, not defaulted. *Tactile* because native lets us make things feel physical (swipe, snap, spring, weight) in a way the web version can't.

### Non-negotiable rules
1. **The status colors are sacred.** Ongoing/urgent/overdue are the visual heartbeat of this app. On any surface, in any theme, the four states (default, ongoing, urgent, overdue) must be instantly distinguishable and never conveyed by color alone (add subtle icon/border/weight cues). Exact tokens live in `docs/design/02-components.md`.
2. **Title + due date are always visible and legible at glance distance.** Everything else on a card is subordinate. If you're about to shrink the title to fit a badge, shrink the badge instead.
3. **One primary action per screen.** The quick-add FAB on the task list. The save button in a form. Never two filled buttons competing.
4. **Motion has a job.** No animation exists for decoration. Every transition either orients (came from / going to), gives feedback (tap, swipe, complete), or expresses continuity. See `docs/design/05-motion.md`.
5. **Respect `prefers-reduced-motion`.** Motion is required to gracefully degrade — this is an accessibility hard-line, not a nice-to-have. The React Native equivalent is `AccessibilityInfo.isReduceMotionEnabled()`.
6. **Platform conventions win over cross-platform sameness.** iOS gets iOS back-swipes and large titles; Android gets Material navigation and system back. See `docs/design/01-platforms.md` for the conflict-resolution rules.
7. **Density is a feature, not a bug.** This is a power tool for someone who uses it daily. Don't add whitespace to look "clean" if it makes the user scroll more to see their tasks. Follow the density guidance in `docs/design/03-layout-type-color.md`.

### The anti-generic checklist
Before shipping any screen, mentally check `docs/design/06-anti-generic.md`. The most common tells: purple/indigo hero gradients, Inter as the only font, all-rounded corners at the same radius, empty states with a giant illustration and a single CTA, filled primary + outline secondary buttons on every screen with no thought to hierarchy, drop shadows on everything, emoji as icons, "AI-suggested" copywriting ("Let's get started!", "You've got this!"). Don't do these.

---

## Working style
- Developer is learning React Native as they go — explain reasoning, go step by step, one piece at a time (describe → build → test → iterate).
- **Do NOT enable "accept all" edits blindly early on** — approve changes individually until trust is built.
- **Commit often** (each commit is a restore point). Secrets (Supabase keys, credentials) NEVER go in the repo — use env files excluded via .gitignore.
- Verify bleeding-edge API/library details against current docs rather than assuming; the ecosystem moves fast.
- **When a design decision comes up that isn't covered by the files in `docs/design/`**, propose an option grounded in the principles above and flag it to the developer rather than silently picking a default. Add the resolved decision back to the relevant file so the choice persists.

## Full reference (all files are in this project — read from disk)
- **Project briefing & roadmap:** `docs/TaskApp-Master-Handoff.md` and `docs/TaskApp-Native-Roadmap.md` — open these for full product/technical detail.
- **Existing web app source (reference only):** `reference/web-app-source/` (Java + offline.html) and `reference/config-and-infra/` (pom.xml, application.properties with the Supabase pooler fix, security config, repos). This is the data model, logic, and visual DNA to carry forward — NOT code to reuse directly.
- **Design system:** `docs/design/` folder:
  - `00-design-handoff.md` — the "why" behind every choice; read once, refer back to reconcile disagreements.
  - `01-platforms.md` — iOS / Android / desktop / web conventions and how to resolve conflicts.
  - `02-components.md` — concrete specs for buttons, cards, forms, pills, states.
  - `03-layout-type-color.md` — spacing/type/color scales and dark-mode discipline.
  - `04-gestures-and-interaction.md` — swipe, drag, quick-add, keyboard on desktop.
  - `05-motion.md` — timing, easing, the transitions catalog.
  - `06-anti-generic.md` — the "don't ship it looking like every AI-generated app" checklist.
