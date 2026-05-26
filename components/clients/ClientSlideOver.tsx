'use client'

import { useState, useEffect } from 'react'
import { SlideOver } from '@/components/ui/SlideOver'
import { Button } from '@/components/ui/Button'
import { TimelineSlideOver } from '@/components/leads/TimelineSlideOver'
import { updateClient, getClientCustomFields } from '@/lib/clients'
import { getLeadById } from '@/lib/leads'
import { getActivityEntries } from '@/lib/activities'
import type { Client, ClientStatus, Lead, ActivityEntry, CustomFieldDefinition } from '@/types'

interface ClientSlideOverProps {
  open: boolean
  client: Client | null
  onClose: () => void
  onSaved: () => void
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

export function ClientSlideOver({ open, client, onClose, onSaved }: ClientSlideOverProps) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [contractValue, setContractValue] = useState('')
  const [clientSince, setClientSince] = useState('')
  const [renewalDate, setRenewalDate] = useState('')
  const [status, setStatus] = useState<ClientStatus>('active')
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineEntries, setTimelineEntries] = useState<ActivityEntry[]>([])

  useEffect(() => {
    if (open && client) {
      setLead(getLeadById(client.leadId) ?? null)
      setContractValue(client.contractValue)
      setClientSince(client.clientSince)
      setRenewalDate(client.renewalDate)
      setStatus(client.status)
      const cfs = getClientCustomFields()
      setCustomFields(cfs)
      setCustomFieldValues({ ...client.customFields })
    }
  }, [open, client])

  function handleSave() {
    if (!client) return
    updateClient(client.id, { contractValue, clientSince, renewalDate, status, customFields: customFieldValues })
    onSaved()
    onClose()
  }

  function handleViewTimeline() {
    if (!client) return
    setTimelineEntries(getActivityEntries(client.leadId))
    setTimelineOpen(true)
  }

  const leadName = lead ? `${lead.firstName} ${lead.lastName}` : ''

  return (
    <>
      <SlideOver open={open} onClose={onClose} title={leadName || 'Client'} size="lg">
        <div className="px-6 py-4 flex flex-col gap-5">
          {/* Contact — read-only from lead */}
          <Section label="Contact">
            <div className="space-y-1 text-sm">
              <Row label="Name" value={leadName} />
              <Row label="Email" value={lead?.email} />
              <Row label="Phone" value={lead?.phone} />
              <Row label="Company" value={lead?.company} />
              <Row label="Job Title" value={lead?.jobTitle} />
              {lead?.website && (
                <div className="flex items-start gap-2 py-1">
                  <span className="text-gray-400 w-24 flex-shrink-0">Website</span>
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 hover:text-gray-900 underline truncate"
                  >
                    {lead.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </Section>

          {/* Client details — editable */}
          <Section label="Client details">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contract Value</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClientStatus)}
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="at_risk">At Risk</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Client Since</label>
                <input
                  type="date"
                  value={clientSince}
                  onChange={(e) => setClientSince(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Renewal Date</label>
                <input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </Section>

          {/* Custom fields */}
          {customFields.length > 0 && (
            <Section label="Custom fields">
              <div className="space-y-3">
                {customFields.map((cf) => (
                  <div key={cf.id}>
                    <label className="block text-xs text-gray-500 mb-1">{cf.name}</label>
                    {cf.type === 'select' && cf.options ? (
                      <select
                        value={customFieldValues[cf.id] ?? ''}
                        onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [cf.id]: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="">Select…</option>
                        {cf.options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                        value={customFieldValues[cf.id] ?? ''}
                        onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [cf.id]: e.target.value }))}
                        className={inputClass}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Timeline shortcut */}
          <div>
            <button
              onClick={handleViewTimeline}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View activity timeline
            </button>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </div>
      </SlideOver>

      <TimelineSlideOver
        open={timelineOpen}
        leadId={client?.leadId ?? ''}
        leadName={leadName}
        entries={timelineEntries}
        onClose={() => setTimelineOpen(false)}
        onEntriesChange={() => {
          if (client) setTimelineEntries(getActivityEntries(client.leadId))
        }}
      />
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-gray-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-700">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  )
}
