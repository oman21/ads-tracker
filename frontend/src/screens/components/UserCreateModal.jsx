import React from 'react'
import { createPortal } from 'react-dom'

const UserCreateModal = ({
  isOpen,
  onClose,
  onSubmit,
  onChange,
  formState,
  error,
  saving,
  ghostSmallButtonClass,
  primaryButtonClass
}) => {
  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const isPublisher = formState.role === 'publisher'

  const modalContent = (
    <div className="app-modal">
      <div className="app-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="app-modal__panel" role="dialog" aria-modal="true">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Provision user</p>
              <h3 className="text-2xl font-semibold text-slate-900">Create new account</h3>
            </div>
            <button className={ghostSmallButtonClass} type="button" onClick={onClose}>
              Close
            </button>
          </div>

          {error && (
            <span className="inline-flex rounded-full bg-red-100 text-red-600 px-3 py-1 text-sm">
              {error}
            </span>
          )}

          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Username</span>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                name="username"
                required
                value={formState.username}
                onChange={onChange}
                placeholder="ads-client"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Email</span>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                type="email"
                name="email"
                required
                value={formState.email}
                onChange={onChange}
                placeholder="client@example.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Password</span>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                type="password"
                name="password"
                required
                value={formState.password}
                onChange={onChange}
                placeholder="••••••••"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>Role</span>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                name="role"
                value={formState.role}
                onChange={onChange}
              >
                <option value="client">Client (advertiser)</option>
                <option value="publisher">Publisher</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600 md:col-span-2">
              <span>Organization</span>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                name="organization"
                value={formState.organization}
                onChange={onChange}
                placeholder="Acme Corp"
              />
            </label>

            {isPublisher && (
              <>
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  <span>Partner key</span>
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                    name="partnerKey"
                    value={formState.partnerKey}
                    onChange={onChange}
                    placeholder="publisher-id"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  <span>Revenue share (%)</span>
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                    type="number"
                    min="0"
                    max="100"
                    name="revenueShare"
                    value={formState.revenueShare}
                    onChange={onChange}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  <span>Payout threshold (Rp)</span>
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                    type="number"
                    min="0"
                    name="payoutThreshold"
                    value={formState.payoutThreshold}
                    onChange={onChange}
                  />
                </label>
              </>
            )}

            {!isPublisher && (
              <p className="text-xs text-slate-500 md:col-span-2">
                Revenue-share and payout configuration is only required for publisher accounts.
              </p>
            )}

            <div className="md:col-span-2 flex items-center gap-3">
              <button
                className={`${primaryButtonClass} min-w-[140px]`}
                type="submit"
                disabled={saving}
              >
                {saving ? 'Creating…' : 'Create user'}
              </button>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Credentials shared securely</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default UserCreateModal
