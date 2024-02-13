import { environment, randomBytes, getCookies, setCookie } from './utils.js'
import * as redis from './redis.js'
import { decrypt } from './utils.js'
import handleWS from './handle-ws.js'
import { applyConfiguration, ensureDomainConfigured } from './side-effects/configure.js'
import ADMIN_DOMAIN_CONFIG from './admin-domain-config.js'

const {
  MODE,
  PORT,
  INSECURE_DEVELOPMENT_CERT,
  INSECURE_DEVELOPMENT_KEY,
  SECRET_ENCRYPTION_KEY,
  TLS_PORT,
  ADMIN_DOMAIN
} = environment

const initialConfig = Promise.all([
  ensureDomainConfigured(ADMIN_DOMAIN),
  ensureDomainConfigured('core')
])

Deno.serve({
  port: TLS_PORT,
  cert: INSECURE_DEVELOPMENT_CERT,
  key: INSECURE_DEVELOPMENT_KEY,
}, request => {
  if (request.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 })
  }

  let sid = getCookies(request.headers)['sid']

  const headers = new Headers()

  if (!sid) {
    sid = randomBytes(16, 'hex')
    setCookie(headers, { name: 'sid', value: sid, secure: true, httpOnly: true })
  }

  const { socket, response } = Deno.upgradeWebSocket(request, { idleTimeout: 10, headers })

  //  TODO: domain should probably be "development", "staging" or "production" based on mode...
  const { host: domain } = new URL(request.headers.get('origin') || 'https://core')

  handleWS(socket, domain, sid)
  return response
})
