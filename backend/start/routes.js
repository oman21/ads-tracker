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
  Route.get('ads', 'AdController.index')
  Route.post('ads', 'AdController.store')
  Route.get('ads/:id', 'AdController.show')
  Route.put('ads/:id', 'AdController.update')
  Route.delete('ads/:id', 'AdController.destroy')
  Route.get('ads/:id/stats', 'AdController.stats')
  Route.get('ads/:id/snippet', 'AdController.snippet')
  Route.get('ads/:id/activity', 'AdController.activity')

  Route.get('reports/overview', 'ReportController.overview')
}).prefix('api').middleware(['auth:jwt'])

Route.group(() => {
  Route.get('pixels/:pixelId/ad', 'PixelController.serveAd')
  Route.get('pixels/:pixelId/embed.js', 'PixelController.embedScript')
  Route.post('pixels/:pixelId/track', 'PixelController.trackEvent')
}).prefix('api')
