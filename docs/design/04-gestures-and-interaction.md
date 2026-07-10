# Gestures & Interaction

> How the app *feels* under the finger and under the cursor. This is where the "tactile" in "calm, specific, tactile" is earned. Every interaction here is required, not aspirational.

## Core principle: optimistic + reversible

Every action commits **locally, instantly**, and reconciles with Supabase in the background (offline-first architecture). Every destructive action is **reversible for 5 seconds** via undo toast. Together this means: the app always feels fast, and mistakes are cheap. Do not add "Are you sure?" confirmations for anything that has undo.

## Swipe gestures (mobile — MUST work well)

### Swipe-right on a task card → complete
- Trigger threshold: ~40% of card width
- Below threshold: card returns to origin with spring
- At threshold: haptic light impact, background reveals green with checkmark icon
- Past threshold: card slides off-screen right (240ms, ease-out), then completion animation plays in its slot
- Once completed: undo toast at bottom ("Task completed. **Undo**")
- Spring physics: React Native Reanimated with `withSpring({ damping: 18, stiffness: 200 })`

### Swipe-left on a task card → delete
- Same mechanics, reveals red with trash icon
- Threshold same 40%
- At threshold: haptic medium impact
- Past threshold: card collapses (height animates to 0 over 200ms, then removes)
- Undo toast: "Task deleted. **Undo**" — 5 seconds

### Design details that matter
- The revealed action background is a solid status color (green/red), NOT a gradient
- The action icon (check/trash) is centered vertically in the revealed area, positioned at ~80% of the swipe direction
- The card itself moves via `translateX`, not by animating margin (avoids layout thrash — see motion file)
- Swipe never triggers by accident on a scroll gesture — use pan gesture with directional threshold
- **On PC/desktop**: swipe is replaced by a hover-revealed action row on the card's right edge with the same two icons, plus keyboard shortcuts (`Space` to complete, `Del` to delete)

## Quick-add (fastest possible task creation)

Per the developer's top-priority requirement.

### Trigger
- **Mobile:** FAB (bottom-right on iOS, per Android M3 on Android) — single tap opens quick-add sheet
- **Desktop:** `Cmd/Ctrl+N` anywhere, plus a top-toolbar button
- **Widget:** deep-link that opens the app directly into quick-add
- **Voice (Siri/Assistant):** ambition — see roadmap

### The quick-add sheet
- Bottom sheet on mobile, centered dialog on desktop (max width 480)
- Keyboard opens immediately on the title field (autofocus)
- Fields shown by default:
  - **Title** (text input, full width)
  - **Time** (chip showing "Today, [next round 15min]", tap to change → date picker + time dropdown)
- Optional fields, revealed by a single "**+ details**" text link at the bottom:
  - Category (chip)
  - Subject (chip)
  - Priority (chip: None / 1st / 2nd / 3rd)
  - Description (multiline text)
- Save button: primary, "Add task" — enabled only when Title is non-empty and Time is set
- Save also triggerable with `Enter` (when not in the description field)
- Cancel: `Esc` on desktop, swipe-down or tap-outside on mobile
- After save: haptic success, sheet dismisses, new card appears at its sorted position with a subtle spring-in animation

**Non-negotiable timing:** open-to-typing must feel instant. From FAB tap to keyboard-up should target under 200ms.

## Drag-to-reorder (secondary priority)

Where useful:
- Recurring daily-tasks list (Today view) — long-press to grab, drag with the finger
- Sub-lists that don't have a natural sort order (categories list in Settings, priority tier chips)

Never enable drag-to-reorder on the main task list — it has a real sort order (by due date + priority) that reorder would fight.

### Drag behavior
- Long-press 300ms to enter drag mode, haptic light impact
- The card scales to 1.03 and gets a subtle drop shadow (elevated)
- Other cards move out of the way with a spring animation
- Release: haptic light, card springs into its new position
- On desktop: click-and-hold for the same, or a small drag handle on the left edge visible on hover

## Pull-to-refresh

- Standard iOS/Android pull-to-refresh at the top of scrollable lists
- Triggers a sync attempt
- If offline: pull-to-refresh silently no-ops (do NOT show a scary "you're offline" error — this is expected, not an error)
- If sync error: brief non-blocking toast at the bottom, "Sync failed. Retry" — user can dismiss or tap Retry

## Long-press / right-click context menu

Reveals for advanced actions without cluttering the default UI.

### On a task card
- Edit
- Mark complete / undo complete
- Change date (opens date picker sheet)
- Change priority
- Change category / subject
- Duplicate
- Delete (with undo)

### On empty space
- Add task (quick-add)
- Paste task (if clipboard contains task-shaped text — advanced, flag for later)

## Bulk actions (mostly desktop, but present on mobile)

The developer specifically wants "bulk clear completed" (fixes the collapse bug from web).

### Multi-select mode
- **Mobile:** long-press a task → enter multi-select mode. A top bar appears with "N selected" and bulk actions (Complete, Delete, Change date). Tap other tasks to add/remove from selection. Back button or Cancel exits mode.
- **Desktop:** Shift-click for range select, Cmd/Ctrl-click for toggle. `Cmd/Ctrl+A` selects all visible.

### Bulk clear completed
- Dedicated button in the completed section header: "**Clear all completed**"
- Single undo toast for the whole batch: "12 tasks deleted. **Undo**"
- **Fix the web bug:** the completed section stays expanded after deleting; only the deleted rows disappear.

## Keyboard (desktop — required)

The shortcut set is in `01-platforms.md`. Additional behavior:
- The selected task always has a visible focus ring (accent color, 2px)
- Focus follows the selection when navigating with arrow keys / J/K
- `Tab` moves between panels (sidebar → task list → detail); `Shift+Tab` reverses
- `/` focuses the search field from anywhere
- Escape hierarchy: `Esc` closes the topmost thing (modal → detail panel → deselect task)

## Haptics catalog (iOS + Android)

Use `expo-haptics`. Restraint is the rule — haptics for meaningful events, never routine ones.

| Event | Haptic |
|---|---|
| Swipe crosses complete threshold | `impactAsync(Light)` |
| Swipe crosses delete threshold | `impactAsync(Medium)` |
| Task completed (swipe or button) | `notificationAsync(Success)` |
| Task deleted | `impactAsync(Medium)` |
| Long-press enters drag mode | `impactAsync(Light)` |
| Drop after drag | `impactAsync(Light)` |
| Undo tapped | `impactAsync(Light)` |
| Save form | `notificationAsync(Success)` |
| Error (validation, sync failure) | `notificationAsync(Error)` |

**Never haptic for:** scrolling, hovering, focus changes, keyboard input, tab switches, taps on non-primary controls.

## Accessibility (non-negotiable)

- Every interactive element has an `accessibilityLabel`, `accessibilityRole`, and `accessibilityState` (checked, disabled, selected) as applicable
- Every icon-only button has a text label for VoiceOver / TalkBack
- Focus order matches visual order
- No custom gesture replaces a fundamental system action without an alternative (swipe-to-complete is fine because tap-the-check works too)
- Support VoiceOver rotor / TalkBack reading order on the task list

## The "does it feel right" test

Before shipping any interaction, hand the phone/mouse to the developer and check:
1. Does the response feel immediate? (Target under 100ms perceived latency for any interaction. If it doesn't, use optimistic UI + background work.)
2. Does the motion feel like it obeys physics? (Springs and inertia, not linear tweens — see `05-motion.md`.)
3. Is the outcome obvious without reading a message? (Card slides off → gone. Check appears → done. Undo toast → I can go back.)
4. Would this feel wrong at 3am when the user is tired? (If it requires focus to work, redesign.)
