'use strict'

class Role {
  async handle ({ auth, response }, next, roles) {
    const user = await auth.getUser()
    const allowedRoles = Array.isArray(roles) && roles.length ? roles : []

    if (!allowedRoles.length || allowedRoles.includes(user.role)) {
      await next()
      return
    }

    return response.status(403).json({ message: 'Forbidden' })
  }
}

module.exports = Role
