'use strict'

const Schema = use('Schema')
const Database = use('Database')
const { randomUUID } = require('crypto')

class AddSlotIdToAdsSchema extends Schema {
  async up () {
    await this.table('ads', (table) => {
      table.string('slot_id', 64).unique()
    })
  }

  down () {
    this.table('ads', (table) => {
      table.dropColumn('slot_id')
    })
  }
}

module.exports = AddSlotIdToAdsSchema