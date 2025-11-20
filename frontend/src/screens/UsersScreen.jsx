import React from 'react'

const ROLE_LABEL = {
  super_admin: 'Super Admin',
  client: 'Client',
  publisher: 'Publisher'
}

const UsersScreen = ({
  authUser,
  onLogout,
  canManage,
  users = [],
  loading,
  onRefresh,
  onOpenCreateModal
}) => {
  if (!canManage) {
    return (
      <section className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Account</p>
          <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
          <p className="text-sm text-slate-500 mt-2">
            Reach out to your administrator to update permissions or provision new accounts.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in as</span>
            <strong className="block text-2xl text-slate-900">{authUser?.username}</strong>
            <span className="text-slate-500 text-sm">{authUser?.email}</span>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-900 px-4 py-2 font-semibold transition hover:bg-slate-300"
            type="button"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Super admin</p>
            <h2 className="text-xl font-semibold text-slate-900">User directory</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">
              Manage advertiser, publisher, and admin accounts without leaving the CMS. Passwords are hashed automatically when saved.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white px-4 py-2 font-semibold transition hover:bg-blue-500"
              onClick={onOpenCreateModal}
            >
              New user
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-900 px-4 py-2 font-semibold transition hover:bg-slate-300"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh list'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-widest text-slate-400 border-b">
              <tr>
                <th className="py-2">User</th>
                <th className="py-2">Role</th>
                <th className="py-2">Balance</th>
                <th className="py-2">Payout</th>
                <th className="py-2">Partner key</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(users || []).map((user) => (
                <tr key={user.id}>
                  <td className="py-3">
                    <div className="flex flex-col">
                      <strong className="text-slate-900">{user.username}</strong>
                      <span className="text-xs text-slate-500">{user.email}</span>
                      {user.organization && <span className="text-xs text-slate-400">{user.organization}</span>}
                    </div>
                  </td>
                  <td className="py-3">{ROLE_LABEL[user.role] || user.role}</td>
                  <td className="py-3">Rp {Number(user.balance || 0).toLocaleString()}</td>
                  <td className="py-3">Rp {Number(user.payoutBalance || 0).toLocaleString()}</td>
                  <td className="py-3 font-mono text-xs">{user.partnerKey || '—'}</td>
                </tr>
              ))}
              {!loading && (!users || !users.length) && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan="5">
                    No users found. Use the New user button to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default UsersScreen
