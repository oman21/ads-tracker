'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URLs and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

Route.get('/', () => {
  return {
    name: 'Ads Tracking API',
    docs: 'All routes are available under /api/*'
  }
})

Route.group(() => {
  Route.post('auth/login', 'AuthController.login')
}).prefix('api')

Route.group(() => {
  Route.get('ads', 'AdController.index').middleware('role:super_admin,client,publisher')
  Route.post('ads', 'AdController.store').middleware('role:super_admin,client')
  Route.get('ads/:id', 'AdController.show').middleware('role:super_admin,client,publisher')
  Route.put('ads/:id', 'AdController.update').middleware('role:super_admin,client')
  Route.delete('ads/:id', 'AdController.destroy').middleware('role:super_admin,client')
  Route.get('ads/:id/stats', 'AdController.stats').middleware('role:super_admin,client,publisher')
  Route.get('ads/:id/snippet', 'AdController.snippet').middleware('role:super_admin,client,publisher')
  Route.get('ads/:id/activity', 'AdController.activity').middleware('role:super_admin,client,publisher')

  Route.get('reports/overview', 'ReportController.overview').middleware('role:super_admin,client,publisher')
}).prefix('api').middleware(['auth:jwt'])

Route.group(() => {
  Route.post('billing/deposit', 'BillingController.deposit').middleware('role:super_admin,client')
  Route.post('billing/payout', 'BillingController.requestPayout').middleware('role:publisher')
}).prefix('api').middleware(['auth:jwt'])

Route.group(() => {
  Route.get('users', 'UserController.index')
  Route.post('users', 'UserController.store')
  Route.put('users/:id', 'UserController.update')
}).prefix('api').middleware(['auth:jwt', 'role:super_admin'])

Route.group(() => {
  Route.get('pixels/:slotKey/ad', 'PixelController.serveAd')
  Route.get('pixels/:slotKey/embed.js', 'PixelController.embedScript')
  Route.post('pixels/:slotKey/track', 'PixelController.trackEvent')
}).prefix('api')
