provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.common_tags
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.7"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, length(var.private_subnets))
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_dns_hostnames = true
  enable_dns_support   = true
  enable_nat_gateway   = true
  single_nat_gateway   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }

  tags = local.common_tags
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.11"

  cluster_name    = "${local.name}-eks"
  cluster_version = "1.30"

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  enable_irsa = true

  eks_managed_node_group_defaults = {
    ami_type       = "AL2_x86_64"
    disk_size      = 50
    instance_types = var.node_instance_types
  }

  eks_managed_node_groups = {
    default = {
      desired_size = var.node_desired_capacity
      min_size     = var.node_min_size
      max_size     = var.node_max_size
      subnets      = module.vpc.private_subnets
    }
  }

  tags = local.common_tags
}

resource "aws_security_group" "db" {
  name        = "${local.name}-db-sg"
  description = "Allow backend pods to reach PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "this" {
  name       = "${local.name}-db-subnets"
  subnet_ids = module.vpc.private_subnets
  tags       = local.common_tags
}

resource "aws_db_instance" "primary" {
  identifier                  = "${local.name}-postgres"
  engine                      = "postgres"
  engine_version              = "16.3"
  instance_class              = var.database_instance_class
  allocated_storage           = var.database_allocated_storage
  db_subnet_group_name        = aws_db_subnet_group.this.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  username                    = var.database_username
  password                    = var.database_password
  publicly_accessible         = false
  multi_az                    = true
  storage_encrypted           = true
  auto_minor_version_upgrade  = true
  backup_retention_period     = var.db_backup_retention_days
  deletion_protection         = true
  skip_final_snapshot         = false
  copy_tags_to_snapshot       = true
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  monitoring_interval         = 60
  apply_immediately           = true
  tags                        = local.common_tags
}

resource "aws_security_group" "redis" {
  name        = "${local.name}-redis-sg"
  description = "Allow backend pods to reach Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name}-redis-subnets"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${local.name}-redis"
  description                   = "DDMS session cache"
  engine                        = "redis"
  node_type                     = var.redis_node_type
  number_cache_clusters         = 2
  multi_az_enabled              = true
  automatic_failover_enabled    = true
  subnet_group_name             = aws_elasticache_subnet_group.redis.name
  security_group_ids            = [aws_security_group.redis.id]
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
  maintenance_window            = "sun:05:00-sun:06:00"
  snapshot_window               = "04:00-05:00"
  snapshot_retention_limit      = 7
  tags                          = local.common_tags
}

resource "aws_s3_bucket" "velero" {
  bucket = local.velero_bucket

  lifecycle_rule {
    id      = "retention"
    enabled = true

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 365
    }
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  versioning {
    enabled = true
  }

  tags = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "velero" {
  bucket = aws_s3_bucket.velero.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_backup_vault" "this" {
  name = "${local.name}-vault"
  tags = local.common_tags
}

resource "aws_backup_plan" "this" {
  name = "${local.name}-plan"

  rule {
    rule_name         = "daily-rds"
    target_vault_name = aws_backup_vault.this.name
    schedule          = "cron(0 6 * * ? *)"
    lifecycle {
      delete_after = 30
    }
  }

  tags = local.common_tags
}

resource "aws_backup_selection" "rds" {
  name         = "${local.name}-rds-selection"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.this.id

  resources = [
    aws_db_instance.primary.arn
  ]
}

data "aws_iam_policy_document" "backup_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backup" {
  name               = "${local.name}-backup"
  assume_role_policy = data.aws_iam_policy_document.backup_assume.json
  tags               = local.common_tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

data "aws_caller_identity" "current" {}

data "aws_eks_cluster" "this" {
  name = module.eks.cluster_name
}

data "aws_eks_cluster_auth" "this" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.this.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.this.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}

resource "kubernetes_namespace" "networking" {
  metadata {
    name = "ingress-nginx"
  }
}

resource "kubernetes_namespace" "observability" {
  metadata {
    name = "observability"
  }
}

resource "kubernetes_namespace" "velero" {
  metadata {
    name = "velero"
  }
}

data "aws_iam_policy_document" "external_dns_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:${kubernetes_namespace.networking.metadata[0].name}:external-dns"]
    }
  }
}

data "aws_iam_policy_document" "external_dns" {
  statement {
    actions = [
      "route53:ChangeResourceRecordSets"
    ]
    resources = [
      "arn:aws:route53:::hostedzone/${var.route53_zone_id}"
    ]
  }

  statement {
    actions   = ["route53:ListHostedZones", "route53:ListResourceRecordSets"]
    resources = ["*"]
  }
}

resource "aws_iam_role" "external_dns" {
  name               = "${local.name}-external-dns"
  assume_role_policy = data.aws_iam_policy_document.external_dns_assume.json
  inline_policy {
    name   = "route53"
    policy = data.aws_iam_policy_document.external_dns.json
  }
  tags = local.common_tags
}

data "aws_iam_policy_document" "alb_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:kube-system:aws-load-balancer-controller"]
    }
  }
}

data "aws_iam_policy_document" "alb_controller" {
  statement {
    actions = [
      "iam:CreateServiceLinkedRole",
      "ec2:Describe*",
      "ec2:GetCoipPoolUsage",
      "ec2:AllocateAddress",
      "ec2:ReleaseAddress",
      "ec2:AssociateAddress",
      "ec2:DescribeAddresses",
      "ec2:DescribeAccountAttributes",
      "ec2:DescribeAvailabilityZones",
      "ec2:DescribeInternetGateways",
      "ec2:DescribeVpcs",
      "ec2:DescribeSubnets",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeInstances",
      "ec2:DescribeNetworkInterfaces",
      "ec2:CreateSecurityGroup",
      "ec2:CreateTags",
      "ec2:DeleteSecurityGroup",
      "ec2:RevokeSecurityGroupIngress",
      "ec2:AuthorizeSecurityGroupIngress",
      "elasticloadbalancing:*",
      "iam:ListServerCertificates",
      "iam:GetServerCertificate",
      "cognito-idp:DescribeUserPoolClient",
      "acm:ListCertificates",
      "acm:DescribeCertificate",
      "waf-regional:GetWebACLForResource",
      "waf-regional:GetWebACL",
      "waf-regional:AssociateWebACL",
      "waf-regional:DisassociateWebACL",
      "wafv2:GetWebACL",
      "wafv2:GetWebACLForResource",
      "wafv2:AssociateWebACL",
      "wafv2:DisassociateWebACL",
      "shield:GetSubscriptionState",
      "shield:DescribeProtection",
      "shield:CreateProtection",
      "shield:DeleteProtection",
      "shield:DescribeSubscription",
      "tag:GetResources",
      "tag:TagResources"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role" "alb_controller" {
  name               = "${local.name}-alb-controller"
  assume_role_policy = data.aws_iam_policy_document.alb_assume.json

  inline_policy {
    name   = "aws-load-balancer-controller"
    policy = data.aws_iam_policy_document.alb_controller.json
  }

  tags = local.common_tags
}

resource "kubernetes_service_account" "alb_controller" {
  metadata {
    name      = "aws-load-balancer-controller"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.alb_controller.arn
    }
    labels = {
      app.kubernetes.io/name = "aws-load-balancer-controller"
    }
  }
}

data "aws_iam_policy_document" "velero_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:${kubernetes_namespace.velero.metadata[0].name}:velero"]
    }
  }
}

data "aws_iam_policy_document" "velero" {
  statement {
    sid    = "S3"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
      "s3:AbortMultipartUpload"
    ]
    resources = [
      aws_s3_bucket.velero.arn,
      "${aws_s3_bucket.velero.arn}/*"
    ]
  }

  statement {
    sid    = "EBS"
    effect = "Allow"
    actions = [
      "ec2:DescribeVolumes",
      "ec2:DescribeSnapshots",
      "ec2:CreateTags",
      "ec2:CreateVolume",
      "ec2:CreateSnapshot",
      "ec2:DeleteSnapshot"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role" "velero" {
  name               = "${local.name}-velero"
  assume_role_policy = data.aws_iam_policy_document.velero_assume.json

  inline_policy {
    name   = "velero"
    policy = data.aws_iam_policy_document.velero.json
  }

  tags = local.common_tags
}

resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = "v1.15.2"
  namespace        = "cert-manager"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}

resource "kubernetes_manifest" "letsencrypt_cluster_issuer" {
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt"
    }
    spec = {
      acme = {
        email  = var.ssl_contact_email
        server = "https://acme-v02.api.letsencrypt.org/directory"
        privateKeySecretRef = {
          name = "letsencrypt-account-key"
        }
        solvers = [
          {
            http01 = {
              ingress = {
                class = "nginx"
              }
            }
          }
        ]
      }
    }
  }

  depends_on = [helm_release.cert_manager]
}

resource "helm_release" "ingress_nginx" {
  name       = "ingress-nginx"
  namespace  = kubernetes_namespace.networking.metadata[0].name
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = "4.11.1"

  values = [<<-YAML
controller:
  replicaCount: 2
  ingressClassResource:
    name: nginx
    enabled: true
  service:
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"
      service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
      service.beta.kubernetes.io/aws-load-balancer-type: "external"
      service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    targetPorts:
      https: http
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
      namespace: ${kubernetes_namespace.observability.metadata[0].name}
  config:
    proxy-body-size: "50m"
    proxy-connect-timeout: "30"
    proxy-read-timeout: "120"
YAML
  ]
}

resource "helm_release" "external_dns" {
  name       = "external-dns"
  namespace  = kubernetes_namespace.networking.metadata[0].name
  repository = "https://kubernetes-sigs.github.io/external-dns/"
  chart      = "external-dns"
  version    = "1.15.0"

  values = [<<-YAML
serviceAccount:
  name: external-dns
  annotations:
    eks.amazonaws.com/role-arn: ${aws_iam_role.external_dns.arn}
provider: aws
policy: upsert-only
domainFilters:
  - ${var.root_domain}
txtOwnerId: ${local.name}
sources:
  - service
  - ingress
YAML
  ]

  depends_on = [aws_iam_role.external_dns]
}

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  namespace  = "kube-system"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = "1.8.1"

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "false"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = module.vpc.vpc_id
  }

  depends_on = [kubernetes_service_account.alb_controller]
}

resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.observability.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "65.2.0"

  values = [<<-YAML
prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
alertmanager:
  enabled: true
  config: |
${indent(4, local.alertmanager_config)}
grafana:
  adminPassword: admin
  service:
    type: ClusterIP
  ingress:
    enabled: true
    ingressClassName: nginx
    hosts:
      - grafana.${local.frontend_fqdn}
    tls:
      - secretName: grafana-tls
        hosts:
          - grafana.${local.frontend_fqdn}
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt
YAML
  ]

  depends_on = [kubernetes_manifest.letsencrypt_cluster_issuer]
}

resource "helm_release" "velero" {
  name       = "velero"
  namespace  = kubernetes_namespace.velero.metadata[0].name
  repository = "https://vmware-tanzu.github.io/helm-charts"
  chart      = "velero"
  version    = "6.0.0"

  values = [<<-YAML
configuration:
  provider: aws
  backupStorageLocation:
    - name: default
      provider: aws
      bucket: ${aws_s3_bucket.velero.id}
      config:
        region: ${var.aws_region}
  volumeSnapshotLocation:
    - name: default
      provider: aws
      config:
        region: ${var.aws_region}
serviceAccount:
  server:
    name: velero
    annotations:
      eks.amazonaws.com/role-arn: ${aws_iam_role.velero.arn}
schedules:
  daily:
    schedule: "${var.velero_schedule_cron}"
    template:
      ttl: 720h0m0s
      includedNamespaces:
        - "*"
      storageLocation: default
      snapshotVolumes: true
metrics:
  serviceMonitor:
    enabled: true
    additionalLabels:
      release: kube-prometheus-stack
YAML
  ]

  depends_on = [aws_iam_role.velero]
}
