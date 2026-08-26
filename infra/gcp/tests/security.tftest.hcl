mock_provider "google" {}

run "runtime_identity_and_secret_boundaries" {
  command = plan

  variables {
    project_id = "validation-project"
    service_images = {
      api  = "example.invalid/api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      home = "example.invalid/home@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
    supabase_url             = "https://example.supabase.co"
    supabase_publishable_key = "validation-only"
  }

  assert {
    condition     = google_cloud_run_v2_service.factory["api"].template[0].service_account == "factory-api-runtime@validation-project.iam.gserviceaccount.com"
    error_message = "Factory API must use its dedicated runtime identity."
  }

  assert {
    condition     = google_cloud_run_v2_service.factory["home"].template[0].service_account == "factory-runtime@validation-project.iam.gserviceaccount.com"
    error_message = "The unified Home service must use the unprivileged application runtime identity."
  }

  assert {
    condition = alltrue([
      for binding in google_secret_manager_secret_iam_member.runtime_can_read_api_session_secrets :
      binding.member == "serviceAccount:factory-api-runtime@validation-project.iam.gserviceaccount.com"
    ])
    error_message = "Only the API runtime identity may receive API secret access."
  }

  assert {
    condition = alltrue([
      for name in ["AUTH_SESSION_DATABASE_URL", "AUTH_SESSION_ENCRYPTION_KEY"] :
      contains(google_cloud_run_v2_service.factory["api"].template[0].containers[0].env[*].name, name)
    ])
    error_message = "The initial API revision must reference both session secrets."
  }

  assert {
    condition = alltrue([
      for service in values(google_cloud_run_v2_service.factory) : service.deletion_protection
    ])
    error_message = "Every production Cloud Run service must enable deletion protection by default."
  }

  assert {
    condition     = toset(keys(google_cloud_run_v2_service.factory)) == toset(["api", "home"])
    error_message = "Production must contain only the API and unified Home Cloud Run services."
  }

  assert {
    condition     = length(google_compute_url_map.https.path_matcher[0].path_rule) == 1
    error_message = "Only the independent API may have a dedicated load-balancer path rule."
  }
}
