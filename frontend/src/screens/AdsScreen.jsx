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
  createModalProps
}) => {
  return (
    <div className="space-y-8">
      <section className="bg-white rounded-3xl shadow-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active pixels</p>
            <h2 className="text-xl font-semibold text-slate-900">Partner placements</h2>
          </div>
          <div className="flex items-center gap-3">
          {loading && <span className="text-sm text-slate-500">Loading…</span>}
          <button
            className="inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-900 px-4 py-2 font-semibold transition hover:bg-slate-300"
            type="button"
            onClick={onOpenCreateModal}
          >
            New ad
          </button>
        </div>
      </div>

        {!ads.length && !loading ? (
          <div className="text-center text-slate-500 py-8">
            <p>No ads yet.</p>
            <p className="text-sm">Create a campaign and we will generate a pixel for you.</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-widest text-slate-400 border-b">
              <tr>
                <th className="py-2">Ad</th>
                <th className="py-2">Status</th>
                <th className="py-2">Impr.</th>
                <th className="py-2">Clicks</th>
                <th className="py-2">Conv.</th>
                <th className="py-2">Pixel ID</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(ads || []).map((ad) => {
                const stats = statsMap[ad.id] || {}
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
                    <td className="py-3">{stats.impression ?? '0'}</td>
                    <td className="py-3">{stats.click ?? '0'}</td>
                    <td className="py-3">{stats.conversion ?? '0'}</td>
                    <td className="py-3 font-mono text-xs break-all">{ad.pixelId}</td>
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
          <li>Drop the script wherever you want the creative to render. Provide <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-device-type</code> set to <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">gaid</code> or <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">idfa</code>.</li>
          <li>Populate <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">data-device-id</code> with the GAID/IDFA you resolved for the visitor.</li>
          <li>If you need to trigger a conversion after signup, call <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">window.adsPixelConversion_{'{'}pixelId{'}'}(meta)</code> from the partner site.</li>
          <li>When no targeting IDs are configured, the ad is returned for every visitor by default.</li>
        </ul>
      </section>

      {detailModalProps && <AdDetailModal {...detailModalProps} />}
      {createModalProps && <CreateAdModal {...createModalProps} />}
    </div>
  )
}

export default AdsScreen
