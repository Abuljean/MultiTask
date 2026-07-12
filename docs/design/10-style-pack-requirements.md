# Style Pack Requirements Document (RD)

> The formal, implementation-ready requirements for style packs and the marketplace. Companion to `09-style-packs.md` (the decisions/spec narrative); THIS document is what a future session builds from and what pack designers receive. Requirements are numbered for reference. Status: approved by the developer 2026-07-11; build order remains END-PHASE (after all functionality + platforms ship).

---

## 1. Definitions

- **Pack** — a `.mtstyle` file: a ZIP containing declarative visual overrides. Never contains executable code.
- **Applying** — activating a pack so its overrides flow through the theme system (`lib/theme/*`), the single TaskCard, the swipe engine, and the other themed components.
- **Entitlement** — a server-side record that a Supabase account owns a pack.
- **Validator** — the import-time checker that accepts or rejects a pack file.

## 2. Pack file format requirements

- **FMT-1** A pack is a ZIP archive with the extension `.mtstyle`, at most **15 MB**.
- **FMT-2** Root must contain `manifest.json` with exactly: `schema_version` (integer), `id` (reverse-DNS string, e.g. `dev.abuljean.cherry-blossoms`), `name`, `author`, `version` (semver), `description`, `platforms` (array of `ios|android|web|desktop|watch|widgets`), `previews` (file list).
- **FMT-3** Optional root files: `tokens.json`, `motion.json`; optional folders: `assets/`, `fonts/`, `previews/`, `sounds/` (§4.7), `effects/` (§4.6), `icons/` (alternate app icons per §4.2). Anything else → reject.
- **FMT-4** `tokens.json` must provide **both** `light` and `dark` variants for every color it overrides. Partial single-mode packs → reject.
- **FMT-5** Fonts must be TTF/OTF with a `license` field per font in the manifest. Fonts without license attestation → reject.
- **FMT-6** Images: PNG/WebP (≤2048px longest side, @1x/@2x/@3x sets) or SVG (no `<script>`, no external refs). Previews: `cover.png` (1024×1024) mandatory for marketplace listing; `preview.mp4` (≤20s, ≤10 MB) or `preview.gif` optional but required for marketplace.
- **FMT-8** Effects (`effects/`): Lottie JSON (self-contained, no external refs/images-by-URL, no expressions escaping the composition, ≤300 KB each) or sprite sheet (PNG ≤2048px + timing JSON, fps ≤60, loop=false). Each effect declares its hook (§4.6) in the manifest; unknown hooks → reject.
- **FMT-9** Sounds (`sounds/`): MP3/AAC/WAV, ≤2s, ≤200 KB each, hook-named per §4.7.
- **FMT-7** `schema_version` newer than the app supports → reject with "update the app"; older versions migrate silently.

## 3. Validator requirements (import-time, on-device AND at marketplace submission)

- **VAL-1** Structural: zip integrity, manifest completeness, no disallowed file types (no .js/.html/executables of any kind).
- **VAL-2** Every color pair implied by token overrides passes **WCAG 4.5:1** for text roles (3:1 for large-text-only roles). Fail → reject with the specific pair named.
- **VAL-3** The four status accents remain **pairwise distinguishable**: minimum ΔE (CIE76) of 20 between any two of ongoing/urgent/overdue accents in both modes.
- **VAL-4** Every motion value inside the ranges of §4.4. Out-of-range → clamp with a warning at import (not rejection).
- **VAL-5** Background art passes the automated busyness ceiling (mean local contrast of the texture ≤ threshold to be tuned with the first packs) — plus **manual developer approval ("the calm test") for marketplace listing**.
- **VAL-6** Size budgets per FMT-1/FMT-6/FMT-8/FMT-9.
- **VAL-7** Effects: duration ≤ the per-hook cap (§4.6), renders within the overlay bounds, no Lottie external refs. Over-duration → reject with the hook named.
- **VAL-8** Sounds: length/size per FMT-9 (reject); loudness outside −16 LUFS ±3 → warn.
- **VAL-9** Hover parameters within §4.5 ranges → clamp with warning (same policy as motion).

## 4. Customization surface — the complete inventory

### 4.1 Token overrides (`tokens.json`)
Everything in `lib/theme/tokens.ts` `ThemeColors` (light + dark), plus:
- **Fonts:** `font.title`, `font.body`, `font.mono` (references into `fonts/`; Dynamic Type scaling mandatory), per-role weight overrides within 400–700.
- **Radii:** `tight` 4–8, `button` 8–14, `card` 8–24 (pill stays full-round).
- **Pill treatment:** background opacity (light 0.10–0.25, dark 0.18–0.35), border opacity, border width 0–1.5.
- **Priority tier colors** (3 tiers × 2 modes) and tier LABELS' style (weight/caps — text itself locked).
- **Shadows:** color/opacity/radius for the three shadowed elements (FAB, toast, sheets) within calm bounds (opacity ≤0.3).
- **Backdrop dim** behind sheets/windows: 0.25–0.5.
- **Selection & focus (web/desktop):** text-selection color, focus-ring color (contrast-validated).
- **Skeleton tint** (loading placeholders) and pull-to-refresh spinner tint.

### 4.2 App identity (per-pack, optional)
| Item | Notes |
|---|---|
| `icon.ios` / `icon.android` | Alternate app icon shipped with the pack (iOS alternate-icon API; Android adaptive). Requires app-side registration per release, so marketplace packs may lag app updates — flagged at listing. |
| `splash.background` | Splash background color only (image stays the app's) |

### 4.3 Asset slots (`assets/`, all optional)
| Slot key | Renders as | Spec |
|---|---|---|
| `card.design.{status}` | **A complete card design per status** — statuses: `default`, `ongoing` (active), `urgent`, `overdue`, `completed`, `deleted`. Each status block may set ALL of: background texture, surface color, border, accent bar, corner ornament, status glyph, title/date treatment, hover effect (§4.5), and entrance/exit effect hooks (§4.6). A pack may style one status or all six; unstyled statuses fall back to tokens. | per-status; text legibility + status distinguishability (VAL-2/3) still enforced on the RESULT |
| `card.texture.{status}` | Card background art per status (shorthand when only the texture changes) | full-bleed under content, ≤8% visual weight |
| `card.corner.{status?}` | Corner ornament, optionally per status | ≤48×48pt |
| `card.accentBar.{status?}` | The status bar treatment, optionally per status | width 2–6, solid/pattern/gradient |
| `card.border.{status?}` | Card border style, optionally per status | solid/dashed/none, 0–2pt |
| `card.strikethrough` | Completed title strike | color/thickness 1–2/style straight or hand-drawn squiggle asset |
| `card.dueChip` | Due-date treatment | plain text (default) or chip background |
| `badge.priority.{1,2,3}` | Priority tier badge art | 20pt height |
| `glyph.{check,trash,undo,overdue,plus,search,settings,calendar,daily,tasks}` | Action glyphs + the 5 tab icons (same concept → same glyph rule) | SVG preferred, 20–28pt |
| `tabbar.background` | Tab bar surface treatment | solid/translucent |
| `tabbar.activeTint` | Selected tab color | contrast-validated |
| `background.app` | Screen background | solid/gradient/texture; calm ceiling applies hardest |
| `background.signin` | Sign-in screen background | same rules |
| `section.header` | Section header typography + chevron glyph | h2 role bounds |
| `recurring.row` | Daily pill-row texture/shape | radius 12–999 |
| `recurring.done` | Done-row treatment | fade 0.4–0.7 + optional stamp glyph |
| `recurring.addGhost` | The dashed add-row style | dash pattern/color |
| `event.border` | Event card border pattern | dashed/dotted/solid/decorated strip |
| `event.palette` | Default event color set (the import swatches) | 8–12 swatches |
| `calendar.tile` | Day tile shape/texture | square/rounded/circle |
| `calendar.today` | Today marker | filled circle/ring/underline + optional glyph |
| `calendar.dot` | Task dot shape | dot/diamond/star/mini-glyph ≤8pt |
| `calendar.eventRing` | Event marker shape | ≤8pt hollow shape |
| `calendar.overdueTint` | Overdue-day tint strength | 0.5–1.5× default |
| `calendar.greyLevel` | Non-current month/year grey intensity | within tertiary–secondary band |
| `trail.{complete,delete,restore}` | Swipe/hover trail fill | solid or ≤2-stop gradient or texture |
| `sheet.surface` | Form sheet/window background | texture allowed, calm ceiling |
| `sheet.grabber` | Grabber style | bar/dots/hidden-not-allowed (honesty rule) |
| `toast.surface` | Undo toast background | 9-patch style |
| `empty.{tasks,daily,calendar,search,trash}` | Empty-state glyphs (24pt; copy locked) | monochrome, uses text colors |
| `fab.shape` | circle/squircle/rounded-square | 56pt bounds |
| `fab.fill` | solid/gradient | |
| `notification.color` (Android) | Accent for notifications | |
| `widget.frame` / `widget.background` / `widget.dot` | Widget theming | "subtle shape" only; content layout untouchable |
| `watch.accent` / `watch.rowTint` / `watch.complicationTint` | Watch theming | colors only |

### 4.4 Motion parameters (`motion.json`) — defaults are the shipped, hand-tuned values
| Key | Default | Allowed range |
|---|---|---|
| `swipe.threshold` | 0.1618 of width | 0.12–0.35 |
| `swipe.slideOff.ms` | 240 | 150–500 |
| `swipe.trailIcon.scaleFrom` | 0.85 | 0.6–1.0 |
| `entrance.travel` | 0.6 of width | 0.3–0.8 |
| `entrance.ms` | 647.2 | 200–900 |
| `entrance.overshoot` | 0 (none) | 0–0.25 |
| `entrance.easing` | ease-out cubic | curve library |
| `settle.spring` | damping 26 / stiffness 240 | d 12–30 / k 120–300 |
| `regroup.springDamping` | 0.95 | 0.7–1.0 |
| `regroup.createDelay.ms` | 80 | 0–150 |
| `cascade.staggerMs` | 30 | 15–80 |
| `sheet.open.ms` / `close.ms` | 280 / 260 | 180–400 |
| `reveal.ms` (collapsibles/pickers/filter panel) | 220 | 150–350 |
| `searchReveal.pullPx` | 70 | 40–120 |
| `calendarZoom.out.ms` / `in.ms` | 150 / 220 | 120–350 |
| `calendarZoom.outScale` / `inScale` | 1.4 / 0.7 | 1.2–1.8 / 0.5–0.85 |
| `dayZoom.startScale` | 0.5 | 0.3–0.9 |
| `dayZoom.ms` | 260 | 180–400 |
| `toast.entrance.spring` | snappy (22/260) | d 12–30 / k 120–300 |
| `fab.pressScale` | 0.9 | 0.8–0.95 |
| `completion.effect` | none | built-in effect library (`petals`, `sparkle`, `checkpop`, `confettiMinimal`, none) ≤600ms, OR a creator-authored effect from `effects/` (§4.6) |
| `delete.effect` / `restore.effect` | none | same options |
| `hover.reveal.px` (web) | 88 | 56–120 |
| `hover.reveal.ms` (web) | 180 | 120–300 |

### 4.5 Hover effects (web/desktop — every card type: task, event, recurring row, calendar tile, pack cover)
Declared per card type, optionally per status (so an overdue card can hover differently than a completed one). All parameters, all optional:

| Key | Default | Allowed range |
|---|---|---|
| `hover.lift.px` | 0 | 0–6 (translateY up) |
| `hover.scale` | 1.015 (the shipped whole-card hover) | 1.0–1.03 |
| `hover.tilt.deg` | 0 | 0–2 (subtle 3D tilt toward cursor) |
| `hover.shadowBloom` | 0 | 0–0.25 extra shadow opacity |
| `hover.borderGlow` | none | any pack color, ≤2pt, contrast-checked |
| `hover.overlay` | none | asset slot `card.hover.{status?}` — art that fades in on hover, ≤10% visual weight |
| `hover.ms` | 150 | 120–300 (in AND out — no lingering) |
| `hover.effect` | none | an effect from §4.6 played once on hover-enter, ≤400ms |

Hover is a web/desktop-only layer; native touch ignores it entirely. The calm ceiling applies: hover may acknowledge the cursor, never chase it.

### 4.6 Creator-authored animation effects (`effects/` — declarative only, still NO code)
Creators ship their own animations as **Lottie JSON** (preferred; must be self-contained — no external refs, no expressions that reach outside the composition) or **sprite sheets** (PNG strip + a timing JSON: frame size, fps ≤60, loop=false). Each effect is declared in the manifest with the **hook** it attaches to:

| Hook | Fires when | Max duration |
|---|---|---|
| `effect.complete` | swipe-complete crosses threshold / hover-complete clicked | 600ms |
| `effect.delete` | swipe-delete / hover-delete | 600ms |
| `effect.restore` | restore from completed/deleted | 600ms |
| `effect.undo` | undo toast action taken | 400ms |
| `effect.add` | new task card enters after creation | 600ms |
| `effect.recurringCheck` | daily recurring row checked off | 500ms |
| `effect.toast` | undo toast appears (plays inside the toast) | 300ms |
| `effect.fabPress` | FAB pressed (plays on/around the FAB) | 250ms |
| `effect.emptyTrash` / `effect.clearAll` | bulk cascade finishes (one effect for the batch, not per card) | 800ms |
| `effect.hover.{cardType}` | hover-enter (web/desktop, per §4.5) | 400ms |
| `effect.calendarToday` | calendar opens on the current month (today's tile) | 500ms |

Rules: effects render in an overlay layer and must never move, hide, or reflow the content under them (title + due date stay legible throughout — Rule 2); durations are hard caps enforced by the validator; `AccessibilityInfo` reduced-motion **skips all creator effects entirely** (the underlying state change still animates via the app's reduced fallbacks); one effect per hook per pack.

### 4.7 Sounds (`sounds/` — creator-supplied files, every entry optional, master toggle default OFF)
Creators may ship their **own sound files**: MP3/AAC/WAV, ≤2s each, ≤200 KB each, loudness-normalized to −16 LUFS (validator checks length/size; loudness warned, not rejected). Hooks: `complete`, `delete`, `undo`, `add`, `recurringCheck`, `toast`, `notification` (notification sound must also fit OS notification-sound limits: ≤30s iOS, packaged per-platform). The user's Sounds toggle in Settings is master — OFF by default, and it always overrides packs. No sound may play more than once per user action (the bulk cascade plays ONE sound, not N).

### 4.8 Geometry constants (NOT customizable — published so designers size assets correctly)
Card: padding 16, radius 16 (unless overridden within range), accent bar 3×full-height. Pills: height 20, radius full. FAB: 56Ø. Calendar day cell: 68pt tall, task dots 6pt, event ring 7pt. Toast: radius 16, bottom offset 64. Type scale: 32/24/18/15/12 (weights 700/600/600/400/500). Spacing scale: 4/8/12/16/20/24/32/40/48. Phone canvas: 360–430pt wide; supply 3x assets.

### 4.9 Locked (never customizable)
Status semantics & non-color encodings (accent bar/icons/strikethrough), layout structure & density, copy, tap targets ≥44pt, notification content, reduced-motion collapse (OS setting always wins over pack motion), sign-in/auth UI beyond background.

## 5. In-app requirements

- **APP-1** Settings gains a low-key **"Styles"** row near the bottom → styles screen: applied pack, owned packs grid, "Import .mtstyle" (file picker), "Back to default" always visible.
- **APP-2** Below the styles list, smaller: **"Browse the marketplace"** text link → the marketplace page.
- **APP-3** Applying a pack is instant, per-account (synced via user metadata `active_style_pack`), and never requires restart.
- **APP-4** Marketplace page: grid of packs (cover, name, author, price); detail page with video/GIF preview, description, screenshots (light+dark), and **Get** (free/owned → install) or **Buy on the website** (link-out per PAY-2).
- **APP-5** A pack that fails to load at runtime (missing asset, corrupt) falls back to default theme silently + one toast; never a crash.
- **APP-6** All pack rendering flows through the existing boundaries: tokens/`use-theme`, TaskCard, `swipeable-row(.web)`, pill-colors, `animate-layout`. No screen may special-case a pack.

## 6. Marketplace backend & payments (build order: after first dev-authored packs)

- **PAY-1** Supabase tables: `style_pack` (id, semver, price_cents nullable=free, storage path, preview paths, status draft/listed/delisted, author_uuid) and `pack_entitlement` (user_uuid, pack_id, source: free|purchase|promo, created_at) — RLS: packs readable when listed; entitlements per-user.
- **PAY-2** **Purchases happen on the WEBSITE** (decision 2026-07-11): Stripe Checkout (guardian-owned Stripe account initially), webhook → insert `pack_entitlement`. The apps only *read* entitlements and download owned packs from storage. In-app purchase links: allowed in the US post-Epic rulings; regions where link-outs are restricted show the gallery without the link. Re-verify store rules at ship time.
- **PAY-3** Downloads of paid packs use short-lived signed storage URLs gated by entitlement (an RPC or edge function).
- **PAY-4** Phase 2 (user submissions): uploader flow + automated VAL-* + manual review queue + takedown/report path + Stripe Connect payouts with tax handling. **Do not open submissions before payouts and moderation exist.**

## 7. Submission requirements (for the public designer guide)

A submission = the `.mtstyle` + `cover.png` + preview video/GIF + light & dark screenshots of the task list and calendar + license attestation for every asset/font + author contact. Acceptance = VAL-1..9 pass + calm-test approval + name/content policy (no trademarks, no offensive content). Rejections state the failed requirement number.

The designer guide page also publishes the **AI designer prompt** (`11-style-pack-ai-designer-prompt.md`) — a copyable prompt that teaches any AI the app's full visual design and customization surface so it can co-design a valid pack.

## 8. Non-functional requirements

- **NFR-1** Applying a pack must not add >16ms to task-list frame times on a mid-range phone (texture memory budgeted: ≤24 MB decoded per pack).
- **NFR-2** Packs work fully offline once installed (bundled into local storage; entitlement checked opportunistically, never blocking).
- **NFR-3** Dynamic Type, VoiceOver, and reduced-motion behavior are identical under any pack.
- **NFR-4** Uninstalling a pack removes all its files; the default theme is not a pack and cannot be removed.

## 9. Open items (decide during the build phase)

Pricing tiers; live try-on preview (v2); animated card TEXTURES (looping background motion — still v2; one-shot effects are v1 per §4.6); watch theming depth; whether the web marketplace page doubles as a public gallery. (Creator effects and sounds were promoted from v2 to v1 format features on 2026-07-11 — developer decision.)
