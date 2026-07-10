# Multitask — Complete Project Package

Everything for building the native Multitask app: full context, design system, and web-app reference. Live web app: https://taskmanager-gcvv.onrender.com

## Where each file goes in your actual project

- **CLAUDE.md** → the ROOT of your `multitask` repo (replace the one already there). Claude Code reads it every session. It's the merged superset: all project/technical context + the design principles.
- **docs/design/** → create a `docs/design/` folder in your repo and put files `00`–`06` there. These are the on-demand design references CLAUDE.md points to.
- **docs/TaskApp-Master-Handoff.md** and **docs/TaskApp-Native-Roadmap.md** → keep in `docs/` for full project + build-plan reference.
- **reference/** → the existing WEB app's source + config. NOT part of the native app — it's there so Claude Code can see the web app's data model, logic, and visual DNA when building the native equivalents. Keep it somewhere handy (a `reference/` folder, or outside the repo).

## Suggested commit
After placing CLAUDE.md + docs/design/:
`git add . && git commit -m "chore: add design system + merged CLAUDE.md" && git push`

## Then
Open Claude Code in the repo and use the starter prompt in `STARTER-PROMPT.md`.
