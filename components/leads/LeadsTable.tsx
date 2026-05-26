'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Badge, LeadQualityBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { LeadSlideOver } from './LeadSlideOver'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { LeadsConfigModal } from './LeadsConfigModal'
import { ImportLeadsModal } from './ImportLeadsModal'
import { TimelineSlideOver } from './TimelineSlideOver'
import { db } from '@/lib/storage'
import { getLeads, deleteLead, updateLead, filterLeads, sortLeads } from '@/lib/leads'
import { getSettings, getCurrencySymbol } from '@/lib/settings'
import { getPipelines, getStages, getEntries, addLeadToPipeline, removeEntry } from '@/lib/pipelines'
import { getActivityEntries, createStageChangeEntry } from '@/lib/activities'
import type { Lead, Pipeline, PipelineStage, SortConfig, ActivityEntry } from '@/types'

const DEFAULT_COLUMNS = [
  { key: 'name',           label: 'Name',            visible: true,  locked: true  },
  { key: 'email',          label: 'Email',           visible: true,  locked: true  },
  { key: 'company',        label: 'Company',         visible: true,  locked: false },
  { key: 'pipelineId',     label: 'Pipeline',        visible: true,  locked: false },
  { key: 'stageId',        label: 'Stage',           visible: true,  locked: false },
  { key: 'leadQuality',    label: 'Lead Quality',    visible: true,  locked: false },
  { key: 'estimatedValue', label: 'Est. Value',      visible: true,  locked: false },
  { key: 'createdAt',      label: 'Created',         visible: true,  locked: false },
  { key: 'phone',          label: 'Phone',           visible: false, locked: false },
  { key: 'website',        label: 'Website',         visible: false, locked: false },
  { key: 'jobTitle',       label: 'Job Title',       visible: false, locked: false },
]

export function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [allStages, setAllStages] = useState<PipelineStage[]>([])
  const [filterStages, setFilterStages] = useState<PipelineStage[]>([])
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
  const [importOpen, setImportOpen] = useState(false)
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null)
  const [timelineEntries, setTimelineEntries] = useState<ActivityEntry[]>([])

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [bulkPipelineId, setBulkPipelineId] = useState('')
  const [bulkStageId, setBulkStageId] = useState('')
  const [bulkStages, setBulkStages] = useState<PipelineStage[]>([])
  const selectAllRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setCurrencySymbol(getCurrencySymbol(getSettings().currencyCode))
    setLeads(getLeads())
    const ps = getPipelines()
    setPipelines(ps)
    const stages = ps.flatMap((p) => getStages(p.id))
    setAllStages(stages)
    const cfs = db.getCustomFields()
    setColumns((prev) => {
      const existing = new Set(prev.map((c) => c.key))
      const newCols = cfs
        .filter((cf) => !existing.has(`custom_${cf.id}`))
        .map((cf) => ({ key: `custom_${cf.id}`, label: cf.name, visible: true, locked: false }))
      return [...prev, ...newCols].filter(
        (c) => !c.key.startsWith('custom_') || cfs.some((cf) => `custom_${cf.id}` === c.key)
      )
    })
  }, [])

  useEffect(() => { load() }, [load])

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

  const allPageSelected = paginated.length > 0 && paginated.every((l) => selected.has(l.id))
  const somePageSelected = paginated.some((l) => selected.has(l.id))
  const isIndeterminate = somePageSelected && !allPageSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate
  }, [isIndeterminate])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        paginated.forEach((l) => next.delete(l.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        paginated.forEach((l) => next.add(l.id))
        return next
      })
    }
  }

  function clearSelection() { setSelected(new Set()) }

  function handleBulkDelete() {
    selected.forEach((id) => deleteLead(id))
    clearSelection()
    setBulkDeleteOpen(false)
    load()
  }

  function handleBulkPipelineChange(pipelineId: string) {
    setBulkPipelineId(pipelineId)
    setBulkStageId('')
    setBulkStages(pipelineId ? getStages(pipelineId) : [])
  }

  function handleBulkMove() {
    if (!bulkPipelineId || !bulkStageId) return
    const pipeline = pipelines.find((p) => p.id === bulkPipelineId)
    const stage = bulkStages.find((s) => s.id === bulkStageId)
    selected.forEach((id) => {
      const lead = leads.find((l) => l.id === id)
      if (!lead) return
      updateLead(id, { pipelineId: bulkPipelineId, stageId: bulkStageId })
      const existingEntries = getEntries(lead.pipelineId ?? '').filter((e) => e.leadId === id)
      existingEntries.forEach((e) => removeEntry(e.id))
      const stageEntries = getEntries(bulkPipelineId).filter((e) => e.stageId === bulkStageId)
      addLeadToPipeline(bulkPipelineId, bulkStageId, id, stageEntries.length)
      if (pipeline && stage) {
        createStageChangeEntry({
          leadId: id,
          pipelineId: bulkPipelineId,
          pipelineName: pipeline.name,
          newStageName: stage.name,
          previousStageId: lead.stageId || undefined,
          newStageId: bulkStageId,
        })
      }
    })
    clearSelection()
    setBulkMoveOpen(false)
    setBulkPipelineId('')
    setBulkStageId('')
    setBulkStages([])
    load()
  }

  function handleSort(key: string) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    )
    setPage(1)
  }

  function handleSearch(v: string) { setSearch(v); setPage(1); clearSelection() }
  function handleFilterPipeline(v: string) { setFilterPipeline(v); setPage(1); clearSelection() }
  function handleFilterStage(v: string) { setFilterStage(v); setPage(1); clearSelection() }

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
    setColumns((prev) => prev.map((c) => c.key === key && !c.locked ? { ...c, visible: !c.visible } : c))
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

  const hasSelection = selected.size > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {(search || filterPipeline || filterStage)
              ? `${total} of ${leads.length} lead${leads.length !== 1 ? 's' : ''}`
              : `${total} lead${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Button>
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
            Add lead
          </Button>
        </div>
      </div>

      {/* Filter bar / Action bar */}
      {hasSelection ? (
        <div className="flex items-center gap-3 px-8 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-medium text-gray-700">{selected.size} selected</span>
          <button onClick={clearSelection} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2">
            {/* Assign to stage */}
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setBulkMoveOpen((v) => !v)}>
                Assign to stage
              </Button>
              {bulkMoveOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkMoveOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pipeline</label>
                      <div className="relative">
                        <select
                          value={bulkPipelineId}
                          onChange={(e) => handleBulkPipelineChange(e.target.value)}
                          className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                        >
                          <option value="">Select pipeline…</option>
                          {pipelines.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Stage</label>
                      <div className="relative">
                        <select
                          value={bulkStageId}
                          onChange={(e) => setBulkStageId(e.target.value)}
                          disabled={!bulkPipelineId}
                          className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:opacity-50 transition-colors"
                        >
                          <option value="">{bulkPipelineId ? 'Select stage…' : 'Select pipeline first'}</option>
                          {bulkStages.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="secondary" size="sm" onClick={() => setBulkMoveOpen(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleBulkMove} disabled={!bulkPipelineId || !bulkStageId}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Bulk delete */}
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-8 py-3 border-b border-gray-100">
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

          <div className="relative">
            <select
              value={filterPipeline}
              onChange={(e) => handleFilterPipeline(e.target.value)}
              className="appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
            >
              <option value="">All pipelines</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {filterPipeline && (
            <div className="relative">
              <select
                value={filterStage}
                onChange={(e) => handleFilterStage(e.target.value)}
                className="appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
              >
                <option value="">All stages</option>
                {filterStages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
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
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 px-4 py-2 ${col.locked ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        disabled={col.locked}
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
      )}

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
                <p className="text-sm text-gray-400 mt-1">Click &quot;Add lead&quot; to add your first one.</p>
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
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
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
              {paginated.map((lead) => {
                const isSelected = selected.has(lead.id)
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'}`}
                  >
                    <td className="pl-4 pr-2 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                        {col.key === 'name' && (
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {lead.firstName} {lead.lastName}
                            </span>
                            {lead.isClient && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                Client
                              </span>
                            )}
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
                                {currencySymbol}{Number(lead.estimatedValue).toLocaleString()}
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
                          Timeline
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
                )
              })}
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

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selected.size} lead${selected.size !== 1 ? 's' : ''}`}
        description={
          <span>
            Delete <strong>{selected.size} lead{selected.size !== 1 ? 's' : ''}</strong>? This cannot be undone.
          </span>
        }
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <LeadsConfigModal
        open={customFieldsOpen}
        onClose={() => setCustomFieldsOpen(false)}
        onChanged={load}
      />

      <ImportLeadsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
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
