# Factory architecture

Factory is a pnpm/Turborepo monorepo containing three app-local Next.js source trees, reusable JavaScript packages, and a shared FastAPI backend.

## Ownership boundaries

- `apps/home` owns the launcher at `/`.
- `apps/live-splash` owns the application at `/live-splash`.
- `apps/weather` owns the application at `/weather`.
- `packages/auth` owns shared authentication behavior and presentation adapters.
- `packages/ui` owns shadcn/ui primitives and genuinely shared Factory compositions.
- `services/api` owns authentication, sessions, external provider credentials, and `/app/*` APIs.

The application source scaffolds remain separate so routing, layouts, tests, and package ownership stay local. Deployment does not combine their source trees: the production build creates each application's normal standalone Next.js output.

## Unified web runtime

One Home container starts the three standalone Next.js runtimes on private loopback ports. `scripts/unified-web.mjs` is their process supervisor and HTTP/WebSocket router:

- `/weather` and `/weather/*` go to Weather.
- `/live-splash` and `/live-splash/*` go to Live Splash.
- every other web path goes to Home.

Exact path-segment matching prevents similarly named Home routes from being captured. Base paths remain configured in Weather and Live Splash, so their pages, `_next` assets, health routes, and app-local development bootstrap routes preserve their existing URLs. A child startup/runtime failure terminates the whole container; SIGTERM is forwarded to every child for graceful Cloud Run shutdown.

The repository Compose topology retains one unified development web service. For production-style local verification, `python3 -m scripts.deploy.app` creates a fully isolated stack per selected app, including API, Supabase, database, secrets, and routes. Home uses the unified runtime; Weather and Live Splash each run one Next.js process.

These isolated stacks are local-only. Production publishes and deploys one `home` image containing all three standalone outputs and deploys the API independently.

## API and authentication

The FastAPI service remains independently deployed. The local gateway and production load balancer route `/auth/*` and `/app/*` directly to it; all browser calls therefore remain same-origin. Factory access and refresh cookies are HttpOnly, Secure in production, and shared across all route families.

In development, an unauthenticated app visit redirects to that app's login route. The login screen automatically calls the server-only `/api/auth/dev/bootstrap` endpoint, receives the configured local test-token cookies, and returns to the originally requested app route. The issuer secret never reaches browser JavaScript.

In production, Next.js does not register development bootstrap behavior and the login screen presents Google OAuth. `/auth/login`, `/auth/callback`, `/auth/session`, and `/auth/logout` are served by the API on the shared Factory origin and preserve allow-listed return paths for `/`, `/weather`, and `/live-splash`.
