# Proposal

## Why

The TODO list asks for a set statistics page, and in the explore session of 2026-11-14 the owner added a page for each card: "her kartın ayrı ayrı istatistikleri olsa iyi olur: ne zaman verildi, ne zaman kullanıldı, kaç kez kullanıldı, kaç kez discard edildi". The data for both already exists. Holdings are permanent: every stay of a card in a hand is a record that keeps how it arrived and how it left. Draws and pack openings are permanent too. No screen adds these records up per card or per set, so today the only way to answer "how often was this card used?" is to read the İşlem Logu by hand.

## What Changes

**Kart geçmişi (a card's history page)**
- Every card gets its own page:
  - `/library/<cardId>` for a Legend or Blessed card
  - `/cursed-deck/<cardId>` for a Cursed card
- The menu keeps "Kart kütüphanesi" or "Cursed Deck" marked, and the page has a back link.
- The page shows:
  - the card's face and its labels, with its current status
  - eight stat tiles: "Ele geçti", "Kullanıldı", "Discard", "Transfer", "Pakette göründü", "Farklı oyuncu", "Elde kaldı" and "Son kullanım"
  - a "Geçmiş" list of what happened to the card, grouped by day, newest first. It includes the packs that showed the card without its being chosen.
- A card that never reached a hand shows zeros and "Bu kart henüz kimsenin eline geçmedi."
- The owner chose this look out of three, as **V1 · Künye**, on the design canvas https://claude.ai/artifact/5M796CFGd3rkAoZiJHbaaF.

**Set istatistikleri (a set's statistics page)**
- Every stored set gets its own page at `/sets/<setId>`. The menu keeps "Setler" marked, and the page has a back link.
- The page shows the set's cardback, name, code and layout, with its Cardmaker.
- Eight tiles sum up the set: "Kart", "Havuzda", "Elde", "Ele geçti", "Kullanıldı", "Discard", "Açılan pack" and "Hiç ele geçmedi".
- A table lists the set's cards with:
  - their counts: "Ele geçti", "Kullanıldı", "Discard" and "Pakette" (shown / chosen)
  - their status
- Every column sorts. The table starts with the most used cards, and offers a search and a rarity filter. Each card's name leads to its history.
- The owner chose this look as **S1 · Tablo** on the same canvas.

**How it counts**
- Everything is computed from the stored holdings, draws and pack openings when it is read, and updates live. Nothing new is stored.
- "Ele geçti" counts the cards the DM gave, the drawn cards and the cards that came from a pack. A transfer is counted on its own, so a card that changes hands is not counted twice.
- Each copy of a Blessed or Cursed card counts.
- A card counts as shown in a pack only once its position was turned face up.
- History starts when the app goes live. The legacy app's history is not imported.
- Switching a card active and changing its cost in a hand are not counted, because neither is recorded as an event.

**Where the pages open**
- **Library faces:** in the Kart kütüphanesi and the Cursed Deck, each card face gets a clock icon, "geçmiş", in its top row. The DM sees it beside "düzenle" and the magnifier, and a player beside the magnifier. It shows the way the magnifier does, and a click or a double click on the face still works as before.
- **List view:** the card's name is a link.
- **Hand details:** the card details in a hand ("Seçili Kart") get a "Kart geçmişi →" link under the labels.
- **Setler:** each set's name on the Setler screen is a link to its page.

**Who sees what**
- Both pages are open to every signed-in user.
- A set's table lists the cards that the Setler screen counts for the viewer:
  - for the DM, every card of the set, with drafts, DM-only and retired cards marked
  - for a player, the active cards that are not DM-only
- A player can open the page of a DM-only or retired card only while someone holds it, which is how such a card reaches a player's screen. A player cannot open a draft's page.
- Blessed and Cursed cards belong to no set, so they are in no set's table.

## Capabilities

### New Capabilities

- `card-stats`: how the history of a card and of a set is counted from the permanent records, the Kart geçmişi page, the Set istatistikleri page, and who may open which page

### Modified Capabilities

- `card-library`: the card faces of the Kart kütüphanesi and the Cursed Deck get the "geçmiş" icon, and the list views link each card's name to its history
- `card-holdings`: the card details in a hand link to the card's history
- `card-sets`: each set's name on the Setler screen links to the set's statistics

## Impact

- **Data:** no new path and no new field. The pages read three existing sources:
  - `userCards`, by `cardId` for a card's page, and the whole collection for a set's page
  - card draws of `draws`, by `cardId`
  - pack openings of `draws`, by `offered` for a card's page, and every pack opening for a set's page
- **Rules and indexes:** no change. Every signed-in user already reads every holding and every draw record, and the new queries use single-field indexes, which Firestore builds by itself.
- **App code:**
  - a new feature, `src/features/stats/`: the counting functions, a provider that injects the screen's subscriptions, and the two pages
  - routes in `src/app/screens.ts` and `src/app/routes.tsx`
  - `src/features/cards/` (the face's corner icon, the list view's name link)
  - `src/features/hands/HoldingDetails.tsx` (the link)
  - `src/features/sets/SetsPage.tsx` (the name link)
  - `src/app/App.tsx` (the provider), and a test provider in `src/test/`
- **Docs:** `docs/domain.md` (glossary) and `docs/conventions.md` (layout, the screen's data, detail routes).
- **Coordination:** `improve-draw-and-give-dialogs`, in flight, also changes `CardFace`: it adds status badges in the "+ Kart ver" grid. This change adds a corner icon only where a library passes it, so the two meet only in that file.
- **Out of scope:**
  - linking card names in the İşlem Logu to their history
  - statistics for True Words, players or mechanic packs
  - counting active switches and cost changes, which would need new records
  - importing the legacy app's history
