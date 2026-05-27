'use server'

import { createClient } from '@/lib/supabase-server'
import { mapLead, toLeadRow } from '@/lib/db-mappers'
import type { Lead, LeadFormData } from '@/types'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export async function createLeadAction(data: LeadFormData): Promise<Lead> {
  const { supabase, userId } = await getUserId()
  const row = toLeadRow({ ...data, userId })
  const { data: inserted, error } = await supabase
    .from('leads')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return mapLead(inserted)
}

export async function updateLeadAction(id: string, data: Partial<LeadFormData>): Promise<Lead> {
  const { supabase } = await getUserId()
  const row = toLeadRow(data)
  const { data: updated, error } = await supabase
    .from('leads')
    .update(row)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapLead(updated)
}

export async function deleteLeadAction(id: string): Promise<void> {
  const { supabase } = await getUserId()
  // Delete cascading data first
  await supabase.from('activity_entries').delete().eq('lead_id', id)
  await supabase.from('clients').delete().eq('lead_id', id)
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

export async function importLeadsAction(leads: LeadFormData[]): Promise<Lead[]> {
  const { supabase, userId } = await getUserId()
  const rows = leads.map((data) => toLeadRow({ ...data, userId }))
  const { data: inserted, error } = await supabase
    .from('leads')
    .insert(rows)
    .select()
  if (error) throw error
  const mappedLeads = (inserted ?? []).map(mapLead)
  if (mappedLeads.length > 0) {
    await supabase.from('activity_entries').insert(
      mappedLeads.map((l) => ({
        user_id: userId,
        lead_id: l.id,
        type: 'lead_created',
        title: 'Lead created',
        system_generated: true,
      }))
    )
  }
  return mappedLeads
}
