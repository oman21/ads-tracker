import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import DashboardScreen from './screens/DashboardScreen'
import AdsScreen from './screens/AdsScreen'
import UsersScreen from './screens/UsersScreen'
import './App.css'
import { AdsApi, API_BASE, AuthApi, ReportsApi, clearAuthToken, setAuthToken } from './api'

const initialFormState = {
  name: '',
  headline: '',
  description: '',
  imageUrl: '',
  ctaUrl: '',
  ctaLabel: 'Install now',
  creativeType: 'box',
  targetingMode: 'all',
  targetingValues: ''
}

const NAV_ITEMS = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    eyebrow: 'Performance',
    title: 'Insights dashboard',
    description: 'Monitor partner activity, impression volume, and recent tracking events.'
  },
  {
    key: 'ads',
    path: '/ads',
    label: 'Ads',
    eyebrow: 'Campaigns',
    title: 'Ad management',
    description: 'Create creatives, review stats, and deliver partner-ready pixels.'
  },
  {
    key: 'users',
    path: '/users',
    label: 'Users',
    eyebrow: 'Accounts',
    title: 'User management',
    description: 'Review who has access to the CMS and learn how to provision new admins.'
  }
]

const primaryButtonClass = 'inline-flex items-center justify-center rounded-full bg-blue-600 text-white px-5 py-2 font-semibold shadow transition hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed'
const ghostButtonClass = 'inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-900 px-4 py-2 font-semibold transition hover:bg-slate-300 disabled:opacity-60 disabled:cursor-not-allowed'
const ghostSmallButtonClass = 'inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-900 px-3 py-1.5 text-sm font-semibold transition hover:bg-slate-300 disabled:opacity-60 disabled:cursor-not-allowed'
const inputClass = 'w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 shadow-sm bg-white outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition'
const textareaClass = inputClass + ' min-h-[96px] resize-y'
const selectClass = inputClass

function App () {
  const [token, setToken] = useState(() => localStorage.getItem('adsTrackerToken'))
  const [authUser, setAuthUser] = useState(() => {
    const cached = localStorage.getItem('adsTrackerUser')
    return cached ? JSON.parse(cached) : null
  })
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [ads, setAds] = useState([])
  const [statsMap, setStatsMap] = useState({})
  const [snippets, setSnippets] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [snippetLoading, setSnippetLoading] = useState(null)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState(initialFormState)
  const [copiedAd, setCopiedAd] = useState(null)
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [activityMap, setActivityMap] = useState({})
  const [selectedAdId, setSelectedAdId] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const pixelBaseUrl = useMemo(() => {
    const provided = import.meta.env.VITE_PIXEL_BASE_URL
    if (provided) {
      return provided.replace(/\/$/, '')
    }

    return API_BASE.replace(/\/api$/, '')
  }, [])

  const normalizedPath = useMemo(() => {
    if (!location.pathname || location.pathname === '/') {
      return '/dashboard'
    }
    const stripped = location.pathname.replace(/\/$/, '') || '/'
    if (stripped === '') {
      return '/dashboard'
    }
    return stripped
  }, [location.pathname])

  const activeNav = NAV_ITEMS.find((item) => item.path === normalizedPath) || NAV_ITEMS[0]
  const selectedAd = useMemo(() => ads.find((ad) => ad.id === selectedAdId) || null, [ads, selectedAdId])
  const selectedStats = selectedAd ? (statsMap[selectedAd.id] || {}) : null
  const selectedSnippet = selectedAd ? snippets[selectedAd.id] : null
  const selectedActivityState = selectedAd ? activityMap[selectedAd.id] : null
  const selectedActivity = selectedActivityState ? selectedActivityState.events : null
  const selectedActivityMeta = selectedActivityState ? selectedActivityState.meta : null

useEffect(() => {
  if (token) {
    setAuthToken(token)
    refreshAds()
    loadReport()
    } else {
      clearAuthToken()
      setAds([])
      setStatsMap({})
      setReport(null)
    }
}, [token])

useEffect(() => {
  if (!normalizedPath.startsWith('/ads')) {
    setSelectedAdId(null)
  }
}, [normalizedPath])

useEffect(() => {
  if (selectedAdId) {
    refreshAdStats(selectedAdId)
    const existingMeta = activityMap[selectedAdId]?.meta
    loadActivity(selectedAdId, {
      eventType: existingMeta?.eventType || '',
      page: existingMeta?.page || 1
    })
  }
}, [selectedAdId])

  const handleLogout = () => {
    setToken(null)
    setAuthUser(null)
    setAds([])
    setStatsMap({})
    setReport(null)
    setSnippets({})
    setActivityMap({})
    setFormState(initialFormState)
    clearAuthToken()
    localStorage.removeItem('adsTrackerToken')
    localStorage.removeItem('adsTrackerUser')
    navigate('/dashboard')
  }

  const refreshAds = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    setError('')
    setLoading(true)
    try {
      const list = await AdsApi.list()
      setAds(list)
      await hydrateStats(list)
    } catch (err) {
      if (err.status === 401) {
        handleLogout()
        return
      }
      setError(err.message || 'Unable to load ads')
    } finally {
      setLoading(false)
    }
  }

  const hydrateStats = async (list) => {
    if (!list.length) {
      setStatsMap({})
      return
    }

    const entries = await Promise.all(
      list.map(async (ad) => {
        try {
          const stats = await AdsApi.stats(ad.id)
          return [ad.id, stats.totals]
        } catch (err) {
          console.error('stats error', err)
          return [ad.id, null]
        }
      })
    )

    setStatsMap(Object.fromEntries(entries))
  }

  const loadReport = async () => {
    if (!token) {
      setReport(null)
      return
    }

    setReportLoading(true)
    try {
      const payload = await ReportsApi.overview()
      setReport(payload)
    } catch (err) {
      if (err.status === 401) {
        handleLogout()
      } else {
        console.error('report error', err)
      }
    } finally {
      setReportLoading(false)
    }
  }

  const handleAdInputChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const targetingValues = formState.targetingMode === 'all'
        ? []
        : formState.targetingValues.split(',').map((item) => item.trim()).filter(Boolean)

      await AdsApi.create({
        name: formState.name,
        headline: formState.headline,
        description: formState.description,
        creativeType: formState.creativeType,
        imageUrl: formState.imageUrl,
        ctaUrl: formState.ctaUrl,
        ctaLabel: formState.ctaLabel,
        targetingMode: formState.targetingMode,
        targetingValues,
        active: true
      })

      setFormState(initialFormState)
      setIsCreateModalOpen(false)
      await refreshAds()
      await loadReport()
    } catch (err) {
      if (err.status === 401) {
        handleLogout()
      } else {
        setError(err.message || 'Unable to create ad')
      }
    } finally {
      setSaving(false)
    }
  }

  const loadSnippet = async (adId) => {
    if (snippets[adId]) {
      return
    }

    setSnippetLoading(adId)
    try {
      const snippet = await AdsApi.snippet(adId, pixelBaseUrl)
      setSnippets((prev) => ({
        ...prev,
        [adId]: snippet
      }))
    } catch (err) {
      if (err.status === 401) {
        handleLogout()
      } else {
        setError(err.message || 'Unable to load snippet')
      }
    } finally {
      setSnippetLoading(null)
    }
  }

  const refreshAdStats = async (adId) => {
    if (!adId) return
    try {
      const stats = await AdsApi.stats(adId)
      setStatsMap((prev) => ({
        ...prev,
        [adId]: stats.totals
      }))
    } catch (err) {
      console.error('stats refresh error', err)
    }
  }

  const loadActivity = async (adId, overrides = {}) => {
    if (!adId) return
    try {
      const currentMeta = activityMap[adId]?.meta || {}
      const eventType = overrides.eventType !== undefined
        ? overrides.eventType
        : (currentMeta.eventType || '')
      const page = overrides.page !== undefined
        ? overrides.page
        : (currentMeta.page || 1)

      const payload = await AdsApi.activity(adId, {
        eventType,
        page
      })

      setActivityMap((prev) => ({
        ...prev,
        [adId]: {
          events: payload.data,
          meta: {
            ...(payload.meta || {}),
            eventType: eventType || ''
          }
        }
      }))
    } catch (err) {
      console.error('activity error', err)
    }
  }

  const handleCopy = async (adId, snippet) => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopiedAd(adId)
      setTimeout(() => setCopiedAd(null), 1800)
    } catch (err) {
      console.error('clipboard error', err)
    }
  }

  const handleDetailRefresh = async () => {
    if (!selectedAdId) return
    await Promise.all([
      refreshAdStats(selectedAdId),
      loadActivity(selectedAdId, {
        eventType: selectedActivityMeta?.eventType || '',
        page: selectedActivityMeta?.page || 1
      }),
      loadReport()
    ])
  }

  const openCreateModal = () => {
    setFormState(initialFormState)
    setError('')
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
  }

  const handleSelectAd = (id) => {
    setSelectedAdId((prev) => (prev === id ? null : id))
  }

  const handleActivityFilterChange = (event) => {
    if (!selectedAdId) return
    const value = event.target.value
    const normalized = value || ''
    loadActivity(selectedAdId, { eventType: normalized, page: 1 })
  }

  const handleActivityPrevPage = () => {
    if (!selectedAdId) return
    const currentPage = selectedActivityMeta?.page || 1
    if (currentPage <= 1) {
      return
    }
    loadActivity(selectedAdId, { page: currentPage - 1 })
  }

  const handleActivityNextPage = () => {
    if (!selectedAdId) return
    if (!selectedActivityMeta?.hasMore) {
      return
    }
    const currentPage = selectedActivityMeta?.page || 1
    loadActivity(selectedAdId, { page: currentPage + 1 })
  }

  const renderTargetingLabel = (ad) => {
    if (ad.targetingMode === 'all' || !ad.targetingValues.length) {
      return 'All devices'
    }

    return `${ad.targetingMode.toUpperCase()} • ${ad.targetingValues.length} id(s)`
  }

  const handleAuthInputChange = (event) => {
    const { name, value } = event.target
    setAuthForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      const result = await AuthApi.login(authForm.email, authForm.password)
      setToken(result.token)
      setAuthUser(result.user)
      localStorage.setItem('adsTrackerToken', result.token)
      localStorage.setItem('adsTrackerUser', JSON.stringify(result.user))
      setAuthForm({ email: '', password: '' })
      setAuthToken(result.token)
      await refreshAds()
      await loadReport()
    } catch (err) {
      setAuthError(err.message || 'Unable to sign in')
    } finally {
      setAuthLoading(false)
    }
  }

  const formatNumber = (value) => {
    const numberValue = Number(value || 0)
    return numberValue.toLocaleString()
  }

  const formatTimestamp = (value) => {
    try {
      return new Date(value).toLocaleString()
    } catch (err) {
      return value
    }
  }


  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-slate-100 flex items-center justify-center px-4">
        <form className="bg-white shadow-2xl rounded-3xl p-8 w-full max-w-md space-y-4" onSubmit={handleLogin}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ads CMS</p>
            <h1 className="text-2xl font-semibold text-slate-900 mt-1">Sign in to manage ads</h1>
          </div>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span>Email</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-blue-400"
              type="email"
              name="email"
              value={authForm.email}
              onChange={handleAuthInputChange}
              placeholder="admin@example.com"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span>Password</span>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-blue-400"
              type="password"
              name="password"
              value={authForm.password}
              onChange={handleAuthInputChange}
              placeholder="••••••••"
              required
            />
          </label>
          {authError && <span className="inline-flex rounded-full bg-red-100 text-red-600 px-3 py-1 text-sm">{authError}</span>}
          <button className={primaryButtonClass + ' w-full'} type="submit" disabled={authLoading}>
            {authLoading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-sm text-slate-500">
            Seed the default admin via <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">npx adonis seed --files AdminSeeder.js</code> or update credentials directly in the <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">users</code> table.
          </p>
        </form>
      </div>
    )
  }

  const detailModalProps = {
    isOpen: !!selectedAd,
    onClose: () => setSelectedAdId(null),
    onRefresh: handleDetailRefresh,
    renderTargetingLabel,
    ad: selectedAd,
    stats: selectedStats,
    activity: selectedActivity,
    activityMeta: selectedActivityMeta,
    snippet: selectedSnippet,
    snippetLoading,
    copiedAd,
    onGenerateSnippet: loadSnippet,
    onCopySnippet: handleCopy,
    onFilterChange: handleActivityFilterChange,
    onPrevPage: handleActivityPrevPage,
    onNextPage: handleActivityNextPage,
    formatTimestamp,
    formatNumber,
    ghostSmallButtonClass
  }

  const createModalProps = {
    isOpen: isCreateModalOpen,
    onClose: closeCreateModal,
    onSubmit: handleSubmit,
    onChange: handleAdInputChange,
    formState,
    error,
    saving,
    ghostSmallButtonClass,
    primaryButtonClass,
    inputClass,
    textareaClass,
    selectClass
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col gap-6 p-6 sticky top-0 h-screen shadow-2xl">
        <div className="flex flex-col gap-1 uppercase tracking-[0.35em] text-xs text-slate-400">
          <span>Ads Tracking</span>
          <strong className="tracking-normal text-lg text-white">CMS</strong>
        </div>
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                [
                  'flex flex-col gap-1 rounded-2xl px-4 py-3 text-left transition-colors',
                  isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-200 hover:bg-slate-800'
                ].join(' ')
              }
            >
              <span className="font-semibold text-base">{item.label}</span>
              <small className="text-sm text-slate-300">{item.description}</small>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-slate-800/60 border border-slate-700 p-4 flex flex-col gap-2 text-sm">
          {authUser ? (
            <>
              <p className="text-xs uppercase tracking-widest text-slate-400">Logged in as</p>
              <strong className="text-white text-lg">{authUser.username}</strong>
              <span className="text-slate-300 break-words">{authUser.email}</span>
            </>
          ) : (
            <p className="text-slate-300">No user loaded</p>
          )}
          <button className={ghostSmallButtonClass + ' mt-2 bg-slate-700 text-white hover:bg-slate-600'} type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-h-screen flex flex-col">
        <header className="flex flex-wrap gap-6 items-start justify-between p-6">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-slate-400 mb-1">{activeNav.eyebrow}</p>
            <h1 className="text-3xl font-semibold text-slate-900">{activeNav.title}</h1>
            <p className="text-slate-500 mt-2 max-w-2xl">{activeNav.description}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm bg-white rounded-2xl shadow px-4 py-3 min-w-[220px]">
            <div>
              <span className="uppercase tracking-widest text-[0.6rem] text-slate-400">API base</span>
              <code className="mt-1 block text-slate-900 text-xs break-all">{API_BASE}</code>
            </div>
            <div>
              <span className="uppercase tracking-widest text-[0.6rem] text-slate-400">Pixel base</span>
              <code className="mt-1 block text-slate-900 text-xs break-all">{pixelBaseUrl}</code>
            </div>
          </div>
        </header>

        <div className="flex-1 w-full mx-auto px-6 pb-14">
          <Routes>
            <Route
              path="/dashboard"
              element={(
                <DashboardScreen
                  report={report}
                  reportLoading={reportLoading}
                  onRefresh={loadReport}
                  formatNumber={formatNumber}
                  formatTimestamp={formatTimestamp}
                />
              )}
            />
            <Route
              path="/ads"
              element={(
                <AdsScreen
                  ads={ads}
                  loading={loading}
                  statsMap={statsMap}
                  selectedAdId={selectedAdId}
                  onSelectAd={handleSelectAd}
                  onOpenCreateModal={openCreateModal}
                  renderTargetingLabel={renderTargetingLabel}
                  detailModalProps={detailModalProps}
                  createModalProps={createModalProps}
                />
              )}
            />
            <Route
              path="/users"
              element={(
                <UsersScreen
                  authUser={authUser}
                  onLogout={handleLogout}
                />
              )}
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
