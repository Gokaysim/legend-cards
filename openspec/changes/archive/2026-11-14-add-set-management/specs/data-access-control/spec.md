## MODIFIED Requirements

### Requirement: Signed-out users have no access
The server SHALL deny every read and write from a request without a signed-in user, for every data path and every file. This holds for paths opened by later changes too. The one exception SHALL be reading a stored card, word or set picture, which anyone may open by its address (spec: card-images, "Anyone may open a stored picture").

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read any document
- **THEN** the server denies the read

#### Scenario: Signed-out write
- **WHEN** a request without a signed-in user tries to write any document
- **THEN** the server denies the write

#### Scenario: Signed-out picture read
- **WHEN** a request without a signed-in user reads the picture file of "Aboleth's Eyes"
- **THEN** the server allows it

#### Scenario: Signed-out picture write
- **WHEN** a request without a signed-in user tries to store or delete a card, word or set picture
- **THEN** the server denies it

#### Scenario: Signed-out set read
- **WHEN** a request without a signed-in user tries to read the stored set "Kesqer"
- **THEN** the server denies the read
