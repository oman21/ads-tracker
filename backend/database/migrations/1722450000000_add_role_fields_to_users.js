'use strict'

const Schema = use('Schema')

class AddRoleFieldsToUsersSchema extends Schema {
  up () {
    this.table('users', (table) => {
      table.string('role', 30).notNullable().defaultTo('client').index()
      table.string('organization', 120)
      table.string('partner_key', 120).unique()
      table.integer('revenue_share').unsigned().notNullable().defaultTo(60)
      table.integer('payout_threshold').unsigned().notNullable().defaultTo(500000)
      table.decimal('balance', 12, 2).notNullable().defaultTo(0)
      table.decimal('payout_balance', 12, 2).notNullable().defaultTo(0)
    })
  }

  down () {
    this.table('users', (table) => {
      table.dropColumn('role')
      table.dropColumn('organization')
      table.dropColumn('partner_key')
      table.dropColumn('revenue_share')
      table.dropColumn('payout_threshold')
      table.dropColumn('balance')
      table.dropColumn('payout_balance')
    })
  }
}

module.exports = AddRoleFieldsToUsersSchema
