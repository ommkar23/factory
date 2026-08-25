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

variable "api_image" {
  description = "Initial immutable image for factory-api."
  type        = string
}

variable "home_image" {
  description = "Initial immutable image for factory-home."
  type        = string
}

variable "live_splash_image" {
  description = "Initial immutable image for factory-live-splash."
  type        = string
}

variable "weather_image" {
  description = "Initial immutable image for factory-weather."
  type        = string
}
