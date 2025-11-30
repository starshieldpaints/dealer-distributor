{{- define "ddms.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ddms.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "ddms.labels" -}}
app.kubernetes.io/name: {{ include "ddms.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "ddms.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ddms.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "ddms.backendServiceAccountName" -}}
{{- if .Values.backend.serviceAccount.create -}}
{{- default (printf "%s-backend" (include "ddms.fullname" .)) .Values.backend.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.backend.serviceAccount.name -}}
{{- end -}}
{{- end -}}
