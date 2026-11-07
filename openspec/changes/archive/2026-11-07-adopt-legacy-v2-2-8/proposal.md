# Proposal

## Why

The owner added a newer legacy build, `reference/legacy/Legend_Card_Manager_v2.2.8.html`, and wants the rebuild to follow it instead of v2.1.15. The project's reference documents, agent guidance, and app shell still describe v2.1.15. Since then, v2.2.8 has added screens (Shops with an Elixir Shop, Custom Card Draft, Kurallar), changed pack prices and the shop layout, and added a new pack type. It also writes down the table rules that the DM uses. Re-baselining now, while every screen is still a placeholder, costs little. Feature work that starts from the old reference would be built against rules and screens the group no longer uses.

## What Changes

- **v2.2.8 becomes the current legacy reference.**
  - The v2.2.8 file is kept byte-for-byte, with its checksum recorded.
  - The v2.1.15 file stays unchanged as the earlier version.
  - `reference/legacy/README.md`, `CLAUDE.md`, and the `context` in `openspec/config.yaml` name v2.2.8 as the reference.
- **`docs/domain.md` is re-baselined on v2.2.8:**
  - The rules section is re-transcribed from v2.2.8. Mechanic Packs now cost 4 LP / 10000 GP, and Pandemonium costs 3 LP / 7500 GP. There is a new **Pandemonium Cursed Pack**. The shop has two groups: Set Packs, which now include Pandemonium, and Mechanic Packs, which now include a Golden Packs group. The Rare Packs group no longer exists.
  - New glossary terms: Shops, Elixir Shop, Elixir, Elixir Withdrawal, Custom Card Draft, Custom Card, custom effect, and the rules page (Kurallar).
  - New rule sections describe the observed v2.2.8 behavior for the Custom Card Draft, the Elixir Shop, and the per-dataset data tools.
  - A new section records the table rules that the v2.2.8 rules page states. The app does not enforce them.
  - The "deliberate decisions" list is updated. The Pandemonium placement has changed in v2.2.8.
  - A transcription error is corrected: "only Golden Packs can offer a Blessed card". With the owner's data, Blessed cards also come up in random draws and in Mechanic Packs, in both versions.
  - An "open questions" list records where the rules page disagrees with the app's behavior, mainly where Blessed cards can come from. These go to the DM. This change does not decide them.
  - A short "changes since v2.1.15" note is added.
- **The app shell navigation follows v2.2.8.** The menu has nine screens in this order: Oyuncu elleri, Shops, True Words, Custom Card Draft, Kart kütüphanesi, Cursed Deck, İşlem Logu, Kurallar, Veri / Yedek.
  - **Shops** is a small hub that leads to two sub-screens, **Pack Shop** and **Elixir Shop**. Each has its own URL under Shops, and the menu keeps "Shops" marked while either one is open.
  - **Custom Card Draft**, **Kurallar**, **Pack Shop**, and **Elixir Shop** are placeholders. The Kurallar screen does not show the rules text yet. That waits for a separate change, after the DM has reviewed the text.
  - **BREAKING (URL):** Pack Shop moves from `/shop` to `/shops/packs`. The old address shows the not-found page. The app has not been released, so nothing depends on the old URL.
- `docs/conventions.md` no longer says "seven" screens. It now explains how a sub-screen keeps its parent marked in the menu.

Out of scope:
- implementing any game feature: packs, Custom Card Draft, Elixir Shop, rules text, or data tools
- the data model for custom cards and elixirs
- mascot artwork, the pack-opening animation, and Cardmaker speech bubbles
- editing either legacy HTML file, or fixing the rules page's typos or contradictions

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: the main navigation changes from seven to nine screens in the v2.2.8 order. A new requirement covers the Shops hub and its Pack Shop and Elixir Shop sub-screens.
- `developer-workflow`: the domain reference is based on legacy v2.2.8 and also records the rules page's table rules and their conflicts. The legacy reference folder names v2.2.8 as current and keeps v2.1.15 as history.

## Impact

- **Code:**
  - `src/app/screens.ts`: the screen list.
  - `src/app/routes.tsx`: routes, including the Shops sub-screens.
  - `src/features/`: new `shops/`, `custom-draft/`, and `rules/` page folders. The Pack Shop page moves under `shops/`, and a new Elixir Shop page is added.
  - `src/app/routes.test.tsx`, plus new tests for the Shops hub.
- **Docs and config:** `docs/domain.md`, `docs/conventions.md`, `reference/legacy/README.md`, `CLAUDE.md`, `openspec/config.yaml`.
- **Not affected:**
  - Firestore data paths and rules (no new data).
  - Authentication and dependencies.
  - Both legacy HTML files stay byte-for-byte.
