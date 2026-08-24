locals {
  services = {
    api = {
      image = var.api_image
      name  = "factory-api"
      port  = 8000
    }
    home = {
      image = var.home_image
      name  = "factory-home"
      port  = 8080
    }
    live-splash = {
      image = var.live_splash_image
      name  = "factory-live-splash"
      port  = 8080
    }
    weather = {
      image = var.weather_image
      name  = "factory-weather"
      port  = 8080
    }
  }
}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "sts.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "factory" {
  location      = var.region
  repository_id = var.artifact_registry_repository
  format        = "DOCKER"
  description   = "Factory production Cloud Run images"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "runtime" {
  account_id   = "factory-runtime"
  display_name = "Factory Cloud Run runtime"

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
  attribute_condition                = "assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/${var.github_branch}'"

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

resource "google_cloud_run_v2_service" "factory" {
  for_each = local.services

  name     = each.value.name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
  # Domain-restricted sharing blocks an allUsers IAM binding. The service is
  # still reachable only through the external load balancer due to ingress.
  invoker_iam_disabled = true

  template {
    service_account = google_service_account.runtime.email

    containers {
      image = each.value.image

      ports {
        container_port = each.value.port
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

  depends_on = [google_project_service.required]
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

    path_rule {
      paths   = ["/app", "/app/*"]
      service = google_compute_backend_service.factory["api"].id
    }

    path_rule {
      paths   = ["/live-splash", "/live-splash/*"]
      service = google_compute_backend_service.factory["live-splash"].id
    }

    path_rule {
      paths   = ["/weather", "/weather/*"]
      service = google_compute_backend_service.factory["weather"].id
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
