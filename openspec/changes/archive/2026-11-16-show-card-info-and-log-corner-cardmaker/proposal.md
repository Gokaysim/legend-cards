# Proposal

## Why

Two screens still differ from v2.2.8 in how they show their pictures:

- **İşlem Logu.** Its Cardmaker, `cardmaker_think`, stands next to the title on every window. On the other screens with a Cardmaker, she stands in the window's bottom-right corner on a wide window with a mouse, as in v2.2.8, where the log's `cardmaker_think` uses the same fixed corner as the rest (`.app main>.page-mascot`). `polish-cards-packs-and-mascots` left the log out on purpose. The owner now wants it to match the other screens.
- **Kurallar.** v2.2.8's rules page (`rulesPage()`) floats a large `card_info` picture at the right of the text: a card with its parts labeled Cost, Name, Effect and Set. `add-rules-page` left it out because the owner's archives did not have it. The picture is now built (`npm run build-art` writes `card_info` to `public/art/`, and its stem is already a known Cardmaker stem). The owner wants it shown in the rules.

## What Changes

- **İşlem Logu's Cardmaker in the corner.** On a device with hover whose window is at least 1024 CSS pixels wide, `cardmaker_think` stands fixed in the window's bottom-right corner instead of next to the title. She fades out while the pointer is over her or the focus is under her, as on the other corner screens. On a tablet or a narrower window she stays next to the title, and on a phone she does not show. After this change, every screen with a Cardmaker places her the same way.
- **The `card_info` picture on Kurallar.** The picture floats at the top right of the rules text, and the text of the first section wraps around it and continues below it, as in v2.2.8. The text keeps its readable width of about 70 characters, so on a wide window `cardmaker_wave` still stands in the corner beside it.
  - **It is information, not decoration.** Unlike the Cardmaker, the picture explains the parts of a card, so it has a Turkish alternative text for screen readers. v2.2.8 hid it from them.
  - **On a phone** it shows at the full width of the text, above the first section, because a picture half the width of a 360 px screen makes its labels too small to read. The Cardmaker itself stays hidden on a phone; this picture is not the Cardmaker.
  - **Without the picture**, where it has not been built, the rules show as today.
- **`docs/domain.md`**: the Cardmaker in the corner now includes İşlem Logu, and the Kurallar screen shows the `card_info` picture.

Out of scope:
- **Translating the picture's labels.** "Cost", "Name", "Effect" and "Set" are part of the picture.
- **Other screens' Cardmakers**, the speech bubbles (only the shops speak) and the shocked pair.
- **Changing the build.** `card_info` is already matched and built; this change only shows it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-images`: "The Cardmaker in the corner" adds İşlem Logu to the screens that stand her in the corner, and its "Another screen" scenario, which kept the log's Cardmaker next to the title, changes to the corner.
- `rules-page`: a new requirement for the `card_info` picture in the rules (placement, alternative text, phone width, without the picture), and "Rules screen layout" changes so that the text wraps around the picture and keeps its readable width.

## Impact

- **Code:**
  - `src/features/activity-log/ActivityLogPage.tsx`: the header asks for the corner placement.
  - `src/features/rules/RulesContent.tsx`: the picture at the top of the text, and block layout so that the text can wrap around a float.
  - `src/features/rules/` (new component): the `card_info` picture, read through `useArt().mascotUrl('card_info')`.
  - Tests: `src/app/routes.test.tsx` (the log joins the corner screens), `src/features/rules/RulesPage.test.tsx`, and the log page's tests if they check the title's Cardmaker.
- **Docs:** `docs/domain.md` (the Cardmaker in the corner, the Kurallar screen).
- **Data, access rules, build:** none.
