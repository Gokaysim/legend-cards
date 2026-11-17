# Spec Delta

## MODIFIED Requirements

### Requirement: Building the pictures
A picture build script SHALL read the `.7z` archives and loose PNG files of a given folder, without changing them, and write the converted Blessed and Cursed cardbacks, packs and Cardmaker with a manifest to the app's public picture folder, which is committed, so that a build without the archives still has them. It SHALL replace an earlier build. It SHALL leave card and True Word pictures to the picture import, and the sets' cardbacks and Cardmakers to the set import (spec: admin-scripts), and SHALL NOT touch Firestore or the file storage. Without 7-Zip it SHALL stop with a Turkish message saying how to install it.

#### Scenario: Building from the downloads
- **WHEN** an admin runs the build script with the folder that holds the five archives
- **THEN** the public picture folder holds the Blessed and Cursed cardbacks, the pack pictures, the screens' Cardmaker pictures and a manifest, and no card, word or set picture, and the archives are unchanged

#### Scenario: No 7-Zip
- **WHEN** the build script runs on a machine without 7-Zip
- **THEN** it stops with a Turkish message naming `brew install sevenzip`, and writes nothing

#### Scenario: Building the app without the archives
- **WHEN** the app is built on a fresh clone that has never seen the archives
- **THEN** the built app shows the committed cardbacks, pack pictures and Cardmaker

#### Scenario: A rebuilt picture
- **WHEN** an admin rebuilds the pictures after an archive changed one pack picture
- **THEN** `git status` shows that pack's old file removed and its new file and the manifest changed, ready to commit

### Requirement: Picture aliases
A table in the local data folder (spec: developer-workflow, "The owner's data stays out of the repository") SHALL map a file name to the card, Cursed card, True Word or asset it shows, for files whose names differ from the data. An alias SHALL win over the name rules. An alias naming an asset that does not exist SHALL stop the build with its row number. An alias naming a card, Cursed card or True Word that is not stored SHALL stop the picture import with its row number.

#### Scenario: A misspelled file
- **WHEN** the table maps `orkolsacquisiton.png` to "Orkol's Acquisition"
- **THEN** that file becomes the picture of "Orkol's Acquisition"

#### Scenario: A renamed Blessed card
- **WHEN** the table maps `charmingrogue.png` to "Roguish Charm"
- **THEN** that file becomes the picture of the Blessed card "Roguish Charm"

#### Scenario: A broken alias
- **WHEN** a row of the table names a card that is not stored
- **THEN** the picture import reports that row and stops, and writes nothing
