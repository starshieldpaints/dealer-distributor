variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Short project identifier used for resource naming."
  type        = string
  default     = "ddms"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR range for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnets" {
  description = "Public subnet CIDR blocks."
  type        = list(string)
  default     = ["10.20.0.0/20", "10.20.16.0/20", "10.20.32.0/20"]
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks."
  type        = list(string)
  default     = ["10.20.64.0/20", "10.20.80.0/20", "10.20.96.0/20"]
}

variable "allowed_cidrs" {
  description = "Optional list of CIDRs that may reach private services (e.g. bastion/LB)."
  type        = list(string)
  default     = []
}

variable "node_instance_types" {
  description = "Instance types for the EKS managed nodes."
  type        = list(string)
  default     = ["m6i.large"]
}

variable "node_desired_capacity" {
  description = "Desired number of nodes in the default node group."
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Minimum number of nodes."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum number of nodes."
  type        = number
  default     = 6
}

variable "database_username" {
  description = "PostgreSQL username."
  type        = string
  default     = "ddms_service"
}

variable "database_password" {
  description = "PostgreSQL password. Store securely via TF_VAR_database_password."
  type        = string
  sensitive   = true
}

variable "database_instance_class" {
  description = "Instance class for the PostgreSQL RDS instance."
  type        = string
  default     = "db.m6g.large"
}

variable "database_allocated_storage" {
  description = "Allocated storage in GB for PostgreSQL."
  type        = number
  default     = 100
}

variable "db_backup_retention_days" {
  description = "Number of days to keep automated DB backups."
  type        = number
  default     = 7
}

variable "redis_node_type" {
  description = "Node type for ElastiCache Redis replication group."
  type        = string
  default     = "cache.m6g.large"
}

variable "root_domain" {
  description = "Primary Route53 hosted zone domain (e.g., example.com)."
  type        = string
}

variable "frontend_subdomain" {
  description = "Subdomain for the frontend application."
  type        = string
  default     = "app"
}

variable "api_subdomain" {
  description = "Subdomain for the API application."
  type        = string
  default     = "api"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID used by external-dns."
  type        = string
}

variable "ssl_contact_email" {
  description = "Email used for Let's Encrypt/ACME registration."
  type        = string
}

variable "alertmanager_slack_webhook_url" {
  description = "Slack webhook used by Alertmanager. Leave blank to disable Slack notifications."
  type        = string
  default     = ""
  sensitive   = true
}

variable "alertmanager_slack_channel" {
  description = "Slack channel for alerts. Only used when webhook is set."
  type        = string
  default     = "#ops-alerts"
}

variable "velero_schedule_cron" {
  description = "Cron expression for Velero backup schedule."
  type        = string
  default     = "0 3 * * *"
}

variable "tags" {
  description = "Additional tags applied to all taggable resources."
  type        = map(string)
  default     = {}
}
