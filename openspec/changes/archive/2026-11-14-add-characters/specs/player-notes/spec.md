# Spec Delta

## MODIFIED Requirements

### Requirement: DM notu tab
For the DM only, the hand screen SHALL have a "🔒 DM notu" tab after "🧝 Karakterler". It SHALL show the DM note as an editable field, marked "Yalnızca DM görür". The tab SHALL be kept in the URL, so reloading opens it again. A player SHALL have no such tab, and the tab's URL SHALL open the Kartlar tab for them. A link to the former Notlar tab SHALL open the Kartlar tab.

#### Scenario: The DM's view
- **WHEN** the DM opens the DM notu tab of Ayla's hand
- **THEN** the DM sees Ayla's DM note as an editable field, marked "Yalnızca DM görür", with her player note under it

#### Scenario: Reloading the tab
- **WHEN** the DM reloads the browser while the DM notu tab of Bora's hand is open
- **THEN** the DM notu tab of Bora's hand is shown again

#### Scenario: A player's tabs
- **WHEN** Ayla opens any hand
- **THEN** she sees the "♠ Kartlar", "✦ True Words" and "🧝 Karakterler" tabs, and no DM notu tab

#### Scenario: The DM's tabs
- **WHEN** the DM opens any hand
- **THEN** the DM sees "♠ Kartlar", "✦ True Words", "🧝 Karakterler" and "🔒 DM notu", in that order

#### Scenario: A player opens the tab's URL
- **WHEN** Ayla opens the URL of the DM notu tab of her own hand
- **THEN** the Kartlar tab of her hand is shown

#### Scenario: An old Notlar link
- **WHEN** a user opens the URL of the former Notlar tab of Ayla's hand
- **THEN** the Kartlar tab of Ayla's hand is shown, with her player note under her cards
