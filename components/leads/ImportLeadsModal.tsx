'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { importLeadsAction } from '@/app/actions/leads'
import { saveLeadCustomFieldsAction } from '@/app/actions/custom-fields'
import type { Lead, LeadFormData, LeadQuality, CustomFieldDefinition } from '@/types'

interface ImportLeadsModalProps {
  open: boolean
  customFields: CustomFieldDefinition[]
  allLeads: Lead[]
  onClose: () => void
  onImported: (leads: Lead[]) => void
}

const BUILT_IN_FIELDS: { key: string; label: string }[] = [
  { key: 'firstName',      label: 'First Name' },
  { key: 'lastName',       label: 'Last Name' },
  { key: 'email',          label: 'Email' },
  { key: 'phone',          label: 'Phone' },
  { key: 'company',        label: 'Company' },
  { key: 'jobTitle',       label: 'Job Title' },
  { key: 'website',        label: 'Website' },
  { key: 'estimatedValue', label: 'Estimated Value' },
  { key: 'notes',          label: 'Notes' },
]

const AUTO_MAP: Record<string, string> = {
  'first name': 'firstName', 'firstname': 'firstName', 'first_name': 'firstName', 'given name': 'firstName',
  'last name': 'lastName',   'lastname': 'lastName',   'last_name': 'lastName',   'surname': 'lastName', 'family name': 'lastName',
  'email': 'email', 'email address': 'email', 'e-mail': 'email',
  'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone', 'tel': 'phone',
  'company': 'company', 'company name': 'company', 'organization': 'company', 'organisation': 'company',
  'job title': 'jobTitle', 'title': 'jobTitle', 'position': 'jobTitle', 'role': 'jobTitle',
  'website': 'website', 'url': 'website', 'web': 'website',
  'value': 'estimatedValue', 'estimated value': 'estimatedValue', 'deal value': 'estimatedValue', 'contract value': 'estimatedValue',
  'notes': 'notes', 'note': 'notes', 'comments': 'notes',
}

type Step = 'upload' | 'map' | 'preview'
const CREATE_SENTINEL = '__create__'

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

function emptyLeadForm(): LeadFormData {
  return {
    firstName: '', lastName: '', email: '', phone: '', website: '',
    company: '', jobTitle: '', pipelineId: '', stageId: '',
    estimatedValue: '', leadQuality: '', notes: '', customFields: {},
  }
}

export function ImportLeadsModal({ open, customFields, allLeads, onClose, onImported }: ImportLeadsModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>(customFields)
  const [creatingFor, setCreatingFor] = useState<string | null>(null)
  const [newFieldName, setNewFieldName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload')
    setCsvHeaders([])
    setCsvRows([])
    setMapping({})
    setResult(null)
    setDragOver(false)
    setCreatingFor(null)
    setNewFieldName('')
    setCustomFieldDefs(customFields)
  }

  function handleClose() { reset(); onClose() }

  function parseFile(file: File) {
    if (!file.name.endsWith('.csv')) return
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? []
        setCsvHeaders(headers)
        setCsvRows(results.data)
        const autoMapping: Record<string, string> = {}
        headers.forEach((h) => { autoMapping[h] = AUTO_MAP[h.toLowerCase().trim()] ?? '' })
        setMapping(autoMapping)
        setStep('map')
      },
    })
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleMappingChange(header: string, value: string) {
    if (value === CREATE_SENTINEL) {
      setCreatingFor(header)
      setNewFieldName(header)
    } else {
      setMapping((prev) => ({ ...prev, [header]: value }))
    }
  }

  async function handleCreateField(header: string) {
    const name = newFieldName.trim()
    if (!name) return
    const newField: CustomFieldDefinition = { id: '', name, type: 'text' }
    const updated = await saveLeadCustomFieldsAction([...customFieldDefs, newField])
    const created = updated.find((f) => f.name === name && !customFieldDefs.some((c) => c.id === f.id))
    if (created) {
      setCustomFieldDefs(updated)
      setMapping((prev) => ({ ...prev, [header]: `custom_${created.id}` }))
    }
    setCreatingFor(null)
    setNewFieldName('')
  }

  function buildLead(row: Record<string, string>): LeadFormData {
    const form = emptyLeadForm()
    Object.entries(mapping).forEach(([csvCol, fieldKey]) => {
      if (!fieldKey) return
      const val = (row[csvCol] ?? '').trim()
      if (!val) return
      if (fieldKey.startsWith('custom_')) {
        const cfId = fieldKey.replace('custom_', '')
        form.customFields[cfId] = val
      } else if (fieldKey === 'leadQuality') {
        const q = val.toLowerCase()
        if (q === 'high' || q === 'medium' || q === 'low') form.leadQuality = q as LeadQuality
      } else {
        (form as Record<string, unknown>)[fieldKey] = val
      }
    })
    return form
  }

  const validRows = csvRows.filter((row) => {
    const firstNameCol = Object.entries(mapping).find(([, v]) => v === 'firstName')?.[0]
    return firstNameCol ? (row[firstNameCol] ?? '').trim().length > 0 : false
  })

  const emailCol = Object.entries(mapping).find(([, v]) => v === 'email')?.[0]
  const existingEmails = new Set(allLeads.map((l) => l.email.toLowerCase()))
  const duplicateCount = emailCol
    ? validRows.filter((row) => {
        const email = (row[emailCol] ?? '').trim().toLowerCase()
        return email && existingEmails.has(email)
      }).length
    : 0
  const toImport = validRows.length - duplicateCount
  const skippedNoName = csvRows.length - validRows.length

  async function handleImport() {
    setImporting(true)
    try {
      const rowsToImport = validRows.filter((row) => {
        if (!emailCol) return true
        const email = (row[emailCol] ?? '').trim().toLowerCase()
        return !email || !existingEmails.has(email)
      })
      const skipped = validRows.length - rowsToImport.length

      const leadsData = rowsToImport.map((row) => buildLead(row))
      const imported = await importLeadsAction(leadsData)
      setResult({ imported: imported.length, skipped })
      onImported(imported)
    } finally {
      setImporting(false)
    }
  }

  const firstNameMapped = Object.values(mapping).includes('firstName')

  const allFields = [
    ...BUILT_IN_FIELDS,
    ...customFieldDefs.map((cf) => ({ key: `custom_${cf.id}`, label: cf.name })),
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'upload' ? 'Import leads' : step === 'map' ? 'Map columns' : 'Preview import'}
      maxWidth="max-w-2xl"
    >
      {result ? (
        <div className="flex flex-col items-center py-6 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Import complete</p>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">{result.imported}</span> lead{result.imported !== 1 ? 's' : ''} imported
            {result.skipped > 0 && <>, <span className="font-medium text-gray-900">{result.skipped}</span> skipped (duplicate email)</>}
          </p>
          <div className="mt-2"><Button onClick={handleClose}>Done</Button></div>
        </div>

      ) : step === 'upload' ? (
        <div className="flex flex-col gap-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-6 py-12 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
              dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Drop your CSV here, or click to browse</p>
            <p className="text-xs text-gray-400">.csv files only</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          </div>
        </div>

      ) : step === 'map' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Match your CSV columns to lead fields. Only <span className="font-medium text-gray-700">First Name</span> is required.
          </p>
          <div className="max-h-80 overflow-y-auto space-y-2 px-0.5 py-1">
            {csvHeaders.map((header) => (
              <div key={header}>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-40 flex-shrink-0 truncate" title={header}>{header}</span>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  {creatingFor === header ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateField(header); if (e.key === 'Escape') setCreatingFor(null) }}
                        placeholder="New field name…"
                        className={inputClass}
                      />
                      <button
                        onClick={() => handleCreateField(header)}
                        disabled={!newFieldName.trim()}
                        className="text-xs font-medium text-gray-900 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setCreatingFor(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex-1">
                      <select
                        value={mapping[header] ?? ''}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                      >
                        <option value="">Skip this column</option>
                        <optgroup label="Lead fields">
                          {allFields.map((f) => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Create">
                          <option value={CREATE_SENTINEL}>+ Create new field…</option>
                        </optgroup>
                      </select>
                      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
                {mapping[header]?.startsWith('custom_') && (() => {
                  const cfName = customFieldDefs.find((cf) => `custom_${cf.id}` === mapping[header])?.name
                  return cfName ? (
                    <p className="text-xs text-emerald-600 ml-[calc(160px+28px)] mt-1">Custom field &quot;{cfName}&quot;</p>
                  ) : null
                })()}
              </div>
            ))}
          </div>
          {!firstNameMapped && (
            <p className="text-xs text-amber-600">Map at least one column to First Name to continue.</p>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={reset}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => setStep('preview')} disabled={!firstNameMapped}>Preview</Button>
            </div>
          </div>
        </div>

      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-center">
              <p className="text-lg font-semibold text-gray-900">{csvRows.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total rows</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-center">
              <p className="text-lg font-semibold text-emerald-700">{toImport}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Will be imported</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-center">
              <p className="text-lg font-semibold text-gray-500">{duplicateCount + skippedNoName}</p>
              <p className="text-xs text-gray-400 mt-0.5">Will be skipped</p>
            </div>
          </div>

          {(duplicateCount > 0 || skippedNoName > 0) && (
            <div className="text-xs text-gray-400 space-y-0.5">
              {duplicateCount > 0 && <p>· {duplicateCount} row{duplicateCount !== 1 ? 's' : ''} skipped — email already exists</p>}
              {skippedNoName > 0 && <p>· {skippedNoName} row{skippedNoName !== 1 ? 's' : ''} skipped — missing first name</p>}
            </div>
          )}

          {validRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {Object.entries(mapping).filter(([, v]) => v).map(([col]) => (
                      <th key={col} className="text-left px-3 py-2 text-gray-500 font-medium whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      {Object.entries(mapping).filter(([, v]) => v).map(([col]) => (
                        <td key={col} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[160px] truncate">{row[col] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {validRows.length > 5 && (
                <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">
                  + {validRows.length - 5} more row{validRows.length - 5 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep('map')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={toImport === 0 || importing}>
                {importing ? 'Importing…' : `Import ${toImport} lead${toImport !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
