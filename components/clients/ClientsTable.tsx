'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { ClientStatusBadge } from '@/components/ui/Badge'
import { DeleteConfirmDialog } from '@/components/leads/DeleteConfirmDialog'
import { TimelineSlideOver } from '@/components/leads/TimelineSlideOver'
import { AddClientModal } from './AddClientModal'
import { ClientSlideOver } from './ClientSlideOver'
import { ClientsConfigModal } from './ClientsConfigModal'
import { deleteClientAction, updateClientAction } from '@/app/actions/clients'
import { getActivityEntriesAction } from '@/app/actions/activities'
import type { Client, ClientStatus, Lead, ActivityEntry, CustomFieldDefinition } from '@/types'

const BASE_COLUMNS = [
  { key: 'name',          label: 'Name',            visible: true,  locked: true  },
  { key: 'email',         label: 'Email',           visible: true,  locked: true  },
  { key: 'status',        label: 'Status',          visible: true,  locked: true  },
  { key: 'company',       label: 'Company',         visible: true,  locked: false },
  { key: 'contractValue', label: 'Contract Value',  visible: true,  locked: false },
  { key: 'clientSince',   label: 'Client Since',    visible: true,  locked: false },
  { key: 'renewalDate',   label: 'Renewal Date',    visible: true,  locked: false },
]

function buildColumns(customFields: CustomFieldDefinition[]) {
  const cfCols = customFields.map((cf) => ({
    key: `custom_${cf.id}`, label: cf.name, visible: true, locked: false,
  }))
  return [...BASE_COLUMNS, ...cfCols]
}

type ClientWithLead = Client & { lead: Lead | undefined }

interface ClientsTableProps {
  initialClients: Client[]
  initialLeads: Lead[]
  initialCustomFields: CustomFieldDefinition[]
  currencySymbol: string
}

export function ClientsTable({
  initialClients,
  initialLeads,
  initialCustomFields,
  currencySymbol,
}: ClientsTableProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(initialCustomFields)
  const [columns, setColumns] = useState(() => buildColumns(initialCustomFields))

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClientWithLead | null>(null)
  const [timelineClient, setTimelineClient] = useState<ClientWithLead | null>(null)
  const [timelineEntries, setTimelineEntries] = useState<ActivityEntry[]>([])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<ClientStatus | ''>('')
  const selectAllRef = useRef<HTMLInputElement>(null)

  function getLeadForClient(leadId: string) {
    return leads.find((l) => l.id === leadId)
  }

  const clientsWithLeads: ClientWithLead[] = clients.map((c) => ({
    ...c, lead: getLeadForClient(c.leadId),
  }))

  const filtered = clientsWithLeads.filter((c) => {
    const lead = c.lead
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (lead ? `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(q) : false) ||
      (lead?.email ?? '').toLowerCase().includes(q) ||
      (lead?.company ?? '').toLowerCase().includes(q)
    const matchesStatus = !filterStatus || c.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const total = filtered.length
  const visibleColumns = columns.filter((c) => c.visible)

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))
  const someSelected = filtered.some((c) => selected.has(c.id))
  const isIndeterminate = someSelected && !allSelected

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
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((c) => next.delete(c.id)); return next })
    } else {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((c) => next.add(c.id)); return next })
    }
  }

  function clearSelection() { setSelected(new Set()) }

  function toggleColumn(key: string) {
    setColumns((prev) => prev.map((c) => c.key === key && !c.locked ? { ...c, visible: !c.visible } : c))
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    const { leadId } = await deleteClientAction(deleteTarget.id)
    setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, isClient: false } : l))
    setDeleteTarget(null)
  }

  async function handleBulkDelete() {
    const ids = [...selected]
    const results = await Promise.all(ids.map((id) => deleteClientAction(id)))
    const deletedLeadIds = new Set(results.map((r) => r.leadId))
    setClients((prev) => prev.filter((c) => !ids.includes(c.id)))
    setLeads((prev) => prev.map((l) => deletedLeadIds.has(l.id) ? { ...l, isClient: false } : l))
    clearSelection()
    setBulkDeleteOpen(false)
  }

  async function handleBulkStatusChange() {
    if (!bulkStatus) return
    const ids = [...selected]
    const updated = await Promise.all(ids.map((id) => updateClientAction(id, { status: bulkStatus as ClientStatus })))
    setClients((prev) => prev.map((c) => {
      const u = updated.find((u) => u.id === c.id)
      return u ?? c
    }))
    clearSelection()
    setBulkStatusOpen(false)
    setBulkStatus('')
  }

  async function handleOpenTimeline(c: ClientWithLead) {
    const entries = await getActivityEntriesAction(c.leadId)
    setTimelineEntries(entries)
    setTimelineClient(c)
  }

  function handleClientSaved(client: Client) {
    setClients((prev) => prev.map((c) => c.id === client.id ? client : c))
    setEditingClient(null)
  }

  function handleClientAdded(client: Client) {
    setClients((prev) => [client, ...prev])
    setLeads((prev) => prev.map((l) => l.id === client.leadId ? { ...l, isClient: true } : l))
  }

  function handleCustomFieldsChanged(fields: CustomFieldDefinition[]) {
    setCustomFields(fields)
    setColumns(buildColumns(fields))
  }

  const availableLeads = leads.filter((l) => !l.isClient)
  const hasSelection = selected.size > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} client{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfigOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add client
          </Button>
        </div>
      </div>

      {/* Filter bar / Action bar */}
      {hasSelection ? (
        <div className="flex items-center gap-3 px-8 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-medium text-gray-700">{selected.size} selected</span>
          <button onClick={clearSelection} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Clear</button>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setBulkStatusOpen((v) => !v)}>Change status</Button>
              {bulkStatusOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkStatusOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">New status</label>
                      <div className="relative">
                        <select
                          value={bulkStatus}
                          onChange={(e) => setBulkStatus(e.target.value as ClientStatus | '')}
                          className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                        >
                          <option value="">Select status…</option>
                          <option value="active">Active</option>
                          <option value="at_risk">At Risk</option>
                          <option value="churned">Churned</option>
                        </select>
                        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="secondary" size="sm" onClick={() => setBulkStatusOpen(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleBulkStatusChange} disabled={!bulkStatus}>Apply</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setBulkDeleteOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
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
              placeholder="Search clients…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); clearSelection() }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); clearSelection() }}
              className="appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="at_risk">At Risk</option>
              <option value="churned">Churned</option>
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {(search || filterStatus) && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); clearSelection() }} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            {clients.length === 0 ? (
              <>
                <p className="text-sm font-medium text-gray-700">No clients yet</p>
                <p className="text-sm text-gray-400 mt-1">Click &quot;Add client&quot; to convert a lead into a client.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">No clients match your filters</p>
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
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const lead = c.lead
                const isSelected = selected.has(c.id)
                return (
                  <tr key={c.id} className={`border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'}`}>
                    <td className="pl-4 pr-2 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                        {col.key === 'name' && (
                          <span className="font-medium text-gray-900">
                            {lead ? `${lead.firstName} ${lead.lastName}` : '—'}
                          </span>
                        )}
                        {col.key === 'email' && (
                          <span className="text-gray-600">{lead?.email || <span className="text-gray-300">—</span>}</span>
                        )}
                        {col.key === 'status' && <ClientStatusBadge status={c.status} />}
                        {col.key === 'company' && (
                          <span className="text-gray-600">{lead?.company || <span className="text-gray-300">—</span>}</span>
                        )}
                        {col.key === 'contractValue' && (
                          c.contractValue
                            ? <span className="text-gray-700 font-medium tabular-nums">{currencySymbol}{Number(c.contractValue).toLocaleString()}</span>
                            : <span className="text-gray-300">—</span>
                        )}
                        {col.key === 'clientSince' && (
                          c.clientSince
                            ? <span className="text-gray-500">{format(new Date(c.clientSince), 'MMM d, yyyy')}</span>
                            : <span className="text-gray-300">—</span>
                        )}
                        {col.key === 'renewalDate' && (
                          c.renewalDate
                            ? <span className="text-gray-500">{format(new Date(c.renewalDate), 'MMM d, yyyy')}</span>
                            : <span className="text-gray-300">—</span>
                        )}
                        {col.key.startsWith('custom_') && (() => {
                          const cfId = col.key.replace('custom_', '')
                          const val = c.customFields?.[cfId]
                          return <span className="text-gray-600">{val || <span className="text-gray-300">—</span>}</span>
                        })()}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleOpenTimeline(c)}
                          className="text-xs text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                        >
                          Timeline
                        </button>
                        <button
                          onClick={() => setEditingClient(c)}
                          className="text-xs text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
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

      <AddClientModal
        open={addOpen}
        allLeads={availableLeads}
        customFields={customFields}
        onClose={() => setAddOpen(false)}
        onAdded={handleClientAdded}
      />

      <ClientsConfigModal
        open={configOpen}
        initialCustomFields={customFields}
        onClose={() => setConfigOpen(false)}
        onChanged={handleCustomFieldsChanged}
      />

      <ClientSlideOver
        open={!!editingClient}
        client={editingClient}
        lead={editingClient ? getLeadForClient(editingClient.leadId) ?? null : null}
        customFields={customFields}
        onClose={() => setEditingClient(null)}
        onSaved={handleClientSaved}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Remove client"
        description={
          <>
            Are you sure you want to remove{' '}
            <span className="font-medium text-gray-900">
              {deleteTarget?.lead ? `${deleteTarget.lead.firstName} ${deleteTarget.lead.lastName}` : 'this client'}
            </span>{' '}
            from clients? The lead record will remain in the Leads section.
          </>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Remove ${selected.size} client${selected.size !== 1 ? 's' : ''}`}
        description={
          <span>Remove <strong>{selected.size} client{selected.size !== 1 ? 's' : ''}</strong>? Their lead records will remain in the Leads section.</span>
        }
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <TimelineSlideOver
        open={!!timelineClient}
        leadId={timelineClient?.leadId ?? ''}
        leadName={timelineClient?.lead ? `${timelineClient.lead.firstName} ${timelineClient.lead.lastName}` : ''}
        initialEntries={timelineEntries}
        onClose={() => setTimelineClient(null)}
      />
    </div>
  )
}
