'use strict'

const Schema = use('Schema')

class AdsSchema extends Schema {
  up () {
    this.create('ads', (table) => {
      table.increments()
      table.string('name', 160).notNullable()
      table.string('headline', 255)
      table.text('description')
      table.string('creative_type', 50).defaultTo('box')
      table.string('image_url', 255)
      table.string('cta_url', 255)
      table.string('cta_label', 80).defaultTo('Learn more')
      table.string('pixel_id', 64).notNullable().unique()
      table.string('targeting_mode', 20).defaultTo('all')
      table.text('targeting_values')
      table.boolean('active').defaultTo(true)
      table.timestamps()
    })
  }

  down () {
    this.drop('ads')
  }
}

module.exports = AdsSchema
