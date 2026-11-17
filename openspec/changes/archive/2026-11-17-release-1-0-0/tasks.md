# Tasks

## 1. Rules: the DM deletes rolls and records a reset

- [x] 1.1 In `firestore.rules`, change `diceRolls` and `dmRolls` to `allow update: if false; allow delete: if isDm();` and update their comments (design D3). Add the `diceReset` branch to `tableChanges` create, beside `validTableChange()`: keys exactly `by, at, setting, rolls`, `by` the user, `at` the request time, `setting == 'diceReset'`, `rolls` an int `>= 0`, DM only (design D2). Update the block comment. Verify in `tests/firestore.rules.emulator.test.ts` with `npm run test:emulator`:
  - the DM deletes a public roll, a hidden roll's public record and its `dmRolls` record
  - a player's delete of their own roll, of another's roll and of a `dmRolls` record is denied
  - a roll update is still denied for everyone, the DM included
  - the DM's `diceReset` record is accepted; a player's is denied; a negative, fractional or string `rolls`, an extra key, a wrong `by` or a client time is denied
  - a `diceReset` record is never changed or deleted, and the existing `playerDraw` record tests still pass
- [x] 1.2 Update `docs/domain.md`: the `diceRolls` and `dmRolls` rows (no longer "never deleted": the DM deletes them with a channel reset), the `tableChanges` row (now also a `diceReset` record with `rolls`), and the dice channel notes in the overview and the "Zar atışı" glossary entry (rolls are still not log events, but a reset is). Verify that `npm run format:check` passes.

## 2. The table change record and its log event

- [x] 2.1 In `src/features/table/schema.ts`, make `tableChangeSchema` a discriminated union on `setting`: the `playerDraw` shape as today, and `{by, at, setting: 'diceReset', rolls: int >= 0}` (design D2). Add `diceReset` to `TABLE_SETTINGS`. Fix the type errors this causes. Verify with `schema.test.ts`: both shapes parse, and a `diceReset` without `rolls`, with a negative `rolls`, or with `before`/`after` fails.
- [x] 2.2 In `src/features/activity-log/eventText.ts`, switch the `tableSetting` case on `change.setting`, keeping the player draw text and adding `zar kanalını sıfırladı: <n> atış.` for `diceReset`. Verify with `eventText.test.ts` (142 rolls, and 0) and `events.test.ts` (a reset record becomes one `tableSetting` event in time order with an LP change); check that the player filter still leaves out table change records.

## 3. Resetting the channel

- [x] 3.1 Add `resetDiceChannel(db, { by })` to `src/features/dice/api.ts` (design D1): read every `diceRolls` and `dmRolls` ID from the server, count the `diceRolls`, write the `diceReset` record with the first deletes, then the remaining deletes in batches of at most 500 writes. Return the count. Verify in `src/features/dice/api.emulator.test.ts` with `npm run test:emulator`:
  - with public and hidden rolls (more than 500 writes in total), the DM's reset leaves both collections empty and writes one record whose `rolls` is the number of `diceRolls`
  - an empty channel writes a record with 0 and deletes nothing
  - a player's reset is denied and deletes nothing
- [x] 3.2 In `src/features/dice/DicePage.tsx`, use the local strip state only while its roll is still in the list, otherwise fall back to the newest roll with content (design D4). Verify with a `DicePage.test.tsx` case: after a roll has played in the strip, removing every roll from the provider leaves the strip empty and the channel empty. Add a unit test for `unseenCount` showing that the count drops when rolls disappear from the list.

## 4. The Ayarlar screen

- [x] 4.1 Turn the "Veri / Yedek" section of `src/features/settings/SettingsPage.tsx` into a component (design D5). For the DM: "Zar kanalı", its line ("Kanaldaki bütün atışları siler. Kartlar, LP, inisiyatif ve log etkilenmez."), and a danger `Button` "Zar kanalını sıfırla", disabled when the channel holds no rolls. Keep the backup note for everyone. Verify with `SettingsPage.test.tsx`: the DM sees the block and the note, a player sees only the note, and the button is disabled with no rolls.
- [x] 4.2 Add the confirmation `Dialog`: "Zar kanalı sıfırlansın mı?", "<n> atış kalıcı olarak silinecek.", the extra line when a combat is not idle ("Savaş açık: inisiyatif sırası kalır, yalnızca kanaldaki atışlar silinir."), "Vazgeç" and "Sıfırla". "Sıfırla" calls `resetDiceChannel` with a busy state, closes on success, and shows a Turkish message offline ("Bağlantı gerekiyor.") or after a partial failure ("Bazı atışlar silinemedi; tekrar dene."). Verify with `SettingsPage.test.tsx`: the count is shown, the combat line shows only during a combat, "Vazgeç" deletes nothing, "Sıfırla" calls the reset, and both error texts appear on their failures.
- [x] 4.3 Check the screen 360 CSS pixels wide in the browser against the emulators: the button and the dialog fit, and the page has no horizontal scrollbar.

## 5. The not-found manticore

- [x] 5.1 Convert `~/Downloads/mahcup_ama_tehlikeli_mantikor.png` with `sharp` (a one-off command, not a script in the repo) to `src/app/notFoundManticore.webp`, 1200 px wide, quality about 80 (design D6). Verify that the file is about 100 KB or smaller and that the PNG is not added to the repo.
- [x] 5.2 Make `src/app/NotFoundPage.tsx` only the picture, centered, with the line "Sayfa bulunamadı" under it and nothing else (the owner's request): scaled to the width with a maximum, with its `width` and `height`, `alt="Mahcup ama tehlikeli bir mantikor"`, visible on phones, and hidden on a load error. Verify with the route tests in `routes.test.tsx`: the page holds one image and the line, no link, and the menu leads to "Oyuncu elleri"; after an `error` event the line remains. Check 360 CSS pixels wide in the browser: no horizontal scrollbar.

## 6. Version 1.0.0

- [x] 6.1 Run `npm version 1.0.0 --no-git-tag-version` (design D7). Verify that `package.json` and both version fields in `package-lock.json` read `1.0.0`, and that the sidebar shows `v1.0.0` in the dev server.

## 7. Integration

- [x] 7.1 Run `npm run check` and `npm run test:emulator`, and verify both pass.
- [x] 7.2 In the browser against the emulators, as the DM with two player tabs: make public and hidden rolls, open a combat with rolled initiative, reset from Ayarlar, and verify that every channel and strip empties without a reload, the menu count clears, the initiative order stays, and the İşlem Logu shows "zar kanalını sıfırladı: <n> atış." to the players. Then stop every process on the project's ports as `CLAUDE.md` describes.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, then commit when the owner asks.
