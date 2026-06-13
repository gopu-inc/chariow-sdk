import { ChariowClient } from "../client.js"

export interface MarketplaceStore {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  url: string
  status: string
  products_count?: number
  category?: string
  rating?: { average: number; count: number }
  social_links?: Record<string, string | null>
  appearance?: {
    theme?: { value: string; label: string }
    color?: { primary?: { hex: string }; contrast?: { hex: string } }
  }
}

export interface MarketplaceStoresResponse {
  data: MarketplaceStore[]
  pagination?: {
    next_cursor: string | null
    has_more_pages: boolean
    count: number
  }
}

export interface MarketplaceProduct {
  id: string
  name: string
  description?: string
  status: string
  type?: string
  pricing?: {
    current_price?: { value?: number; formatted?: string; currency?: string }
  }
  rating?: { average: number; count: number }
  sales_count?: number
  category?: { value: string; label: string }
}

export class MarketplaceAPI {
  client: ChariowClient

  constructor(client: ChariowClient) {
    this.client = client
  }

  async listStores(params: { per_page?: number; cursor?: string; search?: string } = {}): Promise<MarketplaceStoresResponse> {
    const p = new URLSearchParams()
    if (params.per_page) p.append("per_page", String(params.per_page))
    if (params.cursor)   p.append("cursor", params.cursor)
    if (params.search)   p.append("search", params.search)
    const qs = p.toString()

    try {
      const res = await this.client.request<MarketplaceStoresResponse>(`/marketplace/stores${qs ? `?${qs}` : ""}`)
      if (Array.isArray(res)) {
        return { data: res as MarketplaceStore[], pagination: { next_cursor: null, has_more_pages: false, count: (res as any[]).length } }
      }
      return res
    } catch {
      // fallback to /stores
      try {
        const res2 = await this.client.request<MarketplaceStoresResponse>(`/stores${qs ? `?${qs}` : ""}`)
        if (Array.isArray(res2)) {
          return { data: res2 as MarketplaceStore[], pagination: { next_cursor: null, has_more_pages: false, count: (res2 as any[]).length } }
        }
        return res2
      } catch {
        return { data: [], pagination: { next_cursor: null, has_more_pages: false, count: 0 } }
      }
    }
  }

  async getStore(slugOrId: string): Promise<MarketplaceStore> {
    try {
      return await this.client.request<MarketplaceStore>(`/marketplace/stores/${slugOrId}`)
    } catch {
      return await this.client.request<MarketplaceStore>(`/stores/${slugOrId}`)
    }
  }

  async getStoreProducts(slugOrId: string, params: { per_page?: number } = {}): Promise<MarketplaceProduct[]> {
    const p = new URLSearchParams()
    if (params.per_page) p.append("per_page", String(params.per_page))
    const qs = p.toString()

    try {
      const res = await this.client.request<any>(`/marketplace/stores/${slugOrId}/products${qs ? `?${qs}` : ""}`)
      if (Array.isArray(res)) return res
      if (res?.data && Array.isArray(res.data)) return res.data
      return []
    } catch {
      try {
        const res2 = await this.client.request<any>(`/stores/${slugOrId}/products${qs ? `?${qs}` : ""}`)
        if (Array.isArray(res2)) return res2
        if (res2?.data && Array.isArray(res2.data)) return res2.data
        return []
      } catch {
        return []
      }
    }
  }
}
