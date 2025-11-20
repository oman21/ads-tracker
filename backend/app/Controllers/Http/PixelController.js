'use strict'

const Env = use('Env')

const Ad = use('App/Models/Ad')
const TrackingEvent = use('App/Models/TrackingEvent')

class PixelController {
  async serveAd ({ params, request, response }) {
    const ad = await Ad.findBy('pixel_id', params.pixelId)

    if (!ad || !ad.active) {
      return response.status(404).json({ message: 'Ad not found' })
    }

    const deviceType = request.input('deviceType')
    const deviceId = request.input('deviceId')

    const isAllowed = ad.isDeviceAllowed(deviceType, deviceId)

    if (!isAllowed) {
      return response.noContent()
    }

    return ad.serializeForDelivery()
  }

  async embedScript ({ params, request, response }) {
    const ad = await Ad.findBy('pixel_id', params.pixelId)
    response.header('Content-Type', 'application/javascript')

    if (!ad || !ad.active) {
      return 'console.warn("Ad pixel is inactive or missing");'
    }

    const defaultBaseUrl = Env.get('APP_URL', 'http://localhost:3333')
    const baseUrl = request.input('baseUrl', defaultBaseUrl)
    return this._buildEmbedScript(ad, baseUrl)
  }

  async trackEvent ({ params, request, response }) {
    const ad = await Ad.findBy('pixel_id', params.pixelId)

    if (!ad) {
      return response.status(404).json({ message: 'Unknown pixel' })
    }

    const payload = request.only(['eventType', 'deviceType', 'deviceId', 'partner', 'metadata'])
    const allowedEvents = ['impression', 'click', 'conversion']

    if (!payload.eventType || !allowedEvents.includes(payload.eventType)) {
      return response.status(422).json({ message: 'Invalid event type' })
    }

    const event = new TrackingEvent()
    event.ad_id = ad.id
    event.pixel_id = ad.pixel_id
    event.event_type = payload.eventType
    event.device_type = payload.deviceType
    event.device_id = payload.deviceId
    event.partner = payload.partner || 'unknown'
    event.metadata = payload.metadata
    event.ip_address = request.ip()
    event.user_agent = request.header('user-agent')
    await event.save()

    return {
      success: true
    }
  }

  _buildEmbedScript (ad, baseUrl) {
    const sanitizedBaseUrl = baseUrl.replace(/\/$/, '')
    const pixelLiteral = JSON.stringify(ad.pixel_id)
    const baseLiteral = JSON.stringify(sanitizedBaseUrl)
    const creativeType = (ad.creative_type || 'box').toLowerCase()
    const normalizedCreative = creativeType === 'modal' ? 'modal' : 'box'
    const creativeLiteral = JSON.stringify(normalizedCreative)

    return `(function(){
  var script = document.currentScript || (function(){
    var scripts = document.getElementsByTagName('script')
    return scripts[scripts.length - 1]
  })()
  var pixelId = ${pixelLiteral}
  var apiBase = script.getAttribute('data-base-url') || ${baseLiteral}
  if (apiBase.charAt(apiBase.length - 1) === '/') {
    apiBase = apiBase.slice(0, -1)
  }
  var deviceType = (script.getAttribute('data-device-type') || '').toLowerCase()
  var deviceId = script.getAttribute('data-device-id') || ''
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
      parsed.searchParams.set('pixelId', pixelId)
      return parsed.toString()
    } catch (e) {
      if (partnerValue && url.indexOf('?') === -1) {
        return url + '?adsPartner=' + encodeURIComponent(partnerValue) + '&pixelId=' + encodeURIComponent(pixelId)
      } else if (partnerValue) {
        return url + '&adsPartner=' + encodeURIComponent(partnerValue)
      }
      return url
    }
  }

  var partner = script.getAttribute('data-partner') || detectPartnerFromQuery() || 'unknown'
  var containerId = script.getAttribute('data-container-id')
  var modeAttr = (script.getAttribute('data-mode') || '').toLowerCase()
  var conversionOnly = modeAttr === 'conversion' || (script.getAttribute('data-conversion-only') || '').toLowerCase() === 'true'
  var defaultCreativeType = ${creativeLiteral}
  var modalOverlayId = 'ads-pixel-modal-' + pixelId
  var inlineMount = null
  var impressionTracked = false

  function track (eventType, meta) {
    try {
      fetch(apiBase + '/api/pixels/' + pixelId + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: eventType,
          deviceType: deviceType,
          deviceId: deviceId,
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
    window['adsPixelConversion_' + pixelId] = function (meta) {
      track('conversion', meta)
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

  var serveUrl = apiBase + '/api/pixels/' + pixelId + '/ad?deviceType=' + encodeURIComponent(deviceType) + '&deviceId=' + encodeURIComponent(deviceId)
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
        render(payload)
      }
    })
    .catch(function (err) {
      console.error('Unable to load ad pixel', err)
    })
})()`
  }
}

module.exports = PixelController
