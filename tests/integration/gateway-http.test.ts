/**
 * Integration tests for the Chariow Serve HTTP gateway.
 * Uses handleGatewayRequest from serve.ts on port 34243.
 *
 * Only tests endpoints that do NOT require real Chariow API calls
 * (health, auth, CORS, static responses) — no real API key needed.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { handleGatewayRequest } from '../../src/cli/commands/serve.js'

const PORT    = 34243
const BASE    = `http://localhost:${PORT}`
const API_KEY = 'test-chariow-key-12345'

// The gateway server has NO defaultApiKey — every request must supply one.
let server: http.Server

before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      await handleGatewayRequest(req, res /* no defaultApiKey */)
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  })
  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve))
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const AUTH = { Authorization: `Bearer ${API_KEY}` }
const JSON_HEADERS = { ...AUTH, 'Content-Type': 'application/json' }

// ─── CORS preflight ───────────────────────────────────────────────────────────

describe('Gateway — CORS preflight', () => {
  it('OPTIONS → 204 (no API key required)', async () => {
    const res = await fetch(`${BASE}/v1/products`, { method: 'OPTIONS' })
    assert.equal(res.status, 204)
  })

  it('OPTIONS has Access-Control-Allow-Origin: *', async () => {
    const res = await fetch(`${BASE}/v1/balance`, { method: 'OPTIONS' })
    assert.equal(res.headers.get('access-control-allow-origin'), '*')
  })

  it('OPTIONS has Access-Control-Allow-Methods header', async () => {
    const res = await fetch(`${BASE}/v1/charges`, { method: 'OPTIONS' })
    const methods = res.headers.get('access-control-allow-methods') ?? ''
    assert.ok(methods.includes('POST'))
    assert.ok(methods.includes('GET'))
  })
})

// ─── Authentication ───────────────────────────────────────────────────────────

describe('Gateway — authentication', () => {
  it('no Authorization header → 401', async () => {
    const res = await fetch(`${BASE}/health`)
    assert.equal(res.status, 401)
  })

  it('401 body has error.code = missing_api_key', async () => {
    const body = await fetch(`${BASE}/health`).then(r => r.json()) as any
    assert.equal(body.error?.code, 'missing_api_key')
  })

  it('Authorization: Bearer <key> is accepted', async () => {
    const res = await fetch(`${BASE}/health`, { headers: AUTH })
    assert.equal(res.status, 200)
  })

  it('X-API-Key header is accepted', async () => {
    const res = await fetch(`${BASE}/health`, { headers: { 'X-API-Key': API_KEY } })
    assert.equal(res.status, 200)
  })
})

// ─── Health endpoints ─────────────────────────────────────────────────────────

describe('Gateway — health endpoints', () => {
  it('GET / → 200', async () => {
    const res = await fetch(`${BASE}/`, { headers: AUTH })
    assert.equal(res.status, 200)
  })

  it('GET /health → 200', async () => {
    const res = await fetch(`${BASE}/health`, { headers: AUTH })
    assert.equal(res.status, 200)
  })

  it('GET /health body has ok: true', async () => {
    const body = await fetch(`${BASE}/health`, { headers: AUTH }).then(r => r.json()) as any
    assert.equal(body.ok, true)
  })

  it('GET /health body has service field', async () => {
    const body = await fetch(`${BASE}/health`, { headers: AUTH }).then(r => r.json()) as any
    assert.ok(body.service)
  })

  it('GET /health body has version field', async () => {
    const body = await fetch(`${BASE}/health`, { headers: AUTH }).then(r => r.json()) as any
    assert.ok(body.version)
  })

  it('GET /health body has timestamp field', async () => {
    const body = await fetch(`${BASE}/health`, { headers: AUTH }).then(r => r.json()) as any
    assert.ok(body.timestamp)
    assert.doesNotThrow(() => new Date(body.timestamp))
  })
})

// ─── Response format ──────────────────────────────────────────────────────────

describe('Gateway — response format', () => {
  it('all responses have Content-Type: application/json', async () => {
    const res = await fetch(`${BASE}/health`, { headers: AUTH })
    assert.ok(res.headers.get('content-type')?.includes('application/json'))
  })

  it('all responses have Access-Control-Allow-Origin: *', async () => {
    const res = await fetch(`${BASE}/health`, { headers: AUTH })
    assert.equal(res.headers.get('access-control-allow-origin'), '*')
  })

  it('responses have X-Powered-By header', async () => {
    const res = await fetch(`${BASE}/health`, { headers: AUTH })
    assert.ok(res.headers.get('x-powered-by'))
  })
})

// ─── 404 handling ─────────────────────────────────────────────────────────────

describe('Gateway — 404 handling', () => {
  it('unknown GET route → 404', async () => {
    const res = await fetch(`${BASE}/v1/nonexistent`, { headers: AUTH })
    assert.equal(res.status, 404)
  })

  it('404 body has error.code = route_not_found', async () => {
    const body = await fetch(`${BASE}/v1/nonexistent`, { headers: AUTH }).then(r => r.json()) as any
    assert.equal(body.error?.code, 'route_not_found')
  })
})

// ─── Customers endpoint (no API call) ─────────────────────────────────────────

describe('Gateway — POST /v1/customers (no API call)', () => {
  it('POST with email → 201', async () => {
    const res = await fetch(`${BASE}/v1/customers`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ email: 'test@example.com', name: 'Test User' }),
    })
    assert.equal(res.status, 201)
  })

  it('POST customer response has id, object, email', async () => {
    const body = await fetch(`${BASE}/v1/customers`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ email: 'user@chariow.com' }),
    }).then(r => r.json()) as any
    assert.equal(body.object, 'customer')
    assert.ok(body.id?.startsWith('cus_'))
    assert.equal(body.email, 'user@chariow.com')
  })

  it('POST without email → 400', async () => {
    const res = await fetch(`${BASE}/v1/customers`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'No Email' }),
    })
    assert.equal(res.status, 400)
  })
})

// ─── Payment intents — no-API-call paths ──────────────────────────────────────

describe('Gateway — POST /v1/payment_intents (no items → no API call)', () => {
  it('missing amount+currency → 400', async () => {
    const res = await fetch(`${BASE}/v1/payment_intents`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ customer_email: 'u@ex.com' }),
    })
    assert.equal(res.status, 400)
  })

  it('amount+currency without items → 201 with checkout_url: null', async () => {
    const body = await fetch(`${BASE}/v1/payment_intents`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ amount: 5000, currency: 'usd', customer_email: 'u@ex.com' }),
    }).then(r => r.json()) as any
    assert.equal(body.object, 'payment_intent')
    assert.equal(body.amount, 5000)
    assert.equal(body.currency, 'usd')
    assert.equal(body.checkout_url, null)
    assert.ok(body.client_secret)
  })

  it('cancel intent → 200 with status: canceled', async () => {
    const body = await fetch(`${BASE}/v1/payment_intents/pi_test123/cancel`, {
      method: 'POST', headers: JSON_HEADERS, body: '{}',
    }).then(r => r.json()) as any
    assert.equal(body.status, 'canceled')
    assert.equal(body.object, 'payment_intent')
  })
})

// ─── Charges — no-API-call path ───────────────────────────────────────────────

describe('Gateway — POST /v1/charges (no product → no API call)', () => {
  it('missing amount → 400', async () => {
    const res = await fetch(`${BASE}/v1/charges`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ currency: 'usd' }),
    })
    assert.equal(res.status, 400)
  })

  it('amount+currency without product_id → 201 charge object', async () => {
    const body = await fetch(`${BASE}/v1/charges`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ amount: 2000, currency: 'eur', customer_email: 'u@ex.com' }),
    }).then(r => r.json()) as any
    assert.equal(body.object, 'charge')
    assert.equal(body.amount, 2000)
  })
})
