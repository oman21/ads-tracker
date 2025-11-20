'use strict'

const { randomUUID } = require('crypto')

const Ad = use('App/Models/Ad')
const Database = use('Database')
const Env = use('Env')

class AdController {
  async index ({ request }) {
    const { status } = request.get()
    const query = Ad.query().orderBy('created_at', 'desc')

    if (status === 'active') {
      query.where('active', true)
    } else if (status === 'inactive') {
      query.where('active', false)
    }

    const ads = await query.fetch()
    return ads.toJSON()
  }

  async show ({ params }) {
    const ad = await Ad.findOrFail(params.id)
    return ad.toJSON()
  }

  async store ({ request, response }) {
    const payload = request.only([
      'name',
      'headline',
      'description',
      'creativeType',
      'imageUrl',
      'ctaUrl',
      'ctaLabel',
      'targetingMode',
      'targetingValues',
      'active'
    ])

    if (!payload.name) {
      return response.status(422).json({ message: 'Name is required' })
    }

    const ad = new Ad()
    this._applyPayloadToModel(ad, payload)
    ad.pixel_id = randomUUID()

    await ad.save()
    return ad.toJSON()
  }

  async update ({ params, request, response }) {
    const payload = request.only([
      'name',
      'headline',
      'description',
      'creativeType',
      'imageUrl',
      'ctaUrl',
      'ctaLabel',
      'targetingMode',
      'targetingValues',
      'active'
    ])

    const ad = await Ad.findOrFail(params.id)
    this._applyPayloadToModel(ad, payload)
    await ad.save()

    return ad.toJSON()
  }

  async destroy ({ params, response }) {
    const ad = await Ad.findOrFail(params.id)
    await ad.delete()
    return response.noContent()
  }

  async stats ({ params }) {
    const ad = await Ad.findOrFail(params.id)

    const rows = await Database
      .from('tracking_events')
      .where('ad_id', ad.id)
      .groupBy('event_type')
      .select('event_type')
      .count('* as total')

    const totals = {
      impression: 0,
      click: 0,
      conversion: 0
    }

    rows.forEach((row) => {
      totals[row.event_type] = Number(row.total)
    })

    return {
      adId: ad.id,
      pixelId: ad.pixel_id,
      totals
    }
  }

  async snippet ({ params, request }) {
    const ad = await Ad.findOrFail(params.id)
    const defaultBaseUrl = Env.get('APP_URL', 'http://localhost:3333')
    const baseUrl = request.input('baseUrl', defaultBaseUrl)

    const snippet = `<script src="${baseUrl}/api/pixels/${ad.pixel_id}/embed.js" data-pixel-id="${ad.pixel_id}" async></script>`

    return {
      pixelId: ad.pixel_id,
      snippet
    }
  }

  async activity ({ params, request }) {
    const ad = await Ad.findOrFail(params.id)
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
    if (payload.targetingMode !== undefined) {
      ad.targeting_mode = (payload.targetingMode || 'all').toLowerCase()
    }
    if (payload.active !== undefined) ad.active = payload.active

    if (payload.targetingValues !== undefined) {
      const values = this._normalizeTargetingValues(payload.targetingValues)
      ad.targeting_values = ad.setTargetingValues(values)
    }
  }

  _normalizeTargetingValues (value) {
    if (!value) {
      return []
    }

    if (Array.isArray(value)) {
      return value.filter(Boolean).map((item) => item.trim())
    }

    if (typeof value === 'string') {
      return value.split(',').map((part) => part.trim()).filter(Boolean)
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
}

module.exports = AdController
