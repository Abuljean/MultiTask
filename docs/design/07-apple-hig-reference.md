# The Complete Apple UI/UX Design Reference
### A comprehensive guide to designing apps for iPhone, iPad, Mac, Apple Watch, Apple TV, and Apple Vision Pro

> **Note:** This is an original reference guide synthesizing the concepts covered by Apple's Human Interface Guidelines (HIG) and related design resources, written in plain language. It is **not** a copy of Apple's documentation. Always consult the official HIG at https://developer.apple.com/design/human-interface-guidelines for authoritative, up-to-date guidance — Apple updates it continuously.
>
> Current as of mid-2026, covering the Liquid Glass design era (iOS 26, iPadOS 26, macOS Tahoe 26, watchOS 26, tvOS 26, visionOS 26).

---

## Table of Contents

1. [How the HIG Is Organized](#1-how-the-hig-is-organized)
2. [Core Design Principles](#2-core-design-principles)
3. [Liquid Glass — Apple's Current Design Language](#3-liquid-glass)
4. [Designing for Each Platform](#4-designing-for-each-platform)
   - iOS (iPhone) · iPadOS · macOS · watchOS · tvOS · visionOS
5. [Foundations](#5-foundations) — accessibility, icons, color, typography, layout, motion, materials, writing, privacy, and more
6. [Patterns](#6-patterns) — onboarding, navigation, search, settings, notifications, modality, feedback, and more
7. [Components](#7-components) — bars, buttons, menus, sheets, controls, and every standard UI element
8. [Inputs](#8-inputs) — touch, keyboard, pointer, Digital Crown, eyes/hands, voice, game controllers
9. [Technologies](#9-technologies) — widgets, Live Activities, Siri, Apple Pay, CarPlay, App Clips, and more
10. [App Icons & App Store Presence](#10-app-icons--app-store-presence)
11. [Accessibility Deep Dive](#11-accessibility-deep-dive)
12. [Practical Design Process & Checklists](#12-practical-design-process--checklists)
13. [Official Resources & Links Directory](#13-official-resources--links-directory)

---

## 1. How the HIG Is Organized

Apple's Human Interface Guidelines is a single unified document (since 2022 — previously each platform had its own HIG) organized into six sections:

| Section | What it covers |
|---|---|
| **Platforms** | What makes each Apple platform distinct: iOS, iPadOS, macOS, tvOS, visionOS, watchOS |
| **Foundations** | Universal building blocks: accessibility, app icons, branding, color, dark mode, icons, images, immersive experiences, inclusion, layout, materials, motion, privacy, right-to-left, SF Symbols, spatial layout, typography, writing |
| **Patterns** | Common user flows and behaviors: launching, onboarding, entering data, searching, settings, feedback, modality, undo, notifications, etc. |
| **Components** | The standard UI element catalog: bars, buttons, menus, sheets, pickers, indicators, etc. |
| **Inputs** | Every way people interact: touch, gestures, keyboards, pointers, Digital Crown, eyes, hands, voice, remotes, game controls |
| **Technologies** | Apple frameworks with design implications: Siri, Apple Pay, widgets, Live Activities, CarPlay, HealthKit, iCloud, App Clips, machine learning, etc. |

The golden rule of the whole document: **use the system frameworks (SwiftUI, UIKit, AppKit) and standard components wherever possible.** They give you platform behaviors, accessibility, Dark Mode, Dynamic Type, localization, and future design updates (like Liquid Glass) largely for free. Deviate deliberately, not accidentally.

---

## 2. Core Design Principles

### The classic three (iOS 7 era → 2025)
These shaped Apple design for over a decade and still matter:

- **Clarity** — Text is legible at every size, icons are precise, adornments are subtle, and functionality motivates every element. Negative space, color, and typography communicate hierarchy.
- **Deference** — The UI helps people understand and interact with content, but never competes with it. Content fills the screen; translucency and blur hint at what's beneath.
- **Depth** — Distinct visual layers and realistic motion convey hierarchy, impart vitality, and make navigation understandable.

### The current three (Liquid Glass era, iOS 26+)
Apple reframed its principles around the 2025 redesign:

- **Hierarchy** — Establish clear visual hierarchy where controls and interface elements float above and distinguish themselves from the content beneath. Importance is communicated through depth, elevation, and material — not just size and color.
- **Harmony** — Align software with the concentric, rounded geometry of Apple hardware. Interface shapes echo device corners; capsule-shaped controls mirror the physical form. Software and hardware feel like one continuous object.
- **Consistency** — Adopt platform conventions so the design adapts continuously across window sizes, displays, and devices without forcing pixel-identical uniformity. Consistency means predictability, not sameness.

### Timeless supporting principles
- **Aesthetic integrity** — appearance should match the app's purpose (a banking app shouldn't look like a game).
- **Direct manipulation** — people interact with content itself, not abstractions of it; results are immediate and visible.
- **Feedback** — every action gets an acknowledgment: highlights, haptics, sounds, animation, progress indicators.
- **Metaphors** — familiar real-world and platform metaphors (switches toggle, sliders slide, pages swipe) reduce learning.
- **User control** — people, not apps, are in charge. Make actions reversible, confirm destructive ones, never take over the experience uninvited.

---
## 3. Liquid Glass

Announced at WWDC 2025 and shipping across all Apple platforms in the "26" OS generation, **Liquid Glass** is Apple's most extensive software redesign ever — a unified design language spanning iPhone, iPad, Mac, Apple Watch, Apple TV, and Vision Pro. It draws lineage from Mac OS X's Aqua, iOS 7's real-time blurs, the Dynamic Island, and visionOS's glass-based interface.

### What it is
- A **digital "meta-material"** that dynamically bends, refracts, and shapes light in real time, rather than imitating a physical material literally.
- It behaves like a **lightweight liquid**: controls flex, energize with light on touch, merge and split with gel-like elasticity, and "materialize" in/out by modulating light-bending rather than simply fading.
- It is **adaptive**: the material samples the content behind it and shifts between light and dark appearances, adjusts tint, and increases opacity when legibility demands it.

### Structural ideas
- **Content layer vs. glass layer.** Your app's content (photos, text, video, maps) stays flat, opaque, and edge-to-edge. Navigation and controls (tab bars, toolbars, buttons, sliders) float above it on Liquid Glass. Never put glass on glass — don't stack Liquid Glass elements on top of each other.
- **Controls float and shrink.** Tab bars and toolbars are now floating capsules that can minimize as you scroll, letting content extend beneath them, then re-expand when you scroll back or tap.
- **Concentricity.** Corner radii of UI elements nest concentrically with the device's physical corners and with each other. Capsule shapes dominate touch platforms; macOS keeps rounded rectangles for small/dense controls and reserves capsules and the new X-Large size for prominent actions.
- **Scroll edge effects.** Instead of hard bar boundaries, content softly blurs/fades as it scrolls under floating glass controls, preserving legibility without opaque bars. A harder "uniform" style exists when you need stronger separation.
- **Refined system palette and bolder, left-aligned typography** accompany the material change.

### Variants
- **Regular** — the default; adaptive, most legible, suitable for most bars and controls.
- **Clear** — more transparent, for media-rich contexts (e.g., controls over video) where a dimming layer behind guarantees contrast. Use sparingly; it was the source of most legibility complaints.
- **Tinted** — introduced after early feedback to boost legibility; adds a stronger tint for contrast.

### Rules of thumb
1. **Reserve Liquid Glass for the navigation/control layer** — the topmost functional layer. Content stays flat.
2. **Don't over-apply it.** Excess glass hurts readability, performance, and battery. If everything floats, nothing has hierarchy.
3. **Let the system do it.** Standard SwiftUI/UIKit/AppKit components got Liquid Glass automatically. Custom chrome is where you must apply it deliberately (`glassEffect` in SwiftUI, `GlassEffectContainer` for grouped/merging elements).
4. **Tint with restraint.** Use your accent color on one primary action, not the whole toolbar.
5. **Accessibility settings are honored automatically** when you use system materials: Reduce Transparency makes glass frostier/more opaque; Increase Contrast draws contrasting borders and flattens toward black/white; Reduce Motion disables elastic effects. Test your app with all three enabled.
6. **Test on hardware.** Specular highlights and motion response don't render fully in the simulator.
7. **Games** may disable glass effects during gameplay while keeping them in menus.

### Migration mindset
Treat the redesign as an information-architecture exercise, not a reskin: audit every custom tab bar, toolbar, modal, and floating control; move search where the platform expects it (e.g., bottom-aligned search on iPhone); simplify chrome so content can truly take center stage.

---

## 4. Designing for Each Platform

### 4.1 iOS (iPhone)

**Device reality:** a handheld, portrait-first, touch-driven device used everywhere — often one-handed, in bright sun, in motion, with divided attention.

**Key characteristics to design for:**
- **Limited screen, full-screen apps.** One app at a time owns the display. Focus each screen on one primary task.
- **Touch targets:** minimum **44×44 pt**. Place primary actions within thumb reach (bottom half of the screen). The 2025+ design pushes key controls (tab bars, search) toward the bottom.
- **Safe areas:** respect the Dynamic Island/notch, home indicator, and rounded corners. Let content flow edge-to-edge under floating bars but keep interactive and essential elements inside safe areas.
- **Orientation:** support portrait at minimum; support landscape when it adds value. Never force users to rotate for core tasks unless the content demands it (video, games).
- **Gestures:** system edge gestures (swipe up for Home, swipe from left edge for back) take priority — avoid conflicting custom edge gestures.
- **Navigation paradigms:** tab bar (3–5 top-level sections) for flat hierarchies; navigation stack (push/pop) for drill-down; modality for self-contained tasks.
- **Home Screen ecosystem:** app icons now support light, dark, tinted, and clear appearance variants; widgets, Lock Screen widgets, Control Center controls, and the Action button extend your app beyond its icon.
- **Interruptions are constant.** Save state aggressively; people leave and return mid-task.

### 4.2 iPadOS

**Device reality:** a large touch canvas that can also be a laptop (Magic Keyboard + trackpad) or a canvas (Apple Pencil). iPadOS 26 brought it much closer to the Mac: a menu bar, freely resizable windows, and Mac-style window controls.

**Key characteristics:**
- **Multitasking & windowing.** Apps must handle arbitrary window sizes gracefully. Design with size classes and adaptive layouts, not fixed layouts. Assume your app can be a narrow strip or a full 13″ canvas.
- **Menu bar.** Provide a complete menu bar (like a Mac app) — it gives every command a discoverable, keyboard-accessible home and frees vertical space.
- **Sidebars and split views** exploit the width: source list → content list → detail is a natural iPad pattern. Offer both sidebar and tab-bar presentations where appropriate (the system can convert between them).
- **Pointer support.** The iPad pointer is adaptive — it morphs to highlight controls. Support hover states, keyboard shortcuts (hold ⌘ to reveal), and trackpad gestures.
- **Apple Pencil.** If your app involves drawing, marking, or handwriting, support Pencil with low-latency inking (PencilKit), hover (on supported models), double-tap/squeeze tool switching, and Scribble (handwriting in any text field).
- **Drag and drop** between apps is a first-class interaction on iPad.
- **Don't ship a stretched iPhone app.** Use the space: multi-column layouts, popovers instead of full-screen sheets, persistent navigation.

### 4.3 macOS

**Device reality:** large displays, precise pointer, full keyboard, overlapping resizable windows, powerful multitasking, pro workflows, and decades of conventions.

**Key characteristics:**
- **Windows:** apps typically support multiple simultaneous windows, arbitrary resizing, full screen, tiling, and Stage Manager. Restore window state between launches.
- **Menu bar is mandatory.** Every command should live in a menu with a keyboard shortcut where sensible. Follow standard menu structure: App, File, Edit, View, (custom menus), Window, Help.
- **Keyboard shortcuts:** honor system-standard shortcuts (⌘C/⌘V/⌘Z/⌘S/⌘W/⌘Q, etc.); add discoverable custom ones for frequent actions.
- **Pointer precision** allows smaller controls and denser layouts than touch — but don't make targets punishingly small. Provide hover states, tooltips, and context menus (right-click) everywhere.
- **Toolbars** hold frequent commands; users can customize them. Prefer standard toolbar items and SF Symbols.
- **Sidebars** with source lists are the standard navigation for document/library apps.
- **Preferences/Settings** window follows a standard pattern (⌘, shortcut).
- **Document model:** support autosave, versions, iCloud documents, and drag-and-drop.
- **Density:** Mac users expect more information per screen and pro-level features — progressive disclosure keeps it approachable.
- **Liquid Glass on Mac:** capsule controls are reserved for large/prominent actions; mini/small/medium controls keep rounded rectangles for dense layouts like inspectors.

### 4.4 watchOS

**Device reality:** glanceable, wrist-worn, sessions measured in **seconds**. Used while moving, exercising, or mid-conversation.

**Key characteristics:**
- **Design for 2–10 second interactions.** Show the single most relevant thing immediately. If a task takes more than a few taps, move it to the phone.
- **One screen, one idea.** Full-screen, vertically scrolling layouts. Large tap targets, very large type.
- **Digital Crown** is a primary input: scrolling, zooming, precise value adjustment — always paired with haptic detents. Support it wherever there's scrolling or a value to adjust.
- **Complications** (watch-face widgets) are often the main way people use your app — invest in them. They deep-link into the exact relevant screen.
- **Smart Stack widgets** surface timely info as users turn the Crown.
- **Notifications** are a core surface: design rich, actionable short/long looks.
- **Always-On display:** design a dimmed, privacy-conscious, low-power variant of active screens; keep time-sensitive info visible without updating too frequently.
- **Health & workouts:** if relevant, integrate HealthKit and workout sessions per system conventions (metrics layout, water lock, activity rings language).
- **No complex text entry.** Rely on dictation, Scribble, quick-reply suggestions, or defer to iPhone.
- **Wrist raise = launch context.** The app should be instantly current on wake — update in the background.

### 4.5 tvOS

**Device reality:** a shared, communal 10-foot experience controlled by a remote (or game controller/iPhone), viewed from across a room, often by multiple people.

**Key characteristics:**
- **Focus-based navigation.** There is no pointer or touch: users move a focus highlight between elements with the remote. Design an obvious, unambiguous focus path; the focused element scales up, gains a shadow/parallax shimmer, and must always be visually unmistakable.
- **Distance legibility:** large type, high contrast, generous spacing. Body text that works on a phone is unreadably small on a TV across the room.
- **Content-forward, cinematic UI:** big imagery, edge-to-edge video, minimal chrome. Browsing should feel like a movie poster wall, not a spreadsheet.
- **Overscan-safe margins:** keep essential content ~60 pt from top/bottom and ~80 pt from sides.
- **Minimal text entry** — it's painful with a remote. Offer iPhone keyboard handoff, Sign in with Apple, or code-based pairing.
- **Multiple users share one Apple TV:** support profile switching where personalization matters.
- **Parallax artwork** for app icons and content posters (layered images that shift with focus) is a signature tvOS touch.

### 4.6 visionOS

**Device reality:** spatial computing — apps live in the user's real space (or fully immersive environments), controlled primarily by **eyes + hands** (look at a target, pinch to select), with the interface built from glass materials at real-world scale.

**Key characteristics:**
- **Windows, volumes, spaces.** Apps present as 2D windows floating in space, 3D volumes viewable from any angle, or Full Spaces (immersive environments). Start windowed; let people opt into immersion gradually.
- **Eye-driven targeting:** interactive elements need generous size (point sizes similar to touch, ≥ 60 pt spacing between targets is comfortable), clear hover effects (the system adds a subtle highlight where you look — ensure custom elements support it), and center-out layouts so key content sits in the comfortable field of view.
- **Indirect + direct gestures:** pinch (tap), pinch-drag (scroll/move), plus direct touch for nearby elements. Also supports hardware keyboards, trackpads, and game controllers.
- **Glass everywhere:** visionOS windows use the system glass material so they harmonize with any real environment; avoid opaque full-window backgrounds.
- **Comfort is a hard requirement:** keep content within a comfortable depth and angle range; avoid rapid motion, sudden scale changes, or content attached rigidly to the head; never move the horizon under the user. Motion sickness is a real design failure mode.
- **Spatial audio** anchors experiences and provides feedback — sound is a first-class design material.
- **Shared context:** people can see their surroundings and other people; design immersion levels (via the Digital Crown) and respect passthrough breakthroughs.
- **Ergonomics:** minimize the need to look far up/down or turn around; place content relative to where the person launched it.

---
## 5. Foundations

### 5.1 Accessibility (see §11 for the deep dive)
Design for everyone from the start: support VoiceOver, Dynamic Type, sufficient contrast, Reduce Motion/Transparency, Switch Control, Voice Control, captions, and haptic/audio alternatives. Accessibility is a requirement, not a feature.

### 5.2 App Icons
- One memorable, simple concept; recognizable at every size from Spotlight to the App Store.
- Design with **layers** now: the modern icon system (Icon Composer tool) builds icons from layered artwork so the system can render **light, dark, tinted, and clear/glass** variants, with subtle specular depth in the Liquid Glass era.
- Avoid: photos, screenshots, UI replicas, thin detail that vanishes at small sizes, words (except a wordmark that IS the brand), transparency abuse, replicating Apple hardware or system icons.
- Provide platform-specific treatments: rounded-rectangle (iOS/iPadOS/macOS — macOS icons can have slight perspective/dimension), circular (watchOS), layered parallax (tvOS), 3D-aware layered (visionOS).
- Test on real wallpapers, in light/dark/tinted modes, and at the smallest rendered size.

### 5.3 Branding
- Express brand through color, typography, tone of voice, and content — **not** by rebuilding standard controls to look "on-brand."
- Defer to content and platform conventions; a splash of accent color and a distinctive voice beat a fully custom UI that fights the system.
- Never co-opt system UI patterns to advertise, and keep launch experiences fast rather than brand-heavy.

### 5.4 Color
- Use color **functionally**: to indicate interactivity, communicate status, and provide identity — not as decoration that carries meaning alone (never rely on color as the only signal; pair with icons/text).
- Prefer **system colors** (systemBlue, systemRed, etc.) and **semantic colors** (label, secondaryLabel, systemBackground, separator…) — they adapt automatically to light/dark mode, vibrancy, and accessibility settings.
- Define brand colors in asset catalogs with light/dark (and increased-contrast) variants; use wide-gamut Display P3 where it helps.
- Maintain contrast: 4.5:1 minimum for text (3:1 for large text); check against real backgrounds, including glass materials.
- One clear **accent/tint color** for interactive elements is the classic Apple move; in Liquid Glass, tint sparingly — usually just the primary action.
- Respect cultural color meanings when localizing.

### 5.5 Dark Mode
- Support it. Users choose dark mode systemwide or on schedule; apps should honor it unless there's a strong content reason (e.g., a video app that's always dark).
- Use semantic colors and materials so it's mostly automatic. Dark mode is **not** inverted colors: backgrounds use elevated dark grays (base vs. elevated layers), white text gains vibrancy, saturated colors are tuned to avoid vibrating on dark.
- Test contrast in both modes, and both with and without Increase Contrast. Provide dark variants of images/icons where needed.

### 5.6 Icons (interface icons) & SF Symbols
- **SF Symbols** is Apple's library of 7,000+ vector glyphs, drawn to harmonize with the San Francisco type system. Use them for toolbar/tab/button icons before drawing your own.
- They come in 9 weights × 3 scales, align to text automatically, and support rendering modes: monochrome, hierarchical (one hue, multiple opacities), palette (multiple hues), and multicolor, plus **variable color** (progress-style fills) and animations (bounce, pulse, wiggle, replace, draw on/off).
- Custom symbols: build them as SF Symbol templates so they inherit weights/scales/modes.
- Interface icons should be simple, front-facing, consistent in stroke weight and optical size, and meaningful (pair with labels when ambiguity is possible).

### 5.7 Images
- Ship @2x/@3x raster assets or (preferably) vector/PDF/SVG assets; never let the system upscale.
- Respect aspect ratios; design for varied screen sizes with scalable, croppable imagery.
- Provide dark-mode and high-contrast variants where needed; remember images render differently under glass materials.
- Use HEIF/HEIC and modern compression; lazy-load large imagery; always supply accessibility descriptions for meaningful images.

### 5.8 Immersive Experiences (visionOS)
- Offer a spectrum: windowed → mixed immersion (your content anchored in the real room) → full immersion (a complete environment).
- Enter immersion on explicit user action; make exiting obvious and instant (Digital Crown always works).
- Ground people: stable horizon, gentle transitions, spatial audio cues, comfortable depth placement.

### 5.9 Inclusion
- Write and design for a global, diverse audience: avoid idioms, stereotypes, and culture-bound imagery; use inclusive example names, photos, and pronouns; support gender-neutral language (and grammatical-gender handling in localized strings).
- Design for varied physical, cognitive, and situational abilities — inclusion overlaps accessibility but is broader (e.g., left-handed users, low-bandwidth contexts, different family structures).

### 5.10 Layout
- Build with **adaptive layout**: Auto Layout / SwiftUI stacks and grids, size classes (compact/regular), and safe areas — never hard-coded coordinates.
- Respect **layout margins** and system spacing; align to a consistent grid; group related items with whitespace (proximity beats boxes and dividers).
- **Key metrics:** 44×44 pt minimum touch targets (60 pt spacing for eye targeting on visionOS); readable text column widths (~50–70 characters); standard margins (16–20 pt on iPhone).
- Place primary content and actions where the platform expects them: top-leading for reading start (LTR), bottom for reachable actions on iPhone, leading sidebar on iPad/Mac, center-forward on visionOS, top-of-screen focus flows on tvOS.
- Design for the extremes: smallest iPhone in landscape with large text, and a 32″ display; iPad windows at arbitrary sizes.
- Support Dynamic Type reflow — layouts must grow gracefully, including switching from horizontal to vertical arrangements at accessibility sizes.

### 5.11 Materials
- Materials are translucent layers (ultraThin / thin / regular / thick blur styles, and now Liquid Glass) that establish hierarchy by letting context show through.
- Use **vibrancy** for text/symbols/fills on materials so foreground content stays legible against whatever is behind.
- Choose materials by role (bar, sheet, popover backgrounds) rather than aesthetics; never stack translucent materials, and always test legibility against worst-case content behind them.

### 5.12 Motion
- Motion communicates: it provides feedback, teaches spatial relationships (where did that sheet come from?), directs attention, and adds delight — in that order of priority.
- Prefer system-provided transitions and physics (springs, interruptible/reversible gestures-driven animation). Motion should feel physical: driven by user input, never blocking it.
- Keep it purposeful and brief; gratuitous animation fatigues. Always honor **Reduce Motion** (crossfade instead of zoom/slide, disable parallax and elastic effects).
- On visionOS, motion discipline is a comfort/safety issue, not just taste.

### 5.13 Privacy
- Two golden rules: **ask only for what you need, when you need it** (contextual permission prompts with clear purpose strings), and **be transparent about what you do with data**.
- Design "just-in-time" permission requests: ask for camera access when the user taps the camera feature, not at first launch. Pre-permission explanation screens help for sensitive requests.
- Degrade gracefully when permission is denied; never nag or gate unrelated features.
- Use privacy-preserving system pickers (photos picker, location "once"/approximate, contact picker) that don't require blanket permissions.
- Fill out App Store privacy "nutrition labels" honestly; App Tracking Transparency is mandatory for cross-app tracking.
- Visible indicators (camera/mic dots, location arrows) are system-drawn — never try to hide or replicate them.

### 5.14 Right to Left
- Support RTL languages (Arabic, Hebrew, …) by using leading/trailing (not left/right) layout APIs so the interface mirrors automatically.
- Mirror directional icons (back arrows, progress) but **not** physical/universal ones (clocks, media playback, logos, phone handsets).
- Numbers, phone numbers, and embedded LTR text keep their direction inside RTL text; test truncation and alignment both ways.

### 5.15 Spatial Layout (visionOS)
- Place content relative to the person, centered in the field of view, at a comfortable depth (~1–2 m for windows); avoid extremes of height and angle.
- Use depth meaningfully (hierarchy, focus) but sparingly; keep interactive elements on or near window surfaces.
- Windows should stay world-anchored (not head-locked); reserve head-anchored elements for rare, brief status.

### 5.16 Typography
- **San Francisco (SF)** is the system typeface family: SF Pro (iOS/iPadOS/macOS/tvOS), SF Compact (watchOS), SF Mono, SF Rounded, plus **New York (NY)**, a companion serif. All are free to download and required to be used only within Apple-platform software.
- Use the built-in **text styles** (Large Title, Title 1–3, Headline, Body, Callout, Subhead, Footnote, Caption 1–2) instead of raw point sizes — they carry Dynamic Type, weight, leading, and tracking for free.
- **Support Dynamic Type everywhere.** Text must scale from xSmall through the five Accessibility sizes; layouts must reflow, not truncate.
- Body text: 17 pt is the iOS default; never ship body text below ~11 pt. Minimum tvOS sizes are far larger; watchOS uses SF Compact tuned for small sizes.
- Establish hierarchy with **weight and size**, not many typefaces. Custom brand fonts are fine for display/headlines — keep system fonts for dense functional text, and implement Dynamic Type scaling for custom fonts too.
- The Liquid Glass era leans into **bolder, left-aligned titles**.
- SF is optical: the system auto-switches between Text and Display variants and adjusts tracking by size — another reason to use text styles.

### 5.17 Writing (UX copy)
- Apple's voice: **clear, concise, conversational, helpful, humble**. Write like a knowledgeable friend, not a lawyer or a marketer.
- Use plain words, sentence case for most UI text (Title Case for buttons/menu titles per platform convention), active voice, present tense, and second person ("your photos").
- Buttons say what they do ("Delete", "Save Draft") — never "Yes/No" for consequential choices.
- Error messages: say what happened, why (if useful), and what to do next; never blame the user; no codes without explanation.
- Empty states teach; onboarding text is minimal; jargon and internal terminology stay internal.
- Write for localization: avoid idioms, leave room for text expansion (German ~+35%), don't concatenate translated fragments.

---
## 6. Patterns

### 6.1 Launching
- Launch fast and land people **where they can act** — ideally where they left off (restore state).
- Launch screen (iOS): a bare skeleton of the first screen, not a splash/branding screen; it exists to make launch feel instant.
- Never begin with a login wall unless the app is meaningless without it; never open with permission dialogs or rating prompts.
- First launch may show brief onboarding, but let people skip it and learn by doing.

### 6.2 Onboarding
- The best onboarding is **no onboarding** — a design so aligned with conventions it explains itself.
- If needed: keep it to a few screens, focus on value ("what you can do"), not feature tours; teach in context with just-in-time tips rather than up-front manuals.
- Ask for sign-up/permissions only when the person hits the feature that needs them.
- Offer "Maybe Later" paths; never trap people.

### 6.3 Navigation & Going Full Screen
- Three canonical models: **hierarchical** (navigation stack, drill in/back), **flat** (tab bar / sidebar top-level categories), **content-driven or immersive** (games, books, video).
- People should always know **where they are and how to get back**. Back always returns to the previous context; titles orient.
- Tab bars: 3–5 tabs, always visible, each a peer top-level destination; never use tabs as action buttons. On iPhone (26-era), tab bars float and can minimize on scroll; search often becomes a dedicated bottom-aligned tab/field.
- Full-screen/immersive modes (video, reading, games) hide chrome but must reveal it with a standard gesture/tap.

### 6.4 Modality
- Modal presentation (sheets, full-screen covers, alerts, popovers) blocks the current context for a **self-contained task**. Use it deliberately and rarely.
- Sheets are the default modal container; they show layered depth (parent recedes). Support swipe-to-dismiss unless data loss looms — then confirm.
- Always provide an obvious exit (Cancel/Done/X). Non-dismissable modals are hostile.
- Alerts are for **critical** information and confirmations only — destructive action confirmations, errors requiring decisions. Two buttons ideal; destructive option styled red; cancel is the safe default. Never use alerts for marketing.
- Avoid modal-on-modal stacking.

### 6.5 Searching
- Offer search when content is plentiful; make it fast, forgiving (typo-tolerant, diacritic-insensitive), and incremental (results as you type).
- Standard placements: search field in navigation (iOS), sidebar/toolbar (iPad/Mac), dedicated search tab (bottom-aligned on iPhone in the 26 design), search-first screens (tvOS).
- Support scopes/filters via tokens; show recent searches and suggestions; make empty-result states helpful ("No results for X — try…").
- Consider Spotlight integration so content is findable outside the app.

### 6.6 Entering Data
- Data entry is friction: minimize it. Prefer pickers, defaults, detection (location, camera/OCR, contacts), and remembered values over free typing.
- Choose the right keyboard type (email, number pad, URL…), enable appropriate autocapitalize/autocorrect, support AutoFill (passwords, one-time codes, contact info, credit cards).
- Validate inline and forgivingly — after the field is exited, with clear fixes, never clearing the user's input.
- Label every field; use placeholder text as example, not as the only label.
- On watch/TV: avoid text entry almost entirely (dictation, handoff to iPhone).

### 6.7 Feedback
- Confirm every action through the appropriate channel: visual state change first, plus haptics (iPhone/Watch — use semantic haptic types: success, warning, error, selection) and sound where meaningful.
- Show **progress**: determinate bars when duration is knowable, spinners only for short, unknowable waits; skeleton/placeholder content for loading UIs; never freeze silently.
- Warn **before** problems (low storage, unsaved changes) rather than only reporting failures after.

### 6.8 Loading
- Never block the whole app if you can show partial content. Load progressively; cache aggressively; show placeholders that match final layout to avoid jarring shifts.
- If loading takes noticeable time, show progress and keep it honest; offer content or education during long unavoidable loads (games).

### 6.9 Managing Accounts
- Delay sign-up as long as possible; let people explore first, and support guest checkout / local use where feasible.
- Offer **Sign in with Apple** whenever you offer third-party login; support passkeys as the modern default; support Password AutoFill.
- Explain what people get for creating an account. Make **account deletion available in-app** (an App Store requirement).

### 6.10 Managing Notifications
- Notifications are interruptions — make each one **valuable, actionable, and timed well**. Never use them for marketing by default.
- Ask for permission in context, after demonstrating value; use provisional (quiet) delivery to prove worth.
- Craft: clear title, informative body, actions on long-press, correct interruption level (passive / active / time-sensitive / critical — the latter two require justification/entitlements), sensible grouping via threads.
- Support Focus modes gracefully; badge counts must be meaningful and clearable; deep-link every notification to the exact relevant content.

### 6.11 Settings
- The best settings are the ones you don't need — prefer smart defaults over options.
- Put app-behavior preferences in-app (a Settings screen following list conventions); integrate with the system Settings app for permissions and minimal configuration.
- Organize by user goals, most-used first; use standard controls (toggles for booleans, pickers for choices); show effects immediately (no "Apply" buttons on Apple platforms).

### 6.12 Offering Help
- Design so help is unnecessary; when it isn't, offer **contextual** help: tooltips (Mac), tips/coach marks (sparingly, dismissible, once), inline hints, and a searchable help resource.
- Never rely on an up-front tutorial to fix an unclear UI.

### 6.13 Undo, Redo & Confirmation
- Make actions reversible wherever possible — undo beats confirmation dialogs. Support shake-to-undo (iOS), ⌘Z (Mac/iPad), and three-finger swipe gestures.
- Confirm only genuinely destructive/irreversible actions; phrase buttons with verbs and make the destructive one visually distinct.

### 6.14 Drag and Drop
- Support dragging any content a user might reasonably move: within your app, between apps (iPad/Mac/visionOS), and to the Finder/Files.
- Provide multiple representations (rich object + image + text fallback); show clear drop targets and copy/move affordances; spring-load navigation during drags.

### 6.15 File Management & Documents
- Document-based apps should use the system document browser / Files integration, iCloud Drive, autosave, version history, and standard open/save conventions (Mac).
- Don't invent a private file silo when documents are user-facing.

### 6.16 Collaboration & Sharing
- Use the system share sheet for outbound sharing; adopt Messages-based collaboration invitations and SharePlay where real-time shared experiences make sense.
- Show presence and attribute changes clearly in collaborative documents.

### 6.17 Ratings, Reviews & Monetization Etiquette
- Use the **system rating prompt** (SKStoreReviewController) only — never custom rating gates, never after failures, never more than the system allows (3×/year), and ideally after a moment of success.
- In-app purchases: clear pricing, restore purchases, no dark patterns; follow the In-App Purchase design guidance and App Review rules.

### 6.18 Playing Audio, Video & Haptics
- **Audio:** respect the silent switch semantics by category (games can play in silent mode via the right session category; media apps respect it); handle interruptions (calls) and route changes (AirPods removed → pause); integrate with Now Playing/Control Center and support AirPlay.
- **Video:** use the system player unless you truly need custom; support PiP, captions, full-screen conventions, and AirPlay.
- **Haptics:** use semantic system haptics consistently with visuals; don't over-buzz; custom Core Haptics patterns for games/pro moments only.

### 6.19 Live Activities, Widgets & Glanceable States
- Live Activities show in-progress things (delivery, game score, timer, ride) on the Lock Screen and in the Dynamic Island — design compact, minimal, and expanded Dynamic Island presentations plus the Lock Screen banner; update only when meaningful; always end them.
- Widgets are glanceable, tappable views of your app's most timely info — not mini-apps. Design for all sizes you support, use deep links per element, keep content current with timeline budgets, support Smart Stacks, Lock Screen/StandBy/watch complications where relevant, and the tinted/clear icon-adjacent appearances.

### 6.20 Multitasking (iPad emphasis)
- Stay functional at any size; save state instantly on backgrounding; support Split View/windowing, Slide Over legacy behaviors, Picture-in-Picture, and external displays.
- Never assume your app is the only thing on screen.

### 6.21 Workouts & Health-Adjacent Patterns (watchOS)
- Follow system workout conventions: instant start, huge in-session metrics, water lock during swims, Always-On-aware layouts, clear pause/end, and honest health data handling with HealthKit permission etiquette.

### 6.22 Charting Data
- Charts must be understandable at a glance: title the takeaway, label axes, use accessible color pairs plus patterns/shapes (never color alone), support Dynamic Type, and provide Audio Graphs/VoiceOver descriptions.
- Match chart type to the question (trend → line, comparison → bar, part-of-whole → sparingly pie); interactive details on tap/hover.

---

## 7. Components

The standard catalog, grouped as the HIG groups them. The universal advice: **use the system version first**; customize appearance via tinting/configuration rather than rebuilding.

### 7.1 Content
- **Image views** — non-interactive imagery; provide accessibility labels or mark decorative.
- **Text views / labels** — selectable, scrollable text; always Dynamic Type-capable.
- **Web views** — embedded web content; give browser-like affordances only if you're a browser; prefer native UI for core features.
- **Charts** — Swift Charts-backed visualizations (see 6.22).

### 7.2 Layout & Organization
- **Lists & tables** — the workhorse: plain, grouped, inset-grouped styles; swipe actions (leading/trailing), reordering, disclosure indicators used correctly (chevron = navigation).
- **Collections / grids** — visual content browsing; consistent cell sizing; support selection and context menus.
- **Boxes / group boxes** (Mac) and **section headers/footers** — group related content.
- **Split views** — two/three-column layouts (sidebar, content, detail) on iPad/Mac/visionOS.
- **Tab views (page style)** — swipeable pages with page dots.
- **Lockups** (tvOS) — the focusable poster+label unit.
- **Disclosure controls** — progressive disclosure triangles/chevrons (Mac emphasis).

### 7.3 Menus & Actions
- **Buttons** — sizes (mini→X-Large), styles (plain, bordered, borderless, prominent/filled, glass in the 26 era), roles (destructive, cancel); label with verbs; one prominent button per view.
- **Context menus** — long-press (touch) / right-click (pointer): put the most relevant commands, mirror them elsewhere (menus/toolbars) since context menus are hidden.
- **Menus** — standard structure, separators for groups, checkmarks for state, symbols beside labels; keyboard-navigable.
- **Pull-down vs. pop-up buttons** — pull-down = actions; pop-up = choose one value.
- **Edit menus** — text selection actions (Copy/Look Up/Translate); extend with custom actions relevant to selection.
- **Toolbars** — frequent actions near content; icons from SF Symbols with labels where space allows; customizable on Mac/iPad; floating glass capsules in the 26 design.
- **Activity views (share sheets)** — system sharing; register your app's actions.
- **Dock menus** (Mac) and **home screen quick actions** (iOS long-press icon shortcuts — 4 max, dynamic allowed).

### 7.4 Navigation & Search
- **Navigation bars** — title (large titles collapse on scroll), leading back, trailing actions (max ~2–3); avoid crowding.
- **Tab bars** — see 6.3. On visionOS the tab bar sits vertically on the window's leading edge; on tvOS it's the top bar.
- **Sidebars** — top-level navigation for iPad/Mac/visionOS; user-customizable sections where content warrants.
- **Search fields & search tabs**, **scope bars**, **token fields** — see 6.5.
- **Path controls** (Mac), **page controls** (dots), **segmented controls** — pick-one view switching (2–5 segments, consistent width, no verbs as segments).

### 7.5 Presentation
- **Sheets** — the default modal task container; detents (medium/large/custom) on iPhone allow half-height sheets; grabber signals resizability.
- **Popovers** — transient, anchored content/controls (iPad/Mac/visionOS); on iPhone they convert to sheets.
- **Alerts** — see 6.4.
- **Action sheets / confirmation dialogs** — a choice among actions triggered by the user's last tap; destructive options red; always a Cancel.
- **Panels & inspectors** (Mac/iPad) — auxiliary controls/details alongside content.
- **Windows** — sizing, tiling, restoration (Mac/iPad/visionOS); **ornaments** (visionOS) — controls attached outside a window's edge (like the bottom toolbar hovering under a window).
- **Full-screen covers** and **immersive spaces** — maximal presentations, explicit exits.

### 7.6 Selection & Input
- **Text fields & secure fields** — single-line entry; clear buttons; AutoFill; proper content types.
- **Text editors/views** — multi-line editing.
- **Sliders** — continuous values with immediate effect; add icons at ends (min/max); on 26-era design they're capsule-track with concentric thumbs.
- **Steppers** — small increment/decrement adjustments.
- **Toggles/switches** — binary on/off with instant effect; label the setting, not the state.
- **Pickers** (wheel, menu, inline), **date pickers** (compact/inline/wheel), **color wells & color pickers**.
- **Combo boxes** (Mac) — text field + list.
- **Virtual keyboards & input accessory views** — pick semantic keyboard types; customize only when it truly helps.
- **Digit entry views** (tvOS), **rating indicators** (Mac), **image wells** (Mac).

### 7.7 Status
- **Progress indicators** — bars (determinate) and spinners (indeterminate); circular progress on watchOS.
- **Activity rings** (watchOS) — only for Move/Exercise/Stand; don't imitate for other data.
- **Gauges** — value within a range (fuel-gauge style), common in widgets/watch.
- **Labels/badges** — numeric badges communicate counts, not marketing.
- **Pull-to-refresh** — user-initiated update with an implicit promise of recency.

### 7.8 System Experiences
- **Widgets, complications, Live Activities, controls (Control Center/Lock Screen/Action button)** — see 6.19.
- **App Shortcuts (Siri/Spotlight)**, **Top Shelf** (tvOS), **watch faces**, **StandBy**, **CarPlay templates** — meet users outside your app with system-templated surfaces.
- **Notifications** — see 6.10.
- **The menu bar & status items** (Mac) — status items only for ongoing, valuable status; never as a second app icon.

---

## 8. Inputs

- **Touch & gestures** — the standard vocabulary: tap, swipe, drag, pinch, rotate, long-press, double-tap, edge swipes, two/three-finger gestures (undo/redo), shake (undo). Use standard gestures for standard meanings; custom gestures must be optional shortcuts, never the only path. Interruptible, gesture-driven animation makes touch feel direct.
- **Keyboards (hardware)** — full keyboard access on every platform; standard shortcuts honored; discoverability via the shortcut HUD (hold ⌘ on iPad) and menus; support focus/tab navigation.
- **Pointing devices** — Mac pointer precision + iPad's adaptive pointer (morphs to controls, magnetic snapping); hover states, tooltips, right-click menus, scroll behaviors.
- **Apple Pencil & Scribble** — low-latency ink, pressure/tilt, hover (M2+ iPads), double-tap & squeeze tool switching, PencilKit tool picker; Scribble means every text field accepts handwriting on iPad — don't break it.
- **Digital Crown** (watchOS, Vision Pro) — scroll/zoom/adjust with haptic detents on watch; immersion dial and recentering on Vision Pro. Always provide touch-equivalent alternatives.
- **Action button** (iPhone 15 Pro+, Watch Ultra) — offer a single, clearly valuable app action via App Intents.
- **Eyes** (visionOS) — gaze targeting: generous targets, hover feedback, no gaze-tracking analytics (privacy-protected by design; apps never receive raw gaze data).
- **Hands & gestures** (visionOS) — indirect pinch family + direct touch; keep gestures comfortable (hands resting), support both hands, avoid fatigue-inducing raised-arm interactions.
- **Game controls** — support standard game controllers with system glyphs and remapping; virtual on-screen controls follow dedicated guidance (placement, opacity, customization); keyboard/mouse for Mac games.
- **Remotes** (tvOS) — Siri Remote: clickpad focus movement, play/pause, back semantics (one level up, never a trap), microphone.
- **Voice — Siri & dictation** — App Intents expose your app's actions to Siri/Shortcuts/Spotlight/Action button; design short, speakable phrases; support dictation wherever text entry exists.
- **Gyro & accelerometer / nearby interactions (UWB) / NFC** — motion and proximity as inputs where genuinely useful; always with alternatives and battery respect.
- **Focus & selection model** — a unified concept: whatever platform, there is always a clear, visible indication of what will respond to the next input (tvOS focus, keyboard focus rings, gaze hover).

---
## 9. Technologies

Design-relevant guidance for Apple's frameworks and services:

- **Apple Intelligence & Machine Learning** — integrate Writing Tools, Genmoji, and Image Playground where text/image creation happens; design ML features to be **proactive but correctable**: show confidence honestly, let people fix mistakes, never make irreversible ML-driven decisions silently; on-device processing is a privacy selling point — say so.
- **Siri & App Intents** — expose key actions/entities as App Intents so they work in Siri, Shortcuts, Spotlight, widgets, the Action button, and Apple Intelligence. Name intents with natural, short phrases; design for voice-only round trips (confirmations, disambiguation).
- **Widgets / WidgetKit** — see 6.19.
- **Live Activities & Dynamic Island** — see 6.19.
- **App Clips** — a lightweight (<15 MB) slice of your app launched from QR/NFC/App Clip Codes, Maps, Safari, Messages: laser-focused on one task (order, pay, rent), no onboarding, optional sign-in via Sign in with Apple, graceful upgrade path to the full app.
- **Apple Pay & Wallet & Tap to Pay** — use the standard Apple Pay button (don't redraw it), present the payment sheet with itemized clarity, support passes in Wallet (tickets, cards, keys) with correct pass design, and follow marketing/branding rules exactly.
- **In-App Purchase** — standard purchase flows, clear subscription terms before the buy button, restore purchases, family sharing awareness, offer codes; StoreKit views help you stay compliant.
- **Sign in with Apple** — offer it whenever third-party sign-in exists (App Store rule); use the standard button styles/sizes; respect Hide My Email.
- **iCloud & CloudKit** — seamless sync as an expectation: no "sync" buttons, resolve conflicts gracefully, communicate storage states, work offline-first.
- **HealthKit / CareKit / ResearchKit** — health data is maximally sensitive: granular permission requests, clear purpose, no health data for ads (prohibited), consent flows for research per ResearchKit conventions.
- **HomeKit** — accessories organized by home/room/scene; follow naming conventions so Siri control works naturally.
- **CarPlay** — apps are built from **system templates only** (lists, grids, now-playing, POI maps) in approved categories (navigation, audio, communication, EV charging, food ordering…); minimal glances, huge targets, voice-first; you don't control pixel layout, you supply structured content.
- **Maps / MapKit** — standard map interactions and annotations; place cards, Look Around where available; don't reinvent map gestures.
- **Augmented Reality (ARKit / RealityKit)** — coach people into finding surfaces, keep sessions short (arm fatigue), use system coaching UI, place objects believably (shadows/occlusion), and design for interrupted sessions.
- **Game Center** — the system layer for identity, leaderboards, achievements, challenges, multiplayer; use system UI for trust; the Games app (2025+) surfaces your content.
- **Messages apps & stickers / SharePlay / Group Activities** — design shared experiences that keep everyone in sync and make joining trivial.
- **Live Photos, Photos picker, Camera** — use the privacy-preserving pickers; handle Live Photo motion respectfully (play on intent, not constantly).
- **AirPlay & Handoff & Continuity** — support streaming to other screens/speakers with the standard route picker; adopt Handoff so tasks continue across devices; Universal Clipboard just works if you use standard pasteboard APIs.
- **Always On (watch / iPhone StandBy)** — dimmed states redact sensitive data, reduce update frequency, and keep essential glanceability.
- **NFC & ID Verifier** — short, purposeful scan interactions with system sheets.
- **Mac Catalyst** — when bringing an iPad app to Mac: adopt Mac idioms (menu bar, toolbar, pointer, window resizing, preferences) — "optimize for Mac" rather than shipping a giant iPad app in a window.

---

## 10. App Icons & App Store Presence

Beyond the icon guidance in 5.2, your app's public face includes:

- **App Store product page:** name (≤30 chars, no keyword stuffing), subtitle, screenshots that tell a story in the first two frames, optional app preview videos (15–30 s, captured on device), clear description leading with the core value, honest privacy labels.
- **Custom product pages & in-app events** for campaigns; localized metadata for every market you care about.
- **App Review Guidelines** are the hard constraints behind many HIG "shoulds": account deletion, purchase rules, privacy manifests, tracking transparency, content rules. Design with them in mind from day one.
- **Marketing resources:** Apple provides badge artwork ("Download on the App Store"), product bezels for screenshots, and brand rules for referencing Apple products — use the official assets, never modified.

---

## 11. Accessibility Deep Dive

Accessibility spans vision, hearing, mobility, speech, and cognition. The system does enormous work for you **if** you use standard components and label things properly.

### Vision
- **VoiceOver:** every meaningful element needs a label; give controls hints and traits; group logically; order matters; custom views implement the accessibility protocol; test by navigating your whole app with the screen curtain on.
- **Dynamic Type:** support all sizes including the five accessibility sizes; reflow layouts (stacks that go vertical, icons that pair with wrapping text); never truncate essential text.
- **Contrast & color:** 4.5:1 text contrast; test Increase Contrast and Smart Invert (mark images to not invert); never rely on color alone.
- **Reduce Transparency / Reduce Motion:** honored automatically with system materials and transitions; mirror this in custom effects.
- **Audio Graphs** for charts; alt text for images.

### Hearing
- Captions/subtitles for all video (and design custom players with the system caption styling users set); visual + haptic alternatives for every sound cue; support Made for iPhone hearing devices; mono audio awareness.

### Mobility & Motor
- **Switch Control, Voice Control, AssistiveTouch, Full Keyboard Access:** all work automatically with standard controls — custom controls must expose proper accessibility actions. Voice Control shows labels — your accessibility labels must match visible text or people can't speak them.
- Big targets (44 pt+), forgiving gestures with alternatives (any multi-finger or timing-sensitive gesture needs a simple alternative), no essential actions locked behind complex gestures.

### Cognition & Speech
- Plain language, predictable navigation, minimal time pressure (or adjustable timing), optional reduced stimulation; support Assistive Access (simplified system experience) gracefully; avoid flashing content (photosensitivity).

### Process
- Run the Accessibility Inspector in Xcode; audit with VoiceOver + Dynamic Type XXL + Reduce Motion as a standard QA pass; include people with disabilities in testing when possible. Accessibility features often become mainstream features (autocomplete, dark mode, haptics) — design them as first-class.

---

## 12. Practical Design Process & Checklists

### Starting a new app
1. Define the one core task per platform; cut everything that doesn't serve it.
2. Choose navigation architecture (tabs vs. hierarchy vs. content-driven) before drawing screens.
3. Wireframe with **standard components first**; earn every customization.
4. Design for the extremes early: smallest device + largest accessibility text; largest display; dark mode; RTL.
5. Prototype motion and gestures on device, not just static frames.

### Pre-ship checklist (condensed)
- [ ] All touch targets ≥ 44×44 pt; primary actions reachable
- [ ] Dynamic Type through accessibility sizes without truncation
- [ ] VoiceOver: complete labels, logical order, custom actions where needed
- [ ] Light + Dark mode, Increase Contrast, Reduce Motion, Reduce Transparency all tested
- [ ] State restoration; instant launch; offline behavior defined
- [ ] Permissions requested in context with clear purpose strings; graceful denial paths
- [ ] Standard gestures unbroken; system back/dismiss always works
- [ ] Keyboard types, AutoFill, and return-key actions correct on every field
- [ ] Notifications valuable, actionable, deep-linked; easy to quiet
- [ ] Localization-ready strings; RTL mirrored correctly
- [ ] App icon variants (light/dark/tinted/clear) and all platform sizes
- [ ] Liquid Glass adoption: content layer flat, controls on glass, no glass-on-glass, legibility verified over worst-case content
- [ ] Error states, empty states, and loading states all designed (not default)
- [ ] Account deletion available; privacy labels accurate

### Design-review questions Apple asks (paraphrased spirit of Apple Design Award criteria)
- **Delight & fun** — does interacting feel good (motion, haptics, sound)?
- **Inclusivity** — does it work brilliantly with accessibility features on?
- **Innovation** — does it use platform capabilities (widgets, intents, Pencil, spatial) in a way only this platform allows?
- **Interaction** — effortless input, obvious navigation, zero dead ends?
- **Social impact / Visuals & graphics** — craft, coherence, purpose.

---

## 13. Official Resources & Links Directory

### The core documents
| Resource | URL |
|---|---|
| **Human Interface Guidelines (start here)** | https://developer.apple.com/design/human-interface-guidelines |
| HIG — What's New | https://developer.apple.com/design/whats-new/ |
| Designing for iOS | https://developer.apple.com/design/human-interface-guidelines/designing-for-ios |
| Designing for iPadOS | https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados |
| Designing for macOS | https://developer.apple.com/design/human-interface-guidelines/designing-for-macos |
| Designing for watchOS | https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos |
| Designing for tvOS | https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos |
| Designing for visionOS | https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos |
| Designing for games | https://developer.apple.com/design/human-interface-guidelines/designing-for-games |
| Materials (incl. Liquid Glass) | https://developer.apple.com/design/human-interface-guidelines/materials |
| Liquid Glass technology overview | https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass |
| Adopting Liquid Glass | https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass |

### Design resources & tools
| Resource | URL |
|---|---|
| **Apple Design Resources** (Figma/Sketch UI kits, templates, bezels for every platform) | https://developer.apple.com/design/resources/ |
| SF Symbols app (7,000+ symbols) | https://developer.apple.com/sf-symbols/ |
| San Francisco & New York fonts | https://developer.apple.com/fonts/ |
| Icon Composer (layered app icons) | via Apple Design Resources / Xcode 26 |
| Apple Design on Figma (official kits) | https://www.figma.com/@apple |
| Accessibility for developers | https://developer.apple.com/accessibility/ |
| Inclusion guidance | https://developer.apple.com/design/human-interface-guidelines/inclusion |
| Localization | https://developer.apple.com/localization/ |

### Videos & learning
| Resource | URL |
|---|---|
| WWDC design session videos (all years, free) | https://developer.apple.com/videos/design/ |
| "Meet Liquid Glass" (WWDC25) | https://developer.apple.com/videos/play/wwdc2025/219/ |
| "Get to know the new design system" (WWDC25) | https://developer.apple.com/videos/play/wwdc2025/356/ |
| Evergreen classics: "Essential Design Principles" (WWDC17), "Designing Fluid Interfaces" (WWDC18), "The Qualities of Great Design" (WWDC18), "Design for Spatial Input" (WWDC23) | search titles at https://developer.apple.com/videos/ |
| Apple Developer Design hub | https://developer.apple.com/design/ |
| Apple Design Awards (exemplary apps) | https://developer.apple.com/design/awards/ |

### Adjacent must-knows
| Resource | URL |
|---|---|
| App Store Review Guidelines | https://developer.apple.com/app-store/review/guidelines/ |
| App Store product page guidance | https://developer.apple.com/app-store/product-page/ |
| Apple Pay marks & guidelines | https://developer.apple.com/apple-pay/marketing/ |
| Sign in with Apple guidelines | https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple |
| CarPlay app programming & design | https://developer.apple.com/carplay/ |
| Widgets / WidgetKit | https://developer.apple.com/design/human-interface-guidelines/widgets |
| Live Activities | https://developer.apple.com/design/human-interface-guidelines/live-activities |
| App Clips | https://developer.apple.com/design/human-interface-guidelines/app-clips |
| Machine learning / Apple Intelligence design | https://developer.apple.com/design/human-interface-guidelines/machine-learning |
| Apple developer forums (design tag) | https://developer.apple.com/forums/ |

---

### Final advice

The entire HIG compresses into one sentence: **respect the platform, respect the content, respect the person.** Use system components so your app inherits a decade of interaction refinement; let content — not chrome — be the star; and treat every user's time, attention, data, and abilities as precious. Everything above is elaboration.
