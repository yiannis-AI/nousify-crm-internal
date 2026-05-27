'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { deleteActivityEntryAction } from '@/app/actions/activities'
import { DeleteConfirmDialog } from '@/components/leads/DeleteConfirmDialog'
import { ActivityEntryForm } from './ActivityEntryForm'
import type { ActivityEntry, ActivityEntryType } from '@/types'

interface ActivityTimelineProps {
  leadId: string
  initialEntries: ActivityEntry[]
}

const DOT_COLORS: Record<ActivityEntryType, string> = {
  lead_created: 'bg-emerald-400',
  note: 'bg-blue-400',
  document: 'bg-purple-400',
  stage_change: 'bg-gray-300',
  client_converted: 'bg-emerald-400',
}

const TYPE_LABELS: Record<ActivityEntryType, string> = {
  lead_created: 'Created',
  note: 'Note',
  document: 'Document',
  stage_change: 'Pipeline update',
  client_converted: 'Client conversion',
}

export function ActivityTimeline({ leadId, initialEntries }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>(initialEntries)

  useEffect(() => {
    setEntries(initialEntries)
  }, [leadId])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<ActivityEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<ActivityEntry | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  // lead_created always first, then oldest → newest
  const sorted = [...entries].sort((a, b) => {
    if (a.type === 'lead_created') return -1
    if (b.type === 'lead_created') return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  function handleEdit(entry: ActivityEntry) {
    setEditingEntry(entry)
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deletingEntry) return
    await deleteActivityEntryAction(deletingEntry.id)
    setEntries((prev) => prev.filter((e) => e.id !== deletingEntry.id))
    if (expandedId === deletingEntry.id) setExpandedId(null)
    setDeletingEntry(null)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditingEntry(null)
  }

  function handleEntrySaved(saved: ActivityEntry) {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === saved.id)
      return exists ? prev.map((e) => e.id === saved.id ? saved : e) : [...prev, saved]
    })
  }

  if (entries.length === 0) {
    return (
      <>
        <div className="text-sm text-gray-400 py-4">
          No activity yet —{' '}
          <button
            onClick={() => { setEditingEntry(null); setFormOpen(true) }}
            className="underline underline-offset-2 hover:text-gray-600 transition-colors"
          >
            add a note or document
          </button>{' '}
          to get started.
        </div>
        <ActivityEntryForm
          open={formOpen}
          leadId={leadId}
          entry={editingEntry ?? undefined}
          onClose={handleFormClose}
          onSaved={handleEntrySaved}
        />
      </>
    )
  }

  return (
    <>
      <div className="relative">
        {/* Spine */}
        <div className="absolute left-[17px] top-1 bottom-9 w-px bg-gray-200" />

        {sorted.map((entry) => {
          const isExpanded = expandedId === entry.id
          return (
            <div key={entry.id} className="relative pb-7">
              <div
                className={`absolute left-[17px] -translate-x-1/2 top-[5px] w-2.5 h-2.5 rounded-full z-10 ring-2 ring-white ${DOT_COLORS[entry.type]}`}
              />

              <button
                className="w-full text-left pl-9"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">
                      {TYPE_LABELS[entry.type]}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{entry.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {format(new Date(entry.createdAt), 'MMM d, yyyy, h:mm a')}
                      </div>
                      <div className="text-xs text-gray-300 whitespace-nowrap">
                        {formatDistanceToNowStrict(new Date(entry.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-3 pl-9 space-y-3">
                  {entry.description && (
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{entry.description}</p>
                  )}
                  {entry.attachment && (
                    <a
                      href={entry.attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {entry.attachment.name}
                    </a>
                  )}
                  {!entry.systemGenerated && (
                    <div className="flex items-center gap-3 pt-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(entry) }}
                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingEntry(entry) }}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Add entry row */}
        <div className="relative">
          <button
            onClick={() => { setEditingEntry(null); setFormOpen(true) }}
            className="absolute left-[17px] -translate-x-1/2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-dashed border-gray-300 bg-white flex items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors z-10"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => { setEditingEntry(null); setFormOpen(true) }}
            className="pl-9 py-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Add note or document
          </button>
        </div>
      </div>

      <ActivityEntryForm
        open={formOpen}
        leadId={leadId}
        entry={editingEntry ?? undefined}
        onClose={handleFormClose}
        onSaved={handleEntrySaved}
      />

      <DeleteConfirmDialog
        open={!!deletingEntry}
        title="Delete entry"
        description={
          <span>Delete <strong>{deletingEntry?.title}</strong>? This cannot be undone.</span>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingEntry(null)}
      />
    </>
  )
}
