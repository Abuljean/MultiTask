# Multitask — Design Handoff

**Purpose.** This document is the "why" behind every design decision baked into `CLAUDE.md` and the `docs/design/` files. Read it once at the start of the native build; refer back when a specific decision needs justification or when two rules seem to conflict. It complements — does not replace — `TaskApp-Master-Handoff.md`, which covers the product/technical brief.

---

## 1. The design brief in one paragraph

Multitask is a personal, cross-platform task manager (iOS, Android, desktop, web) rebuilt in React Native + Expo, sharing a Supabase backend with the existing web app. It has one user (its developer) who uses it every day, wants fast quick-add, swipe gestures, a native calendar view, and lock-screen widgets, and explicitly does not want it to feel distracting. The visual direction is deliberately **calm, specific, tactile** — calm because it's a task manager first, specific because the failure mode is looking generic/AI-generated, and tactile because native platforms give us physical-feeling interactions (spring, snap, weight) that the web can't. The design carries forward the existing web app's status-driven color language (ongoing/urgent/overdue) as its heartbeat, and elevates the rest.

---

## 2. Why "calm, specific, tactile" and not something else

There's a real risk with AI-assisted builds that the app comes out looking like every other AI-generated task app: purple-indigo gradient hero, Inter font everywhere, uniform rounded rectangles, generic "You've got this!" empty states, filled + outline buttons with no thought behind hierarchy. This happens because when instructions are vague, models reach for the safest average of their training data — and the safe average of task-app UI in 2024–2026 is exactly that generic look. The single most effective anti-generic move is committing to specific taste choices upfront, so the model is following a chosen path instead of inventing one.

The three chosen words each pull in a specific direction:

**Calm.** The developer explicitly said "must not be distracting — it's a task manager first." Calm means low-contrast backgrounds, restrained accent color, minimal chrome, spacing that groups without shouting. It rules out heavy shadows, gradients as decoration, and animation for its own sake.

**Specific.** Every element earns its treatment. Cards have a reason for their exact radius, not "8px because it looks modern." The type scale has 4 sizes with defined roles, not 7 arbitrary ones. Icons come from one library, not a mix. Being specific is what makes a design feel authored rather than generated.

**Tactile.** This is the native-only lever. The web version can't do spring physics on swipe, can't do a real haptic tap on completion, can't do a satisfying weight to a drag. Native can. Every interaction that has a real-world analog (swiping a card away, checking a box, dragging to reorder) should feel like it obeys physics — not linear tween timings, but proper springs with mass and stiffness.

---

## 3. What carries over from the web app (design DNA)

Looking at the web app's `TaskCard.java`, the visual heartbeat is clear: **status-driven card backgrounds** encode the most important information at a glance. This is the single most valuable design decision from the web app and it must survive intact:

- **Default** — white / neutral surface
- **Ongoing (has due date, not urgent)** — pale green `#f0fdf4`
- **Urgent (within threshold)** — pale orange `#fff7ed`
- **Overdue** — pale red `#fef2f2`

Alongside that:
- **Category and subject pills** with per-value colors chosen by the user
- **Priority tier badges** (1st / 2nd / 3rd) with tier-specific colors
- **Muted secondary text** for descriptions (`#666`) and dates (`#888`)
- **Floating action button** on each card (complete / uncomplete / restore)

On native we keep the status semantic and the pill/badge system, but re-derive the actual colors in a proper token system (`03-layout-type-color.md`) so they work in dark mode and across themes. The idea survives; the raw hex values are a starting point, not gospel.

The one thing the web app does poorly and we should *not* carry forward: inline `getStyle().set(...)` styling scattered across components. On native we commit to design tokens and a small component library from day one.

---

## 4. Why these platform choices

The app targets four surfaces: iOS, Android, desktop, and (eventually) a re-skinned web. The developer's stated primaries are iOS and Android; desktop follows; the web is redesigned last to match. Given that hierarchy:

- **iOS and Android get platform-native conventions**, not a shared cross-platform look. This obeys Jakob's Law (users expect your app to work like other apps on their platform) and is enforced in `01-platforms.md`. A shared visual identity carries the brand; platform conventions carry the interaction patterns.
- **Desktop is treated as a fourth first-class platform**, not an afterthought. The developer specifically wants launch-on-startup and daily use on PC. Desktop-specific patterns (keyboard shortcuts, right-click menus, multi-select, resizable panes) are called out explicitly.
- **The web app inherits the redesign later**, so choices should be portable — a component in React Native has to have a web equivalent that reads as the same thing.

Apple's HIG, Google's Material Design, and Microsoft's Fluent are consulted as authoritative platform references. USWDS and GOV.UK inform the accessibility baseline. `01-platforms.md` covers which system wins when they disagree.

---

## 5. Why offline-first shapes the design as much as the code

Offline-first isn't just a data architecture — it changes what the UI has to communicate. In particular:

- Users need to see whether an edit is **synced or pending sync**, without alarming them when they're offline (this is expected, not an error).
- Optimistic UI is the default: taps commit locally and reconcile in the background. The design has to feel instant even when the network isn't there.
- Sync conflicts need a resolution UI — small, calm, non-blocking, only shown when actually needed.

These are called out in `02-components.md` (the sync-state indicator) and `04-gestures-and-interaction.md` (why every action is optimistic).

---

## 6. Why we're specifying so much upfront

The counterintuitive lesson from "how to make AI not produce generic output" is that **more specification, not less, is the answer**. A vague brief ("make it look good") lets the model default to the average of its training data — which is exactly the generic look. A specific brief ("Inter is banned; use IBM Plex Sans for UI and JetBrains Mono for time chips; radius scale is 6/10/16; primary is one desaturated indigo, accents are semantic only") gives the model a chosen path.

Every file in `docs/design/` exists to remove one class of default. Type file removes "Inter everywhere." Color file removes "purple gradient hero." Motion file removes "linear ease everywhere." Components file removes "all cards look the same." The anti-generic file names the specific defaults to avoid so the model doesn't drift back to them.

---

## 7. How the design files fit together

```
CLAUDE.md                              (root — read every session)
  └── docs/design/
      ├── 00-design-handoff.md         (this file — read once)
      ├── 01-platforms.md              (iOS / Android / desktop / web rules)
      ├── 02-components.md             (buttons, cards, pills, forms, states)
      ├── 03-layout-type-color.md      (spacing / type / color scales + dark)
      ├── 04-gestures-and-interaction.md  (swipe, drag, quick-add, keyboard)
      ├── 05-motion.md                 (timing, easing, transitions catalog)
      └── 06-anti-generic.md           (the "don't be generic" checklist)
```

Claude Code loads `CLAUDE.md` every session automatically. The `docs/design/` files are consulted on demand — `CLAUDE.md` points to the right one for each concern. This mirrors the UX-auditor pattern from the other project (rubric in instructions, references in files) and is the pattern that works best with Claude Code's context budget.

---

## 8. What is NOT specified, and why

Deliberate open decisions:
- **The exact accent color hue.** A single desaturated indigo is a placeholder; if the developer wants a different anchor color (teal, terracotta, forest), swap it in `03-layout-type-color.md` once and every component inherits. What's committed to is *one restrained accent*, not *which one*.
- **Icon library specifics.** SF Symbols on iOS, Material Symbols on Android, one shared web-safe library on desktop/web — but the exact set of icons chosen for each concept is a build-time decision.
- **Theme variants beyond default and dark.** The developer wants "themes" plural; the files specify how a theme swap works, not what each theme looks like.
- **The name.** "Multitask" is provisional per `CLAUDE.md`.

Deliberate *closed* decisions (do not reopen without a real reason):
- Status-driven card colors are the visual heartbeat.
- Motion respects `prefers-reduced-motion`.
- Title + due date are always visible.
- One primary action per screen.
- No purple/indigo hero gradients.

---

## 9. How to use this package with Claude Code

1. Drop `CLAUDE.md` at the root of the native app repo (replacing the existing one — the new file already contains all the technical context from the old one, merged with the design layer).
2. Create `docs/design/` and drop files `00`–`06` into it.
3. Commit both together with a message like `chore: add design system + updated CLAUDE.md`.
4. From then on, Claude Code has the design context every session. When you ask it to build a screen, it will consult the relevant design file rather than defaulting to generic AI output.
5. When a decision comes up that isn't covered, add it to the right file so the choice persists for future sessions. The design docs are living.

---

## 10. Honest limits

This package encodes taste and structure. It does not, and cannot, ship a designed app on its own. Two things still require you:

- **Iteration on real screens.** Even with strong guidelines, the first render of any screen will need adjustment. Build → look at it on the phone → refine.
- **The one visual identity choice you deferred.** You said "I'll upload the context then see" on visual direction, and the context I read points strongly toward *calm, specific, tactile* — but the actual anchor color, iconography, and any personality touches (hand-drawn corners? a mascot? a specific dark theme like "midnight" vs "graphite"?) are yours to pick when you see the first build. The system is built to make swapping those cheap.
