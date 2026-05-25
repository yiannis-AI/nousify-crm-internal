'use client'

import { SlideOver } from '@/components/ui/SlideOver'
import { ActivityTimeline } from './ActivityTimeline'
import type { ActivityEntry } from '@/types'

interface TimelineSlideOverProps {
  open: boolean
  leadId: string
  leadName: string
  entries: ActivityEntry[]
  onClose: () => void
  onEntriesChange: () => void
}

export function TimelineSlideOver({
  open,
  leadId,
  leadName,
  entries,
  onClose,
  onEntriesChange,
}: TimelineSlideOverProps) {
  return (
    <SlideOver open={open} onClose={onClose} title={`Tasks — ${leadName}`} size="lg">
      <div className="px-6 py-6">
        <ActivityTimeline
          leadId={leadId}
          entries={entries}
          onEntriesChange={onEntriesChange}
        />
      </div>
    </SlideOver>
  )
}
