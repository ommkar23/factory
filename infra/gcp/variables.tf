variable "project_id" {
  description = "Google Cloud project ID that owns Factory production."
  type        = string
}

variable "region" {
  description = "Cloud Run and Artifact Registry region."
  type        = string
  default     = "asia-south1"

  validation {
    condition     = var.region == "asia-south1"
    error_message = "Factory production is intentionally pinned to asia-south1."
  }
}

variable "artifact_registry_repository" {
  description = "Artifact Registry Docker repository name."
  type        = string
  default     = "factory"
}

variable "domain_name" {
  description = "Production hostname. DNS is managed outside this Terraform configuration."
  type        = string
  default     = "factory.markagen.ai"
}

variable "github_repository" {
  description = "GitHub repository allowed to federate into the deploy service account."
  type        = string
  default     = "ommkar23/factory"

  validation {
    condition     = var.github_repository == "ommkar23/factory"
    error_message = "Only ommkar23/factory is permitted for the production WIF provider."
  }
}

variable "github_branch" {
  description = "GitHub branch allowed to federate into the deploy service account."
  type        = string
  default     = "main"

  validation {
    condition     = var.github_branch == "main"
    error_message = "Only main is permitted for the production WIF provider."
  }
}

variable "service_images" {
  description = "Initial immutable, digest-qualified image for each Factory Cloud Run service."
  type        = map(string)
  nullable    = false

  validation {
    condition = length(var.service_images) == 0 || (
      length(setsubtract(toset(keys(var.service_images)), toset(["api", "home"]))) == 0 &&
      length(setsubtract(toset(["api", "home"]), toset(keys(var.service_images)))) == 0
    )
    error_message = "service_images must define exactly api and home."
  }
}

variable "supabase_url" {
  description = "Production Supabase project origin used only by the Factory API."
  type        = string

  validation {
    condition     = startswith(var.supabase_url, "https://")
    error_message = "supabase_url must be an HTTPS origin."
  }
}

variable "supabase_publishable_key" {
  description = "Production Supabase publishable key used only by the Factory API."
  type        = string
  sensitive   = true
}

variable "cloud_run_deletion_protection" {
  description = "Protect production Cloud Run services from accidental deletion."
  type        = bool
  default     = true
}
