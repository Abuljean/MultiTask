# Motion

> The rules for animation. Motion is the single most-mishandled part of AI-generated UI — either overused (things bouncing everywhere) or defaulted to linear tweens that feel cheap. This file gives motion a job and a vocabulary.

## The rule
**Motion must have a job.** Every animation is one of:
1. **Feedback** — confirming an action registered (button press, swipe threshold, save success)
2. **Orient** — showing where something came from or went to (sheet slides up from bottom = lives below; card slides right off = deleted/completed)
3. **Continuity** — connecting states so a change feels like a transformation, not a jump cut
4. **Attention** — drawing the eye to something changing (a new task appearing in the list; sync status updating)

Motion that is none of these is decoration. **Decoration is banned in this app.** The developer's brief said "must not be distracting" — that's the constitutional principle for motion here.

## Timing vocabulary

Five durations. Every animation uses one of these. No ad-hoc values.

```
motion.instant     = 100ms   ← state changes (hover, focus, active). Below threshold of "did anything just happen?"
motion.quick       = 180ms   ← small elements (buttons, chips, toggles)
motion.standard    = 260ms   ← the default for most transitions (card enter/exit, sheet open, page change)
motion.emphasis    = 360ms   ← larger elements or important moments (task completion, undo toast enter)
motion.deliberate  = 500ms   ← rare, only for showing a full sequence (e.g. a completed task collapsing in place)
```

**Never linear.** No animation in this app uses linear easing except the sync-state pulse (a slow continuous ambient loop).

## Easing vocabulary

Two curves plus springs:

```
motion.easeOut       = cubic-bezier(0.16, 1, 0.3, 1)      ← fast start, gentle stop. Default for entering/appearing.
motion.easeInOut     = cubic-bezier(0.65, 0, 0.35, 1)     ← for movement across space (a card sliding to a new position)

motion.spring.snappy = { damping: 22, stiffness: 260 }    ← default for interactive feedback
motion.spring.gentle = { damping: 18, stiffness: 180 }    ← for larger elements settling
motion.spring.bouncy = { damping: 12, stiffness: 200 }    ← reserved for delight moments (task completion payoff)
```

Springs are used for any interaction the user drives directly (swipe, drag, tap → response). Curves are used for autonomous transitions (screen navigation, timed animations).

## The transitions catalog

Every named transition in the app.

### Screen navigation (stack push/pop)
- **iOS:** default native stack transition (large horizontal slide with parallax), platform-provided via React Navigation native-stack
- **Android:** M3 transitions (fade + subtle scale)
- **Desktop:** cross-fade at `motion.quick` (180ms, easeOut). Slides feel wrong on desktop.

### Modal/sheet enter
- Backdrop fades in over `motion.standard` (260ms, easeOut)
- Sheet translates from bottom (`translateY`) with `motion.spring.snappy`
- Simultaneously scales from 0.98 to 1 for subtle "arrival" feel

### Modal/sheet exit
- Backdrop fades out over `motion.quick` (180ms)
- Sheet slides down with `motion.spring.gentle` — feels heavier on exit (deliberate)

### Task card appearing (new task added)
- Height animates from 0 to natural over `motion.standard` (260ms, easeOut)
- Opacity 0 → 1, offset by 40ms so appearance leads the sizing
- If added at the top of the visible list, the list below shifts down using `LayoutAnimation` (native) or `withSpring` on each row

> **Resolved (2026-07-10, on-device tuning session with the developer) — final swipe/regroup motion values. These override the generic specs below where they differ:**
> - Swipe commit threshold: **16.18% of screen width** (golden ratio). Below it: spring back with `{ damping: 26, stiffness: 240 }` (fast settle, no sway). Crossing it: haptic tick. Release past it: slide off-screen 240ms ease-out.
> - **Regroup entrance:** when a task moves groups (complete/restore/undo/create), its card slides in from the side it exited through (left when entering the trash, right otherwise), traveling 60% of screen width over **647.2ms ease-out — NO bounce, no recoil** (springs were tried at several overshoot ratios and rejected; 647.2 = 400 × φ, developer's golden-ratio pick).
> - **Implementation warning:** never put animated content inside an RN `<Modal>` — Reanimated and LayoutAnimation both silently no-op there on the new architecture. Use a `transparentModal` route (see `app/quick-add.tsx`) instead.
> - List regroups use one shared LayoutAnimation: spring updates `springDamping 0.95`, arrivals fade in delayed 80ms, exits fade 150ms.
> - Trails reveal only after 4px of movement; card surfaces stay opaque (muted state fades content only) so trails can never bleed through.

### Task card completion (swipe-right or check tap)
- Card slides right off-screen: `translateX` to viewport width, `motion.emphasis` (360ms, easeOut)
- Simultaneously: check icon overlays center with a scale-bounce (`motion.spring.bouncy`)
- After slide: card element removed, list below animates up with `motion.spring.gentle` to fill the gap
- Haptic success fires at the moment of removal

### Task card deletion (swipe-left)
- Card slides left off-screen: same as complete but leftward
- No icon overlay — the trash was already visible in the swipe reveal
- List above/below settles with `motion.spring.gentle`

### Undo toast enter
- Slides up from bottom (below tab bar / FAB): `translateY` with `motion.spring.snappy`
- Opacity fades from 0 to 1 in parallel over `motion.quick`

### Undo toast exit (auto-dismiss after 5s)
- Slides down + fades out over `motion.standard`, easeInOut
- If tapped for undo: skip exit, immediately fade at `motion.instant`

### Status color change (task becomes urgent, then overdue)
- Background color animates over `motion.deliberate` (500ms, easeInOut)
- Left border accent animates the same
- The user won't usually see this happen live (it's a passive status change), but if they're on the screen, it should be a gentle transition, not a jump

### Section collapse/expand (Completed group, category groups)
- Height animates over `motion.standard`, easeInOut
- Chevron icon rotates 90° in parallel
- Never lock the interaction during the animation — user can toggle again mid-transition

### FAB tap → quick-add sheet
- FAB scales to 0.9 with `motion.spring.snappy` (feedback)
- 40ms later, the sheet starts opening (feels like the FAB "launched" the sheet)
- FAB itself fades or hides once the sheet is halfway open

## The forbidden list

These are things that "just come out of the box" from motion libraries but do not fit this app:

- ❌ **Linear easing** for anything user-driven. Feels mechanical.
- ❌ **Bouncy/overshoot springs on every interaction.** Reserve for delight moments. Overshoot everywhere = amateur.
- ❌ **Long durations** (>500ms) for common interactions. Feels sluggish.
- ❌ **Animating layout properties** (`width`, `height`, `top`, `left`, `margin`). Use `transform` and `opacity` only for anything that runs during interaction. Height-animating a section is OK because it's not simultaneous with a gesture.
- ❌ **Parallax on scroll.** Doesn't fit the calm brief.
- ❌ **Rotating loading spinners** as the primary loading state on the main list. Use skeleton screens (see below) or optimistic UI.
- ❌ **Continuous ambient motion in the background** (drifting shapes, glow pulses on decorative elements). One exception: the sync-state pulse, and only when actively syncing.

## Reduced motion (required, not optional)

React Native check: `AccessibilityInfo.isReduceMotionEnabled()` returns whether the user has requested reduced motion. Store this in a global state and re-check on `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)`.

**When reduced motion is on:**
- All autonomous transitions become simple cross-fades over `motion.instant` (100ms)
- All springs collapse to instant snaps (no bounce)
- Card slide-off animations become fade-outs
- The sync-state pulse becomes static (a solid dot, no animation)
- Section collapse/expand becomes instant

Do NOT skip this. Motion sensitivity is a real accessibility need (vestibular disorders, migraines), and the app runs daily for the user — if the user later enables reduced motion at the OS level, the app has to gracefully degrade without a rebuild.

## Loading states

- **First app open with no local data:** skeleton screens for the task list (3–5 grey placeholder cards, no shimmer — shimmer is overused and the developer's brief said "not distracting")
- **Ongoing sync:** the sync-state indicator pulses gently at the top-right, everything else remains interactive (offline-first, remember — you already have data)
- **Long operations (rare — CSV import, initial sync):** progress bar (determinate if we know the total; indeterminate is a fallback)
- **Never a spinner covering the whole screen** unless something is genuinely, unrecoverably blocked

## The "does the motion earn its place" test

For every animation you're about to add, ask:
1. What job does this animation do (feedback / orient / continuity / attention)?
2. Would removing it change the user's understanding of what happened?
3. If the user does this action 100 times a day, is this animation still not annoying?

If any answer is no or unclear, remove the animation.
