import { ChariowClient } from "../client.js"

export interface Sale {
  id: string
  product_id: string
  customer_id?: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export interface SalesResponse {
  data: Sale[]
  pagination: {
    next_cursor: string | null
    has_more: boolean
  }
}

export class SalesAPI {
  client: ChariowClient

  constructor(client: ChariowClient) {
    this.client = client
  }

  async list(cursor?: string, per_page: number = 20): Promise<SalesResponse> {
    const params = new URLSearchParams()
    params.append("per_page", String(per_page))
    if (cursor) params.append("cursor", cursor)
    
    return this.client.request<SalesResponse>(`/sales?${params.toString()}`)
  }

  async get(id: string): Promise<Sale> {
    return this.client.request<Sale>(`/sales/${id}`)
  }
}
