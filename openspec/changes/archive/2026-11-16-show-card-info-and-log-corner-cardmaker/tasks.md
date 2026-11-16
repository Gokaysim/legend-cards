# Tasks

## 1. İşlem Logu's Cardmaker in the corner

- [x] 1.1 In `src/features/activity-log/ActivityLogPage.tsx`, pass `mascotPlacement="corner"` to `PageHeader` (D1). In `src/app/routes.test.tsx`, move `['/log', 'cardmaker_think']` into the "stands the Cardmaker of %s in the corner" cases and remove the "keeps the Cardmaker of %s by the title" case; check that the tablet case for `/log` (title placement without `stubWideHover()`) still exists in the "next to the title" table, or add it. Verify: `npx vitest run --project unit src/app/routes.test.tsx` passes, covering the "Another screen" (now the log in the corner) and "The log on a tablet" scenarios of the `card-images` delta.

## 2. The `card_info` picture on Kurallar

- [x] 2.1 Add `src/features/rules/RulesPicture.tsx` (D2, D5): `CARD_INFO_STEM`, the Turkish alternative text as a constant, `usePicture(useArt().mascotUrl(CARD_INFO_STEM))`, nothing while `src` is `null`, else an `<img>` with `data-rules-picture`, `decoding="async"`, `draggable={false}`, `pointer-events-none`, `drop-shadow-lift`, and the sizes of D4 (`mb-4 block h-auto w-full sm:float-right sm:ml-6 sm:w-1/2`). Verify: `npm run check` passes the type check and lint.
- [x] 2.2 In `src/features/rules/RulesContent.tsx`, switch the wrapper to `flow-root max-w-[70ch] space-y-8`, `RulesSection` to `space-y-3`, and `BulletList` to `list-disc space-y-2 pl-6` (D3), keeping `data-rules-text` and the other classes; render `<RulesPicture />` in the first section right after its `h2`. Update the layout comment. Verify: the existing `RulesPage.test.tsx` cases still pass with `npx vitest run --project unit src/features/rules`.
- [x] 2.3 Add tests in `src/features/rules/RulesPage.test.tsx` with `testArt({ mascots: { card_info: '/art/mascots/card_info.0123456789.webp', cardmaker_wave: … } })`:
  - the picture is an `img` with the spec's alternative text, inside the first section and before its first paragraph, and inside `[data-rules-text]`
  - on a tablet, `cardmaker_wave` is by the title and the picture is in the text; on a wide window with a mouse, `cardmaker_wave` is in the corner and the picture still shows
  - on a phone, the picture shows and no `img[data-mascot]` does (the existing "no Cardmaker on a phone" case stays true)
  - without `card_info` in the art, and after the `img` fires `error`, no `[data-rules-picture]` is in the page

  Verify: `npx vitest run --project unit src/features/rules` passes, covering the "The card anatomy picture" scenarios.

## 3. Docs

- [x] 3.1 Update `docs/domain.md`: in "The Cardmaker in the corner", add İşlem Logu to the corner screens and drop "and on İşlem Logu" from the screens that keep her by the title; in the Kurallar section (table rules), say the screen shows v2.2.8's `card_info` picture of a card's parts, floated beside the first section's text, at full width on a phone, with Turkish alternative text. Verify: reading the document matches both deltas, and `npm run check` passes the format check.

## 4. Integration

- [x] 4.1 Run the whole suite. Verify: `npm run check` and `npm run test:emulator` both pass.
- [x] 4.2 In the running app (`npm run dev`, signed in as a player), with pictures built, check:
  - İşlem Logu on a wide window: `cardmaker_think` in the corner, fading when the pointer reaches an event under her
  - Kurallar on a wide window, at 800 px, and at 360 px (the iframe check): the picture floats at the top right with the first section wrapping beside it, and at 360 px it takes the full width above the text, with no horizontal scrolling
  - with `public/art/` moved aside: neither screen shows a picture or an empty space

  Save screenshots, and restore `public/art/` afterwards.
- [x] 4.3 Stop every process on the project's ports (CLAUDE.md): SIGINT to the process group of `npm run dev` or the emulators, and wait for the export. Verify: `lsof -nP -iTCP -sTCP:LISTEN` shows nothing on 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150, 9199 or 5002.

## Workflow follow-up

- After the owner's review, archive the change with `/opsx:archive`, which syncs the specs.
- Commit only when the owner asks.
