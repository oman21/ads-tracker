import React from 'react'
import AdDetailModal from './components/AdDetailModal'
import CreateAdModal from './components/CreateAdModal'

const AdsScreen = ({
  ads,
  loading,
  statsMap,
  selectedAdId,
  onSelectAd,
  onOpenCreateModal,
  renderTargetingLabel,
  detailModalProps,
  createModalProps,
  canCreateAds
}) => {
  const formatCurrency = (value) => {
    const numberValue = Number(value || 0)
    return numberValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-3xl shadow-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active slots</p>
            <h2 className="text-xl font-semibold text-slate-900">Partner placements</h2>
          </div>
          <div className="flex items-center gap-3">
            {loading && <span className="text-sm text-slate-500">Loading…</span>}
            {canCreateAds ? (
              <button
                className="inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-900 px-4 py-2 font-semibold transition hover:bg-slate-300"
                type="button"
                onClick={onOpenCreateModal}
              >
                New ads
              </button>
            ) : (
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">View only</span>
            )}
          </div>
        </div>

        {!ads.length && !loading ? (
          <div className="text-center text-slate-500 py-8">
            <p>No ads yet.</p>
            <p className="text-sm">
              {canCreateAds ? 'Create a campaign and we will generate a pixel for you.' : 'No campaigns have been shared with you yet.'}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-widest text-slate-400 border-b">
              <tr>
                <th className="py-2">Ad</th>
                <th className="py-2">Status</th>
                <th className="py-2">CPC</th>
                <th className="py-2">Daily budget</th>
                <th className="py-2">Impr.</th>
                <th className="py-2">Clicks</th>
                <th className="py-2">Conv.</th>
                <th className="py-2">Slot Key</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(ads || []).map((ad) => {
                const stats = statsMap[ad.id]?.totals || {}
                return (
                <tr key={ad.id}>
                  <td className="py-3">
                    <div className="flex flex-col">
                      <strong className="text-slate-900">{ad.name}</strong>
                      <span className="text-xs text-slate-500">{renderTargetingLabel(ad)}</span>
                    </div>
                  </td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ad.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                        {ad.active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="py-3">Rp {formatCurrency(ad.cpcBid)}</td>
                    <td className="py-3">
                      <div className="flex flex-col leading-tight">
                        <span>Rp {formatCurrency(ad.dailyBudget)}</span>
                        <span className="text-xs text-slate-500">Spent today: Rp {formatCurrency(ad.spentToday)}</span>
                      </div>
                    </td>
                    <td className="py-3">{stats.impression ?? '0'}</td>
                    <td className="py-3">{stats.click ?? '0'}</td>
                    <td className="py-3">{stats.conversion ?? '0'}</td>
                    <td className="py-3 font-mono text-xs break-all">{ad.slotKey || '—'}</td>
                    <td className="py-3">
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-900 px-3 py-1.5 text-sm font-semibold transition hover:bg-slate-300"
                        type="button"
                        onClick={() => onSelectAd(ad.id)}
                      >
                        {selectedAdId === ad.id ? 'Hide detail' : 'View detail'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-xl p-6">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Implementation tips</p>
          <h2 className="text-xl font-semibold text-slate-900">Partner integration</h2>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
          <li>Drop the script wherever you want the creative to render. Provide <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-device-type</code> &amp; <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-device-id</code> hanya jika campaign mensyaratkan GAID/IDFA tertentu; jika tidak, biarkan kosong supaya iklan muncul untuk semua device.</li>
          <li>Pass context seperti <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-country</code>, <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-province</code>, <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-city</code>, <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-category</code>, <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-device-class</code>, atau <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-interests</code> hanya ketika advertiser setting targeting spesifik. Tanpa atribut tersebut, slot akan mengembalikan iklan default (show to everyone).</li>
          <li>Ads yang menggunakan <strong>slot key</strong> yang sama akan berbagi snippet dan Ad Server akan memilih bid tertinggi yang memenuhi targeting secara otomatis. Anda dapat menaruh slot key di URL (seperti contoh snippet) atau melalui atribut <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-slot</code>.</li>
          <li>If you need to trigger a conversion after signup, call <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">window.adsPixelConversion_{'{'}PARTNER_KEY{'}'}(meta)</code> (atau gunakan pixel ID jika diperlukan) dari situs partner.</li>
          <li>When no targeting IDs are configured, the ad is returned for every visitor by default.</li>
        </ul>
      </section>

      {detailModalProps && <AdDetailModal {...detailModalProps} />}
      {createModalProps && <CreateAdModal {...createModalProps} />}
    </div>
  )
}

export default AdsScreen
