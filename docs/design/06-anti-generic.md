# Anti-Generic Checklist

> The single failure mode this package is built to prevent: an app that comes out looking like every other AI-generated project. This file names the specific defaults to avoid — the "tells" that scream *AI-generated* — and gives the intentional alternative for each one. Consult before finishing any screen.

## Why this file exists
When an AI model has vague instructions, it reaches for the safe average of its training data. For a 2024–2026 task app, that average has a very specific look: purple-indigo gradient, Inter font, rounded rectangles at 8px radius, filled + outline button pair, big hopeful empty states, decorative shadows on everything. These aren't *bad* individually — they're bad because they're the default. The anti-generic move is to make specific choices that are *not* the default.

## The tells (and their alternatives)

### 1. The purple/indigo gradient hero
- **The tell:** a large hero section on the first screen with a diagonal gradient from purple to indigo (or blue to teal), often with a "Get started with [App]" headline.
- **Why it's generic:** it's the go-to for AI landing pages and onboarding screens because it's the least offensive way to add "personality" without committing.
- **The alternative for Multitask:** no hero on the main screen. The main screen is the task list, and it starts *at* content. If there's an empty state, it's a single line of factual text and a small add-task link (see components file).

### 2. Inter as the identifying font
- **The tell:** Inter set as the primary UI font on every platform. It's excellent but so widespread that "Inter" reads as "AI project."
- **Why it's generic:** it's Vercel's default, GitHub's default, every AI starter template's default. Being everywhere is precisely why it fails the "specific" test.
- **The alternative:** system fonts on native (SF Pro on iOS, Roboto on Android — feels native and free). JetBrains Mono for time chips and timestamps (small identifying touch). Inter allowed only as web fallback, never as the identifying choice. See `03-layout-type-color.md`.

### 3. All-rounded corners at the same radius
- **The tell:** every button, card, input, and modal has `border-radius: 8px`. Nothing has a different radius. Nothing is sharp.
- **Why it's generic:** the "friendly" default. Real design systems have a radius *scale* (small for chips, medium for buttons, larger for cards), and the contrast between them is part of the visual language.
- **The alternative:** the four-step radius scale in `03-layout-type-color.md` (6 / 10 / 16 / 999). Small elements are tighter; large elements are more generous; pills are full round. The contrast is intentional.

### 4. Big empty-state illustration + "Let's get started!"
- **The tell:** an empty screen shows a giant SVG illustration of someone at a desk, plus a headline like "Let's get organized!" or "You've got this!" plus a big filled CTA button.
- **Why it's generic:** it's the "delight" default for onboarding, but it's condescending in a personal power tool that the user opens every day. On the 100th launch, it just wastes space.
- **The alternative:** empty states are factual and small (see components file). "Nothing due today." "No overdue tasks." One tertiary text link if a next action is clear. No illustration, no exclamation points, no "You've got this."

### 5. Filled primary + outline secondary on every screen
- **The tell:** every screen has exactly one filled button and one outlined button side by side. It's mechanical.
- **Why it's generic:** it's the shape of "primary and secondary action" from every design tutorial, applied literally without thinking.
- **The alternative:** *some* screens have a real primary + secondary pair. Most screens have just one primary and everything else is a tertiary text link. Forms often just have "Save" — the "Cancel" is the Esc key or the X in the modal chrome. Do not add a secondary button to be symmetrical.

### 6. Drop shadows on everything
- **The tell:** every card, every button, every modal has a subtle drop shadow. The UI floats above nothing in particular.
- **Why it's generic:** the Material Design "elevation" concept, over-applied.
- **The alternative:** shadows are rare and meaningful. Cards use border and background contrast to separate from the surface, not shadow. Modals and sheets get a real shadow (they *are* elevated). FAB gets one. Task cards do not. In dark mode, use lighter background instead of shadow for elevation.

### 7. Emoji as functional icons
- **The tell:** 📝 for tasks, ✅ for complete, ⏰ for time, 🔥 for urgent. Especially prevalent in AI-generated UI because emojis "just work" without needing an icon library.
- **Why it's generic:** it's amateur, breaks in system dark modes, has no accessibility label, renders differently across platforms.
- **The alternative:** SF Symbols on iOS, Material Symbols on Android, a shared icon set on desktop/web. Same concept → same icon across platforms. Every icon has an `accessibilityLabel`. See `01-platforms.md`.

### 8. Hopeful/friendly copywriting
- **The tell:** "Let's get started!" "You've got this!" "Great job!" "Almost there!" Praise-based microcopy after routine actions.
- **Why it's generic:** the "delight" default that AI models produce when given "make the copy friendly." In a personal power tool used daily, it's condescending and time-wasting.
- **The alternative:** direct and factual. "Task added." "3 tasks completed." "Nothing due today." If something failed: state what and how to fix it, no apology-theater ("Oh no! Something went wrong 😔").

### 9. Rainbow gradients on charts and progress indicators
- **The tell:** a progress bar goes from red to yellow to green, or a chart uses ROY-G-BIV colors for categories.
- **Why it's generic:** the default when the model has "make it colorful" as a signal without specifics.
- **The alternative:** progress bars are one solid color (the accent, or the relevant status color). Charts use a small palette of related hues plus neutrals for non-highlighted data. Never rainbow.

### 10. Loading spinners everywhere
- **The tell:** a spinner appears on every action that isn't instant. Even a 200ms local action gets a spinner.
- **Why it's generic:** it's the "handle loading" default. But this app is offline-first — local actions are instant.
- **The alternative:** local actions are optimistic (commit immediately, reconcile in background). Sync state is a small persistent indicator, not a spinner overlay. Long operations use progress bars, not spinners. See `05-motion.md`.

### 11. Cluttered "features grid" on the marketing page or About screen
- **The tell:** a 3-column grid of feature cards with icons and short descriptions.
- **Why it's generic:** the SaaS landing-page default.
- **The alternative:** this app has one user (its developer). There is no marketing page. The About screen is a single line: "Multitask, built by [name]. Version X.Y." No feature grid.

### 12. "AI-suggested" microcopy that assumes a persona
- **The tell:** the app talks to the user like an assistant ("I've added your task", "Let me help you organize this").
- **Why it's generic:** an AI model producing UI copy defaults to the assistant register.
- **The alternative:** the app doesn't have a voice or persona. It's a tool. UI copy is imperative or factual, not conversational. "Add task", not "I'll add that for you."

### 13. "Design system show-off" screens
- **The tell:** a screen exists solely to demonstrate the design system (a settings screen with every possible control, tabs, sliders, toggles for the sake of showing off).
- **Why it's generic:** models like to show they built a complete component set.
- **The alternative:** every screen serves a real user need. If a control doesn't have a purpose in the app, delete it.

### 14. Motion for its own sake
- **The tell:** things bounce when they appear. Cards pulse on hover. Everything has a hover animation. A subtle scroll-linked parallax on the header.
- **Why it's generic:** "add nice animations" produces this by default.
- **The alternative:** motion has a job (feedback / orient / continuity / attention), and none of the above are jobs. See `05-motion.md`.

### 15. The rounded avatar in the corner
- **The tell:** every screen has a rounded user avatar in the top-right, even in a single-user app where the user obviously knows who they are.
- **Why it's generic:** SaaS default for account/settings access.
- **The alternative:** on mobile, settings live in a tab or icon button. No avatar in the top-right unless there's a real reason (multi-user, or account switching).

## The pre-ship checklist

Before considering any screen "done", read this and mentally check each:

- [ ] No purple/indigo gradient hero anywhere?
- [ ] Not using Inter as the identifying font on native?
- [ ] Radii vary across small/medium/large elements (not uniform 8px)?
- [ ] Empty state (if present) is factual and small, no illustration, no "You've got this!"?
- [ ] Only one filled primary button on this screen?
- [ ] Shadows only on elevated things (modals, FAB, sheets) — not on every card?
- [ ] All icons from the platform icon library, no emoji as icons?
- [ ] Microcopy is direct and factual, not "friendly assistant"?
- [ ] Progress and charts use a small deliberate palette, not rainbow?
- [ ] No spinner overlay for local actions? (Offline-first: local is instant.)
- [ ] Motion has a job on every animation? Nothing decorative?
- [ ] Every UI element serves a real need, not "showing off the design system"?

If you can check all twelve, the screen doesn't look AI-generic. If you can't, name which and either fix or flag.

## When in genuine doubt
When a design decision doesn't clearly map to the files in `docs/design/`, the anti-generic rule is: **make a specific choice, don't reach for the safest average.** If the specific choice turns out to be wrong, that's iterable. If it turns out to be the safest average, it's silently mediocre and hard to fix later.
