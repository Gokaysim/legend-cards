# Tasks

## 1. Data shapes and the shared use target

- [x] 1.1 Create `src/features/characters/effects.ts` (schema) with `characterEffectSchema` (D1), `EFFECT_SOURCES`, `EFFECT_LIMITS` (own and DM: name 60, text 500; use: name 200, text 2000), `CHARACTER_EFFECTS_COLLECTION` and the converter. Verify with `effects.test.ts`:
  - a card, a word, an own and a DM effect
  - a hand-made name over 60 and an empty hand-made text
  - a `sourceId` on an own effect, and none on a card effect
  - `cursed` on a word effect
- [x] 1.2 Move `UseTarget`, `NO_USE_TARGET` and `readUseTarget` from `src/features/hands/api.ts` to `src/features/characters/useTarget.ts`, and import them in the hands api (design D5). Verify that `npm run typecheck` and the hands tests pass unchanged
- [x] 1.3 Add `usedOn` and `usedOnCharacterId` to `wordUseSchema` in `src/features/true-words/schema.ts`, both nullable and defaulting to `null`, with the refinement that an ID comes only with a name (design D4). Verify with `schema.test.ts`: an old use without the fields, a use on a character, a typed name, and an ID without a name

## 2. Firestore rules

- [x] 2.1 Extend `validWordUse()` with the two optional fields and `usedCharacterMatches` (design D4). Verify with emulator rules tests:
  - allowed: a use without the fields, a use with a typed name, and a use on an active character with its name
  - denied: an unknown or archived character, and a name that is not the character's
- [x] 2.2 Add `match /characterEffects/{effectId}` with the create rules for `card`, `word`, `own` and `dm`, the delete rules by source, and no update (design D2, D3). Verify with emulator rules tests:
  - allowed:
    - a card use with its effect in one batch
    - a word use with its effect in one batch
    - a player's own effect on their character
    - the DM's effect on any character
    - each permitted delete: the owner, the user who used, and the DM for card and word effects; the owner and the DM for own effects; the DM for DM effects
    - adding and deleting by hand while a pack is open
  - denied:
    - a card or word effect without its use in the same request, on another character, or for another user's use
    - an own effect on another user's character, or on an archived character
    - a hand-made name over 60 or text over 500
    - a player's DM effect
    - each forbidden delete
    - any update
    - a signed-out read
- [x] 2.3 Add a "heaviest request" case: a player's paid use of a normal card, released to the pool, on a character, with its effect. Verify `npm run test:emulator` passes

## 3. Steps

- [x] 3.1 Let `closeHolding` take `addEffect` and write the card's effect in its transaction for a chosen character (design D2). Verify with `hands/api.emulator.test.ts`:
  - a use with an effect, holding the card's visible text and `cursed` for a Cursed card
  - a use without one
  - a typed name, which adds no effect even with `addEffect`
- [x] 3.2 Let `recordWordUse` take the target and `addEffect`, record `usedOn` and `usedOnCharacterId`, and write the word's effect (design D2, D4). Verify with `true-words/api.emulator.test.ts`:
  - a use on a character with and without an effect
  - a typed name
  - an archived character, which is refused with the LP unchanged
- [x] 3.3 Add `addEffect` and `removeEffect` to `src/features/characters/api.ts` as plain writes (design D3). Verify with `characters/api.emulator.test.ts`:
  - an own and a DM effect added
  - removed by each permitted user
  - a denied delete reported as `permission-denied`

## 4. Provider and derived effects

- [x] 4.1 Subscribe to `characterEffects` in `CharactersProvider`. Add `useCharacterEffects()`, `addEffect` and `removeEffect` to the actions, and the pure `effectsOf(effects, characterId)` (design D7). Verify with `charactersContext.test.ts`: newest first, and one character's effects
- [x] 4.2 Add `heldEffects(entries, wordEntries)` in `src/features/characters/heldEffects.ts`, taking minimal shapes (design D6). Verify with `heldEffects.test.ts`:
  - only active cards and active words
  - visible text
  - the Cursed mark
- [x] 4.3 Add `effects` and its fake steps to `TestCharactersProvider` and `renderApp`, and an effect fixture to `src/test/characterFixtures.ts`. Verify `npm run test` passes

## 5. The use steps

- [x] 5.1 Move the picker into `src/features/characters/CharacterPicker.tsx` with "Aktif efekt olarak ekle", checked by default and shown only for a chosen character, and use it in `HoldingDetails.tsx` (design D5). Verify:
  - `HoldingDialog.test.tsx` still passes
  - new cases: the box shows for a character and sends `addEffect: true`, sends `false` when unchecked, and is absent for none and for a typed name
- [x] 5.2 Use `CharacterPicker` in `TrueWordDetails.tsx`, with the player's group first, and send the target and `addEffect` to the word's use. Verify with the True Words details tests: the list, the box, the typed name, and the archived-meanwhile message
- [x] 5.3 Name the character in a True Word use's log text in `src/features/activity-log/eventText.ts`. Verify with `eventText.test.ts`: a use on a character, paid and free, and an old use without one

## 6. Effects on the Karakterler tab and in the summary

- [x] 6.1 Show the "✦ n" count on `CharacterTile`, counting the stored effects and the held list, from `useHandCharacters(profile, isWide, held)`, with `HandsPage` passing `heldEffects(...)` (design D6, D8). Verify with `CharactersTab.test.tsx`:
  - the counts on two characters with one shared held card
  - no count at 0
  - a live change
- [x] 6.2 Add the "Aktif efektler" section to `CharacterDetails`:
  - the order held, words, stored newest first
  - the marks and the Cursed color
  - who added each stored effect and when
  - "Aktif efekt yok."
  - "Kaldır" only for those allowed
  - its failure message

  Verify with component tests for a player, for another player, and for the DM, each on a card, an own and a DM effect
- [x] 6.3 Add `EffectFormDialog` and "+ Efekt ekle" for the owner and the DM, saving an `own` or a `dm` effect. Verify with component tests:
  - the name and text checks
  - the saved source by role
  - no button for another player
  - the form closes at once, since the write is queued
- [x] 6.4 Count and list the stored effects of the player's active characters in `HandSummary`, grouped by character after the active words. Verify with `HandsPage.test.tsx`: the summary scenario with an archived character's effect left out
- [x] 6.5 Document the effects in `docs/domain.md` (the "Active effect" glossary entry, `characterEffects/{effectId}`, and the new word use fields) and `docs/conventions.md` (the provider, `renderApp` and the shared picker). Verify that `npm run format:check` passes

## 7. Integration

- [x] 7.1 Run `npm run check` and `npm run test:emulator`. Both must pass
- [x] 7.2 In the dev app, on a copy of the emulator data that is not exported:
  - Oyuncu 1 uses a card on Thorin with its effect, and an instant card without one
  - the DM switches a held card active, which shows on both of Oyuncu 1's characters
  - Oyuncu 1 adds and removes an own effect
  - the DM adds a DM effect, which Oyuncu 1 cannot remove
  - Oyuncu 1 uses a True Word on Thorin
  - check the tab and the summary at 360 px and 1280 px

  Then stop every process on the project's ports and confirm with `lsof -nP -iTCP -sTCP:LISTEN`

## Workflow follow-up

- Archive the change with `/opsx:archive` once both checks pass.
