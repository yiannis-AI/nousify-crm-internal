'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { db } from '@/lib/storage'
import type { CustomFieldDefinition, CustomFieldType } from '@/types'

interface CustomFieldsModalProps {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
]

export function CustomFieldsModal({ open, onClose, onChanged }: CustomFieldsModalProps) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<CustomFieldType>('text')
  const [newOptions, setNewOptions] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setFields(db.getCustomFields())
      setNewName('')
      setNewOptions('')
      setError('')
    }
  }, [open])

  function handleAdd() {
    const name = newName.trim()
    if (!name) { setError('Field name is required.'); return }
    if (fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setError('A field with this name already exists.')
      return
    }
    const def: CustomFieldDefinition = {
      id: uuidv4(),
      name,
      type: newType,
      options:
        newType === 'select'
          ? newOptions.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined,
    }
    const updated = [...fields, def]
    db.saveCustomFields(updated)
    setFields(updated)
    setNewName('')
    setNewOptions('')
    setError('')
    onChanged()
  }

  function handleDelete(id: string) {
    const updated = fields.filter((f) => f.id !== id)
    db.saveCustomFields(updated)

    // remove deleted field value from all leads
    db.getLeads().forEach((l) => {
      if (id in (l.customFields ?? {})) {
        const cf = { ...l.customFields }
        delete cf[id]
        db.updateLead(l.id, { customFields: cf })
      }
    })

    setFields(updated)
    onChanged()
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage custom fields" maxWidth="max-w-lg">
      <div className="space-y-5">
        {fields.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Existing fields</p>
            {fields.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-800">{f.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{f.type}</span>
                  {f.options && f.options.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">({f.options.join(', ')})</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Add new field</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Field name"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CustomFieldType)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {newType === 'select' && (
            <input
              type="text"
              placeholder="Options (comma-separated): Option A, Option B"
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button onClick={handleAdd} className="w-full">Add field</Button>
        </div>
      </div>
    </Modal>
  )
}
