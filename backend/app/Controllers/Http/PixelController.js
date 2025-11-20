'use strict'

const Env = use('Env')

const Ad = use('App/Models/Ad')
const TrackingEvent = use('App/Models/TrackingEvent')
const User = use('App/Models/User')
const Database = use('Database')

class PixelController {
  async serveAd ({ params, request, response }) {
    const slotKey = params.slotKey
    const ads = await Ad.query()
      .where('slot_key', slotKey)
      .where('active', true)
      .fetch()

    if (!ads.rows.length) {
      return response.status(404).json({ message: 'Slot not found' })
    }

    const deviceType = request.input('deviceType')
    const deviceId = request.input('deviceId')
    const country = request.input('country') || request.input('geo')
    const province = request.input('province')
    const city = request.input('city')
    const deviceClass = request.input('deviceClass')
    const category = request.input('category')
    const interestsInput = request.input('interests')
    const interests = this._parseList(interestsInput)

    const eligible = ads.rows.filter((ad) => {
      return ad.matchesTargeting({
        country,
        province,
        city,
        deviceClass,
        interests,
        deviceType,
        deviceId
      })
    })

    if (!eligible.length) {
      return response.noContent()
    }

    const stats = await this._fetchAdStats(eligible.map((item) => item.id))
    const ad = this._selectWinningAd(eligible, { category, stats })

    const matches = true // already filtered
    if (!matches) {
      return response.noContent()
    }

    return ad.serializeForDelivery()
  }

  _selectWinningAd (ads, context = {}) {
    if (!ads.length) {
      return null
    }

    const normalizedStats = context.stats || {}
    const category = context.category ? String(context.category).toLowerCase() : ''

    const scored = ads.map((ad) => {
      const stats = normalizedStats[ad.id] || { impressions: 0, clicks: 0 }
      const ctr = stats.impressions > 0 ? stats.clicks / stats.impressions : 0
      const ctrScore = this._calculateCtrScore(ctr, stats.impressions)
      const relevanceScore = this._calculateRelevanceScore(ad, category)
      const bid = Number(ad.cpc_bid || 0)
      const score = bid * ctrScore * relevanceScore
      return {
        ad,
        score,
        bid,
        ctrScore,
        relevanceScore,
        updatedAt: new Date(ad.updated_at || ad.created_at || 0).getTime()
      }
    })

    scored.sort((a, b) => {
      if (b.score === a.score) {
        if (b.bid === a.bid) {
          return b.updatedAt - a.updatedAt
        }
        return b.bid - a.bid
      }
      return b.score - a.score
    })

    return scored[0]?.ad || null
  }

  async _fetchAdStats (adIds) {
    if (!adIds || !adIds.length) {
      return {}
    }

    const rows = await Database
      .from('tracking_events')
      .whereIn('ad_id', adIds)
      .groupBy('ad_id')
      .select('ad_id')
      .select(Database.raw("SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions"))
      .select(Database.raw("SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks"))

    const stats = {}
    rows.forEach((row) => {
      stats[row.ad_id] = {
        impressions: Number(row.impressions || 0),
        clicks: Number(row.clicks || 0)
      }
    })
    return stats
  }

  _calculateCtrScore (ctr, impressions = 0) {
    if (!impressions || impressions <= 0) {
      return 1
    }

    if (ctr >= 0.1) {
      return 1.5
    }
    if (ctr >= 0.05) {
      return 1.3
    }
    if (ctr >= 0.02) {
      return 1.1
    }
    if (ctr === 0) {
      return 0.85
    }
    return 0.95
  }

  _calculateRelevanceScore (ad, category) {
    if (!category) {
      return 1
    }

    const normalizedCategory = category.toLowerCase()
    const interests = ad.getTargetingInterests({ targeting_interests: ad.targeting_interests }) || []
    if (!interests.length) {
      return 1
    }

    const matches = interests.some((interest) => (interest || '').toLowerCase() === normalizedCategory)
    return matches ? 1.25 : 0.85
  }

  async embedScript ({ params, request, response }) {
    response.header('Content-Type', 'application/javascript')

    const slotAd = await Ad.query()
      .where('slot_key', params.slotKey)
      .first()

    if (!slotAd) {
      return 'console.warn("Ad slot is missing");'
    }

    const defaultBaseUrl = Env.get('APP_URL', 'http://localhost:3333')
    const baseUrl = request.input('baseUrl', defaultBaseUrl)
    return this._buildEmbedScript(slotAd, baseUrl)
  }

  async trackEvent ({ params, request, response }) {
    const slotKey = params.slotKey
    const ads = await Ad.query()
      .where('slot_key', slotKey)
      .where('active', true)
      .fetch()

    if (!ads.rows.length) {
      return response.status(404).json({ message: 'Unknown slot' })
    }

    const targetAdId = request.input('adId')
    let ad = null

    if (targetAdId) {
      ad = ads.rows.find((row) => Number(row.id) === Number(targetAdId))
    }
    if (!ad) {
      ad = ads.rows[0]
    }

    let advertiser = null
    try {
      await ad.load('user')
      advertiser = ad.getRelated('user')
    } catch (error) {
      advertiser = null
    }

    const payload = request.only(['eventType', 'deviceType', 'deviceId', 'partner', 'metadata', 'slotId'])
    const allowedEvents = ['impression', 'click', 'conversion']

    if (!payload.eventType || !allowedEvents.includes(payload.eventType)) {
      return response.status(422).json({ message: 'Invalid event type' })
    }

    const event = new TrackingEvent()
    event.ad_id = ad.id
    event.slot_key = ad.slot_key
    event.slot_id = payload.slotId || ad.slot_id
    event.event_type = payload.eventType
    event.device_type = payload.deviceType
    event.device_id = payload.deviceId
    const partnerKey = payload.partner || 'unknown'
    event.partner = partnerKey
    event.metadata = event.setMetadata(payload.metadata)
    event.ip_address = request.ip()
    event.user_agent = request.header('user-agent')

    let isValid = true
    let invalidReason = null

    if (payload.eventType === 'click') {
      if (!payload.deviceId) {
        isValid = false
        invalidReason = 'missing_device'
      } else {
        const duplicate = await this._isDuplicateClick(ad, payload.deviceId)
        if (duplicate) {
          isValid = false
          invalidReason = 'duplicate_click'
        }
      }
    }

    let billingResult = {
      billable: false,
      advertiserCharge: 0,
      publisherAmount: 0,
      partnerUserId: null
    }

    let partnerUser = null
    if (partnerKey && partnerKey !== 'unknown') {
      partnerUser = await this._resolvePartnerUser(partnerKey)
    }

    if (isValid && payload.eventType === 'click') {
      billingResult = await this._billClick(ad, advertiser, partnerUser)
    }

    event.is_valid = isValid
    event.invalid_reason = invalidReason
    event.billable = billingResult.billable || false
    event.advertiser_charge = billingResult.advertiserCharge || 0
    event.publisher_amount = billingResult.publisherAmount || 0
    event.partner_user_id = billingResult.partnerUserId || null
    await event.save()
    
    return {
      success: true,
      billable: event.billable
    }
  }

  _buildEmbedScript (ad, baseUrl) {
    const sanitizedBaseUrl = baseUrl.replace(/\/$/, '')
    const slotLiteral = JSON.stringify(ad.slot_key)
    const baseLiteral = JSON.stringify(sanitizedBaseUrl)
    const creativeType = (ad.creative_type || 'box').toLowerCase()
    const normalizedCreative = creativeType === 'modal' ? 'modal' : 'box'
    const creativeLiteral = JSON.stringify(normalizedCreative)

    return `(function(){
  var script = document.currentScript || (function(){
    var scripts = document.getElementsByTagName('script')
    return scripts[scripts.length - 1]
  })()
  var slotKey = ${slotLiteral}
  var slotId = ${JSON.stringify(ad.slot_id)}
  var apiBase = script.getAttribute('data-base-url') || ${baseLiteral}
  var slotAttr = script.getAttribute('data-slot')
  if (slotAttr) {
    slotKey = slotAttr
  }
  var slotIdAttr = script.getAttribute('data-slot-id')
  if (slotIdAttr) {
    slotId = slotIdAttr
  }
  if (apiBase.charAt(apiBase.length - 1) === '/') {
    apiBase = apiBase.slice(0, -1)
  }
  var deviceType = (script.getAttribute('data-device-type') || '').toLowerCase()
  var deviceId = script.getAttribute('data-device-id') || ''
  var country = (script.getAttribute('data-country') || script.getAttribute('data-geo') || '').toLowerCase()
  var province = (script.getAttribute('data-province') || '').toLowerCase()
  var city = (script.getAttribute('data-city') || '').toLowerCase()
  var categoryAttr = (script.getAttribute('data-category') || '').toLowerCase()
  var deviceClass = (script.getAttribute('data-device-class') || '').toLowerCase()
  var interestsAttr = script.getAttribute('data-interests') || ''
  var normalizedInterests = interestsAttr
    ? interestsAttr.split(',').map(function (item) {
        return (item || '').trim().toLowerCase()
      }).filter(function (item) { return item })
    : []
  function detectPartnerFromQuery () {
    try {
      return new URLSearchParams(window.location.search).get('adsPartner') || ''
    } catch (e) {
      return ''
    }
  }

  function appendPartnerToUrl (url, partnerValue) {
    if (!url) {
      return '#'
    }
    try {
      var parsed = new URL(url, window.location.href)
      if (partnerValue) {
        parsed.searchParams.set('adsPartner', partnerValue)
      }
      parsed.searchParams.set('slotKey', slotKey)
      parsed.searchParams.set('slotId', slotId)
      return parsed.toString()
    } catch (e) {
      var queryParts = []
      if (partnerValue) {
        queryParts.push('adsPartner=' + encodeURIComponent(partnerValue))
      }
      queryParts.push('slotKey=' + encodeURIComponent(slotKey))
      queryParts.push('slotId=' + encodeURIComponent(slotId))
      var separator = url.indexOf('?') === -1 ? '?' : '&'
      return url + separator + queryParts.join('&')
    }
  }

  var partner = script.getAttribute('data-partner') || detectPartnerFromQuery() || 'unknown'
  var containerId = script.getAttribute('data-container-id')
  var modeAttr = (script.getAttribute('data-mode') || '').toLowerCase()
  var conversionOnly = modeAttr === 'conversion' || (script.getAttribute('data-conversion-only') || '').toLowerCase() === 'true'
  var defaultCreativeType = ${creativeLiteral}
  var modalOverlayId = 'ads-pixel-modal-' + slotKey
  var inlineMount = null
  var impressionTracked = false

  var currentAdId = script.getAttribute('data-ad-id') || null

  function track (eventType, meta) {
    try {
      fetch(apiBase + '/api/pixels/' + slotKey + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: eventType,
          deviceType: deviceType,
          deviceId: deviceId,
          adId: currentAdId,
          slotId: slotId,
          partner: partner,
          metadata: meta || {}
        })
      })
    } catch (e) {}
  }

  function resolveTarget () {
    if (containerId) {
      var node = document.getElementById(containerId)
      if (node) {
        return node
      }
      return null
    }
    if (inlineMount && inlineMount.parentNode) {
      return inlineMount
    }
    var mount = document.createElement('div')
    mount.className = 'ads-pixel-slot'
    if (script.parentNode) {
      script.parentNode.insertBefore(mount, script)
    } else if (document.body) {
      document.body.appendChild(mount)
    } else if (document.documentElement) {
      document.documentElement.appendChild(mount)
    }
    inlineMount = mount
    return mount
  }

  function cleanModal () {
    var existing = document.getElementById(modalOverlayId)
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing)
    }
  }

  function buildContent (payload, variant) {
    var wrapper = document.createElement('div')
    wrapper.className = 'ads-pixel-wrapper'
    wrapper.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    wrapper.style.display = 'flex'
    wrapper.style.flexDirection = 'column'
    wrapper.style.width = '100%'
    if (variant === 'modal') {
      wrapper.style.background = 'transparent'
      wrapper.style.padding = '0'
    } else {
      wrapper.style.background = '#fff'
      wrapper.style.border = '1px solid #e2e8f0'
      wrapper.style.borderRadius = '12px'
      wrapper.style.padding = '12px'
      wrapper.style.maxWidth = '360px'
      wrapper.style.boxShadow = '0 8px 20px rgba(15,23,42,0.08)'
    }

    var clickable = document.createElement('a')
    clickable.href = appendPartnerToUrl(payload.ctaUrl || '#', partner)
    clickable.target = '_blank'
    clickable.rel = 'noopener noreferrer'
    clickable.style.display = 'flex'
    clickable.style.flexDirection = 'column'
    clickable.style.gap = '8px'
    clickable.style.textDecoration = 'none'
    clickable.style.color = 'inherit'
    clickable.style.cursor = 'pointer'

    clickable.addEventListener('click', function (event) {
      track('click', { target: event.target.tagName || 'A' })
    })

    if (payload.imageUrl) {
      var img = document.createElement('img')
      img.src = payload.imageUrl
      img.alt = payload.headline || payload.name || 'ad image'
      img.style.width = '100%'
      img.style.borderRadius = variant === 'modal' ? '12px' : '8px'
      img.style.display = 'block'
      clickable.appendChild(img)
    }

    if (payload.headline) {
      var headline = document.createElement('div')
      headline.textContent = payload.headline
      headline.style.fontWeight = '600'
      headline.style.fontSize = '18px'
      headline.style.color = '#0f172a'
      clickable.appendChild(headline)
    }

    if (payload.description) {
      var body = document.createElement('div')
      body.textContent = payload.description
      body.style.fontSize = '14px'
      body.style.color = '#475569'
      clickable.appendChild(body)
    }

    if (!payload.imageUrl && !payload.headline && !payload.description) {
      var fallback = document.createElement('div')
      fallback.textContent = payload.ctaLabel || payload.name || 'View offer'
      fallback.style.fontWeight = '600'
      fallback.style.color = '#2563eb'
      clickable.appendChild(fallback)
    }

    wrapper.appendChild(clickable)
    return wrapper
  }

  function registerConversionHelper () {
    var helper = function (meta) {
      track('conversion', meta)
    }
    window['adsPixelConversion_' + slotKey] = helper
    if (partner && partner !== 'unknown') {
      window['adsPixelConversion_' + partner] = helper
    }
  }

  function triggerImpression (variant) {
    if (conversionOnly) {
      return
    }
    if (impressionTracked) {
      return
    }
    impressionTracked = true
    track('impression', { auto: true, variant: variant })
  }

  function watchImpression (target, variant) {
    if (!target || conversionOnly) {
      return
    }
    if (!('IntersectionObserver' in window)) {
      triggerImpression(variant)
      return
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
          triggerImpression(variant)
          observer.disconnect()
        }
      })
    }, {
      threshold: [0.25, 0.5, 0.75]
    })
    observer.observe(target)
  }

  function renderBox (payload, attempt) {
    var target = resolveTarget()
    if (!target) {
      var tries = typeof attempt === 'number' ? attempt : 0
      if (tries > 40) {
        var fallback = document.createElement('div')
        fallback.className = 'ads-pixel-slot'
        var parent = document.body || document.documentElement
        if (parent) {
          parent.appendChild(fallback)
          target = fallback
        }
      } else {
        return setTimeout(function () {
          renderBox(payload, tries + 1)
        }, 100)
      }
    }
    if (!target) {
      console.warn('ads pixel target container missing')
      return
    }
    var markup = buildContent(payload, 'box')
    target.innerHTML = ''
    target.appendChild(markup)
    registerConversionHelper()
    watchImpression(target, 'box')
  }

  function renderModal (payload) {
    if (!document.body) {
      return setTimeout(function () {
        renderModal(payload)
      }, 50)
    }

    cleanModal()
    var overlay = document.createElement('div')
    overlay.id = modalOverlayId
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.right = '0'
    overlay.style.bottom = '0'
    overlay.style.background = 'rgba(15,23,42,0.7)'
    overlay.style.zIndex = '2147483647'
    overlay.style.display = 'flex'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.style.padding = '16px'

    var modal = document.createElement('div')
    modal.style.background = '#fff'
    modal.style.borderRadius = '16px'
    modal.style.maxWidth = '480px'
    modal.style.width = '100%'
    modal.style.boxShadow = '0 24px 48px rgba(15,23,42,0.35)'
    modal.style.position = 'relative'
    modal.style.padding = '24px 24px 32px'

    var close = document.createElement('button')
    close.type = 'button'
    close.setAttribute('aria-label', 'Close modal')
    close.innerHTML = '&times;'
    close.style.position = 'absolute'
    close.style.top = '10px'
    close.style.right = '14px'
    close.style.border = 'none'
    close.style.background = 'transparent'
    close.style.fontSize = '28px'
    close.style.lineHeight = '1'
    close.style.cursor = 'pointer'
    close.style.color = '#0f172a'
    close.addEventListener('click', function () {
      cleanModal()
    })

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        cleanModal()
      }
    })

    var content = buildContent(payload, 'modal')
    modal.appendChild(close)
    modal.appendChild(content)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    registerConversionHelper()
    watchImpression(modal, 'modal')
  }

  function resolveCreativeType (payload) {
    var provided = (payload && (payload.creativeType || payload.creative_type)) || defaultCreativeType
    if (!provided) {
      return 'box'
    }
    var normalized = String(provided).toLowerCase()
    return normalized === 'modal' ? 'modal' : 'box'
  }

  function render (payload) {
    var variant = resolveCreativeType(payload)
    if (variant === 'modal') {
      renderModal(payload)
    } else {
      renderBox(payload)
    }
  }

  if (conversionOnly) {
    registerConversionHelper()
    return
  }

  var serveParams = [
    'deviceType=' + encodeURIComponent(deviceType || ''),
    'deviceId=' + encodeURIComponent(deviceId || '')
  ]
  if (country) {
    serveParams.push('country=' + encodeURIComponent(country))
  }
  if (province) {
    serveParams.push('province=' + encodeURIComponent(province))
  }
  if (city) {
    serveParams.push('city=' + encodeURIComponent(city))
  }
  if (categoryAttr) {
    serveParams.push('category=' + encodeURIComponent(categoryAttr))
  }
  if (deviceClass) {
    serveParams.push('deviceClass=' + encodeURIComponent(deviceClass))
  }
  if (normalizedInterests.length) {
    serveParams.push('interests=' + encodeURIComponent(normalizedInterests.join(',')))
  }
  var serveUrl = apiBase + '/api/pixels/' + slotKey + '/ad?' + serveParams.join('&')
  fetch(serveUrl)
    .then(function (res) {
      if (res.status === 204) {
        return null
      }
      if (!res.ok) {
        throw new Error('Ad server error')
      }
      return res.json()
    })
    .then(function (payload) {
      if (payload) {
        currentAdId = payload.id
        render(payload)
      }
    })
    .catch(function (err) {
      console.error('Unable to load ad pixel', err)
    })
})()`
  }

  async _resolvePartnerUser (partnerKey) {
    if (!partnerKey) {
      return null
    }

    return User.query()
      .where('role', 'publisher')
      .where('partner_key', partnerKey)
      .first()
  }

  async _isDuplicateClick (ad, deviceId) {
    if (!ad || !deviceId) {
      return false
    }

    const cutoff = new Date(Date.now() - 60 * 1000)
    const existing = await TrackingEvent.query()
      .where('ad_id', ad.id)
      .where('event_type', 'click')
      .where('device_id', deviceId)
      .where('created_at', '>=', cutoff)
      .first()

    return !!existing
  }

  _resetDailyWindow (ad) {
    if (!ad) {
      return
    }
    const today = this._formatDate(new Date())
    if (ad.daily_spend_date !== today) {
      ad.daily_spend_date = today
      ad.spent_today = 0
    }
  }

  _formatDate (date) {
    if (!date) {
      return null
    }
    return date.toISOString().slice(0, 10)
  }

  async _billClick (ad, advertiser, partnerUser) {
    const rawBid = Number(ad.cpc_bid || 0)
    if (!ad || !advertiser || !rawBid || rawBid <= 0) {
      return {
        billable: false,
        advertiserCharge: 0,
        publisherAmount: 0,
        partnerUserId: null
      }
    }

    const normalizedBid = Number(rawBid.toFixed(2))
    this._resetDailyWindow(ad)

    const totalSpent = Number(ad.spent_total || 0)
    const spentToday = Number(ad.spent_today || 0)
    const totalBudget = Number(ad.total_budget || 0)
    const dailyBudget = Number(ad.daily_budget || 0)
    const advertiserBalance = Number(advertiser.balance || 0)

    const exceedsTotal = totalBudget > 0 && totalSpent + normalizedBid > totalBudget
    const exceedsDaily = dailyBudget > 0 && spentToday + normalizedBid > dailyBudget

    if (exceedsTotal || exceedsDaily || advertiserBalance < normalizedBid) {
      ad.active = false
      await ad.save()
      return {
        billable: false,
        advertiserCharge: 0,
        publisherAmount: 0,
        partnerUserId: null
      }
    }

    ad.spent_total = this._addCurrency(totalSpent, normalizedBid)
    ad.spent_today = this._addCurrency(spentToday, normalizedBid)
    advertiser.balance = this._addCurrency(advertiserBalance, -normalizedBid)

    const exhaustedTotal = totalBudget > 0 && ad.spent_total >= totalBudget
    const exhaustedDaily = dailyBudget > 0 && ad.spent_today >= dailyBudget

    if (exhaustedTotal || exhaustedDaily) {
      ad.active = false
    }

    await advertiser.save()
    await ad.save()

    let publisherAmount = 0
    let partnerUserId = null

    if (partnerUser) {
      const share = Number(partnerUser.revenue_share || 0)
      if (share > 0) {
        publisherAmount = this._addCurrency(0, (normalizedBid * share) / 100)
        partnerUser.payout_balance = this._addCurrency(partnerUser.payout_balance || 0, publisherAmount)
        await partnerUser.save()
        partnerUserId = partnerUser.id
      }
    }

    return {
      billable: true,
      advertiserCharge: normalizedBid,
      publisherAmount,
      partnerUserId
    }
  }

  _addCurrency (current, delta, precision = 2) {
    const base = Number(current || 0)
    const change = Number(delta || 0)
    if (Number.isNaN(base) || Number.isNaN(change)) {
      return 0
    }
    return Number((base + change).toFixed(precision))
  }

  _parseList (value) {
    if (!value) {
      return []
    }

    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : item)).filter(Boolean)
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
    }

    return []
  }
}

module.exports = PixelController
