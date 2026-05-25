import { db } from './storage'
import type { Lead, LeadFormData, SortConfig } from '@/types'

export function getLeads(): Lead[] {
  return db.getLeads()
}

export function createLead(data: LeadFormData): Lead {
  return db.createLead(data)
}

export function updateLead(id: string, data: Partial<LeadFormData>): Lead {
  return db.updateLead(id, data)
}

export function deleteLead(id: string): void {
  db.deleteLead(id)
}

export function getLeadById(id: string): Lead | undefined {
  return db.getLeads().find((l) => l.id === id)
}

export function sortLeads(leads: Lead[], sort: SortConfig): Lead[] {
  return [...leads].sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sort.key] ?? ''
    const bVal = (b as unknown as Record<string, unknown>)[sort.key] ?? ''
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
    return sort.direction === 'asc' ? cmp : -cmp
  })
}

export function filterLeads(
  leads: Lead[],
  { search, pipelineId, stageId }: { search: string; pipelineId: string; stageId: string }
): Lead[] {
  const q = search.toLowerCase()
  return leads.filter((l) => {
    const matchesSearch =
      !q ||
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q)
    const matchesPipeline = !pipelineId || l.pipelineId === pipelineId
    const matchesStage = !stageId || l.stageId === stageId
    return matchesSearch && matchesPipeline && matchesStage
  })
}

export function findLeadByEmail(email: string, excludeId?: string): Lead | undefined {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return undefined
  return db.getLeads().find(
    (l) => l.email.trim().toLowerCase() === normalized && l.id !== excludeId
  )
}

export function emptyLeadForm(): LeadFormData {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    website: '',
    company: '',
    jobTitle: '',
    pipelineId: '',
    stageId: '',
    estimatedValue: '',
    leadQuality: '',
    notes: '',
    customFields: {},
  }
}
