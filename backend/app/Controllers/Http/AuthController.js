'use strict'

const User = use('App/Models/User')

class AuthController {
  async login ({ request, auth, response }) {
    const { email, password } = request.only(['email', 'password'])

    if (!email || !password) {
      return response.status(422).json({ message: 'Email and password are required' })
    }

    try {
      const token = await auth.attempt(email, password)
      const user = await User.findBy('email', email)

      return {
        token: token.token,
        type: token.type,
        expiresIn: token.expiresIn || null,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          organization: user.organization,
          partnerKey: user.partner_key,
          revenueShare: user.revenue_share,
          payoutBalance: Number(user.payout_balance || 0),
          balance: Number(user.balance || 0)
        }
      }
    } catch (error) {
      return response.status(401).json({ message: 'Invalid email or password' })
    }
  }
}

module.exports = AuthController
