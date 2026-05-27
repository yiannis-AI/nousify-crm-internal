'use server'

import { createClient } from '@/lib/supabase-server'
import { mapClient, toClientRow } from '@/lib/db-mappers'
import type { Client, ClientFormData } from '@/types'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export async function createClientAction(data: ClientFormData): Promise<Client> {
  const { supabase, userId } = await getUserId()
  const row = toClientRow({ ...data, userId })
  const { data: inserted, error } = await supabase
    .from('clients')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  // Mark lead as converted
  await supabase.from('leads').update({ is_client: true }).eq('id', data.leadId)
  return mapClient(inserted)
}

export async function updateClientAction(
  id: string,
  data: Partial<Omit<ClientFormData, 'leadId'>>
): Promise<Client> {
  const { supabase } = await getUserId()
  const row = toClientRow(data)
  const { data: updated, error } = await supabase
    .from('clients')
    .update(row)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapClient(updated)
}

export async function deleteClientAction(id: string): Promise<{ leadId: string }> {
  const { supabase } = await getUserId()
  // Fetch client first to get leadId for clearing is_client
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('lead_id')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
  // Unmark the lead
  await supabase.from('leads').update({ is_client: false }).eq('id', client.lead_id)
  return { leadId: client.lead_id }
}
