'use server'

import { createClient } from '@/lib/supabase-server'
import { mapActivityEntry } from '@/lib/db-mappers'
import type { ActivityEntry, ActivityEntryFormData } from '@/types'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export async function createActivityEntryAction(
  data: Omit<ActivityEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ActivityEntry> {
  const { supabase, userId } = await getUserId()
  const { data: inserted, error } = await supabase
    .from('activity_entries')
    .insert({
      user_id: userId,
      lead_id: data.leadId,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      attachment: data.attachment ?? null,
      pipeline_id: data.pipelineId ?? null,
      previous_stage_id: data.previousStageId ?? null,
      new_stage_id: data.newStageId ?? null,
      system_generated: data.systemGenerated ?? false,
    })
    .select()
    .single()
  if (error) throw error
  return mapActivityEntry(inserted)
}

export async function updateActivityEntryAction(
  id: string,
  data: Partial<ActivityEntryFormData>
): Promise<ActivityEntry> {
  const { supabase } = await getUserId()
  const update: Record<string, unknown> = {}
  if (data.title !== undefined) update.title = data.title
  if (data.description !== undefined) update.description = data.description ?? null
  if (data.attachment !== undefined) update.attachment = data.attachment ?? null
  const { data: updated, error } = await supabase
    .from('activity_entries')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapActivityEntry(updated)
}

export async function getActivityEntriesAction(leadId: string): Promise<ActivityEntry[]> {
  const { supabase } = await getUserId()
  const { data, error } = await supabase
    .from('activity_entries')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapActivityEntry)
}

export async function createStageChangeEntryAction(data: {
  leadId: string
  pipelineId: string
  pipelineName: string
  newStageName: string
  previousStageId?: string
  newStageId: string
}): Promise<ActivityEntry> {
  return createActivityEntryAction({
    leadId: data.leadId,
    type: 'stage_change',
    title: `Moved to ${data.newStageName}`,
    pipelineId: data.pipelineId,
    previousStageId: data.previousStageId,
    newStageId: data.newStageId,
    systemGenerated: true,
  })
}

export async function deleteActivityEntryAction(id: string): Promise<void> {
  const { supabase } = await getUserId()
  // Prevent deleting system-generated entries
  const { data: entry } = await supabase
    .from('activity_entries')
    .select('system_generated')
    .eq('id', id)
    .single()
  if (entry?.system_generated) throw new Error('Cannot delete a system-generated activity entry')
  const { error } = await supabase.from('activity_entries').delete().eq('id', id)
  if (error) throw error
}
