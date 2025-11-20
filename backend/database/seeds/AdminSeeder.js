'use strict'

const User = use('App/Models/User')

const DEFAULT_ADMIN = {
  email: 'admin@example.com',
  username: 'ads-admin',
  password: 'secret123',
  role: 'super_admin',
  organization: 'Core Ops'
}

class AdminSeeder {
  async run () {
    const existingUser = await User.query().first()

    if (existingUser) {
      console.log('Users already exist. Skipping default admin seed.')
      return
    }

    const user = new User()
    user.fill(DEFAULT_ADMIN)
    await user.save()

    console.log(`Seeded admin user (${DEFAULT_ADMIN.email})`)
  }
}

module.exports = AdminSeeder
