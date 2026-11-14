# Proposal

## Why

Once a card or a True Word is used, its effect lives only in the table's memory. The app keeps who used what on which character, but not what is still in effect. The owner wants each character to show its active effects:

- what used cards and True Words left on it
- what its player or the DM wrote by hand
- what the player's held cards and active True Words do

Players and the DM remove an effect by hand when it ends. Characters (`add-characters`) were added as the place for this.

## What Changes

- **Effects on a character.** A new record for an effect on one character. It has a source, a name and a text, and records who added it and when. There are four sources:
  - a used card
  - a used True Word
  - a player's own effect ("Özel")
  - the DM's effect ("DM")
- **Using a card or a True Word can add an effect.** The use step offers "Aktif efekt olarak ekle" when a character is chosen from the list, checked by default. The effect copies the card's or word's name and visible text at the time of the use, in the same step as the use. A use with no character, or with a typed name, adds no effect.
- **The True Word use step asks for the character.** It gets the same list as a card's use step, with "Başka (yaz)…". The word use record keeps the character's name, and the character's ID when one was chosen. The log's True Word use event names the character, as a card's does.
- **Own effects and DM effects.** A player adds an effect to their own characters with a name and a text. The DM adds one to any character.
- **Removing deletes.** An effect is removed by deleting it; no history is kept:
  - a card or True Word effect: by the character's owner, the user who used the card or word, or the DM
  - a player's own effect: by the character's owner or the DM
  - a DM effect: only by the DM
- **Held effects on every character.** While a card in a player's hand is switched active by the DM, it shows as an effect on every active character of that player, marked "Elden". An active True Word shows the same way, marked "True Word". These are not stored. Nobody removes them there: they end when the card leaves the hand or the DM switches it off.
- **Where effects show.**
  - **Tiles:** a character's tile shows its number of effects, held ones included.
  - **Details:** the character's details list them under "Aktif efektler", held ones first, with "+ Efekt ekle" and "Kaldır" for those allowed.
  - **Hand summary:** the "Aktif efekt" count and list add the open effects of the player's active characters.
- **Not table actions.** Adding or removing an effect by hand is not listed in the İşlem Logu, and an open pack does not stop it. An effect that comes with a use is part of that use, so it waits for an open pack like the use does.

## Capabilities

### New Capabilities

- `character-effects`: effect records, their sources, who adds and removes them, the held effects shown on every character, the "Aktif efektler" list in a character's details, and the effect count on a tile

### Modified Capabilities

- `card-holdings`:
  - the use step offers "Aktif efekt olarak ekle" when a character is chosen
  - the hand summary counts and lists the open character effects
- `true-words`:
  - the use step asks on which character, with the same list and the effect box
  - the word use record keeps the character
- `activity-log`: a True Word use names the character, as a card use does

## Impact

- **Data:**
  - a new collection `characterEffects/{effectId}`
  - `wordUses/{useId}` gets `usedOn` and `usedOnCharacterId`, written only when a character was given; older records lack them, which reads as `null`
- **Firestore rules:**
  - a new `match /characterEffects/{effectId}` block: a use's effect agrees with the use made in the same request
  - `validWordUse()` accepts and checks the two new fields
  - emulator rules tests for both
- **App code:**
  - `src/features/characters/`: the effects' schema, api, provider data, the details' list and form, and the tile count
  - `src/features/hands/`: `closeHolding` and the use step, and `HandSummary`
  - `src/features/true-words/`: `useWord`, the use step in `TrueWordDetails`, and the word use schema
  - `src/features/activity-log/eventText.ts`
- **Docs:** `docs/domain.md` (glossary "Active effect", data model) and `docs/conventions.md` (providers).
- **Out of scope:**
  - durations and automatic expiry
  - editing an effect after it is added
  - effects on archived characters, which stay stored but are not shown or counted
  - stopping the same True Word from showing twice, once as active and once from a use
