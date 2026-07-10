# Components — Concrete Specs

> The component vocabulary. Every element in the app should be one of these — do not invent one-off styles. When a new element is needed, add it here so it persists. All measurements assume base scale from `03-layout-type-color.md` (spacing scale 4/8/12/16/20/24/32/48, radius scale 6/10/16/999).

## The status colors (the visual heartbeat)

These are semantic tokens, not raw colors. In dark mode they resolve to darker equivalents that maintain the same *feel* (see `03-layout-type-color.md` for the token definitions).

| Status | Meaning | Light-mode surface | Dark-mode surface | Left border accent |
|---|---|---|---|---|
| Default | No due date, or far in the future | `surface` | `surface-elevated` | (none) |
| Ongoing | Has due date, past urgency threshold | `status-ongoing-bg` (pale green) | dimmed green | `status-ongoing-accent` |
| Urgent | Within urgency threshold (default 24h) | `status-urgent-bg` (pale orange) | dimmed orange | `status-urgent-accent` |
| Overdue | Past due date, not completed | `status-overdue-bg` (pale red) | dimmed red | `status-overdue-accent` |
| Completed | Marked done | `surface` at 60% opacity | matched | (none) |
| Event (imported) | CSV-imported calendar event | `surface` with dotted left border | matched | `event-accent` (blue) |

**Redundant encoding rule (WCAG 1.4.1):** never rely on color alone. Every status also has a 2px left border accent, and completed adds a strikethrough on the title. Overdue adds a subtle warning icon next to the date. Event uses a dotted (not solid) left border.

## Task card

The most-touched component. Every property is deliberate.

**Anatomy:**
- Left: 2px vertical accent bar (status color, or none for default)
- Top row: priority badge (if set) → title (h4 weight/size, always visible, truncates at 2 lines) → floating action button (right)
- Second row: due date (secondary text color, always visible)
- Third row (optional, only if present): description preview (1 line, tertiary text)
- Bottom row: category pill + subject pill + priority tier badge, small size

> **Resolved (2026-07-09, first implementation):** the priority tier badge appears in the *top row only* (before the title), not duplicated in the bottom pill row — one status, one place. Default-status cards use `surface-elevated` + 1px `border-subtle` on the `surface` screen background (per the 03 file's "surface-elevated — cards"; the light-mode `surface` entry in the table above was superseded because same-on-same needs no border to fail). Due dates render in JetBrains Mono at caption size.

**Sizing:**
- Radius: `radius.card` (16)
- Padding: `space.4` (16) all sides
- Vertical gap between cards: `space.3` (12)
- Min tap target: 44pt / 48dp (whole card is tappable to edit; long-press or right-click opens context menu)

**States:**
- Default → hover (desktop, subtle lift) → pressed (scale to 0.98 with spring) → selected (accent border on desktop for keyboard selection) → completed (opacity 0.6, strikethrough title, preserve everything else so undo is trivial)

**The floating action button on each card:**
- 32×32 circle, right side
- Icon changes by state: checkmark (default/ongoing/urgent/overdue), undo arrow (completed), trash (event delete)
- Tap → run swipe-complete animation → mark done
- Color follows status: subtle grey by default, saturates on hover/press

## Buttons

**Hierarchy — one primary per screen. Non-negotiable.**

### Primary
- Solid fill with `accent` color, `on-accent` text
- Height: 44 (mobile) / 40 (desktop)
- Padding: horizontal `space.4` (16), vertical `space.2` (8)
- Radius: `radius.button` (10)
- Font: body weight semibold, sentence case
- States: default → hover (accent -5% luminance) → pressed (scale 0.97 with spring) → focus (2px accent ring, `space.1` offset) → disabled (30% opacity, no interaction) → loading (label replaced by spinner, same size)

### Secondary
- Transparent fill, `accent` border 1.5px, `accent` text
- Same size + states as primary, except hover fills with 8%-opacity accent

### Tertiary / text
- No fill, no border, `accent` text only
- Used inside forms and lists where a full button would be too heavy
- Underline appears only on focus (accessibility) and hover (desktop)

### Destructive
- Solid `status-overdue-accent` fill, `on-accent` text
- Only used when the action is truly irreversible (unrecoverable delete). If undo is available (which it should be, always), use a secondary button and rely on the undo toast.

### Icon button
- 40×40 tap area minimum; visual icon 20–24px
- Always has an accessible name (`accessibilityLabel` in React Native)
- Never icon-only for a critical action — pair with a text label when space allows

## Pills (category, subject, priority)

Small, unobtrusive. Present on cards but shouldn't compete with the title.

**Anatomy:**
- Height: 20
- Padding: horizontal 8, vertical 2
- Radius: `radius.pill` (999 — full round)
- Font: caption size, weight medium
- Background: user-picked color at 15% opacity in light mode, 25% in dark
- Text: user-picked color at full saturation in light mode, lightened for dark
- Border: 1px, same as text color, 20% opacity
- Contrast check: at 15% opacity backgrounds, text must still pass 4.5:1 (WCAG 1.4.3) — if a user picks a very light color, the token system auto-darkens the text

**Priority tier badge** is a variant:
- 1st: crimson/red-toned
- 2nd: orange
- 3rd: gold/yellow
- Label: "1st" / "2nd" / "3rd" (matches the existing web app)

## Forms

### Text inputs (title, description)
- Height: 44 (single-line) or auto (multiline)
- Padding: horizontal `space.3` (12), vertical `space.2` (8)
- Border: 1px `border-subtle`, radius `radius.button` (10)
- Focus: border becomes accent, 2px inner glow with accent at 20%
- Label: always visible, above the input, `caption` size, `text-secondary` color
- Placeholder: NOT a label substitute. Placeholder is `text-tertiary`, italic optional
- Error: border `status-overdue-accent`, error text below in same color

### Date picker (per developer preference)
- Uses the platform-native calendar picker: `@react-native-community/datetimepicker` on iOS/Android in "date" mode
- Present the current selection as a tappable chip that opens the picker sheet
- Format: "Fri, May 24" (day of week helps at a glance)

### Time dropdown (per developer preference)
- 15-minute increments in a scrollable dropdown/wheel
- Present the current selection as a chip next to the date chip
- Format: "2:30 PM" (12-hour with AM/PM to match the existing web app's `DATE_TIME_FORMATTER`)

### Category / subject pickers
- Bottom sheet on mobile, dropdown menu on desktop
- Shows existing values with their colors + "Create new..." at the bottom
- Inline color picker for new values (12-swatch palette + custom hex)

### Priority picker
- Three chips: "1st" / "2nd" / "3rd" / "None"
- Single-select, larger tap targets (44 tall each)

## Empty states

The generic AI-app default is: giant illustration + hopeful copy + one CTA button. **Do not do this.** Multitask is a personal tool used daily; the user is not being onboarded.

Instead:
- Short, factual message: "Nothing due today." / "No overdue tasks." / "No tasks in this category."
- One small text link (tertiary button style) for the most likely next action: "Add a task"
- No illustration except a small (24×24) status glyph
- Never emoji or exclamation points

## Progress / sync-state indicator

Because offline-first, users need to know sync state without alarm.

**Placement:** top-right of the screen, subtle. Never blocks content.

**States:**
- Synced (default) — small filled dot, `text-tertiary`, no animation
- Syncing — same dot, gently pulsing (`prefers-reduced-motion` → static)
- Offline — outlined dot, "offline" text label appears next to it, `text-secondary`
- Sync error — small warning icon in `status-urgent-accent`, tap to see detail

## Undo toast

Any destructive action (delete, mark complete, bulk clear) triggers an undo toast.

- Position: bottom of screen, above tab bar / FAB
- Content: "Task deleted. **Undo**"
- Duration: 5 seconds, resets on hover (desktop)
- Radius: `radius.card` (16)
- Background: `surface-elevated` with shadow
- Dismiss: swipe down (mobile), X button (desktop), or auto-dismiss

## Widgets (home + lock screen)

**Home widget (small/medium/large sizes):**
- Small: 1–2 most-urgent tasks. Overdue first (with red accent), then next-upcoming.
- Medium: 3–4 tasks with title + due time
- Large: full today's list, up to 6 tasks + a "N more" indicator
- Deep-link on tap → opens the corresponding task in the app

**Lock-screen widget (iOS 16+ / Android equivalent):**
- Single row: title of the most urgent task + status glyph
- Circular variant: a status-color dot with number of overdue tasks
- Rectangular variant: title + due time

Widgets must render with **no live network** — they read from the same local SQLite the app uses. This is another reason offline-first is a hard requirement.

## Component checklist (before shipping any new screen)
- [ ] Every element is one of the above, or added here with a spec?
- [ ] Status colors used correctly, with redundant encoding (border/icon)?
- [ ] Title + due date always visible on task representations?
- [ ] One primary action per screen, not two?
- [ ] All interactive elements have accessible names and states?
- [ ] Focus states visible and contrast-passing?
- [ ] Empty states factual, not "hopeful"?
- [ ] Undo available for destructive actions?
- [ ] Sync-state indicator present on data screens?
