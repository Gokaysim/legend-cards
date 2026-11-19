# player-presence Specification

## Purpose

Lets the members of the table see who else has the application open: each signed-in device reports that its user is there, and every member reads who counts as online.

## Requirements

### Requirement: Reporting presence while on screen
While a signed-in user's application is open and on screen, the device SHALL report to the server that the user is there: at once when the application opens or comes back on screen, and again every 2 minutes. Each report SHALL carry the server's time. A device that is offline SHALL send no reports until it is connected again.

#### Scenario: Opening the application
- **WHEN** Ayla signs in and the application opens
- **THEN** Ayla counts as online on every other member's device without a reload

#### Scenario: Staying on screen
- **WHEN** Ayla keeps the application on screen for 30 minutes
- **THEN** Ayla counts as online on every other member's device for the whole time

### Requirement: Reporting presence in the background
When the application is open but not on screen (another tab, a minimized window), the device SHALL go on reporting every 2 minutes for one hour after the user last had it on screen, and then stop. Bringing it back on screen SHALL report at once and start the hour again.

#### Scenario: Another tab for a while
- **WHEN** Ayla switches to another browser tab for 40 minutes
- **THEN** Ayla counts as online on other members' devices for those 40 minutes

#### Scenario: A forgotten tab
- **WHEN** Ayla leaves the application's tab in the background and does not look at it for 2 hours
- **THEN** Ayla counts as offline on other members' devices from at most 5 minutes after the hour ended

#### Scenario: Coming back
- **WHEN** Ayla counts as offline because her tab was in the background for over an hour, and she opens that tab again
- **THEN** Ayla counts as online again on other members' devices without a reload

### Requirement: Who counts as online
A user SHALL count as online while their latest report is at most 5 minutes old, and as offline otherwise. A user who never reported SHALL count as offline. Every device SHALL re-check this as time passes, so a user who stops reporting turns offline without any new data arriving.

#### Scenario: Reports stop
- **WHEN** Bora's device sends its last report and then closes without saying so
- **THEN** Bora counts as offline on every other member's device at most 5 minutes later, without a reload

#### Scenario: A user who never opened the application since this change
- **WHEN** Can has a profile but has never reported presence
- **THEN** Can counts as offline

### Requirement: Leaving the application
When the user closes the application's tab, reloads it or signs out, the device SHALL try to remove the user's presence at once, so the user counts as offline right away. When the browser does not let that last step through, the user SHALL turn offline through the 5-minute rule.

#### Scenario: Closing the tab
- **WHEN** Bora closes the application's only tab while connected
- **THEN** Bora counts as offline on other members' devices without waiting 5 minutes

#### Scenario: Signing out
- **WHEN** Bora signs out
- **THEN** Bora counts as offline on other members' devices

### Requirement: The user's own presence
On the user's own device, the user SHALL always count as online while signed in, whatever the stored presence says.

#### Scenario: Own entry right after opening
- **WHEN** Ayla opens the application and her first report has not reached the server yet
- **THEN** Ayla's own device shows Ayla as online

### Requirement: Presence access
Every account on the access list SHALL be able to read every user's presence. A user SHALL be able to write and remove only their own presence. A write SHALL hold nothing but the server's time of the report. Every other read or write, including any from a signed-out request or an account not on the access list, SHALL be denied.

#### Scenario: A member reads presence
- **WHEN** Bora, who is on the access list, reads Ayla's presence
- **THEN** the read is allowed

#### Scenario: Writing someone else's presence
- **WHEN** Bora tries to write or remove Ayla's presence
- **THEN** the server denies it

#### Scenario: A made-up time
- **WHEN** Bora writes his own presence with a time other than the server's, or with any other field
- **THEN** the server denies it

#### Scenario: An outsider
- **WHEN** an account that is signed in but not on the access list reads anyone's presence
- **THEN** the server denies it
