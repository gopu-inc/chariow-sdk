import { describe, it, before, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ChariowPay } from '../../src/modules/chariow-pay-server.js'

const FIXTURE_HTML = path.join(process.cwd(), 'tests/fixtures/test.html')

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('ChariowPay — constructor', () => {
  it('throws when Crud is empty string', () => {
    assert.throws(() => new ChariowPay({ Crud: '' }), /Crud.*required/i)
  })

  it('parses Devis string into uppercased array', () => {
    const pay = new ChariowPay({ Crud: 'testkey123', Devis: 'usd, xaf, eur' })
    assert.deepEqual(pay.currencies, ['USD', 'XAF', 'EUR'])
  })

  it('parses Devis as array', () => {
    const pay = new ChariowPay({ Crud: 'testkey123', Devis: ['usd', 'NGN'] })
    assert.deepEqual(pay.currencies, ['USD', 'NGN'])
  })

  it('defaults to ["USD"] when Devis is omitted', () => {
    const pay = new ChariowPay({ Crud: 'testkey123' })
    assert.deepEqual(pay.currencies, ['USD'])
  })

  it('stores Type option', () => {
    const pay = new ChariowPay({ Crud: 'testkey123', Type: 'GATEWAY' })
    assert.equal(pay.options.Type, 'GATEWAY')
  })

  it('stores Server option', () => {
    const pay = new ChariowPay({ Crud: 'testkey123', Server: 'localhost:4242' })
    assert.equal(pay.options.Server, 'localhost:4242')
  })

  it('isRunning is false before listen()', () => {
    const pay = new ChariowPay({ Crud: 'testkey123' })
    assert.equal(pay.isRunning, false)
  })

  it('strips empty tokens from Devis string', () => {
    const pay = new ChariowPay({ Crud: 'testkey123', Devis: 'USD,,  ,EUR' })
    assert.deepEqual(pay.currencies, ['USD', 'EUR'])
  })

  it('parses semicolon-separated Devis', () => {
    const pay = new ChariowPay({ Crud: 'testkey123', Devis: 'USD;EUR;GBP' })
    assert.deepEqual(pay.currencies, ['USD', 'EUR', 'GBP'])
  })
})

// ─── Route registration ───────────────────────────────────────────────────────

describe('ChariowPay — route registration', () => {
  let pay: ChariowPay

  before(() => { pay = new ChariowPay({ Crud: 'testkey123' }) })

  it('get() returns the instance (chainable)', () => {
    const result = pay.get('/', (req, res) => res.json({ ok: true }))
    assert.ok(result instanceof ChariowPay)
  })

  it('post() returns the instance (chainable)', () => {
    const result = pay.post('/pay', 'json', (req, res) => res.json({ ok: true }))
    assert.ok(result instanceof ChariowPay)
  })

  it('put() returns the instance (chainable)', () => {
    const result = pay.put('/update', (req, res) => res.json({ updated: true }))
    assert.ok(result instanceof ChariowPay)
  })

  it('delete() returns the instance (chainable)', () => {
    const result = pay.delete('/item', (req, res) => res.json({ deleted: true }))
    assert.ok(result instanceof ChariowPay)
  })

  it('chaining .get().post() works', () => {
    pay.get('/a', (req, res) => res.json({})).post('/b', (req, res) => res.json({}))
    assert.ok(true)
  })

  it('handler as second arg (no type) is accepted', () => {
    pay.get('/c', (req, res) => res.json({ route: 'c' }))
    assert.ok(true)
  })

  it('string type as second arg is accepted', () => {
    pay.get('/d', 'html', (req, res) => res.html('<h1>D</h1>'))
    assert.ok(true)
  })
})

// ─── Response helpers ─────────────────────────────────────────────────────────

describe('ChariowPay — response helpers', () => {
  let pay: ChariowPay

  before(() => { pay = new ChariowPay({ Crud: 'testkey123' }) })

  it('json() has _type "json"', () => {
    assert.equal(pay.json({ x: 1 })._type, 'json')
  })

  it('json() has _status 200 by default', () => {
    assert.equal(pay.json({})._status, 200)
  })

  it('json() accepts custom status', () => {
    assert.equal(pay.json({}, 404)._status, 404)
  })

  it('json() body parses to original data', () => {
    const result = pay.json({ hello: 'world' })
    assert.deepEqual(JSON.parse(result._body as string), { hello: 'world' })
  })

  it('json() Content-Type is application/json', () => {
    assert.equal(pay.json({})._headers['Content-Type'], 'application/json')
  })

  it('html() has _type "html"', () => {
    assert.equal(pay.html('<p>Hi</p>')._type, 'html')
  })

  it('html() has _status 200 by default', () => {
    assert.equal(pay.html('<p>Hi</p>')._status, 200)
  })

  it('html() Content-Type includes text/html', () => {
    assert.ok(pay.html('<p>x</p>')._headers['Content-Type'].includes('text/html'))
  })

  it('html() preserves content', () => {
    const result = pay.html('<h1>Title</h1>')
    assert.equal(result._body, '<h1>Title</h1>')
  })

  it('redirect() has _status 302 by default', () => {
    assert.equal(pay.redirect('/home')._status, 302)
  })

  it('redirect() sets Location header', () => {
    assert.equal(pay.redirect('/home')._headers['Location'], '/home')
  })

  it('redirect() accepts custom status 301', () => {
    assert.equal(pay.redirect('/new', 301)._status, 301)
  })
})

// ─── load() ───────────────────────────────────────────────────────────────────

describe('ChariowPay — load()', () => {
  let pay: ChariowPay

  before(() => { pay = new ChariowPay({ Crud: 'testkey123' }) })

  it('returns status 200 for an existing file', () => {
    const result = pay.load(FIXTURE_HTML)
    assert.equal(result._status, 200)
  })

  it('returns _type "html" for existing .html file', () => {
    const result = pay.load(FIXTURE_HTML)
    assert.equal(result._type, 'html')
  })

  it('body contains the file content', () => {
    const result = pay.load(FIXTURE_HTML)
    assert.ok(result._body.toString().includes('ChariowPay'))
  })

  it('returns status 404 for missing file', () => {
    const result = pay.load('/nonexistent/path/missing.html')
    assert.equal(result._status, 404)
  })

  it('resolves relative paths from cwd', () => {
    const result = pay.load('tests/fixtures/test.html')
    assert.equal(result._status, 200)
  })

  it('sets text/css for .css files', () => {
    const tmp = path.join(os.tmpdir(), `chariow-test-${Date.now()}.css`)
    fs.writeFileSync(tmp, 'body { color: red }')
    const result = pay.load(tmp)
    assert.equal(result._headers['Content-Type'], 'text/css')
    fs.unlinkSync(tmp)
  })

  it('sets application/javascript for .js files', () => {
    const tmp = path.join(os.tmpdir(), `chariow-test-${Date.now()}.js`)
    fs.writeFileSync(tmp, 'console.log("hi")')
    const result = pay.load(tmp)
    assert.equal(result._headers['Content-Type'], 'application/javascript')
    fs.unlinkSync(tmp)
  })
})

// ─── checkout() currency validation ──────────────────────────────────────────

describe('ChariowPay — checkout() currency validation', () => {
  it('rejects a currency not in Devis', async () => {
    const pay = new ChariowPay({ Crud: 'testkey123', Devis: 'USD, EUR' })
    await assert.rejects(
      () => pay.checkout({ items: [{ product_id: 'p1' }], currency: 'XAF' }),
      (err: unknown) => {
        assert.ok(err instanceof Error)
        assert.ok((err as Error).message.includes('XAF'))
        return true
      }
    )
  })

  it('passes the correct currency to the PayAPI', async () => {
    let called: any = null
    const pay = new ChariowPay({ Crud: 'testkey123', Devis: 'USD, EUR' })
    ;(pay as any)._pay = {
      checkout: async (body: any) => {
        called = body
        return { id: 'pay_1', status: 'pending', amount: 100, currency: 'USD', items: [], created_at: new Date().toISOString() }
      },
    }
    await pay.checkout({ items: [{ product_id: 'p1' }], currency: 'USD' })
    assert.equal(called.currency, 'USD')
  })

  it('defaults to first currency in Devis when currency omitted', async () => {
    let called: any = null
    const pay = new ChariowPay({ Crud: 'testkey123', Devis: 'XAF, USD' })
    ;(pay as any)._pay = {
      checkout: async (body: any) => {
        called = body
        return { id: 'pay_1', status: 'pending', amount: 100, currency: 'XAF', items: [], created_at: new Date().toISOString() }
      },
    }
    await pay.checkout({ items: [{ product_id: 'p1' }] })
    assert.equal(called.currency, 'XAF')
  })
})
