'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Lead, PipelineEntry, PipelineStage } from '@/types'
import { STAGE_COLORS, type StageColorKey } from './stageColors'
import { LeadCard } from './LeadCard'

interface StageColumnProps {
  stage: PipelineStage
  entries: PipelineEntry[]
  leads: Lead[]
  onAddLead: (stageId: string) => void
  onRemoveEntry: (entryId: string) => void
  onViewTasks: (leadId: string) => void
  onEditLead: (lead: Lead) => void
}

export function StageColumn({ stage, entries, leads, onAddLead, onRemoveEntry, onViewTasks, onEditLead }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const colorKey = (stage.color ?? 'blue') as StageColorKey
  const colors = STAGE_COLORS[colorKey] ?? STAGE_COLORS.blue

  const sortedEntries = [...entries].sort((a, b) => a.order - b.order)

  const stageValue = entries.reduce((sum, entry) => {
    const lead = leads.find((l) => l.id === entry.leadId)
    return sum + (lead ? parseFloat(lead.estimatedValue) || 0 : 0)
  }, 0)

  return (
    <div className={`flex flex-col w-64 flex-shrink-0 self-start rounded-2xl shadow-sm transition-colors duration-150 ${colors.borderTop} ${
      isOver ? colors.bgOver : colors.bg
    }`}>
      {/* Column header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest truncate text-gray-700">
            {stage.name}
          </h3>
          {stageValue > 0 && (
            <p className="text-xs mt-0.5 tabular-nums font-medium text-gray-500">${stageValue.toLocaleString()}</p>
          )}
        </div>
        <span className="text-xs font-semibold tabular-nums mt-0.5 flex-shrink-0 text-gray-500">
          {entries.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="min-h-[60px] overflow-y-auto px-2"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        <SortableContext items={sortedEntries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortedEntries.map((entry) => {
              const lead = leads.find((l) => l.id === entry.leadId)
              if (!lead) return null
              return (
                <LeadCard
                  key={entry.id}
                  entry={entry}
                  lead={lead}
                  onRemove={onRemoveEntry}
                  onViewTasks={onViewTasks}
                  onEditLead={onEditLead}
                />
              )
            })}
          </div>
        </SortableContext>
      </div>

      {/* Add lead */}
      <div className="p-2">
        <button
          onClick={() => onAddLead(stage.id)}
          className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium transition-colors text-gray-400 hover:text-gray-600 hover:bg-white/60"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
