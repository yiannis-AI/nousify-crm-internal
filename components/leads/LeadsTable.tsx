'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Badge, LeadQualityBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { LeadSlideOver } from './LeadSlideOver'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { LeadsConfigModal } from './LeadsConfigModal'
import { TimelineSlideOver } from './TimelineSlideOver'
import { db } from '@/lib/storage'
import { getLeads, deleteLead, filterLeads, sortLeads } from '@/lib/leads'
import { getPipelines, getStages } from '@/lib/pipelines'
import { getActivityEntries } from '@/lib/activities'
import type { Lead, Pipeline, PipelineStage, CustomFieldDefinition, SortConfig, ActivityEntry } from '@/types'

const DEFAULT_COLUMNS = [
  { key: 'name',           label: 'Name',            visible: true  },
  { key: 'email',          label: 'Email',           visible: true  },
  { key: 'company',        label: 'Company',         visible: true  },
  { key: 'pipelineId',     label: 'Pipeline',        visible: true  },
  { key: 'stageId',        label: 'Stage',           visible: true  },
  { key: 'leadQuality',    label: 'Lead Quality',    visible: true  },
  { key: 'estimatedValue', label: 'Est. Value',      visible: true  },
  { key: 'createdAt',      label: 'Created',         visible: true  },
  { key: 'phone',          label: 'Phone',           visible: false },
  { key: 'website',        label: 'Website',         visible: false },
  { key: 'jobTitle',       label: 'Job Title',       visible: false },
]

export function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [allStages, setAllStages] = useState<PipelineStage[]>([])
  const [filterStages, setFilterStages] = useState<PipelineStage[]>([])
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)

  const [search, setSearch] = useState('')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [sort, setSort] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false)
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null)
  const [timelineEntries, setTimelineEntries] = useState<ActivityEntry[]>([])

  const load = useCallback(() => {
    setLeads(getLeads())
    const ps = getPipelines()
    setPipelines(ps)
    const stages = ps.flatMap((p) => getStages(p.id))
    setAllStages(stages)
    const cfs = db.getCustomFields()
    setCustomFields(cfs)
    setColumns((prev) => {
      const existing = new Set(prev.map((c) => c.key))
      const newCols = cfs
        .filter((cf) => !existing.has(`custom_${cf.id}`))
        .map((cf) => ({ key: `custom_${cf.id}`, label: cf.name, visible: true }))
      return [...prev, ...newCols].filter(
        (c) => !c.key.startsWith('custom_') || cfs.some((cf) => `custom_${cf.id}` === c.key)
      )
    })
  }, [])

  useEffect(() => { load() }, [load])

  // Update stage filter options when pipeline filter changes
  useEffect(() => {
    if (filterPipeline) {
      setFilterStages(allStages.filter((s) => s.pipelineId === filterPipeline))
    } else {
      setFilterStages([])
    }
    setFilterStage('')
  }, [filterPipeline, allStages])

  const filtered = filterLeads(leads, { search, pipelineId: filterPipeline, stageId: filterStage })
  const sorted = sortLeads(filtered, sort)
  const total = sorted.length
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  function handleSort(key: string) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    )
    setPage(1)
  }

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleFilterPipeline(v: string) { setFilterPipeline(v); setPage(1) }
  function handleFilterStage(v: string) { setFilterStage(v); setPage(1) }

  function handleEdit(lead: Lead) {
    setEditingLead(lead)
    setSlideOverOpen(true)
  }

  function handleOpenTimeline(lead: Lead) {
    setTimelineLead(lead)
    setTimelineEntries(getActivityEntries(lead.id))
  }

  function handleNew() {
    setEditingLead(null)
    setSlideOverOpen(true)
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteLead(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  function toggleColumn(key: string) {
    setColumns((prev) => prev.map((c) => c.key === key ? { ...c, visible: !c.visible } : c))
  }

  function getPipelineName(id: string) {
    return pipelines.find((p) => p.id === id)?.name ?? ''
  }
  function getStageName(stageId: string) {
    return allStages.find((s) => s.id === stageId)?.name ?? ''
  }

  const visibleColumns = columns.filter((c) => c.visible)

  function SortIcon({ colKey }: { colKey: string }) {
    if (sort.key !== colKey) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-gray-600 ml-1">{sort.direction === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} lead{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCustomFieldsOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure
          </Button>
          <Button size="sm" onClick={handleNew}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New lead
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search leads…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <select
          value={filterPipeline}
          onChange={(e) => handleFilterPipeline(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
        >
          <option value="">All pipelines</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {filterPipeline && (
          <select
            value={filterStage}
            onChange={(e) => handleFilterStage(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
          >
            <option value="">All stages</option>
            {filterStages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {(search || filterPipeline || filterStage) && (
          <button
            onClick={() => { setSearch(''); setFilterPipeline(''); setFilterStage(''); setPage(1) }}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Clear
          </button>
        )}

        <div className="ml-auto relative">
          <Button variant="ghost" size="sm" onClick={() => setColumnsMenuOpen((v) => !v)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Columns
          </Button>
          {columnsMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColumnsMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                {columns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {leads.length === 0 ? (
              <>
                <p className="text-sm font-medium text-gray-700">No leads yet</p>
                <p className="text-sm text-gray-400 mt-1">Click &quot;New lead&quot; to add your first one.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">No leads match your filters</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                  >
                    {col.label}
                    <SortIcon colKey={col.key} />
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                >
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                      {col.key === 'name' && (
                        <span className="font-medium text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </span>
                      )}
                      {col.key === 'email' && (
                        <span className="text-gray-600">{lead.email}</span>
                      )}
                      {col.key === 'phone' && (
                        <span className="text-gray-600">{lead.phone}</span>
                      )}
                      {col.key === 'website' && (
                        lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900 underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : <span className="text-gray-300">—</span>
                      )}
                      {col.key === 'company' && (
                        <span className="text-gray-600">{lead.company || <span className="text-gray-300">—</span>}</span>
                      )}
                      {col.key === 'jobTitle' && (
                        <span className="text-gray-600">{lead.jobTitle || <span className="text-gray-300">—</span>}</span>
                      )}
                      {col.key === 'pipelineId' && (
                        lead.pipelineId
                          ? <span className="text-gray-700">{getPipelineName(lead.pipelineId)}</span>
                          : <span className="text-gray-300">—</span>
                      )}
                      {col.key === 'stageId' && (
                        lead.stageId
                          ? <Badge label={getStageName(lead.stageId)} />
                          : <span className="text-gray-300">—</span>
                      )}
                      {col.key === 'leadQuality' && (
                        <LeadQualityBadge quality={lead.leadQuality ?? ''} />
                      )}
                      {col.key === 'estimatedValue' && (
                        lead.estimatedValue
                          ? <span className="text-gray-700 font-medium tabular-nums">
                              ${Number(lead.estimatedValue).toLocaleString()}
                            </span>
                          : <span className="text-gray-300">—</span>
                      )}
                      {col.key === 'createdAt' && (
                        <span className="text-gray-500">
                          {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                        </span>
                      )}
                      {col.key.startsWith('custom_') && (() => {
                        const cfId = col.key.replace('custom_', '')
                        const val = lead.customFields?.[cfId]
                        return <span className="text-gray-600">{val || <span className="text-gray-300">—</span>}</span>
                      })()}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleOpenTimeline(lead)}
                        className="text-xs text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                      >
                        Tasks
                      </button>
                      <button
                        onClick={() => handleEdit(lead)}
                        className="text-xs text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(lead)}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      )}

      <LeadSlideOver
        open={slideOverOpen}
        lead={editingLead}
        onClose={() => setSlideOverOpen(false)}
        onSaved={load}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete lead"
        description={
          <>
            Are you sure you want to delete{' '}
            <span className="font-medium text-gray-900">
              {deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : ''}
            </span>
            ? This action cannot be undone.
          </>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <LeadsConfigModal
        open={customFieldsOpen}
        onClose={() => setCustomFieldsOpen(false)}
        onChanged={load}
      />

      <TimelineSlideOver
        open={!!timelineLead}
        leadId={timelineLead?.id ?? ''}
        leadName={timelineLead ? `${timelineLead.firstName} ${timelineLead.lastName}` : ''}
        entries={timelineEntries}
        onClose={() => setTimelineLead(null)}
        onEntriesChange={() => {
          if (timelineLead) setTimelineEntries(getActivityEntries(timelineLead.id))
        }}
      />
    </div>
  )
}
