import React from 'react'

const UsersScreen = ({ authUser, onLogout }) => {
  return (
    <section className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin access</p>
        <h2 className="text-xl font-semibold text-slate-900">User directory</h2>
        <p className="text-sm text-slate-500 mt-2">
          Admin accounts live inside the MySQL <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">users</code> table. Seed once to bootstrap credentials and then manage them through your preferred database UI.
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

      <div className="rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-900">Provisioning tips</h3>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
          <li>Use the `users` table to add or remove admins. Passwords are hashed automatically via Adonis hooks.</li>
          <li>Run <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">npx adonis seed --files AdminSeeder.js</code> to recreate the default `admin@example.com / secret123` account on empty databases.</li>
          <li>Share credentials securely with teammates and reset them periodically.</li>
        </ul>
      </div>
    </section>
  )
}

export default UsersScreen
