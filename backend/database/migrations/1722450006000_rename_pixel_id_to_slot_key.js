'use strict'

const Schema = use('Schema')

class RenamePixelIdToSlotKeySchema extends Schema {
  up () {
    this.table('ads', (table) => {
      table.renameColumn('pixel_id', 'slot_key')
    })
  }

  down () {
    this.table('ads', (table) => {
      table.renameColumn('slot_key', 'pixel_id')
    })
  }
}

module.exports = RenamePixelIdToSlotKeySchema
