import type {
  Lead,
  LeadQuality,
  Client,
  ClientStatus,
  Pipeline,
  PipelineStage,
  PipelineEntry,
  ActivityEntry,
  ActivityEntryType,
  ActivityAttachment,
  CustomFieldDefinition,
  CustomFieldType,
  AppSettings,
} from '@/types'

// ─── Leads ───────────────────────────────────────────────────────────────────

export function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    firstName: (row.first_name as string) ?? '',
    lastName: (row.last_name as string) ?? '',
    email: (row.email as string) ?? '',
    phone: (row.phone as string) ?? '',
    website: (row.website as string) ?? '',
    company: (row.company as string) ?? '',
    jobTitle: (row.job_title as string) ?? '',
    pipelineId: (row.pipeline_id as string) ?? '',
    stageId: (row.stage_id as string) ?? '',
    estimatedValue: row.estimated_value != null ? String(row.estimated_value) : '',
    leadQuality: ((row.lead_quality as string) ?? '') as LeadQuality,
    notes: (row.notes as string) ?? '',
    customFields: (row.custom_fields as Record<string, string>) ?? {},
    isClient: (row.is_client as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function toLeadRow(data: Partial<Lead> & { userId?: string }) {
  const row: Record<string, unknown> = {}
  if (data.userId !== undefined) row.user_id = data.userId
  if (data.firstName !== undefined) row.first_name = data.firstName
  if (data.lastName !== undefined) row.last_name = data.lastName || null
  if (data.email !== undefined) row.email = data.email || null
  if (data.phone !== undefined) row.phone = data.phone || null
  if (data.website !== undefined) row.website = data.website || null
  if (data.company !== undefined) row.company = data.company || null
  if (data.jobTitle !== undefined) row.job_title = data.jobTitle || null
  if (data.pipelineId !== undefined) row.pipeline_id = data.pipelineId || null
  if (data.stageId !== undefined) row.stage_id = data.stageId || null
  if (data.estimatedValue !== undefined) {
    row.estimated_value = data.estimatedValue ? parseFloat(data.estimatedValue) : null
  }
  if (data.leadQuality !== undefined) row.lead_quality = data.leadQuality || null
  if (data.notes !== undefined) row.notes = data.notes || null
  if (data.customFields !== undefined) row.custom_fields = data.customFields
  if (data.isClient !== undefined) row.is_client = data.isClient
  return row
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export function mapClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    contractValue: row.contract_value != null ? String(row.contract_value) : '',
    clientSince: (row.client_since as string) ?? '',
    renewalDate: (row.renewal_date as string) ?? '',
    status: (row.status as ClientStatus) ?? 'active',
    customFields: (row.custom_fields as Record<string, string>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function toClientRow(data: Partial<Client> & { userId?: string }) {
  const row: Record<string, unknown> = {}
  if (data.userId !== undefined) row.user_id = data.userId
  if (data.leadId !== undefined) row.lead_id = data.leadId
  if (data.contractValue !== undefined) {
    row.contract_value = data.contractValue ? parseFloat(data.contractValue) : null
  }
  if (data.clientSince !== undefined) row.client_since = data.clientSince || null
  if (data.renewalDate !== undefined) row.renewal_date = data.renewalDate || null
  if (data.status !== undefined) row.status = data.status
  if (data.customFields !== undefined) row.custom_fields = data.customFields
  return row
}

// ─── Pipelines ───────────────────────────────────────────────────────────────

export function mapPipeline(row: Record<string, unknown>): Pipeline {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    createdAt: row.created_at as string,
  }
}

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

export function mapStage(row: Record<string, unknown>): PipelineStage {
  return {
    id: row.id as string,
    pipelineId: row.pipeline_id as string,
    name: row.name as string,
    order: (row.order as number) ?? 0,
    color: (row.color as string) ?? undefined,
  }
}

// ─── Pipeline Entries (synthesised from leads) ────────────────────────────────
// There is no pipeline_entries table. Pipeline/stage info lives directly on leads.
// We synthesise PipelineEntry objects so the PipelineBoard component works unchanged.

export function leadToPipelineEntry(lead: Lead): PipelineEntry {
  return {
    id: lead.id,
    pipelineId: lead.pipelineId,
    stageId: lead.stageId,
    leadId: lead.id,
    addedAt: lead.updatedAt,
    order: 0,
  }
}

// ─── Activity Entries ─────────────────────────────────────────────────────────

export function mapActivityEntry(row: Record<string, unknown>): ActivityEntry {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    type: row.type as ActivityEntryType,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    attachment: (row.attachment as ActivityAttachment) ?? undefined,
    pipelineId: (row.pipeline_id as string) ?? undefined,
    previousStageId: (row.previous_stage_id as string) ?? undefined,
    newStageId: (row.new_stage_id as string) ?? undefined,
    systemGenerated: (row.system_generated as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ─── Custom Field Definitions ─────────────────────────────────────────────────

export function mapCustomField(row: Record<string, unknown>): CustomFieldDefinition {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as CustomFieldType,
    options: (row.options as string[]) ?? undefined,
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function mapSettings(row: Record<string, unknown> | null): AppSettings {
  if (!row) return { currencyCode: 'USD' }
  return {
    currencyCode: (row.currency_code as string) ?? 'USD',
  }
}
