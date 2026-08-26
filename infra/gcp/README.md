# Factory production deployment

Factory deploys only from `main` or an approved manual dispatch through the GitHub `production` Environment. GitHub uses OIDC Workload Identity Federation; never add service-account keys, OAuth client secrets, or application secrets to GitHub.

Production has two Cloud Run application services:

- `factory-home` contains the Home, Weather, and Live Splash standalone Next.js runtimes and serves `/`, `/weather`, and `/live-splash`.
- `factory-api` independently serves `/auth/*` and `/app/*`.

Storybook has its own review deployment. Changes to any web app, `packages/auth`, `packages/ui`, the Dockerfile, or the unified router trigger only the Home image workflow.

## GitHub `production` Environment

Configure `GCP_PROJECT_ID`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `GAR_LOCATION`, `GAR_REPOSITORY`, `CLOUD_RUN_REGION`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. The application workflow supplies `FACTORY_API_URL=https://factory.markagen.ai`, `FACTORY_SHARED_ORIGIN=true`, and same-origin Weather and Live Splash URLs.

The API is the sole Supabase client. Configure only this browser callback:

`https://factory.markagen.ai/auth/callback`

Terraform creates protected Secret Manager containers named `factory-api-session-database-url` and `factory-api-session-encryption-key`; an approved external process must add their values.

## Initialization and verification

Use approved remote GCS state:

```sh
cd infra/gcp
terraform init -backend-config="bucket=YOUR_STATE_BUCKET" -backend-config="prefix=factory/production"
terraform fmt -check -recursive
terraform validate
terraform test
terraform plan -out=factory.tfplan \
  -var="project_id=YOUR_PROJECT_ID" \
  -var='service_images={api="...@sha256:...",home="...@sha256:..."}' \
  -var="supabase_url=https://YOUR_PROJECT.supabase.co" \
  -var="supabase_publishable_key=YOUR_PUBLISHABLE_KEY"
terraform show factory.tfplan
```

Review plans for deletes, replacements, IAM changes, and routing changes. The load balancer must contain only a dedicated API path rule and the default Home backend. HTTP redirects to HTTPS. Verify:

- `/`, `/weather`, `/live-splash`, and their nested/static routes → `factory-home`
- `/auth/*` and `/app/*` → `factory-api`
- production login offers Google OAuth and never requests `/api/auth/dev/bootstrap`
- Factory cookies are same-origin, HttpOnly, Secure, and SameSite=Lax

## Migration from separate web services

Cloud Run deletion protection prevents Terraform from deleting `factory-weather` and `factory-live-splash` in the same apply that removes them from configuration.

1. Build and deploy the unified Home image, then smoke-test all three route families directly on a non-production revision.
2. Apply the reviewed load-balancer/service plan with obsolete services still protected, and verify traffic uses `factory-home` while the old revisions remain available.
3. Explicitly disable deletion protection on only `factory-weather` and `factory-live-splash` after approval:

```sh
gcloud run services update factory-weather --region=asia-south1 --no-deletion-protection
gcloud run services update factory-live-splash --region=asia-south1 --no-deletion-protection
```

4. Re-run `terraform plan`; confirm only the two obsolete services, NEGs, and backends are deleted, then apply.
5. Re-enable/confirm deletion protection remains true for `factory-home` and `factory-api`.

Do not remove old services before the unified image and route map are healthy.

## Rollback

Before obsolete-service deletion, restore the previous URL map and route traffic to the last ready Weather and Live Splash revisions. After deletion, redeploy the last known-good unified Home image by immutable Git SHA:

```sh
gcloud run revisions list --service=factory-home --region=asia-south1
gcloud run services update-traffic factory-home \
  --region=asia-south1 \
  --to-revisions=PREVIOUS_REVISION=100
```

If rollback requires recreating separate services, use the last Terraform revision that declared them, supply their immutable image digests, apply with deletion protection, and only then restore their path rules.
