# Spec Delta

## MODIFIED Requirements

### Requirement: The Zarlar screen
The "Zarlar" screen SHALL put the wide strip, where the newest roll tumbles in 3D, on the right, with the roll form below it. On the left, one column SHALL hold two tabs, "Kanal" (the channel) and "İnisiyatif" (spec: initiative-tracker), with "Kanal" open by default. The open tab SHALL be kept in the URL. A "Zar stili" button on the strip SHALL open the dice settings.

At 360 CSS pixels wide, the strip, the form and the tabs SHALL be stacked in that order, and the page SHALL NOT scroll sideways.

#### Scenario: Opening the screen
- **WHEN** a signed-in user selects "Zarlar" in the navigation
- **THEN** the screen shows the strip with "Zar stili", the roll form below it, and the "Kanal" tab open beside them with the newest roll at the bottom

#### Scenario: Reloading on the İnisiyatif tab
- **WHEN** a signed-in user reloads the browser on the address of the Zarlar screen's İnisiyatif tab
- **THEN** the Zarlar screen is shown again, on its İnisiyatif tab

#### Scenario: Phone width
- **WHEN** the Zarlar screen is shown 360 CSS pixels wide
- **THEN** the strip, the form and the tabs are stacked in that order, and the page has no horizontal scrollbar

## ADDED Requirements

### Requirement: The dice settings dialog
"Zar stili" SHALL open a dialog with "Zar stilin" and "Bu cihazda". Choosing a style SHALL save it and close the dialog. The dialog SHALL also close with "Kapat" or the Escape key. The dice style and the device settings SHALL NOT show on the screen outside the dialog.

#### Scenario: Choosing a style
- **WHEN** Bora selects "Zar stili" and then Walnut
- **THEN** the dialog closes, and Bora's next roll uses Walnut dice

#### Scenario: Changing a device setting
- **WHEN** Ayla selects "Zar stili", turns "Zar sesi" on and selects "Kapat"
- **THEN** the dialog closes, and her dice make their sounds from then on

#### Scenario: The screen without the dialog
- **WHEN** a signed-in user opens the Zarlar screen
- **THEN** neither the dice styles nor "Bu cihazda" show until "Zar stili" is selected
