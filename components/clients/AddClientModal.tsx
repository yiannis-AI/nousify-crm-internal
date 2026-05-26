'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getLeads } from '@/lib/leads'
import { createClient, getClientCustomFields } from '@/lib/clients'
import { createClientConvertedEntry, createActivityEntry } from '@/lib/activities'
import type { Lead, ClientStatus, CustomFieldDefinition } from '@/types'

interface AddClientModalProps {
  open: boolean
  onClose: () => void
  onAdded: () => void
  preselectedLead?: Lead | null
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

export function AddClientModal({ open, onClose, onAdded, preselectedLead }: AddClientModalProps) {
  const [step, setStep] = useState<'search' | 'confirm'>('search')
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [contractValue, setContractValue] = useState('')
  const [clientSince, setClientSince] = useState(new Date().toISOString().split('T')[0])
  const [renewalDate, setRenewalDate] = useState('')
  const [status, setStatus] = useState<ClientStatus>('active')
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [initialNote, setInitialNote] = useState('')
  const [docName, setDocName] = useState('')
  const [docUrl, setDocUrl] = useState('')

  useEffect(() => {
    if (open) {
      setLeads(getLeads().filter((l) => !l.isClient))
      setContractValue('')
      setClientSince(new Date().toISOString().split('T')[0])
      setRenewalDate('')
      setStatus('active')
      const cfs = getClientCustomFields()
      setCustomFields(cfs)
      setCustomFieldValues({})
      setInitialNote('')
      setDocName('')
      setDocUrl('')
      if (preselectedLead) {
        setSelectedLead(preselectedLead)
        setStep('confirm')
      } else {
        setStep('search')
        setSearch('')
        setSelectedLead(null)
      }
    }
  }, [open, preselectedLead])

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase()
    return (
      !q ||
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q)
    )
  })

  function handleSelectLead(lead: Lead) {
    setSelectedLead(lead)
    setStep('confirm')
  }

  function handleBack() {
    setStep('search')
    setSelectedLead(null)
  }

  function handleConfirm() {
    if (!selectedLead) return
    createClient({
      leadId: selectedLead.id,
      contractValue,
      clientSince,
      renewalDate,
      status,
      customFields: customFieldValues,
    })
    createClientConvertedEntry(selectedLead.id)
    if (initialNote.trim()) {
      createActivityEntry({
        leadId: selectedLead.id,
        type: 'note',
        title: 'Initial note',
        description: initialNote.trim(),
        systemGenerated: false,
      })
    }
    if (docName.trim() && docUrl.trim()) {
      createActivityEntry({
        leadId: selectedLead.id,
        type: 'document',
        title: docName.trim(),
        attachment: { name: docName.trim(), url: docUrl.trim() },
        systemGenerated: false,
      })
    }
    onAdded()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add client" maxWidth="max-w-lg">
      {step === 'search' ? (
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search by name, email or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className={inputClass}
          />
          <div className="max-h-72 overflow-y-auto -mx-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                {leads.length === 0 ? 'No leads available to convert.' : 'No leads match your search.'}
              </p>
            ) : (
              filtered.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {[lead.company, lead.email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Selected lead summary */}
          <div className="rounded-lg bg-gray-50 px-4 py-3 border border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Converting lead</p>
            <p className="text-sm font-medium text-gray-900">
              {selectedLead?.firstName} {selectedLead?.lastName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[selectedLead?.company, selectedLead?.email].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Client fields */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Client details</p>
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
          </div>

          {/* Custom fields */}
          {customFields.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Custom fields</p>
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
            </div>
          )}

          {/* Note + document */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Note (optional)</p>
            <textarea
              placeholder="Add a short note…"
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-4 mb-2">Attach a document (optional)</p>
            <div className="space-y-2">
              <input
                placeholder="Document name"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className={inputClass}
              />
              <input
                type="url"
                placeholder="https://…"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleConfirm}>Add client</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
