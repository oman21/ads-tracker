'use strict'

const Schema = use('Schema')

class AddOwnerBudgetFieldsToAdsSchema extends Schema {
  up () {
    this.table('ads', (table) => {
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.decimal('cpc_bid', 12, 4).notNullable().defaultTo(0)
      table.decimal('daily_budget', 12, 2).notNullable().defaultTo(0)
      table.decimal('total_budget', 12, 2).notNullable().defaultTo(0)
      table.decimal('spent_today', 12, 2).notNullable().defaultTo(0)
      table.decimal('spent_total', 12, 2).notNullable().defaultTo(0)
      table.date('daily_spend_date')
    })
  }

  down () {
    this.table('ads', (table) => {
      table.dropColumn('user_id')
      table.dropColumn('cpc_bid')
      table.dropColumn('daily_budget')
      table.dropColumn('total_budget')
      table.dropColumn('spent_today')
      table.dropColumn('spent_total')
      table.dropColumn('daily_spend_date')
    })
  }
}

module.exports = AddOwnerBudgetFieldsToAdsSchema
