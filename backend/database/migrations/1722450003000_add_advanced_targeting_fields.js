'use strict'

const Schema = use('Schema')

class AddAdvancedTargetingFieldsSchema extends Schema {
  up () {
    this.table('ads', (table) => {
      table.text('targeting_geo')
      table.text('targeting_devices')
      table.text('targeting_interests')
      table.text('targeting_gaids')
      table.text('targeting_idfas')
    })
  }

  down () {
    this.table('ads', (table) => {
      table.dropColumn('targeting_geo')
      table.dropColumn('targeting_devices')
      table.dropColumn('targeting_interests')
      table.dropColumn('targeting_gaids')
      table.dropColumn('targeting_idfas')
    })
  }
}

module.exports = AddAdvancedTargetingFieldsSchema
