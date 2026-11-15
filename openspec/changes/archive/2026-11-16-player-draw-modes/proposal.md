# Proposal

## Why

Sometimes the DM wants to hand the players more power for a while. For example, after a boss fight each player gets a card from a set of their choice, or picks the card they want. Today only the DM's draw dialog has filters and "Destede ne var?". A player's draw is always random from the whole pool, so the DM has to make every draw for every player. The owner wants a table setting that the DM turns on and off, which gives the players the DM's draw tools for as long as it is on.

## What Changes

- **A table setting "Oyuncu kart çekişi"** with three modes, changed only by the DM:
  - **Kapalı** (the default, also for a table that never set it): a player's draw dialog is as today, with no filters.
  - **Filtreli çekiş**: a player's random draw dialog gets the set, cost, mechanic pack and rarity filters, as the DM's has. The card is still random among the matching cards.
  - **Kart seçme**: it also gets the keyword and "Destede ne var?". A keyword that matches one card lets the player draw exactly that card.
  - In every mode, a player's draw still costs 1 LP, only into their own hand. The pool rules stay: cards whose "Kart çekmede çıkar" is off, held cards with one copy, Cursed cards and retired cards are never drawn. Cursed draws and packs do not change. As the owner chose, there is no limit on how many draws a player makes while a mode is on.
- **The server follows the mode.** A player's paid draw may record filters only while the mode allows them: the four filters under "Filtreli çekiş", and the keyword too under "Kart seçme". Under "Kapalı" the server denies a player's draw with filters, as it does today.
- **The "Veri / Yedek" screen becomes "Ayarlar".** It keeps its address and icon, and now has two sections:
  - "Masa ayarları" holds the "Oyuncu kart çekişi" choice. The DM changes it. Players see it, read-only.
  - "Veri / Yedek" stays "Yakında".
- **A banner while a mode is on.** Every screen shows a banner to everyone, which names the mode and what it allows. The DM's banner has "Kapat", which sets the mode back to "Kapalı" from any screen. A player's draw dialog shows the mode as a chip.
- **The change is live.** When the DM changes the mode, every open player draw dialog follows at once: filters that the new mode does not allow are cleared, and "Destede ne var?" closes when it is no longer allowed.
- **The log.** Each change of the mode is one event in the İşlem Logu, for example "DM oyuncu kart çekişini “Filtreli çekiş” yaptı.". A player's filtered draw shows its filters in its draw event, the same way the DM's does today.
- The watching view of a live draw stays as it is. It names no filters, and a set filter shows only through the cardback.

## Capabilities

### New Capabilities

- `table-settings`: the table-wide settings that the DM changes for everyone, starting with "Oyuncu kart çekişi". Covers the Ayarlar screen's "Masa ayarları" section, the banner while a mode is on, the change records, and who may read and write them.

### Modified Capabilities

- `card-draws`:
  - a player's draw dialog has filters, keyword and "Destede ne var?" according to the mode
  - the server accepts a player's filters by the mode
  - a player's draw records its filters
  - the draw table shows the mode chip
- `live-draws`: the watching view lists no filters of any drawer. Today the requirement names only the DM's filters.
- `activity-log`:
  - mode changes are events of the log, listed only without a player filter
  - a draw event shows its filters whoever drew
- `app-shell`: the navigation entry "Veri / Yedek" is labelled "Ayarlar", and that screen is no longer a whole placeholder.

## Impact

- **Firestore** (`firestore.rules`, `firestore.indexes.json` if needed):
  - `table/main` gets the mode (`playerDraw`) and the ID of its last change record. The pack steps may change only `openPackId`. The DM may change only the mode, together with a new change record, also while a pack is open.
  - A new `tableChanges/{changeId}` collection: one record per mode change (who, when, before, after). Only the DM creates a record, together with the table change. Every signed-in user reads the records. No record is changed or deleted.
  - The `draws` create rule: `paidByPlayer()` accepts filters by the stored mode. The draw rules already read `table/main`, so reading the mode costs no extra document access.
  - Emulator rules tests for each allowed write and for its denials.
- **App code:**
  - `src/features/table/` (schema, api, context: the mode, a hook, the change write)
  - `src/features/packs/api.ts`: the pack steps merge into `table/main` instead of overwriting it, so the mode survives
  - `src/features/settings/SettingsPage.tsx` (the Ayarlar screen)
  - a new banner in `src/app/layout/`
  - `src/app/screens.ts` (the label)
  - `src/features/draws/DrawDialog.tsx` (the filters, keyword and peek by mode, the chip, a clear message when a draw is denied because the mode changed)
  - `src/features/activity-log/` (the new query, event and text)
- **Tests:** the unit tests next to each file, `DrawDialog.test.tsx`, the log tests, `routes.test.tsx` and `screens.test.ts` for the label, and `tests/firestore.rules.emulator.test.ts`.
- **Docs:** `docs/domain.md`:
  - the `table/main`, `draws` and new `tableChanges` rows of the data table
  - the screen list
  - a new deliberate decision that the DM may give the players the DM's draw tools
- **Out of scope:**
  - selecting a face in "Destede ne var?" to draw it, which the DM's dialog does not have either
  - per-player modes
  - a mode that turns itself off
  - filters for Cursed draws or packs
  - the data and backup features of the Veri / Yedek section
