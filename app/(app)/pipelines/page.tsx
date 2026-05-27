import { createClient } from '@/lib/supabase-server'
import { mapPipeline, mapStage, mapLead, mapCustomField } from '@/lib/db-mappers'
import { PipelinesView } from '@/components/pipelines/PipelinesView'

export default async function PipelinesPage() {
  const supabase = await createClient()

  const [pipelinesRes, stagesRes, leadsRes, customFieldsRes] = await Promise.all([
    supabase.from('pipelines').select('*').order('created_at', { ascending: true }),
    supabase.from('pipeline_stages').select('*').order('order', { ascending: true }),
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('custom_field_definitions').select('*').eq('entity_type', 'lead'),
  ])

  const initialPipelines = (pipelinesRes.data ?? []).map(mapPipeline)
  const initialStages = (stagesRes.data ?? []).map(mapStage)
  const initialLeads = (leadsRes.data ?? []).map(mapLead)
  const initialCustomFields = (customFieldsRes.data ?? []).map(mapCustomField)

  return (
    <PipelinesView
      initialPipelines={initialPipelines}
      initialStages={initialStages}
      initialLeads={initialLeads}
      initialCustomFields={initialCustomFields}
    />
  )
}
