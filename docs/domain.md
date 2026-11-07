# Domain reference

What Legend Card Manager is about, what its words mean, and how the original app behaved. For how the code is written, see [conventions.md](conventions.md).

## The product

Our DM runs a **side card system** on top of a D&D 5e campaign:

- Players earn **Legend Points (LP)**. They work much like inspiration: the DM hands them out at the table for good play, and players spend them.
- With LP, players buy **packs** and pick **cards** from them. A card has an effect that the table applies in play: a bonus, a twist, or a risk.
- Some cards are **Cursed**: a player gets them as a price or a punishment. A few rare cards are **Blessed**.
- Players can also learn **True Words**, a separate kind of power with its own draft.

**Legend Card Manager is a tracker, not a game engine.** The DM and the players make the decisions at the table. The app records them:

- who holds which card
- how many LP each player has
- which effects are active
- what happened, in a log

It does not enforce D&D rules, and it never spends LP on its own.

The original app was a single offline HTML file used on one computer. The new app is online and real-time, so the DM and the players can use it together from their own devices.

### Actors

| Actor                   | Role                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **DM** (Dungeon Master) | Runs the game, gives out and takes away LP, decides when packs are opened, and maintains the card data. |
| **Player**              | A member of the group with a hand of cards, an LP balance, and learned True Words.                      |

In the legacy app, the DM operated everything alone and players were just names in a list. The new app signs people in with Google. Roles (DM vs. player) are not defined yet; they come with the data model.

## Glossary

| Term                   | Meaning                                                                                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legend Points (LP)** | The players' currency for cards. The DM adds and removes LP by hand. Opening a pack never deducts LP automatically.                                                                                                                                                                             |
| **GP**                 | Gold pieces, the D&D currency. Pack price labels show an LP price and an alternative GP price.                                                                                                                                                                                                  |
| **Card**               | One card definition: a **name**, **set**, **cost**, **rarity**, **text** (the effect), and **mechanic pack**. Cursed cards are cards too, flagged as cursed.                                                                                                                                    |
| **Cost**               | The card's LP cost as written on the card. It is text, not always a number: `0`, `1`, `2`, `3`, `5`, `6`, `X`, or `d6`. A card in a hand can carry a **cost override**. The legacy app then showed a badge marking whether the current cost is lower or higher than the base cost.              |
| **Card text**          | The effect. Text in square brackets (`[like this]`) is hidden metadata: you can search for it, but it is not shown.                                                                                                                                                                             |
| **Set**                | The world or adventure a card belongs to. Card data stores a short **set code** (for example `Kesqer`). The interface shows the **official set name** (for example "Kesqerian Nights"). See [Sets](#sets).                                                                                      |
| **Mechanic Pack**      | A cross-set theme a card belongs to, for example Blood & Battle, Risk & Reward, Dungeoneer's Kit, Gambler's Gambit, Arcanus Divine, Permamancy, Horn of Plenty, Legends of Old. Each one has its own pack.                                                                                      |
| **Rarity**             | `Common` or `Rare`. Blessed cards have no ordinary rarity (`—`).                                                                                                                                                                                                                                |
| **Cursed card**        | A negative card. Cursed cards are not in the normal pool. They form one global **Cursed Deck** across all sets. They are repeatable: many players can hold the same cursed card, several times over.                                                                                            |
| **Blessed card**       | A rare, very positive card. Its set, rarity or mechanic pack is marked "Blessed". It is always available (repeatable). It mostly appears through the small Blessed chance in Golden Packs.                                                                                                      |
| **Pool**               | The normal cards that can still be drawn or picked. Each normal card has **one** copy in the pool. A card in someone's hand is out of the pool until it is returned. Blessed cards always stay in the pool. Cursed cards are never in it.                                                       |
| **Hand**               | The cards a player holds, in the order they got them. A hand card can be made **active**, can carry a note, and can have a cost override.                                                                                                                                                       |
| **Active effect**      | A hand card or a True Word that is switched on right now. Active effects are listed together, and active cursed cards are highlighted in red.                                                                                                                                                   |
| **Library**            | All card definitions, with filters, search, list and card views, and the status of each card (in the pool or in someone's hand).                                                                                                                                                                |
| **Cursed Deck**        | The global set of cursed cards. Cursed Packs draw from it, and the DM can also draw a random cursed card from it directly.                                                                                                                                                                      |
| **Pack**               | A set of face-down cards a player opens and then chooses from. See the pack types below.                                                                                                                                                                                                        |
| **Pack types**         | **Standard**, **Premium** and **Cursed** exist per set. **Mechanic** exists per mechanic pack. **Pandemonium** exists only for the Pandemonium set. **Golden** and **Cursed Golden** each exist once, across all sets. See [Rules observed in legacy v2.1.15](#rules-observed-in-legacy-v2115). |
| **Pack opening**       | The pack is torn open, its cards lie face down, the player **flips every card**, and only then chooses.                                                                                                                                                                                         |
| **Draw**               | Taking cards outside packs. There are three kinds: a **random batch draw** (optional filters by cost, mechanic pack, rarity or keyword, drawing one card at a time until done), a **specific draw** (search and pick a card), and a **random cursed draw** from the Cursed Deck.                |
| **True Word**          | A named power with an effect text, kept in its own list. In a **True Word draft**, a player sees 3 random words they have not learned yet and learns 1. Learned words can be switched active or inactive.                                                                                       |
| **Shop**               | The screen where packs are offered, in three groups: **Set Packs**, **Mechanic Packs**, and **Rare Packs** (Pandemonium, Golden, Cursed Golden).                                                                                                                                                |
| **Cardmaker**          | The app's mascot. Different Cardmaker pictures appear per screen (shop, library, cursed deck, True Words, log, settings), per set inside the shop, and as a "shocked" pair when a Blessed card is revealed.                                                                                     |
| **Cardback**           | The image on the back of a face-down card, one per set (`<set>_cb.png` in the legacy app).                                                                                                                                                                                                      |
| **Session log**        | The list of actions taken in this session ("X opened Y and chose Z").                                                                                                                                                                                                                           |
| **Undo**               | Steps back through this session's actions. Like the log, it only lasts for the current session.                                                                                                                                                                                                 |

## Rules observed in legacy v2.1.15

These rules are transcribed from `reference/legacy/Legend_Card_Manager_v2.1.15.html`: its "CORE RULES" header and the functions `packDefs`, `packPrice`, `canOpenPack`, `openPack`, `flipPackOption`, `selectCursedPackNormal`, and `addToHand`.

> **Reference only.** None of these rules is implemented in the new app yet. Each rule becomes binding when a feature change brings it into the OpenSpec specs.

### Packs

"Available" means a card in the pool, as defined above. The counts are of available cards in the pack's scope.

| Pack                                       | Shop group     | Price label     | Can be opened when                                                                                  | Cards shown (face down)                                                                                                                                             | The player gets                                                        |
| ------------------------------------------ | -------------- | --------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Standard** (per set)                     | Set Packs      | 2 LP / 5000 GP  | the set has at least 9 available cards                                                              | 5 random cards from the set                                                                                                                                         | 1 card of their choice                                                 |
| **Premium** (per set)                      | Set Packs      | 3 LP / 7500 GP  | the set has at least 9 available cards, and at least 3 of them are non-blessed Rare cards           | 1 non-blessed Rare card, plus 4 more random cards from the set (any rarity)                                                                                         | 1 card of their choice                                                 |
| **Cursed** (per set)                       | Set Packs      | 1 LP / 2500 GP  | the set has at least 5 available non-Rare, non-blessed cards, and the Cursed Deck is not empty      | 5 non-Rare cards from the set, plus 1 random cursed card from the Cursed Deck, shuffled together                                                                    | **both** the cursed card (mandatory) and 1 normal card of their choice |
| **Mechanic** (per mechanic pack)           | Mechanic Packs | 3 LP / 7500 GP  | at least 29 available cards have that mechanic pack                                                 | 5 random cards with that mechanic pack                                                                                                                              | 1 card of their choice                                                 |
| **Pandemonium** (the Pandemonium set only) | Rare Packs     | 4 LP / 10000 GP | the Pandemonium set has at least 9 available Rare cards                                             | 5 random Rare cards from Pandemonium                                                                                                                                | 1 card of their choice                                                 |
| **Golden** (once, all sets)                | Rare Packs     | 4 LP / 10000 GP | at least 49 available non-blessed Rare cards exist across all sets                                  | 5 random non-blessed Rare cards. **With a 2% chance** (when a Blessed card exists and at least 4 Rare cards are available): 1 random Blessed card plus 4 Rare cards | 1 card of their choice                                                 |
| **Cursed Golden** (once, all sets)         | Rare Packs     | 3 LP / 7500 GP  | at least 5 available non-blessed Rare cards exist across all sets, and the Cursed Deck is not empty | 5 random non-blessed Rare cards, plus 1 random cursed card                                                                                                          | **both** the cursed card (mandatory) and 1 Rare card of their choice   |

More pack rules:

- The Pandemonium set has no Standard, Premium or Cursed pack. It only has its own Pandemonium Pack.
- Opening shows a tearing animation first. The choice grid appears only after the animation finishes.
- **Every card must be flipped before anything can be chosen.** Clicking a face-down card flips it. Clicking a face-up card before all cards are flipped only shows a reminder.
- Revealing a Blessed card triggers the "shocked" Cardmaker animation.
- In Cursed and Cursed Golden Packs, the cursed card cannot be chosen or refused. It is added automatically together with the chosen normal card.
- Opening a pack never changes the player's LP. The DM adjusts LP by hand.
- A set's packs are shown in a fixed order (see [Sets](#sets)), and a set's tile in the shop shows that set's Cardmaker.

### Pool, hands and drawing

- Each normal card has at most **one** copy in the pool. Drawing it or choosing it from a pack moves it into a hand, and returning it puts it back. Returning a card never duplicates it in the pool.
- The DM can drag a card from the library onto a player. This can create an extra hand copy of a normal card, as a deliberate DM override.
- Cursed and Blessed cards are **repeatable**. Holding one never removes it from the pool or the Cursed Deck.
- A random batch draw only offers cards that match its filters. It never offers the same normal card twice in one batch.
- Hand order is the order the cards were received.

### LP, cost and effects

- LP changes only through the DM's manual plus and minus actions, by a chosen positive amount. Each change is logged.
- Card costs keep their written form (`X`, `d6`, and so on). A cost override applies to one hand card, not to the card definition.
- Any hand card and any learned True Word can be switched active or inactive.

### True Words

- True Words have their own list: a name and an effect text, imported from their own CSV.
- A draft needs at least 3 True Words that the player has not learned yet. It shows 3 of them at random, and the player learns 1.
- A player cannot learn the same True Word twice.

### Data and history

- In the legacy app, card data came from a CSV with the columns `name`, `set`, `cost`, `rarity`, `text`, and `mechanic pack`. Cursed cards came from a separate CSV. Importing again updates cards with the same name. Other columns, such as `Drawn?` and `Shuffle` in the owner's card sheet, were ignored.
- Search matches all card fields. Terms separated by commas or semicolons must **all** appear.
- Undo and the log cover the current session only. They are not saved and not included in backups.

## Deliberate decisions (do not fix)

These look odd but are explicit decisions by the DM and the owner. Do not "fix" them unless the owner asks.

- **LP is only changed by hand.** Pack prices are labels, so opening a pack never deducts LP.
- **The pack thresholds are what they are**: 9 cards for set packs, 29 for Mechanic Packs, 49 non-blessed Rare cards for Golden, and the others as in the table above.
- **Golden Packs have a 2% Blessed chance**, and only Golden Packs can offer a Blessed card.
- **The official set names are a fixed, hardcoded list.** They are not derived from the data.
- **Pandemonium is a rare-only pack**, listed under Rare Packs instead of Set Packs.
- **Cursed and Blessed cards are repeatable.**
- **Every card in a pack must be flipped** before choosing.
- **The cursed card in a Cursed Pack is mandatory.**
- **Undo and the log last for one session only.**

## Sets

Card data uses the set code. The interface shows the official name. Matching ignores case, accents and spaces, and also accepts the listed aliases.

| Shop order | Set code        | Official name             | Notes                                               |
| ---------- | --------------- | ------------------------- | --------------------------------------------------- |
| 1          | The End is Nigh | The End is Nigh           | alias `endisnigh`                                   |
| 2          | Pentagon        | Conclave at Pentagon      |                                                     |
| 3          | Rhodelen        | Rituals in Rhodelen       |                                                     |
| 4          | Ashavir         | The Overlord of Ashavir   |                                                     |
| 5          | Kesqer          | Kesqerian Nights          | There is no "Kesqeria".                             |
| 6          | Godtower        | The Godtower              |                                                     |
| 7          | Davarron        | Descent Under Davarron    |                                                     |
| 8          | Havenholm       | Throne of Havenholm       |                                                     |
| 9          | Ulagal          | Ballad of Ulagal          | the newest set                                      |
| 10         | Nordhallr       | Ragnarök: Nordhallr       | aliases `ragnarok`, `ragnarök`                      |
| 11         | Gurgitea        | The Lost City of Gurgitea |                                                     |
| —          | Pandemonium     | Pandemonium               | Rare cards only, with only its own Pandemonium Pack |

`Blessed` can appear in the set column of Blessed cards. It is a marker, not a set, and it gets no packs.

Each set has its own Cardmaker picture in the shop, named after the set code in lowercase without spaces: `cardmaker_theendisnigh`, `cardmaker_kesqer`, `cardmaker_ulagal`, and so on.
