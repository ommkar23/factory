# Development Email/Password Authentication Plan

**Status:** Awaiting review

## Goal

Development environments use local Supabase email/password authentication instead of mock sessions. Production remains on its existing managed-Supabase Google OAuth experience without changes to its public URLs, callbacks, or Cloud Run deployment.

## Required outcomes

- Authentication mode is explicit. Email/password authentication is available only in development; production continues to use its existing Supabase OAuth mode.
- Developers can create an account with name, email, password, and password confirmation, then sign in and sign out using that account.
- Password confirmation mismatches are rejected. Password recovery is not part of this scope.
- An existing development account can be replaced using the same email, after which the old password no longer works and the new password does.
- Authenticated sessions persist and are recognized across Home, Live Splash, and Weather.
- Mock-session behavior and mock sign-in/sign-out endpoints are absent.
- Local development credentials remain private. Production cannot access development-only account-management capabilities.
- Development setup and documentation clearly distinguish local email/password use from unchanged production OAuth use.

## Verification

| Outcome to verify                     | Evidence                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Development email/password flow works | Automated tests and a browser run show successful sign-up, sign-in, session restoration, and sign-out.                                                                               |
| Account replacement is correct        | Automated tests and a browser run show the old password is rejected and the replacement password succeeds for the same email.                                                        |
| UI behavior is correct                | Automated tests show all required sign-up fields, password-mismatch validation, local auth actions, and the absence of password recovery.                                            |
| Cross-app session recognition works   | Browser evidence shows one authenticated session is recognized by Home, Live Splash, and Weather.                                                                                    |
| Production behavior is preserved      | Automated tests confirm existing OAuth behavior and canonical callback handling; deployment configuration review shows public URLs, callbacks, and Cloud Run settings are unchanged. |
| Development-only boundaries hold      | Automated tests confirm email/password and account-management capabilities are unavailable outside development; no private credentials appear in tracked files or command output.    |
| Repository quality is acceptable      | Focused tests, affected app tests, typecheck, formatting, and the project check pass; Compose configuration validates; `git diff --check` is clean; independent review is recorded.  |
