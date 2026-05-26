import { db } from './storage'
import type { ActivityEntry, ActivityEntryFormData } from '@/types'

export function getActivityEntries(leadId: string): ActivityEntry[] {
  return db.getActivityEntries(leadId)
}

export function createActivityEntry(
  data: Omit<ActivityEntry, 'id' | 'createdAt' | 'updatedAt'>
): ActivityEntry {
  return db.createActivityEntry(data)
}

export function updateActivityEntry(
  id: string,
  data: Partial<ActivityEntryFormData>
): ActivityEntry {
  return db.updateActivityEntry(id, data)
}

export function deleteActivityEntry(id: string): void {
  db.deleteActivityEntry(id)
}

export function createLeadCreatedEntry(leadId: string): ActivityEntry {
  return db.createActivityEntry({
    leadId,
    type: 'lead_created',
    title: 'Lead created',
    systemGenerated: true,
  })
}

export function createStageChangeEntry(params: {
  leadId: string
  pipelineId: string
  pipelineName: string
  newStageName: string
  previousStageId?: string
  newStageId?: string
}): ActivityEntry {
  return db.createActivityEntry({
    leadId: params.leadId,
    type: 'stage_change',
    title: `Moved to ${params.newStageName}`,
    description: params.pipelineName,
    pipelineId: params.pipelineId,
    previousStageId: params.previousStageId,
    newStageId: params.newStageId,
    systemGenerated: true,
  })
}

export function createClientConvertedEntry(leadId: string): ActivityEntry {
  return db.createActivityEntry({
    leadId,
    type: 'client_converted',
    title: 'Converted to client',
    systemGenerated: true,
  })
}
