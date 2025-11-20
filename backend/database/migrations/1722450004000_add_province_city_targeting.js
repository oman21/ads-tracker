'use strict'

const Schema = use('Schema')

class AddProvinceCityTargetingSchema extends Schema {
  up () {
    this.table('ads', (table) => {
      table.text('targeting_provinces')
      table.text('targeting_cities')
    })
  }

  down () {
    this.table('ads', (table) => {
      table.dropColumn('targeting_provinces')
      table.dropColumn('targeting_cities')
    })
  }
}

module.exports = AddProvinceCityTargetingSchema
