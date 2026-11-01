import { useState } from 'react'
import { useWeather } from '../context/WeatherContext'

export default function AlertsBanner() {
  const { data, status } = useWeather()
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (status !== 'ready' || dismissed) return null
  const alerts = data?.alerts?.alert ?? []
  if (alerts.length === 0) return null

  const first = alerts[0]

  return (
    <div
      role="alert"
      className="rise-in mb-5 overflow-hidden rounded-2xl border backdrop-blur-xl sm:mb-6"
      style={{
        background: 'rgba(217, 119, 6, 0.28)',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        color: '#fffbeb',
        boxShadow: '0 8px 32px rgba(120, 53, 15, 0.25)',
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
        <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {first.event || first.headline || 'Weather alert'}
            {alerts.length > 1 && (
              <span className="ml-2 font-normal opacity-80">+{alerts.length - 1} more</span>
            )}
          </p>
          {expanded && (
            <div className="mt-2 space-y-3 text-sm opacity-90">
              {alerts.map((a, i) => (
                <div key={i}>
                  {a.headline && <p className="font-medium">{a.headline}</p>}
                  {a.desc && <p className="mt-1 whitespace-pre-line text-xs leading-relaxed">{a.desc}</p>}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-xs font-medium underline underline-offset-2 opacity-90 hover:opacity-100"
          >
            {expanded ? 'Show less' : 'Details'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss alert"
          className="rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
