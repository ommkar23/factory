# Live Splash UI, Search API, and App Adoption

**Goal:** A pastel Live Splash discovery experience backed only by Factory’s authenticated Unsplash search API.

**Scope:** The browser uses only same-origin `/app/live-splash/v1/photos`; Unsplash credentials, provider calls, persistence, image rehosting, download actions, Factory authentication changes, and new Next API proxies remain out of scope.

## Task 1 — UI prototype

- To-do: Prop-driven Live Splash search and results components represent the pastel full-page search, three-character round-arrow threshold, and fixed-width two-column responsive grid with varied fixture-card heights.
- To-verify: Component, interaction, accessibility, and Storybook tests cover search, loading, empty, error, and populated fixture states without a network request.

## Task 2 — Human UI review

- To-do: The curated Storybook review contains the complete Task 1 visual state set in the feature worktree.
- To-verify: Human UI review approval is recorded before API service work begins.

## Task 3 — Search API contract

- To-do: `GET /app/live-splash/v1/photos?q=<query>&page=<positive integer>` defines authenticated, single-query search with a trimmed 3–100 character query, optional positive page, twelve-result maximum, `nextPage`, and `Cache-Control: private, no-store`.
- To-verify: Route and OpenAPI tests establish validation, authentication, normalized success data, cache policy, and stable error envelopes.

## Task 4 — Unsplash provider boundary

- To-do: A server-side Unsplash adapter uses the API-only `UNSPLASH_ACCESS_KEY`, a bounded timeout, and a fixed twelve-item request while normalizing only photo ID, hotlinked image URL, dimensions, alt text, photographer attribution, and Unsplash attribution URLs.
- To-verify: Mocked adapter tests establish URL encoding, credential isolation, optional-field handling, malformed payload rejection, timeout handling, and 429/5xx mapping.

## Task 5 — API service publication

- To-do: The Live Splash router, Pydantic schemas, dependency seam, OpenAPI metadata, API-only local/production secret configuration, Compose, GCP runtime policy, and API documentation publish the search contract and Unsplash hotlinking/attribution requirements.
- To-verify: API tests, image build, rendered Compose, Terraform formatting/validation/security tests, and runtime OpenAPI output establish an accurate documented service contract.

## Task 6 — App API client

- To-do: An app-local Live Splash client validates root-relative Factory responses, encodes query/page parameters, supports cancellation, and maps documented errors to safe UI states.
- To-verify: Client tests establish shared-origin URL behavior, response-envelope validation, error handling, and cancellation.

## Task 7 — Live Splash API adoption

- To-do: The authenticated Live Splash routes replace production fixtures with the approved components and API client, submit valid searches to a dedicated results route, render all API states, and append deduplicated pages only after explicit load-more interaction.
- To-verify: Route and component tests establish protected navigation, query safety, three-character submission, pagination, direct hotlinked images, attribution, two-column layout, and absence of client-side Unsplash access.

## Task 8 — Human app review

- To-do: The worktree-owned local stack and final Storybook review expose the integrated Live Splash search and results flow.
- To-verify: Human app review approval confirms same-origin Factory requests, approved UI behavior, and complete attribution.

## Task 9 — Quality gate

- To-do: The staged worktree contains only the approved UI, Factory API, and Live Splash adoption changes.
- To-verify: `pnpm --filter @factory/live-splash test`, `pnpm --filter @factory/live-splash lint`, Storybook tests, API tests, `pnpm check`, and staged-diff checks pass without client-side credentials, Unsplash SDKs, direct third-party calls, or `NEXT_PUBLIC_UNSPLASH*` values.

## Task 10 — Human code review

- To-do: The staged diff presents the complete verified implementation and its documented API boundary.
- To-verify: Human code review approval is recorded before any commit, local merge, or deployment.
