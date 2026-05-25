'use client'

import type { LeadQuality } from '@/types'

interface BadgeProps {
  label: string
  color?: string
}

const QUALITY_STYLES: Record<NonNullable<LeadQuality>, string> = {
  high:   'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  low:    'bg-red-50 text-red-700',
  '':     '',
}

export function LeadQualityBadge({ quality }: { quality: LeadQuality }) {
  if (!quality) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${QUALITY_STYLES[quality]}`}>
      {quality.charAt(0).toUpperCase() + quality.slice(1)}
    </span>
  )
}

const defaultColors: Record<string, string> = {
  new: 'bg-indigo-50 text-indigo-700',
  contacted: 'bg-amber-50 text-amber-700',
  qualified: 'bg-emerald-50 text-emerald-700',
  unqualified: 'bg-red-50 text-red-700',
  converted: 'bg-purple-50 text-purple-700',
}

export function Badge({ label, color }: BadgeProps) {
  const key = label.toLowerCase().replace(/\s+/g, '_')
  const preset = defaultColors[key]

  if (preset) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${preset}`}>
        {label}
      </span>
    )
  }

  if (color) {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {label}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {label}
    </span>
  )
}
