'use server'

import { createClient } from '@/lib/supabase-server'
import { mapPipeline, mapStage } from '@/lib/db-mappers'
import type { Pipeline, PipelineStage } from '@/types'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export async function createPipelineAction(data: {
  name: string
  description?: string
}): Promise<Pipeline> {
  const { supabase, userId } = await getUserId()
  const { data: inserted, error } = await supabase
    .from('pipelines')
    .insert({ user_id: userId, name: data.name, description: data.description ?? null })
    .select()
    .single()
  if (error) throw error
  return mapPipeline(inserted)
}

export async function updatePipelineAction(
  id: string,
  data: { name?: string; description?: string }
): Promise<Pipeline> {
  const { supabase } = await getUserId()
  const { data: updated, error } = await supabase
    .from('pipelines')
    .update({ name: data.name, description: data.description ?? null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapPipeline(updated)
}

export async function deletePipelineAction(id: string): Promise<void> {
  const { supabase } = await getUserId()
  // Clear pipeline/stage from all leads in this pipeline
  await supabase
    .from('leads')
    .update({ pipeline_id: null, stage_id: null })
    .eq('pipeline_id', id)
  // Cascade delete stages (pipeline delete would cascade via FK, but leads update must come first)
  const { error } = await supabase.from('pipelines').delete().eq('id', id)
  if (error) throw error
}

// ─── Stages ───────────────────────────────────────────────────────────────────

export async function createStageAction(data: Omit<PipelineStage, 'id'>): Promise<PipelineStage> {
  const { supabase, userId } = await getUserId()
  const { data: inserted, error } = await supabase
    .from('pipeline_stages')
    .insert({
      user_id: userId,
      pipeline_id: data.pipelineId,
      name: data.name,
      order: data.order,
      color: data.color ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return mapStage(inserted)
}

export async function updateStageAction(
  id: string,
  data: Partial<Pick<PipelineStage, 'name' | 'order' | 'color'>>
): Promise<PipelineStage> {
  const { supabase } = await getUserId()
  const update: Record<string, unknown> = {}
  if (data.name !== undefined) update.name = data.name
  if (data.order !== undefined) update.order = data.order
  if (data.color !== undefined) update.color = data.color ?? null
  const { data: updated, error } = await supabase
    .from('pipeline_stages')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapStage(updated)
}

export async function deleteStageAction(id: string): Promise<void> {
  const { supabase } = await getUserId()
  // Clear stage (and pipeline) from leads assigned to this stage
  await supabase
    .from('leads')
    .update({ pipeline_id: null, stage_id: null })
    .eq('stage_id', id)
  const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
  if (error) throw error
}

export async function reorderStagesAction(stages: PipelineStage[]): Promise<void> {
  const { supabase } = await getUserId()
  await Promise.all(
    stages.map((s) =>
      supabase.from('pipeline_stages').update({ order: s.order }).eq('id', s.id)
    )
  )
}

// ─── Lead ↔ Pipeline assignment ───────────────────────────────────────────────

export async function addLeadToPipelineAction(
  leadId: string,
  pipelineId: string,
  stageId: string
): Promise<void> {
  const { supabase } = await getUserId()
  const { error } = await supabase
    .from('leads')
    .update({ pipeline_id: pipelineId, stage_id: stageId })
    .eq('id', leadId)
  if (error) throw error
}

export async function moveLeadToStageAction(
  leadId: string,
  stageId: string,
  pipelineId?: string
): Promise<void> {
  const { supabase } = await getUserId()
  const update: Record<string, unknown> = { stage_id: stageId }
  if (pipelineId) update.pipeline_id = pipelineId
  const { error } = await supabase.from('leads').update(update).eq('id', leadId)
  if (error) throw error
}

export async function removeLeadFromPipelineAction(leadId: string): Promise<void> {
  const { supabase } = await getUserId()
  const { error } = await supabase
    .from('leads')
    .update({ pipeline_id: null, stage_id: null })
    .eq('id', leadId)
  if (error) throw error
}
