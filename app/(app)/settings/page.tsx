import { createClient } from '@/lib/supabase-server'
import { mapSettings } from '@/lib/db-mappers'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('*').maybeSingle()
  const initialSettings = mapSettings(data)

  return <SettingsClient initialSettings={initialSettings} />
}
