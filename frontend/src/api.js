'use strict'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333/api'
let authToken = null

const normalizeAd = (payload) => {
  if (!payload) {
    return null
  }

  const targetingValues = Array.isArray(payload.targetingValues)
    ? payload.targetingValues
    : Array.isArray(payload.targeting_values)
      ? payload.targeting_values
      : typeof payload.targeting_values === 'string'
        ? payload.targeting_values.split(',').map((item) => item.trim()).filter(Boolean)
        : []

  const creativeType = (payload.creative_type || payload.creativeType || 'box').toLowerCase()

  return {
    id: payload.id,
    name: payload.name,
    headline: payload.headline,
    description: payload.description,
    creativeType: creativeType === 'image' ? 'box' : creativeType,
    imageUrl: payload.image_url || payload.imageUrl,
    ctaUrl: payload.cta_url || payload.ctaUrl,
    ctaLabel: payload.cta_label || payload.ctaLabel || 'Learn more',
    pixelId: payload.pixel_id || payload.pixelId,
    targetingMode: (payload.targeting_mode || payload.targetingMode || 'all').toLowerCase(),
    targetingValues,
    active: payload.active !== false
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

  async snippet (adId, baseUrl) {
    const payload = await request(`/ads/${adId}/snippet?baseUrl=${encodeURIComponent(baseUrl)}`)
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

export { API_BASE }
