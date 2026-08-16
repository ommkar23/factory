output "artifact_registry_repository" {
  description = "Artifact Registry repository resource name."
  value       = google_artifact_registry_repository.factory.name
}

output "github_deploy_service_account" {
  description = "Set this as the GitHub production Environment WIF_SERVICE_ACCOUNT variable."
  value       = google_service_account.github_deploy.email
}

output "workload_identity_provider" {
  description = "Set this as the GitHub production Environment WIF_PROVIDER variable."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "cloud_run_region" {
  description = "Set this as the GitHub production Environment CLOUD_RUN_REGION variable."
  value       = var.region
}

output "artifact_registry_location" {
  description = "Set this as the GitHub production Environment GAR_LOCATION variable."
  value       = var.region
}

output "artifact_registry_repository_id" {
  description = "Set this as the GitHub production Environment GAR_REPOSITORY variable."
  value       = google_artifact_registry_repository.factory.repository_id
}

output "load_balancer_ip_address" {
  description = "Create an A record for factory.markagen.ai with this address."
  value       = google_compute_global_address.factory.address
}

output "cloud_run_services" {
  description = "Cloud Run service names behind the load balancer."
  value       = { for key, service in google_cloud_run_v2_service.factory : key => service.name }
}
