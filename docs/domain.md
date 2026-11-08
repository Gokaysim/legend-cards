# Domain reference

What Legend Card Manager is about, what its words mean, and how the original app behaved. For how the code is written, see [conventions.md](conventions.md).

## The product

Our DM runs a **side card system** on top of a D&D 5e campaign:

- Players earn **Legend Points (LP)**. They work much like inspiration: the DM hands them out at the table for good play, and players spend them.
- With LP, players buy **packs** and pick **cards** from them. A card has an effect that the table applies in play: a bonus, a twist, or a risk.
- Some cards are **Cursed**: a player gets them as a price or a punishment. A few rare cards are **Blessed**.
- Players can also learn **True Words**, a separate kind of power with its own draft.
- A player can build a one-off **Custom Card** from effect pieces in a **Custom Card Draft**. The **Elixir Shop** lists **Elixirs**, which change cards themselves.

**Legend Card Manager is a tracker, not a game engine.** The DM and the players make the decisions at the table. The app records them:

- who holds which card
- how many LP each player has
- which effects are active
- what happened, in a log

It does not enforce D&D rules or the table rules, and it never spends LP on its own.

The original app was a single offline HTML file used on one computer. The new app is online and real-time, so the DM and the players can use it together from their own devices.

### Actors

| Actor                   | Role                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **DM** (Dungeon Master) | Runs the game, gives out and takes away LP, decides when packs are opened, and maintains the card data. |
| **Player**              | A member of the group with a hand of cards, an LP balance, and learned True Words.                      |

In the legacy app, the DM operated everything alone and players were just names in a list. The new app signs people in with Google:

- **There is one group.** Everyone who signs in is a player in it and gets a profile with their Google name and picture.
- **The DM is set by an admin script** (`npm run set-role`), never from the app. In the owner's words, "admin" and "DM" are the same role.
- **Every signed-in user can see everything**, including the other players' profiles and, later, their cards.
- **Only the DM edits** the card data and does the DM-only card actions. Players do some card actions for themselves, such as opening packs and using their cards. These arrive with the later card changes.

## Data model

All data lives in Firestore. The paths that exist so far:

| Path                    | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Who writes                                                                                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users/{uid}`           | A user's profile: display name, picture, role (`player` or `dm`), creation time. No email.                                                                                                                                                                                                                                                                                                                                                                                                                              | The user creates their own profile as a player and updates the name and picture. Only the admin script changes the role.                                                                                                                                                   |
| `cards/{cardId}`        | One card definition: kind (`normal`, `blessed` or `cursed`), name, normalized name, set code, cost, rarity, mechanic pack, text, and a `retired` flag. The ID is the deck plus the normalized name, for example `legend-abolethseyes`. A normal card also has a `holder`: `{ uid, userCardId }` while it is in a hand, `null` while it is in the pool. Blessed and Cursed cards are repeatable, so their `holder` is always `null`. Cards imported before card holdings have no `holder` field, which counts as `null`. | Only the card import script (`npm run import-cards`) writes the definitions, and it never writes `holder`. The application changes only a normal card's `holder`, together with the holding that explains it. Every signed-in user reads them.                             |
| `userCards/{holdingId}` | One card's stay with one player (a holding): the card (its ID, and its name and kind when given), the player, when it was given, by whom, and how (`dm`, or `transfer` with `transferredFrom`), whether it is active, its note, and its cost override. When the card leaves the hand, the holding is closed with when, by whom, and why: `used` (with `usedOn`, the character, if given), `discarded`, or `transferred` (with `transferredTo`, the receiver's new holding). Open holdings have `returnedAt: null`.      | Only the DM gives cards. The holder or the DM uses a card and edits its note. Only the DM discards, transfers, switches a card active and sets its cost. A holding is closed, never deleted, and a closed holding never changes. Every signed-in user reads every holding. |

The agreed target model for the coming changes is in the design of the OpenSpec change `add-user-roles` (after it is archived: `openspec/changes/archive/*-add-user-roles/design.md`, "Target data model"). It covers:

- the card library (`cards`), where each normal card records whether it is in the pool or with a player
- the permanent history of who held which card (`userCards`)
- pack openings and draws (`draws`)
- the party's shared GP (`party/main`)
- the LP and GP history (`ledger`)

Each change adds its path to this table.

Card holdings refine the target model too:

- There is no `initial` way of giving. At the very end, before going live, the DM enters the table's current hands with the normal "give a card" action.
- `drawId` arrives with pack-opening, together with the ways `pack` and `draw`.
- `cardKind`, `transferredFrom` and `transferredTo` are new. They let the rules check both sides of a movement without querying, and they let a later history screen follow a card from hand to hand.
- A DM's extra copy of a held normal card is a holding of its own that leaves the card's `holder` alone. When the holder's holding closes, the card returns to the pool even while an extra copy is still in a hand.

The card library refines the target model in three ways:

- The set field is `setCode`, as agreed in `docs/conventions.md`.
- Rarity is stored in lowercase (`common`, `rare`), and the interface shows "Common" and "Rare".
- "Blessed" and "Cursed" in the CSV Set column are markers, not sets. They become the card's `kind`, and its `setCode` is empty (`null`). Blessed and Cursed cards have no rarity, and Cursed cards have no mechanic pack.

## Glossary

| Term                        | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legend Points (LP)**      | The players' currency for cards. The DM adds and removes LP by hand. Opening a pack never deducts LP automatically.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **GP**                      | Gold pieces, the D&D currency. Pack price labels show an LP price and an alternative GP price.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Card**                    | One card definition: a **name**, **set**, **cost**, **rarity**, **text** (the effect), and **mechanic pack**. Cursed cards are cards too, flagged as cursed. Custom Cards and Elixir Withdrawal are not library card definitions; see their entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Cost**                    | The card's LP cost as written on the card. It is text, not always a number: `0`, `1`, `2`, `3`, `5`, `6`, `X`, or `d6`. A card in a hand can carry a **cost override**. The legacy app then showed a badge marking whether the current cost is lower or higher than the base cost.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Card text**               | The effect. Text in square brackets (`[like this]`) is hidden metadata: you can search for it, but it is not shown.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Set**                     | The world or adventure a card belongs to. Card data stores a short **set code** (for example `Kesqer`). The interface shows the **official set name** (for example "Kesqerian Nights"). See [Sets](#sets).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Mechanic Pack**           | A cross-set theme a card belongs to, for example Blood & Battle, Risk & Reward, Dungeoneer's Kit, Gambler's Gambit, Arcanus Divine, Permamancy, Horn of Plenty, Legends of Old. Each one has its own pack. See [Mechanic Packs](#mechanic-packs) for what each one is about.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Rarity**                  | `Common` or `Rare`. Blessed cards have no ordinary rarity (`—`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Cursed card**             | A negative card. Cursed cards are not in the normal pool. They form one global **Cursed Deck** across all sets. They are repeatable: many players can hold the same cursed card, several times over.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Blessed card**            | A rare, very positive card. Its set, rarity or mechanic pack is marked "Blessed". In the owner's data, a Blessed card has the set `Blessed`, the rarity `—`, and a real mechanic pack. It is always available (repeatable), so it can come up in random draws, in its mechanic's Mechanic Pack, and in the Golden Pack's 2% Blessed slot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Pool**                    | The normal cards that can still be drawn or picked. Each normal card has **one** copy in the pool. A card in someone's hand is out of the pool until it is returned. Blessed cards always stay in the pool. Cursed cards, Custom Cards and Elixir Withdrawal are never in it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Hand**                    | The cards a player holds, in the order they got them. A hand card can be made **active**, can carry a note, and can have a cost override.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Active effect**           | A hand card or a True Word that is switched on right now. Active effects are listed together, and active cursed cards are highlighted in red.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Library**                 | All card definitions, with filters, search, list and card views, and the status of each card (in the pool or in someone's hand).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Cursed Deck**             | The global set of cursed cards. Cursed packs draw from it, and the DM can also draw a random cursed card from it directly. Elixir Withdrawal is not in it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Pack**                    | A set of face-down cards a player opens and then chooses from. See the pack types below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Pack types**              | **Standard**, **Premium** and **Cursed** exist per set. **Mechanic** exists per mechanic pack. **Pandemonium** and **Pandemonium Cursed** exist only for the Pandemonium set. **Golden** and **Cursed Golden** each exist once, across all sets. See [Rules observed in legacy v2.2.8](#rules-observed-in-legacy-v228).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Pandemonium Cursed Pack** | The Pandemonium set's cursed pack, added in v2.2.8: Rare cards from Pandemonium plus one mandatory cursed card.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Pack opening**            | An opening animation plays, the pack's cards lie face down, the player **flips every card**, and only then chooses.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Draw**                    | Taking cards outside packs. There are three kinds: a **random batch draw** (optional filters by cost, mechanic pack, rarity or keyword, drawing one card at a time until done), a **specific draw** (search and pick a card), and a **random cursed draw** from the Cursed Deck.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **True Word**               | A named power with an effect text, kept in its own list. In a **True Word draft**, a player sees 3 random words they have not learned yet and learns 1. Learned words can be switched active or inactive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Shops**                   | The menu entry and screen that leads to the two shops: the **Pack Shop** and the **Elixir Shop**. Added in v2.2.8; before that, the menu entry was the Pack Shop itself.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Pack Shop**               | The shop where packs are offered, in two groups: **Set Packs** (one group per set, Pandemonium included) and **Mechanic Packs** (one pack per mechanic pack, plus a **Golden Packs** group with the Golden and the Cursed Golden Pack). In v2.1.15 there was a third group, Rare Packs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Elixir Shop**             | A catalog of **Elixirs**, plus the special **Elixir Withdrawal** card. Added in v2.2.8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Elixir**                  | An item in the Elixir Shop with a **name**, a **cost** (text, as written) and an **effect**. Elixirs are effects that change cards themselves. The app lists them; it does not record who buys one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Elixir Withdrawal**       | A special Cursed card that is only available through the Elixir Shop. It is not in the Cursed Deck and is never drawn. It is repeatable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Custom Card Draft**       | A draft in which a player builds a **Custom Card** from **custom effects**, choosing a card cost of 1, 3 or 5 first. Added in v2.2.8. See [Custom Card Draft](#custom-card-draft).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Custom Card**             | A card made in a Custom Card Draft for one player. It has the chosen cost and the texts of its effects. It is not a library card, never enters the pool, and is destroyed when it leaves the hands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Custom effect**           | One effect type (for example Caster or Draw) in one cost variant (1, 3 or 5), with its own text and picture. Custom effects come from their own CSV.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Kurallar**                | The rules page added in v2.2.8, on which the Cardmaker explains the table rules. See [Table rules](#table-rules-kurallar-page).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Cardmaker**               | The app's mascot, an aunt-like character who talks to the players (the rules page has them call her "Cardmaker Teyzeciğim"). Each screen has its own picture: Shops `cardmaker_keep`, Pack Shop `cardmaker_shop`, Elixir Shop `cardmaker_zaddir`, library `cardmaker_lib`, Cursed Deck `cardmaker_cursed`, True Words `cardmaker_true`, Custom Card Draft `cardmaker_custom`, log `cardmaker_think`, Kurallar `cardmaker_wave` (with the `card_info` illustration), and Veri / Yedek `cardmaker_peek`. Inside the Pack Shop, each set group shows its own Cardmaker, Pandemonium shows `cardmaker_pandemonium`, and the Golden Packs group shows a larger `cardmaker_gold`. A "shocked" pair appears when a Blessed card is revealed. On the Shops screen and the Pack Shop's main view, resting the pointer on a shop or a mechanic pack for one second makes the Cardmaker say what it contains. |
| **Cardback**                | The image on the back of a face-down card, one per set (`<set>_cb.png` in the legacy app). The opening animation of a set's packs uses the set's cardback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Session log**             | The list of actions taken in this session ("X opened Y and chose Z").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Undo**                    | Steps back through this session's actions. Like the log, it only lasts for the current session.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Rules observed in legacy v2.2.8

These rules are transcribed from `reference/legacy/Legend_Card_Manager_v2.2.8.html`, from its "CORE RULES" header and these functions:

- packs and drawing: `packDefs`, `packPrice`, `canOpenPack`, `openPack`, `flipPackOption`, `selectCursedPackNormal`, `addToHand`, `available`, `matchingDrawCards`
- Custom Card Draft: `customDraftStart`, `customDraftOptions`, `selectCustomEffect`, `customDraftRequired`, `customDraftPicksResolved`, `finishCustomDraft`
- Elixir Shop: `elixirShop`, `importElixirsCSV`, `addElixirWithdrawal`
- data tools: `parseCustomEffectsCSV`, `importImages`, `flushDataset`, `diagnosticsData`

The header comment was not updated for v2.2.8. It still mentions the tearing animation and JSON backups. Where the header and the functions disagree, the functions are what the app does.

> **Reference only.** None of these rules is implemented in the new app yet. Each rule becomes binding when a feature change brings it into the OpenSpec specs.

### Packs

"Available" means a card in the pool, as defined above. The counts are of available cards in the pack's scope.

| Pack                                              | Shop group                                | Price label     | Can be opened when                                                                                    | Cards shown (face down)                                                                                                                                             | The player gets                                                        |
| ------------------------------------------------- | ----------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Standard** (per set)                            | Set Packs                                 | 2 LP / 5000 GP  | the set has at least 9 available cards                                                                | 5 random cards from the set                                                                                                                                         | 1 card of their choice                                                 |
| **Premium** (per set)                             | Set Packs                                 | 3 LP / 7500 GP  | the set has at least 9 available cards, and at least 3 of them are non-blessed Rare cards             | 1 non-blessed Rare card, plus 4 more random cards from the set (any rarity)                                                                                         | 1 card of their choice                                                 |
| **Cursed** (per set)                              | Set Packs                                 | 1 LP / 2500 GP  | the set has at least 5 available non-Rare, non-blessed cards, and the Cursed Deck is not empty        | 5 non-Rare cards from the set, plus 1 random cursed card from the Cursed Deck, shuffled together                                                                    | **both** the cursed card (mandatory) and 1 normal card of their choice |
| **Pandemonium** (the Pandemonium set only)        | Set Packs, in the Pandemonium group       | 3 LP / 7500 GP  | the Pandemonium set has at least 9 available Rare cards                                               | 5 random Rare cards from Pandemonium                                                                                                                                | 1 card of their choice                                                 |
| **Pandemonium Cursed** (the Pandemonium set only) | Set Packs, in the Pandemonium group       | 3 LP / 7500 GP  | the Pandemonium set has at least 5 available non-blessed Rare cards, and the Cursed Deck is not empty | 5 random non-blessed Rare cards from Pandemonium, plus 1 random cursed card from the Cursed Deck, shuffled together                                                 | **both** the cursed card (mandatory) and 1 Rare card of their choice   |
| **Mechanic** (per mechanic pack)                  | Mechanic Packs                            | 4 LP / 10000 GP | at least 29 available cards have that mechanic pack                                                   | 5 random cards with that mechanic pack. The mechanic's Blessed cards are among them, because they are always available.                                             | 1 card of their choice                                                 |
| **Golden** (once, all sets)                       | Mechanic Packs, in the Golden Packs group | 4 LP / 10000 GP | at least 49 available non-blessed Rare cards exist across all sets                                    | 5 random non-blessed Rare cards. **With a 2% chance** (when a Blessed card exists and at least 4 Rare cards are available): 1 random Blessed card plus 4 Rare cards | 1 card of their choice                                                 |
| **Cursed Golden** (once, all sets)                | Mechanic Packs, in the Golden Packs group | 3 LP / 7500 GP  | at least 5 available non-blessed Rare cards exist across all sets, and the Cursed Deck is not empty   | 5 random non-blessed Rare cards, plus 1 random cursed card                                                                                                          | **both** the cursed card (mandatory) and 1 Rare card of their choice   |

More pack rules:

- The Pandemonium set has no Standard, Premium or Cursed pack. It has the Pandemonium Pack and the Pandemonium Cursed Pack, shown as its own group under Set Packs, after the other sets.
- The Mechanic Packs section shows one price for all Mechanic Packs, in its heading ("4 LP / 10.000 GP"). The mechanic pack tiles have no price of their own. The Golden Packs group is the last tile in that section. Inside it, the Golden and the Cursed Golden Pack show their own prices.
- Opening a pack shows an animation first: the cardback swells in three pulses of growing strength, then bursts. Set packs, Pandemonium included, use the set's cardback. Mechanic and Golden packs use their pack artwork. The choice grid appears only after the animation finishes. (v2.1.15 showed the pack tearing in two instead.)
- **Every card must be flipped before anything can be chosen.** Clicking a face-down card flips it. Clicking a face-up card before all cards are flipped only shows a reminder.
- Revealing a Blessed card triggers the "shocked" Cardmaker animation.
- In Cursed, Cursed Golden and Pandemonium Cursed Packs, the cursed card cannot be chosen or refused. It is added automatically together with the chosen card.
- Opening a pack never changes the player's LP. The DM adjusts LP by hand.
- A set's packs are shown in a fixed order (see [Sets](#sets)), and a set's group in the shop shows that set's Cardmaker.
- The Pack Shop is reached from the Shops screen, and directly from the "🎁 Pack Shop" button on the hand screen.

### Pool, hands and drawing

- Each normal card has at most **one** copy in the pool. Drawing it or choosing it from a pack moves it into a hand, and returning it puts it back. Returning a card never duplicates it in the pool.
- The DM can drag a card from the library onto a player. This can create an extra hand copy of a normal card, as a deliberate DM override.
- A hand card can be dragged onto another player's name to transfer it, after a confirmation. This works for every kind of hand card, Custom Cards included.
- Cursed and Blessed cards are **repeatable**. Holding one never removes it from the pool or the Cursed Deck.
- A random batch draw picks each card uniformly from the available cards that match its filters. It never offers the same normal card twice in one batch. Blessed cards are always available, so they come up in random draws at their share of the pool. With the owner's data (19 Blessed cards among 591), that is about 3% per card with a full pool, and more as the pool shrinks.
- Hand order is the order the cards were received.
- A card leaves the hand through "↩ Havuza gönder" in its details, which puts a normal card back in the pool. The new app splits this into "Kullan" (the holder or the DM; it asks, optionally, on which character the card was used) and "At" (the DM only; discarded without use). Both put a normal card back in the pool.

### LP, cost and effects

- LP changes only through the DM's manual plus and minus actions, by a chosen positive amount. Each change is logged.
- Card costs keep their written form (`X`, `d6`, and so on). A cost override applies to one hand card, not to the card definition.
- Any hand card and any learned True Word can be switched active or inactive.

### True Words

- True Words have their own list: a name and an effect text, imported from their own CSV.
- A draft needs at least 3 True Words that the player has not learned yet. It shows 3 of them at random, and the player learns 1 or skips the draft. A skip is logged.
- A player cannot learn the same True Word twice.

### Custom Card Draft

- **Effects data.** Custom effects come from a CSV with the columns `name`, `1-cost version`, `3-cost version`, and `5-cost version`.
  - Each row is one effect type, and each cost column holds the text of that cost variant.
  - Rows whose name is not one of the 18 effect types are skipped, and so are empty cells.
  - Importing again updates the existing variants.
- **Effect types.** There are 18: Blessed, Caster, Combat, Cursed, Damage, Discard, Draw, Effects, Enhance, Gain, Gold, Held, Reduce, Restore, Roll, Special, TW, XP. The card costs are 1, 3 and 5.
- **Starting.** A draft needs a selected player and at least one loaded effect variant. The player first picks the card's cost: 1, 3 or 5.
- **Each step.** The draft shows up to 3 random effect types, drawn from the types not picked yet that have a text for the current cost, and the player picks 1.
  - There is no reroll and no skip. A draft can only be cancelled.
  - When no option is left, the draft says that the CSV is incomplete and has to be cancelled.
- **Number of picks.** A Custom Card needs 3 different effects.
  - Picking **Effects** adds 2 more picks.
  - Picking **Special** in a 3-cost draft adds 2 more picks, which use the 1-cost variants. From the third pick on, the next picks use the 1-cost variants until those 2 are used.
- **Special at 5 cost.** When the card is finished, every other effect uses its 1-cost text.
- **Special at 1 cost.** When the card is finished, one random other effect that has a 3-cost text uses that 3-cost text instead.
- **The finished card:**
  - Its name is "`<cost>`-Cost Custom Card". Its set is `Custom`, its rarity `Custom`, its mechanic pack `Custom Draft`, and its cost the chosen cost.
  - Its text lists each effect as "`<Type> (<cost>-Cost): <text>`".
  - It goes to the end of the player's hand, the draft is logged, and the app switches to that hand.
  - If any resolved effect has no text, the card cannot be finished.
- **Lifecycle.** Custom Cards are never in the pool, the library, or a pack.
  - Returning one destroys it: the button reads "✕ Custom kartı yok et" instead of "↩ Havuza gönder".
  - Its definition is deleted once no hand holds it. Deleting a player destroys their Custom Cards the same way.
- **Picture.** A Custom Card shows the cover for its cost. Hovering over it cycles through the pictures of its effects.
- **LP.** The app does not charge LP for a draft, because LP is changed by hand. The rules page does not name a price for it.

### Elixir Shop

- Elixirs come from a CSV with the columns `Name`, `Cost`, and `Effect`. Importing again updates the elixirs that have the same name.
- The Elixir Shop shows each elixir as a tile with its picture, name, cost, and effect. Buying an elixir is not recorded; the DM handles it at the table.
- The last tile is **Elixir Withdrawal**, a special Cursed card:
  - "Oyuncunun Eline Ekle" adds it to the selected player's hand and logs it.
  - It can be added any number of times, to any number of players.
  - It is not in the Cursed Deck and is never drawn.
  - It counts toward the player's cursed-card total.
  - Returning it only removes it from the hand.
- Clearing the elixir list does not remove Elixir Withdrawal from any hand.

### Data and history

- **Card data.** In the legacy app, card data came from a CSV with the columns `name`, `set`, `cost`, `rarity`, `text`, and `mechanic pack`.
  - Cursed cards came from a separate CSV.
  - Importing again updates cards with the same name.
  - Other columns, such as `Drawn?` and `Shuffle` in the owner's card sheet, were ignored.
- **Imports.** All imports are on Veri / Yedek, under "CSV ve Görsel Yönetimi": Legend Cards, Cursed Cards, True Words, Elixir Shop, Custom Card Effects, and one bulk picture import. In v2.1.15 the library, the Cursed Deck, the True Words screen, and the Pack Shop had their own import buttons.
- **Clearing.** Each dataset there also has its own "Belleği Temizle" (clear) button.
  - Clearing asks for confirmation and shows the record count. It can be undone with Undo in the same session, and it is logged.
  - Players, LP and notes are always kept.
  - What each button removes:

    | Dataset             | Clearing it removes                                                        |
    | ------------------- | -------------------------------------------------------------------------- |
    | Legend Cards        | the normal card definitions, their pictures, and those cards in every hand |
    | Cursed Cards        | the cursed card definitions, their pictures, and those cards in every hand |
    | True Words          | every True Word, their pictures, and every player's learned words          |
    | Elixir Shop         | the elixir list only                                                       |
    | Custom Card Effects | the effect variants; finished Custom Cards in hands stay                   |
    | Görseller / Assets  | every uploaded picture; cards and players stay                             |
- **Asset check.** An "Eşleşme / Eksik Kontrolü" panel lists missing and leftover pictures:
  - cards and True Words without pictures
  - elixirs without pictures, and elixir pictures that match no elixir
  - custom effect variants without text or without a picture
  - missing Custom Card covers
  - uploaded card, True Word, and custom effect pictures that no longer match any data

  It replaces the library's "Görseli eksik olanlar" filter from v2.1.15.

- **Picture file names.** The bulk picture import matches by file name. Besides card pictures, cardbacks, packs and mascots, it recognizes:
  - `1custom.png`, `3custom.png` and `5custom.png` for the Custom Card covers
  - `<cost><type>.png` for custom effect pictures, for example `3caster.png`
  - `elixir_<name>.png`, or a file named after the elixir, for elixir pictures
  - `cursedelixirwithdrawal.png` for Elixir Withdrawal
- **Backups.** The ZIP backup also includes custom effects, Custom Cards, and elixirs.
- **Search.** Search matches all card fields. Terms separated by commas or semicolons must **all** appear.
- **Undo and the log** cover the current session only. They are not saved and not included in backups.

## Table rules (Kurallar page)

The v2.2.8 rules page (`rulesPage`) has the Cardmaker explain the rules that the players follow at the table. They are summarized here in English.

> **The app records; it does not enforce.** Like the observed rules above, a table rule becomes binding for the new app only when a spec adopts it. Where a table rule disagrees with what the legacy app does, see [Open questions for the DM](#open-questions-for-the-dm).

### Legend Points

- Players earn LP for legendary play: a memorable heroic deed, a dangerous adventure, or something that makes the game more fun for the whole table.
- Spending 1 LP gives advantage on a d20 roll.
- Spending 1 LP draws a card.
- Using a card costs the LP shown in its top-left corner.

### Using and trading cards

- Players can trade cards with each other, but only one for one. Giving a card away for nothing is not allowed.
- A player can also open a Card Pack from the shop and keeps one card from it.
- Drawing and trading happen only at the start or the end of a game session, never in the middle.
- A card can be used at any time during play, even on another player's turn.
- A used card goes back to the deck and can be drawn again later.

### Card colors

- Purple frame: Common.
- Gold frame: Rare.
- White frame: Blessed.
- Red frame: Cursed.

### Cursed cards

- After a d20 roll the player does not like, they can draw a Cursed card and roll that d20 again. If the die showed a 1, they must draw two Cursed cards.
- Each player can make this bargain once per encounter.
- Cursed cards have their own deck. They never come from among the normal Legend Point cards.
- Cursed cards cannot be traded or given away.
- A Cursed card leaves the hand by being played like any other card, but not during the encounter in which it was drawn. Effects that make a player discard cards can also remove it.
- Cursed cards are unlimited: the same Cursed card can be drawn again and again.

### Blessed cards

- A Blessed card can come from a draw paid with LP, from packs, or as a reward for good play.
- The chance of finding a Blessed card in a normal draw is 2%. A Blessed card can only come from spending LP directly on a draw, not from card effects that draw cards.
- Blessed cards can also be found in Rare or Mechanic Packs. Each mechanic has its own Blessed card, plus one more for every 50 cards in that mechanic.
- A player can hold only one Blessed card. On drawing a new one, they keep only one.
- A player loses their Blessed card when they draw a Cursed card, and when they level up.
- A Blessed card can affect only one player. If any effect would make it affect more than one player, the card disappears.
- Blessed cards cannot be traded.
- Blessed cards have no LP cost, so no card or effect that interacts with card costs applies to them.

### True Words

- True Words are not cards. Nothing that affects cards affects True Words, and they do not count for effects that count cards.
- A learned True Word stays with the player. Using it does not send it back to a deck, and it can be used any number of times, paying the LP cost shown in its middle each time.
- A True Word must be used in the first round of a combat, on the player's own turn. Its effect then lasts until the end of that combat. If it was not used in the first round, it cannot be used in that combat.
- Learning starts with a draft: 3 random True Words are shown, and the player learns 1 or skips all three.
- A draft costs 1 LP plus the number of True Words the player already knows.
- Two players can learn the same True Word. A learned True Word cannot be forgotten, and True Words cannot be traded.

## Deliberate decisions (do not fix)

These look odd but are explicit decisions by the DM and the owner. Do not "fix" them unless the owner asks.

- **LP is only changed by hand.** Pack prices are labels, so opening a pack never deducts LP.
- **The pack thresholds are what they are**: 9 cards for set packs, 29 for Mechanic Packs, 49 non-blessed Rare cards for Golden, and the others as in the table above.
- **Golden Packs have a 2% Blessed chance.**
- **The official set names are a fixed, hardcoded list.** They are not derived from the data.
- **Pandemonium is a rare-only set with its own packs.** It has no Standard, Premium or Cursed Pack. Its Pandemonium Pack and Pandemonium Cursed Pack form their own group under Set Packs. (v2.1.15 listed the Pandemonium Pack under Rare Packs.)
- **Cursed and Blessed cards are repeatable.**
- **Every card in a pack must be flipped** before choosing.
- **The cursed card in a cursed pack is mandatory** (Cursed, Cursed Golden, and Pandemonium Cursed Packs).
- **Custom Cards never enter the pool.** Returning one destroys it.
- **Undo and the log last for one session only.** Card history no longer does: the new app keeps every holding permanently, closed but never deleted, as agreed in `add-user-roles` ("History is permanent"). There is no undo; a mistake is corrected with the opposite action.

## Open questions for the DM

These are places where the v2.2.8 rules page and the v2.2.8 app disagree. This document records both sides and does not choose between them. Ask the DM before a feature change depends on one of them.

| Topic                         | Rules page                                                           | Legacy app (v2.2.8)                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blessed chance in a 1-LP draw | 2%                                                                   | No fixed chance. A random draw picks uniformly from the pool, which always includes every Blessed card. With the owner's data that is about 3% with a full pool, and more as the pool shrinks.     |
| Blessed cards in "Rare Packs" | Blessed cards can be found in "Rare or Mechanic Packs".              | Mechanic Packs agree. Among the rare packs, only the Golden Pack can show a Blessed card, through its 2% slot. The Pandemonium, Pandemonium Cursed, and Cursed Golden Packs exclude Blessed cards. |
| Blessed cards per mechanic    | One per mechanic, plus one more for every 50 cards in that mechanic. | Follows the data. The owner's card sheet has 2 or 3 Blessed cards per mechanic pack. This is a data check, not app behavior.                                                                       |

Table rules that the app simply does not track are not listed here, for example the one-Blessed-per-player limit or losing a Blessed card on leveling up. Tracking them would be new feature work.

## Changes since v2.1.15

The first version of this document described `Legend_Card_Manager_v2.1.15.html`, which is kept next to v2.2.8 as the earlier version. v2.2.8 changed:

- **Menu.** Pack Shop became Shops (with the Pack Shop and the Elixir Shop), and Custom Card Draft and Kurallar are new. The order is: Oyuncu elleri, Shops, True Words, Custom Card Draft, Kart kütüphanesi, Cursed Deck, İşlem Logu, Kurallar, Veri / Yedek.
- **Pack prices.**
  - Mechanic Pack: from 3 LP / 7500 GP to 4 LP / 10000 GP.
  - Pandemonium Pack: from 4 LP / 10000 GP to 3 LP / 7500 GP.
- **New pack.** The Pandemonium Cursed Pack.
- **Pack Shop groups.** Rare Packs is gone. Pandemonium moved under Set Packs. Golden and Cursed Golden form a Golden Packs group under Mechanic Packs.
- **Pack opening.** A cardback burst replaced the tearing animation.
- **New features.**
  - the Custom Card Draft
  - the Elixir Shop, with Elixir Withdrawal
  - the Kurallar page
  - Cardmaker speech bubbles in the shops
  - new Cardmaker pictures
- **Data tools.** All imports are on Veri / Yedek, each dataset can be cleared on its own, and the asset check replaces the library's missing-picture filter.
- **Unchanged.** The other pack rules and thresholds, the Golden Pack's 2% Blessed chance, the pool, hands, drawing, LP, the True Word draft, undo, and the log.

## Sets

Card data uses the set code. The interface shows the official name. Matching ignores case, accents and spaces, and also accepts the listed aliases.

| Shop order | Set code        | Official name             | Notes                                                                                     |
| ---------- | --------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| 1          | The End is Nigh | The End is Nigh           | alias `endisnigh`                                                                         |
| 2          | Pentagon        | Conclave at Pentagon      |                                                                                           |
| 3          | Rhodelen        | Rituals in Rhodelen       |                                                                                           |
| 4          | Ashavir         | The Overlord of Ashavir   |                                                                                           |
| 5          | Kesqer          | Kesqerian Nights          | There is no "Kesqeria".                                                                   |
| 6          | Godtower        | The Godtower              |                                                                                           |
| 7          | Davarron        | Descent Under Davarron    |                                                                                           |
| 8          | Havenholm       | Throne of Havenholm       |                                                                                           |
| 9          | Ulagal          | Ballad of Ulagal          | the newest set                                                                            |
| 10         | Nordhallr       | Ragnarök: Nordhallr       | aliases `ragnarok`, `ragnarök`                                                            |
| 11         | Gurgitea        | The Lost City of Gurgitea |                                                                                           |
| last       | Pandemonium     | Pandemonium               | Rare cards only. Its group has only the Pandemonium Pack and the Pandemonium Cursed Pack. |

`Blessed` can appear in the set column of Blessed cards. It is a marker, not a set, and it gets no packs.

Each set has its own Cardmaker picture in the shop, named after the set code in lowercase without spaces: `cardmaker_theendisnigh`, `cardmaker_kesqer`, `cardmaker_ulagal`, and so on. Pandemonium uses `cardmaker_pandemonium`.

## Mechanic Packs

What each Mechanic Pack contains, as the Cardmaker describes it in the v2.2.8 shop:

| Mechanic pack    | Contains cards about                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Arcanus Divine   | spells and magical effects                                                                 |
| Blood & Battle   | combat effects, attack rolls, and damage dice                                              |
| Dungeoneer's Kit | skill checks and situations outside combat                                                 |
| Gambler's Gambit | random effects and random costs                                                            |
| Horn of Plenty   | drawing cards                                                                              |
| Legends of Old   | gaining Legend Points, interacting with them, or changing metagame mechanics               |
| Permamancy       | long-lasting or permanent effects                                                          |
| Risk & Reward    | Cursed cards, discard effects, or a benefit that the player pays for by harming themselves |

The Golden Packs group is described as holding only Rare and Blessed cards.
