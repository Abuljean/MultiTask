# Starter prompt for Claude Code

Paste this as your FIRST message to Claude Code, once it's open in the `multitask` repo with CLAUDE.md and docs/ in place.

---

I'm building the native version of my task app, Multitask. Full context, requirements, and design rules are in CLAUDE.md and the docs/ folder (including docs/design/). The reference/ folder has my existing web app's source — that's the data model, logic, and visual DNA to carry forward, not code to reuse directly.

I want to build this incrementally and correctly, NOT all at once. Please:

1. Read CLAUDE.md and the docs (including docs/design/00-design-handoff.md) and give me a short confirmation of what you understand this project to be — so I know the context loaded.
2. Propose a concrete build order for Stage 1 (the foundation: Supabase connection, auth, and the core offline-first data layer) — before any UI.
3. Once I approve the plan, start building the foundation, one small step at a time. Explain your reasoning as you go — I'm learning React Native, so teach me, don't just do it.

Working rules:
- Make small, committable changes. I'll approve edits individually (no "accept all" yet).
- Never put secrets (Supabase keys, credentials) in the repo — use env files excluded via .gitignore, and tell me what to paste where.
- When you hit a design decision, consult docs/design/ first; if it's not covered, propose an option grounded in the "calm, specific, tactile" principles and flag it to me rather than defaulting to something generic.
- Ask before anything destructive, and whenever you need something from me (keys, decisions, testing on my phone) — I'll provide it.
- Verify any bleeding-edge Expo/library specifics against current docs rather than assuming; this ecosystem moves fast.

Start with step 1 (confirm understanding) and step 2 (propose the Stage 1 plan). Don't write feature code until I approve the plan.
