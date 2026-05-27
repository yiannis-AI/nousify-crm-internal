'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { Lead, PipelineEntry, PipelineStage } from '@/types'
import { moveLeadToStageAction } from '@/app/actions/pipelines'
import { createStageChangeEntryAction } from '@/app/actions/activities'
import { StageColumn } from './StageColumn'
import { LeadCard } from './LeadCard'

interface PipelineBoardProps {
  stages: PipelineStage[]
  entries: PipelineEntry[]
  leads: Lead[]
  pipelineId: string
  pipelineName: string
  onAddLead: (stageId: string) => void
  onRemoveEntry: (entryId: string) => void
  onLeadMoved: (leadId: string, newStageId: string) => void
  onEntriesChange: (entries: PipelineEntry[]) => void
  onStageMoved: (params: { leadId: string; stageName: string }) => void
  onViewTasks: (leadId: string) => void
  onEditLead: (lead: Lead) => void
}

export function PipelineBoard({
  stages,
  entries,
  leads,
  pipelineId,
  pipelineName,
  onAddLead,
  onRemoveEntry,
  onLeadMoved,
  onEntriesChange,
  onStageMoved,
  onViewTasks,
  onEditLead,
}: PipelineBoardProps) {
  const [activeEntry, setActiveEntry] = useState<PipelineEntry | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart({ active }: DragStartEvent) {
    const entry = entries.find((e) => e.id === active.id)
    setActiveEntry(entry ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveEntry(null)
    if (!over || active.id === over.id) return

    const draggedEntry = entries.find((e) => e.id === active.id)
    if (!draggedEntry) return

    const overIsStage = stages.some((s) => s.id === over.id)
    const targetStageId = overIsStage
      ? (over.id as string)
      : (entries.find((e) => e.id === over.id)?.stageId ?? draggedEntry.stageId)

    const sameStage = draggedEntry.stageId === targetStageId

    if (sameStage) {
      // Reorder within same stage — local state only, no server persistence
      const stageEntries = entries
        .filter((e) => e.stageId === targetStageId)
        .sort((a, b) => a.order - b.order)
      const oldIndex = stageEntries.findIndex((e) => e.id === active.id)
      const newIndex = stageEntries.findIndex((e) => e.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(stageEntries, oldIndex, newIndex).map((e, i) => ({ ...e, order: i }))
      const updatedEntries = entries.map((e) => reordered.find((r) => r.id === e.id) ?? e)
      onEntriesChange(updatedEntries)
    } else {
      // Move to different stage — persist to server
      const previousStageId = draggedEntry.stageId
      const newStage = stages.find((s) => s.id === targetStageId)
      const newStageName = newStage?.name ?? ''
      const newOrder = entries.filter((e) => e.stageId === targetStageId).length

      // Optimistic update
      const updatedEntries = entries.map((e) =>
        e.id === draggedEntry.id ? { ...e, stageId: targetStageId, order: newOrder } : e
      )
      onEntriesChange(updatedEntries)

      // Persist
      await moveLeadToStageAction(draggedEntry.leadId, targetStageId)
      await createStageChangeEntryAction({
        leadId: draggedEntry.leadId,
        pipelineId,
        pipelineName,
        newStageName,
        previousStageId,
        newStageId: targetStageId,
      })

      onLeadMoved(draggedEntry.leadId, targetStageId)
      onStageMoved({ leadId: draggedEntry.leadId, stageName: newStageName })
    }
  }

  const activeLead = activeEntry ? leads.find((l) => l.id === activeEntry.leadId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            entries={entries.filter((e) => e.stageId === stage.id)}
            leads={leads}
            onAddLead={onAddLead}
            onRemoveEntry={onRemoveEntry}
            onViewTasks={onViewTasks}
            onEditLead={onEditLead}
          />
        ))}
      </div>

      <DragOverlay>
        {activeEntry && activeLead && (
          <LeadCard
            entry={activeEntry}
            lead={activeLead}
            onRemove={() => {}}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
