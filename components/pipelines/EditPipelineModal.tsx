'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DeleteConfirmDialog } from '@/components/leads/DeleteConfirmDialog'
import type { Pipeline } from '@/types'
import { updatePipeline, deletePipeline } from '@/lib/pipelines'

interface EditPipelineModalProps {
  open: boolean
  pipeline: Pipeline
  onClose: () => void
  onUpdated: (pipeline: Pipeline) => void
  onDeleted: (id: string) => void
}

export function EditPipelineModal({ open, pipeline, onClose, onUpdated, onDeleted }: EditPipelineModalProps) {
  const [name, setName] = useState(pipeline.name)
  const [description, setDescription] = useState(pipeline.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      setName(pipeline.name)
      setDescription(pipeline.description ?? '')
    }
  }, [open, pipeline])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    const updated = updatePipeline(pipeline.id, {
      name: trimmedName,
      description: description.trim() || undefined,
    })
    onUpdated(updated)
  }

  function handleDeleteConfirm() {
    deletePipeline(pipeline.id)
    setConfirmDelete(false)
    onDeleted(pipeline.id)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Edit pipeline" maxWidth="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>Save</Button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Danger zone</p>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete pipeline
          </Button>
        </div>
      </Modal>

      <DeleteConfirmDialog
        open={confirmDelete}
        title="Delete pipeline"
        description={
          <span>
            Delete <strong>{pipeline.name}</strong>? All stages and lead entries in this pipeline will be removed.
            Lead records themselves will not be deleted.
          </span>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
