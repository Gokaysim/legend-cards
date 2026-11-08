# Spec Delta

## ADDED Requirements

### Requirement: Pool distribution
The Kart kütüphanesi SHALL offer a "▥ Havuz Dağılımı" dialog, live, over the drawable cards: the active normal cards without a holder and every active Blessed card. It SHALL show how many cards that is, and each rarity's and each set's share as a percentage and a count. Blessed cards SHALL count as the rarity "Blessed" and the set "Blessed". Each rarity SHALL list its sets with their counts.

#### Scenario: Reading the distribution
- **WHEN** the drawable cards are 300 Common, 100 Rare, and 20 Blessed cards, and a user opens "▥ Havuz Dağılımı"
- **THEN** the dialog shows 420 cards, and in Turkish number format Common "%71,4" (300), Rare "%23,8" (100), and Blessed "%4,8" (20)

#### Scenario: Sets within a rarity
- **WHEN** 60 of the 100 drawable Rare cards are from Kesqer
- **THEN** the Rare entry lists "Kesqerian Nights" with 60

#### Scenario: A card is drawn
- **WHEN** a normal card is drawn while a user has the dialog open
- **THEN** the counts and shares update without a reload

#### Scenario: An empty pool
- **WHEN** no card can be drawn and a user opens the dialog
- **THEN** it says in Turkish that the pool has no cards to show
