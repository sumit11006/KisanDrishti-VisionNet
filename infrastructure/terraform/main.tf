terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# Service Account for the application
resource "google_service_account" "app_sa" {
  account_id   = "krishi-vision-app-sa-${var.environment}"
  display_name = "Krishi Vision App Service Account (${var.environment})"
}

# IAM bindings for the service account
locals {
  app_roles = [
    "roles/aiplatform.user",
    "roles/bigquery.dataEditor",
    "roles/storage.objectAdmin",
    "roles/earthengine.viewer",
    "roles/run.invoker"
  ]
}

resource "google_project_iam_member" "app_sa_roles" {
  for_each = toset(local.app_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.app_sa.email}"
}

# Artifact Registry Repository
resource "google_artifact_registry_repository" "krishi_repo" {
  location      = var.region
  repository_id = "krishi-vision-repo-${var.environment}"
  description   = "Docker repository for Krishi Vision"
  format        = "DOCKER"
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "backend_api" {
  name     = "krishi-vision-backend-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.app_sa.email
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.krishi_repo.name}/backend:latest"
      
      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }
      
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "VERTEX_AI_LOCATION"
        value = var.region
      }
    }
  }
}

# Public access for Cloud Run
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = google_cloud_run_v2_service.backend_api.location
  name     = google_cloud_run_v2_service.backend_api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# BigQuery Dataset
resource "google_bigquery_dataset" "analytics_dataset" {
  dataset_id  = "krishi_vision_analytics_${var.environment}"
  description = "Krishi Vision Analytics Dataset"
  location    = var.region
}

# BigQuery Tables
resource "google_bigquery_table" "satellite_observations" {
  dataset_id = google_bigquery_dataset.analytics_dataset.dataset_id
  table_id   = "satellite_observations"
  schema     = <<EOF
[
  {"name": "id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "location", "type": "GEOGRAPHY", "mode": "REQUIRED"},
  {"name": "ndvi", "type": "FLOAT", "mode": "NULLABLE"},
  {"name": "soil_moisture", "type": "FLOAT", "mode": "NULLABLE"}
]
EOF
}

resource "google_bigquery_table" "diagnostic_results" {
  dataset_id = google_bigquery_dataset.analytics_dataset.dataset_id
  table_id   = "diagnostic_results"
  schema     = <<EOF
[
  {"name": "id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "image_uri", "type": "STRING", "mode": "REQUIRED"},
  {"name": "diagnosis", "type": "STRING", "mode": "REQUIRED"},
  {"name": "confidence", "type": "FLOAT", "mode": "REQUIRED"}
]
EOF
}

resource "google_bigquery_table" "brics_exchange_log" {
  dataset_id = google_bigquery_dataset.analytics_dataset.dataset_id
  table_id   = "brics_exchange_log"
  schema     = <<EOF
[
  {"name": "id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "country_code", "type": "STRING", "mode": "REQUIRED"},
  {"name": "data_type", "type": "STRING", "mode": "REQUIRED"},
  {"name": "status", "type": "STRING", "mode": "REQUIRED"}
]
EOF
}

resource "google_bigquery_table" "farmer_advisories" {
  dataset_id = google_bigquery_dataset.analytics_dataset.dataset_id
  table_id   = "farmer_advisories"
  schema     = <<EOF
[
  {"name": "id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "farmer_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "advisory_content", "type": "STRING", "mode": "REQUIRED"},
  {"name": "delivery_status", "type": "STRING", "mode": "REQUIRED"}
]
EOF
}

# Storage Buckets
resource "google_storage_bucket" "diagnostic_images" {
  name          = "krishi-vision-diagnostic-images-${var.project_id}-${var.environment}"
  location      = var.region
  force_destroy = true
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "satellite_cache" {
  name          = "krishi-vision-satellite-cache-${var.project_id}-${var.environment}"
  location      = var.region
  force_destroy = true
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "model_artifacts" {
  name          = "krishi-vision-model-artifacts-${var.project_id}-${var.environment}"
  location      = var.region
  force_destroy = true
  uniform_bucket_level_access = true
}

# Vertex AI Endpoint
resource "google_vertex_ai_endpoint" "custom_model_serving" {
  provider     = google-beta
  name         = "krishi-vision-endpoint-${var.environment}"
  display_name = "Krishi Vision Custom Model Endpoint"
  location     = var.region
}

# Secret Manager
resource "google_secret_manager_secret" "api_keys" {
  secret_id = "krishi-vision-api-keys-${var.environment}"
  replication {
    auto {}
  }
}

# Outputs
output "cloud_run_service_url" {
  value = google_cloud_run_v2_service.backend_api.uri
}

output "bigquery_dataset_id" {
  value = google_bigquery_dataset.analytics_dataset.dataset_id
}

output "diagnostic_images_bucket" {
  value = google_storage_bucket.diagnostic_images.name
}
