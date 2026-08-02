# Style Pack Documentation — Everything You Can Customize

> **This is the public designer documentation** — the file that ships (rendered) inside the marketplace's "Create your own skin" section. It lists every customizable surface of Multitask, the rules that keep a skin a *task manager*, and how animations scale across devices. GIF examples of each hook + reference art/code land in a later pass; the inventory and rules below are complete and current (2026-07-31).
>
> Companion docs: `10-style-pack-requirements.md` (the formal numbered requirements + validator spec — the enforcement layer for everything promised here) and `11-style-pack-ai-designer-prompt.md` (the copyable AI co-designer prompt). When those disagree with this file, doc 10 wins; sync all three on any inventory change.

---

## 1. The philosophy: invisible guidelines

Multitask's layout boxes — where the card sits, where the title goes, where the tab bar lives — are **invisible guidelines**. They are not yours to move, and that is a feature: they are what keeps every skin recognizably *the same task manager* the user already knows. Everything painted **on** those guidelines is yours:

- the **look** of every surface (cards, sheets, menus, backgrounds, tab bar, calendar, widgets),
- the **motion** of every transition (entry, exit, complete, delete, hover, open/close),
- the **atmosphere** (textures, ambient effects, sounds, fonts).

**The worked example — a "máobĭ" ink-brush skin:** replace the sheet-open animation with a scroll unrolling; let task completion play two or three brush strokes across the card before it slides away; let deletion end in an ink splash; texture the background like rice paper; restyle the task card's border as a brush-drawn line. All of that is possible within this spec — because none of it moves a box, hides a title, or slows the user down.

**The other worked example — a cherry-blossom skin:** branch artwork framing the card (in the decoration layer, outside the content zone), buds that bloom as a looping animation while the card is hovered, full bloom on completion-press, and a petal trail as the exit animation. Also fully within spec — the hover loop has a dedicated hook, and looping effects are allowed *only* there.

## 2. The hard rules (what the validator + curation reject)

These are the boundaries that keep a skin shippable. Every pack is machine-validated where possible and human-reviewed for the rest (curation is structural: only reviewed, signed packs ever reach users).

1. **Function is untouchable.** Every tap target, gesture, and flow works identically under every skin. A skin changes how things look and move — never what they do, never their hit areas (≥44pt always).
2. **Shapes and layout are identical.** Card positions, sizes, list structure, tab layout, sheet anchoring — locked. Radii/borders may vary *within published ranges* (doc 10 §4); geometry constants are published so art fits exactly.
3. **The core signals must stay instantly legible:**
   - **Title + due date** readable at a glance on every card, ≥4.5:1 contrast, never overlapped by decoration — the content zone (title/due/pills area) is a no-art zone.
   - **Status** (ongoing / urgent / overdue / default) instantly distinguishable, and never by color alone — the non-color cues (accent bar, overdue triangle, strikethrough) render above all skin art.
   - You may re-*tint* status colors within validated ranges (each stays in its hue family; overdue must read "stop", ongoing "fine"), but you cannot remove, swap, or equalize them.
4. **Calm beats loud.** No high-saturation alarm colors (bright red/yellow) as large surfaces or backgrounds — those hues are reserved for status meaning. No strobing, no motion that fights reading. If the card art is "too loaded" — extra badges, added text, decorative info — review will bounce it with notes.
5. **Motion budgets are hard caps.** Every animation hook has a maximum duration (table in §5). Interactions must *feel* as fast as stock: the state change itself (task marked done, sheet opened) is never delayed by decoration — effects play *over* the change, not *before* it.
6. **Reduced motion wins, always.** When the OS accessibility setting is on, all creator effects are skipped entirely; the app's minimal fallbacks run. Non-negotiable, enforced by the runtime, not by packs.
7. **No code.** Packs are declarative: tokens (JSON), Lottie/sprite animations, images, fonts, sounds. Nothing executable — which is what makes user-made skins safe to install.
8. **Locked outright:** copy/wording, notification content, auth screens (background only), layout structure & density, tap targets, the sync-dot's outline-vs-fill encoding, and every non-color status cue.

## 3. One design, every device: how scaling works

**You design once, at full detail, and it scales down without quality loss — with one honest caveat.**

- **Everything token-based** (colors, radii, borders, fonts) is resolution-independent by nature.
- **Animations must be vector (Lottie)** — the format is math, not pixels, so the same brush-stroke plays crisp on a 6.1" phone, an iPad, and a 4K desktop. Author on the largest canvas (desktop, 1440pt reference) with all your fine detail; the runtime scales each effect to its per-device anchor box (published in doc 10's geometry table). Durations do NOT scale — 400ms is 400ms everywhere, so the feel is identical.
- **The caveat: raster art** (PNG textures, sprite sheets) scales *down* cleanly but is heavy and can shimmer when scaled between densities. Supply @3x and let the runtime downsample — or better, keep textures subtle and let vectors carry the detail. If an effect only works as heavy raster animation, it fails the calm test anyway.
- **Widgets & lock screen render smaller and simpler**: your effects don't run there (WidgetKit is static; only your colors/tints apply), and lock-screen widgets are OS-forced monochrome. Design widget tints as a simplification of your palette, not a separate design.

## 4. The complete customization inventory

Everything below is skinnable. Anything not listed is locked (rule 8). Ranges/validation per item live in doc 10.

### 4.1 Foundation (applies everywhere)
- **Full color system**: surfaces (base/elevated/sunken), text tiers, borders, accent + muted accent, per-status background & accent tints (within hue families), event blue, priority tier colors — separately for light and dark mode.
- **Typography**: display/body font families (licensed, embedded), the mono "identity" font for dates/times, weight mapping. Sizes locked to the published scale.
- **Radius language**: tight/button/card radii within ranges; pill stays fully round.
- **Background atmosphere**: app-wide background color/gradient/texture per screen group; optional ambient decoration layer (must sit behind content, pass the calm test).
- **Iconography tinting**: recolor the stock icon set; swapping glyph shapes is v2.
- **Sounds** (per-hook, user's master toggle rules): complete, delete, undo, add, recurring check, toast, notification.

### 4.2 The task card (the heart — most-reviewed surface)
- Card surface, border style/width, radius, per-status treatments — including **distinct completed-card designs per status** (six states incl. deleted).
- The accent bar's rendering (width in range, texture — e.g., brush-drawn) as long as it stays a left-edge status cue.
- **Frame decoration layer**: art around/behind the card (branches, ink borders) strictly outside the content zone.
- Pill styling: background alpha, border, radius (auto-contrast text is enforced for you).
- Priority badge look (1st/2nd/3rd wording locked).

### 4.3 Motion — the full animation hook list
Every hook accepts either **parametric motion** (choose curve/duration/direction within ranges) or a **creator Lottie effect** (hard duration caps, overlay layer, never reflows content). One effect per hook.

| Hook | Fires when | Cap |
|---|---|---|
| `effect.complete` | task swiped/checked complete | 600ms |
| `effect.delete` | task deleted | 600ms |
| `effect.undo` | undo restores a task | 400ms |
| `effect.add` | new task lands in the list | 600ms |
| `effect.cardEnter` / `effect.cardExit` | card enters/leaves the list (regroup, filter) | 650ms |
| `effect.sheetOpen` / `effect.sheetClose` | any sheet/window opens/closes (your "scroll unrolls" hook) | 400ms / 300ms* |
| `effect.recurringCheck` | daily recurring row checked | 500ms |
| `effect.toast` | undo toast appears | 300ms |
| `effect.fabPress` | FAB pressed | 250ms |
| `effect.emptyTrash` / `effect.clearAll` | bulk cascade completes (ONE effect for the batch) | 800ms |
| `effect.hover.{cardType}` | pointer enters a card (web/desktop) — **may loop** while hovered (the blossom-bud case); must idle gracefully | loop ≤2s cycle |
| `effect.hoverAction` | hover over the complete/delete edge zones | 400ms |
| `effect.calendarToday` | calendar opens on today | 500ms |
| `effect.dayOpen` | day-timeline page opens | 400ms |
| `effect.notificationBounce` | in-app toast/notification arrival — replace or **cancel** the stock bounce | 400ms |

\* Sheet-close caps are tight because the page underneath is blocked until close finishes — exit decoration (ink trail, petal fall) plays over the *list*, after the close, via `effect.cardExit`.

### 4.4 Screen-by-screen
- **Task list**: section header type/color, sticky header surface, skeleton placeholder look, factual empty-state text color (wording locked), search bar + filter chip styling.
- **Sheets/forms** (quick-add, edit, import, styles): sheet surface/border/grabber, input fields, chips, swatch ring, the one primary button, backdrop dim color/opacity.
- **Daily**: recurring pill-row styling, check circles, "Done" group treatment, ghost add-row.
- **Calendar month/year**: day-cell tint, today marker shape (circle locked as *a* shape but restylable), status dots/named bars, event ring/dashed bars, count text colors, weekday/header type, year-block styling.
- **Day timeline**: hour ruler font/color, hairlines, event block surface/left-bar, task row surface, check circle, now-line color/dot.
- **Tab bar / nav rail**: surface, active/inactive tints, indicator treatment; (icon glyph swaps v2).
- **Toasts**: surface, radius, text, entrance via `effect.toast`.
- **FAB**: fill, icon tint, shadow within range, press effect.
- **Settings**: accent-driven rows/chips inherit foundation only — no per-element art (trust surface).
- **Auth screens**: background only.
- **Widgets (home/lock)**: color/tint mapping of the stock layouts (see §3 constraints).
- **Marketplace/storefront cards**: your pack's own cover art, of course.

### 4.5 Explicitly out of scope for packs (v2 candidates)
Icon glyph replacement · app icon swaps · per-screen layout variants · custom sounds longer than 2s · effects on the static widget canvases · anything requiring code.

## 5. Review: what "we will check" means

Machine validation first (schema, ranges, contrast, durations, file sizes, no-code) — then **human curation** judges the calm test: is the card readable in half a second? Does any effect delay or obscure a state change? Does it still *feel* like Multitask? Failures come back with specific notes ("badge art crowds the due date — shrink or move it"), not rejections without reasons. Approved packs are signed; only signed packs install. That pipeline is what lets creative freedom be this wide.

---

*Draft status: inventory + rules complete. TODO for the marketplace build-out: per-hook GIF examples, a starter `.mtstyle` template pack, and the reference art/code gallery.*
