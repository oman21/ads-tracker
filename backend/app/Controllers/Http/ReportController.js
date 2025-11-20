'use strict'

const Database = use('Database')

class ReportController {
  async overview ({ auth }) {
    const user = auth.user
    await user.reload()
    const totals = await this._fetchTotals(user)
    const partners = await this._fetchPartnerBreakdown(user)
    const topAds = await this._fetchTopAds(user)
    const recentEvents = await this._fetchRecentEvents(user)
    const finance = await this._buildFinance(user)

    return {
      totals,
      partners,
      topAds,
      recentEvents,
      finance
    }
  }

  async _fetchTotals (user) {
    const query = Database
      .from('tracking_events')
      .groupBy('event_type')
      .select('event_type')
      .count('* as total')

    this._applyEventFilters(query, user)
    const rows = await query

    const totals = {
      impressions: 0,
      clicks: 0,
      conversions: 0
    }

    rows.forEach((row) => {
      const value = Number(row.total || 0)
      if (row.event_type === 'impression') {
        totals.impressions = value
      } else if (row.event_type === 'click') {
        totals.clicks = value
      } else if (row.event_type === 'conversion') {
        totals.conversions = value
      }
    })

    return totals
  }

  async _fetchPartnerBreakdown (user) {
    if (user.role === 'publisher') {
      const partnerKey = this._resolvePartnerKey(user)
      const rows = await Database
        .from('tracking_events')
        .where('partner', partnerKey)
        .select(Database.raw("SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions"))
        .select(Database.raw("SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks"))
        .select(Database.raw("SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions"))

      const stats = rows[0] || {}
      return [{
        partner: partnerKey,
        impressions: Number(stats.impressions || 0),
        clicks: Number(stats.clicks || 0),
        conversions: Number(stats.conversions || 0)
      }]
    }

    const query = Database
      .from('tracking_events')
      .select('partner')
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'impression' THEN 1 ELSE 0 END) as impressions"))
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'click' THEN 1 ELSE 0 END) as clicks"))
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'conversion' THEN 1 ELSE 0 END) as conversions"))
      .groupBy('partner')
      .orderBy('clicks', 'desc')
      .limit(6)

    this._applyEventFilters(query, user)
    const rows = await query

    return rows.map((row) => ({
      partner: row.partner || 'Unattributed',
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      conversions: Number(row.conversions || 0)
    }))
  }

  async _fetchTopAds (user) {
    const query = Database
      .from('tracking_events')
      .innerJoin('ads', 'ads.id', 'tracking_events.ad_id')
      .select('ads.id as ad_id', 'ads.name')
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'impression' THEN 1 ELSE 0 END) as impressions"))
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'click' THEN 1 ELSE 0 END) as clicks"))
      .select(Database.raw("SUM(CASE WHEN tracking_events.event_type = 'conversion' THEN 1 ELSE 0 END) as conversions"))
      .groupBy('ads.id')
      .orderBy('clicks', 'desc')
      .limit(5)

    this._applyEventFilters(query, user, { joinAds: false })
    const rows = await query

    return rows.map((row) => ({
      id: row.ad_id,
      name: row.name,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      conversions: Number(row.conversions || 0)
    }))
  }

  async _fetchRecentEvents (user) {
    const query = Database
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
        'tracking_events.billable',
        'tracking_events.advertiser_charge',
        'ads.name as ad_name'
      )
      .orderBy('tracking_events.created_at', 'desc')
      .limit(8)

    this._applyEventFilters(query, user, { joinAds: false })
    const rows = await query

    return rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      partner: row.partner || 'Unattributed',
      deviceType: row.device_type,
      deviceId: row.device_id,
      adName: row.ad_name,
      createdAt: row.created_at,
      billable: !!row.billable,
      advertiserCharge: Number(row.advertiser_charge || 0),
      metadata: this._parseMetadata(row.metadata)
    }))
  }

  async _buildFinance (user) {
    if (user.role === 'super_admin') {
      const [clientBalanceRow] = await Database.from('users').where('role', 'client').sum('balance as total')
      const [publisherRow] = await Database.from('users').where('role', 'publisher').sum('payout_balance as total')
      const spendToday = await this._sumAllCharges(this._startOfDay())
      const [activeRow] = await Database.from('ads').where('active', true).count('* as total')

      return {
        advertiserBalance: Number(clientBalanceRow?.total || 0),
        publisherLiability: Number(publisherRow?.total || 0),
        spendToday,
        activeCampaigns: Number(activeRow?.total || 0)
      }
    }

    if (user.role === 'client') {
      const totalSpend = await this._sumClientCharges(user)
      const spendToday = await this._sumClientCharges(user, this._startOfDay())
      const [activeRow] = await Database.from('ads').where('user_id', user.id).where('active', true).count('* as total')

      return {
        balance: Number(user.balance || 0),
        totalSpend,
        spendToday,
        activeAds: Number(activeRow?.total || 0)
      }
    }

    if (user.role === 'publisher') {
      const partnerKey = this._resolvePartnerKey(user)
      const revenue = await this._sumPublisherRevenue(user)
      const validClicks = await Database
        .from('tracking_events')
        .where('partner', partnerKey)
        .where('event_type', 'click')
        .where('billable', true)
        .count('* as total')

      return {
        payoutBalance: Number(user.payout_balance || 0),
        revenueShare: Number(user.revenue_share || 0),
        totalRevenue: revenue,
        payoutThreshold: Number(user.payout_threshold || 0),
        validClicks: Number(validClicks[0]?.total || 0)
      }
    }

    return {}
  }

  async _sumClientCharges (user, since = null) {
    const query = Database
      .from('tracking_events')
      .innerJoin('ads', 'ads.id', 'tracking_events.ad_id')
      .where('ads.user_id', user.id)
      .sum('tracking_events.advertiser_charge as total')

    if (since) {
      query.where('tracking_events.created_at', '>=', since)
    }

    const [row] = await query
    return Number(row?.total || 0)
  }

  async _sumPublisherRevenue (user, since = null) {
    const partnerKey = this._resolvePartnerKey(user)
    const query = Database
      .from('tracking_events')
      .where('partner', partnerKey)
      .where('billable', true)
      .sum('publisher_amount as total')

    if (since) {
      query.where('created_at', '>=', since)
    }

    const [row] = await query
    return Number(row?.total || 0)
  }

  async _sumAllCharges (since = null) {
    const query = Database.from('tracking_events').sum('advertiser_charge as total')

    if (since) {
      query.where('created_at', '>=', since)
    }

    const [row] = await query
    return Number(row?.total || 0)
  }

  _applyEventFilters (query, user, options = {}) {
    const { joinAds = true } = options
    if (!user) {
      return
    }

    if (user.role === 'client') {
      if (joinAds) {
        query.innerJoin('ads', 'ads.id', 'tracking_events.ad_id')
      }
      query.where('ads.user_id', user.id)
    } else if (user.role === 'publisher') {
      query.where('tracking_events.partner', this._resolvePartnerKey(user))
    }
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

  _resolvePartnerKey (user) {
    if (!user) {
      return 'unknown'
    }
    return user.partner_key || user.username || 'unknown'
  }

  _startOfDay () {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }
}

module.exports = ReportController
