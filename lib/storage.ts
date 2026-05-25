import { v4 as uuidv4 } from 'uuid'
import type { Lead, LeadFormData, CustomFieldDefinition, Pipeline, PipelineStage, PipelineEntry, ActivityEntry, ActivityEntryFormData } from '@/types'

const KEYS = {
  leads: 'crm_leads',
  customFields: 'crm_custom_fields',
  pipelines: 'crm_pipelines',
  pipelineStages: 'crm_pipeline_stages',
  pipelineEntries: 'crm_pipeline_entries',
  activityEntries: 'crm_activity_entries',
}

export interface StorageAdapter {
  getLeads(): Lead[]
  createLead(data: LeadFormData): Lead
  updateLead(id: string, data: Partial<LeadFormData>): Lead
  deleteLead(id: string): void
  getCustomFields(): CustomFieldDefinition[]
  saveCustomFields(fields: CustomFieldDefinition[]): void
  getPipelines(): Pipeline[]
  createPipeline(data: Omit<Pipeline, 'id' | 'createdAt'>): Pipeline
  updatePipeline(id: string, data: Partial<Pick<Pipeline, 'name' | 'description'>>): Pipeline
  deletePipeline(id: string): void
  getPipelineStages(pipelineId: string): PipelineStage[]
  savePipelineStages(stages: PipelineStage[]): void
  createPipelineStage(data: Omit<PipelineStage, 'id'>): PipelineStage
  updatePipelineStage(id: string, data: Partial<Pick<PipelineStage, 'name' | 'order' | 'color'>>): PipelineStage
  deletePipelineStage(id: string): void
  getPipelineEntries(pipelineId: string): PipelineEntry[]
  addLeadToPipeline(data: Omit<PipelineEntry, 'id' | 'addedAt'>): PipelineEntry
  moveLeadToStage(entryId: string, stageId: string, order: number): PipelineEntry
  removeLeadFromPipeline(entryId: string): void
  removeLeadFromAllPipelines(leadId: string): void
  getActivityEntries(leadId: string): ActivityEntry[]
  createActivityEntry(data: Omit<ActivityEntry, 'id' | 'createdAt' | 'updatedAt'>): ActivityEntry
  updateActivityEntry(id: string, data: Partial<ActivityEntryFormData>): ActivityEntry
  deleteActivityEntry(id: string): void
  deleteActivityEntriesForLead(leadId: string): void
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const localStorageAdapter: StorageAdapter = {
  getLeads() {
    return readJSON<Lead[]>(KEYS.leads, [])
  },

  createLead(data) {
    const leads = this.getLeads()
    const now = new Date().toISOString()
    const lead: Lead = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
    writeJSON(KEYS.leads, [...leads, lead])
    return lead
  },

  updateLead(id, data) {
    const leads = this.getLeads()
    const index = leads.findIndex((l) => l.id === id)
    if (index === -1) throw new Error(`Lead ${id} not found`)
    const updated = { ...leads[index], ...data, updatedAt: new Date().toISOString() }
    leads[index] = updated
    writeJSON(KEYS.leads, leads)
    return updated
  },

  deleteLead(id) {
    const leads = this.getLeads().filter((l) => l.id !== id)
    writeJSON(KEYS.leads, leads)
    this.removeLeadFromAllPipelines(id)
    this.deleteActivityEntriesForLead(id)
  },

  getCustomFields() {
    return readJSON<CustomFieldDefinition[]>(KEYS.customFields, [])
  },

  saveCustomFields(fields) {
    writeJSON(KEYS.customFields, fields)
  },

  getPipelines() {
    return readJSON<Pipeline[]>(KEYS.pipelines, [])
  },

  createPipeline(data) {
    const pipelines = this.getPipelines()
    const pipeline: Pipeline = { ...data, id: uuidv4(), createdAt: new Date().toISOString() }
    writeJSON(KEYS.pipelines, [...pipelines, pipeline])
    return pipeline
  },

  updatePipeline(id, data) {
    const pipelines = this.getPipelines()
    const index = pipelines.findIndex((p) => p.id === id)
    if (index === -1) throw new Error(`Pipeline ${id} not found`)
    pipelines[index] = { ...pipelines[index], ...data }
    writeJSON(KEYS.pipelines, pipelines)
    return pipelines[index]
  },

  deletePipeline(id) {
    writeJSON(KEYS.pipelines, this.getPipelines().filter((p) => p.id !== id))
    const stages = readJSON<PipelineStage[]>(KEYS.pipelineStages, [])
    writeJSON(KEYS.pipelineStages, stages.filter((s) => s.pipelineId !== id))
    const entries = readJSON<PipelineEntry[]>(KEYS.pipelineEntries, [])
    const affectedLeadIds = entries.filter((e) => e.pipelineId === id).map((e) => e.leadId)
    writeJSON(KEYS.pipelineEntries, entries.filter((e) => e.pipelineId !== id))
    // Clear pipelineId/stageId on all affected leads
    if (affectedLeadIds.length > 0) {
      const leads = this.getLeads().map((l) =>
        affectedLeadIds.includes(l.id) ? { ...l, pipelineId: '', stageId: '', updatedAt: new Date().toISOString() } : l
      )
      writeJSON(KEYS.leads, leads)
    }
  },

  getPipelineStages(pipelineId) {
    return readJSON<PipelineStage[]>(KEYS.pipelineStages, [])
      .filter((s) => s.pipelineId === pipelineId)
      .sort((a, b) => a.order - b.order)
  },

  savePipelineStages(stages) {
    const all = readJSON<PipelineStage[]>(KEYS.pipelineStages, [])
    if (stages.length === 0) return
    const pipelineId = stages[0].pipelineId
    const others = all.filter((s) => s.pipelineId !== pipelineId)
    writeJSON(KEYS.pipelineStages, [...others, ...stages])
  },

  createPipelineStage(data) {
    const all = readJSON<PipelineStage[]>(KEYS.pipelineStages, [])
    const stage: PipelineStage = { ...data, id: uuidv4() }
    writeJSON(KEYS.pipelineStages, [...all, stage])
    return stage
  },

  updatePipelineStage(id, data) {
    const all = readJSON<PipelineStage[]>(KEYS.pipelineStages, [])
    const index = all.findIndex((s) => s.id === id)
    if (index === -1) throw new Error(`Stage ${id} not found`)
    all[index] = { ...all[index], ...data }
    writeJSON(KEYS.pipelineStages, all)
    return all[index]
  },

  deletePipelineStage(id) {
    const all = readJSON<PipelineStage[]>(KEYS.pipelineStages, [])
    writeJSON(KEYS.pipelineStages, all.filter((s) => s.id !== id))
    const entries = readJSON<PipelineEntry[]>(KEYS.pipelineEntries, [])
    const affectedLeadIds = entries.filter((e) => e.stageId === id).map((e) => e.leadId)
    writeJSON(KEYS.pipelineEntries, entries.filter((e) => e.stageId !== id))
    // Clear stageId (and pipelineId) on affected leads
    if (affectedLeadIds.length > 0) {
      const leads = this.getLeads().map((l) =>
        affectedLeadIds.includes(l.id) ? { ...l, pipelineId: '', stageId: '', updatedAt: new Date().toISOString() } : l
      )
      writeJSON(KEYS.leads, leads)
    }
  },

  getPipelineEntries(pipelineId) {
    return readJSON<PipelineEntry[]>(KEYS.pipelineEntries, [])
      .filter((e) => e.pipelineId === pipelineId)
  },

  addLeadToPipeline(data) {
    const entries = readJSON<PipelineEntry[]>(KEYS.pipelineEntries, [])
    // Enforce one pipeline per lead globally
    const alreadyInAny = entries.find((e) => e.leadId === data.leadId)
    if (alreadyInAny) throw new Error('Lead is already in a pipeline')
    const entry: PipelineEntry = { ...data, id: uuidv4(), addedAt: new Date().toISOString() }
    writeJSON(KEYS.pipelineEntries, [...entries, entry])
    // Sync lead fields
    this.updateLead(data.leadId, { pipelineId: data.pipelineId, stageId: data.stageId })
    return entry
  },

  moveLeadToStage(entryId, stageId, order) {
    const entries = readJSON<PipelineEntry[]>(KEYS.pipelineEntries, [])
    const index = entries.findIndex((e) => e.id === entryId)
    if (index === -1) throw new Error(`Entry ${entryId} not found`)
    entries[index] = { ...entries[index], stageId, order }
    writeJSON(KEYS.pipelineEntries, entries)
    // Sync lead stageId
    this.updateLead(entries[index].leadId, { stageId })
    return entries[index]
  },

  removeLeadFromPipeline(entryId) {
    const entries = readJSON<PipelineEntry[]>(KEYS.pipelineEntries, [])
    const entry = entries.find((e) => e.id === entryId)
    writeJSON(KEYS.pipelineEntries, entries.filter((e) => e.id !== entryId))
    if (entry) {
      this.updateLead(entry.leadId, { pipelineId: '', stageId: '' })
    }
  },

  removeLeadFromAllPipelines(leadId) {
    const entries = readJSON<PipelineEntry[]>(KEYS.pipelineEntries, [])
    writeJSON(KEYS.pipelineEntries, entries.filter((e) => e.leadId !== leadId))
    // Clear lead fields — but lead may already be deleted, so guard with try/catch
    try { this.updateLead(leadId, { pipelineId: '', stageId: '' }) } catch { /* lead already deleted */ }
  },

  getActivityEntries(leadId) {
    return readJSON<ActivityEntry[]>(KEYS.activityEntries, [])
      .filter((e) => e.leadId === leadId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  createActivityEntry(data) {
    const entries = readJSON<ActivityEntry[]>(KEYS.activityEntries, [])
    const now = new Date().toISOString()
    const entry: ActivityEntry = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
    writeJSON(KEYS.activityEntries, [...entries, entry])
    return entry
  },

  updateActivityEntry(id, data) {
    const entries = readJSON<ActivityEntry[]>(KEYS.activityEntries, [])
    const index = entries.findIndex((e) => e.id === id)
    if (index === -1) throw new Error(`ActivityEntry ${id} not found`)
    entries[index] = { ...entries[index], ...data, updatedAt: new Date().toISOString() }
    writeJSON(KEYS.activityEntries, entries)
    return entries[index]
  },

  deleteActivityEntry(id) {
    const entries = readJSON<ActivityEntry[]>(KEYS.activityEntries, [])
    const entry = entries.find((e) => e.id === id)
    if (entry?.systemGenerated) throw new Error('Cannot delete a system-generated activity entry')
    writeJSON(KEYS.activityEntries, entries.filter((e) => e.id !== id))
  },

  deleteActivityEntriesForLead(leadId) {
    const entries = readJSON<ActivityEntry[]>(KEYS.activityEntries, [])
    writeJSON(KEYS.activityEntries, entries.filter((e) => e.leadId !== leadId))
  },
}

export const db = localStorageAdapter
