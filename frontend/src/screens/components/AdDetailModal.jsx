import React from 'react'
import { createPortal } from 'react-dom'

const AdDetailModal = ({
  isOpen,
  onClose,
  onRefresh,
  renderTargetingLabel,
  ad,
  stats,
  billing,
  activity,
  activityMeta,
  snippet,
  snippetPartnerKey,
  snippetLoading,
  copiedAd,
  onGenerateSnippet,
  onSnippetPartnerKeyChange,
  onCopySnippet,
  onFilterChange,
  onPrevPage,
  onNextPage,
  formatTimestamp,
  formatNumber,
  ghostSmallButtonClass
}) => {
  if (!isOpen || !ad) return null
  if (typeof document === 'undefined') return null
  const formatList = (list, fallback) => {
    if (Array.isArray(list) && list.length) {
      return list.join(', ')
    }
    return fallback
  }
  const modalContent = (
    <div className="app-modal">
      <div className="app-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="app-modal__panel" role="dialog" aria-modal="true">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{renderTargetingLabel(ad)}</p>
              <h3 className="text-2xl font-semibold text-slate-900">{ad.name}</h3>
            </div>
            <div className="flex gap-3">
              <button className={ghostSmallButtonClass} type="button" onClick={onRefresh}>
                Refresh detail
              </button>
              <button className={ghostSmallButtonClass} type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {ad.imageUrl && (
              <img src={ad.imageUrl} alt={ad.name} className="w-56" />
            )}
            <div className="flex-1 space-y-4">
              <p className="text-slate-600">{ad.description || 'No description provided.'}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">CTA URL</span>
                  {ad.ctaUrl ? (
                    <a href={ad.ctaUrl} target="_blank" rel="noreferrer" className="block text-blue-600 font-medium mt-1 break-words">
                      {ad.ctaUrl}
                    </a>
                  ) : (
                    <em className="text-slate-400 text-sm">Not set</em>
                  )}
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">CTA label</span>
                  <strong className="block mt-1">{ad.ctaLabel || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Slot key</span>
                  <strong className="block mt-1 font-mono text-sm">{ad.slotKey || '—'}</strong>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Creative type</span>
                  <strong className="block mt-1">{ad.creativeType?.toUpperCase()}</strong>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Targeting</span>
                  <strong className="block mt-1">{renderTargetingLabel(ad)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Activity</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2 font-medium text-slate-600">Impressions</td>
                    <td className="py-2 text-right">{stats?.impression ?? 0}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-slate-600">Clicks</td>
                    <td className="py-2 text-right">{stats?.click ?? 0}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-slate-600">Conversions</td>
                    <td className="py-2 text-right">{stats?.conversion ?? 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Embed snippet</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Partner key"
                    value={snippetPartnerKey}
                    onChange={(event) => onSnippetPartnerKeyChange(ad.id, event.target.value)}
                  />
                  <button
                    className={ghostSmallButtonClass}
                    type="button"
                    onClick={() => onGenerateSnippet(ad.id, snippetPartnerKey)}
                    disabled={snippetLoading === ad.id}
                  >
                    {snippetLoading === ad.id ? 'Loading…' : 'Generate'}
                  </button>
                </div>
              </div>
              {snippet ? (
                <>
                  <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs overflow-x-auto">
                    <code>{snippet}</code>
                  </div>
                  <p className="text-xs text-slate-400">Slot key: <span className="font-mono">{ad.slotKey || '—'}</span></p>
                  <button
                    className={ghostSmallButtonClass}
                    type="button"
                    onClick={() => onCopySnippet(ad.id, snippet)}
                  >
                    {copiedAd === ad.id ? 'Copied!' : 'Copy snippet'}
                  </button>
                  </>
              ) : (
                <p className="text-sm text-slate-500">Generate the embed code to share with partners.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Budget & billing</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'CPC bid', value: billing?.cpcBid ?? ad?.cpcBid ?? 0 },
                { label: 'Daily budget', value: billing?.dailyBudget ?? ad?.dailyBudget ?? 0 },
                { label: 'Total budget', value: billing?.totalBudget ?? ad?.totalBudget ?? 0 },
                { label: 'Spent today', value: billing?.spentToday ?? ad?.spentToday ?? 0 },
                { label: 'Spent total', value: billing?.spentTotal ?? ad?.spentTotal ?? 0 }
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</span>
                  <div className="text-lg font-semibold text-slate-900 mt-1">Rp {formatNumber(item.value || 0)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Targeting rules</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Country', value: formatList(ad.targetingGeo, 'All countries') },
                { label: 'Province', value: formatList(ad.targetingProvinces, 'All provinces') },
                { label: 'City', value: formatList(ad.targetingCities, 'All cities') },
                { label: 'Device classes', value: formatList(ad.targetingDevices, 'All devices') },
                { label: 'Interests', value: formatList(ad.targetingInterests, 'All interests') },
                { label: 'GAID allow list', value: formatList(ad.targetingGaids, 'Any GAID') },
                { label: 'IDFA allow list', value: formatList(ad.targetingIdfas, 'Any IDFA') }
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</span>
                  <div className="text-sm text-slate-800 mt-1 break-words">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Recent events</h3>
              <select
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                value={activityMeta?.eventType || ''}
                onChange={onFilterChange}
              >
                <option value="">All events</option>
                <option value="impression">Impressions</option>
                <option value="click">Clicks</option>
                <option value="conversion">Conversions</option>
              </select>
            </div>
            {activity && activity.length ? (
              <>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-left tracking-widest text-slate-400 border-b">
                    <tr>
                      <th className="py-2">Event</th>
                      <th className="py-2">Partner</th>
                      <th className="py-2">Device</th>
                      <th className="py-2">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activity.map((event) => (
                      <tr key={event.id}>
                        <td className="py-3 align-top">
                          <div className="flex flex-col gap-2">
                            <span className="inline-flex w-fit px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                              {event.eventType?.toUpperCase()}
                            </span>
                            {
                              event.eventType &&
                              event.eventType.toLowerCase() === "conversion" &&
                              event.metadata && (
                                <pre className="bg-slate-900 text-white rounded-xl p-2 text-xs overflow-x-auto">
                                  {JSON.stringify(
                                    typeof event.metadata === "string"
                                      ? JSON.parse(event.metadata)
                                      : event.metadata,
                                    null,
                                    2
                                  )}
                                </pre>
                              )
                            }
                          </div>
                        </td>
                        <td className="py-3">{event.partner || '—'}</td>
                        <td className="py-3">{event.deviceType ? `${event.deviceType.toUpperCase()} • ${event.deviceId || 'unknown'}` : (event.deviceId || 'unknown')}</td>
                        <td className="py-3 text-xs text-slate-500">{formatTimestamp(event.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    className={ghostSmallButtonClass}
                    onClick={onPrevPage}
                    disabled={(activityMeta?.page || 1) <= 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-500">Page {activityMeta?.page || 1}</span>
                  <button
                    type="button"
                    className={ghostSmallButtonClass}
                    onClick={onNextPage}
                    disabled={!activityMeta?.hasMore}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No tracking events recorded for this ad yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default AdDetailModal
