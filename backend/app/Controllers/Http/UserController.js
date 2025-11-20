'use strict'

const User = use('App/Models/User')

const ALLOWED_ROLES = ['super_admin', 'client', 'publisher']

class UserController {
  async index ({ request }) {
    const { role } = request.get()
    const query = User.query().orderBy('created_at', 'desc')

    if (role && ALLOWED_ROLES.includes(role)) {
      query.where('role', role)
    }

    const users = await query.fetch()
    return users.toJSON().map((user) => this._serialize(user))
  }

  async store ({ request, response }) {
    const payload = request.only([
      'email',
      'username',
      'password',
      'role',
      'organization',
      'partnerKey',
      'revenueShare',
      'payoutThreshold'
    ])

    if (!payload.email || !payload.username || !payload.password) {
      return response.status(422).json({ message: 'Email, username, and password are required' })
    }

    const user = new User()
    this._applyPayload(user, payload, true)
    await user.save()

    return this._serialize(user.toJSON())
  }

  async update ({ params, request, response }) {
    const user = await User.find(params.id)

    if (!user) {
      return response.status(404).json({ message: 'User not found' })
    }

    const payload = request.only([
      'email',
      'username',
      'password',
      'role',
      'organization',
      'partnerKey',
      'revenueShare',
      'payoutThreshold',
      'balance',
      'payoutBalance'
    ])

    this._applyPayload(user, payload, false)
    await user.save()

    return this._serialize(user.toJSON())
  }

  _applyPayload (user, payload, isCreate) {
    if (payload.email !== undefined) user.email = payload.email
    if (payload.username !== undefined) user.username = payload.username
    if (payload.password) user.password = payload.password

    const requestedRole = payload.role && ALLOWED_ROLES.includes(payload.role) ? payload.role : null
    if (requestedRole) {
      user.role = requestedRole
    } else if (isCreate && !user.role) {
      user.role = 'client'
    }

    if (payload.organization !== undefined) {
      user.organization = payload.organization || null
    }

    if (payload.partnerKey !== undefined) {
      user.partner_key = payload.partnerKey || null
    } else if (isCreate && payload.role === 'publisher' && !user.partner_key) {
      user.partner_key = payload.username
    }

    if (payload.revenueShare !== undefined) {
      const share = Number(payload.revenueShare)
      user.revenue_share = Number.isNaN(share) ? user.revenue_share : Math.max(0, Math.min(100, Math.round(share)))
    }

    if (payload.payoutThreshold !== undefined) {
      const threshold = Number(payload.payoutThreshold)
      user.payout_threshold = Number.isNaN(threshold) ? user.payout_threshold : Math.max(0, Math.round(threshold))
    }

    if (!isCreate && payload.balance !== undefined) {
      const balance = Number(payload.balance)
      if (!Number.isNaN(balance)) {
        user.balance = balance
      }
    }

    if (!isCreate && payload.payoutBalance !== undefined) {
      const payoutBalance = Number(payload.payoutBalance)
      if (!Number.isNaN(payoutBalance)) {
        user.payout_balance = payoutBalance
      }
    }
  }

  _serialize (user) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      organization: user.organization,
      partnerKey: user.partner_key,
      revenueShare: user.revenue_share,
      payoutThreshold: user.payout_threshold,
      balance: Number(user.balance || 0),
      payoutBalance: Number(user.payout_balance || 0),
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }
  }
}

module.exports = UserController
