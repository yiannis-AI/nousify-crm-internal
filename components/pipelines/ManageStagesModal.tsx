'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DeleteConfirmDialog } from '@/components/leads/DeleteConfirmDialog'
import type { PipelineStage, PipelineEntry } from '@/types'
import { createStageAction, updateStageAction, deleteStageAction, reorderStagesAction } from '@/app/actions/pipelines'
import { STAGE_COLORS, COLOR_KEYS, type StageColorKey } from './stageColors'

interface ManageStagesModalProps {
  open: boolean
  pipelineId: string
  pipelineName: string
  stages: PipelineStage[]
  entries: PipelineEntry[]
  onClose: () => void
  onChanged: (stages: PipelineStage[]) => void
}

interface PendingDelete {
  stageId: string
  stageName: string
  entryCount: number
}

function ColorPicker({
  value,
  onChange,
}: {
  value: StageColorKey
  onChange: (key: StageColorKey) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full ring-1 ring-black/10 hover:scale-110 transition-transform flex-shrink-0"
        style={{ backgroundColor: STAGE_COLORS[value].dot }}
        title="Change colour"
      />
      {open && (
        <div className="absolute left-0 top-6 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-2.5 flex gap-1.5 flex-wrap w-[136px]">
          {COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { onChange(key); setOpen(false) }}
              className={`w-4 h-4 rounded-full ring-1 ring-black/10 hover:scale-110 transition-transform ${
                value === key ? 'ring-2 ring-offset-1 ring-gray-500 scale-110' : ''
              }`}
              style={{ backgroundColor: STAGE_COLORS[key].dot }}
              title={key}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SortableStageRow({
  stage,
  onRename,
  onColorChange,
  onDelete,
}: {
  stage: PipelineStage
  onRename: (id: string, name: string) => void
  onColorChange: (id: string, color: StageColorKey) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(stage.name)
  const [draftColor, setDraftColor] = useState<StageColorKey>((stage.color ?? 'blue') as StageColorKey)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== stage.name) onRename(stage.id, trimmed)
    else setDraft(stage.name)
    setEditing(false)
  }

  function handleColorChange(key: StageColorKey) {
    setDraftColor(key)
    onColorChange(stage.id, key)
  }

  const colorKey = (stage.color ?? 'blue') as StageColorKey

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg group ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 py-2 px-1">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-400 cursor-grab p-1 -ml-1 flex-shrink-0"
          tabIndex={-1}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <ColorPicker value={draftColor} onChange={handleColorChange} />

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setDraft(stage.name); setEditing(false) }
            }}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        ) : (
          <span className="flex-1 text-sm text-gray-700">{stage.name}</span>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Rename"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(stage.id)}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  )
}

export function ManageStagesModal({
  open,
  pipelineId,
  pipelineName,
  stages: initialStages,
  entries,
  onClose,
  onChanged,
}: ManageStagesModalProps) {
  const [stages, setStages] = useState<PipelineStage[]>(initialStages)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<StageColorKey>('blue')
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  useEffect(() => {
    setStages(initialStages)
  }, [initialStages])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIndex = stages.findIndex((s) => s.id === active.id)
    const newIndex = stages.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }))
    setStages(reordered)
    await reorderStagesAction(reordered)
    onChanged(reordered)
  }

  async function handleAddStage() {
    const name = newName.trim()
    if (!name) return
    const stage = await createStageAction({ pipelineId, name, order: stages.length, color: newColor })
    const updated = [...stages, stage]
    setStages(updated)
    setNewName('')
    setNewColor('blue')
    onChanged(updated)
  }

  async function handleRename(id: string, name: string) {
    await updateStageAction(id, { name })
    const updated = stages.map((s) => (s.id === id ? { ...s, name } : s))
    setStages(updated)
    onChanged(updated)
  }

  async function handleColorChange(id: string, color: StageColorKey) {
    await updateStageAction(id, { color })
    const updated = stages.map((s) => (s.id === id ? { ...s, color } : s))
    setStages(updated)
    onChanged(updated)
  }

  function handleDeleteRequest(stageId: string) {
    const stage = stages.find((s) => s.id === stageId)
    if (!stage) return
    const entryCount = entries.filter((e) => e.stageId === stageId).length
    setPendingDelete({ stageId, stageName: stage.name, entryCount })
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return
    await deleteStageAction(pendingDelete.stageId)
    const updated = stages.filter((s) => s.id !== pendingDelete.stageId)
    setStages(updated)
    setPendingDelete(null)
    onChanged(updated)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Manage stages — ${pipelineName}`} maxWidth="max-w-md">
        <div className="space-y-1 mb-4 min-h-[48px]">
          {stages.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No stages yet. Add one below.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {stages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onRename={handleRename}
                    onColorChange={handleColorChange}
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <ColorPicker value={newColor} onChange={setNewColor} />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddStage() }}
              placeholder="New stage name"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <Button onClick={handleAddStage} disabled={!newName.trim()}>
              Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={!!pendingDelete}
        title="Delete stage"
        description={
          pendingDelete ? (
            pendingDelete.entryCount > 0 ? (
              <span>
                <strong>{pendingDelete.stageName}</strong> has{' '}
                <strong>{pendingDelete.entryCount} lead{pendingDelete.entryCount !== 1 ? 's' : ''}</strong> in it.
                Deleting this stage will remove those leads from this pipeline. The lead records themselves will not be deleted.
              </span>
            ) : (
              <span>Delete stage <strong>{pendingDelete.stageName}</strong>? This cannot be undone.</span>
            )
          ) : null
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
