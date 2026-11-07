# Spec Delta

## Purpose

Keeps every connected device showing the same shared data live. It is the one way application features read and observe stored data in real time, with offline tolerance and validated data shapes.

## ADDED Requirements

### Requirement: Live document and collection subscriptions
The data layer SHALL let features subscribe to one stored document, or to a query over a collection. When the stored data changes on any device, the data layer SHALL deliver the new data to every subscriber without a page reload.

#### Scenario: Change made on another device
- **WHEN** a feature is subscribed to a document and another client changes that document
- **THEN** the subscriber receives the updated data without a page reload

#### Scenario: Collection membership changes
- **WHEN** a feature is subscribed to a collection query and another client adds a document that matches the query
- **THEN** the subscriber receives a result that includes the new document

### Requirement: Subscription states
Every subscription SHALL report exactly one of three states:
- loading: no result yet
- ready: carries the data, plus whether it came from the local cache and whether it includes local writes not yet confirmed by the server
- error: carries a description of the error

A document that does not exist SHALL be reported as ready with no data, not as an error.

#### Scenario: First load
- **WHEN** a subscription starts and no result has arrived yet
- **THEN** its state is loading

#### Scenario: Missing document
- **WHEN** a subscription targets a document that does not exist
- **THEN** its state is ready, it carries no data, and it carries no error

#### Scenario: Unconfirmed local write
- **WHEN** the current device writes to a subscribed document and the server has not yet confirmed the write
- **THEN** the state is ready, the data includes the change, and the state shows that local writes are still pending

#### Scenario: Access denied
- **WHEN** a subscription targets data that the access rules deny
- **THEN** its state is error, and the error identifies the problem as a permission problem

### Requirement: Validated data shapes
Data read from storage SHALL be checked against the declared shape for that kind of data before features receive it. A document that does not match its shape SHALL produce an error state that names the document. It SHALL NOT reach features as invalid data.

#### Scenario: Malformed document
- **WHEN** a subscribed document is missing a field that its declared shape requires
- **THEN** the subscription reports an error that identifies the document. The feature does not receive the malformed data.

### Requirement: Subscription cleanup
A subscription SHALL stop listening when its view goes away or when it switches to different data. It SHALL NOT deliver results for data it no longer targets.

#### Scenario: Leaving a screen
- **WHEN** the user leaves a screen that held a subscription
- **THEN** that subscription stops receiving updates

#### Scenario: Switching targets
- **WHEN** a subscription changes from one document to another
- **THEN** it only delivers results for the new document

### Requirement: Offline tolerance
When the device is offline, already loaded data SHALL stay readable from the local cache, and writes SHALL be queued. Queued writes SHALL reach the server automatically when the connection returns. The local cache SHALL be shared by all open tabs of the application on the same device.

#### Scenario: Reading while offline
- **WHEN** the device goes offline after data has been loaded
- **THEN** subscriptions stay ready with that data and report that it comes from the local cache

#### Scenario: Writing while offline
- **WHEN** a write is made while the device is offline and the connection later returns
- **THEN** the write reaches the server without user action, and the other devices receive it

#### Scenario: Two tabs open
- **WHEN** the application is open in two tabs of the same browser
- **THEN** both tabs work, and both receive live updates

### Requirement: Startup configuration check
At startup, the application SHALL check that its backend connection settings are present and well-formed. If a setting is missing or invalid, the application SHALL show a clear error screen naming the problem instead of the app. It SHALL NOT fail silently.

#### Scenario: Missing setting
- **WHEN** the application starts without one of its required backend settings
- **THEN** an error screen is shown that names the missing setting, and no other screen is shown
