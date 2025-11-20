'use strict'

const Schema = use('Schema')

class TrackingEventsSchema extends Schema {
  up () {
    this.create('tracking_events', (table) => {
      table.increments()
      table.integer('ad_id').unsigned().references('id').inTable('ads').onDelete('CASCADE')
      table.string('pixel_id', 64).notNullable().index()
      table.string('event_type', 30).notNullable()
      table.string('device_type', 20)
      table.string('device_id', 120)
      table.string('partner', 120)
      table.text('metadata')
      table.string('ip_address', 64)
      table.text('user_agent')
      table.timestamps()
    })
  }

  down () {
    this.drop('tracking_events')
  }
}

module.exports = TrackingEventsSchema
