locals {
  runtime_service_account_ids = {
    api  = "factory-api-runtime"
    apps = "factory-runtime"
  }
  runtime_service_account_emails = {
    for key, account_id in local.runtime_service_account_ids :
    key => "${account_id}@${var.project_id}.iam.gserviceaccount.com"
  }

  services = {
    api = {
      image = var.service_images["api"]
      name  = "factory-api"
      paths = ["/app", "/app/*", "/auth", "/auth/*"]
      port  = 8000
    }
    home = {
      image = var.service_images["home"]
      name  = "factory-home"
      paths = []
      port  = 8080
    }
  }

  api_environment = {
    AUTH_ALLOWED_RETURN_PATHS = "/,/weather,/live-splash"
    AUTH_PUBLIC_URL           = "https://${var.domain_name}"
    CORS_ALLOW_ORIGINS        = "https://${var.domain_name}"
    ENVIRONMENT               = "production"
    SUPABASE_PUBLISHABLE_KEY  = var.supabase_publishable_key
    SUPABASE_URL              = var.supabase_url
  }

  api_secrets = {
    AUTH_SESSION_DATABASE_URL   = google_secret_manager_secret.api_session["factory-api-session-database-url"].secret_id
    AUTH_SESSION_ENCRYPTION_KEY = google_secret_manager_secret.api_session["factory-api-session-encryption-key"].secret_id
  }

  web_environment = {
    FACTORY_API_URL       = "https://${var.domain_name}"
    FACTORY_SHARED_ORIGIN = "true"
    LIVE_SPLASH_URL       = "https://${var.domain_name}/live-splash"
    WEATHER_URL           = "https://${var.domain_name}/weather"
  }
}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sts.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "factory" {
  # checkov:skip=CKV_GCP_84: Google-managed encryption is approved; Factory does not operate a customer-managed key lifecycle.
  location      = var.region
  repository_id = var.artifact_registry_repository
  format        = "DOCKER"
  description   = "Factory production Cloud Run images"

  depends_on = [google_project_service.required]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_service_account" "runtime" {
  account_id   = local.runtime_service_account_ids.apps
  display_name = "Factory Cloud Run runtime"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "api_runtime" {
  account_id   = local.runtime_service_account_ids.api
  display_name = "Factory API Cloud Run runtime"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "github_deploy" {
  account_id   = "factory-github-deploy"
  display_name = "Factory GitHub Actions deployer"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "factory-github"
  display_name              = "Factory GitHub Actions"
  description               = "GitHub OIDC identities for Factory production deployments"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "factory-main"
  display_name                       = "ommkar23/factory main"
  description                        = "Only GitHub Actions runs from ommkar23/factory main"
  attribute_condition                = "assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/${var.github_branch}' && assertion.sub == 'repo:ommkar23/factory:environment:production'"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_can_impersonate_deployer" {
  service_account_id = google_service_account.github_deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

resource "google_project_iam_member" "github_deploy_roles" {
  for_each = toset([
    "roles/artifactregistry.writer",
    "roles/run.admin",
    "roles/secretmanager.viewer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_deploy.email}"
}

resource "google_service_account_iam_member" "github_can_use_runtime_identity" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deploy.email}"
}

resource "google_service_account_iam_member" "github_can_use_api_runtime_identity" {
  service_account_id = google_service_account.api_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deploy.email}"
}

resource "google_secret_manager_secret" "api_session" {
  for_each = toset([
    "factory-api-session-database-url",
    "factory-api-session-encryption-key",
  ])

  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_secret_manager_secret_iam_member" "runtime_can_read_api_session_secrets" {
  for_each = google_secret_manager_secret.api_session

  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.runtime_service_account_emails.api}"

  depends_on = [google_service_account.api_runtime]
}

resource "google_cloud_run_v2_service" "factory" {
  for_each = local.services

  name                = each.value.name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
  deletion_protection = var.cloud_run_deletion_protection
  # Domain-restricted sharing blocks an allUsers IAM binding. The service is
  # still reachable only through the external load balancer due to ingress.
  invoker_iam_disabled = true

  template {
    service_account = each.key == "api" ? local.runtime_service_account_emails.api : local.runtime_service_account_emails.apps

    containers {
      image = each.value.image

      ports {
        container_port = each.value.port
      }

      dynamic "env" {
        for_each = each.key == "api" ? local.api_environment : local.web_environment

        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = each.key == "api" ? local.api_secrets : {}

        content {
          name = env.key

          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    # GitHub Actions owns immutable image and public runtime configuration.
    ignore_changes = [
      template[0].containers[0].env,
      template[0].containers[0].image,
    ]
  }

  depends_on = [
    google_project_service.required,
    google_secret_manager_secret_iam_member.runtime_can_read_api_session_secrets,
    google_service_account.api_runtime,
    google_service_account.runtime,
  ]
}

resource "google_compute_region_network_endpoint_group" "serverless" {
  for_each = local.services

  name                  = "${each.value.name}-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.factory[each.key].name
  }
}

resource "google_compute_backend_service" "factory" {
  for_each = local.services

  name                  = "${each.value.name}-backend"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.serverless[each.key].id
  }
}

resource "google_compute_managed_ssl_certificate" "factory" {
  name = "factory-markagen-ai"

  managed {
    domains = [var.domain_name]
  }
}

resource "google_compute_url_map" "https" {
  name            = "factory-https"
  default_service = google_compute_backend_service.factory["home"].id

  host_rule {
    hosts        = [var.domain_name]
    path_matcher = "factory"
  }

  path_matcher {
    name            = "factory"
    default_service = google_compute_backend_service.factory["home"].id

    dynamic "path_rule" {
      for_each = { for key, service in local.services : key => service if length(service.paths) > 0 }

      content {
        paths   = path_rule.value.paths
        service = google_compute_backend_service.factory[path_rule.key].id
      }
    }
  }
}

resource "google_compute_target_https_proxy" "factory" {
  name             = "factory-https"
  url_map          = google_compute_url_map.https.id
  ssl_certificates = [google_compute_managed_ssl_certificate.factory.id]
}

resource "google_compute_url_map" "http_redirect" {
  name = "factory-http-redirect"

  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }
}

resource "google_compute_target_http_proxy" "factory" {
  name    = "factory-http"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_address" "factory" {
  name         = "factory-markagen-ai"
  address_type = "EXTERNAL"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_compute_global_forwarding_rule" "https" {
  name                  = "factory-https"
  ip_address            = google_compute_global_address.factory.id
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  port_range            = "443"
  target                = google_compute_target_https_proxy.factory.id
  network_tier          = "PREMIUM"
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "factory-http"
  ip_address            = google_compute_global_address.factory.id
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  port_range            = "80"
  target                = google_compute_target_http_proxy.factory.id
  network_tier          = "PREMIUM"
}
