# user-auth Specification

## Purpose

Identifies the people using Legend Card Manager through their Google account. Every application screen is available only to signed-in users, which gives later role and permission work a verified identity to build on.

## Requirements

### Requirement: Google sign-in
The application SHALL let users sign in with a Google account from a dedicated sign-in screen. The sign-in screen SHALL show the application name and one Turkish sign-in action. After Google sign-in, the application SHALL let the user in only when the account is on the access list (spec: table-access, "Accounts on the list"). Otherwise, it SHALL show the "ekli değil" screen.

#### Scenario: Successful sign-in
- **WHEN** a signed-out user on the sign-in screen chooses to sign in with Google, completes the Google account selection, and the account is on the list
- **THEN** the user is signed in and taken to the application

#### Scenario: Sign-in with an account that is not on the list
- **WHEN** Cem completes Google sign-in with "cem@gmail.com", and that address is not on the list
- **THEN** the "ekli değil" screen is shown, and no profile is created for Cem

#### Scenario: User cancels sign-in
- **WHEN** a signed-out user starts Google sign-in and closes the Google window without choosing an account
- **THEN** the user stays on the sign-in screen, no error message is shown, and they can try again

#### Scenario: Sign-in fails
- **WHEN** Google sign-in fails for a reason other than the user cancelling, such as a network error
- **THEN** the sign-in screen shows a Turkish error message and lets the user try again

### Requirement: Protected application screens
Every application screen except the sign-in screen SHALL require a signed-in user whose account is on the access list. A signed-out user who opens a protected URL SHALL be sent to the sign-in screen, and after signing in with an account on the list SHALL return to the URL they first asked for.

#### Scenario: Opening a protected screen while signed out
- **WHEN** a signed-out user opens the Kart kütüphanesi screen's URL
- **THEN** the sign-in screen is shown instead of the library

#### Scenario: Returning after sign-in
- **WHEN** that user then signs in successfully with an account on the list
- **THEN** the Kart kütüphanesi screen is shown

#### Scenario: Signed-in user opens the sign-in screen
- **WHEN** a signed-in user whose account is on the list opens the sign-in screen's URL
- **THEN** they are taken to the default application screen

#### Scenario: Unlisted user opens a protected screen
- **WHEN** a signed-in user whose account is not on the list opens the Kart kütüphanesi screen's URL
- **THEN** the "ekli değil" screen is shown instead of the library

### Requirement: Auth state loading
While the application is still finding out whether the user is signed in, and whether a signed-in account is on the access list, it SHALL show a neutral loading state. It SHALL NOT briefly show the sign-in screen, the "ekli değil" screen or protected content. A failed check that the application is retrying SHALL count as still finding out.

#### Scenario: Reopening the app while already signed in
- **WHEN** a previously signed-in user reopens the application
- **THEN** a loading state is shown until the session is restored, and then the requested screen appears, without the sign-in screen ever appearing in between

#### Scenario: Checking the list after sign-in
- **WHEN** a user completes Google sign-in and the application is still checking whether the account is on the list
- **THEN** the loading state is shown, and neither the application nor the "ekli değil" screen appears until the check is done

#### Scenario: The first check fails and the retry succeeds
- **WHEN** Ayla, whose address is on the list, signs in, and the server refuses the first check of her entry
- **THEN** the loading state stays while the application checks again, and Ayla enters the application without a reload and without ever seeing the "ekli değil" screen

### Requirement: Persistent session
A successful sign-in SHALL stay valid across page reloads and browser restarts on the same device until the user signs out.

#### Scenario: Reload keeps the session
- **WHEN** a signed-in user reloads the page
- **THEN** they are still signed in and do not have to choose a Google account again

### Requirement: Signed-in identity display
The shell SHALL show the signed-in user's display name, and their profile picture when they have one.

#### Scenario: Seeing who is signed in
- **WHEN** a user is signed in
- **THEN** the navigation area shows their Google display name, together with their profile picture when the account has one

### Requirement: Sign-out
A signed-in user SHALL be able to sign out from the shell. Signing out SHALL end the session on that device and show the sign-in screen.

#### Scenario: Signing out
- **WHEN** a signed-in user chooses "Çıkış yap"
- **THEN** the session ends and the sign-in screen is shown

#### Scenario: Protected screens after sign-out
- **WHEN** a user who has signed out uses the browser's back button to return to a protected screen
- **THEN** the sign-in screen is shown instead of that screen

### Requirement: The "ekli değil" screen
A signed-in user whose account is not on the access list SHALL see a screen with the application name, the account's email address, and a Turkish line saying that this address is not on the table and that they should ask the DM to add it. The screen SHALL offer "Başka hesapla giriş yap", which opens Google's account chooser, and "Çıkış yap". The application SHALL read no table data for this user.

#### Scenario: Seeing the screen
- **WHEN** Cem is signed in with "cem@gmail.com", which is not on the list
- **THEN** the screen shows "cem@gmail.com", says that it is not on the table, and asks Cem to have the DM add it

#### Scenario: Another account
- **WHEN** Cem chooses "Başka hesapla giriş yap" and picks an account that is on the list
- **THEN** Cem enters the application with that account

#### Scenario: Signing out
- **WHEN** Cem chooses "Çıkış yap"
- **THEN** the session ends and the sign-in screen is shown

#### Scenario: Reopening the app
- **WHEN** Cem reopens the application without having signed out, and the address is still not on the list
- **THEN** the "ekli değil" screen is shown again

### Requirement: Entering when the address is added
While the "ekli değil" screen is shown, the application SHALL follow the account's own list entry. When the DM adds the address, the user SHALL enter the application without a reload, at the screen they asked for, and their profile SHALL be created then.

#### Scenario: The DM adds the address while Cem waits
- **WHEN** Cem has the "ekli değil" screen open, and the DM adds "cem@gmail.com"
- **THEN** Cem enters the application without a reload, and Cem appears in every open "Oyuncular" list

### Requirement: Leaving when the address is removed
When the address of a signed-in user is removed from the access list while the application is open, the application SHALL show the "ekli değil" screen at once, and it SHALL stop reading table data. It SHALL NOT show error messages for the reads it stops.

#### Scenario: Removed while playing
- **WHEN** Ayla has the "Oyuncu elleri" screen open, and the DM removes "ayla@gmail.com"
- **THEN** Ayla's application shows the "ekli değil" screen without a reload, and no error message appears

### Requirement: When an account counts as not on the list
The application SHALL treat an account as not on the access list only when the server says the account's entry does not exist, or when the account has no verified email address. A failed check SHALL never count as not being on the list.

#### Scenario: A failed check is not "ekli değil"
- **WHEN** Ayla, whose address is on the list, signs in, and every check of her entry fails
- **THEN** Ayla never sees the "ekli değil" screen

#### Scenario: An account without a verified address
- **WHEN** a user signs in with a Google account whose email address is not verified
- **THEN** the "ekli değil" screen is shown at once, without a check of the list

### Requirement: Retrying a failed access check
When the check of the account's own list entry fails, the application SHALL try it again a few times within about ten seconds, with longer waits between tries, before giving up. While it retries, the user SHALL keep the screen they had: the loading state before the first answer, or the application for a user who was already in it.

#### Scenario: A member's check fails while playing
- **WHEN** Ayla has the "Oyuncu elleri" screen open, the check of her entry fails once, and the next try succeeds
- **THEN** Ayla stays on the "Oyuncu elleri" screen throughout, with no loading state and no error message

### Requirement: Access check failure screen
When every try of the check fails, the application SHALL show a screen with the application name, the account's email address, a Turkish line saying that access could not be checked, "Tekrar dene", which starts the check again, and "Çıkış yap". It SHALL read no table data while that screen is shown.

#### Scenario: Every try fails
- **WHEN** Ayla signs in with "ayla@gmail.com", and every check of her entry fails
- **THEN** after the retries a screen shows "ayla@gmail.com", says that access could not be checked, and offers "Tekrar dene" and "Çıkış yap"

#### Scenario: Trying again
- **WHEN** Ayla sees that screen and chooses "Tekrar dene", and the check now succeeds
- **THEN** the loading state is shown during the check, and Ayla enters the application at the screen she asked for

#### Scenario: Signing out from the failure screen
- **WHEN** Ayla sees that screen and chooses "Çıkış yap"
- **THEN** the session ends and the sign-in screen is shown

### Requirement: Diagnosing the "ekli değil" decision
The "ekli değil" screen SHALL show a small diagnostic line under its actions. The line SHALL give the reason the app treats the account as not on the list, the exact entry ID it looked up, the result of one direct server read of that entry, and the build ID. That read SHALL bypass the local cache and every open subscription. The application SHALL log every answer about the account's own entry, and every access decision, to the browser console.

#### Scenario: The server says the entry is missing
- **WHEN** Cem signs in with "cem@gmail.com", and the server answers that there is no entry
- **THEN** the "ekli değil" screen's diagnostic line names the server's answer as the reason, shows "cem@gmail.com" as the ID it looked up, shows the result of the direct server read, and shows the build ID

#### Scenario: An account without a verified address
- **WHEN** a user signs in with a Google account whose address is not verified
- **THEN** the diagnostic line names the unverified address as the reason, and no direct server read is made

#### Scenario: The direct read disagrees
- **WHEN** the subscription says there is no entry, but the direct server read finds the entry
- **THEN** the diagnostic line shows both results, so the difference is visible in a screenshot

#### Scenario: The local cache is wrong
- **WHEN** the device's local cache says the entry does not exist while the server holds it
- **THEN** the direct server read reports that the entry exists

#### Scenario: Decisions in the console
- **WHEN** a user signs in, and the application checks the list and decides
- **THEN** the console shows each answer about the entry (where it came from and whether the entry exists) and the decision, without any error message

### Requirement: A DM's own entry stays put while the list reconnects
A DM's own access-list entry SHALL decide their access the same way a player's entry decides theirs. Reading, reconnecting or failing to read the DM's access list for the "Masaya erişim" section SHALL NOT change whether the DM counts as on the list.

#### Scenario: The DM's list reconnects
- **WHEN** Gökay, a DM whose address is on the list, has the application open, and the connection drops and returns
- **THEN** Gökay stays in the application, and the "ekli değil" screen is not shown
