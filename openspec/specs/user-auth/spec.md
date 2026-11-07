# user-auth Specification

## Purpose

Identifies the people using Legend Card Manager through their Google account. Every application screen is available only to signed-in users, which gives later role and permission work a verified identity to build on.

## Requirements

### Requirement: Google sign-in
The application SHALL let users sign in with a Google account from a dedicated sign-in screen. The sign-in screen SHALL show the application name and one Turkish sign-in action.

#### Scenario: Successful sign-in
- **WHEN** a signed-out user on the sign-in screen chooses to sign in with Google and completes the Google account selection
- **THEN** the user is signed in and taken to the application

#### Scenario: User cancels sign-in
- **WHEN** a signed-out user starts Google sign-in and closes the Google window without choosing an account
- **THEN** the user stays on the sign-in screen, no error message is shown, and they can try again

#### Scenario: Sign-in fails
- **WHEN** Google sign-in fails for a reason other than the user cancelling, such as a network error
- **THEN** the sign-in screen shows a Turkish error message and lets the user try again

### Requirement: Protected application screens
Every application screen except the sign-in screen SHALL require a signed-in user. A signed-out user who opens a protected URL SHALL be sent to the sign-in screen, and after signing in SHALL return to the URL they first asked for.

#### Scenario: Opening a protected screen while signed out
- **WHEN** a signed-out user opens the Kart kütüphanesi screen's URL
- **THEN** the sign-in screen is shown instead of the library

#### Scenario: Returning after sign-in
- **WHEN** that user then signs in successfully
- **THEN** the Kart kütüphanesi screen is shown

#### Scenario: Signed-in user opens the sign-in screen
- **WHEN** a signed-in user opens the sign-in screen's URL
- **THEN** they are taken to the default application screen

### Requirement: Auth state loading
While the application is still finding out whether the user is signed in, it SHALL show a neutral loading state. It SHALL NOT briefly show the sign-in screen or protected content.

#### Scenario: Reopening the app while already signed in
- **WHEN** a previously signed-in user reopens the application
- **THEN** a loading state is shown until the session is restored, and then the requested screen appears, without the sign-in screen ever appearing in between

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
