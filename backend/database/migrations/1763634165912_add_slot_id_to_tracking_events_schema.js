'use strict'

const Schema = use('Schema')

class AddSlotIdToTrackingEventsSchema extends Schema {
  up () {
    this.table('tracking_events', (table) => {
      table.string('slot_id', 64)
    })
  }

  down () {
    this.table('tracking_events', (table) => {
      table.dropColumn('slot_id')
    })
  }
}

module.exports = AddSlotIdToTrackingEventsSchema
