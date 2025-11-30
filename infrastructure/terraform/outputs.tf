output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint."
  value       = data.aws_eks_cluster.this.endpoint
}

output "postgres_endpoint" {
  description = "Primary PostgreSQL endpoint."
  value       = aws_db_instance.primary.address
}

output "redis_endpoint" {
  description = "Redis primary endpoint."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "frontend_fqdn" {
  description = "Frontend host."
  value       = local.frontend_fqdn
}

output "api_fqdn" {
  description = "API host."
  value       = local.api_fqdn
}

output "velero_bucket" {
  description = "S3 bucket storing cluster backups."
  value       = aws_s3_bucket.velero.id
}
