import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import DashboardScreen from './screens/DashboardScreen'
import AdsScreen from './screens/AdsScreen'
import UsersScreen from './screens/UsersScreen'
import './App.css'
import { AdsApi, API_BASE, AuthApi, ReportsApi, UsersApi, clearAuthToken, setAuthToken } from './api'
import UserCreateModal from './screens/components/UserCreateModal'

const initialFormState = {
  name: '',
  headline: '',
  description: '',
  imageUrl: '',
  ctaUrl: '',
  ctaLabel: 'Install now',
  creativeType: 'box',
  slotKey: '',
  targetingGeo: '',
  targetingProvinces: '',
  targetingCities: '',
  targetingDevices: '',
  targetingInterests: '',
  targetingGaids: '',
  targetingIdfas: '',
  cpcBid: '0',
  dailyBudget: '0',
  totalBudget: '0',
  ownerId: ''
}

const initialUserFormState = {
  username: '',
  email: '',
  password: '',
  role: 'client',
  organization: '',
  partnerKey: '',
  revenueShare: '60',
  payoutThreshold: '500000'
}

const NAV_ITEMS = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    eyebrow: 'Performance',
    title: 'Insights dashboard',
    description: 'Monitor partner activity, impression volume, and recent tracking events.',
    roles: ['super_admin', 'client', 'publisher']
  },
  {
    key: 'ads',
    path: '/ads',
    label: 'Ads',
    eyebrow: 'Campaigns',
    title: 'Ads management',
    description: 'Create creatives, review stats, and deliver partner-ready pixels.',
    roles: ['super_admin', 'client', 'publisher']
  },
  {
    key: 'users',
    path: '/users',
    label: 'Users',
    eyebrow: 'Accounts',
    title: 'User management',
    description: 'Review who has access to the CMS and learn how to provision new admins.',
    roles: ['super_admin']
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
  const [snippetConfig, setSnippetConfig] = useState({})
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
  const [userDirectory, setUserDirectory] = useState([])
  const [userDirectoryLoading, setUserDirectoryLoading] = useState(false)
  const [userFormState, setUserFormState] = useState(initialUserFormState)
  const [userFormError, setUserFormError] = useState('')
  const [userFormSaving, setUserFormSaving] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const role = authUser?.role || 'client'
  const availableNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role)),
    [role]
  )
  const canCreateAds = role === 'super_admin' || role === 'client'
  const canAccessUsers = role === 'super_admin'
  const canViewAds = ['super_admin', 'client', 'publisher'].includes(role)
  const clientOptions = useMemo(
    () => userDirectory.filter((user) => user.role === 'client'),
    [userDirectory]
  )

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

  const activeNav = availableNavItems.find((item) => item.path === normalizedPath) || availableNavItems[0]
  const selectedAd = useMemo(() => ads.find((ad) => ad.id === selectedAdId) || null, [ads, selectedAdId])
  const selectedStatsEntry = selectedAd ? (statsMap[selectedAd.id] || null) : null
  const selectedStats = selectedStatsEntry ? selectedStatsEntry.totals : null
  const selectedBilling = selectedStatsEntry ? selectedStatsEntry.billing : null
  const rawSnippetEntry = selectedAd ? snippets[selectedAd.id] : null
  const selectedSnippet = rawSnippetEntry && typeof rawSnippetEntry === 'object'
    ? rawSnippetEntry
    : rawSnippetEntry
      ? { snippet: rawSnippetEntry, partnerKey: '' }
      : null
  const selectedSnippetConfig = selectedAd ? snippetConfig[selectedAd.id] : null
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
  if (token && canAccessUsers) {
    loadUsers()
  } else if (!canAccessUsers) {
    setUserDirectory([])
  }
}, [token, canAccessUsers])

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
    setSnippetConfig({})
    setActivityMap({})
    setFormState(initialFormState)
    setUserDirectory([])
    setUserFormState(initialUserFormState)
    clearAuthToken()
    localStorage.removeItem('adsTrackerToken')
    localStorage.removeItem('adsTrackerUser')
    navigate('/dashboard')
  }

  const refreshAds = async () => {
    if (!token || !canViewAds) {
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
          return [ad.id, {
            totals: stats.totals || {},
            billing: stats.billing || null
          }]
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

  const loadUsers = async () => {
    if (!token || !canAccessUsers) {
      return
    }
    setUserDirectoryLoading(true)
    try {
      const list = await UsersApi.list()
      setUserDirectory(list)
    } catch (err) {
      if (err.status === 401) {
        handleLogout()
      } else {
        console.error('users load error', err)
      }
    } finally {
      setUserDirectoryLoading(false)
    }
  }

  const handleUserFormChange = (event) => {
    const { name, value } = event.target
    setUserFormState((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setUserFormError('')
    setUserFormSaving(true)

    try {
      const isPublisher = userFormState.role === 'publisher'
      const payload = {
        username: userFormState.username,
        email: userFormState.email,
        password: userFormState.password,
        role: userFormState.role,
        organization: userFormState.organization
      }

      if (isPublisher) {
        payload.partnerKey = userFormState.partnerKey
        payload.revenueShare = Number(userFormState.revenueShare || 0)
        payload.payoutThreshold = Number(userFormState.payoutThreshold || 0)
      }

      await UsersApi.create(payload)

      setUserFormState(initialUserFormState)
      setIsUserModalOpen(false)
      await loadUsers()
    } catch (err) {
      if (err.status === 401) {
        handleLogout()
      } else {
        setUserFormError(err.message || 'Unable to create user')
      }
    } finally {
      setUserFormSaving(false)
    }
  }

  const openUserModal = () => {
    setUserFormError('')
    setUserFormState(initialUserFormState)
    setIsUserModalOpen(true)
  }

  const closeUserModal = () => {
    setIsUserModalOpen(false)
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
      const normalizeList = (value) => {
        if (!value) return []
        if (Array.isArray(value)) {
          return value.map((item) => item.trim()).filter(Boolean)
        }
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      }

      await AdsApi.create({
        name: formState.name,
        headline: formState.headline,
        description: formState.description,
        creativeType: formState.creativeType,
        imageUrl: formState.imageUrl,
        ctaUrl: formState.ctaUrl,
        ctaLabel: formState.ctaLabel,
        slotKey: formState.slotKey,
        targetingGeo: normalizeList(formState.targetingGeo),
        targetingProvinces: normalizeList(formState.targetingProvinces),
        targetingCities: normalizeList(formState.targetingCities),
        targetingDevices: normalizeList(formState.targetingDevices),
        targetingInterests: normalizeList(formState.targetingInterests),
        targetingGaids: normalizeList(formState.targetingGaids),
        targetingIdfas: normalizeList(formState.targetingIdfas),
        active: true,
        cpcBid: Number(formState.cpcBid || 0),
        dailyBudget: Number(formState.dailyBudget || 0),
        totalBudget: Number(formState.totalBudget || 0),
        ownerId: role === 'super_admin' ? Number(formState.ownerId || 0) || undefined : undefined
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

  const handleSnippetPartnerKeyChange = (adId, value) => {
    setSnippetConfig((prev) => ({
      ...prev,
      [adId]: {
        ...(prev[adId] || {}),
        partnerKey: value
      }
    }))
  }

  const loadSnippet = async (adId, options = {}) => {
    const desiredPartnerKey = typeof options.partnerKey === 'string'
      ? options.partnerKey
      : (snippetConfig[adId]?.partnerKey || '')
    const normalizedPartnerKey = desiredPartnerKey.trim()

    if (snippets[adId] && snippets[adId].partnerKey === normalizedPartnerKey) {
      return
    }

    setSnippetLoading(adId)
    try {
      const snippet = await AdsApi.snippet(adId, pixelBaseUrl, normalizedPartnerKey)
      setSnippets((prev) => ({
        ...prev,
        [adId]: {
          snippet,
          partnerKey: normalizedPartnerKey
        }
      }))
      setSnippetConfig((prev) => ({
        ...prev,
        [adId]: {
          ...(prev[adId] || {}),
          partnerKey: normalizedPartnerKey
        }
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
        [adId]: {
          totals: stats.totals || {},
          billing: stats.billing || null
        }
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
    if (!ad) {
      return 'All audiences'
    }

    const parts = []
    if (Array.isArray(ad.targetingGeo) && ad.targetingGeo.length) {
      parts.push(`Geo ${ad.targetingGeo.length}`)
    }
    if (Array.isArray(ad.targetingProvinces) && ad.targetingProvinces.length) {
      parts.push(`Prov ${ad.targetingProvinces.length}`)
    }
    if (Array.isArray(ad.targetingCities) && ad.targetingCities.length) {
      parts.push(`City ${ad.targetingCities.length}`)
    }
    if (Array.isArray(ad.targetingDevices) && ad.targetingDevices.length) {
      parts.push(`Device ${ad.targetingDevices.length}`)
    }
    if (Array.isArray(ad.targetingInterests) && ad.targetingInterests.length) {
      parts.push(`Interest ${ad.targetingInterests.length}`)
    }
    if (Array.isArray(ad.targetingGaids) && ad.targetingGaids.length) {
      parts.push(`GAID ${ad.targetingGaids.length}`)
    }
    if (Array.isArray(ad.targetingIdfas) && ad.targetingIdfas.length) {
      parts.push(`IDFA ${ad.targetingIdfas.length}`)
    }
    if (!parts.length) {
      return 'All audiences'
    }
    return parts.join(' • ')
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
    billing: selectedBilling,
    activity: selectedActivity,
    activityMeta: selectedActivityMeta,
    snippet: selectedSnippet?.snippet,
    snippetPartnerKey: selectedSnippetConfig?.partnerKey ?? selectedSnippet?.partnerKey ?? '',
    snippetLoading,
    copiedAd,
    onGenerateSnippet: (adId, partnerKey) => loadSnippet(adId, { partnerKey }),
    onSnippetPartnerKeyChange: handleSnippetPartnerKeyChange,
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
    selectClass,
    canAssignOwner: role === 'super_admin',
    ownerOptions: clientOptions
  }

  const userModalProps = canAccessUsers
    ? {
        isOpen: isUserModalOpen,
        onClose: closeUserModal,
        onSubmit: handleCreateUser,
        onChange: handleUserFormChange,
        formState: userFormState,
        error: userFormError,
        saving: userFormSaving,
        ghostSmallButtonClass,
        primaryButtonClass
      }
    : null

  return (
    <>
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col gap-6 p-6 sticky top-0 h-screen shadow-2xl">
        <div className="flex flex-col gap-1 uppercase tracking-[0.35em] text-xs text-slate-400">
          <span>Ads Tracking</span>
          <strong className="tracking-normal text-lg text-white">CMS</strong>
        </div>
        <nav className="flex flex-col gap-2">
          {availableNavItems.map((item) => (
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
                  authUser={authUser}
                />
              )}
            />
            {canViewAds && (
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
                    createModalProps={canCreateAds ? createModalProps : null}
                    canCreateAds={canCreateAds}
                  />
                )}
              />
            )}
            {canAccessUsers && (
              <Route
                path="/users"
                element={(
                  <UsersScreen
                    authUser={authUser}
                    onLogout={handleLogout}
                    canManage={canAccessUsers}
                    users={userDirectory}
                    loading={userDirectoryLoading}
                    onRefresh={loadUsers}
                    onOpenCreateModal={openUserModal}
                  />
                )}
              />
            )}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
    {userModalProps && <UserCreateModal {...userModalProps} />}
    </>
  )
}

export default App
