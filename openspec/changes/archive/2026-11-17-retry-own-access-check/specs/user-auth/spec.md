# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
