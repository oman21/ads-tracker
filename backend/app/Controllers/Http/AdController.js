'use strict'

const { randomUUID } = require('crypto')

const Ad = use('App/Models/Ad')
const User = use('App/Models/User')
const Database = use('Database')
const Env = use('Env')

class AdController {
  async index ({ request, auth }) {
    const user = auth.user
    const { status, clientId } = request.get()
    const query = Ad.query().orderBy('created_at', 'desc')

    if (status === 'active') {
      query.where('active', true)
    } else if (status === 'inactive') {
      query.where('active', false)
    }

    if (user.role === 'client') {
      query.where('user_id', user.id)
    } else if (user.role === 'publisher') {
      query.where('active', true)
    } else if (user.role === 'super_admin' && clientId) {
      query.where('user_id', clientId)
    }

    const ads = await query.fetch()
    return ads.toJSON()
  }

  async show ({ params, auth, response }) {
    const ad = await Ad.findOrFail(params.id)

    if (!this._canViewAd(auth.user, ad)) {
      return response.status(403).json({ message: 'Forbidden' })
    }

    return ad.toJSON()
  }

  async store ({ request, response, auth }) {
    const user = auth.user
    if (user.role === 'publisher') {
      return response.status(403).json({ message: 'Publishers cannot create ads' })
    }

    const payload = request.only([
      'name',
      'headline',
      'description',
      'creativeType',
      'imageUrl',
      'ctaUrl',
      'ctaLabel',
      'slotKey',
      'targetingMode',
      'targetingValues',
      'targetingGeo',
      'targetingProvinces',
      'targetingCities',
      'targetingDevices',
      'targetingInterests',
      'targetingGaids',
      'targetingIdfas',
      'active',
      'cpcBid',
      'dailyBudget',
      'totalBudget',
      'ownerId'
    ])

    if (!payload.name) {
      return response.status(422).json({ message: 'Name is required' })
    }

    const ad = new Ad()
    this._applyPayloadToModel(ad, payload)
    this._applyBudgetPayload(ad, payload)
    if (!ad.slot_key) {
      ad.slot_key = randomUUID()
    }
    ad.slot_id = randomUUID()
    const ownerId = await this._resolveOwnerId(user, payload.ownerId)

    if (!ownerId) {
      return response.status(422).json({ message: 'Unable to resolve campaign owner' })
    }

    ad.user_id = ownerId

    await ad.save()
    return ad.toJSON()
  }

  async update ({ params, request, response, auth }) {
    const payload = request.only([
      'name',
      'headline',
      'description',
      'creativeType',
      'imageUrl',
      'ctaUrl',
      'ctaLabel',
      'slotKey',
      'targetingMode',
      'targetingValues',
      'targetingGeo',
      'targetingProvinces',
      'targetingCities',
      'targetingDevices',
      'targetingInterests',
      'targetingGaids',
      'targetingIdfas',
      'active',
      'ownerId',
      'cpcBid',
      'dailyBudget',
      'totalBudget'
    ])

    const ad = await Ad.findOrFail(params.id)
    if (!this._canManageAd(auth.user, ad)) {
      return response.status(403).json({ message: 'Forbidden' })
    }

    this._applyPayloadToModel(ad, payload)
    this._applyBudgetPayload(ad, payload)

    if (payload.ownerId && auth.user.role === 'super_admin') {
      const ownerId = await this._resolveOwnerId(auth.user, payload.ownerId)
      if (!ownerId) {
        return response.status(422).json({ message: 'Invalid campaign owner' })
      }
      ad.user_id = ownerId
    }

    await ad.save()

    return ad.toJSON()
  }

  async destroy ({ params, response, auth }) {
    const ad = await Ad.findOrFail(params.id)
    if (!this._canManageAd(auth.user, ad)) {
      return response.status(403).json({ message: 'Forbidden' })
    }
    await ad.delete()
    return response.noContent()
  }

  async stats ({ params, auth, response }) {
    const ad = await Ad.findOrFail(params.id)
    if (!this._canViewAd(auth.user, ad)) {
      return response.status(403).json({ message: 'Forbidden' })
    }

    const rowsQuery = Database
      .from('tracking_events')
      .where('ad_id', ad.id)
      .groupBy('event_type')
      .select('event_type')
      .count('* as total')

    if (auth.user.role === 'publisher') {
      rowsQuery.where('partner', this._resolvePartnerKey(auth.user))
    }

    const rows = await rowsQuery
    const totals = {
      impression: 0,
      click: 0,
      conversion: 0
    }

    rows.forEach((row) => {
      totals[row.event_type] = Number(row.total)
    })

    const normalizedTotals = {
      ...totals,
      impressions: totals.impression,
      clicks: totals.click,
      conversions: totals.conversion
    }

    return {
      adId: ad.id,
      slotKey: ad.slot_key,
      totals: normalizedTotals,
      billing: {
        cpcBid: Number(ad.cpc_bid || 0),
        dailyBudget: Number(ad.daily_budget || 0),
        totalBudget: Number(ad.total_budget || 0),
        spentToday: Number(ad.spent_today || 0),
        spentTotal: Number(ad.spent_total || 0)
      }
    }
  }

  async snippet ({ params, request, auth, response }) {
    const ad = await Ad.findOrFail(params.id)
    if (!this._canViewAd(auth.user, ad)) {
      return response.status(403).json({ message: 'Forbidden' })
    }
    const defaultBaseUrl = Env.get('APP_URL', 'http://localhost:3333')
    const baseUrl = request.input('baseUrl', defaultBaseUrl)
    const partnerKey = request.input('partnerKey', 'YOUR_PARTNER_KEY')

    const snippet = `<script src="${baseUrl}/api/pixels/${ad.slot_key}/embed.js" data-partner="${partnerKey}" data-slot="${ad.slot_key}" async></script>`

    return {
      slotKey: ad.slot_key,
      snippet
    }
  }

  async activity ({ params, request, auth, response }) {
    const ad = await Ad.findOrFail(params.id)
    if (!this._canViewAd(auth.user, ad)) {
      return response.status(403).json({ message: 'Forbidden' })
    }

    const limitParam = Number(request.input('limit', 10))
    const limit = Number.isNaN(limitParam) ? 10 : Math.max(1, Math.min(limitParam, 50))
    const pageParam = Number(request.input('page', 1))
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const eventType = (request.input('eventType', '') || '').toLowerCase()
    const allowedEvents = ['impression', 'click', 'conversion']

    const baseQuery = Database
      .from('tracking_events')
      .where('ad_id', ad.id)

    if (eventType && allowedEvents.includes(eventType)) {
      baseQuery.where('event_type', eventType)
    }

    if (auth.user.role === 'publisher') {
      baseQuery.where('partner', this._resolvePartnerKey(auth.user))
    }

    const offset = (page - 1) * limit
    const rows = await baseQuery
      .clone()
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const trimmedRows = hasMore ? rows.slice(0, limit) : rows

    const data = trimmedRows.map((row) => ({
      id: row.id,
      adId: row.ad_id,
      eventType: row.event_type,
      partner: row.partner,
      deviceType: row.device_type,
      deviceId: row.device_id,
      metadata: this._parseMetadata(row.metadata),
      createdAt: row.created_at
    }))

    return {
      data,
      meta: {
        page,
        perPage: limit,
        hasMore,
        nextPage: hasMore ? page + 1 : null,
        eventType: eventType || ''
      }
    }
  }

  _applyPayloadToModel (ad, payload) {
    if (payload.name !== undefined) ad.name = payload.name
    if (payload.headline !== undefined) ad.headline = payload.headline
    if (payload.description !== undefined) ad.description = payload.description
    if (payload.creativeType !== undefined) {
      const rawType = `${payload.creativeType || ''}`.toLowerCase()
      const normalized = rawType === 'modal' ? 'modal' : 'box'
      ad.creative_type = normalized
    }
    if (payload.imageUrl !== undefined) ad.image_url = payload.imageUrl
    if (payload.ctaUrl !== undefined) ad.cta_url = payload.ctaUrl
    if (payload.ctaLabel !== undefined) ad.cta_label = payload.ctaLabel
    if (payload.slotKey !== undefined) {
      const trimmed = payload.slotKey ? String(payload.slotKey).trim() : ''
      if (trimmed) {
        ad.slot_key = trimmed
      }
    }
    if (payload.active !== undefined) ad.active = payload.active

    this._applyAdvancedTargeting(ad, payload)
  }

  _applyAdvancedTargeting (ad, payload) {
    if (!ad || !payload) {
      return
    }

    if (payload.targetingGeo !== undefined) {
      const values = this._normalizeTargetingValues(payload.targetingGeo, { lowercase: true })
      ad.targeting_geo = ad.setTargetingGeo(values)
    }

    if (payload.targetingProvinces !== undefined) {
      const values = this._normalizeTargetingValues(payload.targetingProvinces, { lowercase: true })
      ad.targeting_provinces = ad.setTargetingProvinces(values)
    }

    if (payload.targetingCities !== undefined) {
      const values = this._normalizeTargetingValues(payload.targetingCities, { lowercase: true })
      ad.targeting_cities = ad.setTargetingCities(values)
    }

    if (payload.targetingDevices !== undefined) {
      const values = this._normalizeTargetingValues(payload.targetingDevices, { lowercase: true })
      ad.targeting_devices = ad.setTargetingDevices(values)
    }

    if (payload.targetingInterests !== undefined) {
      const values = this._normalizeTargetingValues(payload.targetingInterests, { lowercase: true })
      ad.targeting_interests = ad.setTargetingInterests(values)
    }

    if (payload.targetingGaids !== undefined) {
      const values = this._normalizeTargetingValues(payload.targetingGaids, { lowercase: true })
      ad.targeting_gaids = ad.setTargetingGaids(values)
    }

    if (payload.targetingIdfas !== undefined) {
      const values = this._normalizeTargetingValues(payload.targetingIdfas, { lowercase: true })
      ad.targeting_idfas = ad.setTargetingIdfas(values)
    }
  }

  _normalizeTargetingValues (value, options = {}) {
    const lowercase = options.lowercase === true
    if (!value) {
      return []
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter(Boolean)
        .map((item) => (lowercase && typeof item === 'string' ? item.toLowerCase() : item))
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => {
          const trimmed = part.trim()
          return lowercase ? trimmed.toLowerCase() : trimmed
        })
        .filter(Boolean)
    }

    return []
  }

  _parseMetadata (value) {
    if (!value) {
      return null
    }
    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }

  _applyBudgetPayload (ad, payload) {
    if (!ad || !payload) {
      return
    }

    if (payload.cpcBid !== undefined) {
      ad.cpc_bid = this._sanitizeMoney(payload.cpcBid, 4)
    }

    if (payload.dailyBudget !== undefined) {
      ad.daily_budget = this._sanitizeMoney(payload.dailyBudget, 2)
    }

    if (payload.totalBudget !== undefined) {
      ad.total_budget = this._sanitizeMoney(payload.totalBudget, 2)
    }
  }

  _sanitizeMoney (value, precision = 2) {
    const numberValue = Number(value)
    if (Number.isNaN(numberValue) || numberValue < 0) {
      return 0
    }
    return Number(numberValue.toFixed(precision))
  }

  async _resolveOwnerId (user, requestedOwnerId) {
    if (!user) {
      return null
    }

    if (user.role === 'client') {
      return user.id
    }

    if (user.role === 'super_admin') {
      if (!requestedOwnerId) {
        return null
      }
      const owner = await User.find(requestedOwnerId)
      if (owner && owner.role === 'client') {
        return owner.id
      }
      return null
    }

    return null
  }

  _canViewAd (user, ad) {
    if (!user || !ad) {
      return false
    }

    if (user.role === 'super_admin') {
      return true
    }

    if (user.role === 'client') {
      return !ad.user_id || Number(ad.user_id) === Number(user.id)
    }

    if (user.role === 'publisher') {
      return ad.active === true
    }

    return false
  }

  _canManageAd (user, ad) {
    if (!user || !ad) {
      return false
    }

    if (user.role === 'super_admin') {
      return true
    }

    if (user.role === 'client') {
      return !ad.user_id || Number(ad.user_id) === Number(user.id)
    }

    return false
  }

  _resolvePartnerKey (user) {
    if (!user) {
      return 'unknown'
    }
    return user.partner_key || user.username || 'unknown'
  }
}

module.exports = AdController
