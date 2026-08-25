# Remove Development Login Flow Plan

**Goal:** Remove the development-only mock login flow while retaining Google login through managed Supabase in production.

**Branch:** `chore/remove-development-login-flow`

## Step 1: Create an isolated branch

**What:** Create the named branch from the intended base without including unrelated working-tree changes.

**Verification:** The active branch is `chore/remove-development-login-flow` and the planned change set contains no pre-existing unrelated files.

**Commit:** No commit is required for branch creation.

## Step 2: Remove development mock authentication

**What:** Remove mock sessions, mock identities, and development-specific login behavior so authentication has one Google/Supabase flow.

**Verification:** Automated authentication tests prove mock authentication is unavailable and the remaining authentication flow uses Supabase.

**Commit:** `refactor(auth): remove development mock authentication`

## Step 3: Make login screens Google-only

**What:** Make every application login experience consistently offer the existing Google sign-in flow, with no development-login messaging or action.

**Verification:** UI tests prove Home, Live Splash, and Weather render the Google login experience and do not render a development login option.

**Commit:** `refactor(auth-ui): remove development login experience`

## Step 4: Remove obsolete development-login surface area

**What:** Remove development mock sign-in/sign-out endpoints and eliminate obsolete configuration and documentation references.

**Verification:** Route and configuration tests prove the removed endpoints are unavailable, and repository search finds no supported development mock-login instructions or configuration.

**Commit:** `chore(auth): remove obsolete development login surface`

## Step 5: Validate the production-preserving outcome

**What:** Validate the complete change set and confirm production Google OAuth behavior, public callback URLs, and deployment settings remain unchanged.

**Verification:** Focused tests, affected app tests, typecheck, formatting, project checks, and `git diff --check` pass; OAuth callback tests and deployment-configuration review provide evidence of unchanged production behavior.

**Commit:** `test(auth): cover Google-only authentication behavior` if verification requires test-only additions; otherwise no additional commit.
