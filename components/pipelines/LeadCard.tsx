'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Lead, PipelineEntry } from '@/types'
import { LeadQualityBadge } from '@/components/ui/Badge'
import { DeleteConfirmDialog } from '@/components/leads/DeleteConfirmDialog'

interface LeadCardProps {
  entry: PipelineEntry
  lead: Lead
  onRemove: (entryId: string) => void
  onViewTasks?: (leadId: string) => void
  onEditLead?: (lead: Lead) => void
  isDragOverlay?: boolean
}

export function LeadCard({ entry, lead, onRemove, onViewTasks, onEditLead, isDragOverlay = false }: LeadCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[88px] rounded-xl bg-gray-200/50"
      />
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative bg-white rounded-xl p-3 select-none ${
          isDragOverlay
            ? 'shadow-xl rotate-1 cursor-grabbing'
            : 'shadow-sm hover:shadow-md cursor-grab transition-shadow duration-150'
        }`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            className="text-sm font-medium text-gray-900 text-left hover:text-indigo-600 transition-colors leading-tight flex-1 min-w-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEditLead?.(lead)
            }}
          >
            {lead.firstName} {lead.lastName}
          </button>
          <div ref={menuRef} className="relative flex-shrink-0">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {onViewTasks && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onViewTasks(lead.id)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    View tasks
                  </button>
                )}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    setConfirmRemove(true)
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Remove from pipeline
                </button>
              </div>
            )}
          </div>
        </div>

        {lead.company && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{lead.company}</p>
        )}

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <LeadQualityBadge quality={lead.leadQuality ?? ''} />
          {lead.estimatedValue && (
            <span className="ml-auto text-xs text-gray-500 font-medium">
              ${Number(lead.estimatedValue).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmRemove}
        title="Remove from pipeline"
        description={
          <span>
            Remove <strong>{lead.firstName} {lead.lastName}</strong> from this pipeline? The lead record will not be deleted.
          </span>
        }
        onConfirm={() => {
          setConfirmRemove(false)
          onRemove(entry.id)
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </>
  )
}
