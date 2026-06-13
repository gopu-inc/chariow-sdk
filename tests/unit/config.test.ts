import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateApiKey, encryptApiKey, decryptApiKey } from '../../src/cli/utils/config.js'

// ─── validateApiKey ─────────────────────────────────────────────────────────

describe('validateApiKey', () => {
  it('accepts 8-character key', () => {
    assert.equal(validateApiKey('abcdefgh'), true)
  })

  it('accepts long production key', () => {
    assert.equal(validateApiKey('sk_live_chariow_abcdef1234567890'), true)
  })

  it('accepts key with special characters', () => {
    assert.equal(validateApiKey('abc!@#$%^'), true)
  })

  it('rejects empty string', () => {
    assert.equal(validateApiKey(''), false)
  })

  it('rejects key with 7 characters', () => {
    assert.equal(validateApiKey('abcdefg'), false)
  })

  it('accepts key with exactly 8 characters', () => {
    assert.equal(validateApiKey('12345678'), true)
  })

  it('rejects null', () => {
    assert.equal(validateApiKey(null as any), false)
  })

  it('rejects undefined', () => {
    assert.equal(validateApiKey(undefined as any), false)
  })

  it('rejects a number', () => {
    assert.equal(validateApiKey(12345678 as any), false)
  })

  it('accepts key with spaces when inner content is ≥ 8 chars', () => {
    assert.equal(validateApiKey('  abcdefgh  '), true)
  })

  it('rejects key where trimmed content is < 8 chars', () => {
    assert.equal(validateApiKey('  abc123  '), false) // trim → "abc123" = 6 chars
  })
})

// ─── encryptApiKey / decryptApiKey ───────────────────────────────────────────

describe('encryptApiKey / decryptApiKey', () => {
  it('round-trips a simple key', () => {
    const key = 'my-secret-api-key'
    assert.equal(decryptApiKey(encryptApiKey(key)), key)
  })

  it('round-trips a complex key with special chars', () => {
    const key = 'sk_live_ABC!@#$%^&*()_123'
    assert.equal(decryptApiKey(encryptApiKey(key)), key)
  })

  it('round-trips a minimal 8-char key', () => {
    const key = 'abcdefgh'
    assert.equal(decryptApiKey(encryptApiKey(key)), key)
  })

  it('encrypted value contains a colon (IV separator)', () => {
    const encrypted = encryptApiKey('test-key-12345')
    assert.ok(encrypted.includes(':'), 'Expected IV:ciphertext format')
  })

  it('encrypted value differs from plaintext', () => {
    const key = 'plaintext-key'
    assert.notEqual(encryptApiKey(key), key)
  })

  it('two encryptions of same key produce different ciphertexts (random IV)', () => {
    const key = 'same-key-12345'
    const e1 = encryptApiKey(key)
    const e2 = encryptApiKey(key)
    assert.notEqual(e1, e2)
  })

  it('both ciphertexts of same key decrypt to same value', () => {
    const key = 'same-key-12345'
    const e1 = encryptApiKey(key)
    const e2 = encryptApiKey(key)
    assert.equal(decryptApiKey(e1), key)
    assert.equal(decryptApiKey(e2), key)
  })

  it('encrypted value is a hex string (IV + colon + ciphertext)', () => {
    const encrypted = encryptApiKey('testkey99')
    const [iv, cipher] = encrypted.split(':')
    assert.match(iv,     /^[0-9a-f]+$/i)
    assert.match(cipher, /^[0-9a-f]+$/i)
  })
})
