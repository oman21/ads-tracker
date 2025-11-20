'use strict'

const Schema = use('Schema')

class RenameTrackingEventsPixelIdToSlotKeySchema extends Schema {
  up () {
    this.table('tracking_events', (table) => {
      table.renameColumn('pixel_id', 'slot_key')
    })
  }

  down () {
    this.table('tracking_events', (table) => {
      table.renameColumn('slot_key', 'pixel_id')
    })
  }
}

module.exports = RenameTrackingEventsPixelIdToSlotKeySchema
