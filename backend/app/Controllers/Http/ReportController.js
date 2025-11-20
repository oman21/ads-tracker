'use strict'

const Database = use('Database')

class ReportController {
  async overview () {
    const totals = await this._fetchTotals()
    const partnerBreakdown = await this._fetchPartnerBreakdown()
    const topAds = await this._fetchTopAds()
    const recentEvents = await this._fetchRecentEvents()

    return {
      totals,
      partnerBreakdown,
      topAds,
      recentEvents
    }
  }

  async _fetchTotals () {
    const rows = await Database
      .from('tracking_events')
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

    return totals
  }

  async _fetchPartnerBreakdown () {
    const rows = await Database
      .from('tracking_events')
      .select('partner')
      .count('* as total')
      .groupBy('partner')
      .orderBy('total', 'desc')
      .limit(6)

    return rows.map((row) => ({
      partner: row.partner || 'Unattributed',
      total: Number(row.total)
    }))
  }

  async _fetchTopAds () {
    const rows = await Database
      .from('tracking_events')
      .innerJoin('ads', 'ads.id', 'tracking_events.ad_id')
      .select('ads.id as ad_id', 'ads.name')
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'impression' THEN 1 ELSE 0 END) as impressions"))
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'click' THEN 1 ELSE 0 END) as clicks"))
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'conversion' THEN 1 ELSE 0 END) as conversions"))
      .select(Database.raw('COUNT(*) as total'))
      .groupBy('ads.id')
      .orderBy('total', 'desc')
      .limit(5)

    return rows.map((row) => ({
      id: row.ad_id,
      name: row.name,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      conversions: Number(row.conversions || 0),
      total: Number(row.total || 0)
    }))
  }

  async _fetchRecentEvents () {
    const rows = await Database
      .from('tracking_events')
      .leftJoin('ads', 'ads.id', 'tracking_events.ad_id')
      .select(
        'tracking_events.id',
        'tracking_events.event_type',
        'tracking_events.partner',
        'tracking_events.device_type',
        'tracking_events.device_id',
        'tracking_events.metadata',
        'tracking_events.created_at',
        'ads.name as ad_name'
      )
      .orderBy('tracking_events.created_at', 'desc')
      .limit(8)

    return rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      partner: row.partner || 'Unattributed',
      deviceType: row.device_type,
      deviceId: row.device_id,
      adName: row.ad_name,
      createdAt: row.created_at,
      metadata: this._parseMetadata(row.metadata)
    }))
  }

  _parseMetadata (value) {
    if (!value) {
      return null
    }

    try {
      return JSON.parse(value)
    } catch (error) {
      return null
    }
  }
}

module.exports = ReportController
