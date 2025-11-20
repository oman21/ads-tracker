'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Ad extends Model {
  static get hidden () {
    return ['targeting_values']
  }

  static get computed () {
    return [
      'targetingValues',
      'targetingGeo',
      'targetingProvinces',
      'targetingCities',
      'targetingDevices',
      'targetingInterests',
      'targetingGaids',
      'targetingIdfas',
      'slotKey',
      'slotId'
    ]
  }

  getSlotKey (attributes) {
    if (!attributes) {
      return null
    }
    return attributes.slot_key || null
  }

  getSlotId (attributes) {
    if (!attributes) {
      return null
    }
    return attributes.slot_id || null
  }

  trackingEvents () {
    return this.hasMany('App/Models/TrackingEvent')
  }

  user () {
    return this.belongsTo('App/Models/User')
  }

  getTargetingValues (attributes) {
    return this._parseJsonArray(attributes && attributes.targeting_values)
  }

  setTargetingValues (value) {
    return this._serializeArray(value)
  }

  getTargetingGeo (attributes) {
    return this._parseJsonArray(attributes && attributes.targeting_geo)
  }

  setTargetingGeo (value) {
    return this._serializeArray(value)
  }

  getTargetingProvinces (attributes) {
    return this._parseJsonArray(attributes && attributes.targeting_provinces)
  }

  setTargetingProvinces (value) {
    return this._serializeArray(value)
  }

  getTargetingCities (attributes) {
    return this._parseJsonArray(attributes && attributes.targeting_cities)
  }

  setTargetingCities (value) {
    return this._serializeArray(value)
  }

  getTargetingDevices (attributes) {
    return this._parseJsonArray(attributes && attributes.targeting_devices)
  }

  setTargetingDevices (value) {
    return this._serializeArray(value)
  }

  getTargetingInterests (attributes) {
    return this._parseJsonArray(attributes && attributes.targeting_interests)
  }

  setTargetingInterests (value) {
    return this._serializeArray(value)
  }

  getTargetingGaids (attributes) {
    return this._parseJsonArray(attributes && attributes.targeting_gaids)
  }

  setTargetingGaids (value) {
    return this._serializeArray(value)
  }

  getTargetingIdfas (attributes) {
    return this._parseJsonArray(attributes && attributes.targeting_idfas)
  }

  setTargetingIdfas (value) {
    return this._serializeArray(value)
  }

  isDeviceAllowed (deviceType, deviceId) {
    return this.matchesTargeting({ deviceType, deviceId })
  }

  serializeForDelivery () {
    const creativeType = (this.creative_type || 'box').toLowerCase()
    const normalized = creativeType === 'modal' ? 'modal' : 'box'

    return {
      id: this.id,
      slotKey: this.slot_key,
      slotId: this.slot_id,
      name: this.name,
      headline: this.headline,
      description: this.description,
      creativeType: normalized,
      imageUrl: this.image_url,
      ctaUrl: this.cta_url,
      ctaLabel: this.cta_label,
      cpcBid: Number(this.cpc_bid || 0)
    }
  }

  matchesTargeting ({ geo, country, province, city, deviceClass, interests, deviceType, deviceId }) {
    const config = this._getTargetingConfig()
    const normalizedCountry = (country || geo || '').toString().toLowerCase() || null
    const normalizedProvince = province ? province.toLowerCase() : null
    const normalizedCity = city ? city.toLowerCase() : null
    const normalizedDeviceClass = deviceClass ? deviceClass.toLowerCase() : null
    const normalizedInterests = Array.isArray(interests)
      ? interests.map((item) => item && item.toLowerCase()).filter(Boolean)
      : []
    const normalizedDeviceType = deviceType ? deviceType.toLowerCase() : null
    const normalizedDeviceId = deviceId ? deviceId.toLowerCase() : null

    if (config.geo.length && (!normalizedCountry || !config.geo.includes(normalizedCountry))) {
      return false
    }

    if (config.provinces.length && (!normalizedProvince || !config.provinces.includes(normalizedProvince))) {
      return false
    }

    if (config.cities.length && (!normalizedCity || !config.cities.includes(normalizedCity))) {
      return false
    }

    if (config.devices.length && (!normalizedDeviceClass || !config.devices.includes(normalizedDeviceClass))) {
      return false
    }

    if (config.interests.length) {
      if (!normalizedInterests.length || !normalizedInterests.some((interest) => config.interests.includes(interest))) {
        return false
      }
    }

    if (config.gaids.length) {
      if (normalizedDeviceType !== 'gaid' || !normalizedDeviceId || !config.gaids.includes(normalizedDeviceId)) {
        return false
      }
    }

    if (config.idfas.length) {
      if (normalizedDeviceType !== 'idfa' || !normalizedDeviceId || !config.idfas.includes(normalizedDeviceId)) {
        return false
      }
    }

    return true
  }

  _getTargetingConfig () {
    const geo = this.getTargetingGeo({ targeting_geo: this.targeting_geo })
    const provinces = this.getTargetingProvinces({ targeting_provinces: this.targeting_provinces })
    const cities = this.getTargetingCities({ targeting_cities: this.targeting_cities })
    const devices = this.getTargetingDevices({ targeting_devices: this.targeting_devices })
    const interests = this.getTargetingInterests({ targeting_interests: this.targeting_interests })
    const gaids = this.getTargetingGaids({ targeting_gaids: this.targeting_gaids })
    const idfas = this.getTargetingIdfas({ targeting_idfas: this.targeting_idfas })

    return {
      geo: geo.map((value) => value.toLowerCase()),
      provinces: provinces.map((value) => value.toLowerCase()),
      cities: cities.map((value) => value.toLowerCase()),
      devices: devices.map((value) => value.toLowerCase()),
      interests: interests.map((value) => value.toLowerCase()),
      gaids: gaids.map((value) => value.toLowerCase()),
      idfas: idfas.map((value) => value.toLowerCase())
    }
  }

  _parseJsonArray (value) {
    if (!value) {
      return []
    }

    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      return []
    }
  }

  _serializeArray (values) {
    if (!values || !values.length) {
      return null
    }
    return JSON.stringify(values)
  }
}

module.exports = Ad
