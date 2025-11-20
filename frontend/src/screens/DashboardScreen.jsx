import React from 'react'

const DashboardScreen = ({ report, reportLoading, onRefresh, formatNumber, formatTimestamp }) => {
  return (
    <>
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <p className="uppercase tracking-[0.3em] text-xs text-slate-400">GAID / IDFA partner delivery</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-2">Partner-ready ads and pixel tracking</h1>
            <p className="text-slate-500 mt-3 max-w-3xl">
              Launch creatives that only render for specific device identifiers, track impressions, clicks, and conversions,
              and share an embeddable pixel that partners can drop into their sites in seconds.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {['GAID & IDFA filters', 'Pixel JS delivery', 'Realtime counters'].map((pill) => (
                <span key={pill} className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-slate-100 rounded-2xl p-4 min-w-[240px] shadow-inner">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Status</p>
            <div className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(report?.totals?.impressions || 0)}</div>
            <p className="text-slate-500 text-sm mt-1">Lifetime impressions across all ads.</p>
            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-900 px-4 py-2 font-semibold transition hover:bg-slate-300 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              type="button"
              onClick={onRefresh}
              disabled={reportLoading}
            >
              {reportLoading ? 'Refreshing…' : 'Refresh report'}
            </button>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
        {!report && !reportLoading && (
          <div className="text-center text-slate-500 py-6">
            <p>No tracking data yet.</p>
            <p className="text-sm">Pixels will start reporting once they record impressions or clicks.</p>
          </div>
        )}

        {report && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Impressions', value: report.totals?.impressions || 0 },
                { label: 'Clicks', value: report.totals?.clicks || 0 },
                { label: 'Conversions', value: report.totals?.conversions || 0 }
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-sm text-slate-500">{card.label}</span>
                  <div className="text-3xl font-semibold text-slate-900 mt-2">{formatNumber(card.value)}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">Partner activity</h3>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase tracking-wider text-slate-400 border-b">
                    <tr>
                      <th className="py-2">Partner</th>
                      <th className="py-2">Impr.</th>
                      <th className="py-2">Clicks</th>
                      <th className="py-2">Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.partners && report.partners.length ? (
                      report.partners.map((row) => (
                        <tr key={row.partner}>
                          <td className="py-2 font-semibold">{row.partner}</td>
                          <td className="py-2">{formatNumber(row.impressions)}</td>
                          <td className="py-2">{formatNumber(row.clicks)}</td>
                          <td className="py-2">{formatNumber(row.conversions)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-slate-500">No partner traffic yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">Top ads</h3>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase tracking-wider text-slate-400 border-b">
                    <tr>
                      <th className="py-2">Ad</th>
                      <th className="py-2">Impr.</th>
                      <th className="py-2">Clicks</th>
                      <th className="py-2">Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.topAds && report.topAds.length ? (
                      report.topAds.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 font-semibold">{row.name}</td>
                          <td className="py-2">{formatNumber(row.impressions)}</td>
                          <td className="py-2">{formatNumber(row.clicks)}</td>
                          <td className="py-2">{formatNumber(row.conversions)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-slate-500">No ads have activity yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
              </div>
              {report.recentEvents && report.recentEvents.length ? (
                <ul className="flex flex-col gap-4">
                  {report.recentEvents.map((event) => (
                    <li key={event.id} className="flex items-center justify-between border-b pb-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{event.eventType?.toUpperCase()}</span>
                          <strong>{event.adName || 'Ad removed'}</strong>
                        </div>
                        <span className="text-slate-500">{event.partner}</span>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>{formatTimestamp(event.createdAt)}</div>
                        <div>{event.deviceType?.toUpperCase()} • {event.deviceId || 'unknown'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-slate-500 py-6">No events recorded yet.</div>
              )}
            </div>
          </>
        )}
      </section>
    </>
  )
}

export default DashboardScreen
