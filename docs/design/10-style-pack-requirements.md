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
- **FMT-3** Optional root files: `tokens.json`, `motion.json`; optional folders: `assets/`, `fonts/`, `previews/`. Anything else → reject.
- **FMT-4** `tokens.json` must provide **both** `light` and `dark` variants for every color it overrides. Partial single-mode packs → reject.
- **FMT-5** Fonts must be TTF/OTF with a `license` field per font in the manifest. Fonts without license attestation → reject.
- **FMT-6** Images: PNG/WebP (≤2048px longest side, @1x/@2x/@3x sets) or SVG (no `<script>`, no external refs). Previews: `cover.png` (1024×1024) mandatory for marketplace listing; `preview.mp4` (≤20s, ≤10 MB) or `preview.gif` optional but required for marketplace.
- **FMT-7** `schema_version` newer than the app supports → reject with "update the app"; older versions migrate silently.

## 3. Validator requirements (import-time, on-device AND at marketplace submission)

- **VAL-1** Structural: zip integrity, manifest completeness, no disallowed file types (no .js/.html/executables of any kind).
- **VAL-2** Every color pair implied by token overrides passes **WCAG 4.5:1** for text roles (3:1 for large-text-only roles). Fail → reject with the specific pair named.
- **VAL-3** The four status accents remain **pairwise distinguishable**: minimum ΔE (CIE76) of 20 between any two of ongoing/urgent/overdue accents in both modes.
- **VAL-4** Every motion value inside the ranges of §5. Out-of-range → clamp with a warning at import (not rejection).
- **VAL-5** Background art passes the automated busyness ceiling (mean local contrast of the texture ≤ threshold to be tuned with the first packs) — plus **manual developer approval ("the calm test") for marketplace listing**.
- **VAL-6** Size budgets per FMT-1/FMT-6.

## 4. Customization surface — the complete inventory

### 4.1 Token overrides (`tokens.json`)
Everything in `lib/theme/tokens.ts` `ThemeColors`, plus: `monoFont`/`titleFont` (font family references into `fonts/`), radius overrides (`tight` 4–8, `button` 8–14, `card` 8–24, pill fixed at full-round), pill palette treatment (opacity levels), priority tier colors (3 tiers × 2 modes).

### 4.2 Asset slots (`assets/`, all optional)
| Slot key | Renders as | Spec |
|---|---|---|
| `card.texture.{status}` | Card background art per status (default/ongoing/urgent/overdue/completed) | full-bleed under content, ≤8% visual weight over the surface color |
| `card.corner` | Corner ornament | ≤48×48pt, one corner |
| `badge.priority.{1,2,3}` | Priority tier badge art | 20pt height |
| `glyph.{check,trash,undo,overdue,fab}` | Action/status glyphs | SVG preferred, 22–26pt |
| `background.app` | App/screen background | solid/gradient/texture; the calm ceiling applies hardest here |
| `calendar.dot`, `calendar.eventRing` | Day-cell markers | ≤8pt shapes |
| `trail.{complete,delete,restore}` | Swipe/hover trail fill | solid or ≤2-stop gradient |
| `toast.surface` | Undo toast background | 9-patch style |
| `widget.frame` | Widget border/frame art | "subtle shape" only; content layout untouchable |
| `watch.accent` | Watch tint | color only |

### 4.3 Motion parameters (`motion.json`) — defaults are the shipped, hand-tuned values
| Key | Default | Allowed range |
|---|---|---|
| `swipe.threshold` | 0.1618 of width | 0.12–0.35 |
| `swipe.slideOff.ms` | 240 | 150–500 |
| `entrance.travel` | 0.6 of width | 0.3–0.8 |
| `entrance.ms` | 647.2 | 200–900 |
| `entrance.overshoot` | 0 (none) | 0–0.25 |
| `settle.spring` | damping 26 / stiffness 240 | d 12–30 / k 120–300 |
| `regroup.springDamping` | 0.95 | 0.7–1.0 |
| `cascade.staggerMs` | 30 | 15–80 |
| `sheet.open.ms` / `close.ms` | 280 / 260 | 180–400 |
| `reveal.ms` (collapsibles/pickers) | 220 | 150–350 |
| `calendarZoom.out.ms` / `in.ms` | 150 / 220 | 120–350 |
| `dayZoom.startScale` | 0.5 | 0.3–0.9 |
| `completion.effect` | none | one of the built-in effect library (`petals`, `sparkle`, `checkpop`, none), ≤600ms |
| `hover.reveal.px` (web) | 88 | 56–120 |

### 4.4 Geometry constants (NOT customizable — published so designers size assets correctly)
Card: padding 16, radius 16 (unless overridden within range), accent bar 3×full-height. Pills: height 20, radius full. FAB: 56Ø. Calendar day cell: 68pt tall, task dots 6pt, event ring 7pt. Toast: radius 16, bottom offset 64. Type scale: 32/24/18/15/12 (weights 700/600/600/400/500). Spacing scale: 4/8/12/16/20/24/32/40/48. Phone canvas: 360–430pt wide; supply 3x assets.

### 4.5 Locked (never customizable)
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

A submission = the `.mtstyle` + `cover.png` + preview video/GIF + light & dark screenshots of the task list and calendar + license attestation for every asset/font + author contact. Acceptance = VAL-1..6 pass + calm-test approval + name/content policy (no trademarks, no offensive content). Rejections state the failed requirement number.

## 8. Non-functional requirements

- **NFR-1** Applying a pack must not add >16ms to task-list frame times on a mid-range phone (texture memory budgeted: ≤24 MB decoded per pack).
- **NFR-2** Packs work fully offline once installed (bundled into local storage; entitlement checked opportunistically, never blocking).
- **NFR-3** Dynamic Type, VoiceOver, and reduced-motion behavior are identical under any pack.
- **NFR-4** Uninstalling a pack removes all its files; the default theme is not a pack and cannot be removed.

## 9. Open items (decide during the build phase)

Pricing tiers; live try-on preview (v2); Lottie/animated textures (v2); sounds (v2, off by default); watch theming depth; whether the web marketplace page doubles as a public gallery.
