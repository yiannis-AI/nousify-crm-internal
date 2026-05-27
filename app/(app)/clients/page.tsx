import { createClient } from '@/lib/supabase-server'
import { mapClient, mapLead, mapCustomField, mapSettings } from '@/lib/db-mappers'
import { getCurrencySymbol } from '@/lib/currencies'
import { ClientsTable } from '@/components/clients/ClientsTable'

export default async function ClientsPage() {
  const supabase = await createClient()

  const [clientsRes, leadsRes, customFieldsRes, settingsRes] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('leads').select('*'),
    supabase.from('custom_field_definitions').select('*').eq('entity_type', 'client'),
    supabase.from('settings').select('*').maybeSingle(),
  ])

  const initialClients = (clientsRes.data ?? []).map(mapClient)
  const initialLeads = (leadsRes.data ?? []).map(mapLead)
  const initialCustomFields = (customFieldsRes.data ?? []).map(mapCustomField)
  const settings = mapSettings(settingsRes.data)
  const currencySymbol = getCurrencySymbol(settings.currencyCode)

  return (
    <ClientsTable
      initialClients={initialClients}
      initialLeads={initialLeads}
      initialCustomFields={initialCustomFields}
      currencySymbol={currencySymbol}
    />
  )
}
