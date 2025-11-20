'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Ad extends Model {
  static get hidden () {
    return ['targeting_values']
  }

  static get computed () {
    return ['targetingValues']
  }

  trackingEvents () {
    return this.hasMany('App/Models/TrackingEvent')
  }

  getTargetingValues (attributes) {
    const storedValues = attributes && attributes.targeting_values
    if (!storedValues) {
      return []
    }

    try {
      const parsed = JSON.parse(storedValues)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      return []
    }
  }

  setTargetingValues (value) {
    if (!value || !value.length) {
      return null
    }

    return JSON.stringify(value)
  }

  isDeviceAllowed (deviceType, deviceId) {
    const mode = (this.targeting_mode || 'all').toLowerCase()
    const normalizedDeviceType = deviceType ? deviceType.toLowerCase() : null

    if (mode === 'all') {
      return true
    }

    const values = this.getTargetingValues({ targeting_values: this.targeting_values })
    if (!values.length) {
      return true
    }

    if (!normalizedDeviceType || !deviceId) {
      return false
    }

    if (mode !== normalizedDeviceType) {
      return false
    }

    return values.includes(deviceId)
  }

  serializeForDelivery () {
    const creativeType = (this.creative_type || 'box').toLowerCase()
    const normalized = creativeType === 'modal' ? 'modal' : 'box'

    return {
      id: this.id,
      name: this.name,
      headline: this.headline,
      description: this.description,
      creativeType: normalized,
      imageUrl: this.image_url,
      ctaUrl: this.cta_url,
      ctaLabel: this.cta_label,
      pixelId: this.pixel_id
    }
  }
}

module.exports = Ad
