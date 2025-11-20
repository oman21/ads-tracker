'use strict'

const User = use('App/Models/User')

class BillingController {
  async deposit ({ auth, request, response }) {
    const amount = Number(request.input('amount', 0))
    if (!amount || amount <= 0) {
      return response.status(422).json({ message: 'Invalid amount' })
    }

    const user = auth.user
    let targetUser = user

    if (user.role === 'super_admin') {
      const userId = request.input('userId')
      if (!userId) {
        return response.status(422).json({ message: 'userId is required for admin deposits' })
      }
      targetUser = await User.find(userId)
      if (!targetUser) {
        return response.status(404).json({ message: 'User not found' })
      }
      if (targetUser.role !== 'client') {
        return response.status(422).json({ message: 'Deposits can only target client accounts' })
      }
    } else if (user.role !== 'client') {
      return response.status(403).json({ message: 'Only clients can add funds' })
    }

    targetUser.balance = this._addCurrency(targetUser.balance, amount)
    await targetUser.save()

    return {
      userId: targetUser.id,
      balance: Number(targetUser.balance)
    }
  }

  async requestPayout ({ auth, request, response }) {
    const user = auth.user

    if (user.role !== 'publisher') {
      return response.status(403).json({ message: 'Only publishers can request payouts' })
    }

    const amount = Number(request.input('amount', user.payout_balance))
    if (!amount || amount <= 0) {
      return response.status(422).json({ message: 'Invalid amount' })
    }

    const available = Number(user.payout_balance || 0)
    const threshold = Number(user.payout_threshold || 0)

    if (available < threshold) {
      return response.status(422).json({ message: 'Payout threshold not met' })
    }

    if (amount > available) {
      return response.status(422).json({ message: 'Requested amount exceeds available balance' })
    }

    user.payout_balance = this._addCurrency(available, -amount)
    await user.save()

    return {
      payoutBalance: Number(user.payout_balance),
      status: 'queued'
    }
  }

  _addCurrency (current, delta) {
    const base = Number(current || 0)
    const change = Number(delta || 0)
    return Number((base + change).toFixed(2))
  }
}

module.exports = BillingController
