'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class TrackingEvent extends Model {
  ad () {
    return this.belongsTo('App/Models/Ad')
  }

  getMetadata ({ metadata }) {
    if (!metadata) {
      return {}
    }

    try {
      return JSON.parse(metadata)
    } catch (error) {
      return {}
    }
  }

  setMetadata (value) {
    if (!value) {
      return null
    }

    return JSON.stringify(value)
  }
}

module.exports = TrackingEvent
