import { ChariowClient } from "../client.js"
import {
  Product,
  ProductsResponse,
  ProductQuery
} from "../types/product.js"

export class ProductsAPI {
  client: ChariowClient

  constructor(client: ChariowClient) {
    this.client = client
  }

  async list(
    query: ProductQuery = {}
  ): Promise<ProductsResponse> {
    const params = new URLSearchParams()

    if (query.per_page) {
      params.append("per_page", String(query.per_page))
    }

    if (query.cursor) {
      params.append("cursor", query.cursor)
    }
    
    if (query.status) {
      params.append("status", query.status)
    }

    const qs = params.toString()
    const response = await this.client.request<ProductsResponse>(
      `/products${qs ? `?${qs}` : ""}`
    )
    
    // Si la réponse est déjà un tableau (pour l'explore mode public)
    if (Array.isArray(response)) {
      return {
        data: response,
        pagination: {
          count: response.length,
          path: "",
          per_page: response.length,
          next_cursor: null,
          next_page_url: null,
          prev_cursor: null,
          prev_page_url: null,
          has_more_pages: false,
          has_pages: false
        }
      }
    }
    
    return response
  }

  async get(id: string): Promise<Product> {
    return this.client.request<Product>(`/products/${id}`)
  }

  async create(body: unknown): Promise<Product> {
    return this.client.request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(body)
    })
  }

  async update(id: string, body: unknown): Promise<Product> {
    return this.client.request<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    })
  }

  async search(name: string): Promise<Product[]> {
    const products = await this.list()
    return products.data.filter(p =>
      p.name.toLowerCase().includes(name.toLowerCase())
    )
  }

  async delete(id: string): Promise<void> {
    return this.client.request<void>(`/products/${id}`, {
      method: "DELETE"
    })
  }
}
