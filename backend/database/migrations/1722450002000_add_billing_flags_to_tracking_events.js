'use strict'

const Schema = use('Schema')

class AddBillingFlagsToTrackingEventsSchema extends Schema {
  up () {
    this.table('tracking_events', (table) => {
      table.boolean('is_valid').notNullable().defaultTo(true)
      table.string('invalid_reason', 80)
      table.boolean('billable').notNullable().defaultTo(false)
      table.decimal('advertiser_charge', 12, 4).notNullable().defaultTo(0)
      table.decimal('publisher_amount', 12, 4).notNullable().defaultTo(0)
      table.integer('partner_user_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
    })
  }

  down () {
    this.table('tracking_events', (table) => {
      table.dropColumn('is_valid')
      table.dropColumn('invalid_reason')
      table.dropColumn('billable')
      table.dropColumn('advertiser_charge')
      table.dropColumn('publisher_amount')
      table.dropColumn('partner_user_id')
    })
  }
}

module.exports = AddBillingFlagsToTrackingEventsSchema
