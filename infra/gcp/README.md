# Factory production deployment

The repository deploys only from `main` (or the manually approved `workflow_dispatch`) through the GitHub `production` Environment. It uses GitHub OIDC Workload Identity Federation; do not add a Google service-account key or an OAuth client secret to GitHub.

Home, Live Splash, Weather, API, and Storybook have independent workflows. A push to `main` deploys only services whose runtime path filters match; documentation, tests, stories, and development-only configuration do not deploy applications. Each service can also be dispatched manually, while shared runtime changes intentionally trigger every affected Next.js application.

## GitHub `production` Environment variables

Create these GitHub Environment variables after the foundation Terraform apply:

- `GCP_PROJECT_ID`
- `WIF_PROVIDER` — Terraform output `workload_identity_provider`
- `WIF_SERVICE_ACCOUNT` — Terraform output `github_deploy_service_account`
- `GAR_LOCATION` — Terraform output `artifact_registry_location`
- `GAR_REPOSITORY` — Terraform output `artifact_registry_repository_id`
- `CLOUD_RUN_REGION` — Terraform output `cloud_run_region` (`asia-south1`)
- `SUPABASE_URL` — production Supabase project origin, consumed only by the Factory API deployment workflow
- `SUPABASE_PUBLISHABLE_KEY` — production Supabase publishable key, consumed only by the Factory API deployment workflow

The API deployment workflow reads the Supabase values from the GitHub `production` Environment and passes them only to `factory-api`; they are not configured for a Next.js build or browser runtime. The API is the sole Supabase client, and the development issuer secret is never configured in production. Configure Supabase Auth with this callback URL only:

`https://factory.markagen.ai/auth/callback`

The Next.js deployment workflow sets these production runtime values for the application services:

- `FACTORY_API_URL=https://factory.markagen.ai` — server-only origin for the Next.js server’s session refresh/current-user calls and build-time rewrites.
- `FACTORY_SHARED_ORIGIN=true`
- `LIVE_SPLASH_URL=https://factory.markagen.ai/live-splash`
- `WEATHER_URL=https://factory.markagen.ai/weather`

Factory API session credentials are separate GCP Secret Manager secret versions named `factory-api-session-database-url` and `factory-api-session-encryption-key`. Terraform creates the secret containers and access policy but does not create secret versions; provision those values out of band before deploying the API.

## One-time Terraform order

Terraform does not manage DNS and stores no secrets. Use an approved remote state backend outside this repository before a shared production apply.

```sh
cd infra/gcp
terraform init
terraform fmt -recursive
terraform validate
```

1. Apply the foundation resources first (required Google APIs, Artifact Registry, runtime/deploy service accounts, and the restricted GitHub WIF pool/provider). Pass all required image variables even though this targeted apply does not create Cloud Run services:

```sh
terraform apply \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="api_image=unused" \
  -var="home_image=unused" \
  -var="live_splash_image=unused" \
  -var="weather_image=unused" \
  -target=google_project_service.required \
  -target=google_artifact_registry_repository.factory \
  -target=google_service_account.runtime \
  -target=google_service_account.github_deploy \
  -target=google_iam_workload_identity_pool.github \
  -target=google_iam_workload_identity_pool_provider.github \
  -target=google_service_account_iam_member.github_can_impersonate_deployer \
  -target=google_project_iam_member.github_deploy_roles \
  -target=google_service_account_iam_member.github_can_use_runtime_identity
```

2. Put the Terraform outputs into the GitHub `production` Environment variables above.
3. With an approved human principal, build and push one immutable image for each app to the newly created Artifact Registry repository using the repository Dockerfiles. Use the image digests as `api_image`, `home_image`, `live_splash_image`, and `weather_image`.
4. Run a full `terraform apply` with those four digest-qualified images. This creates the services, serverless NEGs, external Application Load Balancer, HTTPS certificate, and global IP. GitHub Actions subsequently owns each service image and the public runtime environment values; Terraform deliberately ignores those changing container fields.

Terraform restricts WIF to repository `ommkar23/factory` and `refs/heads/main`. The GitHub deploy service account receives only Artifact Registry writer, Cloud Run admin, and Service Account User on the dedicated runtime identity.

## Manual DNS and certificate

After the full apply, read `load_balancer_ip_address` and add this DNS record with the existing `markagen.ai` DNS provider:

```text
factory.markagen.ai.  A  <load_balancer_ip_address>
```

Do not create a Cloud DNS zone here. Keep the record in place until Google-managed certificate provisioning completes, then confirm HTTPS and routing:

- `https://factory.markagen.ai/app/*` → `factory-api`
- `https://factory.markagen.ai/` → `factory-home`
- `https://factory.markagen.ai/live-splash/` → `factory-live-splash`
- `https://factory.markagen.ai/weather/` → `factory-weather`

HTTP redirects to HTTPS. Cloud Run ingress is limited to internal traffic and the load balancer, so use the custom hostname rather than service URLs for acceptance testing.

## Rollback

Choose a prior ready Cloud Run revision, then send all traffic back to it. For example:

```sh
gcloud run revisions list --service=factory-weather --region=asia-south1

gcloud run services update-traffic factory-weather \
  --region=asia-south1 \
  --to-revisions=PREVIOUS_REVISION=100
```

Repeat for `factory-api`, `factory-home`, or `factory-live-splash` as needed. The image tags use the immutable Git commit SHA, so a rollback can also be redeployed by manually dispatching the production workflow from the corresponding commit.
