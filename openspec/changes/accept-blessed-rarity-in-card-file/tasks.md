## 1. Import

- [x] 1.1 In `scripts/lib/cardRows.ts`, accept the rarity "Blessed" (any letter case) on a Blessed row as no rarity, and keep the error for any other value. Update the Turkish message in `scripts/lib/messages.ts` to name "—", "Blessed" or empty. Verify: unit tests in `scripts/lib/cardRows.test.ts` cover "Blessed", "blessed", "—", empty, and "Rare" (still an error), and a normal row with the rarity "Blessed" is still an invalid rarity.
- [x] 1.2 Update "How the import reads the card files" in `data/README.md`. Verify: `npm run check` and `npm run test:emulator` pass.
