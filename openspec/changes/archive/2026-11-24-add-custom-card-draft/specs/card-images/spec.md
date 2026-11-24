# Spec Delta

## MODIFIED Requirements

### Requirement: Building the pictures
A picture build script SHALL read the `.7z` archives and loose PNG files of a given folder, without changing them, and write the converted Blessed and Cursed cardbacks, packs, Cardmaker, Custom Card covers and custom effect pictures with a manifest to the app's public picture folder, which is committed, so that a build without the archives still has them. It SHALL replace an earlier build. It SHALL leave card and True Word pictures to the picture import, and the sets' cardbacks and Cardmakers to the set import (spec: admin-scripts), and SHALL NOT touch Firestore or the file storage. Without 7-Zip it SHALL stop with a Turkish message saying how to install it.

#### Scenario: Building from the downloads
- **WHEN** an admin runs the build script with the folder that holds the five archives
- **THEN** the public picture folder holds the Blessed and Cursed cardbacks, the pack pictures, the screens' Cardmaker pictures, the 3 Custom Card covers, the custom effect pictures and a manifest, and no card, word or set picture, and the archives are unchanged

#### Scenario: No 7-Zip
- **WHEN** the build script runs on a machine without 7-Zip
- **THEN** it stops with a Turkish message naming `brew install sevenzip`, and writes nothing

#### Scenario: Building the app without the archives
- **WHEN** the app is built on a fresh clone that has never seen the archives
- **THEN** the built app shows the committed cardbacks, pack pictures and Cardmaker

#### Scenario: A rebuilt picture
- **WHEN** an admin rebuilds the pictures after an archive changed one pack picture
- **THEN** `git status` shows that pack's old file removed and its new file and the manifest changed, ready to commit

#### Scenario: Custom Card pictures
- **WHEN** an admin runs the build script with the folder that holds the custom card pictures
- **THEN** the manifest names the 1, 3 and 5-cost covers and each custom effect picture by its cost and type

### Requirement: Matching cardback, pack and Cardmaker pictures
By the legacy names, a file SHALL be one of these:
- a Cardmaker picture, for a known `cardmaker_*` stem that is not a set's
- a pack picture, for `pack_<mechanic stem>`, `pack_gold` or `pack_cursedgold`
- a cardback, for `blessed_cb` or `cursed_cb`
- a Custom Card cover, for `1custom`, `3custom` or `5custom`
- a custom effect picture, for `<cost><type>` with a cost of 1, 3 or 5 and one of the 18 effect types (spec: custom-cards), for example `3caster`
- a set's cardback, for `<set>_cb`, or a set's Cardmaker, for `cardmaker_<set>`, which the set import matches against the stored sets by code, official name or alias

The build SHALL count the set files as left to the set import. `<set>_std`, `_prm`, `_crs` and `_gold` SHALL NOT be pictures.

#### Scenario: A cardback
- **WHEN** the archives hold `kesqer_cb.png`, and the set import runs with them
- **THEN** it becomes the cardback of Kesqerian Nights

#### Scenario: A mechanic pack picture
- **WHEN** the archives hold `pack_blood.png`
- **THEN** it becomes the picture of the Blood & Battle Mechanic Pack

#### Scenario: A set file in the build
- **WHEN** the archives hold `cardmaker_ulagal.png`, and the build script runs
- **THEN** the build writes no picture for it, and its report counts it as left to the set import

#### Scenario: A custom effect picture
- **WHEN** the archives hold `5tw.png`
- **THEN** it becomes the picture of the TW effect at 5-cost, and the picture import does not count it as a card picture

### Requirement: Build report and dry run
After a build, the script SHALL report in Turkish how many cardbacks, pack pictures, mascots, Custom Card covers and custom effect pictures got a picture, name each of them that has no picture, list the duplicates among them, and say how many files it left to the picture import and how many to the set import. With a dry-run option it SHALL print the same report without writing anything.

#### Scenario: Previewing a build
- **WHEN** an admin runs the build script with the dry-run option
- **THEN** the report shows the cardbacks, pack pictures and mascots that would be built, how many card and word files are left to the picture import, and how many set files to the set import, and the public picture folder is unchanged

#### Scenario: A missing effect picture
- **WHEN** the archives have no `1held.png`
- **THEN** the report names the Held effect at 1-cost among the pictures that are missing

## ADDED Requirements

### Requirement: Custom Card pictures in the application
The application SHALL learn from the manifest which Custom Card covers and custom effect pictures exist. A missing cover or effect picture SHALL fall back to text: the cost choice shows "✧" and its cost, and an option, a pick or a face shows its type and cost.

#### Scenario: A missing cover
- **WHEN** the manifest has no 5-cost cover
- **THEN** the "5-Cost Custom Card" choice shows "✧" and 5, and still works

#### Scenario: A missing effect picture
- **WHEN** the manifest has no picture for Gold at 3-cost, and a draft offers it
- **THEN** the option shows "Gold · 3-Cost" and its text, without a picture
