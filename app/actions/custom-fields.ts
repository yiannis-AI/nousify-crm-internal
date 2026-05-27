'use server'

import { createClient } from '@/lib/supabase-server'
import { mapCustomField } from '@/lib/db-mappers'
import type { CustomFieldDefinition } from '@/types'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

async function saveFields(
  entityType: 'lead' | 'client',
  fields: CustomFieldDefinition[]
): Promise<CustomFieldDefinition[]> {
  const { supabase, userId } = await getUserId()
  // Replace all definitions for this entity type
  await supabase
    .from('custom_field_definitions')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)

  if (fields.length === 0) return []

  const rows = fields.map((f) => {
    const row: Record<string, unknown> = {
      user_id: userId,
      entity_type: entityType,
      name: f.name,
      type: f.type,
      options: f.options ?? null,
    }
    if (f.id) row.id = f.id
    return row
  })

  const { data: inserted, error } = await supabase
    .from('custom_field_definitions')
    .insert(rows)
    .select()
  if (error) throw error
  return (inserted ?? []).map(mapCustomField)
}

export async function saveLeadCustomFieldsAction(
  fields: CustomFieldDefinition[]
): Promise<CustomFieldDefinition[]> {
  return saveFields('lead', fields)
}

export async function saveClientCustomFieldsAction(
  fields: CustomFieldDefinition[]
): Promise<CustomFieldDefinition[]> {
  return saveFields('client', fields)
}
