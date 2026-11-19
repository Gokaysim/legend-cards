## MODIFIED Requirements

### Requirement: Offline status banner
When the device has no network connection, the shell SHALL show a Turkish banner saying the user is offline, that changes will sync when the connection returns, and that the application must stay open until then. The banner SHALL disappear when the connection comes back.

#### Scenario: Losing the connection
- **WHEN** the device goes offline while the application is open
- **THEN** a banner appears saying the user is offline, that changes will sync when the connection returns, and that the application must stay open until then

#### Scenario: Connection restored
- **WHEN** the device comes back online
- **THEN** the offline banner disappears without a page reload
