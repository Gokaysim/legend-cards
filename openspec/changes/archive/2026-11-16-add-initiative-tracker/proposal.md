# Proposal

## Why

The table plays D&D 3.5, and the DM keeps the initiative order of a fight by hand: everyone calls out a d20 plus their modifier, the DM writes the order down, and then tracks whose turn it is. The owner wants this in the app, next to the dice the table already rolls there: the DM starts a combat, every player rolls their characters' initiative from their own device, and everyone sees the same order and whose turn it is, live.

On 2026-11-16 the owner settled these points in an explore session:

- **The system.** The group plays D&D 3.5, not 5e. The project's docs say 5e and are corrected.
- **The order.** A natural 20 goes to the top and a natural 1 to the bottom, whatever the total; this is the table's own rule. Equal totals, and the natural 20s and natural 1s among themselves, are put in a random order. The DM then fixes the order by dragging, for example after asking for Dexterity modifiers.
- **No separate screen.** The tracker is a tab of the Zarlar screen, and the Zarlar screen gets a new layout while it changes.
- **Tracking turns, not only the order.** The active combatant is marked, the DM steps to the next one, and a round counter counts the rounds.
- **The owner rolls.** A player enters their character's modifier and rolls on their own device; the roll shows in the dice channel. The DM can roll for anyone.
- **NPCs are typed**, with a count: "Goblin" ×4 becomes Goblin 1 to Goblin 4. The DM rolls them hidden, and players see only their names and places.
- **Added during a fight by hand.** A combatant added once the fight runs gets no roll; the DM drags it into place.
- **One combat at a time.** Ending it clears it; the İşlem Logu keeps that it started and ended.

## What Changes

**The Zarlar screen's new layout**
- The dice tray is wide, on the right, with the roll form below it as now.
- On the left, "Kanal" and "İnisiyatif" are two tabs that share one column. Kanal is the dice channel as it is today.
- The dice style and the device settings ("Bu cihazda") leave the screen and open in a dialog from a "Zar stili" button on the tray.
- On a phone: the tray, then the form, then the tabs.

**Starting a combat (the DM)**
- "Savaş başlat" opens a setup: the table's characters grouped by owner, the players' characters checked and the DM's own unchecked, and "NPC ekle" with a name, a count of 1 to 12 and a modifier.
- "Modifier iste" opens the combat for rolling. The DM's NPCs are rolled at once in a hidden roll.

**Rolling initiative (everyone)**
- Each player sees their own characters in the İnisiyatif tab, each with a modifier box (−10 to +30), filled with the value they used last time, and "At".
- "At" rolls 1d20 plus the modifier on the player's device. The roll shows in the channel with the note "İnisiyatif · <character>". The modifier is saved on the character for the next combat.
- A combatant rolls once. The DM can let one roll again ("Yeniden attır"), and can roll for anyone.
- A player whose characters are asked for is taken to the İnisiyatif tab on the Zarlar screen, and sees a notice on any other screen.
- The list fills live as people roll.

**The fight**
- "Başlat" fixes the order: natural 20s first, then the totals from high to low, then natural 1s, with ties in a random order fixed once for every device. Combatants who did not roll go last, marked "atmadı".
- The active combatant is marked. "Sıradaki" steps to the next; after the last, the next round starts. The DM, or the owner of the active character ("Turumu bitirdim"), moves on; only the DM steps back.
- The owner of the character whose turn comes gets a notice, "Sıra sende: <character>", on any screen.
- The DM drags combatants to new places, adds a character or a typed NPC without a roll (it goes last, marked "elle eklendi"), and removes combatants.
- Players see every combatant's place and the players' totals; for an NPC they see only its name.
- "Bitir" asks for confirmation, then ends the combat and clears the list.
- Every step that changes the combat needs a connection.

**The log**
- The İşlem Logu shows when the DM started a fight, with how many combatants, and when it ended, with how many rounds.

**Docs**
- `CLAUDE.md`, `docs/domain.md` and the OpenSpec project context say D&D 3.5.

## Capabilities

### New Capabilities
- `initiative-tracker`: the combat and its initiative order. It covers:
  - the İnisiyatif tab
  - the setup and the typed NPCs
  - asking for initiative, rolling it, and rolling again
  - the order rule and its random ties
  - what players and the DM see
  - starting the fight, the turns and the rounds, and the turn notice
  - reordering, adding and removing during the fight
  - ending the combat, one combat at a time, and the connection
  - the combat records and their access rules

### Modified Capabilities
- `dice-rolls`: the Zarlar screen gets its new layout (the wide tray, the Kanal and İnisiyatif tabs, the roll form below the tray), and the dice style and the device settings move into a dialog.
- `characters`: a character keeps the initiative modifier it rolled with last, and the owner and the DM may change it.
- `activity-log`: the start and the end of a combat are events, listed only without a player filter.

## Impact

- **Data.**
  - A new `combat/main` document: the combat's phase, its round, the active place and the order.
  - A new `combatants/{combatantId}` collection: one record per combatant of the open combat, with its public roll for a player's character.
  - A new DM-only `dmCombatants/{combatantId}` collection: an NPC's roll and modifier.
  - A new `combatChanges/{changeId}` collection: one record when a fight starts and one when it ends, for the log.
  - `characters/{characterId}` gets an optional `initiativeModifier`.
- **Rules and tests.**
  - `firestore.rules` gets the four new paths: the DM runs the combat; a player only writes the roll of their own combatant, together with its roll record, and moves the turn on from their own active character. Only the DM reads the NPC rolls.
  - The character rule allows `initiativeModifier`.
  - `tests/firestore.rules.emulator.test.ts` covers every allowed and denied case.
- **Code.**
  - A new `src/features/combat/`: the schema and api, the order rule, a provider and its hooks, the İnisiyatif tab, the setup and NPC forms, and the notices.
  - `src/features/dice/`: the Zarlar page's new layout, the settings dialog, and a way to write other records in the same batch as a roll.
  - `src/features/characters/`: the new field.
  - `src/features/activity-log/`: the combat records as a source.
  - `src/app/`: the provider and the notices mounted in `AppShell`.
  - `src/test/`: a test combat provider and fixtures, and a `combat` option for `renderApp`.
- **Dependencies.** New: `@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` (MIT), for dragging that works with touch and the keyboard.
- **Unchanged.** Cards, LP, GP, the table lock and the dice rules. An initiative roll is an ordinary roll in the channel.
- **Docs.** `docs/domain.md` gets the combat words, `docs/conventions.md` gets the combat feature and its provider, and `CLAUDE.md`, `docs/domain.md` and `openspec/config.yaml` say D&D 3.5.
