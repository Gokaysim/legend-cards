# Proposal

## Why

Every card, cardback, pack and True Word in the app is still drawn with CSS, and the Cardmaker never appears. The legacy app's look comes from the owner's pictures. They are in five `.7z` archives, about 560 MB of PNG, outside the repository. The owner chose the pictures as the next step, before going live, so that the table sees the cards it knows.

## What Changes

- **A picture build script, `npm run build-art`.** It reads the archives from a folder given on the command line, for example `~/Downloads`, and never changes them. It extracts them with 7-Zip and matches each file by the legacy file-name rules.
  - **Kart:** a card's normalized name; `cursed_<name>` for a Cursed card.
  - **True Word:** `tw<name>`.
  - **Cardback:** `<set>_cb`, plus `blessed_cb` and `cursed_cb`.
  - **Pack:** `<set>_std|prm|crs|gold`, `pack_<mechanic stem>`, `pack_gold`, `pack_cursedgold`.
  - **Maskot:** the 27 known `cardmaker_*` stems and `card_info`.

  The script then converts the pictures to WebP, shrinks the mascots, and writes them with a manifest to `public/art/`, which is not committed. Firebase Hosting serves them, so the free plan is enough. The owner accepted that a picture can be opened by its address without signing in.
- **An alias table in the repository, `data/image-aliases.csv`.** It maps file names that differ from the data to their card, word or asset. Examples are spelling slips such as `orkolsacquisiton.png` and the three Blessed pictures under older names (`charmingrogue` → Roguish Charm, `drivendiehard` → Second Wind, `durabledwarf` → Forgewizard Constitution, as the owner confirmed).
  - A second file for something that already has its picture is a duplicate, reported and not used. The correctly named file wins.
  - A file that matches nothing is reported and skipped. An example is `zallut_shop.png`, kept for the Elixir Shop.
- **A report.** The script prints in Turkish what matched, what has no picture, the duplicates and the unknown files. `--dry-run` only reports.
- **Pictures in the app.** They are loaded through the manifest, so a machine without built pictures, and every unit test, keeps the CSS faces. A picture that is missing keeps its CSS stand-in.
  - **Card faces** (library, Cursed Deck, hand, card details, drawn and pack cards) show the card's picture. The picture carries the cost, name and text.
    - The kind's frame color stays around the picture.
    - Nothing is written under the picture. The set, rarity and mechanic pack show in a small note while the pointer rests on the picture's set symbol in its bottom-right corner, or after a tap on it, as the owner asked.
    - The hand's marks stay on the face.
    - A hand cost that differs from the card's own cost shows as a badge on the picture, marked lower or higher as today.
  - **Face-down cards** show a cardback image. A back never gives a card away: every back in one spread looks the same, as today. Some spreads keep the CSS back:
    - **A random draw** keeps the neutral CSS back, as its cards may be of any set, Blessed included.
    - **A Cursed draw and a Cursed type's pack** show `cursed_cb`.
    - **A set's Standard, Premium or Pandemonium Pack** shows that set's cardback.
    - **Mechanic and Golden Packs** keep the neutral back.
  - **Pack Shop tiles** show the pack's picture. A set pack without its own picture shows its set's cardback, as in the legacy app.
  - **True Word tiles** (the True Words screen, the hand's tab, the draft panel, the details) show the word's picture in place of the text paragraph. The name and the "<cost> LP" badge stay.
  - **The Cardmaker** appears next to each screen's title, by the legacy mapping:
    - Pack Shop `cardmaker_shop`
    - library `cardmaker_lib`
    - Cursed Deck `cardmaker_cursed`
    - True Words `cardmaker_true`
    - log `cardmaker_think`
    - the Elixir Shop, Kurallar and Veri / Yedek placeholders `cardmaker_zaddir`, `cardmaker_wave` and `cardmaker_peek`
    - each set group of the Pack Shop has its set's Cardmaker, Pandemonium has `cardmaker_pandemonium`, and Golden Packs has `cardmaker_gold`
  - **The shocked Cardmaker pair** (`cardmaker_shockl` and `cardmaker_shockr`) appears for about a second when a Blessed card is turned over, in a draw or in a pack, on every device that sees it turn. With reduced motion it appears without movement.
  - Pictures are decorative where the text says the same: a picture has its card or word name as alternative text, and the card's text stays readable for screen readers and search.
- **Hosting caching.** Picture file names carry a content hash, so `/art/**` is cached for a year. The manifest is not cached.

Out of scope:
- **The Cardmaker's speech bubbles** in the shops: a later change.
- **Elixir and Custom Card pictures**: these come with those features. `zallut_shop.png`, the custom covers and the effect pictures wait for them.
- **A hover preview.** The card details dialog shows the picture large, on phones as well.
- **Pictures that the archives do not have:** Scorched Earth, `card_info`, `cardmaker_custom` and `cardmaker_keep`. Those keep their CSS stand-in or show no mascot.

## Capabilities

### New Capabilities
- `card-images`: building the pictures from the owner's archives (matching, aliases, conversion, report, manifest), and showing them in the app: card faces, cardbacks without giving cards away, pack pictures, True Word pictures, the Cardmaker on screens and set groups, the shocked pair for a Blessed card, and the CSS fallback when a picture is missing.

### Modified Capabilities
- `card-library`: a card face with a picture shows its set, rarity and mechanic pack on its set symbol, on hover or tap, instead of always.

The other existing requirements stay true with pictures:
- revealed cards still show their name, kind, set, rarity, cost and text
- True Word tiles still show the name, "<cost> LP" and the text, which the picture carries
- a hand still marks a lower or higher cost

## Impact

- **New code:**
  - `scripts/build-art.ts`
  - `scripts/lib/artFiles.ts`: matching, aliases and the plan, all pure and unit-tested
  - `scripts/lib/artWrite.ts`: extraction, conversion and the manifest
  - their messages in `scripts/lib/messages.ts`
  - `src/features/art/`: the manifest schema, `ArtProvider`, `useArt`, `CardPicture`, `CardBack`, `Mascot`, `BlessedShock`
- **Changed code:**
  - `CardFace`, `FaceDownCard`, `DrawDialog`, `OpenPackView`, `PackTile`, `PackShopPage`, `TrueWordTile`, `PageHeader` and `Placeholder`
  - the screen pages that pass their mascot
  - `App.tsx` (the provider)
  - `src/test/renderApp.tsx` (an `art` option) and a `TestArtProvider`
- **Data:** `data/image-aliases.csv`, and the `data/README.md` section about the pictures.
- **Config:**
  - `.gitignore` (`public/art/`)
  - `firebase.json` (cache headers for `/art/**`)
  - `package.json` (the `build-art` script, and `sharp` as a new dev dependency)
- **Tools:** 7-Zip (`7zz`, `brew install sevenzip`) on the machine that builds the pictures; it is already installed here.
- **Docs:** `README.md` (building the pictures), `docs/conventions.md` (the art feature and script), `docs/domain.md` (the picture file names, the backs that never give a card away).
- **No change** to Firestore, its rules or its indexes.
