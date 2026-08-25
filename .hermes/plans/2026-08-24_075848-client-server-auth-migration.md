# Client Migration to Server-Only Auth Plan

**Goal:** Remove browser Supabase usage and make Factory apps initiate login and maintain identity through the new server auth endpoints and opaque Factory cookie.

**Dependency:** Complete the Server-Only Supabase Auth Plan first; it defines the stable HTTPS auth origin and `/auth/*` contract.

1. **Shared auth package** — remove `@supabase/ssr` browser-client usage from `packages/auth/src/client.js` and public `NEXT_PUBLIC_SUPABASE_*` configuration from `core.js`. Change `LoginScreen` to navigate to `/auth/login?next=<allow-listed path>`; keep the existing Google UI and error state. Replace server helpers with Factory-session helpers that call the auth service only from Next server code.
2. **OAuth route ownership** — remove `apps/home/app/auth/callback/route.js` after the API callback owns the flow. Update Supabase/Google redirect allow-lists to the API callback. Update `apps/{home,live-splash,weather}/proxy.js` and page guards to recognize the Factory session and send unauthenticated users to the shared login screen.
3. **Configuration and callers** — delete `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from every app `.env.example`, Docker/deploy settings, tests, and docs. Retain no browser export that exposes Supabase clients or tokens. Keep current app-local Weather API calls unchanged; migration to `services/api` remains separate.
4. **Tests and rollout** — test login redirect, callback return-path validation, expired/invalid Factory session leading to Google UI, logout, and absence of Supabase values/imports in browser bundles. Clear affected `.next` output if callback routes are removed, run each app test/build, then `pnpm check`.

**Files:** `packages/auth/src/{client,core,server,proxy,auth-controls}.js*`, auth tests/stories, all three app login pages/proxies/environment examples, `apps/home/app/auth/callback/route.js` (delete), and auth/deployment docs.
