# Factory production deployment

Factory deploys only from `main` or an approved manual dispatch through the GitHub `production` Environment. GitHub authenticates with OIDC Workload Identity Federation; never add a Google service-account key or OAuth client secret to GitHub.

Home, Live Splash, Weather, API, and Storybook have independent workflows. Runtime path filters deploy only affected services, while shared runtime changes intentionally deploy every affected Next.js application.

## GitHub `production` Environment variables

Create these GitHub Environment variables after the foundation Terraform apply:

- `GCP_PROJECT_ID`
- `WIF_PROVIDER` — Terraform output `workload_identity_provider`
- `WIF_SERVICE_ACCOUNT` — Terraform output `github_deploy_service_account`
- `GAR_LOCATION` — Terraform output `artifact_registry_location`
- `GAR_REPOSITORY` — Terraform output `artifact_registry_repository_id`
- `CLOUD_RUN_REGION` — Terraform output `cloud_run_region` (`asia-south1`)
- `SUPABASE_URL` — production Supabase origin, consumed only by the API workflow
- `SUPABASE_PUBLISHABLE_KEY` — production publishable key, consumed only by the API workflow

The API is the sole Supabase client. Configure Supabase Auth with this callback URL only:

`https://factory.markagen.ai/auth/callback`

The application workflows configure these server-side values:

- `FACTORY_API_URL=https://factory.markagen.ai`
- `FACTORY_SHARED_ORIGIN=true`
- `LIVE_SPLASH_URL=https://factory.markagen.ai/live-splash`
- `WEATHER_URL=https://factory.markagen.ai/weather`

Terraform configures the initial API revision with its public production environment and references Secret Manager versions named `factory-api-session-database-url` and `factory-api-session-encryption-key`. Terraform creates and protects the secret containers but never stores secret versions or values.

## Remote state initialization

Create or select an approved GCS state bucket outside this configuration, with versioning and restricted access. Initialize Terraform explicitly:

```sh
cd infra/gcp
terraform init \
  -backend-config="bucket=YOUR_TERRAFORM_STATE_BUCKET" \
  -backend-config="prefix=factory/production"
terraform fmt -check -recursive
terraform validate
```

Never use local state for shared production operations.

## One-time provisioning order

Set the non-secret Terraform inputs through approved environment configuration or reviewed `-var` arguments. The publishable Supabase key is not a provider credential, but Terraform marks it sensitive to avoid accidental CLI output.

1. Apply APIs, Artifact Registry, runtime/deploy identities, WIF, secret containers, and secret access policy. Placeholder images are accepted because targeted foundation resources do not consume them:

```sh
terraform apply \
  -var="project_id=YOUR_PROJECT_ID" \
  -var='service_images={api="unused",home="unused",live-splash="unused",weather="unused"}' \
  -var="supabase_url=https://YOUR_PROJECT.supabase.co" \
  -var="supabase_publishable_key=YOUR_PUBLISHABLE_KEY" \
  -target=google_project_service.required \
  -target=google_artifact_registry_repository.factory \
  -target=google_service_account.runtime \
  -target=google_service_account.api_runtime \
  -target=google_service_account.github_deploy \
  -target=google_iam_workload_identity_pool.github \
  -target=google_iam_workload_identity_pool_provider.github \
  -target=google_service_account_iam_member.github_can_impersonate_deployer \
  -target=google_project_iam_member.github_deploy_roles \
  -target=google_service_account_iam_member.github_can_use_runtime_identity \
  -target=google_service_account_iam_member.github_can_use_api_runtime_identity \
  -target=google_secret_manager_secret.api_session \
  -target=google_secret_manager_secret_iam_member.runtime_can_read_api_session_secrets
```

2. Add at least one version to each secret container using an approved secret-delivery process. The database URL must use PostgreSQL; the encryption key must satisfy the API configuration contract. Do not put either value in Terraform variables, command history, or repository files.
3. Build and push one immutable image for each service using the repository Dockerfiles.
4. Run a full `terraform plan` with digest-qualified `service_images`, review it for replacements or deletions, then apply the reviewed plan. Terraform creates the Cloud Run services, serverless NEGs, load balancer, certificate, and static IP.
5. Put the Terraform outputs into the GitHub `production` Environment and verify each independent deployment workflow.

GitHub Actions subsequently owns service images and public runtime values, which Terraform intentionally ignores. Terraform retains ownership of service identities, ingress, secret access, routing, and deletion protection.

WIF accepts only `ommkar23/factory`, `refs/heads/main`, and jobs using the `production` Environment. The deploy identity has Artifact Registry Writer, Cloud Run Admin, Secret Manager Viewer, and Service Account User on the two dedicated runtime identities. Only `factory-api-runtime` can access API session secrets.

## DNS and certificate

After the full apply, read `load_balancer_ip_address` and create this record with the existing DNS provider:

```text
factory.markagen.ai.  A  <load_balancer_ip_address>
```

Do not create a Cloud DNS zone here. Keep the record until certificate provisioning completes, then verify:

- `https://factory.markagen.ai/app/*` → `factory-api`
- `https://factory.markagen.ai/auth/*` → `factory-api`
- `https://factory.markagen.ai/` → `factory-home`
- `https://factory.markagen.ai/live-splash/` → `factory-live-splash`
- `https://factory.markagen.ai/weather/` → `factory-weather`

HTTP redirects to HTTPS. Cloud Run ingress permits the external load balancer and internal traffic; use the custom hostname for acceptance tests.

## Verification

Before applying production changes:

```sh
terraform fmt -check -recursive
terraform validate
terraform test
terraform plan -out=factory.tfplan \
  -var="project_id=YOUR_PROJECT_ID" \
  -var='service_images={api="...@sha256:...",home="...@sha256:...",live-splash="...@sha256:...",weather="...@sha256:..."}' \
  -var="supabase_url=https://YOUR_PROJECT.supabase.co" \
  -var="supabase_publishable_key=YOUR_PUBLISHABLE_KEY"
terraform show factory.tfplan
```

A reviewer must confirm there are no unintended deletes, replacements, IAM grants, or route changes. After apply, verify all HTTPS routes and confirm the frontend runtime identity is denied access to both API secrets while the API runtime identity is allowed.

## Rollback

Choose a prior ready Cloud Run revision and direct all traffic back to it:

```sh
gcloud run revisions list --service=factory-weather --region=asia-south1
gcloud run services update-traffic factory-weather \
  --region=asia-south1 \
  --to-revisions=PREVIOUS_REVISION=100
```

Repeat for another service as needed. Images are tagged with immutable Git SHAs, so an approved workflow dispatch from the corresponding commit can also redeploy a previous image.
