# Style Packs ("Skins") — Specification & Designer Guide

> Developer decisions captured 2026-07-11. Style packs are the END-PHASE feature (built after all functionality ships), but this spec exists NOW so (a) the architecture keeps protecting it, (b) the first packs can be designed on paper early, (c) any future session can build it without re-deriving. Read with `03-layout-type-color.md` (tokens) and `05-motion.md` (final motion values).

## 1. What a style pack is

A **declarative bundle** of visual overrides — colors, textures, fonts, animation parameters, glyphs — that reskins the app without changing behavior. Example: "Cherry Blossoms" tints surfaces warm-pink-white, gives task cards a petal-textured edge, makes completed cards drift off with a petal-fall easing, and swaps the FAB glyph for a blossom.

**Hard boundaries (never customizable — these protect the product):**
- Status SEMANTICS: the four states must stay instantly distinguishable and never color-alone (accent bar / icon / strikethrough encodings stay).
- Contrast minimums (4.5:1 text) — packs are VALIDATED at import; failing packs are rejected.
- Layout structure, density, tap-target sizes, copy/microcopy, navigation.
- Reduced-motion: when the OS setting is on, ALL pack animations collapse to the app's reduced-motion behavior. Non-negotiable.
- No executable code of any kind in a pack. Declarative data + assets only. (Security: packs come from strangers eventually.)
- Background art must pass a "calm test": the developer approves every marketplace background; busy/animated backgrounds are rejected (the brief's "definitely cannot be too distracting").

## 2. The complete customizable inventory

### Colors & surfaces (via token overrides — light AND dark variants required)
| Item | Notes |
|---|---|
| App background (`surface`, `surface-sunken`) | Solid color, subtle gradient, or tiled texture ≤ 8% opacity |
| Card background (`surface-elevated`) + per-status card surfaces | The 4 status *backgrounds* may restyle; status *accents* may retint but must stay mutually distinguishable (validator checks pairwise distance) |
| Accent color + muted accent | |
| Text primary/secondary/tertiary | Contrast-validated |
| Border subtle / pill palette treatment | |
| Event accent default | |

### Task card
| Item | Notes |
|---|---|
| Card texture/art | Edge decorations, corner art, paper/fabric textures (9-patch-style or full bleed under content) |
| Corner radius | Range 8–24 |
| Accent bar treatment | Width 2–6px, solid/pattern |
| Priority badge art | 3 tiers, glyph or image |
| Overdue warning glyph | |
| Completed treatment | Strikethrough style, content fade level (0.4–0.7) |
| Title/body font | Embedded font, must support Dynamic Type scaling |
| Mono accent font (due dates) | |

### Animations (parametric — designers set values within ranges)
| Animation | Current (default) value | Customizable range |
|---|---|---|
| Swipe slide-off | 240ms ease-out | 150–500ms, easing from curve library |
| Regroup entrance | 60% width travel, 647.2ms ease-out, no bounce | travel 30–80%, 200–900ms, overshoot 0–25% ("bounce vs no bounce, speed, how it leaves and enters") |
| Release snap-back spring | damping 26 / stiffness 240 | damping 12–30, stiffness 120–300 |
| Swipe trail reveal | solid color + icon | trail color/gradient, icon glyph, icon scale-in curve |
| Completion moment | (none beyond slide) | optional overlay effect ≤ 600ms: particle/glyph burst from a small effect library (petals, sparkles, checkpop) — NOT arbitrary video |
| Bulk-clear cascade stagger | 30ms/card | 15–80ms |
| List regroup settle | LayoutAnimation spring 0.95 | 0.7–1.0 |
| Sheet open/close | 280ms out / 260ms in | 180–400ms |
| Picker/collapsible reveal | 220ms ease-in-out | 150–350ms |
| Calendar month↔year zoom | 150ms out / 220ms in | 120–350ms |
| Day-page zoom | 0.5→1, 260ms | scale start 0.3–0.9 |
| Toast entrance | spring snappy | spring params in range |
| FAB press | scale 0.9 | 0.8–0.95 |

### Screen-specific
| Surface | Items |
|---|---|
| Daily view | Recurring row texture/shape, done-state treatment |
| Calendar | Day tile shape (square/rounded/circle), today marker style, task dot shape (dot/diamond/mini-glyph), event ring shape, weekday label style |
| Events | Border pattern (dashed/dotted/decorated) |
| FAB | Shape, glyph, shadow |
| Undo toast | Surface, radius |
| Empty states | The small 24px glyph only (copy is locked) |
| Tab bar | Icon set (mapped per concept), active tint |
| Sign-in screen | Background only |

### Cross-device (each optional per pack; platforms ignore missing sections)
| Device | Customizable |
|---|---|
| Widgets (home/lock) | Frame/border art, tint, dot shapes — "subtle shape" only; content layout is fixed |
| Watch | Accent + row tint only |
| Desktop/web | Same as phone + hover-reveal icon art, window chrome tint |

### Sounds (v2, off by default)
Completion chime, ≤ 1s, volume-capped.

## 3. Pack format — DECIDED: `.mtstyle` = a ZIP with a manifest

```
cherry-blossoms.mtstyle  (a ZIP, renamed)
├── manifest.json     — schema_version, id, name, author, version, description,
│                       supported_platforms, preview file list
├── tokens.json       — color/typography/radius overrides (light + dark)
├── motion.json       — animation parameters (validated against ranges above)
├── assets/           — textures/glyphs: PNG/WebP @1x/@2x/@3x or SVG
├── fonts/            — TTF/OTF (must embed license metadata)
└── previews/         — cover.png + preview.mp4 or .gif (for the marketplace)
```

- **Import path:** in-app (Settings → Styles → Import) via the file picker, or one-tap install from the marketplace. The importer unzips, validates schema version, ranges, contrast, file sizes, then stores the pack locally (and records ownership server-side for purchases).
- **Budgets:** pack ≤ 15 MB; single texture ≤ 2048px; preview video ≤ 20s.
- **Versioning:** `schema_version` in manifest; the app rejects newer schemas with a friendly "update the app" message; older schemas migrate.
- **No code. Ever.** JSON + media only. Anything else fails validation.

## 4. Where it lives in the app (developer decisions)

- **Settings → near the bottom:** a "Styles" row (deliberately low-key). Opens the styles screen: currently-applied pack, owned packs grid, Import button.
- **Under the styles list, smaller: "Browse the marketplace"** — a quiet text link, not a banner (the marketplace is never the app's focus).
- **The marketplace is its own full page:** grid of packs, each with cover art, name, author, price; tapping opens a detail page with the video/GIF preview, description, and install/buy. Search/filter by tag comes later.
- Applying a pack = instant, one tap, with a "Back to default" always visible. Previewing before applying: detail page's media serves this in v1; live try-on is v2.

## 5. Marketplace mechanics (build AFTER first developer-authored packs)

- **Phase 1 — developer packs only:** built into the app or downloaded from a Supabase storage bucket + `style_pack` table (id, version, price_tier, file path, preview paths). No user uploads.
- **Phase 2 — user submissions:** creators upload `.mtstyle` + previews; every pack goes through review (automated validation + developer approval — the calm test) before listing. Reporting + takedown path required.
- **Payments — IMPORTANT CONSTRAINT:** selling digital goods inside an iOS app REQUIRES Apple In-App Purchase (Apple takes 15–30%); Android similarly via Play Billing. Creator payouts on top of that need real infrastructure (Stripe Connect or similar) + tax handling. Phase 1 should be free or single-developer paid packs via IAP; the creator-payout marketplace is a serious later project. Do not promise creators revenue before this is solved.
- Refunds follow store rules; ownership is recorded per Supabase account so purchases roam across devices.

## 6. Designer guide (what pack authors get)

A public-facing doc (generated from this file when the marketplace opens) containing:
- The inventory tables above (what's customizable, what's locked).
- **Exact geometry:** card padding 16 / radius 16 / accent bar 3px; pill height 20 radius 999; FAB 56; calendar day cell 68px with 6px dots and 7px event ring; toast radius 16 bottom-offset 64; type scale 32/24/18/15/12; spacing scale 4–48. Screens are 360–430pt wide on phones — design textures for 3x.
- **Motion defaults + allowed ranges** (table above) with guidance: springs for user-driven motion, curves for autonomous; the reduced-motion collapse is automatic.
- **The taste rules:** calm beats loud; backgrounds must not compete with text; status must stay readable at a glance; test in light AND dark (both variants mandatory).
- **Submission requirements:** the `.mtstyle` zip, cover.png (1024×1024), preview video ≤ 20s or GIF, light+dark screenshots of the task list, license attestation for all assets/fonts.

## 7. Open items the developer should decide later (flagged, not blocking)

1. **Pricing model** for phase 1 packs (free / one-time IAP tiers).
2. **Live preview** ("try before apply") — v1 media-only vs. v2 in-app try-on.
3. **Sound design** inclusion at all.
4. **Lottie/animated textures** — powerful but heavy; v2 decision.
5. **Pack + widget interplay on watch** — how minimal is watch theming.
6. Whether the WEB marketplace page doubles as a public gallery (marketing surface).
