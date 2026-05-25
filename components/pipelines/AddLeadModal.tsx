'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Lead, PipelineEntry } from '@/types'

interface AddLeadModalProps {
  open: boolean
  stageId: string
  stageName: string
  allLeads: Lead[]
  existingEntries: PipelineEntry[]
  onClose: () => void
  onAdd: (leadId: string) => void
}

export function AddLeadModal({
  open,
  stageName,
  allLeads,
  existingEntries,
  onClose,
  onAdd,
}: AddLeadModalProps) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) setSearch('')
  }, [open])

  const alreadyInPipeline = new Set(existingEntries.map((e) => e.leadId))

  const filtered = allLeads.filter((lead) => {
    if (alreadyInPipeline.has(lead.id)) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.company.toLowerCase().includes(q)
    )
  })

  return (
    <Modal open={open} onClose={onClose} title={`Add lead to "${stageName}"`} maxWidth="max-w-sm">
      <div className="space-y-3">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or company…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />

        <div className="max-h-64 overflow-y-auto -mx-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {search ? 'No matching leads found.' : 'All leads are already in this pipeline.'}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((lead) => (
                <li key={lead.id}>
                  <button
                    onClick={() => { onAdd(lead.id); onClose() }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{lead.company || lead.email}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
