import React from 'react'
import { createPortal } from 'react-dom'

const CreateAdModal = ({
  isOpen,
  onClose,
  onSubmit,
  onChange,
  formState,
  error,
  saving,
  ghostSmallButtonClass,
  primaryButtonClass,
  inputClass,
  textareaClass,
  selectClass,
  canAssignOwner,
  ownerOptions = []
}) => {
  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const modalContent = (
    <div className="app-modal">
      <div className="app-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="app-modal__panel" role="dialog" aria-modal="true">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">New campaign</p>
              <h3 className="text-2xl font-semibold text-slate-900">Create an ad</h3>
            </div>
            <button className={ghostSmallButtonClass} type="button" onClick={onClose}>
              Close
            </button>
          </div>
          {error && <span className="inline-flex rounded-full bg-red-100 text-red-600 px-3 py-1 text-sm">{error}</span>}
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            {canAssignOwner && (
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                <span>Assign to client</span>
                <select
                  className={selectClass}
                  name="ownerId"
                  value={formState.ownerId}
                  onChange={onChange}
                  required={canAssignOwner}
                >
                  <option value="">Select client</option>
                  {ownerOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.organization || client.username || client.email}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Slot key</span>
              <input
                className={inputClass}
                name="slotKey"
                placeholder="shared-slot-1"
                value={formState.slotKey}
                onChange={onChange}
              />
              <span className="text-xs text-slate-400">Ads dengan slot key yang sama akan ikut auction pada snippet yang sama.</span>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Name *</span>
              <input
                className={inputClass}
                name="name"
                required
                placeholder="Partner launch"
                value={formState.name}
                onChange={onChange}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Headline</span>
              <input
                className={inputClass}
                name="headline"
                placeholder="Grow faster with our SDK"
                value={formState.headline}
                onChange={onChange}
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              <span>Description</span>
              <textarea
                className={textareaClass}
                name="description"
                placeholder="Optional body copy…"
                rows="2"
                value={formState.description}
                onChange={onChange}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Image URL</span>
              <input
                className={inputClass}
                name="imageUrl"
                placeholder="https://cdn.example.com/creative.png"
                value={formState.imageUrl}
                onChange={onChange}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>CTA URL *</span>
              <input
                className={inputClass}
                name="ctaUrl"
                required
                placeholder="https://example.com/signup"
                value={formState.ctaUrl}
                onChange={onChange}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>CTA label</span>
              <input
                className={inputClass}
                name="ctaLabel"
                value={formState.ctaLabel}
                onChange={onChange}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>CPC bid (Rp)</span>
              <input
                className={inputClass}
                name="cpcBid"
                type="number"
                min="0"
                step="0.01"
                value={formState.cpcBid}
                onChange={onChange}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Daily budget (Rp)</span>
              <input
                className={inputClass}
                name="dailyBudget"
                type="number"
                min="0"
                step="0.01"
                value={formState.dailyBudget}
                onChange={onChange}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Total budget (Rp)</span>
              <input
                className={inputClass}
                name="totalBudget"
                type="number"
                min="0"
                step="0.01"
                value={formState.totalBudget}
                onChange={onChange}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Creative type</span>
              <select
                className={selectClass}
                name="creativeType"
                value={formState.creativeType}
                onChange={onChange}
              >
                <option value="box">Inline card</option>
                <option value="modal">Popup modal</option>
              </select>
            </label>


            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              <span>Geo targeting (country codes, comma separated)</span>
              <textarea
                className={textareaClass}
                name="targetingGeo"
                placeholder="us, id, sg"
                rows="2"
                value={formState.targetingGeo}
                onChange={onChange}
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              <span>Province targeting (comma separated)</span>
              <textarea
                className={textareaClass}
                name="targetingProvinces"
                placeholder="jakarta, jawa barat"
                rows="2"
                value={formState.targetingProvinces}
                onChange={onChange}
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              <span>City targeting (comma separated)</span>
              <textarea
                className={textareaClass}
                name="targetingCities"
                placeholder="jakarta selatan, bandung"
                rows="2"
                value={formState.targetingCities}
                onChange={onChange}
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              <span>Device classes (e.g. mobile, desktop, android, ios)</span>
              <textarea
                className={textareaClass}
                name="targetingDevices"
                placeholder="mobile, desktop"
                rows="2"
                value={formState.targetingDevices}
                onChange={onChange}
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              <span>Interest tags</span>
              <textarea
                className={textareaClass}
                name="targetingInterests"
                placeholder="gaming, fintech, travel"
                rows="2"
                value={formState.targetingInterests}
                onChange={onChange}
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              <span>GAID allow list</span>
              <textarea
                className={textareaClass}
                name="targetingGaids"
                placeholder="gaid-a, gaid-b"
                rows="2"
                value={formState.targetingGaids}
                onChange={onChange}
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              <span>IDFA allow list</span>
              <textarea
                className={textareaClass}
                name="targetingIdfas"
                placeholder="idfa-a, idfa-b"
                rows="2"
                value={formState.targetingIdfas}
                onChange={onChange}
              />
            </label>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button className={primaryButtonClass} type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Create ad'}
              </button>
              <p className="text-sm text-slate-500">Ads with no targeting will be delivered to all devices automatically.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default CreateAdModal
