import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseProductInput } from '../../src/cli/utils/url-parser.js'

describe('parseProductInput — Full store product URL', () => {
  it('extracts slug and storeSlug from /store/:store/products/:slug', () => {
    const r = parseProductInput('https://chariow.com/store/myshop/products/my-product')
    assert.equal(r.type, 'url')
    assert.equal(r.value, 'my-product')
    assert.equal(r.storeSlug, 'myshop')
  })

  it('handles slugs with hyphens and numbers', () => {
    const r = parseProductInput('https://chariow.com/store/shop-42/products/item-007')
    assert.equal(r.value, 'item-007')
    assert.equal(r.storeSlug, 'shop-42')
  })

  it('works with HTTP (non-HTTPS)', () => {
    const r = parseProductInput('http://chariow.com/store/mystore/products/t-shirt')
    assert.equal(r.type, 'url')
    assert.equal(r.value, 't-shirt')
  })
})

describe('parseProductInput — Subdomain URL', () => {
  it('extracts slug from :store.chariow.com/products/:slug', () => {
    const r = parseProductInput('https://myshop.chariow.com/products/cool-hat')
    assert.equal(r.type, 'url')
    assert.equal(r.value, 'cool-hat')
    assert.equal(r.storeSlug, 'myshop')
  })

  it('handles multi-segment subdomain product paths', () => {
    const r = parseProductInput('https://boutique.chariow.com/products/sneakers-2024')
    assert.equal(r.value, 'sneakers-2024')
    assert.equal(r.storeSlug, 'boutique')
  })
})

describe('parseProductInput — Direct product URL', () => {
  it('extracts slug from /products/:slug without store', () => {
    const r = parseProductInput('https://chariow.com/products/global-item')
    assert.equal(r.type, 'url')
    assert.equal(r.value, 'global-item')
    assert.equal(r.storeSlug, undefined)
  })
})

describe('parseProductInput — Product IDs', () => {
  it('detects prod_ prefix as ID type', () => {
    const r = parseProductInput('prod_abc123xyz')
    assert.equal(r.type, 'id')
    assert.equal(r.value, 'prod_abc123xyz')
  })

  it('detects pay_ prefix as ID type', () => {
    const r = parseProductInput('pay_xyz789')
    assert.equal(r.type, 'id')
    assert.equal(r.value, 'pay_xyz789')
  })

  it('detects UUID v4 as ID type', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const r = parseProductInput(uuid)
    assert.equal(r.type, 'id')
    assert.equal(r.value, uuid)
  })
})

describe('parseProductInput — Slugs', () => {
  it('treats plain hyphenated text as slug', () => {
    const r = parseProductInput('my-product-slug')
    assert.equal(r.type, 'slug')
    assert.equal(r.value, 'my-product-slug')
  })

  it('trims leading and trailing whitespace', () => {
    const r = parseProductInput('  my-product  ')
    assert.equal(r.value, 'my-product')
  })

  it('treats short string as slug', () => {
    const r = parseProductInput('hat')
    assert.equal(r.type, 'slug')
    assert.equal(r.value, 'hat')
  })
})

describe('parseProductInput — Edge cases', () => {
  it('falls back to slug for unrecognised URL path', () => {
    const r = parseProductInput('https://other-domain.com/unknown/path')
    // Falls back to last segment or slug
    assert.ok(r.type === 'url' || r.type === 'slug')
    assert.ok(r.value.length > 0)
  })

  it('handles URL-encoded characters', () => {
    const r = parseProductInput('https://chariow.com/store/shop/products/t%C3%AAte')
    assert.equal(r.type, 'url')
    assert.ok(r.value.length > 0)
  })
})
