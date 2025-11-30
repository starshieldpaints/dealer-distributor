locals {
  name        = "${var.project}-${var.environment}"
  frontend_fqdn = format("%s.%s", var.frontend_subdomain, var.root_domain)
  api_fqdn      = format("%s.%s", var.api_subdomain, var.root_domain)
  velero_bucket = format("%s-%s-velero-backups", var.project, var.environment)

  common_tags = merge({
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
  }, var.tags)

  alert_receiver = var.alertmanager_slack_webhook_url != "" ? "slack" : "devnull"

  alertmanager_receivers = var.alertmanager_slack_webhook_url != "" ? [
    {
      name = "slack"
      slack_configs = [{
        api_url       = var.alertmanager_slack_webhook_url
        channel       = var.alertmanager_slack_channel
        send_resolved = true
      }]
    }
  ] : [
    {
      name = "devnull"
    }
  ]

  alertmanager_config = yamlencode({
    global = {
      resolve_timeout = "5m"
    }
    route = {
      receiver        = local.alert_receiver
      group_by        = ["job"]
      group_wait      = "30s"
      group_interval  = "5m"
      repeat_interval = "4h"
    }
    receivers = local.alertmanager_receivers
  })
}
