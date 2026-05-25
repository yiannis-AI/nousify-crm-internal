import { db } from './storage'
import type { Pipeline, PipelineStage, PipelineEntry } from '@/types'

export function getPipelines(): Pipeline[] {
  return db.getPipelines()
}

export function createPipeline(name: string, description?: string): Pipeline {
  return db.createPipeline({ name, description })
}

export function updatePipeline(id: string, data: Partial<Pick<Pipeline, 'name' | 'description'>>): Pipeline {
  return db.updatePipeline(id, data)
}

export function deletePipeline(id: string): void {
  db.deletePipeline(id)
}

export function getStages(pipelineId: string): PipelineStage[] {
  return db.getPipelineStages(pipelineId)
}

export function createStage(pipelineId: string, name: string, order: number, color?: string): PipelineStage {
  return db.createPipelineStage({ pipelineId, name, order, color })
}

export function updateStage(id: string, data: Partial<Pick<PipelineStage, 'name' | 'order' | 'color'>>): PipelineStage {
  return db.updatePipelineStage(id, data)
}

export function deleteStage(id: string): void {
  db.deletePipelineStage(id)
}

export function reorderStages(stages: PipelineStage[]): void {
  db.savePipelineStages(stages)
}

export function getEntries(pipelineId: string): PipelineEntry[] {
  return db.getPipelineEntries(pipelineId)
}

export function addLeadToPipeline(pipelineId: string, stageId: string, leadId: string, order: number): PipelineEntry {
  return db.addLeadToPipeline({ pipelineId, stageId, leadId, order })
}

export function moveEntry(entryId: string, stageId: string, order: number): PipelineEntry {
  return db.moveLeadToStage(entryId, stageId, order)
}

export function removeEntry(entryId: string): void {
  db.removeLeadFromPipeline(entryId)
}

export function saveEntryOrder(entries: PipelineEntry[]): void {
  entries.forEach((e) => db.moveLeadToStage(e.id, e.stageId, e.order))
}
