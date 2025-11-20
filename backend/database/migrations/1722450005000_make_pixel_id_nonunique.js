'use strict'

const Schema = use('Schema')

class MakePixelIdNonuniqueSchema extends Schema {
  up () {
    this.table('ads', (table) => {
      table.dropUnique('pixel_id')
    })
  }

  down () {
    this.table('ads', (table) => {
      table.unique('pixel_id')
    })
  }
}

module.exports = MakePixelIdNonuniqueSchema
