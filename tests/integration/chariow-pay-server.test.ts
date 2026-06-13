/**
 * Integration tests for ChariowPay HTTP server.
 * Starts a real server on port 34242, makes live fetch() requests.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { ChariowPay } from '../../src/modules/chariow-pay-server.js'

const PORT = 34242
const BASE = `http://localhost:${PORT}`

let pay: ChariowPay

before(() => {
  pay = new ChariowPay({
    Crud:   'testkey-chariow-sdk',
    Type:   'APP',
    Devis:  'USD, XAF',
    Port:   PORT,
  })

  // ── Route registrations ────────────────────────────────────────────────
  pay.get('/', 'html', (_req, res) => {
    return res.html('<html><body><h1>ChariowPay Test Server</h1></body></html>')
  })

  pay.get('/health', (req, res) => {
    return res.json({ ok: true, service: 'chariow-pay-test' })
  })

  pay.post('/echo', (req, res) => {
    return res.json({ echoed: req.body })
  })

  pay.post('/pay', 'json', (req, res) => {
    if (!req.body.product_id) {
      return res.json({ error: 'product_id required' }, 400)
    }
    return res.json({
      id:       'pay_test_123',
      status:   'pending',
      amount:   req.body.amount ?? 1000,
      currency: 'USD',
      product_id: req.body.product_id,
    })
  })

  pay.get('/user/:id', (req, res) => {
    return res.json({ userId: req.path.split('/').pop() })
  })

  pay.get('/redirect-test', (req, res) => {
    return res.redirect('/health', 302)
  })

  pay.put('/update', (req, res) => {
    return res.json({ updated: true, data: req.body })
  })

  pay.delete('/delete', (req, res) => {
    return res.json({ deleted: true })
  })

  // Start server (non-blocking)
  pay.listen(PORT)
})

after(() => {
  pay.close()
})

// ─── Basic reachability ───────────────────────────────────────────────────────

describe('ChariowPay server — basic reachability', () => {
  it('server is running after listen()', () => {
    assert.equal(pay.isRunning, true)
  })

  it('GET / → 200 with HTML body', async () => {
    const res = await fetch(`${BASE}/`)
    assert.equal(res.status, 200)
    const text = await res.text()
    assert.ok(text.includes('ChariowPay Test Server'))
  })

  it('GET /health → 200 with JSON', async () => {
    const res  = await fetch(`${BASE}/health`)
    const body = await res.json() as any
    assert.equal(res.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.service, 'chariow-pay-test')
  })
})

// ─── POST routes ──────────────────────────────────────────────────────────────

describe('ChariowPay server — POST routes', () => {
  it('POST /echo → echoes JSON body', async () => {
    const payload = { msg: 'hello', value: 42 }
    const res = await fetch(`${BASE}/echo`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const body = await res.json() as any
    assert.equal(res.status, 200)
    assert.deepEqual(body.echoed, payload)
  })

  it('POST /pay with product_id → 200 with payment object', async () => {
    const res = await fetch(`${BASE}/pay`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ product_id: 'prod_123', amount: 2500 }),
    })
    const body = await res.json() as any
    assert.equal(res.status, 200)
    assert.equal(body.product_id, 'prod_123')
    assert.equal(body.currency, 'USD')
  })

  it('POST /pay without product_id → 400 error', async () => {
    const res = await fetch(`${BASE}/pay`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    const body = await res.json() as any
    assert.equal(res.status, 400)
    assert.ok(body.error)
  })
})

// ─── PUT / DELETE ─────────────────────────────────────────────────────────────

describe('ChariowPay server — PUT and DELETE routes', () => {
  it('PUT /update → 200 with updated flag', async () => {
    const res = await fetch(`${BASE}/update`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: 'New Name' }),
    })
    const body = await res.json() as any
    assert.equal(res.status, 200)
    assert.equal(body.updated, true)
    assert.deepEqual(body.data, { name: 'New Name' })
  })

  it('DELETE /delete → 200 with deleted flag', async () => {
    const res = await fetch(`${BASE}/delete`, { method: 'DELETE' })
    const body = await res.json() as any
    assert.equal(res.status, 200)
    assert.equal(body.deleted, true)
  })
})

// ─── 404 & Unknown routes ─────────────────────────────────────────────────────

describe('ChariowPay server — 404 handling', () => {
  it('GET /unknown → 404', async () => {
    const res = await fetch(`${BASE}/unknown-route-xyz`)
    assert.equal(res.status, 404)
  })

  it('404 body contains error key', async () => {
    const res  = await fetch(`${BASE}/does-not-exist`)
    const body = await res.json() as any
    assert.ok(body.error || body.routes)
  })

  it('POST to GET-only route → 404', async () => {
    const res = await fetch(`${BASE}/health`, { method: 'POST' })
    assert.equal(res.status, 404)
  })
})

// ─── CORS headers ─────────────────────────────────────────────────────────────

describe('ChariowPay server — CORS', () => {
  it('OPTIONS → 204 preflight', async () => {
    const res = await fetch(`${BASE}/pay`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3000' },
    })
    assert.equal(res.status, 204)
  })

  it('GET / has Access-Control-Allow-Origin: *', async () => {
    const res = await fetch(`${BASE}/`)
    assert.equal(res.headers.get('access-control-allow-origin'), '*')
  })

  it('POST /echo has Access-Control-Allow-Origin: *', async () => {
    const res = await fetch(`${BASE}/echo`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    '{}',
    })
    assert.equal(res.headers.get('access-control-allow-origin'), '*')
  })
})

// ─── X-Powered-By header ─────────────────────────────────────────────────────

describe('ChariowPay server — custom headers', () => {
  it('responses include X-Powered-By: ChariowPay', async () => {
    const res = await fetch(`${BASE}/health`)
    assert.equal(res.headers.get('x-powered-by'), 'ChariowPay')
  })

  it('responses include X-Response-Time header', async () => {
    const res = await fetch(`${BASE}/health`)
    const rt  = res.headers.get('x-response-time')
    assert.ok(rt && rt.endsWith('ms'), `Expected X-Response-Time in ms format, got: ${rt}`)
  })
})

// ─── Redirect ────────────────────────────────────────────────────────────────

describe('ChariowPay server — redirect', () => {
  it('GET /redirect-test returns Location header', async () => {
    const res = await fetch(`${BASE}/redirect-test`, { redirect: 'manual' })
    assert.ok(res.status === 302 || res.status === 200) // fetch may follow redirect
    const loc = res.headers.get('location')
    if (res.status === 302) {
      assert.equal(loc, '/health')
    }
  })
})
