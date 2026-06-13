import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { ChariowClient } from '../../src/client.js'
import { ChariowError } from '../../src/errors.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  return async (_url: unknown, _opts?: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response
}

let savedFetch: typeof globalThis.fetch

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('ChariowClient constructor', () => {
  it('stores the apiKey', () => {
    const c = new ChariowClient({ apiKey: 'my-key' })
    assert.equal(c.apiKey, 'my-key')
  })

  it('uses the default baseUrl', () => {
    const c = new ChariowClient({ apiKey: 'key' })
    assert.equal(c.baseUrl, 'https://api.chariow.com/v1')
  })

  it('accepts a custom baseUrl', () => {
    const c = new ChariowClient({ apiKey: 'key', baseUrl: 'https://staging.api.chariow.com/v1' })
    assert.equal(c.baseUrl, 'https://staging.api.chariow.com/v1')
  })
})

// ─── request() ────────────────────────────────────────────────────────────────

describe('ChariowClient.request()', () => {
  beforeEach(() => { savedFetch = globalThis.fetch })
  afterEach(() => { globalThis.fetch = savedFetch })

  it('sends Authorization: Bearer header', async () => {
    let capturedHeaders: Record<string, string> | null = null
    globalThis.fetch = async (_url: any, opts: any) => {
      capturedHeaders = opts.headers
      return { ok: true, status: 200, json: async () => ({}) } as any
    }
    const c = new ChariowClient({ apiKey: 'test-key-xyz' })
    await c.request('/test')
    assert.equal(capturedHeaders!['Authorization'], 'Bearer test-key-xyz')
  })

  it('sends Content-Type: application/json', async () => {
    let capturedHeaders: Record<string, string> | null = null
    globalThis.fetch = async (_url: any, opts: any) => {
      capturedHeaders = opts.headers
      return { ok: true, status: 200, json: async () => ({}) } as any
    }
    const c = new ChariowClient({ apiKey: 'key' })
    await c.request('/test')
    assert.equal(capturedHeaders!['Content-Type'], 'application/json')
  })

  it('builds the full URL from baseUrl + path', async () => {
    let capturedUrl = ''
    globalThis.fetch = async (url: any) => {
      capturedUrl = String(url)
      return { ok: true, status: 200, json: async () => ({}) } as any
    }
    const c = new ChariowClient({ apiKey: 'key', baseUrl: 'https://api.example.com/v1' })
    await c.request('/products/123')
    assert.equal(capturedUrl, 'https://api.example.com/v1/products/123')
  })

  it('extracts data from { data: ... } envelope', async () => {
    globalThis.fetch = mockFetch(200, { data: { id: 'p1', name: 'Widget' }, meta: {} })
    const c = new ChariowClient({ apiKey: 'key' })
    const result = await c.request<{ id: string; name: string }>('/products/p1')
    assert.equal(result.id, 'p1')
    assert.equal(result.name, 'Widget')
  })

  it('returns raw response when no data envelope', async () => {
    globalThis.fetch = mockFetch(200, [{ id: '1' }, { id: '2' }])
    const c = new ChariowClient({ apiKey: 'key' })
    const result = await c.request<any[]>('/products')
    assert.ok(Array.isArray(result))
    assert.equal(result.length, 2)
  })

  it('returns raw object when no data key', async () => {
    globalThis.fetch = mockFetch(200, { id: 'store_1', name: 'My Store' })
    const c = new ChariowClient({ apiKey: 'key' })
    const result = await c.request<any>('/store')
    assert.equal(result.id, 'store_1')
  })

  it('throws ChariowError on 401 Unauthorized', async () => {
    globalThis.fetch = mockFetch(401, { message: 'Unauthorized' })
    const c = new ChariowClient({ apiKey: 'bad-key' })
    await assert.rejects(
      () => c.request('/products'),
      (err: unknown) => {
        assert.ok(err instanceof ChariowError)
        assert.equal((err as ChariowError).status, 401)
        assert.equal((err as ChariowError).message, 'Unauthorized')
        return true
      }
    )
  })

  it('throws ChariowError on 403 Forbidden', async () => {
    globalThis.fetch = mockFetch(403, { message: 'Forbidden' })
    const c = new ChariowClient({ apiKey: 'key' })
    await assert.rejects(
      () => c.request('/admin'),
      (err: unknown) => {
        assert.ok(err instanceof ChariowError)
        assert.equal((err as ChariowError).status, 403)
        return true
      }
    )
  })

  it('throws ChariowError on 404 Not Found', async () => {
    globalThis.fetch = mockFetch(404, { message: 'Product not found' })
    const c = new ChariowClient({ apiKey: 'key' })
    await assert.rejects(
      () => c.request('/products/nonexistent'),
      (err: unknown) => {
        assert.ok(err instanceof ChariowError)
        assert.equal((err as ChariowError).status, 404)
        return true
      }
    )
  })

  it('throws ChariowError on 422 Unprocessable Entity', async () => {
    globalThis.fetch = mockFetch(422, { message: 'Validation failed', errors: { email: ['invalid'] } })
    const c = new ChariowClient({ apiKey: 'key' })
    await assert.rejects(
      () => c.request('/checkout', { method: 'POST' }),
      (err: unknown) => {
        assert.ok(err instanceof ChariowError)
        assert.equal((err as ChariowError).status, 422)
        return true
      }
    )
  })

  it('throws ChariowError on 500 with fallback message', async () => {
    globalThis.fetch = mockFetch(500, {})
    const c = new ChariowClient({ apiKey: 'key' })
    await assert.rejects(
      () => c.request('/products'),
      (err: unknown) => {
        assert.ok(err instanceof ChariowError)
        assert.equal((err as ChariowError).status, 500)
        assert.equal((err as ChariowError).message, 'Chariow API Error')
        return true
      }
    )
  })

  it('passes extra fetch options through', async () => {
    let capturedOpts: any = null
    globalThis.fetch = async (_url: any, opts: any) => {
      capturedOpts = opts
      return { ok: true, status: 200, json: async () => ({}) } as any
    }
    const c = new ChariowClient({ apiKey: 'key' })
    await c.request('/checkout', { method: 'POST', body: '{"items":[]}' })
    assert.equal(capturedOpts.method, 'POST')
    assert.equal(capturedOpts.body, '{"items":[]}')
  })
})
