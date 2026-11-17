# Proposal

## Why

The app is now feature-complete enough for the table to call it its first real release, so the version should read 1.0.0 instead of 0.1.0. Two small requests come along with it: the owner has a picture made for the not-found page (a shy but dangerous manticore), and the dice channel only ever grows, so the DM wants a way to clear it, for example between campaigns or after testing, without touching anything else.

## What Changes

- The application version becomes 1.0.0 (`package.json` and `package-lock.json`); the shell already shows it as `v1.0.0`.
- The not-found page shows the owner's picture "mahcup ama tehlikeli mantikor" above its message, on every width, phones included. The picture ships as an optimized WebP bundled by Vite, not through the `build-art` pipeline.
- A new DM-only control "Zar kanalını sıfırla" in the Ayarlar screen's "Veri / Yedek" section deletes every dice roll record, public and hidden, after a confirmation that names how many rolls will go. Nothing else changes: combat and initiative, characters' initiative modifiers, dice styles, device settings, cards, LP and the log stay as they are.
- The reset is stored as a table change record and appears in the İşlem Logu as one event, "zar kanalını sıfırladı: <n> atış.", visible to everyone.
- **BREAKING** (data rule): dice roll records are no longer permanent. The server lets the DM, and only the DM, delete `diceRolls` and `dmRolls` records; nobody may change one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dice-rolls`: roll records may be deleted by the DM; a new requirement for resetting the channel and what it leaves alone.
- `table-settings`: the "Veri / Yedek" section on the Ayarlar screen gains the DM's dice channel reset; table change records now also record a dice reset.
- `activity-log`: a dice channel reset is one event in the list.
- `app-shell`: the not-found page shows the manticore picture.

## Impact

- `firestore.rules`: `diceRolls` and `dmRolls` allow `delete` for the DM; `tableChanges` accepts a `diceReset` record from the DM. Emulator rules tests in `tests/firestore.rules.emulator.test.ts`.
- `src/features/dice/api.ts` (reset function), `src/features/table/schema.ts` (table change union), `src/features/settings/SettingsPage.tsx` (the section and its confirmation dialog), `src/features/activity-log/eventText.ts` and `events.ts` (the new event text).
- `src/app/NotFoundPage.tsx` and a new picture asset under `src/app/`.
- `package.json`, `package-lock.json`.
- `docs/domain.md`: the `diceRolls`, `dmRolls` and `tableChanges` rows, and the glossary note that rolls are never deleted.
- No new dependencies. Rolls deleted by a reset cannot be restored (Point-in-time recovery on the live project is the only way back).
