'use strict'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333/api'
let authToken = null

const normalizeArrayField = (value) => {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return []
}

const normalizeAd = (payload) => {
  if (!payload) {
    return null
  }

  const targetingValues = normalizeArrayField(payload.targetingValues || payload.targeting_values)
  const targetingGeo = normalizeArrayField(payload.targetingGeo || payload.targeting_geo)
  const targetingProvinces = normalizeArrayField(payload.targetingProvinces || payload.targeting_provinces)
  const targetingCities = normalizeArrayField(payload.targetingCities || payload.targeting_cities)
  const targetingDevices = normalizeArrayField(payload.targetingDevices || payload.targeting_devices)
  const targetingInterests = normalizeArrayField(payload.targetingInterests || payload.targeting_interests)
  const targetingGaids = normalizeArrayField(payload.targetingGaids || payload.targeting_gaids)
  const targetingIdfas = normalizeArrayField(payload.targetingIdfas || payload.targeting_idfas)

  const creativeType = (payload.creative_type || payload.creativeType || 'box').toLowerCase()

  return {
    id: payload.id,
    slotKey: payload.slot_key || payload.slotKey || payload.slot_key,
    ownerId: payload.user_id || payload.ownerId || null,
    name: payload.name,
    headline: payload.headline,
    description: payload.description,
    creativeType: creativeType === 'image' ? 'box' : creativeType,
    imageUrl: payload.image_url || payload.imageUrl,
    ctaUrl: payload.cta_url || payload.ctaUrl,
    ctaLabel: payload.cta_label || payload.ctaLabel || 'Learn more',
    targetingGeo,
    targetingProvinces,
    targetingCities,
    targetingDevices,
    targetingInterests,
    targetingGaids,
    targetingIdfas,
    active: payload.active !== false,
    cpcBid: Number(payload.cpc_bid || payload.cpcBid || 0),
    dailyBudget: Number(payload.daily_budget || payload.dailyBudget || 0),
    totalBudget: Number(payload.total_budget || payload.totalBudget || 0),
    spentToday: Number(payload.spent_today || payload.spentToday || 0),
    spentTotal: Number(payload.spent_total || payload.spentTotal || 0)
  }
}

const handleResponseCollection = (payload) => {
  if (!payload) {
    return []
  }

  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows
  }

  return []
}

const request = async (path, options = {}) => {
  const { auth = true, ...rest } = options
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers || {})
    },
    ...rest
  }

  if (auth && authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body)
  }

  const response = await fetch(`${API_BASE}${path}`, config)

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = (data && data.message) || 'Request failed'
    const error = new Error(message)
    error.status = response.status
    error.payload = data
    throw error
  }

  return data
}

export const setAuthToken = (token) => {
  authToken = token
}

export const clearAuthToken = () => {
  authToken = null
}

export const AdsApi = {
  async list () {
    const payload = await request('/ads')
    return handleResponseCollection(payload).map(normalizeAd)
  },

  async create (data) {
    const payload = await request('/ads', {
      method: 'POST',
      body: data
    })

    return normalizeAd(payload)
  },

  async stats (adId) {
    return request(`/ads/${adId}/stats`)
  },

  async snippet (adId, baseUrl, partnerKey) {
    const searchParams = new URLSearchParams()
    if (baseUrl) {
      searchParams.append('baseUrl', baseUrl)
    }
    if (partnerKey) {
      searchParams.append('partnerKey', partnerKey)
    }
    const query = searchParams.toString()
    const payload = await request(`/ads/${adId}/snippet${query ? `?${query}` : ''}`)
    return payload?.snippet || ''
  },

  async activity (adId, params = {}) {
    const searchParams = new URLSearchParams()
    if (params.eventType && params.eventType !== 'all') {
      searchParams.append('eventType', params.eventType)
    }
    if (params.page) {
      searchParams.append('page', params.page)
    }
    if (params.limit) {
      searchParams.append('limit', params.limit)
    }
    const query = searchParams.toString()
    const payload = await request(`/ads/${adId}/activity${query ? `?${query}` : ''}`)
    if (payload && Array.isArray(payload.data)) {
      return {
        data: payload.data,
        meta: payload.meta || {}
      }
    }
    if (Array.isArray(payload)) {
      return {
        data: payload,
        meta: {}
      }
    }
    return {
      data: [],
      meta: {}
    }
  }
}

export const AuthApi = {
  login (email, password) {
    return request('/auth/login', {
      method: 'POST',
      auth: false,
      body: {
        email,
        password
      }
    })
  }
}

export const ReportsApi = {
  overview () {
    return request('/reports/overview')
  }
}

export const UsersApi = {
  list (params = {}) {
    const searchParams = new URLSearchParams()
    if (params.role) {
      searchParams.append('role', params.role)
    }
    const query = searchParams.toString()
    return request(`/users${query ? `?${query}` : ''}`)
  },

  create (data) {
    return request('/users', {
      method: 'POST',
      body: data
    })
  },

  update (id, data) {
    return request(`/users/${id}`, {
      method: 'PUT',
      body: data
    })
  }
}

export const BillingApi = {
  deposit (amount, userId) {
    return request('/billing/deposit', {
      method: 'POST',
      body: {
        amount,
        ...(userId ? { userId } : {})
      }
    })
  },

  requestPayout (amount) {
    return request('/billing/payout', {
      method: 'POST',
      body: { amount }
    })
  }
}

export { API_BASE }
