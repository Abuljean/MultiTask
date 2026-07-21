# Layout, Type & Color

> The design tokens. Everything visual in the app derives from these scales — do not use ad-hoc values. If a needed value isn't in a scale, add it here first, then use it. This is the single strongest anti-generic lever: a small deliberate scale beats endless one-off choices.

## Spacing scale

One scale, used for all padding, margin, and gaps. Names are relative sizes, not pixels — this keeps `space.3` meaningful when we later swap the base unit.

```
space.0 = 0
space.1 = 4
space.2 = 8
space.3 = 12
space.4 = 16     ← the workhorse. Most padding, most gaps.
space.5 = 20
space.6 = 24
space.8 = 32
space.10 = 40
space.12 = 48
```

**Rules:**
- Card internal padding: `space.4` (16). Section padding: `space.6` (24).
- Gap between related items (e.g. task cards in a list): `space.3` (12).
- Gap between unrelated sections: `space.6` (24) or `space.8` (32).
- Screen edge padding: `space.4` (16) on mobile, `space.6` (24) on desktop.
- Never use a value outside the scale. If `14` feels right, you're either at `space.3` (12) or `space.4` (16) — pick the closer one.

## Radius scale

```
radius.tight = 6         ← input borders, small chips
radius.button = 10       ← buttons, inputs, small controls
radius.card = 16         ← task cards, sheets, modals
radius.pill = 999        ← full round (pills, badges, dots)
```

Two radii per element type — a smaller and larger. Do not add a third "medium" radius; the visual hierarchy comes from the *contrast* between tight and card, not from a spectrum.

## Type scale

**Fonts (commit to these; the ban list matters):**
- **UI text:** on iOS use SF Pro (system, no import). On Android use Roboto (system). On web/desktop use **Inter** as fallback if the system font isn't loaded — BUT do not import Inter as the primary font on native. **Do not use Inter as the identifying font of this app** — that's the generic AI-app default.
- **Monospace (for time chips, timestamps, code):** JetBrains Mono on all platforms (import via `expo-font` on native, `@fontsource/jetbrains-mono` on web). This is a small identifying touch.

Rationale: using each platform's system font makes the app feel native (Jakob's Law); using JetBrains Mono specifically for time-related content is a small identity marker that isn't generic. Time chips ("2:30 PM", "in 3h") read as data, and mono makes them feel *precise*.

**Scale (5 sizes, defined roles, do not add more):**

```
display    32/40  weight 700   — used sparingly (empty-state hero, big numbers)
h1         24/32  weight 600   — screen titles (large-title style on iOS)
h2         18/24  weight 600   — section titles, task titles
body       15/22  weight 400   — descriptions, general text
caption    12/16  weight 500   — pills, badges, timestamps, secondary metadata
```

Rendered as `size/lineHeight`. Weights are 400/500/600/700 only — no 300 or 800.

**Rules:**
- Task title uses h2 size, weight 600. Non-negotiable — legibility at glance distance.
- Body copy uses body size, weight 400. Line length target: 45–75 characters (constrain container width on desktop).
- Captions are the smallest text allowed. Nothing smaller than 12/16.
- ALL CAPS is banned except in the priority tier badge ("1ST"/"2ND"/"3RD") and never in body copy.
- Italic is banned except for placeholder text in inputs.

## Color system

**Semantic tokens, not raw colors.** Every UI reference goes through a token. Themes and dark mode swap the tokens; components never know the actual hex.

### The token set

```
Base surfaces:
  surface              — main background
  surface-elevated     — cards, sheets, popovers (subtly lighter than surface)
  surface-sunken       — grouped background (subtly darker in light, lighter in dark)

Text:
  text-primary         — 87% luminance contrast with surface (WCAG 4.5:1+)
  text-secondary       — muted, meets 4.5:1 for normal text
  text-tertiary        — metadata, timestamps; meets 3:1 (large text) minimum
  text-on-accent       — text sitting on accent-colored backgrounds

Borders:
  border-subtle        — the "just barely there" divider
  border-emphasis      — used for focus rings and selected states

Accent:
  accent               — the single brand color. Used for primary buttons, focus rings, links, active nav.
  accent-muted         — accent at reduced intensity for hover / soft backgrounds

Status (the sacred four):
  status-ongoing-bg / -accent
  status-urgent-bg / -accent
  status-overdue-bg / -accent
  status-event-accent   — for imported CSV events (visually distinct from tasks)
```

### The starting light theme (placeholder — swap the accent when you decide)

```
surface              = #FBFBFA   ← warm off-white, NOT pure white
surface-elevated     = #FFFFFF
surface-sunken       = #F4F3F0

text-primary         = #1A1A1D   ← near-black, warm
text-secondary       = #5C5A55
text-tertiary        = #75706A   ← darkened 2026-07-10 (was #8A857D, only 3.2:1): tertiary appears at caption sizes → needs 4.5:1
text-on-accent       = #FFFFFF

border-subtle        = #E8E5DE
border-emphasis      = same as accent

accent               = #4954C7   ← INDIGO (2026-07-21; was #3D4A7A, too dark/mushy on white). White text ≈6.3:1.
accent-muted         = #4954C7 at 12% alpha

status-ongoing-bg    = #F0FDF4   ← carried from web
status-ongoing-accent= #16A34A
status-urgent-bg     = #FFF7ED   ← carried from web
status-urgent-accent = #EA580C
status-overdue-bg    = #FEF2F2   ← carried from web
status-overdue-accent= #DC2626
status-event-accent  = #2563EB
```

### The starting dark theme

```
surface              = #16171A   ← NOT pure black. Pure black reads harsh + causes halation.
surface-elevated     = #1E1F23
surface-sunken       = #0F1013

text-primary         = #E8E6E1   ← NOT pure white. Slightly warm off-white.
text-secondary       = #A6A29B
text-tertiary        = #8F8A82   ← lightened 2026-07-10 (was #7A756D, 4.0:1) for 4.5:1+ at caption sizes
text-on-accent       = #FFFFFF

border-subtle        = #2A2B30
border-emphasis      = same as accent

accent               = #7C8BC4   ← lightened indigo, still desaturated
accent-muted         = #7C8BC4 at 15% alpha

status-ongoing-bg    = #14261C   ← muted dark green, NOT the same hue as light
status-ongoing-accent= #4ADE80
status-urgent-bg     = #2E1D14
status-urgent-accent = #FB923C
status-overdue-bg    = #2E1518
status-overdue-accent= #F87171
status-event-accent  = #60A5FA
```

### About the accent color

The placeholder is a **desaturated indigo** because it's calm, distinctive-enough, and pairs with all four status colors without clashing. It is a placeholder — swap it in this file, and every component inherits the change. Good alternatives that fit "calm, specific, tactile":

- **Deep teal** (`#2C6E75`) — cooler, feels analytical
- **Terracotta** (`#B85A3A`) — warmer, personality
- **Forest green** (`#3A5F42`) — grounded, calm
- **Slate purple** (`#5C4A7A`) — the current direction, but darker

What NOT to pick: bright saturated blue (`#2563EB`), bright purple (`#7C3AED`), any gradient. These are the AI-generic defaults.

## Dark mode discipline (do NOT skip)

Dark mode is not "invert the light theme." Every color pair has to be re-verified for contrast because dark-mode intuition is unreliable. Rules:

- **Never pure black (`#000`) as `surface`.** Halation makes text shimmer; use warm off-black like `#16171A`.
- **Never pure white text.** Use off-white like `#E8E6E1`. Same halation problem in reverse.
- **Elevation is lighter in dark mode.** In light mode, elevated surfaces are subtly whiter; in dark mode, elevated surfaces are subtly lighter grey. Do NOT use shadow to convey elevation in dark mode — shadow disappears.
- **Status backgrounds are re-designed, not tinted.** The pale green of ongoing (`#F0FDF4`) does not become "the same green but darker" — it becomes a muted dark green (`#14261C`) that reads as green without glowing.
- **Test every color pair** with a contrast checker in both themes. Both must pass WCAG AA.

## Layout patterns

### Mobile task list
- Single column, `space.4` (16) side padding, `space.3` (12) between cards
- Sticky section headers (Completed / Overdue / Today / Tomorrow / Upcoming / No due date) styled as h2, `text-secondary`
- **Resolved (2026-07-09):** the **Completed group sits at the TOP of the list, collapsed by default**, with a count and chevron; expanded/collapsed state persists across launches. This keeps the active list below reading strictly by time. Section wording is "Upcoming" (not "Later").
- **Resolved (2026-07-10):** deletion is a **soft delete into a "Deleted" (trash) section at the BOTTOM of the list**, collapsed by default, persisted like Completed. Swipe right there = restore, swipe left = permanent delete (no undo — it's already the second step). Backed by a `deleted_at` column (supabase/04); trash syncs across devices. Known tradeoff: the legacy Vaadin web app shows soft-deleted tasks until the web redesign.
- **Resolved (2026-07-10, motion):** every list regroup (complete, restore, undo, collapse) runs through one shared LayoutAnimation (spring position updates, delayed fade-in for arrivals) — tasks visibly glide into their new group. The pull-to-refresh spinner appears ONLY on a physical pull; background refetches after mutations are invisible. Swipe commit threshold is 30% of screen width (40% felt cartoonish).
- Pull-to-refresh triggers a re-sync (visible only when actually syncing something)
- FAB (quick-add) bottom-right on iOS, bottom-center or bottom-right on Android per M3 conventions

### Mobile Today view

> **Resolved (2026-07-10):** this view is named **"Daily"** in the product (tab + screen title) — it's about daily recurrence, and "day view" is reserved for the calendar's future day drill-down. Structure as built: h1 "Daily" + long date · "Recurring" section (pill-shaped check rows: tap toggles today's completion, long-press removes/archives with undo, inline "Add daily task" link) · "Due today" section (regular swipeable task cards, overdue included, completed ones stay on the Tasks tab). Recurring reset is derived from per-day completion rows — no cron.
- Full-bleed h1 at top ("Today"), with the date in `text-secondary` below
- Split into "Recurring" section (daily-refreshing tasks — check-off but never delete) and "Tasks due today" (regular tasks with today's date)
- Recurring items are visually distinct: rounded pill-shaped rows with a check circle, no due-time chip

### Mobile calendar
- Year view (default when no drill): 12 mini-month blocks, current month highlighted
- Month view: 5–6 week grid, each day cell shows a small dot per task (dot color = status). Overdue days are subtly tinted.
- Day view: task list for that day, styled like the main task list

### Desktop three-pane layout
- Left sidebar (280px, collapsible): filters, categories, subjects
- Middle pane (flexible): task list or calendar
- Right pane (360px, closable): task detail / edit form
- All three panes scroll independently; middle pane is always the source of truth for selection

## Density guidance

Multitask is a **power tool for daily use** — the target user is the developer, who wants to see many tasks at a glance. This is not a consumer onboarding experience.

- Prefer showing more items over more whitespace. Cards should be compact, not roomy.
- Do not add "hero" sections, motivational headers, or big empty-state illustrations.
- On desktop, use the full three-pane density from day one.
- The one exception: interactive elements (buttons, tap targets) must never be smaller than the accessibility minimums (44pt / 48dp). Density comes from tightening non-interactive whitespace, not from shrinking targets.
