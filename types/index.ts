export type CustomFieldType = 'text' | 'number' | 'date' | 'select'

export interface LeadOption {
  id: string
  label: string
  color?: string
}

export interface CustomFieldDefinition {
  id: string
  name: string
  type: CustomFieldType
  options?: string[]
}

export type LeadQuality = 'high' | 'medium' | 'low' | ''

export interface Lead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  website: string
  company: string
  jobTitle: string
  pipelineId: string
  stageId: string
  estimatedValue: string
  leadQuality: LeadQuality
  notes: string
  customFields: Record<string, string>
  isClient?: boolean
  createdAt: string
  updatedAt: string
}

export type LeadFormData = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  key: keyof Lead | string
  direction: SortDirection
}


export interface Pipeline {
  id: string
  name: string
  description?: string
  createdAt: string
}

export interface PipelineStage {
  id: string
  pipelineId: string
  name: string
  order: number
  color?: string
}

export interface PipelineEntry {
  id: string
  pipelineId: string
  stageId: string
  leadId: string
  addedAt: string
  order: number
}

export interface ActivityAttachment {
  name: string
  url: string
}

export type ActivityEntryType = 'note' | 'document' | 'stage_change' | 'lead_created' | 'client_converted'

export interface ActivityEntry {
  id: string
  leadId: string
  type: ActivityEntryType
  title: string
  description?: string
  attachment?: ActivityAttachment
  pipelineId?: string
  previousStageId?: string
  newStageId?: string
  systemGenerated: boolean
  createdAt: string
  updatedAt: string
}

export type ActivityEntryFormData = Pick<ActivityEntry, 'type' | 'title' | 'description' | 'attachment'>

export type ClientStatus = 'active' | 'at_risk' | 'churned'

export interface Client {
  id: string
  leadId: string
  contractValue: string
  clientSince: string
  renewalDate: string
  status: ClientStatus
  customFields: Record<string, string>
  createdAt: string
  updatedAt: string
}

export type ClientFormData = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>

export interface AppSettings {
  currencyCode: string
}
