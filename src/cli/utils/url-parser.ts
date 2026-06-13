export interface ParsedProductInput {
  type: 'url' | 'slug' | 'id'
  value: string
  storeSlug?: string
}

/**
 * Parse a product URL, slug, or ID into a structured object.
 *
 * Accepted formats:
 *   https://chariow.com/store/:store/products/:slug
 *   https://:store.chariow.com/products/:slug
 *   https://chariow.com/products/:slug
 *   prod_abc123  /  pay_xyz  /  UUID
 *   plain-slug
 */
export function parseProductInput(input: string): ParsedProductInput {
  input = input.trim()

  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const u = new URL(input)

      // https://chariow.com/store/:storeSlug/products/:productSlug
      const storeProductMatch = u.pathname.match(/\/store\/([^/]+)\/products\/([^/]+)/)
      if (storeProductMatch) {
        return { type: 'url', value: storeProductMatch[2], storeSlug: storeProductMatch[1] }
      }

      // https://:storeSlug.chariow.com/products/:productSlug
      const subdomainMatch  = u.hostname.match(/^([^.]+)\.chariow\.com$/)
      const productPathMatch = u.pathname.match(/\/products\/([^/]+)/)
      if (subdomainMatch && productPathMatch) {
        return { type: 'url', value: productPathMatch[1], storeSlug: subdomainMatch[1] }
      }

      // https://chariow.com/products/:productSlug
      if (productPathMatch) {
        return { type: 'url', value: productPathMatch[1] }
      }

      // Fallback — last non-empty path segment
      const segments = u.pathname.split('/').filter(Boolean)
      if (segments.length > 0) {
        return { type: 'url', value: segments[segments.length - 1] }
      }
    } catch {
      /* invalid URL — fall through to slug/id detection */
    }
  }

  // prod_ / pay_ prefixed IDs, or UUID v4
  if (/^(prod_|pay_)/.test(input) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input)) {
    return { type: 'id', value: input }
  }

  return { type: 'slug', value: input }
}
