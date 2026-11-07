# CLAUDE.md

Guidance for AI coding agents working in this repository.

## What this is

Legend Card Manager is a real-time tracker (not a game engine) for the side card system a DM runs in a D&D 5e group. It is a React + TypeScript single-page app on Firebase (Google sign-in, Firestore with real-time listeners, Hosting).

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

Both must pass before a task counts as done.

## Rules

- Code, comments, docs, and commit messages are in English. All interface text is in Turkish. The project owner writes in Turkish, so reply in Turkish in chat.
- Development runs against the local emulators on the demo project `demo-legend-cards`. Never connect to or deploy to a real Firebase project unless the user asks.
- Firestore access is closed by default. A new data path needs explicit rules and emulator rules tests (see the checklist in `docs/conventions.md`).
- `reference/legacy/Legend_Card_Manager_v2.2.8.html` is the design and behavior reference. `Legend_Card_Manager_v2.1.15.html` next to it is kept as the earlier version. Do not edit either file, and do not port their code.
- Legacy rules that look odd are deliberate decisions by the DM and the owner (see `docs/domain.md`). Do not "fix" them unless asked.
- Do not commit unless the user asks.

## Change workflow

Changes are planned with [OpenSpec](openspec/): explore with `/opsx:explore`, plan with `/opsx:propose`, implement with `/opsx:apply`, and archive with `/opsx:archive`. Specs live in `openspec/specs/`, and changes in flight live in `openspec/changes/`.
