'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createActivityEntry, updateActivityEntry } from '@/lib/activities'
import type { ActivityEntry, ActivityEntryType } from '@/types'

interface ActivityEntryFormProps {
  open: boolean
  leadId: string
  entry?: ActivityEntry
  onClose: () => void
  onSaved: () => void
}

export function ActivityEntryForm({ open, leadId, entry, onClose, onSaved }: ActivityEntryFormProps) {
  const isEdit = !!entry
  const [type, setType] = useState<'note' | 'document'>('note')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachName, setAttachName] = useState('')
  const [attachUrl, setAttachUrl] = useState('')
  const [showAttach, setShowAttach] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (entry) {
        setType((entry.type === 'note' || entry.type === 'document') ? entry.type : 'note')
        setTitle(entry.title)
        setDescription(entry.description ?? '')
        setAttachName(entry.attachment?.name ?? '')
        setAttachUrl(entry.attachment?.url ?? '')
        setShowAttach(!!entry.attachment)
      } else {
        setType('note')
        setTitle('')
        setDescription('')
        setAttachName('')
        setAttachUrl('')
        setShowAttach(false)
      }
      setErrors({})
    }
  }, [open, entry])

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    if (title.trim().length > 80) e.title = 'Title must be 80 characters or fewer'
    if ((attachName.trim() && !attachUrl.trim()) || (!attachName.trim() && attachUrl.trim())) {
      e.attach = 'Both document name and URL are required'
    }
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    const attachment = attachName.trim() && attachUrl.trim()
      ? { name: attachName.trim(), url: attachUrl.trim() }
      : undefined

    if (isEdit && entry) {
      updateActivityEntry(entry.id, {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        attachment,
      })
    } else {
      createActivityEntry({
        leadId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        attachment,
        systemGenerated: false,
      })
    }

    onSaved()
    onClose()
  }

  const inputClass = (field?: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
      field && errors[field] ? 'border-red-300' : 'border-gray-200'
    }`

  const effectiveType: ActivityEntryType = type

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit entry' : 'New entry'}
    >
      <div className="space-y-4">
        {/* Type toggle — only in create mode */}
        {!isEdit && (
          <div className="flex gap-2">
            {(['note', 'document'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  type === t
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t === 'note' ? 'Note' : 'Document'}
              </button>
            ))}
          </div>
        )}

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">Title <span className="text-red-400">*</span></label>
            <span className={`text-xs ${title.length > 80 ? 'text-red-400' : 'text-gray-400'}`}>
              {title.length}/80
            </span>
          </div>
          <input
            placeholder={effectiveType === 'document' ? 'Proposal v1, NDA, Contract…' : 'Intro call, Follow-up, Meeting…'}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors((prev) => ({ ...prev, title: '' })) }}
            maxLength={80}
            className={inputClass('title')}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Description <span className="text-gray-400">(optional)</span></label>
          <textarea
            placeholder="Add details…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputClass()} resize-none`}
          />
        </div>

        {/* Attachment — always shown for document, toggleable for note */}
        {effectiveType === 'document' ? (
          <div className="space-y-2">
            <label className="block text-xs text-gray-500">Document link</label>
            <input
              placeholder="Document name"
              value={attachName}
              onChange={(e) => { setAttachName(e.target.value); setErrors((prev) => ({ ...prev, attach: '' })) }}
              className={inputClass('attach')}
            />
            <input
              type="url"
              placeholder="https://…"
              value={attachUrl}
              onChange={(e) => { setAttachUrl(e.target.value); setErrors((prev) => ({ ...prev, attach: '' })) }}
              className={inputClass('attach')}
            />
            {errors.attach && <p className="text-xs text-red-500">{errors.attach}</p>}
          </div>
        ) : (
          <div>
            {!showAttach ? (
              <button
                onClick={() => setShowAttach(true)}
                className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
              >
                Attach a document
              </button>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs text-gray-500">Attachment (optional)</label>
                <input
                  placeholder="Document name"
                  value={attachName}
                  onChange={(e) => { setAttachName(e.target.value); setErrors((prev) => ({ ...prev, attach: '' })) }}
                  className={inputClass('attach')}
                />
                <input
                  type="url"
                  placeholder="https://…"
                  value={attachUrl}
                  onChange={(e) => { setAttachUrl(e.target.value); setErrors((prev) => ({ ...prev, attach: '' })) }}
                  className={inputClass('attach')}
                />
                {errors.attach && <p className="text-xs text-red-500">{errors.attach}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>{isEdit ? 'Save changes' : 'Add entry'}</Button>
      </div>
    </Modal>
  )
}
