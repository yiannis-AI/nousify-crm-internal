export type StageColorKey = 'blue' | 'sky' | 'green' | 'teal' | 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'gray'

export const STAGE_COLORS: Record<StageColorKey, {
  bg: string
  bgOver: string
  text: string
  addBtn: string
  dot: string
  borderTop: string
}> = {
  blue:   { bg: 'bg-blue-50/70',   bgOver: 'bg-blue-100/80',   text: 'text-blue-400/80',   addBtn: 'text-blue-300 hover:bg-white/60 hover:text-blue-500',    dot: '#93c5fd', borderTop: 'border-t-[6px] border-blue-300'   },
  sky:    { bg: 'bg-sky-50/70',    bgOver: 'bg-sky-100/80',    text: 'text-sky-400/80',    addBtn: 'text-sky-300 hover:bg-white/60 hover:text-sky-500',     dot: '#7dd3fc', borderTop: 'border-t-[6px] border-sky-300'    },
  green:  { bg: 'bg-green-50/70',  bgOver: 'bg-green-100/80',  text: 'text-green-500/80',  addBtn: 'text-green-300 hover:bg-white/60 hover:text-green-500',  dot: '#86efac', borderTop: 'border-t-[6px] border-green-300'  },
  teal:   { bg: 'bg-teal-50/70',   bgOver: 'bg-teal-100/80',   text: 'text-teal-500/80',   addBtn: 'text-teal-300 hover:bg-white/60 hover:text-teal-500',   dot: '#5eead4', borderTop: 'border-t-[6px] border-teal-300'   },
  yellow: { bg: 'bg-yellow-50/70', bgOver: 'bg-yellow-100/80', text: 'text-yellow-600/80', addBtn: 'text-yellow-400 hover:bg-white/60 hover:text-yellow-600', dot: '#fde047', borderTop: 'border-t-[6px] border-yellow-300' },
  orange: { bg: 'bg-orange-50/70', bgOver: 'bg-orange-100/80', text: 'text-orange-400/80', addBtn: 'text-orange-300 hover:bg-white/60 hover:text-orange-500', dot: '#fdba74', borderTop: 'border-t-[6px] border-orange-300' },
  red:    { bg: 'bg-red-50/70',    bgOver: 'bg-red-100/80',    text: 'text-red-400/80',    addBtn: 'text-red-300 hover:bg-white/60 hover:text-red-500',     dot: '#fca5a5', borderTop: 'border-t-[6px] border-red-300'    },
  pink:   { bg: 'bg-pink-50/70',   bgOver: 'bg-pink-100/80',   text: 'text-pink-400/80',   addBtn: 'text-pink-300 hover:bg-white/60 hover:text-pink-500',   dot: '#f9a8d4', borderTop: 'border-t-[6px] border-pink-300'   },
  purple: { bg: 'bg-purple-50/70', bgOver: 'bg-purple-100/80', text: 'text-purple-400/80', addBtn: 'text-purple-300 hover:bg-white/60 hover:text-purple-500', dot: '#d8b4fe', borderTop: 'border-t-[6px] border-purple-300' },
  gray:   { bg: 'bg-gray-100/70',  bgOver: 'bg-gray-200/80',   text: 'text-gray-400/80',   addBtn: 'text-gray-300 hover:bg-white/60 hover:text-gray-500',   dot: '#d1d5db', borderTop: 'border-t-[6px] border-gray-300'   },
}

export const COLOR_KEYS = Object.keys(STAGE_COLORS) as StageColorKey[]
