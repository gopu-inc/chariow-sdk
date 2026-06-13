import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ChariowError } from '../../src/errors.js'

describe('ChariowError', () => {
  it('is an instance of Error', () => {
    const err = new ChariowError('boom')
    assert.ok(err instanceof Error)
  })

  it('is an instance of ChariowError', () => {
    const err = new ChariowError('boom')
    assert.ok(err instanceof ChariowError)
  })

  it('sets name to "ChariowError"', () => {
    const err = new ChariowError('something failed')
    assert.equal(err.name, 'ChariowError')
  })

  it('sets message correctly', () => {
    const err = new ChariowError('payment declined')
    assert.equal(err.message, 'payment declined')
  })

  it('sets status when provided', () => {
    const err = new ChariowError('not found', 404)
    assert.equal(err.status, 404)
  })

  it('sets data when provided', () => {
    const data = { field: 'email', code: 'invalid_format' }
    const err = new ChariowError('validation error', 422, data)
    assert.deepEqual(err.data, data)
  })

  it('status is undefined when not provided', () => {
    const err = new ChariowError('unknown')
    assert.equal(err.status, undefined)
  })

  it('data is undefined when not provided', () => {
    const err = new ChariowError('unknown', 500)
    assert.equal(err.data, undefined)
  })

  it('status 0 is preserved', () => {
    const err = new ChariowError('network error', 0)
    assert.equal(err.status, 0)
  })

  it('data can be any value (string)', () => {
    const err = new ChariowError('err', 400, 'raw error string')
    assert.equal(err.data, 'raw error string')
  })

  it('data can be an array', () => {
    const err = new ChariowError('err', 400, ['e1', 'e2'])
    assert.deepEqual(err.data, ['e1', 'e2'])
  })

  it('can be caught as Error', () => {
    try {
      throw new ChariowError('intentional', 500)
    } catch (e) {
      assert.ok(e instanceof Error)
      assert.ok(e instanceof ChariowError)
      assert.equal((e as ChariowError).status, 500)
    }
  })
})
