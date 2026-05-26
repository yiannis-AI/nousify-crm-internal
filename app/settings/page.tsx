'use client'

import { useState, useEffect } from 'react'
import { getSettings, saveSettings, CURRENCIES } from '@/lib/settings'

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

export default function SettingsPage() {
  const [currencyCode, setCurrencyCode] = useState('USD')

  useEffect(() => {
    setCurrencyCode(getSettings().currencyCode)
  }, [])

  function handleCurrencyChange(code: string) {
    setCurrencyCode(code)
    saveSettings({ currencyCode: code })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your workspace preferences.</p>
        </div>
      </div>

      <div className="px-8 py-6 max-w-xl space-y-8">
        {/* General section */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">General</p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            <div className="px-5 py-4 flex items-center justify-between gap-8">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Currency</p>
                <p className="text-xs text-gray-500 mt-0.5">Used for estimated values in leads and contract values in clients.</p>
              </div>
              <div className="w-56 flex-shrink-0">
                <select
                  value={currencyCode}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className={inputClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Business Context section */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Business Context</p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-8 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Context for AI</p>
                  <p className="text-xs text-gray-500 mt-0.5">Information the AI agent will reference when working with your leads and clients.</p>
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Coming soon</span>
              </div>
              <textarea
                disabled
                placeholder="Describe your business, ideal customer profile, tone of voice, and anything else the AI should know…"
                rows={5}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 resize-none cursor-not-allowed placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
