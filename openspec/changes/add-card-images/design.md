# Design

## Context

See proposal.md for the motivation and the owner's decisions. The decisions are:
- static pictures on Hosting
- an alias table
- the three Blessed renames
- the scope: the Cardmaker with the shocked pair, and speech bubbles later

The inventory of the archives (in `~/Downloads`, listed with 7-Zip) found 866 PNG files and no folders:

| Archive | Files | Matched by name | Notes |
| --- | --- | --- | --- |
| `legend point cards.7z` | 591 | 563 / 571 normal cards | The 8 missing have misspelled files. About 15 files are misspelled copies of cards that already match. Some are unknown: `ashodrasreaping`, `ripsreapingrevenge`, `zamansgolfc`, `thecartographersmapkit`. |
| `blessed.7z` | 19 | 16 / 19 | `charmingrogue`, `drivendiehard`, `durabledwarf` are older names. |
| `cursed cards.7z` | 154 | 149 / 154 | 4 misspelled; `_cursed_endgame` unknown; Scorched Earth has no file. |
| `true words.7z` | 53 | 52 / 53 | `twascend_1`. |
| `otherassets.7z` | 49 | 12 set cardbacks + Blessed and Cursed backs, 9/10 pack pictures (`pack_galmblers`), 24/27 Cardmakers | No `<set>_std/prm/crs` files. `zallut_shop` is for the Elixir Shop. |

Picture sizes:
- Cards, backs, packs and words are 563×788, about 0.5–1.1 MB each as PNG.
- Cardmakers are about 1136×1240 and 2 MB each, with transparency.

What the pictures contain:
- A card picture is the whole card: frame, cost, name and text.
- A True Word picture carries its name, cost and text.

The current code:
- `CardFace` draws a CSS face.
- `FaceDownCard` draws a CSS back with a `tone` of `random` or `cursed`, the same for the whole spread, so a Blessed card is never given away.
- `PackTile` shows a glyph.
- `TrueWordTile` shows the name, a cost badge and the text.
- `PageHeader` has a title and actions.
- `firebase.json` serves `dist` and caches only `/assets/**`.
- There is no `public/` folder, and Vite's default `publicDir` is `public`.

## Goals / Non-Goals

**Goals:**
- A repeatable, offline build from the owner's archives that never touches them, Firestore or git.
- The app works the same with or without built pictures, including in every unit test.
- No face-down card gives its card away.

**Non-Goals:**
- Storing pictures in Firestore or Firebase Storage, or committing them.
- Speech bubbles, hover previews, and Elixir or Custom Card pictures.
- Changing card data. A misspelled card name in `data/legend-cards.csv` (for example "Conrucopia") stays as the owner's export has it, and the alias table bridges it.

## Decisions

### D1. A build script, not an import

`scripts/build-art.ts` (`npm run build-art -- --source <folder> [--dry-run]`):

1. **Check 7-Zip.** Run `7zz i`. If it is missing, stop with `brew install sevenzip`.
2. **Extract** each `*.7z` in the folder into a temporary folder (`7zz e -y -o<tmp>/<archive>`). Loose `*.png` files in the folder are taken as they are.
3. **Read the data** with the existing parsers: `parseCardFile` (Legend and Cursed) and `parseTrueWordFile`. Also read `data/image-aliases.csv`. IDs come from `cardId` and `trueWordId`, so the manifest uses the same document IDs as Firestore without reading it.
4. **Plan** with the pure `planArt(files, data, aliases)` in `scripts/lib/artFiles.ts` (D2, D3). The plan holds an assignment per target, the duplicates, the unknown files, and the missing targets per kind.
5. **Report** in Turkish (`messages.ts`). With `--dry-run`, stop here.
6. **Write** with `scripts/lib/artWrite.ts`:
   - Empty `public/art/`, then convert each assigned file with `sharp`.
   - Cards, backs, packs and words become WebP at their own size (quality 82).
   - Cardmakers are resized to at most 480 px high and saved as WebP with alpha.
   - Each output is `public/art/<kind>/<id>.<hash10>.webp`, where `hash10` is the first 10 hex digits of the SHA-256 of the output bytes.
   - Write `public/art/manifest.json` (D4).
7. **Clean up:** remove the temporary folder, even after a failure.

*Why a script and not an in-app upload:* the legacy bulk upload kept pictures in one browser. Here everyone sees the same pictures, the archives are 560 MB, and Hosting serves only built files.

*Alternatives considered:*
- An npm 7-Zip wrapper. It was rejected because it still needs the binary.
- `cwebp` or `sips` for conversion. They were rejected: `cwebp` is one more system tool, and `sips` cannot write WebP.

`sharp` 0.35 becomes a dev dependency. It runs on Node 24, prebuilt for macOS arm64.

### D2. Matching order

For each file, `stem` is the name without its extension, and `key = normalize(stem)`, as in the card import. The first rule that matches wins:

1. **Alias row:** `data/image-aliases.csv` with the columns `File,Kind,Name`. `Kind` is `legend`, `cursed`, `word` or `asset`. `Name` is the card or word name as in the data files, or the asset stem, for example `pack_gamblers`. A row whose target does not exist fails the build with its row number.
2. **Cardmaker:** the stem is one of the 28 known stems (`card_info` and the `cardmaker_*` list of the legacy app).
3. **Named pack picture:** `pack_<stem>`. The stem must be one of the legacy stems: arcanus, blood, gamblers, risk, dungeoneers, permamancy, legends, horn, gold, cursedgold. The key is `mechanic:<Mechanic Pack>`, `golden` or `cursedGolden`, the same keys as `PackDef.key`.
4. **Set pack picture:** `<set>_(std|prm|crs|cursed|gold|gld)`. The key is `standard:<code>`, `premium:<code>` or `cursed:<code>`; for Pandemonium, `pandemonium:Pandemonium` and `pandemoniumCursed:Pandemonium`. The set is matched by code, official name or alias, as `cardCatalog.ts` does.
5. **Cardback:** `<set>_cb` keyed by the set code; `blessed_cb` and `cursed_cb` keyed `blessed` and `cursed`.
6. **True Word:** `tw<name>` whose name matches a word.
7. **Cursed card:** `cursed_<name>` whose name matches a Cursed card.
8. **Legend card:** a Legend card (normal or Blessed) with that name.
9. **Cursed card:** a Cursed card with that name.
10. **Otherwise unknown.**

### D3. Duplicates

When two files target the same thing, a file matched by rules 2–9 beats an alias. Otherwise the first by file name wins. The loser is reported as a duplicate.

Two misspelled files for one card are not a duplicate: only the aliased one matches, and the other is unknown. This applies to `kyarossyieldingfaith` and `kyasrosyieldingfaith`. The alias table picks `kyarossyieldingfaith` and `lordfalaraensformidability`; the owner can swap them in the table.

The initial `data/image-aliases.csv` rows, all confirmed by the inventory:

| File | Kind | Name |
| --- | --- | --- |
| bahamullussnappes.png | legend | Bahamullu's Snappers |
| corneliuscornucopia.png | legend | Cornelius' Conrucopia |
| gurgiteantome.png | legend | Gurgitean Tome of Forbidden Arts |
| kyarossyieldingfaith.png | legend | Kyaro's Yielding Faith |
| lordfalaraensformidability.png | legend | Lord Falaraen's Fordmidability |
| orkolsacquisiton.png | legend | Orkol's Acquisition |
| thegoldenccityofalzahra.png | legend | The Golden City of Al-Zahra |
| vardmadrsdragondefenses.png | legend | Varðmarðr's Dragon Defenses |
| charmingrogue.png | legend | Roguish Charm |
| drivendiehard.png | legend | Second Wind |
| durabledwarf.png | legend | Forgewizard Constitution |
| cursed_bickverzehrerparasite.png | cursed | Blickverzehrer Parasite |
| cursed_oneofus.png | cursed | One of Us One of Us |
| cursed_spontanouscombustion.png | cursed | Spontaneous Combustion |
| cursed_theeyespotionofrage.png | cursed | The Eye's Potions of Rage |
| twascend_1.png | word | Ascend |
| pack_galmblers.png | asset | pack_gamblers |

With these rows the expected coverage is:
- 571/571 normal cards, 19/19 Blessed, 153/154 Cursed (Scorched Earth missing)
- 53/53 True Words, 14 cardbacks, 10/10 pack pictures, 24/28 Cardmakers

### D4. The manifest and its provider

```
public/art/manifest.json
{ "version": 1,
  "cards":     { "<cardId>": "/art/cards/<cardId>.<hash>.webp", ... },
  "words":     { "<wordId>": "/art/words/...", ... },
  "cardbacks": { "<setCode>|blessed|cursed": "/art/backs/...", ... },
  "packs":     { "<PackDef.key>": "/art/packs/...", ... },
  "mascots":   { "<stem>": "/art/mascots/...", ... } }
```

- **`src/features/art/schema.ts`:** a zod schema for the manifest, and `EMPTY_ART`.
- **`ArtProvider`:** fetches `${import.meta.env.BASE_URL}art/manifest.json` once at start.
  - A failed request, a non-JSON answer (Vite serves `index.html` for a missing file) or an invalid manifest gives `EMPTY_ART`, with a `console.info` in development.
- **`useArt()`:** gives `cardUrl(id)`, `wordUrl(id)`, `backUrl(key)`, `packUrl(key)` and `mascotUrl(stem)`. Each returns the URL or `null`.
- **`TestArtProvider` and `renderApp({ art })`:** they default to `EMPTY_ART`, so every existing test keeps its CSS look.

*Alternative considered:* an imported, generated TypeScript module. It was rejected because the app would not build without it, and a picture rebuild would need a new app build.

### D5. Hosting and caching

- `public/art/` goes in `.gitignore`. Vite serves it in development and copies it into `dist` for Hosting.
- `firebase.json` gets a header for `/art/**/*.webp`: `public, max-age=31536000, immutable`. The names carry their hash.
- `manifest.json` keeps the global `no-cache`.
- Deploy only from a machine that ran `build-art`; the README says so.

### D6. Card faces

`CardFace` takes its picture from `useArt().cardUrl(card.id)`.

**With a picture:**
- The face keeps its kind's border.
- It shows an `<img>` with `alt={card.name}`, `loading="lazy"`, `decoding="async"` and `aspect-ratio: 563/788`.
- Nothing is written below the picture. A transparent button lies over the picture's set symbol in its bottom-right corner (about the lowest 11 % and the rightmost 14 % of the picture). While the pointer rests on it, or after a tap on it until it loses the focus, a small note above it shows set · rarity and the mechanic pack. The note stays inside the picture, so it never widens the page. A Cursed card has no note.
- The marks are shown as today.
- The cost, the name and the visible text go into an `sr-only` block.
- A hand cost that differs from the card's own cost is a badge over the picture's top-left cost corner, with the existing lower or higher classes.

**`onError`** switches the face to the CSS look for that render.

*Why a note on the set symbol:* the picture does not carry the set, rarity and mechanic pack, and the card view requirement shows them. A caption under every face cluttered the grid, so the owner asked for them on hover of the set symbol only. A tap works the same on phones, which have no hover. The note is always in the DOM, only transparent, so screen readers and search still find it.

### D7. Backs per spread

`FaceDownCard`'s `tone` becomes `back: SpreadBack`:

| Spread | `SpreadBack` |
| --- | --- |
| random draw | `{ kind: 'neutral' }` (today's CSS `random` back) |
| Cursed draw | `{ kind: 'cursed' }` (`cursed_cb`, or else today's CSS `cursed` back) |
| standard, premium or pandemonium pack | `{ kind: 'set', setCode }` (the set's `<set>_cb`, or else the neutral back) |
| cursed, pandemoniumCursed or cursedGolden pack | `{ kind: 'cursed' }` |
| mechanic or golden pack | `{ kind: 'neutral' }` |

A pure helper, `spreadBackOf(packType, setCode)` in `src/features/packs/`, gives a pack's back. `DrawDialog` picks between neutral and cursed by its mode. The back never reads the card. The "Çevir" label stays on the back as today.

### D8. Pack tiles and True Word tiles

**`PackTile`:**
- The picture is `packUrl(def.key)`, or for a set pack `backUrl(def.setCode)`.
- It is shown above the name and price, with `alt=""`, since the name is on the tile.
- Without a picture the glyph stays.

**`TrueWordTile`:**
- With `wordUrl(word.id)`, it shows the picture, with `alt={word.name}`, in place of the text paragraph.
- The text goes to `sr-only`.
- The header (name and the "<cost> LP" badge), the marks and the children stay.
- `TrueWordDialog` shows the picture large, above its details.

### D9. The Cardmaker

- **`<Mascot stem size />`** renders `mascotUrl(stem)` as a decorative `<img alt="">`, or nothing when there is no picture.
- **`PageHeader`** gets an optional `mascot` prop. The image sits at the right of the title, 72 px high under `sm` and 112 px from `sm`, and never wider than a third of the header. The actions wrap below it on phones.
- **`Placeholder`** passes its screen's mascot.
- **The Pack Shop's group view** shows the set's Cardmaker:
  - `cardmaker_<normalized set code>`, the legacy `shopSetMascotStem` mapping, with `theendisnigh` for The End is Nigh
  - `cardmaker_pandemonium` for Pandemonium
  - `cardmaker_gold` for the Golden Packs group, at 160 px
- **`screens.ts`** gets a `mascot` field per screen (D9 table in the spec). Pages read it from there, so the mapping lives in one place.

### D10. The shocked pair

**`useBlessedShock()`** returns `{ shock(): void, overlay: ReactNode }`:
- `shock()` shows `cardmaker_shockl` at the left edge and `cardmaker_shockr` at the right edge of the viewport, fixed and `pointer-events-none`, for 1.1 s.
- They slide in with a keyframe in `theme.css`.
- Under `useReducedMotion()` they appear and disappear without movement.
- A timer removes them, even if the animation events never fire (as the pack burst does).
- Without either picture, `shock()` does nothing.

**Where it fires:**
- **`DrawDialog`:** when a drawn Blessed card is turned here.
- **`OpenPackView`:** when a position becomes revealed while the view is mounted and its card is Blessed. It compares the previous `revealed` with the new one, so a watcher sees it too, and a view that opens on an already turned card does not.

## Risks / Trade-offs

- **[Risk] Pictures are public by address.** Accepted by the owner (Hosting, option A). The addresses are not linked from anywhere public.
- **[Risk] The deployed site lacks pictures** if `build-art` was not run before deploy. → The README's deploy steps run it first. The app still works without them.
- **[Risk] A large first load of the library** (about 590 pictures, roughly 35 MB). → Lazy loading loads only visible faces, and the immutable caching makes it a one-time cost.
- **[Risk] Text in a scaled-down picture is small** on narrow faces. → It is the same picture the legacy app showed. The details dialog shows it large, and the text stays in the DOM for search and screen readers.
- **[Trade-off] The neutral back** stays for random draws, Mechanic Packs and Golden Packs, unlike the legacy app, which showed each card's set back. That would reveal a Blessed card before it is turned, against the existing rule.
- **[Trade-off] Two misspelled copies** (Kyaro, Falaraen): the table picks one, possibly the older. The report lists the other, so the owner can swap it in the table.

## Migration Plan

1. Install 7-Zip (done on this machine) and run `npm install`; `sharp` comes with it.
2. Run `npm run build-art -- --source ~/Downloads`. Check the report and fix any alias row it rejects.
3. Run `npm run dev`; the pictures appear. On a real project, run `npm run build` and `firebase deploy --only hosting` from the same machine.

**Rollback:** delete `public/art/`. The app falls back to the CSS look. Revert the change for the code.
