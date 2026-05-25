'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Pipeline, PipelineStage, PipelineEntry, Lead } from '@/types'
import {
  getPipelines,
  getStages,
  getEntries,
  addLeadToPipeline,
  removeEntry,
} from '@/lib/pipelines'
import { getLeads } from '@/lib/leads'
import { Button } from '@/components/ui/Button'
import { PipelineBoard } from './PipelineBoard'
import { CreatePipelineModal } from './CreatePipelineModal'
import { EditPipelineModal } from './EditPipelineModal'
import { ManageStagesModal } from './ManageStagesModal'
import { AddLeadModal } from './AddLeadModal'
import { PostMoveNoteModal } from './PostMoveNoteModal'
import { TimelineSlideOver } from '@/components/leads/TimelineSlideOver'
import { LeadSlideOver } from '@/components/leads/LeadSlideOver'
import { createStageChangeEntry, getActivityEntries } from '@/lib/activities'
import type { ActivityEntry } from '@/types'

export function PipelinesView() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [entries, setEntries] = useState<PipelineEntry[]>([])
  const [leads, setLeads] = useState<Lead[]>([])

  const [tasksLeadId, setTasksLeadId] = useState<string | null>(null)
  const [tasksEntries, setTasksEntries] = useState<ActivityEntry[]>([])
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  const [showCreatePipeline, setShowCreatePipeline] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [showManageStages, setShowManageStages] = useState(false)
  const [addLeadStageId, setAddLeadStageId] = useState<string | null>(null)
  const [postMoveData, setPostMoveData] = useState<{ leadId: string; stageName: string } | null>(null)

  const loadAll = useCallback(() => {
    const allPipelines = getPipelines()
    setPipelines(allPipelines)
    setLeads(getLeads())
    if (activePipelineId) {
      setStages(getStages(activePipelineId))
      setEntries(getEntries(activePipelineId))
    }
  }, [activePipelineId])

  useEffect(() => {
    const allPipelines = getPipelines()
    setPipelines(allPipelines)
    setLeads(getLeads())
    if (allPipelines.length > 0 && !activePipelineId) {
      setActivePipelineId(allPipelines[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activePipelineId) {
      setStages(getStages(activePipelineId))
      setEntries(getEntries(activePipelineId))
    } else {
      setStages([])
      setEntries([])
    }
  }, [activePipelineId])

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) ?? null
  const addLeadStage = stages.find((s) => s.id === addLeadStageId) ?? null

  function handlePipelineCreated(pipeline: Pipeline) {
    setPipelines((prev) => [...prev, pipeline])
    setActivePipelineId(pipeline.id)
    setShowCreatePipeline(false)
    setShowManageStages(true)
  }

  function handlePipelineUpdated(updated: Pipeline) {
    setPipelines((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setEditingPipeline(null)
  }

  function handlePipelineDeleted(id: string) {
    const remaining = pipelines.filter((p) => p.id !== id)
    setPipelines(remaining)
    setEditingPipeline(null)
    if (activePipelineId === id) {
      setActivePipelineId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  function handleEditLead(lead: Lead) {
    setEditingLead(lead)
  }

  function handleViewTasks(leadId: string) {
    setTasksLeadId(leadId)
    setTasksEntries(getActivityEntries(leadId))
  }

  function handleStageMoved({ leadId, stageName }: { leadId: string; stageName: string }) {
    setPostMoveData({ leadId, stageName })
  }

function handleAddLead(leadId: string) {
    if (!activePipelineId || !addLeadStageId) return
    const stageEntries = entries.filter((e) => e.stageId === addLeadStageId)
    const entry = addLeadToPipeline(activePipelineId, addLeadStageId, leadId, stageEntries.length)
    setEntries((prev) => [...prev, entry])
    // Auto-log stage assignment as a stage_change entry
    const pipeline = pipelines.find((p) => p.id === activePipelineId)
    const stage = stages.find((s) => s.id === addLeadStageId)
    if (pipeline && stage) {
      createStageChangeEntry({
        leadId,
        pipelineId: activePipelineId,
        pipelineName: pipeline.name,
        newStageName: stage.name,
        newStageId: addLeadStageId,
      })
    }
  }

  function handleRemoveEntry(entryId: string) {
    removeEntry(entryId)
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-8 pt-8 pb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pipelines</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and visualise your sales pipelines.</p>
        </div>
        <div className="flex items-center gap-2">
          {activePipeline && (
            <Button variant="secondary" size="sm" onClick={() => setShowManageStages(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configure
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreatePipeline(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New pipeline
          </Button>
        </div>
      </div>

      {pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No pipelines yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            Create your first pipeline to start tracking leads through stages.
          </p>
          <button
            onClick={() => setShowCreatePipeline(true)}
            className="mt-4 text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
          >
            Create pipeline
          </button>
        </div>
      ) : (
        <>
          {/* Pipeline tabs */}
          <div className="px-8 border-b border-gray-200">
            <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className="flex items-center group flex-shrink-0">
                  <button
                    onClick={() => setActivePipelineId(pipeline.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activePipelineId === pipeline.id
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {pipeline.name}
                  </button>
                  {activePipelineId === pipeline.id && (
                    <button
                      onClick={() => setEditingPipeline(pipeline)}
                      className="ml-0.5 p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity mb-0.5"
                      title="Edit pipeline"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline summary */}
          {stages.length > 0 && (() => {
            const totalValue = entries.reduce((sum, entry) => {
              const lead = leads.find((l) => l.id === entry.leadId)
              return sum + (lead ? parseFloat(lead.estimatedValue) || 0 : 0)
            }, 0)
            return (
              <div className="px-8 py-2.5 flex items-center gap-4 border-b border-gray-100">
                <span className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{entries.length}</span>{' '}
                  {entries.length === 1 ? 'lead' : 'leads'}
                </span>
                {totalValue > 0 && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span className="text-sm text-gray-500">
                      Total value{' '}
                      <span className="font-medium text-gray-700">${totalValue.toLocaleString()}</span>
                    </span>
                  </>
                )}
              </div>
            )
          })()}

          {/* Board area */}
          <div className="flex-1 overflow-hidden px-8 py-6">
            {stages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm font-medium text-gray-700">No stages yet</p>
                <p className="text-sm text-gray-400 mt-1">Add stages to start placing leads on the board.</p>
                <button
                  onClick={() => setShowManageStages(true)}
                  className="mt-4 text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
                >
                  Manage stages
                </button>
              </div>
            ) : (
              <PipelineBoard
                stages={stages}
                entries={entries}
                leads={leads}
                pipelineId={activePipelineId!}
                pipelineName={activePipeline!.name}
                onAddLead={(stageId) => setAddLeadStageId(stageId)}
                onRemoveEntry={handleRemoveEntry}
                onEntriesChange={setEntries}
                onStageMoved={handleStageMoved}
                onViewTasks={handleViewTasks}
                onEditLead={handleEditLead}
              />
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <CreatePipelineModal
        open={showCreatePipeline}
        onClose={() => setShowCreatePipeline(false)}
        onCreated={handlePipelineCreated}
      />

      {editingPipeline && (
        <EditPipelineModal
          open={!!editingPipeline}
          pipeline={editingPipeline}
          onClose={() => setEditingPipeline(null)}
          onUpdated={handlePipelineUpdated}
          onDeleted={handlePipelineDeleted}
        />
      )}

      {activePipeline && (
        <ManageStagesModal
          open={showManageStages}
          pipelineId={activePipeline.id}
          pipelineName={activePipeline.name}
          stages={stages}
          entries={entries}
          onClose={() => setShowManageStages(false)}
          onChanged={loadAll}
        />
      )}

      {addLeadStage && activePipelineId && (
        <AddLeadModal
          open={!!addLeadStageId}
          stageId={addLeadStage.id}
          stageName={addLeadStage.name}
          allLeads={leads}
          existingEntries={entries}
          onClose={() => setAddLeadStageId(null)}
          onAdd={handleAddLead}
        />
      )}

      {postMoveData && (
        <PostMoveNoteModal
          open={!!postMoveData}
          leadId={postMoveData.leadId}
          stageName={postMoveData.stageName}
          onClose={() => setPostMoveData(null)}
          onSaved={() => setPostMoveData(null)}
        />
      )}

      <LeadSlideOver
        open={!!editingLead}
        lead={editingLead}
        onClose={() => setEditingLead(null)}
        onSaved={loadAll}
      />

      <TimelineSlideOver
        open={!!tasksLeadId}
        leadId={tasksLeadId ?? ''}
        leadName={leads.find((l) => l.id === tasksLeadId) ? `${leads.find((l) => l.id === tasksLeadId)!.firstName} ${leads.find((l) => l.id === tasksLeadId)!.lastName}` : ''}
        entries={tasksEntries}
        onClose={() => setTasksLeadId(null)}
        onEntriesChange={() => {
          if (tasksLeadId) setTasksEntries(getActivityEntries(tasksLeadId))
        }}
      />
    </div>
  )
}
