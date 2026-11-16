# CLAUDE.md

Guidance for AI coding agents working in this repository.

## What this is

Legend Card Manager is a real-time tracker (not a game engine) for the side card system a DM runs in a D&D 3.5 group. It is a React + TypeScript single-page app on Firebase (Google sign-in, Firestore with real-time listeners, Hosting).

Read these before changing code:

- [docs/domain.md](docs/domain.md): the product, the glossary, and the game rules observed in the legacy app
- [docs/conventions.md](docs/conventions.md): layout, naming, styling, data access, and testing rules
- [README.md](README.md): setup and scripts

## Running anything

Non-interactive shells start on Node 20. Before any `npm` or `node` command, run:

```sh
. ~/.nvm/nvm.sh && nvm use
```

The `.nvmrc` selects Node 24. `npm install` fails on older versions on purpose.

## Verifying a change

```sh
npm run check          # type check, lint, format check, unit tests
npm run test:emulator  # access-rule and real-time tests against the Firebase emulators
```

Both must pass before a task counts as done. GitHub Actions runs the same checks on every push to `master` and deploys to the live project when they pass (see "CI and deployment" in the README).

## Rules

- Code, comments, docs, and commit messages are in English. All interface text is in Turkish. The project owner writes in Turkish, so reply in Turkish in chat.
- Development runs against the local emulators on the demo project `demo-legend-cards`. Never connect to or deploy to a real Firebase project unless the user asks. The live project is reached only through the CI workflow and the README's "Going live" runbook.
- A push to `master` deploys to the live project. Push only when the user asks.
- The owner's data files in `data/` stay out of git: never commit them or copy their content into tracked files. Tests read `tests/fixtures/data/` (see `docs/conventions.md`).
- Firestore access is closed by default. A new data path needs explicit rules and emulator rules tests (see the checklist in `docs/conventions.md`).
- `reference/legacy/Legend_Card_Manager_v2.2.8.html` is the design and behavior reference. `Legend_Card_Manager_v2.1.15.html` next to it is kept as the earlier version. Do not edit either file, and do not port their code.
- Legacy rules that look odd are deliberate decisions by the DM and the owner (see `docs/domain.md`). Do not "fix" them unless asked.
- Do not commit unless the user asks.
- When your work is done, every time, stop all processes that use the project's ports, including ones that were already running: the dev server and the emulators (`npm run dev`, `npm run dev:web`, `npm run emulators`, `firebase emulators:*`), `npm run preview`, and anything else listening on 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150, 9199 or 5002.
  - Stop `npm run dev` and the emulators like Ctrl+C (SIGINT to the whole process group, `kill -INT -<pgid>`), so the emulators export their data to `.firebase-emulator-data/`. Wait for the export, and use `kill -TERM` only if a process does not exit.
  - Then confirm with `lsof -nP -iTCP -sTCP:LISTEN` that no process still holds those ports.

## Change workflow

Changes are planned with [OpenSpec](openspec/): explore with `/opsx:explore`, plan with `/opsx:propose`, implement with `/opsx:apply`, and archive with `/opsx:archive`. Specs live in `openspec/specs/`, and changes in flight live in `openspec/changes/`.
