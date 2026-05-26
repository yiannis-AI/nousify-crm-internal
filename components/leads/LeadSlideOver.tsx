'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SlideOver } from '@/components/ui/SlideOver'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { db } from '@/lib/storage'
import { createLead, updateLead, emptyLeadForm, findLeadByEmail } from '@/lib/leads'
import { getPipelines, getStages, getEntries, addLeadToPipeline, moveEntry, removeEntry } from '@/lib/pipelines'
import { createActivityEntry, createLeadCreatedEntry, createStageChangeEntry } from '@/lib/activities'
import type { Lead, LeadFormData, CustomFieldDefinition, LeadQuality, Pipeline, PipelineStage, PipelineEntry } from '@/types'

interface LeadSlideOverProps {
  open: boolean
  lead: Lead | null
  onClose: () => void
  onSaved: () => void
}

export function LeadSlideOver({ open, lead, onClose, onSaved }: LeadSlideOverProps) {
  const isEdit = !!lead
  const [form, setForm] = useState<LeadFormData>(emptyLeadForm())
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateLead, setDuplicateLead] = useState<Lead | null>(null)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  // Create-mode only: initial note + optional document
  const [initialNote, setInitialNote] = useState('')
  const [docName, setDocName] = useState('')
  const [docUrl, setDocUrl] = useState('')

  // Pipeline/Stage selectors
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [pipelinesWithStages, setPipelinesWithStages] = useState<Set<string>>(new Set())
  const [stages, setStages] = useState<PipelineStage[]>([])
  // Existing entry for this lead (edit mode only)
  const [existingEntry, setExistingEntry] = useState<PipelineEntry | null>(null)

  useEffect(() => {
    if (open) {
      setCustomFields(db.getCustomFields())
      const allPipelines = getPipelines()
      setPipelines(allPipelines)
      setPipelinesWithStages(new Set(allPipelines.filter((p) => getStages(p.id).length > 0).map((p) => p.id)))

      if (lead) {
        setForm({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          company: lead.company,
          jobTitle: lead.jobTitle,
          pipelineId: lead.pipelineId ?? '',
          stageId: lead.stageId ?? '',
          estimatedValue: lead.estimatedValue ?? '',
          leadQuality: lead.leadQuality ?? '',
          notes: lead.notes,
          customFields: { ...lead.customFields },
        })
        if (lead.pipelineId) {
          setStages(getStages(lead.pipelineId))
          const entries = getEntries(lead.pipelineId)
          setExistingEntry(entries.find((e) => e.leadId === lead.id) ?? null)
        } else {
          setStages([])
          setExistingEntry(null)
        }
      } else {
        setForm(emptyLeadForm())
        setStages([])
        setExistingEntry(null)
        setInitialNote('')
        setDocName('')
        setDocUrl('')
      }
      setErrors({})
      setDuplicateLead(null)
      setShowDuplicateConfirm(false)
    }
  }, [open, lead])

  function set(field: keyof LeadFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    if (field === 'email') setDuplicateLead(null)
  }

  function handlePipelineChange(pipelineId: string) {
    setForm((prev) => ({ ...prev, pipelineId, stageId: '' }))
    setStages(pipelineId ? getStages(pipelineId) : [])
  }

  function setCustomField(id: string, value: string) {
    setForm((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [id]: value },
    }))
  }

  function handleEmailBlur() {
    const match = findLeadByEmail(form.email, lead?.id)
    setDuplicateLead(match ?? null)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    const match = findLeadByEmail(form.email, lead?.id)
    if (match && !isEdit) {
      setDuplicateLead(match)
      setShowDuplicateConfirm(true)
      return
    }

    persist()
  }

  function persist() {
    let savedLead: Lead
    if (isEdit && lead) {
      savedLead = updateLead(lead.id, form)

      // Log stage change silently if stage moved
      const prevStageId = existingEntry?.stageId ?? ''
      const newStageIdEdit = form.stageId
      if (newStageIdEdit && newStageIdEdit !== prevStageId && form.pipelineId) {
        const pipeline = pipelines.find((p) => p.id === form.pipelineId)
        const newStage = stages.find((s) => s.id === newStageIdEdit)
        if (pipeline && newStage) {
          createStageChangeEntry({
            leadId: savedLead.id,
            pipelineId: form.pipelineId,
            pipelineName: pipeline.name,
            newStageName: newStage.name,
            previousStageId: prevStageId || undefined,
            newStageId: newStageIdEdit,
          })
        }
      }
    } else {
      savedLead = createLead(form)

      // Always log lead_created
      createLeadCreatedEntry(savedLead.id)

      // Log initial note if provided
      if (initialNote.trim()) {
        createActivityEntry({
          leadId: savedLead.id,
          type: 'note',
          title: 'Initial note',
          description: initialNote.trim(),
          systemGenerated: false,
        })
      }

      // Log document if both fields filled
      if (docName.trim() && docUrl.trim()) {
        createActivityEntry({
          leadId: savedLead.id,
          type: 'document',
          title: docName.trim(),
          attachment: { name: docName.trim(), url: docUrl.trim() },
          systemGenerated: false,
        })
      }

      // Log stage assignment if pipeline+stage selected
      if (form.pipelineId && form.stageId) {
        const pipeline = pipelines.find((p) => p.id === form.pipelineId)
        const stage = stages.find((s) => s.id === form.stageId)
        if (pipeline && stage) {
          createStageChangeEntry({
            leadId: savedLead.id,
            pipelineId: form.pipelineId,
            pipelineName: pipeline.name,
            newStageName: stage.name,
            newStageId: form.stageId,
          })
        }
      }
    }

    // Sync PipelineEntry
    const newPipelineId = form.pipelineId
    const newStageId = form.stageId

    if (existingEntry) {
      if (!newPipelineId) {
        // Cleared pipeline — remove entry (storage also clears lead fields)
        removeEntry(existingEntry.id)
      } else if (newPipelineId !== existingEntry.pipelineId) {
        // Changed to a different pipeline
        removeEntry(existingEntry.id)
        if (newStageId) {
          const stageEntries = getEntries(newPipelineId).filter((e) => e.stageId === newStageId)
          addLeadToPipeline(newPipelineId, newStageId, savedLead.id, stageEntries.length)
        }
      } else if (newStageId && newStageId !== existingEntry.stageId) {
        // Same pipeline, different stage
        moveEntry(existingEntry.id, newStageId, existingEntry.order)
      }
    } else if (newPipelineId && newStageId) {
      // No existing entry — create one
      const stageEntries = getEntries(newPipelineId).filter((e) => e.stageId === newStageId)
      addLeadToPipeline(newPipelineId, newStageId, savedLead.id, stageEntries.length)
    }

    onSaved()
    onClose()
  }

  const inputClass = (field?: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
      field && errors[field] ? 'border-red-300' : 'border-gray-200'
    }`

  return (
    <>
      <SlideOver open={open} onClose={onClose} title={isEdit ? 'Edit lead' : 'New lead'}>
        <div className="px-6 py-4 flex flex-col gap-5">
          <Section label="Name">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  className={inputClass('firstName')}
                />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <input
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  className={inputClass('lastName')}
                />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>
          </Section>

          <Section label="Contact">
            <div className="space-y-3">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  onBlur={handleEmailBlur}
                  className={inputClass()}
                />
                {duplicateLead && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-600">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span>
                      This email belongs to an existing lead —{' '}
                      <Link
                        href={`/leads/${duplicateLead.id}`}
                        className="font-medium underline hover:text-amber-800 transition-colors"
                        onClick={onClose}
                      >
                        {duplicateLead.firstName} {duplicateLead.lastName}
                      </Link>
                    </span>
                  </div>
                )}
              </div>
              <input
                type="tel"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputClass()}
              />
              <input
                type="url"
                placeholder="Website"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                className={inputClass()}
              />
            </div>
          </Section>

          <Section label="Company">
            <div className="space-y-3">
              <input
                placeholder="Company name"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                className={inputClass()}
              />
              <input
                placeholder="Job title"
                value={form.jobTitle}
                onChange={(e) => set('jobTitle', e.target.value)}
                className={inputClass()}
              />
            </div>
          </Section>

          <Section label="Classification">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pipeline</label>
                <select
                  value={form.pipelineId}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">No pipeline</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id} disabled={!pipelinesWithStages.has(p.id)}>
                      {p.name}{!pipelinesWithStages.has(p.id) ? ' (no stages)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stage</label>
                <select
                  value={form.stageId}
                  onChange={(e) => set('stageId', e.target.value)}
                  disabled={!form.pipelineId}
                  className={inputClass()}
                >
                  <option value="">
                    {!form.pipelineId ? 'Select pipeline first' : stages.length === 0 ? 'No stages yet' : 'Select stage…'}
                  </option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {form.pipelineId && stages.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Add stages from the Pipelines module.</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lead Quality</label>
                <select
                  value={form.leadQuality}
                  onChange={(e) => set('leadQuality', e.target.value as LeadQuality)}
                  className={inputClass()}
                >
                  <option value="">Select…</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estimated Value</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.estimatedValue}
                  onChange={(e) => set('estimatedValue', e.target.value)}
                  className={inputClass()}
                />
              </div>
            </div>
          </Section>

          {customFields.length > 0 && (
            <Section label="Custom fields">
              <div className="space-y-3">
                {customFields.map((cf) => (
                  <div key={cf.id}>
                    <label className="block text-xs text-gray-500 mb-1">{cf.name}</label>
                    {cf.type === 'select' && cf.options ? (
                      <select
                        value={form.customFields[cf.id] ?? ''}
                        onChange={(e) => setCustomField(cf.id, e.target.value)}
                        className={inputClass()}
                      >
                        <option value="">Select…</option>
                        {cf.options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                        value={form.customFields[cf.id] ?? ''}
                        onChange={(e) => setCustomField(cf.id, e.target.value)}
                        className={inputClass()}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!isEdit && (
            <Section label="Initial note">
              <textarea
                placeholder="Add a short note about this lead…"
                value={initialNote}
                onChange={(e) => setInitialNote(e.target.value)}
                rows={3}
                className={`${inputClass()} resize-none`}
              />
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-4 mb-2">Attach a document (optional)</p>
              <div className="space-y-2">
                <input
                  placeholder="Document name"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className={inputClass()}
                />
                <input
                  type="url"
                  placeholder="https://…"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className={inputClass()}
                />
              </div>
            </Section>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          {isEdit && !lead?.isClient ? (
            <Button variant="ghost" size="sm" onClick={() => setConvertOpen(true)}>
              Convert to client
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit}>{isEdit ? 'Save changes' : 'Create lead'}</Button>
          </div>
        </div>
      </SlideOver>

      <AddClientModal
        open={convertOpen}
        preselectedLead={lead}
        onClose={() => setConvertOpen(false)}
        onAdded={() => { setConvertOpen(false); onClose(); onSaved() }}
      />

      {/* Duplicate confirmation — rendered outside SlideOver so it stacks on top */}
      <Modal
        open={showDuplicateConfirm}
        onClose={() => setShowDuplicateConfirm(false)}
        title="Duplicate email detected"
      >
        <p className="text-sm text-gray-600 mb-6">
          A lead with this email already exists —{' '}
          <span className="font-medium text-gray-900">
            {duplicateLead?.firstName} {duplicateLead?.lastName}
          </span>
          . Do you want to create a duplicate entry anyway?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDuplicateConfirm(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setShowDuplicateConfirm(false)
              persist()
            }}
          >
            Create anyway
          </Button>
        </div>
      </Modal>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  )
}
