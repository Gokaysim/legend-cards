## ADDED Requirements

### Requirement: Open-source license
The repository SHALL be licensed under the GNU General Public License version 3: it SHALL carry the license's full text in a `LICENSE` file at its root, and the package manifest SHALL name the license. Every dependency the application ships SHALL have a license that GPL-3.0 allows.

#### Scenario: Finding the license
- **WHEN** a contributor opens the repository's root
- **THEN** they find the GPL-3.0 text in `LICENSE`, and the package manifest names GPL-3.0

#### Scenario: Adding a dependency
- **WHEN** a contributor adds a runtime dependency under a license GPL-3.0 does not allow
- **THEN** the change is not accepted

### Requirement: Adapted third-party code
Files adapted from another project SHALL keep that project's copyright notice, name the project and the upstream revision they come from, and say that they were changed. A notice file at the repository's root SHALL list each adapted project with its license and the folder that holds its files.

#### Scenario: An adapted dice file
- **WHEN** a contributor opens a dice mesh or collider file adapted from Owlbear Rodeo's dice roller
- **THEN** its header names Owlbear Rodeo's dice roller, its upstream revision and its license, and says that it was changed

#### Scenario: Listing what is adapted
- **WHEN** a contributor reads the notice file
- **THEN** it lists Owlbear Rodeo's dice roller, licensed GPL-3.0, and the folder that holds its adapted files
