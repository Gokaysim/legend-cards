## MODIFIED Requirements

### Requirement: Offline tolerance
When the device goes offline while the application is open, already loaded data SHALL stay readable from the local cache, and writes SHALL be queued. Queued writes SHALL reach the server automatically when the connection returns, as long as the application stays open on that device. The local cache SHALL live only as long as the open application: it SHALL NOT be kept across reloads, and open tabs SHALL NOT share it.

#### Scenario: Reading while offline
- **WHEN** the device goes offline after data has been loaded
- **THEN** subscriptions stay ready with that data and report that it comes from the local cache

#### Scenario: Writing while offline
- **WHEN** a write is made while the device is offline and the connection later returns while the application is still open
- **THEN** the write reaches the server without user action, and the other devices receive it

#### Scenario: Closing the application before the connection returns
- **WHEN** a write is made while the device is offline, and the tab is closed or reloaded before the connection returns
- **THEN** the write is lost, and the other devices never receive it

#### Scenario: Opening the application offline
- **WHEN** a signed-in member opens the application while the device has no connection
- **THEN** the loading state is shown until the connection returns, and no data from an earlier visit is shown

#### Scenario: Two tabs open
- **WHEN** the application is open in two tabs of the same browser
- **THEN** both tabs work, and both receive live updates

#### Scenario: A reload starts from the server
- **WHEN** the local cache of an open application holds data that differs from the server, and the user reloads the page
- **THEN** after the reload every subscription shows the server's data
