import { db } from './storage'
import type { Client, ClientFormData, CustomFieldDefinition } from '@/types'

export function getClients(): Client[] {
  return db.getClients()
}

export function createClient(data: ClientFormData): Client {
  return db.createClient(data)
}

export function updateClient(id: string, data: Partial<Omit<ClientFormData, 'leadId'>>): Client {
  return db.updateClient(id, data)
}

export function deleteClient(id: string): void {
  db.deleteClient(id)
}

export function getClientByLeadId(leadId: string): Client | undefined {
  return db.getClientByLeadId(leadId)
}

export function getClientCustomFields(): CustomFieldDefinition[] {
  return db.getClientCustomFields()
}

export function saveClientCustomFields(fields: CustomFieldDefinition[]): void {
  db.saveClientCustomFields(fields)
}
