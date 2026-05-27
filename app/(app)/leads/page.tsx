import { createClient } from '@/lib/supabase-server'
import { mapLead, mapPipeline, mapStage, mapCustomField, mapSettings } from '@/lib/db-mappers'
import { getCurrencySymbol } from '@/lib/currencies'
import { LeadsTable } from '@/components/leads/LeadsTable'

export default async function LeadsPage() {
  const supabase = await createClient()

  const [leadsRes, pipelinesRes, stagesRes, customFieldsRes, settingsRes] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('pipelines').select('*').order('created_at', { ascending: true }),
    supabase.from('pipeline_stages').select('*').order('order', { ascending: true }),
    supabase.from('custom_field_definitions').select('*').eq('entity_type', 'lead'),
    supabase.from('settings').select('*').maybeSingle(),
  ])

  const initialLeads = (leadsRes.data ?? []).map(mapLead)
  const initialPipelines = (pipelinesRes.data ?? []).map(mapPipeline)
  const initialStages = (stagesRes.data ?? []).map(mapStage)
  const initialCustomFields = (customFieldsRes.data ?? []).map(mapCustomField)
  const settings = mapSettings(settingsRes.data)
  const currencySymbol = getCurrencySymbol(settings.currencyCode)

  return (
    <LeadsTable
      initialLeads={initialLeads}
      initialPipelines={initialPipelines}
      initialStages={initialStages}
      initialCustomFields={initialCustomFields}
      currencySymbol={currencySymbol}
    />
  )
}
