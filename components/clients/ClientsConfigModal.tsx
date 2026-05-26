'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DeleteConfirmDialog } from '@/components/leads/DeleteConfirmDialog'
import { db } from '@/lib/storage'
import { getClients, updateClient } from '@/lib/clients'
import type { CustomFieldDefinition, CustomFieldType } from '@/types'

interface ClientsConfigModalProps {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

interface PendingDelete {
  title: string
  description: React.ReactNode
  onConfirm: () => void
}

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text',   label: 'Text'   },
  { value: 'number', label: 'Number' },
  { value: 'date',   label: 'Date'   },
  { value: 'select', label: 'Select' },
]

export function ClientsConfigModal({ open, onClose, onChanged }: ClientsConfigModalProps) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [fields, setFields]         = useState<CustomFieldDefinition[]>([])
  const [newName, setNewName]       = useState('')
  const [newType, setNewType]       = useState<CustomFieldType>('text')
  const [newOptions, setNewOptions] = useState('')
  const [addError, setAddError]     = useState('')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editLabel, setEditLabel]   = useState('')
  const [editError, setEditError]   = useState('')

  useEffect(() => {
    if (open) {
      setFields(db.getClientCustomFields())
      setNewName(''); setNewOptions(''); setAddError('')
      setEditingId(null); setEditError('')
    }
  }, [open])

  function handleAdd() {
    const name = newName.trim()
    if (!name) { setAddError('Field name is required.'); return }
    if (fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setAddError('A field with this name already exists.')
      return
    }
    const def: CustomFieldDefinition = {
      id: uuidv4(), name, type: newType,
      options: newType === 'select'
        ? newOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined,
    }
    const updated = [...fields, def]
    db.saveClientCustomFields(updated)
    setFields(updated)
    setNewName(''); setNewOptions(''); setAddError('')
    onChanged()
  }

  function confirmDelete(f: CustomFieldDefinition) {
    setPendingDelete({
      title: 'Delete custom field',
      description: (
        <>
          Are you sure you want to delete the{' '}
          <span className="font-medium text-gray-900">&quot;{f.name}&quot;</span> field?
          All data stored in this field across your clients will be permanently lost.
        </>
      ),
      onConfirm: () => {
        const updated = fields.filter((x) => x.id !== f.id)
        db.saveClientCustomFields(updated)
        getClients().forEach((c) => {
          if (f.id in (c.customFields ?? {})) {
            const cf = { ...c.customFields }
            delete cf[f.id]
            updateClient(c.id, { customFields: cf })
          }
        })
        setFields(updated)
        onChanged()
      },
    })
  }

  function startEdit(f: CustomFieldDefinition) {
    setEditingId(f.id)
    setEditLabel(f.name)
    setEditError('')
  }

  function saveEdit(id: string) {
    const name = editLabel.trim()
    if (!name) { setEditError('Name cannot be empty.'); return }
    if (fields.some((f) => f.id !== id && f.name.toLowerCase() === name.toLowerCase())) {
      setEditError('A field with this name already exists.')
      return
    }
    const updated = fields.map((f) => f.id === id ? { ...f, name } : f)
    db.saveClientCustomFields(updated)
    setFields(updated)
    setEditingId(null)
    onChanged()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Custom fields" maxWidth="max-w-lg">
        <div className="space-y-5">
          {fields.length > 0 ? (
            <div className="space-y-1.5">
              {fields.map((f) => (
                <div key={f.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50">
                  {editingId === f.id ? (
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          value={editLabel}
                          onChange={(e) => { setEditLabel(e.target.value); setEditError('') }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(f.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                          className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <button onClick={() => saveEdit(f.id)} className="text-xs font-medium text-gray-700 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200 transition-colors">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors">Cancel</button>
                      </div>
                      {editError && <p className="text-xs text-red-500 pl-1">{editError}</p>}
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-gray-800 truncate">{f.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{f.type}</span>
                        {f.options && f.options.length > 0 && (
                          <span className="text-xs text-gray-400 truncate">({f.options.join(', ')})</span>
                        )}
                      </div>
                      <button onClick={() => startEdit(f)} className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded" title="Rename">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => confirmDelete(f)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-1">No custom fields yet.</p>
          )}

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Add field</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Field name"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setAddError('') }}
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
            {addError && <p className="text-xs text-red-500">{addError}</p>}
            <Button onClick={handleAdd} className="w-full">Add field</Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete?.title ?? ''}
        description={pendingDelete?.description}
        onConfirm={() => { pendingDelete?.onConfirm(); setPendingDelete(null) }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
