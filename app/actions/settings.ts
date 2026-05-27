'use server'

import { createClient } from '@/lib/supabase-server'
import type { AppSettings } from '@/types'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export async function saveSettingsAction(settings: AppSettings): Promise<void> {
  const { supabase, userId } = await getUserId()
  const { error } = await supabase
    .from('settings')
    .upsert(
      { user_id: userId, currency_code: settings.currencyCode },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}
